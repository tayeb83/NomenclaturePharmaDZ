/**
 * Écarts entre les interactions citées par les RCP de l'ANPP et le Thesaurus ANSM.
 * Ne publie rien : produit un rapport, et avec --apply remplit interactions_candidates (sql/42).
 *
 *   # depuis la base (rcp_faits, rcp_dci, rcp_documents) — essai à blanc, rapport seulement
 *   DATABASE_URL=... npx tsx scripts/ddi_gap_rcp.mts --db --out ddi_gap
 *   # idem, et écrit les candidats
 *   DATABASE_URL=... npx tsx scripts/ddi_gap_rcp.mts --db --out ddi_gap --apply
 *   # depuis les brouillons de extract_rcp_faits.py, sans base (rcp_id → DCI à fournir)
 *   npx tsx scripts/ddi_gap_rcp.mts --faits faits_brouillon.json --dci-map rcp_dci.json --out ddi_gap
 *
 * Faits pris en compte : type 'interaction', hors rejetés (--publies pour ne garder que les relus).
 * Sorties (dans --out) : candidats.csv (à relire, par score), bilan.json, non_resolues.csv
 * (partenaires qu'on n'a pas su identifier : à rapprocher, pas des absences).
 * Un nouveau passage met à jour le score et les preuves mais ne touche jamais à la décision d'un relecteur.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { buildThesaurusIndex, cle, type ClasseLien } from '../lib/interactions-core.ts'
import {
  bilan, buildGapContext, comparerFait, type Candidat, type Constat, type FaitRcp, type Gravite,
} from '../lib/interactions-gap-core.ts'

const arg = (nom: string): string | null => {
  const i = process.argv.indexOf(nom)
  return i > 0 ? process.argv[i + 1] ?? null : null
}
const has = (nom: string) => process.argv.includes(nom)

// ─── Thésaurus ANSM (mêmes liens que scripts/import_ansm_interactions.py) ─────
const data = JSON.parse(readFileSync(new URL('../data/ansm/interactions_fr.json', import.meta.url), 'utf8'))
const titres: string[] = data.substances.map((s: { nom: string }) => s.nom)
const parCle = new Map(titres.map(t => [cle(t), t]))
const liens: ClasseLien[] = []
for (const s of data.substances) {
  for (const m of s.membres ?? []) liens.push({ classe: s.nom, membre: m })
  for (const v of s.voir_aussi) liens.push({ classe: parCle.get(cle(v)) ?? v, membre: s.nom })
}
const ctx = buildGapContext(
  buildThesaurusIndex(titres, liens),
  data.interactions.map((i: { substance: string; partenaire: string; niveau: never }) => ({ substance: i.substance, partenaire: i.partenaire, niveau: i.niveau })),
)

// ─── Faits des RCP ───────────────────────────────────────────────────────────
type Pool = { query: (sql: string, p?: unknown[]) => Promise<{ rows: any[] }>; connect: () => Promise<any>; end: () => Promise<void> }

async function connecter(): Promise<Pool> {
  const { default: pg } = await import('pg')
  return new pg.Pool({ connectionString: process.env.DATABASE_URL }) as unknown as Pool
}

async function faitsDepuisBase(pool: Pool, publiesSeulement: boolean): Promise<FaitRcp[]> {
  const r = await pool.query(
    `SELECT f.rcp_id::text AS rcp_id, d.dci, f.libelle, f.cible_type, f.cible, f.gravite, f.section, f.page,
            doc.version_texte, f.contexte
       FROM rcp_faits f
       JOIN rcp_documents doc ON doc.rcp_id = f.rcp_id AND NOT doc.retire
       JOIN (SELECT rcp_id, string_agg(DISTINCT dci, ' + ') AS dci FROM rcp_dci GROUP BY rcp_id) d ON d.rcp_id = f.rcp_id
      WHERE f.type = 'interaction' AND f.status ${publiesSeulement ? `= 'publie'` : `<> 'rejete'`}`)
  return r.rows.map(x => ({ ...x, gravite: (x.gravite ?? 'non_precisee') as Gravite }))
}

function faitsDepuisFichier(fichier: string, dciMap: Record<string, string>): FaitRcp[] {
  const out: FaitRcp[] = []
  for (const r of JSON.parse(readFileSync(fichier, 'utf8')) as { rcp_id: string; version_texte?: string | null; faits: any[] }[]) {
    const dci = dciMap[r.rcp_id]
    if (!dci) continue
    for (const f of r.faits) {
      if (f.type !== 'interaction') continue
      out.push({
        rcp_id: r.rcp_id, dci, libelle: f.libelle, cible_type: f.cible_type ?? null, cible: f.cible ?? null,
        gravite: f.gravite ?? 'non_precisee', section: f.section, page: f.page, version_texte: r.version_texte ?? null, contexte: f.contexte ?? null,
      })
    }
  }
  return out
}

// ─── Sorties ─────────────────────────────────────────────────────────────────
const csv = (lignes: (string | number | null)[][]): string =>
  lignes.map(l => l.map(v => {
    const s = v == null ? '' : String(v)
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }).join(';')).join('\n') + '\n'

function ecrireRapport(dossier: string, b: ReturnType<typeof bilan>, constats: Constat[]): void {
  mkdirSync(dossier, { recursive: true })
  writeFileSync(`${dossier}/candidats.csv`, csv([
    ['score', 'ecart', 'substance_a', 'substance_b', 'gravite_source', 'niveau_ansm', 'sens', 'n_rcp', 'hors_thesaurus', 'deja_dans_ansm_via', 'rcp_exemple', 'section', 'page'],
    ...b.candidats.map(c => [
      c.score, c.ecart, c.substance_a, c.substance_b, c.gravite_source, c.niveau_ansm, c.sens, c.n_rcp,
      [c.a_hors_thesaurus ? c.substance_a : '', c.b_hors_thesaurus ? c.substance_b : ''].filter(Boolean).join(' / '),
      c.via.join(' ; '), c.preuves[0].rcp_id, c.preuves[0].section, c.preuves[0].page,
    ]),
  ]))
  const nr = new Map<string, { libelle: string; n: number }>()
  for (const c of constats.filter(c => c.ecart === 'non_resolue')) {
    const k = cle(c.b)
    nr.set(k, { libelle: c.b, n: (nr.get(k)?.n ?? 0) + 1 })
  }
  writeFileSync(`${dossier}/non_resolues.csv`, csv([
    ['partenaire_cite', 'occurrences'],
    ...[...nr.values()].sort((x, y) => y.n - x.n).map(v => [v.libelle, v.n]),
  ]))
  writeFileSync(`${dossier}/bilan.json`, JSON.stringify({ faits: b.faits, paires: b.paires, candidats: b.candidats.length }, null, 1))
}

async function appliquer(pool: Pool, candidats: Candidat[]): Promise<void> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    for (const c of candidats) {
      const r = await client.query(
        `INSERT INTO interactions_candidates
           (paire_key, substance_a, substance_b, ecart, gravite_source, niveau_ansm, sens, via, a_hors_thesaurus, b_hors_thesaurus, n_sources, score)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
         ON CONFLICT (paire_key) DO UPDATE SET
           ecart = EXCLUDED.ecart, gravite_source = EXCLUDED.gravite_source, niveau_ansm = EXCLUDED.niveau_ansm,
           sens = EXCLUDED.sens, via = EXCLUDED.via, a_hors_thesaurus = EXCLUDED.a_hors_thesaurus,
           b_hors_thesaurus = EXCLUDED.b_hors_thesaurus, n_sources = EXCLUDED.n_sources, score = EXCLUDED.score,
           last_seen = NOW(), updated_at = NOW()
         RETURNING id`,
        [c.paire_key, c.substance_a, c.substance_b, c.ecart, c.gravite_source, c.niveau_ansm, c.sens, c.via,
         c.a_hors_thesaurus, c.b_hors_thesaurus, c.n_rcp, c.score])
      const id = r.rows[0].id
      for (const p of c.preuves) {
        await client.query(
          `INSERT INTO interactions_evidence (candidate_id, source_id, ref, section, page, version, gravite, contexte)
           VALUES ($1,'anpp_rcp',$2,$3,$4,$5,$6,$7)
           ON CONFLICT (candidate_id, source_id, ref, section) DO UPDATE SET
             page = EXCLUDED.page, version = EXCLUDED.version, gravite = EXCLUDED.gravite, contexte = EXCLUDED.contexte, fetched_at = NOW()`,
          [id, p.rcp_id, p.section ?? '', p.page, p.version_texte, p.gravite, p.contexte])
      }
    }
    await client.query('COMMIT')
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
  }
}

// ─── Exécution ───────────────────────────────────────────────────────────────
const dossier = arg('--out') ?? 'ddi_gap'
const apply = has('--apply')
let pool: Pool | null = null
let faits: FaitRcp[]
if (has('--db')) {
  pool = await connecter()
  faits = await faitsDepuisBase(pool, has('--publies'))
} else if (arg('--faits')) {
  const dciMap = JSON.parse(readFileSync(arg('--dci-map') ?? '', 'utf8')) as Record<string, string>
  faits = faitsDepuisFichier(arg('--faits')!, dciMap)
  if (apply) throw new Error('--apply demande --db')
} else {
  console.error('Usage : --db  ou  --faits <faits_brouillon.json> --dci-map <rcp_id→DCI.json>  [--out dossier] [--apply] [--publies]')
  process.exit(2)
}

try {
  const constats = faits.flatMap(f => comparerFait(ctx, f))
  const b = bilan(constats)
  ecrireRapport(dossier, b, constats)
  const n = (e: keyof typeof b.faits) => `${b.faits[e]} faits / ${b.paires[e]} paires`
  console.log(`${faits.length} faits « interaction » lus dans ${new Set(faits.map(f => f.rcp_id)).size} RCP`)
  console.log(`  couvertes directement : ${n('couverte_directe')}`)
  console.log(`  couvertes par classe  : ${n('couverte_classe')}`)
  console.log(`  divergence de niveau  : ${n('divergence_niveau')}`)
  console.log(`  absentes de l'ANSM    : ${n('absente')}`)
  console.log(`  partenaire non résolu : ${n('non_resolue')}  (à rapprocher, pas des absences)`)
  const div = b.candidats.filter(c => c.ecart === 'divergence_niveau')
  const abs = b.candidats.filter(c => c.ecart === 'absente')
  console.log(`  dont divergences : ${div.filter(c => c.sens === 'source_plus_grave').length} paires où le RCP est plus sévère, ${div.filter(c => c.sens === 'source_moins_grave').length} où il l'est moins`)
  console.log(`  dont absentes    : ${abs.filter(c => c.a_hors_thesaurus || c.b_hors_thesaurus).length} avec une substance hors thésaurus, ${abs.filter(c => !c.a_hors_thesaurus && !c.b_hors_thesaurus).length} entre deux substances que l'ANSM traite`)
  const types = constats.filter(c => c.ecart === 'non_resolue')
  console.log(`  non résolus      : ${types.filter(c => c.fait.cible_type === 'classe').length} faits visent une classe ATC, ${types.filter(c => c.fait.cible_type !== 'classe').length} un nom inconnu`)
  console.log(`${b.candidats.length} candidats → ${dossier}/candidats.csv`)
  if (apply) {
    await appliquer(pool!, b.candidats)
    console.log(`${b.candidats.length} candidats écrits dans interactions_candidates.`)
  } else {
    console.log('Essai à blanc : rien n\'a été écrit en base.' + (pool ? ' Ajoutez --apply pour enregistrer les candidats.' : ''))
  }
} finally {
  await pool?.end()
}
