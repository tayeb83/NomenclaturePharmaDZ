'use client'

import { useId, useState } from 'react'
import { useLanguage } from '@/components/i18n/LanguageProvider'
import { CASBAH as C } from '@/lib/garde-ornaments'
import { TEXTES } from './textes'

/** Coordonnées de paiement : publiques par nature (on les donne à celui qui paie), lues au build. */
const CCP = process.env.NEXT_PUBLIC_GRAPHE_CCP_NUMERO || ''
const CCP_TITULAIRE = process.env.NEXT_PUBLIC_GRAPHE_CCP_TITULAIRE || ''
const PAYPAL = /^https:\/\/(www\.)?paypal\.(me|com)\//.test(process.env.NEXT_PUBLIC_GRAPHE_PAYPAL_URL || '') ? process.env.NEXT_PUBLIC_GRAPHE_PAYPAL_URL! : ''

const champ: React.CSSProperties = { font: 'inherit', fontSize: 15, padding: '9px 12px', border: '1.5px solid #cbd5e1', borderRadius: 8, background: 'white', width: '100%', boxSizing: 'border-box' }

/** Carte de l'offre payante et formulaire de demande d'abonnement (alimente pro_leads, offre « graphe »). */
export function OffreGraphe({ connecte = false, ouvrirExplorateur = true }: { connecte?: boolean; ouvrirExplorateur?: boolean }) {
  const { lang } = useLanguage()
  const t = TEXTES[lang]
  const uid = useId()
  const [nom, setNom] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [organisation, setOrganisation] = useState('')
  const [message, setMessage] = useState('')
  const [etat, setEtat] = useState<'repos' | 'envoi' | 'ok' | 'erreur'>('repos')

  async function envoyer(e: React.FormEvent) {
    e.preventDefault()
    setEtat('envoi')
    try {
      const r = await fetch('/api/pro/lead', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ offer: 'graphe', nom, email, phone, organisation, message }),
      })
      setEtat(r.ok ? 'ok' : 'erreur')
    } catch { setEtat('erreur') }
  }

  return (
    <section style={{ border: `2px solid ${C.brass}`, borderRadius: 16, padding: '20px 22px', background: C.cream }}>
      <h2 style={{ margin: 0, fontSize: 22, color: C.navy }}>⭐ {t.offreTitre}</h2>
      <p style={{ margin: '8px 0 10px', maxWidth: 70 + 'ch', color: C.ink }}>{t.offreTexte}</p>
      <ul style={{ margin: '0 0 12px', paddingInlineStart: 20, color: C.ink }}>
        {t.offrePoints.map(p => <li key={p}>{p}</li>)}
      </ul>
      <p style={{ margin: '0 0 12px', fontSize: 14, color: C.muted }}>{t.tarif} <a href={`/articles/graphes-medicaments-algerie-cas-usage-acces${lang === 'ar' ? '-ar' : ''}`} style={{ color: C.blueDeep, fontWeight: 700 }}>{t.guide}</a></p>
      <div style={{ margin: '0 0 14px', padding: '10px 14px', borderRadius: 10, background: 'white', border: `1px solid ${C.creamEdge}`, fontSize: 14 }}>
        <b>{t.payer}</b>
        <p style={{ margin: '4px 0 8px', color: C.muted }}>{t.payerTexte}</p>
        {CCP || PAYPAL ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 24px', alignItems: 'center' }}>
            {CCP && <div><b>{t.ccp}</b><div>{t.ccpNum} : <span dir="ltr" style={{ fontVariantNumeric: 'tabular-nums' }}>{CCP}</span></div>{CCP_TITULAIRE && <div>{t.ccpTit} : {CCP_TITULAIRE}</div>}</div>}
            {PAYPAL && <a href={PAYPAL} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 700, padding: '7px 14px', borderRadius: 999, border: `1.5px solid ${C.blueDeep}`, color: C.blueDeep, textDecoration: 'none' }}>{t.paypal} ↗</a>}
          </div>
        ) : <p style={{ margin: 0, color: C.muted }}>{t.coordonnees}</p>}
      </div>
      {ouvrirExplorateur && (
        <a href="/graphe/explorer" style={{ display: 'inline-block', font: 'inherit', fontWeight: 700, padding: '10px 18px', borderRadius: 999, border: `2px solid ${C.brass}`, background: C.navy, color: C.brassLight, textDecoration: 'none', marginInlineEnd: 10 }}>
          {connecte ? t.offreBouton : t.connexion}
        </a>
      )}
      <details style={{ marginTop: 14 }} open={!ouvrirExplorateur}>
        <summary style={{ cursor: 'pointer', fontWeight: 700, color: C.blueDeep }}>{t.demander}</summary>
        {etat === 'ok' ? <p role="status" style={{ fontWeight: 700 }}>{t.merci}</p> : (
          <form onSubmit={envoyer} style={{ display: 'grid', gap: 8, marginTop: 10, maxWidth: 480 }}>
            <label htmlFor={`${uid}n`} style={{ fontSize: 13, fontWeight: 600 }}>{t.nom}</label>
            <input id={`${uid}n`} style={champ} required maxLength={200} value={nom} onChange={e => setNom(e.target.value)} />
            <label htmlFor={`${uid}e`} style={{ fontSize: 13, fontWeight: 600 }}>{t.email}</label>
            <input id={`${uid}e`} style={champ} type="email" required maxLength={200} value={email} onChange={e => setEmail(e.target.value)} />
            <label htmlFor={`${uid}t`} style={{ fontSize: 13, fontWeight: 600 }}>{t.tel}</label>
            <input id={`${uid}t`} style={champ} type="tel" maxLength={30} value={phone} onChange={e => setPhone(e.target.value)} />
            <label htmlFor={`${uid}o`} style={{ fontSize: 13, fontWeight: 600 }}>{t.org}</label>
            <input id={`${uid}o`} style={champ} maxLength={200} value={organisation} onChange={e => setOrganisation(e.target.value)} />
            <label htmlFor={`${uid}m`} style={{ fontSize: 13, fontWeight: 600 }}>{t.msg}</label>
            <textarea id={`${uid}m`} style={{ ...champ, minHeight: 70 }} maxLength={2000} value={message} onChange={e => setMessage(e.target.value)} />
            <button type="submit" disabled={etat === 'envoi'} style={{ font: 'inherit', fontWeight: 700, padding: '10px 18px', borderRadius: 999, border: `2px solid ${C.brass}`, background: C.navy, color: C.brassLight, cursor: 'pointer', justifySelf: 'start' }}>{t.envoyer}</button>
            {etat === 'erreur' && <p role="alert" style={{ color: '#b3261e', margin: 0 }}>{t.erreur}</p>}
          </form>
        )}
      </details>
    </section>
  )
}
