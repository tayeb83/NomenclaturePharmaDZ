import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import { checkAdminAuth } from '@/lib/admin-auth'

export const maxDuration = 30

const MAX_BYTES = 4 * 1024 * 1024
const TYPES: Record<string, string> = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' }

/** Image de couverture d'un article : navigateur → ce site → Vercel Blob. Admin seulement ; type et taille contrôlés. */
export async function POST(request: NextRequest) {
  if (!checkAdminAuth(request)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  if (!process.env.BLOB_READ_WRITE_TOKEN) return NextResponse.json({ error: 'Stockage non configuré (BLOB_READ_WRITE_TOKEN) : collez l’adresse https d’une image.' }, { status: 503 })
  let form: FormData
  try { form = await request.formData() } catch { return NextResponse.json({ error: 'Envoi illisible' }, { status: 400 }) }
  const file = form.get('file')
  if (!(file instanceof File) || file.size === 0) return NextResponse.json({ error: 'Fichier manquant' }, { status: 400 })
  if (file.size > MAX_BYTES) return NextResponse.json({ error: 'Image trop lourde (4 Mo maximum).' }, { status: 413 })
  const ext = TYPES[file.type]
  if (!ext) return NextResponse.json({ error: 'Type refusé : PNG, JPEG ou WebP attendu.' }, { status: 400 })
  const base = String(form.get('name') ?? 'couverture').toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'couverture'
  try {
    const blob = await put(`articles/${base}.${ext}`, file, { access: 'public', addRandomSuffix: true, contentType: file.type })
    return NextResponse.json({ url: blob.url })
  } catch (err: any) {
    return NextResponse.json({ error: `Vercel Blob a refusé le fichier : ${err?.message || err}` }, { status: 502 })
  }
}
