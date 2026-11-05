/**
 * DwaDZ — droit d'accès à l'explorateur de graphes (serveur uniquement).
 * Le compte est celui de Training : lien de connexion par e-mail. L'abonnement est une ligne de
 * graphe_abonnements, activée à la main après paiement (voir sql/36_graphe.sql).
 */
import { query } from '@/lib/db'
import { getTrainingUser } from '@/lib/training/auth'
import { isTrustedEmail } from '@/lib/training'
import { decideAcces, type Acces } from './core.ts'

export async function getGrapheAcces(): Promise<{ acces: Acces; email: string | null }> {
  const user = await getTrainingUser().catch(() => null)
  const email = user?.email?.trim().toLowerCase() ?? null
  if (!email) return { acces: 'public', email: null }
  const [equipe, abo] = await Promise.all([
    isTrustedEmail(email).catch(() => false),
    query<{ is_active: boolean; starts_on: string | null; ends_on: string | null }>(
      `SELECT is_active, starts_on::text AS starts_on, ends_on::text AS ends_on FROM graphe_abonnements WHERE lower(email) = $1 LIMIT 1`,
      [email],
    ).then(r => r[0] ?? null).catch(() => null), // table absente (sql/36 non appliqué) : pas d'abonnement
  ])
  return { acces: decideAcces({ email, equipe, abonnement: abo, aujourdhui: new Date().toISOString().slice(0, 10) }), email }
}
