import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/admin-auth'
import { getTrends } from '@/lib/acces'

export async function GET(request: NextRequest) {
  if (!checkAdminAuth(request)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }
  try {
    const months = Number(new URL(request.url).searchParams.get('months') ?? '1')
    return NextResponse.json(await getTrends(months))
  } catch (err) {
    console.error('Admin acces GET error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
