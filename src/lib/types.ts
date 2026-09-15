/**
 * @file Tipos compartidos por la capa `lib/` y `scripts/`.
 *
 * Mantener todos los tipos en un único archivo evita imports circulares
 * y deja la "forma" de los datos visible de un vistazo para la rúbrica.
 */

/**
 * Resultado de aplicar subnetting fijo (CIDR).
 *
 * `subnets` está en el mismo orden en que se generan: de mayor a menor
 * dirección de red, sin solapamientos.
 */
export interface FixedSubnetPlan {
  /** IP de red base, normalizada tras aplicar la máscara (UInt32 → string). */
  baseNetwork: string;
  /** Prefijo original detectado por clase (8/16/24) o provisto. */
  originalPrefix: number;
  /** Cantidad de subredes pedidas por el usuario. */
  requestedSubnets: number;
  /** Bits prestados `b` tales que `2^b >= requestedSubnets`. */
  bitsBorrowed: number;
  /** Prefijo nuevo: `originalPrefix + bitsBorrowed`. */
  newPrefix: number;
  /** Tamaño de cada subred: `2^(32 - newPrefix)`. */
  blockSize: number;
  /** Cantidad real de subredes generadas (= `2^bitsBorrowed`). */
  totalSubnets: number;
  /** Lista ordenada de subredes. */
  subnets: FixedSubnet[];
}

/** Una subred individual generada por CIDR. */
export interface FixedSubnet {
  /** Índice 0-based. */
  index: number;
  /** Dirección de red de esta subred (UInt32 → string). */
  network: string;
  /** Dirección de broadcast de esta subred. */
  broadcast: string;
  /** Prefijo aplicado a esta subred. */
  prefix: number;
  /** Rango completo "primeraIP - últimaIP". */
  range: string;
  /** IP primera (UInt32) y última (UInt32) sin descontar red/broadcast. */
  firstIpInt: number;
  lastIpInt: number;
}

/**
 * Resultado de un cálculo VLSM exitoso.
 *
 * Contiene tres "vistas":
 *   - `requirements` : ajuste por potencia de 2, en orden alfabético (A, B, C…).
 *   - `assignments`  : la tabla final con redes asignadas (paso 4).
 *   - `summary`      : datos agregados del espacio total.
 */
export interface VlsmPlan {
  baseNetwork: string;
  basePrefix: number;
  availableAddresses: number;
  totalNeeded: number;
  /** Lista (en orden alfabético por etiqueta) con el ajuste a potencia de 2. */
  requirements: VlsmRequirement[];
  /** Asignaciones finales (en el mismo orden que `requirements`). */
  assignments: VlsmAssignment[];
}

/** Un requerimiento de hosts ajustado a la potencia de 2 superior. */
export interface VlsmRequirement {
  /** Etiqueta visible en la UI (ej. "A", "B", "Enlace-1"). */
  label: string;
  /** Cantidad de hosts solicitada originalmente. */
  original: number;
  /** Tamaño real asignado: `2^ceil(log2(original))`. */
  adjusted: number;
  /** Prefijo derivado del tamaño ajustado: `32 - log2(adjusted)`. */
  prefix: number;
}

/** Una subred final asignada por VLSM. */
export interface VlsmAssignment {
  label: string;
  original: number;
  adjusted: number;
  prefix: number;
  network: string;
  broadcast: string;
  range: string;
  firstIpInt: number;
  lastIpInt: number;
}

/** Error tipado para distinguir problemas de validación de IP / espacio. */
export class Ipv4Error extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'Ipv4Error';
  }
}

export class VlsmSpaceError extends Error {
  /** Espacio disponible en direcciones. */
  readonly available: number;
  /** Espacio requerido en direcciones. */
  readonly required: number;
  constructor(message: string, available: number, required: number) {
    super(message);
    this.name = 'VlsmSpaceError';
    this.available = available;
    this.required = required;
  }
}
