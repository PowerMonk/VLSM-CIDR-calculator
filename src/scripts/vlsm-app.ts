/**
 * @file Glue entre el formulario VLSM del DOM y la lógica de `src/lib/vlsm.ts`.
 *
 * Responsabilidades:
 *   1. Mantener la lista dinámica de requerimientos (añadir / quitar filas).
 *   2. Leer la IP base con prefijo y la lista de requerimientos.
 *   3. Llamar a `calculateVlsm(...)`.
 *   4. Renderizar tres secciones:
 *        a) Espacio disponible vs requerido (alerta verde OK o roja error).
 *        b) Tabla de ajuste (original → ajustado → prefijo).
 *        c) Tabla de asignación final (red, broadcast, rango, prefijo).
 *   5. Conectar los botones "Descargar CSV" y "Descargar TXT".
 *   6. Proveer un botón "Cargar ejemplo" con el caso del classroom.
 */

import { CSV_MIME, downloadFile, rowsToCsv, rowsToTxt } from '../lib/download';
import { calculateVlsm } from '../lib/vlsm';
import type { VlsmAssignment, VlsmPlan } from '../lib/types';
import { Ipv4Error, VlsmSpaceError } from '../lib/types';

/** Caso de prueba del classroom, sección 4.B de `context.md`. */
const EXAMPLE_BASE = '172.18.16.0/16';
const EXAMPLE_REQUIREMENTS: { label: string; hosts: number }[] = [
  { label: 'A', hosts: 100 },
  { label: 'B', hosts: 250 },
  { label: 'C', hosts: 300 },
  { label: 'D', hosts: 10 },
  { label: 'E', hosts: 50 },
];

/** Selectores (deben coincidir con `VlsmCalculator.astro`). */
const SEL = {
  form: '#vlsm-form',
  baseNetwork: '#vlsm-base',
  reqList: '#vlsm-requirements',
  addBtn: '#vlsm-add-row',
  example: '#vlsm-example',
  results: '#vlsm-results',
  downloadCsv: '#vlsm-download-csv',
  downloadTxt: '#vlsm-download-txt',
} as const;

/** Estado del último cálculo exitoso. */
let lastPlan: VlsmPlan | null = null;

function escape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Construye una fila dinámica para la lista de requerimientos.
 * Se usa al inicializar (1 fila vacía) y al pulsar "Añadir fila".
 */
function buildRequirementRow(label = '', hosts = ''): HTMLElement {
  const row = document.createElement('div');
  row.className =
    'grid grid-cols-[1fr_2fr_auto] gap-2 items-center vlsm-row';
  row.dataset.row = '';
  // Los inputs llevan name="label"/name="hosts" para que el submit los
  // recoja con FormData (ver handleSubmit).
  row.innerHTML = `
    <input
      type="text"
      name="label"
      value="${escape(label)}"
      placeholder="Etiqueta"
      class="font-mono"
      maxlength="12"
    />
    <input
      type="number"
      name="hosts"
      value="${escape(hosts)}"
      placeholder="Hosts requeridos"
      min="1"
      step="1"
      class="font-mono"
    />
    <button
      type="button"
      class="btn btn-danger vlsm-remove"
      aria-label="Eliminar requerimiento"
    >×</button>
  `;
  return row;
}

/**
 * Conecta los listeners de los botones "×" en cada fila.
 * Hay que llamarla cada vez que se re-pintan filas (init o "Añadir").
 */
function wireRowButtons(list: HTMLElement): void {
  list.querySelectorAll<HTMLButtonElement>('.vlsm-remove').forEach((btn) => {
    btn.addEventListener('click', () => {
      const row = btn.closest<HTMLElement>('[data-row]');
      // Salva-guardas: nunca dejamos la lista sin filas (mínimo 1)
      // para que el form siempre sea enviable.
      if (list.children.length > 1 && row) row.remove();
    });
  });
}

