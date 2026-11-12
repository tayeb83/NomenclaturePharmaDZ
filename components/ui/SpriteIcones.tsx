import { SPRITE_ICONES } from '@/lib/dwadz-icons/sprite'

/** Sprite des icônes de forme / voie / modificateurs, inliné une fois par page (à placer juste après <body>). */
export function SpriteIcones() {
  return <div aria-hidden="true" dangerouslySetInnerHTML={{ __html: SPRITE_ICONES }} />
}
