/**
 * Relecture des interactions candidates : validation d'une décision, source inscrite à l'acceptation.
 *   node --test tests/interactions/veille.test.ts
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { interactionDepuisCandidat, niveauSuggere, sourceDepuisPreuve, validateDecision } from '../../lib/interactions-veille-core.ts'
import { validateInteraction } from '../../lib/interactions-admin-core.ts'

const ok = (raw: unknown) => {
  const r = validateDecision(raw)
  assert.ok(r.ok, r.ok ? '' : r.error)
  return r.value
}
const ko = (raw: unknown) => {
  const r = validateDecision(raw)
  assert.equal(r.ok, false)
  return r.ok ? '' : r.error
}

test('rejet : le motif est obligatoire', () => {
  assert.match(ko({ id: 3, action: 'rejete' }), /motif/)
  assert.match(ko({ id: 3, action: 'rejete', motif: '   ' }), /motif/)
  assert.equal(ok({ id: 3, action: 'rejete', motif: 'Sans portée clinique' }).motif, 'Sans portée clinique')
})

test('acceptation : niveau valide et risque décrit par le relecteur', () => {
  assert.match(ko({ id: 3, action: 'accepte', risque_fr: 'Risque X' }), /niveau/i)
  assert.match(ko({ id: 3, action: 'accepte', niveau: 'inconnu', risque_fr: 'Risque X' }), /niveau/i)
  assert.match(ko({ id: 3, action: 'accepte', niveau: 'deconseillee', risque_fr: '  ' }), /risque/i)
  const d = ok({ id: 3, action: 'accepte', niveau: 'deconseillee', risque_fr: ' Risque X ', preuve_id: '7' })
  assert.equal(d.risque_fr, 'Risque X')
  assert.equal(d.preuve_id, 7)
})

test('autres actions : pas de champ obligatoire ; identifiant et action contrôlés', () => {
  for (const action of ['en_revue', 'differe', 'rouvrir']) assert.equal(ok({ id: 1, action }).action, action)
  ko(null)
  ko({ id: 0, action: 'en_revue' })
  ko({ id: 1, action: 'supprimer' })
})

test('niveau proposé selon la gravité du RCP', () => {
  assert.equal(niveauSuggere('contre_indiquee'), 'contre_indication')
  assert.equal(niveauSuggere('deconseillee'), 'deconseillee')
  assert.equal(niveauSuggere('precaution'), 'precaution_emploi')
  assert.equal(niveauSuggere('non_precisee'), 'precaution_emploi')
})

test('source : RCP ANPP avec rubrique, page, version et lien ; lien non http ignoré', () => {
  const s = sourceDepuisPreuve({ nom_commercial: 'DIAMOX', laboratoire: 'LABO', pdf_url: 'https://rcp.anpp.dz/x.pdf', section: '4.5', page: 4, version: '12/2025' })
  assert.equal(s.source_type, 'rcp')
  assert.equal(s.source_titre, 'RCP ANPP — DIAMOX (LABO)')
  assert.equal(s.source_url, 'https://rcp.anpp.dz/x.pdf')
  assert.equal(s.source_ref, 'rubrique 4.5, p. 4, version 12/2025')
  assert.equal(sourceDepuisPreuve({ nom_commercial: null, laboratoire: null, pdf_url: 'javascript:alert(1)', section: '', page: null, version: null }).source_url, null)
})

test('l\'interaction créée passe la validation de la saisie manuelle, dans les deux sens', () => {
  const d = ok({ id: 3, action: 'accepte', niveau: 'precaution_emploi', risque_fr: 'Augmentation des concentrations.', conduite_fr: 'Surveillance clinique.' })
  const input = interactionDepuisCandidat(
    { substance_a: 'acétazolamide', substance_b: 'Phénytoïne' }, d,
    { nom_commercial: 'DIAMOX', laboratoire: null, pdf_url: 'https://rcp.anpp.dz/x.pdf', section: '4.5', page: 4, version: null },
  )
  assert.equal(input.substance, 'ACÉTAZOLAMIDE')
  assert.equal(input.inverse, true)
  const v = validateInteraction(input)
  assert.ok(v.ok, v.ok ? '' : v.error)
})
