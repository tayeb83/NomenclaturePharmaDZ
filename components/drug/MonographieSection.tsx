import { pickLang, type Lang } from '@/lib/i18n'
import { MONOGRAPHIE_SECTIONS, SECTION_LABELS, type Monographie } from '@/lib/monographie-types'

const body: React.CSSProperties = { fontSize: 14, lineHeight: 1.75, color: '#334155', margin: 0, whiteSpace: 'pre-line' }

/**
 * Monographie de la substance active, rédigée et relue à la main
 * (admin → Monographies). Chaque section vide est omise ; la source et le
 * relecteur sont toujours affichés, puisque ce texte engage le site.
 */
export function MonographieSection({ m, dci, lang }: { m: Monographie; dci: string; lang: Lang }) {
  const sections = MONOGRAPHIE_SECTIONS.filter(s => (m[s] ?? '').trim())
  const sources = (m.sources ?? '').split('\n').map(s => s.trim()).filter(Boolean)
  return (
    <section style={{ marginTop: 40 }}>
      <h2 className="section-title">
        {pickLang(lang, { fr: `💊 ${dci} : indications, contre-indications, effets indésirables`, ar: `💊 ${dci} : دواعي الاستعمال والآثار الجانبية` })}
      </h2>
      <div className="section-sub">
        {pickLang(lang, {
          fr: 'Informations générales sur la substance active, communes à toutes les spécialités qui la contiennent. Se référer à la notice de la spécialité et à l\'avis d\'un professionnel de santé.',
          ar: 'معلومات عامة عن المادة الفعالة، مشتركة بين كل الأدوية التي تحتويها. يُرجى الرجوع إلى نشرة الدواء واستشارة مختص صحي.',
        })}
      </div>
      <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
        {sections.map(s => (
          <div key={s} style={{ background: 'white', border: '1.5px solid #e2e8f0', borderRadius: 10, padding: '14px 16px' }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: '0 0 6px' }}>{SECTION_LABELS[s][lang]}</h3>
            <p style={body}>{m[s]}</p>
          </div>
        ))}
      </div>
      <p style={{ fontSize: 12.5, color: '#64748b', marginTop: 10, lineHeight: 1.6 }}>
        {m.reviewed_by && (
          <>
            {pickLang(lang, { fr: 'Relu par', ar: 'مراجعة' })} {m.reviewed_by}
            {m.reviewed_at ? ` — ${String(m.reviewed_at).slice(0, 10)}` : ''}.{' '}
          </>
        )}
        {sources.length > 0 && (
          <>
            {pickLang(lang, { fr: 'Sources :', ar: 'المصادر :' })} {sources.join(' ; ')}
          </>
        )}
      </p>
    </section>
  )
}
