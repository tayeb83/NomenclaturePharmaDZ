/**
 * Comptes administrateur nominatifs (voir sql/33_admin_accounts.sql).
 *
 * Création d'un compte : un admin saisit l'e-mail → le propriétaire approuve
 * par e-mail → le futur admin choisit son mot de passe via un lien de 48 h.
 */
import crypto from 'crypto'
import { promisify } from 'util'
import { query, queryOne } from './db'
import { getOwnerEmail } from './admin-auth'
import { sendMail } from './training/mail'

const scrypt = promisify(crypto.scrypt) as (pwd: string, salt: Buffer, len: number) => Promise<Buffer>

export type AccountRole = 'admin' | 'editor'
export type AccountStatus = 'pending_approval' | 'invited' | 'active' | 'disabled' | 'rejected'
export type TokenKind = 'approval' | 'activation' | 'reset'

export type AdminAccount = {
  id: number
  email: string
  name: string
  role: AccountRole
  status: AccountStatus
  invited_by: string | null
  created_at: string
  last_login_at: string | null
}

const TTL_HOURS: Record<TokenKind, number> = { approval: 48, activation: 48, reset: 1 }
export const MIN_PASSWORD_LENGTH = 10

export class AccountError extends Error {
  constructor(message: string, public status = 400) {
    super(message)
  }
}

// ─── Mots de passe ───────────────────────────────────────────

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16)
  const hash = await scrypt(password, salt, 64)
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`
}

export async function verifyPassword(password: string, stored: string | null): Promise<boolean> {
  // Même coût de calcul quand le compte n'existe pas : pas de fuite par le temps de réponse.
  const [scheme, saltHex, hashHex] = (stored || 'scrypt$00$00').split('$')
  if (scheme !== 'scrypt' || !saltHex || !hashHex) return false
  const expected = Buffer.from(hashHex, 'hex')
  const actual = await scrypt(password, Buffer.from(saltHex, 'hex'), expected.length || 64)
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual) && !!stored
}

export function validatePassword(password: unknown): string | null {
  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
    return `Le mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères.`
  }
  if (password.length > 200) return 'Mot de passe trop long.'
  return null
}

// ─── Jetons ──────────────────────────────────────────────────

const sha = (v: string) => crypto.createHash('sha256').update(v).digest('hex')

async function issueToken(accountId: number, kind: TokenKind): Promise<string> {
  const token = crypto.randomBytes(32).toString('base64url')
  // Un seul jeton actif par compte et par usage.
  await query(`DELETE FROM admin_tokens WHERE account_id = $1 AND kind = $2 AND used_at IS NULL`, [accountId, kind])
  await query(
    `INSERT INTO admin_tokens (account_id, kind, token_hash, expires_at)
     VALUES ($1, $2, $3, NOW() + ($4 || ' hours')::interval)`,
    [accountId, kind, sha(token), String(TTL_HOURS[kind])],
  )
  return token
}

/** Lit un jeton valide sans le consommer. */
export async function peekToken(token: string, kinds: TokenKind[]) {
  if (!token || token.length > 200) return null
  return queryOne<{ account_id: number; kind: TokenKind; email: string; name: string; role: AccountRole; status: AccountStatus; invited_by: string | null }>(
    `SELECT t.account_id, t.kind, a.email, a.name, a.role, a.status, a.invited_by
       FROM admin_tokens t JOIN admin_accounts a ON a.id = t.account_id
      WHERE t.token_hash = $1 AND t.kind = ANY($2) AND t.used_at IS NULL AND t.expires_at > NOW()`,
    [sha(token), kinds],
  )
}

async function consumeToken(token: string, kinds: TokenKind[]): Promise<{ account_id: number; kind: TokenKind } | null> {
  if (!token || token.length > 200) return null
  return queryOne(
    `UPDATE admin_tokens SET used_at = NOW()
      WHERE token_hash = $1 AND kind = ANY($2) AND used_at IS NULL AND expires_at > NOW()
      RETURNING account_id, kind`,
    [sha(token), kinds],
  )
}

// ─── E-mails (Gmail en priorité) ─────────────────────────────

const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))

async function deliver(mail: { to: string; subject: string; html: string; text: string }): Promise<boolean> {
  if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
    try {
      const nodemailer = await import('nodemailer')
      const transport = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
      })
      await transport.sendMail({ from: `"DwaDZ Admin" <${process.env.GMAIL_USER}>`, ...mail })
      return true
    } catch (err: any) {
      console.error('[admin-accounts] Gmail a refusé l’envoi :', err?.code ?? 'erreur')
      return false
    }
  }
  // Sans Gmail : fournisseur partagé du site (Brevo) ou boîte d'envoi locale en développement.
  return (await sendMail(mail)).success
}

function layout(title: string, bodyHtml: string, cta: { label: string; url: string }[], footer: string): string {
  const buttons = cta
    .map((c, i) => `<a href="${esc(c.url)}" style="display:inline-block;padding:11px 20px;border-radius:8px;font-weight:700;text-decoration:none;margin-right:8px;${i === 0 ? 'background:#0a7cc2;color:#fff' : 'background:#eef2f6;color:#0f1b2d'}">${esc(c.label)}</a>`)
    .join('')
  return `<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#0f1b2d">
