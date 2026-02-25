'use client'

import { useState } from 'react'
import { getLabLogoUrl } from '@/lib/lab-logos'

interface LabLogoProps {
  labName: string
  size?: number
}

/**
 * Affiche le logo d'un laboratoire pharmaceutique.
 * Source : Clearbit Logo API (https://logo.clearbit.com/{domain})
 *
 * Si le logo n'est pas trouvé dans le mapping ou si l'image échoue
 * à se charger (404/réseau), le composant n'affiche rien.
 */
export function LabLogo({ labName, size = 20 }: LabLogoProps) {
  const [hasError, setHasError] = useState(false)

  const logoUrl = getLabLogoUrl(labName)

  if (!logoUrl || hasError) return null

  return (
    <img
      src={logoUrl}
      alt={`Logo ${labName}`}
      width={size}
      height={size}
      style={{
        display: 'inline-block',
        verticalAlign: 'middle',
        marginRight: 5,
        borderRadius: 3,
        objectFit: 'contain',
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        padding: 1,
      }}
      onError={() => setHasError(true)}
    />
  )
}
