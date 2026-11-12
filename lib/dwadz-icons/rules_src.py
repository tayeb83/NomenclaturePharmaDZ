"""Source de vérité des règles forme -> icône pour DwaDZ.

`python3 rules_src.py` génère forme_rules.json et dwadz-icons.js (port JS embarquant les règles).
Les regex n'utilisent que des constructions communes à Python et JavaScript.
"""
import json
from pathlib import Path

HERE = Path(__file__).parent

# --- 1. Normalisation -------------------------------------------------------
# Appliquée sur la chaîne en MAJUSCULES sans accents.
PRE = [  # (regex, remplacement) dans l'ordre
    [r"\s*/\s*", "/"],
    [r"\bP\.?/", "POUR "],
    [r"\bS[./]C\b", "SC"],
    [r"\bI[./]V\b", "IV"],
    [r"\bI[./]M\b", "IM"],
    [r"\bI[./]P\b", "IP"],
    [r"\bLYOPH\w*", "LYOPHILISAT"],
    [r"\bLYPH\w*", "LYOPHILISAT"],
    [r"\bLYOP\w*", "LYOPHILISAT"],
    [r"\bPOUDREC", "POUDRE "],
    [r"\bCOM?P?R?[IM]+[A-Z0-9]*(ME|PE)S?\b", "COMPRIME"],
    [r"\bCOMPRIM2\b", "COMPRIME"],
    [r"\bCOMPRIMES\b", "COMPRIME"],
    [r"\b0 DILUER", "A DILUER"],
]

# Remplacement mot à mot (après suppression de la ponctuation).
TOKENS = {
    "COMRIME": "COMPRIME", "COMRPIME": "COMPRIME", "COPRIME": "COMPRIME", "COMPRIMPE": "COMPRIME",
    "COMP": "COMPRIME", "DRG": "DRAGEE",
    "PDRE": "POUDRE", "PDRES": "POUDRE",
    "SOL": "SOLUTION", "SOLUT": "SOLUTION", "SO": "SOLUTION", "SIOLUTION": "SOLUTION", "SOLOTION": "SOLUTION",
    "SUSP": "SUSPENSION", "SUS": "SUSPENSION", "SUSPENSSION": "SUSPENSION",
    "INJ": "INJECTABLE", "PERF": "PERFUSION", "PER": "PERFUSION", "PERFEUSION": "PERFUSION",
    "PERFUSIN": "PERFUSION",
    "BUV": "BUVABLE", "BUVALE": "BUVABLE", "BUVABE": "BUVABLE",
    "LIB": "LIBERATION", "PRO": "PROLONGEE", "LP": "LIBERATION PROLONGEE", "PROLONGE": "PROLONGEE",
    "AMP": "AMPOULE", "GTTES": "GOUTTES", "GOUTES": "GOUTTES", "GOUTTESL": "GOUTTES",
    "GLES": "GELULES", "GELLULE": "GELULE", "GELLULES": "GELULES", "MICRGLES": "MICROGRANULES",
    "GASTO": "GASTRO", "NAS": "NASALE", "PUL": "PULVERISATION", "PULV": "PULVERISATION",
    "AURIC": "AURICULAIRE", "AURC": "AURICULAIRE", "OPHT": "OPHTALMIQUE", "DERM": "DERMIQUE",
    "INHAL": "INHALATION", "INHA": "INHALATION", "NEB": "NEBULISEUR", "AERO": "AEROSOL",
    "SERING": "SERINGUE", "PREREMPL": "PREREMPLIE", "PREREMPLI": "PREREMPLIE", "PREREMLIE": "PREREMPLIE",
    "SOLV": "SOLVANT", "SOLVT": "SOLVANT", "CONC": "CONCENTRE", "COLLY": "COLLYRE",
    "P": "POUR", "PR": "POUR", "POR": "POUR", "POU": "POUR", "POIUR": "POUR",
    "OR": "ORALE", "REC": "RECTALE", "RECT": "RECTALE", "SPYAY": "SPRAY",
    "APPL": "APPLICATION", "APPLIC": "APPLICATION", "APPLI": "APPLICATION", "APP": "APPLICATION",
    "DIL": "DILUER", "DILIER": "DILUER", "DISPERS": "DISPERSIBLE", "ENRO": "ENROBE", "INST": "INSTILLATION",
    "FL": "FLACON", "SEC": "SECABLE",
}

