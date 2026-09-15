/**
 * Simula exactamente lo que la UI muestra con el ejemplo del classroom.
 * Carga los mismos datos que vlsm-app.ts pone en el form al pulsar
 * "Cargar ejemplo", corre calculateVlsm y muestra las tablas tal cual
 * las renderiza la UI.
 */

import { calculateVlsm } from '../src/lib/vlsm.ts';

const EXAMPLE_BASE = '172.18.16.0/16';
const EXAMPLE_REQUIREMENTS = [
  { label: 'A', hosts: 100 },
  { label: 'B', hosts: 250 },
  { label: 'C', hosts: 300 },
  { label: 'D', hosts: 10 },
  { label: 'E', hosts: 50 },
];

const plan = calculateVlsm({
  baseNetwork: EXAMPLE_BASE,
  requirements: EXAMPLE_REQUIREMENTS,
});

console.log('=== Paso 2 (ajuste) — lo que renderiza renderRequirements ===');
console.log('+-----+-----+-----+------+');
console.log('| Eti | Req | Aju | Pref |');
for (const r of plan.requirements) {
  console.log(`|  ${r.label}  | ${String(r.original).padStart(3)} | ${String(r.adjusted).padStart(3)} |  /${r.prefix} |`);
}
console.log('+-----+-----+-----+------+');

console.log('\n=== Paso 4 (asignacion) — lo que renderiza renderAssignments ===');
console.log('+-----+-----+-----+-----------------+-----------------+------+-------------------+');
console.log('| Eti | Req | Aju | Red             | Broadcast       | Pref | Rango             |');
for (const a of plan.assignments) {
  console.log(`|  ${a.label}  | ${String(a.original).padStart(3)} | ${String(a.adjusted).padStart(3)} | ${a.network.padEnd(15)} | ${a.broadcast.padEnd(15)} |  /${a.prefix}  | ${a.range.padEnd(17)} |`);
}
console.log('+-----+-----+-----+-----------------+-----------------+------+-------------------+');
