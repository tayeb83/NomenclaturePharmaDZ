/**
 * DwaDZ — Demandes de médicaments : accès base et préparation du post du jour.
 *
 * Le noyau pur (lecture du JSON, garde-fous, texte du post) est dans
 * lib/demandes-core.ts. Ici : enregistrement agrégé par (médicament, wilaya),
 * rapprochement avec la nomenclature, cycle de vie (active → trouvée / expirée
 * / close) et dépôt du brouillon quotidien dans social_content_queue.
 */

import { query, queryOne } from './db'
import {
  aggKey, buildPostDuJour, fold, parseDemandes,
  type DemandeInput, type DemandeRejetee, type DemandeRow, type ParseResult,
} from './demandes-core'
import { enqueueCandidate, updatePost, type SocialPost } from './facebook-content'

export type { DemandeRow } from './demandes-core'

const COLS = `id, medicament, dci, dci_match, marques, wilaya, commune, urgence, nb_demandes, statut,
  note_privee, derniere_demande_le, expire_le, trouvee_le, created_at`

// ─── Rapprochement avec la nomenclature ──────────────────────────────────────

type DciMatch = { dci: string; controle: boolean }

/**
 * Cherche la DCI dans la nomenclature (égalité, sinon préfixe) et indique si
 * l'un de ses produits est classé stupéfiant ou psychotrope (colonne `liste`).
 * Une panne de base ne bloque pas l'import : la demande reste « à rattacher ».
 */
async function matchDci(dci: string | null): Promise<DciMatch | null> {
  const key = dci ? fold(dci) : ''
  if (key.length < 3) return null
  try {
    const row = await queryOne<{ dci: string; controle: boolean }>(
      `SELECT dci, BOOL_OR(COALESCE(liste, '') ~* 'stup|psy') AS controle
         FROM enregistrements
        WHERE unaccent(LOWER(dci)) = $1 OR unaccent(LOWER(dci)) LIKE $2
        GROUP BY dci
        ORDER BY (unaccent(LOWER(dci)) = $1) DESC, COUNT(*) DESC
        LIMIT 1`,
      [key, `${key}%`]
    )
    return row ? { dci: row.dci, controle: !!row.controle } : null
  } catch (err) {
    console.error('[demandes] matchDci:', err)
    return null
  }
}

// ─── Analyse (sans écriture) puis import ─────────────────────────────────────

export type ApercuLigne = DemandeInput & {
  /** DCI canonique de la nomenclature, si trouvée. */
  dci_match: string | null
  /** Demande active identique déjà en base : l'import s'y ajoutera. */
  existante: { id: number; nb_demandes: number } | null
}

export type Apercu = Omit<ParseResult, 'items'> & { lignes: ApercuLigne[] }

/** Lit le JSON collé et prévoit ce que l'import ferait, sans rien écrire. */
export async function analyserDemandes(texte: string): Promise<Apercu> {
  const parsed = parseDemandes(texte)
  const lignes: ApercuLigne[] = []
  const rejetees: DemandeRejetee[] = [...parsed.rejetees]

  for (const [i, item] of parsed.items.entries()) {
    const match = await matchDci(item.dci)
    if (match?.controle) {
      rejetees.push({ index: i, medicament: item.medicament, raison: 'Classé stupéfiant ou psychotrope dans la nomenclature : jamais relayé.' })
      continue
    }
    const existante = await queryOne<{ id: number; nb_demandes: number }>(
      `SELECT id, nb_demandes FROM demandes_medicaments WHERE agg_key = $1 AND statut = 'active'`,
      [aggKey(item.medicament, item.wilaya)]
    )
    lignes.push({ ...item, dci_match: match?.dci ?? null, existante })
  }
  return { lignes, rejetees, erreur: parsed.erreur, avertissements: parsed.avertissements }
}

export type ImportResult = { crees: number; fusionnees: number; apercu: Apercu }

/**
 * Enregistre les demandes valides. Une demande identique déjà active
 * (même médicament, même wilaya) voit son compteur augmenter et son
 * expiration repoussée, au lieu de créer un doublon.
 */
