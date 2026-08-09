/**
 * DwaDZ — Module de publication réseaux sociaux & newsletter
 */

import axios from 'axios'
import nodemailer from 'nodemailer'
import { query as dbQuery } from './db'

// ─── GMAIL SMTP ───────────────────────────────────────────────

function getGmailTransporter() {
  const user = process.env.GMAIL_USER
  const pass = process.env.GMAIL_APP_PASSWORD
  if (!user || !pass) return null
  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
  })
}

/**
 * Envoie un email individuel via Gmail SMTP (nodemailer).
 * Utilise GMAIL_USER + GMAIL_APP_PASSWORD (mot de passe d'application Google).
 */
export async function sendEmailViaGmail(
  to: string,
  subject: string,
  htmlContent: string,
  toName?: string
): Promise<{ success: boolean; error?: string }> {
  const transporter = getGmailTransporter()
  if (!transporter) return { success: false, error: 'Gmail non configuré (GMAIL_USER / GMAIL_APP_PASSWORD manquants)' }

  const from = process.env.GMAIL_USER!
  const senderName = process.env.BREVO_SENDER_NAME || 'DwaDZ'

  try {
    await transporter.sendMail({
      from: `"${senderName}" <${from}>`,
      to: toName ? `"${toName}" <${to}>` : to,
      subject,
      html: htmlContent,
    })
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

/**
 * Envoie la newsletter à tous les abonnés confirmés via Gmail.
 * Récupère la liste en base et envoie un email individuel à chacun.
 */
export async function sendNewsletterViaGmail(
  subject: string,
  htmlContent: string
): Promise<{ success: boolean; sent: number; failed: number; error?: string }> {
  const transporter = getGmailTransporter()
  if (!transporter) {
    return { success: false, sent: 0, failed: 0, error: 'Gmail non configuré (GMAIL_USER / GMAIL_APP_PASSWORD manquants)' }
  }

  const subscribers = await dbQuery<{ email: string; nom: string | null; unsubscribe_token: string }>(`
    SELECT email, nom, unsubscribe_token FROM newsletter_subscribers WHERE confirmed = true
  `)

  if (!subscribers.length) {
    return { success: true, sent: 0, failed: 0 }
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://www.dzair-pharma.net'
  const senderName = process.env.BREVO_SENDER_NAME || 'DwaDZ'
  const from = process.env.GMAIL_USER!

  let sent = 0
  let failed = 0

  for (const sub of subscribers) {
    const unsubLink = `${appUrl}/api/newsletter?action=unsubscribe&token=${sub.unsubscribe_token}`
    const personalizedHtml = htmlContent.replace(
      /\{\{unsubscribe_token\}\}/g,
      sub.unsubscribe_token
    ).replace(
      /<\/body>/i,
      `<div style="text-align:center;padding:12px;font-size:11px;color:#94a3b8;">
        <a href="${unsubLink}" style="color:#94a3b8;">Se désabonner</a>
      </div></body>`
    )

    try {
      await transporter.sendMail({
        from: `"${senderName}" <${from}>`,
        to: sub.nom ? `"${sub.nom}" <${sub.email}>` : sub.email,
        subject,
        html: personalizedHtml,
      })
      sent++
    } catch {
      failed++
    }
  }

  return { success: true, sent, failed }
}

// ─── FORMATAGE DES MESSAGES ───────────────────────────────────
export function formatRetrait(drug: { dci: string; nom_marque: string; dosage?: string | null; labo?: string | null; motif_retrait?: string | null }) {
  const emoji = getMotifEmoji(drug.motif_retrait)
  return {
    short: `🚨 RETRAIT | ${drug.nom_marque}® (${drug.dci}${drug.dosage ? ' ' + drug.dosage : ''})\n${emoji} ${drug.motif_retrait || 'Motif non précisé'}\n\n⚠️ Ce produit n'est plus autorisé sur le marché algérien.\n\n🔗 pharmaveille-dz.com\n#Pharmacie #Algérie #Retrait #Médicament`,
    facebook: `🚨 ALERTE RETRAIT — Marché Pharmaceutique Algérien\n\n📋 Médicament : ${drug.nom_marque}® \n🧪 DCI : ${drug.dci}${drug.dosage ? '\n💊 Dosage : ' + drug.dosage : ''}${drug.labo ? '\n🏭 Laboratoire : ' + drug.labo : ''}\n\n${emoji} Motif du retrait : ${drug.motif_retrait || 'Non précisé'}\n\n⚠️ Chers pharmaciens, ce produit ne doit plus être délivré. Consultez la liste complète des retraits sur notre site.\n\n🔗 www.pharmaveille-dz.com/alertes\n\n#DwaDZ #Pharmacie #Algérie #RetiraitMédicament #MIPH`,
    newsletter_subject: `🚨 ALERTE : Retrait du ${drug.nom_marque}® du marché algérien`,
    newsletter_html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 2px solid #dc2626; border-radius: 8px;">
        <div style="background: #dc2626; color: white; padding: 16px; border-radius: 6px 6px 0 0; text-align: center;">
          <h1 style="margin:0; font-size:20px;">🚨 ALERTE RETRAIT MÉDICAMENT</h1>
        </div>
        <div style="padding: 20px;">
          <table style="width:100%; border-collapse: collapse; margin-bottom: 20px;">
            <tr><td style="padding: 8px; font-weight:bold; color:#666; width:40%;">Nom de marque</td><td style="padding:8px;"><strong style="font-size:18px;">${drug.nom_marque}®</strong></td></tr>
            <tr style="background:#f9f9f9;"><td style="padding:8px; font-weight:bold; color:#666;">DCI</td><td style="padding:8px;">${drug.dci}</td></tr>
            ${drug.dosage ? `<tr><td style="padding:8px; font-weight:bold; color:#666;">Dosage</td><td style="padding:8px;">${drug.dosage}</td></tr>` : ''}
            ${drug.labo ? `<tr style="background:#f9f9f9;"><td style="padding:8px; font-weight:bold; color:#666;">Laboratoire</td><td style="padding:8px;">${drug.labo}</td></tr>` : ''}
            <tr><td style="padding:8px; font-weight:bold; color:#666;">Motif</td><td style="padding:8px; color:#dc2626; font-weight:bold;">${drug.motif_retrait || 'Non précisé'}</td></tr>
          </table>
          <div style="background:#fef2f2; padding:12px; border-radius:6px; color:#991b1b; font-weight:bold; text-align:center;">
            ⚠️ Ce produit ne doit plus être délivré aux patients
          </div>
          <div style="margin-top:20px; text-align:center;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/alertes" style="background:#0284c7; color:white; padding:12px 24px; border-radius:6px; text-decoration:none; font-weight:bold;">
              Voir toutes les alertes →
            </a>
          </div>
        </div>
        <div style="padding:16px; background:#f1f5f9; text-align:center; font-size:12px; color:#94a3b8; border-radius:0 0 6px 6px;">
          DwaDZ — Données officielles MIPH Algérie<br>
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/unsubscribe?token={{unsubscribe_token}}" style="color:#94a3b8;">Se désabonner</a>
        </div>
      </div>
    `
  }
}

export function formatNouveaute(drug: { dci: string; nom_marque: string; dosage?: string | null; labo?: string | null; pays?: string | null; type_prod?: string | null; annee?: number | null }) {
  const typeLabel = { GE: 'Générique', RE: 'Référence', BIO: 'Biologique', I: 'Innovateur' }[drug.type_prod || ''] || drug.type_prod
  return {
    short: `✅ NOUVEAU | ${drug.nom_marque}® enregistré en ${drug.annee}\n🧪 ${drug.dci}${drug.dosage ? ' ' + drug.dosage : ''}\n🏭 ${drug.labo} (${drug.pays})\n📋 ${typeLabel}\n\n🔗 pharmaveille-dz.com/veille\n#DwaDZ #Algérie #NouveauMédicament`,
    facebook: `✅ NOUVEL ENREGISTREMENT — ${drug.annee}\n\n📋 Nom : ${drug.nom_marque}®\n🧪 DCI : ${drug.dci}${drug.dosage ? '\n💊 Dosage : ' + drug.dosage : ''}\n🏭 Laboratoire : ${drug.labo}${drug.pays ? ' (' + drug.pays + ')' : ''}\n📊 Type : ${typeLabel}\n\nCe médicament vient d'obtenir son enregistrement sur le marché pharmaceutique algérien.\n\n🔗 www.pharmaveille-dz.com/veille\n#DwaDZ #Pharmacie #Algérie #NouveauMédicament #MIPH`,
  }
}

function getMotifEmoji(motif: string | null | undefined) {
  if (!motif) return '⚠️'
  if (motif.includes('INTERDICTION')) return '🚫'
  if (motif.includes('COMMERCIAL')) return '💼'
  if (motif.includes('PAYS D\'ORIGINE')) return '🌍'
  if (motif.includes('COOPÉRATION')) return '🤝'
  return '⚠️'
}

// ─── PUBLICATION FACEBOOK ─────────────────────────────────────

// Surchargeable pour les tests et les montées de version de l'API Graph.
const FACEBOOK_GRAPH_BASE = process.env.FACEBOOK_GRAPH_API_BASE || 'https://graph.facebook.com/v18.0'

/**
 * Traduit en clair les erreurs Graph les plus fréquentes, pour que l'admin
 * sache quoi corriger sans aller lire la doc Meta.
 *
 * En particulier « Cannot call API for app X on behalf of user Y » : le
 * jeton fourni est un jeton **utilisateur** (ou un jeton de Page émis pour
 * un utilisateur qui n'a plus autorisé l'application). Publier sur une Page
 * exige un *Page Access Token* portant pages_manage_posts.
 */
export function facebookErrorHint(message?: string | null): string | undefined {
  if (!message) return undefined
  const m = message.toLowerCase()
  if (m.includes('on behalf of user')) {
    return "FACEBOOK_PAGE_ACCESS_TOKEN semble être un jeton *utilisateur*, pas un jeton de Page — ou l'utilisateur qui l'a émis n'autorise plus l'application. Reconnectez la Page dans les Outils Graph API (autorisations pages_show_list, pages_manage_posts, pages_read_engagement), puis reprenez le jeton de la Page (champ access_token de /me/accounts)."
  }
  if (m.includes('session has expired') || m.includes('session is invalid') || m.includes('expired')) {
    return 'Le jeton a expiré. Générez un jeton de Page longue durée (échange du jeton utilisateur longue durée via /oauth/access_token, puis /me/accounts).'
  }
  if (m.includes('permission') || m.includes('(#200)') || m.includes('(#10)')) {
    return "Autorisation manquante : la Page doit accorder pages_manage_posts (et pages_read_engagement) à l'application."
  }
  if (m.includes('unsupported get request') || m.includes('does not exist')) {
    return "FACEBOOK_PAGE_ID est introuvable avec ce jeton — vérifiez l'identifiant de la Page et que le jeton appartient bien à cette Page."
  }
  return undefined
}

function withHint(error?: string): string | undefined {
  if (!error) return error
  const hint = facebookErrorHint(error)
  return hint ? `${error} — ${hint}` : error
}

/**
 * Jeton effectivement utilisé pour publier. Si la variable
 * FACEBOOK_PAGE_ACCESS_TOKEN contient un jeton utilisateur (cause n°1 de
 * l'erreur « Cannot call API for app … on behalf of user … »), on demande à
 * Graph le jeton de la Page correspondante et on publie avec celui-là.
 * Mis en cache par instance : une requête toutes les 30 min au plus.
 */
const PAGE_TOKEN_TTL_MS = 30 * 60 * 1000
const globalForFbToken = globalThis as unknown as {
  _fbPageToken?: { token: string; source: 'page' | 'configured'; at: number; attempts: TokenAttempt[] }
}

/** Trace d'une tentative de dérivation, affichée par le diagnostic admin. */
export type TokenAttempt = { path: string; ok: boolean; error?: string }

export type ResolvedPageToken = {
  token?: string
  pageId?: string
  source?: 'page' | 'configured'
  error?: string
  attempts: TokenAttempt[]
}

export async function resolvePageAccessToken(force = false): Promise<ResolvedPageToken> {
  const configured = process.env.FACEBOOK_PAGE_ACCESS_TOKEN
  const pageId = process.env.FACEBOOK_PAGE_ID
  if (!configured || !pageId) return { error: 'Facebook credentials manquants', attempts: [] }

  const cached = globalForFbToken._fbPageToken
  if (!force && cached && Date.now() - cached.at < PAGE_TOKEN_TTL_MS) {
    return { token: cached.token, pageId, source: cached.source, attempts: cached.attempts }
  }

  let resolved: { token: string; source: 'page' | 'configured' } = { token: configured, source: 'configured' }
  const attempts: TokenAttempt[] = []

  // 1. Le plus direct : le jeton de la Page est un champ de la Page.
  try {
    const res = await axios.get(`${FACEBOOK_GRAPH_BASE}/${pageId}`, {
      params: { fields: 'access_token', access_token: configured },
      timeout: 10000,
    })
    if (typeof res.data?.access_token === 'string' && res.data.access_token) {
      resolved = { token: res.data.access_token, source: 'page' }
      attempts.push({ path: `GET /${pageId}?fields=access_token`, ok: true })
    } else {
      attempts.push({ path: `GET /${pageId}?fields=access_token`, ok: false, error: 'champ access_token absent de la réponse' })
    }
  } catch (err: any) {
    attempts.push({
      path: `GET /${pageId}?fields=access_token`,
      ok: false,
      error: err.response?.data?.error?.message || err.message,
    })
  }

  // 2. Repli : la liste des Pages du compte porte aussi leurs jetons.
  if (resolved.source !== 'page') {
    try {
      const res = await axios.get(`${FACEBOOK_GRAPH_BASE}/me/accounts`, {
        params: { fields: 'id,name,access_token', access_token: configured },
        timeout: 10000,
      })
      const page = (res.data?.data || []).find((p: any) => String(p.id) === String(pageId))
      if (page?.access_token) {
        resolved = { token: page.access_token, source: 'page' }
        attempts.push({ path: 'GET /me/accounts', ok: true })
      } else {
        attempts.push({
          path: 'GET /me/accounts',
          ok: false,
          error: (res.data?.data || []).length
            ? `la Page ${pageId} n'est pas dans la liste des Pages de ce compte`
            : 'aucune Page accessible avec ce jeton',
        })
      }
    } catch (err: any) {
      attempts.push({ path: 'GET /me/accounts', ok: false, error: err.response?.data?.error?.message || err.message })
    }
  }

  if (resolved.source !== 'page') {
    // Aucune dérivation possible : on publie avec le jeton configuré et on
    // laisse l'erreur de publication (et le diagnostic) parler.
    console.warn('[social] Jeton de Page non résolu:', attempts.map(a => `${a.path} → ${a.error}`).join(' | '))
  }

  globalForFbToken._fbPageToken = { ...resolved, at: Date.now(), attempts }
  return { token: resolved.token, pageId, source: resolved.source, attempts }
}

export async function postToFacebook(message: string): Promise<{ success: boolean; postId?: string; error?: string }> {
  const { token, pageId, error } = await resolvePageAccessToken()
  if (!token || !pageId) return { success: false, error: error || 'Facebook credentials manquants' }

  try {
    const res = await axios.post(
      `${FACEBOOK_GRAPH_BASE}/${pageId}/feed`,
      { message, access_token: token }
    )
    return { success: true, postId: res.data.id }
  } catch (err: any) {
    return { success: false, error: withHint(err.response?.data?.error?.message || err.message) }
  }
}

/**
 * Publie une photo sur la Page Facebook (upload multipart direct — pas
 * d'URL publique à faire récupérer par le crawler Meta, que notre
 * middleware anti-bot bloque). La légende accompagne la photo.
 */
export async function postFacebookPhoto(image: Buffer, caption: string): Promise<{ success: boolean; postId?: string; error?: string }> {
  const { token, pageId, error: tokenError } = await resolvePageAccessToken()
  if (!token || !pageId) return { success: false, error: tokenError || 'Facebook credentials manquants' }

  try {
    const form = new FormData()
    form.append('source', new Blob([new Uint8Array(image)], { type: 'image/png' }), 'garde.png')
    form.append('caption', caption)
    form.append('access_token', token)

    const res = await fetch(`${FACEBOOK_GRAPH_BASE}/${pageId}/photos`, {
      method: 'POST',
      body: form,
    })
    const data: any = await res.json().catch(() => ({}))
    if (!res.ok) {
      return { success: false, error: withHint(data?.error?.message || `HTTP ${res.status}`) }
    }
    return { success: true, postId: data.post_id || data.id }
  } catch (err: any) {
    return { success: false, error: withHint(err.message) }
  }
}

// ─── DIAGNOSTIC FACEBOOK ──────────────────────────────────────

export type FacebookDiagnostic = {
  configured: { pageId: boolean; token: boolean; appId: boolean; appSecret: boolean }
  tokenType?: string
  tokenAppId?: string
  tokenAppName?: string
  tokenUserId?: string
  expiresAt?: string | null
  scopes?: string[]
  missingScopes?: string[]
  page?: { id: string; name?: string; canPost: boolean }
  usedTokenSource?: 'page' | 'configured'
  /** Tentatives de dérivation du jeton de Page, avec leur erreur éventuelle. */
  tokenAttempts?: TokenAttempt[]
  /** Ce que le jeton configuré arrive à faire : identité et Pages visibles. */
  identity?: { id?: string; name?: string; error?: string }
  visiblePages?: { id: string; name?: string }[]
  ok: boolean
  problems: string[]
  hints: string[]
}

const REQUIRED_SCOPES = ['pages_manage_posts', 'pages_read_engagement']

/**
 * Vérifie la configuration Facebook sans rien publier : type de jeton,
 * application émettrice, autorisations, expiration, accès à la Page.
 * Utilisé par l'écran admin pour diagnostiquer les échecs de partage.
 */
export async function diagnoseFacebook(): Promise<FacebookDiagnostic> {
  const pageId = process.env.FACEBOOK_PAGE_ID
  const configuredToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN
  const appId = process.env.FACEBOOK_APP_ID
  const appSecret = process.env.FACEBOOK_APP_SECRET

  const diag: FacebookDiagnostic = {
    configured: { pageId: !!pageId, token: !!configuredToken, appId: !!appId, appSecret: !!appSecret },
    ok: false,
    problems: [],
    hints: [],
  }

  if (!pageId) diag.problems.push('FACEBOOK_PAGE_ID non défini')
  if (!configuredToken) diag.problems.push('FACEBOOK_PAGE_ACCESS_TOKEN non défini')
  if (!pageId || !configuredToken) return diag

  // 1. Nature du jeton configuré (nécessite l'app id + secret pour debug_token)
  if (appId && appSecret) {
    try {
      const res = await axios.get(`${FACEBOOK_GRAPH_BASE}/debug_token`, {
        params: { input_token: configuredToken, access_token: `${appId}|${appSecret}` },
        timeout: 10000,
      })
      const d = res.data?.data || {}
      diag.tokenType = d.type
      diag.tokenAppId = d.app_id
      diag.tokenAppName = d.application
      diag.tokenUserId = d.user_id
      diag.scopes = d.scopes || []
      diag.expiresAt = d.expires_at ? new Date(d.expires_at * 1000).toISOString() : null
      diag.missingScopes = REQUIRED_SCOPES.filter((s) => !(d.scopes || []).includes(s))

      if (d.is_valid === false) diag.problems.push('Jeton invalide ou révoqué')
      if (diag.missingScopes.length) {
        diag.problems.push(`Autorisations manquantes : ${diag.missingScopes.join(', ')}`)
      }
      if (d.expires_at && d.expires_at * 1000 < Date.now()) {
        diag.problems.push('Jeton expiré')
      }
    } catch (err: any) {
      diag.problems.push(`debug_token : ${err.response?.data?.error?.message || err.message}`)
    }
  } else {
    diag.hints.push("Définissez FACEBOOK_APP_ID et FACEBOOK_APP_SECRET pour un diagnostic complet du jeton (type, autorisations, expiration).")
  }

  // 2. Ce que le jeton sait faire par lui-même : sans app id/secret, c'est
  // la seule façon de distinguer « jeton révoqué » de « Page inaccessible ».
  try {
    const me = await axios.get(`${FACEBOOK_GRAPH_BASE}/me`, {
      params: { fields: 'id,name', access_token: configuredToken },
      timeout: 10000,
    })
    diag.identity = { id: me.data?.id, name: me.data?.name }
  } catch (err: any) {
    // Informatif à ce stade : seul l'accès effectif à la Page (ci-dessous)
    // décide si la publication est possible.
    diag.identity = { error: err.response?.data?.error?.message || err.message }
  }

  try {
    const pages = await axios.get(`${FACEBOOK_GRAPH_BASE}/me/accounts`, {
      params: { fields: 'id,name', access_token: configuredToken },
      timeout: 10000,
    })
    diag.visiblePages = (pages.data?.data || []).map((p: any) => ({ id: String(p.id), name: p.name }))
    if (diag.visiblePages?.length && !diag.visiblePages.some((p) => p.id === String(pageId))) {
      diag.problems.push(
        `La Page ${pageId} n'apparaît pas parmi les Pages accessibles avec ce jeton (${diag.visiblePages.map((p) => `${p.name} — ${p.id}`).join(', ')}). Vérifiez FACEBOOK_PAGE_ID.`
      )
    }
  } catch {
    // Sans pages_show_list la liste est inaccessible : ce n'est pas
    // bloquant en soi, les tentatives de dérivation ci-dessous le diront.
  }

  // 3. Accès effectif à la Page (et récupération du jeton de Page)
  const resolved = await resolvePageAccessToken(true)
  diag.usedTokenSource = resolved.source
  diag.tokenAttempts = resolved.attempts
  try {
    const res = await axios.get(`${FACEBOOK_GRAPH_BASE}/${pageId}`, {
      params: { fields: 'id,name,tasks', access_token: resolved.token },
      timeout: 10000,
    })
    const tasks: string[] = res.data?.tasks || []
    diag.page = {
      id: res.data?.id || pageId,
      name: res.data?.name,
      // `tasks` n'est renvoyé qu'avec un jeton utilisateur ; avec un jeton de
      // Page l'absence de la liste n'est pas un signe d'échec.
      canPost: tasks.length ? tasks.includes('CREATE_CONTENT') : true,
    }
    if (tasks.length && !tasks.includes('CREATE_CONTENT')) {
      diag.problems.push("Le compte lié n'a pas le rôle permettant de publier sur la Page (CREATE_CONTENT).")
    }
  } catch (err: any) {
    const message = err.response?.data?.error?.message || err.message
    diag.problems.push(`Accès à la Page : ${message}`)
    const hint = facebookErrorHint(message)
    if (hint) diag.hints.push(hint)
    // La Page est injoignable : si le jeton n'est déjà reconnu par aucun
    // compte, c'est lui qui est en cause, pas l'identifiant de la Page.
    if (diag.identity?.error) {
      diag.problems.push(`Le jeton n'est reconnu par aucun compte : ${diag.identity.error}`)
    }
  }

  // Un jeton utilisateur ne bloque pas la publication tant que le jeton de
  // la Page en est dérivé (c'est ce que fait resolvePageAccessToken) — ce
  // n'est un problème que si la dérivation échoue.
  if (resolved.source === 'page') {
    if (diag.tokenType && diag.tokenType !== 'PAGE') {
      diag.hints.push(`Le jeton configuré est de type ${diag.tokenType} : le jeton de la Page en est dérivé automatiquement avant chaque publication. Pour éviter tout aléa, vous pouvez enregistrer directement le jeton de Page (champ access_token renvoyé par /me/accounts).`)
    }
  } else if (diag.tokenType !== 'PAGE') {
    // Ni jeton de Page confirmé, ni dérivation possible : c'est le cas qui
    // produit « Cannot call API for app … on behalf of user … ».
    const detail = (resolved.attempts || []).filter(a => !a.ok).map(a => `${a.path} → ${a.error}`).join(' ; ')
    diag.problems.push(`Jeton de Page non dérivable${detail ? ` (${detail})` : ''}.`)
    diag.hints.push(
      "Marche à suivre : 1) ouvrez developers.facebook.com/tools/explorer, sélectionnez l'application et la Page ; " +
      '2) demandez pages_show_list, pages_manage_posts et pages_read_engagement, puis « Generate Access Token » et acceptez la Page ; ' +
      "3) vérifiez dans facebook.com/settings?tab=business_tools que l'application n'a pas été retirée ; " +
      "4) si l'application est en mode Développement, le compte doit y avoir un rôle (Administrateur/Testeur) ; " +
      '5) copiez le jeton renvoyé par GET /me/accounts pour cette Page dans FACEBOOK_PAGE_ACCESS_TOKEN, puis rendez-le longue durée via /oauth/access_token?grant_type=fb_exchange_token.'
    )
  }

  // La même cause remonte souvent par plusieurs chemins (identité, Page,
  // dérivation) : on ne l'affiche qu'une fois.
  diag.problems = Array.from(new Set(diag.problems))
  diag.hints = Array.from(new Set(diag.hints))
  diag.ok = diag.problems.length === 0
  return diag
}

// ─── PUBLICATION TWITTER/X ────────────────────────────────────
export async function postToTwitter(text: string): Promise<{ success: boolean; tweetId?: string; error?: string }> {
  const apiKey = process.env.TWITTER_API_KEY
  const apiSecret = process.env.TWITTER_API_SECRET
  const accessToken = process.env.TWITTER_ACCESS_TOKEN
  const accessSecret = process.env.TWITTER_ACCESS_SECRET

  if (!apiKey || !apiSecret || !accessToken || !accessSecret) {
    return { success: false, error: 'Twitter credentials manquants' }
  }

  // OAuth 1.0a signature
  const OAuth = require('oauth-1.0a')
  const crypto = require('crypto')
  const oauth = new OAuth({
    consumer: { key: apiKey, secret: apiSecret },
    signature_method: 'HMAC-SHA1',
    hash_function(base_string: string, key: string) {
      return crypto.createHmac('sha1', key).update(base_string).digest('base64')
    },
  })

  const token = { key: accessToken, secret: accessSecret }
  const requestData = { url: 'https://api.twitter.com/2/tweets', method: 'POST' }
  const headers = oauth.toHeader(oauth.authorize(requestData, token))

  try {
    const res = await axios.post(
      'https://api.twitter.com/2/tweets',
      { text: text.slice(0, 280) }, // limite Twitter
      { headers: { ...headers, 'Content-Type': 'application/json' } }
    )
    return { success: true, tweetId: res.data.data?.id }
  } catch (err: any) {
    return { success: false, error: err.response?.data?.detail || err.message }
  }
}

// ─── NEWSLETTER (Brevo en priorité, Gmail en fallback) ────────
export async function sendNewsletter(subject: string, htmlContent: string): Promise<{ success: boolean; sent?: number; failed?: number; error?: string }> {
  const apiKey = process.env.BREVO_API_KEY

  // Priorité 1 : Brevo campaign
  if (apiKey) {
    const senderEmail = process.env.BREVO_SENDER_EMAIL || 'noreply@pharmaveille-dz.com'
    const senderName = process.env.BREVO_SENDER_NAME || 'DwaDZ'
    const listId = parseInt(process.env.BREVO_LIST_ID || '1')
    try {
      await axios.post(
        'https://api.brevo.com/v3/emailCampaigns',
        {
          name: `Newsletter - ${new Date().toLocaleDateString('fr-DZ')}`,
          subject,
          sender: { email: senderEmail, name: senderName },
          type: 'classic',
          htmlContent,
          recipients: { listIds: [listId] },
          scheduledAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        },
        { headers: { 'api-key': apiKey, 'Content-Type': 'application/json' } }
      )
      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.response?.data?.message || err.message }
    }
  }

  // Priorité 2 : Gmail (envoi individuel à chaque abonné)
  if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
    return sendNewsletterViaGmail(subject, htmlContent)
  }

  return { success: false, error: 'Aucun service email configuré (BREVO_API_KEY ou GMAIL_USER/GMAIL_APP_PASSWORD)' }
}

// Ajouter un abonné à Brevo
export async function addBrevoContact(email: string, nom?: string): Promise<{ success: boolean; error?: string }> {
  const apiKey = process.env.BREVO_API_KEY
  const listId = parseInt(process.env.BREVO_LIST_ID || '1')
  if (!apiKey) return { success: false, error: 'Brevo API key manquante' }

  try {
    await axios.post(
      'https://api.brevo.com/v3/contacts',
      {
        email,
        attributes: nom ? { PRENOM: nom } : {},
        listIds: [listId],
        updateEnabled: true,
      },
      { headers: { 'api-key': apiKey, 'Content-Type': 'application/json' } }
    )
    return { success: true }
  } catch (err: any) {
    if (err.response?.status === 400 && err.response?.data?.code === 'duplicate_parameter') {
      return { success: true } // Déjà inscrit, pas une erreur
    }
    return { success: false, error: err.response?.data?.message || err.message }
  }
}

// ─── EMAIL DE CONFIRMATION D'ABONNEMENT ───────────────────────

function buildConfirmHtml(prenom: string, confirmUrl: string, appUrl: string): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #0f172a, #1e293b); color: white; padding: 24px; border-radius: 10px 10px 0 0; text-align: center;">
        <h1 style="margin: 0; font-size: 22px;">💊 DwaDZ</h1>
        <p style="margin: 8px 0 0; font-size: 13px; opacity: 0.7;">Nomenclature pharmaceutique algérienne</p>
      </div>
      <div style="background: white; padding: 28px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 10px 10px;">
        <p style="font-size: 16px; color: #334155;">Bonjour ${prenom},</p>
        <p style="color: #475569; line-height: 1.7;">
          Merci de vous être inscrit(e) à la newsletter <strong>DwaDZ</strong>.
          Vous recevrez les alertes de retraits de médicaments et les résumés hebdomadaires
          des nouveaux enregistrements sur le marché pharmaceutique algérien.
        </p>
        <div style="text-align: center; margin: 28px 0;">
          <a href="${confirmUrl}"
             style="background: #0284c7; color: white; padding: 14px 32px; border-radius: 8px;
                    text-decoration: none; font-weight: 700; font-size: 15px; display: inline-block;">
            ✅ Confirmer mon abonnement
          </a>
        </div>
        <p style="font-size: 13px; color: #94a3b8;">
          Si vous n'avez pas fait cette demande, ignorez simplement cet email.
          <br>Ce lien est valable 7 jours.
        </p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
        <p style="font-size: 12px; color: #94a3b8; text-align: center;">
          DwaDZ — Données officielles MIPH Algérie<br>
          <a href="${appUrl}" style="color: #0284c7;">${appUrl}</a>
        </p>
      </div>
    </div>
  `
}

export async function sendConfirmationEmail(
  email: string,
  nom: string | null | undefined,
  confirmToken: string
): Promise<{ success: boolean; error?: string }> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://www.dzair-pharma.net'
  const confirmUrl = `${appUrl}/api/newsletter?action=confirm&token=${confirmToken}`
  const prenom = nom || 'Pharmacien(ne)'
  const subject = '✅ Confirmez votre abonnement — DwaDZ'
  const htmlContent = buildConfirmHtml(prenom, confirmUrl, appUrl)

  // Priorité 1 : Brevo
  const apiKey = process.env.BREVO_API_KEY
  if (apiKey) {
    const senderEmail = process.env.BREVO_SENDER_EMAIL || 'noreply@pharmaveille-dz.com'
    const senderName = process.env.BREVO_SENDER_NAME || 'DwaDZ'
    try {
      await axios.post(
        'https://api.brevo.com/v3/smtp/email',
        {
          sender: { email: senderEmail, name: senderName },
          to: [{ email, name: nom || undefined }],
          subject,
          htmlContent,
        },
        { headers: { 'api-key': apiKey, 'Content-Type': 'application/json' } }
      )
      return { success: true }
    } catch (err: any) {
      console.error('[sendConfirmationEmail/brevo]', err.response?.data || err.message)
      return { success: false, error: err.response?.data?.message || err.message }
    }
  }

  // Priorité 2 : Gmail
  if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
    return sendEmailViaGmail(email, subject, htmlContent, nom || undefined)
  }

  // Dernier recours : log uniquement (dev sans config email)
  console.log(`[Newsletter] Confirmation URL for ${email}: ${confirmUrl}`)
  return { success: true }
}

// ─── PUBLICATION AUTOMATIQUE ──────────────────────────────────
export async function publishToAll(
  content: { short: string; facebook: string },
  refId: number,
  refTable: string,
  type: string
) {
  const results = { facebook: false, twitter: false }

  // Facebook
  const fb = await postToFacebook(content.facebook)
  results.facebook = fb.success
  await dbQuery(`
    INSERT INTO social_posts (type, platform, content, ref_id, ref_table, status, published_at, error_msg)
    VALUES ($1, 'facebook', $2, $3, $4, $5, $6, $7)
  `, [type, content.facebook, refId, refTable, fb.success ? 'published' : 'failed', fb.success ? new Date().toISOString() : null, fb.error || null])

  const tw = await postToTwitter(content.short)
  results.twitter = tw.success
  await dbQuery(`
    INSERT INTO social_posts (type, platform, content, ref_id, ref_table, status, published_at, error_msg)
    VALUES ($1, 'twitter', $2, $3, $4, $5, $6, $7)
  `, [type, content.short, refId, refTable, tw.success ? 'published' : 'failed', tw.success ? new Date().toISOString() : null, tw.error || null])

  return results
}
