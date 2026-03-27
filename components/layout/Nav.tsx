'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useMemo, useState } from 'react'
import { LanguageSwitcher } from '@/components/i18n/LanguageSwitcher'
import { useLanguage } from '@/components/i18n/LanguageProvider'

type NavLinkItem = { type: 'link'; href: string; label: string }
type NavDropdownItem = {
  type: 'dropdown'
  id: string
  label: string
  links: { href: string; label: string; badge?: boolean }[]
}
type NavItem = NavLinkItem | NavDropdownItem

export function Nav({ currentVersion, isAdmin }: { currentVersion?: string | null; isAdmin?: boolean }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const { lang } = useLanguage()

  const navItems = useMemo<NavItem[]>(() => [
    { type: 'link', href: '/', label: lang === 'ar' ? '🏠 الرئيسية' : '🏠 Accueil' },
    { type: 'link', href: '/recherche', label: lang === 'ar' ? '🔍 البحث' : '🔍 Recherche' },
    {
      type: 'dropdown', id: 'meds',
      label: lang === 'ar' ? '💊 الأدوية' : '💊 Médicaments',
      links: [
        { href: '/medicaments', label: lang === 'ar' ? '💊 كل الأدوية' : '💊 Tous les médicaments' },
        { href: '/medicaments-critiques', label: lang === 'ar' ? '🚨 الحرجة' : '🚨 Critiques' },
        { href: '/alertes', label: lang === 'ar' ? '🔔 التنبيهات' : '🔔 Alertes', badge: true },
      ],
    },
    { type: 'link', href: '/diff', label: lang === 'ar' ? '🆕 الجديد' : '🆕 Nouveautés' },
    { type: 'link', href: '/substitution', label: lang === 'ar' ? '🔄 الاستبدال' : '🔄 Substitution' },
    {
      type: 'dropdown', id: 'stats',
      label: lang === 'ar' ? '📊 إحصائيات' : '📊 Stats',
      links: [
        { href: '/comparateur', label: lang === 'ar' ? '📊 مقارنة' : '📊 Comparateur' },
        { href: '/laboratoires', label: lang === 'ar' ? '🏭 المخابر' : '🏭 Laboratoires' },
      ],
    },
    {
      type: 'dropdown', id: 'more',
      label: lang === 'ar' ? '⋯ المزيد' : '⋯ Plus',
      links: [
        { href: '/a-propos', label: lang === 'ar' ? 'ℹ️ حول' : 'ℹ️ À propos' },
        { href: '/api-docs', label: lang === 'ar' ? '🧪 API' : '🧪 API (docs)' },
        ...(isAdmin ? [{ href: '/admin', label: lang === 'ar' ? '🛠️ الإدارة' : '🛠️ Admin' }] : []),
      ],
    },
  ], [isAdmin, lang])

  return (
    <nav className="site-nav">
      <div className="site-nav-inner">
        <Link href="/" className="site-nav-logo" onClick={() => setOpen(false)}>
          <div className="site-nav-logo-icon">💊</div>
          <div>
            <div className="site-nav-logo-text">PharmaVeille DZ</div>
            <div className="site-nav-logo-sub">
              {currentVersion ? `v${currentVersion}` : 'MIPH — Données officielles'}
            </div>
          </div>
        </Link>

        <button
          className="site-nav-mobile-toggle"
          onClick={() => setOpen(p => !p)}
          aria-label="Menu"
        >
          {open ? '✕' : '☰'}
        </button>

        <ul className={`site-nav-tabs${open ? ' open' : ''}`} role="tablist">
          {navItems.map(item => {
            if (item.type === 'link') {
              const isActive = pathname === item.href
              return (
                <li key={item.href} className="site-nav-item">
                  <Link
                    href={item.href}
                    className={`site-nav-link${isActive ? ' active' : ''}`}
                    onClick={() => setOpen(false)}
                  >
                    {item.label}
                  </Link>
                </li>
              )
            }

            const isGroupActive = item.links.some(l => pathname === l.href)
            const isOpen = openDropdown === item.id

            return (
              <li key={item.id} className={`site-nav-item site-nav-dropdown${isOpen ? ' open' : ''}`}>
                <button
                  type="button"
                  className={`site-nav-link dropdown-toggle${isGroupActive ? ' active' : ''}`}
                  onClick={() => setOpenDropdown(p => p === item.id ? null : item.id)}
                  aria-expanded={isOpen}
                >
                  {item.label} <span className="site-nav-caret">▾</span>
                </button>
                <div className="site-nav-dropdown-menu">
                  {item.links.map(l => (
                    <Link
                      key={l.href}
                      href={l.href}
                      className={`site-nav-dropdown-item${pathname === l.href ? ' active' : ''}`}
                      onClick={() => { setOpen(false); setOpenDropdown(null) }}
                    >
                      {l.label}
                      {l.badge && <span className="site-nav-badge">!</span>}
                    </Link>
                  ))}
                </div>
              </li>
            )
          })}
        </ul>

        <div className="site-nav-right">
          <LanguageSwitcher />
          <Link href="/contact" className="site-nav-contact-btn" onClick={() => setOpen(false)}>
            📬 {lang === 'ar' ? 'اتصل بنا' : 'Contact'}
          </Link>
        </div>
      </div>
    </nav>
  )
}