export async function importerDemandes(texte: string): Promise<ImportResult> {
  const apercu = await analyserDemandes(texte)
  let crees = 0, fusionnees = 0

  for (const l of apercu.lignes) {
    const row = await queryOne<{ inserted: boolean }>(
      `INSERT INTO demandes_medicaments
         (medicament, dci, dci_match, marques, wilaya, commune, urgence, nb_demandes, agg_key, expire_le)
       VALUES ($1, $2, $3, $4::text[], $5, $6, $7, $8, $9, NOW() + make_interval(days => $10::int))
       ON CONFLICT (agg_key) WHERE statut = 'active' DO UPDATE SET
         nb_demandes = demandes_medicaments.nb_demandes + EXCLUDED.nb_demandes,
         urgence = CASE WHEN demandes_medicaments.urgence = 'haute' OR EXCLUDED.urgence = 'haute'
                        THEN 'haute' ELSE 'normale' END,
         marques = ARRAY(SELECT DISTINCT UNNEST(demandes_medicaments.marques || EXCLUDED.marques)),
         commune = COALESCE(demandes_medicaments.commune, EXCLUDED.commune),
         dci_match = COALESCE(demandes_medicaments.dci_match, EXCLUDED.dci_match),
         expire_le = GREATEST(demandes_medicaments.expire_le, EXCLUDED.expire_le),
         derniere_demande_le = NOW(),
         updated_at = NOW()
       RETURNING (xmax = 0) AS inserted`,
      [l.medicament, l.dci, l.dci_match, l.marques, l.wilaya, l.commune, l.urgence, l.demandes,
       aggKey(l.medicament, l.wilaya), l.jours]
    )
    if (row?.inserted) crees++
    else fusionnees++
  }
  return { crees, fusionnees, apercu }
}

// ─── Lecture ─────────────────────────────────────────────────────────────────

/** Passe en « expirée » les demandes actives dont le délai est dépassé. */
export async function expirerDemandes(): Promise<number> {
  const rows = await query<{ id: number }>(
    `UPDATE demandes_medicaments SET statut = 'expiree', updated_at = NOW()
      WHERE statut = 'active' AND expire_le < NOW() RETURNING id`
  )
  return rows.length
}

/** Demandes actives, urgentes d'abord. Usage interne : contient commune et note. */
export async function listActives(): Promise<DemandeRow[]> {
  return query<DemandeRow>(
    `SELECT ${COLS} FROM demandes_medicaments
      WHERE statut = 'active' AND expire_le >= NOW()
      ORDER BY (urgence = 'haute') DESC, nb_demandes DESC, id ASC`
  )
}

/** Admin : actives, plus tout ce qui a changé de statut ces 30 derniers jours. */
export async function listPourAdmin(): Promise<DemandeRow[]> {
  return query<DemandeRow>(
    `SELECT ${COLS} FROM demandes_medicaments
      WHERE statut = 'active' OR updated_at >= NOW() - INTERVAL '30 days'
      ORDER BY (statut = 'active') DESC, (urgence = 'haute') DESC, nb_demandes DESC, id DESC
      LIMIT 300`
  )
}

/** Version publique : jamais de commune ni de note privée. */
export type DemandePublique = Pick<
  DemandeRow,
  'id' | 'medicament' | 'dci_match' | 'dci' | 'marques' | 'wilaya' | 'urgence' | 'nb_demandes' | 'statut' | 'derniere_demande_le' | 'expire_le' | 'trouvee_le'
>

export async function listPubliques(): Promise<{ actives: DemandePublique[]; trouvees: DemandePublique[] }> {
  const cols = `id, medicament, dci_match, dci, marques, wilaya, urgence, nb_demandes, statut,
    derniere_demande_le, expire_le, trouvee_le`
  const [actives, trouvees] = await Promise.all([
    query<DemandePublique>(
      `SELECT ${cols} FROM demandes_medicaments
        WHERE statut = 'active' AND expire_le >= NOW()
        ORDER BY (urgence = 'haute') DESC, nb_demandes DESC, id ASC`
    ),
    // « Trouvé » reste affiché 48 h : la preuve que le relais sert à quelque chose.
    query<DemandePublique>(
      `SELECT ${cols} FROM demandes_medicaments
        WHERE statut = 'trouvee' AND trouvee_le >= NOW() - INTERVAL '48 hours'
        ORDER BY trouvee_le DESC LIMIT 20`
    ),
  ])
  return { actives, trouvees }
}

// ─── Cycle de vie ────────────────────────────────────────────────────────────

export type DemandeAction =
  | { action: 'trouvee' }
  | { action: 'clore' }
  | { action: 'reactiver' }
  | { action: 'prolonger'; jours?: number }
  | { action: 'urgence'; urgence: 'haute' | 'normale' }
  | { action: 'compteur'; nb_demandes: number }
  | { action: 'note'; note: string }

