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
 *   - « DCI »      : les DCI fusionnées (ordre des substances différent, séparateurs différents).
 * Affiche aussi le taux de reconnaissance pondéré par le nombre de fiches.
 */
import { mkdirSync, readFileSync } from 'node:fs'
import { dirname } from 'node:path'
import * as XLSX from 'xlsx'
import { construireIndex, voieParId, type LigneNomenclature } from '../lib/guide-core.ts'

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
  'Mots inconnus': v.inconnus.join(' '), 'Correction proposée': '',
}))
const feuilleDosages = [...dosages].sort((a, b) => b[1].n - a[1].n).map(([k, { n, v }]) => ({
  'Dosage (nomenclature)': k.split('|')[0], 'Substances dans la DCI': Number(k.split('|')[1]), Fiches: n,
  'Libellé normalisé': v.libelle, 'Clé de regroupement': v.cle, Identifiant: v.id,
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

const nForme = P.filter(p => p.norm.forme.reconnu).length
const nDosage = P.filter(p => p.norm.dosage.reconnu).length
const nVoie = P.filter(p => p.axes.voie !== 'autre').length
const nAlerte = P.filter(p => p.norm.dosage.alerte).length
const synthese = [
  { Indicateur: 'Fiches', Valeur: P.length },
  { Indicateur: 'Formes reconnues (fiches)', Valeur: `${nForme} (${pct(nForme, P.length)})` },
  { Indicateur: 'Écritures de forme distinctes → formes normalisées', Valeur: `${formes.size} → ${idx.libelles.forme.size}` },
  { Indicateur: 'Voie identifiée (fiches)', Valeur: `${nVoie} (${pct(nVoie, P.length)})` },
  { Indicateur: 'Dosages reconnus (fiches)', Valeur: `${nDosage} (${pct(nDosage, P.length)})` },
  { Indicateur: 'Écritures de dosage distinctes → dosages normalisés', Valeur: `${new Set(P.map(p => (p.dosage ?? '').trim())).size} → ${idx.libelles.dosage.size}` },
  { Indicateur: 'Dosages incohérents avec la DCI (fiches)', Valeur: nAlerte },
  { Indicateur: 'DCI distinctes (après fusion)', Valeur: idx.libelles.dci.size },
]

const out = arg('--out') ?? 'data/guide/audit_normalisation.xlsx'
mkdirSync(dirname(out), { recursive: true })
const wb = XLSX.utils.book_new()
XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(synthese), 'Synthèse')
XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(feuilleFormes), 'Formes')
XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(feuilleDosages), 'Dosages')
XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(regroupements), 'Regroupements')
XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(feuilleDci), 'DCI')
XLSX.writeFile(wb, out)

for (const s of synthese) console.log(`${s.Indicateur.padEnd(56)} ${s.Valeur}`)
const top = (rows: Record<string, unknown>[], ok: string) => rows.filter(r => r[ok] === 'NON').slice(0, 25)
console.log('\nFormes non reconnues les plus fréquentes :')
for (const r of top(feuilleFormes, 'Reconnue')) console.log(`  ${String(r.Fiches).padStart(4)}  ${r['Forme (nomenclature)']}   [${r['Mots inconnus']}]`)
console.log('\nDosages non reconnus les plus fréquents :')
for (const r of top(feuilleDosages, 'Reconnu')) console.log(`  ${String(r.Fiches).padStart(4)}  ${r['Dosage (nomenclature)']}`)
console.log(`\nClasseur : ${out}`)
