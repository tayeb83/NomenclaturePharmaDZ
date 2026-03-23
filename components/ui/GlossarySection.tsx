const GLOSSARY: { abbr: string; fr: string; ar: string; desc: string }[] = [
  {
    abbr: 'AMM',
    fr: 'Autorisation de Mise sur le Marché',
    ar: 'تصريح الطرح في السوق',
    desc: "Autorisation officielle délivrée par le MIPH permettant la commercialisation d'un médicament en Algérie.",
  },
  {
    abbr: 'DCI',
    fr: 'Dénomination Commune Internationale',
    ar: 'التسمية المشتركة الدولية',
    desc: "Nom officiel de la substance active (principe actif) d'un médicament, recommandé par l'OMS. Identique quelle que soit la marque commerciale.",
  },
  {
    abbr: 'ATC',
    fr: 'Anatomical Therapeutic Chemical',
    ar: 'التصنيف التشريحي العلاجي الكيميائي',
    desc: "Système de classification des médicaments selon leurs propriétés anatomiques, thérapeutiques et chimiques, établi par l'OMS.",
  },
  {
    abbr: 'MIPH',
    fr: "Ministère de l'Industrie Pharmaceutique",
    ar: 'وزارة الصناعة الصيدلانية',
    desc: "Autorité algérienne de réglementation pharmaceutique, source officielle de la nomenclature et des décisions de retrait de médicaments.",
  },
  {
    abbr: 'GE / Gé',
    fr: 'Générique',
    ar: 'جنيس',
    desc: "Médicament ayant la même composition qualitative et quantitative en principe(s) actif(s) que le médicament de référence (princeps), avec une bioéquivalence démontrée.",
  },
  {
    abbr: 'RE / Ré',
    fr: 'Référence Étrangère',
    ar: 'مرجعي أجنبي',
    desc: "Médicament de référence d'origine étrangère servant de comparateur pour l'enregistrement des médicaments génériques.",
  },
  {
    abbr: 'BIO',
    fr: 'Biologique',
    ar: 'بيولوجي',
    desc: 'Médicament dont la substance active est produite ou extraite de sources biologiques (cellules vivantes, protéines, anticorps monoclonaux, etc.).',
  },
  {
    abbr: 'I',
    fr: 'Innovateur',
    ar: 'مبتكر',
    desc: "Médicament original pour lequel une AMM a été accordée sur la base d'un dossier complet de qualité, sécurité et efficacité.",
  },
  {
    abbr: 'DE',
    fr: 'Dosage (Dose Efficace)',
    ar: 'الجرعة الفعالة',
    desc: "Quantité de principe actif contenue dans une unité de prise du médicament (ex. : 500 mg, 10 mg/mL).",
  },
]

export function GlossarySection({ lang = 'fr' }: { lang?: 'fr' | 'ar' }) {
  const isFr = lang !== 'ar'

  return (
    <details
      className="glossary-section no-print"
      style={{
        marginTop: 40,
        background: '#f8fafc',
        border: '1.5px solid #e2e8f0',
        borderRadius: 10,
        overflow: 'hidden',
      }}
    >
      <summary
        style={{
          padding: '14px 20px',
          cursor: 'pointer',
          fontFamily: 'var(--font-display)',
          fontSize: 15,
          fontWeight: 700,
          color: '#0f172a',
          userSelect: 'none',
          listStyle: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <span style={{ fontSize: 18 }}>📖</span>
        {isFr
          ? 'Glossaire des abréviations pharmaceutiques'
          : 'مسرد المصطلحات الصيدلانية المختصرة'}
        <span style={{ marginLeft: 'auto', fontSize: 11, color: '#64748b', fontFamily: 'var(--font-body)', fontWeight: 500 }}>
          {isFr ? '(cliquer pour développer)' : '(انقر للتوسيع)'}
        </span>
      </summary>

      <div style={{ padding: '0 20px 20px' }}>
        <p style={{ fontSize: 12.5, color: '#475569', marginBottom: 16, lineHeight: 1.6 }}>
          {isFr
            ? "Lexique des termes et abréviations utilisés dans la nomenclature pharmaceutique algérienne (MIPH). Utile pour les étudiants et tout professionnel souhaitant approfondir sa compréhension."
            : 'مسرد المصطلحات والاختصارات المستخدمة في التسمية الصيدلانية الجزائرية (MIPH). مفيد للطلاب وكل محترف يرغب في تعميق فهمه.'}
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 10,
          }}
        >
          {GLOSSARY.map(({ abbr, fr, ar, desc }) => (
            <div
              key={abbr}
              style={{
                background: 'white',
                border: '1.5px solid #e2e8f0',
                borderLeft: '3px solid #0284c7',
                borderRadius: 8,
                padding: '12px 14px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 800,
                    fontSize: 13,
                    color: '#1d4ed8',
                    background: '#eff6ff',
                    border: '1.5px solid #bfdbfe',
                    borderRadius: 5,
                    padding: '1px 8px',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}
                >
                  {abbr}
                </span>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>
                  {isFr ? fr : ar}
                </span>
              </div>
              <p style={{ fontSize: 11.5, color: '#475569', lineHeight: 1.6, margin: 0 }}>
                {desc}
              </p>
            </div>
          ))}
        </div>

        {/* Print-visible version of glossary */}
        <div className="print-only" style={{ marginTop: 16 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 9 }}>
            <thead>
              <tr style={{ background: '#f1f5f9' }}>
                <th style={{ padding: '4px 8px', textAlign: 'left', border: '1px solid #ccc', width: '10%' }}>Abrév.</th>
                <th style={{ padding: '4px 8px', textAlign: 'left', border: '1px solid #ccc', width: '30%' }}>Terme complet</th>
                <th style={{ padding: '4px 8px', textAlign: 'left', border: '1px solid #ccc' }}>Définition</th>
              </tr>
            </thead>
            <tbody>
              {GLOSSARY.map(({ abbr, fr, desc }) => (
                <tr key={abbr}>
                  <td style={{ padding: '3px 8px', border: '1px solid #ccc', fontWeight: 700 }}>{abbr}</td>
                  <td style={{ padding: '3px 8px', border: '1px solid #ccc' }}>{fr}</td>
                  <td style={{ padding: '3px 8px', border: '1px solid #ccc' }}>{desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </details>
  )
}
