/**
 * @file Postbuild: reescribe los paths absolutos de Astro a paths
 * relativos para que `dist/index.html` funcione al abrirse directamente
 * con `file://` desde el `.bat`.
 *
 * Astro, por defecto, emite atributos como `href="/_astro/xxx.css"` o
 * `src="/_astro/xxx.js"`. En `file://`, el navegador resuelve el `/`
 * inicial como la raíz del sistema de archivos y los assets no cargan.
 *
 * Este script los transforma a `./_astro/...`, que sí se resuelve
 * relativo al directorio donde está el HTML.
 *
 * Se invoca automáticamente con `npm run build` (definido en package.json).
 */

import { readFile, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const HTML_PATH = join(ROOT, 'dist', 'index.html');

async function main() {
  const html = await readFile(HTML_PATH, 'utf8');

  // 1) Atributos que ya quedaron como `/./_astro/...` (caso base:'./').
  // 2) Atributos absolutos `/_astro/...` (caso base:'' o sin base).
  const fixed = html
    .replace(/(href|src)="\/\.\/_astro\//g, '$1="./_astro/')
    .replace(/(href|src)="\/_astro\//g, '$1="./_astro/');

  if (fixed === html) {
    console.log('[postbuild] No se necesitaron cambios en dist/index.html.');
    return;
  }

  await writeFile(HTML_PATH, fixed, 'utf8');
  console.log('[postbuild] Paths reescritos a "./_astro/..." en dist/index.html.');
}

main().catch((err) => {
  console.error('[postbuild] Error:', err);
  process.exit(1);
});
