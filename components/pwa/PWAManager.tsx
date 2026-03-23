'use client'

import { useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

/**
 * PWAManager :
 * 1. Enregistre le service worker (/sw.js)
 * 2. Affiche une bannière d'installation de l'app sur mobile
 */
export function PWAManager() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showBanner, setShowBanner] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    // Enregistrement du Service Worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .catch(() => { /* silencieux en prod */ })
    }

    // Vérifier si déjà installée (standalone) ou bannière déjà refusée
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true
    const wasDismissed = sessionStorage.getItem('pwa-banner-dismissed') === '1'

    if (isStandalone || wasDismissed) return

    const handler = (e: Event) => {
      e.preventDefault()
      setInstallPrompt(e as BeforeInstallPromptEvent)
      setShowBanner(true)
    }

    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (!installPrompt) return
    await installPrompt.prompt()
    const { outcome } = await installPrompt.userChoice
    if (outcome === 'accepted') {
      setShowBanner(false)
    }
    setInstallPrompt(null)
  }

  const handleDismiss = () => {
    setShowBanner(false)
    setDismissed(true)
    sessionStorage.setItem('pwa-banner-dismissed', '1')
  }

  if (!showBanner || dismissed) return null

  return (
    <div style={{
      position: 'fixed',
      bottom: 20,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 9999,
      background: '#1e293b',
      border: '1px solid rgba(99,102,241,0.4)',
      borderRadius: 14,
      padding: '14px 18px',
      display: 'flex',
      alignItems: 'center',
      gap: 14,
      boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      maxWidth: 'calc(100vw - 32px)',
      width: 400,
    }}>
      <div style={{ fontSize: 32, flexShrink: 0 }}>💊</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 3 }}>
          Installer PharmaVeille DZ
        </div>
        <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12 }}>
          Accès rapide depuis votre écran d&apos;accueil, fonctionne hors-ligne.
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
        <button
          onClick={handleInstall}
          style={{
            background: 'rgba(99,102,241,0.25)',
            border: '1px solid rgba(99,102,241,0.5)',
            color: '#a5b4fc',
            borderRadius: 8,
            padding: '7px 14px',
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          Installer
        </button>
        <button
          onClick={handleDismiss}
          aria-label="Fermer"
          style={{
            background: 'transparent',
            border: '1px solid rgba(255,255,255,0.15)',
            color: 'rgba(255,255,255,0.75)',
            borderRadius: 8,
            padding: '7px 10px',
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          ✕
        </button>
      </div>
    </div>
  )
}
