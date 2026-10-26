"""
Tests de l'import des faits RCP (brouillons) en base.

    python3 -m unittest discover -s scripts/tests -v

Les tests purs tournent partout ; ceux qui écrivent en base demandent
TEST_DATABASE_URL (base de TEST avec sql/01, sql/04 ; sql/26 et sql/27 sont
appliqués ici, les tables rcp_* et enregistrements sont vidées).
"""

import os
import sys
import unittest
from pathlib import Path

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import import_rcp_faits as imp  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
A = "11111111-1111-4111-8111-111111111111"
UNKNOWN = "99999999-9999-4999-8999-999999999999"


def interaction(nom, gravite="contre_indiquee", section="4.3", page=3):
    return {"type": "interaction", "section": section, "page": page, "libelle": nom, "nom_brut": nom,
            "gravite": gravite, "contexte": f"Association avec {nom}"}


def dose(lib="25–30 mg par jour", page=2):
    return {"type": "dose", "section": "4.2", "page": page, "libelle": lib, "nom_brut": "25.0-30.0 mg jour",
            "population": "adulte", "dose_min": 25.0, "dose_max": 30.0, "unite": "mg", "par": "jour", "contexte": "…"}


class Pures(unittest.TestCase):
    def test_cle_independante_du_libelle_corrige(self):
        f = dose()
        g = {**f, "libelle": "25 à 30 mg/j (corrigé par le relecteur)"}
        self.assertEqual(imp.fait_key(f), imp.fait_key(g))

    def test_cle_distingue_les_rubriques_et_populations(self):
        self.assertNotEqual(imp.fait_key(interaction("Alcool")), imp.fait_key(interaction("Alcool", section="4.5")))
        self.assertNotEqual(imp.fait_key(dose()), imp.fait_key({**dose(), "population": "enfant"}))

    def test_liens_vers_lapplication(self):
        idx = {"METHOTREXATE": "METHOTREXATE", "ATORVASTATINE": "ATORVASTATINE CALCIQUE", "RETINOL": "RETINOL"}
        atc = {"J01AA"}
        self.assertEqual(imp.link_target("Méthotrexate", idx, atc), ("dci", "METHOTREXATE"))
        self.assertEqual(imp.link_target("atorvastatine calcique", idx, atc), ("dci", "ATORVASTATINE CALCIQUE"))
        self.assertEqual(imp.link_target("Les tétracyclines", idx, atc), ("classe", "J01AA"))
        self.assertEqual(imp.link_target("Cyclines", idx, atc), ("classe", "J01AA"))
        self.assertEqual(imp.link_target("Vitamine A", idx, atc), ("dci", "RETINOL"))
        self.assertIsNone(imp.link_target("Alcool", idx, atc))
        # classe connue mais absente de atc_codes : pas de lien mort
        self.assertIsNone(imp.link_target("AINS", idx, atc))


DB_URL = os.environ.get("TEST_DATABASE_URL")


