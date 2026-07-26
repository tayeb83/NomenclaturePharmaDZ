/**
 * DwaDZ — Générateur de contenu éditorial pour la Page Facebook.
 *
 * Objectif : produire, tous les 2-3 jours, un post thématique sur la
 * nomenclature pharmaceutique algérienne, avec un lien vers le site (c'est
 * l'aperçu du lien qui ramène le trafic — pas besoin de générer d'image).
 *
 * Quatre rubriques (choisies par l'éditeur) :
 *   - 'classe'    : « Tous les antidépresseurs / antidiabétiques… en Algérie »
 *   - 'algerie'   : focus 🇩🇿 sur les médicaments fabriqués localement
 *   - 'retrait'   : alerte sur les derniers retraits du marché (avec motif)
 *   - 'nouveaute' : nouveautés de l'année + chiffres clés de la nomenclature
 *
 * Le générateur alimente une file d'attente (table social_content_queue). Un cron
 * « prepare » maintient quelques brouillons d'avance ; l'admin les relit /
 * valide ; un cron « publish » envoie les posts approuvés à échéance.
 */

import { query, queryOne } from './db'
import { getStats, getLastRetraits } from './queries'
import type { Retrait } from './db-types'

export type Rubrique = 'classe' | 'algerie' | 'retrait' | 'nouveaute'

export type PostCandidate = {
  rubrique: Rubrique
  titre: string
  /** Corps éditable du post (sans le lien) */
  corps: string
  /** Lien vers le site (l'aperçu Facebook en est tiré) */
  lien: string | null
  /** Clé de déduplication (rubrique:sujet) */
  dedupKey: string
}

export type SocialPost = {
  id: number
  rubrique: Rubrique
  titre: string
  corps: string
  lien: string | null
  statut: 'draft' | 'approuve' | 'publie' | 'ignore'
  scheduled_for: string | null
  published_at: string | null
  fb_post_id: string | null
  error: string | null
  dedup_key: string | null
  created_at: string
  updated_at: string
}

function appUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || 'https://www.dzair-pharma.net').replace(/\/$/, '')
}

/** Fragment SQL : un enregistrement est « fabriqué en Algérie » si son pays de
 *  fabrication contient « algerie » (insensible aux accents/casse). */
const IS_ALGERIA_SQL = `LOWER(unaccent(COALESCE(e.pays, ''))) LIKE '%algerie%'`

// ─── Déduplication / rotation ────────────────────────────────────────────────

/** Clés de sujet déjà présentes en file (tous statuts sauf 'ignore'). On évite
 *  ainsi de reproposer un sujet déjà couvert ou en attente. */
async function usedDedupKeys(rubrique?: Rubrique): Promise<Set<string>> {
  const rows = rubrique
    ? await query<{ dedup_key: string }>(
        `SELECT dedup_key FROM social_content_queue WHERE dedup_key IS NOT NULL AND statut <> 'ignore' AND rubrique = $1`,
        [rubrique]
      )
    : await query<{ dedup_key: string }>(
        `SELECT dedup_key FROM social_content_queue WHERE dedup_key IS NOT NULL AND statut <> 'ignore'`
      )
  return new Set(rows.map((r) => r.dedup_key))
}

// ─── Rubrique 1 : classe thérapeutique ───────────────────────────────────────

type AtcClassRow = {
  code: string
  label_fr: string | null
  nb_dci: number
  nb_produits: number
  nb_algerie: number
  exemples: string[] | null
}

/**
 * Pioche une classe thérapeutique ATC (niveau 3 — le niveau des noms parlants :
 * « antidépresseurs », « antidiabétiques »…) pas encore couverte, ayant assez de
 * médicaments en nomenclature pour un post intéressant.
 */
