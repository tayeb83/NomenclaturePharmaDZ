/**
 * Moteur d'examen sur PostgreSQL.
 *   TEST_DATABASE_URL=postgresql://... npm run test:training
 * Nécessite sql/23, 24 et 25 ; les tables training_* y sont vidées.
 */
import { test, before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import pg from 'pg'
import { createExamService, MOCK_EXAMS, SECONDS_PER_QUESTION } from '../../lib/training/exam.ts'

const URL = process.env.TEST_DATABASE_URL
const skip = URL ? false : 'TEST_DATABASE_URL non défini'

let pool: pg.Pool
let clock: Date
const query = async (sql: string, params?: any[]) => (await pool.query(sql, params)).rows
const exam = () => createExamService({ query, now: () => clock })

const SECRET = 'JUSTIFICATION-SECRETE'
let U1: number
let U2: number

async function addUser(email: string): Promise<number> {
  const r = await query("INSERT INTO training_users (email, role, status, approved_at) VALUES ($1, 'etudiant', 'approved', NOW()) RETURNING id", [email])
  return Number(r[0].id)
}

/** n questions publiées ; la bonne réponse est l'index (i % 5), repérable. */
async function seedQuestions(n: number, status: 'published' | 'draft' = 'published') {
  for (let i = 0; i < n; i++) {
    const opts = [0, 1, 2, 3, 4].map(k => `Option ${k} de la question ${i}`)
    const expl = {
      contexte: `${SECRET} contexte ${i}`,
      rationales: opts.map((_, k) => `${SECRET} justification ${k}`),
      points_cles: [`${SECRET} point`],
      references: [{ label: 'Fiche', url: `/medicament/enregistrement/${i}` }],
    }
    await query(
      `INSERT INTO training_questions (question_key, type, source_table, source_ref, stem, options, correct_index, explanation, content_hash, status, relu_par, relu_at)
       VALUES ($1, 'dci_from_brand', 'enregistrements', $2, $3, $4::jsonb, $5, $6::jsonb, 'h', $7, $8, $9)`,
      [`k${status}${i}`, `enregistrements:${i}`, `Énoncé ${i} ?`, JSON.stringify(opts), i % 5, JSON.stringify(expl), status,
       status === 'draft' ? null : 'relecteur', status === 'draft' ? null : new Date()],
    )
  }
}

before(() => { if (URL) pool = new pg.Pool({ connectionString: URL }) })
after(async () => {
  if (pool) {
    await query('TRUNCATE training_users, training_questions RESTART IDENTITY CASCADE')
    await pool.end()
  }
})
beforeEach(async () => {
  if (!URL) return
  await query('TRUNCATE training_users, training_questions RESTART IDENTITY CASCADE')
  clock = new Date('2026-10-21T10:00:00Z')
  U1 = await addUser('u1@x.dz')
  U2 = await addUser('u2@x.dz')
})

const startExam = async (count = 6, user = U1) => {
  const r = await exam().startAttempt(user, { mode: 'examen', count })
  assert.equal(r.ok, true)
  return (r as { ok: true; id: number }).id
}
const startTutor = async (count = 6, user = U1) => {
  const r = await exam().startAttempt(user, { mode: 'tuteur', count })
  assert.equal(r.ok, true)
  return (r as { ok: true; id: number }).id
}
const correctIndexOf = async (attemptId: number, position: number) =>
  Number((await query('SELECT q.correct_index FROM answers a JOIN training_questions q ON q.id = a.question_id WHERE a.attempt_id=$1 AND a.position=$2', [attemptId, position]))[0].correct_index)

test('démarrage : refuse sans question publiée, ignore les brouillons, valide les paramètres', { skip }, async () => {
  assert.deepEqual(await exam().startAttempt(U1, { mode: 'tuteur', count: 5 }), { ok: false, error: 'no_questions' })
  await seedQuestions(5, 'draft')
  assert.deepEqual(await exam().startAttempt(U1, { mode: 'tuteur', count: 5 }), { ok: false, error: 'no_questions' }, 'les brouillons ne sont jamais servis')
  await seedQuestions(8)
  for (const bad of [{ mode: 'x', count: 5 }, { mode: 'tuteur', count: 0 }, { mode: 'tuteur', count: 101 }, { mode: 'tuteur', count: NaN }, { mode: 'examen', count: 5, examCode: 'nope' }]) {
    assert.deepEqual(await exam().startAttempt(U1, bad as any), { ok: false, error: 'invalid' }, JSON.stringify(bad))
  }
})

test('les questions périmées (stale) ne sont pas servies', { skip }, async () => {
  await seedQuestions(3)
  await query('UPDATE training_questions SET stale = TRUE')
  assert.deepEqual(await exam().startAttempt(U1, { mode: 'tuteur', count: 3 }), { ok: false, error: 'no_questions' })
})

test('démarrage examen : liste figée, une ligne de réponse par question, chrono 72 s / question', { skip }, async () => {
  await seedQuestions(10)
  const id = await startExam(6)
  const [a] = await query('SELECT * FROM attempts WHERE id = $1', [id])
  assert.equal(a.mode, 'examen')
  assert.equal(a.total, 6)
  assert.equal(a.question_ids.length, 6)
  assert.equal(new Set(a.question_ids).size, 6)
  assert.equal(a.time_limit_s, 6 * SECONDS_PER_QUESTION)
  assert.equal((await query('SELECT * FROM answers WHERE attempt_id = $1', [id])).length, 6)
  assert.equal((await query("SELECT * FROM events WHERE type='attempt_started'")).length, 1)
  const tutor = await startTutor(4)
  assert.equal((await query('SELECT time_limit_s FROM attempts WHERE id = $1', [tutor]))[0].time_limit_s, null)
})

test('moins de questions que demandé : on sert ce qui existe', { skip }, async () => {
  await seedQuestions(3)
  const id = await startTutor(50)
  assert.equal((await exam().getOverview(U1, id))!.attempt.total, 3)
})

test('examen blanc : même composition et même ordre pour tout le monde', { skip }, async () => {
  await seedQuestions(12)
  const code = Object.keys(MOCK_EXAMS)[0]
  const a = await exam().startAttempt(U1, { mode: 'tuteur', count: 1, examCode: code })
  const b = await exam().startAttempt(U2, { mode: 'tuteur', count: 1, examCode: code })
  assert.ok(a.ok && b.ok)
  const q = async (id: number) => (await query('SELECT question_ids, mode FROM attempts WHERE id = $1', [id]))[0]
  const [qa, qb] = [await q((a as any).id), await q((b as any).id)]
  assert.deepEqual(qa.question_ids, qb.question_ids)
  assert.equal(qa.mode, 'examen', 'un examen blanc est toujours en mode examen')
  const other = await exam().startAttempt(U1, { mode: 'examen', count: 1, examCode: Object.keys(MOCK_EXAMS)[1] })
  assert.notDeepEqual((await q((other as any).id)).question_ids, qa.question_ids)
})

// ─── SÉCURITÉ : aucune bonne réponse avant la fin en mode examen ───────────────

test('MODE EXAMEN : aucune réponse, explication ni is_correct dans les vues avant la fin', { skip }, async () => {
  await seedQuestions(6)
  const id = await startExam(6)
  const forbidden = ['correct_index', 'is_correct', 'explanation', 'rationales', 'points_cles', 'review', SECRET]

  const outputs: unknown[] = [await exam().getOverview(U1, id), await exam().listAttempts(U1)]
  for (let p = 1; p <= 6; p++) {
    outputs.push(await exam().viewQuestion(U1, id, p))
    outputs.push(await exam().saveAnswer(U1, id, p, { choice: p % 5, struck: [0], marked: p % 2 === 0, timeSpentDelta: 5 }))
    outputs.push(await exam().viewQuestion(U1, id, p)) // relecture après réponse
  }
  for (const out of outputs) {
    const json = JSON.stringify(out)
    for (const f of forbidden) assert.ok(!json.includes(f), `fuite « ${f} » : ${json.slice(0, 200)}`)
  }
  // La base ne contient pas non plus de justesse avant la fin.
  assert.equal((await query('SELECT * FROM answers WHERE attempt_id=$1 AND is_correct IS NOT NULL', [id])).length, 0)
  // Les corrections et flashcards non plus.
  const qid = Number((await query('SELECT question_id FROM answers WHERE attempt_id=$1 AND position=1', [id]))[0].question_id)
  assert.equal(await exam().getCorrection(U1, qid), null)
  assert.equal(await exam().getCorrection(U1, qid, id), null)
  assert.equal(await exam().setFlashcard(U1, qid, true), false)
  assert.equal((await query('SELECT * FROM training_flashcards')).length, 0)
  // Le score n'est pas annoncé
  assert.equal((await exam().getOverview(U1, id))!.attempt.score, null)
  assert.equal(await exam().getResults(U1, id), null)
})

test('MODE EXAMEN : la réponse choisie peut être changée, rayée, marquée, effacée jusqu’à la fin', { skip }, async () => {
  await seedQuestions(5)
  const id = await startExam(5)
  await exam().saveAnswer(U1, id, 1, { choice: 2 })
  await exam().saveAnswer(U1, id, 1, { choice: 4, struck: [0, 1, 1], marked: true })
  let v = await exam().viewQuestion(U1, id, 1)
  assert.deepEqual(v!.answer, { choice: 4, struck: [0, 1], marked: true, locked: false })
  await exam().saveAnswer(U1, id, 1, { choice: null })
  v = await exam().viewQuestion(U1, id, 1)
  assert.equal(v!.answer.choice, null)
  assert.equal((await query("SELECT * FROM events WHERE type='question_answered'")).length, 1, 'un seul événement par question en examen')
  assert.ok(!JSON.stringify(await query("SELECT payload FROM events WHERE type='question_answered'")).includes('correct'))
  const ov = await exam().getOverview(U1, id)
  assert.equal(ov!.items[0].marked, true)
  assert.equal(ov!.items[0].answered, false)
})

test('entrées invalides refusées', { skip }, async () => {
  await seedQuestions(5)
  const id = await startExam(5)
  for (const bad of [{ choice: 5 }, { choice: -1 }, { choice: 1.5 }, { struck: [9] }, { struck: 'a' as any }, { submit: true }]) {
    const r = await exam().saveAnswer(U1, id, 1, bad as any)
    assert.deepEqual(r, { ok: false, error: 'invalid' }, JSON.stringify(bad))
  }
  assert.deepEqual(await exam().saveAnswer(U1, id, 99, { choice: 1 }), { ok: false, error: 'not_found' })
  assert.deepEqual(await exam().saveAnswer(U1, id, 0, { choice: 1 }), { ok: false, error: 'not_found' })
  assert.equal(await exam().viewQuestion(U1, id, 99), null)
  await exam().saveAnswer(U1, id, 1, { timeSpentDelta: 99999 })
  assert.equal(Number((await query('SELECT time_spent_s FROM answers WHERE attempt_id=$1 AND position=1', [id]))[0].time_spent_s), 3600, 'temps borné')
})

test('fin d’examen : score, correction débloquée, clôture idempotente, plus de modification', { skip }, async () => {
  await seedQuestions(5)
  const id = await startExam(5)
  // bonnes réponses sur les positions 1 à 3, mauvaise sur 4, rien sur 5
  for (let p = 1; p <= 3; p++) await exam().saveAnswer(U1, id, p, { choice: await correctIndexOf(id, p) })
  await exam().saveAnswer(U1, id, 4, { choice: (await correctIndexOf(id, 4) + 1) % 5 })
  clock = new Date(clock.getTime() + 100_000)
  const res = await exam().finishAttempt(U1, id)
  assert.deepEqual(res, { score: 3, total: 5 })
  assert.deepEqual(await exam().finishAttempt(U1, id), { score: 3, total: 5 })
  assert.equal((await query("SELECT * FROM events WHERE type='attempt_finished'")).length, 1)
  assert.equal(JSON.parse(JSON.stringify((await query("SELECT payload FROM events WHERE type='attempt_finished'"))[0].payload)).duration_s, 100)

  const results = (await exam().getResults(U1, id))!
  assert.equal(results.attempt.score, 3)
  assert.deepEqual(results.items.map(i => i.is_correct), [true, true, true, false, false])
  const v = (await exam().viewQuestion(U1, id, 4))!
  assert.equal(v.review!.is_correct, false)
  assert.equal(v.review!.correct_index, await correctIndexOf(id, 4))
  assert.ok(v.review!.explanation.contexte.includes(SECRET))
  assert.equal(v.answer.locked, true)
  assert.deepEqual(await exam().saveAnswer(U1, id, 5, { choice: 1 }), { ok: false, error: 'finished' })
  const qid = results.items[0].question_id
  const corr = (await exam().getCorrection(U1, qid))!
  assert.equal(corr.is_correct, true)
  assert.equal(corr.attempt.finished, true)
})

test('chrono serveur : une tentative expirée est clôturée, les réponses tardives refusées', { skip }, async () => {
  await seedQuestions(5)
  const id = await startExam(5)
  await exam().saveAnswer(U1, id, 1, { choice: await correctIndexOf(id, 1) })
  const limit = 5 * SECONDS_PER_QUESTION
  clock = new Date(clock.getTime() + (limit - 10) * 1000)
  assert.equal((await exam().getOverview(U1, id))!.attempt.remaining_s, 10)
  const ok = await exam().saveAnswer(U1, id, 2, { choice: await correctIndexOf(id, 2) })
  assert.equal(ok.ok, true)
  clock = new Date(clock.getTime() + 20 * 1000) // dépassé
  assert.deepEqual(await exam().saveAnswer(U1, id, 3, { choice: await correctIndexOf(id, 3) }), { ok: false, error: 'expired' })
  const ov = (await exam().getOverview(U1, id))!
  assert.equal(ov.attempt.finished, true)
  assert.equal(ov.attempt.score, 2, 'seules les réponses enregistrées dans le temps comptent')
})

test('tentative abandonnée : clôturée à la lecture de la liste après expiration', { skip }, async () => {
  await seedQuestions(5)
  const id = await startExam(5)
  clock = new Date(clock.getTime() + 24 * 3600 * 1000)
  const list = await exam().listAttempts(U1)
  assert.equal(list[0].finished, true)
  assert.equal(list[0].score, 0)
  assert.equal(id, list[0].id)
})

test('MODE TUTEUR : correction immédiate à la validation, réponse ensuite verrouillée', { skip }, async () => {
  await seedQuestions(5)
  const id = await startTutor(5)
  await exam().saveAnswer(U1, id, 1, { choice: 0 })
  let v = (await exam().viewQuestion(U1, id, 1))!
  assert.equal(v.review, undefined, 'pas de correction avant validation')
  const good = await correctIndexOf(id, 1)
  await exam().saveAnswer(U1, id, 1, { choice: good })
  const r = await exam().saveAnswer(U1, id, 1, { submit: true })
  assert.deepEqual(r, { ok: true, remaining_s: null, validated: true })
  v = (await exam().viewQuestion(U1, id, 1))!
  assert.equal(v.review!.is_correct, true)
  assert.equal(v.review!.correct_index, good)
  assert.equal(v.answer.locked, true)
  assert.deepEqual(await exam().saveAnswer(U1, id, 1, { choice: (good + 1) % 5 }), { ok: false, error: 'locked' })
  assert.deepEqual(await exam().saveAnswer(U1, id, 1, { submit: true }), { ok: false, error: 'locked' })
  assert.equal((await exam().saveAnswer(U1, id, 1, { marked: true })).ok, true, 'on peut encore marquer')
  // la question 2 n'est pas corrigée tant qu'elle n'est pas validée
  await exam().saveAnswer(U1, id, 2, { choice: 1 })
  assert.equal((await exam().viewQuestion(U1, id, 2))!.review, undefined)
  const qid2 = Number((await query('SELECT question_id FROM answers WHERE attempt_id=$1 AND position=2', [id]))[0].question_id)
  assert.equal(await exam().getCorrection(U1, qid2), null)
  const qid1 = Number((await query('SELECT question_id FROM answers WHERE attempt_id=$1 AND position=1', [id]))[0].question_id)
  const c1 = (await exam().getCorrection(U1, qid1, id))!
  assert.equal(c1.is_correct, true)
  assert.equal(c1.attempt.finished, false)
  assert.equal(c1.progress.answered, 1)
  assert.equal(c1.progress.correct, 1)
  assert.ok(c1.next_question_id)
  assert.deepEqual((await query("SELECT payload FROM events WHERE type='question_answered'")).map(r => r.payload.correct), [true])
})

test('flashcards : ajout/retrait seulement pour une correction lisible', { skip }, async () => {
  await seedQuestions(5)
  const id = await startTutor(5)
  await exam().saveAnswer(U1, id, 1, { choice: 0 })
  await exam().saveAnswer(U1, id, 1, { submit: true })
  const qid = Number((await query('SELECT question_id FROM answers WHERE attempt_id=$1 AND position=1', [id]))[0].question_id)
  const other = Number((await query('SELECT question_id FROM answers WHERE attempt_id=$1 AND position=2', [id]))[0].question_id)
  assert.equal(await exam().setFlashcard(U1, qid, true), true)
  assert.equal(await exam().setFlashcard(U1, qid, true), true, 'idempotent')
  assert.equal((await query('SELECT * FROM training_flashcards')).length, 1)
  assert.equal((await exam().getCorrection(U1, qid))!.flashcard, true)
  assert.equal(await exam().setFlashcard(U1, other, true), false, 'pas de correction lisible')
  assert.equal(await exam().setFlashcard(U2, qid, true), false, 'autre utilisateur')
  await exam().setFlashcard(U1, qid, false)
  assert.equal((await query('SELECT * FROM training_flashcards')).length, 0)
})

test('ISOLATION : un utilisateur ne peut rien lire ni modifier chez un autre', { skip }, async () => {
  await seedQuestions(5)
  const id = await startTutor(5)
  await exam().saveAnswer(U1, id, 1, { choice: 0 })
  await exam().saveAnswer(U1, id, 1, { submit: true })
  const qid = Number((await query('SELECT question_id FROM answers WHERE attempt_id=$1 AND position=1', [id]))[0].question_id)
  assert.equal(await exam().getOverview(U2, id), null)
  assert.equal(await exam().viewQuestion(U2, id, 1), null)
  assert.deepEqual(await exam().saveAnswer(U2, id, 1, { marked: true }), { ok: false, error: 'not_found' })
  assert.equal(await exam().finishAttempt(U2, id), null)
  assert.equal(await exam().getResults(U2, id), null)
  assert.equal(await exam().getCorrection(U2, qid), null)
  assert.equal(await exam().getCorrection(U2, qid, id), null)
  assert.deepEqual(await exam().listAttempts(U2), [])
  assert.equal((await exam().getOverview(U1, id))!.attempt.finished, false, 'rien n’a été modifié')
})

test('résultats : détail par question avec temps passé', { skip }, async () => {
  await seedQuestions(5)
  const id = await startExam(5)
  await exam().saveAnswer(U1, id, 1, { choice: await correctIndexOf(id, 1), timeSpentDelta: 42 })
  await exam().finishAttempt(U1, id)
  const r = (await exam().getResults(U1, id))!
  assert.equal(r.items[0].time_spent_s, 42)
  assert.equal(r.items[0].is_correct, true)
  assert.equal(r.items.length, 5)
})
