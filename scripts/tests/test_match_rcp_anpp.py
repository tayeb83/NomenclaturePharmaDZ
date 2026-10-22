"""
Tests du rapprochement RCP ANPP ↔ nomenclature.

    python3 -m unittest discover -s scripts/tests -v

Aucune base requise : la nomenclature de test est écrite en dur, avec des
libellés calqués sur ceux du portail (sels, « EXPRIME EN », graphies de
laboratoire, fautes de frappe).
"""

import contextlib
import csv
import io
import json
import os
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import match_rcp_anpp as m  # noqa: E402

NOMENCLATURE = [
    {"id": 1, "dci": "BICALUTAMIDE", "nom_marque": "CLAMUDEX", "labo": "ELKENDI", "dosage": "50 MG"},
    {"id": 2, "dci": "ATORVASTATINE", "nom_marque": "ATOSTINE", "labo": "LDM", "dosage": "10 MG"},
    {"id": 3, "dci": "ATORVASTATINE", "nom_marque": "ATOSTINE", "labo": "LDM", "dosage": "20 MG"},
    {"id": 4, "dci": "CIPROFLOXACINE", "nom_marque": "CIFLOX", "labo": "BIOPHARM", "dosage": "500 MG"},
    {"id": 5, "dci": "FLUVASTATINE", "nom_marque": "FLUVASTINE", "labo": "LABORATOIRES DE DIAGNOSTIC MAGHREBINS", "dosage": "40 MG"},
    {"id": 6, "dci": "ANASTROZOLE", "nom_marque": "ANASTROZOLE", "labo": "DEMOCEDES PHARMA ALGERIE", "dosage": "1 MG"},
    {"id": 7, "dci": "AMLODIPINE / VALSARTAN", "nom_marque": "EXFORGEO", "labo": "GENCOPHARM", "dosage": "5/160 MG"},
    {"id": 8, "dci": "ACIDE ALENDRONIQUE", "nom_marque": "ALENDRA", "labo": "SOPHAL", "dosage": "70 MG"},
    {"id": 9, "dci": "ABIRATERONE", "nom_marque": "ABYRA", "labo": "DEMOCEDES PHARMA ALGERIE", "dosage": "250 MG"},
    {"id": 10, "dci": "PARACETAMOL", "nom_marque": "DOLIPRANE", "labo": "SANOFI", "dosage": "500 MG"},
    {"id": 11, "dci": "METFORMINE", "nom_marque": "GLUCOPHAGE", "labo": "MERCK", "dosage": "850 MG"},
]


def rcp(nom, dci, labo, pdf=None):
    return {"nomCommercial": nom, "dci": dci, "dciRecherchee": dci, "laboratoire": labo,
            "pdf": pdf or f"https://rcp.anpp.dz/storage/rcp-pdfs/x/{nom}.pdf"}


def match(entry):
    return m.match_one(entry, m.Index(m.load_nomenclature(NOMENCLATURE)))


class Normalisation(unittest.TestCase):
    def test_substances_sans_sels_ni_formulation(self):
        c = m.dci_components
        self.assertEqual(c("ATORVASTATINE CALCIQUE TRIHYDRATE EXPRIME EN ATORVASTATINE"), ("ATORVASTATINE",))
        self.assertEqual(c("ROSUVASTATINE SOUS FORME DE ROSUVASTATINE CALCIQUE"), ("ROSUVASTATINE",))
        self.assertEqual(c("ACETATE D'ABIRATERONE"), ("ABIRATERONE",))
        self.assertEqual(c("Éscitalopram oxalate"), ("ESCITALOPRAM",))

    def test_associations(self):
        c = m.dci_components
        self.assertEqual(c("SPIRAMYCINE/METRONIDAZOLE"), ("METRONIDAZOLE", "SPIRAMYCINE"))
        self.assertEqual(c("AMLODIPINE BESILATE EXPRIME EN AMLODIPINE/VALSARTAN"), ("AMLODIPINE", "VALSARTAN"))

    def test_alendronate_et_acide_alendronique(self):
        a = m.dci_components("ALENDRONATE MONOSODIQUE TRIHYDRATE EXPRIME EN ACIDE ALENDRONIQUE")
        b = m.dci_components("ACIDE ALENDRONIQUE")
        self.assertEqual(m.dci_relation(a, b), "exact")

    def test_faute_de_frappe(self):
        a, b = m.dci_components("CIOROFLOXACINE SOUS FORME HYDROCHLORIDE"), m.dci_components("CIPROFLOXACINE")
        self.assertEqual(m.dci_relation(a, b), "proche")

    def test_substances_differentes(self):
        self.assertIsNone(m.dci_relation(("METFORMINE",), ("PARACETAMOL",)))
        self.assertEqual(m.dci_relation(("AMLODIPINE",), ("AMLODIPINE", "VALSARTAN")), "partielle")

    def test_graphies_de_laboratoire(self):
        r = m.labo_relation
        self.assertEqual(r("BIOPHARM", "BIOPHARM SPA"), "exact")
        self.assertEqual(r("ELKENDI", "EL KENDI INDUSTRIE DU MEDICAMENT"), "exact")
        self.assertEqual(r("LABORATOIRES DE DIAGNOSTIC MAGHREBINS-LDM", "LABORATOIRES DE DIAGNOSTIC MAGHREBINS"), "proche")
        self.assertIsNone(r("BIOPHARM", "GENCOPHARM"))
        self.assertIsNone(r("", "BIOPHARM"))

    def test_variantes_de_marque(self):
        v = dict(m.brand_variants("FLUVASTINE 40 MG", "LDM"))
        self.assertEqual(v["FLUVASTINE"], "sans_dosage")
        v = dict(m.brand_variants("ANASTROZOLE DEMOCEDES", "DEMOCEDES PHARMA ALGERIE"))
        self.assertEqual(v["ANASTROZOLE"], "sans_labo")


