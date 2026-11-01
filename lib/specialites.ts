/**
 * DwaDZ — Spécialités : un classement de navigation (voir sql/28_specialites.sql).
 *
 * Une spécialité regroupe des classes ATC et/ou des substances. Rien de
 * médical n'est stocké : les listes, fiches, prix et RCP restent ceux du
 * site, et les compteurs sont calculés à partir de la nomenclature.
 *
 * Sans la migration, une spécialité « Dentisterie » par défaut est servie en
 * lecture seule (DEFAULT_SPECIALITES) : le site fonctionne avant l'admin.
 */

import { unstable_cache } from 'next/cache'
import { query, queryOne } from './db'
import type { Lang } from './i18n'

export const SPECIALITES_TAG = 'specialites'

export type ItemKind = 'atc' | 'dci'

export type SpecialiteRow = {
  slug: string
  titre_fr: string
  titre_ar: string | null
  description_fr: string | null
  description_ar: string | null
  ordre: number
  actif: boolean
}

export type ItemRow = {
  id: number
  kind: ItemKind
  valeur: string
  libelle_ar: string | null
  ordre: number
}

export type SpecialiteItem = ItemRow & {
  /** Libellé officiel ATC (FR), ou la DCI elle-même. */
  libelle_fr: string
  /** Libellé arabe officiel de la classe ATC (atc_codes.label_ar), si traduit. */
  atc_label_ar: string | null
  nb_dci: number
  nb_produits: number
}

export type SpecialiteSummary = SpecialiteRow & { nb_classes: number; nb_dci: number; nb_produits: number }
export type SpecialiteDetail = SpecialiteRow & { items: SpecialiteItem[]; nb_dci: number; nb_produits: number }

const ATC_RE = /^[A-Z][0-9A-Z]{0,6}$/
const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/

export const isValidAtc = (v: string) => ATC_RE.test(v)
export const isValidSlug = (v: string) => SLUG_RE.test(v) && v.length <= 40
export const normalizeDci = (v: string) => v.replace(/\s+/g, ' ').trim().toUpperCase()

/** Titre et présentation dans la langue demandée, avec repli sur le français. */
export function titre(s: Pick<SpecialiteRow, 'titre_fr' | 'titre_ar'>, lang: Lang): string {
  return (lang === 'ar' && s.titre_ar?.trim()) || s.titre_fr
}
export function description(s: Pick<SpecialiteRow, 'description_fr' | 'description_ar'>, lang: Lang): string | null {
  const v = lang === 'ar' ? s.description_ar : s.description_fr
  return v?.trim() || null
}

// ─── Valeurs par défaut (avant la migration) ──────────────────────────────

const DEFAULT_SPECIALITES: { row: SpecialiteRow; items: ItemRow[] }[] = [
  {
    row: { slug: 'dentaire', titre_fr: 'Dentisterie', titre_ar: 'طب الأسنان', description_fr: null, description_ar: null, ordre: 1, actif: true },
    items: [
      { id: -1, kind: 'atc', valeur: 'A01', libelle_ar: 'مستحضرات الفم والأسنان', ordre: 1 },
      { id: -2, kind: 'atc', valeur: 'N01B', libelle_ar: 'المخدّرات الموضعية', ordre: 2 },
      { id: -3, kind: 'atc', valeur: 'J01', libelle_ar: 'مضادات الجراثيم للاستعمال الجهازي', ordre: 3 },
      { id: -4, kind: 'atc', valeur: 'N02', libelle_ar: 'المسكّنات', ordre: 4 },
      { id: -5, kind: 'atc', valeur: 'M01', libelle_ar: 'مضادات الالتهاب ومضادات الروماتيزم', ordre: 5 },
    ],
  },
]

let tablesExist: boolean | undefined
async function hasTables(): Promise<boolean> {
  if (tablesExist) return true
  try {
    const row = await queryOne<{ ok: boolean }>(
      `SELECT (to_regclass('public.specialites') IS NOT NULL AND to_regclass('public.specialite_items') IS NOT NULL) AS ok`
    )
    tablesExist = row?.ok ?? false
  } catch {
    tablesExist = false
  }
  return tablesExist
}

// ─── Compteurs ────────────────────────────────────────────────────────────