/** Render del bloque "Espacio disponible vs requerido". */
function renderValidation(plan: VlsmPlan | null, error: string | null): string {
  if (error) {
    // Modo error: solo mostramos la alerta roja con el mensaje.
    return `<div class="alert-error mb-4">${escape(error)}</div>`;
  }
  if (!plan) return '';
  // Verde si cabe, rojo si no (esto último no debería pasar: lo cortamos
  // antes con VlsmSpaceError, pero lo dejamos por defensa).
  const ok = plan.totalNeeded <= plan.availableAddresses;
  const cls = ok ? 'alert-ok' : 'alert-error';
  return `
    <div class="${cls} mb-4 text-sm">
      Espacio disponible:
      <strong>${plan.availableAddresses.toLocaleString()}</strong>
      &nbsp;·&nbsp; Espacio requerido:
      <strong>${plan.totalNeeded.toLocaleString()}</strong>
      &nbsp;·&nbsp; ${ok ? '✓ Cabe perfectamente.' : '✗ No cabe.'}
    </div>
  `;
}

/** Tabla con el ajuste a potencia de 2 (paso 2 del algoritmo). */
function renderRequirements(plan: VlsmPlan): string {
  const rows = plan.requirements
    .map(
      (r) => `
      <tr>
        <td class="font-mono">${escape(r.label)}</td>
        <td class="font-mono text-right">${r.original.toLocaleString()}</td>
        <td class="font-mono text-right">${r.adjusted.toLocaleString()}</td>
        <td><span class="prefix">/${r.prefix}</span></td>
      </tr>`,
    )
    .join('');
  return `
    <h3 class="text-base font-semibold mt-6 mb-2">Paso 2 — Ajuste a potencia de 2 (en orden alfabético)</h3>
    <div class="overflow-x-auto mb-2">
      <table class="minimal">
        <thead>
          <tr>
            <th>Etiqueta</th>
            <th>Requerido</th>
            <th>Ajustado</th>
            <th>Prefijo</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

/** Tabla con las asignaciones finales (paso 4 del algoritmo). */
function renderAssignments(plan: VlsmPlan): string {
  const rows = plan.assignments
    .map(
      (a: VlsmAssignment) => `
      <tr>
        <td class="font-mono">${escape(a.label)}</td>
        <td class="font-mono text-right">${a.original.toLocaleString()}</td>
        <td class="font-mono text-right">${a.adjusted.toLocaleString()}</td>
        <td class="font-mono">${escape(a.network)}</td>
        <td class="font-mono">${escape(a.broadcast)}</td>
        <td><span class="prefix">/${a.prefix}</span></td>
        <td class="font-mono text-xs">${escape(a.range)}</td>
      </tr>`,
    )
    .join('');
  return `
    <h3 class="text-base font-semibold mt-6 mb-2">Paso 4 — Asignación de subredes</h3>
    <div class="alert-info mb-2 text-sm">
      Subred base: <span class="font-mono">${escape(plan.baseNetwork)}</span>
      <span class="prefix">&nbsp;/${plan.basePrefix}</span>
    </div>
    <div class="overflow-x-auto">
      <table class="minimal">
        <thead>
          <tr>
            <th>Etiqueta</th>
            <th>Requerido</th>
            <th>Ajustado</th>
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

/** Recolecta filas del formulario y llama al algoritmo. */
function handleSubmit(form: HTMLFormElement, results: HTMLElement): void {
  // IP base: la sacamos por `name`, no iterando filas (es el único campo fuera).
  const data = new FormData(form);
  const baseNetwork = String(data.get('baseNetwork') ?? '').trim();

  // Requerimientos: recorremos cada `[data-row]` y leemos sus dos inputs.
  // Las filas vacías (sin hosts) se ignoran para no contaminar el cálculo.
  const requirements: { label?: string; hosts: number }[] = [];
  form.querySelectorAll<HTMLElement>('[data-row]').forEach((row) => {
    const labelInput = row.querySelector<HTMLInputElement>('input[name="label"]');
    const hostsInput = row.querySelector<HTMLInputElement>('input[name="hosts"]');
    const hosts = Number(hostsInput?.value ?? '');
    if (!hostsInput?.value.trim()) return; // fila vacía → ignorar
    requirements.push({
      label: labelInput?.value.trim() || undefined,
      hosts,
    });
  });

  try {
    const plan = calculateVlsm({ baseNetwork, requirements });
    lastPlan = plan;
    // Render por secciones: validación → tabla ajuste → tabla asignación.
    results.innerHTML =
      renderValidation(plan, null) +
      renderRequirements(plan) +
      renderAssignments(plan);
    toggleDownloadButtons(true);
  } catch (err) {
    lastPlan = null;
    // Distinguimos errores para mostrar el mensaje correcto en la UI.
    let msg: string;
    if (err instanceof VlsmSpaceError) {
      msg = err.message;
    } else if (err instanceof Ipv4Error) {
      msg = err.message;
    } else {
      msg = 'Error inesperado al calcular.';
    }
    results.innerHTML = renderValidation(null, msg);
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

/** Exporta el resultado completo a CSV. */
function downloadCsv(): void {
  if (!lastPlan) return;
  const headers = [
    'Etiqueta',
    'Requerido',
    'Ajustado',
    'Red',
    'Broadcast',
    'Prefijo',
    'Rango',
  ];
  const rows = lastPlan.assignments.map((a) => [
    a.label,
    a.original,
    a.adjusted,
    a.network,
    a.broadcast,
    `/${a.prefix}`,
    a.range,
  ]);
  downloadFile('subredes-vlsm.csv', rowsToCsv(headers, rows), CSV_MIME);
}

/** Exporta el resultado completo a TXT. */
function downloadTxt(): void {
  if (!lastPlan) return;
  const lines: string[] = [];
  lines.push(`# Calculadora VLSM — ${lastPlan.baseNetwork} /${lastPlan.basePrefix}`);
  lines.push(
    `# Disponible: ${lastPlan.availableAddresses} · Requerido: ${lastPlan.totalNeeded}`,
  );
  lines.push('');
  lines.push(['Etiqueta', 'Req.', 'Ajustado', 'Red', 'Broadcast', 'Prefijo', 'Rango'].join('\t'));
  for (const a of lastPlan.assignments) {
    lines.push(
      [a.label, a.original, a.adjusted, a.network, a.broadcast, `/${a.prefix}`, a.range].join('\t'),
    );
  }
  downloadFile('subredes-vlsm.txt', rowsToTxt(lines));
}

/** Punto de entrada: conecta listeners del módulo VLSM. */
export function initVlsm(): void {
  const form = document.querySelector<HTMLFormElement>(SEL.form);
  const results = document.querySelector<HTMLElement>(SEL.results);
  const list = document.querySelector<HTMLElement>(SEL.reqList);
  const addBtn = document.querySelector<HTMLButtonElement>(SEL.addBtn);
  const exampleBtn = document.querySelector<HTMLButtonElement>(SEL.example);
  const csvBtn = document.querySelector<HTMLButtonElement>(SEL.downloadCsv);
  const txtBtn = document.querySelector<HTMLButtonElement>(SEL.downloadTxt);
  const baseInput = document.querySelector<HTMLInputElement>(SEL.baseNetwork);

  if (!form || !results || !list) return;

  // Si el contenedor está vacío, agrega una fila inicial.
  if (list.children.length === 0) {
    list.appendChild(buildRequirementRow());
  }
  wireRowButtons(list);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    handleSubmit(form, results);
  });

  addBtn?.addEventListener('click', () => {
    const row = buildRequirementRow();
    list.appendChild(row);
    wireRowButtons(list);
  });

  exampleBtn?.addEventListener('click', () => {
    if (baseInput) baseInput.value = EXAMPLE_BASE;
    // Limpiamos filas y reponemos con el caso del classroom.
    list.innerHTML = '';
    for (const r of EXAMPLE_REQUIREMENTS) {
      list.appendChild(buildRequirementRow(r.label, String(r.hosts)));
    }
    wireRowButtons(list);
  });

  csvBtn?.addEventListener('click', downloadCsv);
  txtBtn?.addEventListener('click', downloadTxt);
}
