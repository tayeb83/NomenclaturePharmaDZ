import { test } from 'node:test'
import assert from 'node:assert/strict'
import { cleanFreeText, escapeHtml, normalizeEmail, parseSignup } from '../../lib/training/validation.ts'
import { allowedHostsFor, csvCell, hashToken, isSameOrigin, newLoginToken, toCsv } from '../../lib/training/security.ts'

test('normalizeEmail : minuscules, trim, refuse le non-conforme', () => {
  assert.equal(normalizeEmail('  Amine.B@Univ-Alger.DZ '), 'amine.b@univ-alger.dz')
  for (const bad of ['', 'abc', 'a@b', 'a b@c.dz', '<x>@y.dz', 'a@@b.dz', 'a..b@c.dz', 'x'.repeat(250) + '@a.dz', null, 42, undefined]) {
    assert.equal(normalizeEmail(bad as any), null, String(bad))
  }
})

test('parseSignup : profil obligatoire, faculté facultative et nettoyée', () => {
  assert.deepEqual(parseSignup({ email: 'a@b.dz', role: 'etudiant', faculte: '  Alger \n 1  ' }),
    { ok: true, value: { email: 'a@b.dz', role: 'etudiant', faculte: 'Alger 1' } })
  assert.deepEqual(parseSignup({ email: 'a@b.dz', role: 'pharmacien' }),
    { ok: true, value: { email: 'a@b.dz', role: 'pharmacien', faculte: null } })
  assert.deepEqual(parseSignup({ email: 'a@b.dz', role: 'admin' }), { ok: false, error: 'role' })
  assert.deepEqual(parseSignup({ email: 'nope', role: 'etudiant' }), { ok: false, error: 'email' })
  assert.deepEqual(parseSignup(null), { ok: false, error: 'email' })
})

test('cleanFreeText borne la longueur et retire les caractères de contrôle', () => {
  assert.equal(cleanFreeText('a'.repeat(500), 120)!.length, 120)
  assert.equal(cleanFreeText('x\u0000y\u001fz', 50), 'x y z')
  assert.equal(cleanFreeText('   ', 50), null)
})

test('escapeHtml neutralise le HTML saisi par un visiteur', () => {
  assert.equal(escapeHtml(`<script>alert("x")</script>&'`), '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;&amp;&#39;')
})

test('jeton de connexion : 32 octets, base64url, haché en SHA-256, jamais égal à son hachage', () => {
  const t = newLoginToken()
  assert.ok(Buffer.from(t, 'base64url').length >= 32)
  assert.match(t, /^[A-Za-z0-9_-]+$/)
  assert.notEqual(newLoginToken(), t)
  assert.match(hashToken(t), /^[0-9a-f]{64}$/)
  assert.notEqual(hashToken(t), t)
  assert.equal(hashToken(t), hashToken(t))
})

test('isSameOrigin : accepte notre site, refuse un autre site ou l’absence d’en-tête', () => {
  const hosts = allowedHostsFor('www.dzair-pharma.net', 'https://www.dzair-pharma.net')
  const h = (o: Record<string, string>) => ({ get: (k: string) => o[k.toLowerCase()] ?? null })
  assert.equal(isSameOrigin(h({ origin: 'https://www.dzair-pharma.net' }), hosts), true)
  assert.equal(isSameOrigin(h({ origin: 'https://dzair-pharma.net' }), hosts), true)
  assert.equal(isSameOrigin(h({ referer: 'https://www.dzair-pharma.net/training' }), hosts), true)
  assert.equal(isSameOrigin(h({ origin: 'https://evil.example' }), hosts), false)
  assert.equal(isSameOrigin(h({ origin: 'https://www.dzair-pharma.net.evil.example' }), hosts), false)
  assert.equal(isSameOrigin(h({ origin: 'null' }), hosts), false)
  assert.equal(isSameOrigin(h({}), hosts), false)
})

test('CSV : guillemets échappés et injection de formule neutralisée', () => {
  assert.equal(csvCell('a"b'), '"a""b"')
  for (const v of ['=HYPERLINK("x")', '+1', '-1', '@SUM(A1)', '\tx']) assert.ok(csvCell(v).startsWith(`"'`), v)
  assert.equal(csvCell(null), '""')
  const csv = toCsv(['a', 'b'], [['x', '=1+1']])
  assert.ok(csv.startsWith('﻿"a","b"\r\n'))
  assert.ok(csv.includes(`"'=1+1"`))
})
