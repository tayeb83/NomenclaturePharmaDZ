'use client'

/**
 * Terminologies : les référentiels du site côte à côte (formes, voies, méthodes EDQM, unités UCUM, classification ATC),
 * en trois langues, avec le nombre de médicaments liés et l'état de relecture de l'arabe.
 * L'état (onglet, filtre, code mis en avant) est dans l'URL : ?onglet=formes&q=comprimé&code=10221000
 * Les listes EDQM et UCUM viennent de la page ; l'ATC, bien plus longue, se charge par pages depuis /api/terminologies/atc.
 */

import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLanguage } from '@/components/i18n/LanguageProvider'
import { FormeIcon, VoieIcon, pastilleDeCodeEdqm } from '@/components/ui/FormeIcon'
import type { LigneTermino, ListesTerminologies } from '@/lib/terminologies-page'
import type { AtcReferentielLigne } from '@/lib/queries'

type Onglet = 'formes' | 'voies' | 'methodes' | 'ucum' | 'atc'
const ONGLETS: Onglet[] = ['formes', 'voies', 'methodes', 'ucum', 'atc']
const PAGE_ATC = 100

const TITRES: Record<Onglet, { fr: string; ar: string; sous: { fr: string; ar: string } }> = {
  formes: { fr: 'Formes EDQM', ar: 'الأشكال EDQM', sous: { fr: 'Formes pharmaceutiques (Standard Terms)', ar: 'الأشكال الصيدلانية (Standard Terms)' } },
  voies: { fr: 'Voies EDQM', ar: 'الطرق EDQM', sous: { fr: "Voies d'administration (Standard Terms)", ar: 'طرق الإعطاء (Standard Terms)' } },
  methodes: { fr: 'Méthodes EDQM', ar: 'الأساليب EDQM', sous: { fr: "Méthodes d'administration (Standard Terms)", ar: 'أساليب الإعطاء (Standard Terms)' } },
  ucum: { fr: 'Unités UCUM', ar: 'الوحدات UCUM', sous: { fr: 'Unités des dosages (Unified Code for Units of Measure)', ar: 'وحدات الجرعات (UCUM)' } },
  atc: { fr: 'Classification ATC', ar: 'التصنيف ATC', sous: { fr: 'Classification anatomique, thérapeutique et chimique (OMS)', ar: 'التصنيف التشريحي العلاجي الكيميائي (منظمة الصحة العالمية)' } },
}
const NIVEAUX_ATC: Record<number, { fr: string; ar: string }> = {
  1: { fr: 'Groupe anatomique', ar: 'المجموعة التشريحية' },
  2: { fr: 'Sous-groupe thérapeutique', ar: 'المجموعة الفرعية العلاجية' },
  3: { fr: 'Sous-groupe pharmacologique', ar: 'المجموعة الدوائية' },
  4: { fr: 'Sous-groupe chimique', ar: 'المجموعة الكيميائية' },
  5: { fr: 'Substance', ar: 'المادة' },
}
const STATUT_AR: Record<LigneTermino['ar_statut'], { cls: string; fr: string; ar: string }> = {
  relu: { cls: 'ok', fr: 'relue', ar: 'مُراجَعة' },
  brouillon: { cls: 'draft', fr: 'brouillon', ar: 'مسودة' },
  absent: { cls: 'none', fr: 'absente', ar: 'غير متوفرة' },
}

const plier = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
const nombre = (n: number) => n.toLocaleString('fr-FR')

