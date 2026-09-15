/**
 * @file Utilidades de IPv4.
 *
 * Toda dirección se manipula como un entero sin signo de 32 bits (`UInt32`)
 * para que las operaciones bitwise (`AND`, shifts) se comporten como en las
 * notas de clase. La conversión a formato `X.X.X.X` se hace solo al
 * renderizar en la UI o al exportar.
 *
 * Reglas del dominio académico (ver `context.md`, sección 3):
 *   - NO se descuentan las 2 direcciones reservadas (red / broadcast).
 *   - El "tamaño" de una subred es siempre `2^(32 - prefijo)`.
 */

import { Ipv4Error } from './types';

/** Cuatro octetos en el rango 0..255. */
export type Octets = [number, number, number, number];

/** Valida una cadena IPv4 en dotted-decimal y devuelve sus octetos. */
export function parseIpv4(input: string): Octets {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new Ipv4Error('La dirección IP está vacía.');
  }
  const parts = trimmed.split('.');
  if (parts.length !== 4) {
    throw new Ipv4Error(
      `La IP "${trimmed}" no tiene 4 octetos separados por puntos.`,
    );
  }
  const octets: number[] = [];
  for (const part of parts) {
    // Rechaza vacíos, espacios internos, o algo que no sean solo dígitos.
    if (!/^\d+$/.test(part)) {
      throw new Ipv4Error(`El octeto "${part}" no es numérico.`);
    }
    const n = Number(part);
    if (n < 0 || n > 255) {
      throw new Ipv4Error(`El octeto "${part}" está fuera del rango 0..255.`);
    }
    octets.push(n);
  }
  return octets as Octets;
}

/** Convierte `X.X.X.X` a entero sin signo de 32 bits. */
export function ipToInt(ip: string): number {
  const [a, b, c, d] = parseIpv4(ip);
  // Multiplicar por 256 es lo mismo que desplazar 8 bits a la izquierda.
  // Usamos `>>> 0` para garantizar un UInt32 incluso si JS decide signo.
  return (((a * 256 + b) * 256 + c) * 256 + d) >>> 0;
}

/** Convierte un entero sin signo de 32 bits a formato dotted-decimal. */
export function intToIp(value: number): string {
  if (!Number.isFinite(value) || value < 0 || value > 0xffffffff) {
    throw new Ipv4Error(`Valor ${value} no es un UInt32 válido.`);
  }
  const v = value >>> 0;
  const a = (v >>> 24) & 0xff;
  const b = (v >>> 16) & 0xff;
  const c = (v >>> 8) & 0xff;
  const d = v & 0xff;
  return `${a}.${b}.${c}.${d}`;
}

/**
 * Detecta el prefijo por clase (A/B/C) según el primer octeto.
 * Útil para el módulo CIDR cuando el usuario NO proporciona prefijo.
 *
 *   Clase A: 1..126   → /8
 *   Clase B: 128..191 → /16
 *   Clase C: 192..223 → /24
 *
 * 127 (loopback) y 224+ (multicast / experimental) se rechazan.
 */
export function getDefaultPrefix(ip: string): number {
  const [first] = parseIpv4(ip);
  if (first >= 1 && first <= 126) return 8;
  if (first >= 128 && first <= 191) return 16;
  if (first >= 192 && first <= 223) return 24;
  throw new Ipv4Error(
    `La IP "${ip}" no pertenece a una clase A/B/C utilizable (primer octeto = ${first}).`,
  );
}

/**
 * Convierte un prefijo (0..32) en la máscara correspondiente como UInt32.
 * Ejemplos:  /8  → 255.0.0.0  → 0xFF000000
 *            /16 → 255.255.0.0 → 0xFFFF0000
 *            /24 → 255.255.255.0 → 0xFFFFFF00
 */
