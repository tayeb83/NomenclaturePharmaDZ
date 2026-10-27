import Link from 'next/link'
import { pickLang, type Lang } from '@/lib/i18n'
import { RCP_PORTAL_URL, pdfPageUrl, type Gravite, type InteractionEntrante, type Population, type RcpFait, type RcpLink } from '@/lib/rcp-core'

const GRAVITE: Record<Gravite, { fr: string; ar: string; color: string; bg: string }> = {
  contre_indiquee: { fr: 'Contre-indiquée', ar: 'مضادة للاستعمال', color: '#991b1b', bg: '#fee2e2' },
  deconseillee: { fr: 'Déconseillée', ar: 'غير مستحسنة', color: '#9a3412', bg: '#ffedd5' },
  precaution: { fr: 'Précaution d\'emploi', ar: 'احتياطات الاستعمال', color: '#854d0e', bg: '#fef9c3' },
  a_prendre_en_compte: { fr: 'À prendre en compte', ar: 'تؤخذ بعين الاعتبار', color: '#475569', bg: '#f1f5f9' },
  non_precisee: { fr: 'Citée dans le RCP', ar: 'مذكورة في RCP', color: '#475569', bg: '#f1f5f9' },
}
const POPULATION: Record<Population, { fr: string; ar: string }> = {
  adulte: { fr: 'Adulte', ar: 'البالغ' },
  enfant: { fr: 'Enfant', ar: 'الطفل' },
  personne_agee: { fr: 'Personne âgée', ar: 'المسن' },
  non_precisee: { fr: 'Posologie', ar: 'الجرعة' },
}

const BLUE = '#1d4e9e', RED = '#b42323', TEAL = '#16766f', BRASS = '#8a5a00'
const small: React.CSSProperties = { fontSize: 12.5, color: '#64748b' }
const link: React.CSSProperties = { color: 'var(--blue)' }
const row: React.CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: '4px 10px', alignItems: 'baseline', justifyContent: 'space-between', fontSize: 14.5 }
const sep: React.CSSProperties = { borderTop: '1px solid #eef2f6', paddingTop: 7 }
const badge = (g: { color: string; bg: string }): React.CSSProperties => ({
  background: g.bg, color: g.color, borderRadius: 5, padding: '0 7px', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap',
})

/** Bouton de page, comme « p.2 ↗ » : ouvre le PDF de l'ANPP à la bonne page. */
function PageLink({ pdfUrl, f, lang }: { pdfUrl: string; f: Pick<RcpFait, 'page'>; lang: Lang }) {
  return (
    <a
      href={pdfPageUrl(pdfUrl, f.page)} target="_blank" rel="noopener noreferrer"
      style={{ border: '1.5px solid #dbe3e8', background: '#f6f8f9', borderRadius: 7, padding: '0 9px', fontSize: 12, fontFamily: 'var(--font-mono, ui-monospace, monospace)', color: BLUE, whiteSpace: 'nowrap', textDecoration: 'none', lineHeight: '22px' }}
    >
      {pickLang(lang, { fr: `p.${f.page} ↗`, ar: `ص.${f.page} ↗` })}
    </a>
  )
}

/** Carte thématique : repère coloré, titre, rubrique(s) du RCP à droite. */
function Card({ accent, title, rubriques, wide, children }: { accent: string; title: string; rubriques?: string; wide?: boolean; children: React.ReactNode }) {
  return (
    <article style={{ background: 'white', border: '1px solid #dbe3e8', borderRadius: 12, padding: '13px 15px', display: 'grid', gap: 9, alignContent: 'start', minWidth: 0, gridColumn: wide ? '1 / -1' : undefined }}>
      <header style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <span aria-hidden="true" style={{ width: 12, height: 12, borderRadius: 3, background: accent, flex: 'none' }} />
        <h3 style={{ fontSize: 16.5, fontWeight: 800, color: '#12233f', margin: 0 }}>{title}</h3>
        {rubriques && <span style={{ marginInlineStart: 'auto', fontFamily: 'var(--font-mono, ui-monospace, monospace)', fontSize: 12, color: '#5b6b80' }}>{rubriques}</span>}
      </header>
      {children}
    </article>
  )
}

