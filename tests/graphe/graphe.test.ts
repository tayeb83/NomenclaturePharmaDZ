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
