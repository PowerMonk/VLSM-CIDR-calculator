// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

/**
 * Configuracion de Astro para la calculadora CIDR/VLSM.
 *
 * - `output: 'static'`            -> sitio 100% estatico, ideal para dist/.
 * - `base: './'`                  -> emite paths relativos (./_astro/...) en el
 *                                   HTML final, imprescindible para que
 *                                   `dist/index.html` funcione al abrirse
 *                                   directamente con `file://` desde el .bat.
 * - Integracion de Tailwind 4     -> plugin oficial de Vite (@tailwindcss/vite),
 *                                   sustituye al antiguo @astrojs/tailwind.
 */
export default defineConfig({
  output: 'static',
  base: '',
  site: 'http://localhost',
  vite: {
    plugins: [tailwindcss()],
  },
});
