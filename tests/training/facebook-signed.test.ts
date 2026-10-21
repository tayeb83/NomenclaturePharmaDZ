import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildAuthUrl, fetchProfile, readFacebookConfig } from '../../lib/training/facebook.ts'
import { safeEqual, sessionCookieName, sessionCookieOptions, signPayload, verifyPayload } from '../../lib/training/security.ts'

const cfg = readFacebookConfig({ TRAINING_FACEBOOK_APP_ID: '123', TRAINING_FACEBOOK_APP_SECRET: 'shh' }, 'https://site.test')!

test('readFacebookConfig : désactivé sans identifiants', () => {
  assert.equal(readFacebookConfig({}, 'https://site.test'), null)
  assert.equal(readFacebookConfig({ TRAINING_FACEBOOK_APP_ID: '1' }, 'https://site.test'), null)
  assert.equal(cfg.redirectUri, 'https://site.test/api/training/auth/facebook/callback')
})

test('buildAuthUrl : paramètres OAuth, état et portée minimale (public_profile, email)', () => {
  const u = new URL(buildAuthUrl(cfg, 'STATE123'))
  assert.equal(u.host, 'www.facebook.com')
  assert.equal(u.searchParams.get('client_id'), '123')
  assert.equal(u.searchParams.get('state'), 'STATE123')
  assert.equal(u.searchParams.get('response_type'), 'code')
  assert.equal(u.searchParams.get('scope'), 'public_profile,email')
  assert.equal(u.searchParams.get('redirect_uri'), cfg.redirectUri)
  assert.ok(!u.toString().includes('shh'), 'le secret ne doit jamais figurer dans l’URL du navigateur')
})

const fakeFetch = (token: any, me: any, okToken = true, okMe = true) => async (url: string) =>
  url.includes('/oauth/access_token')
    ? { ok: okToken, json: async () => token }
    : { ok: okMe, json: async () => me }

test('fetchProfile : renvoie id + e-mail normalisé', async () => {
  const r = await fetchProfile(cfg, 'CODE', fakeFetch({ access_token: 'tok' }, { id: '987654321', email: ' Foo@Bar.DZ ' }))
  assert.deepEqual(r, { ok: true, profile: { id: '987654321', email: 'foo@bar.dz' } })
})

test('fetchProfile : échec d’échange, profil invalide, e-mail absent', async () => {
  assert.deepEqual(await fetchProfile(cfg, 'C', fakeFetch({ error: 'x' }, {}, false)), { ok: false, reason: 'exchange' })
  assert.deepEqual(await fetchProfile(cfg, 'C', fakeFetch({ access_token: 't' }, { id: 'abc<script>' })), { ok: false, reason: 'profile' })
  assert.deepEqual(await fetchProfile(cfg, 'C', fakeFetch({ access_token: 't' }, { id: '42' })), { ok: false, reason: 'email' })
  assert.deepEqual(await fetchProfile(cfg, 'C', fakeFetch({ access_token: 't' }, { id: '42', email: 'pas-un-email' })), { ok: false, reason: 'email' })
  const boom = async () => { throw new Error('réseau') }
  assert.deepEqual(await fetchProfile(cfg, 'C', boom as any), { ok: false, reason: 'exchange' })
})

test('fetchProfile : le jeton d’accès ne sort que vers graph.facebook.com', async () => {
  const seen: string[] = []
  await fetchProfile(cfg, 'CODE', async (url: string) => {
    seen.push(url)
    return { ok: true, json: async () => (url.includes('access_token?') ? { access_token: 'TOK' } : { id: '1', email: 'a@b.dz' }) }
  })
  assert.ok(seen.every(u => u.startsWith('https://graph.facebook.com/')))
})

test('cookie signé : valide, falsifié, expiré, mauvais secret', () => {
  const v = signPayload({ id: '1', email: 'a@b.dz' }, 'secret', 1000, 5000)
  assert.equal(verifyPayload<{ id: string }>(v, 'secret', 5500)!.id, '1')
  assert.equal(verifyPayload(v, 'secret', 7000), null, 'expiré')
  assert.equal(verifyPayload(v, 'autre', 5500), null, 'mauvais secret')
  const [body, mac] = v.split('.')
  const forged = Buffer.from(JSON.stringify({ id: '999', email: 'x@y.dz', exp: 9e15 })).toString('base64url')
  assert.equal(verifyPayload(`${forged}.${mac}`, 'secret', 5500), null, 'corps modifié')
  assert.equal(verifyPayload(`${body}.${mac}.x`, 'secret', 5500), null)
  assert.equal(verifyPayload(undefined, 'secret'), null)
  assert.equal(verifyPayload('n-importe-quoi', 'secret'), null)
})

test('safeEqual et attributs du cookie de session', () => {
  assert.equal(safeEqual('abc', 'abc'), true)
  assert.equal(safeEqual('abc', 'abd'), false)
  assert.equal(safeEqual('abc', 'abcd'), false)
  assert.equal(sessionCookieName(true), '__Host-tr_session')
  assert.deepEqual(sessionCookieOptions(true, 60), { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 60 })
  assert.equal(sessionCookieOptions(false).secure, false)
})
