'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { pickLang, type Lang } from '@/lib/i18n'
import { NIVEAUX, type Niveau } from '@/lib/interactions-core'
import { NIVEAU } from '@/components/drug/InteractionsAnsmSection'

/**
 * Sécurité d'emploi de la fiche : interactions et allergies visibles dès le premier écran.
 *  - un bandeau unique sous le titre : compteurs par gravité, codes HDO, aperçu qui s'ouvre sur place ;
 *  - des onglets collants sous le menu : Essentiel · Interactions · Allergies, puis deux raccourcis (Génériques, RCP) ;
 *  - sur téléphone, une barre basse fixe avec les deux sujets.
 * Les trois parties partagent un même état, d'où un seul composant. Tout le contenu reste dans le HTML (les
 * panneaux masqués portent `hidden`, ils ne sont pas retirés) et s'imprime en entier. Les liens #interactions,
 * #allergies, #rcp et #meme-dci de la fiche continuent de fonctionner : ils ouvrent le bon onglet.
 */

export type PanneauId = 'essentiel' | 'interactions' | 'allergies'

export type SecuriteInteractions = { total: number; items: { niveau: Niveau; nom: string; classe: boolean }[] }
export type SecuriteAllergies = {
  total: number
  items: { code: string; relation: 'exact' | 'classe' | 'proche'; label: string; detail: string; fr: boolean }[]
}

/** Ancre de la page → panneau qui la contient (les ancres inconnues sont laissées au navigateur). */
const ANCRE_PAR_PANNEAU: Record<PanneauId, string | null> = { essentiel: null, interactions: 'interactions', allergies: 'allergies' }
const SIGNE = { exact: '', classe: ' ⊂', proche: ' ≈' } as const
const t = (lang: Lang, fr: string, ar: string) => pickLang(lang, { fr, ar })

