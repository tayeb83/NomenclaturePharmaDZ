/**
 * Recherche guidée (Lab) : normalisation des axes et règles du moteur de facettes (lib/guide-core.ts).
 * Sans base de données.
 *   node --test tests/guide/
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  chercherDci, construireIndex, guider, normaliserDci, normaliserDosage, normaliserForme, type LigneNomenclature,
} from '../../lib/guide-core.ts'

// ─── Formes ────────────────────────────────────────────────────

test('forme : les abréviations de la nomenclature rejoignent la forme écrite en entier', () => {
  const groupes: [string, string, string[]][] = [
    ['Comprimé pelliculé', 'orale-solide', ['COMPRIME PELLICULE', 'COMP. PELL.', 'CP PELLICULE', 'COMP.PELLICULE', 'comprimé pelliculé']],
    ['Comprimé pelliculé sécable', 'orale-solide', ['COMP.PELL.SECABLE', 'CP PELLICULE SECABLE', 'COMPRIME SECABLE PELLICULE']],
    ['Gélule', 'orale-solide', ['GELULE', 'GLES', 'GELULES']],
    ['Gélule gastrorésistante', 'orale-solide', ['GELULE GASTRO-RESISTANTE', 'GEL. GASTRO-RESIST.', 'GLE G.R.', 'GELULE GASTRORESISTANTE']],
    ['Poudre pour suspension buvable', 'orale-liquide', ['POUDRE POUR SUSPENSION BUVABLE', 'PDRE. P. SUSP. BUV.', 'PDRE P SUSP BUV']],
    ['Poudre et solvant pour solution injectable', 'injectable', ['PDRE ET SOLV. P. SOL. INJ.', 'POUDRE ET SOLVANT POUR SOLUTION INJECTABLE']],
    ['Solution injectable', 'injectable', ['SOL. INJ.', 'SOLUTION INJECTABLE', 'SOLUTION INJECTABLE EN AMPOULE', 'SOL. INJ. S.C.', 'SOL. INJ. EN SERINGUE PRE-REMPLIE']],
    ['Comprimé à libération prolongée', 'orale-solide', ['COMPRIME A LIBERATION PROLONGEE', 'COMP. LP', 'COMP. L.P.', 'COMPRIME RETARD']],
    ['Solution à diluer pour perfusion', 'injectable', ['SOL. A DILUER POUR PERFUSION', 'SOLUTION A DILUER POUR PERFUSION']],
    ['Suppositoire', 'rectale', ['SUPPOSITOIRE', 'SUPPO.', 'SUPPOSITOIRES ADULTES']],
    ['Solution pour pulvérisation nasale', 'nasale', ['SPRAY NASAL', 'SOL. P. PULV. NASALE']],
  ]
  for (const [fr, voie, ecritures] of groupes) {
    for (const e of ecritures) {
      const f = normaliserForme(e)
      assert.equal(f.fr, fr, e)
      assert.equal(f.voie, voie, e)
      assert.ok(f.reconnu, e)
    }
  }
})

test('forme : écritures relevées dans la nomenclature réelle (audit)', () => {
  const cas: [string, string][] = [
    ['GELLULE GASTRO RESISTANTE', 'Gélule gastrorésistante'],
    ['GELULES GASTO-RESISTANTE', 'Gélule gastrorésistante'],
    ['GELULE A MICRO-GRANULES GASTRO-RESISTANTS', 'Gélule gastrorésistante'],
    ['MICROGRANULE EN GELLULE LIBERATION PROLONGEE', 'Gélule à libération prolongée'],
    ['GELULE GASTRO-RESISTANTE CONTENANT DES MINI-COMPRIMES', 'Gélule gastrorésistante'],
    ['CAPSULE DURE', 'Gélule'],
    ['MICRO-GRANULE A LIBERATION PROLONGEE  EN SACHET', 'Granulés à libération prolongée'],
    ['COMPRIME EFFERVESSANT', 'Comprimé effervescent'],
    ['COMRIME PELLICULE', 'Comprimé pelliculé'],
    ['COMPRIME QUADRI-SECABLE', 'Comprimé quadrisécable'],
    ['POUDRE POUR SUSPENSSION BUVABLE EN SACHET DOSE', 'Poudre pour suspension buvable'],
    ['SOLUTION INJECTABLE. S/C EN SERINGUE PRE-REMPLIE', 'Solution injectable'],
    ['SOL P/PERF I/V', 'Solution pour perfusion'],
    ['SOLUTION INJECTABLE SC ET INTRAVASCULAIRE EN SERING. PREREMPL.', 'Solution injectable'],
    ['POUDRE LYOPHILISEE POUR SOLUTION A DILUER POUR PERFUSION IV', 'Poudre pour solution à diluer pour perfusion'],
    ['LYOPH. P. SOL. INJ. IV', 'Poudre pour solution injectable'],
    ['LYOPH. ORAL SUBLINGUAL', 'Lyophilisat oral'],
    ['CONC. A DILUER P. PERF. IV', 'Solution à diluer pour perfusion'],
    ['SOLVANT POUR PREPARATION INJECTABLE', 'Solvant pour préparation parentérale'],
    ['POUDRE LYOPHILISEE POUR PREPARATION INJECTABLE EN PERFUSION INTRAVEINEUSE', 'Poudre pour solution pour perfusion'],
    ['SUSPENSION BUVABLE GTTES', 'Suspension buvable en gouttes'],
    ['SUSP.OR.', 'Suspension buvable'],
    ['PDRE.OR.', 'Poudre orale'],
    ['AMP.BUV.', 'Solution buvable'],
    ['DRG.', 'Comprimé enrobé'],
    ['GAZ POUR INHALATION', 'Gaz pour inhalation'],
    ['LIQUIDE. P. INHAL. PAR VAPEUR', 'Liquide pour inhalation par vapeur'],
    ['Solution concentrEe pour HEmodialyse', 'Solution à diluer pour hémodialyse'],
    ['SOL. P. DIALYSE PERITONEALE', 'Solution pour dialyse péritonéale'],
    ['EMULSION FLUIDE POUR APPLICATION LOCALE (LAIT DERMIQUE)', 'Emulsion cutanée'],
    ['LAIT EN POUDRE POUR ENFANT EN BAS AGE ET ENFANT DE 1 A 14 ANS', 'Lait en poudre'],
    ['SYSTEME DE DIFFUSION INTRA-UTERIN', 'Système de diffusion intra-utérin'],
    ['SUPPOSITOIRE VAGINALE', 'Ovule'],
  ]
  for (const [brut, fr] of cas) {
    const f = normaliserForme(brut)
    assert.equal(f.fr, fr, brut)
    assert.ok(f.reconnu, brut)
  }
  assert.equal(normaliserForme('SUPPOSITOIRE VAGINALE').voie, 'vaginale')
  assert.equal(normaliserForme('SPRAY INHAL. BUCCALE').voie, 'inhalee')
  assert.equal(normaliserForme('COMPRIME A SUCER OU A CROQUER').voie, 'orale-solide')
  assert.equal(normaliserForme('COMPRIME A SUCER').voie, 'buccale')
})

test('forme : la voie distingue ce qui se ressemble', () => {
  assert.equal(normaliserForme('GEL').voie, 'cutanee')
  assert.equal(normaliserForme('GEL BUVABLE').voie, 'orale-liquide')
  assert.equal(normaliserForme('GEL OPHTALMIQUE').voie, 'ophtalmique')
  assert.equal(normaliserForme('COMPRIME VAGINAL').voie, 'vaginale')
  assert.equal(normaliserForme('POUDRE POUR INHALATION EN GELULE').voie, 'inhalee')
  assert.equal(normaliserForme('POUDRE POUR INHALATION EN GELULE').fr, 'Poudre pour inhalation en gélule')
  assert.equal(normaliserForme('COLLUTOIRE').voie, 'buccale')
  assert.equal(normaliserForme('DISPOSITIF TRANSDERMIQUE').voie, 'transdermique')
  assert.equal(normaliserForme('GOUTTES AURICULAIRES').voie, 'auriculaire')
  assert.equal(normaliserForme('SIROP').voie, 'orale-liquide')
})

test('forme : un mot inconnu empêche tout rapprochement (écriture d’origine conservée)', () => {
  const f = normaliserForme('COMPRIME BIZARROIDE')
  assert.equal(f.reconnu, false)
  assert.deepEqual(f.inconnus, ['bizarroide'])
  assert.equal(f.fr, 'Comprime bizarroide')
  assert.match(f.id, /^x-/)
  assert.equal(normaliserForme('').id, 'non-precisee')
})

test('forme : libellés arabes des formes fréquentes', () => {
  assert.equal(normaliserForme('COMP. PELL.').ar, 'قرص مغلف بغشاء رقيق')
  assert.equal(normaliserForme('SOL. INJ.').ar, 'محلول للحقن')
})

// ─── Dosages ───────────────────────────────────────────────────

test('dosage : unités ramenées à la base, écritures équivalentes regroupées', () => {
  const memeCle = (a: string, b: string, n = 1) => assert.equal(normaliserDosage(a, n).id, normaliserDosage(b, n).id, `${a} ≠ ${b}`)
  memeCle('500MG', '500 mg')
  memeCle('0,5G', '500 MG')
  memeCle('1G', '1000 MG')
  memeCle('50MG/ML', '50 MG/1 ML')
  memeCle('10MG/ML (50MG/5ML)', '10 MG/ML') // l'équivalence entre parenthèses est écartée
  memeCle('2MG/5ML OU 0,40MG/ML', '2 MG/5 ML')
  memeCle('1G/FL. DE PDRE.', '1 G') // quantité par contenant = quantité de la présentation
  memeCle('500MG/SACHET', '500 MG')
  memeCle('80MG**', '80 MG')
  memeCle('100.000UI', '100 000 UI')
  memeCle('200µG/DOSE', '200MCG/DOSE')
  memeCle('1G/125MG', '1 g + 125 mg', 2)
  memeCle('500/62,5MG', '500 MG/62,5 MG', 2)
  assert.notEqual(normaliserDosage('2,4%').id, normaliserDosage('24 MG/ML').id) // % : m/m ou m/v, jamais converti
})

test('dosage : le volume du dénominateur est gardé (une seringue n’est pas une autre)', () => {
  const id = (d: string) => normaliserDosage(d).id
  assert.notEqual(id('40MG/0,4ML'), id('80MG/0,8ML'))
  assert.notEqual(id('4000 UI/0,4 ML'), id('6000 UI/0,6 ML'))
  assert.notEqual(id('250MG/5ML'), id('50MG/ML'))
  assert.notEqual(id('100MG/2ML'), id('250MG/5ML'))
  // le tri suit la concentration
  assert.equal(normaliserDosage('250MG/5ML').tri, 50)
  assert.equal(normaliserDosage('10MG/ML (50MG/5ML)').complement, '(50MG/5ML)')
  assert.equal(normaliserDosage('1G/FL. DE PDRE.').libelle, '1 g/flacon')
  assert.equal(normaliserDosage('20µG/80µL').cle, '0.02mg/0.08ml')
  assert.equal(normaliserDosage('1MG/FL. DE PDRE. (50KUI/FL. DE PDRE.)').libelle, '1 mg/flacon')
  assert.equal(normaliserDosage('70°').libelle, '70°')
  // nombre seul entre 0 et 1 : pourcentage converti en fraction par l'export Excel
  const memeQue = (a: string, b: string) => assert.equal(normaliserDosage(a).id, normaliserDosage(b).id, `${a} ≠ ${b}`)
  memeQue('0,02', '2 %')
  memeQue('0.02', '2%')
  memeQue('0,0005', '0,05 %')
  memeQue('0,00127', '0,127 %')
  assert.equal(normaliserDosage('0,02').libelle, '2 %')
  assert.equal(normaliserDosage('0,009').libelle, '0,9 %')
  assert.match(normaliserDosage('0,02').complement!, /Excel/)
  // un nombre sans unité ≥ 1, ou une quantité sans unité, reste non interprété
  assert.equal(normaliserDosage('5').reconnu, false)
  assert.equal(normaliserDosage('1,5').reconnu, false)
  assert.equal(normaliserDosage('0.5 ML').reconnu, false)
})

test('dosage : libellés canoniques', () => {
  const lib = (d: string, n = 1) => normaliserDosage(d, n).libelle
  assert.equal(lib('250MG/5ML'), '250 mg/5 ml')
  assert.equal(lib('1G/125MG', 2), '1 g + 125 mg')
  assert.equal(lib('100MG/12,5MG/ML', 2), '100 mg + 12,5 mg par ml')
  assert.equal(lib('2,4%'), '2,4 %')
  assert.equal(lib('100.000UI'), '100 000 UI')
  assert.equal(lib('1 M UI'), '1 M UI')
  assert.equal(lib('20MG/G'), '20 mg/g')
  assert.equal(lib('5MG/24H'), '5 mg/24 h')
})

test('dosage : « / » sépare deux composants ou introduit une concentration selon la DCI', () => {
  assert.equal(normaliserDosage('1G/125MG', 2).composants, 2)
  assert.equal(normaliserDosage('20MG/G', 1).composants, 1)
  assert.equal(normaliserDosage('20MG/G', 1).cle, '20mg/1g')
  assert.equal(normaliserDosage('5 G/100 G', 1).cle, '5000mg/100g')
  assert.equal(normaliserDosage('1G/125MG', 1).alerte, '2 quantités pour une seule substance')
  assert.equal(normaliserDosage('500 MG', 2).alerte, '1 quantité(s) pour 2 substances')
})

test('dosage : tri numérique et valeurs non lisibles', () => {
  assert.ok(normaliserDosage('500 MG').tri! < normaliserDosage('1 G').tri!)
  assert.equal(normaliserDosage('1.250 MG').tri, 1.25) // point décimal hors unité d'activité
  const base = normaliserDosage('10 MG (BASE)')
  assert.equal(base.libelle, '10 mg')
  assert.equal(base.complement, '(BASE)')
  const x = normaliserDosage('AMP. DE 5ML')
  assert.equal(x.reconnu, false)
  assert.equal(x.libelle, 'AMP. DE 5ML')
  assert.equal(normaliserDosage('PURETE ≥ 99.50%').reconnu, false)
  assert.equal(normaliserDosage('').id, 'non-precise')
  assert.equal(normaliserDosage('-').id, 'non-precise')
})

// ─── DCI ───────────────────────────────────────────────────────

test('DCI : séparateurs et ordre des substances sans effet sur l’identifiant', () => {
  const a = normaliserDci('AMOXICILLINE/ACIDE CLAVULANIQUE')
  const b = normaliserDci('ACIDE CLAVULANIQUE + AMOXICILLINE')
  const c = normaliserDci('AMOXICILLINE ET ACIDE CLAVULANIQUE')
  assert.equal(a.id, b.id)
  assert.equal(a.id, c.id)
  assert.deepEqual(a.substances, ['AMOXICILLINE', 'ACIDE CLAVULANIQUE'])
  assert.equal(a.libelle, 'AMOXICILLINE + ACIDE CLAVULANIQUE')
  assert.deepEqual(normaliserDci('VITAMINE B1/B6').substances, ['VITAMINE B1/B6'])
  assert.equal(normaliserDci('AMLODIPINE BESILATE EXPRIME EN AMLODIPINE').substances.length, 1)
})

// ─── Moteur ────────────────────────────────────────────────────

let id = 0
const L = (dci: string, forme: string, dosage: string, nom_marque: string, labo = 'SAIDAL', statut = 'F'): LigneNomenclature =>
  ({ id: ++id, dci, forme, dosage, nom_marque, labo, statut, pays: 'ALGERIE', conditionnement: null })
const idx = construireIndex([
  L('AMOXICILLINE', 'GELULE', '500 MG', 'AMOXIPEN 500'),
  L('AMOXICILLINE', 'GLES', '500MG', 'CLAMOXYL 500', 'GSK', 'I'),
  L('AMOXICILLINE', 'COMPRIME DISPERSIBLE', '1 G', 'CLAMOXYL 1G', 'GSK', 'I'),
  L('AMOXICILLINE', 'PDRE. P. SUSP. BUV.', '125MG/5ML', 'AMOXIPEN 125'),
  L('AMOXICILLINE', 'POUDRE POUR SUSPENSION BUVABLE', '250 MG/5 ML', 'AMOXIPEN 250'),
  L('AMOXICILLINE', 'PDRE P SUSP BUV', '250MG/5ML', 'CLAMOXYL 250', 'GSK', 'I'),
  L('AMOXICILLINE', 'POUDRE POUR SOLUTION INJECTABLE', '1 G', 'AMOXICILLINE PANPHARMA', 'PANPHARMA', 'I'),
  L('AMOXICILLINE/ACIDE CLAVULANIQUE', 'COMP. PELL.', '1G/125MG', 'AUGMENTIN 1G', 'GSK', 'I'),
  L('ACIDE CLAVULANIQUE + AMOXICILLINE', 'COMPRIME PELLICULE', '125 MG/1 G', 'CLAVOXAL', 'EL KENDI'),
])
const DCI_AMOX = normaliserDci('AMOXICILLINE').id
const DCI_AUG = normaliserDci('AMOXICILLINE + ACIDE CLAVULANIQUE').id

test('étape 1 : DCI par début de nom, par substance et par marque', () => {
  assert.deepEqual(chercherDci(idx, 'amox').map(o => o.id), [DCI_AMOX, DCI_AUG])
  assert.deepEqual(chercherDci(idx, 'clav').map(o => o.id), [DCI_AUG])
  const parMarque = chercherDci(idx, 'augmen')
  assert.equal(parMarque[0].id, DCI_AUG)
  assert.deepEqual(parMarque[0].marques, ['AUGMENTIN 1G'])
  assert.deepEqual(chercherDci(idx, 'a'), [])
  const r = guider(idx, { q: 'amox' })
  assert.equal(r.etape, 'dci')
  assert.equal(r.options.dci?.length, 2)
})

test('les écritures différentes d’une même valeur ne forment qu’une option', () => {
  const r = guider(idx, { dci: DCI_AMOX })
  assert.equal(r.total, 7)
  assert.deepEqual(r.options.voie!.map(o => [o.id, o.n]), [['orale-solide', 3], ['orale-liquide', 3], ['injectable', 1]])
  assert.equal(r.options.forme!.find(o => o.libelle === 'Gélule')!.n, 2)
  assert.equal(r.options.dosage!.find(o => o.libelle === '250 mg/5 ml')!.n, 2)
  assert.equal(r.options.forme!.find(o => o.libelle === 'Poudre pour solution injectable')!.n, 1)
  // DCI fusionnée et composants réalignés : « 1 g + 125 mg » = « 125 mg + 1 g » quand la DCI est inversée
  const aug = guider(idx, { dci: DCI_AUG })
  assert.equal(aug.total, 2)
  assert.equal(aug.options.dosage!.length, 1)
})

test('le libellé d’un dosage vient des écritures de la DCI, jamais d’une autre', () => {
  const i2 = construireIndex([
    L('ENOXAPARINE', 'SOL. INJ.', '4000 UI/0,4 ML', 'LOVENOX 4000'),
    L('ENOXAPARINE', 'SOL. INJ.', '4000UI/0.4ML', 'ENOXA 4000'),
    L('AUTRE', 'SOL. INJ.', '4 000 UI/0,4 ML', 'X1'),
    L('AUTRE', 'SOL. INJ.', '4 000 UI/0,4 ML', 'X2'),
    L('AUTRE', 'SOL. INJ.', '4 000 UI/0,4 ML', 'X3'),
  ])
  const r = guider(i2, { dci: normaliserDci('ENOXAPARINE').id })
  assert.equal(r.options.dosage!.length, 1)
  assert.equal(r.options.dosage![0].libelle, '4000 UI/0,4 ml')
})

test('règle 2 : une étape à valeur unique est remplie d’office', () => {
  const r = guider(idx, { dci: DCI_AMOX, voie: 'orale-liquide' })
  assert.deepEqual(r.auto, ['forme'])
  assert.equal(r.selection.forme!.libelle, 'Poudre pour suspension buvable')
  assert.equal(r.etape, 'dosage')
  assert.deepEqual(r.options.dosage!.map(o => o.libelle), ['125 mg/5 ml', '250 mg/5 ml'])
  const fin = guider(idx, { dci: DCI_AMOX, voie: 'orale-liquide', dosage: r.options.dosage![1].id })
  assert.equal(fin.etape, null)
  assert.deepEqual(fin.presentations.map(p => p.nom_marque), ['AMOXIPEN 250', 'CLAMOXYL 250'])
})

test('règle 1 : aucune option ne mène à zéro présentation, dans n’importe quel ordre', () => {
  const un_g = normaliserDosage('1 G').id
  const r = guider(idx, { dci: DCI_AMOX, dosage: un_g })
  assert.deepEqual(r.options.voie!.map(o => o.id), ['orale-solide', 'injectable'])
  for (const c of ['voie', 'forme', 'dosage', 'statut', 'labo'] as const) {
    for (const o of r.options[c]!) {
      assert.ok(o.n > 0)
      assert.ok(guider(idx, { dci: DCI_AMOX, dosage: un_g, [c]: o.id }).total > 0, `${c}=${o.id}`)
    }
  }
})

test('règle 3 : un choix devenu incompatible est retiré, le choix amont l’emporte', () => {
  const r = guider(idx, { dci: DCI_AMOX, voie: 'injectable', dosage: normaliserDosage('500 MG').id })
  assert.deepEqual(r.ignores, ['dosage'])
  assert.equal(r.selection.voie!.id, 'injectable')
  assert.equal(r.total, 1)
  // une valeur qui n'existe pas pour cette DCI ne fait pas tomber les autres choix
  const absente = guider(idx, { dci: DCI_AUG, voie: 'injectable', forme: normaliserForme('COMP. PELL.').id })
  assert.deepEqual(absente.ignores, ['voie'])
  assert.equal(absente.selection.forme!.libelle, 'Comprimé pelliculé')
  const inconnue = guider(idx, { dci: 'n-existe-pas' })
  assert.equal(inconnue.etape, 'dci')
  assert.deepEqual(inconnue.ignores, ['dci'])
})

test('filtres : fabriqué / importé et laboratoire', () => {
  const r = guider(idx, { dci: DCI_AMOX, statut: 'f' })
  assert.equal(r.total, 3)
  assert.ok(r.presentations.every(p => p.statut === 'F'))
  assert.deepEqual(r.options.statut!.map(o => [o.libelle, o.n]), [['Importé', 4], ['Fabriqué en Algérie', 3]])
  assert.equal(guider(idx, { dci: DCI_AMOX, labo: 'gsk' }).total, 3)
})

test('arabe : formulation courante de la voie', () => {
  const r = guider(idx, { dci: DCI_AMOX }, 'ar')
  assert.equal(r.options.voie![1].courant, 'للشرب (شراب، معلق…)')
  assert.equal(r.options.voie![1].libelle_ar, 'فموي سائل')
})
