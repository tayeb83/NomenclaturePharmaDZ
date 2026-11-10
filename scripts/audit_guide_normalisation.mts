/**
 * Audit de la normalisation de la recherche guidée (lib/guide-core.ts), sans rien écrire en base.
 *
 *   DATABASE_URL=... npx tsx scripts/audit_guide_normalisation.mts                  # table enregistrements
 *   npx tsx scripts/audit_guide_normalisation.mts --fixture scripts/fixtures/nomenclature_synthetique.json
 *   … --out data/guide/audit_normalisation.xlsx                                     # chemin du classeur
 *
 * Produit un classeur pour relecture terminologique :
 *   - « Formes »   : chaque écriture de la nomenclature, son nombre de fiches, la forme et la voie retenues,
 *                    les mots inconnus (à ajouter au vocabulaire MOTS_FORME) ;
 *   - « Dosages »  : chaque écriture, le libellé et la clé de regroupement, les incohérences ;
 *   - « Regroupements » : les formes et dosages normalisés qui rassemblent plusieurs écritures (à vérifier) ;
 *   - « DCI »      : les DCI fusionnées (ordre des substances différent, séparateurs différents) ;
 *   - « Anomalies » : ce qu'il faudrait corriger à la source (fautes de frappe, pourcentages convertis par Excel,
 *                    dosages incohérents avec la DCI…), avec la valeur proposée et des exemples de marques ;
 *   - « EDQM (arabe à relire) » : les Standard Terms rencontrés, leur traduction arabe et son état de relecture.
 * Les feuilles « Formes » et « Dosages » portent aussi le code EDQM, la nature du lien et les codes UCUM.
 * Affiche aussi le taux de reconnaissance pondéré par le nombre de fiches.
 */
import { mkdirSync, readFileSync } from 'node:fs'
import { dirname } from 'node:path'
import * as XLSX from 'xlsx'
import { construireIndex, voieParId, type LigneNomenclature } from '../lib/guide-core.ts'
import { edqmForme } from '../lib/edqm.ts'

const arg = (name: string) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : undefined }

async function lignes(): Promise<LigneNomenclature[]> {
  const fixture = arg('--fixture')
  if (fixture) return JSON.parse(readFileSync(fixture, 'utf8')).enregistrements
  const { default: pg } = await import('pg')
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined })
  try {
    const r = await pool.query(`SELECT id, dci, nom_marque, forme, dosage, conditionnement, labo, pays, statut FROM enregistrements`)
    return r.rows
  } finally { await pool.end() }
}

const idx = construireIndex(await lignes())
const P = idx.presentations
const pct = (a: number, b: number) => (b ? `${Math.round((1000 * a) / b) / 10} %` : '—')

type Agg<T> = Map<string, { n: number; v: T }>
const agreger = <T,>(cle: (p: (typeof P)[number]) => string, val: (p: (typeof P)[number]) => T): Agg<T> => {
  const m: Agg<T> = new Map()
  for (const p of P) { const k = cle(p); const e = m.get(k); if (e) e.n++; else m.set(k, { n: 1, v: val(p) }) }
  return m
}

const formes = agreger(p => (p.forme ?? '').trim(), p => p.norm.forme)
const dosages = agreger(p => `${(p.dosage ?? '').trim()}|${p.norm.dci.substances.length}`, p => p.norm.dosage)

