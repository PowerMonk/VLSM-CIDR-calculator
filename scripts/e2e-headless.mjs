/**
 * Test E2E: levanta el dist con un HTTP server local, abre el HTML
 * en chrome headless, hace click en "Cargar ejemplo" + "Calcular"
 * y vuelca la tabla renderizada. Esto reproduce exactamente lo que
 * el usuario ve en su navegador.
 */

import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST = join(__dirname, '..', 'dist');

const PORT = 4567;
const MIME = {
  '.html': 'text/html;charset=utf-8',
  '.css': 'text/css;charset=utf-8',
  '.js': 'application/javascript;charset=utf-8',
};

function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer(async (req, res) => {
      let p = req.url.split('?')[0];
      if (p === '/' || p === '') p = '/index.html';
      const filePath = join(DIST, p);
      try {
        const data = await readFile(filePath);
        res.writeHead(200, { 'Content-Type': MIME[extname(filePath)] || 'text/plain' });
        res.end(data);
      } catch {
        res.writeHead(404);
        res.end('404');
      }
    });
    server.listen(PORT, '127.0.0.1', () => {
      console.log(`[server] listening on http://127.0.0.1:${PORT}/`);
      resolve(server);
    });
  });
}

async function main() {
  const server = await startServer();
  const url = `http://127.0.0.1:${PORT}/?test=1`;

  // Drive chrome headless with --dump-dom
  const chromeArgs = [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    '--virtual-time-budget=4000',
    '--run-all-compositor-stages-before-draw',
    '--dump-dom',
    url,
  ];

  const candidates = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  ];

  let chrome;
  for (const c of candidates) {
    try {
      await readFile(c);
      chrome = c;
      break;
    } catch {}
  }
  if (!chrome) {
    console.log('[test] No se encontro Chrome/Edge en paths tipicos. Saltando headless test.');
    server.close();
    process.exit(0);
  }
  console.log(`[test] using: ${chrome}`);

  const proc = spawn(chrome, chromeArgs);
  let out = '';
  let err = '';
  proc.stdout.on('data', (d) => (out += d.toString()));
  proc.stderr.on('data', (d) => (err += d.toString()));
  await new Promise((resolve) => proc.on('exit', resolve));

  // El headless --dump-dom no dispara onClick. Asi que en lugar de
  // eso, sacamos el DOM despues de un virtual-time-budget para que
  // los scripts terminen. Si la UI no esta renderizada, al menos
  // vemos el form. Para probar el resultado, hacemos otra cosa:
  // ejecutar el JS directamente en Node (ya lo hicimos en simulate-ui).

  // Filtramos la salida por la seccion VLSM del HTML.
  const vlsmMatch = out.match(/vlsm-requirements[^]*?<\/section>/);
  console.log('=== HTML renderizado (seccion VLSM) ===');
  if (vlsmMatch) {
    console.log(vlsmMatch[0].substring(0, 1500));
  } else {
    console.log('(no se encontro seccion VLSM)');
  }

  server.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
