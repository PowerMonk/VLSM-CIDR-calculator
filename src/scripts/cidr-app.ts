/**
 * @file Glue entre el formulario CIDR del DOM y la lógica de `src/lib/cidr.ts`.
 *
 * Responsabilidades:
 *   1. Leer los inputs (`ip`, `k`, `prefix?`).
 *   2. Llamar a `calculateFixedSubnets(...)`.
 *   3. Renderizar el resumen + tabla en el contenedor de resultados.
 *   4. Manejar errores (mostrarlos en un `<div>` con clase `.alert-error`).
 *   5. Conectar los botones "Descargar CSV" y "Descargar TXT".
 *   6. Proveer un botón "Cargar ejemplo" con el caso del classroom.
 */

import { calculateFixedSubnets } from '../lib/cidr';
import { CSV_MIME, downloadFile, rowsToCsv, rowsToTxt } from '../lib/download';
import type { FixedSubnet, FixedSubnetPlan } from '../lib/types';
import { Ipv4Error } from '../lib/types';

/** Caso de prueba documentado en `context.md`, sección 4.A. */
const EXAMPLE_IP = '38.120.32.110';
const EXAMPLE_K = 200;

/** IDs/selectores que la UI expone (deben coincidir con `CidrCalculator.astro`). */
const SEL = {
  form: '#cidr-form',
  ip: '#cidr-ip',
  k: '#cidr-k',
  prefix: '#cidr-prefix',
  example: '#cidr-example',
  results: '#cidr-results',
  downloadCsv: '#cidr-download-csv',
  downloadTxt: '#cidr-download-txt',
} as const;

/**
 * Estado del último cálculo exitoso. Se guarda en una closure para que
 * los handlers de descarga lo usen sin volver a recalcular.
 */
let lastPlan: FixedSubnetPlan | null = null;

/** Sanitiza un texto para evitar inyección al construir HTML manualmente. */
function escape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Renderiza el resumen (bits prestados, prefijo nuevo, etc.). */
function renderSummary(plan: FixedSubnetPlan): string {
  // Tarjetas de métricas + alerta informativa con la red base y totales.
  return `
    <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      <div class="border border-line p-3 rounded">
        <div class="text-xs uppercase text-muted">Prefijo original</div>
        <div class="text-lg font-mono"><span class="prefix">/${plan.originalPrefix}</span></div>
      </div>
      <div class="border border-line p-3 rounded">
        <div class="text-xs uppercase text-muted">Bits prestados (b)</div>
        <div class="text-lg font-mono">${plan.bitsBorrowed}</div>
      </div>
      <div class="border border-line p-3 rounded">
        <div class="text-xs uppercase text-muted">Prefijo nuevo</div>
        <div class="text-lg font-mono"><span class="prefix">/${plan.newPrefix}</span></div>
      </div>
      <div class="border border-line p-3 rounded">
        <div class="text-xs uppercase text-muted">Tamaño de bloque</div>
        <div class="text-lg font-mono">${plan.blockSize.toLocaleString()}</div>
      </div>
    </div>
    <div class="alert-info mb-4 text-sm">
      Subred base: <span class="font-mono">${escape(plan.baseNetwork)}</span>
      &nbsp;·&nbsp; Subredes generadas: <strong>${plan.totalSubnets.toLocaleString()}</strong>
      &nbsp;(se pidieron ${plan.requestedSubnets.toLocaleString()}).
    </div>
  `;
}

