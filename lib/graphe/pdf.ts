/**
 * DwaDZ — fiche PDF d'une substance (abonnés), construite à partir de son graphe.
 * pdf-lib : JavaScript pur, sans accès disque, donc sans surprise en serverless.
 *
 * Polices PDF standard (Helvetica, encodage WinAnsi) : le français passe, l'arabe non. La fiche est donc
 * en français ; un texte hors WinAnsi est remplacé par « ? » plutôt que de faire échouer la génération.
 * Les textes de l'ANSM (risque, conduite à tenir) ne sont pas reproduits : seuls les partenaires et la
 * gravité figurent, avec le renvoi au Thesaurus.
 */
import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from 'pdf-lib'
import { abreger, disposer, type Gravite, type GraphData, type GraphNode, type NodeKind } from './core.ts'

const A4: [number, number] = [595.28, 841.89]
const M = 40 // marge

const hex = (h: string) => rgb(parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255)
const NAVY = hex('#12233f'), BLUE = hex('#173f82'), BRASS = hex('#b98425'), MUTED = hex('#5b6577'), LINE = hex('#e6dcc0'), CREAM = hex('#fbf7ec')
const KIND: Record<NodeKind, ReturnType<typeof hex>> = {
  substance: hex('#173f82'), atc: hex('#b98425'), labo: hex('#1e8e8a'), pays: hex('#6b7894'), interaction: hex('#b3261e'), classe: hex('#8e3b7a'), retrait: hex('#5a4a42'),
}
const LOCAL = hex('#2f8f4e')
const GRAVITE: Record<Gravite, { label: string; couleur: ReturnType<typeof hex>; epaisseur: number }> = {
  contre_indication: { label: 'Contre-indication', couleur: hex('#b3261e'), epaisseur: 2.4 },
  deconseillee: { label: 'Association déconseillée', couleur: hex('#d9730d'), epaisseur: 2 },
  precaution_emploi: { label: 'Précaution d\'emploi', couleur: hex('#b98425'), epaisseur: 1.5 },
  a_prendre_en_compte: { label: 'À prendre en compte', couleur: hex('#8a94a8'), epaisseur: 1 },
}
const ORDRE: Gravite[] = ['contre_indication', 'deconseillee', 'precaution_emploi', 'a_prendre_en_compte']

/** Remplace ce que WinAnsi ne sait pas encoder. */
export function sure(s: string | null | undefined): string {
  return (s ?? '')
    .replace(/[‘’]/g, '’').replace(/→/g, '->').replace(/↔/g, '<->')
    .replace(/\s+/g, ' ')
    .replace(/[^ -~ -ÿŒœ’“”–—…€]/g, '?')
}

export type MetaPdf = { version: string | null; date: string }