# --- 2. Icône de base : premier motif qui correspond gagne -------------------
# "re" doit correspondre, "not" (optionnel) ne doit pas correspondre.
BASE_RULES = [
    {"icon": "tin",        "re": r"^(LAIT|POUDRE (A RECONSTITUER )?POUR (ENFANTS?|NOURRISSONS?))"},
    {"icon": "canister",   "re": r"\bDIALYSE\b|HEMODIALYSE|HEMOFILTRATION"},
    {"icon": "implant",    "re": r"^(IMPLANT|SYSTEME)"},
    {"icon": "patch",      "re": r"^PATCH|EMPLATRE"},
    {"icon": "gas",        "re": r"^GAZ"},
    {"icon": "sachet",     "re": r"\bSACHETS?\b|\bSTICK\b"},
    {"icon": "tube",       "re": r"^(CREME|POMMADE|GEL|BAUME|EMULSION GEL)\b"},
    {"icon": "vial_powder", "re": r"(POUDRE|LYOPHILISAT).*(INJECTABLE|PERFUSION|PARENT|SOLVANT|PREPARATION)|^POUDRE LYOPHILISAT|^LYOPHILISAT$",
                             "not": r"BUVABLE|ORALE|INHALATION"},
    {"icon": "vial",       "re": r"^SOLVANT"},
    {"icon": "pen",        "re": r"\bSTYLO\b|CARTOUCHES?\b"},
    {"icon": "prefilled_syringe", "re": r"SERINGUE"},
    {"icon": "iv_bag",     "re": r"PERFUSION"},
    {"icon": "syringe",    "re": r"INJECTABLE|INJECTION|PARENT"},
    {"icon": "ampoule",    "re": r"AMPOULE"},
    {"icon": "bottle_cup", "re": r"BAIN (DE )?BOUCHE|COLLUTOIRE|GINGIVAL"},
    {"icon": "dropper",    "re": r"COLLYRE|GOUTTES|AURICULAIRE|OCULAIRE|OPHTALMIQUE|INSTILLATION", "not": r"TRACHE"},
    {"icon": "nebulizer",  "re": r"NEBULISEUR|VAPEUR"},
    {"icon": "inhaler",    "re": r"INHALATION|INHALATEUR"},
    {"icon": "spray",      "re": r"PULVERISATION|SPRAY|AEROSOL|\bNASALE?\b"},
    {"icon": "suppository", "re": r"SUPPOSITOIRE"},
    {"icon": "ovule",      "re": r"\bOVULE"},
    {"icon": "softcap",    "re": r"CAPSULES? MOLLES?"},
    {"icon": "bottle_powder", "re": r"^(POUDRE|GRANULES?)\b", "not": r"GELULE|INHALATION|INJECTABLE|PERFUSION"},
    {"icon": "capsule",    "re": r"GELULES?|CAPSULES?|MICRO ?GRANULES?|MINI COMPRIME"},
    {"icon": "tablet_melt", "re": r"ORODISPERSIBLE|A SUCER|A CROQUER|LYOPHILISAT ORALE?"},
    {"icon": "tablet_dissolve", "re": r"\bEFFERVESCENTS?\b|\bDISPERSIBLE\b"},
    {"icon": "tablet",     "re": r"COMPRIME|DRAGEE"},
    {"icon": "bottle_cup", "re": r"SIROP|BUVABLE|ORALE"},
    {"icon": "lotion",     "re": r"APPLICATION|DERMIQUE|CUTANEE|USAGE EXTERNE|LOTION|SHAMPOING|VERNIS|MOUSSE|HYDROALCOOLIQUE|ANTISEPTIQUE"},
]
FALLBACK_ICON = "generic"

