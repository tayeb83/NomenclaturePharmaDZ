import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/admin-auth'
import {
  ALLOWED_LOGO_MIMES,
  MAX_LOGO_BYTES,
  deleteWilayaLogo,
  getWilayaLogoBinary,
  listWilayaLogos,
  saveWilayaLogo,
} from '@/lib/garde-wilaya-logo'

// Logos (armoiries) des wilayas affichés sur les visuels de garde.
//   GET                       → liste des logos enregistrés
//   GET ?wilaya=16&raw=1      → image brute (aperçu dans l'admin)
//   POST  multipart (wilaya, file) → enregistre / remplace
//   DELETE ?wilaya=16         → supprime

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  if (!checkAdminAuth(request)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const wilaya = request.nextUrl.searchParams.get('wilaya')
  const raw = request.nextUrl.searchParams.get('raw') === '1'

  try {
    if (wilaya && raw) {
      const logo = await getWilayaLogoBinary(wilaya)
      if (!logo) return NextResponse.json({ error: 'Aucun logo pour cette wilaya' }, { status: 404 })
      return new NextResponse(new Uint8Array(logo.data), {
        headers: { 'Content-Type': logo.mime, 'Cache-Control': 'no-store' },
      })
    }

    return NextResponse.json({ logos: await listWilayaLogos(), maxBytes: MAX_LOGO_BYTES })
  } catch (err: any) {
    console.error('[api/admin/garde/wilaya-logo] GET error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  if (!checkAdminAuth(request)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
    const form = await request.formData()
    const wilaya = String(form.get('wilaya') || '').trim()
    const file = form.get('file')

    if (!wilaya) return NextResponse.json({ error: 'Wilaya requise' }, { status: 400 })
    if (!(file instanceof File)) return NextResponse.json({ error: 'Fichier requis' }, { status: 400 })
    if (file.size > MAX_LOGO_BYTES) {
      return NextResponse.json(
        { error: `Fichier trop volumineux (maximum ${MAX_LOGO_BYTES / 1024} Ko)` },
        { status: 413 }
      )
    }
    if (!ALLOWED_LOGO_MIMES.includes(file.type as any)) {
      return NextResponse.json({ error: 'Format non supporté (PNG ou JPEG uniquement)' }, { status: 415 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const saved = await saveWilayaLogo(wilaya, file.type, buffer, file.name)
    if (!saved.ok) return NextResponse.json({ error: saved.error }, { status: 400 })

    return NextResponse.json({ success: true, wilaya, byteSize: buffer.length })
  } catch (err: any) {
    console.error('[api/admin/garde/wilaya-logo] POST error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  if (!checkAdminAuth(request)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const wilaya = request.nextUrl.searchParams.get('wilaya')
  if (!wilaya) return NextResponse.json({ error: 'Wilaya requise' }, { status: 400 })

  try {
    await deleteWilayaLogo(wilaya)
    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[api/admin/garde/wilaya-logo] DELETE error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
