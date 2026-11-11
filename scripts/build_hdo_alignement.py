#!/usr/bin/env python3
"""
DwaDZ — Allergies HDO (Human Disease Ontology) : proposition d'alignement allergie → substance / classe ATC.

Entrée  : data/hdo/hdo_allergies_substances.csv (extraction HDO : allergie + agent déclencheur, en anglais)
          data/atc/ATC_2026_fr_en_ar.xlsx       (ATC déjà utilisée par le site)
Sorties : lib/allergies-data.ts, lib/allergies-choix.ts (consommés par le site)
          data/hdo/hdo_allergies_alignement.csv   (une ligne par couple allergie × agent, pour l'import)
          data/hdo/hdo_allergies_alignement.xlsx  (même chose + onglets Bilan et Anomalies, pour la relecture)
          data/hdo/hdo_allergies_alignement.json  (utilisé par la maquette docs/maquettes/allergies-hdo.html)

Principe — même grammaire que les Standard Terms EDQM (lib/edqm.ts) : chaque rattachement porte sa relation.
  exact  : l'agent est la substance (même fraction active : un sel ne change pas la relation, la note le dit)
  classe : l'agent est une classe ; il s'applique à toutes les substances de ces codes ATC (et de leurs sous-classes)
  proche : meilleur rattachement disponible, à confirmer à la main
  aucun  : pas de rattachement à une substance de la nomenclature
Sans rattachement sûr, pas de lien : jamais un code inventé.

Lancement : python3 -I scripts/build_hdo_alignement.py
"""
import csv, json, re, sys, unicodedata
from collections import defaultdict
from pathlib import Path

import openpyxl

RACINE = Path(__file__).resolve().parent.parent
SRC = RACINE / 'data/hdo/hdo_allergies_substances.csv'
ATC = RACINE / 'data/atc/ATC_2026_fr_en_ar.xlsx'
OUT = RACINE / 'data/hdo/hdo_allergies_alignement'


def plier(s: str) -> str:
    return re.sub(r'[^a-z0-9]+', ' ', unicodedata.normalize('NFD', s.lower())).strip()


# ── ATC ──────────────────────────────────────────────────────────────────────
atc = {}  # code → (niveau, en, fr)
for r in list(openpyxl.load_workbook(ATC, read_only=True).active.iter_rows(values_only=True))[1:]:
    atc[r[1]] = (r[0], r[3], r[4])
par_libelle = defaultdict(list)  # libellé EN plié → codes niveau 5
for code, (niv, en, _) in atc.items():
    if niv == 5:
        par_libelle[plier(en)].append(code)


def substance(nom_atc: str):
    """Tous les codes niveau 5 d'une substance seule (libellé EN exact), et son libellé français."""
    codes = sorted(par_libelle[plier(nom_atc)])
    return codes, (atc[codes[0]][2] if codes else None)


def classe(prefixes):
    return sorted(prefixes)


# Corticoïdes : liste explicite de codes ATC de niveau 4 (revue à la main, pas de recherche par libellé :
# H02CA = anti-corticoïdes, R03AL = associations souvent sans corticoïde, A07EB/R01AC/R03BC = « excl. corticosteroids »).
CORTICOIDES = [
    # seuls
    'A01AC', 'A07EA', 'C05AA', 'D07AA', 'D07AB', 'D07AC', 'D07AD', 'H02AB', 'R01AD', 'R03BA', 'S01BA', 'S02BA', 'S03BA',
    # associés à un autre principe actif (le corticoïde y est présent)
    'D07BA', 'D07BB', 'D07BC', 'D07BD', 'D07CA', 'D07CB', 'D07CC', 'D07CD', 'D07XA', 'D07XB', 'D07XC', 'D07XD',
    'D10AA', 'G01BA', 'G01BC', 'G01BD', 'G01BE', 'G01BF', 'H02BX', 'M01BA', 'S01BB', 'S01CA', 'S01CB', 'S02CA', 'S03CA',
]


