import Link from 'next/link'
import { getAllDciList, getAllFormeList } from '@/lib/queries'
import { canonicalSegment } from '@/lib/seo-url'

/**
 * Index rendu côté serveur du catalogue.
 *
 * `/medicaments` délègue toute sa liste à un composant client qui la charge
 * depuis `/api/medicaments` — API que `robots.txt` interdit. Le HTML servi aux
 * robots sur la page mère du catalogue ne contenait donc **aucun lien** vers
 * les fiches ni vers les pages DCI. Les milliers d'URLs du sitemap n'avaient
 * ainsi pas un seul lien entrant : Google les découvre (« Détectée ») puis les
 * laisse indéfiniment en file, car une URL sans maillage interne passe après
 * tout le reste dans l'ordre d'exploration.
 *
 * Ce bloc rétablit le chaînon manquant : accueil → catalogue → DCI → fiches.
 * Il est volontairement plafonné — un hub qui déverse des milliers de liens
 * dilue le signal qu'il est censé transmettre.
 */
const MAX_DCI_LINKS = 250
const MAX_FORME_LINKS = 40

export async function CatalogueIndex() {
  const [dciList, formeList] = await Promise.all([
    getAllDciList(MAX_DCI_LINKS).catch(() => []),
    getAllFormeList(MAX_FORME_LINKS).catch(() => []),
  ])

  if (!dciList.length && !formeList.length) return null

  const chipStyle = {
    display: 'inline-block',
    padding: '5px 11px',
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: 7,
    fontSize: 12.5,
    color: '#334155',
    textDecoration: 'none',
  } as const

  return (
    <nav aria-label="Index du catalogue" style={{ marginTop: 56, paddingTop: 28, borderTop: '1.5px solid #e2e8f0' }}>
      <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', marginBottom: 6 }}>
        Parcourir la nomenclature
      </h2>
      <p style={{ color: '#64748b', fontSize: 13.5, marginBottom: 22, maxWidth: 640, lineHeight: 1.6 }}>
        Les substances actives les plus représentées dans la nomenclature algérienne, les formes
        galéniques et les répertoires par laboratoire et par classe thérapeutique.
      </p>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 26 }}>
        {[
          { href: '/laboratoires', label: '🏭 Laboratoires' },
          { href: '/classes-therapeutiques', label: '🧬 Classes thérapeutiques ATC' },
          { href: '/substitution', label: '♻️ Substitution générique' },
          { href: '/medicaments-critiques', label: '🚨 Médicaments critiques' },
          { href: '/alertes', label: '⚠️ Retraits et alertes' },
        ].map(l => (
          <Link key={l.href} href={l.href} style={{ ...chipStyle, background: '#eff6ff', borderColor: '#bfdbfe', color: '#1d4ed8', fontWeight: 600 }}>
            {l.label}
          </Link>
        ))}
      </div>

      {dciList.length > 0 && (
        <section style={{ marginBottom: 26 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: '#334155', marginBottom: 12 }}>
            Substances actives (DCI)
          </h3>
          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
            {dciList.map(({ dci }) => (
              <Link key={dci} href={`/dci/${canonicalSegment(dci)}`} style={chipStyle}>
                {dci}
              </Link>
            ))}
          </div>
        </section>
      )}

      {formeList.length > 0 && (
        <section>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: '#334155', marginBottom: 12 }}>
            Formes galéniques
          </h3>
          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
            {formeList.map(({ forme }) => (
              <Link key={forme} href={`/forme/${canonicalSegment(forme)}`} style={chipStyle}>
                {forme}
              </Link>
            ))}
          </div>
        </section>
      )}
    </nav>
  )
}
