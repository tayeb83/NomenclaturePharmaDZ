'use client'

/**
 * Filtres de la recherche : colonne latérale toujours visible sur ordinateur (cases à cocher, un bloc repliable par
 * critère), tiroir ouvert par un bouton « Filtrer » sur téléphone. Un seul choix par critère ; recocher le retire.
 */

import { useState } from 'react'

export type OptionFiltre = { id: string; label: string; n: number; drapeau?: string }
export type GroupeFiltre = {
  id: string
  titre: string
  options: OptionFiltre[]
  actif?: string
  onPick: (id: string) => void
}

const VISIBLES = 7
const SEUIL_RECHERCHE = 10
/** Blocs ouverts d'emblée : les deux premiers critères (voie, forme). */
const OUVERTS_D_EMBLEE = 2

type Textes = { filtres: string; plus: string; moins: string; effacer: string; chercher: string; autres: (n: number) => string; aucun: string; actifs: string; fermer: string }

function Bloc({ g, ouvert, onToggle, textes }: { g: GroupeFiltre; ouvert: boolean; onToggle: () => void; textes: Textes }) {
  const [filtre, setFiltre] = useState('')
  const [toutVoir, setToutVoir] = useState(false)
  const q = filtre.trim().toLowerCase()
  const options = q ? g.options.filter(o => o.label.toLowerCase().includes(q)) : g.options
  const affichees = toutVoir || q ? options : options.slice(0, VISIBLES)
  // l'option choisie reste toujours visible, même au-delà des premières
  const visibles = g.actif && !affichees.some(o => o.id === g.actif)
    ? [...affichees, ...g.options.filter(o => o.id === g.actif)]
    : affichees
  const sel = g.options.find(o => o.id === g.actif)

  return (
    <div className="fl-bloc">
      <button type="button" className="fl-bloc-tete" aria-expanded={ouvert} onClick={onToggle}>
        <span className="fl-bloc-titre">{g.titre}{sel && <span className="fl-point" aria-hidden />}</span>
        {!ouvert && sel && <span className="fl-bloc-resume">{sel.label}</span>}
        <svg className="fl-chevron" width="12" height="12" viewBox="0 0 12 12" aria-hidden><path d="M2 4.5l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>
      {ouvert && (
        <div className="fl-bloc-corps">
          {g.options.length > SEUIL_RECHERCHE && (
            <input type="search" className="fl-recherche" value={filtre} onChange={e => setFiltre(e.target.value)} placeholder={textes.chercher} aria-label={`${g.titre} — ${textes.chercher}`} />
          )}
          {visibles.length === 0 ? <p className="fl-vide">{textes.aucun}</p> : visibles.map(o => (
            <label key={o.id} className={`fl-option${g.actif === o.id ? ' choisi' : ''}`}>
              <span className="fl-option-nom">
                <input type="checkbox" checked={g.actif === o.id} onChange={() => g.onPick(o.id)} />
                <span>{o.drapeau ?? ''}{o.label}</span>
              </span>
              <span className="fl-option-n">{o.n}</span>
            </label>
          ))}
          {!q && !toutVoir && options.length > VISIBLES && (
            <button type="button" className="fl-voir-tout" onClick={() => setToutVoir(true)}>{textes.autres(options.length - VISIBLES)}</button>
          )}
        </div>
      )}
    </div>
  )
}

export function FiltresRecherche({
  principaux, secondaires, textes, onClear, ar,
}: {
  principaux: GroupeFiltre[]
  secondaires: GroupeFiltre[]
  textes: Textes
  onClear: () => void
  ar: boolean
}) {
  const [tiroir, setTiroir] = useState(false)
  const [plus, setPlus] = useState(false)
  const [ouverts, setOuverts] = useState<Set<string>>(() => new Set(principaux.slice(0, OUVERTS_D_EMBLEE).map(g => g.id)))

  const tous = [...principaux, ...secondaires]
  const actifs = tous.filter(g => g.actif)
  const nSecActifs = secondaires.filter(g => g.actif).length
  const basculer = (id: string) => setOuverts(prev => { const s = new Set(prev); if (s.has(id)) s.delete(id); else s.add(id); return s })
  const liste = plus || nSecActifs > 0 ? secondaires : []

  return (
    <>
      <button type="button" className="fl-ouvrir" aria-expanded={tiroir} onClick={() => setTiroir(true)}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden><path d="M4 6h16M7 12h10M10 18h4" /></svg>
        {textes.filtres}{actifs.length > 0 && <span className="fl-badge">{actifs.length}</span>}
      </button>
      {tiroir && <div className="fl-voile" onClick={() => setTiroir(false)} aria-hidden />}

      <aside className={`fl-colonne${tiroir ? ' ouvert' : ''}`} dir={ar ? 'rtl' : 'ltr'} aria-label={textes.filtres}>
        <div className="fl-tete">
          <h2>{textes.filtres}</h2>
          {actifs.length > 0 && <button type="button" className="fl-effacer" onClick={onClear}>{textes.effacer}</button>}
          <button type="button" className="fl-fermer" onClick={() => setTiroir(false)} aria-label={textes.fermer}>✕</button>
        </div>

        {actifs.length > 0 && (
          <div className="fl-actifs" aria-label={textes.actifs}>
            {actifs.map(g => {
              const o = g.options.find(x => x.id === g.actif)
              return (
                <button key={g.id} type="button" className="fl-actif" onClick={() => g.onPick(g.actif!)} title={textes.effacer}>
                  <small>{g.titre}</small> {o ? `${o.drapeau ?? ''}${o.label}` : g.actif} <span aria-hidden>✕</span>
                </button>
              )
            })}
          </div>
        )}

        {principaux.map(g => <Bloc key={g.id} g={g} ouvert={ouverts.has(g.id)} onToggle={() => basculer(g.id)} textes={textes} />)}

        {secondaires.length > 0 && (
          <>
            {liste.map(g => <Bloc key={g.id} g={g} ouvert={ouverts.has(g.id)} onToggle={() => basculer(g.id)} textes={textes} />)}
            {nSecActifs === 0 && (
              <button type="button" className="fl-plus" aria-expanded={plus} onClick={() => setPlus(!plus)}>
                {plus ? textes.moins : textes.plus}
              </button>
            )}
          </>
        )}

        <button type="button" className="fl-appliquer" onClick={() => setTiroir(false)}>{textes.fermer}</button>
      </aside>
    </>
  )
}
