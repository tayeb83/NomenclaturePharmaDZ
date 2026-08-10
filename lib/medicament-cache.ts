/**
 * DwaDZ — Cache de données des fiches médicament.
 *
 * Le layout racine lit les cookies (session admin, langue) et les en-têtes :
 * toutes les pages sont donc rendues dynamiquement, à chaque requête. Une
 * fiche coûtait ainsi une demi-douzaine d'allers-retours PostgreSQL par
 * affichage — y compris pour les ~11 000 URLs de fiches que Googlebot doit
 * explorer. Un temps de réponse élevé sur un catalogue de cette taille se
 * traduit directement par un budget d'exploration réduit : Google découvre
 * les URLs, les met en file, puis n'y revient pas — le fameux « Détectée,
 * actuellement non indexée ».
 *
 * Les fiches ne changent qu'à l'ingestion d'une nouvelle nomenclature MIPH,
 * soit quelques fois par an. On les sert donc depuis le cache de données, et
 * on l'invalide explicitement à l'ingestion via le tag `NOMENCLATURE_TAG`.
 */

import { unstable_cache } from 'next/cache'
import { getMedicamentById, getAlternatifsDCI, getAtcHierarchyByDci } from './queries'
import type { MedicamentDetail, AtcCode, Enregistrement } from './db-types'

/** Tag d'invalidation : `revalidateTag(NOMENCLATURE_TAG)` après un import. */
export const NOMENCLATURE_TAG = 'nomenclature'

/** Repli temporel si le tag n'est jamais déclenché (24 h). */
const REVALIDATE_SECONDS = 86_400

export function getCachedMedicamentById(
  source: string,
  id: number
): Promise<MedicamentDetail | null> {
  return unstable_cache(
    () => getMedicamentById(source, id),
    ['medicament', source, String(id)],
    { revalidate: REVALIDATE_SECONDS, tags: [NOMENCLATURE_TAG] }
  )()
}

export function getCachedAlternatifsDCI(dci: string, limit: number): Promise<Enregistrement[]> {
  return unstable_cache(
    () => getAlternatifsDCI(dci, limit),
    ['alternatifs-dci', dci, String(limit)],
    { revalidate: REVALIDATE_SECONDS, tags: [NOMENCLATURE_TAG] }
  )()
}

export function getCachedAtcHierarchyByDci(dci: string): Promise<AtcCode[]> {
  return unstable_cache(
    () => getAtcHierarchyByDci(dci),
    ['atc-hierarchy', dci],
    { revalidate: REVALIDATE_SECONDS, tags: [NOMENCLATURE_TAG] }
  )()
}
