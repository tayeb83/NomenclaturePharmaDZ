/** Graphes de connaissances : plafonds, disposition, droits d'accès, catalogue de démos. node --test tests/graphe/ */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { abreger, decideAcces, disposer, enCsv, filtrerCouches, plafonner, type GraphData } from '../../lib/graphe/core.ts'
import { CAS_USAGE, DEMOS, trouverDemo } from '../../lib/graphe/demos.ts'

const g: GraphData = {
  centre: 's', tronque: false, stats: [],
  nodes: [
    { id: 's', kind: 'substance', label: 'SIMVASTATINE', weight: 10 },
    { id: 'a', kind: 'atc', label: 'C10AA', weight: 1000 },
    { id: 'l1', kind: 'labo', label: 'LAB1', weight: 5 }, { id: 'l2', kind: 'labo', label: 'LAB2', weight: 3 }, { id: 'l3', kind: 'labo', label: 'LAB3', weight: 1 },
    { id: 'p1', kind: 'pays', label: 'INDE', weight: 4 },
    { id: 'i1', kind: 'interaction', label: '=CMD()', weight: 40 },
  ],
  edges: [
    { source: 's', target: 'a', kind: 'classe' },
    { source: 's', target: 'l1', kind: 'fabrique' }, { source: 's', target: 'l2', kind: 'fabrique' }, { source: 's', target: 'l3', kind: 'fabrique' },
    { source: 'l1', target: 'p1', kind: 'origine' }, { source: 'l2', target: 'p1', kind: 'origine' },
    { source: 's', target: 'i1', kind: 'interagit', niveau: 'contre_indication' },
  ],
}

test('plafonner : garde les nœuds les plus lourds de chaque type et les arêtes qui restent valides', () => {
  const r = plafonner(g, 2)
  assert.deepEqual(r.nodes.filter(n => n.kind === 'labo').map(n => n.id).sort(), ['l1', 'l2'])
  assert.equal(r.tronque, true)
  assert.ok(r.edges.every(e => r.nodes.some(n => n.id === e.source) && r.nodes.some(n => n.id === e.target)))
  assert.equal(plafonner(g, 30).tronque, false)
})

test('filtrerCouches : le centre reste, une couche masquée retire ses nœuds et ses liens', () => {
  const r = filtrerCouches(g, new Set(['atc']))
  assert.deepEqual(r.nodes.map(n => n.id).sort(), ['a', 's'])
  assert.equal(r.edges.length, 1)
})

test('disposer : centre au milieu, voisins à la même distance, pays derrière leurs laboratoires', () => {
  const places = new Map(disposer(g).map(p => [p.id, p]))
  assert.deepEqual([places.get('s')!.x, places.get('s')!.y], [0, 0])
  const d = (id: string) => Math.hypot(places.get(id)!.x, places.get(id)!.y)
  assert.ok(Math.abs(d('l1') - d('a')) < 1e-9)
  assert.ok(d('p1') > d('l1'))
  assert.equal(places.get('p1')!.profondeur, 2)
  for (const p of places.values()) assert.ok(Math.abs(p.x) <= 1 && Math.abs(p.y) <= 1)
})

test('decideAcces : public, connecté, abonné, équipe, abonnement expiré', () => {
  const j = '2026-06-15'
  const abo = (o: object) => ({ is_active: true, starts_on: null, ends_on: null, ...o })
  assert.equal(decideAcces({ email: null, equipe: false, abonnement: null, aujourdhui: j }), 'public')
  assert.equal(decideAcces({ email: 'a@b.dz', equipe: false, abonnement: null, aujourdhui: j }), 'connecte')
  assert.equal(decideAcces({ email: 'a@b.dz', equipe: true, abonnement: null, aujourdhui: j }), 'abonne')
  assert.equal(decideAcces({ email: 'a@b.dz', equipe: false, abonnement: abo({}), aujourdhui: j }), 'abonne')
  assert.equal(decideAcces({ email: 'a@b.dz', equipe: false, abonnement: abo({ ends_on: '2026-06-14' }), aujourdhui: j }), 'connecte')
  assert.equal(decideAcces({ email: 'a@b.dz', equipe: false, abonnement: abo({ starts_on: '2026-07-01' }), aujourdhui: j }), 'connecte')
  assert.equal(decideAcces({ email: 'a@b.dz', equipe: false, abonnement: abo({ is_active: false }), aujourdhui: j }), 'connecte')
})