# ── Rattachements décidés à la main quand le libellé ChEBI ≠ libellé ATC ────
# agent_id → (relation, 'substance'|'classe', valeur, note)
MANUEL = {
    'CHEBI:488385': ('exact', 'substance', 'alcuronium', 'ATC : alcuronium ; ChEBI : le bromure'),
    'CHEBI:3770':   ('exact', 'substance', 'sulfamethoxazole and trimethoprim', 'association fixe : à chercher dans les DCI composées (sulfaméthoxazole + triméthoprime)'),
    'CHEBI:16899':  ('exact', 'substance', 'mannitol', 'aussi excipient fréquent : voir perimetre'),
    'CHEBI:128458': ('exact', 'substance', 'cromoglicic acid', 'ChEBI : le sel disodique ; ATC : l’acide cromoglicique (même fraction active)'),
    'CHEBI:6030':   ('exact', 'substance', 'isoniazid', 'orthographe « isoniazide » côté HDO'),
    'CHEBI:8884':   ('exact', 'substance', 'rocuronium bromide', 'ChEBI : le cation ; ATC : le bromure'),
    'CHEBI:45652':  ('exact', 'substance', 'suxamethonium', 'succinylcholine = suxaméthonium (synonymes)'),
    'CHEBI:59601':  ('exact', 'substance', 'patent blue', 'colorant diagnostique (ATC V04CX09)'),
    'CHEBI:26096':  ('proche', 'substance', 'phthalylsulfathiazole', 'ChEBI : un groupe chimique, pas une substance ; seul médicament ATC à porter le groupe phtalyle : à confirmer'),
    'CHEBI:17334':  ('classe', 'classe', ['J01C'], 'pénicillines (ATC J01C)'),
    'CHEBI:35627':  ('classe', 'classe', ['J01C', 'J01D'], 'pénicillines + céphalosporines, monobactams, carbapénèmes (ATC J01C et J01D)'),
    'CHEBI:23066':  ('classe', 'classe', ['J01DB', 'J01DC', 'J01DD', 'J01DE', 'J01DI'], 'céphalosporines 1re à 4e génération et autres (ATC J01DB–DE, J01DI)'),
    'CHEBI:46633':  ('classe', 'classe', ['J01DH'], 'carbapénèmes (ATC J01DH)'),
    'CHEBI:35358':  ('classe', 'classe', ['J01EB', 'J01EC', 'J01ED', 'J01EE', 'A07AB', 'D06BA', 'G01AE'],
                     'sulfamides antibactériens seulement (la source HDO parle des antibiotiques) ; ni diurétiques ni sulfamides hypoglycémiants ; le triméthoprime seul (J01EA) n’en est pas un'),
    'CHEBI:50858':  ('classe', 'classe', None, 'corticoïdes seuls ou associés (liste ATC explicite) ; les associations bronchodilatateur + corticoïde (R03AK, R03AL) ne sont pas couvertes : leurs codes mélangent des produits avec et sans corticoïde'),
}
COMPLEXES = {  # allergies sans agent simple : l'agent est dans l'expression OWL
    'DOID:0040067': ('exact', 'substance', 'neomycin', 'agent complexe (neomycin sulfate AND has_allergic_trigger) : la substance est la néomycine'),
    'DOID:0040060': ('exact', 'substance', 'ketoprofen', 'photoallergie ; agent complexe : la substance est le kétoprofène (pas le dexkétoprofène)'),
}

# ── Périmètre : que peut-on faire de cette ligne dans DwaDZ ? ───────────────
# fiche            : rattachable à la DCI d'une fiche
# excipient        : pertinent mais exige la composition en excipients, absente de la nomenclature
# conditionnement  : pertinent pour le matériel/bouchon, non porté par la nomenclature
# hors_perimetre   : pas une substance de médicament (aliment, chimie professionnelle, métal…)
# racine           : niveau de regroupement de la hiérarchie HDO (pas de substance)
# non_allergie     : n'est pas une allergie
EXCIPIENT_CANDIDATS = {'DOID:4376', 'DOID:4377', 'DOID:0060492', 'DOID:0060904', 'DOID:0060513', 'DOID:0040057', 'DOID:0040075', 'DOID:0040019'}

# Associations fixes : l'allergie vise les deux substances ensemble (clé = nom anglais ATC de chaque composant)
COMPOSANTS = {'CHEBI:3770': ['sulfamethoxazole', 'trimethoprim']}

FR_CLASSES = {'CHEBI:17334': 'pénicillines', 'CHEBI:35627': 'bêta-lactamines', 'CHEBI:23066': 'céphalosporines',
              'CHEBI:46633': 'carbapénèmes', 'CHEBI:35358': 'sulfamides antibactériens', 'CHEBI:50858': 'corticoïdes'}

