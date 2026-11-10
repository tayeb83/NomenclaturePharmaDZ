'use client'

/**
 * Filtres de la recherche : une barre de menus (un par critère) et UN seul panneau ouvert à la fois,
 * au lieu d'un mur de pastilles. Les choix actifs restent visibles en pastilles qu'on retire d'un clic.
 */

import { useMemo, useState } from 'react'

export type OptionFiltre = { id: string; label: string; n: number; drapeau?: string }
export type GroupeFiltre = {
  id: string
  titre: string
  options: OptionFiltre[]
  actif?: string
  onPick: (id: string) => void
}

const VISIBLES = 18
const SEUIL_RECHERCHE = 10

type Textes = { filtres: string; plus: string; moins: string; effacer: string; chercher: string; autres: (n: number) => string; aucun: string; actifs: string }

export function FiltresRecherche({
  principaux, secondaires, textes, onClear, ar,
}: {
  principaux: GroupeFiltre[]
  secondaires: GroupeFiltre[]
  textes: Textes
  onClear: () => void
  ar: boolean
}) {
  // Premier critère ouvert d'emblée : les choix sont visibles sans cliquer.
  const [ouvert, setOuvert] = useState<string | null>(principaux[0]?.id ?? null)
  const [plus, setPlus] = useState(false)
  const [filtre, setFiltre] = useState('')
  const [toutVoir, setToutVoir] = useState(false)

  const tous = useMemo(() => [...principaux, ...secondaires], [principaux, secondaires])
  const actifs = tous.filter(g => g.actif).map(g => ({ g, o: g.options.find(o => o.id === g.actif) }))
  const nSecActifs = secondaires.filter(g => g.actif).length
  const visibles = plus ? [...principaux, ...secondaires] : principaux
  const groupe = tous.find(g => g.id === ouvert) ?? null

  function basculer(id: string) {
    setFiltre(''); setToutVoir(false)
    setOuvert(ouvert === id ? null : id)
  }

  const options = useMemo(() => {
    if (!groupe) return []
    const q = filtre.trim().toLowerCase()
    return q ? groupe.options.filter(o => o.label.toLowerCase().includes(q)) : groupe.options
  }, [groupe, filtre])
  const affichees = toutVoir || filtre ? options : options.slice(0, VISIBLES)

  return (
    <div className="filtres" dir={ar ? 'rtl' : 'ltr'}>
      <div className="filtres-barre" role="toolbar" aria-label={textes.filtres}>
        <span className="filtres-titre" aria-hidden>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M4 6h16M7 12h10M10 18h4" /></svg>
          {textes.filtres}
        </span>
        {visibles.map(g => {
          const sel = g.options.find(o => o.id === g.actif)
          return (
            <button
              key={g.id} type="button"
              className={`filtre-bouton${g.actif ? ' choisi' : ''}${ouvert === g.id ? ' ouvert' : ''}`}
              aria-expanded={ouvert === g.id} onClick={() => basculer(g.id)}
            >
              <span>{g.titre}{sel ? <>: <b>{sel.drapeau ?? ''}{sel.label}</b></> : null}</span>
              <svg className="filtre-chevron" width="11" height="11" viewBox="0 0 12 12" aria-hidden><path d="M2 4.5l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
          )
        })}
        {secondaires.length > 0 && (
          <button type="button" className={`filtre-bouton discret${plus ? ' ouvert' : ''}`} aria-expanded={plus}
            onClick={() => { setPlus(!plus); if (plus && groupe && secondaires.some(s => s.id === groupe.id)) setOuvert(null) }}>
            {plus ? textes.moins : textes.plus}{!plus && nSecActifs > 0 ? <span className="filtre-pastille-n">{nSecActifs}</span> : null}
          </button>
        )}
      </div>

      {groupe && (
        <div className="filtre-panneau" role="region" aria-label={groupe.titre}>
          <div className="filtre-panneau-tete">
            <strong>{groupe.titre}</strong>
            <span className="filtre-compte">{groupe.options.length}</span>
            {groupe.options.length > SEUIL_RECHERCHE && (
              <input
                type="search" className="filtre-recherche" value={filtre} onChange={e => setFiltre(e.target.value)}
                placeholder={textes.chercher} aria-label={textes.chercher} autoFocus
              />
            )}
            <button type="button" className="filtre-fermer" onClick={() => setOuvert(null)} aria-label="✕">✕</button>
          </div>
          {affichees.length === 0 ? (
            <p className="filtre-vide">{textes.aucun}</p>
          ) : (
            <div className="filtre-options">
              {affichees.map(o => {
                const choisi = groupe.actif === o.id
                return (
                  <button
                    key={o.id} type="button" aria-pressed={choisi}
                    className={`filtre-option${choisi ? ' choisi' : ''}`}
                    onClick={() => { groupe.onPick(o.id); setOuvert(null) }}
                  >
                    {choisi && <span aria-hidden>✓</span>}
                    <span className="filtre-option-nom">{o.drapeau ?? ''}{o.label}</span>
                    <span className="filtre-option-n">{o.n}</span>
                  </button>
                )
              })}
            </div>
          )}
          {!filtre && !toutVoir && options.length > VISIBLES && (
            <button type="button" className="filtre-voir-tout" onClick={() => setToutVoir(true)}>{textes.autres(options.length - VISIBLES)}</button>
          )}
        </div>
      )}

      {actifs.length > 0 && (
        <div className="filtres-actifs" aria-label={textes.actifs}>
          {actifs.map(({ g, o }) => (
            <button key={g.id} type="button" className="filtre-actif" onClick={() => g.onPick(g.actif!)} title={textes.effacer}>
              <small>{g.titre}</small> {o ? `${o.drapeau ?? ''}${o.label}` : g.actif} <span aria-hidden>✕</span>
            </button>
          ))}
          <button type="button" className="filtre-effacer" onClick={onClear}>{textes.effacer}</button>
        </div>
      )}
    </div>
  )
}
