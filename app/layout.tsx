import type { Metadata } from 'next'
import './globals.css'
import { Nav } from '@/components/layout/Nav'
import { Footer } from '@/components/layout/Footer'

export const metadata: Metadata = {
  title: { default: 'PharmaVeille DZ', template: '%s | PharmaVeille DZ' },
  description: 'Nomenclature pharmaceutique algérienne — Recherche, alertes retraits, nouveaux enregistrements. Données officielles MIPH.',
  keywords: ['pharmacie', 'algérie', 'médicament', 'nomenclature', 'retrait', 'enregistrement', 'DCI'],
  openGraph: {
    title: 'PharmaVeille DZ',
    description: 'La référence pour les pharmaciens algériens',
    url: 'https://pharmaveille-dz.com',
    siteName: 'PharmaVeille DZ',
    locale: 'fr_DZ',
    type: 'website',
  },
}

export const viewport = {
  themeColor: '#0f172a',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800&family=DM+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@500;600&display=swap" rel="stylesheet" />
      </head>
      <body>
        <Nav />
        <main className="main-content">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  )
}
