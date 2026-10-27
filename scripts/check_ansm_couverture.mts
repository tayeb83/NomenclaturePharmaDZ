/**
 * Mesure le rapprochement entre les DCI de la nomenclature et le Thesaurus ANSM, sans rien écrire.
 *
 *   DATABASE_URL=... npx tsx scripts/check_ansm_couverture.mts                 # DCI de la table enregistrements
 *   npx tsx scripts/check_ansm_couverture.mts --fixture scripts/fixtures/nomenclature_synthetique.json
 *
 * Affiche le nombre de fiches reliées et, pour revue, les DCI les plus fréquentes qui ne le sont pas
 * (la plupart n'ont tout simplement pas d'interaction dans le thésaurus : à vous de repérer les écarts de nom).
 */
import { readFileSync } from 'node:fs'
import { buildThesaurusIndex, cle, resoudreDci, type ClasseLien } from '../lib/interactions-core.ts'

const data = JSON.parse(readFileSync(new URL('../data/ansm/interactions_fr.json', import.meta.url), 'utf8'))
const titres: string[] = data.substances.map((s: { nom: string }) => s.nom)
const parCle = new Map(titres.map(t => [cle(t), t]))
const liens: ClasseLien[] = []
for (const s of data.substances) {
  for (const m of s.membres ?? []) liens.push({ classe: s.nom, membre: m })
  for (const v of s.voir_aussi) liens.push({ classe: parCle.get(cle(v)) ?? v, membre: s.nom })
}
const index = buildThesaurusIndex(titres, liens)
const avecInteractions = new Set(data.interactions.map((i: { substance: string }) => i.substance))

async function dcis(): Promise<{ dci: string; n: number }[]> {
  const i = process.argv.indexOf('--fixture')
  if (i > 0) {
    const f = JSON.parse(readFileSync(process.argv[i + 1], 'utf8'))
    const n = new Map<string, number>()
    for (const e of f.enregistrements) if (e.dci) n.set(e.dci.trim(), (n.get(e.dci.trim()) ?? 0) + 1)
    return [...n].map(([dci, n]) => ({ dci, n }))
  }
  const { default: pg } = await import('pg')
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
  try {
    const r = await pool.query(`SELECT btrim(dci) AS dci, COUNT(*)::int AS n FROM enregistrements WHERE dci IS NOT NULL AND btrim(dci) <> '' GROUP BY 1`)
    return r.rows
  } finally { await pool.end() }
}

const rows = await dcis()
let fiches = 0, reliees = 0, avec = 0
const non: { dci: string; n: number }[] = []
for (const { dci, n } of rows) {
  fiches += n
  const r = resoudreDci(index, dci)
  const noms = [...r.titres, ...r.classes]
  if (noms.length) reliees += n
  else non.push({ dci, n })
  if (noms.some(x => avecInteractions.has(x))) avec += n
}
console.log(`${rows.length} DCI, ${fiches} fiches`)
console.log(`reliées au thésaurus : ${reliees} fiches (${Math.round((100 * reliees) / fiches)} %), dont ${avec} avec au moins une interaction`)
console.log('DCI non reliées les plus fréquentes :')
for (const x of non.sort((a, b) => b.n - a.n).slice(0, 40)) console.log(`  ${String(x.n).padStart(4)}  ${x.dci}`)
