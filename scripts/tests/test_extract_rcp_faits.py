"""
Tests de l'extraction de faits courts depuis le texte des RCP.

    python3 -m unittest discover -s scripts/tests -v

Les pages de test sont de courtes phrases inventées qui reprennent la mise en
forme des RCP (en-tête répété, intertitres, « + Substance »). Aucun PDF requis.
"""

import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import extract_rcp_faits as x  # noqa: E402

HEADER = "RÉSUMÉ DES CARACTÉRISTIQUES DU\nCode :\nPRODUIT\nE0002/3.07.0002/TR\nXYZ, DCI : Test Version : 02\nXYZ gélule 10mg Page {n} sur 3\nVersion : 01"


def page(n: int, body: str) -> str:
    return HEADER.format(n=n) + "\n" + body


PAGES = [
    page(1, "1. DENOMINATION DU MEDICAMENT\n4.1. Indications thérapeutiques :\nUne indication."),
    page(2, "4.2. Posologie et mode d'administration :\nPosologie\nAdultes\n"
            "Une posologie initiale de 25 à 30 mg par jour pendant 2 semaines est utilisée. La dose peut être\n"
            "augmentée par paliers hebdomadaires de 10 mg. Il ne faut pas dépasser 75 mg par jour.\n"
            "Population pédiatrique\nLa posologie est de 0,5 mg par kg et par jour, sans dépasser 35 mg par jour.\n"
            "Mode d'administration\nUne prise le matin, 500 mg de lait.\n"
            "4.3. Contre-indications :\n• Association avec les tétracyclines : risque d'hypertension.\n"
            "• Association avec le méthotrexate : risque hépatique."),
    page(3, "4.5. Interactions médicamenteuses et autres formes d'interactions :\n"
            "Associations contre-indiquées\n+ Méthotrexate\nRisque accru.\n"
            "Associations déconseillées\n+ Alcool (boisson ou excipient)\nÀ éviter.\n"
            "Associations faisant l'objet de précautions d'emploi\n+ Diurétiques\nSurveiller.\n"
            "4.6. Fertilité, grossesse et allaitement\nTexte.\n"
            "8.5 Date de mise à jour du texte : 03/2024"),
]


class Sections(unittest.TestCase):
    def setUp(self):
        self.sections = x.split_sections(x.body_lines(PAGES))

    def test_entetes_retires_et_rubriques_trouvees(self):
        self.assertEqual(sorted(self.sections), ["4.1", "4.2", "4.3", "4.5", "4.6"])
        for lines in self.sections.values():
            self.assertFalse(any("Page" in l and "sur" in l for _, l in lines))

    def test_pages(self):
        self.assertEqual({p for p, _ in self.sections["4.2"]}, {2})
        self.assertEqual({p for p, _ in self.sections["4.5"]}, {3})

    def test_version_du_texte(self):
        self.assertEqual(x.extract_version(PAGES), "03/2024")
        self.assertIsNone(x.extract_version(["pas de date ici"]))


class Interactions(unittest.TestCase):
    def setUp(self):
        facts = x.extract_interactions(x.split_sections(x.body_lines(PAGES)))
        self.by = {f["libelle"]: f for f in facts}

    def test_associations_de_la_rubrique_4_3(self):
        self.assertEqual(self.by["Tétracyclines"]["gravite"], "contre_indiquee")
        self.assertEqual((self.by["Tétracyclines"]["section"], self.by["Tétracyclines"]["page"]), ("4.3", 2))

    def test_gravite_selon_les_intertitres_de_4_5(self):
        self.assertEqual(self.by["Alcool (boisson ou excipient)"]["gravite"], "deconseillee")
        self.assertEqual(self.by["Diurétiques"]["gravite"], "precaution")

    def test_doublon_4_3_et_4_5_garde_le_plus_grave(self):
        self.assertEqual(self.by["Méthotrexate"]["gravite"], "contre_indiquee")
        self.assertEqual(sum(1 for k in self.by if k == "Méthotrexate"), 1)

    def test_nom_nettoye(self):
        self.assertEqual(x.clean_name("alcool (voir rubrique 4.6)"), "Alcool")
        self.assertEqual(x.clean_name("vitamine a : risque"), "Vitamine a")

    def test_contexte_court_pour_la_relecture(self):
        self.assertTrue(all(len(f["contexte"]) <= 300 for f in self.by.values()))

    def test_sans_intertitre_gravite_non_precisee(self):
        pages = [page(1, "4.5. Interactions médicamenteuses\n+ Cyclines\nRisque.\n4.6. Fertilité\nx")]
        facts = x.extract_interactions(x.split_sections(x.body_lines(pages)))
        self.assertEqual([(f["libelle"], f["gravite"]) for f in facts], [("Cyclines", "non_precisee")])


class Doses(unittest.TestCase):
    def setUp(self):
        sections = x.split_sections(x.body_lines(PAGES))
        self.doses = x.extract_doses(sections["4.2"])
        self.labels = {(d["population"], d["libelle"]) for d in self.doses}

    def test_doses_par_population(self):
        self.assertIn(("adulte", "25–30 mg par jour (dose initiale)"), self.labels)
        self.assertIn(("adulte", "75 mg par jour (maximum)"), self.labels)
        self.assertIn(("enfant", "0,5 mg/kg par jour"), self.labels)
        self.assertIn(("enfant", "35 mg par jour (maximum)"), self.labels)

    def test_un_palier_dajustement_n_est_pas_une_dose(self):
        self.assertFalse(any(d["dose_min"] == 10 for d in self.doses))

    def test_quantite_sans_frequence_ignoree(self):
        self.assertFalse(any(d["dose_min"] == 500 for d in self.doses))  # « 500 mg de lait » après « Mode d'administration »

    def test_valeurs_structurees(self):
        d = next(d for d in self.doses if d["libelle"].startswith("25–30"))
        self.assertEqual((d["dose_min"], d["dose_max"], d["unite"], d["par"], d["section"], d["page"]),
                         (25.0, 30.0, "mg", "jour", "4.2", 2))

    def test_formatage_des_libelles(self):
        self.assertEqual(x.dose_label(25, 30, "mg", "jour", None), "25–30 mg par jour")
        self.assertEqual(x.dose_label(0.5, None, "mg/kg", "jour", "dose initiale"), "0,5 mg/kg par jour (dose initiale)")


