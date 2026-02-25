'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

const LINKS = [
  { href: '/', label: 'Accueil' },
  { href: '/recherche', label: 'Recherche' },
  { href: '/alertes', label: '🚨 Alertes', badge: true },
  { href: '/substitution', label: 'Substitution' },
  { href: '/veille', label: 'Veille' },
  { href: '/a-propos', label: 'À propos' },
]

export function Nav() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  return (
    <nav className="nav">
      <div className="nav-inner">
        <Link href="/" className="nav-logo">
          <div className="nav-logo-icon">💊</div>
          <div>
            <div className="nav-logo-text">PharmaVeille DZ</div>
            <div className="nav-logo-sub">MIPH — Données officielles</div>
          </div>
        </Link>

        <div className={`nav-links${open ? ' open' : ''}`}>
          {LINKS.map(l => (
            <Link
              key={l.href}
              href={l.href}
              className={`nav-link${pathname === l.href ? ' active' : ''}`}
              onClick={() => setOpen(false)}
            >
              {l.label}
              {l.badge && <span className="nav-link-badge">!</span>}
            </Link>
          ))}
        </div>

        <Link href="/newsletter" className="nav-newsletter-btn">
          📧 Newsletter
        </Link>

        <button className="nav-mobile-toggle" onClick={() => setOpen(!open)} aria-label="Menu">
          {open ? '✕' : '☰'}
        </button>
      </div>
    </nav>
  )
}