export async function construirePdfSubstance(g: GraphData, meta: MetaPdf): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  const reg = await doc.embedFont(StandardFonts.Helvetica)
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)
  doc.setTitle(`Fiche substance ${g.nodes.find(n => n.id === g.centre)?.label ?? ''}`)
  doc.setAuthor('DwaDZ')
  doc.setCreator('DwaDZ')

  const centre = g.nodes.find(n => n.id === g.centre)!
  const noeud = new Map(g.nodes.map(n => [n.id, n]))
  const pages: PDFPage[] = []
  let page!: PDFPage
  let y = 0

  const largeur = (t: string, f: PDFFont, s: number) => f.widthOfTextAtSize(sure(t), s)
  const tronque = (t: string, f: PDFFont, s: number, max: number) => {
    let r = sure(t)
    if (f.widthOfTextAtSize(r, s) <= max) return r
    while (r.length > 1 && f.widthOfTextAtSize(`${r}…`.replace('…', '...'), s) > max) r = r.slice(0, -1)
    return `${r.trimEnd()}...`
  }
  const texte = (t: string, x: number, yy: number, o: { f?: PDFFont; s?: number; c?: ReturnType<typeof hex>; max?: number } = {}) => {
    const f = o.f ?? reg, s = o.s ?? 10
    page.drawText(o.max ? tronque(t, f, s, o.max) : sure(t), { x, y: yy, font: f, size: s, color: o.c ?? NAVY })
  }
  const nouvellePage = () => {
    page = doc.addPage(A4)
    pages.push(page)
    y = A4[1] - M
  }
  const place = (h: number) => { if (y - h < M + 28) nouvellePage() }
  const titre = (t: string) => {
    place(80) // un titre ne reste jamais seul en bas de page
    y -= 20
    texte(t, M, y, { f: bold, s: 12.5, c: BLUE })
    y -= 5
    page.drawLine({ start: { x: M, y }, end: { x: A4[0] - M, y }, thickness: 1, color: BRASS })
    y -= 14
  }

  // ── Page 1 : en-tête ──
  nouvellePage()
  page.drawRectangle({ x: 0, y: A4[1] - 74, width: A4[0], height: 74, color: NAVY })
  texte('DwaDZ', M, A4[1] - 30, { f: bold, s: 13, c: hex('#e3b65b') })
  texte('Fiche substance', M, A4[1] - 46, { s: 9.5, c: hex('#cfd8ea') })
  texte(centre.label, M, A4[1] - 64, { f: bold, s: 20, c: rgb(1, 1, 1), max: A4[0] - 2 * M })
  y = A4[1] - 74 - 18
  texte(`Nomenclature nationale des produits pharmaceutiques (MIPH)${meta.version ? ` - version ${meta.version}` : ''} - établie le ${meta.date}`, M, y, { s: 8.5, c: MUTED })
  y -= 16

  // ── Chiffres clés ──
  const stats = g.stats
  const lw = (A4[0] - 2 * M - (stats.length - 1) * 8) / Math.max(stats.length, 1)
  stats.forEach((s, i) => {
    const x = M + i * (lw + 8)
    page.drawRectangle({ x, y: y - 40, width: lw, height: 40, color: CREAM, borderColor: LINE, borderWidth: 0.8 })
    texte(s.valeur, x + 8, y - 16, { f: bold, s: 15, c: BLUE, max: lw - 12 })
    // libellé sur deux lignes au plus, coupé entre deux mots
    const mots = sure(s.fr).split(' ')
    let l1 = ''
    while (mots.length && reg.widthOfTextAtSize(`${l1} ${mots[0]}`.trim(), 6.8) <= lw - 12) l1 = `${l1} ${mots.shift()}`.trim()
    texte(l1, x + 8, y - 27, { s: 6.8, c: MUTED })
    if (mots.length) texte(mots.join(' '), x + 8, y - 35, { s: 6.8, c: MUTED, max: lw - 12 })
  })
  y -= 54

  // ── Graphe ──
  titre('Graphe de la substance')
  const gh = 380
  place(gh + 30)
  page.drawRectangle({ x: M, y: y - gh, width: A4[0] - 2 * M, height: gh, color: hex('#fffdf6'), borderColor: LINE, borderWidth: 0.8 })
  const cx = A4[0] / 2, cy = y - gh / 2
  const rx = (A4[0] - 2 * M) / 2 - 58, ry = gh / 2 - 30
  const places = disposer(g)
  const pos = new Map(places.map(p => [p.id, { x: cx + p.x * rx, y: cy + p.y * ry, r: p.profondeur === 0 ? 16 : 5 + Math.min(1, (p.r - 0.045) / 0.05) * 4.5, p: p.profondeur }]))
  for (const e of g.edges) {
    const a = pos.get(e.source), b = pos.get(e.target)
    if (!a || !b) continue
    const gr = e.niveau ? GRAVITE[e.niveau] : null
    page.drawLine({ start: { x: a.x, y: a.y }, end: { x: b.x, y: b.y }, thickness: gr?.epaisseur ?? 0.7, color: gr?.couleur ?? hex('#c9d1de'), dashArray: e.niveau === 'precaution_emploi' ? [4, 3] : e.niveau === 'a_prendre_en_compte' ? [1.5, 3] : undefined })
  }
  for (const n of g.nodes) {
    const p = pos.get(n.id)
    if (!p) continue
    page.drawCircle({ x: p.x, y: p.y, size: p.r, color: n.local && (n.kind === 'pays' || n.kind === 'substance') ? LOCAL : KIND[n.kind], borderColor: rgb(1, 1, 1), borderWidth: 1 })
    const lab = n.kind === 'atc' && p.p === 1 ? n.label.split(' · ')[0] : abreger(n.label, p.p === 0 ? 24 : 18)
    const s = p.p === 0 ? 9.5 : 7
    const f = p.p === 0 ? bold : reg
    if (p.p === 0) { texte(lab, p.x - largeur(lab, f, s) / 2, p.y - p.r - s - 1, { f, s }); continue }
    // étiquette rejetée vers l'extérieur, le long du rayon : les voisins proches ne se recouvrent plus
    const dx = p.x - cx, dy = p.y - cy, d = Math.hypot(dx, dy) || 1
    const ux = dx / d, uy = dy / d, w = largeur(lab, f, s)
    const tx = ux > 0.35 ? p.x + ux * (p.r + 3) : ux < -0.35 ? p.x + ux * (p.r + 3) - w : p.x - w / 2
    texte(lab, tx, p.y + uy * (p.r + 6) - 2.5, { f, s })
  }
  y -= gh + 8
  // légende
  const types = [...new Set(g.nodes.map(n => n.kind))]
  const libKind: Record<NodeKind, string> = { substance: 'Substance', atc: 'Classe ATC', labo: 'Laboratoire', pays: 'Pays d\'origine', interaction: 'Interaction', classe: 'Classe en interaction', retrait: 'Retrait' }
  let lx = M
  for (const k of types) {
    page.drawCircle({ x: lx + 3, y: y + 2.5, size: 3, color: KIND[k] })
    texte(libKind[k], lx + 9, y, { s: 7.5, c: MUTED })
    lx += 16 + largeur(libKind[k], reg, 7.5) + 8
  }
  y -= 12
  if (g.tronque) { texte('Les nœuds les plus importants de chaque type sont représentés ; la liste complète figure ci-dessous.', M, y, { s: 7.5, c: MUTED }); y -= 10 }

  // ── Tableaux ──
  const ligne = (cols: { t: string; x: number; w: number; f?: PDFFont; c?: ReturnType<typeof hex> }[], h = 14) => {
    place(h)
    y -= 10
    for (const c of cols) texte(c.t, c.x, y, { f: c.f, s: 8.5, c: c.c, max: c.w })
    y -= h - 10
    page.drawLine({ start: { x: M, y: y + 2 }, end: { x: A4[0] - M, y: y + 2 }, thickness: 0.4, color: LINE })
  }
  const W = A4[0] - 2 * M

  const atc = g.nodes.find(n => n.kind === 'atc')
  if (atc) { titre('Classe ATC'); texte(atc.label, M, y, { s: 10 }); y -= 6 }

  const labos = g.nodes.filter(n => n.kind === 'labo').sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0) || a.label.localeCompare(b.label))
  if (labos.length) {
    titre(`Laboratoires (${labos.length})`)
    ligne([{ t: 'Laboratoire', x: M, w: W * 0.5, f: bold, c: MUTED }, { t: 'Spécialités', x: M + W * 0.52, w: W * 0.12, f: bold, c: MUTED }, { t: 'Pays d\'origine', x: M + W * 0.68, w: W * 0.32, f: bold, c: MUTED }])
    for (const l of labos) {
      const pays = g.edges.filter(e => e.kind === 'origine' && e.source === l.id).map(e => noeud.get(e.target)?.label).filter(Boolean).join(', ')
      ligne([{ t: l.label, x: M, w: W * 0.5 }, { t: String(l.weight ?? ''), x: M + W * 0.52, w: W * 0.12 }, { t: pays || '-', x: M + W * 0.68, w: W * 0.32 }])
    }
  }

  const inter = g.edges.filter(e => e.kind === 'interagit' && e.source === g.centre)
  if (inter.length) {
    titre(`Interactions médicamenteuses (${inter.length})`)
    texte('Thesaurus des interactions médicamenteuses de l\'ANSM. Le risque et la conduite à tenir figurent dans le thesaurus et sur la fiche DwaDZ.', M, y + 2, { s: 7.5, c: MUTED, max: W })
    y -= 8
    for (const niv of ORDRE) {
      const liste = inter.filter(e => e.niveau === niv).map(e => noeud.get(e.target)).filter((n): n is GraphNode => !!n).sort((a, b) => a.label.localeCompare(b.label))
      if (!liste.length) continue
      place(26)
      y -= 14
      page.drawRectangle({ x: M, y: y - 3, width: 6, height: 10, color: GRAVITE[niv].couleur })
      texte(`${GRAVITE[niv].label} (${liste.length})`, M + 12, y, { f: bold, s: 9.5, c: GRAVITE[niv].couleur })
      y -= 4
      // trois colonnes de partenaires
      const col = W / 3
      for (let i = 0; i < liste.length; i += 3) {
        place(13)
        y -= 11
        liste.slice(i, i + 3).forEach((n, j) => texte(`${n.kind === 'classe' ? '[classe] ' : ''}${n.label}`, M + 12 + j * col, y, { s: 8.5, max: col - 14 }))
      }
    }
  }

  const retraits = g.nodes.filter(n => n.kind === 'retrait')
  if (retraits.length) {
    titre(`Retraits (${retraits.length})`)
    ligne([{ t: 'Marque retirée', x: M, w: W * 0.34, f: bold, c: MUTED }, { t: 'Date et motif', x: M + W * 0.36, w: W * 0.64, f: bold, c: MUTED }])
    for (const r of retraits) ligne([{ t: r.label, x: M, w: W * 0.34 }, { t: r.detail || '-', x: M + W * 0.36, w: W * 0.64 }])
  }

  // ── Pied de page sur chaque page ──
  pages.forEach((p, i) => {
    p.drawLine({ start: { x: M, y: M + 14 }, end: { x: A4[0] - M, y: M + 14 }, thickness: 0.5, color: LINE })
    p.drawText(sure('DwaDZ - www.dzair-pharma.net - Données MIPH et ANSM, à titre informatif : consultez toujours les sources officielles.'), { x: M, y: M + 3, font: reg, size: 7, color: MUTED })
    const n = `${i + 1} / ${pages.length}`
    p.drawText(n, { x: A4[0] - M - reg.widthOfTextAtSize(n, 7), y: M + 3, font: reg, size: 7, color: MUTED })
  })

  return doc.save()
}
