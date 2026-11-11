import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { isLang, pickLang, type Lang } from '@/lib/i18n'
import { HDO_PURL, HDO_SOURCE, allergieParCode, nomAgent, type AllergieHdo } from '@/lib/allergies-core'
import { getDcisAllergie } from '@/lib/allergies'
import { CodeHdo } from '@/components/drug/AllergiesSection'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://www.dzair-pharma.net'

export const revalidate = 86400

export function generateMetadata({ params }: { params: { code: string } }): Metadata {
  const a = allergieParCode(decodeURIComponent(params.code))
  if (!a) return { title: 'Allergie introuvable', robots: { index: false, follow: false } }
  // Fiche de référence, brouillon de traduction : hors de l'index tant que les libellés ne sont pas relus.
  return {
    title: `${a.fr ?? a.en} (HDO ${a.code})`,
    description: `${a.en} — allergie documentée (Human Disease Ontology), rattachement aux substances de la nomenclature algérienne.`,
    robots: { index: false, follow: true },
    alternates: { canonical: `${APP_URL}/allergies/${a.code}` },
  }
}

const RELATION_TEXTE: Record<string, { fr: string; ar: string }> = {
  exact: { fr: 'L\'allergie vise cette substance précisément (même fraction active ; un sel ne change pas la relation).', ar: 'الحساسية خاصة بهذه المادة تحديدًا (الجزء الفعال نفسه، والملح لا يغيّر العلاقة).' },
  proche: { fr: 'Rattachement à une substance proche de l\'agent, à confirmer.', ar: 'ارتباط بمادة قريبة من العامل المسبب، قيد التأكيد.' },
  classe: { fr: 'L\'allergie vise une classe : elle s\'applique à toutes les substances de ces codes ATC, et à elles seulement. Aucune allergie croisée n\'en est déduite.', ar: 'الحساسية خاصة بصنف: تنطبق على كل المواد ضمن رموز ATC هذه وحدها، ولا يُستنتج منها أي تصالب.' },
  aucun: { fr: 'Pas de rattachement à une substance de médicament.', ar: 'لا ارتباط بمادة دوائية.' },
}
const PERIMETRE_TEXTE: Record<string, { fr: string; ar: string }> = {
  excipient: { fr: 'Allergène pertinent comme excipient (lait, œuf, conservateur…). La nomenclature algérienne ne porte pas la composition en excipients : aucune fiche ne peut lui être rattachée ; voir le RCP.', ar: 'مسبّب حساسية مهم كسواغ. لا تتضمن المدونة الجزائرية تركيبة السواغات، فلا يمكن ربطه بأي بطاقة؛ راجع ملخص خصائص المنتج.' },
  conditionnement: { fr: 'Matériau (latex) pertinent pour le conditionnement (bouchons, seringues). Non porté par la nomenclature.', ar: 'مادة (اللاتكس) تهم التغليف (السدادات، المحاقن). لا تتضمنها المدونة.' },
}

const dciHref = (dci: string) => `/dci/${encodeURIComponent(dci.toLowerCase())}`

