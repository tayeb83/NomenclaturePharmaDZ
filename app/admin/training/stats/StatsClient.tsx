'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

type Missed = { n: number; wrong: number; rate: number }
type Data = {
  overview: {
    days: number; activeUsers: number; users: Record<string, number>; approvedByRole: Record<string, number>; questions: Record<string, number>
    attempts: { total: number; finished: number; recent: number; avgScorePct: number | null }
    byMode: { mode: string; attempts: number; finished: number; avgScorePct: number | null }[]
  }
  missed: {
    minAnswers: number
    questions: ({ id: number; type: string; stem: string; atc: string | null } & Missed)[]
    byType: ({ type: string } & Missed)[]
    byAtc: ({ atc: string; label: string | null } & Missed)[]
  }
}

const TYPES: Record<string, string> = {
  dci_from_brand: 'DCI à partir du nom commercial', reference_generique: 'Référence ou générique', forme_dosage: 'Forme et dosage',
  labo_pays: 'Laboratoire et pays', retrait_motif: 'Motif de retrait', retrait_identification: 'Produit retiré', atc_classe: 'Classe ATC',
}
const ROLES: Record<string, string> = { etudiant: 'Étudiants', enseignant: 'Enseignants', pharmacien: 'Pharmaciens' }
const pct = (v: number | null) => (v === null ? '—' : `${v} %`)

function Bar({ value }: { value: number }) {
  return <span className="tr-bar" aria-hidden="true"><span style={{ width: `${Math.min(100, value)}%` }} /></span>
}

export function StatsClient() {
  const [data, setData] = useState<Data | null>(null)
  const [days, setDays] = useState(7)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch(`/api/admin/training/stats?days=${days}`).then(async r => {
      const j = await r.json().catch(() => ({}))
      if (cancelled) return
      if (!r.ok) { setError(j?.error || 'Erreur de chargement'); return }
      setError(null); setData(j)
    })
    return () => { cancelled = true }
  }, [days])

  const o = data?.overview
  return (
    <main className="tr-admin">
      <div className="tr-admin-top">
        <div>
          <h1>Training — suivi d’usage</h1>
          <Link href="/admin/training">← Demandes d’accès</Link>
        </div>
        <div className="tr-acts">
          <a className="tr-act" href="/api/admin/training/export?kind=users" download style={{ display: 'inline-flex', alignItems: 'center', textDecoration: 'none', color: 'inherit' }}>Exporter les utilisateurs (CSV)</a>
          <a className="tr-act" href="/api/admin/training/export?kind=attempts" download style={{ display: 'inline-flex', alignItems: 'center', textDecoration: 'none', color: 'inherit' }}>Exporter les tentatives (CSV)</a>
        </div>
      </div>
      <p className="tr-muted">Les exports contiennent des e-mails : données personnelles, à conserver et partager avec précaution.</p>

      {error && <div className="tr-flash warn" role="alert">{error}</div>}
      {!data && !error && <p>Chargement…</p>}

      {o && data && (
        <>
          <div className="tr-toolbar">
            {[7, 30, 90].map(d => (
              <button key={d} type="button" className="tr-chip" aria-pressed={days === d} onClick={() => setDays(d)}>{d} jours</button>
            ))}
          </div>

          <div className="tr-counters">
            <div className="tr-counter"><strong>{o.activeUsers}</strong><span>Utilisateurs actifs ({o.days} j)</span></div>
            <div className="tr-counter"><strong>{o.attempts.recent}</strong><span>Tentatives ({o.days} j)</span></div>
            <div className="tr-counter"><strong>{o.attempts.total}</strong><span>Tentatives au total ({o.attempts.finished} terminées)</span></div>
            <div className="tr-counter"><strong>{pct(o.attempts.avgScorePct)}</strong><span>Score moyen (tentatives terminées)</span></div>
            <div className="tr-counter"><strong>{o.users.approved ?? 0}</strong><span>Accès ouverts</span></div>
            <div className="tr-counter"><strong>{o.questions.published ?? 0}</strong><span>Questions publiées</span></div>
          </div>

          <section className="tr-section">
            <h2>Par mode</h2>
            <div className="tr-table-wrap"><table className="tr-table">
              <thead><tr><th>Mode</th><th>Tentatives</th><th>Terminées</th><th>Score moyen</th></tr></thead>
              <tbody>{o.byMode.length === 0 && <tr><td colSpan={4} style={{ textAlign: 'center', color: '#64748b' }}>Aucune tentative.</td></tr>}
                {o.byMode.map(m => <tr key={m.mode}><td>{m.mode === 'tuteur' ? 'Tuteur' : 'Examen'}</td><td>{m.attempts}</td><td>{m.finished}</td><td>{pct(m.avgScorePct)}</td></tr>)}
              </tbody></table></div>
            <p className="tr-muted" style={{ marginTop: 8 }}>
              Accès ouverts par profil : {Object.entries(o.approvedByRole).map(([r, n]) => `${ROLES[r] ?? r} ${n}`).join(' · ') || '—'}
            </p>
          </section>

          <p className="tr-muted">Taux d’erreur calculés sur les réponses données et corrigées ; les classements de questions et de classes ATC exigent au moins {data.missed.minAnswers} réponses.</p>

          <section className="tr-section">
            <h2>Questions les plus manquées par type</h2>
            <div className="tr-table-wrap"><table className="tr-table">
              <thead><tr><th>Type</th><th>Réponses</th><th>Erreurs</th><th colSpan={2}>Taux d’erreur</th></tr></thead>
              <tbody>{data.missed.byType.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', color: '#64748b' }}>Pas encore de données.</td></tr>}
                {data.missed.byType.map(t => <tr key={t.type}><td>{TYPES[t.type] ?? t.type}</td><td>{t.n}</td><td>{t.wrong}</td><td>{t.rate} %</td><td><Bar value={t.rate} /></td></tr>)}
              </tbody></table></div>
          </section>

          <section className="tr-section">
            <h2>Classes ATC les plus manquées (niveau 3)</h2>
            <div className="tr-table-wrap"><table className="tr-table">
              <thead><tr><th>Classe</th><th>Réponses</th><th>Erreurs</th><th colSpan={2}>Taux d’erreur</th></tr></thead>
              <tbody>{data.missed.byAtc.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', color: '#64748b' }}>Pas encore assez de données.</td></tr>}
                {data.missed.byAtc.map(a => <tr key={a.atc}><td>{a.atc}{a.label ? ` — ${a.label}` : ''}</td><td>{a.n}</td><td>{a.wrong}</td><td>{a.rate} %</td><td><Bar value={a.rate} /></td></tr>)}
              </tbody></table></div>
          </section>

          <section className="tr-section">
            <h2>Questions les plus manquées</h2>
            <div className="tr-table-wrap"><table className="tr-table">
              <thead><tr><th>N°</th><th>Type</th><th>Énoncé</th><th>Réponses</th><th>Taux d’erreur</th></tr></thead>
              <tbody>{data.missed.questions.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', color: '#64748b' }}>Pas encore assez de données.</td></tr>}
                {data.missed.questions.map(q => <tr key={q.id}><td>{q.id}</td><td>{TYPES[q.type] ?? q.type}</td><td style={{ maxWidth: 420 }}>{q.stem}</td><td>{q.n}</td><td>{q.rate} %</td></tr>)}
              </tbody></table></div>
          </section>
        </>
      )}
    </main>
  )
}