PARENTS_NATURE = [
    ('medicament', {'DOID:0060500', 'DOID:0040021', 'DOID:0060519'}),
    ('respiratoire', {'DOID:9415', 'DOID:0040041', 'DOID:0040043', 'DOID:0060496'}),
    ('contact', {'DOID:3042'}),
    ('aliment', {'DOID:3044', 'DOID:0060503', 'DOID:0060513', 'DOID:0060495', 'DOID:0060524', 'DOID:0040001',
                 'DOID:0060523', 'DOID:0060530', 'DOID:0070334', 'DOID:4377'}),
]
TYPE_FR = [(' photoallergic dermatitis', 'Dermatite photoallergique'), (' allergic contact dermatitis', 'Dermatite allergique de contact'),
           (' allergic asthma', 'Asthme allergique'), (' respiratory allergy', 'Allergie respiratoire'), (' allergy', 'Allergie')]


def nature(r, parents):
    if r['agent_ontology'] == 'COMPLEX' and r['allergy_id'] in ('DOID:0060500', 'DOID:0060501'):
        return 'racine'
    if r['allergy_id'] == 'DOID:13564':
        return 'non_allergie'
    if r['allergy_id'] == 'DOID:0060532':
        return 'latex'
    if r['allergy_id'] == 'DOID:0040038':  # méropénème : typée « allergic asthma » par erreur dans HDO (voir anomalies)
        return 'medicament'
    for nom, ids in PARENTS_NATURE:
        if parents & ids:
            return nom
    return 'autre'


def ecrire_ts(out):
    """lib/allergies-data.ts (fiche, page allergie, rapprochement) et lib/allergies-choix.ts (liste légère du filtre de recherche).
    Seules les allergies utilisables dans DwaDZ y figurent ; l'alignement complet reste dans data/hdo/. Les codes SNOMED CT
    et UMLS ne sont pas repris (licence à vérifier avant tout affichage)."""
    par_code = {}
    for o in out:
        if o['perimetre'] not in ('fiche', 'excipient', 'conditionnement'):
            continue
        a = par_code.get(o['code'])
        if not a:
            a = par_code[o['code']] = {
                'code': o['code'], 'en': o['label_en'], 'fr': o['label_fr_brouillon'], 'fr_statut': o['label_fr_statut'],
                'definition_en': o['definition_en'], 'nature': o['nature'], 'perimetre': o['perimetre'],
                'relation': o['relation'], 'cle': o['cle'], 'noms': o['noms'], 'composants': o['composants'],
                'atc': [c for c in o['atc_codes'].split(' | ') if c], 'atc_libelle_fr': o['atc_libelle_fr'],
                'agents': [], 'note': o['note'] or None, 'parents': [p for p in o['parents_hdo'].split(' | ') if p],
                'sources': [u for u in o['sources'].split(' | ') if u], 'uri': o['uri'],
            }
        a['agents'].append({'id': o['agent_id'], 'en': o['agent_label_en'], 'fr': o['agent_fr'], 'uri': o['agent_uri']})
    allergies = sorted(par_code.values(), key=lambda a: a['code'])
    corps = json.dumps(allergies, ensure_ascii=False, indent=1)
    (RACINE / 'lib/allergies-data.ts').write_text(
        '/**\n * DwaDZ — Allergies HDO (Human Disease Ontology) utilisables dans le site : GÉNÉRÉ par scripts/build_hdo_alignement.py,\n'
        ' * ne pas modifier à la main (corriger data/hdo/ ou le script, puis relancer).\n'
        ' * Les libellés français sont des brouillons (fr_statut). Pas de codes SNOMED CT ni UMLS ici.\n */\n\n'
        "import type { AllergieHdo } from './allergies-core.ts'\n\n"
        f"export const ALLERGIES_HDO: AllergieHdo[] = {corps}\n", encoding='utf-8')
    choix = [{'code': a['code'], 'fr': (a['agents'][0]['fr'] or a['agents'][0]['en']), 'en': a['agents'][0]['en'] or a['en'],
              'classe': a['relation'] == 'classe', 'proche': a['relation'] == 'proche'}
             for a in allergies if a['perimetre'] == 'fiche']
    choix.sort(key=lambda c: (not c['classe'], plier(c['fr'])))
    (RACINE / 'lib/allergies-choix.ts').write_text(
        '/**\n * DwaDZ — Allergies proposées par le filtre « Allergie connue » de la recherche (liste légère, côté navigateur).\n'
        ' * GÉNÉRÉ par scripts/build_hdo_alignement.py, ne pas modifier à la main.\n */\n\n'
        'export type ChoixAllergie = { code: string; fr: string; en: string; classe: boolean; proche: boolean }\n\n'
        f"export const CHOIX_ALLERGIES: ChoixAllergie[] = {json.dumps(choix, ensure_ascii=False, indent=1)}\n", encoding='utf-8')


