/**
 * DwaDZ — graphes de connaissances : construction des graphes depuis la base.
 *
 * Deux vues :
 *  - « substance » : une substance au centre, avec sa classe ATC, ses laboratoires, leurs pays, ses partenaires
 *    d'interaction (Thesaurus ANSM) et ses retraits ;
 *  - « classe » : une classe ATC au centre, soit avec ses substances et leurs pays d'origine (importation),
 *    soit avec les laboratoires qui s'en partagent le marché (concentration, indice HHI).
 *
 * Définitions (les mêmes partout, et alignées sur le reste du site) :
 *  - une ligne de `enregistrements` = un enregistrement (une présentation), c'est l'unité de comptage ;
 *  - production locale = `statut` « F » (fabriqué), comme le comparateur du marché ; sans statut, pays = Algérie ;
 *  - part de marché d'un laboratoire = ses enregistrements / ceux de la classe ;
 *  - HHI = somme des carrés des parts en % (0 à 10 000).
 *
 * Les libellés sont fournis en français et en arabe : la page choisit la langue côté client.
 */
import { query } from '@/lib/db'
import { chercherSubstances } from '@/lib/comparateur-medicaments'
import { cle, getPartenairesAnsm, NIVEAU_RANG, type Niveau } from '@/lib/interactions'
import {
  cheminAtc, cheminDci, cheminLabo, cheminRetrait, estLocal, lectureHhi, PLAFOND_ABONNE, plafonner, pluriel,
  type GraphData, type GraphEdge, type GraphNode,
} from './core.ts'
import type { Vue } from './demos.ts'

const PAYS_LOCAL = 'ALGERIE'
const norm = (s: string | null | undefined) => (s ?? '').replace(/\s+/g, ' ').trim().toUpperCase()
const NORM_SQL = (col: string) => `UPPER(REGEXP_REPLACE(TRIM(${col}), '\\s+', ' ', 'g'))`

export const ATC_RE = /^[A-Z]\d{2}([A-Z]([A-Z]\d{0,2})?)?$/

type AtcLabels = { code: string; label_fr: string | null; label_en: string | null; label_ar: string | null }

async function libellesAtc(codes: string[]): Promise<Map<string, AtcLabels>> {
  if (!codes.length) return new Map()
  const lire = (avecArabe: boolean) => query<AtcLabels>(
    `SELECT code, label_fr, label_en, ${avecArabe ? 'label_ar' : 'NULL::text AS label_ar'} FROM atc_codes WHERE code = ANY($1)`,
    [codes],
  )
  const rows = await lire(true).catch(() => lire(false).catch(() => [] as AtcLabels[]))
  return new Map(rows.map(r => [r.code, r]))
}

const HHI = (parts: number[]) => {
  const t = parts.reduce((a, b) => a + b, 0)
  return t ? Math.round(parts.reduce((s, p) => s + (p / t * 100) ** 2, 0)) : 0
}