export async function modifierDemande(id: number, a: DemandeAction): Promise<DemandeRow | null> {
  switch (a.action) {
    case 'trouvee':
      return queryOne<DemandeRow>(
        `UPDATE demandes_medicaments SET statut = 'trouvee', trouvee_le = NOW(), updated_at = NOW()
          WHERE id = $1 AND statut = 'active' RETURNING ${COLS}`, [id])
    case 'clore':
      return queryOne<DemandeRow>(
        `UPDATE demandes_medicaments SET statut = 'clos', updated_at = NOW()
          WHERE id = $1 AND statut = 'active' RETURNING ${COLS}`, [id])
    case 'reactiver':
      // Peut échouer sur l'index unique si une demande identique est déjà active : l'appelant gère 23505.
      return queryOne<DemandeRow>(
        `UPDATE demandes_medicaments
            SET statut = 'active', trouvee_le = NULL, expire_le = NOW() + INTERVAL '14 days', updated_at = NOW()
          WHERE id = $1 AND statut <> 'active' RETURNING ${COLS}`, [id])
    case 'prolonger': {
      const jours = Math.min(60, Math.max(1, Math.trunc(a.jours ?? 14)))
      return queryOne<DemandeRow>(
        `UPDATE demandes_medicaments
            SET expire_le = GREATEST(expire_le, NOW()) + make_interval(days => $2::int),
                statut = CASE WHEN statut = 'expiree' THEN 'active' ELSE statut END, updated_at = NOW()
          WHERE id = $1 AND statut IN ('active', 'expiree') RETURNING ${COLS}`, [id, jours])
    }
    case 'urgence':
      return queryOne<DemandeRow>(
        `UPDATE demandes_medicaments SET urgence = $2, updated_at = NOW() WHERE id = $1 RETURNING ${COLS}`,
        [id, a.urgence === 'haute' ? 'haute' : 'normale'])
    case 'compteur':
      return queryOne<DemandeRow>(
        `UPDATE demandes_medicaments SET nb_demandes = $2, updated_at = NOW() WHERE id = $1 RETURNING ${COLS}`,
        [id, Math.min(999, Math.max(1, Math.trunc(a.nb_demandes) || 1))])
    case 'note':
      return queryOne<DemandeRow>(
        `UPDATE demandes_medicaments SET note_privee = $2, updated_at = NOW() WHERE id = $1 RETURNING ${COLS}`,
        [id, a.note.trim().slice(0, 500) || null])
  }
}

export async function supprimerDemande(id: number): Promise<boolean> {
  const rows = await query<{ id: number }>(`DELETE FROM demandes_medicaments WHERE id = $1 RETURNING id`, [id])
  return rows.length > 0
}

// ─── Post Facebook du jour ───────────────────────────────────────────────────

export type PreparationResult =
  | { created: false; reason: string }
  | { created: true; updated: boolean; post: SocialPost | null; dedupKey: string }

/**
 * Prépare le brouillon « Demandes du jour » dans la file Facebook.
 *   - expire les demandes échues ;
 *   - écarte les posts « demande » non publiés d'un autre jour (ils seraient périmés) ;
 *   - crée le brouillon du jour, ou le remet à jour tant qu'il n'est pas validé.
 * Un post déjà approuvé, publié ou ignoré n'est jamais réécrit.
 */
export async function preparerPostDuJour(opts: { approuver?: boolean; now?: Date } = {}): Promise<PreparationResult> {
  const now = opts.now ?? new Date()
  await expirerDemandes()

  const post = buildPostDuJour(await listActives(), now)

  await query(
    `UPDATE social_content_queue SET statut = 'ignore', updated_at = NOW()
      WHERE rubrique = 'demande' AND statut IN ('draft', 'approuve') AND dedup_key IS DISTINCT FROM $1`,
    [post?.dedupKey ?? '']
  )
  if (!post) return { created: false, reason: 'Aucune demande active : pas de post.' }

  const existant = await queryOne<SocialPost>(`SELECT * FROM social_content_queue WHERE dedup_key = $1`, [post.dedupKey])
  if (existant) {
    if (existant.statut !== 'draft') {
      return { created: false, reason: `Le post du jour existe déjà (${existant.statut}).` }
    }
    const maj = await queryOne<SocialPost>(
      `UPDATE social_content_queue SET titre = $2, corps = $3, visuel = $4::jsonb, updated_at = NOW()
        WHERE id = $1 RETURNING *`,
      [existant.id, post.titre, post.corps, JSON.stringify(post.visuel)]
    ).catch(async (err: any) => {
      if (err?.code !== '42703') throw err // colonne visuel absente (migration 22)
      return queryOne<SocialPost>(
        `UPDATE social_content_queue SET titre = $2, corps = $3, updated_at = NOW() WHERE id = $1 RETURNING *`,
        [existant.id, post.titre, post.corps]
      )
    })
    const final = opts.approuver && maj ? await updatePost(maj.id, { statut: 'approuve' }) : maj
    return { created: true, updated: true, post: final, dedupKey: post.dedupKey }
  }

  const cree = await enqueueCandidate(post, now)
  const final = opts.approuver && cree ? await updatePost(cree.id, { statut: 'approuve' }) : cree
  return { created: true, updated: false, post: final, dedupKey: post.dedupKey }
}
