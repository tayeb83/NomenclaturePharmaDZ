/**
 * Demandes de médicaments : lecture du JSON collé, garde-fous, post du jour.
 *   npm run test:demandes
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  aggKey, buildPostDuJour, findWilaya, hasPersonalData, isControlled, parseDemandes, selectPourPost,
  type DemandeRow,
} from '../../lib/demandes-core.ts'

const NOW = new Date('2026-11-03T06:00:00Z')

const row = (id: number, over: Partial<DemandeRow> = {}): DemandeRow => ({
  id, medicament: `Médicament ${id} 10 mg comprimé`, dci: null, dci_match: null, marques: [],
  wilaya: null, commune: null, urgence: 'normale', nb_demandes: 1, statut: 'active', note_privee: null,
  derniere_demande_le: '2026-10-20T08:00:00Z', expire_le: '2026-11-20T08:00:00Z', trouvee_le: null,
  created_at: '2026-10-20T08:00:00Z', ...over,
})

test('JSON : tableau, bloc ```json et texte autour', () => {
  const arr = '[{"medicament":"Metformine 850 mg comprimé","wilaya":"Tizi Ouzou"}]'
  assert.equal(parseDemandes(arr).items.length, 1)
  assert.equal(parseDemandes('```json\n' + arr + '\n```').items.length, 1)
  assert.equal(parseDemandes('Voici le résultat :\n' + arr + '\nBonne journée').items.length, 1)
  assert.equal(parseDemandes('{"medicament":"Metformine 850 mg"}').items.length, 1)
})

test('JSON illisible ou vide : erreur claire, rien d\'importé', () => {
  assert.match(parseDemandes('bonjour').erreur ?? '', /illisible/)
  assert.ok(parseDemandes('   ').erreur)
  assert.ok(parseDemandes('[]').erreur)
})

test('le lieu est facultatif', () => {
  const r = parseDemandes('[{"medicament":"Insuline glargine 100 UI/mL stylo","urgence":"haute"}]')
  assert.equal(r.erreur, null)
  assert.equal(r.items[0].wilaya, null)
  assert.equal(r.items[0].commune, null)
  assert.equal(r.items[0].urgence, 'haute')
  assert.equal(r.items[0].demandes, 1)
  assert.equal(r.items[0].jours, 14)
})

test('wilaya reconnue par nom, code ou arabe ; inconnue conservée avec remarque', () => {
  assert.equal(findWilaya('alger')?.name_fr, 'Alger')
  assert.equal(findWilaya('16')?.name_fr, 'Alger')
  assert.equal(findWilaya('وهران')?.name_fr, 'Oran')
  assert.equal(findWilaya('Atlantide'), null)
  const r = parseDemandes('[{"medicament":"Salbutamol 100 µg","wilaya":"Atlantide"}]')
  assert.equal(r.items[0].wilaya, 'Atlantide')
  assert.equal(r.avertissements.length, 1)
})

test('produits contrôlés écartés, sans bloquer les autres', () => {
  const r = parseDemandes(JSON.stringify([
    { medicament: 'Clonazépam 2 mg comprimé', marques: ['Rivotril'] },
    { medicament: 'Metformine 850 mg comprimé' },
    { medicament: 'Tramal 50 mg gélule' },
  ]))
  assert.equal(r.items.length, 1)
  assert.equal(r.rejetees.length, 2)
  assert.match(r.rejetees[0].raison, /contrôlé/)
  assert.ok(isControlled('RIVOTRIL'))
  assert.ok(isControlled('Prégabaline 75 mg'))
  assert.equal(isControlled('Morphinique'), false) // mot entier seulement
  assert.equal(isControlled('Metformine'), false)
})

test('données personnelles : email et téléphone refusés, dosages acceptés', () => {
  assert.ok(hasPersonalData('contact: ali@mail.com'))
  assert.ok(hasPersonalData('0550 12 34 56'))
  assert.ok(hasPersonalData('+213 661 23 63 11'))
  assert.equal(hasPersonalData('Héparine 5 000 UI/0,2 mL'), false)
  assert.equal(hasPersonalData('Amoxicilline 1 g sachet'), false)
  const r = parseDemandes('[{"medicament":"Insuline stylo","commune":"Blida 0661236311"}]')
  assert.equal(r.items.length, 0)
  assert.match(r.rejetees[0].raison, /personnelle/)
})

test('entrée sans "medicament" rejetée ; bornes de demandes et jours', () => {
  const r = parseDemandes('[{"wilaya":"Alger"},{"medicament":"X 1 mg","demandes":5000,"jours":999}]')
  assert.equal(r.rejetees.length, 1)
  assert.equal(r.items[0].demandes, 999)
  assert.equal(r.items[0].jours, 60)
})

test('clé d\'agrégation : insensible à la casse, aux accents et au lieu absent', () => {
  assert.equal(aggKey('Lévothyroxine 100 µg', 'Alger'), aggKey('LEVOTHYROXINE  100 µg', 'alger'))
  assert.notEqual(aggKey('Lévothyroxine 100 µg', 'Alger'), aggKey('Lévothyroxine 100 µg', null))
})

test('post du jour : null sans demande active', () => {
  assert.equal(buildPostDuJour([], NOW), null)
})

test('post du jour : urgentes en tête, FR + AR, hashtags en dernier paragraphe, lien /demandes', () => {
  const p = buildPostDuJour([
    row(1, { medicament: 'Metformine 850 mg comprimé', wilaya: 'Tizi Ouzou', nb_demandes: 4 }),
    row(2, { medicament: 'Lévothyroxine 100 µg comprimé', marques: ['Levothyrox'], wilaya: 'Alger', urgence: 'haute', nb_demandes: 12 }),
  ], NOW)!
  assert.equal(p.rubrique, 'demande')
  assert.equal(p.dedupKey, 'demande:2026-11-03')
  assert.equal(p.lien, '/demandes')
  assert.ok(p.corps.indexOf('Lévothyroxine') < p.corps.indexOf('Metformine'))
  assert.match(p.corps, /12 demandes/)
  assert.match(p.corps, /الجزائر/)
  assert.match(p.corps, /ne vend rien/)
  assert.match(p.corps, /\n\n#Médicaments\S+ #DwaDZ [^\n]+$/)
  assert.equal(p.visuel.accent, 'red')
  assert.equal(p.visuel.stats?.[0].value, '16')
})

test('post du jour : la commune et la note privée ne sortent jamais', () => {
  const p = buildPostDuJour([row(1, { commune: 'Bir El Djir', note_privee: 'secret interne', wilaya: 'Oran' })], NOW)!
  assert.ok(!p.corps.includes('Bir El Djir'))
  assert.ok(!p.corps.includes('secret interne'))
  assert.ok(p.corps.includes('Oran'))
})

test('post sans lieu : aucune mention de wilaya, pas de tuile wilayas', () => {
  const p = buildPostDuJour([row(1, { medicament: 'Insuline glargine 100 UI/mL stylo' })], NOW)!
  assert.ok(p.corps.includes('• Insuline glargine 100 UI/mL stylo\n'))
  assert.equal(p.visuel.stats?.length, 2)
})

test('sélection : plus que le maximum → les urgentes restent, le reste tourne selon le jour', () => {
  const rows = [
    row(1, { urgence: 'haute' }),
    ...Array.from({ length: 12 }, (_, i) => row(i + 2, { nb_demandes: 12 - i })),
  ]
  const a = selectPourPost(rows, new Date('2026-11-03T06:00:00Z'))
  const b = selectPourPost(rows, new Date('2026-11-04T06:00:00Z'))
  assert.equal(a.length, 8)
  assert.ok(a.some(r => r.id === 1) && b.some(r => r.id === 1))
  assert.notDeepEqual(a.map(r => r.id), b.map(r => r.id))
})

test('demandes nouvelles (moins de 36 h) passent devant', () => {
  const rows = [
    ...Array.from({ length: 10 }, (_, i) => row(i + 1, { nb_demandes: 20 })),
    row(99, { nb_demandes: 1, created_at: '2026-11-03T01:00:00Z' }),
  ]
  assert.ok(selectPourPost(rows, NOW).some(r => r.id === 99))
})
