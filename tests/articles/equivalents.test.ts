/**
 * Série « Quel est l'équivalent algérien de… ? » : paires FR/AR, liens internes, codes ATC, interactions citées.
 *   npm run test:articles
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { ARTICLES_EQUIVALENTS, MARQUES_CONNUES, SERIE_EQUIVALENTS, SLUG_PILIER } from '../../lib/articles-equivalents.ts'
import { ATC_SUBSTANCE, estFabriqueeEnAlgerie, estGenerique, lienRechercheDci, resumeEquivalents, type EquivalentLigne } from '../../lib/equivalents-core.ts'

const parSlug = new Map(ARTICLES_EQUIVALENTS.map(a => [a.slug, a]))
const texte = (a: unknown) => JSON.stringify(a)

test('chaque article a sa version arabe, avec la même structure', () => {
  const fr = ARTICLES_EQUIVALENTS.filter(a => a.lang === 'fr')
  assert.equal(fr.length, SERIE_EQUIVALENTS.length + 1)
  for (const a of fr) {
    const ar = parSlug.get(`${a.slug}-ar`)
    assert.ok(ar, `${a.slug}-ar`)
    assert.equal(ar.lang, 'ar')
    assert.equal(ar.faq?.length, a.faq?.length, a.slug)
    assert.deepEqual(ar.content.map(s => s.type), a.content.map(s => s.type), a.slug)
    const blocs = (x: typeof a) => x.content.filter(s => s.type === 'equivalents').map(s => s.atc?.join())
    assert.deepEqual(blocs(ar), blocs(a), a.slug)
    const reponses = (x: typeof a) => x.content.filter(s => s.type === 'qcm').flatMap(s => s.questions!.map(q => q.answer))
    assert.deepEqual(reponses(ar), reponses(a), a.slug)
  }
})

test('les réponses du quiz désignent une option existante', () => {
  for (const a of ARTICLES_EQUIVALENTS) {
    for (const s of a.content.filter(x => x.type === 'qcm')) {
      for (const q of s.questions!) assert.ok(q.options.some(o => o.label === q.answer), q.question)
    }
  }
})

test('chaque épisode a son bloc d\'équivalents sur son code ATC, et le pilier y renvoie', () => {
  const pilierFr = parSlug.get(SLUG_PILIER)!
  const pilierAr = parSlug.get(`${SLUG_PILIER}-ar`)!
  for (const e of SERIE_EQUIVALENTS) {
    for (const slug of [e.slug, `${e.slug}-ar`]) {
      const a = parSlug.get(slug)
      assert.ok(a, slug)
      assert.ok(a.content.some(s => s.type === 'equivalents' && s.atc?.includes(e.atc)), slug)
      assert.ok(a.title.includes(e.marque), slug)
    }
    assert.ok(texte(pilierFr.content).includes(`(/articles/${e.slug})`), e.slug)
    assert.ok(texte(pilierAr.content).includes(`(/articles/${e.slug}-ar)`), e.slug)
    assert.ok(MARQUES_CONNUES.some(m => m.atc === e.atc), e.atc)
  }
})

test('les liens internes vers des articles pointent vers des articles qui existent, dans la même langue', async () => {
  // lib/articles.ts (imports sans extension) ne se charge pas ici : on lit les fichiers cités par la série.
  const { ARTICLES_ALLERGIES } = await import('../../lib/articles-allergies.ts')
  const tous = new Map([...ARTICLES_EQUIVALENTS, ...ARTICLES_ALLERGIES].map(a => [a.slug, a]))
  for (const a of ARTICLES_EQUIVALENTS) {
    for (const [, slug] of texte(a.content).matchAll(/\]\(\/articles\/([a-z0-9-]+)\)/g)) {
      const cible = tous.get(slug)
      assert.ok(cible, `${a.slug} → ${slug}`)
      assert.equal(cible.lang, a.lang, `${a.slug} → ${slug}`)
    }
  }
  const registre = readFileSync(new URL('../../lib/articles.ts', import.meta.url), 'utf8')
  assert.match(registre, /\.\.\.ARTICLES_EQUIVALENTS,/)
})

test('les codes ATC sont des codes de substance, sans doublon dans le tableau', () => {
  for (const m of MARQUES_CONNUES) assert.match(m.atc, ATC_SUBSTANCE, m.marque)
  assert.equal(new Set(MARQUES_CONNUES.map(m => m.atc)).size, MARQUES_CONNUES.length)
  for (const a of ARTICLES_EQUIVALENTS) {
    for (const s of a.content.filter(x => x.type === 'equivalents')) {
      assert.ok(s.atc?.length && s.atc.every(c => ATC_SUBSTANCE.test(c)), a.slug)
    }
  }
})

test('les interactions citées figurent dans le Thesaurus ANSM, au niveau indiqué', () => {
  const { interactions } = JSON.parse(readFileSync(new URL('../../data/ansm/interactions_fr.json', import.meta.url), 'utf8')) as
    { interactions: { substance: string; partenaire: string; niveau: string; page: number }[] }
  const cherche = (substance: string, partenaire: string) => interactions.find(i => i.substance === substance && i.partenaire === partenaire)
  const attendu: [string, string, string, number][] = [
    ['PÉNICILLINES', 'METHOTREXATE', 'deconseillee', 192],
    ['PÉNICILLINES A', 'ALLOPURINOL', 'a_prendre_en_compte', 192],
    ['PÉNICILLINES A', 'MYCOPHENOLATE MOFETIL', 'a_prendre_en_compte', 192],
    ['HORMONES THYROÏDIENNES', 'FER', 'precaution_emploi', 113],
    ['HORMONES THYROÏDIENNES', 'CALCIUM', 'precaution_emploi', 113],
    ['HORMONES THYROÏDIENNES', 'RÉSINES CHÉLATRICES', 'precaution_emploi', 114],
    ['HORMONES THYROÏDIENNES', 'SUCRALFATE', 'precaution_emploi', 114],
    ['HORMONES THYROÏDIENNES', 'ANTISÉCRÉTOIRES INHIBITEURS DE LA POMPE À PROTONS', 'precaution_emploi', 113],
    ['HORMONES THYROÏDIENNES', 'INDUCTEURS ENZYMATIQUES PUISSANTS', 'precaution_emploi', 113],
    ['HORMONES THYROÏDIENNES', 'ESTROGÈNES NON CONTRACEPTIFS', 'precaution_emploi', 113],
    ['HORMONES THYROÏDIENNES', 'MILLEPERTUIS', 'deconseillee', 113],
    ['HORMONES THYROÏDIENNES', 'ORLISTAT', 'a_prendre_en_compte', 113],
  ]
  for (const [s, p, niveau, page] of attendu) {
    const i = cherche(s, p)
    assert.ok(i, `${s} + ${p}`)
    assert.equal(i.niveau, niveau, `${s} + ${p}`)
    assert.equal(i.page, page, `${s} + ${p}`)
  }
})

const ligne = (over: Partial<EquivalentLigne>): EquivalentLigne => ({
  id: 1, nom_marque: 'X', dci: 'D', forme: null, dosage: null, labo: null, pays: null, type_prod: null, statut: null, code_atc: 'J01CR02', ...over,
})

test('résumé des équivalents : marques, laboratoires, origine, génériques', () => {
  const r = resumeEquivalents([
    ligne({ id: 1, nom_marque: 'ALPHA', labo: 'LABO A', statut: 'F', type_prod: 'GE' }),
    ligne({ id: 2, nom_marque: 'Alpha ', labo: 'labo a', statut: 'F', type_prod: 'Gé' }),
    ligne({ id: 3, nom_marque: 'BETA', labo: 'LABO B', statut: 'I', type_prod: 'RE' }),
    ligne({ id: 4, nom_marque: 'GAMMA', labo: null, statut: null }),
  ])
  assert.deepEqual(r, { presentations: 4, marques: 3, laboratoires: 2, fabriquees: 2, importees: 2, generiques: 2 })
  assert.equal(estFabriqueeEnAlgerie({ statut: ' f ' }), true)
  assert.equal(estGenerique({ type_prod: 'RE' }), false)
  assert.equal(lienRechercheDci('AMOXICILLINE ACIDE CLAVULANIQUE'), '/recherche?q=AMOXICILLINE%20ACIDE%20CLAVULANIQUE&mode=dci')
})
