import DwaIcons from '@/lib/dwadz-icons/dwadz-icons.js'
import type { Lang } from '@/lib/i18n'

/**
 * Icône d'une forme galénique : contenant + pastille de voie (code EDQM de la fiche, sinon déduite du libellé)
 * + modificateurs (libération prolongée, sécable…). Le sprite est inliné une fois dans app/layout.tsx.
 * Le HTML vient de lib/dwadz-icons (libellés d'accessibilité échappés, aucune donnée brute injectée).
 */
export function FormeIcon({ forme, codes, lang = 'fr', size = 28 }: { forme: string | null | undefined; codes?: string[]; lang?: Lang; size?: number }) {
  if (!forme) return null
  return <span style={{ display: 'inline-flex', marginInlineEnd: 6 }} dangerouslySetInnerHTML={{ __html: DwaIcons.html(forme, { codes, lang: lang === 'ar' ? 'ar' : 'fr', size }) }} />
}

/** Pastille de voie seule (filtres, listes de voies) : id = identifiant de pastille du sprite (oral, iv, eye…). */
export function VoieIcon({ voie, size = 18 }: { voie: string; size?: number }) {
  // « injectable » regroupe IV / IM / SC : on montre la seringue plutôt qu'une voie précise
  const seringue = voie === 'injectable'
  return (
    <svg viewBox={seringue ? '0 0 48 48' : '0 0 24 24'} width={size} height={size} aria-hidden="true" focusable="false"
      style={{ flex: 'none', marginInlineEnd: 6, color: 'var(--dz-ink, currentColor)' }}>
      <use href={seringue ? '#f-syringe' : `#r-${voie}`} />
    </svg>
  )
}

/** Identifiant de voie de la recherche (lib/guide-core.ts) → pastille du sprite. */
export const PASTILLE_DE_VOIE: Record<string, string> = {
  'orale-solide': 'oral', 'orale-liquide': 'oral', injectable: 'injectable', inhalee: 'inhaled', buccale: 'buccal',
  nasale: 'nasal', ophtalmique: 'eye', auriculaire: 'ear', cutanee: 'cutaneous', transdermique: 'transdermal',
  rectale: 'rectal', vaginale: 'vaginal', autre: 'other',
}
