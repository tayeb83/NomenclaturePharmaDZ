/**
 * Vidéos : conversion des sous-titres, validation, données structurées.
 *   npm run test:videos
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { countCues, facebookCaption, formatDuree, isHttpsUrl, slugify, srtToVtt, validateVideo, videoJsonLd, vttToLines, withUtm } from '../../lib/videos-core.ts'

const SRT = '﻿1\r\n00:00:00,000 --> 00:00:04,000\r\nلماذا يملك الدواء الواحد\r\nعدة أسماء؟\r\n\r\n2\r\n00:00:04,000 --> 00:00:08,000\r\nهذه أسماء تجارية\r\n'

test('SRT → VTT : en-tête, points décimaux, sauts de ligne, BOM', () => {
  const v = srtToVtt(SRT)
  assert.ok(v.startsWith('WEBVTT\n\n'))
  assert.ok(v.includes('00:00:00.000 --> 00:00:04.000'))
  assert.ok(!v.includes(','))
  assert.ok(!v.includes('\r'))
  assert.equal(countCues(v), 2)
  assert.deepEqual(vttToLines(v), ['لماذا يملك الدواء الواحد عدة أسماء؟', 'هذه أسماء تجارية'])
})

test('un VTT valide reste valide, un texte sans minutage donne vide', () => {
  const vtt = 'WEBVTT\n\n00:01.000 --> 00:02.000\nOui\n'
  assert.equal(countCues(srtToVtt(vtt)), 1)
  assert.equal(srtToVtt('juste du texte'), '')
  assert.equal(srtToVtt(srtToVtt(SRT)), srtToVtt(SRT)) // idempotent
})

test('slug : accents retirés, titre arabe seul → video', () => {
  assert.equal(slugify("C'est quoi l'ATC ?"), 'c-est-quoi-l-atc')
  assert.equal(slugify('Médicament générique'), 'medicament-generique')
  assert.equal(slugify('ما هو الـ ATC'), 'atc')
  assert.equal(slugify('ما هي DCI؟').length > 0, true)
  assert.equal(slugify('مرحبا'), 'video')
})

test('https obligatoire', () => {
  assert.equal(isHttpsUrl('https://x.public.blob.vercel-storage.com/a.mp4'), true)
  assert.equal(isHttpsUrl('http://x.com/a.mp4'), false)
  assert.equal(isHttpsUrl('javascript:alert(1)'), false)
  assert.equal(isHttpsUrl(null), false)
})

const base = {
  slug: 'dci', titre_ar: 'ما هي الـ DCI؟', titre_fr: "C'est quoi une DCI ?", statut: 'brouillon',
  description_ar: '', description_fr: '', tags: '#DwaDZ, DCI', sous_titres_incrustes: true,
}

test('brouillon : seuls slug et titres sont exigés', () => {
  const r = validateVideo(base)
  assert.ok(r.ok)
  if (r.ok) assert.deepEqual(r.value.tags, ['DwaDZ', 'DCI'])
})

test('publication : fichier, relecteur et sources exigés', () => {
  assert.equal(validateVideo({ ...base, statut: 'publie' }).ok, false)
  assert.equal(validateVideo({ ...base, statut: 'publie', video_url: 'https://x.com/a.mp4' }).ok, false)
  assert.equal(validateVideo({ ...base, statut: 'publie', video_url: 'https://x.com/a.mp4', reviewed_by: 'Dr X' }).ok, false)
  assert.equal(validateVideo({ ...base, statut: 'publie', video_url: 'https://x.com/a.mp4', reviewed_by: 'Dr X', sources: 'ANSM 2023' }).ok, true)
})

test('publication sans sous-titres incrustés : VTT arabe et français requis', () => {
  const pub = { ...base, statut: 'publie', video_url: 'https://x.com/a.mp4', reviewed_by: 'Dr X', sources: 'ANSM', sous_titres_incrustes: false }
  assert.equal(validateVideo(pub).ok, false)
  assert.equal(validateVideo({ ...pub, vtt_ar: SRT, vtt_fr: SRT }).ok, true)
})

test('refus : slug invalide, URL http, VTT illisible, épisode hors plage', () => {
  assert.equal(validateVideo({ ...base, slug: 'Mon Slug' }).ok, false)
  assert.equal(validateVideo({ ...base, video_url: 'http://x.com/a.mp4' }).ok, false)
  assert.equal(validateVideo({ ...base, vtt_fr: 'pas un sous-titre' }).ok, false)
  assert.equal(validateVideo({ ...base, episode: 0 }).ok, false)
  assert.equal(validateVideo({ ...base, titre_ar: '' }).ok, false)
})

test('durée, JSON-LD et légende Facebook', () => {
  assert.equal(formatDuree(42), '0:42')
  assert.equal(formatDuree(125), '2:05')
  assert.equal(formatDuree(null), '')
  const v = { slug: 'dci', titre_ar: 'ع', titre_fr: 'T', description_ar: 'وصف', description_fr: 'Desc', video_url: 'https://x.com/a.mp4', poster_url: null, duree_sec: 125, published_at: '2026-11-06T10:00:00Z' }
  const ld: any = videoJsonLd(v, 'https://s.dz', 'fr')
  assert.equal(ld['@type'], 'VideoObject')
  assert.equal(ld.duration, 'PT2M5S')
  assert.equal(ld.uploadDate, '2026-11-06')
  assert.equal(ld.thumbnailUrl, undefined)
  const cap = facebookCaption({ ...v, tags: ['ATC'] }, 'https://s.dz')
  assert.ok(cap.includes('https://s.dz/videos/dci'))
  assert.ok(cap.includes('#DwaDZ') && cap.includes('#ATC'))
  assert.ok(cap.indexOf('ع') < cap.indexOf('T'))
})

test('bouton d\u2019appel à l\u2019action : https exigé, libellés facultatifs', () => {
  const ok = validateVideo({ ...base, cta_url: 'https://www.dzair-pharma.net/alertes', cta_label_fr: 'Voir les alertes' })
  assert.ok(ok.ok)
  if (ok.ok) { assert.equal(ok.value.cta_url, 'https://www.dzair-pharma.net/alertes'); assert.equal(ok.value.cta_label_ar, null) }
  assert.equal(validateVideo({ ...base, cta_url: 'http://x.com/a' }).ok, false)
  const vide = validateVideo(base)
  assert.ok(vide.ok); if (vide.ok) assert.equal(vide.value.cta_url, null)
})

test('utm : ajoutés sans écraser un suivi existant ; lien invalide renvoyé tel quel', () => {
  assert.equal(withUtm('https://s.dz/alertes', { source: 'facebook', medium: 'video', campaign: 'alertes' }), 'https://s.dz/alertes?utm_source=facebook&utm_medium=video&utm_campaign=alertes')
  assert.equal(withUtm('https://s.dz/r?q=TADALAFIL&mode=dci', { source: 'site', medium: 'video', campaign: 'x' }), 'https://s.dz/r?q=TADALAFIL&mode=dci&utm_source=site&utm_medium=video&utm_campaign=x')
  assert.equal(withUtm('https://s.dz/a?utm_source=mail', { source: 'facebook', medium: 'video', campaign: 'x' }), 'https://s.dz/a?utm_source=mail')
  assert.equal(withUtm('pas un lien', { source: 'a', medium: 'b', campaign: 'c' }), 'pas un lien')
})

test('légende Facebook : lien du bouton cliquable avec suivi, avant le lien de la page', () => {
  const v = { slug: 'alertes', titre_ar: 'ع', titre_fr: 'T', description_ar: 'وصف', description_fr: 'Desc', video_url: 'https://x.com/a.mp4', poster_url: null, duree_sec: 60, cta_url: 'https://s.dz/alertes', cta_label_fr: 'Voir les alertes', cta_label_ar: 'اطلع على التنبيهات' }
  const cap = facebookCaption(v, 'https://s.dz')
  assert.ok(cap.includes('https://s.dz/alertes?utm_source=facebook&utm_medium=video&utm_campaign=alertes'))
  assert.ok(cap.indexOf('utm_source') < cap.indexOf('https://s.dz/videos/alertes'))
  assert.ok(cap.includes('اطلع على التنبيهات'))
  assert.ok(!facebookCaption({ ...v, cta_url: null }, 'https://s.dz').includes('utm_'))
})
