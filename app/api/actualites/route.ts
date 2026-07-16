import { NextRequest, NextResponse } from 'next/server'
import { query, queryOne } from '@/lib/db'

const PAGE_SIZE_DEFAULT = 20
const PAGE_SIZE_MAX = 50

// 'prix' n'a volontairement aucune branche : le fichier nomenclature MIPH
// ingéré (scripts/ingest_to_supabase.py) ne contient aucune colonne prix ni
// remboursement CNAS. Tant qu'une source de données fiable n'est pas
// intégrée, ce type renvoie toujours une liste vide plutôt que d'inventer
// une valeur — voir README pour les pistes envisagées.
const SUPPORTED_TYPES = ['amm', 'retrait'] as const
type SupportedType = (typeof SUPPORTED_TYPES)[number]

async function hasTable(tableName: string): Promise<boolean> {
  const row = await queryOne<{ exists: boolean }>(
    `SELECT EXISTS (
       SELECT 1 FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = $1
     ) AS exists`,
    [tableName]
  )
  return row?.exists ?? false
}

async function hasColumn(tableName: string, columnName: string): Promise<boolean> {
  const row = await queryOne<{ exists: boolean }>(
    `SELECT EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2
     ) AS exists`,
    [tableName, columnName]
  )
  return row?.exists ?? false
}

function emptyResult(page: number, limit: number) {
  return NextResponse.json({
    data: [],
    pagination: { page, limit, total: 0, totalPages: 0, hasNext: false, hasPrev: false },
  })
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)

  const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
  const limit = Math.min(PAGE_SIZE_MAX, Math.max(1, parseInt(searchParams.get('limit') || String(PAGE_SIZE_DEFAULT))))
  const offset = (page - 1) * limit
  const typeParam = searchParams.get('type') || ''

  if (typeParam && !SUPPORTED_TYPES.includes(typeParam as SupportedType)) {
    return emptyResult(page, limit)
  }

  try {
    const branches: string[] = []

    if ((!typeParam || typeParam === 'retrait') && (await hasTable('retraits'))) {
      branches.push(`
        SELECT 'retrait'::text AS type, nom_marque, dci, dosage, labo, n_enreg,
               motif_retrait AS summary,
               date_retrait::timestamptz AS published_at
        FROM retraits
        WHERE date_retrait IS NOT NULL
      `)
    }

    if ((!typeParam || typeParam === 'amm') && (await hasColumn('enregistrements', 'is_new_vs_previous'))) {
      // La table `enregistrements` est retruncatée à chaque ingestion (voir
      // scripts/ingest_to_supabase.py) : seule la dernière version importée
      // est présente, donc "nouveautés" = le batch le plus récent, daté de
      // la reference_date de cette version.
      branches.push(`
        SELECT 'amm'::text AS type, nom_marque, dci, dosage, labo, n_enreg,
               NULL::text AS summary,
               (SELECT reference_date FROM nomenclature_versions
                  ORDER BY reference_date DESC NULLS LAST, created_at DESC LIMIT 1)::timestamptz AS published_at
        FROM enregistrements
        WHERE is_new_vs_previous = TRUE
      `)
    }

    if (branches.length === 0) {
      return emptyResult(page, limit)
    }

    const unionSql = branches.join(' UNION ALL ')

    const [countRow, rows] = await Promise.all([
      queryOne<{ total: string }>(`SELECT COUNT(*) AS total FROM (${unionSql}) feed`),
      query<{
        type: SupportedType
        nom_marque: string | null
        dci: string | null
        dosage: string | null
        labo: string | null
        n_enreg: string | null
        summary: string | null
        published_at: string | null
      }>(
        `SELECT * FROM (${unionSql}) feed
         ORDER BY published_at DESC NULLS LAST, nom_marque ASC
         LIMIT $1 OFFSET $2`,
        [limit, offset]
      ),
    ])

    const total = parseInt(countRow?.total || '0', 10)
    const totalPages = total > 0 ? Math.ceil(total / limit) : 0

    const data = rows.map(r => ({
      type: r.type,
      title: r.nom_marque || r.dci,
      summary: r.type === 'retrait'
        ? (r.summary || null)
        : ([r.dci, r.dosage, r.labo].filter(Boolean).join(' · ') || null),
      published_at: r.published_at,
      dci: r.dci,
      nom_marque: r.nom_marque,
      n_enreg: r.n_enreg,
    }))

    return NextResponse.json({
      data,
      pagination: { page, limit, total, totalPages, hasNext: page < totalPages, hasPrev: page > 1 },
    }, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
    })
  } catch (err: any) {
    console.error('Actualites API error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
