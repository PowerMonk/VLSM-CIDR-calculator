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
REM  - Si la build no se ha generado aun, este archivo abrira una
REM    pagina en blanco. Primero ejecuta: npm install && npm run build
REM ============================================================

start "" "%~dp0dist\index.html"
