# Calculadora CIDR & VLSM

Calculadora 100% **client-side** para subnetting fijo (CIDR) y máscara de longitud variable (VLSM). Construida con **Astro + TypeScript + Tailwind CSS**.

## Características

- **CIDR** (subnetting fijo): ingresa una IP (con o sin prefijo) y la cantidad `K` de subredes deseadas; la calculadora determina los bits prestados, el nuevo prefijo y genera todas las subredes contiguas.
- **VLSM** (máscara variable): ingresa una IP base con prefijo y una lista de requerimientos de hosts; la calculadora ajusta cada requerimiento a la potencia de 2 superior, valida el espacio y asigna subredes contiguas en el **orden en que fueron escritos**.
- **Exportación** a CSV o TXT.
- **Ejemplos del classroom** pre-cargados con un clic.
- Cero dependencias de servidor: una vez hecho el build, basta abrir `dist/index.html`.

## Requisitos

- Node.js ≥ 18 (recomendado 20+).
- npm (o pnpm/yarn).

## Instalación

```bash
npm install
```

## Desarrollo (con hot-reload)

```bash
npm run dev
```

Astro abre un servidor local en `http://localhost:4321` (por defecto).

## Build de producción

```bash
npm run build
```

Esto ejecuta `astro build` + `scripts/postbuild.mjs`, que reescribe los paths absolutos de los assets a paths relativos (`./_astro/...`). Esto es **necesario** para que `dist/index.html` funcione al abrirse directamente con `file://` desde el `.bat`.

El resultado estático queda en `dist/`. Todo el JS y CSS queda embebido o se sirve desde esa misma carpeta.

## Distribución

1. Asegúrate de haber ejecutado `npm run build` (debe existir `dist/index.html`).
2. Doble clic en **`abrir-calculadora.bat`** en la raíz del proyecto.
3. Se abrirá `dist/index.html` en el navegador predeterminado.

> Si compartes la carpeta del proyecto con alguien, basta con enviarle `dist/` + el `.bat` (no necesita instalar Node).

## Estructura

```
.
├── abrir-calculadora.bat     # Launcher para Windows
├── astro.config.mjs          # Configuración Astro + Tailwind
├── package.json
├── tsconfig.json
├── README.md
├── docs.md                   # Documentación detallada (arquitectura por archivo)
├── scripts/                  # Scripts de soporte
│   ├── postbuild.mjs         # Reescribe paths a relativos para file://
│   ├── verify.mts            # 24 asserts contra los casos del classroom
│   └── verify-dist.mjs       # Confirma paths relativos en dist/
├── src/
│   ├── pages/index.astro     # Página única con tabs
│   ├── layouts/Layout.astro
│   ├── styles/global.css     # Tokens minimalistas
│   ├── components/           # Markup puro (.astro)
│   ├── lib/                  # Lógica pura (cero DOM)
│   │   ├── types.ts
│   │   ├── ip.ts
│   │   ├── cidr.ts
│   │   ├── vlsm.ts
│   │   └── download.ts
│   └── scripts/              # Glue entre DOM y lib/
│       ├── tabs.ts
│       ├── cidr-app.ts
│       └── vlsm-app.ts
└── dist/                     # Generado por build
```

## Documentación detallada

Para la arquitectura completa, descripción archivo-por-archivo y los algoritmos paso a paso, ver [`docs.md`](./docs.md).

## Walkthrough para estudiarte el proyecto

Si querés entender el código de punta a punta, seguí el orden recomendado en [`walkthrough.md`](./walkthrough.md). Incluye preguntas de autoevaluación en cada paso.

## Casos de prueba (classroom)

- **CIDR**: `38.120.32.110` + `K = 200` → bits prestados `b = 8`, prefijo `/16`, 256 subredes de 65 536 direcciones.
- **VLSM**: `172.18.16.0/16` con requerimientos `A=100, B=250, C=300, D=10, E=50` →
  - `C` → 512 (`/23`)
  - `B` → 256 (`/24`)
  - `A` → 128 (`/25`)
  - `E` → 64 (`/26`)
  - `D` → 16 (`/28`)
  - Total requerido: 976 ≤ 65 536 (válido).

Pulsa **"Cargar ejemplo del classroom"** en cada pestaña para probarlos.
