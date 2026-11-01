import type { Metadata } from 'next'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://www.dzair-pharma.net'
const CONTACT_EMAIL = 'admin@nomenclature-pharma.org'

export const metadata: Metadata = {
  title: 'Politique de confidentialité',
  description: 'Politique de confidentialité de DwaDZ : données de localisation, données techniques, cookies et publicité (Google AdSense), finalités, partage, conservation et droits des utilisateurs.',
  alternates: { canonical: `${APP_URL}/privacy` },
  openGraph: {
    title: 'Politique de confidentialité',
    description: 'Informations sur les données utilisées par DwaDZ et les choix proposés aux utilisateurs.',
    url: `${APP_URL}/privacy`,
  },
}

const sections: { id?: string; title: string; content: React.ReactNode }[] = [
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
    title: '4. Cookies et publicité',
    content: (
      <>
        <p>
          Le site affiche des annonces diffusées par Google AdSense, qui financent son fonctionnement et sa
          gratuité.
        </p>
        <ul>
          <li>
            Des fournisseurs tiers, dont Google, utilisent des cookies pour diffuser des annonces en fonction des
            visites précédentes de l’utilisateur sur ce site ou sur d’autres sites.
          </li>
          <li>
            Les cookies publicitaires permettent à Google et à ses partenaires de diffuser des annonces en fonction
            de ces visites.
          </li>
          <li>
            L’utilisateur peut désactiver la publicité personnalisée depuis les{' '}
            <a href="https://myadcenter.google.com/" target="_blank" rel="noopener noreferrer">paramètres des annonces Google</a>,
            ou désactiver les cookies de fournisseurs tiers via{' '}
            <a href="https://www.aboutads.info/choices/" target="_blank" rel="noopener noreferrer">www.aboutads.info</a>.
          </li>
          <li>
            Pour en savoir plus :{' '}
            <a href="https://policies.google.com/technologies/partner-sites" target="_blank" rel="noopener noreferrer">
              comment Google utilise les données des sites partenaires
            </a>.
          </li>
        </ul>
        <p>
          Les visiteurs situés dans l’Espace économique européen, au Royaume-Uni ou en Suisse sont invités à donner
          ou refuser leur consentement via le bandeau affiché à leur première visite ; ils peuvent modifier ce choix
          à tout moment.
        </p>
        <p>
          Le site utilise aussi des cookies techniques strictement nécessaires (langue d’affichage, session
          d’administration, session de connexion de l’espace Training) et une mesure d’audience interne, qui ne servent pas au ciblage publicitaire.
        </p>
      </>
    ),
  },
  {
    title: '5. Données de santé',
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
    title: '6. Conservation des données',
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
    title: '7. Permissions demandées',
    content: (
      <>
        <p>L’application peut demander la permission d’accéder à la localisation de l’appareil.</p>
        <p>Cette permission est utilisée uniquement pour les fonctionnalités liées aux itinéraires ou à la proximité.</p>
        <p>L’utilisateur peut modifier ou retirer cette permission à tout moment depuis les paramètres de son téléphone.</p>
      </>
    ),
  },
  {
    title: '8. Sécurité',
    content: (
      <p>
        Nous mettons en œuvre des mesures raisonnables pour protéger les données traitées par l’application contre
        l’accès non autorisé, la perte ou l’utilisation abusive.
      </p>
    ),
  },
  {
    title: '9. Droits des utilisateurs',
    content: (
      <p>
        Selon la réglementation applicable, l’utilisateur peut demander l’accès, la rectification ou la suppression
        des données personnelles le concernant. Pour exercer ces droits, l’utilisateur peut nous contacter à
        l’adresse suivante : <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>
    ),
  },
  {
    id: 'training',
    title: '10. Dzair-Pharma Training (QCM et examens blancs)',
    content: (
      <>
        <p>
          Cette section s’applique uniquement à l’espace d’entraînement « Dzair-Pharma Training », accessible sur
          demande, sans mot de passe.
        </p>

        <h3>Données traitées</h3>
        <ul>
          <li>votre adresse e-mail, votre profil (étudiant(e) ou pharmacien(ne)) et, si vous le
            souhaitez, votre faculté ;</li>
          <li>si vous choisissez « Continuer avec Facebook » : l’identifiant Facebook et l’adresse e-mail que
            Facebook nous transmet — rien d’autre (ni liste d’amis, ni publications) ;</li>
          <li>votre progression : séries et examens commencés, réponses données, temps passé, résultats,
            flashcards ;</li>
          <li>des événements d’usage (connexion, début et fin de série, question répondue) qui servent à
            compter l’usage, sans contenu de vos réponses.</li>
        </ul>

        <h3>Finalités</h3>
        <ul>
          <li>sauvegarder votre progression et vous permettre de la retrouver ;</li>
          <li>mesurer l’usage du service (nombre d’utilisateurs, scores moyens, questions les plus difficiles),
            sous forme agrégée ;</li>
          <li>valider les demandes d’accès (examinées manuellement par l’équipe) et vous envoyer vos liens de
            connexion par e-mail.</li>
        </ul>
        <p>Ces données ne sont ni vendues ni utilisées pour de la publicité ciblée.</p>

        <h3>Connexion et cookies</h3>
        <p>
          La connexion se fait par un lien envoyé par e-mail, à usage unique et valable 15 minutes. Un cookie de
          session strictement nécessaire (sans suivi publicitaire) vous maintient connecté(e) pendant 14 jours au
          plus ; vous pouvez vous déconnecter à tout moment.
        </p>

        <h3>Destinataires</h3>
        <p>
          Les données sont accessibles à l’équipe DwaDZ. Elles sont hébergées chez notre hébergeur et notre
          fournisseur de base de données, et l’envoi des e-mails passe par un service d’envoi (Brevo ou Gmail).
          Facebook n’intervient que si vous choisissez ce mode de demande.
        </p>

        <h3>Durée de conservation</h3>
        <ul>
          <li>demandes d’accès non validées ou refusées : supprimées au bout de 12 mois ;</li>
          <li>comptes validés restés sans connexion pendant 24 mois : supprimés ;</li>
          <li>événements d’usage : supprimés au bout de 24 mois ;</li>
          <li>liens de connexion et sessions expirés : supprimés automatiquement.</li>
        </ul>

        <h3>Suppression de vos données</h3>
        <p>
          Vous pouvez supprimer vous-même votre compte et toutes vos données Training depuis votre espace
          (« Supprimer mon compte et mes données »), ou en faire la demande à l’adresse{' '}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. La suppression est définitive : progression,
          flashcards et résultats sont effacés. Si vous vous êtes connecté(e) avec Facebook, vous pouvez en plus
          retirer l’application « DwaDZ Training » dans les paramètres de votre compte Facebook.
        </p>
      </>
    ),
  },
  {
    title: '11. Contact',
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
          <p className="text-muted mb-2">Dernière mise à jour : 22 octobre 2026</p>
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
            <section key={section.title} id={section.id} className="card shadow-sm border-0">
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
