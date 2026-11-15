// Escurece o fundo azul de uma imagem do disco até o preto, para usar em slide de fundo preto.
// O disco e o braço da agulha ficam intactos; em volta do disco o azul vai sumindo aos poucos.
// Precisa do site servido em http://localhost:5180 (raiz do projeto).
// Uso: node ferramentas/render/fundo-preto.mjs <entrada.png (caminho a partir da raiz)> <saida.png> <pasta-perfil-temporaria>
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const [entrada, saida, perfil] = process.argv.slice(2);
const PORTA = 9341, esperar = ms => new Promise(r => setTimeout(r, ms));
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
  `--user-data-dir=${perfil}`, `--remote-debugging-port=${PORTA}`, '--headless=new', '--no-first-run', 'about:blank',
], { stdio: 'ignore' });
let alvo;
for (let i = 0; i < 40 && !alvo; i++) { await esperar(500); try { alvo = (await (await fetch(`http://127.0.0.1:${PORTA}/json`)).json()).find(t => t.type === 'page'); } catch {} }
const ws = new WebSocket(alvo.webSocketDebuggerUrl); await new Promise(r => ws.addEventListener('open', r));
let id = 0; const pend = new Map();
ws.addEventListener('message', e => { const m = JSON.parse(e.data); pend.get(m.id)?.(m); });
const cdp = (method, params) => new Promise(r => { pend.set(++id, r); ws.send(JSON.stringify({ id, method, params })); });
await cdp('Page.navigate', { url: 'http://localhost:5180/' }); await esperar(1000);

// Medidas em fração da imagem (valem para os renders 3200×2400 de entregas/imagens)
const r = await cdp('Runtime.evaluate', { awaitPromise: true, returnByValue: true, expression: `(async () => {
  const img = new Image(); img.src = ${JSON.stringify('/' + entrada.replace(/^\/+/, ''))}; await img.decode();
  const W = img.naturalWidth, H = img.naturalHeight, c = new OffscreenCanvas(W, H), g = c.getContext('2d');
  g.drawImage(img, 0, 0); const d = g.getImageData(0, 0, W, H), p = d.data;
  const cx = 0.5 * W, cy = 0.547 * H, rx = 0.29 * W, ry = 0.313 * H;          // elipse do disco
  const ax = 0.75 * W, ay = 0.28 * H, bx = 1.0 * W, by = 0.387 * H;             // haste do braço
  const caixa = [0.738 * W, 0.262 * H, 0.817 * W, 0.382 * H];                  // base do braço
  const liso = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const t = Math.hypot((x - cx) / rx, (y - cy) / ry);
    const i = (y * W + x) * 4;
    let m = 1 - liso(1.02, 1.6, t);                                            // halo do disco some até o preto
    if (m < 1) {
      // Perto do braço, mantém só o que é do braço (cinza ou escuro); o fundo é azul saturado
      const u = Math.min(1, Math.max(0, ((x - ax) * dx + (y - ay) * dy) / L2));
      const perto = Math.hypot(x - (ax + u * dx), y - (ay + u * dy)) < 40
        || (x > caixa[0] - 30 && x < caixa[2] + 30 && y > caixa[1] - 30 && y < caixa[3] + 30);
      if (perto) m = Math.max(m, 1 - liso(14, 36, p[i + 2] - Math.max(p[i], p[i + 1])));
    }
    p[i] *= m; p[i + 1] *= m; p[i + 2] *= m;
  }
  g.putImageData(d, 0, 0);
  const buf = new Uint8Array(await (await c.convertToBlob({ type: 'image/png' })).arrayBuffer());
  let s = ''; for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  return btoa(s);
})()` });
const b64 = r.result?.result?.value;
if (b64) { writeFileSync(saida, Buffer.from(b64, 'base64')); console.log(saida, (b64.length * 0.75 / 1e6).toFixed(1), 'MB'); }
else console.log('falhou:', JSON.stringify(r.result?.exceptionDetails || r).slice(0, 400));
ws.close(); chrome.kill();
