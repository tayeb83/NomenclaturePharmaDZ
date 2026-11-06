import { NextRequest, NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { checkAdminAuth } from '@/lib/admin-auth'
import { VIDEOS_TAG, deleteVideo, getVideoAdmin, listVideosAdmin, saveVideo, validateVideo } from '@/lib/videos'

const noAuth = () => NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
const tableHint = (err: any) =>
  err?.code === '42P01' ? NextResponse.json({ error: 'Table absente : appliquez sql/37_videos.sql', tableMissing: true }, { status: 500 }) : null

/** Sans paramètre : liste. Avec ?id= : une vidéo complète (sous-titres compris). */
export async function GET(request: NextRequest) {
  if (!checkAdminAuth(request)) return noAuth()
  try {
    const id = Number(new URL(request.url).searchParams.get('id'))
    if (id) return NextResponse.json({ video: await getVideoAdmin(id) })
    return NextResponse.json({
      videos: await listVideosAdmin(),
      uploadConfigured: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
      facebookConfigured: Boolean(process.env.FACEBOOK_PAGE_ID && process.env.FACEBOOK_PAGE_ACCESS_TOKEN),
    })
  } catch (err: any) {
    const hint = tableHint(err); if (hint) return hint
    console.error('Admin videos GET error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  if (!checkAdminAuth(request)) return noAuth()
  let body: unknown
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Corps JSON invalide' }, { status: 400 }) }
  const v = validateVideo(body)
  if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 })
  try {
    const id = await saveVideo(v.value)
    revalidateTag(VIDEOS_TAG)
    return NextResponse.json({ ok: true, id })
  } catch (err: any) {
    const hint = tableHint(err); if (hint) return hint
    if (err?.code === 'NOT_FOUND') return NextResponse.json({ error: 'Vidéo introuvable' }, { status: 404 })
    if (err?.code === '23505') return NextResponse.json({ error: 'Cet identifiant est déjà utilisé.' }, { status: 409 })
    if (err?.code === '23514') return NextResponse.json({ error: 'Refusé par la base : publication sans fichier, relecteur ou sources.' }, { status: 400 })
    console.error('Admin videos PUT error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  if (!checkAdminAuth(request)) return noAuth()
  const id = Number(new URL(request.url).searchParams.get('id'))
  if (!id) return NextResponse.json({ error: 'Identifiant manquant' }, { status: 400 })
  try {
    await deleteVideo(id)
    revalidateTag(VIDEOS_TAG)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Admin videos DELETE error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
