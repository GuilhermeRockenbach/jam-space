// Abre montar-video.html num Chrome separado, espera montar o vídeo e salva o .webm.
// Uso: node ferramentas/render/montar-video.mjs <pasta-dos-quadros (ex.: /entregas/_quadros)> <saida.webm> <pasta-perfil-temporaria>
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const [pasta, saida, perfil] = process.argv.slice(2);
const PORTA = 9340, esperar = ms => new Promise(r => setTimeout(r, ms));
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
  `--user-data-dir=${perfil}`, `--remote-debugging-port=${PORTA}`, '--window-size=1300,800',
  '--autoplay-policy=no-user-gesture-required', '--no-first-run', '--no-default-browser-check',
  '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding', '--disable-background-timer-throttling',
  `http://localhost:5180/ferramentas/render/montar-video.html#${pasta}`,
], { stdio: 'ignore' });
let alvo;
for (let i = 0; i < 40 && !alvo; i++) { await esperar(500); try { alvo = (await (await fetch(`http://127.0.0.1:${PORTA}/json`)).json()).find(t => t.type === 'page' && t.url.includes('montar')); } catch {} }
const ws = new WebSocket(alvo.webSocketDebuggerUrl); await new Promise(r => ws.addEventListener('open', r));
let id = 0; const pend = new Map();
ws.addEventListener('message', e => { const m = JSON.parse(e.data); pend.get(m.id)?.(m); });
const avaliar = expr => new Promise(r => { pend.set(++id, m => r(m.result?.result?.value)); ws.send(JSON.stringify({ id, method: 'Runtime.evaluate', params: { expression: expr, returnByValue: true } })); });
let titulo;
for (let i = 0; i < 90; i++) { await esperar(1000); titulo = await avaliar('document.title'); if (i % 10 === 0) console.log(i + ' s:', await avaliar('window.__etapa + " " + (window.__erro || "")')); if (titulo !== 'montando') break; }
if (titulo === 'pronto') { const b = await avaliar('window.__res'); writeFileSync(saida, Buffer.from(b, 'base64')); console.log(saida, (b.length * 0.75 / 1e6).toFixed(1), 'MB'); }
else console.log('falhou, título:', titulo, await avaliar('String(window.__erro || "")'));
ws.close(); chrome.kill();
