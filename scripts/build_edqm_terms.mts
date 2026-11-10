/**
 * Génère lib/edqm-data.ts : formes pharmaceutiques et voies d'administration des Standard Terms EDQM,
 * en anglais et en français, à partir du paquet FHIR CH-Term (HL7 Suisse), qui les redistribue.
 *
 *   npm pack ch.fhir.ig.ch-term && tar -xzf ch.fhir.ig.ch-term-*.tgz        # crée ./package
 *   npx tsx scripts/build_edqm_terms.mts ./package
 *
 * Pourquoi CH-Term : le site EDQM demande un compte, alors que ce paquet public porte les codes et les
 * libellés officiels (jeux de valeurs edqm-pharmaceuticaldoseform et edqm-routeofadministration).
 * Les Standard Terms restent la propriété de l'EDQM (Conseil de l'Europe) : voir l'en-tête du fichier généré.
 *
 * Nettoyages appliqués, signalés à l'écran :
 *   - espaces doubles, libellés « null » ou « - » ;
 *   - un même libellé français porté par plusieurs codes (erreur de recopie de la source) : seul le plus
 *     petit code le garde, les autres n'ont que l'anglais.
 * Les libellés arabes ne viennent pas d'ici (CH-Term : allemand, français, italien, romanche) : lib/edqm-ar.ts.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const dir = process.argv[2]
if (!dir) { console.error('Usage : npx tsx scripts/build_edqm_terms.mts <dossier package CH-Term>'); process.exit(1) }

type Terme = { code: string; en: string; fr: string | null }
const fold = (s: string) => s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/[^a-z0-9]+/g, ' ').trim()
const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'))

function lire(fichier: string): { termes: Terme[]; description: string } {
  const vs = JSON.parse(readFileSync(join(dir, fichier), 'utf8'))
  const termes: Terme[] = []
  for (const inc of vs.compose.include) {
    for (const c of inc.concept ?? []) {
      const d = (c.designation ?? []).find((x: { language?: string }) => x.language === 'fr-CH')
      let fr: string | null = (d?.value ?? '').replace(/\s+/g, ' ').trim()
      if (!fr || fr === 'null' || fr === '-') fr = null
      else fr = fr.charAt(0).toUpperCase() + fr.slice(1)
      termes.push({ code: c.code, en: c.display.replace(/\s+/g, ' ').trim(), fr })
    }
  }
  termes.sort((a, b) => a.code.localeCompare(b.code))
  const vus = new Map<string, string>()
  for (const t of termes) {
    if (!t.fr) continue
    const k = fold(t.fr)
    if (vus.has(k)) { console.warn(`  libellé français en double écarté : ${t.code} « ${t.fr} » (déjà porté par ${vus.get(k)})`); t.fr = null }
    else vus.set(k, t.code)
  }
  return { termes, description: vs.description ?? '' }
}

const formes = lire('ValueSet-edqm-pharmaceuticaldoseform.json')
const voies = lire('ValueSet-edqm-routeofadministration.json')
const ligne = (t: Terme) => `  [${JSON.stringify(t.code)}, ${JSON.stringify(t.en)}, ${JSON.stringify(t.fr)}],`

const out = `/**
 * FICHIER GÉNÉRÉ par scripts/build_edqm_terms.mts — ne pas modifier à la main.
 *
 * Standard Terms EDQM : formes pharmaceutiques (${formes.termes.length}) et voies d'administration (${voies.termes.length}).
 * Source : paquet FHIR ${pkg.name} ${pkg.version} (HL7 Suisse) — ${formes.description}
 *
 * Les Standard Terms sont la propriété de la Direction européenne de la qualité du médicament & soins de santé
 * (EDQM, Conseil de l'Europe) : https://standardterms.edqm.eu — conditions d'utilisation sur le site de l'EDQM.
 * Système de codes FHIR : ${'http://standardterms.edqm.eu'}
 *
 * Chaque ligne : [code, terme anglais, terme français ou null].
 */

export const EDQM_SYSTEM = 'http://standardterms.edqm.eu'
export const EDQM_SOURCE = ${JSON.stringify(`${pkg.name} ${pkg.version}`)}

export type EdqmLigne = [code: string, en: string, fr: string | null]

export const EDQM_FORMES: EdqmLigne[] = [
${formes.termes.map(ligne).join('\n')}
]

export const EDQM_VOIES: EdqmLigne[] = [
${voies.termes.map(ligne).join('\n')}
]
`
writeFileSync(new URL('../lib/edqm-data.ts', import.meta.url), out)
console.log(`lib/edqm-data.ts : ${formes.termes.length} formes, ${voies.termes.length} voies (${pkg.name} ${pkg.version})`)
