/** Partage d'un article : hashtags, message, texte à copier, liens. node --test tests/partage/ */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { articleShareMessage, hashtagDe, hashtagsArticle, ligneSuivre, texteACopier } from '../../lib/article-share.ts'
import { FACEBOOK_PAGE_URL, shareLinks } from '../../lib/medicament-share.ts'

test('hashtagDe : CamelCase en français, mots reliés par _ en arabe, rejet du trop court', () => {
  assert.equal(hashtagDe('Interactions médicamenteuses', 'fr'), '#InteractionsMédicamenteuses')
  assert.equal(hashtagDe('Thesaurus ANSM', 'fr'), '#ThesaurusANSM')
  assert.equal(hashtagDe('Cas d’usage', 'fr'), '#CasUsage')
  assert.equal(hashtagDe('مقارنة الأدوية', 'ar'), '#مقارنة_الأدوية')
  assert.equal(hashtagDe('IA', 'fr'), null)
  assert.equal(hashtagDe('— !', 'fr'), null)
})

test('hashtagsArticle : base d\'abord, étiquettes ensuite, sans doublon, plafonné', () => {
  const h = hashtagsArticle(['Graphes', 'Nomenclature', 'dwadz', 'Cas d’usage', 'Interactions médicamenteuses', 'Marché pharmaceutique', 'Outils'], 'fr')
  assert.deepEqual(h.slice(0, 3), ['#DwaDZ', '#Pharmacie', '#Algérie'])
  assert.equal(h.length, 6)
  assert.equal(new Set(h.map(x => x.toLowerCase())).size, h.length)
  assert.deepEqual(hashtagsArticle([], 'ar'), ['#DwaDZ', '#صيدلة', '#الجزائر'])
})

test('message et texte à copier : titre, lien, hashtags et page Facebook à suivre', () => {
  const m = articleShareMessage({ title: ' Graphes  du médicament ', subtitle: 'Substances et laboratoires' })
  assert.equal(m, '📰 Graphes du médicament\nSubstances et laboratoires')
  const t = texteACopier({ text: m, url: 'https://x.dz/articles/a', hashtags: ['#DwaDZ', '#Pharmacie'], lang: 'fr' })
  assert.ok(t.includes('https://x.dz/articles/a') && t.includes('#DwaDZ #Pharmacie') && t.includes(FACEBOOK_PAGE_URL))
  assert.match(ligneSuivre('ar'), /تابعوا/)
})

test('liens : un hashtag pour Facebook, la liste pour X, tout pour WhatsApp ; sans hashtag, rien ne change', () => {
  const url = 'https://x.dz/articles/a'
  const l = shareLinks(url, 'Titre', ['#DwaDZ', '#Pharmacie'], ligneSuivre('fr'))
  assert.ok(l.facebook.startsWith('https://www.facebook.com/sharer/sharer.php?u=https%3A%2F%2Fx.dz'))
  assert.equal(new URL(l.facebook).searchParams.get('hashtag'), '#DwaDZ')
  assert.equal(new URL(l.x).searchParams.get('hashtags'), 'DwaDZ,Pharmacie')
  const wa = new URL(l.whatsapp).searchParams.get('text')!
  assert.ok(wa.includes(url) && wa.includes('#DwaDZ #Pharmacie') && wa.includes(FACEBOOK_PAGE_URL))
  const sans = shareLinks(url, 'Titre')
  assert.equal(new URL(sans.facebook).searchParams.has('hashtag'), false)
  assert.equal(new URL(sans.x).searchParams.has('hashtags'), false)
  assert.equal(new URL(sans.whatsapp).searchParams.get('text'), `Titre\n${url}`)
})
