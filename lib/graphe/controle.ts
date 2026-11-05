/**
 * DwaDZ — contrôle des démos : chaque démo du catalogue est construite comme sur le site, et le résultat est
 * résumé (nœuds, liens, anomalies). Sert à repérer une substance introuvable, une classe vide ou un graphe
 * sans l'élément qui fait son intérêt (aucun laboratoire, aucun retrait, aucune interaction…).
 */
import { construire } from './data'
import { DEMOS } from './demos.ts'
import { PLAFOND_DEMO } from './core.ts'
import { remarques } from './remarques.ts'

export type ResultatDemo = {
  id: string
  titre: string
  etat: 'ok' | 'attention' | 'vide' | 'erreur'
  noeuds: number
  liens: number
  remarques: string[]
}

export async function controlerDemos(): Promise<ResultatDemo[]> {
  const out: ResultatDemo[] = []
  for (const d of DEMOS) {
    try {
      const g = await construire(d.params, PLAFOND_DEMO)
      if (!g) { out.push({ id: d.id, titre: d.titre.fr, etat: 'vide', noeuds: 0, liens: 0, remarques: ['aucune donnée : substance ou classe introuvable dans la nomenclature'] }); continue }
      const rem = remarques(d.params, g)
      out.push({ id: d.id, titre: d.titre.fr, etat: rem.length ? 'attention' : 'ok', noeuds: g.nodes.length, liens: g.edges.length, remarques: rem })
    } catch (e) {
      out.push({ id: d.id, titre: d.titre.fr, etat: 'erreur', noeuds: 0, liens: 0, remarques: [(e as Error).message.slice(0, 160)] })
    }
  }
  return out
}
