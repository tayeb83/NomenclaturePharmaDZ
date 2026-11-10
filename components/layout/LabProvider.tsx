'use client'

import { createContext, useContext } from 'react'

/** Vrai pour une session admin : les fonctions du Lab (recherche guidée…) sont alors proposées partout. */
const LabContext = createContext(false)

export function LabProvider({ actif, children }: { actif: boolean; children: React.ReactNode }) {
  return <LabContext.Provider value={actif}>{children}</LabContext.Provider>
}

export const useLab = () => useContext(LabContext)
