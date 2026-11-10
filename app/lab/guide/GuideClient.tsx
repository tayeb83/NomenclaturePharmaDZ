'use client'

/**
 * Recherche guidée (Lab) — interface « pastilles ».
 * L'état est l'URL (?dci=…&voie=…&forme=…&dosage=…&statut=…&labo=…) : un lien se partage tel quel.
 * Toute la logique (options, étapes remplies d'office, choix retirés) vient de /api/lab/guide.
 * Deux emplacements : la page /lab/guide, et l'onglet « Guidée » de /recherche (mode `embedded`).
 * Les codes EDQM (formes, voies) et UCUM (dosages) sont toujours affichés ; le code ATC reste sur la fiche.
 */

import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLanguage } from '@/components/i18n/LanguageProvider'
import { displayName } from '@/lib/arabize'
import { getCountryFlag } from '@/lib/countryFlag'
import type { Critere, Option } from '@/lib/guide-core'

type Choix = { id: string; libelle: string; libelle_ar: string | null }
type Presentation = {
  id: number; url: string; nom_marque: string; dci: string | null; forme: string | null; dosage: string | null
  conditionnement: string | null; labo: string | null; pays: string | null; statut: string | null
  forme_norm: string; forme_ar: string | null; forme_edqm: { code: string; relation: string } | null
  dosage_norm: string; dosage_ar: string | null
  dosage_ucum: { quantites: { valeur: number; unite: string; ucum: string | null }[]; denominateur: { valeur: number; unite: string; ucum: string | null } | null }
}
type Reponse = {
  etape: Critere | null
  selection: Partial<Record<Critere, Choix>>
  auto: Critere[]
  ignores: Critere[]
  options: Partial<Record<Critere, Option[]>>
  total: number
  presentations: Presentation[]
}

const ETAPES: Critere[] = ['dci', 'voie', 'forme', 'dosage']
const PARAMS: Critere[] = ['dci', 'voie', 'forme', 'dosage', 'statut', 'labo']
const NOMS: Record<Critere, { fr: string; ar: string }> = {
  dci: { fr: 'Substance', ar: 'المادة الفعالة' },
  voie: { fr: 'Voie', ar: 'طريقة الاستعمال' },
  forme: { fr: 'Forme', ar: 'الشكل' },
  dosage: { fr: 'Dosage', ar: 'الجرعة' },
  statut: { fr: 'Origine', ar: 'المصدر' },
  labo: { fr: 'Laboratoire', ar: 'المخبر' },
}
const QUESTIONS: Record<string, { fr: string; ar: string }> = {
  voie: { fr: 'Comment se prend-il ?', ar: 'كيف يُستعمل؟' },
  forme: { fr: 'Sous quelle forme ?', ar: 'بأي شكل؟' },
  dosage: { fr: 'Quel dosage ?', ar: 'أي جرعة؟' },
}
const RELATIONS: Record<string, { fr: string; ar: string }> = {
  exact: { fr: 'terme EDQM', ar: 'مصطلح EDQM' },
  'plus-large': { fr: 'terme EDQM plus large', ar: 'مصطلح EDQM أعم' },
  proche: { fr: 'terme EDQM proche, à confirmer', ar: 'مصطلح EDQM قريب، قيد التأكيد' },
}
const LIMITE = 30
const ICONES_VOIE: Record<string, string> = { 'orale-solide': '💊', 'orale-liquide': '🥄', injectable: '💉', rectale: '🔹', cutanee: '🧴', ophtalmique: '👁️', nasale: '👃', inhalee: '🌬️', auriculaire: '👂', buccale: '👄', vaginale: '🌸', transdermique: '🩹', autre: '•' }