PAGES_CI = [
    page(1, "4.3. Contre-indications :\n"
            "Hypersensibilité à la substance active, aux autres rétinoïdes ou à l'un des excipients\n"
            "•\nmentionnés sur la rubrique 6.1.\nFemmes enceintes ou qui allaitent.\n•\n"
            "Femmes en âge de procréer sauf si toutes les conditions du programme de\n•\nprévention sont remplies.\n"
            "Insuffisance hépatique sévère.\nAssociation avec le méthotrexate : risque hépatique\n"
            "Consommation d'alcool chez la femme en âge de procréer\n"
            "4.6. Fertilité, grossesse et allaitement\nGrossesse\n"
            "La grossesse est une contre-indication absolue. La survenue d'une grossesse comporte un risque.\n"
            "Femmes en âge de procréer/contraception\nLes femmes doivent utiliser une contraception.\n"
            "Allaitement\nL'allaitement est déconseillé. Une prudence particulière est de mise.\n"
            "Fertilité\nAucune donnée."),
    page(2, "4.7. Effets sur la capacité à conduire\nTexte."),
]


class ContreIndications(unittest.TestCase):
    def setUp(self):
        self.sections = x.split_sections(x.body_lines(PAGES_CI))

    def test_elements_sans_se_fier_aux_puces(self):
        out = [f["libelle"] for f in x.extract_contre_indications(self.sections)]
        self.assertEqual(out, ["Hypersensibilité à la substance active", "Femmes enceintes ou qui allaitent",
                               "Femmes en âge de procréer", "Insuffisance hépatique sévère", "Consommation d'alcool"])

    def test_associations_ne_sont_pas_des_contre_indications(self):
        self.assertFalse(any("thotrexate" in f["libelle"] for f in x.extract_contre_indications(self.sections)))

    def test_phrase_dintroduction_ignoree(self):
        lines = [(1, "Ce médicament est contre-indiqué dans les cas suivants :"), (1, "Ulcère évolutif.")]
        self.assertEqual([f["libelle"] for f in x.extract_contre_indications({"4.3": lines})], ["Ulcère évolutif"])

    def test_nom_court(self):
        self.assertEqual(x.short_condition("Insuffisance rénale sévère."), "Insuffisance rénale sévère")
        self.assertEqual(x.short_condition("hypersensibilité à la substance active, aux autres rétinoïdes"), "Hypersensibilité à la substance active")
        self.assertLessEqual(len(x.short_condition("un deux trois quatre cinq six sept huit neuf dix onze").split()), 8)

    def test_contexte_garde_pour_la_relecture(self):
        f = x.extract_contre_indications(self.sections)[0]
        self.assertIn("mentionnés sur la rubrique 6.1", f["contexte"])


class Grossesse(unittest.TestCase):
    def setUp(self):
        sections = x.split_sections(x.body_lines(PAGES_CI))
        self.by = {f["libelle"]: f for f in x.extract_grossesse(sections)}

    def test_grossesse_contre_indiquee(self):
        self.assertEqual(self.by["Grossesse"]["gravite"], "contre_indiquee")
        self.assertEqual((self.by["Grossesse"]["section"], self.by["Grossesse"]["page"]), ("4.6", 1))

    def test_deux_niveaux_dans_la_meme_phrase_de_principe_est_a_trancher(self):
        # « déconseillé » + « prudence » : deux niveaux, on ne choisit pas à la place du relecteur
        self.assertEqual(self.by["Allaitement"]["gravite"], "non_precisee")

    def test_fertilite_et_contraception_ne_sont_pas_des_statuts(self):
        self.assertEqual(sorted(self.by), ["Allaitement", "Grossesse"])

    def test_statut_en_ligne(self):
        lines = [(1, "Grossesse : déconseillée sauf nécessité absolue."), (1, "Allaitement : contre-indiqué.")]
        by = {f["libelle"]: f["gravite"] for f in x.extract_grossesse({"4.6": lines})}
        self.assertEqual(by, {"Grossesse": "deconseillee", "Allaitement": "contre_indiquee"})

    def test_regex_contre_indication_et_contre_indique(self):
        for text in ("contre-indication absolue", "est contre-indiqué", "contre indiquée"):
            rx = dict(x._LEVELS)["contre_indiquee"]
            self.assertTrue(rx.search(text), text)


class Orchestration(unittest.TestCase):
    def test_extract_rcp(self):
        r = x.extract_rcp(PAGES)
        self.assertEqual(r["version_texte"], "03/2024")
        self.assertEqual({f["type"] for f in r["faits"]}, {"interaction", "dose"})
        r2 = x.extract_rcp(PAGES_CI)
        self.assertEqual({f["type"] for f in r2["faits"]}, {"contre_indication", "grossesse", "interaction"})


if __name__ == "__main__":
    unittest.main()
