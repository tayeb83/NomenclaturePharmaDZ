"""
Tests de l'import des rattachements RCP ↔ fiches.

    python3 -m unittest discover -s scripts/tests -v

La lecture du CSV se teste sans base. L'écriture en base tourne seulement si
TEST_DATABASE_URL pointe vers une base de TEST où sql/01 est appliqué (les
tables rcp_* et enregistrements y sont vidées) :

    TEST_DATABASE_URL=postgresql://dwa:dwa@localhost:5432/dwa_test python3 -m unittest discover -s scripts/tests -v
"""

import contextlib
import csv
import io
import os
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import import_rcp_links as imp  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
A, B, C = ("11111111-1111-4111-8111-11111111111%d" % i for i in (1, 2, 3))
FIELDS = ["rcp_id", "statut", "score", "nom_commercial", "dci_anpp", "laboratoire_anpp", "pdf", "ids_nomenclature", "dosage"]


def write_csv(path: Path, rows: list[dict]) -> None:
    with path.open("w", encoding="utf-8-sig", newline="") as fh:
        w = csv.DictWriter(fh, FIELDS)
        w.writeheader()
        for r in rows:
            w.writerow({k: r.get(k, "") for k in FIELDS})


def row(rcp_id, statut="auto", ids="", nom="ATOSTINE", **kw):
    return {"rcp_id": rcp_id, "statut": statut, "score": "1.0", "nom_commercial": nom,
            "dci_anpp": "ATORVASTATINE CALCIQUE", "laboratoire_anpp": "LDM",
            "pdf": f"https://rcp.anpp.dz/storage/rcp-pdfs/ldm/{rcp_id}.pdf", "ids_nomenclature": ids,
            "dosage": "resolu", **kw}


class LectureCsv(unittest.TestCase):
    def test_statuts_importes_et_ecartes(self):
        with tempfile.TemporaryDirectory() as tmp:
            p = Path(tmp) / "r.csv"
            write_csv(p, [row(A, "auto", "1;2"), row(B, "probable", "3"), row(C, "dci_seulement", "4"),
                          row("pas-un-uuid", "auto", "5"), row(A, "auto", "1"),
                          row("22222222-2222-4222-8222-222222222222", "a_relire", "6"),
                          row("33333333-3333-4333-8333-333333333333", "aucune")])
            records, skipped = imp.read_records(p)
        self.assertEqual([(r.rcp_id, r.statut, r.fiche_ids) for r in records],
                         [(A, "auto", [1, 2]), (B, "probable", [3]), (C, "dci_seulement", [4])])
        self.assertEqual(dict(skipped), {"identifiant de PDF illisible": 1, "doublon": 1,
                                         "statut a_relire": 1, "statut aucune": 1})

    def test_cle_de_substance(self):
        self.assertEqual(imp.dci_key("  atorvastatine   calcique "), "ATORVASTATINE CALCIQUE")


DB_URL = os.environ.get("TEST_DATABASE_URL")


