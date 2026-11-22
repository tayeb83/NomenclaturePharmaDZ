/**
 * Position de la pub dans le texte d'un article (app/articles/[slug]/page.tsx).
 *   npm run test:articles
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { indexPubArticle } from '../../lib/articles-core.ts'
import { ARTICLES_EQUIVALENTS } from '../../lib/articles-equivalents.ts'

const t = (...types: string[]) => types.map(type => ({ type })) as { type: 'intro' }[]

test('la pub se place avant le deuxième h2, après la première partie', () => {
  assert.equal(indexPubArticle(t('intro', 'h2', 'paragraph', 'list', 'h2', 'paragraph')), 4)
})

test('sans deuxième h2 : après la section qui suit l’intro si l’article est long, sinon pas de pub dans le texte', () => {
  assert.equal(indexPubArticle(t('intro', 'h2', 'paragraph', 'paragraph', 'list')), 2)
  assert.equal(indexPubArticle(t('intro', 'paragraph', 'list')), -1)
  assert.equal(indexPubArticle([]), -1)
})

test('dans les articles de la série, la pub ne coupe jamais un titre de sa première ligne', () => {
  for (const a of ARTICLES_EQUIVALENTS) {
    const i = indexPubArticle(a.content)
    assert.ok(i > 1, a.slug)
    assert.equal(a.content[i].type, 'h2', a.slug)
  }
})
