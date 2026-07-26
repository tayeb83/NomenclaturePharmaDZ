import type { Metadata } from 'next'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://pharmaveille-dz.vercel.app'
const CONTACT_EMAIL = 'admin@nomenclature-pharma.org'

export const metadata: Metadata = {
  title: 'Politique de confidentialité',
  description: 'Politique de confidentialité de DwaDZ : données de localisation, données techniques, finalités, partage, conservation et droits des utilisateurs.',
  alternates: { canonical: `${APP_URL}/privacy` },
  openGraph: {
    title: 'Politique de confidentialité | DwaDZ',
    description: 'Informations sur les données utilisées par DwaDZ et les choix proposés aux utilisateurs.',
    url: `${APP_URL}/privacy`,
  },
}

const sections = [
  {
    title: '1. Données collectées ou utilisées',
    content: (
      <>
        <h3>Données de localisation</h3>
        <p>
          L’application peut demander l’accès à la position de l’utilisateur afin de calculer un itinéraire ou
          d’afficher une pharmacie / un point d’intérêt proche.
        </p>
        <p>
          La localisation, approximative ou précise selon l’autorisation accordée par l’utilisateur et les
          réglages de son appareil, est utilisée uniquement lorsque l’utilisateur active une fonctionnalité
          nécessitant sa position, par exemple le calcul d’itinéraire.
        </p>
        <p>
          DwaDZ ne suit pas l’utilisateur en arrière-plan et ne collecte pas sa position de manière continue.
        </p>
        <p>
          L’utilisateur peut refuser l’accès à sa position. Dans ce cas, certaines fonctionnalités liées aux
          itinéraires ou à la proximité peuvent ne pas fonctionner correctement.
        </p>

        <h3>Données techniques</h3>
        <p>
          Lorsque l’application communique avec nos services, certaines données techniques peuvent être traitées
          automatiquement, par exemple :
        </p>
        <ul>
          <li>adresse IP ;</li>
          <li>type d’appareil ;</li>
          <li>système d’exploitation ;</li>
          <li>date et heure de la requête ;</li>
          <li>pages ou API consultées ;</li>
          <li>journaux techniques nécessaires au fonctionnement, à la sécurité et à l’amélioration du service.</li>
        </ul>
        <p>Ces données ne sont pas utilisées pour établir un profil médical de l’utilisateur.</p>
      </>
    ),
  },
  {
    title: '2. Finalités d’utilisation des données',
    content: (
      <>
        <p>Les données sont utilisées pour :</p>
        <ul>
          <li>fournir les fonctionnalités de recherche et de consultation ;</li>
          <li>calculer ou ouvrir un itinéraire lorsque l’utilisateur le demande ;</li>
          <li>assurer le bon fonctionnement technique de l’application ;</li>
          <li>améliorer la stabilité, la sécurité et les performances du service ;</li>
          <li>prévenir les abus ou dysfonctionnements.</li>
        </ul>
      </>
    ),
  },
  {
    title: '3. Partage des données',
    content: (
      <>
        <p>DwaDZ ne vend pas les données personnelles des utilisateurs.</p>
        <p>
          Lorsque l’utilisateur demande un itinéraire, certaines informations de localisation peuvent être
          transmises au service de cartographie utilisé par l’appareil ou par l’application, par exemple Google
          Maps, Apple Plans, OpenStreetMap, Mapbox ou un service équivalent, afin de calculer ou d’afficher
          l’itinéraire.
        </p>
        <p>Ces services tiers peuvent appliquer leurs propres politiques de confidentialité.</p>
      </>
    ),
  },
  {
    title: '4. Données de santé',
    content: (
      <>
        <p>DwaDZ ne demande pas à l’utilisateur de saisir des données médicales personnelles.</p>
        <p>
          L’application ne fournit pas de diagnostic médical, ne remplace pas un professionnel de santé et ne
          constitue pas un outil de prescription. Les informations affichées sont fournies à titre informatif et
          doivent être vérifiées auprès d’un professionnel de santé en cas de doute.
        </p>
      </>
    ),
  },
  {
    title: '5. Conservation des données',
    content: (
      <>
        <p>La position de l’utilisateur n’est pas conservée par DwaDZ après le calcul ou l’ouverture de l’itinéraire.</p>
        <p>
          Les journaux techniques peuvent être conservés temporairement pour des raisons de sécurité, de
          maintenance et d’amélioration du service.
        </p>
      </>
    ),
  },
  {
    title: '6. Permissions demandées',
    content: (
      <>
        <p>L’application peut demander la permission d’accéder à la localisation de l’appareil.</p>
        <p>Cette permission est utilisée uniquement pour les fonctionnalités liées aux itinéraires ou à la proximité.</p>
        <p>L’utilisateur peut modifier ou retirer cette permission à tout moment depuis les paramètres de son téléphone.</p>
      </>
    ),
  },
  {
    title: '7. Sécurité',
    content: (
      <p>
        Nous mettons en œuvre des mesures raisonnables pour protéger les données traitées par l’application contre
        l’accès non autorisé, la perte ou l’utilisation abusive.
      </p>
    ),
  },
  {
    title: '8. Droits des utilisateurs',
    content: (
      <p>
        Selon la réglementation applicable, l’utilisateur peut demander l’accès, la rectification ou la suppression
        des données personnelles le concernant. Pour exercer ces droits, l’utilisateur peut nous contacter à
        l’adresse suivante : <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>
    ),
  },
  {
    title: '9. Contact',
    content: (
      <p>
        Pour toute question concernant cette politique de confidentialité ou le fonctionnement de l’application :{' '}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>
    ),
  },
]

export default function PrivacyPage() {
  return (
    <div className="page-body">
      <div className="container py-5" style={{ maxWidth: 920 }}>
        <section className="mb-4">
          <span className="badge bg-primary-subtle text-primary-emphasis mb-3">Confidentialité</span>
          <h1 className="mb-3">Politique de confidentialité — DwaDZ</h1>
          <p className="text-muted mb-2">Dernière mise à jour : 17 juillet 2026</p>
          <p className="lead text-muted">
            DwaDZ est une application de consultation d’informations pharmaceutiques en Algérie. Elle permet
            notamment de rechercher des médicaments, consulter des informations associées et, lorsque la
            fonctionnalité est disponible, calculer un itinéraire vers une pharmacie ou un point d’intérêt.
          </p>
          <p className="text-muted mb-0">
            Cette politique de confidentialité explique quelles données peuvent être utilisées par l’application,
            dans quel but, et quels choix sont proposés à l’utilisateur.
          </p>
        </section>

        <div className="d-grid gap-3">
          {sections.map((section) => (
            <section key={section.title} className="card shadow-sm border-0">
              <div className="card-body p-4 privacy-content">
                <h2 className="h4 mb-3">{section.title}</h2>
                {section.content}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}
