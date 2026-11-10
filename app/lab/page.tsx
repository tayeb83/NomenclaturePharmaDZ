import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Lab',
  description: 'Fonctions expérimentales de DwaDZ.',
  robots: { index: false, follow: false },
}

export default function LabPage() {
  return (
    <div>
      <div className="page-header">
        <div className="container">
          <h1>🧪 Lab</h1>
          <p>Fonctions en cours d’essai. Elles peuvent changer ou disparaître.</p>
        </div>
      </div>
      <div className="page-body">
        <div className="container" style={{ maxWidth: 820 }}>
          <Link href="/lab/guide" className="guide-lab-card">
            <strong>Recherche guidée</strong>
            <span>Trouver un médicament pas à pas : substance → voie → forme → dosage → présentations.</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
