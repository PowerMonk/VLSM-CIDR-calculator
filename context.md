# Contexto del Proyecto: Calculadora CIDR y VLSM

## 1. Stack Tecnológico y Filosofía

- **Framework Frontend:** Astro + TypeScript.
- **Estilos:** Tailwind CSS.
- **Filosofía de Desarrollo:**
  - Aplicación 100% Client-Side (ejecución directa en el navegador mediante TypeScript/JS).
  - Código limpio, funcional y sin sobreingeniería.
  - Interfaz gráfica (UI) intuitiva y clara.
- **Distribución:** Build estático de Astro (`dist/`) acompañado de un script ejecutable `.bat` en la raíz que abra automáticamente `index.html` en el navegador predeterminado.

---

## 2. Estrategia de Documentación (Criterio de Rúbrica)

1. **Documento General de Arquitectura (`README.md` / `DOCUMENTATION.md`):** Explica la estructura de carpetas, el propósito de cada archivo de código y el flujo de los algoritmos.
2. **Comentarios en Código (JSDoc / Inline):** Explicación breve sobre los parámetros, retornos y lógica de bloques clave en los archivos `.ts` y `.astro`.

---

## 3. Reglas del Dominio Académico (Algoritmo Simplificado)

- **Capacidad por Bloque:** En esta etapa académica **NO se descuentan las 2 direcciones reservadas** (red y broadcast) para los cálculos. Se utiliza $2^n$ de forma directa.
- **Operaciones con IPs:** Para facilitar los saltos de red, desplazamientos y la operación `AND`, las direcciones IPv4 se convierten a enteros sin signo de 32 bits (`UInt32`) antes de los cálculos y se reconvierten al formato dotted-decimal (`X.X.X.X`) para renderizarse en la UI.

---

## 4. Requisitos por Módulo y Ejercicios Obligatorios

### A. Módulo CIDR (Subnetting Fijo)

- **Entradas:** Dirección IPv4 y Cantidad de subredes requeridas ($K$).
- **Lógica:**
  1. Identificar la IP base y aplicar la máscara correspondiente mediante la operación bitwise `AND`.
  2. Determinar bits prestados $b$ tal que $2^b \ge K$.
  3. Nuevo prefijo: $\text{Prefijo\_Original} + b$.
  4. Tamaño por subred: $2^{(32 - \text{Nuevo\_Prefijo})}$.
  5. Generar rangos contiguos de subredes.
- **Exportación:** Botón en UI para **generar y descargar un archivo de texto (`.txt` o `.csv`)** con la lista completa de subredes generadas.
- **Caso de Prueba (Classroom):**
  - IP: `38.120.32.110`
  - Cantidad de subredes: `200` ($2^8 = 256 \ge 200 \implies b=8$ bits tomados).

---

### B. Módulo VLSM (Máscara de Longitud Variable)

- **Entradas:** IP base con prefijo (ej. `172.18.16.0 /16`) y lista de $N$ requerimientos de hosts.
- **Lógica y Muestra del Proceso Completo en UI:**
  1. **Espacio Disponible:** Total de IPs del bloque ($2^{32 - \text{prefijo}}$).
  2. **Ajuste:** Elevar cada requerimiento $R_i$ a la potencia de 2 superior más cercana ($S_i = 2^{\lceil \log_2(R_i) \rceil}$).
  3. **Ordenamiento:** Ordenar la lista de requerimientos ajustados $S_i$ de **MAYOR a MENOR**.
  4. **Validación:** Comprobar si $\sum S_i \le \text{Espacio Disponible}$. Si sobrepasa, desplegar mensaje de error por falta de espacio.
  5. **Operación AND:** Obtener la dirección IP de red inicial (`IP AND Máscara_Clase`).
  6. **Asignación Iterativa:**
     - $\text{Prefijo} = 32 - \log_2(S_i)$
     - $\text{IP\_Fin} = \text{IP\_Actual} + S_i - 1$
     - Mostrar tabla/desglose con el proceso, rango y prefijo por subred.
     - Actualizar $\text{IP\_Actual} = \text{IP\_Fin} + 1$.

- **Caso de Prueba (Classroom):**
  - IP Base: `172.18.16.0 /16` (Disponible: $65,536$ direcciones).
  - Requerimientos: $A=100, B=250, C=300, D=10, E=50$.
  - Ordenamiento y Ajuste Esperado:
    1. $300 \rightarrow 512$ ($2^9$, $/23$)
    2. $250 \rightarrow 256$ ($2^8$, $/24$)
    3. $100 \rightarrow 128$ ($2^7$, $/25$)
    4. $50 \rightarrow 64$ ($2^6$, $/26$)
    5. $10 \rightarrow 16$ ($2^4$, $/28$)
  - Total requerido: $976 \le 65,536$ (Válido).
