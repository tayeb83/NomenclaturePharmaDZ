'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { Suggestion } from '@/lib/suggest'

/**
 * Suggestions de recherche (voir lib/suggest.ts) : attente de 180 ms après la
 * dernière frappe, annulation de la requête précédente, clavier ↑ ↓ Entrée Échap.
 * `onPick` est appelé avec la suggestion choisie (clic ou Entrée).
 */
export function useSuggestions(q: string, onPick: (s: Suggestion) => void) {
  const [items, setItems] = useState<Suggestion[]>([])
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const skip = useRef<string | null>(null) // saisie qui vient d'être choisie : ne pas rouvrir la liste

  useEffect(() => {
    const text = q.trim()
    if (skip.current === text) return
    skip.current = null
    if (text.length < 2) { setItems([]); setOpen(false); return }
    const ctrl = new AbortController()
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search/suggest?q=${encodeURIComponent(text)}`, { signal: ctrl.signal })
        if (!res.ok) return
        const json = await res.json()
        setItems(json.suggestions || [])
        setActive(-1)
        setOpen((json.suggestions || []).length > 0)
      } catch {
        // requête annulée ou réseau coupé : on garde l'état précédent
      }
    }, 180)
    return () => { clearTimeout(t); ctrl.abort() }
  }, [q])

  const pick = useCallback((s: Suggestion) => {
    skip.current = s.label.trim()
    setOpen(false); setActive(-1)
    onPick(s)
  }, [onPick])

  /** À brancher sur onKeyDown de l'input. Renvoie true si la touche a été traitée. */
  const onKeyDown = useCallback((e: React.KeyboardEvent): boolean => {
    if (!open || items.length === 0) return false
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => (a + 1) % items.length); return true }
    if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => (a <= 0 ? items.length - 1 : a - 1)); return true }
    if (e.key === 'Escape') { setOpen(false); setActive(-1); return true }
    if (e.key === 'Enter' && active >= 0) { e.preventDefault(); pick(items[active]); return true }
    return false
  }, [open, items, active, pick])

  return { items, open, setOpen, active, setActive, pick, onKeyDown }
}
