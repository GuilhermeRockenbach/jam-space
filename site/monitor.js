/* =====================================================================
   Monitor do som: espectro de frequências ao vivo (grave → agudo), a faixa
   de altura de cada tema no disco e leituras do que está tocando agora.
   Só observa o som; não muda nada na música.
   ===================================================================== */
import { analisador, monitor, agora } from './audio.js';
import { CAMADAS, ORDEM } from './dados.js';

const F_MIN = 40, F_MAX = 12000, BARRAS = 72;
const MARCAS = [50, 100, 250, 500, 1000, 2000, 5000, 10000];
const FAIXAS = [ // onde cada tema toca (Hz), tirado dos registros usados em audio.js
  { id: 'temp', de: 45, ate: 1200, papel: 'baixo, acordes e melodia' },
  { id: 'luzes', de: 440, ate: 1400, papel: 'arpejo' },
  { id: 'chuva', de: 650, ate: 2000, papel: 'garoa e gotas' },
  { id: 'gelo', de: 520, ate: 4200, papel: 'sinos' },
  { id: 'raios', de: 1500, ate: 9000, papel: 'caixa e chimbal' },
];
const NOTAS = ['Dó', 'Dó♯', 'Ré', 'Ré♯', 'Mi', 'Fá', 'Fá♯', 'Sol', 'Sol♯', 'Lá', 'Lá♯', 'Si'];
const TENSAO = ['serena', 'serena', 'calma', 'média', 'tensa', 'tensa', 'muito tensa'];

const $ = id => document.getElementById(id);
const xDe = (f, w) => (Math.log(f / F_MIN) / Math.log(F_MAX / F_MIN)) * w;
let camadas = [], tocando = false, buf = null, tempo = null, ultimo = 0;

export function monitorCamadas(lista) { camadas = lista; }
export function monitorTocando(sim) { tocando = sim; }

function cor(nome) { return getComputedStyle(document.documentElement).getPropertyValue(nome).trim(); }