const feuilleFormes = [...formes].sort((a, b) => b[1].n - a[1].n).map(([brut, { n, v }]) => ({
  'Forme (nomenclature)': brut, Fiches: n, 'Forme normalisée': v.fr, Identifiant: v.id,
  Voie: voieParId(v.voie)?.fr ?? v.voie, 'Libellé arabe': v.ar ?? '', Reconnue: v.reconnu ? 'oui' : 'NON',
  'Code EDQM': v.edqm?.code ?? '', 'Terme EDQM': v.edqm ? (v.edqm.fr ?? v.edqm.en) : '', 'Lien EDQM': v.edqm?.relation ?? '',
  'Fautes corrigées': v.fautes.join(' ; '), 'Mots inconnus': v.inconnus.join(' '), 'Correction proposée': '',
}))
const feuilleDosages = [...dosages].sort((a, b) => b[1].n - a[1].n).map(([k, { n, v }]) => ({
  'Dosage (nomenclature)': k.split('|')[0], 'Substances dans la DCI': Number(k.split('|')[1]), Fiches: n,
  'Libellé normalisé': v.libelle, 'Libellé arabe': v.libelle_ar ?? '', 'Clé de regroupement': v.cle, Identifiant: v.id,
  UCUM: v.quantites.map(q => q.ucum ?? `(${q.unite})`).join(' + ') + (v.denominateur ? ` / ${v.denominateur.ucum ?? `(${v.denominateur.unite})`}` : ''),
  Reconnu: v.reconnu ? 'oui' : 'NON', Alerte: v.alerte ?? '', 'Équivalence écartée': v.complement ?? '', 'Correction proposée': '',
}))

// Regroupements : une valeur normalisée qui rassemble plusieurs écritures d'origine
const regroupements: Record<string, string | number>[] = []
for (const [axe, brut, norm] of [
  ['forme', (p: (typeof P)[number]) => (p.forme ?? '').trim(), (p: (typeof P)[number]) => p.axes.forme],
  ['dosage', (p: (typeof P)[number]) => (p.dosage ?? '').trim(), (p: (typeof P)[number]) => p.axes.dosage],
] as const) {
  const m = new Map<string, Map<string, number>>()
  for (const p of P) {
    const k = norm(p); let e = m.get(k); if (!e) m.set(k, (e = new Map()))
    e.set(brut(p), (e.get(brut(p)) ?? 0) + 1)
  }
  for (const [id, ecritures] of m) {
    if (ecritures.size < 2) continue
    const lib = axe === 'forme' ? idx.libelles.forme.get(id)!.fr : [...ecritures].sort((a, b) => b[1] - a[1])[0][0]
    regroupements.push({
      Axe: axe, 'Valeur normalisée': lib, Identifiant: id, Écritures: ecritures.size,
      Fiches: [...ecritures.values()].reduce((a, b) => a + b, 0),
      'Écritures regroupées (fiches)': [...ecritures].sort((a, b) => b[1] - a[1]).map(([e, n]) => `${e || '(vide)'} (${n})`).join(' · '),
    })
  }
}
regroupements.sort((a, b) => (b.Fiches as number) - (a.Fiches as number))

const dciEcritures = new Map<string, Map<string, number>>()
for (const p of P) {
  let e = dciEcritures.get(p.axes.dci); if (!e) dciEcritures.set(p.axes.dci, (e = new Map()))
  const b = (p.dci ?? '').trim(); e.set(b, (e.get(b) ?? 0) + 1)
}
const feuilleDci = [...dciEcritures].filter(([, e]) => e.size > 1).map(([id, e]) => ({
  'DCI retenue': idx.libelles.dci.get(id)!.fr, Identifiant: id, Substances: idx.libelles.dci.get(id)!.fr.split(' + ').length,
  'Écritures fusionnées (fiches)': [...e].sort((a, b) => b[1] - a[1]).map(([d, n]) => `${d} (${n})`).join(' · '),
}))

// Standard Terms EDQM rencontrés : la feuille de relecture des traductions arabes
const edqmUtilises = new Map<string, { n: number; t: NonNullable<ReturnType<typeof edqmForme>>; exact: number }>()
for (const p of P) {
  const l = p.norm.forme.edqm
  const t = l && edqmForme(l.code)
  if (!l || !t) continue
  const e = edqmUtilises.get(l.code) ?? { n: 0, t, exact: 0 }
  e.n++; if (l.relation === 'exact') e.exact++
  edqmUtilises.set(l.code, e)
}
const feuilleEdqm = [...edqmUtilises.values()].sort((a, b) => b.n - a.n).map(({ n, t, exact }) => ({
  'Code EDQM': t.code, 'Terme anglais': t.en, 'Terme français': t.fr ?? '', 'Traduction arabe (DwaDZ)': t.ar ?? '',
  Relue: t.ar ? (t.ar_relu ? 'oui' : 'non') : '', Fiches: n, 'dont lien exact': exact, 'Arabe corrigé': '',
}))

