/**
 * DwaDZ — construction des URLs déclarées aux moteurs de recherche.
 *
 * Next livre les segments dynamiques (`params.slug`, `params.dci`…) **déjà
 * décodés** : pour `/dci/latanoprost%2Ftimolol`, `params.slug` vaut
 * `latanoprost/timolol`, et pour `/substitution/dalteparine%20sodique` il vaut
 * `dalteparine sodique`. Les réinjecter tels quels dans un `<link rel=canonical>`
 * produit une URL qui ne désigne plus la page courante — `/dci/latanoprost/timolol`
 * n'existe pas. Google ignore alors le canonical et classe la page « en double
 * sans URL canonique sélectionnée par l'utilisateur ».
 *
 * Toute URL canonique construite à partir d'un paramètre de route passe donc
 * par `canonicalSegment()`, qui re-encode le segment sous la forme exacte
 * déclarée dans le sitemap.
 */

/** `decodeURIComponent` tolérant : un `%` isolé ne doit pas faire échouer la page. */
function decodeSafe(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

/**
 * Forme canonique d'un segment de chemin issu de `params`.
 *
 * Idempotent : décode d'abord (le segment peut arriver encodé selon le
 * runtime), puis ré-encode. La casse est normalisée en minuscules, comme dans
 * le sitemap — sans quoi `/dci/CARBAMAZEPINE` et `/dci/carbamazepine`
 * s'auto-déclareraient chacune canonique alors qu'elles servent le même
 * contenu.
 */
export function canonicalSegment(value: string): string {
  return encodeURIComponent(decodeSafe(value).toLowerCase())
}

/** Valeur décodée d'un segment de route, pour les requêtes en base. */
export function decodedSegment(value: string): string {
  return decodeSafe(value)
}
