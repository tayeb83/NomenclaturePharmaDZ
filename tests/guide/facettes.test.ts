/**
 * Facettes de la recherche (lib/facettes.ts) : normalisation des écritures et règles de comptage. Sans base.
 *   node --test tests/guide/
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { appliquerFacettes, axesDeLigne, facettesDepuisParams, type LigneRecherche } from '../../lib/facettes.ts'

const L = (dci: string, forme: string, dosage: string, statut: string | null = 'I'): LigneRecherche => ({ dci, forme, dosage, statut })
const lignes: LigneRecherche[] = [
  L('AMOXICILLINE', 'GELULE', '500 MG', 'F'),
  L('AMOXICILLINE', 'GLES.', '0,5G', 'F'),
  L('AMOXICILLINE', 'GELLULE', '500MG', 'I'),
  L('AMOXICILLINE', 'PDRE. P. SUSP. BUV.', '250MG/5ML', 'F'),
  L('AMOXICILLINE', 'POUDRE POUR SUSPENSSION BUVABLE', '250 MG/5 ML', 'I'),
  L('AMOXICILLINE', 'POUDRE POUR SOLUTION INJECTABLE IV/IM', '1G/FL. DE PDRE.', 'I'),
  L('AMOXICILLINE/ACIDE CLAVULANIQUE', 'COMP. PELL.', '1G/125MG', 'I'),
  L('PARACETAMOL', 'SIROP', '2,4%', null),
]

test('les écritures d’une même valeur ne forment qu’une facette', () => {
  const r = appliquerFacettes(lignes)
  const f = (k: 'voie' | 'forme' | 'dosage' | 'origine') => r.facettes[k].map(o => [o.id, o.n])
  assert.deepEqual(f('voie'), [['orale-solide', 4], ['orale-liquide', 3], ['injectable', 1]])
  assert.equal(r.facettes.forme.find(o => o.libelle === 'Gélule')!.n, 3)
  assert.equal(r.facettes.forme.find(o => o.libelle === 'Poudre pour suspension buvable')!.n, 2)
  assert.equal(r.facettes.dosage.find(o => o.libelle === '500 mg')!.n, 3) // 500 MG, 0,5G, 500MG
  assert.equal(r.facettes.dosage.find(o => o.libelle === '250 mg/5 ml')!.n, 2)
  assert.deepEqual(f('origine'), [['f', 3], ['i', 4], ['non-precise', 1]])
  assert.equal(r.rows.length, lignes.length)
  assert.deepEqual(r.ignores, [])
})

test('règle 1 : le compteur d’un groupe ignore son propre choix', () => {
  const r = appliquerFacettes(lignes, { voie: 'orale-liquide' })
  assert.equal(r.rows.length, 3)
  // les autres voies restent visibles, avec ce qu'elles donneraient seules
  assert.deepEqual(r.facettes.voie.map(o => [o.id, o.n]), [['orale-solide', 4], ['orale-liquide', 3], ['injectable', 1]])
  // les autres groupes ne comptent que les lignes à boire
  assert.deepEqual(r.facettes.forme.map(o => o.n).sort(), [1, 2])
  assert.deepEqual(r.facettes.origine.map(o => [o.id, o.n]), [['f', 1], ['i', 1], ['non-precise', 1]])
})

test('plusieurs choix se combinent', () => {
  const r = appliquerFacettes(lignes, { voie: 'orale-solide', origine: 'f', dosage: '500mg' })
  assert.equal(r.rows.length, 2)
  assert.ok(r.rows.every(x => x.statut === 'F' && x.dci === 'AMOXICILLINE'))
})

test('règle 2 : un choix devenu impossible est retiré, les autres sont gardés', () => {
  const r = appliquerFacettes(lignes, { voie: 'injectable', forme: 'comprime-pellicule', origine: 'i' })
  assert.deepEqual(r.ignores, ['forme'])
  assert.deepEqual(r.selection, { voie: 'injectable', origine: 'i' })
  assert.equal(r.rows.length, 1)
  const inconnu = appliquerFacettes(lignes, { forme: 'n-existe-pas' })
  assert.deepEqual(inconnu.ignores, ['forme'])
  assert.equal(inconnu.rows.length, lignes.length)
})

test('aucune option à zéro et jamais plus d’options que la limite, le choix en cours est conservé', () => {
  const beaucoup = Array.from({ length: 60 }, (_, i) => L('X', 'COMPRIME', `${i + 1} MG`))
  const r = appliquerFacettes(beaucoup, { dosage: '59mg' }, 10)
  assert.equal(r.facettes.dosage.length, 10)
  assert.ok(r.facettes.dosage.some(o => o.id === '59mg'))
  for (const k of ['voie', 'forme', 'dosage', 'origine'] as const) for (const o of r.facettes[k]) assert.ok(o.n > 0)
})

test('arabe et origine absente', () => {
  const a = axesDeLigne(L('PARACETAMOL', 'SIROP', '2,4%', null))
  assert.equal(a.voie.ar, 'فموي سائل')
  assert.equal(a.origine.id, 'non-precise')
  assert.equal(a.dosage.fr, '2,4 %')
  assert.equal(axesDeLigne(L('A', 'COMP. PELL.', '500 MG')).forme.ar, 'قرص مغلف بغشاء رقيق')
})

test('paramètres d’URL : valeurs invalides ignorées', () => {
  const p = new URLSearchParams('voie=Orale-Solide&forme=<script>&dosage=500mg&origine=f&autre=1')
  assert.deepEqual(facettesDepuisParams(n => p.get(n)), { voie: 'orale-solide', dosage: '500mg', origine: 'f' })
})

test('une association se regroupe quel que soit l’ordre des substances de la DCI', () => {
  const r = appliquerFacettes([
    L('AMOXICILLINE/ACIDE CLAVULANIQUE', 'COMP. PELL.', '1G/125MG'),
    L('ACIDE CLAVULANIQUE + AMOXICILLINE', 'COMPRIME PELLICULE', '125 MG/1 G'),
  ])
  assert.equal(r.facettes.dosage.length, 1)
  assert.equal(r.facettes.dosage[0].n, 2)
})