const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)} %` : '—')

/**
 * Retrouve la DCI de la nomenclature à partir d'une saisie. Une démo écrit « AMIODARONE » alors que la
 * nomenclature peut porter « AMIODARONE CHLORHYDRATE » : à défaut de correspondance exacte, on prend la DCI la
 * plus fréquente qui commence par la saisie.
 */
export async function resoudreDci(saisie: string): Promise<string | null> {
  const dci = norm(saisie)
  if (!dci) return null
  const exact = await query<{ n: number }>(`SELECT COUNT(*)::int AS n FROM enregistrements WHERE ${NORM_SQL('dci')} = $1`, [dci])
  if ((exact[0]?.n ?? 0) > 0) return dci
  const proche = await query<{ dci: string }>(
    `SELECT ${NORM_SQL('dci')} AS dci FROM enregistrements
      WHERE ${NORM_SQL('dci')} LIKE $1 || ' %' OR ${NORM_SQL('dci')} LIKE $1 || '(%'
      GROUP BY 1 ORDER BY COUNT(*) DESC, 1 LIMIT 1`,
    [dci.replace(/[%_\\]/g, m => `\\${m}`)],
  )
  return proche[0]?.dci ?? null
}

// ─── Vue « substance » ───────────────────────────────────────────────────────

export async function grapheSubstance(substance: string, plafond: number): Promise<GraphData | null> {
  const dci = (await resoudreDci(substance)) ?? norm(substance)
  if (!dci) return null

  const lignes = await query<{ labo: string | null; pays: string | null; statut: string | null; n: number }>(
    `SELECT UPPER(TRIM(labo)) AS labo, UPPER(TRIM(pays)) AS pays, UPPER(TRIM(statut)) AS statut, COUNT(*)::int AS n
       FROM enregistrements WHERE ${NORM_SQL('dci')} = $1 GROUP BY 1, 2, 3`,
    [dci],
  )
  const retraits = await query<{ id: number; nom_marque: string; labo: string | null; date_retrait: string | null; motif_retrait: string | null }>(
    `SELECT id, nom_marque, UPPER(TRIM(labo)) AS labo, date_retrait::text AS date_retrait, motif_retrait
       FROM retraits WHERE ${NORM_SQL('dci')} = $1 ORDER BY date_retrait DESC NULLS LAST LIMIT 60`,
    [dci],
  ).catch(() => [])
  if (!lignes.length && !retraits.length) return null

  const centre = `substance:${dci}`
  const total = lignes.reduce((s, l) => s + l.n, 0)
  const nodes: GraphNode[] = [{ id: centre, kind: 'substance', label: dci, weight: total, href: cheminDci(dci) }]
  const edges: GraphEdge[] = []

  // ATC
  const map = await query<{ code_atc: string }>(`SELECT code_atc FROM dci_atc_mapping WHERE ${NORM_SQL('dci')} = $1 LIMIT 1`, [dci]).catch(() => [])
  const code = map[0]?.code_atc
  if (code) {
    const classe = code.slice(0, 5)
    const lib = await libellesAtc([classe, code])
    const l = lib.get(classe) ?? lib.get(code)
    nodes.push({ id: `atc:${classe}`, kind: 'atc', label: `${classe} · ${l?.label_fr || l?.label_en || code}`, labelAr: l?.label_ar ? `${classe} · ${l.label_ar}` : undefined, weight: 1000, href: cheminAtc(classe) })
    edges.push({ source: centre, target: `atc:${classe}`, kind: 'classe' })
  }

  // laboratoires et pays
  const parLabo = new Map<string, number>()
  const parPays = new Map<string, number>()
  let locaux = 0
  for (const l of lignes) {
    if (l.labo) parLabo.set(l.labo, (parLabo.get(l.labo) ?? 0) + l.n)
    if (l.pays) parPays.set(l.pays, (parPays.get(l.pays) ?? 0) + l.n)
    if (estLocal(l.statut, l.pays)) locaux += l.n
  }
  for (const [labo, n] of parLabo) {
    nodes.push({ id: `labo:${labo}`, kind: 'labo', label: labo, weight: n, href: cheminLabo(labo), detail: pluriel(n, 'enregistrement'), detailAr: `${n} تسجيل` })
    edges.push({ source: centre, target: `labo:${labo}`, kind: 'fabrique', weight: n })
  }
  for (const [pays, n] of parPays) {
    nodes.push({ id: `pays:${pays}`, kind: 'pays', label: pays, weight: n, local: pays === PAYS_LOCAL, detail: pluriel(n, 'enregistrement'), detailAr: `${n} تسجيل` })
  }
  for (const l of lignes) {
    if (l.labo && l.pays) edges.push({ source: `labo:${l.labo}`, target: `pays:${l.pays}`, kind: 'origine', weight: l.n })
  }

  // retraits : reliés à la substance et au laboratoire titulaire (créé s'il n'a plus aucun enregistrement)
  for (const r of retraits) {
    const id = `retrait:${r.id}`
    nodes.push({ id, kind: 'retrait', label: r.nom_marque, weight: 1, href: cheminRetrait(r.date_retrait), detail: [r.date_retrait?.slice(0, 10), r.motif_retrait, r.labo].filter(Boolean).join(' · ') || undefined })
    edges.push({ source: centre, target: id, kind: 'retire' })
    if (r.labo) {
      const lid = `labo:${r.labo}`
      if (!nodes.some(n => n.id === lid)) {
        nodes.push({ id: lid, kind: 'labo', label: r.labo, weight: 0, href: cheminLabo(r.labo), detail: 'plus aucun enregistrement de cette substance', detailAr: 'لم يعد له أي تسجيل لهذه المادة' })
      }
      edges.push({ source: id, target: lid, kind: 'fabrique' })
    }
  }

  // interactions
  let ci = 0
  let nbInteractions = 0
  {
    const [fr, ar] = await Promise.all([
      getPartenairesAnsm(dci, 'fr').catch(() => null),
      getPartenairesAnsm(dci, 'ar').catch(() => null),
    ])
    const nomAr = new Map<string, string>()
    for (const p of ar?.partenaires ?? []) if (p.nom_origine) nomAr.set(cle(p.nom_origine), p.nom)
    for (const p of fr?.partenaires ?? []) {
      const id = `${p.est_classe ? 'classe' : 'interaction'}:${cle(p.nom)}`
      const niveau: Niveau = p.niveau
      nbInteractions++
      if (niveau === 'contre_indication') ci++
      nodes.push({
        id, kind: p.est_classe ? 'classe' : 'interaction', label: p.nom, labelAr: nomAr.get(cle(p.nom)),
        weight: (4 - NIVEAU_RANG[niveau]) * 10 + p.lignes,
        // seule une substance présente dans la nomenclature a une fiche ; une classe du thésaurus n'en a pas
        href: !p.est_classe && p.dci ? cheminDci(p.dci) : undefined,
        detail: p.est_classe ? `classe · ${p.membres_total} substances` : undefined,
        detailAr: p.est_classe ? `صنف · ${p.membres_total} مادة` : undefined,
      })
      edges.push({ source: centre, target: id, kind: 'interagit', niveau })
    }
  }

  const g: GraphData = {
    centre, nodes, edges, tronque: false,
    stats: [
      { cle: 'enregistrements', fr: 'enregistrements', ar: 'تسجيلات', valeur: String(total) },
      { cle: 'labos', fr: 'laboratoires', ar: 'مخابر', valeur: String(parLabo.size) },
      { cle: 'import', fr: 'importés', ar: 'مستوردة', valeur: pct(total - locaux, total) },
      { cle: 'interactions', fr: 'partenaires d\'interaction', ar: 'شركاء التداخل', valeur: String(nbInteractions) },
      { cle: 'ci', fr: 'contre-indications', ar: 'موانع استعمال', valeur: String(ci) },
      { cle: 'retraits', fr: 'retraits', ar: 'عمليات سحب', valeur: String(retraits.length) },
    ],
  }
  return plafonner(g, plafond)
}

// ─── Vue « classe » ──────────────────────────────────────────────────────────

export async function grapheClasse(atc: string, mode: 'importation' | 'concentration', plafond: number): Promise<GraphData | null> {
  const code = atc.trim().toUpperCase()
  if (!ATC_RE.test(code)) return null
  const lignes = await query<{ dci: string; labo: string | null; pays: string | null; statut: string | null; n: number }>(
    `SELECT ${NORM_SQL('e.dci')} AS dci, UPPER(TRIM(e.labo)) AS labo, UPPER(TRIM(e.pays)) AS pays, UPPER(TRIM(e.statut)) AS statut, COUNT(*)::int AS n
       FROM enregistrements e JOIN dci_atc_mapping m ON ${NORM_SQL('m.dci')} = ${NORM_SQL('e.dci')}
      WHERE m.code_atc LIKE $1 || '%' GROUP BY 1, 2, 3, 4`,
    [code],
  )
  if (!lignes.length) return null
  const lib = (await libellesAtc([code])).get(code)
  const centre = `atc:${code}`
  const total = lignes.reduce((s, l) => s + l.n, 0)
  const nodes: GraphNode[] = [{
    id: centre, kind: 'atc', label: `${code} · ${lib?.label_fr || lib?.label_en || ''}`.trim(),
    labelAr: lib?.label_ar ? `${code} · ${lib.label_ar}` : undefined, weight: total, href: cheminAtc(code),
  }]
  const edges: GraphEdge[] = []

  if (mode === 'concentration') {
    const parLabo = new Map<string, number>()
    for (const l of lignes) if (l.labo) parLabo.set(l.labo, (parLabo.get(l.labo) ?? 0) + l.n)
    const totalLabos = [...parLabo.values()].reduce((a, b) => a + b, 0)
    const tri = [...parLabo].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    const [premier] = tri
    for (const [labo, n] of tri) {
      const part = pct(n, totalLabos)
      nodes.push({
        id: `labo:${labo}`, kind: 'labo', label: labo, weight: n, href: cheminLabo(labo), badge: part, dominant: labo === premier?.[0],
        detail: `${pluriel(n, 'enregistrement')} · ${part} de la classe`, detailAr: `${n} تسجيل · ${part} من الصنف`,
      })
      edges.push({ source: centre, target: `labo:${labo}`, kind: 'vend', weight: n })
    }
    const hhi = HHI([...parLabo.values()])
    const lec = lectureHhi(hhi)
    return plafonner({
      centre, nodes, edges, tronque: false,
      stats: [
        { cle: 'enregistrements', fr: 'enregistrements', ar: 'تسجيلات', valeur: String(total) },
        { cle: 'labos', fr: 'laboratoires', ar: 'مخابر', valeur: String(parLabo.size) },
        { cle: 'hhi', fr: `indice HHI : ${lec.fr}`, ar: `مؤشر HHI: ${lec.ar}`, valeur: String(hhi) },
        { cle: 'dominant', fr: `plus grande part : ${premier?.[0] ?? '—'}`, ar: `أكبر حصة: ${premier?.[0] ?? '—'}`, valeur: pct(premier?.[1] ?? 0, totalLabos) },
        { cle: 'top3', fr: 'part des 3 premiers', ar: 'حصة الثلاثة الأوائل', valeur: pct(tri.slice(0, 3).reduce((s, [, n]) => s + n, 0), totalLabos) },
      ],
    }, plafond)
  }

  const parSub = new Map<string, { n: number; locaux: number; pays: Map<string, number> }>()
  for (const l of lignes) {
    const s = parSub.get(l.dci) ?? { n: 0, locaux: 0, pays: new Map() }
    s.n += l.n
    if (estLocal(l.statut, l.pays)) s.locaux += l.n
    if (l.pays) s.pays.set(l.pays, (s.pays.get(l.pays) ?? 0) + l.n)
    parSub.set(l.dci, s)
  }
  const parPays = new Map<string, number>()
  let sansProdLocale = 0
  let unSeulPays = 0
  let locaux = 0
  for (const [dci, s] of parSub) {
    const local = s.locaux > 0
    locaux += s.locaux
    if (!local) sansProdLocale++
    if (!local && s.pays.size === 1) unSeulPays++
    nodes.push({
      id: `substance:${dci}`, kind: 'substance', label: dci, weight: s.n, local, href: cheminDci(dci),
      detail: `${pluriel(s.n, 'enregistrement')} · ${local ? `${s.locaux} fabriqué${s.locaux > 1 ? 's' : ''} en Algérie` : 'importée uniquement'}`,
      detailAr: `${s.n} تسجيل · ${local ? `${s.locaux} مصنّع في الجزائر` : 'مستوردة فقط'}`,
    })
    edges.push({ source: centre, target: `substance:${dci}`, kind: 'contient' })
    for (const [p, n] of s.pays) {
      parPays.set(p, (parPays.get(p) ?? 0) + n)
      edges.push({ source: `substance:${dci}`, target: `pays:${p}`, kind: 'origine', weight: n })
    }
  }
  for (const [p, n] of parPays) nodes.push({ id: `pays:${p}`, kind: 'pays', label: p, weight: n, local: p === PAYS_LOCAL, detail: pluriel(n, 'enregistrement'), detailAr: `${n} تسجيل` })
  return plafonner({
    centre, nodes, edges, tronque: false,
    stats: [
      { cle: 'substances', fr: 'substances', ar: 'مواد فعالة', valeur: String(parSub.size) },
      { cle: 'import', fr: 'enregistrements importés', ar: 'تسجيلات مستوردة', valeur: pct(total - locaux, total) },
      { cle: 'sans-local', fr: 'substances sans fabrication locale', ar: 'مواد بلا تصنيع محلي', valeur: String(sansProdLocale) },
      { cle: 'un-pays', fr: 'importées d\'un seul pays', ar: 'مستوردة من بلد واحد', valeur: String(unSeulPays) },
    ],
  }, plafond)
}

// ─── Entrées publiques ───────────────────────────────────────────────────────

export function construire(v: Vue, plafond: number): Promise<GraphData | null> {
  return v.vue === 'substance' ? grapheSubstance(v.substance, plafond) : grapheClasse(v.atc, v.mode, plafond)
}

export async function chercherClasses(saisie: string): Promise<{ code: string; label: string; label_ar: string | null }[]> {
  const q = saisie.replace(/\s+/g, ' ').trim().slice(0, 60)
  if (q.length < 2) return []
  const lire = (avecArabe: boolean) => query<{ code: string; label: string; label_ar: string | null }>(
    `SELECT code, COALESCE(label_fr, label_en, code) AS label, ${avecArabe ? 'label_ar' : 'NULL::text AS label_ar'}
       FROM atc_codes
      WHERE length(code) BETWEEN 3 AND 5 AND (code ILIKE $1 || '%' OR unaccent(label_fr) ILIKE '%' || unaccent($1) || '%')
      ORDER BY length(code), code LIMIT 10`,
    [q.replace(/[%_\\]/g, m => `\\${m}`)],
  )
  return lire(true).catch(() => lire(false).catch(() => []))
}

export { chercherSubstances, PLAFOND_ABONNE }
