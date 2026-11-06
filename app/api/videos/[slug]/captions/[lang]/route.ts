import { NextResponse } from 'next/server'
import { getPublishedCaption } from '@/lib/videos'

export const dynamic = 'force-dynamic'

/** Sous-titres WebVTT d'une vidéo publiée, servis depuis le même domaine que la page. */
export async function GET(_req: Request, { params }: { params: { slug: string; lang: string } }) {
  if (params.lang !== 'ar' && params.lang !== 'fr') return new NextResponse('Not found', { status: 404 })
  const vtt = await getPublishedCaption(params.slug, params.lang)
  if (!vtt) return new NextResponse('Not found', { status: 404 })
  return new NextResponse(vtt, {
    headers: { 'Content-Type': 'text/vtt; charset=utf-8', 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' },
  })
}
