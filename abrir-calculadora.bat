@echo off
REM ============================================================
REM  abrir-calculadora.bat
REM  Abre la calculadora CIDR/VLSM en el navegador predeterminado.
REM
REM  - Usa "%~dp0" para resolver la ruta al directorio del propio
REM    script, de modo que funcione sin importar desde donde se
REM    ejecute (doble-click, acceso directo, programador de tareas).
REM  - La doble comilla vacia antes de la ruta es OBLIGATORIA para
REM    `start`: el primer parametro es el titulo de la ventana.
REM  - El query "?v=..." es un cache-buster: cambia en cada corrida
REM    para que el navegador NO reuse un HTML cacheado de una build
REM    anterior (los navegadores a veces sirven file:// desde cache).
REM  - Si la build no se ha generado aun, este archivo abrira una
REM    pagina en blanco. Primero ejecuta: npm install && npm run build
REM ============================================================

REM Cache-buster: timestamp + random para forzar URL unica.
set "CB=%RANDOM%"

start "" "%~dp0dist\index.html?v=%CB%"
