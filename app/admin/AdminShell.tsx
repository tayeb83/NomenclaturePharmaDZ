'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { SidebarCounts } from '@/lib/admin-dashboard'

type Item = { label: string; href: string; badge?: keyof SidebarCounts; adminOnly?: boolean; match?: 'exact' }
const GROUPS: { title: string; items: Item[] }[] = [
  { title: '', items: [{ label: 'Tableau de bord', href: '/admin', match: 'exact' }] },
  {
    title: 'Nomenclature',
    items: [
      { label: 'Import & archive', href: '/admin/import', adminOnly: true },
      { label: 'PPA (prix)', href: '/admin/ppa' },
      { label: 'Spécialités', href: '/admin/specialites' },
      { label: 'Monographies DCI', href: '/admin/monographies' },
      { label: 'RCP (ANPP)', href: '/admin/rcp' },
      { label: 'NAQESS (accès)', href: '/admin/acces' },
    ],
  },
  {
    title: 'Pharmacies de garde',
    items: [
      { label: 'Géocodage', href: '/admin/garde', match: 'exact' },
      { label: 'Signalements', href: '/admin/garde/signalements', badge: 'gardeReports' },
      { label: 'Publier les gardes', href: '/admin/garde/publication' },
      { label: 'Export imprimable', href: '/admin/garde/export' },
    ],
  },
  {
    title: 'Training QCM',
    items: [
      { label: 'Demandes d’accès', href: '/admin/training', match: 'exact', badge: 'trainingPending' },
      { label: 'Relecture des questions', href: '/admin/training/questions' },
      { label: 'Statistiques', href: '/admin/training/stats' },
    ],
  },
  { title: 'Communication', items: [{ label: 'Publications Facebook', href: '/admin/social' }] },
  { title: 'Administration', items: [{ label: 'Comptes admin', href: '/admin/comptes', adminOnly: true }] },
]

const ROLE_LABEL = { owner: 'Propriétaire', admin: 'Administrateur', editor: 'Éditeur' }

export default function AdminShell({
  user,
  counts,
  children,
}: {
  user: { name: string; email: string; role: 'owner' | 'admin' | 'editor' }
  counts: SidebarCounts
  children: React.ReactNode
}) {
  const pathname = usePathname() || ''
  const [open, setOpen] = useState(false)
  const initials = (user.name || user.email || 'A').split(/[\s@.]+/).filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase()).join('') || 'A'

  async function logout() {
    await fetch('/api/admin/logout', { method: 'POST' })
    window.location.href = '/admin'
  }

  return (
    <div className={`adm-app${open ? ' open' : ''}`}>
      <div className="adm-topbar">
        <button onClick={() => setOpen(o => !o)} aria-expanded={open} aria-label="Menu">☰ Menu</button>
        <b>DwaDZ Admin</b>
      </div>
      <aside className="adm-side" onClick={() => setOpen(false)}>
        <div className="adm-brand">
          <div className="adm-logo">Dz</div>
          <div><b>DwaDZ</b><small>ADMINISTRATION</small></div>
        </div>
        {GROUPS.map(g => {
          const items = g.items.filter(i => !i.adminOnly || user.role !== 'editor')
          if (!items.length) return null
          return (
            <div className="adm-grp" key={g.title || 'root'}>
              {g.title && <h4>{g.title}</h4>}
              {items.map(i => {
                const on = i.match === 'exact' ? pathname === i.href : pathname === i.href || pathname.startsWith(i.href + '/')
                const n = i.badge ? counts[i.badge] : 0
                return (
                  <Link key={i.href} href={i.href} className={`adm-nav${on ? ' on' : ''}`}>
                    {i.label}
                    {n > 0 && <em>{n}</em>}
                  </Link>
                )
              })}
            </div>
          )
        })}
        <div className="adm-foot">
          <div className="adm-me">
            <div className="adm-av">{initials}</div>
            <div>{user.name || ROLE_LABEL[user.role]}<small>{user.email || ROLE_LABEL[user.role]}</small></div>
          </div>
          <Link href="/" className="adm-nav">← Site public</Link>
          <button className="adm-nav" onClick={logout}>Déconnexion</button>
        </div>
      </aside>
      <main className="adm-content">{children}</main>
    </div>
  )
}
