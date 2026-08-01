/**
 * DwaDZ — données structurées (JSON-LD) des pages « médicament ».
 *
 * Le type schema.org `Drug` est déclaré sous-classe de `Product`. Google le
 * valide donc avec les règles des extraits de produits, qui imposent
 * `offers`, `review` ou `aggregateRating` — trois propriétés qu'un annuaire
 * réglementaire n'a pas : la nomenclature MIPH ne publie ni prix, ni avis de
 * consommateurs. D'où l'erreur remontée par la Search Console (« Il faut
 * indiquer "offers", "review" ou "aggregateRating" ») et le rejet des
 * éléments concernés, qui ne peuvent alors plus apparaître en résultat
 * enrichi.
 *
 * Ces pages décrivent un référentiel réglementaire, pas une offre
 * commerciale. On les balise donc avec `MedicalWebPage`, dont le sujet
 * (`about`) est une `Substance` : deux types situés hors de la hiérarchie
 * `Product`, ce qui conserve le sens médical du balisage sans déclencher la
 * validation produit.
 */

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://www.dzair-pharma.net'

const SITE_NAME = 'DwaDZ'

/** Substance décrite par la page : médicament commercialisé ou DCI. */
export type SubstanceInput = {
  name: string
  /** Principe actif (DCI). */
  activeIngredient?: string | null
  description?: string | null
  url?: string
}

export type MedicalPageInput = {
  name: string
  description: string
  url: string
  /** À ne renseigner que si l'URL est propre à une langue (routes /ar). */
  inLanguage?: string
  about: SubstanceInput
  /** Entités citées par la page : laboratoire, pays d'origine… */
  mentions?: Array<Record<string, unknown>>
  /** Nœuds supplémentaires, par exemple un `mainEntity` de type ItemList. */
  extra?: Record<string, unknown>
}

function substanceNode(input: SubstanceInput) {
  return {
    '@type': 'Substance',
    name: input.name,
    ...(input.activeIngredient ? { activeIngredient: input.activeIngredient } : {}),
    ...(input.description ? { description: input.description } : {}),
    ...(input.url ? { url: input.url } : {}),
  }
}

/**
 * Construit le JSON-LD d'une page décrivant un médicament ou une DCI.
 * Ne jamais y réintroduire `Drug`, `Product` ou l'une de leurs sous-classes
 * (`IndividualProduct`, `ProductModel`…) tant que le site ne publie ni prix
 * ni avis : Google exigerait à nouveau `offers`/`review`/`aggregateRating`.
 */
export function medicalPageJsonLd({
  name,
  description,
  url,
  inLanguage,
  about,
  mentions,
  extra,
}: MedicalPageInput) {
  return {
    '@context': 'https://schema.org',
    '@type': 'MedicalWebPage',
    name,
    description,
    url,
    ...(inLanguage ? { inLanguage } : {}),
    isPartOf: {
      '@type': 'WebSite',
      name: SITE_NAME,
      url: APP_URL,
    },
    about: substanceNode(about),
    ...(mentions && mentions.length ? { mentions } : {}),
    ...extra,
  }
}
