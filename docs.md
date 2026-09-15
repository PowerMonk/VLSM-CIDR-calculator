# Documentación — Calculadora CIDR & VLSM

Documentación técnica detallada: arquitectura del proyecto, descripción archivo-por-archivo, lógica de los algoritmos y casos de prueba.

> Si sólo quieres ejecutar la calculadora, revisa el [README.md](./README.md).

---

## 1. Arquitectura general

```
┌─────────────────────────────── UI (DOM) ───────────────────────────────┐
│  src/pages/index.astro → Layout → Tabs + CidrCalculator + VlsmCalculator
└────────────────────────────────────────────────────────────────────────┘
                                  │ <script> (Astro procesa y bundlea)
                                  ▼
┌────────────────────────── Glue scripts/ ───────────────────────────────┐
│  tabs.ts          → activa pestaña, persiste selección                │
│  cidr-app.ts      → lee form, llama lib/, renderiza, conecta descarga │
│  vlsm-app.ts      → idem + filas dinámicas + manejo de errores         │
└────────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌────────────────────────── Lógica pura lib/ ────────────────────────────┐
│  ip.ts           → IPv4 ↔ UInt32, máscaras, ceilLog2, nextPowerOfTwo   │
│  cidr.ts         → calculateFixedSubnets(input) → FixedSubnetPlan      │
│  vlsm.ts         → calculateVlsm(input) → VlsmPlan | throws errors     │
│  download.ts     → rowsToCsv, rowsToTxt, downloadFile                  │
│  types.ts        → interfaces + Ipv4Error + VlsmSpaceError             │
└────────────────────────────────────────────────────────────────────────┘
```

**Principios aplicados:**

- **Separación UI / lógica.** Los `.astro` son markup puro; toda decisión se delega a `lib/`. Esto hace que la lógica sea testeable sin DOM.
- **Single source of truth.** Todos los tipos viven en `lib/types.ts` para evitar imports circulares.
- **Sin frameworks UI.** Astro procesa los `<script>` de cada componente (TypeScript por defecto, bundle, dedup, type=module). No usamos React/Vue.
- **Errores tipados.** `Ipv4Error` para entradas inválidas, `VlsmSpaceError` para problemas de capacidad con metadata adicional (`available`, `required`).

---

## 2. Algoritmo CIDR (subnetting fijo)

### 2.1. Reglas del dominio

- Tamaño por bloque = `2^(32 - nuevoPrefijo)` **sin descontar** red ni broadcast (regla académica).
- Las direcciones se manipulan como `UInt32` (enteros sin signo de 32 bits) y se reconvierten a `X.X.X.X` solo al renderizar.
- Si el usuario **no** ingresa prefijo, se detecta la clase A/B/C por el primer octeto:
  - 1..126 → Clase A → `/8`
  - 128..191 → Clase B → `/16`
  - 192..223 → Clase C → `/24`

### 2.2. Flujo paso a paso

1. Validar IP y K. Detectar prefijo (input o por clase).
2. `baseIpInt = IP AND máscara(prefijo)` → dirección de red base como UInt32.
3. `b = ceil(log2(K))` → bits prestados.
4. `nuevoPrefijo = prefijo + b`.
5. `tamaño = 2^(32 - nuevoPrefijo)`.
6. Para cada `i` en `[0, 2^b - 1]`:
   - `primeraIp = baseIpInt + i * tamaño`
   - `ultimaIp  = primeraIp + tamaño - 1`
   - `red       = intToIp(primeraIp)`
   - `broadcast = intToIp(ultimaIp)`

### 2.3. Caso de prueba (classroom)

| Entrada | Valor |
|---|---|
| IP | `38.120.32.110` |
| K | `200` |
| Clase | A → prefijo `/8` |

Cálculo:
- `b = ceil(log2(200)) = 8` (porque `2^8 = 256 ≥ 200`).
- `nuevoPrefijo = 8 + 8 = /16`.
- `tamaño = 2^(32-16) = 65 536`.
- Total generado: `2^8 = 256` subredes.

