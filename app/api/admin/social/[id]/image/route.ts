import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/admin-auth'
import { getPost } from '@/lib/facebook-content'
import { renderPostImagePng } from '@/lib/social-visual'

export const dynamic = 'force-dynamic'

/**
 * GET — aperçu de l'image qui sera publiée avec le post (même rendu que la
 * publication). Réservé à l'admin, comme le reste de la file.
 */
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  if (!checkAdminAuth(request)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const id = Number(params.id)
  if (!Number.isInteger(id)) {
    return NextResponse.json({ error: 'Identifiant invalide' }, { status: 400 })
  }

  try {
    const post = await getPost(id)
    if (!post) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })

    const png = await renderPostImagePng(post)
    return new Response(new Uint8Array(png), {
      headers: { 'Content-Type': 'image/png', 'Cache-Control': 'private, no-store' },
    })
  } catch (err: any) {
    console.error('[api/admin/social/:id/image] error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