async function atcCounts(code: string): Promise<{ libelle: string; label_ar: string | null; nb_dci: number; nb_produits: number }> {
  try {
    // to_jsonb : fonctionne même si la colonne label_ar n'existe pas encore (migration 31).
    const label = await queryOne<{ label_fr: string | null; label_en: string | null; label_ar: string | null }>(
      `SELECT label_fr, label_en, to_jsonb(a)->>'label_ar' AS label_ar FROM atc_codes a WHERE code = $1`, [code]
    )
    const c = await queryOne<{ nb_dci: string; nb_produits: string }>(
      `SELECT COUNT(DISTINCT m.dci)::TEXT AS nb_dci, COALESCE(SUM(e.nb), 0)::TEXT AS nb_produits
         FROM dci_atc_mapping m
         LEFT JOIN (SELECT UPPER(TRIM(dci)) AS d, COUNT(*) AS nb FROM enregistrements GROUP BY 1) e ON e.d = m.dci
        WHERE m.code_atc LIKE $1 || '%'`,
      [code]
    )
    return {
      libelle: label?.label_fr || label?.label_en || code,
      label_ar: label?.label_ar?.trim() || null,
      nb_dci: Number(c?.nb_dci ?? 0),
      nb_produits: Number(c?.nb_produits ?? 0),
    }
  } catch {
    return { libelle: code, label_ar: null, nb_dci: 0, nb_produits: 0 }
  }
}

async function dciCounts(dci: string): Promise<{ libelle: string; label_ar: string | null; nb_dci: number; nb_produits: number }> {
  try {
    const c = await queryOne<{ nb: string }>(
      `SELECT COUNT(*)::TEXT AS nb FROM enregistrements WHERE UPPER(TRIM(dci)) = $1`, [dci]
    )
    const nb = Number(c?.nb ?? 0)
    return { libelle: dci, label_ar: null, nb_dci: nb > 0 ? 1 : 0, nb_produits: nb }
  } catch {
    return { libelle: dci, label_ar: null, nb_dci: 0, nb_produits: 0 }
  }
}

async function withCounts(items: ItemRow[]): Promise<SpecialiteItem[]> {
  return Promise.all(items.map(async it => {
    const c = it.kind === 'atc' ? await atcCounts(it.valeur) : await dciCounts(it.valeur)
    return { ...it, libelle_fr: c.libelle, atc_label_ar: c.label_ar, nb_dci: c.nb_dci, nb_produits: c.nb_produits }
  }))
}

/** Totaux de la spécialité : un produit ou une DCI couverts par deux lignes ne sont comptés qu'une fois. */
async function totals(items: ItemRow[]): Promise<{ nb_dci: number; nb_produits: number }> {
  const atc = items.filter(i => i.kind === 'atc').map(i => i.valeur)
  const dci = items.filter(i => i.kind === 'dci').map(i => i.valeur)
  if (!atc.length && !dci.length) return { nb_dci: 0, nb_produits: 0 }
  try {
    const r = await queryOne<{ nb_dci: string; nb_produits: string }>(
      `WITH d AS (
         SELECT m.dci FROM dci_atc_mapping m
          WHERE EXISTS (SELECT 1 FROM unnest($1::text[]) p WHERE m.code_atc LIKE p || '%')
         UNION SELECT UNNEST($2::text[])
       )
       SELECT (SELECT COUNT(*) FROM d WHERE EXISTS (SELECT 1 FROM enregistrements e WHERE UPPER(TRIM(e.dci)) = d.dci))::TEXT AS nb_dci,
              (SELECT COUNT(*) FROM enregistrements e WHERE UPPER(TRIM(e.dci)) IN (SELECT dci FROM d))::TEXT AS nb_produits`,
      [atc, dci]
    )
    return { nb_dci: Number(r?.nb_dci ?? 0), nb_produits: Number(r?.nb_produits ?? 0) }
  } catch {
    return { nb_dci: 0, nb_produits: 0 }
  }
}

// ─── Lecture publique ─────────────────────────────────────────────────────

async function loadAll(): Promise<{ row: SpecialiteRow; items: ItemRow[] }[]> {
  if (!(await hasTables())) return DEFAULT_SPECIALITES
  const rows = await query<SpecialiteRow>(
    `SELECT slug, titre_fr, titre_ar, description_fr, description_ar, ordre, actif
       FROM specialites WHERE actif ORDER BY ordre, titre_fr`
  )
  if (!rows.length) return []
  const items = await query<ItemRow & { specialite_slug: string }>(
    `SELECT id::INT AS id, specialite_slug, kind, valeur, libelle_ar, ordre
       FROM specialite_items WHERE specialite_slug = ANY($1) ORDER BY ordre, id`,
    [rows.map(r => r.slug)]
  )
  return rows.map(row => ({ row, items: items.filter(i => i.specialite_slug === row.slug) }))
}