class Rapprochement(unittest.TestCase):
    def test_auto_avec_graphie_de_labo_differente(self):
        r = match(rcp("CLAMUDEX", "BICALUTAMIDE", "EL KENDI INDUSTRIE DU MEDICAMENT"))
        self.assertEqual(r.statut, "auto")
        self.assertEqual([f.id for f in r.fiches], ["1"])

    def test_auto_avec_sel_et_plusieurs_dosages(self):
        r = match(rcp("ATOSTINE", "ATORVASTATINE CALCIQUE TRIHYDRATE EXPRIME EN ATORVASTATINE",
                      "LABORATOIRES DE DIAGNOSTIC MAGHREBINS-LDM"))
        # LDM seul vs libellé complet : labo trop différent pour être exact, donc au mieux probable
        self.assertIn(r.statut, ("auto", "probable"))
        self.assertEqual({f.id for f in r.fiches}, {"2", "3"})

    def test_auto_avec_faute_de_frappe(self):
        r = match(rcp("CIFLOX", "CIOROFLOXACINE SOUS FORME HYDROCHLORIDE", "BIOPHARM SPA"))
        self.assertEqual(r.statut, "auto")
        self.assertEqual(r.dci, "proche")

    def test_marque_avec_dosage(self):
        r = match(rcp("FLUVASTINE 40 MG", "FLUVASTATINE SODIQUE EXPRIME EN FLUVASTATINE",
                      "LABORATOIRES DE DIAGNOSTIC MAGHREBINS-LDM"))
        self.assertEqual(r.statut, "auto")
        self.assertEqual(r.brand, "sans_dosage")

    def test_marque_suivie_du_laboratoire_est_probable(self):
        r = match(rcp("ANASTROZOLE DEMOCEDES", "ANASTROZOLE", "DEMOCEDES PHARMA ALGERIE"))
        self.assertEqual(r.statut, "probable")

    def test_association(self):
        r = match(rcp("EXFORGEO", "AMLODIPINE BESILATE EXPRIME EN AMLODIPINE/VALSARTAN", "GENCOPHARM"))
        self.assertEqual(r.statut, "auto")

    def test_acide_alendronique(self):
        r = match(rcp("ALENDRA", "ALENDRONATE MONOSODIQUE TRIHYDRATE EXPRIME EN ACIDE ALENDRONIQUE",
                      "SOCIETE PHARMACEUTIQUE ALGERIENNE SOPHAL"))
        self.assertEqual(r.statut, "auto")

    def test_acetate_dabiraterone(self):
        r = match(rcp("ABYRA", "ACETATE D'ABIRATERONE", "DEMOCEDES PHARMA ALGERIE"))
        self.assertEqual(r.statut, "auto")

    def test_laboratoire_different_est_probable(self):
        r = match(rcp("DOLIPRANE", "PARACETAMOL", "UPSA"))
        self.assertEqual(r.statut, "probable")
        self.assertIn("laboratoire différent", r.note)

    def test_meme_marque_autre_substance_est_a_relire(self):
        r = match(rcp("DOLIPRANE", "IBUPROFENE", "SANOFI"))
        self.assertEqual(r.statut, "a_relire")
        self.assertIn("substance différente", r.note)

    def test_substance_seule(self):
        r = match(rcp("PARACETALGIC", "PARACETAMOL", "AUTRE LABO"))
        self.assertEqual(r.statut, "dci_seulement")
        self.assertEqual([f.id for f in r.fiches], ["10"])

    def test_aucune(self):
        self.assertEqual(match(rcp("INCONNU", "SUBSTANCE INEXISTANTE", "X")).statut, "aucune")

    def test_marque_proche_jamais_auto(self):
        r = match(rcp("CLAMUDEXE", "BICALUTAMIDE", "ELKENDI"))
        self.assertEqual(r.statut, "probable")
        self.assertEqual(r.brand, "proche")