const rubriques = (fs: RcpFait[]) => {
  const s = [...new Set(fs.map(f => f.section))]
  return s.length ? `RCP ${s.join(' · ')}` : undefined
}

/** Pastille d'entité : ● substance de la base (lien), ◆ classe ATC (lien), tirets si absente de la base. */
function Entite({ f }: { f: RcpFait }) {
  const classe = f.cible_type === 'classe' && f.cible
  const dci = !classe && f.dci_lien
  const base: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 5, padding: '0 8px', borderRadius: 6, fontWeight: 700, fontSize: 14, textDecoration: 'none' }
  if (dci) {
    return <Link href={`/dci/${encodeURIComponent(dci.toLowerCase())}`} title={dci} style={{ ...base, background: '#e4edf7', color: BLUE }}><span aria-hidden="true" style={{ fontSize: 9 }}>●</span>{f.libelle}</Link>
  }
  if (classe) {
    return <Link href={`/classes-therapeutiques/${encodeURIComponent(f.cible!)}`} title={f.cible!} style={{ ...base, background: '#d9f0ee', color: TEAL }}><span aria-hidden="true" style={{ fontSize: 9 }}>◆</span>{f.libelle}</Link>
  }
  return <span style={{ ...base, border: '1px dashed #cbd5e1', color: '#475569', fontWeight: 600 }}>{f.libelle}</span>
}

const chip: React.CSSProperties = {
  background: '#f6f8f9', border: '1px solid #dbe3e8', borderRadius: 999, padding: '1px 11px',
  fontSize: 14.5, fontWeight: 700, color: '#12233f', whiteSpace: 'nowrap',
}

/** Doses : par population puis par page, un seul bouton de page par groupe. */
function Doses({ doses, pdfUrl, lang }: { doses: RcpFait[]; pdfUrl: string; lang: Lang }) {
  const groups: { key: string; population: Population; first: RcpFait; items: RcpFait[] }[] = []
  for (const f of doses) {
    const population = f.population ?? 'non_precisee'
    const key = `${population}|${f.section}|${f.page}`
    const g = groups.find(x => x.key === key)
    if (g) g.items.push(f)
    else groups.push({ key, population, first: f, items: [f] })
  }
  return (
    <>
      {groups.map((g, i) => (
        <div key={g.key} style={{ display: 'grid', gap: 6, ...(i ? sep : null) }}>
          <div style={row}>
            <span style={{ ...small, fontWeight: 700 }}>{POPULATION[g.population][lang]}</span>
            <PageLink pdfUrl={pdfUrl} f={g.first} lang={lang} />
          </div>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {g.items.map(f => <li key={f.id} style={chip}>{f.libelle}</li>)}
          </ul>
        </div>
      ))}
    </>
  )
}

