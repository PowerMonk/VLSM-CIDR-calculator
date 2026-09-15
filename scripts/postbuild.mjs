/**
 * @file Postbuild: prepara dist/index.html para abrirse con file:// sin
 * que fallen los modulos ECMAScript.
 *
 * Astro+Vite emiten varios <script type="module" src="./_astro/X.js">.
 * Esos scripts comparten un chunk (p.ej. download.xxx.js) y hacen
 * `import {...} from "./download.xxx.js";`. Cuando se abre el HTML con
 * file://, el navegador BLOQUEA esos imports por CORS, y la app no
 * ejecuta nada (los handlers de click nunca se registran).
 *
 * Solucion: leer el contenido de cada <script src> y VOLCARLO DENTRO
 * del HTML como <script type="module"> inline. Asi no hay requests
 * externos ni imports entre modulos, y todo corre en el mismo origen.
 * Los .js originales se eliminan para no dejarlos colgando.
 *
 * Ademas: reescribe paths absolutos -> relativos (./_astro/...) para
 * que el CSS siga cargando bajo file://.
 */

import { readFile, writeFile, unlink } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST = join(__dirname, '..', 'dist');
const HTML_PATH = join(DIST, 'index.html');

const SCRIPT_TAG_RE =
  /<script\b([^>]*?)\bsrc="(\.\.?\/[^"]+\.js)"([^>]*)>\s*<\/script>/g;

async function main() {
  // 1) Reescribir paths absolutos a relativos primero.
  let html = await readFile(HTML_PATH, 'utf8');
  const beforePaths = html;
  html = html
    .replace(/(href|src)="\/\.\/_astro\//g, '$1="./_astro/')
    .replace(/(href|src)="\/_astro\//g, '$1="./_astro/');
  if (html !== beforePaths) {
    console.log('[postbuild] Paths reescritos a "./_astro/...".');
  }

  // 2) Recolectar todos los <script src="./_astro/*.js"> que apunta a .js.
  const matches = [...html.matchAll(SCRIPT_TAG_RE)];
  if (matches.length === 0) {
    console.log('[postbuild] No hay <script src> para inlinear (ya estaban inline o no hay).');
  } else {
    // Leemos cada archivo de forma sincronica (uno a uno) y los vamos
    // reemplazando en orden con su contenido.
    const payloads = [];
    for (const m of matches) {
      const src = m[2];
      const content = await readFile(join(DIST, src), 'utf8');
      payloads.push({ src, content });
    }

    // Sustitucion ordenada: cada match se reemplaza con su contenido.
    let i = 0;
    html = html.replace(SCRIPT_TAG_RE, () => {
      const { content } = payloads[i++];
      return `<script type="module">\n${content}\n</script>`;
    });
    console.log(`[postbuild] Inlineados ${payloads.length} script(s) en index.html.`);

    // 3) Borrar los .js originales (ya quedaron inlineados).
    for (const { src } of payloads) {
      try {
        await unlink(join(DIST, src));
      } catch {
        /* ignorar */
      }
    }
  }

  // 4) Marcador de versión visible al hacer "View Source" en el navegador.
  //    Si el usuario lo ve, esta cargando el HTML nuevo y NO es cache del navegador.
  const buildTag = `<!-- build:vlsm-user-order-${Date.now()} -->\n`;
  if (!html.startsWith('<!-- build:')) {
    html = buildTag + html;
    console.log('[postbuild] Marcador de version anadido al HTML.');
  }

  // 5) Guardar.
  await writeFile(HTML_PATH, html, 'utf8');
  console.log('[postbuild] Listo. dist/index.html corre bajo file:// sin imports externos.');
}

main().catch((err) => {
  console.error('[postbuild] Error:', err);
  process.exit(1);
});