def main():
    rows = list(csv.DictReader(open(SRC, encoding='utf-8-sig')))
    out, anomalies = [], []
    for r in rows:
        parents = set(filter(None, r['allergy_parent_ids'].split(' | ')))
        nat = nature(r, parents)
        ag = r['agent_id'] or ''
        relation, codes, atc_en, atc_fr, note, perim = 'aucun', [], None, None, '', 'hors_perimetre'
        genre_sub = False  # vrai quand l'agent est une substance (à rapprocher par son nom), faux pour une classe

        decision = MANUEL.get(ag) or COMPLEXES.get(r['allergy_id'])
        if ag == 'CHEBI:50858':
            decision = ('classe', 'classe', CORTICOIDES, MANUEL[ag][3])
        if decision:
            relation, genre, valeur, note = decision
            if genre == 'substance':
                codes, atc_fr = substance(valeur)
                atc_en = valeur
                genre_sub = True
            else:
                codes = classe(valeur)
                atc_en = ' ; '.join(atc[c][1] for c in codes[:3]) + (' …' if len(codes) > 3 else '')
                atc_fr = ' ; '.join(atc[c][2] for c in codes[:3]) + (' …' if len(codes) > 3 else '')
        elif r['agent_ontology'] == 'CHEBI' and nat in ('medicament', 'contact', 'respiratoire'):
            codes, atc_fr = substance(r['agent_label_en'])
            if codes:
                relation, atc_en, genre_sub = 'exact', r['agent_label_en'], True

        if relation != 'aucun' and nat in ('medicament', 'contact'):
            perim = 'fiche'
        if nat == 'racine':
            perim = 'racine'
        elif nat == 'non_allergie':
            perim = 'non_allergie'
        elif nat == 'latex':
            perim = 'conditionnement'
        if r['allergy_id'] in EXCIPIENT_CANDIDATS and perim == 'hors_perimetre':
            perim = 'excipient'
        if r['allergy_id'] == 'DOID:0040019':
            perim = 'fiche'  # mannitol : substance active ET excipient

        # Les contacts/respiratoires « chimie pro » rattachés par hasard à l'ATC (ex. chlorhexidine est une allergie médicamenteuse) restent en fiche ;
        # une dermatite de contact au formaldéhyde n'a pas d'ATC : hors périmètre.
        # Repères de lecture pour le français : libellé provisoire, jamais présenté comme relu.
        type_fr = next((fr for suf, fr in TYPE_FR if r['allergy_label_en'].endswith(suf)), 'Allergie')
        agent_fr = FR_CLASSES.get(ag) or (atc_fr if (relation == 'exact' and atc_fr) else (r['agent_label_en'] or None))
        label_fr = f'{type_fr} — {agent_fr}' if agent_fr and nat != 'racine' else None
        fr_statut = 'brouillon' if ((relation == 'exact' and atc_fr) or ag in FR_CLASSES) else 'absent'

        out.append({
            'allergy_id': r['allergy_id'], 'code': r['allergy_id'].replace('DOID:', ''),
            'label_en': r['allergy_label_en'], 'label_fr_brouillon': label_fr, 'label_fr_statut': fr_statut,
            'nature': nat, 'perimetre': perim, 'parents_hdo': r['allergy_parent_ids'],
            'agent_id': ag or None, 'agent_label_en': r['agent_label_en'] or None, 'agent_ontologie': r['agent_ontology'] or 'COMPLEX',
            'relation': relation, 'atc_libelle_en': atc_en, 'atc_libelle_fr': atc_fr, 'atc_codes': ' | '.join(codes),
            'note': note, 'snomed_ct': r['snomed_ct_xrefs'], 'umls_cui': r['umls_xrefs'], 'autres_xrefs': r['other_xrefs'],
            'sources': r['source_evidence_links'], 'uri': r['allergy_uri'],
            'definition_en': r['allergy_definition_en'], 'agent_uri': r['agent_uri'] or None, 'agent_fr': agent_fr,
            'cle': (atc_en.lower() if (relation in ('exact', 'proche') and genre_sub) else None),
            'noms': [n for n in dict.fromkeys([atc_fr, atc_en, r['agent_label_en'] or None]) if n] if (relation in ('exact', 'proche') and genre_sub) else [],
            'composants': COMPOSANTS.get(ag),
        })

    # ── Anomalies de la source, à signaler à HDO ou à neutraliser ───────────
    def a(i, txt): anomalies.append({'allergy_id': i, 'label_en': next(o['label_en'] for o in out if o['allergy_id'] == i), 'anomalie': txt})
    a('DOID:0040038', 'Étiquetée « allergy » mais définie comme « allergic asthma » (parent DOID:9415) alors que c’est une allergie médicamenteuse (méropénème) : classée médicament ici.')
    a('DOID:13564', 'Aspergillose : une infection fongique (parent opportunistic mycosis), pas une allergie ; l’agent est un genre fongique. Exclue.')
    a('DOID:0040082', 'Rangée en « drug allergy » mais l’oxirane (oxyde d’éthylène) est un stérilisant de dispositifs, sans ATC : hors médicament.')
    a('DOID:0040004', 'Amoxicilline a pour seul parent « beta-lactam allergy », pas « penicillin allergy » (DOID:0060520) : la hiérarchie ATC (J01CA04 ⊂ J01C) sert à remonter à la pénicilline.')
    a('DOID:0040021', 'Les céphalosporines ne sont pas sous « beta-lactam allergy » dans HDO (parent : drug allergy) ; idem les carbapénèmes (DOID:0040032). La hiérarchie ATC (J01D) comble.')
    a('DOID:0040076', 'Agent = un groupe chimique (phthalyl group), pas une substance : rattachement « proche » seulement.')
    a('DOID:0060904', 'Légumineuses rangées sous « fruit allergy » (parent DOID:0060503).')
    for o in out:
        if o['agent_ontologie'] == 'CHEBI' and o['relation'] == 'aucun' and o['nature'] == 'medicament':
            anomalies.append({'allergy_id': o['allergy_id'], 'label_en': o['label_en'], 'anomalie': 'Allergie médicamenteuse sans substance ATC trouvée : à examiner.'})

    # ── Écritures ───────────────────────────────────────────────────────────
    cols = list(out[0])
    plat = lambda o: {c: (' | '.join(map(str, v)) if isinstance(v, list) else v) for c, v in o.items()}  # listes → texte pour CSV/xlsx
    with open(f'{OUT}.csv', 'w', newline='', encoding='utf-8') as f:
        w = csv.DictWriter(f, cols); w.writeheader(); w.writerows(plat(o) for o in out)
    json.dump(out, open(f'{OUT}.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)

    ecrire_ts(out)

    bilan = defaultdict(int)
    for o in out:
        bilan[(o['perimetre'], o['relation'])] += 1
    wb = openpyxl.Workbook()
    ws = wb.active; ws.title = 'Alignement'; ws.append(cols)
    for o in map(plat, out): ws.append([o[c] for c in cols])
    ws.freeze_panes = 'C2'; ws.auto_filter.ref = ws.dimensions
    wsb = wb.create_sheet('Bilan'); wsb.append(['perimetre', 'relation', 'lignes'])
    for (p, rel), n in sorted(bilan.items()): wsb.append([p, rel, n])
    wsa = wb.create_sheet('Anomalies'); wsa.append(['allergy_id', 'label_en', 'anomalie'])
    for x in anomalies: wsa.append([x['allergy_id'], x['label_en'], x['anomalie']])
    wb.save(f'{OUT}.xlsx')

    print(f'{len(out)} lignes, {len({o["allergy_id"] for o in out})} allergies')
    for (p, rel), n in sorted(bilan.items()): print(f'  {p:16s} {rel:7s} {n}')
    print(f'{len(anomalies)} anomalies signalées')


if __name__ == '__main__':
    sys.exit(main())
