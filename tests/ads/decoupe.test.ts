/**
 * Découpage des listes pour y intercaler des publicités.
 *   node --test tests/ads/decoupe.test.ts
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { decouperPourPubs } from '../../components/ads/decoupe.ts'

const liste = (n: number) => Array.from({ length: n }, (_, i) => i)
const tailles = (n: number, premier: number, pas: number, max: number) =>
  decouperPourPubs(liste(n), premier, pas, max).map(s => s.items.length)

test('liste courte : un seul segment, aucune pub', () => {
  assert.deepEqual(tailles(0, 3, 8, 3), [0])
  assert.deepEqual(tailles(3, 3, 8, 3), [3])
})

test('une pub après les premiers éléments, puis à intervalle régulier', () => {
  assert.deepEqual(tailles(4, 3, 8, 3), [3, 1])
  assert.deepEqual(tailles(12, 3, 8, 3), [3, 8, 1])
})

test('jamais de pub en fin de liste', () => {
  assert.deepEqual(tailles(11, 3, 8, 3), [3, 8])
})

test('nombre de pubs plafonné', () => {
  assert.deepEqual(tailles(300, 3, 8, 3), [3, 8, 8, 281])
})

test('les segments conservent tous les éléments et leur position', () => {
  const segments = decouperPourPubs(liste(25), 2, 6, 2)
  assert.deepEqual(segments.map(s => s.debut), [0, 2, 8])
  assert.deepEqual(segments.flatMap(s => s.items), liste(25))
})
