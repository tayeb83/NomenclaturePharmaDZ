/**
 * Terminologies d'une fiche (lib/terminologie-fiche.ts) : ce que la fiche affiche à côté de la forme, des voies et du
 * dosage. Sans base de données.
 *   node --test tests/guide/
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { lienTerminologie, terminologieDeFiche } from '../../lib/terminologie-fiche.ts'

test('fiche : forme, voie, méthode et unités', () => {
  const t = terminologieDeFiche('POUDRE POUR SUSPENSSION BUVABLE', '250MG/5ML', 'AMOXICILLINE')
  assert.equal(t.forme?.code, '10111000')
  assert.equal(t.forme?.relation, 'exact')
  assert.equal(t.forme?.ar, 'مسحوق لمعلق للشرب')
  assert.deepEqual(t.voies.map(v => v.code), ['20053000'])
  assert.equal(t.voies[0].fr, 'Voie orale')
  assert.equal(t.methode?.code, '0019')
  assert.deepEqual(t.unites.map(u => u.ucum), ['mg', 'mL'])
})

test('fiche : voies précisées par la forme, aucune supposée sinon', () => {
  assert.deepEqual(terminologieDeFiche('SOLUTION INJECTABLE IM/IV', '1G', 'X').voies.map(v => v.code), ['20045000', '20035000'])
  assert.deepEqual(terminologieDeFiche('SOLUTION INJECTABLE', '1G', 'X').voies, [])
})

test('fiche : lien plus large et unités sans code UCUM', () => {
  const t = terminologieDeFiche('COMP. PELL. SECABLE', '1G/FL', 'X')
  assert.deepEqual([t.forme?.code, t.forme?.relation], ['10221000', 'plus-large'])
  assert.deepEqual(t.unites.map(u => u.ucum), ['g']) // « /FL » : le flacon n'a pas d'unité UCUM
  assert.deepEqual(terminologieDeFiche('TRUC', 'AMP. DE 5ML', 'X'), { forme: null, voies: [], methode: null, unites: [] })
  assert.deepEqual(terminologieDeFiche(null, null, null), { forme: null, voies: [], methode: null, unites: [] })
})

test('fiche : une correction manuelle de la base prime sur le calcul', () => {
  const t = terminologieDeFiche('COLLYRE', '0,005', 'TIMOLOL', { forme: { code: '10604000', relation: 'proche' }, voies: ['20051000'], methode: '0013' })
  assert.deepEqual([t.forme?.code, t.forme?.relation, t.methode?.code], ['10604000', 'proche', '0013'])
  // correction qui retire le lien
  assert.equal(terminologieDeFiche('COMP. PELL.', '5 MG', 'X', { forme: null }).forme, null)
})

test('fiche : une traduction arabe relue en base remplace le brouillon', () => {
  const brouillon = terminologieDeFiche('GELULE', '500 MG', 'X')
  assert.equal(brouillon.forme?.ar_relu, false)
  const relu = terminologieDeFiche('GELULE', '500 MG', 'X', { arRelus: { '10210000': 'كبسولة صلبة' } })
  assert.equal(relu.forme?.ar, 'كبسولة صلبة')
  assert.equal(relu.forme?.ar_relu, true)
})

test('lien vers la page des référentiels', () => {
  assert.equal(lienTerminologie('ucum', 'mg'), '/terminologies?onglet=ucum&code=mg')
  assert.equal(lienTerminologie('ucum', '[iU]'), '/terminologies?onglet=ucum&code=%5BiU%5D')
})