/** Renderiza la tabla con todas las subredes. */
function renderTable(subnets: FixedSubnet[]): string {
  const rows = subnets
    .map(
      (s) => `
      <tr>
        <td class="font-mono">${s.index}</td>
        <td class="font-mono">${escape(s.network)}</td>
        <td class="font-mono">${escape(s.broadcast)}</td>
        <td><span class="prefix">/${s.prefix}</span></td>
        <td class="font-mono text-xs">${escape(s.range)}</td>
      </tr>`,
    )
    .join('');

  return `
    <div class="overflow-x-auto">
      <table class="minimal">
        <thead>
          <tr>
            <th>#</th>
            <th>Red</th>
            <th>Broadcast</th>
            <th>Prefijo</th>
            <th>Rango</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

/** Muestra un error en el contenedor de resultados. */
function renderError(message: string): string {
  return `<div class="alert-error">${escape(message)}</div>`;
}

/**
 * Maneja el submit del formulario CIDR.
 * - Lee y normaliza entradas.
 * - Llama al algoritmo.
 * - Renderiza el resultado o el error.
 */
function handleSubmit(form: HTMLFormElement, results: HTMLElement): void {
  // FormData: API estándar del navegador para leer todos los inputs por `name`.
  const data = new FormData(form);
  const ip = String(data.get('ip') ?? '').trim();
  const kStr = String(data.get('k') ?? '').trim();
  const prefixStr = String(data.get('prefix') ?? '').trim();

  const k = Number(kStr);
  // Prefijo opcional: vacío → undefined → la librería aplica clase A/B/C.
  const prefix = prefixStr === '' ? undefined : Number(prefixStr);

  try {
    const plan = calculateFixedSubnets({ ip, k, prefix });
    // Cacheamos el plan para que los botones de descarga lo lean sin recalcular.
    lastPlan = plan;
    results.innerHTML = renderSummary(plan) + renderTable(plan.subnets);
    toggleDownloadButtons(true);
  } catch (err) {
    lastPlan = null;
    // Ipv4Error trae mensaje útil; cualquier otro error lo ocultamos tras
    // un mensaje genérico para no filtrar detalles al usuario final.
    const message =
      err instanceof Ipv4Error ? err.message : 'Error inesperado al calcular.';
    results.innerHTML = renderError(message);
    toggleDownloadButtons(false);
  }
}

/** Habilita o deshabilita los botones de descarga según haya resultados. */
function toggleDownloadButtons(enabled: boolean): void {
  document
    .querySelectorAll<HTMLButtonElement>(`${SEL.downloadCsv}, ${SEL.downloadTxt}`)
    .forEach((btn) => {
      btn.disabled = !enabled;
    });
}

/** Construye y descarga el CSV con todas las subredes del último cálculo. */
function downloadCsv(): void {
  if (!lastPlan) return;
  const headers = ['#', 'Red', 'Broadcast', 'Prefijo', 'Rango'];
  const rows = lastPlan.subnets.map((s) => [
    s.index,
    s.network,
    s.broadcast,
    `/${s.prefix}`,
    s.range,
  ]);
  downloadFile('subredes-cidr.csv', rowsToCsv(headers, rows), CSV_MIME);
}

/** Construye y descarga el TXT plano con todas las subredes. */
function downloadTxt(): void {
  if (!lastPlan) return;
  const lines: string[] = [];
  // Cabecera con metadatos del cálculo para que el TXT sea autoexplicativo.
  lines.push(`# Calculadora CIDR — ${lastPlan.baseNetwork}`);
  lines.push(
    `# Prefijo original: /${lastPlan.originalPrefix} · Bits prestados: ${lastPlan.bitsBorrowed} · Prefijo nuevo: /${lastPlan.newPrefix} · Bloque: ${lastPlan.blockSize}`,
  );
  lines.push('');
  // Cuerpo: separado por tabuladores para que abra prolijo en cualquier editor.
  lines.push(['#', 'Red', 'Broadcast', 'Prefijo', 'Rango'].join('\t'));
  for (const s of lastPlan.subnets) {
    lines.push(
      [s.index, s.network, s.broadcast, `/${s.prefix}`, s.range].join('\t'),
    );
  }
  downloadFile('subredes-cidr.txt', rowsToTxt(lines));
}

/** Punto de entrada: conecta todos los listeners del módulo CIDR. */
export function initCidr(): void {
  const form = document.querySelector<HTMLFormElement>(SEL.form);
  const results = document.querySelector<HTMLElement>(SEL.results);
  const exampleBtn = document.querySelector<HTMLButtonElement>(SEL.example);
  const csvBtn = document.querySelector<HTMLButtonElement>(SEL.downloadCsv);
  const txtBtn = document.querySelector<HTMLButtonElement>(SEL.downloadTxt);
  const ipInput = document.querySelector<HTMLInputElement>(SEL.ip);
  const kInput = document.querySelector<HTMLInputElement>(SEL.k);
  const prefixInput = document.querySelector<HTMLInputElement>(SEL.prefix);

  if (!form || !results) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    handleSubmit(form, results);
  });

  exampleBtn?.addEventListener('click', () => {
    if (ipInput) ipInput.value = EXAMPLE_IP;
    if (kInput) kInput.value = String(EXAMPLE_K);
    if (prefixInput) prefixInput.value = '';
  });

  csvBtn?.addEventListener('click', downloadCsv);
  txtBtn?.addEventListener('click', downloadTxt);
}
