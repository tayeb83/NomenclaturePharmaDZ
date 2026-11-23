/**
 * Articles de données (ruptures, laboratoires, génériques) : paires FR/AR, liens, blocs calculés.
 *   npm run test:articles
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { ARTICLES_DONNEES, SLUG_GENERIQUES, SLUG_LABOS, SLUG_RUPTURE } from '../../lib/articles-donnees.ts'
import { ARTICLES_EQUIVALENTS } from '../../lib/articles-equivalents.ts'
import { ARTICLES_ALLERGIES } from '../../lib/articles-allergies.ts'
import { ARTICLES_FICHE } from '../../lib/articles-fiche.ts'
import { indexPubArticle } from '../../lib/articles-core.ts'
import { limiteClassement, nombre, normaliserPays, pourcentage } from '../../lib/nomenclature-stats-core.ts'
import { ATC_SUBSTANCE } from '../../lib/equivalents-core.ts'

const parSlug = new Map(ARTICLES_DONNEES.map(a => [a.slug, a]))
const texte = (a: unknown) => JSON.stringify(a)

test('trois articles, chacun avec sa version arabe de même structure', () => {
  for (const slug of [SLUG_RUPTURE, SLUG_LABOS, SLUG_GENERIQUES]) {
    const fr = parSlug.get(slug)!, ar = parSlug.get(`${slug}-ar`)!
    assert.ok(fr && ar, slug)
    assert.equal(fr.lang, 'fr'); assert.equal(ar.lang, 'ar')
    assert.deepEqual(ar.content.map(s => s.type), fr.content.map(s => s.type), slug)
    assert.equal(ar.faq?.length, fr.faq?.length, slug)
    const blocs = (a: typeof fr) => a.content.filter(s => ['equivalents', 'top-labos', 'dci-generiques'].includes(s.type)).map(s => texte([s.type, s.atc, s.mode, s.limite]))
    assert.deepEqual(blocs(ar), blocs(fr), slug)
    const rep = (a: typeof fr) => a.content.filter(s => s.type === 'qcm').flatMap(s => s.questions!.map(q => q.answer))
    assert.deepEqual(rep(ar), rep(fr), slug)
    for (const s of fr.content.filter(x => x.type === 'qcm')) for (const q of s.questions!) assert.ok(q.options.some(o => o.label === q.answer), q.question)
  }
  assert.equal(ARTICLES_DONNEES.length, 6)
})

test('les classements sont bien demandés : 20 laboratoires, génériques « plus » et « aucun »', () => {
  const labos = parSlug.get(SLUG_LABOS)!.content.filter(s => s.type === 'top-labos')
  assert.deepEqual(labos.map(s => s.limite), [20])
  const gen = parSlug.get(SLUG_GENERIQUES)!.content.filter(s => s.type === 'dci-generiques')
  assert.deepEqual(gen.map(s => [s.mode, s.limite]), [['plus', 20], ['aucun', 20]])
  for (const a of ARTICLES_DONNEES) for (const s of a.content.filter(x => x.type === 'equivalents')) assert.ok(s.atc!.every(c => ATC_SUBSTANCE.test(c)))
})

test('aucun chiffre de classement écrit en dur dans le texte des articles de données', () => {
  // Les seuls nombres admis : dosages d'exemple, « 20 », « 30 secondes », pages ANSM… pas de compte de présentations.
  for (const slug of [SLUG_LABOS, SLUG_GENERIQUES]) {
    for (const a of [parSlug.get(slug)!, parSlug.get(`${slug}-ar`)!]) {
      const t = texte(a.content.filter(s => !['top-labos', 'dci-generiques'].includes(s.type)))
      // un dosage (« 500 mg », « 500 ملغ ») n'est pas un compte
      const sansDosages = t.replace(/\d+\s*(mg|ملغ|µg|g|غ)/g, '')
      assert.ok(!/\d{3,}/.test(sansDosages), `${a.slug} contient un nombre à 3 chiffres ou plus`)
    }
  }
})

test('les liens vers des articles pointent vers des articles existants, dans la même langue', () => {
  const tous = new Map([...ARTICLES_DONNEES, ...ARTICLES_EQUIVALENTS, ...ARTICLES_ALLERGIES, ...ARTICLES_FICHE].map(a => [a.slug, a]))
  const graphes = readFileSync(new URL('../../lib/articles-graphes.ts', import.meta.url), 'utf8')
  for (const a of ARTICLES_DONNEES) {
    for (const [, slug] of texte(a.content).matchAll(/\]\(\/articles\/([a-z0-9-]+)\)/g)) {
      if (slug.startsWith('graphes-')) { assert.ok(graphes.includes(`slug: '${slug}'`), slug); continue }
      const cible = tous.get(slug)
      assert.ok(cible, `${a.slug} → ${slug}`)
      assert.equal(cible.lang, a.lang, `${a.slug} → ${slug}`)
    }
  }
  assert.match(readFileSync(new URL('../../lib/articles.ts', import.meta.url), 'utf8'), /\.\.\.ARTICLES_DONNEES,/)
})

test('la pub dans le texte tombe devant un titre de partie', () => {
  for (const a of ARTICLES_DONNEES) {
    const i = indexPubArticle(a.content)
    assert.ok(i > 1 && a.content[i].type === 'h2', a.slug)
  }
})

test('outils de classement : pourcentage, nombre, limite, pays', () => {
  assert.equal(pourcentage(1, 3), 33)
  assert.equal(pourcentage(5, 0), 0)
  assert.equal(nombre(12345, 'fr').replace(/\s/g, ' '), '12 345')
  assert.equal(limiteClassement(undefined), 20)
  assert.equal(limiteClassement(500), 50)
  assert.equal(limiteClassement(0), 1)
  assert.equal(limiteClassement(7.9), 7)
  assert.equal(normaliserPays('  algérie '), 'ALGÉRIE')
})
