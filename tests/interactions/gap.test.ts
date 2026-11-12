/**
 * Écarts entre les interactions citées par les RCP (rcp_faits) et le Thesaurus ANSM
 * (lib/interactions-gap-core.ts). Sans base de données, sur le vrai thésaurus.
 *   node --test tests/interactions/gap.test.ts
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { buildThesaurusIndex, cle, type ClasseLien } from '../../lib/interactions-core.ts'
import {
  bilan, buildGapContext, comparerFait, scorePriorite, type FaitRcp, type Gravite,
} from '../../lib/interactions-gap-core.ts'

type Json = {
  substances: { nom: string; voir_aussi: string[]; membres?: string[] }[]
  interactions: { substance: string; partenaire: string; niveau: 'contre_indication' | 'deconseillee' | 'precaution_emploi' | 'a_prendre_en_compte' }[]
}
const data: Json = JSON.parse(readFileSync(new URL('../../data/ansm/interactions_fr.json', import.meta.url), 'utf8'))
const titres = data.substances.map(s => s.nom)
const parCle = new Map(titres.map(t => [cle(t), t]))
const liens: ClasseLien[] = []
for (const s of data.substances) {
  for (const m of s.membres ?? []) liens.push({ classe: s.nom, membre: m })
  for (const v of s.voir_aussi) liens.push({ classe: parCle.get(cle(v)) ?? v, membre: s.nom })
}
const ctx = buildGapContext(buildThesaurusIndex(titres, liens), data.interactions)

let n = 0
const fait = (dci: string, cible: string, gravite: Gravite = 'non_precisee', extra: Partial<FaitRcp> = {}): FaitRcp =>
  ({ rcp_id: `rcp-${++n}`, dci, libelle: cible, cible_type: 'dci', cible, gravite, section: '4.5', page: 3, ...extra })

test('paire directe de l\'ANSM : couverte, dans les deux sens', () => {
  for (const [a, b] of [['ABIRATERONE', 'RIFAMPICINE'], ['RIFAMPICINE', 'ABIRATERONE']]) {
    const [c] = comparerFait(ctx, fait(a, b, 'deconseillee'))
    assert.equal(c.ecart, 'couverte_directe')
    assert.equal(c.niveau_ansm, 'deconseillee')
  }
})

test('couverture par une classe : abatacept + adalimumab est couvert par « ANTI-TNF ALPHA »', () => {
  const [c] = comparerFait(ctx, fait('ABATACEPT', 'ADALIMUMAB'))
  assert.equal(c.ecart, 'couverte_classe')
  assert.ok(c.via.some(v => /ANTI-TNF ALPHA/.test(v)))
})

test('divergence de niveau : le RCP est plus sévère que l\'ANSM', () => {
  const [c] = comparerFait(ctx, fait('ABIRATERONE', 'METOPROLOL', 'contre_indiquee'))
  assert.equal(c.ecart, 'divergence_niveau')
  assert.equal(c.sens, 'source_plus_grave')
  assert.equal(c.niveau_ansm, 'precaution_emploi')
})

test('même niveau, ou niveau non précisé : pas de divergence', () => {
  assert.equal(comparerFait(ctx, fait('ABIRATERONE', 'METOPROLOL', 'precaution'))[0].ecart, 'couverte_directe')
  assert.equal(comparerFait(ctx, fait('ABIRATERONE', 'METOPROLOL', 'non_precisee'))[0].ecart, 'couverte_directe')
})

test('absence : acétazolamide + phénytoïne n\'est pas dans le thésaurus', () => {
  const [c] = comparerFait(ctx, fait('ACETAZOLAMIDE', 'PHENYTOINE'))
  assert.equal(c.ecart, 'absente')
  assert.equal(c.via.length, 0)
})

test('prudence : classe ATC ou nom inconnu → non résolue, jamais « absente »', () => {
  const classe = comparerFait(ctx, fait('ACETAZOLAMIDE', 'Diurétiques', 'precaution', { cible_type: 'classe', cible: 'C03' }))
  assert.equal(classe[0].ecart, 'non_resolue')
  const inconnu = comparerFait(ctx, fait('ACETAZOLAMIDE', 'Substance imaginaire', 'precaution', { cible_type: null, cible: null }))
  assert.equal(inconnu[0].ecart, 'non_resolue')
})

test('une DCI associée donne un constat par couple, et une substance ne s\'oppose pas à elle-même', () => {
  const r = comparerFait(ctx, fait('ABIRATERONE + METOPROLOL', 'RIFAMPICINE'))
  assert.equal(r.length, 2)
  assert.deepEqual(comparerFait(ctx, fait('ABIRATERONE', 'ABIRATERONE')), [])
})

test('bilan : une paire citée par deux RCP (dans les deux sens) donne un seul candidat', () => {
  const constats = [
    ...comparerFait(ctx, fait('ACETAZOLAMIDE', 'PHENYTOINE', 'precaution')),
    ...comparerFait(ctx, fait('PHENYTOINE', 'ACETAZOLAMIDE', 'deconseillee')),
    ...comparerFait(ctx, fait('ABIRATERONE', 'RIFAMPICINE', 'deconseillee')),
    ...comparerFait(ctx, fait('ACETAZOLAMIDE', 'Diurétiques', 'precaution', { cible_type: 'classe', cible: 'C03' })),
  ]
  const b = bilan(constats)
  assert.equal(b.faits.couverte_directe, 1)
  assert.equal(b.faits.non_resolue, 1)
  assert.equal(b.paires.absente, 1)
  assert.equal(b.candidats.length, 1)
  const [c] = b.candidats
  assert.equal(c.n_rcp, 2)
  assert.equal(c.gravite_source, 'deconseillee')
  assert.equal(c.paire_key, [cle('ACETAZOLAMIDE'), cle('PHENYTOINE')].sort().join('|'))
  assert.equal(c.preuves.length, 2)
})

test('score : sévérité, marge étroite et divergence plus sévère passent devant', () => {
  const base = { n_rcp: 1, substance_a: 'ABC', substance_b: 'DEF', sens: null, a_hors_thesaurus: false, b_hors_thesaurus: false } as const
  const ci = scorePriorite({ ...base, gravite_source: 'contre_indiquee' })
  const pe = scorePriorite({ ...base, gravite_source: 'precaution' })
  assert.ok(ci > pe)
  assert.ok(scorePriorite({ ...base, gravite_source: 'precaution', substance_a: 'LITHIUM' }) > pe)
  assert.ok(scorePriorite({ ...base, gravite_source: 'precaution', sens: 'source_plus_grave' }) > pe)
  assert.ok(scorePriorite({ ...base, gravite_source: 'precaution', a_hors_thesaurus: true }) < pe)
})
