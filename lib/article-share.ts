/**
 * DwaDZ — partage d'un article : message, hashtags et invitation à suivre la page Facebook.
 * Sans dépendance serveur : testable seul (node --test tests/partage/).
 *
 * Ce que chaque réseau accepte :
 *  - X et WhatsApp reprennent le texte et les hashtags tels quels ;
 *  - Facebook ignore le texte d'un lien de partage (il construit l'aperçu depuis la page) : seul UN hashtag peut
 *    être joint (paramètre `hashtag`). Le texte complet (message, lien, hashtags, page à suivre) se copie en un clic
 *    pour le coller dans la publication ;
 *  - une mention @page ne peut pas être préremplie par un lien : l'adresse de la page Facebook est ajoutée au texte,
 *    et Facebook la transforme en lien cliquable (la mention se fait en tapant « @DwaDZ » dans la publication).
 */
import type { Lang } from './i18n.ts'
import { FACEBOOK_PAGE_URL } from './medicament-share.ts'

/** Hashtags toujours présents, dans l'ordre. */
const BASE = {
  fr: ['#DwaDZ', '#Pharmacie', '#Algérie'],
  ar: ['#DwaDZ', '#صيدلة', '#الجزائر'],
} as const

/** Nombre maximal de hashtags : au-delà, un message de partage ressemble à du spam. */
const MAX_HASHTAGS = 6

/** « Interactions médicamenteuses » → #InteractionsMédicamenteuses ; en arabe, les mots sont reliés par « _ ». */
export function hashtagDe(mot: string, lang: Lang): string | null {
  // en français, une élision isolée (« d’ » de « Cas d’usage ») ne fait pas un mot : « CasUsage », pas « CasDUsage »
  const mots = mot.normalize('NFC').split(/[^\p{L}\p{N}]+/u).filter(m => m && (lang === 'ar' || m.length > 1 || /\d/.test(m)))
  if (!mots.length) return null
  const corps = lang === 'ar'
    ? mots.join('_')
    : mots.map(m => m.charAt(0).toLocaleUpperCase('fr') + m.slice(1)).join('')
  return corps.length >= 3 && corps.length <= 40 ? `#${corps}` : null
}

/** Hashtags de base puis ceux des étiquettes de l'article, sans doublon (insensible à la casse), plafonnés. */
export function hashtagsArticle(tags: readonly string[], lang: Lang, max: number = MAX_HASHTAGS): string[] {
  const out: string[] = [...BASE[lang]]
  const vus = new Set(out.map(h => h.toLocaleLowerCase()))
  for (const t of tags) {
    const h = hashtagDe(t, lang)
    if (h && !vus.has(h.toLocaleLowerCase())) { out.push(h); vus.add(h.toLocaleLowerCase()) }
    if (out.length >= max) break
  }
  return out.slice(0, max)
}

const propre = (s: string) => s.replace(/\s+/g, ' ').trim()

/** Message de partage : titre puis sous-titre. */
export function articleShareMessage(a: { title: string; subtitle: string }): string {
  const titre = propre(a.title), sous = propre(a.subtitle)
  return `📰 ${titre}${sous ? `\n${sous}` : ''}`
}

/** Invitation à suivre la page Facebook, dans la langue de l'article. */
export function ligneSuivre(lang: Lang): string {
  return lang === 'ar' ? `👍 تابعوا DwaDZ على فيسبوك: ${FACEBOOK_PAGE_URL}` : `👍 Suivez DwaDZ sur Facebook : ${FACEBOOK_PAGE_URL}`
}

/** Texte complet à coller dans une publication : message, lien, hashtags, invitation à suivre la page. */
export function texteACopier(o: { text: string; url: string; hashtags: readonly string[]; lang: Lang }): string {
  return [o.text, '', o.url, '', o.hashtags.join(' '), '', ligneSuivre(o.lang)].join('\n')
}
