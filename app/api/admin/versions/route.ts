import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/admin-auth'
import { query } from '@/lib/db'

export async function GET(req: NextRequest) {
  if (!checkAdminAuth(req)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
    const versions = await query(`
      SELECT
        id,
        version_label,
        reference_date,
        previous_label,
        total_enregistrements,
        total_nouveautes,
        COALESCE(total_retraits, 0)       AS total_retraits,
        COALESCE(total_non_renouveles, 0) AS total_non_renouveles,
        COALESCE(removed_count, 0)        AS removed_count,
        uploaded_file,
        created_at
      FROM nomenclature_versions
      ORDER BY reference_date DESC NULLS LAST, created_at DESC
    `)

    return NextResponse.json({ versions })
  } catch (err) {
    console.error('Admin versions error:', err)
    return NextResponse.json({ error: 'Erreur base de données' }, { status: 500 })
  }
}
