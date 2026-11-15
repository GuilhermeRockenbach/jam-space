// Grava um vídeo curto do site tocando (imagem + som da aba), para apresentações.
// Abre um Chrome separado (perfil novo), captura a própria aba com getDisplayMedia e clica nos botões
// por um roteiro. Precisa do site servido em http://localhost:5180 (python -m http.server 5180 na raiz).
// Uso: node ferramentas/render/gravar-video.mjs <saida.mp4> <pasta-perfil-temporaria>
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const [saida, perfil] = process.argv.slice(2);
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORTA = 9333;
const esperar = ms => new Promise(r => setTimeout(r, ms));

const chrome = spawn(CHROME, [
  `--user-data-dir=${perfil}`, `--remote-debugging-port=${PORTA}`,
  `--window-size=${process.env.JANELA || '1296,815'}` /* área útil de 1280x720 */, '--window-position=0,0', '--force-device-scale-factor=1',
  '--auto-accept-this-tab-capture', '--autoplay-policy=no-user-gesture-required',
  '--no-first-run', '--no-default-browser-check', '--disable-infobars',
  // a janela pode ficar atrás de outras: sem isso o Chrome reduz o disco e o som a 1 quadro por segundo
  '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding', '--disable-background-timer-throttling',
  'http://localhost:5180/site/?video=1',
], { stdio: 'ignore' });

let alvo;
for (let i = 0; i < 40 && !alvo; i++) {
  await esperar(500);
  try { alvo = (await (await fetch(`http://127.0.0.1:${PORTA}/json`)).json()).find(t => t.type === 'page' && t.url.includes('5180')); } catch {}
}
if (!alvo) throw new Error('Chrome não abriu');
const ws = new WebSocket(alvo.webSocketDebuggerUrl);
await new Promise(r => ws.addEventListener('open', r));
let id = 0; const pend = new Map();
ws.addEventListener('message', e => { const m = JSON.parse(e.data); if (pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } });
const cdp = (method, params = {}) => new Promise(r => { pend.set(++id, r); ws.send(JSON.stringify({ id, method, params })); });
const avaliar = async (expr, gesto = false) => {
  const m = await cdp('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true, userGesture: gesto });
  if (m.result?.exceptionDetails) throw new Error(JSON.stringify(m.result.exceptionDetails));
  return m.result?.result?.value;
};
const clicar = async seletor => {
  const r = await avaliar(`(() => { const b = document.querySelector(${JSON.stringify(seletor)}).getBoundingClientRect(); return [b.x + b.width / 2, b.y + b.height / 2]; })()`);
  // Move o mouse aos poucos até o botão, para o clique aparecer no vídeo
  for (let k = 1; k <= 12; k++) { await cdp('Input.dispatchMouseEvent', { type: 'mouseMoved', x: r[0], y: r[1] }); await esperar(16); }
  await cdp('Input.dispatchMouseEvent', { type: 'mousePressed', x: r[0], y: r[1], button: 'left', clickCount: 1 });
  await esperar(90);
  await cdp('Input.dispatchMouseEvent', { type: 'mouseReleased', x: r[0], y: r[1], button: 'left', clickCount: 1 });
};

await esperar(6000); // carrega o disco 3D e as fontes
console.log('viewport:', await avaliar('[innerWidth, innerHeight]'));
await avaliar(`(async () => {
  const fluxo = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 30 }, audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false }, preferCurrentTab: true, selfBrowserSurface: 'include' });
  const tipo = [${JSON.stringify(process.env.TIPO || '')}, 'video/mp4;codecs=avc1.640028,mp4a.40.2', 'video/webm;codecs=vp9,opus'].find(t => MediaRecorder.isTypeSupported(t));
  window.__rec = new MediaRecorder(fluxo, { mimeType: tipo, videoBitsPerSecond: 10e6, audioBitsPerSecond: 192e3 });
  window.__partes = []; window.__tipo = tipo;
  __rec.ondataavailable = e => __partes.push(e.data);
  __rec.start(500);
  window.__fluxo = fluxo;
  return tipo;
})()`, true).then(t => console.log('gravando em', t));

// Mede os quadros do disco durante a gravação, para achar travadas
await avaliar(`window.__q = []; (function f(t) { __q.push(t); requestAnimationFrame(f); })(performance.now()); window.__q0 = performance.now(); window.__lt = []; new PerformanceObserver(l => l.getEntries().forEach(e => __lt.push(((e.startTime - __q0) / 1000).toFixed(2) + ':' + e.duration.toFixed(0)))).observe({ type: 'longtask' });`);
const t0 = Date.now(), ate = s => esperar(Math.max(0, t0 + s * 1000 - Date.now()));
await ate(1.5); await clicar('.camada[data-id="temp"]');   // põe a temperatura no disco
await ate(3.2); await clicar('#play');                       // toca
// Com o disco tocando, somar um tema não para a música: ela segue já com o som novo
await ate(8.6);  await clicar('.camada[data-id="raios"]');  // soma os raios (percussão)
await ate(14);   await clicar('.camada[data-id="gelo"]');   // soma o gelo do Ártico
await ate(21);

console.log('tarefas longas (s:ms):', await avaliar('__lt.join(" ")'));
console.log('quadros mais longos (s → ms):', await avaliar(`(() => { const r = []; for (let i = 1; i < __q.length; i++) r.push([(__q[i - 1] - __q0) / 1000, __q[i] - __q[i - 1]]); return JSON.stringify(r.sort((a, b) => b[1] - a[1]).slice(0, 8).map(([t, d]) => t.toFixed(2) + '→' + d.toFixed(0))) + ' média ' + ((__q.at(-1) - __q[0]) / __q.length).toFixed(1) + ' ms'; })()`));
const b64 = await avaliar(`new Promise(r => { __rec.onstop = async () => {
  const blob = new Blob(__partes, { type: __tipo }); const buf = new Uint8Array(await blob.arrayBuffer());
  let s = ''; for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  __fluxo.getTracks().forEach(t => t.stop()); r(btoa(s)); }; __rec.stop(); })`);
writeFileSync(saida, Buffer.from(b64, 'base64'));
console.log(saida, (b64.length * 0.75 / 1e6).toFixed(1), 'MB');
ws.close(); chrome.kill();