function Faits({ rcp, lang }: { rcp: RcpLink; lang: Lang }) {
  // `?? []` : une fiche déjà en cache avant l'ajout des faits n'a pas ce champ
  const faits = rcp.faits ?? []
  const doses = faits.filter(f => f.type === 'dose')
  const ci = faits.filter(f => f.type === 'contre_indication')
  const gro = faits.filter(f => f.type === 'grossesse')
  const inter = faits.filter(f => f.type === 'interaction')
  if (doses.length + ci.length + gro.length + inter.length === 0) return null

  const source = pickLang(lang, {
    fr: `Source : RCP de ${rcp.laboratoire_anpp ?? rcp.nom_commercial}${rcp.version_texte ? `, version ${rcp.version_texte}` : ''}, publié sur rcp.anpp.dz.`,
    ar: `المصدر: RCP الخاص بـ ${rcp.laboratoire_anpp ?? rcp.nom_commercial}${rcp.version_texte ? `، النسخة ${rcp.version_texte}` : ''}، منشور على rcp.anpp.dz.`,
  })

  return (
    <div style={{ flexBasis: '100%', borderTop: '1px solid #dbe3e8', paddingTop: 12, display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px 14px', alignItems: 'baseline' }}>
        <h3 style={{ fontSize: 18, fontWeight: 800, color: '#12233f', margin: 0 }}>{pickLang(lang, { fr: 'L\'essentiel du RCP', ar: 'أهم ما في RCP' })}</h3>
        <span style={small}>{pickLang(lang, { fr: 'Extraits courts, avec la page où les retrouver dans le document.', ar: 'مقتطفات قصيرة مع رقم الصفحة في المستند.' })}</span>
      </div>

      <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))' }}>
        {doses.length > 0 && (
          <Card accent={BLUE} title={pickLang(lang, { fr: 'Posologie', ar: 'الجرعات' })} rubriques={rubriques(doses)}>
            <Doses doses={doses} pdfUrl={rcp.pdf_url} lang={lang} />
          </Card>
        )}
        {ci.length > 0 && (
          <Card accent={RED} title={pickLang(lang, { fr: 'Contre-indications', ar: 'موانع الاستعمال' })} rubriques={rubriques(ci)}>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 7 }}>
              {ci.map((f, i) => (
                <li key={f.id} style={{ ...row, flexWrap: 'nowrap', alignItems: 'center', ...(i ? sep : null) }}>
                  <span style={{ color: '#12233f', minWidth: 0 }}>{f.libelle}</span>
                  <PageLink pdfUrl={rcp.pdf_url} f={f} lang={lang} />
                </li>
              ))}
            </ul>
          </Card>
        )}
        {gro.length > 0 && (
          <Card accent={BRASS} title={pickLang(lang, { fr: 'Grossesse et allaitement', ar: 'الحمل والرضاعة' })} rubriques={rubriques(gro)}>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
              {gro.map((f, i) => {
                const g = GRAVITE[f.gravite ?? 'non_precisee']
                const alerte = f.gravite === 'contre_indiquee'
                return (
                  <li key={f.id} style={{ display: 'grid', gap: 5, ...(i ? sep : null) }}>
                    <div style={{ ...row, alignItems: 'center' }}>
                      <span style={{ fontWeight: 700, color: '#12233f' }}>{f.libelle === 'Allaitement' ? pickLang(lang, { fr: 'Allaitement', ar: 'الرضاعة' }) : pickLang(lang, { fr: 'Grossesse', ar: 'الحمل' })}</span>
                      <PageLink pdfUrl={rcp.pdf_url} f={f} lang={lang} />
                    </div>
                    <div style={alerte ? { background: '#fde8e8', border: `1.5px solid ${RED}`, borderRadius: 10, padding: '6px 11px', color: RED, fontWeight: 700, fontSize: 14 } : undefined}>
                      {alerte ? g[lang] : <span style={badge(g)}>{!f.gravite || f.gravite === 'non_precisee' ? pickLang(lang, { fr: 'Voir le RCP', ar: 'راجع RCP' }) : g[lang]}</span>}
                    </div>
                  </li>
                )
              })}
            </ul>
          </Card>
        )}
        {inter.length > 0 && (
          <Card accent={TEAL} wide title={pickLang(lang, { fr: 'Interactions', ar: 'التداخلات' })} rubriques={rubriques(inter)}>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 7 }}>
              {inter.map((f, i) => {
                const g = GRAVITE[f.gravite ?? 'non_precisee']
                return (
                  <li key={f.id} style={{ ...row, alignItems: 'center', ...(i ? sep : null) }}>
                    <span style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <Entite f={f} />
                      <span style={badge(g)}>{g[lang]}</span>
                    </span>
                    <PageLink pdfUrl={rcp.pdf_url} f={f} lang={lang} />
                  </li>
                )
              })}
            </ul>
            <p style={{ ...small, margin: 0 }}>
              {pickLang(lang, {
                fr: '● substance de la base DwaDZ (cliquable) · ◆ classe thérapeutique (cliquable) · pointillés : non reliée à une fiche.',
                ar: '● مادة موجودة في قاعدة DwaDZ (قابلة للنقر) · ◆ صنف علاجي (قابل للنقر) · نقاط: غير مرتبطة ببطاقة.',
              })}
            </p>
          </Card>
        )}
      </div>

      <p style={{ ...small, margin: 0, lineHeight: 1.6, borderTop: '1px solid #dbe3e8', paddingTop: 10 }}>
        {source}{' '}
        <a href={rcp.pdf_url} target="_blank" rel="noopener noreferrer" style={link}>
          {pickLang(lang, { fr: 'Ouvrir le PDF', ar: 'فتح PDF' })}
        </a>
        {'. '}
        {pickLang(lang, {
          fr: 'Repères relus par DwaDZ, à titre indicatif : seul le RCP complet fait foi. Consultez-le et un professionnel de santé.',
          ar: 'معالم راجعها فريق DwaDZ على سبيل الإرشاد فقط: المرجع الوحيد هو RCP الكامل. يُرجى الرجوع إليه واستشارة مختص صحي.',
        })}
      </p>
    </div>
  )
}

