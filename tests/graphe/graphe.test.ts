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
import { cheminAtc, cheminDci, cheminLabo, cheminRetrait, finApres, validerAbonnement } from '../../lib/graphe/core.ts'
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

test('validerAbonnement : e-mail, dates et moyen de paiement (CCP ou PayPal seulement)', () => {
  const ok = validerAbonnement({ email: ' Nom@Exemple.DZ ', ends_on: '2027-06-30', moyen_paiement: 'paypal', reference_paiement: ' TX 123 ', montant: '25 EUR' })
  assert.ok(ok.ok && ok.valeur.email === 'nom@exemple.dz' && ok.valeur.reference_paiement === 'TX 123' && ok.valeur.moyen_paiement === 'paypal')
  assert.equal(validerAbonnement({ email: 'x', ends_on: '2027-06-30' }).ok, false)
  assert.equal(validerAbonnement({ email: 'a@b.dz' }).ok, false)                                            // pas de date de fin
  assert.equal(validerAbonnement({ email: 'a@b.dz', ends_on: '30/06/2027' }).ok, false)
  assert.equal(validerAbonnement({ email: 'a@b.dz', ends_on: '2027-06-30', starts_on: '2027-07-01' }).ok, false)
  assert.equal(validerAbonnement({ email: 'a@b.dz', ends_on: '2027-06-30', moyen_paiement: 'baridimob' }).ok, false)
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