Resultado: 256 subredes `/16`, cada una de 65 536 direcciones.

---

## 3. Algoritmo VLSM (máscara de longitud variable)

### 3.1. Reglas del dominio

- `S_i = 2^ceil(log2(R_i))` → tamaño real asignado al requerimiento `i`.
- `Prefijo_i = 32 - log2(S_i)`.
- `Espacio total = 2^(32 - prefijoBase)`.
- Asignación contigua partiendo de `baseIp AND máscara(prefijoBase)`.

### 3.2. Flujo paso a paso

1. Parsear IP base **con prefijo obligatorio** (ej. `172.18.16.0/16`).
2. Para cada requerimiento `R_i`:
   - `S_i = nextPowerOfTwo(R_i)` (potencia de 2 inmediatamente superior).
   - `Prefijo_i = 32 - ceilLog2(S_i)`.
3. **Orden:** se mantiene el orden en que el usuario escribió los requerimientos. No se reordena por tamaño.
4. Sumar todos los `S_i`. Si `suma > espacio disponible` → `throw VlsmSpaceError`.
5. Asignar iterativamente:
   - `red = IP_actual`
   - `broadcast = IP_actual + S_i - 1`
   - `IP_actual = broadcast + 1` (siguiente bloque).

### 3.3. Caso de prueba (classroom)

Base: `172.18.16.0/16` → espacio disponible = `2^16 = 65 536`.

| Req. | Original | Ajustado (`S_i`) | Prefijo |
|---|---|---|---|
| C | 300 | 512 | `/23` |
| B | 250 | 256 | `/24` |
| A | 100 | 128 | `/25` |
| E | 50  | 64  | `/26` |
| D | 10  | 16  | `/28` |

Suma ajustada = `512 + 256 + 128 + 64 + 16 = 976 ≤ 65 536` → válido.

Asignación contigua respetando **el orden en que el usuario ingresó los requerimientos** (no se reordena por tamaño). La red base `172.18.16.0` se normaliza a `172.18.0.0/16` tras aplicar `AND 255.255.0.0`:

| Etiqueta | Red | Broadcast | Prefijo |
|---|---|---|---|
| A | `172.18.0.0`   | `172.18.0.127` | `/25` |
| B | `172.18.0.128` | `172.18.1.127` | `/24` |
| C | `172.18.1.128` | `172.18.3.127` | `/23` |
| D | `172.18.3.128` | `172.18.3.143` | `/28` |
| E | `172.18.3.144` | `172.18.3.207` | `/26` |

> El algoritmo **siempre** aplica `AND` entre la IP ingresada y la máscara del prefijo (de clase A/B/C o provisto). Esto es coherente con el paso 5 de `context.md` ("Operación AND: Obtener la dirección IP de red inicial") y con las notas de clase 3 y 4. Si la IP no está alineada al prefijo, se normaliza a la red base correspondiente.
>
> Las asignaciones respetan el orden en que el usuario escribió los requerimientos (A, B, C, D, E), no se reordenan por tamaño. La validación de espacio (`suma ≤ disponible`) y el ajuste a potencia de 2 sí se siguen aplicando.

---

## 4. Descripción archivo por archivo

### 4.1. Raíz del proyecto

