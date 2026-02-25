import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'À propos',
  description: 'Mission, sources et limites de PharmaVeille DZ.',
}

export default function AboutPage() {
  return (
    <div className="page-body">
      <div className="container py-5">
        <section className="mb-4">
          <h1 className="mb-3">À propos de PharmaVeille DZ</h1>
          <p className="text-muted mb-0">
            PharmaVeille DZ est une plateforme d&apos;aide à la consultation de la nomenclature pharmaceutique algérienne.
            Elle centralise les recherches par DCI ou nom de marque, les retraits et les nouveautés publiées officiellement.
          </p>
        </section>

        <div className="row g-3 mb-4">
          <div className="col-md-6">
            <div className="card h-100 shadow-sm">
              <div className="card-body">
                <h2 className="h5 card-title">Notre mission</h2>
                <p className="card-text mb-0">
                  Offrir aux pharmaciens, préparateurs et professionnels de santé un accès rapide, clair et fiable aux données
                  utiles pour la dispensation et la veille réglementaire.
                </p>
              </div>
            </div>
          </div>

          <div className="col-md-6">
            <div className="card h-100 shadow-sm">
              <div className="card-body">
                <h2 className="h5 card-title">Sources des données</h2>
                <p className="card-text mb-2">
                  Les informations affichées proviennent des publications officielles du Ministère de l&apos;Industrie
                  Pharmaceutique (MIPH), notamment :
                </p>
                <ul className="mb-0">
                  <li>Nomenclature des produits pharmaceutiques enregistrés.</li>
                  <li>Liste des retraits et des AMM non renouvelées.</li>
                  <li>Mises à jour de versions diffusées par l&apos;autorité.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="row g-3 mb-4">
          <div className="col-md-6">
            <div className="card h-100 border-warning-subtle">
              <div className="card-body">
                <h2 className="h5 card-title">Fréquence de mise à jour</h2>
                <p className="card-text mb-0">
                  Les données sont rafraîchies dès qu&apos;une nouvelle version officielle est intégrée au système. Vérifiez
                  toujours la date/version affichée avant toute décision critique.
                </p>
              </div>
            </div>
          </div>

          <div className="col-md-6">
            <div className="card h-100 border-danger-subtle">
              <div className="card-body">
                <h2 className="h5 card-title">Limites et responsabilité</h2>
                <p className="card-text mb-0">
                  PharmaVeille DZ est un outil d&apos;aide à la décision et ne remplace pas les textes réglementaires,
                  notices officielles, ni l&apos;avis clinique du professionnel de santé.
                </p>
              </div>
            </div>
          </div>
        </div>

        <section className="text-center">
          <p className="mb-3">
            Vous souhaitez recevoir les alertes importantes (retraits, nouvelles versions) ?
          </p>
          <Link href="/newsletter" className="btn btn-primary px-4">
            S&apos;abonner à la newsletter
          </Link>
        </section>
      </div>
    </div>
  )
}
