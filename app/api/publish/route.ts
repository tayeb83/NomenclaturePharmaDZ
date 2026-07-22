import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { query, queryOne } from '@/lib/db'
import { formatRetrait, formatNouveaute, publishToAll, sendNewsletter } from '@/lib/social'
import { publishGardeDailyToFacebook } from '@/lib/garde-social'
import { sendPushToAll } from '@/lib/push'

function secretsMatch(provided: string | null, expected: string | undefined): boolean {
  if (!provided || !expected) return false

  const providedBuffer = Buffer.from(provided)
  const expectedBuffer = Buffer.from(expected)

  if (providedBuffer.length !== expectedBuffer.length) return false

  return crypto.timingSafeEqual(providedBuffer, expectedBuffer)
}

/**
 * POST /api/publish
 * Body: { type: 'retrait'|'nouveaute'|'recap_hebdo'|'garde_daily', id?: number, ... }
 *
 * Exemples d'usage:
 * - Publier un retrait sur Facebook + Twitter + newsletter
 * - Envoyer le récap hebdomadaire newsletter
 * - Déclencher manuellement la publication garde du jour
 *   ({ type: 'garde_daily', wilaya?: '16', date?: 'YYYY-MM-DD', dryRun?: true })
 */
export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-api-secret')
  if (!secretsMatch(secret, process.env.API_SECRET_KEY)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const { type, id, sendNewsletter: doNewsletter } = body

  try {
    if (type === 'retrait' && id) {
      const drug = await queryOne(`SELECT * FROM retraits WHERE id = $1`, [id])
      if (!drug) return NextResponse.json({ error: 'Médicament introuvable' }, { status: 404 })

      const content = formatRetrait(drug)
      const results = await publishToAll(content, id, 'retraits', 'retrait')

      if (doNewsletter) await sendNewsletter(content.newsletter_subject, content.newsletter_html)

      const push = await sendPushToAll(
        { title: '🚨 Retrait — ' + (drug as any).nom_marque, body: (drug as any).motif_retrait || 'Ce médicament ne doit plus être délivré.' },
        { view: 'actualites', type: 'retrait' }
      )

      return NextResponse.json({ success: true, results, push })
    }

    if (type === 'nouveaute' && id) {
      const drug = await queryOne(`SELECT * FROM enregistrements WHERE id = $1`, [id])
      if (!drug) return NextResponse.json({ error: 'Médicament introuvable' }, { status: 404 })

      const content = formatNouveaute(drug)
      const results = await publishToAll(content, id, 'enregistrements', 'nouveaute')

      const push = await sendPushToAll(
        { title: '✅ Nouvelle AMM — ' + (drug as any).nom_marque, body: [(drug as any).dci, (drug as any).labo].filter(Boolean).join(' · ') },
        { view: 'actualites', type: 'amm' }
      )

      return NextResponse.json({ success: true, results, push })
    }

    if (type === 'recap_hebdo') {
      const since = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString()
      const nouveaux = await query(`SELECT * FROM enregistrements WHERE created_at >= $1 ORDER BY date_init DESC`, [since])
      const retraits  = await query(`SELECT * FROM retraits WHERE created_at >= $1`, [since])

      const subject = `📊 Récap DwaDZ — ${new Date().toLocaleDateString('fr-DZ', { weekday: 'long', day: 'numeric', month: 'long' })}`
      const html = generateRecapHtml(nouveaux || [], retraits || [])

      await sendNewsletter(subject, html)

      // Post résumé sur les réseaux
      const summary = `📊 RÉCAP HEBDO | DwaDZ\n\n✅ ${nouveaux?.length || 0} nouveaux enregistrements\n🚫 ${retraits?.length || 0} retraits cette semaine\n\n🔗 pharmaveille-dz.com\n#DwaDZ #Pharmacie #Algérie`
      await publishToAll({ short: summary, facebook: summary }, 0, '', 'recap')

      return NextResponse.json({ success: true })
    }

    if (type === 'garde_daily') {
      const result = await publishGardeDailyToFacebook({
        date: typeof body.date === 'string' ? body.date : undefined,
        wilaya: typeof body.wilaya === 'string' ? body.wilaya : undefined,
        dryRun: !!body.dryRun,
      })
      return NextResponse.json({ success: true, ...result })
    }

    return NextResponse.json({ error: 'Type invalide' }, { status: 400 })
  } catch (error) {
    console.error('[api/publish] Internal error:', error)
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 })
  }
}