export default async function AllergiePage({ params }: { params: { code: string } }) {
  const a: AllergieHdo | null = allergieParCode(decodeURIComponent(params.code))
  if (!a) notFound()
  const langCookie = cookies().get('lang')?.value
  const lang: Lang = isLang(langCookie) ? langCookie : 'fr'
  const dcis = await getDcisAllergie(a).catch(() => [])
  const total = dcis.reduce((s, d) => s + d.n, 0)
  const agent = a.agents[0]

  return (
    <>
      <div className="page-header" style={{ background: 'linear-gradient(135deg, #0f172a, #1e3a5f)' }}>
        <div className="container">
          <Link href="/recherche" className="detail-back-link">{pickLang(lang, { fr: '← Recherche', ar: '→ البحث' })}</Link>
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontFamily: 'var(--font-mono)', fontWeight: 600, letterSpacing: '.08em', marginBottom: 6 }}>
              {pickLang(lang, { fr: 'ALLERGIE DOCUMENTÉE · HUMAN DISEASE ONTOLOGY', ar: 'حساسية موثّقة · HUMAN DISEASE ONTOLOGY' })}
            </div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 800, color: 'white', margin: 0 }} lang="fr" dir="ltr">
              {a.fr ?? a.en}
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.65)', marginTop: 8, fontSize: 15 }}>
              <CodeHdo code={a.code} relation={a.relation} titre={`HDO DOID:${a.code}`} /> <span dir="ltr">{a.en}</span>
            </p>
          </div>
        </div>
      </div>

      <div className="page-body">
        <div className="container" style={{ maxWidth: 900 }}>
          <div className="alert-banner warning" style={{ marginBottom: 20 }}>
            <strong>{pickLang(lang, { fr: 'Information, pas une contre-indication.', ar: 'معلومة وليست مانع استعمال.' })}</strong>{' '}
            {pickLang(lang, {
              fr: 'Cette fiche décrit une allergie recensée dans la littérature ; elle ne remplace ni le RCP ni l\'avis d\'un professionnel de santé. Le libellé français est un brouillon.',
              ar: 'تصف هذه البطاقة حساسية مذكورة في الأدبيات الطبية، ولا تغني عن ملخص خصائص المنتج ولا عن استشارة مختص صحي. التسمية الفرنسية مسودة.',
            })}
          </div>

          <section className="fiche-box" style={{ marginBottom: 20 }}>
            <h2 className="fiche-box-title">{pickLang(lang, { fr: 'Description', ar: 'الوصف' })}</h2>
            <table className="fiche-table"><tbody>
              <tr><th>{pickLang(lang, { fr: 'Définition (HDO)', ar: 'التعريف (HDO)' })}</th><td dir="ltr" lang="en">{a.definition_en}</td></tr>
              <tr><th>{pickLang(lang, { fr: 'Agent déclencheur', ar: 'العامل المسبب' })}</th>
                <td>
                  <strong>{nomAgent(a)}</strong>
                  {a.agents.map(g => (
                    <span key={g.id ?? g.en} style={{ marginInlineStart: 8, fontSize: 12.5 }} dir="ltr">
                      {g.uri ? <a href={g.uri} target="_blank" rel="noopener noreferrer nofollow">{g.id}</a> : g.id}
                    </span>
                  ))}
                </td></tr>
              <tr><th>{pickLang(lang, { fr: 'Rattachement', ar: 'الارتباط' })}</th>
                <td>
                  <span className="hdo-rel">{a.relation}</span>{' '}
                  {pickLang(lang, RELATION_TEXTE[a.relation])}
                  {a.note && <div style={{ fontSize: 12.5, color: '#5b6577', marginTop: 4 }}>{a.note}</div>}
                </td></tr>
              {a.atc.length > 0 && (
                <tr><th>{a.relation === 'classe' ? pickLang(lang, { fr: 'Codes ATC de la classe', ar: 'رموز ATC للصنف' }) : pickLang(lang, { fr: 'Codes ATC de la substance', ar: 'رموز ATC للمادة' })}</th>
                  <td dir="ltr" style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5 }}>{a.atc.join(' · ')}</td></tr>
              )}
              <tr><th>{pickLang(lang, { fr: 'Dans DwaDZ', ar: 'في DwaDZ' })}</th>
                <td>{a.perimetre === 'fiche' ? pickLang(lang, { fr: 'Affichée sur les fiches des médicaments concernés (onglet Allergies) et dans le filtre « Allergie connue » de la recherche.', ar: 'تظهر في بطاقات الأدوية المعنية (تبويب الحساسيات) وفي مرشح «حساسية معروفة» في البحث.' }) : pickLang(lang, PERIMETRE_TEXTE[a.perimetre])}</td></tr>
            </tbody></table>
          </section>

          {a.perimetre === 'fiche' && (
            <section className="fiche-box" style={{ marginBottom: 20 }}>
              <h2 className="fiche-box-title">
                {pickLang(lang, { fr: `Médicaments concernés dans la nomenclature (${dcis.length} DCI, ${total} présentations)`, ar: `الأدوية المعنية في المدونة (${dcis.length} مادة، ${total} تقديمًا)` })}
              </h2>
              <div style={{ padding: '10px 12px' }}>
                {dcis.length === 0 ? (
                  <p style={{ margin: 0, color: '#5b6577' }}>{pickLang(lang, { fr: 'Aucune DCI de la nomenclature n\'est rattachée à cette allergie (ou la liste est momentanément indisponible).', ar: 'لا توجد مادة في المدونة مرتبطة بهذه الحساسية (أو أن القائمة غير متاحة مؤقتًا).' })}</p>
                ) : (
                  <ul className="hdo-liste">
                    {dcis.map(d => (
                      <li key={d.dci} className="hdo-ligne">
                        <Link href={dciHref(d.dci)} className="hdo-nom" dir="ltr">{d.dci}</Link>
                        <span className="hdo-rel">{d.n} {pickLang(lang, { fr: d.n > 1 ? 'présentations' : 'présentation', ar: 'تقديم' })}</span>
                        {a.relation === 'classe' && <span style={{ fontSize: 12.5, color: '#5b6577' }} dir="ltr">ATC {d.via}</span>}
                      </li>
                    ))}
                  </ul>
                )}
                <p style={{ fontSize: 13, color: '#5b6577', margin: '12px 0 0' }}>
                  <Link href={`/recherche?allergie=${a.code}`} style={{ color: 'var(--blue)' }}>
                    {pickLang(lang, { fr: 'Signaler cette allergie dans la recherche ›', ar: 'تمييز هذه الحساسية في البحث ‹' })}
                  </Link>
                </p>
              </div>
            </section>
          )}

          <p style={{ fontSize: 13, color: '#5b6577', lineHeight: 1.7 }}>
            {pickLang(lang, { fr: 'Source : ', ar: 'المصدر: ' })}{HDO_SOURCE} —{' '}
            <a href={HDO_PURL(a.code)} target="_blank" rel="noopener noreferrer nofollow" dir="ltr">DOID:{a.code}</a>
            {a.sources.length > 0 && <> · {pickLang(lang, { fr: 'références : ', ar: 'المراجع: ' })}
              {a.sources.slice(0, 6).map((u, i) => (
                <span key={u}>{i > 0 && ', '}<a href={u} target="_blank" rel="noopener noreferrer nofollow" dir="ltr">{u.replace(/^https?:\/\/(www\.)?/, '').replace(/ncbi\.nlm\.nih\.gov\/pubmed\//, 'PubMed ')}</a></span>
              ))}</>}
          </p>
        </div>
      </div>
    </>
  )
}
