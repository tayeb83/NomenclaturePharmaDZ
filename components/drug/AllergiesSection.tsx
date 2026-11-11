import Link from 'next/link'
import { pickLang, type Lang } from '@/lib/i18n'
import { CASBAH as C } from '@/lib/garde-ornaments'
import { HDO_SOURCE, SIGNE_RELATION, nomAgent, type AllergieHdo, type AllergieMatch, type AllergiesFiche } from '@/lib/allergies-core'

/**
 * Allergies HDO de la substance d'une fiche : trois niveaux — la substance, ses classes (par l'ATC),
 * les excipients grisés (non évaluables : la nomenclature ne porte pas la composition en excipients).
 * Information tirée de la Human Disease Ontology : ni contre-indication ni avis médical, et aucune allergie
 * croisée n'est déduite. Le code HDO vient devant chaque allergie et mène à la fiche de l'allergie.
 */

const DISPLAY = 'var(--font-display, Amiri, Georgia, serif)'
const small: React.CSSProperties = { fontSize: 12.5, color: C.muted }
const t = (lang: Lang, fr: string, ar: string) => pickLang(lang, { fr, ar })

/** Noms arabes des six classes (brouillon, comme les autres traductions DwaDZ en attente de relecture). */
const CLASSE_AR: Record<string, string> = {
  '0060520': 'البنسلينات', '0060519': 'البيتا-لاكتام', '0040021': 'السيفالوسبورينات',
  '0040032': 'الكاربابينيمات', '0040015': 'السلفوناميدات المضادة للجراثيم', '0040014': 'الكورتيكوستيرويدات',
}

export const lienAllergie = (code: string) => `/allergies/${code}`

/** Code HDO en puce cliquable : même gabarit que les codes EDQM et UCUM de la fiche. */
export function CodeHdo({ code, relation, titre }: { code: string; relation: 'exact' | 'classe' | 'proche' | 'aucun'; titre: string }) {
  const signe = relation === 'aucun' ? '' : SIGNE_RELATION[relation]
  return (
    <Link href={lienAllergie(code)} rel="nofollow" className="fiche-code hdo" dir="ltr" title={titre}>
      HDO {code}{signe}
    </Link>
  )
}

function Ligne({ a, relation, texteRelation, detail, lang, gris }: {
  a: AllergieHdo; relation: 'exact' | 'classe' | 'proche' | 'aucun'; texteRelation: string; detail?: string; lang: Lang; gris?: boolean
}) {
  const nom = lang === 'ar' && CLASSE_AR[a.code] ? CLASSE_AR[a.code] : null
  return (
    <li className={`hdo-ligne${gris ? ' gris' : ''}`}>
      <CodeHdo code={a.code} relation={relation} titre={`${a.en} — HDO DOID:${a.code}`} />
      <Link href={lienAllergie(a.code)} className="hdo-nom" dir={nom ? 'rtl' : 'ltr'} lang={nom ? 'ar' : 'fr'}>
        {nom ? <>{t(lang, 'Allergie — ', 'حساسية ')}{nom}</> : (a.fr ?? a.en)}
      </Link>
      <span className="hdo-rel">{texteRelation}</span>
      {detail && <span style={small} dir="ltr">{detail}</span>}
    </li>
  )
}

const classesAtc = (a: AllergieHdo) => `ATC ${a.atc.slice(0, 4).join(' + ')}${a.atc.length > 4 ? ' …' : ''}`

function Groupe({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="hdo-groupe">{titre}</h3>
      <ul className="hdo-liste">{children}</ul>
    </div>
  )
}

export function nombreAllergies(f: AllergiesFiche | null): number {
  return f ? f.substance.length + f.classes.length : 0
}

