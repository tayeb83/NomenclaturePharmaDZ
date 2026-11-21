/**
 * Présentations enregistrées en Algérie pour un ou plusieurs codes ATC de substance.
 * Sert le bloc `equivalents` des articles « Quel est l'équivalent algérien de… ? ».
 * Le rattachement DCI → ATC est celui de la fiche (table dci_atc_mapping, clé UPPER(TRIM(dci))).
 */
import { query } from './db'
import { ATC_SUBSTANCE, type EquivalentLigne } from './equivalents-core'

export async function getEquivalentsParAtc(codes: string[], limit = 300): Promise<EquivalentLigne[]> {
  const valides = codes.map(c => c.trim().toUpperCase()).filter(c => ATC_SUBSTANCE.test(c))
  if (!valides.length) return []
  try {
    return await query<EquivalentLigne>(`
      SELECT e.id, e.nom_marque, e.dci, e.forme, e.dosage, e.labo, e.pays, e.type_prod, e.statut, m.code_atc
      FROM enregistrements e
      JOIN dci_atc_mapping m ON m.dci = UPPER(TRIM(e.dci))
      WHERE m.code_atc = ANY($1::text[])
        AND e.nom_marque IS NOT NULL AND e.nom_marque <> ''
      ORDER BY e.nom_marque ASC, e.dosage ASC NULLS LAST, e.forme ASC NULLS LAST
      LIMIT $2
    `, [valides, limit])
  } catch (err) {
    // Base sans tables ATC, ou indisponible : l'article s'affiche avec ses liens de recherche.
    console.error('getEquivalentsParAtc', err)
    return []
  }
}
