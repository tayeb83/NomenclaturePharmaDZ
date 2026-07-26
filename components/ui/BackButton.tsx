'use client'

import React from 'react'
import { useRouter } from 'next/navigation'

export function BackButton({
  label = '← Retour',
  fallbackHref = '/',
  className = '',
  style,
}: {
  label?: string
  fallbackHref?: string
  className?: string
  style?: React.CSSProperties
}) {
  const router = useRouter()

  function handleClick() {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back()
    } else {
      router.push(fallbackHref)
    }
  }

  const defaultStyle: React.CSSProperties = {
    padding: '10px 20px',
    background: '#f1f5f9',
    color: '#334155',
    border: '1.5px solid #e2e8f0',
    borderRadius: 8,
    fontWeight: 600,
    fontSize: 13,
    cursor: 'pointer',
    fontFamily: 'var(--font-body)',
    transition: 'all .15s',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    textDecoration: 'none',
  }

  return (
    <button
      onClick={handleClick}
      className={className}
      style={style !== undefined ? style : defaultStyle}
    >
      {label}
    </button>
  )
}