export function FicheSecurite({ lang, interactions, allergies, generiques, rcp, panneaux }: {
  lang: Lang
  interactions: SecuriteInteractions | null
  allergies: SecuriteAllergies | null
  /** nombre d'autres médicaments de même DCI (raccourci vers #meme-dci), 0 sans raccourci */
  generiques: number
  /** vrai quand la fiche a un RCP officiel (raccourci vers #rcp) */
  rcp: boolean
  panneaux: { essentiel: React.ReactNode; interactions: React.ReactNode | null; allergies: React.ReactNode | null }
}) {
  const [actif, setActif] = useState<PanneauId>('essentiel')
  const [apercu, setApercu] = useState<'in' | 'al' | null>(null)
  const racine = useRef<HTMLDivElement>(null)
  const sentinelle = useRef<HTMLDivElement>(null)

  const aDuSecurite = Boolean(interactions || allergies)
  const aDesOnglets = aDuSecurite

  /** Hauteur du menu collant : les onglets se collent juste dessous. */
  useEffect(() => {
    const maj = () => {
      const nav = document.querySelector('.site-nav') as HTMLElement | null
      racine.current?.style.setProperty('--fs-top', `${nav ? Math.round(nav.getBoundingClientRect().height) : 70}px`)
    }
    maj()
    window.addEventListener('resize', maj)
    return () => window.removeEventListener('resize', maj)
  }, [])

  /** Remet le haut du panneau juste sous les onglets collants, sans reculer si on est déjà plus haut. */
  const alignerSurOnglets = useCallback(() => {
    requestAnimationFrame(() => {
      const s = sentinelle.current, r = racine.current
      if (!s || !r) return
      const top = parseFloat(getComputedStyle(r).getPropertyValue('--fs-top')) || 70
      const y = s.getBoundingClientRect().top + window.scrollY - top
      if (window.scrollY > y) window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' })
    })
  }, [])

  const ouvrirPanneau = useCallback((id: PanneauId, majUrl = true) => {
    setActif(id)
    setApercu(null)
    if (majUrl) {
      const ancre = ANCRE_PAR_PANNEAU[id]
      history.replaceState(null, '', ancre ? `#${ancre}` : `${location.pathname}${location.search}`)
    }
    alignerSurOnglets()
  }, [alignerSurOnglets])

  /** Ouvre l'onglet qui contient l'ancre, puis y amène. Faux si l'ancre n'est pas dans ce composant. */
  const ouvrirAncre = useCallback((id: string): boolean => {
    const cible = id ? document.getElementById(id) : null
    const panneau = cible?.closest('[data-panneau]') as HTMLElement | null
    if (!cible || !panneau || !racine.current?.contains(cible)) return false
    const p = panneau.dataset.panneau as PanneauId
    setActif(p)
    setApercu(null)
    if (p === 'essentiel') requestAnimationFrame(() => cible.scrollIntoView({ block: 'start', behavior: 'smooth' }))
    else alignerSurOnglets()
    return true
  }, [alignerSurOnglets])

  useEffect(() => {
    ouvrirAncre(decodeURIComponent(location.hash.slice(1)))
    const surHash = () => ouvrirAncre(decodeURIComponent(location.hash.slice(1)))
    const surClic = (e: MouseEvent) => {
      const a = (e.target as HTMLElement | null)?.closest?.('a[href^="#"]') as HTMLAnchorElement | null
      const id = a?.getAttribute('href')?.slice(1)
      if (!a || !id || e.defaultPrevented || e.metaKey || e.ctrlKey) return
      if (ouvrirAncre(id)) { e.preventDefault(); history.replaceState(null, '', `#${id}`) }
    }
    window.addEventListener('hashchange', surHash)
    document.addEventListener('click', surClic)
    return () => { window.removeEventListener('hashchange', surHash); document.removeEventListener('click', surClic) }
  }, [ouvrirAncre])

  // ── données du bandeau ──
  const comptes = NIVEAUX.map(n => ({ n, c: interactions?.items.filter(i => i.niveau === n).length ?? 0 })).filter(x => x.c > 0)
  const graves = interactions ? interactions.items.filter(i => i.niveau === 'contre_indication' || i.niveau === 'deconseillee').length : 0
  const codes = allergies?.items.slice(0, 3) ?? []
  const nbGraves = comptes.filter(x => x.n === 'contre_indication' || x.n === 'deconseillee')

  const onglet = (id: PanneauId, texte: string, n?: number, style?: 'alerte' | 'rose') => (
    <button key={id} type="button" role="tab" id={`fs-onglet-${id}`} aria-selected={actif === id} aria-controls={`fs-panneau-${id}`}
      className={`fs-onglet${actif === id ? ' on' : ''}`} onClick={() => ouvrirPanneau(id)}>
      {texte}{n !== undefined && <i className={style ?? ''}>{n}</i>}
    </button>
  )

  return (
    <div className="fs" ref={racine}>
      {aDuSecurite && (
        <section className="fs-bandeau" aria-label={t(lang, 'Sécurité d’emploi', 'سلامة الاستعمال')}>
          <div className={`fs-ligne${interactions && allergies ? ' deux' : ''}`}>
            {interactions && (
              <div className="fs-col">
                <p className="fs-titre"><span aria-hidden>✷</span> {t(lang, 'Interactions médicamenteuses', 'التداخلات الدوائية')}</p>
                <div className="fs-chips">
                  {comptes.map(({ n, c }) => (
                    <span key={n} className="fs-sev" style={{ background: NIVEAU[n].solid }}>{NIVEAU[n].icon} {c} {NIVEAU[n].court[lang]}</span>
                  ))}
                </div>
                <button type="button" className="fs-plus" aria-expanded={apercu === 'in'} onClick={() => setApercu(apercu === 'in' ? null : 'in')}>
                  {graves > 0 ? t(lang, 'À vérifier avant de dispenser', 'يُنصح بالتحقق قبل الصرف') : t(lang, 'Aperçu', 'نظرة سريعة')} {apercu === 'in' ? '▴' : '▾'}
                </button>
              </div>
            )}
            {allergies && (
              <div className="fs-col">
                <p className="fs-titre"><span aria-hidden>🩺</span> {t(lang, 'Allergies documentées', 'الحساسيات الموثّقة')}</p>
                <div className="fs-chips">
                  {codes.map(a => <span key={a.code} className="fiche-code hdo" dir="ltr">HDO {a.code}{SIGNE[a.relation]}</span>)}
                  {allergies.total > codes.length && <span className="fs-reste">+{allergies.total - codes.length}</span>}
                </div>
                <button type="button" className="fs-plus" aria-expanded={apercu === 'al'} onClick={() => setApercu(apercu === 'al' ? null : 'al')}>
                  {t(lang, 'Aperçu', 'نظرة سريعة')} {apercu === 'al' ? '▴' : '▾'}
                </button>
              </div>
            )}
          </div>

          {apercu === 'in' && interactions && (
            <div className="fs-apercu">
              {interactions.items.slice(0, 6).map((it, k) => (
                <div key={`${it.nom}-${k}`} className="fs-item">
                  <span className="fs-sev" style={{ background: NIVEAU[it.niveau].solid }}>{NIVEAU[it.niveau].icon} {NIVEAU[it.niveau].court[lang]}</span>
                  <b>{it.nom}</b>
                  <small>{it.classe ? t(lang, 'Classe', 'صنف') : t(lang, 'Substance', 'مادة')}</small>
                </div>
              ))}
              {interactions.total > 6 && <p className="fs-note">{t(lang, `+ ${interactions.total - 6} autres dans l’onglet Interactions`, `+ ${interactions.total - 6} أخرى في تبويب التداخلات`)}</p>}
              <button type="button" className="fs-voir" onClick={() => ouvrirPanneau('interactions')}>
                {t(lang, `Tout voir (${interactions.total}) ›`, `عرض الكل (${interactions.total}) ‹`)}
              </button>
            </div>
          )}
          {apercu === 'al' && allergies && (
            <div className="fs-apercu">
              {allergies.items.map(a => (
                <div key={a.code} className="fs-item">
                  <Link href={`/allergies/${a.code}`} className="fiche-code hdo" dir="ltr" rel="nofollow">HDO {a.code}{SIGNE[a.relation]}</Link>
                  <b {...(a.fr ? { dir: 'ltr', lang: 'fr' } : {})}>{a.label}</b>
                  <small dir="ltr">{a.detail}</small>
                </div>
              ))}
              <p className="fs-note">{t(lang, 'Information, pas une contre-indication. Aucune allergie croisée n’est déduite.', 'معلومة وليست مانع استعمال. لا يُستنتج أي تصالب بين الحساسيات.')}</p>
              <button type="button" className="fs-voir" onClick={() => ouvrirPanneau('allergies')}>
                {t(lang, `Tout voir (${allergies.total}) ›`, `عرض الكل (${allergies.total}) ‹`)}
              </button>
            </div>
          )}
        </section>
      )}

      <div ref={sentinelle} aria-hidden style={{ height: 0 }} />
      {aDesOnglets && (
        <nav className="fs-onglets" role="tablist" aria-label={t(lang, 'Sections de la fiche', 'أقسام البطاقة')}>
          {onglet('essentiel', t(lang, 'Essentiel', 'الأساسي'))}
          {interactions && onglet('interactions', t(lang, 'Interactions', 'التداخلات'), interactions.total, graves > 0 ? 'alerte' : undefined)}
          {allergies && onglet('allergies', t(lang, 'Allergies', 'الحساسيات'), allergies.total, 'rose')}
          {generiques > 0 && <a href="#meme-dci" className="fs-onglet">{t(lang, 'Génériques', 'الجنيسة')}<i>{generiques}</i></a>}
          {rcp && <a href="#rcp" className="fs-onglet">RCP</a>}
        </nav>
      )}

      <div role="tabpanel" id="fs-panneau-essentiel" aria-labelledby="fs-onglet-essentiel" data-panneau="essentiel" hidden={actif !== 'essentiel'}>{panneaux.essentiel}</div>
      {panneaux.interactions && (
        <div role="tabpanel" id="fs-panneau-interactions" aria-labelledby="fs-onglet-interactions" data-panneau="interactions" hidden={actif !== 'interactions'}>{panneaux.interactions}</div>
      )}
      {panneaux.allergies && (
        <div role="tabpanel" id="fs-panneau-allergies" aria-labelledby="fs-onglet-allergies" data-panneau="allergies" hidden={actif !== 'allergies'}>{panneaux.allergies}</div>
      )}

      {aDuSecurite && (
        <div className="fs-barre" role="group" aria-label={t(lang, 'Sécurité d’emploi', 'سلامة الاستعمال')}>
          {interactions && (
            <button type="button" className={`fs-pill${actif === 'interactions' ? ' on' : ''}`} onClick={() => ouvrirPanneau('interactions')}>
              ⚠ {interactions.total} {t(lang, 'interactions', 'تداخلات')}
              {nbGraves.length > 0 && <span className="fs-sev" style={{ background: NIVEAU[nbGraves[0].n].solid }}>{NIVEAU[nbGraves[0].n].icon} {nbGraves.reduce((s, x) => s + x.c, 0)}</span>}
            </button>
          )}
          {allergies && (
            <button type="button" className={`fs-pill rose${actif === 'allergies' ? ' on' : ''}`} onClick={() => ouvrirPanneau('allergies')}>
              🩺 {allergies.total} {t(lang, 'allergies', 'حساسيات')}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
