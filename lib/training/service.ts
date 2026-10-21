/**
 * Dzair-Pharma Training — logique métier des demandes d'accès.
 *
 * Les dépendances (requête SQL, envoi d'e-mail, horloge) sont injectées :
 * le module n'importe ni `pg` ni Next, donc il se teste avec `node --test`
 * sur une vraie base PostgreSQL ou un faux `query`.
 */
import { escapeHtml, type TrainingRole, type TrainingStatus } from './validation.ts'
import { hashToken, LOGIN_TOKEN_TTL_MS, newLoginToken, toCsv } from './security.ts'

export type Query = <T = any>(sql: string, params?: any[]) => Promise<T[]>
export type Mail = { to: string; subject: string; html: string; text: string }
export type SendMail = (mail: Mail) => Promise<{ success: boolean }>

export type TrainingDeps = {
  query: Query
  sendMail: SendMail
  appUrl: () => string
  adminEmails: () => string[]
  now?: () => Date
}

export type TrainingUserRow = {
  id: number
  email: string
  source: 'email' | 'facebook'
  facebook_id: string | null
  role: TrainingRole
  faculte: string | null
  status: TrainingStatus
  created_at: string
  approved_at: string | null
  last_login_at: string | null
}

export type RequestFilters = { status?: TrainingStatus | 'all'; q?: string }

const ROLE_LABEL: Record<TrainingRole, string> = {
  etudiant: 'Étudiant(e)',
  enseignant: 'Enseignant(e)',
  pharmacien: 'Pharmacien(ne)',
}

