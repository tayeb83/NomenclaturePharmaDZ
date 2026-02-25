import type { Metadata } from 'next'
import '../globals.css'

export const metadata: Metadata = {
  title: 'Administration — PharmaVeille DZ',
  robots: { index: false, follow: false },
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800&family=DM+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@500;600&display=swap" rel="stylesheet" />
      </head>
      <body style={{ background: '#f1f5f9', minHeight: '100vh', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
        {children}
      </body>
    </html>
  )
}