/** « AMOXICILLINE TRIHYDRATEE EXPRIME EN AMOXICILLINE » → nom + précision (sel, expression). */
function morceauxDci(libelle: string, lang: string): { nom: string; detail: string } {
  const noms: string[] = []
  const details: string[] = []
  for (const part of libelle.split(' + ')) {
    const m = part.match(/^(.*?)\s+((?:EXPRIM[EÉ]E?\s+EN|\(?SOUS FORME)\b.*)$/i)
    noms.push(displayName(m ? m[1] : part, lang as 'fr' | 'ar'))
    if (m) details.push(m[2])
  }
  const casse = (t: string) => (t === t.toUpperCase() ? t.toLowerCase().replace(/^\p{L}/u, c => c.toUpperCase()) : t)
  return { nom: noms.map(casse).join(' + '), detail: details.map(d => d.toLowerCase()).join(' · ') }
}

function ucumTexte(d: Presentation['dosage_ucum']): string {
  const q = d.quantites.map(x => `${x.valeur} ${x.ucum ?? `(${x.unite})`}`).join(' + ')
  if (!q) return ''
  return d.denominateur ? `${q} / ${d.denominateur.valeur} ${d.denominateur.ucum ?? `(${d.denominateur.unite})`}` : q
}

export function GuideClient({ embedded = false, basePath, extraParams }: { embedded?: boolean; basePath?: string; extraParams?: Record<string, string> } = {}) {
  const { lang } = useLanguage()
  const ar = lang === 'ar'
  const t = useCallback((fr: string, a: string) => (ar ? a : fr), [ar])
  const router = useRouter()
  const pn = usePathname()
  const pathname = basePath ?? pn ?? '/lab/guide'
  const sp = useSearchParams()

  const sel = useMemo(() => {
    const s: Partial<Record<Critere, string>> = {}
    for (const c of PARAMS) { const v = sp.get(c); if (v) s[c] = v }
    return s
  }, [sp])
  const cle = PARAMS.map(c => sel[c] ?? '').join('|')

  const [saisie, setSaisie] = useState('')
  const [suggestions, setSuggestions] = useState<Option[] | null>(null)
  const [rep, setRep] = useState<Reponse | null>(null)
  const [ouvert, setOuvert] = useState<Critere | null>(null)
  const [limite, setLimite] = useState(LIMITE)
  const codes = true
  const [charge, setCharge] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)
  const numero = useRef(0)
  const champ = useRef<HTMLInputElement>(null)

  const appeler = useCallback(async (params: Record<string, string>): Promise<Reponse | null> => {
    const n = ++numero.current
    setCharge(true)
    try {
      const r = await fetch(`/api/lab/guide?${new URLSearchParams({ ...params, lang })}`)
      if (n !== numero.current) return null // une requête plus récente est partie
      if (!r.ok) {
        setErreur(r.status === 429
          ? t('Trop de requêtes à la suite. Patientez quelques secondes.', 'طلبات كثيرة متتالية. انتظر بضع ثوانٍ.')
          : t('La recherche guidée est indisponible pour le moment. Réessayez dans un instant.', 'البحث الموجَّه غير متاح حاليًا. أعد المحاولة بعد قليل.'))
        return null
      }
      setErreur(null)
      return (await r.json()) as Reponse
    } catch {
      if (n === numero.current) setErreur(t('Connexion impossible. Vérifiez votre réseau puis réessayez.', 'تعذّر الاتصال. تحقق من الشبكة ثم أعد المحاولة.'))
      return null
    } finally {
      if (n === numero.current) setCharge(false)
    }
  }, [lang, t])

  // Parcours : toute modification de l'URL relance le calcul
  useEffect(() => {
    if (!sel.dci) { setRep(null); return }
    const params: Record<string, string> = { limit: String(limite) }
    for (const c of PARAMS) if (sel[c]) params[c] = sel[c]!
    appeler(params).then(r => {
      if (!r) return
      // substance inconnue (lien périmé après un import) : retour à la première étape
      if (!r.selection.dci) { setRep(null); aller({}); return }
      setRep(r); setOuvert(null)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cle, limite, appeler])

  // Première étape : suggestions pendant la saisie (délai pour rester sous la limite de débit)
  useEffect(() => {
    if (sel.dci) return
    const q = saisie.trim()
    if (q.length < 2) { setSuggestions(null); return }
    const h = setTimeout(() => { appeler({ q }).then(r => { if (r) setSuggestions(r.options.dci ?? []) }) }, 300)
    return () => clearTimeout(h)
  }, [saisie, sel.dci, appeler])

  const aller = useCallback((suivant: Partial<Record<Critere, string>>) => {
    const p = new URLSearchParams(extraParams)
    for (const c of PARAMS) if (suivant[c]) p.set(c, suivant[c]!)
    setLimite(LIMITE)
    router.replace(p.size ? `${pathname}?${p}` : pathname, { scroll: false })
  }, [router, pathname, extraParams])

  const choisir = (c: Critere, id: string) => aller({ ...sel, [c]: id })
  const retirer = (c: Critere) => {
    if (c === 'dci') { setSaisie(''); setSuggestions(null); aller({}); setTimeout(() => champ.current?.focus(), 0); return }
    const s = { ...sel }; delete s[c]; aller(s)
  }

  const lib = (o: { libelle: string; libelle_ar: string | null }) => (ar && o.libelle_ar ? o.libelle_ar : o.libelle)
  const libDci = (o: { libelle: string }) => o.libelle.split(' + ').map(x => displayName(x, lang)).join(' + ')
  const fleche = ar ? '←' : '→'
  const etape = ouvert ?? rep?.etape ?? null
  const fini = !!rep && rep.etape === null && !ouvert
  const optionsEtape = etape && etape !== 'dci' ? rep?.options[etape] ?? [] : []

  const nbPres = (n: number) => `${n} ${t(n > 1 ? 'présentations' : 'présentation', n > 2 ? 'عروض' : 'عرض')}`

  return (
    <div dir={ar ? 'rtl' : 'ltr'}>
      {!embedded && (
        <div className="page-header">
          <div className="container">
            <h1>🧪 {t('Recherche guidée', 'البحث الموجَّه')}</h1>
            <p style={{ maxWidth: 720 }}>
              {t(
                'Trouvez un médicament pas à pas : la substance, puis la voie, la forme et le dosage. Fonction en cours d’essai.',
                'اعثر على دواء خطوة بخطوة: المادة الفعالة، ثم طريقة الاستعمال، فالشكل والجرعة. ميزة قيد التجربة.'
              )}
            </p>
          </div>
        </div>
      )}

      <div className={embedded ? undefined : 'page-body'}>
        <div className={embedded ? 'guide' : 'container guide'}>
          {/* ── Étape 1 : substance ou marque ── */}
          {!sel.dci && (
            <section className="guide-accueil">
              <label className="guide-question" htmlFor="guide-saisie">{t('Quelle substance ou quelle marque ?', 'أي مادة فعالة أو أي اسم تجاري؟')}</label>
              <p className="guide-aide">{t('Un parcours en quatre temps : substance, voie, forme, dosage. Le nom de marque fonctionne aussi.', 'مسار من أربع خطوات: المادة، الطريقة، الشكل، الجرعة. الاسم التجاري يصلح أيضًا.')}</p>
              <Link className="guide-mode-emploi" href={`/articles/recherche-guidee-medicament-algerie-mode-emploi${ar ? '-ar' : ''}`}>
                📖 {t('Mode d’emploi avec exemples', 'دليل الاستعمال مع أمثلة')}
              </Link>
              <div className="search-bar guide-saisie">
                <span className="search-bar-icon" aria-hidden>🔎</span>
                <input
                  id="guide-saisie" ref={champ} type="search" autoComplete="off" autoFocus={!embedded} value={saisie}
                  onChange={e => setSaisie(e.target.value)}
                  placeholder={t('Ex. amoxicilline, paracétamol, Augmentin…', 'مثال: amoxicilline، paracétamol، Augmentin…')}
                />
              </div>
              {suggestions && suggestions.length === 0 && !charge && (
                <p className="guide-vide">
                  {t('Aucune substance ne correspond à cette saisie. Vérifiez l’orthographe ou essayez le nom de marque.', 'لا توجد مادة مطابقة. تحقق من الكتابة أو جرّب الاسم التجاري.')}{' '}
                  <Link href={`/recherche?q=${encodeURIComponent(saisie.trim())}`}>{t('Chercher dans tout le site', 'ابحث في كامل الموقع')}</Link>
                </p>
              )}
              {suggestions && suggestions.length > 0 && (
                <ul className="guide-liste" aria-label={t('Substances proposées', 'المواد المقترحة')}>
                  {suggestions.map(o => {
                    const m = morceauxDci(o.libelle, lang)
                    return (
                      <li key={o.id}>
                        <button type="button" className="guide-ligne" onClick={() => choisir('dci', o.id)}>
                          <span className="guide-ligne-texte">
                            <strong>{m.nom}</strong>
                            {m.detail && <small>{m.detail}</small>}
                            {o.marques?.length ? <small className="guide-via">{t('via', 'عبر')} {o.marques.join(', ')}</small> : null}
                          </span>
                          <span className="guide-ligne-n">{nbPres(o.n)}</span>
                          <span className="guide-ligne-fleche" aria-hidden>{fleche}</span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>
          )}

          {erreur && <p className="guide-erreur" role="alert">{erreur}</p>}

          {/* ── Parcours ── */}
          {sel.dci && rep && (
            <>
              <nav className="guide-pastilles" aria-label={t('Votre parcours', 'مسارك')}>
                {ETAPES.map((c, i) => {
                  const s = rep.selection[c]
                  const suivant = !s && rep.etape === c
                  if (!s && !suivant) return null
                  const auto = rep.auto.includes(c)
                  return (
                    <span key={c} className="guide-maillon">
                      {i > 0 && <span className="guide-fleche" aria-hidden>{fleche}</span>}
                      {s ? (
                        <span className={`guide-pastille choisie${auto ? ' auto' : ''}${ouvert === c ? ' ouverte' : ''}`}>
                          <span className="guide-pastille-num" aria-hidden>{i + 1}</span>
                          <button
                            type="button" className="guide-pastille-corps" disabled={c === 'dci'}
                            onClick={() => setOuvert(ouvert === c ? null : c)}
                            title={auto ? t('Rempli automatiquement : seule valeur possible', 'مُلئ تلقائيًا: القيمة الوحيدة الممكنة') : t('Modifier ce choix', 'تعديل هذا الاختيار')}
                          >
                            <span className="guide-pastille-nom">{t(NOMS[c].fr, NOMS[c].ar)}</span>
                            {c === 'dci' ? morceauxDci(s.libelle, lang).nom : lib(s)}
                          </button>
                          {!auto && (
                            <button type="button" className="guide-pastille-x" onClick={() => retirer(c)} aria-label={t(`Retirer ${NOMS[c].fr.toLowerCase()}`, `إزالة ${NOMS[c].ar}`)}>✕</button>
                          )}
                        </span>
                      ) : (
                        <span className="guide-pastille suivante"><span className="guide-pastille-num" aria-hidden>{i + 1}</span>{t(NOMS[c].fr, NOMS[c].ar)}</span>
                      )}
                    </span>
                  )
                })}
              </nav>

              {rep.auto.length > 0 && (
                <p className="guide-note">
                  <span className="guide-pastille-legende" aria-hidden /> {t('Liseré doré : rempli automatiquement, une seule valeur existe pour cette substance.', 'الإطار الذهبي: مُلئ تلقائيًا، توجد قيمة واحدة فقط لهذه المادة.')}
                </p>
              )}
              {rep.ignores.length > 0 && (
                <p className="guide-note" role="status">
                  {t('Choix retiré car incompatible avec le reste : ', 'اختيار أُزيل لعدم توافقه مع الباقي: ')}
                  {rep.ignores.map(c => t(NOMS[c].fr.toLowerCase(), NOMS[c].ar)).join(t(', ', '، '))}.
                </p>
              )}

              {/* ── Choix de l'étape en cours ── */}
              {etape && etape !== 'dci' && (
                <section className="guide-etape">
                  <h2 className="guide-question">{t(QUESTIONS[etape].fr, QUESTIONS[etape].ar)}</h2>
                  <div className="guide-choix">
                    {optionsEtape.map(o => {
                      const actif = rep.selection[etape]?.id === o.id
                      return (
                        <button key={o.id} type="button" className={`guide-carte${actif ? ' active' : ''}`} onClick={() => choisir(etape, o.id)} aria-pressed={actif}>
                          <span className="guide-carte-tete">
                            {etape === 'voie' && <span className="guide-carte-icone" aria-hidden>{ICONES_VOIE[o.id] ?? '•'}</span>}
                            <strong>{etape === 'voie' && o.courant ? o.courant : lib(o)}</strong>
                          </span>
                          <small>
                            {etape === 'voie' && o.courant ? `${lib(o)} · ` : ''}
                            {nbPres(o.n)}
                          </small>
                          {o.edqm && (
                            <span className="code code-edqm" dir="ltr" title={t(RELATIONS[o.edqm.relation].fr, RELATIONS[o.edqm.relation].ar)}>
                              EDQM {o.edqm.code}{o.edqm.relation !== 'exact' ? ` ${o.edqm.relation === 'proche' ? '≈' : '⊂'}` : ''}
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </section>
              )}

              {/* ── Filtres ── */}
              <div className="guide-filtres">
                <div className="guide-segments" role="group" aria-label={t(NOMS.statut.fr, NOMS.statut.ar)}>
                  <button type="button" className={!rep.selection.statut ? 'actif' : ''} onClick={() => retirer('statut')}>{t('Toutes origines', 'كل المصادر')}</button>
                  {(rep.options.statut ?? []).filter(o => o.id !== 'non-precise').map(o => (
                    <button key={o.id} type="button" className={rep.selection.statut?.id === o.id ? 'actif' : ''} onClick={() => choisir('statut', o.id)}>
                      {o.id === 'f' ? '🇩🇿 ' : ''}{lib(o)} <span className="guide-n">{o.n}</span>
                    </button>
                  ))}
                </div>
                <label className="guide-select">
                  <span>{t(NOMS.labo.fr, NOMS.labo.ar)}</span>
                  <select id="guide-labo" value={rep.selection.labo?.id ?? ''} onChange={e => (e.target.value ? choisir('labo', e.target.value) : retirer('labo'))}>
                    <option value="">{t('Tous', 'الكل')}</option>
                    {(rep.options.labo ?? []).map(o => <option key={o.id} value={o.id}>{o.libelle} ({o.n})</option>)}
                  </select>
                </label>
              </div>

              {/* ── Présentations ── */}
              <section aria-live="polite">
                <h2 className="guide-compte">
                  <b>{rep.total}</b> {t(rep.total > 1 ? 'présentations' : 'présentation', rep.total > 2 ? 'عروض' : 'عرض')}
                  {!fini && rep.etape && <span> · {t(`précisez ${NOMS[rep.etape].fr.toLowerCase()} pour réduire la liste`, `حدّد ${NOMS[rep.etape].ar} لتقليص القائمة`)}</span>}
                </h2>
                <ul className="guide-resultats">
                  {rep.presentations.map(p => (
                    <li key={p.id}>
                      <Link href={p.url} className="guide-resultat">
                        <span className="guide-resultat-titre">
                          <strong>{displayName(p.nom_marque, lang)}</strong>
                          {p.statut === 'F' && <span className="guide-local">🇩🇿 {t('Fabriqué en Algérie', 'مصنع في الجزائر')}</span>}
                        </span>
                        <span className="guide-resultat-ligne">
                          {(ar && p.forme_ar) || p.forme_norm} · <span dir="ltr">{(ar && p.dosage_ar) || p.dosage_norm}</span>
                          {p.conditionnement ? <> · <span dir="ltr">{p.conditionnement}</span></> : null}
                        </span>
                        <span className="guide-resultat-labo">{p.labo}{p.pays ? ` ${getCountryFlag(p.pays)}` : ''}</span>
                        <span className="guide-codes" dir="ltr">
                          <span className="code code-edqm" title={p.forme ? `${t('nomenclature', 'المدونة')} : ${p.forme}` : undefined}>
                            {p.forme_edqm ? `EDQM ${p.forme_edqm.code}${p.forme_edqm.relation === 'exact' ? '' : p.forme_edqm.relation === 'proche' ? ' ≈' : ' ⊂'}` : 'EDQM —'}
                          </span>
                          <span className="code code-ucum" title={p.dosage ? `${t('nomenclature', 'المدونة')} : ${p.dosage}` : undefined}>
                            {ucumTexte(p.dosage_ucum) ? `UCUM ${ucumTexte(p.dosage_ucum)}` : 'UCUM —'}
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
                {rep.total > rep.presentations.length && limite < 100 && (
                  <button type="button" className="page-btn" onClick={() => setLimite(100)}>
                    {t(`Afficher plus (${Math.min(100, rep.total)} sur ${rep.total})`, `عرض المزيد (${Math.min(100, rep.total)} من ${rep.total})`)}
                  </button>
                )}
                {rep.total > 100 && limite >= 100 && (
                  <p className="guide-aide">{t('Liste limitée à 100. Précisez la forme ou le dosage pour voir le reste.', 'القائمة محدودة بـ 100. حدّد الشكل أو الجرعة لرؤية الباقي.')}</p>
                )}
              </section>
            </>
          )}

          {sel.dci && !rep && !erreur && <p className="guide-aide">{t('Chargement…', 'جارٍ التحميل…')}</p>}
        </div>
      </div>
    </div>
  )
}
