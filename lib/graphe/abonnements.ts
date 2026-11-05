/**
 * DwaDZ — gestion des abonnés de l'explorateur (administration). Serveur uniquement.
 * Le paiement (virement CCP ou PayPal) est constaté à la main puis enregistré ici.
 */
import { query } from '@/lib/db'
import type { AbonnementSaisie } from './core.ts'

export type Abonne = {
  id: number
  email: string
  is_active: boolean
  starts_on: string | null
  ends_on: string | null
  moyen_paiement: 'ccp' | 'paypal' | 'autre' | null
  reference_paiement: string | null
  montant: string | null
  note: string | null
  created_at: string
}

export type DemandeGraphe = { id: number; nom: string; email: string; organisation: string | null; phone: string | null; message: string | null; status: string; created_at: string }

const COLS = `id, email, is_active, starts_on::text AS starts_on, ends_on::text AS ends_on, moyen_paiement, reference_paiement, montant, note, created_at`

export function listerAbonnes(): Promise<Abonne[]> {
  return query<Abonne>(`SELECT ${COLS} FROM graphe_abonnements ORDER BY is_active DESC, ends_on DESC NULLS LAST, created_at DESC LIMIT 500`)
}

/** Demandes d'abonnement reçues depuis /graphe (offre « graphe »), les plus récentes d'abord. */
export function listerDemandes(): Promise<DemandeGraphe[]> {
  return query<DemandeGraphe>(
    `SELECT id, nom, email, organisation, phone, message, status, created_at FROM pro_leads WHERE offer = 'graphe' ORDER BY created_at DESC LIMIT 100`,
  ).catch(() => [])
}

/** Crée ou renouvelle l'abonnement d'une adresse (une ligne par adresse). */
export async function activerAbonne(s: AbonnementSaisie): Promise<Abonne> {
  const rows = await query<Abonne>(
    `INSERT INTO graphe_abonnements (email, is_active, starts_on, ends_on, moyen_paiement, reference_paiement, montant, note)
     VALUES ($1, TRUE, $2, $3, $4, $5, $6, $7)
     ON CONFLICT ((lower(email))) DO UPDATE SET
       is_active = TRUE, starts_on = EXCLUDED.starts_on, ends_on = EXCLUDED.ends_on, moyen_paiement = EXCLUDED.moyen_paiement,
       reference_paiement = EXCLUDED.reference_paiement, montant = EXCLUDED.montant, note = EXCLUDED.note
     RETURNING ${COLS}`,
    [s.email, s.starts_on, s.ends_on, s.moyen_paiement, s.reference_paiement, s.montant, s.note],
  )
  // la demande correspondante passe en « converti »
  await query(`UPDATE pro_leads SET status = 'converti' WHERE offer = 'graphe' AND lower(email) = $1 AND status <> 'converti'`, [s.email]).catch(() => undefined)
  return rows[0]
}

export async function basculerAbonne(id: number, actif: boolean): Promise<void> {
  await query('UPDATE graphe_abonnements SET is_active = $2 WHERE id = $1', [id, actif])
}

export async function supprimerAbonne(id: number): Promise<void> {
  await query('DELETE FROM graphe_abonnements WHERE id = $1', [id])
}