| Archivo | Propósito |
|---|---|
| `package.json` | Dependencias (Astro, Tailwind, Vite plugin, tsx) y scripts (`dev`, `build`, `preview`, `verify`). |
| `astro.config.mjs` | Astro 5+ con `output: 'static'`, `base: ''` e integración de Tailwind 4 vía `@tailwindcss/vite`. |
| `tsconfig.json` | Extiende `astro/tsconfigs/strict` (TypeScript estricto). |
| `.gitignore` | Ignora `node_modules/`, `dist/`, `.astro/` y archivos del sistema. |
| `abrir-calculadora.bat` | Abre `dist/index.html` con el navegador por defecto. Usa `%~dp0` para ser portable. |
| `README.md` | Guía rápida de uso. |
| `docs.md` | Este archivo. |
| `scripts/postbuild.mjs` | Reescribe `href="/_astro/..."` → `href="./_astro/..."` en `dist/index.html`. Sin esto, los assets no cargan al abrir el HTML vía `file://`. |
| `scripts/verify.mts` | 24 asserts contra los casos del classroom. Se ejecuta con `npm run verify`. |
| `scripts/verify-dist.mjs` | Confirma que los paths relativos de `dist/index.html` resuelven a archivos existentes (simula `file://`). |

### 4.2. `src/pages/index.astro`

Composición principal: importa `Layout`, `Tabs`, `CidrCalculator` y `VlsmCalculator`. Incluye un `<script>` que importa e invoca `initTabs()`.

### 4.3. `src/layouts/Layout.astro`

Plantilla HTML base: doctype, head (charset, viewport, descripción, título), body con un `<main>` y un `<footer>` minimalista. Importa `global.css`.

### 4.3. `src/styles/global.css`

- Importa Tailwind 4 (`@import "tailwindcss";`).
- Define tokens en `@theme {...}`: `--color-ink`, `--color-paper`, `--color-accent`, `--color-info`, etc.
- Estilos reutilizables: `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-ghost`, `.btn-danger`, `table.minimal`, `.alert-error`, `.alert-ok`, `.alert-info`, `.tabs`, `.tab-panel`.
- Resalta los prefijos `/N` en azul sobrio con la clase `.prefix`.

### 4.4. `src/components/Tabs.astro`

Solo markup: dos `<button data-tab-trigger="...">` que `tabs.ts` enchufa.

### 4.5. `src/components/CidrCalculator.astro`

Formulario con:

- Input IP (`#cidr-ip`).
- Input prefijo opcional (`#cidr-prefix`).
- Input K (`#cidr-k`).
- Botones `#cidr-example` (cargar ejemplo), `#cidr-download-csv`, `#cidr-download-txt`.
- Contenedor `#cidr-results` donde se renderizan los resultados.

Incluye `<script>import { initCidr } from '../scripts/cidr-app'; initCidr();</script>`.

### 4.6. `src/components/VlsmCalculator.astro`

Formulario con:

- Input IP base con prefijo (`#vlsm-base`).
- Contenedor dinámico `#vlsm-requirements` con filas de etiqueta + hosts.
- Botones `#vlsm-add-row`, `#vlsm-example`, `#vlsm-download-csv`, `#vlsm-download-txt`.
- Contenedor `#vlsm-results`.

Incluye `<script>import { initVlsm } from '../scripts/vlsm-app'; initVlsm();</script>`.

### 4.7. `src/lib/types.ts`

Tipos compartidos:

- `FixedSubnetPlan`, `FixedSubnet` (resultado CIDR).
- `VlsmPlan`, `VlsmRequirement`, `VlsmAssignment` (resultado VLSM).
- `Octets` (tupla de 4 números).
- Errores: `Ipv4Error`, `VlsmSpaceError`.

### 4.8. `src/lib/ip.ts`

Utilidades de IPv4. Exporta:

- `parseIpv4(input)` → `[a, b, c, d]` o lanza `Ipv4Error`.
- `ipToInt(ip)` → UInt32.
- `intToIp(value)` → string.
- `getDefaultPrefix(ip)` → 8/16/24 según el primer octeto.
- `prefixToMaskInt(prefix)` → máscara como UInt32.
- `prefixToMask(prefix)` → máscara dotted-decimal.
- `ipAndMask(ipInt, maskInt)` → UInt32.
- `networkAddress(ip, prefix)` → string ya enmascarado.
- `validatePrefix(prefix)` → entero validado.
- `ceilLog2(n)` → bits necesarios.
- `nextPowerOfTwo(n)` → potencia de 2 ≥ n.
- `parseIpWithOptionalPrefix(input)` → `{ ip, prefix | null }`.

