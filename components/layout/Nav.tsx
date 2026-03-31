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
  locked?: boolean
}
type NavDropdown = {
  type: 'dropdown'
  id: string
  label: string
  links: { href: string; label: string; locked?: boolean }[]
}
type NavItem = NavLink | NavDropdown

/** Locked features redirect to /contact with a source hint */
function lockedHref(feature: string) {
  return `/contact?s=${encodeURIComponent(feature)}`
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
        href: '/',
        label: fr ? 'Accueil' : 'الرئيسية',
      },
      {
        type: 'dropdown',
        id: 'nomenclature',
        label: fr ? 'Nomenclature' : 'القائمة',
        links: [
          { href: '/medicaments',          label: fr ? '💊 Tous les médicaments' : '💊 كل الأدوية' },
          { href: '/medicaments-critiques', label: fr ? '🚨 Médicaments critiques' : '🚨 الأدوية الحرجة' },
          { href: '/retraits',             label: fr ? '🚫 Médicaments retirés' : '🚫 المسحوبة' },
          { href: '/diff',                 label: fr ? '🆕 Mises à jour' : '🆕 التحديثات' },
        ],
      },
      {
        type: 'link',
        href: '/recherche',
        label: fr ? 'Rechercher' : 'بحث',
      },
      {
        type: 'link',
        href: '/substitution',
        label: fr ? 'Substitution' : 'الاستبدال',
      },
      {
        type: 'dropdown',
        id: 'stats',
        label: fr ? 'Statistiques' : 'إحصائيات',
        links: [
          { href: '/comparateur', label: fr ? 'Comparer des médicaments' : 'مقارنة الأدوية' },
          { href: '/laboratoires', label: fr ? 'Par laboratoire' : 'حسب المخبر' },
        ],
      },
      {
        type: 'link',
        href: '/alertes',
        label: fr ? 'Alertes' : 'التنبيهات',
      },
      {
        type: 'link',
        href: '/help',
        label: fr ? 'Aide' : 'مساعدة',
      },
      ...(isAdmin ? [{
        type: 'link' as const,
        href: '/admin',
        label: fr ? '🛠 Admin' : '🛠 الإدارة',
      }] : []),
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
              const isActive = !item.locked && pathname === item.href
              return (
                <li key={item.href} className="site-nav-item">
                  <Link
                    href={item.href}
                    className={`site-nav-link${isActive ? ' active' : ''}${item.locked ? ' locked' : ''}`}
                    onClick={close}
                    title={item.locked ? 'Fonctionnalité disponible sur abonnement — contactez-nous' : undefined}
                  >
                    {item.label}
                  </Link>
                </li>
              )
            }

            const isGroupActive = item.links.some(l => !l.locked && pathname === l.href)
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
                      className={`site-nav-dropdown-item${pathname === l.href ? ' active' : ''}${l.locked ? ' locked' : ''}`}
                      onClick={close}
                      title={l.locked ? 'Fonctionnalité disponible sur abonnement — contactez-nous' : undefined}
                    >
                      {l.locked && <span style={{ marginRight: 4, fontSize: 11 }}>🔒</span>}
                      {l.label}
                    </Link>
                  ))}
                </div>
              </li>
            )
          })}
        </ul>

        {/* Right side */}
        <div className="site-nav-right">
          <LanguageSwitcher />
          <Link href="/contact" className="site-nav-contact-btn" onClick={close}>
            {lang === 'ar' ? 'اتصل بنا' : 'Contact'}
          </Link>
        </div>
      </div>
    </nav>
  )
}
