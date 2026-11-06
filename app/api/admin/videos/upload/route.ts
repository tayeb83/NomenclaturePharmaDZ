import { NextRequest, NextResponse } from 'next/server'
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client'
import { checkAdminAuth } from '@/lib/admin-auth'

const VIDEO_MAX = 200 * 1024 * 1024
const IMAGE_MAX = 5 * 1024 * 1024

/**
 * Envoi direct du navigateur vers Vercel Blob (les fonctions Vercel refusent les corps de plus de 4,5 Mo,
 * d'où ce jeton à usage unique). Réservé à l'admin ; types et tailles contrôlés ici.
 * Nécessite BLOB_READ_WRITE_TOKEN (créer un « Blob store » dans Vercel → Storage).
 */
export async function POST(request: NextRequest) {
  if (!checkAdminAuth(request)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ error: 'Stockage non configuré (BLOB_READ_WRITE_TOKEN). Collez plutôt l’adresse https du fichier.' }, { status: 503 })
  }
  try {
    const body = (await request.json()) as HandleUploadBody
    const json = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        if (!/^videos\/[A-Za-z0-9._\-\/]+$/.test(pathname) || pathname.includes('..')) throw new Error('Nom de fichier refusé')
        const image = pathname.startsWith('videos/posters/')
        return {
          allowedContentTypes: image ? ['image/png', 'image/jpeg', 'image/webp'] : ['video/mp4'],
          maximumSizeInBytes: image ? IMAGE_MAX : VIDEO_MAX,
          addRandomSuffix: true,
        }
      },
    })
    return NextResponse.json(json)
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Envoi refusé' }, { status: 400 })
  }
}
