/**
 * @file Simula la resolucion file:// que hara el navegador cuando se
 * abre dist/index.html con el .bat.
 *
 * Para cada path relativo/atributo en el HTML, comprueba que el archivo
 * resuelto existe en disco. Si todo OK, sabemos que Tailwind y los
 * scripts cargaran correctamente al abrir con file://.
 */

import { readFile, stat } from 'node:fs/promises';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const HTML_PATH = resolve(__dirname, '..', 'dist', 'index.html');

const html = await readFile(HTML_PATH, 'utf8');
const baseDir = dirname(HTML_PATH);
const pattern = /(?:href|src)="(\.{1,2}\/[^"]+)"/g;
const matches = [...html.matchAll(pattern)];

let failed = 0;
for (const m of matches) {
  const url = m[1];
  const absolute = resolve(baseDir, url);
  try {
    const s = await stat(absolute);
    console.log(`\u2714 ${url}  \u2192  ${absolute.replace(baseDir, 'dist') + ''}  (${s.size} bytes)`);
  } catch {
    console.log(`\u2718 ${url}  \u2192  ${absolute.replace(baseDir, 'dist') + ''}  (NO EXISTE)`);
    failed++;
  }
}

console.log('\u2500'.repeat(50));
if (failed === 0) {
  console.log('\u2713 Todos los assets relativos resuelven correctamente bajo file://.');
  process.exit(0);
} else {
  console.log(`\u2718 ${failed} asset(s) no encontrado(s).`);
  process.exit(1);
}
