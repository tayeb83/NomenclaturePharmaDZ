/**
 * Tests du service d'accès sur une vraie base PostgreSQL.
 *   TEST_DATABASE_URL=postgresql://... node --test tests/training/
 * La base doit contenir sql/23_training.sql ; les tables training_* y sont vidées.
 */
import { test, before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import pg from 'pg'
import { createTrainingService, type Mail } from '../../lib/training/service.ts'
import { hashToken } from '../../lib/training/security.ts'

const URL = process.env.TEST_DATABASE_URL
const skip = URL ? false : 'TEST_DATABASE_URL non défini'

let pool: pg.Pool
let sent: Mail[]
let failMail = false
let clock = new Date('2026-10-21T10:00:00Z')

const query = async (sql: string, params?: any[]) => (await pool.query(sql, params)).rows
const svc = () =>
  createTrainingService({
    query,
    sendMail: async m => {
      if (failMail) throw new Error('smtp down')
      sent.push(m)
      return { success: true }
    },
    appUrl: () => 'https://exemple.test',
    adminEmails: () => ['admin@exemple.test'],
    now: () => clock,
  })

before(() => { if (URL) pool = new pg.Pool({ connectionString: URL }) })
after(async () => { if (pool) { await query('TRUNCATE training_users RESTART IDENTITY CASCADE'); await pool.end() } })
beforeEach(async () => {
  if (!URL) return
  await query('TRUNCATE training_users RESTART IDENTITY CASCADE')
  sent = []
  failMail = false
})

const req = (email: string, extra: Record<string, unknown> = {}) => ({ email, role: 'etudiant' as const, faculte: null, ...extra })

test('une demande crée un utilisateur pending, un événement, et notifie l’admin une fois', { skip }, async () => {
  const r = await svc().submitRequest(req('a@b.dz', { faculte: '<b>Alger</b>' }))
  assert.equal(r.created, true)
  const [u] = await query('SELECT * FROM training_users')
  assert.equal(u.status, 'pending')
  assert.equal(u.source, 'email')
  assert.equal((await query("SELECT * FROM events WHERE type='signup_requested'")).length, 1)
  assert.equal(sent.length, 1)
  assert.equal(sent[0].to, 'admin@exemple.test')
  assert.ok(!sent[0].html.includes('<b>Alger</b>'), 'la faculté saisie doit être échappée')
  assert.ok(sent[0].html.includes('&lt;b&gt;Alger&lt;/b&gt;'))
})

test('une adresse déjà connue (casse différente) ne crée rien et ne notifie pas', { skip }, async () => {
  await svc().submitRequest(req('a@b.dz'))
  const again = await svc().submitRequest(req('A@B.DZ'))
  assert.equal(again.created, false)
  assert.equal((await query('SELECT * FROM training_users')).length, 1)
  assert.equal(sent.length, 1)
})

test('une panne d’e-mail admin n’empêche pas d’enregistrer la demande', { skip }, async () => {
  failMail = true
  const r = await svc().submitRequest(req('a@b.dz'))
  assert.equal(r.created, true)
  assert.equal((await query('SELECT * FROM training_users')).length, 1)
})

test('valider : lien à usage unique, jeton haché en base, expiration 15 minutes', { skip }, async () => {
  await svc().submitRequest(req('a@b.dz'))
  sent = []
  const res = await svc().setStatus(1, 'approved')
  assert.equal(res!.user.status, 'approved')
  assert.ok(res!.user.approved_at)
  assert.equal(res!.mailSent, true)
  assert.equal(sent.length, 1)
  assert.equal(sent[0].to, 'a@b.dz')

  const token = decodeURIComponent(sent[0].text.match(/token=([^\s]+)/)![1])
  assert.ok(Buffer.from(token, 'base64url').length >= 32)
  const rows = await query('SELECT * FROM login_tokens')
  assert.equal(rows.length, 1)
  assert.equal(rows[0].token_hash, hashToken(token))
  assert.ok(!JSON.stringify(rows).includes(token), 'le jeton en clair ne doit jamais être stocké')
  assert.equal(rows[0].used_at, null)
  assert.equal(new Date(rows[0].expires_at).getTime() - clock.getTime(), 15 * 60 * 1000)
  assert.equal((await query("SELECT * FROM events WHERE type='approved'")).length, 1)
  assert.ok(!JSON.stringify(await query('SELECT payload FROM events')).includes(token))
})

test('valider deux fois n’envoie pas deux liens', { skip }, async () => {
  await svc().submitRequest(req('a@b.dz'))
  sent = []
  await svc().setStatus(1, 'approved')
  const second = await svc().setStatus(1, 'approved')
  assert.equal(second!.mailSent, null)
  assert.equal(sent.length, 1)
})

test('e-mail d’accès en échec : l’utilisateur reste validé, mailSent=false, renvoi possible', { skip }, async () => {
  await svc().submitRequest(req('a@b.dz'))
  failMail = true
  const res = await svc().setStatus(1, 'approved')
  assert.equal(res!.user.status, 'approved')
  assert.equal(res!.mailSent, false)
  failMail = false
  sent = []
  const again = await svc().resendAccess(1)
  assert.equal(again!.mailSent, true)
  assert.equal(sent.length, 1)
})

test('refuser ou remettre en attente invalide les liens encore actifs', { skip }, async () => {
  await svc().submitRequest(req('a@b.dz'))
  await svc().setStatus(1, 'approved')
  await svc().setStatus(1, 'rejected')
  const [t] = await query('SELECT expires_at FROM login_tokens')
  assert.ok(new Date(t.expires_at).getTime() <= Date.now())
  assert.equal(await svc().resendAccess(1), null, 'pas de renvoi pour un utilisateur refusé')
  const back = await svc().setStatus(1, 'pending')
  assert.equal(back!.user.status, 'pending')
  assert.equal(back!.user.approved_at, null)
})

test('setStatus sur un id inconnu renvoie null', { skip }, async () => {
  assert.equal(await svc().setStatus(999, 'approved'), null)
})

test('compteurs, filtre par statut et recherche (les jokers LIKE sont littéraux)', { skip }, async () => {
  const s = svc()
  await s.submitRequest(req('alice@x.dz', { faculte: 'Alger' }))
  await s.submitRequest(req('bob@x.dz', { faculte: '100% pharma' }))
  await s.submitRequest(req('carl@x.dz'))
  await s.setStatus(2, 'approved')
  await s.setStatus(3, 'rejected')
  assert.deepEqual(await s.counts(), { pending: 1, approved: 1, rejected: 1 })
  assert.deepEqual((await s.listRequests({ status: 'pending' })).map(r => r.email), ['alice@x.dz'])
  assert.deepEqual((await s.listRequests({ q: 'alg' })).map(r => r.email), ['alice@x.dz'])
  assert.deepEqual((await s.listRequests({ q: '100%' })).map(r => r.email), ['bob@x.dz'])
  assert.equal((await s.listRequests({ q: '%' })).length, 1, '« % » ne doit pas tout renvoyer')
  assert.equal((await s.listRequests({ q: '_' })).length, 0)
})

test('export CSV : en-têtes, lignes, formules neutralisées', { skip }, async () => {
  await svc().submitRequest(req('a@b.dz', { faculte: '=CMD()' }))
  const csv = await svc().exportRequestsCsv()
  assert.ok(csv.includes('"email"'))
  assert.ok(csv.includes('"a@b.dz"'))
  assert.ok(csv.includes(`"'=CMD()"`))
})

test('la base refuse deux comptes de même e-mail à la casse près', { skip }, async () => {
  await query("INSERT INTO training_users (email, role) VALUES ('x@y.dz', 'etudiant')")
  await assert.rejects(query("INSERT INTO training_users (email, role) VALUES ('X@Y.DZ', 'etudiant')"), /uq_training_users_email/)
})
