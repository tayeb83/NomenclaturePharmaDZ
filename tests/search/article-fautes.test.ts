/**
 * Les exemples de l'article « Écrivez-le comme vous voulez » doivent rester vrais : chaque saisie citée
 * doit retomber sur le nom officiel par le mécanisme que l'article décrit.
 *   npm run test:search
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { foldPhonetic, foldSkeleton } from '../../lib/search-normalize.ts'
import { EXEMPLES_ARABE, EXEMPLES_MEME_CLE, EXEMPLES_PROCHES, EXEMPLE_LIMITE } from '../../lib/articles-recherche-fautes.ts'

/** Similarité par trigrammes, comme pg_trgm : deux espaces devant le mot, un derrière. */
function similarity(a: string, b: string): number {
  const tri = (s: string) => { const t = `  ${s} `; return new Set(Array.from({ length: t.length - 2 }, (_, i) => t.slice(i, i + 3))) }
  const [A, B] = [tri(a), tri(b)]
  const communs = [...A].filter(x => B.has(x)).length
  return communs / (A.size + B.size - communs)
}
/** Seuil du repli flou (searchFuzzyByName dans lib/queries.ts). */
const SEUIL = 0.34

test('fautes et écriture phonétique : même clé que le nom officiel', () => {
  for (const [saisie, officiel] of EXEMPLES_MEME_CLE) assert.equal(foldPhonetic(saisie), foldPhonetic(officiel), saisie)
})

test('saisie arabe : même squelette consonantique que le nom officiel', () => {
  for (const [saisie, officiel] of EXEMPLES_ARABE) assert.equal(foldSkeleton(saisie), foldSkeleton(officiel), saisie)
})

test('lettre manquante : clé différente, mais au-dessus du seuil de ressemblance', () => {
  for (const [saisie, officiel] of EXEMPLES_PROCHES) {
    assert.notEqual(foldPhonetic(saisie), foldPhonetic(officiel), saisie)
    assert.ok(similarity(foldPhonetic(saisie), foldPhonetic(officiel)) >= SEUIL + 0.1, saisie)
  }
})

test('la limite citée dans l\'article en est toujours une', () => {
  const [saisie, officiel] = EXEMPLE_LIMITE
  // si ce test échoue, la recherche s'est améliorée : retirer l'exemple de la section « Ce qui ne passe pas »
  assert.notEqual(foldSkeleton(saisie), foldSkeleton(officiel))
  assert.ok(similarity(foldPhonetic(saisie), foldPhonetic(officiel)) < SEUIL)
})

test('les chiffres d\'un dosage ne sont pas lus comme de l\'arabizi', () => {
  assert.equal(foldPhonetic('b12'), 'b12')
  assert.match(foldPhonetic('500 mg'), /^5\d*mg$/)
})