export async function genClasseTherapeutique(): Promise<PostCandidate | null> {
  const used = await usedDedupKeys('classe')
  const excluded = [...used].map((k) => k.replace(/^classe:/, ''))

  const rows = await query<AtcClassRow>(
    `
    SELECT
      a.code,
      a.label_fr,
      COUNT(DISTINCT m.dci)::INT                                  AS nb_dci,
      COUNT(e.id)::INT                                            AS nb_produits,
      COUNT(e.id) FILTER (WHERE ${IS_ALGERIA_SQL})::INT           AS nb_algerie,
      (ARRAY_AGG(DISTINCT INITCAP(LOWER(e.nom_marque)))
         FILTER (WHERE e.nom_marque IS NOT NULL))[1:4]            AS exemples
    FROM atc_codes a
    JOIN dci_atc_mapping m ON m.code_atc LIKE a.code || '%'
    LEFT JOIN enregistrements e ON UPPER(TRIM(e.dci)) = m.dci
    WHERE a.niveau = 3
      AND a.label_fr IS NOT NULL
      AND ($1::text[] IS NULL OR a.code <> ALL($1))
    GROUP BY a.code, a.label_fr
    HAVING COUNT(e.id) >= 5
    ORDER BY RANDOM()
    LIMIT 1
    `,
    [excluded.length ? excluded : null]
  )

  const c = rows[0]
  if (!c) return null

  const label = (c.label_fr || c.code).trim()
  const lien = `${appUrl()}/classes-therapeutiques/${c.code}`
  const exemples = (c.exemples || []).filter(Boolean)

  const lignes: string[] = []
  lignes.push(`💊 ${capitalize(label)} disponibles en Algérie`)
  lignes.push('')
  lignes.push(
    `On dénombre ${c.nb_produits} médicament${plural(c.nb_produits)} enregistré${plural(
      c.nb_produits
    )} dans cette classe (${c.nb_dci} substance${plural(c.nb_dci)} active${plural(c.nb_dci)}).`
  )
  if (c.nb_algerie > 0) {
    lignes.push(`🇩🇿 Dont ${c.nb_algerie} fabriqué${plural(c.nb_algerie)} en Algérie.`)
  }
  if (exemples.length) {
    lignes.push('')
    lignes.push(`Par exemple : ${exemples.join(', ')}…`)
  }
  lignes.push('')
  lignes.push('👉 Liste complète et détails sur DwaDZ :')

  return {
    rubrique: 'classe',
    titre: `Classe : ${capitalize(label)} (${c.code})`,
    corps: lignes.join('\n'),
    lien,
    dedupKey: `classe:${c.code}`,
  }
}

// ─── Rubrique 2 : fabriqué en Algérie 🇩🇿 ─────────────────────────────────────

/**
 * Focus sur une classe thérapeutique où la production locale est significative :
 * « le diabète soigné localement », etc.
 */