test('enCsv : neutralise les formules et protège les séparateurs', () => {
  const csv = enCsv(g)
  assert.match(csv, /^source;source_libelle;relation;cible;cible_libelle;gravite;poids\n/)
  assert.match(csv, /'=CMD\(\)/)
  assert.match(csv, /interagit;i1;'=CMD\(\);contre_indication/)
})

test('abreger : coupe sur un espace', () => {
  assert.equal(abreger('court'), 'court')
  assert.equal(abreger('Inhibiteurs de la pompe à protons', 18), 'Inhibiteurs de…')
})

test('catalogue : identifiants uniques, au moins 2 démos par cas d\'usage, textes FR et AR remplis', () => {
  assert.equal(new Set(DEMOS.map(d => d.id)).size, DEMOS.length)
  for (const c of CAS_USAGE) {
    assert.ok(c.demos.length >= 2, c.id)
    assert.ok(c.titre.fr && c.titre.ar && c.resume.fr && c.resume.ar, c.id)
    for (const d of c.demos) {
      assert.ok(d.titre.fr && d.titre.ar && d.question.fr && d.question.ar && d.lecture.fr && d.lecture.ar, d.id)
      assert.match(d.id, /^[a-z0-9-]+$/)
    }
  }
  assert.equal(trouverDemo('interactions-simvastatine')?.cas.id, 'interactions')
  assert.equal(trouverDemo('inconnue'), null)
})

// ─── Chemins, abonnements, PDF ───────────────────────────────────────────────
import { cheminAtc, cheminDci, cheminLabo, cheminMarque, cheminRetrait, finApres, validerAbonnement } from '../../lib/graphe/core.ts'
import { construirePdfSubstance, sure } from '../../lib/graphe/pdf.ts'
import { PDFDocument } from 'pdf-lib'

test('chemins : mêmes clés que les pages du site', () => {
  assert.equal(cheminDci('AMOXICILLINE + ACIDE CLAVULANIQUE'), '/dci/amoxicilline%20%2B%20acide%20clavulanique')
  assert.equal(cheminLabo('SAIDAL - Groupe'), '/laboratoire/saidal-groupe')
  assert.equal(cheminLabo('Laboratoires Mérinal'), '/laboratoire/laboratoires-merinal')
  assert.equal(cheminAtc('c10aa'), '/classes-therapeutiques/C10AA')
  assert.equal(cheminRetrait('2020-07-17'), '/retraits/2020')
  assert.equal(cheminRetrait(null), '/retraits')
})

test('validerAbonnement : e-mail, dates et moyen de paiement (CCP, PayPal ou autre)', () => {
  const ok = validerAbonnement({ email: ' Nom@Exemple.DZ ', ends_on: '2027-06-30', moyen_paiement: 'paypal', reference_paiement: ' TX 123 ', montant: '25 EUR' })
  assert.ok(ok.ok && ok.valeur.email === 'nom@exemple.dz' && ok.valeur.reference_paiement === 'TX 123' && ok.valeur.moyen_paiement === 'paypal')
  assert.equal(validerAbonnement({ email: 'x', ends_on: '2027-06-30' }).ok, false)
  assert.equal(validerAbonnement({ email: 'a@b.dz' }).ok, false)                                            // pas de date de fin
  assert.equal(validerAbonnement({ email: 'a@b.dz', ends_on: '30/06/2027' }).ok, false)
  assert.equal(validerAbonnement({ email: 'a@b.dz', ends_on: '2027-06-30', starts_on: '2027-07-01' }).ok, false)
  assert.equal(validerAbonnement({ email: 'a@b.dz', ends_on: '2027-06-30', moyen_paiement: 'bitcoin' }).ok, false)
  assert.equal(validerAbonnement({ email: 'a@b.dz', ends_on: '2027-06-30', moyen_paiement: 'autre' }).ok, true)
  const sans = validerAbonnement({ email: 'a@b.dz', ends_on: '2027-06-30', moyen_paiement: '' })
  assert.ok(sans.ok && sans.valeur.moyen_paiement === null)
})

test('finApres : ajoute des mois sans déborder', () => {
  assert.equal(finApres('2026-01-15', 12), '2027-01-15')
  assert.equal(finApres('2026-01-31', 1), '2026-02-28')
  assert.equal(finApres('2026-11-30', 3), '2027-02-28')
})

test('sure : accents français conservés, caractères hors WinAnsi remplacés', () => {
  assert.equal(sure('Précaution d’emploi – œdème'), 'Précaution d’emploi – œdème')
  assert.equal(sure('باراسيتامول'), '???????????')
})

test('PDF : document valide, nom de la substance, plusieurs pages avec beaucoup de lignes', async () => {
  const gros: GraphData = {
    ...g, tronque: true,
    stats: [{ cle: 'a', fr: 'spécialités enregistrées', ar: '', valeur: '16' }],
    nodes: [...g.nodes, ...Array.from({ length: 90 }, (_, i) => ({ id: `x${i}`, kind: 'interaction' as const, label: `PARTENAIRE ${i} باراسيتامول`, weight: i }))],
    edges: [...g.edges, ...Array.from({ length: 90 }, (_, i) => ({ source: 's', target: `x${i}`, kind: 'interagit' as const, niveau: 'precaution_emploi' as const }))],
  }
  const bytes = await construirePdfSubstance(gros, { version: 'TEST', date: '1 janvier 2026' })
  assert.equal(Buffer.from(bytes.slice(0, 5)).toString(), '%PDF-')
  const doc = await PDFDocument.load(bytes)
  assert.ok(doc.getPageCount() >= 2)
  assert.match(doc.getTitle() ?? '', /SIMVASTATINE/)
})

// ─── Définitions et tailles ──────────────────────────────────────────────────
import { estLocal, lectureHhi, pluriel } from '../../lib/graphe/core.ts'
import { remarques } from '../../lib/graphe/remarques.ts'

test('estLocal : le statut F fait foi, le pays seulement à défaut', () => {
  assert.equal(estLocal('F', 'INDE'), true)
  assert.equal(estLocal('I', 'ALGERIE'), false)
  assert.equal(estLocal(' f ', null), true)
  assert.equal(estLocal(null, 'ALGERIE'), true)
  assert.equal(estLocal('', 'FRANCE'), false)
})

test('pluriel et lecture du HHI', () => {
  assert.equal(pluriel(1, 'enregistrement'), '1 enregistrement')
  assert.equal(pluriel(5, 'enregistrement'), '5 enregistrements')
  assert.equal(lectureHhi(756).fr, 'peu concentré')
  assert.equal(lectureHhi(1800).fr, 'modérément concentré')
  assert.equal(lectureHhi(4200).fr, 'très concentré')
})

test('disposer : la taille d\'un laboratoire suit sa part, sans être écrasée par le centre ni par la classe ATC', () => {
  const labos = [['a', 50], ['b', 25], ['c', 5]] as const
  const conc: GraphData = {
    centre: 'c0', tronque: false, stats: [],
    nodes: [{ id: 'c0', kind: 'atc', label: 'M01A', weight: 80 }, ...labos.map(([id, w]) => ({ id, kind: 'labo' as const, label: id, weight: w }))],
    edges: labos.map(([id, w]) => ({ source: 'c0', target: id, kind: 'vend' as const, weight: w })),
  }
  const r = new Map(disposer(conc).map(p => [p.id, p.r]))
  assert.ok(r.get('a')! > r.get('b')! && r.get('b')! > r.get('c')!)
  assert.ok(r.get('a')! - r.get('c')! > 0.02)   // écart visible, pas des nœuds tous identiques
  // même graphe avec une classe ATC au poids démesuré dans une vue substance : les laboratoires gardent leurs écarts
  const sub: GraphData = { ...conc, nodes: [...conc.nodes, { id: 'atc', kind: 'atc', label: 'C10AA', weight: 1000 }], edges: [...conc.edges, { source: 'c0', target: 'atc', kind: 'classe' }] }
  const r2 = new Map(disposer(sub).map(p => [p.id, p.r]))
  assert.ok(Math.abs(r2.get('a')! - r.get('a')!) < 1e-9)
})

test('remarques : signale ce que la démo promet de montrer et n\'a pas', () => {
  const vide: GraphData = { centre: 's', tronque: false, stats: [], nodes: [{ id: 's', kind: 'substance', label: 'X' }], edges: [] }
  const ret = remarques({ vue: 'substance', substance: 'X', couches: ['atc', 'labos', 'retraits'] }, vide)
  assert.ok(ret.some(m => /retrait/.test(m)) && ret.some(m => /laboratoire/.test(m)) && ret.some(m => /ATC/.test(m)))
  assert.deepEqual(remarques({ vue: 'substance', substance: 'X', couches: [] }, vide), [])
  assert.ok(remarques({ vue: 'classe', atc: 'M01A', mode: 'concentration' }, vide)[0].includes('3 laboratoires'))
})

test('disposer : voisins de voisins écartés sans traverser le dessin', () => {
  // 6 substances, chacune avec 4 marques : 24 nœuds sur l'anneau extérieur
  const nodes: GraphData['nodes'] = [{ id: 'c', kind: 'labo', label: 'LAB', weight: 100 }]
  const edges: GraphData['edges'] = []
  for (let i = 0; i < 6; i++) {
    nodes.push({ id: `s${i}`, kind: 'substance', label: `S${i}`, weight: 10 })
    edges.push({ source: 'c', target: `s${i}`, kind: 'fabrique' })
    for (let j = 0; j < 4; j++) {
      nodes.push({ id: `m${i}-${j}`, kind: 'medicament', label: `M${i}${j}`, weight: 1 })
      edges.push({ source: `s${i}`, target: `m${i}-${j}`, kind: 'marque' })
    }
  }
  const places = disposer({ centre: 'c', nodes, edges, stats: [], tronque: false })
  const ext = places.filter(p => p.profondeur === 2).map(p => ({ id: p.id, a: Math.atan2(p.y, p.x) })).sort((p, q) => p.a - q.a)
  assert.equal(ext.length, 24)
  const ecartMin = Math.min(...ext.map((p, k) => (k ? p.a - ext[k - 1].a : p.a + 2 * Math.PI - ext[ext.length - 1].a)))
  assert.ok(ecartMin >= 0.2, `écart minimal ${ecartMin.toFixed(3)} rad`)
  // une marque reste dans le voisinage angulaire de sa substance (liens courts)
  const ang = new Map(places.map(p => [p.id, Math.atan2(p.y, p.x)]))
  for (let i = 0; i < 6; i++) for (let j = 0; j < 4; j++) {
    const d = Math.abs(((ang.get(`m${i}-${j}`)! - ang.get(`s${i}`)! + 3 * Math.PI) % (2 * Math.PI)) - Math.PI)
    assert.ok(d < 1.6, `m${i}-${j} trop loin de s${i} : ${d.toFixed(2)} rad`)
  }
})

test('cheminMarque : famille de marque (premier mot), comme /marque/[slug]', () => {
  assert.equal(cheminMarque('DOLIPRANE'), '/marque/doliprane')
  assert.equal(cheminMarque('NEO-CALM Plus'), '/marque/neo-calm')
})


// ─── Offre : prix et demande de devis ────────────────────────────────────────
import { lienDemandeDevis, prixTexte } from '../../lib/graphe/offre.ts'

test('prix : « sur devis » sans prix renseigné, jamais un chiffre inventé', () => {
  assert.match(prixTexte('fr', { fr: '', ar: '' }), /^Sur devis/)
  assert.match(prixTexte('ar', { fr: '', ar: '' }), /عرض سعر/)
  assert.equal(prixTexte('fr', { fr: 'À partir de 6 000 DZD par an', ar: '' }), 'À partir de 6 000 DZD par an. Un devis précis vous est envoyé sur demande.')
})

test('demande de devis : mailto avec objet et message à compléter, dans la langue voulue', () => {
  const u = new URL(lienDemandeDevis('fr', 'devis@exemple.dz'))
  assert.equal(u.protocol, 'mailto:')
  assert.equal(u.pathname, 'devis@exemple.dz')
  assert.match(u.searchParams.get('subject')!, /devis/i)
  assert.match(u.searchParams.get('body')!, /Cas d'usage visé/)
  assert.match(new URL(lienDemandeDevis('ar', 'devis@exemple.dz')).searchParams.get('body')!, /حالة الاستخدام/)
})
