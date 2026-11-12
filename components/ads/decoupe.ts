/**
 * Découpe une liste en segments entre lesquels on intercale une publicité.
 *
 * Une pub est placée après `premier` éléments, puis tous les `pas` éléments,
 * dans la limite de `max` pubs — et seulement s'il reste des éléments après
 * elle (jamais de pub en fin de liste : le bas de page a déjà la sienne).
 *
 * Le rendu attendu est « un segment, une pub, un segment… » avec une clé
 * stable par segment : la pub ne se remonte alors pas quand la liste est
 * triée ou filtrée, ce qui gaspillerait l'impression.
 */
export type SegmentPub<T> = { debut: number; items: T[] }

export function decouperPourPubs<T>(items: T[], premier: number, pas: number, max: number): SegmentPub<T>[] {
  const coupes: number[] = []
  for (let pos = premier; pos < items.length && coupes.length < max; pos += pas) {
    if (pos <= 0 || pas <= 0) break
    coupes.push(pos)
  }
  const bornes = [0, ...coupes, items.length]
  const segments: SegmentPub<T>[] = []
  for (let i = 0; i < bornes.length - 1; i++) {
    segments.push({ debut: bornes[i], items: items.slice(bornes[i], bornes[i + 1]) })
  }
  return segments
}
