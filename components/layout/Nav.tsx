'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useMemo, useState } from 'react'
import { LanguageSwitcher } from '@/components/i18n/LanguageSwitcher'
import { useLanguage } from '@/components/i18n/LanguageProvider'

type NavLink = {
  type: 'link'
  href: string
  label: string
  /** Additional path prefixes that should also mark this link as active. */
  match?: string[]
}
type NavDropdown = {
  type: 'dropdown'
  id: string
  label: string
  links: { href: string; label: string }[]
}
type NavItem = NavLink | NavDropdown

function isActiveHref(pathname: string, href: string, match?: string[]) {
  if (pathname === href) return true
  return (match || []).some(prefix => pathname === prefix || pathname.startsWith(`${prefix}/`))
}

export function Nav({ currentVersion, isAdmin }: { currentVersion?: string | null; isAdmin?: boolean }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const { lang } = useLanguage()

  const navItems = useMemo<NavItem[]>(() => {
    const fr = lang !== 'ar'
    return [
      {
        type: 'link',
        href: '/pharmacie-de-garde',
        label: fr ? 'Pharmacies de garde' : 'صيدليات المناوبة',
        match: ['/pharmacie-de-garde', '/garde', '/ar/pharmacie-de-garde'],
      },
      {
        type: 'link',
        href: '/recherche',
        label: fr ? 'Médicaments' : 'الأدوية',
      },
      {
        type: 'link',
        href: '/alertes',
        label: fr ? 'Alertes' : 'التنبيهات',
      },
      {
        type: 'dropdown',
        id: 'plus',
        label: fr ? 'Plus' : 'المزيد',
        links: [
          { href: '/substitution', label: fr ? '♻️ Substitution générique' : '♻️ الاستبدال الجنيس' },
          { href: '/pharmacies', label: fr ? '📍 Annuaire des pharmacies' : '📍 دليل الصيدليات' },
          { href: '/diff', label: fr ? '🆕 Nouveaux médicaments' : '🆕 أدوية جديدة' },
          { href: '/retraits', label: fr ? '🚫 Médicaments retirés' : '🚫 أدوية مسحوبة' },
          { href: '/comparateur', label: fr ? '⚖️ Comparateur de médicaments' : '⚖️ مقارنة الأدوية' },
          { href: '/classes-therapeutiques', label: fr ? '🧬 Classes thérapeutiques (ATC)' : '🧬 الفئات العلاجية (ATC)' },
          { href: '/articles', label: fr ? '📰 Articles' : '📰 مقالات' },
          { href: '/laboratoires', label: fr ? '📊 Statistiques' : '📊 إحصائيات' },
          { href: '/a-propos', label: fr ? 'ℹ️ À propos' : 'ℹ️ حول المنصة' },
          { href: '/contact', label: fr ? '✉️ Contact' : '✉️ اتصل بنا' },
          { href: '/help', label: fr ? '❓ Aide' : '❓ مساعدة' },
          { href: '/medicaments', label: fr ? '💊 Tous les médicaments' : '💊 كل الأدوية' },
          { href: '/medicaments-critiques', label: fr ? '🚨 Médicaments critiques' : '🚨 الأدوية الحرجة' },
          { href: '/veille', label: fr ? '📡 Veille réglementaire' : '📡 المراقبة التنظيمية' },
          { href: '/pro', label: fr ? '💼 Espace Pro' : '💼 الفضاء المهني' },
          ...(isAdmin ? [{ href: '/admin', label: fr ? '🛠 Admin' : '🛠 الإدارة' }] : []),
        ],
      },
    ]
  }, [isAdmin, lang])

  const close = () => { setOpen(false); setOpenDropdown(null) }

  return (
    <nav className="site-nav">
      <div className="site-nav-inner">
        {/* Logo */}
        <Link href="/" className="site-nav-logo" onClick={close}>
          <Image src="/dwadz-logo.svg" alt="Logo DwaDZ" width={42} height={42} className="site-nav-logo-icon" />
          <div>
            <div className="site-nav-logo-text">DwaDZ</div>
            <div className="site-nav-logo-sub">DwaDZ… كلش على دوا البلاد</div>
          </div>
        </Link>

        {/* Mobile toggle */}
        <button
          className="site-nav-mobile-toggle"
          onClick={() => setOpen(p => !p)}
          aria-label="Menu"
        >
          {open ? '✕' : '☰'}
        </button>

        {/* Nav items */}
        <ul className={`site-nav-tabs${open ? ' open' : ''}`} role="tablist">
          {navItems.map(item => {
            if (item.type === 'link') {
              const isActive = isActiveHref(pathname, item.href, item.match)
              return (
                <li key={item.href} className="site-nav-item">
                  <Link
                    href={item.href}
                    className={`site-nav-link${isActive ? ' active' : ''}`}
                    onClick={close}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    {item.label}
                  </Link>
                </li>
              )
            }

            const isGroupActive = item.links.some(l => isActiveHref(pathname, l.href))
            const isOpen = openDropdown === item.id

            return (
              <li key={item.id} className={`site-nav-item site-nav-dropdown${isOpen ? ' open' : ''}`}>
                <button
                  type="button"
                  className={`site-nav-link${isGroupActive ? ' active' : ''}`}
                  onClick={() => setOpenDropdown(p => p === item.id ? null : item.id)}
                  aria-expanded={isOpen}
                >
                  {item.label} <span className="site-nav-caret">▾</span>
                </button>
                <div className="site-nav-dropdown-menu">
                  {item.links.map(l => {
                    const isActive = isActiveHref(pathname, l.href)
                    return (
                      <Link
                        key={l.href}
                        href={l.href}
                        className={`site-nav-dropdown-item${isActive ? ' active' : ''}`}
                        onClick={close}
                        aria-current={isActive ? 'page' : undefined}
                      >
                        {l.label}
                      </Link>
                    )
                  })}
                </div>
              </li>
            )
          })}
        </ul>

        {/* Right side */}
        <div className="site-nav-right">
          <LanguageSwitcher />
        </div>
      </div>
    </nav>
  )
}