@unittest.skipUnless(DB_URL, "TEST_DATABASE_URL non défini")
class EnBase(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        try:
            import psycopg2
        except ImportError:
            raise unittest.SkipTest("psycopg2 manquant")
        cls.pg = psycopg2
        with psycopg2.connect(DB_URL) as conn, conn.cursor() as cur:
            cur.execute("SELECT to_regclass('public.enregistrements') IS NOT NULL")
            if not cur.fetchone()[0]:
                raise unittest.SkipTest("sql/01_schema.sql non appliqué sur la base de test")
            for f in ("26_rcp_anpp.sql", "27_rcp_faits.sql"):
                cur.execute((ROOT / "sql" / f).read_text(encoding="utf-8"))

    def setUp(self):
        self.conn = self.pg.connect(DB_URL)
        self.cur = self.conn.cursor()
        self.cur.execute("TRUNCATE rcp_documents, rcp_fiches, rcp_dci, rcp_faits, enregistrements RESTART IDENTITY CASCADE")
        for dci in ("METHOTREXATE", "METHOTREXATE", "ACITRETINE"):
            self.cur.execute("INSERT INTO enregistrements (n_enreg, code, dci, nom_marque) VALUES ('1', 'c', %s, 'X')", (dci,))
        self.cur.execute("SELECT to_regclass('public.atc_codes') IS NOT NULL")
        self.has_atc = self.cur.fetchone()[0]
        if self.has_atc:
            self.cur.execute("INSERT INTO atc_codes (code, niveau, label_fr) VALUES ('J01AA', 3, 'tétracyclines') ON CONFLICT DO NOTHING")
        self.cur.execute("INSERT INTO rcp_documents (rcp_id, nom_commercial, pdf_url) VALUES (%s, 'X', 'https://rcp.anpp.dz/a.pdf')", (A,))
        self.conn.commit()

    def tearDown(self):
        self.conn.close()

    def run_import(self, faits, rid=A, version="12/2025"):
        counts = imp.import_faits(self.cur, [{"rcp_id": rid, "version_texte": version, "faits": faits}])
        self.conn.commit()
        return counts

    def q(self, sql, *params):
        self.cur.execute(sql, params)
        return self.cur.fetchall()

    def test_import_en_brouillon_avec_liens(self):
        counts = self.run_import([interaction("Méthotrexate"), interaction("Tétracyclines"), interaction("Alcool"), dose()])
        self.assertEqual(counts["faits ajoutés (brouillon)"], 4)
        self.assertEqual(self.q("SELECT DISTINCT status FROM rcp_faits"), [("brouillon",)])
        links = dict(self.q("SELECT libelle, cible_type || ':' || cible FROM rcp_faits WHERE cible IS NOT NULL"))
        self.assertEqual(links["Méthotrexate"], "dci:METHOTREXATE")
        if self.has_atc:
            self.assertEqual(links["Tétracyclines"], "classe:J01AA")
        self.assertNotIn("Alcool", links)
        self.assertEqual(self.q("SELECT version_texte FROM rcp_documents"), [("12/2025",)])

    def test_reimport_idempotent(self):
        self.run_import([dose()])
        counts = self.run_import([dose()])
        self.assertEqual(counts["faits déjà connus (mis à jour)"], 1)
        self.assertEqual(self.q("SELECT count(*) FROM rcp_faits"), [(1,)])

    def test_fait_relu_n_est_jamais_modifie(self):
        self.run_import([dose()])
        self.cur.execute("UPDATE rcp_faits SET libelle = 'corrigé', status = 'publie', reviewed_by = 'Dr X'")
        self.conn.commit()
        self.run_import([{**dose("autre libellé extrait")}])
        self.assertEqual(self.q("SELECT libelle, status FROM rcp_faits"), [("corrigé", "publie")])

    def test_brouillon_obsolete_supprime_mais_pas_le_publie(self):
        self.run_import([interaction("Alcool"), interaction("Vitamine A"), dose()])
        self.cur.execute("UPDATE rcp_faits SET status = 'publie', reviewed_by = 'Dr X' WHERE libelle = 'Alcool'")
        self.conn.commit()
        counts = self.run_import([dose()])
        self.assertEqual(counts["brouillons obsolètes supprimés"], 1)  # Vitamine A
        self.assertEqual(sorted(r[0] for r in self.q("SELECT libelle FROM rcp_faits")), ["25–30 mg par jour", "Alcool"])

    def test_publication_sans_relecteur_refusee_par_la_base(self):
        self.run_import([dose()])
        with self.assertRaises(self.pg.errors.CheckViolation):
            self.cur.execute("UPDATE rcp_faits SET status = 'publie'")
        self.conn.rollback()
        with self.assertRaises(self.pg.errors.CheckViolation):
            self.cur.execute("UPDATE rcp_faits SET status = 'publie', reviewed_by = '  '")

    def test_rcp_inconnu_ignore(self):
        counts = self.run_import([dose()], rid=UNKNOWN)
        self.assertEqual(counts["RCP absents de rcp_documents (ignorés)"], 1)
        self.assertEqual(self.q("SELECT count(*) FROM rcp_faits"), [(0,)])


if __name__ == "__main__":
    unittest.main()