export const listSpecialites = unstable_cache(
  async (): Promise<SpecialiteSummary[]> => {
    const all = await loadAll()
    return Promise.all(all.map(async ({ row, items }) => {
      const t = await totals(items)
      return { ...row, nb_classes: items.length, ...t }
    }))
  },
  ['specialites', 'list', 'v1'],
  { revalidate: 3600, tags: [SPECIALITES_TAG] }
)

export function getSpecialite(slug: string): Promise<SpecialiteDetail | null> {
  if (!isValidSlug(slug)) return Promise.resolve(null)
  return unstable_cache(
    async (): Promise<SpecialiteDetail | null> => {
      const found = (await loadAll()).find(s => s.row.slug === slug)
      if (!found) return null
      const [items, t] = await Promise.all([withCounts(found.items), totals(found.items)])
      return { ...found.row, items, ...t }
    },
    ['specialites', 'detail', 'v2', slug],
    { revalidate: 3600, tags: [SPECIALITES_TAG] }
  )()
}

/** Lien vers la page existante qui présente l'élément. */
export function itemHref(it: Pick<ItemRow, 'kind' | 'valeur'>): string {
  return it.kind === 'atc'
    ? `/classes-therapeutiques/${it.valeur}`
    : `/dci/${encodeURIComponent(it.valeur.toLowerCase())}`
}

// ─── Admin ────────────────────────────────────────────────────────────────

export type AdminSpecialite = SpecialiteRow & { items: SpecialiteItem[] }

export async function listSpecialitesAdmin(): Promise<{ tableMissing: boolean; specialites: AdminSpecialite[] }> {
  if (!(await hasTables())) {
    const specialites = await Promise.all(DEFAULT_SPECIALITES.map(async ({ row, items }) => ({ ...row, items: await withCounts(items) })))
    return { tableMissing: true, specialites }
  }
  const rows = await query<SpecialiteRow>(
    `SELECT slug, titre_fr, titre_ar, description_fr, description_ar, ordre, actif FROM specialites ORDER BY ordre, titre_fr`
  )
  const items = await query<ItemRow & { specialite_slug: string }>(
    `SELECT id::INT AS id, specialite_slug, kind, valeur, libelle_ar, ordre FROM specialite_items ORDER BY ordre, id`
  )
  const specialites = await Promise.all(rows.map(async row => ({
    ...row,
    items: await withCounts(items.filter(i => i.specialite_slug === row.slug)),
  })))
  return { tableMissing: false, specialites }
}

export type SpecialiteInput = {
  slug: string
  titre_fr: string
  titre_ar?: string | null
  description_fr?: string | null
  description_ar?: string | null
  ordre?: number
  actif?: boolean
}

const clean = (v: unknown, max: number): string | null => {
  if (typeof v !== 'string') return null
  const s = v.trim().slice(0, max)
  return s || null
}

/** Valide une spécialité saisie ; renvoie la valeur nettoyée ou un message d'erreur. */
export function parseSpecialite(b: any): { ok: true; value: Required<SpecialiteInput> } | { ok: false; error: string } {
  const slug = typeof b?.slug === 'string' ? b.slug.trim().toLowerCase() : ''
  if (!isValidSlug(slug)) return { ok: false, error: 'Identifiant invalide : lettres minuscules, chiffres et tirets (ex. dentaire, chirurgie-dentaire).' }
  const titre_fr = clean(b?.titre_fr, 80)
  if (!titre_fr) return { ok: false, error: 'Le titre français est obligatoire.' }
  const ordre = Number.isFinite(Number(b?.ordre)) ? Math.trunc(Number(b.ordre)) : 0
  return {
    ok: true,
    value: {
      slug, titre_fr,
      titre_ar: clean(b?.titre_ar, 80),
      description_fr: clean(b?.description_fr, 600),
      description_ar: clean(b?.description_ar, 600),
      ordre: Math.min(Math.max(ordre, -1000), 1000),
      actif: b?.actif !== false,
    },
  }
}