# --- 3. Modificateurs (drapeaux indépendants) --------------------------------
TABLETS = ["tablet", "tablet_dissolve", "tablet_melt"]
MODIFIERS = [
    {"id": "lp",     "re": r"LIBERATION (PROLONG|MODIFIEE|RETARDEE)\w*|DIFFUSION LENTE|DOUBLE LIBERATION"},
    {"id": "gr",     "re": r"GAST\w*\s?RESIST"},
    {"id": "score",  "re": r"SECABLE|BARRE DE CASSURE", "bases": TABLETS},
    {"id": "dilute", "re": r"A DILUER|CONCENTRE", "bases": ["iv_bag", "vial_powder", "syringe"]},
    {"id": "child",  "re": r"\bENFANTS?\b|NOURRISSONS?", "not_bases": ["tin"]},
]
# Modificateurs implicites par icône de base
IMPLICIT_MODS = {"vial_powder": ["reconst"], "bottle_powder": ["reconst"]}

# --- 4. Voies : indices dans le libellé + voie par défaut de l'icône ----------
ROUTE_HINTS = [
    {"route": "iv",          "re": r"\bIV\b|INTRAVEIN|INTRAVASC|PERFUSION"},
    {"route": "im",          "re": r"\bIM\b|INTRAMUSC"},
    {"route": "sc",          "re": r"\bSC\b|SOUS CUTAN"},
    {"route": "eye",         "re": r"OPHTALMIQUE|OCULAIRE|COLLYRE"},
    {"route": "ear",         "re": r"AURICULAIRE"},
    {"route": "nasal",       "re": r"NASAL"},
    {"route": "inhaled",     "re": r"INHALATION|AEROSOL|NEBULISEUR"},
    {"route": "rectal",      "re": r"RECTAL|SUPPOSITOIRE"},
    {"route": "vaginal",     "re": r"VAGINAL|\bOVULE"},
    {"route": "buccal",      "re": r"BUCCAL|GINGIVAL|BAIN (DE )?BOUCHE"},
    {"route": "dialysis",    "re": r"\bDIALYSE\b|HEMODIALYSE|HEMOFILTRATION"},
    {"route": "transdermal", "re": r"^PATCH"},
    {"route": "cutaneous",   "re": r"CUTANEE|DERMIQUE|APPLICATION LOCALE"},
    {"route": "oral",        "re": r"BUVABLE|ORALE"},
]
DEFAULT_ROUTE = {
    "tablet": "oral", "tablet_dissolve": "oral", "tablet_melt": "oral", "capsule": "oral", "softcap": "oral",
    "sachet": "oral", "bottle_powder": "oral", "bottle_cup": "oral", "ampoule": "oral",
    "tube": "cutaneous", "lotion": "cutaneous", "patch": "transdermal",
    "suppository": "rectal", "ovule": "vaginal", "inhaler": "inhaled", "nebulizer": "inhaled", "gas": "inhaled",
    "iv_bag": "iv", "canister": "dialysis",
}

# Codes EDQM (2e CSV) -> pastille
EDQM_ROUTE = {
    "20053000": "oral", "20045000": "iv", "20003000": "cutaneous", "20051000": "eye", "20035000": "im",
    "20066000": "sc", "20020000": "inhaled", "20061000": "rectal", "20049000": "nasal", "20072000": "vaginal",
    "20054000": "buccal", "20015000": "dialysis", "20001000": "ear", "20009000": "other", "20038000": "other",
    "20047000": "other", "20046000": "other", "20067000": "buccal", "20070000": "transdermal",
    "20044000": "other", "20032000": "other", "20042000": "other",
}

