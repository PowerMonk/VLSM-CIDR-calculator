# Calculadora CIDR & VLSM — Distributable

Esta carpeta contiene todo lo necesario para ejecutar la calculadora **sin necesidad de tener Node ni npm instalados**.

## Contenido

```
distributable/
├── abrir-calculadora.bat       # Doble clic y se abre en el navegador
├── dist/                       # Build estático (HTML con JS inline + CSS bundleado)
└── README.md                   # Este archivo
```

## Cómo usar

1. Copiá/pegá esta carpeta a cualquier ruta de tu PC (Escritorio, Descargas, USB, etc.).
2. Doble clic en **`abrir-calculadora.bat`**.
3. Se abrirá `dist/index.html` en tu navegador predeterminado.

## Cambio reciente: VLSM en orden de entrada

A partir de esta versión, VLSM asigna las subredes **en el orden que escribiste los requerimientos** (A, B, C, D, E), no de mayor a menor.

## ¿Por qué esta versión sí funciona bajo `file://`?

Astro/Vite por defecto emiten varios `<script type="module" src="./_astro/X.js">`
que comparten chunks entre sí. Al abrir el HTML directamente desde el sistema
de archivos, los navegadores bloquean esos imports por CORS y la app no
ejecuta nada.

El `dist/index.html` de esta versión tiene **todo el JavaScript inlineado en
un único `<script type="module">`** dentro del propio HTML, así que no hay
requests cruzados ni imports entre módulos.

## ¿Por qué el .bat no usa `?v=RANDOM` para forzar recarga?

Versiones anteriores del `.bat` agregaban `?v=%RANDOM%` al URL como
cache-buster. **No funciona**: el comando `start` de Windows trata
`?` como un wildcard en el nombre del archivo y termina mostrando
"Windows no puede encontrar el HTML". Por eso el `.bat` ahora abre
directamente `dist\index.html`. Si el navegador te sirve una versión
vieja por caché, hacé **Ctrl+Shift+R** (hard refresh) una sola vez.

## Reconstruir (opcional)

Si querés regenerar el build desde el código fuente, en la raíz del proyecto:

```bash
npm install
npm run build
```

Luego copiá `dist/` a `distributable/dist/` y el `.bat` a `distributable/`.
