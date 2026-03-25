'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useMemo, useState } from 'react'
import { LanguageSwitcher } from '@/components/i18n/LanguageSwitcher'
import { useLanguage } from '@/components/i18n/LanguageProvider'

export function Nav({ currentVersion, isAdmin }: { currentVersion?: string | null; isAdmin?: boolean }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const { lang } = useLanguage()

  const primaryLinks = useMemo(() => [
    { href: '/', label: lang === 'ar' ? 'الرئيسية' : 'Accueil' },
    { href: '/recherche', label: lang === 'ar' ? 'البحث' : 'Recherche' },
    { href: '/diff', label: lang === 'ar' ? '🆕 الجديد' : '🆕 Nouveautés' },
    { href: '/substitution', label: lang === 'ar' ? 'الاستبدال' : 'Substitution' },
    { href: '/a-propos', label: lang === 'ar' ? 'حول' : 'À propos' },
  ], [lang])

  const groupedLinks = useMemo(() => [
    {
      id: 'meds',
      label: lang === 'ar' ? '📦 الأدوية' : '📦 Médicaments',
      links: [
        { href: '/medicaments', label: lang === 'ar' ? '💊 كل الأدوية' : '💊 Médicaments' },
        { href: '/medicaments-critiques', label: lang === 'ar' ? '🚨 الأدوية الحرجة' : '🚨 Critiques' },
        { href: '/alertes', label: lang === 'ar' ? '🚨 التنبيهات' : '🚨 Alertes', badge: true },
      ],
    },
    {
      id: 'stats',
      label: lang === 'ar' ? '📊 إحصائيات' : '📊 Stats',
      links: [
        { href: '/comparateur', label: lang === 'ar' ? '📊 مقارنة السوق' : '📊 Comparateur' },
        { href: '/laboratoires', label: lang === 'ar' ? '🏭 المخابر' : '🏭 Laboratoires' },
      ],
    },
    {
      id: 'more',
      label: lang === 'ar' ? '⋯ المزيد' : '⋯ Plus',
      links: [
        { href: '/api-docs', label: lang === 'ar' ? '🧪 توثيق API' : '🧪 API (docs)' },
        ...(isAdmin ? [{ href: '/admin', label: lang === 'ar' ? '🛠️ الإدارة' : '🛠️ Admin' }] : []),
      ],
    },
  ], [isAdmin, lang])

  return (
    <nav className="nav">
      <div className="nav-inner">
        <Link href="/" className="nav-logo">
          <div className="nav-logo-icon">💊</div>
          <div>
            <div className="nav-logo-text">PharmaVeille DZ</div>
            <div className="nav-logo-sub">
              {currentVersion ? `${lang === 'ar' ? 'الإصدار' : 'Version'} ${currentVersion}` : (lang === 'ar' ? 'MIPH — بيانات رسمية' : 'MIPH — Données officielles')}
            </div>
          </div>
        </Link>

        <div className={`nav-links${open ? ' open' : ''}`}>
          {primaryLinks.map(l => (
            <Link
              key={l.href}
              href={l.href}
              className={`nav-link${pathname === l.href ? ' active' : ''}`}
              onClick={() => setOpen(false)}
            >
              {l.label}
            </Link>
          ))}

          {groupedLinks.map(group => (
            <div key={group.id} className={`nav-dropdown${openDropdown === group.id ? ' open' : ''}`}>
              <button
                type="button"
                className="nav-dropdown-trigger"
                onClick={() => setOpenDropdown(prev => prev === group.id ? null : group.id)}
              >
                {group.label}
                <span className="nav-dropdown-caret">▾</span>
              </button>
              <div className="nav-dropdown-menu">
                {group.links.map(l => (
                  <Link
                    key={l.href}
                    href={l.href}
                    className={`nav-link${pathname === l.href ? ' active' : ''}`}
                    onClick={() => {
                      setOpen(false)
                      setOpenDropdown(null)
                    }}
                  >
                    {l.label}
                    {l.badge && <span className="nav-link-badge">!</span>}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>

        {currentVersion && (
          <span style={{
            fontSize: 10.5, fontWeight: 700, color: 'rgba(255,255,255,0.5)',
            background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
            padding: '3px 9px', borderRadius: 20, whiteSpace: 'nowrap',
            display: 'none',
            flexShrink: 0,
          }} className="nav-version-badge">
            📋 {currentVersion}
          </span>
        )}

        <LanguageSwitcher />

        <Link href="/contact" className="nav-newsletter-btn">
          📬 {lang === 'ar' ? 'اتصل بنا' : 'Contact'}
        </Link>

        <button className="nav-mobile-toggle" onClick={() => setOpen(!open)} aria-label="Menu">
          {open ? '✕' : '☰'}
        </button>
      </div>
    </nav>
  )
}
