/**
 * DwaDZ — Recherche guidée (Lab) : index en mémoire de la nomenclature courante.
 *
 * La table enregistrements (~11 000 lignes) est lue une fois par instance, normalisée par
 * lib/guide-core.ts, puis gardée en mémoire. Pas de table dérivée à maintenir : l'index suit
 * automatiquement chaque import, au plus tard après GUIDE_TTL_MS.
 * La route /api/lab/guide calcule chaque étape sur cet index, sans requête SQL.
 */

import { query } from './db'
import { construireIndex, type GuideIndex, type LigneNomenclature } from './guide-core'

/** Durée de vie de l'index : la nomenclature ne change qu'à l'import (quelques fois par an). */
export const GUIDE_TTL_MS = 6 * 60 * 60 * 1000

type Cache = { index: GuideIndex; at: number } | null
const g = globalThis as unknown as { _guideCache?: Cache; _guideLoading?: Promise<GuideIndex> | null }

async function charger(): Promise<GuideIndex> {
  const lignes = await query<LigneNomenclature>(`
    SELECT id, dci, nom_marque, forme, dosage, conditionnement, labo, pays, statut
    FROM enregistrements
    WHERE nom_marque IS NOT NULL AND btrim(nom_marque) <> ''
  `)
  return construireIndex(lignes)
}

export async function getGuideIndex(): Promise<GuideIndex> {
  const c = g._guideCache
  if (c && Date.now() - c.at < GUIDE_TTL_MS) return c.index
  // une seule lecture à la fois, même sous des requêtes simultanées
  if (!g._guideLoading) {
    g._guideLoading = charger()
      .then(index => { g._guideCache = { index, at: Date.now() }; return index })
      .finally(() => { g._guideLoading = null })
  }
  // index périmé mais présent : on le sert pendant le rechargement
  return c ? c.index : g._guideLoading
}

/** À appeler après un import de nomenclature pour reconstruire l'index à la prochaine requête. */
export function invaliderGuideIndex(): void {
  g._guideCache = null
}