/**
 * RCP officiel(s) de la fiche. Le document s'ouvre sur le portail de l'ANPP :
 * DwaDZ n'en garde aucune copie, et dit d'où il vient. Les faits courts
 * (doses, contre-indications, grossesse, associations) ne s'affichent qu'une fois relus.
 */
export function RcpSection({ rcps, lang }: { rcps: RcpLink[]; lang: Lang }) {
  if (rcps.length === 0) return null
  return (
    <section id="rcp" style={{ marginTop: 40, scrollMarginTop: 16 }}>
      <h2 className="section-title">
        {pickLang(lang, { fr: '📄 RCP officiel', ar: '📄 ملخص خصائص المنتوج (RCP)' })}
      </h2>
      <div className="section-sub">
        {pickLang(lang, {
          fr: 'Résumé des caractéristiques du produit, publié par l\'ANPP. Le document s\'ouvre sur le portail officiel : DwaDZ n\'en conserve pas de copie.',
          ar: 'ملخص خصائص المنتوج كما نشرته الوكالة الوطنية للمنتجات الصيدلانية. يُفتح المستند على الموقع الرسمي، ولا يحتفظ DwaDZ بنسخة منه.',
        })}
      </div>
      <div style={{ marginTop: 12, display: 'grid', gap: 12 }}>
        {rcps.map(r => (
          <div
            key={r.rcp_id}
            style={{
              background: '#f6f8f9', border: '1.5px solid #dbe3e8', borderRadius: 14, padding: '14px 18px',
              display: 'flex', flexWrap: 'wrap', gap: '8px 16px', alignItems: 'center',
            }}
          >
            <div style={{ flex: '1 1 240px', minWidth: 0 }}>
              <div style={{ fontSize: 17, fontWeight: 800, color: '#12233f' }}>{r.nom_commercial}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 10px', alignItems: 'center', marginTop: 4 }}>
                {r.version_texte && (
                  <span style={{ background: '#e4edf7', color: BLUE, borderRadius: 999, padding: '0 10px', fontSize: 12.5, fontWeight: 700 }}>
                    {pickLang(lang, { fr: `RCP ${r.version_texte}`, ar: `RCP ${r.version_texte}` })}
                  </span>
                )}
                {r.laboratoire_anpp && <span style={{ fontSize: 13.5, color: '#5b6b80' }}>{r.laboratoire_anpp}</span>}
              </div>
            </div>
            <a
              href={r.pdf_url}
              target="_blank"
              rel="noopener noreferrer"
              className="fiche-btn"
              style={{ margin: 0, flex: '0 0 auto', padding: '8px 16px' }}
            >
              {pickLang(lang, { fr: 'Ouvrir le RCP (PDF) ↗', ar: 'فتح RCP (PDF) ↗' })}
            </a>
            <Faits rcp={r} lang={lang} />
          </div>
        ))}
      </div>
      <p style={{ fontSize: 12.5, color: '#64748b', marginTop: 10, lineHeight: 1.6 }}>
        {pickLang(lang, {
          fr: 'Rattachement à la fiche établi automatiquement à partir de la marque, de la substance et du laboratoire. Une erreur ? ',
          ar: 'تم ربط المستند بالبطاقة آليًا انطلاقًا من الاسم التجاري والمادة الفعالة والمخبر. هل من خطأ؟ ',
        })}
        <Link href="/contact" style={link}>
          {pickLang(lang, { fr: 'Écrivez-nous', ar: 'راسلنا' })}
        </Link>
        {' · '}
        <a href={RCP_PORTAL_URL} target="_blank" rel="noopener noreferrer" style={link}>
          {pickLang(lang, { fr: 'Chercher un autre RCP sur rcp.anpp.dz', ar: 'البحث عن RCP آخر في rcp.anpp.dz' })}
        </a>
      </p>
    </section>
  )
}