export async function upsertSpecialite(s: Required<SpecialiteInput>): Promise<void> {
  await query(
    `INSERT INTO specialites (slug, titre_fr, titre_ar, description_fr, description_ar, ordre, actif, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())
     ON CONFLICT (slug) DO UPDATE SET titre_fr = EXCLUDED.titre_fr, titre_ar = EXCLUDED.titre_ar,
       description_fr = EXCLUDED.description_fr, description_ar = EXCLUDED.description_ar,
       ordre = EXCLUDED.ordre, actif = EXCLUDED.actif, updated_at = NOW()`,
    [s.slug, s.titre_fr, s.titre_ar, s.description_fr, s.description_ar, s.ordre, s.actif]
  )
}

export async function deleteSpecialite(slug: string): Promise<void> {
  await query(`DELETE FROM specialites WHERE slug = $1`, [slug])
}

/** Ajoute une classe ATC ou une substance ; vérifie qu'elle existe dans la base. */
export async function addItem(
  slug: string, kind: ItemKind, rawValeur: string, libelleAr: string | null
): Promise<{ ok: true } | { ok: false; error: string }> {
  const valeur = kind === 'atc' ? rawValeur.trim().toUpperCase() : normalizeDci(rawValeur)
  if (kind === 'atc') {
    if (!isValidAtc(valeur)) return { ok: false, error: 'Code ATC invalide (ex. N01B, A01AB03).' }
    const e = await queryOne(`SELECT 1 FROM atc_codes WHERE code = $1`, [valeur])
    if (!e) return { ok: false, error: `Le code ${valeur} n'existe pas dans la classification ATC chargée.` }
  } else {
    if (!valeur || valeur.length > 120) return { ok: false, error: 'Substance invalide.' }
    const e = await queryOne(`SELECT 1 FROM enregistrements WHERE UPPER(TRIM(dci)) = $1 LIMIT 1`, [valeur])
    if (!e) return { ok: false, error: `Aucune fiche de la nomenclature n'a la DCI « ${valeur} ».` }
  }
  const sp = await queryOne(`SELECT 1 FROM specialites WHERE slug = $1`, [slug])
  if (!sp) return { ok: false, error: 'Spécialité introuvable.' }
  await query(
    `INSERT INTO specialite_items (specialite_slug, kind, valeur, libelle_ar, ordre)
     VALUES ($1,$2,$3,$4, COALESCE((SELECT MAX(ordre) + 1 FROM specialite_items WHERE specialite_slug = $1), 1))
     ON CONFLICT (specialite_slug, kind, valeur) DO NOTHING`,
    [slug, kind, valeur, clean(libelleAr, 120)]
  )
  return { ok: true }
}

export async function updateItem(id: number, libelleAr: string | null, ordre?: number): Promise<void> {
  await query(
    `UPDATE specialite_items SET libelle_ar = $2, ordre = COALESCE($3, ordre) WHERE id = $1`,
    [id, clean(libelleAr, 120), Number.isFinite(ordre) ? Math.trunc(ordre as number) : null]
  )
}

export async function removeItem(id: number): Promise<void> {
  await query(`DELETE FROM specialite_items WHERE id = $1`, [id])
}

/** Aide à la saisie : classes ATC par code ou par libellé. */
export async function searchAtc(q: string): Promise<{ code: string; label: string }[]> {
  const s = q.trim().slice(0, 60)
  if (s.length < 2) return []
  try {
    const rows = await query<{ code: string; label_fr: string | null; label_en: string | null }>(
      `SELECT code, label_fr, label_en FROM atc_codes
        WHERE code LIKE UPPER($1) || '%' OR label_fr ILIKE '%' || $1 || '%' OR label_en ILIKE '%' || $1 || '%'
        ORDER BY niveau, code LIMIT 15`,
      [s.replace(/[\\%_]/g, m => `\\${m}`)]
    )
    return rows.map(r => ({ code: r.code, label: r.label_fr || r.label_en || r.code }))
  } catch {
    return []
  }
}

/** Aide à la saisie : substances de la nomenclature. */
export async function searchDci(q: string): Promise<{ dci: string; nb: number }[]> {
  const s = q.trim().slice(0, 60)
  if (s.length < 2) return []
  try {
    const rows = await query<{ dci: string; nb: string }>(
      `SELECT UPPER(TRIM(dci)) AS dci, COUNT(*)::TEXT AS nb FROM enregistrements
        WHERE dci ILIKE '%' || $1 || '%' GROUP BY 1 ORDER BY 1 LIMIT 15`,
      [s.replace(/[\\%_]/g, m => `\\${m}`)]
    )
    return rows.map(r => ({ dci: r.dci, nb: Number(r.nb) }))
  } catch {
    return []
  }
}
