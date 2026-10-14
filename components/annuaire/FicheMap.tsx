'use client'

import dynamic from 'next/dynamic'

const AnnuaireMap = dynamic(() => import('./AnnuaireMap'), { ssr: false })

/** Carte d'une seule pharmacie (fiche). */
export function FicheMap({ lat, lng, name }: { lat: number; lng: number; name: string }) {
  return <AnnuaireMap pins={[{ id: 0, lat, lng, name, href: '#', state: 'open' }]} openLabel="" />
}