const GRAVITE_RANK: Record<Gravite, number> = { contre_indiquee: 0, deconseillee: 1, precaution: 2, a_prendre_en_compte: 3, non_precisee: 4 }

/**
 * Interactions vues de l'autre côté : les RCP d'autres substances qui citent celle-ci.
 * S'affiche même si la substance n'a aucun RCP.
 */
export function InteractionsEntrantes({ items, dci, lang }: { items: InteractionEntrante[]; dci: string; lang: Lang }) {
  if (items.length === 0) return null
  const parSource = new Map<string, InteractionEntrante[]>()
  for (const it of items) parSource.set(it.source_dci, [...(parSource.get(it.source_dci) ?? []), it])
  const groupes = [...parSource.entries()]
    .map(([source, list]) => ({ source, list, rank: Math.min(...list.map(i => GRAVITE_RANK[i.gravite ?? 'non_precisee'])) }))
    .sort((a, b) => a.rank - b.rank || a.source.localeCompare(b.source, 'fr'))

  return (
    <section id="interactions-rcp" style={{ marginTop: 40, scrollMarginTop: 16 }}>
      <h2 className="section-title">
        {pickLang(lang, { fr: '⚠️ Interactions citées par d\'autres RCP', ar: '⚠️ تداخلات مذكورة في RCP أخرى' })}
      </h2>
      <div className="section-sub">
        {pickLang(lang, {
          fr: `Des RCP publiés par l'ANPP citent ${dci.toUpperCase()} parmi les associations à surveiller. Le lien existe donc dans les deux sens, même sans RCP pour ${dci.toUpperCase()}.`,
          ar: `تذكر RCP منشورة من الوكالة ${dci.toUpperCase()} ضمن الاقترانات الواجب مراقبتها. فالعلاقة قائمة في الاتجاهين حتى دون RCP لـ ${dci.toUpperCase()}.`,
        })}
      </div>
      <div style={{ marginTop: 12, background: 'white', border: '1px solid #dbe3e8', borderRadius: 12, padding: '6px 15px', display: 'grid' }}>
        {groupes.map(({ source, list }, i) => {
          const g = GRAVITE[list.map(l => l.gravite ?? 'non_precisee').sort((a, b) => GRAVITE_RANK[a] - GRAVITE_RANK[b])[0]]
          return (
            <div key={source} style={{ ...row, alignItems: 'center', padding: '9px 0', ...(i ? { borderTop: '1px solid #eef2f6' } : null) }}>
              <span style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <Link href={`/dci/${encodeURIComponent(source.toLowerCase())}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '0 8px', borderRadius: 6, fontWeight: 700, background: '#e4edf7', color: BLUE, textDecoration: 'none' }}>
                  <span aria-hidden="true" style={{ fontSize: 9 }}>●</span>{source}
                </Link>
                <span style={badge(g)}>{g[lang]}</span>
              </span>
              <span style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                {list.map(it => (
                  <a key={it.id} href={pdfPageUrl(it.pdf_url, it.page)} target="_blank" rel="noopener noreferrer" style={{ ...small, color: BLUE, textDecoration: 'none' }}>
                    {pickLang(lang, { fr: `RCP ${it.nom_commercial} · ${it.section} · p.${it.page} ↗`, ar: `RCP ${it.nom_commercial} · ${it.section} · ص.${it.page} ↗` })}
                  </a>
                ))}
              </span>
            </div>
          )
        })}
      </div>
      <p style={{ ...small, marginTop: 8, lineHeight: 1.6 }}>
        {pickLang(lang, {
          fr: 'Repères relus par DwaDZ, à titre indicatif : seul le RCP complet fait foi. Consultez-le et un professionnel de santé.',
          ar: 'معالم راجعها فريق DwaDZ على سبيل الإرشاد فقط: المرجع الوحيد هو RCP الكامل. يُرجى الرجوع إليه واستشارة مختص صحي.',
        })}
      </p>
    </section>
  )
}
