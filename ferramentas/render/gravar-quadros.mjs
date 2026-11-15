// Grava o site tocando em duas trilhas separadas, sem captura de aba (que derrubava o vídeo para ~22 qps):
//  • imagem: cada quadro que o Chrome desenha (screencast do DevTools), com o horário exato de cada um
//  • som: direto do sintetizador do site (um "grampo" na saída do Web Audio), sem perda
// Depois, ferramentas/render/montar-video.html junta os dois num vídeo de 30 qps estável.
// Precisa do site servido em http://localhost:5180 (raiz do projeto).
// Uso: node ferramentas/render/gravar-quadros.mjs <pasta-saida> <pasta-perfil-temporaria>
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';

const [pasta, perfil] = process.argv.slice(2);
const PORTA = 9339, L = 1280, A = 720;
const esperar = ms => new Promise(r => setTimeout(r, ms));
rmSync(pasta, { recursive: true, force: true }); mkdirSync(pasta, { recursive: true });

const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
  `--user-data-dir=${perfil}`, `--remote-debugging-port=${PORTA}`,
  `--window-size=${L + 16},${A + 95}`, '--window-position=0,0', '--force-device-scale-factor=1',
  '--autoplay-policy=no-user-gesture-required', '--no-first-run', '--no-default-browser-check',
  // a janela pode ficar atrás de outras: sem isso o Chrome reduz o disco e o som a 1 quadro por segundo
  '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding', '--disable-background-timer-throttling',
  'about:blank',
], { stdio: 'ignore' });

let alvo;
for (let i = 0; i < 40 && !alvo; i++) {
  await esperar(500);
  try { alvo = (await (await fetch(`http://127.0.0.1:${PORTA}/json`)).json()).find(t => t.type === 'page'); } catch {}
}
const ws = new WebSocket(alvo.webSocketDebuggerUrl);
await new Promise(r => ws.addEventListener('open', r));
let id = 0; const pend = new Map(), quadros = [];
ws.addEventListener('message', e => {
  const m = JSON.parse(e.data);
  if (m.method === 'Page.screencastFrame') {
    const { data, metadata, sessionId } = m.params;
    ws.send(JSON.stringify({ id: ++id, method: 'Page.screencastFrameAck', params: { sessionId } }));
    if (gravando) quadros.push({ t: metadata.timestamp, data });
    return;
  }
  if (pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); }
});
let gravando = false;
const cdp = (method, params = {}) => new Promise(r => { pend.set(++id, r); ws.send(JSON.stringify({ id, method, params })); });
const avaliar = async expr => (await cdp('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true })).result?.result?.value;
// Clique pelo próprio botão (com "gesto do usuário" para o som poder tocar). O clique simulado de
// mouse do DevTools pausava a captura de quadros por ~250 ms a cada toque.
const clicar = seletor => cdp('Runtime.evaluate', { expression: `document.querySelector(${JSON.stringify(seletor)}).click()`, userGesture: true });

// Grampo no Web Audio: tudo que vai para os alto-falantes também vai para um gravador
await cdp('Page.enable');
await cdp('Page.addScriptToEvaluateOnNewDocument', { source: `(() => {
  const ligar = AudioNode.prototype.connect;
  AudioNode.prototype.connect = function (destino, ...resto) {
    const r = ligar.call(this, destino, ...resto);
    if (destino instanceof AudioDestinationNode) {
      const c = destino.context;
      if (!c.__grampo) { c.__grampo = c.createMediaStreamDestination(); window.__ctxGravar = c; }
      ligar.call(this, c.__grampo, ...resto);
    }
    return r;
  };
})();` });
await cdp('Page.navigate', { url: 'http://localhost:5180/site/' });
await esperar(7000); // carrega o disco 3D, as fontes e prepara o som (pausado)
console.log('viewport:', await avaliar('[innerWidth, innerHeight]'), 'áudio pronto:', await avaliar('!!window.__ctxGravar'));

// Começa as duas trilhas juntas e guarda o horário do início do som
const inicioSom = await avaliar(`(() => {
  window.__partes = [];
  window.__rec = new MediaRecorder(__ctxGravar.__grampo.stream, { mimeType: 'audio/webm;codecs=opus', audioBitsPerSecond: 256000 });
  __rec.ondataavailable = e => __partes.push(e.data);
  __rec.start(250);
  return (performance.timeOrigin + performance.now()) / 1000;
})()`);
gravando = true;
await cdp('Page.startScreencast', { format: 'jpeg', quality: 90, maxWidth: L, maxHeight: A, everyNthFrame: 1 });

const t0 = Date.now(), ate = s => esperar(Math.max(0, t0 + s * 1000 - Date.now()));
await ate(1.5); await clicar('.camada[data-id="temp"]');   // põe a temperatura no disco
await ate(3.2); await clicar('#play');                       // toca
// Com o disco tocando, somar um tema não para a música: ela segue já com o som novo
await ate(8.6);  await clicar('.camada[data-id="raios"]');  // soma os raios (percussão)
await ate(14);   await clicar('.camada[data-id="gelo"]');   // soma o gelo do Ártico
await ate(21.2);

await cdp('Page.stopScreencast'); gravando = false;
const som = await avaliar(`new Promise(r => { __rec.onstop = async () => {
  const buf = new Uint8Array(await new Blob(__partes, { type: 'audio/webm' }).arrayBuffer());
  let s = ''; for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  r(btoa(s)); }; __rec.stop(); })`);
writeFileSync(`${pasta}/som.webm`, Buffer.from(som, 'base64'));
quadros.forEach((q, i) => writeFileSync(`${pasta}/${String(i).padStart(5, '0')}.jpg`, Buffer.from(q.data, 'base64')));
// tempo de cada quadro em segundos, contado do início do som
writeFileSync(`${pasta}/indice.json`, JSON.stringify(quadros.map((q, i) => ({ f: `${String(i).padStart(5, '0')}.jpg`, t: +(q.t - inicioSom).toFixed(4) }))));
const ts = quadros.map(q => q.t), gaps = ts.slice(1).map((t, i) => t - ts[i]);
console.log(`${quadros.length} quadros, ${(quadros.length / (ts.at(-1) - ts[0])).toFixed(1)} qps, maior intervalo ${(Math.max(...gaps) * 1000).toFixed(0)} ms, intervalos > 50 ms: ${gaps.filter(g => g > 0.05).length}`);
ws.close(); chrome.kill();
