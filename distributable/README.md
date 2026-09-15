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

## ¿Por qué esta versión sí funciona bajo `file://`?

Astro/Vite por defecto emiten varios `<script type="module" src="./_astro/X.js">`
que comparten chunks entre sí (p.ej. `download.xxx.js`). Al abrir el HTML
directamente desde el sistema de archivos, los navegadores bloquean esos
imports por CORS y la app no ejecuta nada.

El `dist/index.html` de esta versión tiene **todo el JavaScript inlineado en
un único `<script type="module">`** dentro del propio HTML, así que no hay
requests cruzados ni imports entre módulos y todo corre en el mismo origen.
Sólo el CSS queda como archivo aparte.

## Reconstruir (opcional)

Si querés regenerar el build desde el código fuente, en la raíz del proyecto:

```bash
npm install
npm run build
```

Luego copiá `dist/` a `distributable/dist/` y el `.bat` a `distributable/`.
