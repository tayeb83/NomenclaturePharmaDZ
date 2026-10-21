/**
 * Dzair-Pharma Training — briques de sécurité sans dépendance applicative :
 * jetons de connexion, contrôle d'origine (CSRF), export CSV sûr.
 */
import crypto from 'node:crypto'

/** Durée de validité d'un lien de connexion. */
export const LOGIN_TOKEN_TTL_MS = 15 * 60 * 1000

/** 32 octets aléatoires (256 bits), encodés base64url : c'est ce qui part par e-mail. */
export function newLoginToken(): string {
  return crypto.randomBytes(32).toString('base64url')
}

/** Seul ce hachage est stocké : une fuite de la base ne permet pas de se connecter. */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

/**
 * Protection CSRF des POST JSON : l'en-tête Origin (à défaut Referer) doit
 * désigner notre propre site. Les navigateurs l'envoient sur tout POST
 * cross-site ; son absence totale n'arrive que pour des clients non
 * navigateurs, qui n'ont de toute façon pas de cookie de session à abuser.
 */
export function isSameOrigin(
  headers: { get(name: string): string | null },
  allowedHosts: string[],
): boolean {
  const source = headers.get('origin') || headers.get('referer')
  if (!source) return false
  let host: string
  try {
    host = new URL(source).host.toLowerCase()
  } catch {
    return false
  }
  return allowedHosts.map(h => h.toLowerCase()).includes(host)
}

/** Hôtes acceptés : celui de la requête et celui de l'URL publique configurée. */
export function allowedHostsFor(requestHost: string | null, appUrl: string | undefined): string[] {
  const hosts: string[] = []
  if (requestHost) hosts.push(requestHost)
  if (appUrl) {
    try {
      const u = new URL(appUrl)
      hosts.push(u.host, u.host.startsWith('www.') ? u.host.slice(4) : `www.${u.host}`)
    } catch {
      /* URL publique invalide : on ne garde que l'hôte de la requête */
    }
  }
  return hosts
}

/**
 * Cellule CSV : guillemets échappés, et neutralisation de l'injection de
 * formule (=, +, -, @, tab, retour chariot en tête) qu'Excel exécuterait à
 * l'ouverture d'un export contenant une valeur saisie par un visiteur.
 */
export function csvCell(value: unknown): string {
  let text = value === null || value === undefined ? '' : String(value)
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`
  return `"${text.replace(/"/g, '""')}"`
}

export function toCsv(header: string[], rows: unknown[][]): string {
  const lines = [header.map(csvCell).join(','), ...rows.map(r => r.map(csvCell).join(','))]
  // BOM : Excel lit correctement l'UTF-8 (accents, arabe).
  return '﻿' + lines.join('\r\n') + '\r\n'
}

// ─── Sessions et cookies signés (phase 3) ───────────────────────────────────

/** Durée d'une session de connexion. */
export const SESSION_TTL_MS = 14 * 24 * 60 * 60 * 1000

/**
 * Nom du cookie de session. En production le préfixe `__Host-` oblige le
 * navigateur à n'accepter le cookie que Secure, sans Domain, sur Path=/ :
 * un sous-domaine ne peut pas l'écraser.
 */
export function sessionCookieName(isProd: boolean): string {
  return isProd ? '__Host-tr_session' : 'tr_session'
}

export function sessionCookieOptions(isProd: boolean, maxAgeSeconds = SESSION_TTL_MS / 1000) {
  return { httpOnly: true, secure: isProd, sameSite: 'lax' as const, path: '/', maxAge: maxAgeSeconds }
}

/** Charge utile signée (HMAC-SHA256) à durée de vie courte : état OAuth, profil Facebook en attente. */
export function signPayload(payload: Record<string, unknown>, secret: string, ttlMs: number, now = Date.now()): string {
  const body = Buffer.from(JSON.stringify({ ...payload, exp: now + ttlMs })).toString('base64url')
  const mac = crypto.createHmac('sha256', secret).update(body).digest('base64url')
  return `${body}.${mac}`
}

export function verifyPayload<T extends Record<string, unknown>>(
  value: string | undefined | null,
  secret: string,
  now = Date.now(),
): (T & { exp: number }) | null {
  if (!value) return null
  const [body, mac, extra] = value.split('.')
  if (!body || !mac || extra !== undefined) return null
  const expected = crypto.createHmac('sha256', secret).update(body).digest('base64url')
  const a = Buffer.from(mac)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null
  try {
    const parsed = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'))
    if (typeof parsed?.exp !== 'number' || parsed.exp < now) return null
    return parsed
  } catch {
    return null
  }
}

/** Comparaison en temps constant de deux chaînes (état OAuth). */
export function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a)
  const y = Buffer.from(b)
  return x.length === y.length && crypto.timingSafeEqual(x, y)
}
