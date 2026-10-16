import Link from 'next/link'
import { pickLang, type Lang } from '@/lib/i18n'
import { medicamentPath } from '@/lib/medicament-url'
import { laboToSlug, type MedicamentInsightsData } from '@/lib/queries'
import { buildInsightText } from '@/lib/medicament-insights'
import type { Enregistrement } from '@/lib/db-types'

type Props = {
  med: {
    id: number
    nom_marque: string
    dci: string | null
    dosage: string | null
    forme: string | null
    labo: string | null
    liste: string | null
    prescription: string | null
    date_init: string | null
    date_final: string | null
  }
  data: MedicamentInsightsData
  /** Présentations de la même famille de marque (peut être vide). */
  famille: Enregistrement[]
  familleHref: string | null
  lang: Lang
  routeLang: Lang
}

const p: React.CSSProperties = { fontSize: 14, lineHeight: 1.75, color: '#334155', margin: '0 0 10px' }
const th: React.CSSProperties = { textAlign: 'start', padding: '8px 10px', fontSize: 12, color: '#475569', borderBottom: '1.5px solid #e2e8f0', whiteSpace: 'nowrap' }
const td: React.CSSProperties = { padding: '8px 10px', fontSize: 13, color: '#334155', borderBottom: '1px solid #f1f5f9', verticalAlign: 'top' }

const MAX_ROWS = 30

/**
 * Bloc « analyse » d'une fiche : texte et tableau propres à CE médicament,
 * recalculés à partir de la nomenclature (équivalents exacts, laboratoire,
 * validité, présentations de la marque). Il donne à chaque fiche du contenu
 * que les fiches voisines n'ont pas, sans rien avancer de médical.
 */
export function MedicamentInsights({ med, data, famille, familleHref, lang, routeLang }: Props) {
  const text = buildInsightText(med, data, lang)
  const rows = famille.slice(0, MAX_ROWS)
  const brand = med.nom_marque.trim().split(/\s+/)[0]

  return (
    <section style={{ marginTop: 40 }}>
      <h2 className="section-title">
        {pickLang(lang, { fr: `📊 ${med.nom_marque} en Algérie : équivalents, laboratoire, validité`, ar: `📊 ${med.nom_marque} في الجزائر : البدائل والمخبر والصلاحية` })}
      </h2>
      <div style={{ marginTop: 12 }}>
        <p style={p}>{text.equivalents}</p>
        {data.equivalents.length > 0 && (
          <ul style={{ margin: '0 0 12px', paddingInlineStart: 20, fontSize: 13.5, color: '#334155', lineHeight: 1.7 }}>
            {data.equivalents.map(e => (
              <li key={e.id}>
                <Link href={medicamentPath('enregistrement', e.id, e, routeLang)} style={{ color: 'var(--blue)' }}>
                  {e.nom_marque}
                </Link>
                {e.labo ? ` — ${e.labo}` : ''}
              </li>
            ))}
          </ul>
        )}
        {text.labo && (
          <p style={p}>
            {text.labo}{' '}
            {med.labo && (
              <Link href={`/laboratoire/${laboToSlug(med.labo)}`} style={{ color: 'var(--blue)' }}>
                {pickLang(lang, { fr: 'Voir le laboratoire →', ar: 'عرض المخبر ←' })}
              </Link>
            )}
          </p>
        )}
        {text.validity && <p style={p}>{text.validity}</p>}
        {text.prescription && <p style={p}>{text.prescription}</p>}
      </div>

      {rows.length >= 2 && (
        <div style={{ marginTop: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: '0 0 8px' }}>
            {pickLang(lang, { fr: `Présentations de ${brand} enregistrées`, ar: `تقديمات ${brand} المسجلة` })}
          </h3>
          <div style={{ overflowX: 'auto', background: 'white', border: '1.5px solid #e2e8f0', borderRadius: 10 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={th}>{pickLang(lang, { fr: 'Nom', ar: 'الاسم' })}</th>
                  <th style={th}>{pickLang(lang, { fr: 'Forme', ar: 'الشكل' })}</th>
                  <th style={th}>{pickLang(lang, { fr: 'Dosage', ar: 'الجرعة' })}</th>
                  <th style={th}>{pickLang(lang, { fr: 'Conditionnement', ar: 'التعبئة' })}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => {
                  const current = r.id === med.id
                  return (
                    <tr key={r.id} style={current ? { background: '#eff6ff' } : undefined}>
                      <td style={td}>
                        {current ? <strong>{r.nom_marque}</strong> : (
                          <Link href={medicamentPath('enregistrement', r.id, r, routeLang)} style={{ color: 'var(--blue)' }}>{r.nom_marque}</Link>
                        )}
                      </td>
                      <td style={td}>{r.forme || '—'}</td>
                      <td style={td}>{r.dosage || '—'}</td>
                      <td style={td}>{r.conditionnement || '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {familleHref && famille.length > MAX_ROWS && (
            <p style={{ ...p, marginTop: 8 }}>
              <Link href={familleHref} style={{ color: 'var(--blue)' }}>
                {pickLang(lang, { fr: `Voir les ${famille.length} présentations →`, ar: `عرض كل التقديمات (${famille.length}) ←` })}
              </Link>
            </p>
          )}
        </div>
      )}
    </section>
  )
}
