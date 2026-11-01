/**
 * Tirage équilibré entre types (série libre et examens blancs) — test pur, sans base de données.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { balancedPick } from '../../lib/training/exam.ts'

const bank = [
  ...Array.from({ length: 500 }, (_, i) => ({ id: i + 1, type: 'dci_from_brand' })),
  ...Array.from({ length: 12 }, (_, i) => ({ id: 1000 + i, type: 'interaction_niveau' })),
  ...Array.from({ length: 3 }, (_, i) => ({ id: 2000 + i, type: 'atc_code' })),
]
const lcg = (seed: number) => () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296)

test('un type abondant ne noie pas les autres', () => {
  const picked = balancedPick(bank, 30, lcg(1))
  const n = (t: string) => picked.filter(p => p.type === t).length
  assert.equal(picked.length, 30)
  assert.equal(n('atc_code'), 3, 'le type rare est épuisé')
  assert.equal(n('interaction_niveau'), 12)
  assert.equal(n('dci_from_brand'), 15)
})

test('pas de doublon, jamais plus que demandé ni que disponible', () => {
  const picked = balancedPick(bank, 100, lcg(2))
  assert.equal(new Set(picked.map(p => p.id)).size, picked.length)
  assert.equal(balancedPick(bank.slice(500), 100, lcg(3)).length, 15)
  assert.deepEqual(balancedPick([], 10, lcg(4)), [])
})

test('déterministe pour une même graine', () => {
  assert.deepEqual(balancedPick(bank, 40, lcg(9)), balancedPick(bank, 40, lcg(9)))
})