function desenhar() {
  const cv = $('espectro');
  if (!cv || !cv.offsetParent) return; // escondido (tela pequena): não desenha
  const dpr = Math.min(2, devicePixelRatio || 1);
  const w = cv.clientWidth, h = cv.clientHeight;
  if (cv.width !== Math.round(w * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
  const g = cv.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, w, h);

  const altFaixas = 6 * Math.max(1, camadas.length) + 4;
  const hEsp = h - 16 - altFaixas; // espectro em cima, faixas dos temas, eixo embaixo

  // Fundo: grave, médio e agudo
  const zonas = [[F_MIN, 250, 'Grave'], [250, 2000, 'Médio'], [2000, F_MAX, 'Agudo']];
  zonas.forEach(([a, b, nome], i) => {
    const x0 = xDe(a, w), x1 = xDe(b, w);
    g.fillStyle = i % 2 ? 'rgba(170,180,221,0.07)' : 'rgba(170,180,221,0.03)';
    g.fillRect(x0, 0, x1 - x0, hEsp);
    g.fillStyle = 'rgba(170,180,221,0.75)'; g.font = '700 11px "Atkinson Hyperlegible", system-ui';
    g.fillText(nome, x0 + 6, 13);
  });

  // Espectro
  const an = analisador();
  let pico = null;
  if (an) {
    if (!buf || buf.length !== an.frequencyBinCount) { buf = new Float32Array(an.frequencyBinCount); tempo = new Float32Array(an.fftSize); }
    an.getFloatFrequencyData(buf);
    const hzPorBin = an.context.sampleRate / an.fftSize;
    const largura = w / BARRAS;
    for (let k = 0; k < BARRAS; k++) {
      const f0 = F_MIN * Math.pow(F_MAX / F_MIN, k / BARRAS), f1 = F_MIN * Math.pow(F_MAX / F_MIN, (k + 1) / BARRAS);
      let db = -120;
      for (let b = Math.floor(f0 / hzPorBin); b <= Math.ceil(f1 / hzPorBin) && b < buf.length; b++) db = Math.max(db, buf[b]);
      const v = Math.max(0, Math.min(1, (db + 100) / 75));
      const f = Math.sqrt(f0 * f1);
      g.fillStyle = f < 250 ? '#ff8a5c' : f < 2000 ? '#ffc85c' : '#8fd8ff';
      g.globalAlpha = 0.35 + v * 0.65;
      g.fillRect(k * largura + 0.5, hEsp - v * (hEsp - 18), Math.max(1, largura - 1.5), v * (hEsp - 18));
    }
    g.globalAlpha = 1;
    // Frequência mais forte (entre 60 Hz e 5 kHz)
    let melhor = -75, bin = -1;
    for (let b = Math.floor(60 / hzPorBin); b < Math.min(buf.length, 5000 / hzPorBin); b++) if (buf[b] > melhor) { melhor = buf[b]; bin = b; }
    if (bin > 0) pico = bin * hzPorBin;
    an.getFloatTimeDomainData(tempo);
    let soma = 0; for (const x of tempo) soma += x * x;
    const rms = Math.sqrt(soma / tempo.length);
    atualizarLeituras(pico, rms > 1e-5 ? 20 * Math.log10(rms) : -Infinity);
  } else atualizarLeituras(null, -Infinity);

  if (pico) { // marca a nota mais forte
    const x = xDe(pico, w);
    g.strokeStyle = cor('--texto') || '#fff'; g.setLineDash([3, 3]); g.lineWidth = 1;
    g.beginPath(); g.moveTo(x, 16); g.lineTo(x, hEsp); g.stroke(); g.setLineDash([]);
  }

  // Faixas de altura dos temas no disco
  let y = hEsp + 4;
  ORDEM.filter(c => camadas.includes(c)).forEach(c => {
    const fx = FAIXAS.find(f => f.id === c);
    g.fillStyle = CAMADAS[c].cor;
    g.fillRect(xDe(fx.de, w), y, xDe(fx.ate, w) - xDe(fx.de, w), 4);
    y += 6;
  });

  // Eixo de frequências
  g.fillStyle = 'rgba(170,180,221,0.85)'; g.font = '11px "Atkinson Hyperlegible", system-ui'; g.textAlign = 'center';
  MARCAS.forEach(f => { const x = xDe(f, w); if (x > 12 && x < w - 12) g.fillText(f >= 1000 ? `${f / 1000}k` : String(f), x, h - 3); });
  g.textAlign = 'left';
}

function notaDe(f) {
  const m = Math.round(69 + 12 * Math.log2(f / 440));
  return `${NOTAS[(m % 12 + 12) % 12]} ${Math.floor(m / 12) - 1}`;
}

function atualizarLeituras(pico, db) {
  const t = performance.now();
  if (t - ultimo < 150) return; // texto muda no máximo ~7 vezes por segundo
  ultimo = t;
  const ativo = tocando && monitor.bpm && agora() < monitor.quando + monitor.dur + 1;
  $('mon-bpm').textContent = ativo ? `${monitor.bpm} bpm` : '—';
  $('mon-acorde').textContent = ativo ? monitor.acorde : '—';
  $('mon-tensao').textContent = ativo ? `${monitor.tensao} de 6 · ${TENSAO[monitor.tensao]}` : '—';
  $('mon-pico').textContent = pico && db > -60 ? `${Math.round(pico)} Hz · ${notaDe(pico)}` : '—';
  const nivel = Number.isFinite(db) ? Math.max(0, Math.min(1, (db + 60) / 54)) : 0;
  $('mon-nivel').style.width = `${Math.round(nivel * 100)}%`;
  $('mon-db').textContent = Number.isFinite(db) && db > -60 ? `${Math.round(db)} dB` : 'silêncio';
  const lista = $('mon-temas');
  const html = ORDEM.filter(c => camadas.includes(c)).map(c => {
    const fx = FAIXAS.find(f => f.id === c);
    const hz = v => (v >= 1000 ? `${(v / 1000).toLocaleString('pt-BR')} kHz` : `${v} Hz`);
    return `<li style="--cor:${CAMADAS[c].cor}"><i></i>${CAMADAS[c].nome}: ${fx.papel}, ${hz(fx.de)} a ${hz(fx.ate)}</li>`;
  }).join('') || '<li class="vazio">Coloque um tema no disco para ver a faixa de cada um.</li>';
  if (lista.innerHTML !== html) lista.innerHTML = html;
}

export function iniciarMonitor() {
  const quadro = () => { desenhar(); requestAnimationFrame(quadro); };
  requestAnimationFrame(quadro);
}
