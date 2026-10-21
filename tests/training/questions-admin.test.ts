import { test, before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import pg from 'pg'
import { createQuestionsAdmin, validateEdit } from '../../lib/training/questions.ts'

const URL = process.env.TEST_DATABASE_URL
const skip = URL ? false : 'TEST_DATABASE_URL non défini'
let pool: pg.Pool
const query = async (sql: string, params?: any[]) => (await pool.query(sql, params)).rows
const admin = () => createQuestionsAdmin({ query })

before(() => { if (URL) pool = new pg.Pool({ connectionString: URL }) })
after(async () => { if (pool) { await query('TRUNCATE training_questions RESTART IDENTITY CASCADE'); await pool.end() } })
beforeEach(async () => {
  if (!URL) return
  await query('TRUNCATE training_questions RESTART IDENTITY CASCADE')
  for (let i = 0; i < 4; i++) {
    await query(
      `INSERT INTO training_questions (question_key, type, source_table, source_ref, stem, options, correct_index, explanation, content_hash)
       VALUES ($1, $2, 'enregistrements', $3, $4, $5::jsonb, 1, $6::jsonb, 'HASH')`,
      [`k${i}`, i % 2 ? 'labo_pays' : 'dci_from_brand', `enregistrements:${i}`, `Énoncé ${i} ?`,
       JSON.stringify(['a', 'b', 'c', 'd', 'e'].map(x => `${x}${i}`)),
       JSON.stringify({ contexte: 'ctx', rationales: ['1', '2', '3', '4', '5'], points_cles: ['p'], references: [] })],
    )
  }
}) 

test('validateEdit : refuse les modifications invalides', () => {
  assert.deepEqual(validateEdit({ stem: 'Ok ?', options: ['a', 'b', 'c', 'd', 'e'], correct_index: 4 }), [])
  assert.ok(validateEdit({ stem: '  ' }).length)
  assert.ok(validateEdit({ options: ['a', 'b', 'c', 'd'] }).length, '4 propositions')
  assert.ok(validateEdit({ options: ['a', 'b', 'c', 'd', ''] }).length, 'proposition vide')
  assert.ok(validateEdit({ options: ['500 MG', '500mg', 'c', 'd', 'e'] }).length, 'doublon à la ponctuation près')
  assert.ok(validateEdit({ correct_index: 5 }).length)
  assert.ok(validateEdit({ correct_index: 1.5 }).length)
  assert.ok(validateEdit({ explanation: { rationales: ['a', 'b'] } }).length)
  assert.ok(validateEdit({ explanation: { points_cles: Array(11).fill('x') } }).length)
})

test('liste, filtres, compteurs', { skip }, async () => {
  const a = admin()
  assert.deepEqual(await a.counts(), { draft: 4, reviewed: 0, published: 0, stale: 0 })
  assert.equal((await a.list({ type: 'labo_pays' })).total, 2)
  assert.equal((await a.list({ q: 'Énoncé 2' })).total, 1)
  assert.equal((await a.list({ q: '%' })).total, 0, 'le joker LIKE est littéral')
  assert.equal((await a.list({ status: 'published' })).total, 0)
})

test('publier exige un relecteur, pose relu_par et lève a_valider', { skip }, async () => {
  const a = admin()
  assert.deepEqual(await a.setStatus([1], 'publish', '  '), { error: 'nom du relecteur requis' })
  assert.deepEqual(await a.setStatus([1, 2], 'publish', ' Dr  Merabti '), { updated: 2 })
  const q = await a.get(1)
  assert.equal(q.status, 'published')
  assert.equal(q.relu_par, 'Dr Merabti')
  assert.ok(q.relu_at)
  assert.equal(q.a_valider, false)
  assert.deepEqual(await a.counts(), { draft: 2, reviewed: 0, published: 2, stale: 0 })
  assert.deepEqual(await a.setStatus([], 'publish', 'x'), { error: 'aucune question' })
  assert.deepEqual(await a.setStatus([1], 'nope' as any, 'x'), { error: 'action invalide' })
})

test('relue puis remise en brouillon : relecteur effacé, à valider de nouveau', { skip }, async () => {
  const a = admin()
  await a.setStatus([1], 'review', 'Relecteur')
  assert.equal((await a.get(1)).status, 'reviewed')
  await a.setStatus([1], 'draft', '')
  const q = await a.get(1)
  assert.equal(q.status, 'draft')
  assert.equal(q.relu_par, null)
  assert.equal(q.a_valider, true)
})

test('modification manuelle : contenu mis à jour, manually_edited posé, content_hash de génération intact', { skip }, async () => {
  const a = admin()
  const r = await a.edit(1, {
    stem: ' Nouvel énoncé ? ', options: ['v', 'w', 'x', 'y', 'z'], correct_index: 3,
    explanation: { contexte: 'nouveau', rationales: ['a', 'b', 'c', 'd', 'e'], points_cles: ['k1', 'k2'] },
  })
  assert.deepEqual(r, { ok: true })
  const q = await a.get(1)
  assert.equal(q.stem, 'Nouvel énoncé ?')
  assert.deepEqual(q.options, ['v', 'w', 'x', 'y', 'z'])
  assert.equal(q.correct_index, 3)
  assert.equal(q.explanation.contexte, 'nouveau')
  assert.deepEqual(q.explanation.references, [], 'les références ne sont pas modifiables ici')
  assert.equal(q.manually_edited, true)
  assert.equal(q.content_hash, 'HASH')
  assert.deepEqual(await a.edit(1, { options: ['a', 'a', 'c', 'd', 'e'] }), { ok: false, errors: ['deux propositions identiques'] })
  assert.deepEqual(await a.edit(999, { stem: 'x' }), { ok: false, errors: ['question introuvable'] })
})

test('la base refuse de publier sans relecteur', { skip }, async () => {
  await assert.rejects(query("UPDATE training_questions SET status='published' WHERE id=1"), /training_questions_published_reviewed/)
})
