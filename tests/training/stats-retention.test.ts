/**
 * Suivi, exports, suppression de compte, conservation. PostgreSQL requis (voir exam.test.ts).
 */
import { test, before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import pg from 'pg'
import { createStatsService, MIN_ANSWERS } from '../../lib/training/stats.ts'
import { createTrainingService } from '../../lib/training/service.ts'
import { createExamService } from '../../lib/training/exam.ts'

const URL = process.env.TEST_DATABASE_URL
const skip = URL ? false : 'TEST_DATABASE_URL non défini'
let pool: pg.Pool
const query = async (sql: string, params?: any[]) => (await pool.query(sql, params)).rows
const stats = () => createStatsService({ query })
const training = () => createTrainingService({ query, sendMail: async () => ({ success: true }), appUrl: () => 'https://x.test', adminEmails: () => [] })

before(() => { if (URL) pool = new pg.Pool({ connectionString: URL }) })
after(async () => { if (pool) { await query('TRUNCATE training_users, training_questions, events RESTART IDENTITY CASCADE'); await pool.end() } })
beforeEach(async () => {
  if (!URL) return
  await query('TRUNCATE training_users, training_questions, events RESTART IDENTITY CASCADE')
})

async function user(email: string, extra: { status?: string; faculte?: string; created?: string; lastLogin?: string | null; approved?: string | null } = {}) {
  const r = await query(
    `INSERT INTO training_users (email, role, status, faculte, created_at, last_login_at, approved_at, status_changed_at)
     VALUES ($1, 'etudiant', $2, $3, COALESCE($4::timestamptz, NOW()), $5, $6, COALESCE($4::timestamptz, NOW())) RETURNING id`,
    [email, extra.status ?? 'approved', extra.faculte ?? null, extra.created ?? null, extra.lastLogin ?? null, extra.approved ?? null],
  )
  return Number(r[0].id)
}
async function question(i: number, type: string, atc: string | null) {
  const r = await query(
    `INSERT INTO training_questions (question_key, type, source_table, source_ref, stem, options, correct_index, explanation, content_hash, atc_code, status, relu_par, relu_at)
     VALUES ($1, $2, 'enregistrements', $3, $4, '["a","b","c","d","e"]'::jsonb, 0, '{"contexte":"c","rationales":["1","2","3","4","5"],"points_cles":[],"references":[]}'::jsonb, 'h', $5, 'published', 'r', NOW()) RETURNING id`,
    [`k${i}`, type, `enregistrements:${i}`, `Question ${i}`, atc],
  )
  return Number(r[0].id)
}
/** Tentative terminée avec une liste de (question, choix, justesse). */
async function attempt(userId: number, answers: [number, number | null, boolean | null][], opts: { mode?: string; score?: number; finished?: boolean } = {}) {
  const ids = answers.map(a => a[0])
  const t = await query(
    `INSERT INTO attempts (user_id, mode, question_ids, total, score, finished_at, started_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW() - INTERVAL '10 minutes') RETURNING id`,
    [userId, opts.mode ?? 'examen', ids, ids.length, opts.score ?? answers.filter(a => a[2]).length, opts.finished === false ? null : new Date()],
  )
  const id = Number(t[0].id)
  let pos = 1
  for (const [q, choice, ok] of answers) {
    await query('INSERT INTO answers (attempt_id, question_id, position, choice, is_correct) VALUES ($1, $2, $3, $4, $5)', [id, q, pos++, choice, ok])
  }
  return id
}

test('overview : actifs sur 7 jours, tentatives, score moyen', { skip }, async () => {
  const a = await user('a@x.dz'); const b = await user('b@x.dz'); await user('c@x.dz', { status: 'pending' })
  const q = await question(1, 'dci_from_brand', 'N02BE01')
  await query("INSERT INTO events (user_id, type, created_at) VALUES ($1, 'login', NOW() - INTERVAL '2 days'), ($1, 'attempt_started', NOW()), ($2, 'login', NOW() - INTERVAL '10 days'), (NULL, 'login', NOW())", [a, b])
  await attempt(a, [[q, 0, true]], { score: 1 })
  await attempt(a, [[q, 1, false]], { score: 0, mode: 'tuteur' })
  await attempt(b, [[q, null, null]], { finished: false })
  const o = await stats().overview(7)
  assert.equal(o.activeUsers, 1, 'a est actif ; b l’était il y a 10 jours ; l’événement sans utilisateur ne compte pas')
  assert.equal((await stats().overview(30)).activeUsers, 2)
  assert.deepEqual(o.users, { approved: 2, pending: 1 })
  assert.equal(o.attempts.total, 3)
  assert.equal(o.attempts.finished, 2)
  assert.equal(o.attempts.avgScorePct, 50)
  assert.deepEqual(o.byMode.map(m => [m.mode, m.attempts]), [['examen', 2], ['tuteur', 1]])
  assert.equal(o.questions.published, 1)
})

test('overview : base vide sans erreur', { skip }, async () => {
  const o = await stats().overview(7)
  assert.equal(o.activeUsers, 0)
  assert.equal(o.attempts.avgScorePct, null)
})

test('questions les plus manquées : échantillon minimal, réponses données et corrigées seulement', { skip }, async () => {
  const u = await user('a@x.dz')
  const hard = await question(1, 'labo_pays', 'J01CA04')
  const easy = await question(2, 'dci_from_brand', 'N02BE01')
  const rare = await question(3, 'atc_classe', 'N02BE01')
  for (let i = 0; i < MIN_ANSWERS; i++) {
    await attempt(u, [[hard, 1, false], [easy, 0, i === 0 ? false : true]])
  }
  await attempt(u, [[rare, 1, false]]) // un seul passage : sous l'échantillon minimal
  await attempt(u, [[hard, null, false]]) // sans réponse : ignorée
  await attempt(u, [[hard, 1, null]], { finished: false }) // non corrigée : ignorée
  const m = await stats().mostMissed()
  assert.deepEqual(m.questions.map(q => [q.id, q.n, q.wrong, q.rate]), [[hard, 5, 5, 100], [easy, 5, 1, 20]])
  assert.ok(!m.questions.some(q => q.id === rare))
  assert.deepEqual(m.byType.map(t => [t.type, t.n, t.wrong]), [['atc_classe', 1, 1], ['labo_pays', 5, 5], ['dci_from_brand', 5, 1]])
  assert.deepEqual(m.byAtc.map(a => [a.atc, a.n, a.wrong]), [['J01C', 5, 5], ['N02B', 6, 2]])
})

test('classes ATC : libellé joint quand la table existe', { skip }, async () => {
  const u = await user('a@x.dz')
  const q = await question(1, 'dci_from_brand', 'N02BE01')
  await query("INSERT INTO atc_codes (code, niveau, label_fr) VALUES ('N02B', 3, 'Autres analgésiques') ON CONFLICT (code) DO UPDATE SET label_fr = EXCLUDED.label_fr")
  for (let i = 0; i < MIN_ANSWERS; i++) await attempt(u, [[q, 1, false]])
  const m = await stats().mostMissed()
  assert.equal(m.byAtc[0].label, 'Autres analgésiques')
  await query("DELETE FROM atc_codes WHERE code = 'N02B'")
})

test('exports CSV : agrégats par utilisateur et par tentative, formules neutralisées', { skip }, async () => {
  const a = await user('a@x.dz', { faculte: '=HYPERLINK("http://evil")' })
  const q = await question(1, 'dci_from_brand', null)
  await attempt(a, [[q, 0, true]], { score: 1 })
  await attempt(a, [[q, 1, false]], { score: 0 })
  const users = await stats().exportUsersCsv()
  assert.ok(users.startsWith('﻿"id","email"'))
  assert.ok(users.includes('"a@x.dz"'))
  assert.ok(users.includes(`"'=HYPERLINK(""http://evil"")"`), 'injection de formule neutralisée')
  assert.match(users, /"2","2","50\.0"/, 'tentatives, terminées, score moyen')
  const att = await stats().exportAttemptsCsv()
  assert.ok(att.includes('"tentative","utilisateur","email"'))
  assert.equal(att.trim().split('\r\n').length, 3)
  assert.ok(att.includes('"100.0"') && att.includes('"0.0"'))
})

test('suppression de compte : cascade complète, événements anonymisés', { skip }, async () => {
  const a = await user('a@x.dz'); const b = await user('b@x.dz')
  const q = await question(1, 'dci_from_brand', null)
  await attempt(a, [[q, 0, true]])
  await attempt(b, [[q, 0, true]])
  await query('INSERT INTO login_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, NOW() + INTERVAL \'1 hour\')', [a, 'h1'])
  await query("INSERT INTO training_sessions (user_id, token_hash, expires_at) VALUES ($1, 'h2', NOW() + INTERVAL '1 day')", [a])
  await query('INSERT INTO training_flashcards (user_id, question_id) VALUES ($1, $2)', [a, q])
  await query("INSERT INTO events (user_id, type, payload) VALUES ($1, 'login', '{}')", [a])
  assert.equal(await training().deleteUser(a, 'self'), true)
  for (const t of ['training_users WHERE id', 'attempts WHERE user_id', 'login_tokens WHERE user_id', 'training_sessions WHERE user_id', 'training_flashcards WHERE user_id']) {
    assert.equal((await query(`SELECT * FROM ${t} = $1`, [a])).length, 0, t)
  }
  assert.equal((await query('SELECT * FROM answers')).length, 1, 'seules les réponses de b restent')
  assert.equal((await query('SELECT * FROM attempts WHERE user_id = $1', [b])).length, 1, 'b intact')
  assert.equal((await query("SELECT * FROM events WHERE user_id = $1", [a])).length, 0)
  assert.equal((await query("SELECT * FROM events WHERE type='login' AND user_id IS NULL")).length, 1)
  const del = await query("SELECT payload FROM events WHERE type='account_deleted'")
  assert.deepEqual(del.map(r => r.payload), [{ by: 'self' }], 'aucune donnée personnelle dans l’événement')
  assert.equal(await training().deleteUser(a, 'self'), false)
})

test('conservation : seules les données périmées sont supprimées', { skip }, async () => {
  const old = '2024-01-01T00:00:00Z'
  const oldPending = await user('old-pending@x.dz', { status: 'pending', created: old })
  const oldRejected = await user('old-rejected@x.dz', { status: 'rejected', created: old })
  const newPending = await user('new-pending@x.dz', { status: 'pending' })
  const inactive = await user('inactive@x.dz', { created: old, approved: old, lastLogin: old })
  const neverLoggedOld = await user('never@x.dz', { created: old, approved: old })
  const active = await user('active@x.dz', { created: old, approved: old, lastLogin: new Date().toISOString() })
  await query("INSERT INTO events (user_id, type, created_at) VALUES (NULL, 'login', NOW() - INTERVAL '30 months'), (NULL, 'login', NOW())")
  const res = await training().purgeRetention()
  assert.deepEqual(res, { unvalidated: 2, inactive: 2, events: 1 })
  const left = (await query('SELECT id FROM training_users ORDER BY id')).map(r => Number(r.id))
  assert.deepEqual(left, [newPending, active])
  void [oldPending, oldRejected, inactive, neverLoggedOld]
  assert.equal((await query("SELECT * FROM events WHERE type='login'")).length, 1)
})

test('flashcards : seules celles à correction lisible sont listées', { skip }, async () => {
  const u = await user('a@x.dz')
  const readable = await question(1, 'dci_from_brand', null)
  const unreadable = await question(2, 'dci_from_brand', null)
  await attempt(u, [[readable, 0, true]])
  await query('INSERT INTO training_flashcards (user_id, question_id) VALUES ($1, $2), ($1, $3)', [u, readable, unreadable])
  const exam = createExamService({ query })
  const list = await exam.listFlashcards(u)
  assert.deepEqual(list.map(f => f.id), [readable])
  assert.equal(list[0].correct_index, 0)
})
