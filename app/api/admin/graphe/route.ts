import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/admin-auth'
import { activerAbonne, basculerAbonne, listerAbonnes, listerDemandes, supprimerAbonne } from '@/lib/graphe/abonnements'
import { validerAbonnement } from '@/lib/graphe/core'
import { isMissingTableError } from '@/lib/garde-feedback'
import { sendMail } from '@/lib/training/mail'
import { appUrl } from '@/lib/training'
import { controlerDemos } from '@/lib/graphe/controle'

export const dynamic = 'force-dynamic'

/** Activer un abonnement revient à constater un paiement : propriétaire et administrateurs seulement (pas les éditeurs). */
function garde(req: NextRequest) {
  const s = getAdminSession(req)
  return s && (s.role === 'owner' || s.role === 'admin') ? s : null
}

export async function GET(req: NextRequest) {
  if (!garde(req)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  // ?demos=1 : contrôle des démos du catalogue (une requête par démo, quelques secondes)
  if (req.nextUrl.searchParams.get('demos')) {
    try { return NextResponse.json({ demos: await controlerDemos() }) } catch (err) {
      console.error('[api/admin/graphe demos]', (err as Error).message)
      return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
    }
  }
  try {
    const [abonnes, demandes] = await Promise.all([listerAbonnes(), listerDemandes()])
    return NextResponse.json({ abonnes, demandes })
  } catch (err) {
    if (isMissingTableError(err)) return NextResponse.json({ abonnes: [], demandes: [], migrationManquante: true })
    console.error('[api/admin/graphe GET]', (err as Error).message)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

/** Active (ou renouvelle) un abonnement. Corps : email, ends_on, starts_on?, moyen_paiement?, reference_paiement?, montant?, note?, prevenir? */
export async function POST(req: NextRequest) {
  if (!garde(req)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const body = await req.json().catch(() => null)
  if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Corps JSON invalide' }, { status: 400 })
  const v = validerAbonnement(body as Record<string, unknown>)
  if (!v.ok) return NextResponse.json({ error: v.erreur }, { status: 400 })
  try {
    const abonne = await activerAbonne(v.valeur)
    let mailEnvoye: boolean | null = null
    if ((body as { prevenir?: unknown }).prevenir) {
      const lien = `${appUrl()}/graphe/explorer`
      const fin = new Date(`${v.valeur.ends_on}T00:00:00Z`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
      mailEnvoye = await sendMail({
        to: v.valeur.email,
        subject: 'Votre accès à l’explorateur de graphes DwaDZ est activé',
        text: `Bonjour,\n\nVotre abonnement à l’explorateur de graphes DwaDZ est actif jusqu’au ${fin}.\nConnectez-vous avec cette adresse e-mail (lien de connexion à usage unique, sans mot de passe) puis ouvrez l’explorateur : ${lien}\n\nVous y trouvez les graphes de toute substance et les fiches PDF téléchargeables.\n\nMerci de votre confiance.\nDwaDZ`,
        html: `<p>Bonjour,</p><p>Votre abonnement à l’explorateur de graphes DwaDZ est actif jusqu’au <b>${fin}</b>.</p><p>Connectez-vous avec cette adresse e-mail (lien de connexion à usage unique, sans mot de passe) puis ouvrez <a href="${lien}">l’explorateur</a>.</p><p>Vous y trouvez les graphes de toute substance et les fiches PDF téléchargeables.</p><p>Merci de votre confiance.<br>DwaDZ</p>`,
      }).then(r => r.success).catch(() => false)
    }
    return NextResponse.json({ abonne, mailEnvoye }, { status: 201 })
  } catch (err) {
    if (isMissingTableError(err)) return NextResponse.json({ error: 'Migration manquante : psql "$DATABASE_URL" -f sql/36_graphe.sql' }, { status: 503 })
    console.error('[api/admin/graphe POST]', (err as Error).message)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

/** Suspend ou réactive un abonnement. Corps : { id, actif } */
export async function PATCH(req: NextRequest) {
  if (!garde(req)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const b = await req.json().catch(() => null)
  const id = Number(b?.id)
  if (!Number.isInteger(id) || typeof b?.actif !== 'boolean') return NextResponse.json({ error: 'Paramètres invalides' }, { status: 400 })
  try { await basculerAbonne(id, b.actif); return NextResponse.json({ ok: true }) } catch (err) {
    console.error('[api/admin/graphe PATCH]', (err as Error).message)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

/** Supprime un abonnement. Corps : { id } */
export async function DELETE(req: NextRequest) {
  if (!garde(req)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const b = await req.json().catch(() => null)
  const id = Number(b?.id)
  if (!Number.isInteger(id)) return NextResponse.json({ error: 'Paramètres invalides' }, { status: 400 })
  try { await supprimerAbonne(id); return NextResponse.json({ ok: true }) } catch (err) {
    console.error('[api/admin/graphe DELETE]', (err as Error).message)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