### 4.9. `src/lib/cidr.ts`

Función principal `calculateFixedSubnets({ ip, k, prefix? })` → `FixedSubnetPlan`.

- Detecta prefijo si no se da.
- Calcula `bitsBorrowed`, `newPrefix`, `blockSize`, `totalSubnets`.
- Itera y construye `subnets[]` con `firstIpInt`, `lastIpInt`, `network`, `broadcast`, `range`, `prefix`.
- Lanza `Ipv4Error` si K < 1 o si el nuevo prefijo excede /32.

### 4.10. `src/lib/vlsm.ts`

Función principal `calculateVlsm({ baseNetwork, requirements[] })` → `VlsmPlan`.

- Parsea la IP base **obligando** el prefijo.
- Ajusta cada requerimiento a `nextPowerOfTwo`.
- Ordena descendente por `adjusted`.
- Suma y compara con `availableAddresses`; lanza `VlsmSpaceError` si no cabe.
- Asigna contiguamente actualizando `currentIp = endIp + 1`.
- Devuelve `requirements` (ordenadas) y `assignments` (mismo orden).

### 4.11. `src/lib/download.ts`

Funciones puras y un helper DOM:

- `csvEscape(value)` → escapa comillas, comas y saltos de línea.
- `rowsToCsv(headers, rows)` → texto CSV con CRLF.
- `rowsToTxt(lines)` → texto plano con CRLF.
- `downloadFile(filename, content, mime?)` → crea `Blob`, URL temporal, enlace `<a>` sintético, `click()` y `revokeObjectURL`. Funciona bajo `file://`.
- `CSV_MIME` constante (`text/csv;charset=utf-8`).

### 4.12. `src/scripts/tabs.ts`

- `activate(id)` → aplica `.active` al botón y `.hidden` al panel; persiste en `localStorage`.
- `initTabs()` → conecta listeners y restaura la última pestaña.

### 4.13. `src/scripts/cidr-app.ts`

- Lee el formulario (IP, K, prefijo opcional).
- Llama a `calculateFixedSubnets`.
- Renderiza resumen + tabla; o un `.alert-error` si hay `Ipv4Error`.
- Habilita los botones "Descargar CSV/TXT" tras éxito, los deshabilita tras error.
- `downloadCsv()` y `downloadTxt()` usan `downloadFile` con `lastPlan`.

### 4.14. `src/scripts/vlsm-app.ts`

- Construye filas dinámicas con `buildRequirementRow(label, hosts)`.
- Conecta el botón "×" por fila y "Añadir requerimiento".
- Lee el form y llama a `calculateVlsm`.
- Renderiza tres secciones: validación (verde/rojo), tabla de ajuste (`Paso 2`) y tabla de asignación (`Paso 4`).
- Maneja `VlsmSpaceError` e `Ipv4Error` por separado.

---

## 5. Cómo extender el proyecto

Para agregar, por ejemplo, un módulo "Wildcard Mask" o "Supernetting":

1. Crear `src/lib/wildcard.ts` con la función pura `calculateWildcard(prefix)`.
2. Crear `src/scripts/wildcard-app.ts` con un `initWildcard()` que lee el DOM.
3. Crear `src/components/WildcardCalculator.astro` con el formulario y `<script>import { initWildcard } from '../scripts/wildcard-app'; initWildcard();</script>`.
4. Agregar un `<button data-tab-trigger="wildcard">` en `Tabs.astro` y un `<section data-tab-panel="wildcard">` en `index.astro`.
5. (Opcional) Agregar `Wildcard` en `lib/types.ts` si exporta nuevos tipos.

La separación `lib/` ↔ `scripts/` permite testear los algoritmos sin un navegador.
