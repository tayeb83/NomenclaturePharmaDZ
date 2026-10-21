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
