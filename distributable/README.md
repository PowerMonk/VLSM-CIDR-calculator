# Calculadora CIDR & VLSM — Distributable

Esta carpeta contiene todo lo necesario para ejecutar la calculadora **sin necesidad de tener Node ni npm instalados**.

## Contenido

```
distributable/
├── abrir-calculadora.bat       # Doble clic y se abre en el navegador
├── dist/                       # Build estático (HTML + CSS + JS bundleado)
└── README.md                   # Este archivo
```

## Cómo usar

1. Copiá/pegá esta carpeta a cualquier ruta de tu PC (Escritorio, Descargas, USB, etc.).
2. Doble clic en **`abrir-calculadora.bat`**.
3. Se abrirá `dist/index.html` en tu navegador predeterminado.

## ¿Es portable?

Sí. El `.bat` resuelve su propia ruta con `%~dp0` y abre `dist\index.html` relativo a él.
Esto significa que funciona desde cualquier directorio: escritorio, unidades de red,
pendrive, etc. **No necesita instalación**.

## Reconstruir (opcional)

Si querés regenerar el build desde el código fuente, en la raíz del proyecto:

```bash
npm install
npm run build
```

Luego copiá `dist/` a `distributable/dist/` y el `.bat` a `distributable/`.
