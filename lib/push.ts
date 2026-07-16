/**
 * DwaDZ — Notifications push mobile (Firebase Cloud Messaging)
 * Même logique de dégradation gracieuse que lib/social.ts (Facebook/Twitter) :
 * si les credentials ne sont pas configurés, on renvoie juste { success: false }
 * sans jamais faire échouer l'appelant (/api/publish reste fonctionnel sans push).
 */

import { query as dbQuery } from './db'

let cachedApp: import('firebase-admin').app.App | null | undefined

function getFirebaseApp() {
  if (cachedApp !== undefined) return cachedApp

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
  if (!serviceAccountJson) {
    cachedApp = null
    return cachedApp
  }

  try {
    // Import différé : firebase-admin ne doit pas planter le build si le
    // package n'est pas encore installé/configuré en environnement de dev.
    const admin = require('firebase-admin')
    const serviceAccount = JSON.parse(serviceAccountJson)

    cachedApp = admin.apps.length
      ? admin.app()
      : admin.initializeApp({ credential: admin.credential.cert(serviceAccount) })
  } catch (err) {
    console.error('[push] Firebase init failed:', err)
    cachedApp = null
  }

  return cachedApp
}

async function getActiveTokens(): Promise<string[]> {
  const rows = await dbQuery<{ token: string }>(`SELECT token FROM push_tokens WHERE active = TRUE`)
  return rows.map(r => r.token)
}

async function deactivateTokens(tokens: string[]) {
  if (!tokens.length) return
  await dbQuery(`UPDATE push_tokens SET active = FALSE WHERE token = ANY($1)`, [tokens])
}

/**
 * Envoie une notif push à tous les tokens enregistrés (pharmaciens ayant
 * activé les alertes dans l'app mobile). `data` est transmis tel quel au
 * client (ex: { view: 'actualites' }) pour permettre la navigation au tap.
 */
export async function sendPushToAll(
  notification: { title: string; body: string },
  data: Record<string, string> = {}
): Promise<{ success: boolean; sent?: number; failed?: number; error?: string }> {
  const app = getFirebaseApp()
  if (!app) {
    return { success: false, error: 'Firebase non configuré (FIREBASE_SERVICE_ACCOUNT_JSON manquant)' }
  }

  const tokens = await getActiveTokens()
  if (!tokens.length) {
    return { success: true, sent: 0, failed: 0 }
  }

  const admin = require('firebase-admin')
  const messaging = admin.messaging(app)

  // messaging.sendEachForMulticast plafonne à 500 tokens par appel.
  const BATCH_SIZE = 500
  let sent = 0
  let failed = 0
  const invalidTokens: string[] = []

  for (let i = 0; i < tokens.length; i += BATCH_SIZE) {
    const batch = tokens.slice(i, i + BATCH_SIZE)
    try {
      const res = await messaging.sendEachForMulticast({
        tokens: batch,
        notification,
        data,
      })
      sent += res.successCount
      failed += res.failureCount
      res.responses.forEach((r: any, idx: number) => {
        if (!r.success && (r.error?.code === 'messaging/registration-token-not-registered'
          || r.error?.code === 'messaging/invalid-registration-token')) {
          invalidTokens.push(batch[idx])
        }
      })
    } catch (err: any) {
      failed += batch.length
      console.error('[push] sendEachForMulticast failed:', err.message)
    }
  }

  await deactivateTokens(invalidTokens)

  return { success: true, sent, failed }
}
