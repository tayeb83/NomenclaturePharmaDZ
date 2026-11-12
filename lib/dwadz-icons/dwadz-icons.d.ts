export type InfoIcone = { norm: string; base: string; mods: string[]; routes: string[]; routeSource: 'edqm' | 'libelle'; flags: string[] }
export type OptsIcone = { codes?: string[]; lang?: 'fr' | 'ar'; size?: number; sprite?: string; maxRoutes?: number; maxMods?: number }
export function normalize(raw: string | null | undefined): string
export function classify(forme: string | null | undefined, codesEdqm?: string[]): InfoIcone
export function render(info: InfoIcone, opts?: OptsIcone): string
export function html(forme: string | null | undefined, opts?: OptsIcone): string
export function altText(info: InfoIcone, lang?: 'fr' | 'ar'): string
declare const DwaIcons: { rules: unknown; normalize: typeof normalize; classify: typeof classify; render: typeof render; html: typeof html; altText: typeof altText }
export default DwaIcons
