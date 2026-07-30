/**
 * DwaDZ — URLs des fiches médicament, optimisées pour la recherche.
 *
 * Les fiches étaient adressées par un identifiant nu
 * (/medicament/enregistrement/1943), qui ne dit rien du contenu ni à un
 * moteur de recherche ni à un visiteur lisant l'URL dans les résultats. On
 * ajoute un segment descriptif dérivé du nom commercial :
 *
 *   /medicament/enregistrement/1943/sulfadiazine-novagenerics-0-01-creme-derm
 *
 * L'identifiant reste la seule source de vérité : le slug est purement
 * décoratif et n'intervient jamais dans la résolution en base. Une fiche
 * atteinte sans slug — ou avec un slug périmé après un changement de nom —
 * est redirigée vers sa forme canonique, ce qui évite d'exposer plusieurs
 * URLs pour un même contenu.
 */

import { slugify } from './slug'
import type { Lang } from './i18n'

/** Longueur maximale du segment descriptif (au-delà, aucun gain de pertinence). */
const MAX_SLUG_LENGTH = 80

type SluggableMedicament = {
  nom_marque: string
  dosage?: string | null
  forme?: string | null
}

/**
 * Construit le segment descriptif d'une fiche : nom commercial, dosage puis
 * forme galénique — l'ordre dans lequel les gens formulent leurs recherches.
 * Retourne une chaîne vide si rien d'exploitable, auquel cas l'URL reste
 * valide sans slug.
 */
export function medicamentSlug(med: SluggableMedicament): string {
  const raw = [med.nom_marque, med.dosage, med.forme].filter(Boolean).join(' ')
  const slug = slugify(raw)
  if (slug.length <= MAX_SLUG_LENGTH) return slug
  // On tronque sur une frontière de mot pour ne pas couper un terme en deux.
  return slug.slice(0, MAX_SLUG_LENGTH).replace(/-[^-]*$/, '')
}

/**
 * Chemin canonique d'une fiche. `lang` choisit la variante linguistique
 * indexable ; le slug est omis s'il n'y a rien de descriptif à ajouter.
 */
export function medicamentPath(
  source: string,
  id: number | string,
  med?: SluggableMedicament | null,
  lang: Lang = 'fr'
): string {
  const prefix = lang === 'ar' ? '/ar' : ''
  const base = `${prefix}/medicament/${source}/${id}`
  const slug = med ? medicamentSlug(med) : ''
  return slug ? `${base}/${slug}` : base
}
