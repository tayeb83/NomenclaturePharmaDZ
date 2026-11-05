'use client'

import { useLanguage } from '@/components/i18n/LanguageProvider'
import { CASBAH as C } from '@/lib/garde-ornaments'
import { EMAIL_DEVIS, lienDemandeDevis, prixTexte } from '@/lib/graphe/offre'
import { TEXTES } from './textes'

/**
 * Offre de l'explorateur complet. Pas de formulaire ni de paiement en ligne : on écrit par e-mail, on reçoit un
 * devis, puis l'accès est activé à la main (voir /admin/graphe).
 */
export function OffreGraphe({ connecte = false, ouvrirExplorateur = true }: { connecte?: boolean; ouvrirExplorateur?: boolean }) {
  const { lang } = useLanguage()
  const t = TEXTES[lang]
  const lien = { display: 'inline-block', font: 'inherit', fontWeight: 700, padding: '10px 18px', borderRadius: 999, border: `2px solid ${C.brass}`, background: C.navy, color: C.brassLight, textDecoration: 'none' } as const

  return (
    <section style={{ border: `2px solid ${C.brass}`, borderRadius: 16, padding: '20px 22px', background: C.cream }}>
      <h2 style={{ margin: 0, fontSize: 22, color: C.navy }}>⭐ {t.offreTitre}</h2>
      <p style={{ margin: '8px 0 10px', maxWidth: '70ch', color: C.ink }}>{t.offreTexte}</p>
      <ul style={{ margin: '0 0 12px', paddingInlineStart: 20, color: C.ink }}>
        {t.offrePoints.map(p => <li key={p}>{p}</li>)}
      </ul>
      <p style={{ margin: '0 0 12px', color: C.ink }}>
        <b>{t.prix} :</b> {prixTexte(lang)}{' '}
        <a href={`/articles/graphes-medicaments-algerie-cas-usage-acces${lang === 'ar' ? '-ar' : ''}`} style={{ color: C.blueDeep, fontWeight: 700, fontSize: 14 }}>{t.guide}</a>
      </p>

      <div style={{ margin: '0 0 14px', padding: '10px 14px', borderRadius: 10, background: 'white', border: `1px solid ${C.creamEdge}`, fontSize: 14.5 }}>
        <b>{t.comment}</b>
        <ol style={{ margin: '6px 0 0', paddingInlineStart: 20, color: C.ink }}>
          {t.etapes.map(e => <li key={e}>{e}</li>)}
        </ol>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px 14px', alignItems: 'center' }}>
        <a href={lienDemandeDevis(lang)} style={lien}>✉️ {t.devis}</a>
        <span style={{ fontSize: 14, color: C.muted }}>{t.adresse} <span dir="ltr" style={{ fontWeight: 700, color: C.ink, userSelect: 'all' }}>{EMAIL_DEVIS}</span></span>
        {ouvrirExplorateur && (
          <a href="/graphe/explorer" style={{ ...lien, marginInlineStart: 'auto', background: 'white', color: C.navy }}>
            {connecte ? t.offreBouton : t.connexion}
          </a>
        )}
      </div>
    </section>
  )
}
