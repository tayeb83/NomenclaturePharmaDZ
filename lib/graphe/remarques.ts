/** DwaDZ — anomalies d'une démo (fonction pure, testable sans base). */
import type { GraphData } from './core.ts'
import type { Demo } from './demos.ts'

/** Anomalies lisibles pour une démo, d'après ce qu'elle promet de montrer. Fonction pure : testable. */
export function remarques(vue: Demo['params'], g: GraphData): string[] {
  const n = (k: string) => g.nodes.filter(x => x.kind === k).length
  const r: string[] = []
  if (vue.vue === 'substance') {
    if (vue.couches.includes('interactions') && n('interaction') + n('classe') === 0) r.push('aucune interaction du thésaurus pour cette substance')
    if (vue.couches.includes('labos') && n('labo') === 0) r.push('aucun laboratoire')
    if (vue.couches.includes('retraits') && n('retrait') === 0) r.push('aucun retrait : la démo « retraits » n\'a rien à montrer')
    if (vue.couches.includes('atc') && n('atc') === 0) r.push('pas de classe ATC (dci_atc_mapping)')
  } else if (vue.mode === 'concentration') {
    if (n('labo') < 3) r.push('moins de 3 laboratoires : la concentration n\'a pas de sens')
  } else {
    if (n('substance') < 2) r.push('moins de 2 substances dans cette classe')
    if (n('pays') === 0) r.push('aucun pays d\'origine renseigné')
  }
  return r
}