function generateRecapHtml(nouveaux: any[], retraits: any[]) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc;">
      <!-- Header -->
      <div style="background: linear-gradient(135deg, #0f172a, #0284c7); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 22px;">💊 DwaDZ</h1>
        <p style="color: rgba(255,255,255,0.7); margin: 8px 0 0; font-size: 14px;">Récapitulatif hebdomadaire</p>
      </div>

      <!-- Stats -->
      <div style="display: flex; gap: 16px; padding: 24px; background: white;">
        <div style="flex: 1; text-align: center; padding: 16px; background: #eff6ff; border-radius: 8px;">
          <div style="font-size: 28px; font-weight: bold; color: #0284c7;">${nouveaux.length}</div>
          <div style="font-size: 12px; color: #64748b; margin-top: 4px;">Nouveaux enregistrements</div>
        </div>
        <div style="flex: 1; text-align: center; padding: 16px; background: #fef2f2; border-radius: 8px;">
          <div style="font-size: 28px; font-weight: bold; color: #dc2626;">${retraits.length}</div>
          <div style="font-size: 12px; color: #64748b; margin-top: 4px;">Retraits cette semaine</div>
        </div>
      </div>

      <!-- Nouveaux -->
      ${nouveaux.length > 0 ? `
      <div style="padding: 0 24px 20px; background: white;">
        <h2 style="color: #0f172a; font-size: 16px; border-bottom: 2px solid #0284c7; padding-bottom: 8px;">✅ Nouveaux enregistrements</h2>
        ${nouveaux.slice(0, 5).map(d => `
          <div style="padding: 10px 0; border-bottom: 1px solid #f1f5f9;">
            <div style="font-weight: bold; color: #0369a1;">${d.nom_marque}®</div>
            <div style="font-size: 13px; color: #64748b;">${d.dci}${d.dosage ? ' — ' + d.dosage : ''} | ${d.labo}</div>
          </div>
        `).join('')}
        ${nouveaux.length > 5 ? `<p style="color: #94a3b8; font-size: 12px; margin-top: 8px;">+${nouveaux.length - 5} autres...</p>` : ''}
      </div>
      ` : ''}

      <!-- Retraits -->
      ${retraits.length > 0 ? `
      <div style="padding: 0 24px 20px; background: white;">
        <h2 style="color: #0f172a; font-size: 16px; border-bottom: 2px solid #dc2626; padding-bottom: 8px;">🚫 Retraits</h2>
        ${retraits.slice(0, 5).map(d => `
          <div style="padding: 10px 0; border-bottom: 1px solid #f1f5f9;">
            <div style="font-weight: bold; color: #dc2626;">${d.nom_marque}®</div>
            <div style="font-size: 13px; color: #64748b;">${d.dci} | ${d.motif_retrait || 'Motif non précisé'}</div>
          </div>
        `).join('')}
      </div>
      ` : ''}

      <!-- CTA -->
      <div style="padding: 24px; text-align: center; background: white; border-radius: 0 0 8px 8px; border-top: 1px solid #f1f5f9;">
        <a href="${appUrl}" style="background: #0284c7; color: white; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: bold;">Voir le détail →</a>
        <p style="margin: 20px 0 0; font-size: 11px; color: #94a3b8;">
          DwaDZ — <a href="${appUrl}/api/newsletter?action=unsubscribe&token={{unsubscribe_token}}" style="color: #94a3b8;">Se désabonner</a>
        </p>
      </div>
    </div>
  `
}