export function prefixToMaskInt(prefix: number): number {
  if (!Number.isInteger(prefix) || prefix < 0 || prefix > 32) {
    throw new Ipv4Error(`Prefijo /${prefix} fuera de rango (0..32).`);
  }
  // `0xffffffff` con `<< (32 - prefix)` produce la máscara exacta.
  // Para /0 desplazamos 32, lo que en JS es 0 (correcto).
  return prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
}

/** Máscara dotted-decimal para una IP que viene con prefijo explícito. */
export function prefixToMask(prefix: number): string {
  return intToIp(prefixToMaskInt(prefix));
}

/** Devuelve la dirección de red = IP AND máscara (todo en UInt32). */
export function ipAndMask(ipInt: number, maskInt: number): number {
  return (ipInt & maskInt) >>> 0;
}

/**
 * Devuelve la dirección de red como string `X.X.X.X` aplicando la máscara
 * del prefijo a la IP provista.
 */
export function networkAddress(ip: string, prefix: number): string {
  const ipInt = ipToInt(ip);
  const maskInt = prefixToMaskInt(prefix);
  return intToIp(ipAndMask(ipInt, maskInt));
}

/** Valida que un prefijo sea un entero entre 0 y 32. */
export function validatePrefix(prefix: number): number {
  if (!Number.isInteger(prefix) || prefix < 0 || prefix > 32) {
    throw new Ipv4Error(`Prefijo /${prefix} no es válido (debe ser 0..32).`);
  }
  return prefix;
}

/**
 * `ceil(log2(n))`, es decir, la cantidad mínima de bits necesarios
 * para representar `n` valores distintos.
 *
 *   ceilLog2(1)   = 0   → 1 valor en 0 bits.
 *   ceilLog2(2)   = 1   → 2 valores en 1 bit.
 *   ceilLog2(3)   = 2   → hasta 4 valores en 2 bits.
 *   ceilLog2(200) = 8   → 2^8 = 256 ≥ 200.
 */
export function ceilLog2(n: number): number {
  if (!Number.isInteger(n) || n < 1) {
    throw new Ipv4Error(`ceilLog2 necesita un entero ≥ 1 (recibido ${n}).`);
  }
  // log2 natural → techo.
  return Math.ceil(Math.log2(n));
}

/**
 * Devuelve la potencia de 2 inmediatamente superior o igual a `n`.
 * Implementación bitwise para evitar problemas de precisión flotante:
 *   nextPowerOfTwo(1)   = 1
 *   nextPowerOfTwo(2)   = 2
 *   nextPowerOfTwo(200) = 256
 *   nextPowerOfTwo(256) = 256
 */
export function nextPowerOfTwo(n: number): number {
  if (!Number.isInteger(n) || n < 1) {
    throw new Ipv4Error(
      `nextPowerOfTwo necesita un entero ≥ 1 (recibido ${n}).`,
    );
  }
  // Si ya es potencia de 2, devuélvelo tal cual.
  if ((n & (n - 1)) === 0) return n;
  // Caso rápido: n > 2^31 no entra en UInt32 con desplazamiento.
  // En nuestro dominio n ≤ 2^32 así que es seguro hasta 2^31.
  let p = 1;
  while (p < n) p <<= 1;
  return p;
}

/**
 * Parsea una IP con prefijo opcional: `192.168.1.0`, `192.168.1.0/24`,
 * `192.168.1.0 / 24` (con espacios). Si no hay prefijo devuelve `null`.
 */
export function parseIpWithOptionalPrefix(
  input: string,
): { ip: string; prefix: number | null } {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new Ipv4Error('La dirección IP está vacía.');
  }
  // Acepta "ip/24" o "ip / 24".
  const match = trimmed.match(/^(.+?)\s*\/\s*(\d+)$/);
  if (match) {
    const [, ip, prefStr] = match;
    const prefix = validatePrefix(Number(prefStr));
    // Valida que la parte izquierda siga siendo una IPv4 válida.
    parseIpv4(ip);
    return { ip: ip.trim(), prefix };
  }
  // Solo IP, sin prefijo.
  parseIpv4(trimmed);
  return { ip: trimmed, prefix: null };
}
