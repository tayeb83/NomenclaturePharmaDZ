/**
 * DwaDZ — offre des graphes : prix affiché et demande de devis par e-mail. Aucun accès serveur.
 *
 * Le prix se règle sans toucher au code, par variables d'environnement lues au build :
 *   NEXT_PUBLIC_GRAPHE_PRIX_FR   ex. « À partir de 6 000 DZD par an et par utilisateur »
 *   NEXT_PUBLIC_GRAPHE_PRIX_AR   même texte en arabe (à défaut, le texte français est repris)
 *   NEXT_PUBLIC_GRAPHE_CONTACT_EMAIL   adresse qui reçoit les demandes (par défaut, celle du site)
 * Sans prix renseigné, l'offre dit « sur devis » : on n'affiche jamais un chiffre inventé.
 */
import type { Lang } from '../i18n.ts'

export const EMAIL_DEVIS = (process.env.NEXT_PUBLIC_GRAPHE_CONTACT_EMAIL || 'admin@nomenclature-pharma.org').trim()

const PRIX_FR = (process.env.NEXT_PUBLIC_GRAPHE_PRIX_FR || '').trim()
const PRIX_AR = (process.env.NEXT_PUBLIC_GRAPHE_PRIX_AR || '').trim() || PRIX_FR

/** Phrase de prix, dans la langue voulue. */
export function prixTexte(lang: Lang, prix: { fr: string; ar: string } = { fr: PRIX_FR, ar: PRIX_AR }): string {
  const p = lang === 'ar' ? prix.ar : prix.fr
  if (lang === 'ar') return p ? `${p}. يُرسل إليك عرض سعر دقيق عند الطلب.` : 'السعر بعرض سعر: نرسل إليك عرض سعر مفصلًا عبر البريد الإلكتروني.'
  return p ? `${p}. Un devis précis vous est envoyé sur demande.` : 'Sur devis : un devis personnalisé vous est envoyé par e-mail.'
}

const TXT = {
  fr: {
    sujet: 'Demande de devis : explorateur de graphes DwaDZ',
    corps: [
      'Bonjour,',
      '',
      'Je souhaite recevoir un devis pour l\'explorateur de graphes DwaDZ (graphes de toute substance, classe ATC ou laboratoire, et fiches PDF).',
      '',
      'Nom :',
      'Organisation :',
      'Cas d\'usage visé (interactions, importation, concentration du marché, qui commercialise quoi, retraits) :',
      'Substances, classes ATC ou laboratoires qui m\'intéressent :',
      'Nombre d\'utilisateurs et durée souhaitée :',
      '',
      'Cordialement,',
    ],
  },
  ar: {
    sujet: 'طلب عرض سعر: مستكشف الرسوم DwaDZ',
    corps: [
      'السلام عليكم،',
      '',
      'أرغب في الحصول على عرض سعر لمستكشف الرسوم DwaDZ (رسوم لأي مادة فعالة أو صنف ATC أو مخبر، وبطاقات PDF).',
      '',
      'الاسم:',
      'المؤسسة:',
      'حالة الاستخدام المقصودة (التداخلات، الاستيراد، تركز السوق، من يسوّق ماذا، السحب):',
      'المواد أو الأصناف ATC أو المخابر التي تهمني:',
      'عدد المستخدمين والمدة المرغوبة:',
      '',
      'مع الشكر،',
    ],
  },
} as const

/** Lien `mailto:` d'une demande de devis, avec un message à compléter. */
export function lienDemandeDevis(lang: Lang, email: string = EMAIL_DEVIS): string {
  const t = TXT[lang]
  return `mailto:${email}?subject=${encodeURIComponent(t.sujet)}&body=${encodeURIComponent(t.corps.join('\r\n'))}`
}
