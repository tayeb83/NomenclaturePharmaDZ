import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import { checkAdminAuth } from '@/lib/admin-auth'

export const maxDuration = 60

/** Les fonctions Vercel refusent les corps de plus de 4,5 Mo : on s'arrête à 4 Mo (au-delà, l'admin utilise l'envoi direct). */
const DIRECT_MAX_BYTES = 4 * 1024 * 1024

/**
 * Envoi par le serveur : navigateur → ce site (même domaine) → Vercel Blob. Contourne le trajet direct navigateur → Blob,
 * qui peut rester bloqué sur certains réseaux. Réservé à l'admin ; type, taille et nom contrôlés ici.
 */
export async function POST(request: NextRequest) {
  if (!checkAdminAuth(request)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ error: 'Stockage non configuré (BLOB_READ_WRITE_TOKEN).' }, { status: 503 })
  }
  let form: FormData
  try { form = await request.formData() } catch { return NextResponse.json({ error: 'Envoi illisible' }, { status: 400 }) }
  const file = form.get('file')
  const folder = form.get('folder') === 'videos/posters' ? 'videos/posters' : 'videos'
  const name = String(form.get('name') ?? '')
  if (!(file instanceof File) || file.size === 0) return NextResponse.json({ error: 'Fichier manquant' }, { status: 400 })
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,80}$/.test(name) || name.includes('..')) return NextResponse.json({ error: 'Nom de fichier refusé' }, { status: 400 })
  if (file.size > DIRECT_MAX_BYTES) return NextResponse.json({ error: 'Fichier trop gros pour ce mode (4 Mo maximum)' }, { status: 413 })
  const allowed = folder === 'videos/posters' ? ['image/png', 'image/jpeg', 'image/webp'] : ['video/mp4']
  if (!allowed.includes(file.type)) return NextResponse.json({ error: `Type refusé (${file.type || 'inconnu'}) : ${allowed.join(', ')} attendu` }, { status: 400 })
  try {
    const blob = await put(`${folder}/${name}`, file, { access: 'public', addRandomSuffix: true, contentType: file.type })
    return NextResponse.json({ url: blob.url })
  } catch (err: any) {
    return NextResponse.json({ error: `Vercel Blob a refusé le fichier : ${err?.message || err}` }, { status: 502 })
  }
}