@unittest.skipUnless(DB_URL, "TEST_DATABASE_URL non défini")
class EcritureEnBase(unittest.TestCase):
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
            cur.execute((ROOT / "sql" / "26_rcp_anpp.sql").read_text(encoding="utf-8"))

    def setUp(self):
        self.conn = self.pg.connect(DB_URL)
        self.cur = self.conn.cursor()
        self.cur.execute("TRUNCATE rcp_documents, rcp_fiches, rcp_dci, enregistrements RESTART IDENTITY CASCADE")
        # ids 1 et 2 : deux dosages d'ATOSTINE ; id 3 : sans code
        for n_enreg, code, dci, marque in (("001/A", "C1", "ATORVASTATINE", "ATOSTINE"),
                                           ("002/A", "C2", "atorvastatine ", "ATOSTINE"),
                                           ("003/B", None, "CIPROFLOXACINE", "CIFLOX")):
            self.cur.execute("INSERT INTO enregistrements (n_enreg, code, dci, nom_marque) VALUES (%s, %s, %s, %s)",
                             (n_enreg, code, dci, marque))
        self.conn.commit()

    def tearDown(self):
        self.conn.close()

    def run_import(self, rows):
        with tempfile.TemporaryDirectory() as tmp:
            p = Path(tmp) / "r.csv"
            write_csv(p, rows)
            records, _ = imp.read_records(p)
        counts = imp.import_links(self.cur, records)
        self.conn.commit()
        return counts

    def q(self, sql):
        self.cur.execute(sql)
        return self.cur.fetchall()

    def test_import_et_cles(self):
        counts = self.run_import([row(A, "auto", "1;2"), row(B, "probable", "3", nom="CIFLOX")])
        self.assertEqual(counts["documents ajoutés"], 2)
        self.assertEqual(self.q("SELECT n_enreg, code, statut FROM rcp_fiches ORDER BY n_enreg"),
                         [("001/A", "C1", "auto"), ("002/A", "C2", "auto"), ("003/B", "", "probable")])
        # substances normalisées, une fois par RCP
        self.assertEqual(self.q("SELECT dci FROM rcp_dci WHERE rcp_id = '%s'" % A), [("ATORVASTATINE",)])

    def test_reimport_idempotent(self):
        self.run_import([row(A, "auto", "1;2")])
        counts = self.run_import([row(A, "auto", "1;2")])
        self.assertEqual(counts["documents mis à jour"], 1)
        self.assertEqual(counts["liens fiche mis à jour"], 2)
        self.assertEqual(self.q("SELECT count(*) FROM rcp_fiches"), [(2,)])

    def test_statuts_manuels_conserves(self):
        self.run_import([row(A, "probable", "1;2")])
        self.cur.execute("UPDATE rcp_fiches SET statut = 'confirme' WHERE n_enreg = '001/A'")
        self.cur.execute("UPDATE rcp_fiches SET statut = 'rejete' WHERE n_enreg = '002/A'")
        self.conn.commit()
        self.run_import([row(A, "auto", "1;2")])
        self.assertEqual(self.q("SELECT n_enreg, statut FROM rcp_fiches ORDER BY n_enreg"),
                         [("001/A", "confirme"), ("002/A", "rejete")])

    def test_lien_qui_disparait_est_retire_sauf_confirme(self):
        self.run_import([row(A, "auto", "1;2")])
        self.cur.execute("UPDATE rcp_fiches SET statut = 'confirme' WHERE n_enreg = '002/A'")
        self.conn.commit()
        counts = self.run_import([row(A, "auto", "3", nom="ATOSTINE")])
        self.assertEqual(counts["liens fiche retirés"], 1)  # 001/A auto retiré ; 002/A confirmé gardé
        self.assertEqual(self.q("SELECT n_enreg FROM rcp_fiches ORDER BY n_enreg"), [("002/A",), ("003/B",)])

    def test_liens_survivent_a_un_reimport_de_nomenclature(self):
        self.run_import([row(A, "auto", "1")])
        self.cur.execute("TRUNCATE enregistrements RESTART IDENTITY")
        self.cur.execute("INSERT INTO enregistrements (n_enreg, code, dci, nom_marque) VALUES ('001/A', 'C1', 'ATORVASTATINE', 'ATOSTINE')")
        self.conn.commit()
        self.assertEqual(self.q("SELECT n_enreg, code FROM rcp_fiches"), [("001/A", "C1")])

    def test_dci_seulement_ne_cree_pas_de_lien_fiche(self):
        self.run_import([row(C, "dci_seulement", "3", nom="CIFLOXACINE")])
        self.assertEqual(self.q("SELECT count(*) FROM rcp_fiches"), [(0,)])
        self.assertEqual(self.q("SELECT dci FROM rcp_dci"), [("CIPROFLOXACINE",)])

    def test_id_inconnu_signale(self):
        counts = self.run_import([row(A, "auto", "1;999")])
        self.assertEqual(counts["fiches introuvables (id absent de enregistrements)"], 1)

    def test_essai_a_blanc_n_ecrit_rien(self):
        with tempfile.TemporaryDirectory() as tmp:
            p = Path(tmp) / "r.csv"
            write_csv(p, [row(A, "auto", "1;2")])
            os.environ["DATABASE_URL"] = DB_URL
            try:
                out = io.StringIO()
                with contextlib.redirect_stdout(out):
                    self.assertEqual(imp.main([str(p)]), 0)
            finally:
                del os.environ["DATABASE_URL"]
        self.assertIn("Essai à blanc", out.getvalue())
        self.assertEqual(self.q("SELECT count(*) FROM rcp_documents"), [(0,)])

    def test_apply_ecrit(self):
        with tempfile.TemporaryDirectory() as tmp:
            p = Path(tmp) / "r.csv"
            write_csv(p, [row(A, "auto", "1;2")])
            os.environ["DATABASE_URL"] = DB_URL
            try:
                with contextlib.redirect_stdout(io.StringIO()):
                    self.assertEqual(imp.main([str(p), "--apply"]), 0)
            finally:
                del os.environ["DATABASE_URL"]
        self.assertEqual(self.q("SELECT count(*) FROM rcp_fiches"), [(2,)])


if __name__ == "__main__":
    unittest.main()
