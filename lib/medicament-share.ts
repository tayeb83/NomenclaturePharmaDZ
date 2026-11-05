/**
 * DwaDZ — partage d'une fiche médicament (Facebook, X, WhatsApp).
 * Sans dépendance serveur : testable seul.
 *
 * Le message est écrit pour être compris sans ouvrir le lien : nom, substance, forme, dosage,
 * laboratoire, et ce que la fiche apporte. Les liens de partage sont les adresses officielles
 * des réseaux, sans script tiers ni pixel de suivi.
 */

import type { Lang } from './i18n.ts'

export type ShareMed = {
  nom_marque: string
  dci?: string | null
  forme?: string | null
  dosage?: string | null
  labo?: string | null
}

/** X coupe à 280 caractères ; une adresse y compte pour 23. On garde de la marge. */
const X_TEXT_MAX = 230

const propre = (s: string | null | undefined) => (s ?? '').replace(/\s+/g, ' ').trim()

function couper(texte: string, max: number): string {
  if (texte.length <= max) return texte
  const coupe = texte.slice(0, max - 1)
  const espace = coupe.lastIndexOf(' ')
  return `${(espace > max * 0.6 ? coupe.slice(0, espace) : coupe).trimEnd()}…`
}

/** Texte prêt à poster, dans la langue d'affichage. */
export function shareMessage(med: ShareMed, lang: Lang): string {
  const nom = propre(med.nom_marque)
  const dci = propre(med.dci)
  const presentation = [propre(med.forme), propre(med.dosage)].filter(Boolean).join(' ')
  const labo = propre(med.labo)
  const sujet = dci && dci.toLowerCase() !== nom.toLowerCase() ? `${nom} (${dci})` : nom
  const detail = [presentation, labo].filter(Boolean).join(' · ')
  if (lang === 'ar') {
    return `💊 ${sujet}${detail ? ` — ${detail}` : ''}\nبطاقة الدواء: المادة الفعالة، الأدوية الجنيسة، الثمن والتداخلات الدوائية على DwaDZ`
  }
  return `💊 ${sujet}${detail ? ` — ${detail}` : ''}\nLa fiche : substance active, génériques, prix et interactions médicamenteuses sur DwaDZ`
}

/** Page Facebook officielle de DwaDZ : destination du bouton « Suivre la page ». */
export const FACEBOOK_PAGE_URL = 'https://www.facebook.com/profile.php?id=61584995326062'

export type ShareLinks ={ facebook: string; x: string; whatsapp: string }

/**
 * Adresses de partage. `url` est l'adresse absolue de la page, `text` le message.
 * `hashtags` (avec ou sans « # ») : joints à X et WhatsApp ; Facebook n'en accepte qu'un (le premier).
 * `suivi` : ligne d'invitation à suivre la page, ajoutée au message WhatsApp.
 */
export function shareLinks(url: string, text: string, hashtags: readonly string[] = [], suivi?: string): ShareLinks {
  const u = encodeURIComponent(url)
  const tags = hashtags.map(h => h.replace(/^#/, '')).filter(Boolean)
  const hash = hashtags.map(h => (h.startsWith('#') ? h : `#${h}`)).filter(h => h.length > 1)
  return {
    // Facebook ignore le texte (il construit l'aperçu depuis la page) : seule l'adresse compte, plus un hashtag.
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${u}${tags[0] ? `&hashtag=${encodeURIComponent(`#${tags[0]}`)}` : ''}`,
    x: `https://twitter.com/intent/tweet?text=${encodeURIComponent(couper(text, X_TEXT_MAX))}&url=${u}${tags.length ? `&hashtags=${encodeURIComponent(tags.slice(0, 4).join(','))}` : ''}`,
    whatsapp: `https://wa.me/?text=${encodeURIComponent([text, url, hash.join(' '), suivi].filter(Boolean).join('\n'))}`,
  }
}