export async function genFabriqueEnAlgerie(): Promise<PostCandidate | null> {
  const used = await usedDedupKeys('algerie')
  const excluded = [...used].map((k) => k.replace(/^algerie:/, ''))

  const rows = await query<AtcClassRow>(
    `
    SELECT
      a.code,
      a.label_fr,
      COUNT(DISTINCT m.dci)::INT                                  AS nb_dci,
      COUNT(e.id)::INT                                            AS nb_produits,
      COUNT(e.id) FILTER (WHERE ${IS_ALGERIA_SQL})::INT           AS nb_algerie,
      (ARRAY_AGG(DISTINCT INITCAP(LOWER(e.labo)))
         FILTER (WHERE e.labo IS NOT NULL AND ${IS_ALGERIA_SQL}))[1:4] AS exemples
    FROM atc_codes a
    JOIN dci_atc_mapping m ON m.code_atc LIKE a.code || '%'
    LEFT JOIN enregistrements e ON UPPER(TRIM(e.dci)) = m.dci
    WHERE a.niveau = 3
      AND a.label_fr IS NOT NULL
      AND ($1::text[] IS NULL OR a.code <> ALL($1))
    GROUP BY a.code, a.label_fr
    HAVING COUNT(e.id) FILTER (WHERE ${IS_ALGERIA_SQL}) >= 3
    ORDER BY RANDOM()
    LIMIT 1
    `,
    [excluded.length ? excluded : null]
  )

  const c = rows[0]
  if (!c) return null

  const label = (c.label_fr || c.code).trim()
  const lien = `${appUrl()}/classes-therapeutiques/${c.code}`
  const labos = (c.exemples || []).filter(Boolean)
  const part = c.nb_produits > 0 ? Math.round((c.nb_algerie / c.nb_produits) * 100) : 0

  const lignes: string[] = []
  lignes.push(`🇩🇿 ${capitalize(label)} : la production algérienne`)
  lignes.push('')
  lignes.push(
    `${c.nb_algerie} médicament${plural(c.nb_algerie)} de cette classe ${
      c.nb_algerie > 1 ? 'sont fabriqués' : 'est fabriqué'
    } en Algérie${part ? ` (soit ${part}% de l'offre)` : ''}.`
  )
  if (labos.length) {
    lignes.push('')
    lignes.push(`Laboratoires locaux concernés : ${labos.join(', ')}…`)
  }
  lignes.push('')
  lignes.push('👉 Le détail des médicaments fabriqués localement sur DwaDZ :')

  return {
    rubrique: 'algerie',
    titre: `Fabriqué en Algérie : ${capitalize(label)} (${c.code})`,
    corps: lignes.join('\n'),
    lien,
    dedupKey: `algerie:${c.code}`,
  }
}

// ─── Rubrique 3 : alerte retraits ────────────────────────────────────────────

/**
 * Signale le retrait du marché le plus récent pas encore posté. Rubrique
 * « d'actualité » : ne produit un post que s'il y a du nouveau.
 */
export async function genAlerteRetraits(): Promise<PostCandidate | null> {
  const used = await usedDedupKeys('retrait')
  const recents = await getLastRetraits(15)

  const r: Retrait | undefined = recents.find((x) => !used.has(`retrait:${retraitKey(x)}`))
  if (!r) return null

  const lien = `${appUrl()}/retraits`
  const nom = [r.nom_marque, r.dosage].filter(Boolean).join(' ')

  const lignes: string[] = []
  lignes.push('⚠️ Retrait du marché')
  lignes.push('')
  lignes.push(`Le médicament ${nom} (${r.dci})${r.labo ? ` — ${r.labo}` : ''} a été retiré de la vente.`)
  if (r.motif_retrait) {
    lignes.push('')
    lignes.push(`Motif : ${r.motif_retrait}`)
  }
  lignes.push('')
  lignes.push('Vérifiez votre armoire à pharmacie. 👉 Tous les retraits sur DwaDZ :')

  return {
    rubrique: 'retrait',
    titre: `Retrait : ${nom}`,
    corps: lignes.join('\n'),
    lien,
    dedupKey: `retrait:${retraitKey(r)}`,
  }
}

function retraitKey(r: Retrait): string {
  return String(r.id)
}

// ─── Rubrique 4 : nouveautés & chiffres ──────────────────────────────────────

/**
 * Alterne entre deux formats : un instantané chiffré de la nomenclature, et le
 * point sur les nouveautés de l'année. Dédupliqué par mois pour rester frais.
 */
export async function genNouveautesChiffres(): Promise<PostCandidate | null> {
  const used = await usedDedupKeys('nouveaute')
  const now = new Date()
  const moisKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const stats = await getStats()

  // Deux variantes possibles ce mois-ci : stats globales, ou nouveautés.
  const variantStats = `nouveaute:stats:${moisKey}`
  const variantNew = `nouveaute:new:${moisKey}`

  if (!used.has(variantNew) && stats.total_nouveautes > 0) {
    const lien = `${appUrl()}/nouveautes`
    const lignes = [
      '🆕 Les nouveautés de la nomenclature',
      '',
      `${stats.total_nouveautes} nouveau${plural(stats.total_nouveautes, 'x')} médicament${plural(
        stats.total_nouveautes
      )} ${stats.total_nouveautes > 1 ? 'ont été enregistrés' : 'a été enregistré'} récemment en Algérie${
        stats.last_version ? ` (version ${stats.last_version})` : ''
      }.`,
      '',
      '👉 Découvrez-les sur DwaDZ :',
    ]
    return {
      rubrique: 'nouveaute',
      titre: `Nouveautés (${moisKey})`,
      corps: lignes.join('\n'),
      lien,
      dedupKey: variantNew,
    }
  }

  if (!used.has(variantStats)) {
    const lien = `${appUrl()}/`
    const pct =
      stats.total_enregistrements > 0
        ? Math.round((stats.fabriques_algerie / stats.total_enregistrements) * 100)
        : 0
    const lignes = [
      '📊 La nomenclature pharmaceutique algérienne en un coup d’œil',
      '',
      `• ${stats.total_enregistrements} médicaments enregistrés`,
      `• ${stats.dci_uniques} substances actives (DCI)`,
      `• ${stats.fabriques_algerie} fabriqués en Algérie 🇩🇿${pct ? ` (${pct}%)` : ''}`,
      `• ${stats.total_retraits} retraits recensés`,
      '',
      '👉 Explorez toute la base sur DwaDZ :',
    ]
    return {
      rubrique: 'nouveaute',
      titre: `Chiffres clés (${moisKey})`,
      corps: lignes.join('\n'),
      lien,
      dedupKey: variantStats,
    }
  }

  return null
}

// ─── Orchestration ───────────────────────────────────────────────────────────

const GENERATORS: Record<Rubrique, () => Promise<PostCandidate | null>> = {
  classe: genClasseTherapeutique,
  algerie: genFabriqueEnAlgerie,
  retrait: genAlerteRetraits,
  nouveaute: genNouveautesChiffres,
}

/** Ordre de rotation par défaut des rubriques. */
export const RUBRIQUE_ROTATION: Rubrique[] = ['classe', 'algerie', 'retrait', 'nouveaute']

/**
 * Génère un candidat pour une rubrique donnée (ou null si épuisée/rien de neuf).
 */
export async function generateForRubrique(rubrique: Rubrique): Promise<PostCandidate | null> {
  return GENERATORS[rubrique]()
}

/**
 * Génère le prochain candidat en faisant tourner les rubriques à partir d'une
 * rubrique de départ. Saute celles qui n'ont rien à proposer.
 */
export async function generateNextCandidate(startFrom?: Rubrique): Promise<PostCandidate | null> {
  const start = startFrom ? RUBRIQUE_ROTATION.indexOf(startFrom) : 0
  for (let i = 0; i < RUBRIQUE_ROTATION.length; i++) {
    const rubrique = RUBRIQUE_ROTATION[(start + i) % RUBRIQUE_ROTATION.length]
    const candidate = await generateForRubrique(rubrique)
    if (candidate) return candidate
  }
  return null
}

// ─── File d'attente (CRUD) ───────────────────────────────────────────────────

/** Insère un candidat en brouillon. Ignore silencieusement les doublons de
 *  dedup_key (contrainte UNIQUE). Retourne le post créé, ou null si doublon. */
export async function enqueueCandidate(
  candidate: PostCandidate,
  scheduledFor: Date
): Promise<SocialPost | null> {
  return queryOne<SocialPost>(
    `
    INSERT INTO social_content_queue (rubrique, titre, corps, lien, scheduled_for, dedup_key)
    VALUES ($1, $2, $3, $4, $5, $6)
    ON CONFLICT (dedup_key) DO NOTHING
    RETURNING *
    `,
    [
      candidate.rubrique,
      candidate.titre,
      candidate.corps,
      candidate.lien,
      scheduledFor.toISOString(),
      candidate.dedupKey,
    ]
  )
}

/** Nombre de posts encore « en attente » (brouillon ou approuvé, non publiés). */
export async function pendingCount(): Promise<number> {
  const row = await queryOne<{ n: string }>(
    `SELECT COUNT(*)::text AS n FROM social_content_queue WHERE statut IN ('draft', 'approuve')`
  )
  return parseInt(row?.n ?? '0', 10)
}

/** Date de publication la plus lointaine déjà planifiée (pour enchaîner). */
export async function lastScheduledDate(): Promise<Date | null> {
  const row = await queryOne<{ scheduled_for: string | null }>(
    `SELECT scheduled_for FROM social_content_queue
     WHERE statut IN ('draft', 'approuve') AND scheduled_for IS NOT NULL
     ORDER BY scheduled_for DESC LIMIT 1`
  )
  return row?.scheduled_for ? new Date(row.scheduled_for) : null
}

export async function listPosts(limit = 60): Promise<SocialPost[]> {
  return query<SocialPost>(
    `SELECT * FROM social_content_queue
     ORDER BY
       CASE statut WHEN 'draft' THEN 0 WHEN 'approuve' THEN 1 WHEN 'publie' THEN 2 ELSE 3 END,
       scheduled_for ASC NULLS LAST, created_at DESC
     LIMIT $1`,
    [limit]
  )
}

export async function getPost(id: number): Promise<SocialPost | null> {
  return queryOne<SocialPost>(`SELECT * FROM social_content_queue WHERE id = $1`, [id])
}

export async function updatePost(
  id: number,
  fields: Partial<Pick<SocialPost, 'corps' | 'titre' | 'lien' | 'statut' | 'scheduled_for'>>
): Promise<SocialPost | null> {
  const sets: string[] = []
  const values: any[] = []
  let i = 1
  for (const [key, val] of Object.entries(fields)) {
    if (val === undefined) continue
    sets.push(`${key} = $${i++}`)
    values.push(val)
  }
  if (!sets.length) return getPost(id)
  sets.push(`updated_at = NOW()`)
  values.push(id)
  return queryOne<SocialPost>(
    `UPDATE social_content_queue SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`,
    values
  )
}

/** Prochain post approuvé dont l'échéance est passée (à publier maintenant). */
export async function getNextDuePost(): Promise<SocialPost | null> {
  return queryOne<SocialPost>(
    `SELECT * FROM social_content_queue
     WHERE statut = 'approuve'
       AND (scheduled_for IS NULL OR scheduled_for <= NOW())
     ORDER BY scheduled_for ASC NULLS FIRST
     LIMIT 1`
  )
}

export async function markPublished(id: number, fbPostId: string): Promise<void> {
  await query(
    `UPDATE social_content_queue SET statut = 'publie', published_at = NOW(), fb_post_id = $2, error = NULL, updated_at = NOW() WHERE id = $1`,
    [id, fbPostId]
  )
}

export async function markError(id: number, error: string): Promise<void> {
  await query(
    `UPDATE social_content_queue SET error = $2, updated_at = NOW() WHERE id = $1`,
    [id, error.slice(0, 500)]
  )
}

/** Compose le message final Facebook (corps + lien). */
export function composeMessage(post: Pick<SocialPost, 'corps' | 'lien'>): string {
  return post.lien ? `${post.corps}\n${post.lien}` : post.corps
}

// ─── Utilitaires de formatage ────────────────────────────────────────────────

function plural(n: number, suffix = 's'): string {
  return n > 1 ? suffix : ''
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
