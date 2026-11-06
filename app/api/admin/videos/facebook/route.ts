import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/admin-auth'
import { postFacebookVideo } from '@/lib/social'
import { facebookCaption, getVideoAdmin, markFacebookPublished } from '@/lib/videos'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://www.dzair-pharma.net'

/** Publie une vidéo déjà publiée sur le site vers la Page Facebook (une seule fois sauf ?force=1). */
export async function POST(request: NextRequest) {
  if (!checkAdminAuth(request)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const body: any = await request.json().catch(() => ({}))
  const v = body?.id ? await getVideoAdmin(Number(body.id)) : null
  if (!v) return NextResponse.json({ error: 'Vidéo introuvable' }, { status: 404 })
  if (v.statut !== 'publie' || !v.video_url) return NextResponse.json({ error: 'Publiez d’abord la vidéo sur le site.' }, { status: 400 })
  if (v.fb_post_id && !body?.force) return NextResponse.json({ error: 'Déjà publiée sur Facebook.' }, { status: 409 })
  const caption = typeof body?.caption === 'string' && body.caption.trim() ? body.caption.trim() : facebookCaption(v, APP_URL)
  const res = await postFacebookVideo(v.video_url, caption, v.titre_ar)
  if (!res.success || !res.postId) return NextResponse.json({ error: res.error || 'Facebook a refusé la vidéo' }, { status: 502 })
  await markFacebookPublished(v.id, res.postId)
  return NextResponse.json({ ok: true, postId: res.postId })
}
