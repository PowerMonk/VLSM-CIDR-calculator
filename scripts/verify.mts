/**
 * Verificación rápida de los algoritmos contra los casos del classroom.
 * Se ejecuta con: `npx tsx scripts/verify.mts`
 *
 * Importante: las notas del classroom SIEMPRE aplican el AND con la máscara
 * de la clase (o el prefijo provisto). Por eso:
 *   - 38.120.32.110 / clase A (255.0.0.0)   → red base 38.0.0.0
 *   - 172.18.16.0  / prefijo /16 (255.255.0.0) → red base 172.18.0.0
 */

import { calculateFixedSubnets } from '../src/lib/cidr.ts';
import { calculateVlsm } from '../src/lib/vlsm.ts';

let failed = 0;
function expect(label: string, ok: boolean, detail = '') {
  const tag = ok ? '\u2714' : '\u2718';
  if (!ok) failed++;
  console.log(`${tag} ${label}${detail ? '  → ' + detail : ''}`);
}

// ───────────── CIDR ─────────────
console.log('\n[CIDR] 38.120.32.110, K=200');
const cidr = calculateFixedSubnets({ ip: '38.120.32.110', k: 200 });
expect('prefijo clase A = /8', cidr.originalPrefix === 8);
expect('bits prestados = 8', cidr.bitsBorrowed === 8);
expect('nuevo prefijo = /16', cidr.newPrefix === 16);
expect('bloque = 65536', cidr.blockSize === 65536);
expect('total subredes = 256', cidr.totalSubnets === 256);
expect('red base = 38.0.0.0 (tras AND con /8)',
  cidr.baseNetwork === '38.0.0.0', `got ${cidr.baseNetwork}`);
expect('primera subred = 38.0.0.0', cidr.subnets[0].network === '38.0.0.0');
expect('última subred = 38.255.0.0', cidr.subnets[255].network === '38.255.0.0',
  `got ${cidr.subnets[255].network}`);
expect('broadcast primera = 38.0.255.255', cidr.subnets[0].broadcast === '38.0.255.255',
  `got ${cidr.subnets[0].broadcast}`);
expect('broadcast última = 38.255.255.255', cidr.subnets[255].broadcast === '38.255.255.255',
  `got ${cidr.subnets[255].broadcast}`);

// ───────────── VLSM ─────────────
console.log('\n[VLSM] 172.18.16.0/16 con A=100, B=250, C=300, D=10, E=50');
const vlsm = calculateVlsm({
  baseNetwork: '172.18.16.0/16',
  requirements: [
    { label: 'A', hosts: 100 },
    { label: 'B', hosts: 250 },
    { label: 'C', hosts: 300 },
    { label: 'D', hosts: 10 },
    { label: 'E', hosts: 50 },
  ],
});
expect('baseNetwork = 172.18.0.0 (tras AND con /16)',
  vlsm.baseNetwork === '172.18.0.0', `got ${vlsm.baseNetwork}`);
expect('basePrefix = 16', vlsm.basePrefix === 16);
expect('available = 65536', vlsm.availableAddresses === 65536);
expect('totalNeeded = 976', vlsm.totalNeeded === 976,
  `got ${vlsm.totalNeeded}`);

// Orden esperado: C=512(/23), B=256(/24), A=128(/25), E=64(/26), D=16(/28).
const order = vlsm.requirements.map((r) => `${r.label}:${r.adjusted}/${r.prefix}`);
expect('orden ajustado',
  JSON.stringify(order) === JSON.stringify(['C:512/23','B:256/24','A:128/25','E:64/26','D:16/28']),
  JSON.stringify(order));

// Asignación contigua partiendo de 172.18.0.0 (la red real tras el AND).
const a = vlsm.assignments;
expect('C red = 172.18.0.0', a[0].network === '172.18.0.0');
expect('C broadcast = 172.18.1.255', a[0].broadcast === '172.18.1.255');
expect('B red = 172.18.2.0', a[1].network === '172.18.2.0');
expect('B broadcast = 172.18.2.255', a[1].broadcast === '172.18.2.255');
expect('A red = 172.18.3.0', a[2].network === '172.18.3.0');
expect('A broadcast = 172.18.3.127', a[2].broadcast === '172.18.3.127');
expect('E red = 172.18.3.128', a[3].network === '172.18.3.128');
expect('E broadcast = 172.18.3.191', a[3].broadcast === '172.18.3.191');
expect('D red = 172.18.3.192', a[4].network === '172.18.3.192');
expect('D broadcast = 172.18.3.207', a[4].broadcast === '172.18.3.207');

// ───────────── Resumen ─────────────
console.log('\n────────────────────────');
if (failed === 0) {
  console.log('\u2713 Todos los casos del classroom pasaron.');
  process.exit(0);
} else {
  console.log(`\u2718 ${failed} caso(s) fallaron.`);
  process.exit(1);
}
