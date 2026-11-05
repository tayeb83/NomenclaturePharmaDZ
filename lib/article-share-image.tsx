/**
 * DwaDZ — visuel de partage d'un article (1200×630, format Facebook / X / WhatsApp).
 * Même style Casbah que les visuels des fiches : marine, laiton, zellige. Si l'article porte une image
 * (assets/articles/<image>), elle figure à droite en vignette ; sinon le titre occupe toute la largeur.
 * Servi par app/partage/article/[slug] (hors /api : les robots d'aperçu y sont admis, voir middleware.ts).
 */
import { ImageResponse } from 'next/og'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { CASBAH, bandUri, ornamentRuleUri, starUri } from '@/lib/garde-ornaments'
import { imageChrome } from '@/lib/garde-social'
import type { Article } from '@/lib/articles'
import { lignes } from '@/lib/texte-lignes'

const W = 1200
const H = 630
const PAD = 56
const VIGNETTE_W = 430

const coupe = (s: string, max: number) => (s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s)

/** Vignette de l'article, lue dans assets/articles (nom de fichier sûr : jamais un chemin fourni par l'URL). */
async function charger(image: string | undefined): Promise<string | null> {
  if (!image || !/^[a-z0-9-]+\.png$/.test(image)) return null
  try {
    const png = await readFile(path.join(process.cwd(), 'assets', 'articles', image))
    return `data:image/png;base64,${png.toString('base64')}`
  } catch {
    return null // une vignette manquante ne doit pas empêcher le partage
  }
}

export async function buildArticleShareImage(a: Pick<Article, 'title' | 'subtitle' | 'lang' | 'tags' | 'image'>) {
  const chrome = await imageChrome(a.lang)
  const { ar, fonts, logo, rowDir, displayFamily, appHost } = chrome
  // satori écarte trop les mots arabes : l'espace insécable garde le texte en un seul segment
  const nb = (s: string) => (ar ? s.replace(/ /g, ' ') : s)
  const vignette = await charger(a.image)

  const titre = coupe(a.title, 118)
  const taille = vignette
    ? (titre.length > 90 ? 38 : titre.length > 60 ? 44 : 52)
    : (titre.length > 90 ? 48 : titre.length > 60 ? 56 : 64)
  const sous = coupe(a.subtitle, vignette ? 110 : 150)
  const puces = a.tags.slice(0, 3).map(t => coupe(t, 26))
  const aligne = ar ? 'flex-end' : 'flex-start'

  return new ImageResponse(
    (
      <div style={{
        width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
        backgroundColor: CASBAH.navyDeep, fontFamily: chrome.fontFamily, position: 'relative',
      }}>
        <img src={bandUri(W, 26)} width={W} height={26} alt="" />

        <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, padding: `22px ${PAD}px 0` }}>
          <div style={{ display: 'flex', flexDirection: rowDir, alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <div style={{ display: 'flex', flexDirection: rowDir, alignItems: 'center' }}>
              {logo && <img src={logo} width={46} height={46} alt="" style={ar ? { marginLeft: 12 } : { marginRight: 12 }} />}
              <div style={{ display: 'flex', fontFamily: displayFamily, fontSize: 40, fontWeight: 700, color: CASBAH.brassLight }}>DwaDZ</div>
            </div>
            <div style={{
              display: 'flex', fontSize: 22, fontWeight: 700, lineHeight: 1.3, padding: '4px 20px', borderRadius: 999,
              color: CASBAH.navy, backgroundColor: CASBAH.brassLight, border: `2px solid ${CASBAH.brass}`,
            }}>
              {nb(ar ? 'مقال' : 'Article')}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: rowDir, alignItems: 'center', justifyContent: 'space-between', flexGrow: 1, width: '100%' }}>
            <div style={{
              display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: aligne,
              width: vignette ? W - PAD * 2 - VIGNETTE_W - 40 : W - PAD * 2,
              textAlign: ar ? 'right' : 'left',
            }}>
              {ar ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                  {lignes(titre, Math.floor((vignette ? 600 : 1000) / (taille * 0.52)), 4).map((l, i) => (
                    // Amiri n'a pas l'arabe ici (latin seul) : son espace élargit les mots ; Tajawal, lui, les garde serrés
                    <div key={i} style={{ display: 'flex', fontFamily: chrome.fontFamily, fontSize: taille, lineHeight: 1.25, fontWeight: 700, color: '#fff7e0' }}>{nb(l)}</div>
                  ))}
                </div>
              ) : (
                <div style={{ display: 'flex', fontFamily: displayFamily, fontSize: taille, lineHeight: 1.12, fontWeight: 700, color: '#fff7e0' }}>
                  {titre}
                </div>
              )}
              {sous && (ar ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', marginTop: 14 }}>
                  {lignes(sous, vignette ? 44 : 75, 2).map((l, i) => (
                    <div key={i} style={{ display: 'flex', fontSize: vignette ? 26 : 30, lineHeight: 1.35, color: '#dbe5f5' }}>{nb(l)}</div>
                  ))}
                </div>
              ) : (
                <div style={{ display: 'flex', fontSize: vignette ? 26 : 30, lineHeight: 1.3, color: '#dbe5f5', marginTop: 16 }}>{sous}</div>
              ))}
              {puces.length > 0 && (
                <div style={{ display: 'flex', flexDirection: rowDir, marginTop: 22 }}>
                  {puces.map((p, i) => (
                    <div key={i} style={{
                      display: 'flex', fontSize: 22, fontWeight: 700, color: CASBAH.ink, backgroundColor: CASBAH.cream,
                      border: `2px solid ${CASBAH.brass}`, borderRadius: 12, padding: '4px 16px', lineHeight: 1.3,
                      ...(i > 0 ? (ar ? { marginRight: 12 } : { marginLeft: 12 }) : {}),
                    }}>
                      {nb(p)}
                    </div>
                  ))}
                </div>
              )}
            </div>
            {vignette && (
              <div style={{ display: 'flex', width: VIGNETTE_W, borderRadius: 16, border: `4px solid ${CASBAH.brass}`, overflow: 'hidden', backgroundColor: CASBAH.cream }}>
                <img src={vignette} width={VIGNETTE_W - 8} alt="" />
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', marginBottom: 14 }}>
            <img src={ornamentRuleUri(W - PAD * 2, CASBAH.brass, 6, 0.55)} width={W - PAD * 2} height={14} alt="" />
            <div style={{ display: 'flex', flexDirection: rowDir, alignItems: 'center', justifyContent: 'space-between', width: '100%', marginTop: 6 }}>
              <div style={{ display: 'flex', fontSize: 22, color: '#c9d6ea' }}>
                {nb(ar ? 'الأدوية في الجزائر: بيانات ودلائل' : 'Les médicaments en Algérie : données et guides')}
              </div>
              <div style={{ display: 'flex', fontFamily: displayFamily, fontSize: 30, fontWeight: 700, color: CASBAH.brassLight }}>{appHost}</div>
            </div>
          </div>
        </div>

        <img src={bandUri(W, 26)} width={W} height={26} alt="" />
      </div>
    ),
    { width: W, height: H, ...(fonts ? { fonts } : {}) }
  )
}