<h2 style="font-family:Georgia,serif;margin:0 0 12px">${esc(title)}</h2>${bodyHtml}
<p style="margin:20px 0">${buttons}</p>
<p style="color:#5d6b80;font-size:12px">${esc(footer)}</p></div>`
}

export async function sendApprovalMail(account: AdminAccount, baseUrl: string): Promise<boolean> {
  const owner = getOwnerEmail()
  if (!owner) throw new AccountError('Aucune adresse propriétaire configurée (ADMIN_OWNER_EMAIL).', 500)
  const token = await issueToken(account.id, 'approval')
  const url = `${baseUrl}/admin/approbation?token=${token}`
  const roleLabel = account.role === 'admin' ? 'Administrateur' : 'Éditeur'
  return deliver({
    to: owner,
    subject: 'Approuver un nouvel administrateur — DwaDZ',
    text: `${account.invited_by || 'Un admin'} propose d'inviter ${account.name || account.email} (${account.email}) avec le rôle ${roleLabel}.\n\nApprouver ou refuser : ${url}\n\nCe lien expire dans 48 h. Si vous n'êtes pas à l'origine de cette demande, refusez-la.`,
    html: layout(
      'Un nouvel admin demande l’accès',
      `<p><b>${esc(account.invited_by || 'Un admin')}</b> propose d’inviter <b>${esc(account.name || account.email)}</b> (${esc(account.email)}) avec le rôle <b>${roleLabel}</b>.</p>`,
      [{ label: 'Examiner la demande', url }],
      'Ce lien expire dans 48 h. Si vous n’êtes pas à l’origine de cette demande, refusez-la.',
    ),
  })
}

export async function sendActivationMail(account: AdminAccount, baseUrl: string): Promise<boolean> {
  const token = await issueToken(account.id, 'activation')
  const url = `${baseUrl}/admin/mot-de-passe?kind=activation&token=${token}`
  return deliver({
    to: account.email,
    subject: 'Votre accès à l’administration DwaDZ',
    text: `Bonjour ${account.name || ''},\n\nVotre accès à l'administration DwaDZ a été approuvé. Choisissez votre mot de passe (lien valable 48 h) :\n${url}`,
    html: layout(
      'Bienvenue sur l’administration DwaDZ',
      `<p>Bonjour ${esc(account.name || '')},</p><p>Votre accès a été approuvé. Choisissez votre mot de passe pour activer votre compte.</p>`,
      [{ label: 'Choisir mon mot de passe', url }],
      'Ce lien est valable 48 h et ne fonctionne qu’une fois.',
    ),
  })
}

async function sendResetMail(account: AdminAccount, baseUrl: string): Promise<boolean> {
  const token = await issueToken(account.id, 'reset')
  const url = `${baseUrl}/admin/mot-de-passe?kind=reset&token=${token}`
  return deliver({
    to: account.email,
    subject: 'Réinitialiser votre mot de passe — DwaDZ Admin',
    text: `Pour choisir un nouveau mot de passe (lien valable 1 h) :\n${url}\n\nSi vous n'êtes pas à l'origine de cette demande, ignorez ce message.`,
    html: layout(
      'Réinitialiser votre mot de passe',
      '<p>Une réinitialisation de mot de passe a été demandée pour votre compte administrateur.</p>',
      [{ label: 'Choisir un nouveau mot de passe', url }],
      'Ce lien est valable 1 h. Si vous n’êtes pas à l’origine de cette demande, ignorez ce message.',
    ),
  })
}

// ─── Comptes ─────────────────────────────────────────────────

const COLS = `id, email, name, role, status, invited_by, created_at, last_login_at`

export async function listAccounts(): Promise<AdminAccount[]> {
  return query<AdminAccount>(`SELECT ${COLS} FROM admin_accounts ORDER BY created_at ASC`)
}

