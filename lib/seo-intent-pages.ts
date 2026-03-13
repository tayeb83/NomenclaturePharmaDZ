export type SeoIntentPage = {
  slug: string
  title: string
  description: string
  h1: string
  intro: string
  bullets: string[]
  ctaLabel: string
  ctaHref: string
}

const monthYear = new Intl.DateTimeFormat('fr-FR', {
  month: 'long',
  year: 'numeric',
}).format(new Date())

export const seoIntentPages: SeoIntentPage[] = [
  {
    slug: 'retraits-medicaments-algerie',
    title: `Retraits médicaments Algérie ${monthYear}`,
    description: `Consultez les alertes de retraits de médicaments en Algérie (${monthYear}) avec source MIPH et accès rapide aux détails.`,
    h1: `Retraits médicaments Algérie — ${monthYear}`,
    intro: 'Suivez les retraits et les AMM non renouvelées publiées sur le marché pharmaceutique algérien.',
    bullets: [
      'Liste triée des retraits les plus récents.',
      'Motifs de retrait visibles en un coup d’œil.',
      'Lien direct vers la section officielle des alertes.',
    ],
    ctaLabel: 'Voir les alertes officielles',
    ctaHref: '/alertes',
  },
  {
    slug: 'substitution-paracetamol-algerie',
    title: 'Substitution Paracétamol Algérie',
    description: 'Recherchez les alternatives génériques du paracétamol enregistrées en Algérie et accédez à la liste complète des DCI.',
    h1: 'Substitution Paracétamol en Algérie',
    intro: 'Trouvez rapidement les spécialités génériques disponibles autour de la DCI PARACÉTAMOL.',
    bullets: [
      'Recherche par DCI sur la base officielle.',
      'Affichage des laboratoires et formes.',
      'Comparaison simple des spécialités.',
    ],
    ctaLabel: 'Ouvrir la page substitution',
    ctaHref: '/substitution',
  },
  {
    slug: 'substitution-amoxicilline-algerie',
    title: 'Substitution Amoxicilline Algérie',
    description: 'Page dédiée à l’intention de recherche “Substitution amoxicilline Algérie” avec accès direct à la nomenclature générique.',
    h1: 'Substitution Amoxicilline en Algérie',
    intro: 'Accédez aux alternatives génériques enregistrées pour la DCI AMOXICILLINE.',
    bullets: [
      'Vue claire des spécialités disponibles.',
      'Informations dosage, forme et labo.',
      'Navigation vers la recherche complète.',
    ],
    ctaLabel: 'Rechercher AMOXICILLINE',
    ctaHref: '/substitution',
  },
  {
    slug: 'substitution-metformine-algerie',
    title: 'Substitution Metformine Algérie',
    description: 'Consultez les génériques de metformine en Algérie et facilitez la substitution à partir de la DCI.',
    h1: 'Substitution Metformine en Algérie',
    intro: 'La DCI METFORMINE regroupe plusieurs spécialités consultables en un seul endroit.',
    bullets: [
      'Page orientée pratique officinale.',
      'Accès aux laboratoires enregistrés.',
      'Vérification rapide des options.',
    ],
    ctaLabel: 'Voir les génériques METFORMINE',
    ctaHref: '/substitution',
  },
  {
    slug: 'substitution-omeprazole-algerie',
    title: 'Substitution Oméprazole Algérie',
    description: 'Retrouvez les options de substitution générique pour oméprazole sur le marché algérien.',
    h1: 'Substitution Oméprazole en Algérie',
    intro: 'Une page de destination SEO pour accéder vite aux alternatives autour de la DCI OMÉPRAZOLE.',
    bullets: [
      'Conçue pour la recherche locale Algérie.',
      'Relais direct vers la base substitution.',
      'Contenu utile pour pharmaciens et patients.',
    ],
    ctaLabel: 'Accéder à la substitution',
    ctaHref: '/substitution',
  },
  {
    slug: 'substitution-atorvastatine-algerie',
    title: 'Substitution Atorvastatine Algérie',
    description: 'Intention de recherche “Substitution atorvastatine Algérie” : alternatives génériques et source officielle.',
    h1: 'Substitution Atorvastatine en Algérie',
    intro: 'Retrouvez les spécialités génériques de la DCI ATORVASTATINE.',
    bullets: [
      'Page optimisée title + meta description.',
      'Structure claire pour un SEO local durable.',
      'Lien direct vers la recherche DCI.',
    ],
    ctaLabel: 'Explorer la substitution DCI',
    ctaHref: '/substitution',
  },
  {
    slug: 'substitution-ibuprofene-algerie',
    title: 'Substitution Ibuprofène Algérie',
    description: 'Listez les alternatives génériques pour ibuprofène en Algérie et affinez votre recherche par DCI.',
    h1: 'Substitution Ibuprofène en Algérie',
    intro: 'Page pratique pour accéder rapidement aux génériques de la DCI IBUPROFÈNE.',
    bullets: [
      'Mise en avant de la recherche par DCI.',
      'Contenu ciblé intention locale.',
      'CTA vers la page de substitution.',
    ],
    ctaLabel: 'Lancer la recherche substitution',
    ctaHref: '/substitution',
  },
  {
    slug: 'substitution-levothyroxine-algerie',
    title: 'Substitution Lévothyroxine Algérie',
    description: 'Consultez les données de substitution Lévothyroxine en Algérie avec les informations issues de la nomenclature.',
    h1: 'Substitution Lévothyroxine en Algérie',
    intro: 'Retrouvez les alternatives génériques associées à la DCI LÉVOTHYROXINE.',
    bullets: [
      'Entrée SEO orientée requêtes longues.',
      'Description claire pour le CTR Google.',
      'Passerelle vers la base officielle.',
    ],
    ctaLabel: 'Voir les alternatives',
    ctaHref: '/substitution',
  },
  {
    slug: 'substitution-amlodipine-algerie',
    title: 'Substitution Amlodipine Algérie',
    description: 'Page SEO locale sur la substitution amlodipine en Algérie avec accès direct aux génériques enregistrés.',
    h1: 'Substitution Amlodipine en Algérie',
    intro: 'Une page dédiée pour répondre aux recherches “substitution amlodipine Algérie”.',
    bullets: [
      'Réponse rapide à l’intention utilisateur.',
      'Format lisible et orienté action.',
      'Redirection naturelle vers la fonctionnalité substitution.',
    ],
    ctaLabel: 'Accéder aux DCI',
    ctaHref: '/substitution',
  },
  {
    slug: 'retraits-amm-non-renouvelees-algerie',
    title: `AMM non renouvelées Algérie ${monthYear}`,
    description: `Suivez les AMM non renouvelées en Algérie (${monthYear}) et consultez les retraits associés sur PharmaVeille DZ.`,
    h1: `AMM non renouvelées en Algérie — ${monthYear}`,
    intro: 'Cette page cible les recherches liées aux AMM non renouvelées et aux alertes de retrait.',
    bullets: [
      'Accès direct aux données de veille.',
      'Mise à jour continue selon publication.',
      'Source MIPH consolidée.',
    ],
    ctaLabel: 'Consulter la veille des retraits',
    ctaHref: '/alertes',
  },
]

export const seoIntentPagesBySlug = Object.fromEntries(
  seoIntentPages.map(page => [page.slug, page])
) as Record<string, SeoIntentPage>
