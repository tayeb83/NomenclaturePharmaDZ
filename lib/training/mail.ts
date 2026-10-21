/**
 * Envoi d'e-mails du module Training. Même priorité que le reste du site :
 * Brevo (API), puis Gmail (nodemailer). Sans configuration :
 *  - en production : échec explicite (jamais de succès simulé) ;
 *  - en développement : le message est écrit dans `.training-outbox/` (fichier
 *    ignoré par git). Rien n'est envoyé dans les journaux : un lien de
 *    connexion est un secret.
 */
import axios from 'axios'
import fs from 'node:fs'
import path from 'node:path'
import type { Mail } from './service.ts'

export async function sendMail(mail: Mail): Promise<{ success: boolean }> {
  const brevoKey = process.env.BREVO_API_KEY
  if (brevoKey) {
    try {
      await axios.post(
        'https://api.brevo.com/v3/smtp/email',
        {
          sender: {
            email: process.env.BREVO_SENDER_EMAIL || 'noreply@pharmaveille-dz.com',
            name: process.env.BREVO_SENDER_NAME || 'DwaDZ',
          },
          to: [{ email: mail.to }],
          subject: mail.subject,
          htmlContent: mail.html,
          textContent: mail.text,
        },
        { headers: { 'api-key': brevoKey, 'Content-Type': 'application/json' }, timeout: 15000 },
      )
      return { success: true }
    } catch (err: any) {
      // Le corps de la réponse Brevo ne contient pas nos données ; on ne journalise ni le message ni le destinataire.
      console.error('[training/mail] Brevo a refusé l’envoi :', err?.response?.status ?? err?.code ?? 'erreur réseau')
      return { success: false }
    }
  }

  if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
    try {
      const nodemailer = await import('nodemailer')
      const transport = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
      })
      await transport.sendMail({
        from: `"${process.env.BREVO_SENDER_NAME || 'DwaDZ'}" <${process.env.GMAIL_USER}>`,
        to: mail.to,
        subject: mail.subject,
        html: mail.html,
        text: mail.text,
      })
      return { success: true }
    } catch (err: any) {
      console.error('[training/mail] Gmail a refusé l’envoi :', err?.code ?? 'erreur')
      return { success: false }
    }
  }

  if (process.env.NODE_ENV !== 'production') {
    const dir = path.join(process.cwd(), '.training-outbox')
    fs.mkdirSync(dir, { recursive: true })
    const file = path.join(dir, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.txt`)
    fs.writeFileSync(file, `À : ${mail.to}\nObjet : ${mail.subject}\n\n${mail.text}\n`, { mode: 0o600 })
    console.warn('[training/mail] aucun fournisseur configuré : message déposé dans .training-outbox/')
    return { success: true }
  }

  console.error('[training/mail] aucun fournisseur d’e-mail configuré (BREVO_API_KEY ou GMAIL_USER).')
  return { success: false }
}