export async function getAccount(id: number): Promise<AdminAccount | null> {
  return queryOne<AdminAccount>(`SELECT ${COLS} FROM admin_accounts WHERE id = $1`, [id])
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Crée (ou relance) une invitation et envoie la demande d'approbation au propriétaire. */
export async function inviteAccount(
  input: { email: string; name: string; role: string; invitedBy: string },
  baseUrl: string,
): Promise<{ account: AdminAccount; mailSent: boolean }> {
  const email = String(input.email || '').trim().toLowerCase()
  const name = String(input.name || '').trim().slice(0, 80)
  if (!EMAIL_RE.test(email) || email.length > 254) throw new AccountError('Adresse e-mail invalide.')
  if (input.role !== 'admin' && input.role !== 'editor') throw new AccountError('Rôle invalide.')
  if (email === getOwnerEmail()) throw new AccountError('Cette adresse est celle du propriétaire.')

  const existing = await queryOne<AdminAccount>(`SELECT ${COLS} FROM admin_accounts WHERE lower(email) = $1`, [email])
  if (existing && (existing.status === 'active' || existing.status === 'disabled')) {
    throw new AccountError('Un compte existe déjà pour cette adresse.', 409)
  }
  const account = existing
    ? (await queryOne<AdminAccount>(
        `UPDATE admin_accounts SET name = $2, role = $3, status = 'pending_approval', invited_by = $4
          WHERE id = $1 RETURNING ${COLS}`,
        [existing.id, name, input.role, input.invitedBy],
      ))!
    : (await queryOne<AdminAccount>(
        `INSERT INTO admin_accounts (email, name, role, status, invited_by)
         VALUES ($1, $2, $3, 'pending_approval', $4) RETURNING ${COLS}`,
        [email, name, input.role, input.invitedBy],
      ))!
  return { account, mailSent: await sendApprovalMail(account, baseUrl) }
}

/** Approuve : le compte passe à « invited » et le futur admin reçoit son lien d'activation. */
export async function approveAccount(id: number, baseUrl: string): Promise<{ account: AdminAccount; mailSent: boolean }> {
  const account = await queryOne<AdminAccount>(
    `UPDATE admin_accounts SET status = 'invited', approved_at = NOW()
      WHERE id = $1 AND status IN ('pending_approval', 'invited') RETURNING ${COLS}`,
    [id],
  )
  if (!account) throw new AccountError('Cette demande n’est plus en attente.', 409)
  return { account, mailSent: await sendActivationMail(account, baseUrl) }
}

export async function rejectAccount(id: number): Promise<void> {
  const row = await queryOne(
    `UPDATE admin_accounts SET status = 'rejected' WHERE id = $1 AND status IN ('pending_approval', 'invited') RETURNING id`,
    [id],
  )
  if (!row) throw new AccountError('Cette demande n’est plus en attente.', 409)
  await query(`DELETE FROM admin_tokens WHERE account_id = $1`, [id])
}

export async function setAccountActive(id: number, active: boolean): Promise<void> {
  const row = await queryOne(
    active
      ? `UPDATE admin_accounts SET status = 'active' WHERE id = $1 AND status = 'disabled' RETURNING id`
      : `UPDATE admin_accounts SET status = 'disabled' WHERE id = $1 AND status = 'active' RETURNING id`,
    [id],
  )
  if (!row) throw new AccountError('Action impossible dans l’état actuel du compte.', 409)
}

/** Renvoie le message adapté à l'état : approbation au propriétaire, ou lien d'activation. */
export async function resendInvite(id: number, baseUrl: string): Promise<boolean> {
  const account = await getAccount(id)
  if (!account) throw new AccountError('Compte introuvable.', 404)
  if (account.status === 'pending_approval') return sendApprovalMail(account, baseUrl)
  if (account.status === 'invited') return sendActivationMail(account, baseUrl)
  throw new AccountError('Aucun message à renvoyer pour ce compte.', 409)
}

// ─── Connexion et mot de passe ───────────────────────────────

export async function authenticate(email: string, password: string): Promise<AdminAccount | null> {
  const row = await queryOne<AdminAccount & { password_hash: string | null }>(
    `SELECT ${COLS}, password_hash FROM admin_accounts WHERE lower(email) = $1`,
    [email.trim().toLowerCase()],
  )
  const ok = await verifyPassword(password, row?.password_hash ?? null)
  if (!row || !ok || row.status !== 'active') return null
  await query(`UPDATE admin_accounts SET last_login_at = NOW() WHERE id = $1`, [row.id])
  const { password_hash: _omit, ...account } = row
  return account
}

/** Définit le mot de passe via un jeton d'activation ou de réinitialisation. */
export async function setPasswordWithToken(token: string, password: string): Promise<void> {
  const problem = validatePassword(password)
  if (problem) throw new AccountError(problem)
  const used = await consumeToken(token, ['activation', 'reset'])
  if (!used) throw new AccountError('Ce lien est invalide ou a expiré.', 410)
  const hash = await hashPassword(password)
  const row = await queryOne(
    `UPDATE admin_accounts
        SET password_hash = $2, status = 'active', activated_at = COALESCE(activated_at, NOW())
      WHERE id = $1 AND status IN ('invited', 'active') RETURNING id`,
    [used.account_id, hash],
  )
  if (!row) throw new AccountError('Ce compte ne peut pas être activé.', 409)
}

/** Réponse identique que le compte existe ou non : pas d'énumération des adresses. */
export async function requestPasswordReset(email: string, baseUrl: string): Promise<void> {
  const account = await queryOne<AdminAccount>(
    `SELECT ${COLS} FROM admin_accounts WHERE lower(email) = $1 AND status = 'active'`,
    [email.trim().toLowerCase()],
  )
  if (account) await sendResetMail(account, baseUrl)
}

export function appBaseUrl(req: Request): string {
  const env = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL
  return (env || new URL(req.url).origin).replace(/\/$/, '')
}