export function AllergiesSection({ fiche, lang, id = 'allergies' }: { fiche: AllergiesFiche; lang: Lang; id?: string }) {
  const n = nombreAllergies(fiche)
  if (n === 0) return null
  const texteSubstance = (m: AllergieMatch) =>
    m.relation === 'proche' ? t(lang, 'rattachement à confirmer', 'ارتباط قيد التأكيد') : t(lang, 'substance', 'المادة نفسها')
  return (
    <section id={id} style={{ margin: '28px 0 8px', scrollMarginTop: 16, border: `2px solid ${C.brass}`, borderRadius: 16, background: C.cream, boxShadow: '0 6px 18px rgba(18,35,63,.12)', overflow: 'hidden' }}>
      <div style={{ background: `linear-gradient(135deg, ${C.blueDeep} 0%, ${C.navyDeep} 100%)`, color: 'white', padding: '14px 20px', borderBottom: `1px solid ${C.brass}` }}>
        <h2 style={{ margin: 0, fontFamily: DISPLAY, fontSize: 24, fontWeight: 700, color: C.brassLight, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {t(lang, 'Allergies documentées', 'الحساسيات الموثّقة')}
          <span className="fiche-code hdo" style={{ background: 'white' }}>HDO · {n}</span>
        </h2>
        <p style={{ margin: '4px 0 0', fontSize: 14.5, color: 'rgba(255,255,255,.88)' }}>
          {t(lang,
            'Allergies décrites dans la littérature pour la substance de ce médicament, et pour sa classe. Elles valent pour toutes les spécialités qui la contiennent.',
            'حساسيات موثّقة في الأدبيات الطبية للمادة الفعالة في هذا الدواء ولصنفها، وهي سارية على كل الأدوية التي تحتويها.')}
        </p>
      </div>

      <div style={{ padding: '14px 20px 18px', display: 'grid', gap: 14 }}>
        <div style={{ background: 'white', border: `1px solid ${C.creamEdge}`, borderInlineStart: `4px solid ${C.brass}`, borderRadius: 8, padding: '9px 14px', fontSize: 14, color: C.ink }}>
          <strong>{t(lang, 'Information, pas une contre-indication.', 'معلومة وليست مانع استعمال.')}</strong>{' '}
          {t(lang,
            'Cette liste recense des allergies décrites ; elle ne remplace ni le RCP ni l\'avis d\'un médecin ou d\'un pharmacien. L\'absence d\'une allergie ici ne signifie pas qu\'il n\'y a pas de risque. DwaDZ ne déduit aucune allergie croisée entre substances voisines.',
            'تُحصي هذه القائمة حساسيات موثّقة، ولا تغني عن ملخص خصائص المنتج ولا عن استشارة الطبيب أو الصيدلي. غياب حساسية هنا لا يعني انعدام الخطر. لا يستنتج الموقع أي حساسية متصالبة بين المواد المتقاربة.')}
          {lang === 'ar' && <> <span style={{ color: '#92400e' }}>{'ترجمة قيد المراجعة: تظهر أسماء الحساسيات بالفرنسية.'}</span></>}
        </div>

        {fiche.substance.length > 0 && (
          <Groupe titre={t(lang, 'Cette substance', 'هذه المادة')}>
            {fiche.substance.map(m => (
              <Ligne key={m.allergie.code} a={m.allergie} relation={m.relation} lang={lang}
                texteRelation={texteSubstance(m)} detail={m.allergie.agents[0]?.id ?? undefined} />
            ))}
          </Groupe>
        )}

        {fiche.classes.length > 0 && (
          <Groupe titre={t(lang, 'Classes de la substance (selon l\'ATC)', 'أصناف المادة (حسب ATC)')}>
            {fiche.classes.map(m => (
              <Ligne key={m.allergie.code} a={m.allergie} relation="classe" lang={lang}
                texteRelation={t(lang, 'classe', 'صنف')} detail={classesAtc(m.allergie)} />
            ))}
          </Groupe>
        )}

        <details className="hdo-excipients">
          <summary>{t(lang, `Excipients à surveiller, non évaluables (${fiche.excipients.length})`, `السواغات الواجب الانتباه لها، غير قابلة للتقييم (${fiche.excipients.length})`)}</summary>
          <p style={{ ...small, margin: '8px 0' }}>
            {t(lang,
              'La nomenclature algérienne ne donne pas la composition en excipients : ces allergies ne peuvent pas être rapprochées de cette fiche. Voir la composition dans le RCP.',
              'لا تقدّم المدونة الجزائرية تركيبة السواغات: لا يمكن ربط هذه الحساسيات بهذه البطاقة. راجع التركيبة في ملخص خصائص المنتج.')}
          </p>
          <ul className="hdo-liste">
            {fiche.excipients.map(a => (
              <Ligne key={`${a.code}-${a.en}`} a={a} relation="aucun" gris lang={lang} texteRelation={nomAgent(a)} />
            ))}
          </ul>
        </details>

        <p style={{ ...small, margin: 0, lineHeight: 1.6 }}>
          {t(lang, 'Source : ', 'المصدر: ')}{HDO_SOURCE}.{' '}
          {t(lang, 'Le rattachement à la substance est automatique. Une erreur ? ', 'يتم ربط المادة آليًا. هل من خطأ؟ ')}
          <Link href="/contact" style={{ color: 'var(--blue)' }}>{t(lang, 'Écrivez-nous', 'راسلنا')}</Link>
          {' · '}
          <Link href={`/articles/allergie-connue-medicaments-algerie-mode-emploi${lang === 'ar' ? '-ar' : ''}`} style={{ color: 'var(--blue)' }}>
            {t(lang, 'Comprendre cette section', 'فهم هذا القسم')}
          </Link>
        </p>
      </div>
    </section>
  )
}

/**
 * Onglets d'ancrage au-dessus des sections de substance : Interactions et Allergies côte à côte.
 * Les deux sections restent sur la page (lisibles par les moteurs et à l'impression) ; l'onglet y mène.
 */
export function FicheOnglets({ interactions, allergies, lang }: { interactions: number; allergies: number; lang: Lang }) {
  if (interactions === 0 || allergies === 0) return null
  return (
    <nav className="fiche-onglets" aria-label={t(lang, 'Informations sur la substance', 'معلومات عن المادة الفعالة')}>
      <a href="#interactions" className="fiche-onglet">{t(lang, 'Interactions', 'التداخلات')} <i>{interactions}</i></a>
      <a href="#allergies" className="fiche-onglet">{t(lang, 'Allergies', 'الحساسيات')} <i>{allergies}</i></a>
    </nav>
  )
}
