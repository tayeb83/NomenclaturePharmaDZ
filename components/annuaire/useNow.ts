'use client'

import { useEffect, useState } from 'react'

/**
 * Horloge client. Les pages sont rendues côté serveur (cache ISR), donc le
 * premier rendu utilise l'heure du rendu serveur pour éviter tout écart
 * d'hydratation, puis le statut « ouverte / fermée » suit l'heure réelle du
 * visiteur, mise à jour chaque minute.
 */
export function useNow(initial: number): number {
  const [now, setNow] = useState(initial)
  useEffect(() => {
    setNow(Date.now())
    const id = window.setInterval(() => setNow(Date.now()), 60_000)
    return () => window.clearInterval(id)
  }, [])
  return now
}
