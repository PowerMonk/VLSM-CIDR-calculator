// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

/**
 * Configuracion de Astro para la calculadora CIDR/VLSM.
 *
 * - `output: 'static'`            -> sitio 100% estatico, ideal para dist/.
 * - `base: ''`                    -> los paths quedan como `/_astro/...` y
 *                                   el postbuild los reescribe a `./_astro/...`
 *                                   para que funcione bajo `file://`.
 * - Integracion de Tailwind 4     -> plugin oficial de Vite (@tailwindcss/vite).
 *
 * NOTA: todo el JS se inlinea en dist/index.html por scripts/postbuild.mjs
 * (lee cada <script src> y vuelca su contenido dentro del HTML). Esto
 * elimina los imports cruzados entre bundles y hace que el HTML funcione
 * incluso abriéndolo directamente con `file://` desde el .bat.
 */
export default defineConfig({
  output: 'static',
  base: '',
  site: 'http://localhost',
  vite: {
    plugins: [tailwindcss()],
  },
});
