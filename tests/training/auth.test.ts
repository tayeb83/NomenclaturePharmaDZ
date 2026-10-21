/**
 * Connexion par lien et sessions, sur PostgreSQL.
 *   TEST_DATABASE_URL=postgresql://... node --test tests/training/
 * Nécessite sql/23 et sql/24 ; les tables training_* y sont vidées.
 */
import { test, before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import pg from 'pg'
import { createTrainingService, type Mail } from '../../lib/training/service.ts'
import { hashToken, LOGIN_TOKEN_TTL_MS, SESSION_TTL_MS } from '../../lib/training/security.ts'

const URL = process.env.TEST_DATABASE_URL
const skip = URL ? false : 'TEST_DATABASE_URL non défini'

let pool: pg.Pool
let sent: Mail[]
let clock: Date

const query = async (sql: string, params?: any[]) => (await pool.query(sql, params)).rows
const svc = () =>
  createTrainingService({
    query,
    sendMail: async m => { sent.push(m); return { success: true } },
    appUrl: () => 'https://exemple.test',
    adminEmails: () => [],
    now: () => clock,
  })

before(() => { if (URL) pool = new pg.Pool({ connectionString: URL }) })
after(async () => { if (pool) { await query('TRUNCATE training_users RESTART IDENTITY CASCADE'); await pool.end() } })
beforeEach(async () => {
  if (!URL) return
  await query('TRUNCATE training_users RESTART IDENTITY CASCADE')
  sent = []
  clock = new Date()
})

const tokenFromMail = (m: Mail) => decodeURIComponent(m.text.match(/token=([^\s]+)/)![1])

/** Crée un utilisateur validé et renvoie le jeton du lien reçu. */
async function approvedUser(email = 'a@b.dz') {
  const s = svc()
  await s.submitRequest({ email, role: 'etudiant', faculte: null })
  await s.setStatus(1, 'approved')
  return tokenFromMail(sent[sent.length - 1])
}

test('le lien de l’e-mail ouvre la page de confirmation, pas l’API', { skip }, async () => {
  await approvedUser()
  assert.match(sent[0].text, /^.*Connexion : https:\/\/exemple\.test\/training\/connexion\?token=/m)
})

test('lien valide : crée une session, met à jour last_login_at, journalise sans jeton', { skip }, async () => {
  const token = await approvedUser()
  const res = await svc().consumeLoginToken(token)
  assert.ok(res)
  assert.equal(res!.user.email, 'a@b.dz')
  const [u] = await query('SELECT last_login_at FROM training_users')
  assert.ok(u.last_login_at)
  assert.equal((await query("SELECT * FROM events WHERE type='login'")).length, 1)
  const [sess] = await query('SELECT * FROM training_sessions')
  assert.equal(sess.token_hash, hashToken(res!.sessionToken))
  assert.ok(!JSON.stringify(await query('SELECT * FROM training_sessions')).includes(res!.sessionToken), 'session jamais stockée en clair')
  assert.equal(new Date(sess.expires_at).getTime() - clock.getTime(), SESSION_TTL_MS)
})

test('usage unique : le même lien réutilisé est refusé', { skip }, async () => {
  const token = await approvedUser()
  assert.ok(await svc().consumeLoginToken(token))
  assert.equal(await svc().consumeLoginToken(token), null)
  assert.equal((await query('SELECT * FROM training_sessions')).length, 1)
})

test('lien expiré (15 min) refusé, valide juste avant', { skip }, async () => {
  const token = await approvedUser()
  const issued = clock
  clock = new Date(issued.getTime() + LOGIN_TOKEN_TTL_MS + 1000)
  assert.equal(await svc().consumeLoginToken(token), null)
  // un autre lien, consommé juste avant l'expiration
  clock = issued
  await svc().resendAccess(1)
  const fresh = tokenFromMail(sent[sent.length - 1])
  clock = new Date(issued.getTime() + LOGIN_TOKEN_TTL_MS - 1000)
  assert.ok(await svc().consumeLoginToken(fresh))
})

test('deux requêtes simultanées avec le même lien : une seule session', { skip }, async () => {
  const token = await approvedUser()
  const results = await Promise.all([svc().consumeLoginToken(token), svc().consumeLoginToken(token), svc().consumeLoginToken(token)])
  assert.equal(results.filter(Boolean).length, 1)
  assert.equal((await query('SELECT * FROM training_sessions')).length, 1)
})

test('jeton inconnu, vide ou trop long : refusé', { skip }, async () => {
  await approvedUser()
  for (const bad of ['', 'x', 'a'.repeat(43), 'a'.repeat(500), null as any, 42 as any]) {
    assert.equal(await svc().consumeLoginToken(bad), null)
  }
})

test('un utilisateur remis en attente ou refusé ne peut pas se connecter avec un lien encore frais', { skip }, async () => {
  const token = await approvedUser()
  // remise en attente directe en base, sans passer par setStatus (qui invaliderait déjà le jeton)
  await query("UPDATE training_users SET status='pending'")
  assert.equal(await svc().consumeLoginToken(token), null)
  assert.equal((await query('SELECT * FROM training_sessions')).length, 0)
})

test('« recevoir un lien » : seul un utilisateur validé reçoit un e-mail, sans différence visible', { skip }, async () => {
  const s = svc()
  await s.submitRequest({ email: 'attente@b.dz', role: 'etudiant', faculte: null })
  await s.submitRequest({ email: 'refuse@b.dz', role: 'etudiant', faculte: null })
  await s.setStatus(2, 'rejected')
  await s.submitRequest({ email: 'ok@b.dz', role: 'etudiant', faculte: null })
  await s.setStatus(3, 'approved')
  sent = []
  const results = [
    await s.requestLoginLink('attente@b.dz'),
    await s.requestLoginLink('refuse@b.dz'),
    await s.requestLoginLink('inconnu@b.dz'),
    await s.requestLoginLink('OK@b.dz'),
  ]
  assert.deepEqual(results, [undefined, undefined, undefined, undefined], 'même valeur de retour dans tous les cas')
  assert.equal(sent.length, 1)
  assert.equal(sent[0].to, 'ok@b.dz')
  assert.equal((await query("SELECT * FROM events WHERE type='login_link_sent'")).length, 1)
})

test('session : valide, expirée, détruite', { skip }, async () => {
  const token = await approvedUser()
  const { sessionToken } = (await svc().consumeLoginToken(token))!
  assert.equal((await svc().getSessionUser(sessionToken))!.email, 'a@b.dz')
  assert.equal(await svc().getSessionUser('inconnue'), null)
  assert.equal(await svc().getSessionUser(undefined), null)
  const later = clock
  clock = new Date(later.getTime() + SESSION_TTL_MS + 1000)
  assert.equal(await svc().getSessionUser(sessionToken), null, 'expirée')
  clock = later
  await svc().destroySession(sessionToken)
  assert.equal(await svc().getSessionUser(sessionToken), null, 'détruite')
})

test('refuser / remettre en attente coupe immédiatement la session', { skip }, async () => {
  const token = await approvedUser()
  const { sessionToken } = (await svc().consumeLoginToken(token))!
  await svc().setStatus(1, 'rejected')
  assert.equal(await svc().getSessionUser(sessionToken), null)
  assert.equal((await query('SELECT * FROM training_sessions')).length, 0)
})

test('une session dont l’utilisateur n’est plus « approved » est refusée même sans suppression', { skip }, async () => {
  const token = await approvedUser()
  const { sessionToken } = (await svc().consumeLoginToken(token))!
  await query("UPDATE training_users SET status='pending'")
  assert.equal(await svc().getSessionUser(sessionToken), null)
})

test('un utilisateur non validé n’obtient jamais de session', { skip }, async () => {
  const s = svc()
  await s.submitRequest({ email: 'p@b.dz', role: 'pharmacien', faculte: null })
  assert.equal(await s.requestLoginLink('p@b.dz'), undefined)
  assert.equal((await query('SELECT * FROM login_tokens')).length, 0)
  assert.equal((await query('SELECT * FROM training_sessions')).length, 0)
})

test('demande Facebook : source facebook, identifiant stocké, doublon d’identifiant sans erreur', { skip }, async () => {
  const s = svc()
  const first = await s.submitRequest({ email: 'fb@b.dz', role: 'etudiant', faculte: null, source: 'facebook', facebookId: '555' })
  assert.equal(first.created, true)
  const [u] = await query('SELECT source, facebook_id, status FROM training_users')
  assert.deepEqual({ source: u.source, facebook_id: u.facebook_id, status: u.status }, { source: 'facebook', facebook_id: '555', status: 'pending' })
  const again = await s.submitRequest({ email: 'autre@b.dz', role: 'etudiant', faculte: null, source: 'facebook', facebookId: '555' })
  assert.equal(again.created, false)
})

test('purgeExpired supprime les jetons et sessions périmés', { skip }, async () => {
  const token = await approvedUser()
  await svc().consumeLoginToken(token)
  await query("UPDATE training_sessions SET expires_at = NOW() - INTERVAL '1 hour'")
  await query("UPDATE login_tokens SET expires_at = NOW() - INTERVAL '3 days'")
  await svc().purgeExpired()
  assert.equal((await query('SELECT * FROM training_sessions')).length, 0)
  assert.equal((await query('SELECT * FROM login_tokens')).length, 0)
})