class Fichiers(unittest.TestCase):
    def test_doublons_fusionnes(self):
        a = rcp("ATOSTINE", "ATORVASTATINE", "LDM", pdf="https://rcp.anpp.dz/storage/rcp-pdfs/x/same.pdf")
        out, n = m.dedupe_rcp([a, dict(a), rcp("CIFLOX", "CIPROFLOXACINE", "BIOPHARM")])
        self.assertEqual((len(out), n), (2, 1))

    def test_rcp_id_depuis_le_pdf(self):
        e = rcp("X", "Y", "Z", pdf="https://rcp.anpp.dz/storage/rcp-pdfs/biopharm-spa/6aa32dae-306d-4feb-85a1-fa181acf992f.pdf")
        self.assertEqual(m.rcp_id(e), "6aa32dae-306d-4feb-85a1-fa181acf992f")

    def test_pdf_multiples_sur_les_memes_fiches_sont_signales(self):
        # Deux PDF distincts pour ATOSTINE (un par dosage ?) : les deux tombent sur les fiches 2 et 3.
        with tempfile.TemporaryDirectory() as tmp:
            entries = [rcp("ATOSTINE", "ATORVASTATINE", "LDM", pdf="https://rcp.anpp.dz/storage/rcp-pdfs/x/a.pdf"),
                       rcp("ATOSTINE", "ATORVASTATINE", "LDM", pdf="https://rcp.anpp.dz/storage/rcp-pdfs/x/b.pdf"),
                       rcp("CIFLOX", "CIPROFLOXACINE", "BIOPHARM")]
            results = m.run(entries, m.load_nomenclature(NOMENCLATURE))
            summary = m.write_outputs(results, Path(tmp), 0)
            self.assertEqual(summary["rattaches_avec_dosage_ambigu"], 2)
            with (Path(tmp) / "rapprochement.csv").open(encoding="utf-8-sig") as fh:
                by_nom = {}
                for r in csv.DictReader(fh):
                    by_nom.setdefault(r["nom_commercial"], []).append(r["autres_rcp_sur_ces_fiches"])
            self.assertEqual(by_nom["ATOSTINE"], ["1", "1"])
            self.assertEqual(by_nom["CIFLOX"], ["0"])

    def test_bout_en_bout(self):
        with tempfile.TemporaryDirectory() as tmp:
            tmp = Path(tmp)
            (tmp / "res.json").write_text(json.dumps([
                rcp("CLAMUDEX", "BICALUTAMIDE", "ELKENDI"),
                rcp("CLAMUDEX", "BICALUTAMIDE", "ELKENDI"),
                rcp("INCONNU", "SUBSTANCE INEXISTANTE", "X"),
            ]), encoding="utf-8")
            (tmp / "nom.json").write_text(json.dumps({"enregistrements": NOMENCLATURE}), encoding="utf-8")
            with contextlib.redirect_stdout(io.StringIO()):
                code = m.main([str(tmp / "res.json"), "--json", str(tmp / "nom.json"), "--out", str(tmp / "out")])
            self.assertEqual(code, 0)

            summary = json.loads((tmp / "out" / "resume.json").read_text(encoding="utf-8"))
            self.assertEqual((summary["rcp_total"], summary["doublons_ignores"]), (2, 1))
            self.assertEqual((summary["auto"], summary["aucune"]), (1, 1))
            with (tmp / "out" / "rapprochement.csv").open(encoding="utf-8-sig") as fh:
                rows = list(csv.DictReader(fh))
            self.assertEqual([r["statut"] for r in rows], ["auto", "aucune"])
            self.assertEqual(rows[0]["ids_nomenclature"], "1")


if __name__ == "__main__":
    unittest.main()
