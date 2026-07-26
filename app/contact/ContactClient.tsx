'use client'

import { useLanguage } from '@/components/i18n/LanguageProvider'

export function ContactClient() {
  const { lang } = useLanguage()
  const t = (fr: string, ar: string) => lang === 'ar' ? ar : fr

  const subjects = [
    {
      icon: '🔍',
      title: t('Médicament introuvable', 'دواء غير موجود'),
      desc: t(
        "Un médicament n'apparaît pas dans la recherche ou les données semblent incorrectes.",
        'دواء لا يظهر في البحث أو البيانات تبدو غير صحيحة.',
      ),
    },
    {
      icon: '🚨',
      title: t("Signalement d'erreur", 'الإبلاغ عن خطأ'),
      desc: t(
        'Une alerte retrait ou une information erronée à corriger.',
        'تنبيه سحب أو معلومة خاطئة تحتاج إلى تصحيح.',
      ),
    },
    {
      icon: '💡',
      title: t("Suggestion d'amélioration", 'اقتراح تحسين'),
      desc: t(
        "Idée de fonctionnalité ou amélioration de l'interface.",
        'فكرة لميزة جديدة أو تحسين الواجهة.',
      ),
    },
    {
      icon: '🤝',
      title: t('Partenariat / Collaboration', 'شراكة / تعاون'),
      desc: t(
        'Propositions de partenariat avec officines, hôpitaux ou institutions.',
        'مقترحات شراكة مع الصيدليات أو المستشفيات أو المؤسسات.',
      ),
    },
  ]

  return (
    <div className="container" style={{ maxWidth: 720, margin: '0 auto', padding: '48px 16px 80px' }}>
      {/* En-tête */}
      <div style={{ textAlign: 'center', marginBottom: 48 }}>
        <div style={{ fontSize: 52, marginBottom: 12 }}>📬</div>
        <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 12 }}>
          {t('Contactez-nous', 'اتصل بنا')}
        </h1>
        <p style={{ color: 'var(--slate-500)', fontSize: 17, maxWidth: 500, margin: '0 auto' }}>
          {t(
            "Une question, une suggestion, une erreur à signaler dans la nomenclature ?",
            'سؤال، اقتراح، أو خطأ لتصحيحه في التسمية؟',
          )}<br />
          {t('Nous sommes à votre écoute.', 'نحن هنا للاستماع إليكم.')}
        </p>
      </div>

      {/* Carte contact */}
      <div style={{
        background: 'white',
        border: '1px solid var(--slate-200)',
        borderRadius: 16,
        padding: '36px 40px',
        marginBottom: 32,
        boxShadow: 'var(--shadow)',
      }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span>✉️</span> {t('Email', 'البريد الإلكتروني')}
        </h2>

        <a
          href="mailto:admin@nomenclature-pharma.org"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
            background: '#eef2ff',
            border: '1px solid #c7d2fe',
            borderRadius: 10,
            padding: '14px 22px',
            color: '#3730a3',
            fontSize: 18,
            fontWeight: 600,
            textDecoration: 'none',
            transition: 'all 0.2s',
          }}
        >
          <span>📧</span>
          admin@nomenclature-pharma.org
        </a>

        <p style={{ marginTop: 20, color: 'var(--slate-500)', fontSize: 14, lineHeight: 1.6 }}>
          {t(
            'Nous répondons généralement sous 24 à 48 heures (jours ouvrés).',
            'نرد عادةً خلال 24 إلى 48 ساعة (أيام العمل).',
          )}
        </p>
      </div>

      {/* Sujets */}
      <div style={{
        background: 'white',
        border: '1px solid var(--slate-200)',
        borderRadius: 16,
        padding: '32px 40px',
        marginBottom: 32,
        boxShadow: 'var(--shadow)',
      }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20 }}>
          {t('Pour quel sujet ?', 'لأي موضوع؟')}
        </h2>
        <div style={{ display: 'grid', gap: 12 }}>
          {subjects.map((item) => (
            <div key={item.title} style={{
              display: 'flex',
              gap: 14,
              padding: '14px 16px',
              background: 'var(--slate-50)',
              border: '1px solid var(--slate-200)',
              borderRadius: 10,
            }}>
              <span style={{ fontSize: 24, flexShrink: 0 }}>{item.icon}</span>
              <div>
                <div style={{ fontWeight: 600, marginBottom: 3 }}>{item.title}</div>
                <div style={{ color: 'var(--slate-500)', fontSize: 13 }}>{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Note MIPH */}
      <div style={{
        background: 'rgba(251,191,36,0.07)',
        border: '1px solid rgba(251,191,36,0.2)',
        borderRadius: 12,
        padding: '18px 22px',
        display: 'flex',
        gap: 12,
        alignItems: 'flex-start',
      }}>
        <span style={{ fontSize: 20, flexShrink: 0 }}>⚠️</span>
        <p style={{ margin: 0, color: '#92400e', fontSize: 13, lineHeight: 1.6 }}>
          <strong style={{ color: '#78350f' }}>{t('Important :', 'مهم:')} </strong>
          {t(
            "DwaDZ est une plateforme indépendante qui diffuse les données officielles du MIPH. Pour toute question réglementaire officielle, contactez directement le",
            'DwaDZ منصة مستقلة تنشر البيانات الرسمية للـ MIPH. لأي استفسار رسمي تنظيمي، تواصل مباشرة مع',
          )}{' '}
          <a href="https://www.industrie.gov.dz" target="_blank" rel="noopener noreferrer" style={{ color: '#60a5fa' }}>
            {t('Ministère de l\'Industrie Pharmaceutique', 'وزارة الصناعة الصيدلانية')}
          </a>.
        </p>
      </div>
    </div>
  )
}
