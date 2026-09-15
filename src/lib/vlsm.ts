/**
 * @file Algoritmo VLSM (Variable Length Subnet Masking).
 *
 * Recibe una IP base con prefijo y una lista de requerimientos de hosts,
 * ajusta cada requerimiento a la potencia de 2 superior, ordena de mayor
 * a menor, valida que el total ajustado quepa en el bloque disponible y
 * asigna subredes contiguas.
 *
 * Reglas del dominio académico (ver `context.md`, sección 4.B):
 *   - NO se descuentan las 2 direcciones reservadas (red / broadcast).
 *   - S_i = 2^ceil(log2(R_i))      → tamaño final del bloque i.
 *   - Prefijo_i = 32 - log2(S_i).
 *   - Asignación contigua partiendo de `baseIp AND máscara_clase`.
 */

import {
  ceilLog2,
  intToIp,
  ipAndMask,
  ipToInt,
  nextPowerOfTwo,
  parseIpWithOptionalPrefix,
  prefixToMaskInt,
  validatePrefix,
} from './ip';
import type {
  VlsmAssignment,
  VlsmPlan,
  VlsmRequirement,
} from './types';
import { Ipv4Error, VlsmSpaceError } from './types';

export interface VlsmInput {
  /** IP base con prefijo, ej. `"172.18.16.0/16"`. */
  baseNetwork: string;
  /** Lista de requerimientos (etiqueta + hosts). */
  requirements: VlsmRequirementInput[];
}

export interface VlsmRequirementInput {
  /** Etiqueta visible (ej. "A", "B", "Enlace-1"). Si se omite se genera. */
  label?: string;
  /** Cantidad de hosts requeridos (entero ≥ 1). */
  hosts: number;
}

/** Etiquetas por defecto si el usuario no las provee. */
const DEFAULT_LABELS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

/**
 * Generador de etiquetas: usa `DEFAULT_LABELS` para los primeros 26 items y,
 * si hay más, continúa con `A-27`, `A-28`, etc. (no debería pasar en la UI).
 */
function generateLabel(index: number): string {
  if (index < DEFAULT_LABELS.length) return DEFAULT_LABELS[index];
  return `${DEFAULT_LABELS[index % DEFAULT_LABELS.length]}-${Math.floor(
    index / DEFAULT_LABELS.length,
  )}`;
}

/**
 * Núcleo del algoritmo VLSM. Valida, ajusta, ordena, verifica capacidad
 * y asigna subredes contiguas. Lanza `VlsmSpaceError` si el espacio no
 * alcanza y `Ipv4Error` ante entradas inválidas.
 *
 * @example
 *   // Caso de prueba del classroom:
 *   calculateVlsm({
 *     baseNetwork: '172.18.16.0/16',
 *     requirements: [
 *       { label: 'A', hosts: 100 },
 *       { label: 'B', hosts: 250 },
 *       { label: 'C', hosts: 300 },
 *       { label: 'D', hosts: 10 },
 *       { label: 'E', hosts: 50 },
 *     ],
 *   });
 *   // → C:512 /23, B:256 /24, A:128 /25, E:64 /26, D:16 /28.
 */
export function calculateVlsm(input: VlsmInput): VlsmPlan {
  if (!input.requirements || input.requirements.length === 0) {
    throw new Ipv4Error('Debe ingresar al menos un requerimiento de hosts.');
  }

  // ── Paso 1: IP base con prefijo obligatorio ────────────────────────
  const parsed = parseIpWithOptionalPrefix(input.baseNetwork);
  if (parsed.prefix === null) {
    throw new Ipv4Error(
      'Para VLSM la IP base debe incluir el prefijo (ej. "172.18.16.0/16").',
    );
  }
  const prefix = validatePrefix(parsed.prefix);
  // AND con la máscara del prefijo: garantiza que arrancamos en una
  // dirección de red válida (ej. "172.18.16.5/16" se normaliza a "172.18.0.0").
  const baseIpInt = ipAndMask(ipToInt(parsed.ip), prefixToMaskInt(prefix));
  const baseNetwork = intToIp(baseIpInt);
  const availableAddresses = 2 ** (32 - prefix);

  // ── Paso 2: ajuste a potencia de 2 ─────────────────────────────────
  const adjusted: VlsmRequirement[] = input.requirements.map((req, i) => {
    if (!Number.isInteger(req.hosts) || req.hosts < 1) {
      throw new Ipv4Error(
        `Requerimiento #${i + 1}: hosts debe ser un entero ≥ 1 (recibido ${req.hosts}).`,
      );
    }
    // S_i = 2^ceil(log2(R_i)): la potencia de 2 inmediatamente superior.
    const size = nextPowerOfTwo(req.hosts);
    return {
      // Si el usuario no puso etiqueta, generamos A, B, C, ...
      label: req.label?.trim() || generateLabel(i),
      original: req.hosts,
      adjusted: size,
      prefix: 32 - ceilLog2(size),
    };
  });

  // ── Paso 3: ordenamiento mayor → menor ─────────────────────────────
  // (Copiamos antes para no mutar la entrada del usuario.)
  const sorted = [...adjusted].sort((a, b) => b.adjusted - a.adjusted);

  // ── Paso 4: validación de capacidad ────────────────────────────────
  // Si la suma ajustada no entra en el bloque, abortamos con error tipado.
  const totalNeeded = sorted.reduce((acc, r) => acc + r.adjusted, 0);
  if (totalNeeded > availableAddresses) {
    throw new VlsmSpaceError(
      `Espacio insuficiente: se requieren ${totalNeeded.toLocaleString()} direcciones pero el bloque solo dispone de ${availableAddresses.toLocaleString()}.`,
      availableAddresses,
      totalNeeded,
    );
  }

  // ── Paso 5: asignación iterativa contigua ──────────────────────────
  // `currentIp` rastrea la próxima IP libre; avanza `adjusted - 1` cada vez.
  let currentIp = baseIpInt;
  const assignments: VlsmAssignment[] = sorted.map((req) => {
    const firstIpInt = currentIp;
    const lastIpInt = (firstIpInt + req.adjusted - 1) >>> 0;
    const assignment: VlsmAssignment = {
      label: req.label,
      original: req.original,
      adjusted: req.adjusted,
      prefix: req.prefix,
      network: intToIp(firstIpInt),
      broadcast: intToIp(lastIpInt),
      range: `${intToIp(firstIpInt)} – ${intToIp(lastIpInt)}`,
      firstIpInt,
      lastIpInt,
    };
    // Siguiente bloque empieza justo después del broadcast.
    currentIp = (lastIpInt + 1) >>> 0;
    return assignment;
  });

  return {
    baseNetwork,
    basePrefix: prefix,
    availableAddresses,
    totalNeeded,
    requirements: sorted,
    assignments,
  };
}
