/**
 * The URL prefix every runtime asset path is joined to. It defaults to Vite's BASE_URL ('./' in a
 * built bundle, '/' in dev). A page that lives one directory below the app (the Devonian entry at
 * /devonian/, the workbench) sets it once at start-up, before any module that builds URLs has
 * evaluated, so `./assets/...` resolves to the shared public folder rather than to a sibling of
 * the nested page. Read it through appBase(); never cache it at module top level.
 *
 * `import.meta.env` only exists under Vite; the headless tools bundle these modules for Node, where
 * the fallback below keeps paths resolving relative to public/ instead of throwing at import.
 */
const viteBase = (): string => (import.meta as { env?: { BASE_URL?: string } }).env?.BASE_URL ?? './';
let base: string = viteBase();
export const appBase = () => base;
export function setAppBase(b: string) { base = b; }
/** The prefix a page one level below the app root should use: absolute bases pass through, './' becomes '../'. */
export const nestedBase = () => (viteBase().startsWith('/') ? viteBase() : '../');
