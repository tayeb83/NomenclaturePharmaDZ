/**
 * DwaDZ — Allergies HDO (Human Disease Ontology) utilisables dans le site : GÉNÉRÉ par scripts/build_hdo_alignement.py,
 * ne pas modifier à la main (corriger data/hdo/ ou le script, puis relancer).
 * Les libellés français sont des brouillons (fr_statut). Pas de codes SNOMED CT ni UMLS ici.
 */

import type { AllergieHdo } from './allergies-core.ts'

export const ALLERGIES_HDO: AllergieHdo[] = [
 {
  "code": "0040002",
  "en": "aspirin allergy",
  "fr": "Allergie — acide acétylsalicylique",
  "fr_statut": "brouillon",
  "definition_en": "A drug allergy that has_allergic_trigger acetylsalicylic acid.",
  "nature": "medicament",
  "perimetre": "fiche",
  "relation": "exact",
  "cle": "acetylsalicylic acid",
  "noms": [
   "acide acétylsalicylique",
   "acetylsalicylic acid"
  ],
  "composants": null,
  "atc": [
   "A01AD05",
   "B01AC06",
   "N02BA01"
  ],
  "atc_libelle_fr": "acide acétylsalicylique",
  "agents": [
   {
    "id": "CHEBI:15365",
    "en": "acetylsalicylic acid",
    "fr": "acide acétylsalicylique",
    "uri": "http://purl.obolibrary.org/obo/CHEBI_15365"
   }
  ],
  "note": null,
  "parents": [
   "DOID:0060500"
  ],
  "sources": [
   "https://www.ncbi.nlm.nih.gov/pubmed/2468301"
  ],
  "uri": "http://purl.obolibrary.org/obo/DOID_0040002"
 },
 {
  "code": "0040003",
  "en": "benzylpenicillin allergy",
  "fr": "Allergie — benzylpénicilline",
  "fr_statut": "brouillon",
  "definition_en": "A beta-lactam allergy that has_allergic_trigger benzylpenicillin.",
  "nature": "medicament",
  "perimetre": "fiche",
  "relation": "exact",
  "cle": "benzylpenicillin",
  "noms": [
   "benzylpénicilline",
   "benzylpenicillin"
  ],
  "composants": null,
  "atc": [
   "J01CE01",
   "S01AA14"
  ],
  "atc_libelle_fr": "benzylpénicilline",
  "agents": [
   {
    "id": "CHEBI:18208",
    "en": "benzylpenicillin",
    "fr": "benzylpénicilline",
    "uri": "http://purl.obolibrary.org/obo/CHEBI_18208"
   }
  ],
  "note": null,
  "parents": [
   "DOID:0060519"
  ],
  "sources": [
   "https://www.ncbi.nlm.nih.gov/pubmed/14483916"
  ],
  "uri": "http://purl.obolibrary.org/obo/DOID_0040003"
 },
 {
  "code": "0040004",
  "en": "amoxicillin allergy",
  "fr": "Allergie — amoxicilline",
  "fr_statut": "brouillon",
  "definition_en": "A beta-lactam allergy that has_allergic_trigger amoxicillin.",
  "nature": "medicament",
  "perimetre": "fiche",
  "relation": "exact",
  "cle": "amoxicillin",
  "noms": [
   "amoxicilline",
   "amoxicillin"
  ],
  "composants": null,
  "atc": [
   "J01CA04"
  ],
  "atc_libelle_fr": "amoxicilline",
  "agents": [
   {
    "id": "CHEBI:2676",
    "en": "amoxicillin",
    "fr": "amoxicilline",
    "uri": "http://purl.obolibrary.org/obo/CHEBI_2676"
   }
  ],
  "note": null,
  "parents": [
   "DOID:0060519"
  ],
  "sources": [
   "https://www.ncbi.nlm.nih.gov/pubmed/11746950"
  ],
  "uri": "http://purl.obolibrary.org/obo/DOID_0040004"
 },
 {
  "code": "0040005",
  "en": "ceftriaxone allergy",
  "fr": "Allergie — ceftriaxone",
  "fr_statut": "brouillon",
  "definition_en": "A cephalosporin allergy that has_allergic_trigger ceftriaxone.",
  "nature": "medicament",
  "perimetre": "fiche",
  "relation": "exact",
  "cle": "ceftriaxone",
  "noms": [
   "ceftriaxone"
  ],
  "composants": null,
  "atc": [
   "J01DD04"
  ],
  "atc_libelle_fr": "ceftriaxone",
  "agents": [
   {
    "id": "CHEBI:29007",
    "en": "ceftriaxone",
    "fr": "ceftriaxone",
    "uri": "http://purl.obolibrary.org/obo/CHEBI_29007"
   }
  ],
  "note": null,
  "parents": [
   "DOID:0040021"
  ],
  "sources": [
   "https://www.ncbi.nlm.nih.gov/pubmed/12833570"
  ],
  "uri": "http://purl.obolibrary.org/obo/DOID_0040005"
 },
 {
  "code": "0040006",
  "en": "carbamazepine allergy",
  "fr": "Allergie — carbamazépine",
  "fr_statut": "brouillon",
  "definition_en": "A drug allergy that has_allergic_trigger carbamazepine.",
  "nature": "medicament",
  "perimetre": "fiche",
  "relation": "exact",
  "cle": "carbamazepine",
  "noms": [
   "carbamazépine",
   "carbamazepine"
  ],
  "composants": null,
  "atc": [
   "N03AF01"
  ],
  "atc_libelle_fr": "carbamazépine",
  "agents": [
   {
    "id": "CHEBI:3387",
    "en": "carbamazepine",
    "fr": "carbamazépine",
    "uri": "http://purl.obolibrary.org/obo/CHEBI_3387"
   }
  ],
  "note": null,
  "parents": [
   "DOID:0060500"
  ],
  "sources": [
   "https://www.ncbi.nlm.nih.gov/pubmed/7602118"
  ],
  "uri": "http://purl.obolibrary.org/obo/DOID_0040006"
 },
 {
  "code": "0040007",
  "en": "abacavir allergy",
  "fr": "Allergie — abacavir",
  "fr_statut": "brouillon",
  "definition_en": "A drug allergy that has_allergic_trigger abacavir.",
  "nature": "medicament",
  "perimetre": "fiche",
  "relation": "exact",
  "cle": "abacavir",
  "noms": [
   "abacavir"
  ],
  "composants": null,
  "atc": [
   "J05AF06"
  ],
  "atc_libelle_fr": "abacavir",
  "agents": [
   {
    "id": "CHEBI:421707",
    "en": "abacavir",
    "fr": "abacavir",
    "uri": "http://purl.obolibrary.org/obo/CHEBI_421707"
   }
  ],
  "note": null,
  "parents": [
   "DOID:0060500"
  ],
  "sources": [
   "https://www.ncbi.nlm.nih.gov/pubmed/25674793"
  ],
  "uri": "http://purl.obolibrary.org/obo/DOID_0040007"
 },
 {
  "code": "0040008",
  "en": "isoniazide allergy",
  "fr": "Allergie — isoniazide",
  "fr_statut": "brouillon",
  "definition_en": "A drug allergy that has_allergic_trigger isoniazide.",
  "nature": "medicament",
  "perimetre": "fiche",
  "relation": "exact",
  "cle": "isoniazid",
  "noms": [
   "isoniazide",
   "isoniazid"
  ],
  "composants": null,
  "atc": [
   "J04AC01"
  ],
  "atc_libelle_fr": "isoniazide",
  "agents": [
   {
    "id": "CHEBI:6030",
    "en": "isoniazide",
    "fr": "isoniazide",
    "uri": "http://purl.obolibrary.org/obo/CHEBI_6030"
   }
  ],
  "note": "orthographe « isoniazide » côté HDO",
  "parents": [
   "DOID:0060500"
  ],
  "sources": [
   "https://www.ncbi.nlm.nih.gov/pubmed/445303"
  ],
  "uri": "http://purl.obolibrary.org/obo/DOID_0040008"
 },
 {
  "code": "0040009",
  "en": "lidocaine allergy",
  "fr": "Allergie — lidocaïne",
  "fr_statut": "brouillon",
  "definition_en": "A drug allergy that has_allergic_trigger lidocaine.",
  "nature": "medicament",
  "perimetre": "fiche",
  "relation": "exact",
  "cle": "lidocaine",
  "noms": [
   "lidocaïne",
   "lidocaine"
  ],
  "composants": null,
  "atc": [
   "C01BB01",
   "C05AD01",
   "D04AB01",
   "N01BB02",
   "R02AD02",
   "S01HA07",
   "S02DA01"
  ],
  "atc_libelle_fr": "lidocaïne",
  "agents": [
   {
    "id": "CHEBI:6456",
    "en": "lidocaine",
    "fr": "lidocaïne",
    "uri": "http://purl.obolibrary.org/obo/CHEBI_6456"
   }
  ],
  "note": null,
  "parents": [
   "DOID:0060500"
  ],
  "sources": [
   "https://www.ncbi.nlm.nih.gov/pubmed/9013953"
  ],
  "uri": "http://purl.obolibrary.org/obo/DOID_0040009"
 },
 {
  "code": "0040010",
  "en": "mepivacaine allergy",
  "fr": "Allergie — mépivacaïne",
  "fr_statut": "brouillon",
  "definition_en": "A drug allergy that has_allergic_trigger mepivacaine.",
  "nature": "medicament",
  "perimetre": "fiche",
  "relation": "exact",
  "cle": "mepivacaine",
  "noms": [
   "mépivacaïne",
   "mepivacaine"
  ],
  "composants": null,
  "atc": [
   "N01BB03"
  ],
  "atc_libelle_fr": "mépivacaïne",
  "agents": [
   {
    "id": "CHEBI:6759",
    "en": "mepivacaine",
    "fr": "mépivacaïne",
    "uri": "http://purl.obolibrary.org/obo/CHEBI_6759"
   }
  ],
  "note": null,
  "parents": [
   "DOID:0060500"
  ],
  "sources": [
   "https://www.ncbi.nlm.nih.gov/pubmed/9989796"
  ],
  "uri": "http://purl.obolibrary.org/obo/DOID_0040010"
 },
 {
  "code": "0040011",
  "en": "phenobarbital allergy",
  "fr": "Allergie — phénobarbital",
  "fr_statut": "brouillon",
  "definition_en": "A drug allergy that has_allergic_trigger phenobarbital.",
  "nature": "medicament",
  "perimetre": "fiche",
  "relation": "exact",
  "cle": "phenobarbital",
  "noms": [
   "phénobarbital",
   "phenobarbital"
  ],
  "composants": null,
  "atc": [
   "N03AA02"
  ],
  "atc_libelle_fr": "phénobarbital",
  "agents": [
   {
    "id": "CHEBI:8069",
    "en": "phenobarbital",
    "fr": "phénobarbital",
    "uri": "http://purl.obolibrary.org/obo/CHEBI_8069"
   }
  ],
  "note": null,
  "parents": [
   "DOID:0060500"
  ],
  "sources": [
   "https://www.ncbi.nlm.nih.gov/pubmed/11994495"
  ],
  "uri": "http://purl.obolibrary.org/obo/DOID_0040011"
 },
 {
  "code": "0040012",
  "en": "phenytoin allergy",
  "fr": "Allergie — phénytoïne",
  "fr_statut": "brouillon",
  "definition_en": "A drug allergy that has_allergic_trigger phenytoin.",
  "nature": "medicament",
  "perimetre": "fiche",
  "relation": "exact",
  "cle": "phenytoin",
  "noms": [
   "phénytoïne",
   "phenytoin"
  ],
  "composants": null,
  "atc": [
   "N03AB02"
  ],
  "atc_libelle_fr": "phénytoïne",
  "agents": [
   {
    "id": "CHEBI:8107",
    "en": "phenytoin",
    "fr": "phénytoïne",
    "uri": "http://purl.obolibrary.org/obo/CHEBI_8107"
   }
  ],
  "note": null,
  "parents": [
   "DOID:0060500"
  ],
  "sources": [
   "https://www.ncbi.nlm.nih.gov/pubmed/7602118"
  ],
  "uri": "http://purl.obolibrary.org/obo/DOID_0040012"
 },
 {
  "code": "0040013",
  "en": "ranitidine allergy",
  "fr": "Allergie — ranitidine",
  "fr_statut": "brouillon",
  "definition_en": "A drug allergy that has_allergic_trigger ranitidine.",
  "nature": "medicament",
  "perimetre": "fiche",
  "relation": "exact",
  "cle": "ranitidine",
  "noms": [
   "ranitidine"
  ],
  "composants": null,
  "atc": [
   "A02BA02"
  ],
  "atc_libelle_fr": "ranitidine",
  "agents": [
   {
    "id": "CHEBI:8776",
    "en": "ranitidine",
    "fr": "ranitidine",
    "uri": "http://purl.obolibrary.org/obo/CHEBI_8776"
   }
  ],
  "note": null,
  "parents": [
   "DOID:0060500"
  ],
  "sources": [
   "https://www.ncbi.nlm.nih.gov/pubmed/7782125"
  ],
  "uri": "http://purl.obolibrary.org/obo/DOID_0040013"
 },
 {
  "code": "0040014",
  "en": "corticosteroid allergy",
  "fr": "Allergie — corticoïdes",
  "fr_statut": "brouillon",
  "definition_en": "A drug allergy that has_allergic_trigger corticosteroid.",
  "nature": "medicament",
  "perimetre": "fiche",
  "relation": "classe",
  "cle": null,
  "noms": [],
  "composants": null,
  "atc": [
   "A01AC",
   "A07EA",
   "C05AA",
   "D07AA",
   "D07AB",
   "D07AC",
   "D07AD",
   "D07BA",
   "D07BB",
   "D07BC",
   "D07BD",
   "D07CA",
   "D07CB",
   "D07CC",
   "D07CD",
   "D07XA",
   "D07XB",
   "D07XC",
   "D07XD",
   "D10AA",
   "G01BA",
   "G01BC",
   "G01BD",
   "G01BE",
   "G01BF",
   "H02AB",
   "H02BX",
   "M01BA",
   "R01AD",
   "R03BA",
   "S01BA",
   "S01BB",
   "S01CA",
   "S01CB",
   "S02BA",
   "S02CA",
   "S03BA",
   "S03CA"
  ],
  "atc_libelle_fr": "corticoïdes pour traitement oral local ; corticoïdes à action locale ; corticoïdes …",
  "agents": [
   {
    "id": "CHEBI:50858",
    "en": "corticosteroid",
    "fr": "corticoïdes",
    "uri": "http://purl.obolibrary.org/obo/CHEBI_50858"
   }
  ],
  "note": "corticoïdes seuls ou associés (liste ATC explicite) ; les associations bronchodilatateur + corticoïde (R03AK, R03AL) ne sont pas couvertes : leurs codes mélangent des produits avec et sans corticoïde",
  "parents": [
   "DOID:0060500"
  ],
  "sources": [
   "https://www.ncbi.nlm.nih.gov/pubmed/2265088"
  ],
  "uri": "http://purl.obolibrary.org/obo/DOID_0040014"
 },
 {
  "code": "0040015",
  "en": "sulfonamide allergy",
  "fr": "Allergie — sulfamides antibactériens",
  "fr_statut": "brouillon",
  "definition_en": "A drug allergy that has_allergic_trigger sulfonamide.",
  "nature": "medicament",
  "perimetre": "fiche",
  "relation": "classe",
  "cle": null,
  "noms": [],
  "composants": null,
  "atc": [
   "A07AB",
   "D06BA",
   "G01AE",
   "J01EB",
   "J01EC",
   "J01ED",
   "J01EE"
  ],
  "atc_libelle_fr": "sulfamides ; sulfamides ; sulfamides …",
  "agents": [
   {
    "id": "CHEBI:35358",
    "en": "sulfonamide",
    "fr": "sulfamides antibactériens",
    "uri": "http://purl.obolibrary.org/obo/CHEBI_35358"
   }
  ],
  "note": "sulfamides antibactériens seulement (la source HDO parle des antibiotiques) ; ni diurétiques ni sulfamides hypoglycémiants ; le triméthoprime seul (J01EA) n’en est pas un",
  "parents": [
   "DOID:0060500"
  ],
  "sources": [
   "https://www.ncbi.nlm.nih.gov/pubmed/2434548"
  ],
  "uri": "http://purl.obolibrary.org/obo/DOID_0040015"
 },
 {
  "code": "0040016",
  "en": "sulfamethoxazole allergy",
  "fr": "Allergie — sulfaméthoxazole",
  "fr_statut": "brouillon",
  "definition_en": "A drug allergy that has_allergic_trigger sulfamethoxazole.",
  "nature": "medicament",
  "perimetre": "fiche",
  "relation": "exact",
  "cle": "sulfamethoxazole",
  "noms": [
   "sulfaméthoxazole",
   "sulfamethoxazole"
  ],
  "composants": null,
  "atc": [
   "J01EC01"
  ],
  "atc_libelle_fr": "sulfaméthoxazole",
  "agents": [
   {
    "id": "CHEBI:9332",
    "en": "sulfamethoxazole",
    "fr": "sulfaméthoxazole",
    "uri": "http://purl.obolibrary.org/obo/CHEBI_9332"
   }
  ],
  "note": null,
  "parents": [
   "DOID:0060500"
  ],
  "sources": [
   "https://www.ncbi.nlm.nih.gov/pubmed/7602118"
  ],
  "uri": "http://purl.obolibrary.org/obo/DOID_0040016"
 },
 {
  "code": "0040017",
  "en": "suprofen allergy",
  "fr": "Allergie — suprofène",
  "fr_statut": "brouillon",
  "definition_en": "A drug allergy that has_allergic_trigger suprofen.",
  "nature": "medicament",
  "perimetre": "fiche",
  "relation": "exact",
  "cle": "suprofen",
  "noms": [
   "suprofène",
   "suprofen"
  ],
  "composants": null,
  "atc": [
   "M01AE07"
  ],
  "atc_libelle_fr": "suprofène",
  "agents": [
   {
    "id": "CHEBI:9362",
    "en": "suprofen",
    "fr": "suprofène",
    "uri": "http://purl.obolibrary.org/obo/CHEBI_9362"
   }
  ],
  "note": null,
  "parents": [
   "DOID:0060500"
  ],
  "sources": [
   "https://www.ncbi.nlm.nih.gov/pubmed/509935"
  ],
  "uri": "http://purl.obolibrary.org/obo/DOID_0040017"
 },
 {
  "code": "0040018",
  "en": "thiopental allergy",
  "fr": "Allergie — thiopental",
  "fr_statut": "brouillon",
  "definition_en": "A drug allergy that has_allergic_trigger thiopental.",
  "nature": "medicament",
  "perimetre": "fiche",
  "relation": "exact",
  "cle": "thiopental",
  "noms": [
   "thiopental"
  ],
  "composants": null,
  "atc": [
   "N01AF03",
   "N05CA19"
  ],
  "atc_libelle_fr": "thiopental",
  "agents": [
   {
    "id": "CHEBI:102166",
    "en": "thiopental",
    "fr": "thiopental",
    "uri": "http://purl.obolibrary.org/obo/CHEBI_102166"
   }
  ],
  "note": null,
  "parents": [
   "DOID:0060500"
  ],
  "sources": [
   "https://www.ncbi.nlm.nih.gov/pubmed/2215478"
  ],
  "uri": "http://purl.obolibrary.org/obo/DOID_0040018"
 },
 {
  "code": "0040019",
  "en": "D-mannitol allergy",
  "fr": "Allergie — mannitol",
  "fr_statut": "brouillon",
  "definition_en": "A drug allergy that has_allergic_trigger D-mannitol.",
  "nature": "medicament",
  "perimetre": "fiche",
  "relation": "exact",
  "cle": "mannitol",
  "noms": [
   "mannitol",
   "D-mannitol"
  ],
  "composants": null,
  "atc": [
   "A06AD16",
   "B05BC01",
   "B05CX04",
   "R05CB16",
   "V04CX04"
  ],
  "atc_libelle_fr": "mannitol",
  "agents": [
   {
    "id": "CHEBI:16899",
    "en": "D-mannitol",
    "fr": "mannitol",
    "uri": "http://purl.obolibrary.org/obo/CHEBI_16899"
   }
  ],
  "note": "aussi excipient fréquent : voir perimetre",
  "parents": [
   "DOID:0060500"
  ],
  "sources": [
   "https://www.ncbi.nlm.nih.gov/pubmed/15479277"
  ],
  "uri": "http://purl.obolibrary.org/obo/DOID_0040019"
 },
 {
  "code": "0040020",
  "en": "cefotaxime allergy",
  "fr": "Allergie — céfotaxime",
  "fr_statut": "brouillon",
  "definition_en": "A cephalosporin allergy that has_allergic_trigger cefotaxime.",
  "nature": "medicament",
  "perimetre": "fiche",
  "relation": "exact",
  "cle": "cefotaxime",
  "noms": [
   "céfotaxime",
   "cefotaxime"
  ],
  "composants": null,
  "atc": [
   "J01DD01"
  ],
  "atc_libelle_fr": "céfotaxime",
  "agents": [
   {
    "id": "CHEBI:204928",
    "en": "cefotaxime",
    "fr": "céfotaxime",
    "uri": "http://purl.obolibrary.org/obo/CHEBI_204928"
   }
  ],
  "note": null,
  "parents": [
   "DOID:0040021"
  ],
  "sources": [
   "https://www.ncbi.nlm.nih.gov/pubmed/12833570"
  ],
  "uri": "http://purl.obolibrary.org/obo/DOID_0040020"
 },
 {
  "code": "0040021",
  "en": "cephalosporin allergy",
  "fr": "Allergie — céphalosporines",
  "fr_statut": "brouillon",
  "definition_en": "A drug allergy that has_allergic_trigger cephalosporin.",
  "nature": "medicament",
  "perimetre": "fiche",
  "relation": "classe",
  "cle": null,
  "noms": [],
  "composants": null,
  "atc": [
   "J01DB",
   "J01DC",
   "J01DD",
   "J01DE",
   "J01DI"
  ],
  "atc_libelle_fr": "céphalosporines de première génération ; céphalosporines de deuxième génération ; céphalosporines de troisième génération …",
  "agents": [
   {
    "id": "CHEBI:23066",
    "en": "cephalosporin",
    "fr": "céphalosporines",
    "uri": "http://purl.obolibrary.org/obo/CHEBI_23066"
   }
  ],
  "note": "céphalosporines 1re à 4e génération et autres (ATC J01DB–DE, J01DI)",
  "parents": [
   "DOID:0060500"
  ],
  "sources": [
   "https://www.ncbi.nlm.nih.gov/pubmed/2083978"
  ],
  "uri": "http://purl.obolibrary.org/obo/DOID_0040021"
 },
 {
  "code": "0040022",
  "en": "amodiaquine allergy",
  "fr": "Allergie — amodiaquine",
  "fr_statut": "brouillon",
  "definition_en": "A drug allergy that has_allergic_trigger amodiaquine.",
  "nature": "medicament",
  "perimetre": "fiche",
  "relation": "exact",
  "cle": "amodiaquine",
  "noms": [
   "amodiaquine"
  ],
  "composants": null,
  "atc": [
   "P01BA06"
  ],
  "atc_libelle_fr": "amodiaquine",
  "agents": [
   {
    "id": "CHEBI:2674",
    "en": "amodiaquine",
    "fr": "amodiaquine",
    "uri": "http://purl.obolibrary.org/obo/CHEBI_2674"
   }
  ],
  "note": null,
  "parents": [
   "DOID:0060500"
  ],
  "sources": [
   "https://www.ncbi.nlm.nih.gov/pubmed/1959977"
  ],
  "uri": "http://purl.obolibrary.org/obo/DOID_0040022"
 },
 {
  "code": "0040023",
  "en": "cefaclor allergy",
  "fr": "Allergie — céfaclor",
  "fr_statut": "brouillon",
  "definition_en": "A cephalosporin allergy that has_allergic_trigger cefaclor.",
  "nature": "medicament",
  "perimetre": "fiche",
  "relation": "exact",
  "cle": "cefaclor",
  "noms": [
   "céfaclor",
   "cefaclor"
  ],
  "composants": null,
  "atc": [
   "J01DC04"
  ],
  "atc_libelle_fr": "céfaclor",
  "agents": [
   {
    "id": "CHEBI:3478",
    "en": "cefaclor",
    "fr": "céfaclor",
    "uri": "http://purl.obolibrary.org/obo/CHEBI_3478"
   }
  ],
  "note": null,
  "parents": [
   "DOID:0040021"
  ],
  "sources": [
   "https://www.ncbi.nlm.nih.gov/pubmed/12569987"
  ],
  "uri": "http://purl.obolibrary.org/obo/DOID_0040023"
 },
 {
  "code": "0040024",
  "en": "ceftazidime allergy",
  "fr": "Allergie — ceftazidime",
  "fr_statut": "brouillon",
  "definition_en": "A cephalosporin allergy that has_allergic_trigger ceftazidime.",
  "nature": "medicament",
  "perimetre": "fiche",
  "relation": "exact",
  "cle": "ceftazidime",
  "noms": [
   "ceftazidime"
  ],
  "composants": null,
  "atc": [
   "J01DD02"
  ],
  "atc_libelle_fr": "ceftazidime",
  "agents": [
   {
    "id": "CHEBI:3508",
    "en": "ceftazidime",
    "fr": "ceftazidime",
    "uri": "http://purl.obolibrary.org/obo/CHEBI_3508"
   }
  ],
  "note": null,
  "parents": [
   "DOID:0040021"
  ],
  "sources": [
   "https://www.ncbi.nlm.nih.gov/pubmed/12833570"
  ],
  "uri": "http://purl.obolibrary.org/obo/DOID_0040024"
 },
 {
  "code": "0040025",
  "en": "cefuroxime allergy",
  "fr": "Allergie — céfuroxime",
  "fr_statut": "brouillon",
  "definition_en": "A cephalosporin allergy that has_allergic_trigger cefuroxime.",
  "nature": "medicament",
  "perimetre": "fiche",
  "relation": "exact",
  "cle": "cefuroxime",
  "noms": [
   "céfuroxime",
   "cefuroxime"
  ],
  "composants": null,
  "atc": [
   "J01DC02",
   "S01AA27"
  ],
  "atc_libelle_fr": "céfuroxime",
  "agents": [
   {
    "id": "CHEBI:3515",
    "en": "cefuroxime",
    "fr": "céfuroxime",
    "uri": "http://purl.obolibrary.org/obo/CHEBI_3515"
   }
  ],
  "note": null,
  "parents": [
   "DOID:0040021"
  ],
  "sources": [
   "https://www.ncbi.nlm.nih.gov/pubmed/12833570"
  ],
  "uri": "http://purl.obolibrary.org/obo/DOID_0040025"
 },
 {
  "code": "0040026",
  "en": "chlorhexidine allergy",
  "fr": "Allergie — chlorhexidine",
  "fr_statut": "brouillon",
  "definition_en": "A drug allergy that has_allergic_trigger chlorhexidine.",
  "nature": "medicament",
  "perimetre": "fiche",
  "relation": "exact",
  "cle": "chlorhexidine",
  "noms": [
   "chlorhexidine"
  ],
  "composants": null,
  "atc": [
   "A01AB03",
   "B05CA02",
   "D08AC02",
   "D09AA12",
   "R02AA05",
   "S01AX09",
   "S02AA09",
   "S03AA04"
  ],
  "atc_libelle_fr": "chlorhexidine",
  "agents": [
   {
    "id": "CHEBI:3614",
    "en": "chlorhexidine",
    "fr": "chlorhexidine",
    "uri": "http://purl.obolibrary.org/obo/CHEBI_3614"
   }
  ],
  "note": null,
  "parents": [
   "DOID:0060500"
  ],
  "sources": [
   "https://www.ncbi.nlm.nih.gov/pubmed/10848923"
  ],
  "uri": "http://purl.obolibrary.org/obo/DOID_0040026"
 },
 {
  "code": "0040027",
  "en": "cyclophosphamide allergy",
  "fr": "Allergie — cyclophosphamide",
  "fr_statut": "brouillon",
  "definition_en": "A drug allergy that has_allergic_trigger cyclophosphamide.",
  "nature": "medicament",
  "perimetre": "fiche",
  "relation": "exact",
  "cle": "cyclophosphamide",
  "noms": [
   "cyclophosphamide"
  ],
  "composants": null,
  "atc": [
   "L01AA01"
  ],
  "atc_libelle_fr": "cyclophosphamide",
  "agents": [
   {
    "id": "CHEBI:4027",
    "en": "cyclophosphamide",
    "fr": "cyclophosphamide",
    "uri": "http://purl.obolibrary.org/obo/CHEBI_4027"
   }
  ],
  "note": null,
  "parents": [
   "DOID:0060500"
  ],
  "sources": [
   "https://www.ncbi.nlm.nih.gov/pubmed/8024619"
  ],
  "uri": "http://purl.obolibrary.org/obo/DOID_0040027"
 },
 {
  "code": "0040028",
  "en": "succinylcholine allergy",
  "fr": "Allergie — suxaméthonium",
  "fr_statut": "brouillon",
  "definition_en": "A drug allergy that has_allergic_trigger succinylcholine.",
  "nature": "medicament",
  "perimetre": "fiche",
  "relation": "exact",
  "cle": "suxamethonium",
  "noms": [
   "suxaméthonium",
   "suxamethonium",
   "succinylcholine"
  ],
  "composants": null,
  "atc": [
   "M03AB01"
  ],
  "atc_libelle_fr": "suxaméthonium",
  "agents": [
   {
    "id": "CHEBI:45652",
    "en": "succinylcholine",
    "fr": "suxaméthonium",
    "uri": "http://purl.obolibrary.org/obo/CHEBI_45652"
   }
  ],
  "note": "succinylcholine = suxaméthonium (synonymes)",
  "parents": [
   "DOID:0060500"
  ],
  "sources": [
   "https://www.ncbi.nlm.nih.gov/pubmed/2410473"
  ],
  "uri": "http://purl.obolibrary.org/obo/DOID_0040028"
 },
 {
  "code": "0040029",
  "en": "trimethoprim allergy",
  "fr": "Allergie — triméthoprime",
  "fr_statut": "brouillon",
  "definition_en": "A drug allergy that has_allergic_trigger trimethoprim.",
  "nature": "medicament",
  "perimetre": "fiche",
  "relation": "exact",
  "cle": "trimethoprim",
  "noms": [
   "triméthoprime",
   "trimethoprim"
  ],
  "composants": null,
  "atc": [
   "J01EA01"
  ],
  "atc_libelle_fr": "triméthoprime",
  "agents": [
   {
    "id": "CHEBI:45924",
    "en": "trimethoprim",
    "fr": "triméthoprime",
    "uri": "http://purl.obolibrary.org/obo/CHEBI_45924"
   }
  ],
  "note": null,
  "parents": [
   "DOID:0060500"
  ],
  "sources": [
   "https://www.ncbi.nlm.nih.gov/pubmed/3377143"
  ],
  "uri": "http://purl.obolibrary.org/obo/DOID_0040029"
 },
 {
  "code": "0040030",
  "en": "cefixime allergy",
  "fr": "Allergie — céfixime",
  "fr_statut": "brouillon",
  "definition_en": "A cephalosporin allergy that has_allergic_trigger cefixime.",
  "nature": "medicament",
  "perimetre": "fiche",
  "relation": "exact",
  "cle": "cefixime",
  "noms": [
   "céfixime",
   "cefixime"
  ],
  "composants": null,
  "atc": [
   "J01DD08"
  ],
  "atc_libelle_fr": "céfixime",
  "agents": [
   {
    "id": "CHEBI:472657",
    "en": "cefixime",
    "fr": "céfixime",
    "uri": "http://purl.obolibrary.org/obo/CHEBI_472657"
   }
  ],
  "note": null,
  "parents": [
   "DOID:0040021"
  ],
  "sources": [
   "https://www.ncbi.nlm.nih.gov/pubmed/16867046"
  ],
  "uri": "http://purl.obolibrary.org/obo/DOID_0040030"
 },
 {
  "code": "0040031",
  "en": "diclofenac allergy",
  "fr": "Allergie — diclofénac",
  "fr_statut": "brouillon",
  "definition_en": "A drug allergy that has_allergic_trigger diclofenac.",
  "nature": "medicament",
  "perimetre": "fiche",
  "relation": "exact",
  "cle": "diclofenac",
  "noms": [
   "diclofénac",
   "diclofenac"
  ],
  "composants": null,
  "atc": [
   "D11AX18",
   "M01AB05",
   "M02AA15",
   "S01BC03"
  ],
  "atc_libelle_fr": "diclofénac",
  "agents": [
   {
    "id": "CHEBI:47381",
    "en": "diclofenac",
    "fr": "diclofénac",
    "uri": "http://purl.obolibrary.org/obo/CHEBI_47381"
   }
  ],
  "note": null,
  "parents": [
   "DOID:0060500"
  ],
  "sources": [
   "https://www.ncbi.nlm.nih.gov/pubmed/21060839"
  ],
  "uri": "http://purl.obolibrary.org/obo/DOID_0040031"
 },
 {
  "code": "0040032",
  "en": "carbapenem allergy",
  "fr": "Allergie — carbapénèmes",
  "fr_statut": "brouillon",
  "definition_en": "A drug allergy that has_allergic_trigger carbapenems.",
  "nature": "medicament",
  "perimetre": "fiche",
  "relation": "classe",
  "cle": null,
  "noms": [],
  "composants": null,
  "atc": [
   "J01DH"
  ],
  "atc_libelle_fr": "carbapénems",
  "agents": [
   {
    "id": "CHEBI:46633",
    "en": "carbapenems",
    "fr": "carbapénèmes",
    "uri": "http://purl.obolibrary.org/obo/CHEBI_46633"
   }
  ],
  "note": "carbapénèmes (ATC J01DH)",
  "parents": [
   "DOID:0060500"
  ],
  "sources": [
   "https://www.ncbi.nlm.nih.gov/pubmed/2457043"
  ],
  "uri": "http://purl.obolibrary.org/obo/DOID_0040032"
 },
 {
  "code": "0040033",
  "en": "piperacillin allergy",
  "fr": "Allergie — pipéracilline",
  "fr_statut": "brouillon",
  "definition_en": "A beta-lactam allergy that has_allergic_trigger piperacillin.",
  "nature": "medicament",
  "perimetre": "fiche",
  "relation": "exact",
  "cle": "piperacillin",
  "noms": [
   "pipéracilline",
   "piperacillin"
  ],
  "composants": null,
  "atc": [
   "J01CA12"
  ],
  "atc_libelle_fr": "pipéracilline",
  "agents": [
   {
    "id": "CHEBI:8232",
    "en": "piperacillin",
    "fr": "pipéracilline",
    "uri": "http://purl.obolibrary.org/obo/CHEBI_8232"
   }
  ],
  "note": null,
  "parents": [
   "DOID:0060519"
  ],
  "sources": [
   "https://www.ncbi.nlm.nih.gov/pubmed/21532862"
  ],
  "uri": "http://purl.obolibrary.org/obo/DOID_0040033"
 },
 {
  "code": "0040034",
  "en": "rocuronium allergy",
  "fr": "Allergie — bromure de rocuronium",
  "fr_statut": "brouillon",
  "definition_en": "A drug allergy that has_allergic_trigger rocuronium.",
  "nature": "medicament",
  "perimetre": "fiche",
  "relation": "exact",
  "cle": "rocuronium bromide",
  "noms": [
   "bromure de rocuronium",
   "rocuronium bromide",
   "rocuronium"
  ],
  "composants": null,
  "atc": [
   "M03AC09"
  ],
  "atc_libelle_fr": "bromure de rocuronium",
  "agents": [
   {
    "id": "CHEBI:8884",
    "en": "rocuronium",
    "fr": "bromure de rocuronium",
    "uri": "http://purl.obolibrary.org/obo/CHEBI_8884"
   }
  ],
  "note": "ChEBI : le cation ; ATC : le bromure",
  "parents": [
   "DOID:0060500"
  ],
  "sources": [
   "https://www.ncbi.nlm.nih.gov/pubmed/17667569"
  ],
  "uri": "http://purl.obolibrary.org/obo/DOID_0040034"
 },
 {
  "code": "0040035",
  "en": "sulfasalazine allergy",
  "fr": "Allergie — sulfasalazine",
  "fr_statut": "brouillon",
  "definition_en": "A drug allergy that has_allergic_trigger sulfasalazine.",
  "nature": "medicament",
  "perimetre": "fiche",
  "relation": "exact",
  "cle": "sulfasalazine",
  "noms": [
   "sulfasalazine"
  ],
  "composants": null,
  "atc": [
   "A07EC01"
  ],
  "atc_libelle_fr": "sulfasalazine",
  "agents": [
   {
    "id": "CHEBI:9334",
    "en": "sulfasalazine",
    "fr": "sulfasalazine",
    "uri": "http://purl.obolibrary.org/obo/CHEBI_9334"
   }
  ],
  "note": null,
  "parents": [
   "DOID:0060500"
  ],
  "sources": [
   "https://www.ncbi.nlm.nih.gov/pubmed/2434548"
  ],
  "uri": "http://purl.obolibrary.org/obo/DOID_0040035"
 },
 {
  "code": "0040036",
  "en": "tubocurarine allergy",
  "fr": "Allergie — tubocurarine",
  "fr_statut": "brouillon",
  "definition_en": "A drug allergy that has_allergic_trigger tubocurarine.",
  "nature": "medicament",
  "perimetre": "fiche",
  "relation": "exact",
  "cle": "tubocurarine",
  "noms": [
   "tubocurarine"
  ],
  "composants": null,
  "atc": [
   "M03AA02"
  ],
  "atc_libelle_fr": "tubocurarine",
  "agents": [
   {
    "id": "CHEBI:9774",
    "en": "tubocurarine",
    "fr": "tubocurarine",
    "uri": "http://purl.obolibrary.org/obo/CHEBI_9774"
   }
  ],
  "note": null,
  "parents": [
   "DOID:0060500"
  ],
  "sources": [
   "https://www.ncbi.nlm.nih.gov/pubmed/2215478"
  ],
  "uri": "http://purl.obolibrary.org/obo/DOID_0040036"
 },
 {
  "code": "0040037",
  "en": "aztreonam allergy",
  "fr": "Allergie — aztréonam",
  "fr_statut": "brouillon",
  "definition_en": "A beta-lactam allergy that has_allergic_trigger aztreonam.",
  "nature": "medicament",
  "perimetre": "fiche",
  "relation": "exact",
  "cle": "aztreonam",
  "noms": [
   "aztréonam",
   "aztreonam"
  ],
  "composants": null,
  "atc": [
   "J01DF01"
  ],
  "atc_libelle_fr": "aztréonam",
  "agents": [
   {
    "id": "CHEBI:161680",
    "en": "aztreonam",
    "fr": "aztréonam",
    "uri": "http://purl.obolibrary.org/obo/CHEBI_161680"
   }
  ],
  "note": null,
  "parents": [
   "DOID:0060519"
  ],
  "sources": [
   "https://www.ncbi.nlm.nih.gov/pubmed/1991925"
  ],
  "uri": "http://purl.obolibrary.org/obo/DOID_0040037"
 },
 {
  "code": "0040038",
  "en": "meropenem allergy",
  "fr": "Allergie — méropénem",
  "fr_statut": "brouillon",
  "definition_en": "An allergic asthma that has_allergic_trigger meropenem, a beta-lactam antibiotic.",
  "nature": "medicament",
  "perimetre": "fiche",
  "relation": "exact",
  "cle": "meropenem",
  "noms": [
   "méropénem",
   "meropenem"
  ],
  "composants": null,
  "atc": [
   "J01DH02"
  ],
  "atc_libelle_fr": "méropénem",
  "agents": [
   {
    "id": "CHEBI:43968",
    "en": "meropenem",
    "fr": "méropénem",
    "uri": "http://purl.obolibrary.org/obo/CHEBI_43968"
   }
  ],
  "note": null,
  "parents": [
   "DOID:9415"
  ],
  "sources": [
   "https://www.ncbi.nlm.nih.gov/pubmed/23668298"
  ],
  "uri": "http://purl.obolibrary.org/obo/DOID_0040038"
 },
 {
  "code": "0040057",
  "en": "benzoic acid allergic contact dermatitis",
  "fr": "Dermatite allergique de contact — benzoic acid",
  "fr_statut": "absent",
  "definition_en": "An allergic contact dermatitis that has_allergic_trigger benzoic acid.",
  "nature": "contact",
  "perimetre": "excipient",
  "relation": "aucun",
  "cle": null,
  "noms": [],
  "composants": null,
  "atc": [],
  "atc_libelle_fr": null,
  "agents": [
   {
    "id": "CHEBI:30746",
    "en": "benzoic acid",
    "fr": "benzoic acid",
    "uri": "http://purl.obolibrary.org/obo/CHEBI_30746"
   }
  ],
  "note": null,
  "parents": [
   "DOID:3042"
  ],
  "sources": [
   "https://www.ncbi.nlm.nih.gov/pubmed/25097477"
  ],
  "uri": "http://purl.obolibrary.org/obo/DOID_0040057"
 },
 {
  "code": "0040060",
  "en": "ketoprofen photoallergic dermatitis",
  "fr": "Dermatite photoallergique — kétoprofène",
  "fr_statut": "brouillon",
  "definition_en": "A photoallergic dermatitis that has_allergic_trigger ketoprofen.",
  "nature": "medicament",
  "perimetre": "fiche",
  "relation": "exact",
  "cle": "ketoprofen",
  "noms": [
   "kétoprofène",
   "ketoprofen"
  ],
  "composants": null,
  "atc": [
   "M01AE03",
   "M02AA10"
  ],
  "atc_libelle_fr": "kétoprofène",
  "agents": [
   {
    "id": null,
    "en": null,
    "fr": "kétoprofène",
    "uri": null
   }
  ],
  "note": "photoallergie ; agent complexe : la substance est le kétoprofène (pas le dexkétoprofène)",
  "parents": [
   "DOID:0060500",
   "DOID:3818"
  ],
  "sources": [
   "https://www.ncbi.nlm.nih.gov/pubmed/11169173"
  ],
  "uri": "http://purl.obolibrary.org/obo/DOID_0040060"
 },
 {
  "code": "0040065",
  "en": "quinidine allergy",
  "fr": "Allergie — quinidine",
  "fr_statut": "brouillon",
  "definition_en": "A drug allergy that has_allergic_trigger quinidine.",
  "nature": "medicament",
  "perimetre": "fiche",
  "relation": "exact",
  "cle": "quinidine",
  "noms": [
   "quinidine"
  ],
  "composants": null,
  "atc": [
   "C01BA01"
  ],
  "atc_libelle_fr": "quinidine",
  "agents": [
   {
    "id": "CHEBI:28593",
    "en": "quinidine",
    "fr": "quinidine",
    "uri": "http://purl.obolibrary.org/obo/CHEBI_28593"
   }
  ],
  "note": null,
  "parents": [
   "DOID:0060500"
  ],
  "sources": [
   "https://www.ncbi.nlm.nih.gov/pubmed/445303"
  ],
  "uri": "http://purl.obolibrary.org/obo/DOID_0040065"
 },
 {
  "code": "0040066",
  "en": "melphalan allergy",
  "fr": "Allergie — melphalan",
  "fr_statut": "brouillon",
  "definition_en": "A drug allergy that has_allergic_trigger melphalan.",
  "nature": "medicament",
  "perimetre": "fiche",
  "relation": "exact",
  "cle": "melphalan",
  "noms": [
   "melphalan"
  ],
  "composants": null,
  "atc": [
   "L01AA03"
  ],
  "atc_libelle_fr": "melphalan",
  "agents": [
   {
    "id": "CHEBI:28876",
    "en": "melphalan",
    "fr": "melphalan",
    "uri": "http://purl.obolibrary.org/obo/CHEBI_28876"
   }
  ],
  "note": null,
  "parents": [
   "DOID:0060500"
  ],
  "sources": [
   "https://www.ncbi.nlm.nih.gov/pubmed/445303"
  ],
  "uri": "http://purl.obolibrary.org/obo/DOID_0040066"
 },
 {
  "code": "0040067",
  "en": "neomycin sulfate allergic contact dermatitis",
  "fr": "Dermatite allergique de contact — néomycine",
  "fr_statut": "brouillon",
  "definition_en": "An allergic contact dermatitis that has_allergic_trigger neomycin sulfate.",
  "nature": "medicament",
  "perimetre": "fiche",
  "relation": "exact",
  "cle": "neomycin",
  "noms": [
   "néomycine",
   "neomycin"
  ],
  "composants": null,
  "atc": [
   "A01AB08",
   "A07AA01",
   "B05CA09",
   "D06AX04",
   "J01GB05",
   "R02AB01",
   "S01AA03",
   "S02AA07",
   "S03AA01"
  ],
  "atc_libelle_fr": "néomycine",
  "agents": [
   {
    "id": null,
    "en": null,
    "fr": "néomycine",
    "uri": null
   }
  ],
  "note": "agent complexe (neomycin sulfate AND has_allergic_trigger) : la substance est la néomycine",
  "parents": [
   "DOID:0060500",
   "DOID:3042"
  ],
  "sources": [
   "https://www.ncbi.nlm.nih.gov/pubmed/21616561"
  ],
  "uri": "http://purl.obolibrary.org/obo/DOID_0040067"
 },
 {
  "code": "0040070",
  "en": "co-trimoxazole allergy",
  "fr": "Allergie — sulfaméthoxazole et triméthoprime",
  "fr_statut": "brouillon",
  "definition_en": "A drug allergy that has_allergic_trigger co-trimoxazole.",
  "nature": "medicament",
  "perimetre": "fiche",
  "relation": "exact",
  "cle": "sulfamethoxazole and trimethoprim",
  "noms": [
   "sulfaméthoxazole et triméthoprime",
   "sulfamethoxazole and trimethoprim",
   "co-trimoxazole"
  ],
  "composants": [
   "sulfamethoxazole",
   "trimethoprim"
  ],
  "atc": [
   "J01EE01"
  ],
  "atc_libelle_fr": "sulfaméthoxazole et triméthoprime",
  "agents": [
   {
    "id": "CHEBI:3770",
    "en": "co-trimoxazole",
    "fr": "sulfaméthoxazole et triméthoprime",
    "uri": "http://purl.obolibrary.org/obo/CHEBI_3770"
   }
  ],
  "note": "association fixe : à chercher dans les DCI composées (sulfaméthoxazole + triméthoprime)",
  "parents": [
   "DOID:0060500"
  ],
  "sources": [
   "https://www.ncbi.nlm.nih.gov/pubmed/445303"
  ],
  "uri": "http://purl.obolibrary.org/obo/DOID_0040070"
 },
 {
  "code": "0040071",
  "en": "sodium aurothiomalate allergy",
  "fr": "Allergie — aurothiomalate de sodium",
  "fr_statut": "brouillon",
  "definition_en": "A drug allergy that has_allergic_trigger sodium aurothiomalate.",
  "nature": "medicament",
  "perimetre": "fiche",
  "relation": "exact",
  "cle": "sodium aurothiomalate",
  "noms": [
   "aurothiomalate de sodium",
   "sodium aurothiomalate"
  ],
  "composants": null,
  "atc": [
   "M01CB01"
  ],
  "atc_libelle_fr": "aurothiomalate de sodium",
  "agents": [
   {
    "id": "CHEBI:5516",
    "en": "sodium aurothiomalate",
    "fr": "aurothiomalate de sodium",
    "uri": "http://purl.obolibrary.org/obo/CHEBI_5516"
   }
  ],
  "note": null,
  "parents": [
   "DOID:0060500"
  ],
  "sources": [
   "https://www.ncbi.nlm.nih.gov/pubmed/445303"
  ],
  "uri": "http://purl.obolibrary.org/obo/DOID_0040071"
 },
 {
  "code": "0040073",
  "en": "disodium cromoglycate allergy",
  "fr": "Allergie — acide cromoglicique",
  "fr_statut": "brouillon",
  "definition_en": "A drug allergy that has_allergic_trigger disodium cromoglycate.",
  "nature": "medicament",
  "perimetre": "fiche",
  "relation": "exact",
  "cle": "cromoglicic acid",
  "noms": [
   "acide cromoglicique",
   "cromoglicic acid",
   "disodium cromoglycate"
  ],
  "composants": null,
  "atc": [
   "A07EB01",
   "D11AH03",
   "R01AC01",
   "R03BC01",
   "S01GX01"
  ],
  "atc_libelle_fr": "acide cromoglicique",
  "agents": [
   {
    "id": "CHEBI:128458",
    "en": "disodium cromoglycate",
    "fr": "acide cromoglicique",
    "uri": "http://purl.obolibrary.org/obo/CHEBI_128458"
   }
  ],
  "note": "ChEBI : le sel disodique ; ATC : l’acide cromoglicique (même fraction active)",
  "parents": [
   "DOID:0060500"
  ],
  "sources": [
   "https://www.ncbi.nlm.nih.gov/pubmed/3128591"
  ],
  "uri": "http://purl.obolibrary.org/obo/DOID_0040073"
 },
 {
  "code": "0040075",
  "en": "benzo[d]isothiazol-3-one allergic contact dermatitis",
  "fr": "Dermatite allergique de contact — benzo[d]isothiazol-3-one",
  "fr_statut": "absent",
  "definition_en": "An allergic contact dermatitis that has_allergic_trigger benzo[d]isothiazol-3-one.",
  "nature": "contact",
  "perimetre": "excipient",
  "relation": "aucun",
  "cle": null,
  "noms": [],
  "composants": null,
  "atc": [],
  "atc_libelle_fr": null,
  "agents": [
   {
    "id": "CHEBI:167099",
    "en": "benzo[d]isothiazol-3-one",
    "fr": "benzo[d]isothiazol-3-one",
    "uri": "http://purl.obolibrary.org/obo/CHEBI_167099"
   }
  ],
  "note": null,
  "parents": [
   "DOID:3042"
  ],
  "sources": [
   "https://www.ncbi.nlm.nih.gov/pubmed/6446435"
  ],
  "uri": "http://purl.obolibrary.org/obo/DOID_0040075"
 },
 {
  "code": "0040076",
  "en": "phthalyl group allergy",
  "fr": "Allergie — phthalyl group",
  "fr_statut": "absent",
  "definition_en": "A drug allergy that has_allergic_trigger phthalyl group.",
  "nature": "medicament",
  "perimetre": "fiche",
  "relation": "proche",
  "cle": "phthalylsulfathiazole",
  "noms": [
   "phthalylsulfathiazole",
   "phthalyl group"
  ],
  "composants": null,
  "atc": [
   "A07AB02"
  ],
  "atc_libelle_fr": "phthalylsulfathiazole",
  "agents": [
   {
    "id": "CHEBI:26096",
    "en": "phthalyl group",
    "fr": "phthalyl group",
    "uri": "http://purl.obolibrary.org/obo/CHEBI_26096"
   }
  ],
  "note": "ChEBI : un groupe chimique, pas une substance ; seul médicament ATC à porter le groupe phtalyle : à confirmer",
  "parents": [
   "DOID:0060500"
  ],
  "sources": [
   "https://www.ncbi.nlm.nih.gov/pubmed/7400667"
  ],
  "uri": "http://purl.obolibrary.org/obo/DOID_0040076"
 },
 {
  "code": "0040077",
  "en": "alcuronium bromide allergy",
  "fr": "Allergie — alcuronium",
  "fr_statut": "brouillon",
  "definition_en": "A drug allergy that has_allergic_trigger alcuronium bromide.",
  "nature": "medicament",
  "perimetre": "fiche",
  "relation": "exact",
  "cle": "alcuronium",
  "noms": [
   "alcuronium",
   "alcuronium bromide"
  ],
  "composants": null,
  "atc": [
   "M03AA01"
  ],
  "atc_libelle_fr": "alcuronium",
  "agents": [
   {
    "id": "CHEBI:488385",
    "en": "alcuronium bromide",
    "fr": "alcuronium",
    "uri": "http://purl.obolibrary.org/obo/CHEBI_488385"
   }
  ],
  "note": "ATC : alcuronium ; ChEBI : le bromure",
  "parents": [
   "DOID:0060500"
  ],
  "sources": [
   "https://www.ncbi.nlm.nih.gov/pubmed/2215478"
  ],
  "uri": "http://purl.obolibrary.org/obo/DOID_0040077"
 },
 {
  "code": "0040078",
  "en": "gallamine allergy",
  "fr": "Allergie — gallamine",
  "fr_statut": "brouillon",
  "definition_en": "A drug allergy that has_allergic_trigger gallamine.",
  "nature": "medicament",
  "perimetre": "fiche",
  "relation": "exact",
  "cle": "gallamine",
  "noms": [
   "gallamine"
  ],
  "composants": null,
  "atc": [
   "M03AC02"
  ],
  "atc_libelle_fr": "gallamine",
  "agents": [
   {
    "id": "CHEBI:503442",
    "en": "gallamine",
    "fr": "gallamine",
    "uri": "http://purl.obolibrary.org/obo/CHEBI_503442"
   }
  ],
  "note": null,
  "parents": [
   "DOID:0060500"
  ],
  "sources": [
   "https://www.ncbi.nlm.nih.gov/pubmed/2215478"
  ],
  "uri": "http://purl.obolibrary.org/obo/DOID_0040078"
 },
 {
  "code": "0040080",
  "en": "patent blue V allergy",
  "fr": "Allergie — bleu patenté",
  "fr_statut": "brouillon",
  "definition_en": "A drug allergy that has_allergic_trigger patent blue V.",
  "nature": "medicament",
  "perimetre": "fiche",
  "relation": "exact",
  "cle": "patent blue",
  "noms": [
   "bleu patenté",
   "patent blue",
   "patent blue V"
  ],
  "composants": null,
  "atc": [
   "V04CX09"
  ],
  "atc_libelle_fr": "bleu patenté",
  "agents": [
   {
    "id": "CHEBI:59601",
    "en": "patent blue V",
    "fr": "bleu patenté",
    "uri": "http://purl.obolibrary.org/obo/CHEBI_59601"
   }
  ],
  "note": "colorant diagnostique (ATC V04CX09)",
  "parents": [
   "DOID:0060500"
  ],
  "sources": [
   "https://www.ncbi.nlm.nih.gov/pubmed/19804438"
  ],
  "uri": "http://purl.obolibrary.org/obo/DOID_0040080"
 },
 {
  "code": "0040103",
  "en": "cefotiam allergy",
  "fr": "Allergie — céfotiam",
  "fr_statut": "brouillon",
  "definition_en": "A cephalosporin allergy that has_allergic_trigger cefotiam.",
  "nature": "medicament",
  "perimetre": "fiche",
  "relation": "exact",
  "cle": "cefotiam",
  "noms": [
   "céfotiam",
   "cefotiam"
  ],
  "composants": null,
  "atc": [
   "J01DC07"
  ],
  "atc_libelle_fr": "céfotiam",
  "agents": [
   {
    "id": "CHEBI:355510",
    "en": "cefotiam",
    "fr": "céfotiam",
    "uri": "http://purl.obolibrary.org/obo/CHEBI_355510"
   }
  ],
  "note": null,
  "parents": [
   "DOID:0040021"
  ],
  "sources": [
   "https://www.ncbi.nlm.nih.gov/pubmed/28543395"
  ],
  "uri": "http://purl.obolibrary.org/obo/DOID_0040103"
 },
 {
  "code": "0060492",
  "en": "chicken egg allergy",
  "fr": "Allergie — chicken egg food product",
  "fr_statut": "absent",
  "definition_en": "An egg allergy triggered by Gallus gallus eggs.",
  "nature": "aliment",
  "perimetre": "excipient",
  "relation": "aucun",
  "cle": null,
  "noms": [],
  "composants": null,
  "atc": [],
  "atc_libelle_fr": null,
  "agents": [
   {
    "id": "FOODON:00001275",
    "en": "chicken egg food product",
    "fr": "chicken egg food product",
    "uri": "http://purl.obolibrary.org/obo/FOODON_00001275"
   }
  ],
  "note": null,
  "parents": [
   "DOID:4377"
  ],
  "sources": [
   "http://research.bmh.manchester.ac.uk/informall/allergenic-food/index.aspx?FoodId=5001",
   "https://en.wikipedia.org/wiki/Egg_allergy"
  ],
  "uri": "http://purl.obolibrary.org/obo/DOID_0060492"
 },
 {
  "code": "0060513",
  "en": "fish allergy",
  "fr": "Allergie — fish food product",
  "fr_statut": "absent",
  "definition_en": "A food allergy triggered by fish.",
  "nature": "aliment",
  "perimetre": "excipient",
  "relation": "aucun",
  "cle": null,
  "noms": [],
  "composants": null,
  "atc": [],
  "atc_libelle_fr": null,
  "agents": [
   {
    "id": "FOODON:00001248",
    "en": "fish food product",
    "fr": "fish food product",
    "uri": "http://purl.obolibrary.org/obo/FOODON_00001248"
   },
   {
    "id": "NCBITaxon:7898",
    "en": "Actinopterygii",
    "fr": "Actinopterygii",
    "uri": "http://purl.obolibrary.org/obo/NCBITaxon_7898"
   }
  ],
  "note": null,
  "parents": [
   "DOID:3044"
  ],
  "sources": [
   "https://acaai.org/allergies/types/food-allergies/types-food-allergy/fish-allergy",
   "https://www.ncbi.nlm.nih.gov/pubmed/24795722",
   "https://www.ncbi.nlm.nih.gov/pubmed/30323632"
  ],
  "uri": "http://purl.obolibrary.org/obo/DOID_0060513"
 },
 {
  "code": "0060519",
  "en": "beta-lactam allergy",
  "fr": "Allergie — bêta-lactamines",
  "fr_statut": "brouillon",
  "definition_en": "A drug allergy triggered by a beta-lactam.",
  "nature": "medicament",
  "perimetre": "fiche",
  "relation": "classe",
  "cle": null,
  "noms": [],
  "composants": null,
  "atc": [
   "J01C",
   "J01D"
  ],
  "atc_libelle_fr": "bêtalactamines, pénicillines ; autres bêtalactamines",
  "agents": [
   {
    "id": "CHEBI:35627",
    "en": "beta-lactam",
    "fr": "bêta-lactamines",
    "uri": "http://purl.obolibrary.org/obo/CHEBI_35627"
   }
  ],
  "note": "pénicillines + céphalosporines, monobactams, carbapénèmes (ATC J01C et J01D)",
  "parents": [
   "DOID:0060500"
  ],
  "sources": [
   "https://en.wikipedia.org/wiki/%CE%92-lactam_antibiotic#Allergy/hypersensitivity",
   "https://www.hopkinsguides.com/hopkins/view/Johns_Hopkins_ABX_Guide/540622/all/Beta_lactam_allergy",
   "https://www.ncbi.nlm.nih.gov/pubmed/31009700"
  ],
  "uri": "http://purl.obolibrary.org/obo/DOID_0060519"
 },
 {
  "code": "0060520",
  "en": "penicillin allergy",
  "fr": "Allergie — pénicillines",
  "fr_statut": "brouillon",
  "definition_en": "A beta-lactam allergy triggered by penicillin.",
  "nature": "medicament",
  "perimetre": "fiche",
  "relation": "classe",
  "cle": null,
  "noms": [],
  "composants": null,
  "atc": [
   "J01C"
  ],
  "atc_libelle_fr": "bêtalactamines, pénicillines",
  "agents": [
   {
    "id": "CHEBI:17334",
    "en": "penicillin",
    "fr": "pénicillines",
    "uri": "http://purl.obolibrary.org/obo/CHEBI_17334"
   }
  ],
  "note": "pénicillines (ATC J01C)",
  "parents": [
   "DOID:0060519"
  ],
  "sources": [
   "https://en.wikipedia.org/wiki/Side_effects_of_penicillin#Allergies_and_cross_sensitivities",
   "https://www.mayoclinic.org/diseases-conditions/penicillin-allergy/symptoms-causes/syc-20376222"
  ],
  "uri": "http://purl.obolibrary.org/obo/DOID_0060520"
 },
 {
  "code": "0060532",
  "en": "latex allergy",
  "fr": "Allergie — Hevea brasiliensis",
  "fr_statut": "absent",
  "definition_en": "An allergic disease that is triggered by latex.",
  "nature": "latex",
  "perimetre": "conditionnement",
  "relation": "aucun",
  "cle": null,
  "noms": [],
  "composants": null,
  "atc": [],
  "atc_libelle_fr": null,
  "agents": [
   {
    "id": "NCBITaxon:3981",
    "en": "Hevea brasiliensis",
    "fr": "Hevea brasiliensis",
    "uri": "http://purl.obolibrary.org/obo/NCBITaxon_3981"
   }
  ],
  "note": null,
  "parents": [
   "DOID:1205"
  ],
  "sources": [
   "https://en.wikipedia.org/wiki/Latex_allergy",
   "https://www.ncbi.nlm.nih.gov/pubmed/27010091"
  ],
  "uri": "http://purl.obolibrary.org/obo/DOID_0060532"
 },
 {
  "code": "0060904",
  "en": "legume allergy",
  "fr": "Allergie — legume food product",
  "fr_statut": "absent",
  "definition_en": "A fruit allergy triggered by Fabaceae (legume) plant fruit or seed food product.",
  "nature": "aliment",
  "perimetre": "excipient",
  "relation": "aucun",
  "cle": null,
  "noms": [],
  "composants": null,
  "atc": [],
  "atc_libelle_fr": null,
  "agents": [
   {
    "id": "FOODON:00001264",
    "en": "legume food product",
    "fr": "legume food product",
    "uri": "http://purl.obolibrary.org/obo/FOODON_00001264"
   }
  ],
  "note": null,
  "parents": [
   "DOID:0060503"
  ],
  "sources": [
   "https://en.wikipedia.org/wiki/Legume"
  ],
  "uri": "http://purl.obolibrary.org/obo/DOID_0060904"
 },
 {
  "code": "4376",
  "en": "milk allergy",
  "fr": "Allergie — milk or milk based food product",
  "fr_statut": "absent",
  "definition_en": "A food allergy that results in adverse immune reaction to one or more of the proteins in cow's milk and/or the milk of other animals, which are normally harmless to the non-allergic individual.",
  "nature": "aliment",
  "perimetre": "excipient",
  "relation": "aucun",
  "cle": null,
  "noms": [],
  "composants": null,
  "atc": [],
  "atc_libelle_fr": null,
  "agents": [
   {
    "id": "FOODON:00001257",
    "en": "milk or milk based food product",
    "fr": "milk or milk based food product",
    "uri": "http://purl.obolibrary.org/obo/FOODON_00001257"
   }
  ],
  "note": null,
  "parents": [
   "DOID:3044"
  ],
  "sources": [
   "http://en.wikipedia.org/wiki/Milk_hypersensitivity"
  ],
  "uri": "http://purl.obolibrary.org/obo/DOID_4376"
 },
 {
  "code": "4377",
  "en": "egg allergy",
  "fr": "Allergie — egg food product",
  "fr_statut": "absent",
  "definition_en": "A food allergy that is an allergy or hypersensitivity to dietary substances from the yolk or whites of eggs, causing an overreaction of the immune system which may lead to severe physical symptoms.",
  "nature": "aliment",
  "perimetre": "excipient",
  "relation": "aucun",
  "cle": null,
  "noms": [],
  "composants": null,
  "atc": [],
  "atc_libelle_fr": null,
  "agents": [
   {
    "id": "FOODON:00001274",
    "en": "egg food product",
    "fr": "egg food product",
    "uri": "http://purl.obolibrary.org/obo/FOODON_00001274"
   }
  ],
  "note": null,
  "parents": [
   "DOID:3044"
  ],
  "sources": [
   "http://en.wikipedia.org/wiki/Allergy#Foods"
  ],
  "uri": "http://purl.obolibrary.org/obo/DOID_4377"
 }
]
