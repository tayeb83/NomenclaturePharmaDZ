/**
 * Articles de l'admin : Markdown → sections, import HTML, validation.
 *   npm run test:articles
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { extraireMeta, htmlToMarkdown, markdownToSections, readingMinutes, slugify, validateArticle, rowToArticle } from '../../lib/articles-core.ts'

const MD = `Chapô de l'article avec du **gras**.
Suite du chapô.

## Première partie

Un paragraphe.

- point un
- point **deux**

### Détail

> [!warning] Attention à la posologie
> Suite

| Médicament | Dose |
|---|---|
| A | 1 g |
| B | 2 g |

![Schéma](https://exemple.dz/a.png "Légende")
![Piégé](javascript:alert(1))
`

test('markdown → sections', () => {
  const s = markdownToSections(MD)
  assert.deepEqual(s.map(x => x.type), ['intro', 'h2', 'paragraph', 'list', 'h3', 'callout', 'table', 'image'])
  assert.equal(s[0].text, "Chapô de l'article avec du **gras**. Suite du chapô.")
  assert.deepEqual(s[3].items, ['point un', 'point **deux**'])
  assert.equal(s[5].variant, 'warning')
  assert.equal(s[5].text, 'Attention à la posologie Suite')
  assert.deepEqual(s[6].headers, ['Médicament', 'Dose'])
  assert.equal(s[6].rows?.length, 2)
  assert.equal(s[7].src, 'https://exemple.dz/a.png')
  assert.equal(s[7].caption, 'Légende')
})

test('une image non https (javascript:, data:) est écartée', () => {
  assert.deepEqual(markdownToSections('![x](javascript:alert(1))'), [])
  assert.deepEqual(markdownToSections('![x](data:text/html;base64,AAAA)'), [])
  assert.equal(markdownToSections('![x](/assets/a.png)')[0].src, '/assets/a.png')
})

test('texte arabe : titres, listes, paragraphes', () => {
  const s = markdownToSections('مقدمة المقال\n\n## القسم الأول\n\n- نقطة\n- نقطة ثانية\n')
  assert.deepEqual(s.map(x => x.type), ['intro', 'h2', 'list'])
})

test('slug et temps de lecture', () => {
  assert.equal(slugify('Loi 18-11 : ce qui change !'), 'loi-18-11-ce-qui-change')
  assert.match(slugify('مقال بالعربية'), /^article-/)
  assert.equal(readingMinutes('mot '.repeat(10)), 1)
  assert.equal(readingMinutes('mot '.repeat(1000)), 5)
})

const PAGE = `<!doctype html><html lang="fr"><head><title>Site — Titre page</title>
<meta property="og:title" content="Titre &amp; OG"><meta content="Résumé OG" property="og:description">
<meta property="og:image" content="/img/c.jpg"><meta property="og:site_name" content="Le Site">
<script>alert(1)</script></head><body><nav><a href="/">Accueil</a></nav>
<article><h1>Titre H1</h1><p>Premier <strong>paragraphe</strong> avec un <a href="/lien">lien</a>.</p>
<h2>Section</h2><ul><li>un</li><li>deux &amp; trois</li></ul>
<table><tr><th>A</th><th>B</th></tr><tr><td>1</td><td>2</td></tr></table>
<img src="/x.png" alt="Alt"><blockquote>Citation</blockquote></article><footer>pied</footer></body></html>`

test('import HTML : métadonnées', () => {
  const m = extraireMeta(PAGE, 'https://site.dz/a/b')
  assert.equal(m.title, 'Titre & OG')
  assert.equal(m.description, 'Résumé OG')
  assert.equal(m.image, 'https://site.dz/img/c.jpg')
  assert.equal(m.site, 'Le Site')
  assert.equal(m.lang, 'fr')
})

test('import HTML : corps converti, scripts et navigation écartés', () => {
  const md = htmlToMarkdown(PAGE, 'https://site.dz/a/b')
  assert.ok(!md.includes('alert'))
  assert.ok(!md.includes('Accueil'))
  assert.ok(!md.includes('pied'))
  assert.ok(md.includes('## Titre H1'))
  assert.ok(md.includes('**paragraphe**'))
  assert.ok(md.includes('[lien](https://site.dz/lien)'))
  assert.ok(md.includes('- deux & trois'))
  assert.ok(md.includes('| A | B |'))
  assert.ok(md.includes('![Alt](https://site.dz/x.png)'))
  assert.ok(md.includes('> Citation'))
  const types = markdownToSections(md).map(s => s.type)
  assert.ok(types.includes('table') && types.includes('list') && types.includes('image') && types.includes('callout'))
})

test('validation : publier exige texte et résumé, adresses sûres', () => {
  const base = { title: 'Un titre', lang: 'fr', body: 'Texte', description: 'Résumé', statut: 'publie' }
  const ok = validateArticle(base)
  assert.ok(ok.ok && ok.value.slug === 'un-titre' && ok.value.audience === 'professionnel')
  assert.equal(validateArticle({ ...base, description: '' }).ok, false)
  assert.equal(validateArticle({ ...base, body: '' }).ok, false)
  assert.equal(validateArticle({ ...base, statut: 'brouillon', body: '', description: '' }).ok, true)
  assert.equal(validateArticle({ ...base, lang: 'en' }).ok, false)
  assert.equal(validateArticle({ ...base, image_url: 'http://x/y.png' }).ok, false)
  assert.equal(validateArticle({ ...base, source_url: 'javascript:alert(1)' }).ok, false)
  assert.equal(validateArticle({ ...base, slug: 'Pas Valide' }).ok, false)
  const t = validateArticle({ ...base, tags: 'a, b، a ; c', traduction_slug: 'un-titre' })
  assert.ok(t.ok && t.value.tags.join() === 'a,b,c' && t.value.traduction_slug === null)
})

test('ligne de base → Article du site', () => {
  const a = rowToArticle({
    slug: 's', lang: 'ar', audience: 'etudiant', title: 'ع', subtitle: '', description: 'd', seo_title: null, tags: ['x'],
    image_url: 'https://i/x.png', body: 'نص\n\n## قسم', traduction_slug: 's-fr', source_nom: 'موقع', source_url: 'https://s.dz',
    published_at: '2026-05-04T10:00:00Z', created_at: '2026-05-01T10:00:00Z',
  })
  assert.equal(a.date, '2026-05-04')
  assert.equal(a.imageUrl, 'https://i/x.png')
  assert.equal(a.translationSlug, 's-fr')
  assert.deepEqual(a.source, { nom: 'موقع', url: 'https://s.dz' })
  assert.equal(a.content.length, 2)
})
