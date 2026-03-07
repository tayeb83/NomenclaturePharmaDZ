import { NextRequest, NextResponse } from 'next/server'
import { query, queryOne } from '@/lib/db'
import type { Enregistrement } from '@/lib/db'

const PAGE_SIZE_DEFAULT = 50
const PAGE_SIZE_MAX = 100

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)

  const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
  const limit = Math.min(PAGE_SIZE_MAX, Math.max(1, parseInt(searchParams.get('limit') || String(PAGE_SIZE_DEFAULT))))
  const offset = (page - 1) * limit

  // Filtres optionnels
  const type_prod = searchParams.get('type_prod') || ''   // GE, I, RE, BIO…
  const statut = searchParams.get('statut') || ''          // F, I
  const pays = searchParams.get('pays') || ''
  const annee = searchParams.get('annee') || ''

  // Construction des clauses WHERE dynamiques
  const conditions: string[] = []
  const params: (string | number)[] = []
  let idx = 1

  if (type_prod) {
    conditions.push(`type_prod ILIKE $${idx++}`)
    params.push(type_prod)
  }
  if (statut) {
    conditions.push(`statut = $${idx++}`)
    params.push(statut)
  }
  if (pays) {
    conditions.push(`pays ILIKE $${idx++}`)
    params.push(`%${pays}%`)
  }
  if (annee) {
    const anneeNum = parseInt(annee)
    if (!isNaN(anneeNum)) {
      conditions.push(`annee = $${idx++}`)
      params.push(anneeNum)
    }
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  try {
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

    const total = parseInt(countRow?.total || '0')
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
      filters: { type_prod: type_prod || null, statut: statut || null, pays: pays || null, annee: annee || null },
    }, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' }
    })
  } catch (err: any) {
    console.error('Medicaments API error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