// Anomalies de la nomenclature : ce qu'il faudrait corriger à la source, avec la valeur proposée
type Anomalie = { Type: string; Champ: string; 'Valeur dans la nomenclature': string; 'Correction proposée': string; Détail: string; Fiches: number; 'Exemples (marques)': string }
const anomalies = new Map<string, Anomalie & { ex: Set<string> }>()
const signaler = (type: string, champ: string, valeur: string, correction: string, detail: string, marque: string) => {
  const k = `${type}|${valeur}|${correction}`
  let a = anomalies.get(k)
  if (!a) anomalies.set(k, (a = { Type: type, Champ: champ, 'Valeur dans la nomenclature': valeur, 'Correction proposée': correction, Détail: detail, Fiches: 0, 'Exemples (marques)': '', ex: new Set() }))
  a.Fiches++
  if (a.ex.size < 4) a.ex.add(marque)
}
for (const p of P) {
  const f = p.norm.forme, d = p.norm.dosage, brutF = (p.forme ?? '').trim(), brutD = (p.dosage ?? '').trim(), brutDci = (p.dci ?? '').trim()
  if (f.fautes.length) signaler('Faute de frappe', 'forme', brutF, f.fr.toUpperCase(), f.fautes.join(' ; '), p.nom_marque)
  if (!f.reconnu) signaler('Forme non reconnue', 'forme', brutF, '', f.inconnus.length ? `mots inconnus : ${f.inconnus.join(' ')}` : 'forme de base absente', p.nom_marque)
  if (!brutF) signaler('Forme absente', 'forme', '(vide)', '', '', p.nom_marque)
  if (d.complement?.startsWith('valeur Excel')) signaler('Pourcentage converti en fraction par Excel', 'dosage', brutD, d.libelle, 'la cellule était au format pourcentage', p.nom_marque)
  if (!d.reconnu) signaler('Dosage non lisible', 'dosage', brutD, '', 'ni quantité ni unité reconnues', p.nom_marque)
  if (d.alerte) signaler('Dosage incohérent avec la DCI', 'dosage', brutD, '', `${d.alerte} — DCI : ${brutDci}`, p.nom_marque)
  if (/\*/.test(brutDci)) signaler('Astérisque de renvoi dans la DCI', 'dci', brutDci, p.norm.dci.libelle, '', p.nom_marque)
  if (/\s{2,}/.test(p.dci ?? '')) signaler('Espaces multiples dans la DCI', 'dci', p.dci ?? '', p.norm.dci.libelle, '', p.nom_marque)
}
for (const [id, e] of dciEcritures) {
  if (e.size < 2) continue
  const retenue = idx.libelles.dci.get(id)!.fr
  const variantes = [...e].sort((a, b) => b[1] - a[1])
  anomalies.set(`dci|${id}`, {
    Type: 'DCI écrite de plusieurs façons', Champ: 'dci', 'Valeur dans la nomenclature': variantes.map(([v, n]) => `${v} (${n})`).join(' · '),
    'Correction proposée': retenue, Détail: 'séparateur, ordre des substances ou ponctuation différents',
    Fiches: variantes.reduce((a, [, n]) => a + n, 0), 'Exemples (marques)': '', ex: new Set(),
  })
}
const ORDRE = ['Faute de frappe', 'Pourcentage converti en fraction par Excel', 'DCI écrite de plusieurs façons', 'Dosage incohérent avec la DCI', 'Astérisque de renvoi dans la DCI', 'Espaces multiples dans la DCI', 'Forme non reconnue', 'Dosage non lisible', 'Forme absente']
const feuilleAnomalies: Anomalie[] = [...anomalies.values()]
  .sort((a, b) => ORDRE.indexOf(a.Type) - ORDRE.indexOf(b.Type) || b.Fiches - a.Fiches)
  .map(({ ex, ...a }) => ({ ...a, 'Exemples (marques)': a['Exemples (marques)'] || [...ex].join(', ') }))

