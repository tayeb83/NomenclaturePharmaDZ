import Link from 'next/link'
import { getEquivalentsParAtc } from '@/lib/equivalents'
import { estFabriqueeEnAlgerie, estGenerique, lienRechercheDci, resumeEquivalents } from '@/lib/equivalents-core'
import { groupByMarque } from '@/lib/dci-groups'
import { medicamentPath } from '@/lib/medicament-url'

/** Au-delà, la liste renvoie vers la recherche : un article n'est pas un catalogue. */
const MAX_MARQUES = 25

/**
 * Bloc « équivalents » d'un article : les présentations de la nomenclature rattachées aux codes ATC
 * donnés, lues à l'affichage (aucune marque algérienne n'est écrite dans l'article).
 */
export default async function EquivalentsBlock({ atc, dci, isRtl }: { atc: string[]; dci?: string; isRtl: boolean }) {
  const lignes = await getEquivalentsParAtc(atc)
  const dir = isRtl ? 'rtl' : 'ltr'
  const t = (fr: string, ar: string) => (isRtl ? ar : fr)
  const recherche = dci ? lienRechercheDci(dci) : null
  const lang = isRtl ? 'ar' : 'fr'

  const liens = (
    <p style={{ margin: '10px 0 0', fontSize: 13.5, display: 'flex', gap: 14, flexWrap: 'wrap' }}>
      {recherche && <Link href={recherche} style={{ color: '#0284c7', fontWeight: 700 }}>{t('Toutes les présentations dans la recherche →', 'كل التقديمات في البحث ←')}</Link>}
      {atc.map(code => (
        <Link key={code} href={`/classes-therapeutiques/${code}`} style={{ color: '#0284c7', fontWeight: 600 }}>
          {t('Classe ATC ', 'الصنف ATC ')}<span dir="ltr">{code}</span>
        </Link>
      ))}
    </p>
  )

  if (!lignes.length) {
    return (
      <div style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 12, padding: '14px 18px', margin: '16px 0 24px', direction: dir }}>
        <p style={{ margin: 0, fontSize: 14.5, color: '#334155', lineHeight: 1.7 }}>
          {t('La liste des présentations enregistrées n’a pas pu être chargée ici. Elle reste consultable dans la recherche.',
            'تعذّر تحميل قائمة التقديمات المسجّلة هنا. يمكن الاطلاع عليها في البحث.')}
        </p>
        {liens}
      </div>
    )
  }

  const r = resumeEquivalents(lignes)
  const marques = groupByMarque(lignes)
  const visibles = marques.slice(0, MAX_MARQUES)
  const cell = { padding: '9px 12px', border: '1px solid #e2e8f0', color: '#334155', textAlign: (isRtl ? 'right' : 'left') as 'right' | 'left', verticalAlign: 'top' as const }

  return (
    <div style={{ margin: '16px 0 24px', direction: dir }}>
      <div style={{ background: '#ecfeff', border: '1.5px solid #06b6d4', borderRadius: 12, padding: '12px 16px', marginBottom: 12 }}>
        <p style={{ margin: 0, fontSize: 14.5, color: '#155e75', lineHeight: 1.7 }}>
          <strong>{t('En direct de la nomenclature : ', 'مباشرة من المدونة: ')}</strong>
          {t(
            `${r.presentations} présentation(s), ${r.marques} marque(s), ${r.laboratoires} laboratoire(s) ; ${r.fabriquees} fabriquée(s) en Algérie, ${r.importees} importée(s).`,
            `${r.presentations} تقديم، ${r.marques} علامة، ${r.laboratoires} مخبر؛ ${r.fabriquees} مصنوع في الجزائر و${r.importees} مستورد.`,
          )}
        </p>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
          <thead>
            <tr>
              {[t('Marque', 'العلامة'), t('Dosage et forme', 'الجرعة والشكل'), t('Laboratoire', 'المخبر'), t('Origine', 'المنشأ')].map(h => (
                <th key={h} style={{ background: '#0f172a', color: 'white', padding: '9px 12px', textAlign: isRtl ? 'right' : 'left', fontWeight: 700 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibles.map((g, gi) => {
              const p0 = g.presentations[0]
              const fabriquee = g.presentations.some(estFabriqueeEnAlgerie)
              const importee = g.presentations.some(p => !estFabriqueeEnAlgerie(p))
              return (
                <tr key={g.anchor} style={{ background: gi % 2 === 0 ? '#f8fafc' : 'white' }}>
                  <td style={cell}>
                    <Link href={medicamentPath('enregistrement', p0.id, p0, lang)} dir="ltr" style={{ color: '#0284c7', fontWeight: 700 }}>{g.nom}</Link>
                    {g.presentations.some(estGenerique) && (
                      <span style={{ marginInlineStart: 6, fontSize: 11, fontWeight: 700, color: '#166534', background: '#dcfce7', borderRadius: 10, padding: '1px 7px' }}>
                        {t('Générique', 'جنيس')}
                      </span>
                    )}
                  </td>
                  <td style={cell}>
                    {g.presentations.map(p => (
                      <div key={p.id} dir="ltr" lang="fr" style={{ textAlign: isRtl ? 'right' : 'left' }}>
                        <Link href={medicamentPath('enregistrement', p.id, p, lang)} style={{ color: '#334155' }}>
                          {[p.dosage, p.forme].filter(Boolean).join(' · ') || '—'}
                        </Link>
                      </div>
                    ))}
                  </td>
                  <td style={cell} dir="ltr">{g.labos.join(', ') || '—'}</td>
                  <td style={cell}>
                    {[fabriquee && t('🇩🇿 Fabriqué en Algérie', '🇩🇿 مصنوع في الجزائر'), importee && t('Importé', 'مستورد')].filter(Boolean).join(' · ')}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {marques.length > visibles.length && (
        <p style={{ margin: '8px 0 0', fontSize: 13, color: '#64748b' }}>
          {t(`Et ${marques.length - visibles.length} autre(s) marque(s).`, `و${marques.length - visibles.length} علامة أخرى.`)}
        </p>
      )}
      <p style={{ margin: '8px 0 0', fontSize: 12.5, color: '#64748b', lineHeight: 1.6 }}>
        {t('Enregistré ne veut pas dire disponible : la présence en pharmacie dépend de l’approvisionnement. Le prix (PPA) est sur chaque fiche quand il est connu.',
          'التسجيل لا يعني التوفر: وجود الدواء في الصيدلية مرتبط بالتموين. السعر (PPA) موجود في كل بطاقة عندما يكون معروفًا.')}
      </p>
      {liens}
    </div>
  )
}