export function createTrainingService(deps: TrainingDeps) {
  const { query } = deps
  const now = deps.now ?? (() => new Date())

  async function logEvent(userId: number | null, type: string, payload: Record<string, unknown> = {}) {
    // Le journal ne contient jamais d'e-mail ni de jeton : seulement des métadonnées.
    await query('INSERT INTO events (user_id, type, payload) VALUES ($1, $2, $3::jsonb)', [userId, type, JSON.stringify(payload)])
  }

  /**
   * Enregistre une demande d'accès `pending`. Une adresse déjà connue ne
   * change rien et ne renvoie aucune information (le visiteur voit toujours
   * « demande envoyée »). L'admin n'est notifié que pour une vraie nouveauté.
   */
  async function submitRequest(input: {
    email: string
    role: TrainingRole
    faculte: string | null
    source?: 'email' | 'facebook'
    facebookId?: string | null
  }): Promise<{ created: boolean }> {
    const source = input.source ?? 'email'
    const rows = await query<{ id: number }>(
      `INSERT INTO training_users (email, source, facebook_id, role, faculte, status)
       VALUES ($1, $2, $3, $4, $5, 'pending')
       ON CONFLICT (lower(email)) DO NOTHING
       RETURNING id`,
      [input.email, source, input.facebookId ?? null, input.role, input.faculte],
    )
    if (rows.length === 0) return { created: false }

    await logEvent(rows[0].id, 'signup_requested', { source, role: input.role })
    await notifyAdmins(input.email, input.role, input.faculte, source).catch(err => {
      console.error('[training] notification admin impossible :', (err as Error).message)
    })
    return { created: true }
  }

  async function notifyAdmins(email: string, role: TrainingRole, faculte: string | null, source: string) {
    const admins = deps.adminEmails()
    if (admins.length === 0) {
      console.warn('[training] ADMIN_EMAILS non configuré : nouvelle demande d’accès non notifiée par e-mail.')
      return
    }
    const adminUrl = `${deps.appUrl()}/admin/training`
    const lines = [
      `E-mail : ${email}`,
      `Profil : ${ROLE_LABEL[role]}`,
      `Faculté : ${faculte ?? '—'}`,
      `Source : ${source === 'facebook' ? 'Facebook' : 'E-mail'}`,
    ]
    const html = `<p>Nouvelle demande d'accès à Dzair-Pharma Training.</p>
<ul>${lines.map(l => `<li>${escapeHtml(l)}</li>`).join('')}</ul>
<p><a href="${escapeHtml(adminUrl)}">Ouvrir l'administration</a></p>`
    const text = `Nouvelle demande d'accès à Dzair-Pharma Training.\n${lines.join('\n')}\n${adminUrl}`
    for (const to of admins) {
      await deps.sendMail({ to, subject: 'Training : nouvelle demande d’accès', html, text })
    }
  }

  function filterSql(filters: RequestFilters) {
    const where: string[] = []
    const params: any[] = []
    if (filters.status && filters.status !== 'all') {
      params.push(filters.status)
      where.push(`status = $${params.length}`)
    }
    const q = filters.q?.trim().slice(0, 100)
    if (q) {
      // % et _ saisis par l'utilisateur sont des caractères ordinaires, pas des jokers.
      params.push(`%${q.replace(/[\\%_]/g, m => `\\${m}`)}%`)
      where.push(`(email ILIKE $${params.length} OR COALESCE(faculte, '') ILIKE $${params.length})`)
    }
    return { clause: where.length ? `WHERE ${where.join(' AND ')}` : '', params }
  }

  async function listRequests(filters: RequestFilters = {}, limit = 500): Promise<TrainingUserRow[]> {
    const { clause, params } = filterSql(filters)
    params.push(Math.min(Math.max(limit, 1), 5000))
    return query<TrainingUserRow>(
      `SELECT id, email, source, facebook_id, role, faculte, status, created_at, approved_at, last_login_at
       FROM training_users ${clause}
       ORDER BY created_at DESC, id DESC
       LIMIT $${params.length}`,
      params,
    )
  }

  async function counts(): Promise<{ pending: number; approved: number; rejected: number }> {
    const rows = await query<{ status: TrainingStatus; n: string }>(
      'SELECT status, COUNT(*)::TEXT AS n FROM training_users GROUP BY status',
    )
    const out = { pending: 0, approved: 0, rejected: 0 }
    for (const r of rows) out[r.status] = parseInt(r.n, 10)
    return out
  }

  /** Crée un lien de connexion à usage unique ; renvoie le jeton en clair (à envoyer, jamais à stocker ni journaliser). */
  async function issueLoginToken(userId: number): Promise<string> {
    const token = newLoginToken()
    await query(
      'INSERT INTO login_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
      [userId, hashToken(token), new Date(now().getTime() + LOGIN_TOKEN_TTL_MS).toISOString()],
    )
    return token
  }

  async function sendAccessEmail(user: Pick<TrainingUserRow, 'id' | 'email'>): Promise<boolean> {
    const token = await issueLoginToken(user.id)
    const link = `${deps.appUrl()}/api/training/auth/verify?token=${encodeURIComponent(token)}`
    const minutes = LOGIN_TOKEN_TTL_MS / 60000
    const html = `<p>Bonjour,</p>
<p>Votre accès à <strong>Dzair-Pharma Training</strong> est ouvert.</p>
<p><a href="${escapeHtml(link)}">Se connecter à Training</a></p>
<p>Ce lien est valable ${minutes} minutes et ne peut être utilisé qu'une seule fois. Si vous n'êtes pas à l'origine de cette demande, ignorez ce message.</p>`
    const text = `Bonjour,\n\nVotre accès à Dzair-Pharma Training est ouvert.\nConnexion : ${link}\n\nCe lien est valable ${minutes} minutes et ne peut être utilisé qu'une seule fois. Si vous n'êtes pas à l'origine de cette demande, ignorez ce message.`
    try {
      const res = await deps.sendMail({ to: user.email, subject: 'Votre accès à Dzair-Pharma Training est ouvert', html, text })
      return res.success
    } catch {
      return false
    }
  }

  /**
   * Valider / refuser / remettre en attente. Valider envoie le lien de
   * connexion ; refuser ou remettre en attente invalide les liens encore
   * actifs de cet utilisateur.
   */
  async function setStatus(
    id: number,
    status: TrainingStatus,
  ): Promise<{ user: TrainingUserRow; mailSent: boolean | null } | null> {
    const before = (await query<TrainingUserRow>('SELECT * FROM training_users WHERE id = $1', [id]))[0]
    if (!before) return null
    if (before.status === status) return { user: before, mailSent: null }

    const rows = await query<TrainingUserRow>(
      `UPDATE training_users
         SET status = $2,
             status_changed_at = NOW(),
             approved_at = CASE WHEN $2 = 'approved' THEN NOW() ELSE NULL END
       WHERE id = $1
       RETURNING id, email, source, facebook_id, role, faculte, status, created_at, approved_at, last_login_at`,
      [id, status],
    )
    const user = rows[0]
    const eventType = status === 'approved' ? 'approved' : status === 'rejected' ? 'rejected' : 'set_pending'
    await logEvent(id, eventType, {})

    if (status !== 'approved') {
      await query('UPDATE login_tokens SET expires_at = LEAST(expires_at, NOW()) WHERE user_id = $1 AND used_at IS NULL', [id])
      return { user, mailSent: null }
    }
    return { user, mailSent: await sendAccessEmail(user) }
  }

  /** Renvoie un lien à un utilisateur déjà validé (e-mail non reçu). */
  async function resendAccess(id: number): Promise<{ user: TrainingUserRow; mailSent: boolean } | null> {
    const user = (await query<TrainingUserRow>('SELECT * FROM training_users WHERE id = $1', [id]))[0]
    if (!user || user.status !== 'approved') return null
    return { user, mailSent: await sendAccessEmail(user) }
  }

  async function exportRequestsCsv(filters: RequestFilters = {}): Promise<string> {
    const rows = await listRequests(filters, 5000)
    return toCsv(
      ['id', 'email', 'source', 'profil', 'faculte', 'statut', 'date_demande', 'date_validation', 'derniere_connexion'],
      rows.map(r => [r.id, r.email, r.source, r.role, r.faculte, r.status, r.created_at, r.approved_at, r.last_login_at]),
    )
  }

  return { submitRequest, listRequests, counts, setStatus, resendAccess, exportRequestsCsv, issueLoginToken }
}

export type TrainingService = ReturnType<typeof createTrainingService>
