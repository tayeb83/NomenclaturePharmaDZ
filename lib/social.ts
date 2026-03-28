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

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://pharmaveille-dz.com'
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
export async function postToFacebook(message: string): Promise<{ success: boolean; postId?: string; error?: string }> {
  const token = process.env.FACEBOOK_PAGE_ACCESS_TOKEN
  const pageId = process.env.FACEBOOK_PAGE_ID

  if (!token || !pageId) {
    return { success: false, error: 'Facebook credentials manquants' }
  }

  try {
    const res = await axios.post(
      `https://graph.facebook.com/v18.0/${pageId}/feed`,
      { message, access_token: token }
    )
    return { success: true, postId: res.data.id }
  } catch (err: any) {
    return { success: false, error: err.response?.data?.error?.message || err.message }
  }
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
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://pharmaveille-dz.com'
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
