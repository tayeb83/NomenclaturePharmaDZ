'use client'

import Link from 'next/link'
import { DrugCard } from '@/components/drug/DrugCard'
import { NewsletterSection } from '@/components/ui/NewsletterSection'
import { useLanguage } from '@/components/i18n/LanguageProvider'

function formatDate(d: string | null): string | null {
  if (!d) return null
  const parts = d.slice(0, 10).split('-')
  if (parts.length !== 3) return null
  return `${parts[2]}/${parts[1]}/${parts[0]}`
}

type Stats = {
  total_enregistrements: number | null
  total_nouveautes: number | null
  total_retraits: number | null
  total_non_renouveles: number | null
  last_version: string | null
}

export function HomeClient({
  stats,
  nouveautes,
  retraits,
  lastVersionDate,
}: {
  stats: Stats | null
  nouveautes: any[]
  retraits: any[]
  lastVersionDate: string | null
}) {
  const { lang } = useLanguage()
  const t = (fr: string, ar: string) => lang === 'ar' ? ar : fr
  const formattedDate = formatDate(lastVersionDate)

  const quickLinks = [
    {
      href: '/recherche',
      icon: '🔍',
      title: t('Recherche', 'البحث'),
      sub: t('Par DCI ou marque', 'بالاسم العلمي أو التجاري'),
    },
    {
      href: '/substitution',
      icon: '♻️',
      title: t('Substitution', 'الاستبدال'),
      sub: t('Trouver un générique', 'البحث عن بديل جنيس'),
    },
    {
      href: '/alertes',
      icon: '🚨',
      title: t('Alertes !', 'التنبيهات !'),
      sub: t('Retraits & non renouvelés', 'الانسحابات وغير المجددة'),
    },
    {
      href: '/veille',
      icon: '📡',
      title: t('Veille', 'المراقبة'),
      sub: t('Nouveaux enregistrements', 'التسجيلات الجديدة'),
    },
  ]

  return (
    <>
      <section className="hero">
        <div className="container hero-content">
          <h1>
            {t('La nomenclature pharmaceutique', 'التسمية الصيدلانية')}<br />
            <span>{t('algérienne', 'الجزائرية')}</span> {t('en un clic', 'بنقرة واحدة')}
          </h1>
          <p>
            {t(
              `Recherchez parmi ${stats?.total_enregistrements?.toLocaleString('fr') || '—'} médicaments, consultez les alertes officielles et trouvez des alternatives de substitution.`,
              `ابحث بين ${stats?.total_enregistrements?.toLocaleString('fr') || '—'} دواء، اطّلع على التنبيهات الرسمية وابحث عن بدائل الاستبدال.`
            )}
          </p>
          <div className="hero-search">
            <span className="hero-search-icon">🔍</span>
            <form action="/recherche" method="GET">
              <input
                name="q"
                type="text"
                placeholder={t(
                  'DCI ou nom de marque... Ex: PARACETAMOL, DOLIPRANE',
                  'DCI أو اسم تجاري... مثال: PARACETAMOL, DOLIPRANE'
                )}
                autoComplete="off"
              />
              <button type="submit" className="hero-search-btn">
                {t('Rechercher', 'بحث')}
              </button>
            </form>
          </div>
        </div>
      </section>

      <div style={{ background: '#f0f9ff', borderBottom: '1px solid #bae6fd', padding: '9px 0' }}>
        <div className="container" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: '#0369a1' }}>
          <span style={{ fontSize: 15 }}>📋</span>
          {lang === 'ar' ? (
            <span>بيانات مستمدة من <strong>التسمية الرسمية للـ MIPH</strong> — يتم تحديثها تلقائيًا مع كل إصدار جديد.</span>
          ) : (
            <span>Données issues de la <strong>nomenclature officielle du MIPH</strong> — automatiquement mise à jour à chaque nouvelle version publiée.</span>
          )}
        </div>
      </div>

      <div className="container">
        <div className="stats-grid">
          <div className="stat-card blue">
            <div className="stat-icon">✅</div>
            <div className="stat-value">{stats?.total_enregistrements?.toLocaleString('fr') || '—'}</div>
            <div className="stat-label">{t('Enregistrements actifs', 'التسجيلات النشطة')}</div>
            <div className="stat-sub">
              {t('Version', 'الإصدار')} {stats?.last_version || '—'}
              {formattedDate && (
                <> · {t('MàJ', 'تحديث')} <strong style={{ color: '#0284c7' }}>{formattedDate}</strong></>
              )}
            </div>
          </div>
          <div className="stat-card green">
            <div className="stat-icon">🆕</div>
            <div className="stat-value">{stats?.total_nouveautes != null ? stats.total_nouveautes.toLocaleString('fr') : '—'}</div>
            <div className="stat-label">{t('Nouveautés', 'جديد')}</div>
            <div className="stat-sub">{t('vs version précédente', 'مقارنة بالإصدار السابق')}</div>
          </div>
          <div className="stat-card red">
            <div className="stat-icon">🚫</div>
            <div className="stat-value">{stats?.total_retraits?.toLocaleString('fr') || '—'}</div>
            <div className="stat-label">{t('Médicaments retirés', 'أدوية مسحوبة')}</div>
            <div className="stat-sub">{t('Source MIPH', 'المصدر: MIPH')}</div>
          </div>
          <div className="stat-card amber">
            <div className="stat-icon">⚠️</div>
            <div className="stat-value">{stats?.total_non_renouveles?.toLocaleString('fr') || '—'}</div>
            <div className="stat-label">{t('AMM non renouvelées', 'AMM غير مجددة')}</div>
            <div className="stat-sub">{t('Source MIPH', 'المصدر: MIPH')}</div>
          </div>
        </div>
      </div>

      <div className="page-body">
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
            <div>
              <div className="section-title">
                🆕 {t(
                  `Nouveautés (${stats?.last_version || 'dernière version'})`,
                  `جديد (${stats?.last_version || 'آخر إصدار'})`
                )}
              </div>
              <div className="section-sub">
                {t(
                  'Comparaison automatique avec la version précédente de la nomenclature',
                  'مقارنة تلقائية مع الإصدار السابق من التسمية'
                )}
              </div>
              {nouveautes.map(d => (
                <DrugCard key={d.id} drug={{ ...d, source: 'enregistrement', similarity_score: 1 } as any} type="enregistrement" />
              ))}
              <Link
                href="/recherche?scope=enregistrement"
                style={{ display: 'block', textAlign: 'center', padding: '12px', background: '#eff6ff', borderRadius: 8, color: '#0284c7', fontWeight: 700, textDecoration: 'none', marginTop: 8 }}
              >
                {t('Rechercher dans la nomenclature active →', '← البحث في التسمية النشطة')}
              </Link>
            </div>

            <div>
              <div className="section-title">🚨 {t('Derniers retraits', 'آخر الانسحابات')}</div>
              <div className="section-sub">
                {t('Médicaments retirés du marché (feuille Retraits)', 'الأدوية المسحوبة من السوق')}
              </div>
              {retraits.map(d => (
                <DrugCard key={d.id} drug={{ ...d, source: 'retrait', similarity_score: 1 } as any} type="retrait" />
              ))}
              <Link
                href="/alertes"
                style={{ display: 'block', textAlign: 'center', padding: '12px', background: '#fef2f2', borderRadius: 8, color: '#dc2626', fontWeight: 700, textDecoration: 'none', marginTop: 8 }}
              >
                {t('Voir toutes les alertes →', '← عرض كل التنبيهات')}
              </Link>

              <div style={{ marginTop: 28 }}>
                <div className="section-title">⚡ {t('Accès rapide', 'وصول سريع')}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 12 }}>
                  {quickLinks.map(f => (
                    <Link
                      key={f.href}
                      href={f.href}
                      style={{ background: 'white', border: '1.5px solid #e2e8f0', borderRadius: 10, padding: '14px 16px', textDecoration: 'none', display: 'block' }}
                    >
                      <div style={{ fontSize: 22, marginBottom: 6 }}>{f.icon}</div>
                      <div style={{ fontWeight: 700, fontSize: 13, color: '#0f172a' }}>{f.title}</div>
                      <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 2 }}>{f.sub}</div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <NewsletterSection />
        </div>
      </div>
    </>
  )
}
