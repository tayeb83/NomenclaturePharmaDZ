/**
 * Image jointe aux publications thématiques Facebook (classes
 * thérapeutiques, fabriqué en Algérie, retraits, nouveautés & chiffres).
 *
 * Même style « Casbah » que les visuels de garde (lib/garde-social.tsx) :
 * en-tête à niche en arc outrepassé, carte crème à double filet laiton, puis
 * les chiffres clés en grand, des puces d'exemples, un encadré éventuel et un
 * bouton d'appel à l'action. Le lien reste dans la légende ; l'image est
 * uploadée directement à l'API Graph (voir lib/social-publish.ts).
 */
import { ImageResponse } from 'next/og'
import { CASBAH, iconUri } from '@/lib/garde-ornaments'
import {
  CARD_INNER_WIDTH, EMBLEM_URI, ImageFooter, ImageHeader, ListCard, Page,
  imageChrome, truncate,
} from '@/lib/garde-social'
import {
  normalizeLien, type PostVisual, type Rubrique, type SocialPost,
} from '@/lib/facebook-content'

const WIDTH = 1080
const HEIGHT = 1350

const RUBRIQUE_KICKER: Record<Rubrique, string> = {
  classe: 'Classe thérapeutique',
  algerie: 'Fabriqué en Algérie',
  retrait: 'Retrait du marché',
  nouveaute: 'Nouveautés',
}

const RUBRIQUE_ICON: Record<Rubrique, PostVisual['icon']> = {
  classe: 'pill',
  algerie: 'emblem',
  retrait: 'alert',
  nouveaute: 'sparkle',
}

/** Retire emoji et ponctuation de tête d'une ligne (satori ne rend pas les emoji). */
function stripLead(line: string): string {
  return line.replace(/^[^\p{L}\p{N}«"]+/u, '').trim()
}

/**
 * Visuel d'un post : celui enregistré avec le brouillon, ou — pour les
 * brouillons antérieurs à la migration 22, ou si `visuel` est vide — un visuel
 * déduit du titre et du texte.
 */
export function visualOf(post: Pick<SocialPost, 'rubrique' | 'titre' | 'corps' | 'visuel'>): PostVisual {
  if (post.visuel && post.visuel.headline) return post.visuel

  const paragraphs = post.corps
    .split('\n')
    .map(l => l.trim())
    .filter(l => l && !l.startsWith('#') && !l.startsWith('👉') && !l.startsWith('🔎'))
    .map(stripLead)
    .filter(Boolean)
  const [, ...rest] = paragraphs
  const kicker = RUBRIQUE_KICKER[post.rubrique]
  let headline = post.titre.replace(/^[^:]+:\s*/, '').replace(/\s*\(\d{4}-\d{2}\)$/, '')
  if (!headline || headline.toLowerCase() === kicker.toLowerCase()) headline = 'Nomenclature algérienne'
  return {
    icon: RUBRIQUE_ICON[post.rubrique],
    kicker,
    headline,
    note: rest.length ? { label: 'En bref', text: rest.join(' ') } : undefined,
    accent: post.rubrique === 'retrait' ? 'red' : 'teal',
    cta: 'Lire la suite sur le site',
  }
}

/** Taille du chiffre selon le nombre de tuiles et la longueur de la valeur. */
function valueSize(count: number, value: string): number {
  const base = count === 1 ? 200 : count === 2 ? 150 : count === 3 ? 118 : 108
  // ~0.5 em par caractère dans Amiri Bold ; une tuile fait ~ 1/colonnes de la carte.
  const columns = count === 4 ? 2 : count
  const tileWidth = (CARD_INNER_WIDTH - 40) / columns - 30
  return Math.max(48, Math.min(base, Math.floor(tileWidth / (Math.max(value.length, 2) * 0.52))))
}

function StatTile({ stat, count, color, displayFamily }: {
  stat: { value: string; label: string }
  count: number
  color: string
  displayFamily: string
}) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      flexGrow: 1, flexBasis: 0, padding: '20px 12px',
    }}>
      <div style={{
        display: 'flex', fontFamily: displayFamily, fontWeight: 700, color,
        fontSize: valueSize(count, stat.value), lineHeight: 1.05,
      }}>
        {stat.value}
      </div>
      <div style={{
        display: 'flex', textAlign: 'center', fontSize: count === 1 ? 42 : 31, lineHeight: 1.25,
        color: CASBAH.muted, marginTop: 8, maxWidth: 380,
      }}>
        {stat.label}
      </div>
    </div>
  )
}

function Divider({ vertical }: { vertical?: boolean }) {
  return vertical
    ? <div style={{ display: 'flex', width: 2, alignSelf: 'stretch', margin: '16px 0', backgroundColor: 'rgba(185, 132, 37, 0.35)' }} />
    : <div style={{ display: 'flex', height: 2, margin: '8px 30px', backgroundColor: 'rgba(185, 132, 37, 0.35)' }} />
}