export function TerminologiesClient({ listes }: { listes: ListesTerminologies }) {
  const { lang } = useLanguage()
  const ar = lang === 'ar'
  const t = useCallback((fr: string, a: string) => (ar ? a : fr), [ar])
  const router = useRouter()
  const pathname = usePathname() || '/terminologies'
  const sp = useSearchParams()

  const onglet: Onglet = ONGLETS.includes(sp.get('onglet') as Onglet) ? (sp.get('onglet') as Onglet) : 'formes'
  const code = sp.get('code') ?? ''
  const urlQ = sp.get('q') ?? ''
  const utilises = sp.get('utilises') !== '0'
  const niveau = Math.min(5, Math.max(0, parseInt(sp.get('niveau') || '0', 10) || 0))

  // la saisie reste réactive ; l'URL suit avec un léger retard
  const [saisie, setSaisie] = useState(urlQ)
  useEffect(() => setSaisie(urlQ), [urlQ])
  const aller = useCallback((changes: Record<string, string | null>) => {
    const p = new URLSearchParams(sp.toString())
    for (const [k, v] of Object.entries(changes)) { if (v) p.set(k, v); else p.delete(k) }
    router.replace(p.size ? `${pathname}?${p}` : pathname, { scroll: false })
  }, [router, pathname, sp])
  useEffect(() => {
    if (saisie === urlQ) return
    const h = setTimeout(() => aller({ q: saisie.trim() || null }), 250)
    return () => clearTimeout(h)
  }, [saisie, urlQ, aller])

  // ── EDQM et UCUM : filtrage local ──
  const lignes: LigneTermino[] = onglet === 'atc' ? [] : listes[onglet]
  const visibles = useMemo(() => {
    const q = plier(urlQ.trim())
    return lignes.filter(l => {
      if (code) return l.code === code
      if (utilises && l.n === 0) return false
      return !q || plier([l.code, l.fr ?? '', l.en, l.ar ?? '', l.symbole ?? ''].join(' ')).includes(q)
    })
  }, [lignes, urlQ, code, utilises])
  const ligneCode = useRef<HTMLTableRowElement>(null)
  useEffect(() => { ligneCode.current?.scrollIntoView({ block: 'center' }) }, [code, onglet])

  // ── ATC : chargement par pages ──
  const [atc, setAtc] = useState<{ rows: AtcReferentielLigne[]; total: number; disponible: boolean } | null>(null)
  const [atcCharge, setAtcCharge] = useState(false)
  const [atcErreur, setAtcErreur] = useState(false)
  const atcNum = useRef(0)
  const chargerAtc = useCallback(async (offset: number) => {
    const n = ++atcNum.current
    setAtcCharge(true); setAtcErreur(false)
    try {
      const p = new URLSearchParams({ utilises: utilises && !code ? '1' : '0', offset: String(offset), limit: String(PAGE_ATC) })
      if (urlQ.trim() && !code) p.set('q', urlQ.trim())
      if (niveau && !code) p.set('niveau', String(niveau))
      if (code) p.set('code', code)
      const r = await fetch(`/api/terminologies/atc?${p}`)
      if (!r.ok) throw new Error(String(r.status))
      const d = await r.json()
      if (n !== atcNum.current) return
      setAtc(prev => (offset > 0 && prev ? { ...d, rows: [...prev.rows, ...d.rows] } : d))
    } catch {
      if (n === atcNum.current) setAtcErreur(true)
    } finally {
      if (n === atcNum.current) setAtcCharge(false)
    }
  }, [urlQ, utilises, niveau, code])
  useEffect(() => { if (onglet === 'atc') chargerAtc(0) }, [onglet, chargerAtc])

  const resume = [
    `${nombre(listes.formes.length)} ${t('formes', 'شكلًا')}`, `${nombre(listes.voies.length)} ${t('voies', 'طريقة')}`,
    `${nombre(listes.methodes.length)} ${t('méthodes', 'أسلوبًا')}`, `${nombre(listes.ucum.length)} ${t('unités', 'وحدة')}`,
  ].join(' · ')
  const cible = (l: LigneTermino) => l.code === code

  return (
    <div dir={ar ? 'rtl' : 'ltr'}>
      <div className="page-header">
        <div className="container">
          <h1>📚 {t('Terminologies', 'المصطلحات')}</h1>
          <p style={{ maxWidth: 760 }}>
            {t(
              'Les référentiels sur lesquels s’appuient les fiches : formes, voies et méthodes d’administration (EDQM), unités des dosages (UCUM) et classification ATC. Fonction en cours d’essai.',
              'المراجع التي تعتمد عليها البطاقات: الأشكال وطرق وأساليب الإعطاء (EDQM)، ووحدات الجرعات (UCUM)، والتصنيف ATC. ميزة قيد التجربة.'
            )}
          </p>
        </div>
      </div>

      <div className="page-body">
        <div className="container termino">
          <div className="termino-onglets" role="tablist" aria-label={t('Référentiels', 'المراجع')}>
            {ONGLETS.map(o => (
              <button
                key={o} type="button" role="tab" aria-selected={onglet === o}
                onClick={() => aller({ onglet: o === 'formes' ? null : o, code: null, q: null, niveau: null })}
              >
                {t(TITRES[o].fr, TITRES[o].ar)}{' '}
                <span className="termino-cnt">{o === 'atc' ? (atc && onglet === 'atc' ? nombre(atc.total) : '') : nombre(listes[o].length)}</span>
              </button>
            ))}
          </div>

          <p className="termino-sous">{t(TITRES[onglet].sous.fr, TITRES[onglet].sous.ar)}</p>

          {code ? (
            <p className="termino-banniere" role="status">
              {t('Terme', 'المصطلح')} <code dir="ltr">{code}</code>
              <button type="button" onClick={() => aller({ code: null })}>{t('Afficher toute la liste', 'عرض القائمة كاملة')}</button>
            </p>
          ) : (
            <div className="termino-filtres">
              <label className="search-bar" style={{ margin: 0, flex: '1 1 260px', maxWidth: 440 }}>
                <span className="search-bar-icon" aria-hidden>🔎</span>
                <input
                  id="termino-q" type="search" autoComplete="off" value={saisie} onChange={e => setSaisie(e.target.value)}
                  placeholder={onglet === 'atc' ? t('Code ou libellé…', 'الرمز أو التسمية…') : t('Code, libellé ou unité…', 'الرمز أو التسمية أو الوحدة…')}
                  aria-label={t('Filtrer la liste', 'تصفية القائمة')}
                />
              </label>
              {onglet === 'atc' && (
                <label className="termino-select">
                  <span>{t('Niveau', 'المستوى')}</span>
                  <select id="termino-niveau" value={niveau} onChange={e => aller({ niveau: e.target.value === '0' ? null : e.target.value })}>
                    <option value="0">{t('Tous', 'الكل')}</option>
                    {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n} · {t(NIVEAUX_ATC[n].fr, NIVEAUX_ATC[n].ar)}</option>)}
                  </select>
                </label>
              )}
              <label className="termino-case">
                <input id="termino-utilises" type="checkbox" checked={utilises} onChange={e => aller({ utilises: e.target.checked ? null : '0' })} />
                {t('Seulement les termes utilisés dans la nomenclature', 'فقط المصطلحات المستعملة في المدونة')}
              </label>
            </div>
          )}

          {onglet !== 'atc' && (
            <>
              <div className="termino-table">
                <table>
                  <thead>
                    <tr>
                      <th>{t('Code', 'الرمز')}</th>
                      <th>{t('Français', 'الفرنسية')}</th>
                      <th>{t('Anglais', 'الإنجليزية')}</th>
                      <th>{t('Arabe', 'العربية')}</th>
                      <th>{t('Traduction arabe', 'الترجمة العربية')}</th>
                      <th className="n">{t('Médicaments', 'الأدوية')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibles.map(l => {
                      const st = STATUT_AR[l.ar_statut]
                      return (
                        <tr key={l.code} ref={cible(l) ? ligneCode : undefined} className={cible(l) ? 'cible' : undefined} id={`t-${l.code}`}>
                          <td><code dir="ltr" className={`termino-code ${onglet === 'ucum' ? 'ucum' : 'edqm'}`}>{l.code}</code></td>
                          <td>{onglet === 'formes' ? <FormeIcon forme={l.fr ?? l.en} lang={lang} size={26} /> : onglet === 'voies' ? <VoieIcon voie={pastilleDeCodeEdqm(l.code)} size={20} /> : null}{l.fr ?? <span className="termino-vide">—</span>}{l.symbole && l.symbole !== l.code ? <span className="termino-sym"> ({l.symbole})</span> : null}</td>
                          <td dir="ltr" style={{ textAlign: 'start' }}>{l.en}</td>
                          <td dir="rtl" className="termino-ar">{l.ar ?? <span className="termino-vide">—</span>}</td>
                          <td><span className={`termino-pill ${st.cls}`}>{t(st.fr, st.ar)}</span></td>
                          <td className="n">{l.n ? nombre(l.n) : '0'}</td>
                        </tr>
                      )
                    })}
                    {visibles.length === 0 && (
                      <tr><td colSpan={6} className="termino-vide">
                        {t('Aucun terme ne correspond. Décochez « seulement les termes utilisés » ou changez la saisie.', 'لا يوجد مصطلح مطابق. ألغِ تحديد «المستعملة فقط» أو غيّر الكتابة.')}
                      </td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              <p className="termino-note">
                {visibles.length} {t('ligne(s) affichée(s)', 'سطر معروض')} · {resume}
              </p>
            </>
          )}

          {onglet === 'atc' && (
            <>
              <div className="termino-table">
                <table>
                  <thead>
                    <tr>
                      <th>{t('Code', 'الرمز')}</th>
                      <th>{t('Niveau', 'المستوى')}</th>
                      <th>{t('Français', 'الفرنسية')}</th>
                      <th>{t('Anglais', 'الإنجليزية')}</th>
                      <th>{t('Arabe', 'العربية')}</th>
                      <th className="n">{t('Substances', 'المواد')}</th>
                      <th className="n">{t('Médicaments', 'الأدوية')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(atc?.rows ?? []).map(r => (
                      <tr key={r.code} className={r.code === code ? 'cible' : undefined}>
                        <td><Link href={`/classes-therapeutiques/${r.code}`} dir="ltr" className="termino-code atc">{r.code}</Link></td>
                        <td className="termino-niveau">{r.niveau} · {t(NIVEAUX_ATC[r.niveau]?.fr ?? '', NIVEAUX_ATC[r.niveau]?.ar ?? '')}</td>
                        <td>{r.label_fr ?? <span className="termino-vide">—</span>}</td>
                        <td dir="ltr" style={{ textAlign: 'start' }}>{r.label_en ?? <span className="termino-vide">—</span>}</td>
                        <td dir="rtl" className="termino-ar">{r.label_ar ?? <span className="termino-vide">—</span>}</td>
                        <td className="n">{nombre(r.dci_count)}</td>
                        <td className="n">{nombre(r.medicaments)}</td>
                      </tr>
                    ))}
                    {atc && atc.rows.length === 0 && !atcCharge && (
                      <tr><td colSpan={7} className="termino-vide">
                        {atc.disponible
                          ? t('Aucun code ne correspond. Décochez « seulement les termes utilisés » ou changez le filtre.', 'لا يوجد رمز مطابق. ألغِ تحديد «المستعملة فقط» أو غيّر المرشح.')
                          : t('La classification ATC n’est pas chargée dans la base.', 'التصنيف ATC غير محمّل في قاعدة البيانات.')}
                      </td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              {atcErreur && <p className="termino-erreur" role="alert">{t('Chargement impossible. Réessayez dans un instant.', 'تعذّر التحميل. أعد المحاولة بعد قليل.')}</p>}
              {atcCharge && <p className="termino-note">{t('Chargement…', 'جارٍ التحميل…')}</p>}
              {atc && !atcCharge && (
                <p className="termino-note">
                  {nombre(atc.rows.length)} {t('sur', 'من')} {nombre(atc.total)} {t('codes', 'رمزًا')}
                  {atc.rows.length < atc.total && (
                    <> · <button type="button" className="termino-lien" onClick={() => chargerAtc(atc.rows.length)}>{t('Afficher les suivants', 'عرض التالي')}</button></>
                  )}
                </p>
              )}
            </>
          )}

          <footer className="termino-pied">
            <p>
              {onglet === 'ucum'
                ? t('Codes UCUM vérifiés avec la bibliothèque de référence ucum-lhc. UCUM ne définit pas de traductions : les noms arabes sont ceux du site.', 'رموز UCUM تم التحقق منها بالمكتبة المرجعية ucum-lhc. لا يحدد UCUM ترجمات: الأسماء العربية هي أسماء الموقع.')
                : onglet === 'atc'
                  ? t('Classification ATC de l’OMS. Les libellés arabes sont ceux importés dans la base (sql/31_atc_label_ar.sql).', 'تصنيف ATC لمنظمة الصحة العالمية. التسميات العربية هي المستوردة في قاعدة البيانات.')
                  : t(`Standard Terms © EDQM (Conseil de l’Europe), source ${listes.source_edqm}. L’EDQM ne publie pas d’arabe dans cette source : les traductions arabes sont celles de DwaDZ, en brouillon tant qu’elles n’ont pas été relues.`,
                      `Standard Terms © EDQM (مجلس أوروبا)، المصدر ${listes.source_edqm}. لا ينشر EDQM ترجمة عربية في هذا المصدر: الترجمات العربية من DwaDZ، وهي مسودات إلى أن تتم مراجعتها.`)}
            </p>
            <p>
              {listes.compteurs === 'base'
                ? t('Nombre de médicaments : lu dans la base (medicament_terminologie).', 'عدد الأدوية: مقروء من قاعدة البيانات.')
                : t('Nombre de médicaments : calculé depuis la nomenclature. Appliquez sql/39_terminologies.sql pour le stocker.', 'عدد الأدوية: محسوب من المدونة. طبّق sql/39_terminologies.sql لتخزينه.')}
            </p>
          </footer>
        </div>
      </div>
    </div>
  )
}
