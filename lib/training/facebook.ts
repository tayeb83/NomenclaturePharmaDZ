/**
 * Facebook Login (OAuth 2.0, flux « code » côté serveur) pour Training.
 *
 * Facebook ne sert QU'À créer une demande d'accès : on récupère l'identifiant
 * et l'e-mail, puis la demande part en `pending`. Il ne connecte jamais
 * directement un utilisateur (pas de prise de contrôle de compte par e-mail
 * Facebook) et ne prouve pas qu'on suit la page : la validation reste manuelle.
 *
 * Module pur : `fetch` est injecté, donc testable sans réseau.
 */
import { normalizeEmail } from './validation.ts'

export type FacebookConfig = { appId: string; appSecret: string; redirectUri: string; graphVersion?: string }

// À vérifier dans le tableau de bord Meta : les versions du Graph API expirent après ~2 ans.
export const DEFAULT_GRAPH_VERSION = 'v23.0'

export function readFacebookConfig(env: Record<string, string | undefined>, appUrl: string): FacebookConfig | null {
  const appId = env.TRAINING_FACEBOOK_APP_ID?.trim()
  const appSecret = env.TRAINING_FACEBOOK_APP_SECRET?.trim()
  if (!appId || !appSecret) return null
  return {
    appId,
    appSecret,
    redirectUri: `${appUrl}/api/training/auth/facebook/callback`,
    graphVersion: env.TRAINING_FACEBOOK_GRAPH_VERSION?.trim() || DEFAULT_GRAPH_VERSION,
  }
}

export function buildAuthUrl(cfg: FacebookConfig, state: string): string {
  const u = new URL(`https://www.facebook.com/${cfg.graphVersion ?? DEFAULT_GRAPH_VERSION}/dialog/oauth`)
  u.searchParams.set('client_id', cfg.appId)
  u.searchParams.set('redirect_uri', cfg.redirectUri)
  u.searchParams.set('state', state)
  u.searchParams.set('response_type', 'code')
  u.searchParams.set('scope', 'public_profile,email')
  return u.toString()
}

export type FacebookProfile = { id: string; email: string }
export type FacebookResult =
  | { ok: true; profile: FacebookProfile }
  | { ok: false; reason: 'exchange' | 'profile' | 'email' }

type FetchLike = (url: string, init?: { signal?: AbortSignal }) => Promise<{ ok: boolean; json(): Promise<any> }>

/**
 * Échange le `code` contre un jeton, puis lit /me?fields=id,email. Le jeton
 * d'accès n'est ni stocké ni journalisé : il sert une fois puis disparaît.
 */
export async function fetchProfile(cfg: FacebookConfig, code: string, doFetch: FetchLike): Promise<FacebookResult> {
  const v = cfg.graphVersion ?? DEFAULT_GRAPH_VERSION
  try {
    const tokenUrl = new URL(`https://graph.facebook.com/${v}/oauth/access_token`)
    tokenUrl.searchParams.set('client_id', cfg.appId)
    tokenUrl.searchParams.set('client_secret', cfg.appSecret)
    tokenUrl.searchParams.set('redirect_uri', cfg.redirectUri)
    tokenUrl.searchParams.set('code', code)
    const tokenRes = await doFetch(tokenUrl.toString(), { signal: AbortSignal.timeout(10000) })
    const tokenJson = await tokenRes.json().catch(() => null)
    if (!tokenRes.ok || typeof tokenJson?.access_token !== 'string') return { ok: false, reason: 'exchange' }

    const meUrl = new URL(`https://graph.facebook.com/${v}/me`)
    meUrl.searchParams.set('fields', 'id,email')
    meUrl.searchParams.set('access_token', tokenJson.access_token)
    const meRes = await doFetch(meUrl.toString(), { signal: AbortSignal.timeout(10000) })
    const me = await meRes.json().catch(() => null)
    if (!meRes.ok || typeof me?.id !== 'string' || !/^\d{1,30}$/.test(me.id)) return { ok: false, reason: 'profile' }

    // Un compte Facebook peut ne pas avoir d'e-mail (inscription par téléphone, permission refusée).
    const email = normalizeEmail(me.email)
    if (!email) return { ok: false, reason: 'email' }
    return { ok: true, profile: { id: me.id, email } }
  } catch {
    return { ok: false, reason: 'exchange' }
  }
}
