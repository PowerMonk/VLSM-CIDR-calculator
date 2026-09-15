/**
 * @file Algoritmo de subnetting fijo (CIDR).
 *
 * Recibe una IPv4 (con o sin prefijo) y la cantidad `K` de subredes deseadas,
 * calcula los bits prestados `b` tales que `2^b >= K` y devuelve todas las
 * subredes contiguas resultantes.
 *
 * Reglas del dominio académico (ver `context.md`, sección 4.A):
 *   - Si el usuario NO proporciona prefijo, se usa la máscara de clase.
 *   - Tamaño por bloque: `2^(32 - newPrefix)` sin descontar red/broadcast.
 *   - Las subredes son contiguas y parten desde la dirección de red base.
 */

import {
  ceilLog2,
  getDefaultPrefix,
  intToIp,
  ipAndMask,
  ipToInt,
  prefixToMaskInt,
} from './ip';
import type { FixedSubnet, FixedSubnetPlan } from './types';
import { Ipv4Error } from './types';

export interface CidrInput {
  /** Dirección IPv4 (con o sin prefijo). */
  ip: string;
  /** Cantidad de subredes requeridas (entero ≥ 1). */
  k: number;
  /** Prefijo explícito. Si se omite, se detecta por clase A/B/C. */
  prefix?: number;
}

/**
 * Valida las entradas del formulario CIDR y devuelve los datos normalizados:
 * IP, prefijo a usar y K pedido.
 */
function normalizeCidrInput(input: CidrInput): {
  baseIpInt: number;
  prefix: number;
  k: number;
} {
  if (!Number.isInteger(input.k) || input.k < 1) {
    throw new Ipv4Error(
      `La cantidad de subredes debe ser un entero ≥ 1 (recibido ${input.k}).`,
    );
  }
  const prefix =
    input.prefix !== undefined ? input.prefix : getDefaultPrefix(input.ip);
  const baseIpInt = ipAndMask(ipToInt(input.ip), prefixToMaskInt(prefix));
  return { baseIpInt, prefix, k: input.k };
}

/**
 * Genera el plan completo de subredes fijas para CIDR.
 *
 * @example
 *   // Caso de prueba del classroom:
 *   calculateFixedSubnets({ ip: '38.120.32.110', k: 200 });
 *   // → prefijo clase A = /8, b = 8, newPrefix = /16,
 *   //   blockSize = 65536, totalSubnets = 256.
 */
export function calculateFixedSubnets(input: CidrInput): FixedSubnetPlan {
  const { baseIpInt, prefix, k } = normalizeCidrInput(input);

  // Paso 1: bits prestados `b` tales que `2^b >= K` (mínimos para que
  // entren las subredes pedidas).
  const bitsBorrowed = ceilLog2(k);
  const newPrefix = prefix + bitsBorrowed;

  // Salvaguarda: si la suma se pasa de /32 no hay forma de dividir más.
  if (newPrefix > 32) {
    throw new Ipv4Error(
      `No es posible obtener ${k} subredes: el nuevo prefijo /${newPrefix} excede /32.`,
    );
  }

  // Paso 2: tamaño de cada bloque y total real generado.
  const blockSize = 2 ** (32 - newPrefix);
  const totalSubnets = 2 ** bitsBorrowed;

  // Paso 3: generar todas las subredes contiguas.
  // Cada una arranca en `base + i*blockSize` y termina `blockSize - 1` después.
  const subnets: FixedSubnet[] = [];
  for (let i = 0; i < totalSubnets; i++) {
    const firstIpInt = (baseIpInt + i * blockSize) >>> 0;
    const lastIpInt = (firstIpInt + blockSize - 1) >>> 0;
    subnets.push({
      index: i,
      network: intToIp(firstIpInt),
      broadcast: intToIp(lastIpInt),
      prefix: newPrefix,
      range: `${intToIp(firstIpInt)} – ${intToIp(lastIpInt)}`,
      firstIpInt,
      lastIpInt,
    });
  }

  return {
    baseNetwork: intToIp(baseIpInt),
    originalPrefix: prefix,
    requestedSubnets: k,
    bitsBorrowed,
    newPrefix,
    blockSize,
    totalSubnets,
    subnets,
  };
}
