import { NextRequest, NextResponse } from 'next/server'
import { query, queryOne } from '@/lib/db'
import type { Enregistrement } from '@/lib/db'

const PAGE_SIZE_DEFAULT = 50
const PAGE_SIZE_MAX = 100

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

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)

  const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
  const limit = Math.min(PAGE_SIZE_MAX, Math.max(1, parseInt(searchParams.get('limit') || String(PAGE_SIZE_DEFAULT))))
  const offset = (page - 1) * limit

  const type_prod = searchParams.get('type_prod') || ''
  const statut = searchParams.get('statut') || ''
  const pays = searchParams.get('pays') || ''
  const annee = searchParams.get('annee') || ''
  const mode = searchParams.get('mode') || 'all' // all | new | removed
  const removedYear = searchParams.get('removed_year') || ''

  const conditions: string[] = []
  const params: (string | number)[] = []
  let idx = 1

  if (mode !== 'removed' && type_prod) {
    conditions.push(`type_prod ILIKE $${idx++}`)
    params.push(type_prod)
  }
  if (mode !== 'removed' && statut) {
    conditions.push(`statut = $${idx++}`)
    params.push(statut)
  }
  if (mode !== 'removed' && pays) {
    conditions.push(`pays ILIKE $${idx++}`)
    params.push(`%${pays}%`)
  }
  if (mode !== 'removed' && annee) {
    const anneeNum = parseInt(annee, 10)
    if (!isNaN(anneeNum)) {
      conditions.push(`annee = $${idx++}`)
      params.push(anneeNum)
    }
  }

  if (mode === 'new') {
    const hasNewFlag = await hasColumn('enregistrements', 'is_new_vs_previous')
    const hasSourceVersion = await hasColumn('enregistrements', 'source_version')

    if (hasNewFlag) {
      if (hasSourceVersion && await hasTable('nomenclature_versions')) {
        const latestVersion = await queryOne<{ version_label: string }>(`
          SELECT version_label
          FROM nomenclature_versions
          ORDER BY reference_date DESC NULLS LAST, created_at DESC
          LIMIT 1
        `)

        if (latestVersion?.version_label) {
          conditions.push(`is_new_vs_previous = TRUE AND source_version = $${idx++}`)
          params.push(latestVersion.version_label)
        } else {
          conditions.push(`is_new_vs_previous = TRUE`)
        }
      } else {
        conditions.push(`is_new_vs_previous = TRUE`)
      }
    } else {
      conditions.push(`FALSE`)
    }
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  try {
    if (mode === 'removed') {
      const removedTableExists = await hasTable('version_removed_drugs')
      if (!removedTableExists) {
        return NextResponse.json({
          data: [],
          pagination: { page, limit, total: 0, totalPages: 0, hasNext: false, hasPrev: false },
          filters: { mode, removed_year: removedYear || null },
          meta: { availableRemovedYears: [] },
        })
      }

      const hasVersionsTable = await hasTable('nomenclature_versions')
      const yearExpr = hasVersionsTable
        ? `COALESCE(EXTRACT(YEAR FROM nv.reference_date)::INT, NULLIF(SUBSTRING(vrd.version_label FROM '(20\\d{2})'), '')::INT)`
        : `NULLIF(SUBSTRING(vrd.version_label FROM '(20\\d{2})'), '')::INT`
      const versionJoin = hasVersionsTable
        ? 'LEFT JOIN nomenclature_versions nv ON nv.version_label = vrd.version_label'
        : ''

      const yearsRows = await query<{ year: number | null }>(`
        SELECT DISTINCT ${yearExpr} AS year
        FROM version_removed_drugs vrd
        ${versionJoin}
        ORDER BY year DESC NULLS LAST
      `)
      const availableRemovedYears = yearsRows
        .map(r => r.year)
        .filter((year): year is number => year !== null)

      const removedConditions: string[] = []
      const removedParams: (string | number)[] = []
      let removedIdx = 1

      if (removedYear) {
        const yearNum = parseInt(removedYear, 10)
        if (!isNaN(yearNum)) {
          removedConditions.push(`${yearExpr} = $${removedIdx++}`)
          removedParams.push(yearNum)
        }
      }

      const removedWhere = removedConditions.length ? `WHERE ${removedConditions.join(' AND ')}` : ''

      const [countRow, rows] = await Promise.all([
        queryOne<{ total: string }>(`
          SELECT COUNT(*) AS total
          FROM version_removed_drugs vrd
          ${versionJoin}
          ${removedWhere}
        `, removedParams),
        query<any>(`
          SELECT vrd.id, vrd.n_enreg, vrd.dci, vrd.nom_marque, vrd.forme, vrd.dosage, vrd.labo, vrd.pays, vrd.type_prod, vrd.statut,
                 ${yearExpr} AS retrait_annee,
                 vrd.version_label
          FROM version_removed_drugs vrd
          ${versionJoin}
          ${removedWhere}
          ORDER BY retrait_annee DESC NULLS LAST, vrd.nom_marque ASC, vrd.dci ASC
          LIMIT $${removedIdx++} OFFSET $${removedIdx++}
        `, [...removedParams, limit, offset]),
      ])

      const total = parseInt(countRow?.total || '0', 10)
      const totalPages = total > 0 ? Math.ceil(total / limit) : 0

      return NextResponse.json({
        data: rows,
        pagination: { page, limit, total, totalPages, hasNext: page < totalPages, hasPrev: page > 1 },
        filters: { mode, removed_year: removedYear || null },
        meta: { availableRemovedYears },
      })
    }

    const [countRow, rows] = await Promise.all([
      queryOne<{ total: string }>(`SELECT COUNT(*) AS total FROM enregistrements ${whereClause}`, params),
      query<Enregistrement>(
        `SELECT id, n_enreg, dci, nom_marque, forme, dosage, labo, pays, type_prod, statut, annee, date_init, date_final
         FROM enregistrements
         ${whereClause}
         ORDER BY nom_marque ASC, dci ASC
         LIMIT $${idx++} OFFSET $${idx++}`,
        [...params, limit, offset]
      ),
    ])

    const total = parseInt(countRow?.total || '0', 10)
    const totalPages = Math.ceil(total / limit)

    return NextResponse.json({
      data: rows,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
      filters: { mode, type_prod: type_prod || null, statut: statut || null, pays: pays || null, annee: annee || null },
    }, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' }
    })
  } catch (err: any) {
    console.error('Medicaments API error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
