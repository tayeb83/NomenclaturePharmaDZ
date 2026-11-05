"""
Tests de l'export du graphe de connaissances.

    python3 -m unittest discover -s scripts/tests -v

Jeu de données minuscule écrit en dur : les chiffres attendus se vérifient à la main.
La validité du Turtle n'est contrôlée que si rdflib est installé.
"""

import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import kg_export as kg  # noqa: E402

D = {
    "version": "TEST",
    "atc_codes": [{"code": "C10A", "label_fr": "Hypolipémiants", "label_en": None, "niveau": 3}],
    "dci_atc": {"SIMVASTATINE": "C10AA01", "CLARITHROMYCINE": "J01FA09"},
    "enregistrements": [
        {"id": 1, "n_enreg": "1/A", "dci": "Simvastatine", "nom_marque": "A", "labo": "LAB1", "pays": "ALGERIE"},
        {"id": 2, "n_enreg": "2/A", "dci": "SIMVASTATINE", "nom_marque": "B", "labo": "LAB2", "pays": "INDE"},
        {"id": 3, "n_enreg": "3/A", "dci": "CLARITHROMYCINE", "nom_marque": "C", "labo": "LAB3", "pays": "FRANCE"},
        {"id": 4, "n_enreg": "4/A", "dci": "AMOXICILLINE + ACIDE CLAVULANIQUE", "nom_marque": "D", "labo": "LAB3", "pays": "FRANCE"},
    ],
    "retraits": [{"id": 9, "dci": "SIMVASTATINE", "nom_marque": "OLD", "labo": "LAB1", "date_retrait": "2020-01-01", "motif_retrait": "X"}],
    "interaction_classes": [],
    "interactions": [{
        "substance": "SIMVASTATINE", "substance_key": "simvastatine", "partenaire": "CLARITHROMYCINE",
        "partenaire_key": "clarithromycine", "partenaire_est_classe": False, "niveau": "contre_indication",
        "page": 12, "source_version": "T", "risque_fr": "TEXTE SOUS DROITS", "conduite_fr": "TEXTE SOUS DROITS",
    }],
}


class Normalisation(unittest.TestCase):
    def test_fold_et_composants(self):
        self.assertEqual(kg.fold("  Œstradiol  é "), "ŒSTRADIOL E")
        self.assertEqual(kg.composants("amoxicilline + acide clavulanique"), ["AMOXICILLINE", "ACIDE CLAVULANIQUE"])

    def test_parents_atc(self):
        self.assertEqual(kg.atc_parents("C10AA01"), ["C", "C10", "C10A", "C10AA"])


class Indicateurs(unittest.TestCase):
    def setUp(self):
        self.ind = kg.indicateurs(D)

    def test_volume_et_importation(self):
        self.assertEqual(self.ind["volume"]["specialites"], 4)
        self.assertEqual(self.ind["importation"]["part_specialites_importees"], 0.75)
        # AMOXICILLINE + ACIDE... et CLARITHROMYCINE n'ont aucune production locale
        self.assertEqual(self.ind["importation"]["substances_sans_production_locale"], 2)

    def test_interaction_contre_indiquee(self):
        i = self.ind["interactions"]
        self.assertEqual(i["paires_substances"], 1)
        self.assertEqual(i["par_gravite"]["contre_indication"], 1)
        self.assertEqual(i["plus_de_contre_indications"][0]["contre_indications"], 1)

    def test_exposition_retrait(self):
        e = self.ind["retraits_exposition"][0]
        self.assertEqual((e["substance"], e["specialites_encore_enregistrees"], e["laboratoires"]), ("SIMVASTATINE", 2, 2))

    def test_hhi(self):
        self.assertEqual(kg.hhi([1, 1]), 5000.0)
        self.assertEqual(kg.hhi([4]), 10000.0)


class Turtle(unittest.TestCase):
    def setUp(self):
        self.ttl = kg.to_turtle(D)

    def test_pas_de_texte_sous_droits(self):
        self.assertNotIn("TEXTE SOUS DROITS", self.ttl)

    def test_noeuds_attendus(self):
        for attendu in ("spec:1 a dwa:Specialite", "sub:simvastatine a dwa:Substance", "dwa:classeATC atc:C10AA01",
                        "atc:C10AA a skos:Concept", "itx:1 a dwa:Interaction", "dwa:composant sub:amoxicilline"):
            self.assertIn(attendu, self.ttl)

    def test_turtle_valide(self):
        try:
            import rdflib
        except ImportError:
            self.skipTest("rdflib absent")
        g = rdflib.Graph()
        g.parse(data=self.ttl, format="turtle")
        self.assertGreater(len(g), 20)


if __name__ == "__main__":
    unittest.main()
