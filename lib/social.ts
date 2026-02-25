/**
 * PharmaVeille DZ — Module de publication réseaux sociaux & newsletter
 */

import axios from 'axios'
import { query as dbQuery } from './db'

// ─── FORMATAGE DES MESSAGES ───────────────────────────────────
export function formatRetrait(drug: { dci: string; nom_marque: string; dosage?: string | null; labo?: string | null; motif_retrait?: string | null }) {
  const emoji = getMotifEmoji(drug.motif_retrait)
  return {
    short: `🚨 RETRAIT | ${drug.nom_marque}® (${drug.dci}${drug.dosage ? ' ' + drug.dosage : ''})\n${emoji} ${drug.motif_retrait || 'Motif non précisé'}\n\n⚠️ Ce produit n'est plus autorisé sur le marché algérien.\n\n🔗 pharmaveille-dz.com\n#Pharmacie #Algérie #Retrait #Médicament`,
    facebook: `🚨 ALERTE RETRAIT — Marché Pharmaceutique Algérien\n\n📋 Médicament : ${drug.nom_marque}® \n🧪 DCI : ${drug.dci}${drug.dosage ? '\n💊 Dosage : ' + drug.dosage : ''}${drug.labo ? '\n🏭 Laboratoire : ' + drug.labo : ''}\n\n${emoji} Motif du retrait : ${drug.motif_retrait || 'Non précisé'}\n\n⚠️ Chers pharmaciens, ce produit ne doit plus être délivré. Consultez la liste complète des retraits sur notre site.\n\n🔗 www.pharmaveille-dz.com/alertes\n\n#PharmaVeilleDZ #Pharmacie #Algérie #RetiraitMédicament #MIPH`,
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
          PharmaVeille DZ — Données officielles MIPH Algérie<br>
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/unsubscribe?token={{unsubscribe_token}}" style="color:#94a3b8;">Se désabonner</a>
        </div>
      </div>
    `
  }
}

export function formatNouveaute(drug: { dci: string; nom_marque: string; dosage?: string | null; labo?: string | null; pays?: string | null; type_prod?: string | null; annee?: number | null }) {
  const typeLabel = { GE: 'Générique', RE: 'Référence', BIO: 'Biologique', I: 'Innovateur' }[drug.type_prod || ''] || drug.type_prod
  return {
    short: `✅ NOUVEAU | ${drug.nom_marque}® enregistré en ${drug.annee}\n🧪 ${drug.dci}${drug.dosage ? ' ' + drug.dosage : ''}\n🏭 ${drug.labo} (${drug.pays})\n📋 ${typeLabel}\n\n🔗 pharmaveille-dz.com/veille\n#PharmaVeilleDZ #Algérie #NouveauMédicament`,
    facebook: `✅ NOUVEL ENREGISTREMENT — ${drug.annee}\n\n📋 Nom : ${drug.nom_marque}®\n🧪 DCI : ${drug.dci}${drug.dosage ? '\n💊 Dosage : ' + drug.dosage : ''}\n🏭 Laboratoire : ${drug.labo}${drug.pays ? ' (' + drug.pays + ')' : ''}\n📊 Type : ${typeLabel}\n\nCe médicament vient d'obtenir son enregistrement sur le marché pharmaceutique algérien.\n\n🔗 www.pharmaveille-dz.com/veille\n#PharmaVeilleDZ #Pharmacie #Algérie #NouveauMédicament #MIPH`,
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

// ─── NEWSLETTER VIA BREVO ────────────────────────────────────
export async function sendNewsletter(subject: string, htmlContent: string): Promise<{ success: boolean; error?: string }> {
  const apiKey = process.env.BREVO_API_KEY
  const senderEmail = process.env.BREVO_SENDER_EMAIL || 'noreply@pharmaveille-dz.com'
  const senderName = process.env.BREVO_SENDER_NAME || 'PharmaVeille DZ'
  const listId = parseInt(process.env.BREVO_LIST_ID || '1')

  if (!apiKey) return { success: false, error: 'Brevo API key manquante' }

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
        scheduledAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // dans 5 min
      },
      { headers: { 'api-key': apiKey, 'Content-Type': 'application/json' } }
    )
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.response?.data?.message || err.message }
  }
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
