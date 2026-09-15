/**
 * @file Utilidades de exportación a archivos `.csv` y `.txt`.
 *
 * Ambas funciones crean un `Blob`, lo envuelven en una URL temporal y
 * disparan la descarga mediante un enlace `<a>` sintético. Se invocan
 * desde `src/scripts/*.ts` en respuesta al clic del usuario.
 */

/** Escapa un valor para CSV: comillas, comas y saltos de línea. */
function csvEscape(value: string | number): string {
  const s = String(value);
  if (/[",\n;]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/** Convierte una matriz de filas a texto CSV con encabezado. */
export function rowsToCsv(headers: string[], rows: (string | number)[][]): string {
  const lines = [headers.map(csvEscape).join(',')];
  for (const row of rows) {
    lines.push(row.map(csvEscape).join(','));
  }
  // CRLF para máxima compatibilidad con Excel/Windows.
  return lines.join('\r\n');
}

/** Une líneas de texto con saltos de línea CRLF (Windows friendly). */
export function rowsToTxt(lines: string[]): string {
  return lines.join('\r\n');
}

/**
 * Dispara la descarga de un archivo en el navegador.
 *
 * @param filename Nombre del archivo (ej. `"subredes.csv"`).
 * @param content  Contenido textual completo.
 * @param mime     Tipo MIME. Default: `text/plain;charset=utf-8`.
 */
export function downloadFile(
  filename: string,
  content: string,
  mime: string = 'text/plain;charset=utf-8',
): void {
  // BOM para que Excel detecte UTF-8 correctamente al abrir CSV.
  const blob = new Blob(['\uFEFF', content], { type: mime });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  // El enlace debe estar en el DOM para que Firefox lo respete.
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  // Liberamos memoria.
  URL.revokeObjectURL(url);
}

/** MIME específico para CSV con BOM-friendly. */
export const CSV_MIME = 'text/csv;charset=utf-8';
