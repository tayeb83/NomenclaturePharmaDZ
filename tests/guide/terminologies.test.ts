/**
 * Terminologies de la recherche guidée : Standard Terms EDQM (lib/edqm*.ts) et unités UCUM (lib/ucum.ts),
 * et leur rattachement aux formes et dosages de la nomenclature. Sans base de données.
 *   node --test tests/guide/
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { EDQM_FORMES, EDQM_VOIES } from '../../lib/edqm-data.ts'
import { EDQM_AR, EDQM_AR_RELUS } from '../../lib/edqm-ar.ts'
import { edqmForme, edqmVoie, lierForme } from '../../lib/edqm.ts'
import { UNITES_INFO } from '../../lib/ucum.ts'
import { VOIES, normaliserDosage, normaliserForme } from '../../lib/guide-core.ts'

test('EDQM : données générées cohérentes', () => {
  assert.equal(EDQM_FORMES.length, 426)
  assert.equal(EDQM_VOIES.length, 82)
  for (const liste of [EDQM_FORMES, EDQM_VOIES]) {
    const codes = new Set(liste.map(l => l[0]))
    assert.equal(codes.size, liste.length, 'codes en double')
    for (const [code, en] of liste) { assert.match(code, /^\d{8}$/); assert.ok(en) }
    // un libellé français ne désigne qu'un code (les doublons de la source sont écartés à la génération)
    const fr = liste.flatMap(l => (l[2] ? [l[2].toLowerCase()] : []))
    assert.equal(new Set(fr).size, fr.length)
  }
  assert.deepEqual(edqmForme('10221000'), { code: '10221000', en: 'Film-coated tablet', fr: 'Comprimé pelliculé', ar: 'قرص مغلف بغشاء رقيق', ar_relu: false })
  assert.equal(edqmVoie('20053000')?.fr, 'Voie orale')
})

test('EDQM : chaque traduction arabe porte sur un code existant', () => {
  for (const code of Object.keys(EDQM_AR)) assert.ok(edqmForme(code), `code inconnu : ${code}`)
  for (const code of EDQM_AR_RELUS) assert.ok(EDQM_AR[code], `relu sans traduction : ${code}`)
})

test('EDQM : rattachement d’une forme, avec la nature du lien', () => {
  const lien = (l: string) => { const r = lierForme(l); return r ? [r.code, r.relation] : null }
  assert.deepEqual(lien('comprimé pelliculé'), ['10221000', 'exact'])
  assert.deepEqual(lien('gélule gastro-résistante'), ['10212000', 'exact']) // l'EDQM écrit « gastrorésistante »
  assert.deepEqual(lien('gel buvable'), ['10108000', 'exact']) // synonyme d'usage de « Gel oral »
  assert.deepEqual(lien('dispositif transdermique'), ['10519000', 'exact'])
  // la sécabilité et le pelliculage d'une forme LP ne sont pas des Standard Terms : terme plus large
  assert.deepEqual(lien('comprimé pelliculé sécable'), ['10221000', 'plus-large'])
  assert.deepEqual(lien('comprimé quadrisécable'), ['10219000', 'plus-large'])
  assert.deepEqual(lien('comprimé pelliculé sécable à libération prolongée'), ['10226000', 'plus-large'])
  assert.deepEqual(lien('poudre et solvant pour solution injectable'), ['11205000', 'plus-large'])
  assert.deepEqual(lien('solution pour inhalation'), ['11101000', 'proche'])
  // pas de terme sûr : pas de lien
  assert.equal(lien('collyre'), null)
  assert.equal(lien('gaz pour inhalation'), null)
  assert.equal(lien('forme inventée'), null)
})

test('forme normalisée : libellé officiel quand le lien est exact, libellé précis sinon', () => {
  const gel = normaliserForme('GEL BUVABLE EN SACHETS-DOSE')
  assert.equal(gel.fr, 'Gel oral')
  assert.deepEqual(gel.edqm, { code: '10108000', en: 'Oral gel', fr: 'Gel oral', relation: 'exact' })
  assert.equal(gel.ar, 'جل فموي')
  const sec = normaliserForme('COMP. PELL. SECABLE')
  assert.equal(sec.fr, 'Comprimé pelliculé sécable')
  assert.equal(sec.edqm?.code, '10221000')
  assert.equal(sec.edqm?.relation, 'plus-large')
  assert.equal(sec.ar, 'قرص مغلف بغشاء رقيق قابل للشطر')
  assert.equal(normaliserForme('PATCH').fr, 'Patch transdermique')
  assert.equal(normaliserForme('TRUC').edqm, null)
})

test('voies : codes EDQM existants', () => {
  for (const v of VOIES) if (v.edqm) assert.ok(edqmVoie(v.edqm), `${v.id} : ${v.edqm}`)
  assert.equal(VOIES.find(v => v.id === 'injectable')!.edqm, null) // plusieurs voies EDQM
  assert.equal(edqmVoie(VOIES.find(v => v.id === 'cutanee')!.edqm!)?.en, 'Cutaneous use')
})

test('fautes de frappe : corrigées et signalées', () => {
  assert.deepEqual(normaliserForme('GELLULE GASTRO RESISTANTE').fautes, ['GELLULE → GELULE'])
  assert.deepEqual(normaliserForme('POUDRE POUR SUSPENSSION BUVABLE').fautes, ['SUSPENSSION → SUSPENSION'])
  assert.deepEqual(normaliserForme('GELULES GASTO-RESISTANTE').fautes, ['GASTO → GASTRO'])
  assert.deepEqual(normaliserForme('GELULE').fautes, [])
})

test('UCUM : codes des unités et quantités d’un dosage', () => {
  // syntaxe UCUM : sensible à la casse, annotations entre accolades, unités arbitraires entre crochets
  for (const [u, info] of Object.entries(UNITES_INFO)) if (info.ucum) assert.match(info.ucum, /^[A-Za-z0-9%[\]{}*.]+$/, u)
  assert.equal(UNITES_INFO['µg'].ucum, 'ug')
  assert.equal(UNITES_INFO.ml.ucum, 'mL')
  assert.equal(UNITES_INFO.ui.ucum, '[iU]')
  assert.equal(UNITES_INFO.flacon.ucum, null)
  const d = normaliserDosage('250MG/5ML')
  assert.deepEqual(d.quantites, [{ valeur: 250, unite: 'mg', ucum: 'mg' }])
  assert.deepEqual(d.denominateur, { valeur: 5, unite: 'ml', ucum: 'mL' })
  assert.equal(d.libelle_ar, '250 ملغ/5 مل')
  const assoc = normaliserDosage('1G/125MG', 2)
  assert.deepEqual(assoc.quantites.map(q => [q.valeur, q.ucum]), [[1, 'g'], [125, 'mg']])
  assert.equal(assoc.libelle_ar, '1 غ + 125 ملغ')
  assert.deepEqual(normaliserDosage('100.000UI').quantites, [{ valeur: 100000, unite: 'UI', ucum: '[iU]' }])
  assert.deepEqual(normaliserDosage('200µG/DOSE').denominateur, { valeur: 1, unite: 'dose', ucum: '{dose}' })
  assert.deepEqual(normaliserDosage('0,02').quantites, [{ valeur: 2, unite: '%', ucum: '%' }])
  assert.deepEqual(normaliserDosage('AMP. DE 5ML').quantites, [])
})
