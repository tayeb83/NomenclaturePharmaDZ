/**
 * Publication d'un post thématique de la file (social_content_queue) sur la
 * Page Facebook : une photo — le visuel « Casbah » de lib/social-visual.tsx —
 * accompagnée de la légende (accroche, appel à l'action, lien, hashtags).
 *
 * Le lien reste dans la légende, cliquable ; seul l'aperçu automatique du
 * lien disparaît au profit de l'image. Si la génération ou l'envoi de l'image
 * échoue, on retombe sur le post texte + aperçu de lien d'origine pour ne pas
 * perdre la publication. SOCIAL_POST_IMAGES=0 désactive les images.
 */
import { postFacebookPhoto, postToFacebook } from '@/lib/social'
import { composeMessage, type SocialPost } from '@/lib/facebook-content'
import { renderPostImagePng } from '@/lib/social-visual'

type PublishInput = Pick<SocialPost, 'rubrique' | 'titre' | 'corps' | 'lien' | 'visuel'>

export async function publishPostToFacebook(
  post: PublishInput
): Promise<{ success: boolean; postId?: string; error?: string }> {
  const message = composeMessage(post)

  if (process.env.SOCIAL_POST_IMAGES !== '0') {
    try {
      const png = await renderPostImagePng(post)
      const res = await postFacebookPhoto(png, message)
      if (res.success) return res
      console.error('[social-publish] Photo refusée, repli sur post texte:', res.error)
    } catch (err: any) {
      console.error('[social-publish] Image impossible, repli sur post texte:', err?.message || err)
    }
  }

  return postToFacebook(message)
}
