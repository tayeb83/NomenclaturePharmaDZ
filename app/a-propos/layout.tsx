import type { Metadata } from 'next'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://www.dzair-pharma.net'

export const metadata: Metadata = {
  title: 'À propos',
  description: 'DwaDZ — Plateforme de consultation de la nomenclature pharmaceutique algérienne officielle MIPH. Recherche, alertes retraits, substitution générique.',
  alternates: { canonical: `${APP_URL}/a-propos` },
}

export default function AProposLayout({ children }: { children: React.ReactNode }) {
  return children
}