/** Image 1080×1350 d'un post thématique. */
export async function buildPostImageResponse(
  post: Pick<SocialPost, 'rubrique' | 'titre' | 'corps' | 'lien' | 'visuel'>
): Promise<ImageResponse> {
  const v = visualOf(post)
  const chrome = await imageChrome('fr')
  const { fonts, displayFamily } = chrome
  const accent = v.accent === 'red' ? '#dc2626' : CASBAH.teal

  const icon = v.icon === 'emblem' ? EMBLEM_URI : iconUri(v.icon)
  const stats = (v.stats || []).slice(0, 4)
  const tags = (v.tags || []).filter(Boolean).slice(0, 4)
  const lien = normalizeLien(post.lien)
  let linkPath = ''
  if (lien) {
    try { linkPath = new URL(lien).pathname.replace(/\/$/, '') } catch { /* lien invalide : pas de chemin */ }
  }

  // Les 4 tuiles se rangent en 2 × 2, les autres sur une ligne.
  const rows = stats.length === 4 ? [stats.slice(0, 2), stats.slice(2)] : stats.length ? [stats] : []

  return new ImageResponse(
    (
      <Page chrome={chrome}>
        <ImageHeader
          chrome={chrome}
          wilayaLogo={icon}
          title={truncate(v.kicker, 22)}
          scope={v.headline}
          subtitle={v.subtitle ? [truncate(v.subtitle, 48)] : []}
          noWrap={(s) => s}
        />

        <ListCard centered padding="20px 30px">
          {rows.map((row, ri) => (
            <div key={ri} style={{ display: 'flex', flexDirection: 'column' }}>
              {ri > 0 && <Divider />}
              <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
                {row.map((stat, si) => (
                  <div key={si} style={{ display: 'flex', flexGrow: 1, flexBasis: 0 }}>
                    {si > 0 && <Divider vertical />}
                    <StatTile stat={stat} count={stats.length} color={accent} displayFamily={displayFamily} />
                  </div>
                ))}
              </div>
            </div>
          ))}

          {v.note && (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              margin: rows.length ? '40px 10px 0' : '0 10px',
              padding: '32px 34px', borderRadius: 18,
              backgroundColor: v.accent === 'red' ? '#fdecec' : CASBAH.tealLight,
              border: `2px solid ${v.accent === 'red' ? 'rgba(220, 38, 38, 0.45)' : 'rgba(30, 142, 138, 0.4)'}`,
            }}>
              <div style={{
                display: 'flex', fontSize: 28, fontWeight: 700, letterSpacing: 2, color: accent,
                textTransform: 'uppercase',
              }}>
                {v.note.label}
              </div>
              <div style={{
                display: 'flex', textAlign: 'center', fontSize: 42, lineHeight: 1.3, color: CASBAH.ink, marginTop: 12,
              }}>
                {truncate(v.note.text, 230)}
              </div>
            </div>
          )}

          {tags.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 44 }}>
              {v.tagsLabel && (
                <div style={{ display: 'flex', fontSize: 28, fontWeight: 700, letterSpacing: 2, color: CASBAH.brassDark, textTransform: 'uppercase' }}>
                  {v.tagsLabel}
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginTop: 14 }}>
                {tags.map((tag, i) => (
                  <div key={i} style={{
                    display: 'flex', fontFamily: displayFamily, fontSize: 38, fontWeight: 700, color: CASBAH.ink,
                    backgroundColor: '#ffffff', border: `2px solid ${CASBAH.brass}`, borderRadius: 999,
                    padding: '3px 26px', margin: '6px 7px', lineHeight: 1.25,
                  }}>
                    {truncate(tag, 22)}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 54 }}>
            <div style={{
              display: 'flex', fontFamily: displayFamily, fontSize: 46, fontWeight: 700, lineHeight: 1.2,
              color: CASBAH.navy, backgroundColor: CASBAH.brassLight, border: `3px solid ${CASBAH.brass}`,
              borderRadius: 999, padding: '14px 56px',
            }}>
              {`${truncate(v.cta, 30)} »`}
            </div>
          </div>
        </ListCard>

        <ImageFooter chrome={chrome} path={truncate(linkPath, 34)} />
      </Page>
    ),
    { width: WIDTH, height: HEIGHT, ...(fonts ? { fonts } : {}) }
  )
}

export async function renderPostImagePng(
  post: Pick<SocialPost, 'rubrique' | 'titre' | 'corps' | 'lien' | 'visuel'>
): Promise<Buffer> {
  const image = await buildPostImageResponse(post)
  return Buffer.from(await image.arrayBuffer())
}
