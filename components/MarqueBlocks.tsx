import Link from 'next/link'
import { pickLang, type Lang } from '@/lib/i18n'
import { getCountryFlag } from '@/lib/countryFlag'
import { medicamentPath } from '@/lib/medicament-url'
import type { MarqueGroup } from '@/lib/dci-groups'
import type { Enregistrement } from '@/lib/db-types'

/**
 * Blocs « un nom commercial = un tableau de présentations », partagés par les
 * pages DCI et les pages famille de marque.
 */
export function MarqueBlocks({ marques, lang }: { marques: MarqueGroup<Enregistrement>[]; lang: Lang }) {
  return (
    <>
      {marques.length > 6 && (
        <nav
          aria-label={pickLang(lang, { fr: 'Accès rapide par nom commercial', ar: 'وصول سريع حسب الاسم التجاري' })}
          style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}
        >
          {marques.map(g => (
            <a key={g.anchor} href={`#${g.anchor}`} className="badge badge-slate" style={{ fontSize: 11, textDecoration: 'none' }}>
              {g.nom}
            </a>
          ))}
        </nav>
      )}

      <div style={{ display: 'grid', gap: 16 }}>
        {marques.map(g => (
          <section key={g.anchor} id={g.anchor} style={{ scrollMarginTop: 80 }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>
              {g.nom}
              <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b', marginInlineStart: 8 }}>
                {pickLang(lang, {
                  fr: `${g.presentations.length} présentation${g.presentations.length > 1 ? 's' : ''}`,
                  ar: `${g.presentations.length} تقديم`,
                })}
                {g.labos.length > 0 && ` · ${g.labos.slice(0, 3).join(', ')}${g.labos.length > 3 ? '…' : ''}`}
              </span>
            </h3>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{pickLang(lang, { fr: 'Forme', ar: 'الشكل' })}</th>
                    <th>{pickLang(lang, { fr: 'Dosage', ar: 'الجرعة' })}</th>
                    <th>{pickLang(lang, { fr: 'Laboratoire', ar: 'المخبر' })}</th>
                    <th>{pickLang(lang, { fr: 'Origine', ar: 'المصدر' })}</th>
                    <th>{pickLang(lang, { fr: 'Type', ar: 'النوع' })}</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {g.presentations.map(med => (
                    <tr key={med.id}>
                      <td>{med.forme || '—'}</td>
                      <td>{med.dosage || '—'}</td>
                      <td>{med.labo || '—'}</td>
                      <td>
                        {med.statut === 'F'
                          ? `🇩🇿 ${lang === 'ar' ? 'جزائري' : 'DZ'}`
                          : med.pays ? `${getCountryFlag(med.pays)} ${med.pays}` : '—'}
                      </td>
                      <td>
                        {med.type_prod ? (
                          <span className={`badge ${['GE', 'Gé'].includes(med.type_prod) ? 'badge-green' : med.type_prod === 'BIO' ? 'badge-purple' : 'badge-blue'}`} style={{ fontSize: 11 }}>
                            {['GE', 'Gé'].includes(med.type_prod) ? (lang === 'ar' ? 'جنيس' : 'Générique') : med.type_prod}
                          </span>
                        ) : '—'}
                      </td>
                      <td>
                        <Link
                          href={medicamentPath('enregistrement', med.id, med)}
                          aria-label={`${med.nom_marque} ${med.dosage ?? ''} ${med.forme ?? ''}`.replace(/\s+/g, ' ').trim()}
                          style={{ fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap' }}
                        >
                          {pickLang(lang, { fr: 'Voir la fiche →', ar: 'عرض البطاقة ←' })}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))}
      </div>
    </>
  )
}
