import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/admin-auth'
import {
  listPosts,
  generateNextCandidate,
  generateForRubrique,
  enqueueCandidate,
  lastScheduledDate,
  normalizeLien,
  RUBRIQUE_ROTATION,
  type Rubrique,
} from '@/lib/facebook-content'

export const dynamic = 'force-dynamic'

const INTERVAL_DAYS = Number(process.env.SOCIAL_POST_INTERVAL_DAYS || 3)

/** GET — liste la file d'attente (brouillons, approuvés, publiés). */
export async function GET(request: NextRequest) {
  if (!checkAdminAuth(request)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }
  try {
    const posts = await listPosts()
    // Recalcule les liens sur le domaine courant (corrige aussi les brouillons
    // stockés avec un ancien domaine, sans avoir à les régénérer).
    const normalized = posts.map((p) => ({ ...p, lien: normalizeLien(p.lien) }))
    return NextResponse.json({ posts: normalized, intervalDays: INTERVAL_DAYS })
  } catch (err: any) {
    console.error('[api/admin/social] GET error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

/**
 * POST — génère un ou plusieurs brouillons.
 *   body: { count?: number, rubrique?: Rubrique }
 * Les dates de publication sont échelonnées à partir de la dernière déjà
 * planifiée (ou d'aujourd'hui), espacées de SOCIAL_POST_INTERVAL_DAYS jours.
 */
export async function POST(request: NextRequest) {
  if (!checkAdminAuth(request)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }
  try {
    const body = await request.json().catch(() => ({}))
    const count = Math.min(Math.max(Number(body.count) || 1, 1), 10)
    const forcedRubrique: Rubrique | undefined = RUBRIQUE_ROTATION.includes(body.rubrique)
      ? body.rubrique
      : undefined

    // Point de départ des échéances : après le dernier post planifié, sinon demain.
    let cursor = (await lastScheduledDate()) ?? new Date()
    const created: any[] = []
    let rotationIndex = 0

    for (let i = 0; i < count; i++) {
      const candidate = forcedRubrique
        ? await generateForRubrique(forcedRubrique)
        : await generateNextCandidate(RUBRIQUE_ROTATION[rotationIndex % RUBRIQUE_ROTATION.length])
      rotationIndex++

      if (!candidate) {
        // Rien à proposer pour cette rubrique/rotation : on tente la suivante.
        if (forcedRubrique) break
        continue
      }

      cursor = new Date(cursor.getTime() + INTERVAL_DAYS * 24 * 60 * 60 * 1000)
      // Publication en matinée (9h) pour une meilleure visibilité.
      const scheduled = new Date(cursor)
      scheduled.setHours(9, 0, 0, 0)

      const post = await enqueueCandidate(candidate, scheduled)
      if (post) created.push(post)
    }

    return NextResponse.json({ created, count: created.length })
  } catch (err: any) {
    console.error('[api/admin/social] POST error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