const nForme = P.filter(p => p.norm.forme.reconnu).length
const nEdqm = P.filter(p => p.norm.forme.edqm).length
const nEdqmExact = P.filter(p => p.norm.forme.edqm?.relation === 'exact').length
const nUcum = P.filter(p => p.norm.dosage.quantites.length && p.norm.dosage.quantites.every(q => q.ucum)).length
const nDosage = P.filter(p => p.norm.dosage.reconnu).length
const nVoie = P.filter(p => p.axes.voie !== 'autre').length
const nAlerte = P.filter(p => p.norm.dosage.alerte).length
const synthese = [
  { Indicateur: 'Fiches', Valeur: P.length },
  { Indicateur: 'Formes reconnues (fiches)', Valeur: `${nForme} (${pct(nForme, P.length)})` },
  { Indicateur: 'Écritures de forme distinctes → formes normalisées', Valeur: `${formes.size} → ${idx.libelles.forme.size}` },
  { Indicateur: 'Formes rattachées à un Standard Term EDQM (fiches)', Valeur: `${nEdqm} (${pct(nEdqm, P.length)}), dont ${nEdqmExact} en lien exact` },
  { Indicateur: 'Standard Terms EDQM distincts, dont traduits en arabe', Valeur: `${edqmUtilises.size}, dont ${[...edqmUtilises.values()].filter(e => e.t.ar).length}` },
  { Indicateur: 'Voie identifiée (fiches)', Valeur: `${nVoie} (${pct(nVoie, P.length)})` },
  { Indicateur: 'Dosages reconnus (fiches)', Valeur: `${nDosage} (${pct(nDosage, P.length)})` },
  { Indicateur: 'Écritures de dosage distinctes → dosages normalisés', Valeur: `${new Set(P.map(p => (p.dosage ?? '').trim())).size} → ${new Set(P.map(p => p.axes.dosage)).size}` },
  { Indicateur: 'Dosages entièrement codés en UCUM (fiches)', Valeur: `${nUcum} (${pct(nUcum, P.length)})` },
  { Indicateur: 'Dosages incohérents avec la DCI (fiches)', Valeur: nAlerte },
  { Indicateur: 'Anomalies à corriger dans la nomenclature (lignes de la feuille)', Valeur: feuilleAnomalies.length },
  { Indicateur: 'DCI distinctes (après fusion)', Valeur: idx.libelles.dci.size },
]

const out = arg('--out') ?? 'data/guide/audit_normalisation.xlsx'
mkdirSync(dirname(out), { recursive: true })
const wb = XLSX.utils.book_new()
XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(synthese), 'Synthèse')
XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(feuilleAnomalies), 'Anomalies')
XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(feuilleFormes), 'Formes')
XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(feuilleDosages), 'Dosages')
XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(regroupements), 'Regroupements')
XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(feuilleDci), 'DCI')
XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(feuilleEdqm), 'EDQM (arabe à relire)')
XLSX.writeFile(wb, out)

for (const s of synthese) console.log(`${s.Indicateur.padEnd(56)} ${s.Valeur}`)
const top = (rows: Record<string, unknown>[], ok: string) => rows.filter(r => r[ok] === 'NON').slice(0, 25)
console.log('\nFormes non reconnues les plus fréquentes :')
for (const r of top(feuilleFormes, 'Reconnue')) console.log(`  ${String(r.Fiches).padStart(4)}  ${r['Forme (nomenclature)']}   [${r['Mots inconnus']}]`)
console.log('\nDosages non reconnus les plus fréquents :')
for (const r of top(feuilleDosages, 'Reconnu')) console.log(`  ${String(r.Fiches).padStart(4)}  ${r['Dosage (nomenclature)']}`)
console.log(`\nClasseur : ${out}`)
