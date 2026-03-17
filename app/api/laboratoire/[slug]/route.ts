import { NextResponse } from 'next/server'
import {
  getLaboNameBySlug,
  getLaboStats,
  getLaboNouveautesByYear,
  getLaboPortfolioDCI,
  getLaboLocalImporte,
  getLaboProducts,
} from '@/lib/queries'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: Request,
  { params }: { params: { slug: string } }
) {
  const { slug } = params

  try {
    const laboName = await getLaboNameBySlug(slug)
    if (!laboName) {
      return NextResponse.json({ error: 'Laboratoire introuvable' }, { status: 404 })
    }

    const [stats, nouveautesByYear, portfolioDci, localImporte, products] = await Promise.all([
      getLaboStats(laboName),
      getLaboNouveautesByYear(laboName),
      getLaboPortfolioDCI(laboName, 30),
      getLaboLocalImporte(laboName),
      getLaboProducts(laboName, 1000, 0),
    ])

    return NextResponse.json({
      labo: laboName,
      slug,
      stats,
      nouveautesByYear,
      portfolioDci,
      localImporte,
      products,
    }, {
      headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200' },
    })
  } catch (err) {
    console.error(`[API /laboratoire/${slug}]`, err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
