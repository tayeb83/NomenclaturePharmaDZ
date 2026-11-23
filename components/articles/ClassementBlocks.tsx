import Link from 'next/link'
import type { ReactNode } from 'react'
import { getClassementGeneriques, getTopLabos } from '@/lib/nomenclature-stats'
import { limiteClassement, nombre, pourcentage, type ModeGeneriques } from '@/lib/nomenclature-stats-core'
import { lienRechercheDci } from '@/lib/equivalents-core'

/**
 * Blocs « classement » des articles de données : calculés à l'affichage depuis la nomenclature,
 * pour qu'aucun chiffre écrit dans l'article ne devienne faux à la version suivante.
 */

type Libelles = (fr: string, ar: string) => string

function Cadre({ isRtl, resume, entetes, children, pied }: { isRtl: boolean; resume: ReactNode; entetes: string[]; children: ReactNode; pied?: ReactNode }) {
  return (
    <div style={{ margin: '16px 0 24px', direction: isRtl ? 'rtl' : 'ltr' }}>
      <div style={{ background: '#ecfeff', border: '1.5px solid #06b6d4', borderRadius: 12, padding: '12px 16px', marginBottom: 12 }}>
        <p style={{ margin: 0, fontSize: 14.5, color: '#155e75', lineHeight: 1.7 }}>{resume}</p>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
          <thead>
            <tr>
              {entetes.map(h => (
                <th key={h} style={{ background: '#0f172a', color: 'white', padding: '9px 12px', textAlign: isRtl ? 'right' : 'left', fontWeight: 700 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>{children}</tbody>
        </table>
      </div>
      {pied}
    </div>
  )
}

function Indisponible({ t, lien, libelle }: { t: Libelles; lien: string; libelle: string }) {
  return (
    <div style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 12, padding: '14px 18px', margin: '16px 0 24px' }}>
      <p style={{ margin: 0, fontSize: 14.5, color: '#334155', lineHeight: 1.7 }}>
        {t('Le classement n’a pas pu être calculé ici. ', 'تعذّر حساب الترتيب هنا. ')}
        <Link href={lien} style={{ color: '#0284c7', fontWeight: 700 }}>{libelle}</Link>
      </p>
    </div>
  )
}

const cellule = (isRtl: boolean, extra?: React.CSSProperties): React.CSSProperties => ({
  padding: '9px 12px', border: '1px solid #e2e8f0', color: '#334155', textAlign: isRtl ? 'right' : 'left', verticalAlign: 'top', ...extra,
})

export async function TopLabosBlock({ limite, isRtl }: { limite?: number; isRtl: boolean }) {
  const t: Libelles = (fr, ar) => (isRtl ? ar : fr)
  const lang = isRtl ? 'ar' : 'fr'
  const data = await getTopLabos(limiteClassement(limite))
  if (!data?.labos.length) {
    return <Indisponible t={t} lien="/laboratoires" libelle={t('Voir tous les laboratoires →', 'كل المخابر ←')} />
  }
  const somme = data.labos.reduce((s, l) => s + l.presentations, 0)
  const n = data.labos.length
  return (
    <Cadre
      isRtl={isRtl}
      resume={<>
        <strong>{t('En direct de la nomenclature : ', 'مباشرة من المدونة: ')}</strong>
        {t(
          `ces ${n} laboratoires totalisent ${nombre(somme, lang)} présentations sur ${nombre(data.totalPresentations, lang)}, soit ${pourcentage(somme, data.totalPresentations)} %, parmi ${nombre(data.totalLabos, lang)} laboratoires au total.`,
          `هذه المخابر الـ${n} تجمع ${nombre(somme, lang)} تقديمًا من أصل ${nombre(data.totalPresentations, lang)}، أي ${pourcentage(somme, data.totalPresentations)} %، من بين ${nombre(data.totalLabos, lang)} مخبرًا في المجموع.`,
        )}
      </>}
      entetes={[t('#', '#'), t('Laboratoire', 'المخبر'), t('Présentations', 'التقديمات'), t('Substances', 'المواد'), t('Fabriqué en Algérie', 'مصنوع في الجزائر'), t('Pays indiqués', 'البلدان المذكورة')]}
      pied={<p style={{ margin: '10px 0 0', fontSize: 13.5 }}><Link href="/laboratoires" style={{ color: '#0284c7', fontWeight: 700 }}>{t('Tous les laboratoires →', 'كل المخابر ←')}</Link></p>}
    >
      {data.labos.map((l, i) => (
        <tr key={l.labo} style={{ background: i % 2 === 0 ? '#f8fafc' : 'white' }}>
          <td style={cellule(isRtl, { fontWeight: 700, color: '#64748b' })}>{i + 1}</td>
          <td style={cellule(isRtl)}><Link href={`/laboratoire/${l.slug}`} dir="ltr" style={{ color: '#0284c7', fontWeight: 700 }}>{l.labo}</Link></td>
          <td style={cellule(isRtl)}>{nombre(l.presentations, lang)}</td>
          <td style={cellule(isRtl)}>{nombre(l.substances, lang)}</td>
          <td style={cellule(isRtl)}>
            {l.fabriquees > 0 ? `🇩🇿 ${nombre(l.fabriquees, lang)} (${pourcentage(l.fabriquees, l.presentations)} %)` : t('Aucune', 'لا شيء')}
          </td>
          <td style={cellule(isRtl)} dir="ltr">{l.pays.join(', ') || '—'}</td>
        </tr>
      ))}
    </Cadre>
  )
}

export async function DciGeneriquesBlock({ mode, limite, isRtl }: { mode: ModeGeneriques; limite?: number; isRtl: boolean }) {
  const t: Libelles = (fr, ar) => (isRtl ? ar : fr)
  const lang = isRtl ? 'ar' : 'fr'
  const data = await getClassementGeneriques(mode, limiteClassement(limite))
  if (!data?.substances.length) {
    return <Indisponible t={t} lien="/substitution" libelle={t('Voir la page Substitution →', 'صفحة الاستبدال ←')} />
  }
  const plus = mode === 'plus'
  const resume = plus
    ? t(`${nombre(data.total, lang)} substances ont au moins un générique enregistré. Voici les ${data.substances.length} qui en ont le plus.`,
      `${nombre(data.total, lang)} مادة لها دواء جنيس مسجّل واحد على الأقل. هذه الـ${data.substances.length} التي لها أكثرها.`)
    : t(`${nombre(data.total, lang)} substances n’ont aucun générique enregistré. Voici les ${data.substances.length} qui ont le plus de présentations.`,
      `${nombre(data.total, lang)} مادة ليس لها أي دواء جنيس مسجّل. هذه الـ${data.substances.length} التي لها أكبر عدد من التقديمات.`)
  const entetes = plus
    ? [t('#', '#'), t('Substance', 'المادة'), t('Génériques', 'الأدوية الجنيسة'), t('Laboratoires', 'المخابر'), t('Présentations au total', 'مجموع التقديمات')]
    : [t('#', '#'), t('Substance', 'المادة'), t('Présentations', 'التقديمات'), t('Dont biologiques', 'منها بيولوجية')]
  return (
    <Cadre isRtl={isRtl} resume={<><strong>{t('En direct de la nomenclature : ', 'مباشرة من المدونة: ')}</strong>{resume}</>} entetes={entetes}>
      {data.substances.map((s, i) => {
        const lien = s.codeAtc ? `/classes-therapeutiques/${s.codeAtc}` : lienRechercheDci(s.dci)
        const libelle = (isRtl && s.libelleAr) || s.libelleFr
        return (
          <tr key={`${s.codeAtc ?? ''}|${s.dci}`} style={{ background: i % 2 === 0 ? '#f8fafc' : 'white' }}>
            <td style={cellule(isRtl, { fontWeight: 700, color: '#64748b' })}>{i + 1}</td>
            <td style={cellule(isRtl)}>
              <Link href={lien} style={{ color: '#0284c7', fontWeight: 700 }}>{libelle}</Link>
              {s.codeAtc && <>{' '}<span dir="ltr" style={{ marginInlineStart: 6, fontSize: 11.5, color: '#64748b', fontFamily: 'ui-monospace, monospace', display: 'inline-block' }}>{s.codeAtc}</span></>}
            </td>
            {plus ? (
              <>
                <td style={cellule(isRtl, { fontWeight: 700 })}>{nombre(s.generiques, lang)}</td>
                <td style={cellule(isRtl)}>{nombre(s.laboratoiresGeneriques, lang)}</td>
                <td style={cellule(isRtl)}>{nombre(s.presentations, lang)}</td>
              </>
            ) : (
              <>
                <td style={cellule(isRtl)}>{nombre(s.presentations, lang)}</td>
                <td style={cellule(isRtl)}>{s.biologiques > 0 ? nombre(s.biologiques, lang) : '—'}</td>
              </>
            )}
          </tr>
        )
      })}
    </Cadre>
  )
}