# Libellés (alt) FR / AR. AR à faire valider par un pharmacien arabophone.
LABELS = {
    "base": {
        "tablet": ["Comprimé", "قرص"], "tablet_dissolve": ["Comprimé à dissoudre dans l'eau", "قرص يذاب في الماء"],
        "tablet_melt": ["Comprimé à croquer, sucer ou orodispersible", "قرص للمضغ أو المص أو سريع الذوبان"],
        "capsule": ["Gélule", "كبسولة"], "softcap": ["Capsule molle", "كبسولة هلامية لينة"],
        "sachet": ["Sachet ou stick", "كيس أو ظرف"], "bottle_powder": ["Poudre à reconstituer (flacon)", "مسحوق يُحضَّر قبل الاستعمال"],
        "bottle_cup": ["Liquide buvable (flacon)", "سائل للشرب (قارورة)"], "ampoule": ["Ampoule buvable", "أمبولة للشرب"],
        "dropper": ["Flacon compte-gouttes", "قارورة قطرات"], "spray": ["Spray / pulvérisation", "بخاخ"],
        "inhaler": ["Inhalateur", "جهاز استنشاق"], "nebulizer": ["Nébuliseur / vapeur", "جهاز رذاذ / بخار"],
        "gas": ["Gaz (bouteille)", "غاز (أسطوانة)"], "syringe": ["Solution injectable", "محلول للحقن"],
        "prefilled_syringe": ["Seringue préremplie", "حقنة جاهزة"], "pen": ["Stylo / cartouche injectable", "قلم / خرطوشة للحقن"],
        "vial_powder": ["Poudre ou lyophilisat à reconstituer", "مسحوق أو مجفف بالتجميد يُحضَّر قبل الحقن"],
        "vial": ["Solvant / flacon injectable", "مذيب / قارورة للحقن"], "iv_bag": ["Perfusion", "تسريب"],
        "tube": ["Crème, pommade ou gel", "كريم أو مرهم أو جل"], "lotion": ["Solution / lotion à appliquer", "محلول / غسول للاستعمال الموضعي"],
        "patch": ["Patch", "لصقة"], "suppository": ["Suppositoire", "تحميلة"], "ovule": ["Ovule", "بويضة مهبلية"],
        "canister": ["Solution de dialyse", "محلول غسيل الكلى"], "implant": ["Implant / système", "غرسة / جهاز"],
        "tin": ["Lait / poudre nutritionnelle", "حليب / مسحوق غذائي"], "generic": ["Forme non illustrée", "شكل غير مصوّر"],
    },
    "route": {
        "oral": ["Voie orale", "عن طريق الفم"], "iv": ["Voie intraveineuse", "عن طريق الوريد"],
        "im": ["Voie intramusculaire", "عن طريق العضل"], "sc": ["Voie sous-cutanée", "تحت الجلد"],
        "cutaneous": ["Voie cutanée", "على الجلد"], "transdermal": ["Voie transdermique", "عبر الجلد"],
        "eye": ["Voie ophtalmique", "في العين"], "ear": ["Voie auriculaire", "في الأذن"], "nasal": ["Voie nasale", "في الأنف"],
        "inhaled": ["Voie inhalée", "استنشاق"], "rectal": ["Voie rectale", "عن طريق الشرج"],
        "vaginal": ["Voie vaginale", "عن طريق المهبل"], "buccal": ["Voie buccale ou sublinguale", "في الفم (شدقي أو تحت اللسان)"],
        "dialysis": ["Hémodialyse", "غسيل الكلى"], "other": ["Autre voie (voir la fiche)", "طريق آخر (انظر النشرة)"],
    },
    "mod": {
        "lp": ["Libération prolongée ou modifiée", "تحرير ممتد أو معدّل"], "gr": ["Gastro-résistant", "مقاوم للحموضة المعدية"],
        "score": ["Sécable", "قابل للقسمة"], "reconst": ["À reconstituer", "يُحضَّر قبل الاستعمال"],
        "dilute": ["À diluer / concentré", "يُخفَّف / مركّز"], "child": ["Enfant / nourrisson", "للأطفال / الرضّع"],
    },
}

RULES = {
    "pre": PRE, "tokens": TOKENS, "base_rules": BASE_RULES, "fallback_icon": FALLBACK_ICON,
    "modifiers": MODIFIERS, "implicit_mods": IMPLICIT_MODS, "route_hints": ROUTE_HINTS,
    "default_route": DEFAULT_ROUTE, "edqm_route": EDQM_ROUTE, "labels": LABELS,
}

if __name__ == "__main__":
    (HERE / "forme_rules.json").write_text(json.dumps(RULES, ensure_ascii=False, indent=1), encoding="utf-8")
    tpl = (HERE / "dwadz-icons.template.js")
    if tpl.exists():
        js = tpl.read_text(encoding="utf-8").replace("/*__RULES__*/null", json.dumps(RULES, ensure_ascii=False))
        (HERE / "dwadz-icons.js").write_text(js, encoding="utf-8")
    print("ok")
