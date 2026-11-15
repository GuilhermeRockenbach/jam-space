/* =====================================================================
   Motor de som (Web Audio API).

   Como os dados viram música (sonificação por mapeamento de parâmetros;
   ver o painel "Como funciona" no site e REFERENCIAS.md):

   - 4/4. Cada passo de dados (ano ou mês) é um compasso; os compassos se
     agrupam em frases de 4, como numa canção. No modo "retrato", a média
     do período toca em loop.
   - A temperatura mexe em vários parâmetros ao mesmo tempo, para os
     extremos soarem bem diferentes: andamento (72 a 132 bpm), registro,
     timbre, densidade da bateria e do baixo, e uma "sirene" no extremo.
   - Harmonia em Ré maior. O dado escolhe o "humor" da frase: de uma
     progressão serena (I–vi–IV–V) a uma tensa, com acordes emprestados
     do modo menor (iv–♭VI–♭VII–V). A posição na frase escolhe o acorde.
   - Polaridade positiva: mais quente = melodia mais aguda e timbre mais aberto.
   - Todos os instrumentos tocam só notas do acorde do momento.
   Nada é sorteado: mesma receita, mesma música.
   ===================================================================== */
import { LIMIAR_MEDIA_GELO, limitar } from './dados.js';

let ctx = null, entrada = null, reverb = null, envioEco = null, eco = null, bufRuido = null;
// "Geração" de saída: tudo o que é agendado passa por ela. Para calar o que já foi
// agendado (pausa, arrastar a linha do tempo), trocamos de geração e a antiga some em ~80 ms.
let ger = null;

/* Celular: menos vozes e reverb mais curto (menos carga = sem estalos),
   e mais folga no agendamento, porque o 3D disputa o processador. */
export const LEVE = matchMedia('(pointer: coarse)').matches || (navigator.hardwareConcurrency || 8) <= 4;
// Segundos de música agendados à frente. Folga grande: se o 3D segurar o navegador por um instante,
// o próximo compasso já está agendado e a música não abre buraco.
export const FOLGA = LEVE ? 1.4 : 1.1;

export const agora = () => (ctx ? ctx.currentTime : 0);
export const pronto = () => !!ctx && ctx.state === 'running';
export const BPM = 100;
export const SEG_POR_COMPASSO = (60 / BPM) * 4; // 2,4 s

function novaGeracao() {
  const g = { seco: ctx.createGain(), rev: ctx.createGain(), eco: ctx.createGain() };
  g.seco.gain.value = 0.8; g.seco.connect(entrada);
  g.rev.connect(reverb); g.eco.connect(envioEco);
  return g;
}

/** Cala na hora tudo o que já foi agendado (o próximo som começa limpo). */
export function silenciar(suave = 0.025) {
  if (!ctx || !ger) return;
  const velha = ger, t = ctx.currentTime;
  Object.values(velha).forEach(n => { n.gain.cancelScheduledValues(t); n.gain.setTargetAtTime(0, t, suave); });
  setTimeout(() => Object.values(velha).forEach(n => n.disconnect()), Math.max(400, suave * 8000));
  ger = novaGeracao();
}

/* iPhone: com a chave de silencioso ligada, o Web Audio fica mudo. Tocar um <audio>
   silencioso em loop põe a página na categoria "reprodução de mídia", que ignora a chave. */
let audioMudo = null;
function destravarIOS() {
  try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch { /* sem suporte */ }
  if (!audioMudo) {
    const n = 4410, buf = new ArrayBuffer(44 + n * 2), v = new DataView(buf);
    const txt = (o, t) => [...t].forEach((c, k) => v.setUint8(o + k, c.charCodeAt(0)));
    txt(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); txt(8, 'WAVEfmt '); v.setUint32(16, 16, true);
    v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, 44100, true); v.setUint32(28, 88200, true);
    v.setUint16(32, 2, true); v.setUint16(34, 16, true); txt(36, 'data'); v.setUint32(40, n * 2, true);
    audioMudo = new Audio(URL.createObjectURL(new Blob([buf], { type: 'audio/wav' })));
    audioMudo.loop = true; audioMudo.setAttribute('playsinline', '');
  }
  audioMudo.play().catch(() => {});
  // Buffer vazio tocado dentro do toque: destrava o contexto no Safari antigo
  const b = ctx.createBufferSource(); b.buffer = ctx.createBuffer(1, 1, 22050); b.connect(ctx.destination); b.start(0);
}

/** Chame sempre dentro de um toque ou clique. Devolve uma promessa que resolve quando o som está pronto. */
export function iniciarAudio() {
  if (!ctx) montarAudio();
  if (ctx.state !== 'running') { destravarIOS(); return ctx.resume().catch(() => {}); }
  return Promise.resolve();
}

/** Monta o som com antecedência (pausado), quando a página fica ociosa: assim o primeiro
    toque só destrava o áudio, sem travar o disco ~200 ms preparando o eco e a reverberação. */
export function prepararAudio() {
  try { if (!ctx) montarAudio(); } catch { /* monta no primeiro toque */ }
}

function montarAudio() {
  ctx = new (window.AudioContext || window.webkitAudioContext)({ latencyHint: LEVE ? 'playback' : 'balanced' });
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -18; comp.ratio.value = 3; comp.attack.value = 0.01; comp.release.value = 0.2;
  const quente = ctx.createBiquadFilter(); quente.type = 'highshelf'; quente.frequency.value = 6000; quente.gain.value = -4; // tira o chiado
  // Limitador: segura os picos quando muitos instrumentos tocam juntos (evita distorção)
  const limitador = ctx.createDynamicsCompressor();
  limitador.threshold.value = -3; limitador.knee.value = 0; limitador.ratio.value = 20;
  limitador.attack.value = 0.002; limitador.release.value = 0.12;
  comp.connect(quente); quente.connect(limitador); limitador.connect(ctx.destination);
  // Analisador para o monitor do som (espectro e volume): só escuta, não muda o som
  an = ctx.createAnalyser(); an.fftSize = 8192; an.smoothingTimeConstant = 0.75; an.minDecibels = -100; an.maxDecibels = -20;
  limitador.connect(an);
  entrada = comp;

  reverb = ctx.createConvolver(); reverb.buffer = impulso(LEVE ? 1.8 : 3.4);
  const molhado = ctx.createGain(); molhado.gain.value = 0.3;
  reverb.connect(molhado); molhado.connect(comp);

  eco = ctx.createDelay(2);
  const realimenta = ctx.createGain(); realimenta.gain.value = 0.3;
  const filtroEco = ctx.createBiquadFilter(); filtroEco.type = 'lowpass'; filtroEco.frequency.value = 2800;
  envioEco = ctx.createGain();
  envioEco.connect(eco); eco.connect(filtroEco); filtroEco.connect(realimenta); realimenta.connect(eco);
  const saidaEco = ctx.createGain(); saidaEco.gain.value = 0.2;
  filtroEco.connect(saidaEco); saidaEco.connect(comp);
  ger = novaGeracao();
  definirAndamento(SEG_POR_COMPASSO);

  // Ao voltar para a aba (ou depois de uma ligação no celular), o navegador pode ter pausado o som
  let jaTocou = false;
  ctx.addEventListener('statechange', () => { if (ctx.state === 'running') jaTocou = true; });
  document.addEventListener('visibilitychange', () => {
    if (jaTocou && document.visibilityState === 'visible' && ctx.state !== 'running') ctx.resume().catch(() => {});
  });
}

/** Monitor do som: analisador e o que está tocando agora (andamento, acorde, tensão). */
let an = null;
export const analisador = () => an;
export const monitor = { bpm: 0, acorde: '', tensao: 0, quando: 0 };
const NOME_ACORDE = { I: 'Ré maior', ii: 'Mi menor', IV: 'Sol maior', V: 'Lá maior', vi: 'Si menor', bVI: 'Si♭ maior', bVII: 'Dó maior', iv: 'Sol menor' };

export function definirAndamento(segPorCompasso) {
  if (eco) eco.delayTime.setTargetAtTime(Math.min(1.9, (segPorCompasso / 4) * 0.75), ctx.currentTime, 0.05); // colcheia pontuada
}

function semente(s) { return () => (s = (s * 16807) % 2147483647) / 2147483647; }
function impulso(seg) {
  const n = Math.floor(ctx.sampleRate * seg);
  const b = ctx.createBuffer(2, n, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const r = semente(12345 + ch), d = b.getChannelData(ch);
    for (let i = 0; i < n; i++) d[i] = (r() * 2 - 1) * Math.pow(1 - i / n, 3.5);
  }
  return b;
}

/* ---------- Harmonia ---------- */
const RAIZ = 50; // Ré
const ACORDES = { // classes de altura relativas a Ré; a primeira é a fundamental
  I: [0, 4, 7, 11], ii: [2, 5, 9, 0], IV: [5, 9, 0, 4], V: [7, 11, 2, 5], vi: [9, 0, 4, 7],
  bVI: [8, 0, 3, 7], bVII: [10, 2, 5, 9], iv: [5, 8, 0, 2],
};
// Frases de 4 compassos, da mais serena (0) à mais tensa (6). Todas terminam no V, que puxa a próxima frase.
const PROGRESSOES = [
  ['I', 'vi', 'IV', 'V'], ['I', 'IV', 'ii', 'V'], ['vi', 'IV', 'I', 'V'], ['vi', 'ii', 'IV', 'V'],
  ['vi', 'bVI', 'IV', 'V'], ['vi', 'bVI', 'bVII', 'V'], ['iv', 'bVI', 'bVII', 'V'],
];

// Anomalia de −0,5 °C (frio) a +1,2 °C (quente) vira 0..1.
const normTemp = a => limitar((a + 0.5) / 1.7, 0, 1);
/* Calor (0 = frio, 1 = quente). Se a interface mandou "calorRel" (posição do ano dentro
   do período escolhido), ele manda: assim o ano mais frio e o mais quente do período
   sempre soam bem diferentes, mesmo quando a diferença real é de décimos de grau. */
export const calor = v => (v.calorRel !== undefined ? v.calorRel : normTemp(v.temp));

/*
 * Andamento: o calor acelera a música (de 72 a 132 batidas por minuto).
 * É o contraste mais fácil de ouvir entre um ano frio e um quente.
 * Sem temperatura, o andamento fica fixo em 100.
 */
export function bpmDe(v) {
  return v.temp === undefined ? BPM : Math.round(70 + calor(v) * 70);
}
/** Duração do compasso para estes valores, respeitando a velocidade escolhida (1 = normal). */
export function duracaoCompasso(v, velocidade = 1) {
  return (60 / bpmDe(v)) * 4 / velocidade;
}

/** Nível de tensão (0–6) a partir da camada que conduz a harmonia. */
export function nivelHarmonico(v) {
  if (v.temp !== undefined) return Math.round(calor(v) * 6);
  if (v.gelo !== undefined) return Math.round((1 - v.gelo) * 6);
  if (v.luzes !== undefined) return Math.round(v.luzes * 3);
  if (v.raios !== undefined) return 1 + Math.round(v.raios * 2);
  if (v.chuva !== undefined) return 2 - Math.round(v.chuva * 2);
  return 0;
}

const pcDe = m => (((m - RAIZ) % 12) + 12) % 12;
function voicing(pcs, piso) { return pcs.map(pc => piso + ((pc + RAIZ - piso) % 12 + 12) % 12).sort((a, b) => a - b); }
function notasDoAcorde(pcs, de, ate) { const r = []; for (let m = de; m <= ate; m++) if (pcs.includes(pcDe(m))) r.push(m); return r; }

/* ---------- Instrumentos ---------- */
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);

function saida(no, { pan = 0, rev = 0.25, eco: e = 0 }) {
  let p = no;
  if (pan) { p = ctx.createStereoPanner(); p.pan.value = pan; no.connect(p); }
  p.connect(ger.seco);
  if (rev) { const s = ctx.createGain(); s.gain.value = rev; p.connect(s); s.connect(ger.rev); }
  if (e) { const s = ctx.createGain(); s.gain.value = e; p.connect(s); s.connect(ger.eco); }
}

function envelope(g, t, vol, ataque, dur, soltura) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + ataque);
  if (dur > ataque) g.gain.setTargetAtTime(vol * 0.7, t + ataque, dur * 0.5);
  g.gain.setTargetAtTime(0.0001, t + dur, soltura / 3);
}

// Oscilador simples com filtro
function voz({ midi, t, dur, tipo = 'sine', vol = 0.2, ataque = 0.01, soltura = 0.2, corte = null, q = 0.7, detune = 0, vibrato = 0, ...destino }) {
  const o = ctx.createOscillator();
  o.type = tipo; o.frequency.value = mtof(midi); o.detune.value = detune;
  if (vibrato) {
    const lfo = ctx.createOscillator(), prof = ctx.createGain();
    lfo.frequency.value = 5; prof.gain.setValueAtTime(0, t); prof.gain.linearRampToValueAtTime(vibrato, t + 0.4);
    lfo.connect(prof); prof.connect(o.detune); lfo.start(t); lfo.stop(t + dur + soltura + 0.1);
  }
  const g = ctx.createGain(); envelope(g, t, vol, ataque, dur, soltura);
  let no = o;
  if (corte) { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = corte; f.Q.value = q; o.connect(f); no = f; }
  no.connect(g); saida(g, destino);
  o.start(t); o.stop(t + dur + soltura + 0.1);
}

// Piano elétrico: fundamental + 2º harmônico que some rápido
function piano({ midi, t, vol = 0.05, dur = 1.2, simples = false, ...destino }) {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.006);
  g.gain.setTargetAtTime(0.0001, t + 0.02, dur / 3);
  const o1 = ctx.createOscillator(); o1.frequency.value = mtof(midi);
  o1.connect(g); o1.start(t); o1.stop(t + dur + 0.3);
  if (!simples) { // 2º harmônico: o "ataque" do piano; nas notas repetidas rápidas, dispensável
    const o2 = ctx.createOscillator(); o2.frequency.value = mtof(midi) * 2;
    const g2 = ctx.createGain(); g2.gain.setValueAtTime(0.35, t); g2.gain.setTargetAtTime(0.0001, t, 0.08);
    o2.connect(g2); g2.connect(g); o2.start(t); o2.stop(t + 0.5);
  }
  saida(g, destino);
}

// Sino: parciais inarmônicos, decaimento longo
function sino({ midi, t, vol = 0.04, ...destino }) {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.004);
  g.gain.setTargetAtTime(0.0001, t + 0.01, 0.7);
  [[1, 1], [2.76, 0.3], [5.4, 0.1]].forEach(([razao, amp]) => {
    const o = ctx.createOscillator(); o.frequency.value = mtof(midi) * razao;
    const ga = ctx.createGain(); ga.gain.value = amp;
    o.connect(ga); ga.connect(g); o.start(t); o.stop(t + 3);
  });
  saida(g, destino);
}

function bufferRuido() {
  if (!bufRuido) {
    bufRuido = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
    const d = bufRuido.getChannelData(0), r = semente(777);
    for (let i = 0; i < d.length; i++) d[i] = r() * 2 - 1;
  }
  return bufRuido;
}
function ruido({ t, dur, vol, freq, tipo = 'bandpass', q = 1.2, ...destino }) {
  const src = ctx.createBufferSource(); src.buffer = bufferRuido();
  const f = ctx.createBiquadFilter(); f.type = tipo; f.frequency.value = freq; f.Q.value = q;
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f); f.connect(g); saida(g, destino);
  src.start(t); src.stop(t + dur + 0.05);
}

// Gota: um "plim" curto que sobe um pouquinho de altura, como o pingo batendo
function gota({ midi, t, vol = 0.04, pan = 0 }) {
  const o = ctx.createOscillator(), g = ctx.createGain(), f = mtof(midi);
  o.type = 'sine';
  o.frequency.setValueAtTime(f * 0.94, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.03);
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.004);
  g.gain.setTargetAtTime(0.0001, t + 0.01, 0.07);
  o.connect(g); saida(g, { pan, rev: 0.45, eco: 0.15 });
  o.start(t); o.stop(t + 0.5);
}
// Garoa: chiado filtrado, macio, que entra e sai com o compasso
function garoa({ t, dur, vol, freq }) {
  const src = ctx.createBufferSource(); src.buffer = bufferRuido(); src.loop = true;
  const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 0.4;
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3200;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + dur * 0.3);
  g.gain.setValueAtTime(vol, t + dur * 0.75); g.gain.linearRampToValueAtTime(0.0001, t + dur * 1.05);
  src.connect(f); f.connect(lp); lp.connect(g); saida(g, { pan: 0, rev: 0.5 });
  src.start(t, (t * 7.3) % 0.4); src.stop(t + dur * 1.1);
}

function bumbo(t, vol) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.frequency.setValueAtTime(100, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
  o.connect(g); saida(g, { rev: 0 });
  o.start(t); o.stop(t + 0.4);
}
function caixa(t, vol) {
  ruido({ t, dur: 0.16, vol, freq: 2200, q: 0.7, rev: 0.4 });
  voz({ midi: 55, t, dur: 0.03, soltura: 0.08, tipo: 'triangle', vol: vol * 0.5, rev: 0.2 });
}
function chimbal(t, vol, pan = 0.25) { ruido({ t, dur: 0.045, vol, freq: 9000, tipo: 'highpass', q: 0.5, pan, rev: 0 }); }

function euclides(k, n) {
  const r = [];
  for (let i = 0; i < n; i++) r.push(Math.floor((i + 1) * k / n) - Math.floor(i * k / n) === 1);
  return r;
}

/* ---------- Melodia: motivos de 4 compassos (ritmo em tempos + passos entre notas do acorde) ---------- */
const MOTIVOS = [
  { r: [0, 1, 1.5, 2, 3], d: [1, 0.5, 0.5, 1, 1], passo: [0, 1, 2, 1, 0] },
  { r: [0, 1.5, 2.5],      d: [1.5, 1, 1.5],      passo: [1, 2, 1] },
  { r: [0, 0.5, 1, 2, 3],  d: [0.5, 0.5, 1, 1, 1], passo: [0, 1, 2, 3, 2] },
  { r: [0, 2],             d: [2, 2],             passo: [1, 0] },
];

/**
 * Toca um compasso (um passo de dados) no instante t, com duração dur.
 * compasso: posição na música (define a posição na frase de 4 compassos).
 * base: toca a "banda" (piano, pad, baixo, bateria). Nas amostras das camadas fica desligada.
 */
export function tocarPasso(v, t, dur, aoRaio = () => {}, { base = true, compasso = 0 } = {}) {
  const tempo = dur / 4, s16 = dur / 16;
  const pos = compasso % 4;
  const nivel = nivelHarmonico(v);
  const acorde = ACORDES[PROGRESSOES[nivel][pos]];
  Object.assign(monitor, { bpm: Math.round(240 / dur), acorde: NOME_ACORDE[PROGRESSOES[nivel][pos]], tensao: nivel, quando: t, dur });
  // Calor (0 = frio, 1 = quente). Sem temperatura, um meio-termo neutro.
  const tn = v.temp !== undefined ? calor(v) : 0.4;
  const energia = v.temp !== undefined ? Math.min(3, Math.floor(tn * 4)) : 1; // 0 calmo, 1 médio, 2 agitado, 3 alarme
  /* Ritmo: a energia define o caráter, mas a quantidade de notas por compasso também depende
     da duração real do compasso. Em períodos longos a música é acelerada (passa de 200 bpm);
     ali, semicolcheias viram ruído e sobrecarregam o áudio. Acima de ~150 bpm cai um nível,
     acima de ~210 bpm, dois. */
  const ritmo = dur < 1.15 ? Math.min(energia, 1) : dur < 1.6 ? Math.min(energia, 2) : energia;
  const dens = Math.min(1, dur / 1.7); // os temas também tocam menos notas quando o compasso é curto
  const inicioMusica = compasso === 0;
  // Mixagem: quanto mais temas juntos, mais baixo cada um, para a soma continuar limpa.
  // Cada tema também tem o seu "andar": baixo e pad embaixo, melodia no meio,
  // arpejo das luzes acima, sinos do gelo no topo.
  const temas = ['temp', 'raios', 'luzes', 'gelo', 'chuva'].filter(c => v[c] !== undefined).length;
  const mix = 1 / (1 + 0.22 * Math.max(0, temas - 1));

  if (base) {
    // Pad: frio = cama escura e longa; quente = aberta, e no extremo ganha um tremor
    voicing(acorde, 57).forEach((m, i) => voz({
      midi: m, t, dur: dur * 0.98, tipo: tn > 0.6 ? 'sawtooth' : 'triangle', vol: tn > 0.6 ? 0.014 : 0.024,
      ataque: inicioMusica || energia === 0 ? 1.0 : 0.25, soltura: 0.8,
      corte: 500 + tn * tn * 2600, detune: i % 2 ? 4 + tn * 5 : -4 - tn * 5, pan: (i - 1.5) * 0.3, rev: 0.6,
    }));
    // Alarme (calor extremo): cordas agudas em colcheias repetidas, como num filme de suspense.
    // A urgência vem do ritmo, não de notas que brigam: só notas do acorde.
    if (energia === 3 && ritmo >= 2) {
      const cordas = voicing(acorde, 74).slice(0, 2);
      for (let k = 0; k < 8; k += LEVE || ritmo < 3 ? 2 : 1) { const i = k % 2; voz({
        midi: cordas[i], t: t + k * tempo / 2, dur: tempo * 0.42, tipo: 'sawtooth', vol: 0.016 * mix, ataque: 0.02, soltura: 0.08,
        corte: 2200, q: 0.7, pan: i ? 0.35 : -0.35, rev: 0.35,
      }); }
    }
    // Piano elétrico: frio = um acorde por compasso; quente = sincopado e repetido
    const notasPiano = voicing(acorde, 60).slice(0, LEVE ? 3 : 4);
    const golpes = [[0], [0, 1.5, 3], [0, 1, 1.5, 2.5, 3], [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5]][ritmo];
    golpes.forEach((b, k) => (k === 0 ? notasPiano : notasPiano.slice(-2)).forEach((m, i) => piano({
      midi: m, t: t + b * tempo + i * 0.008, vol: k === 0 ? 0.045 : 0.03, dur: energia === 0 ? 2.4 : 0.8, simples: k > 0, pan: -0.2, rev: 0.3,
    })));
    // Baixo: frio = uma nota longa; quente = linha andante em colcheias
    const raiz = voicing([acorde[0]], 38)[0];
    const linhas = [
      [[0, raiz, 4]],
      [[0, raiz, 1.45], [1.5, raiz, 0.5], [2, raiz + 7, 1], [3, raiz + 12, 1]], // a 1ª nota segura até a síncope (pausa ali soava como falha)
      [[0, raiz, 0.5], [0.5, raiz, 0.5], [1, raiz + 12, 0.5], [1.5, raiz, 0.5], [2, raiz + 7, 0.5], [2.5, raiz + 7, 0.5], [3, raiz + 12, 0.5], [3.5, raiz + 10, 0.5]],
    ];
    linhas[Math.min(2, ritmo)].forEach(([b, m, d]) => {
      // A última nota do compasso vai até a virada e se solta devagar, emendando no próximo compasso
      const ate = b + d >= 3.95, nd = d * tempo * (ate ? 0.99 : 0.9), sol = ate ? 0.25 : 0.1;
      voz({ midi: m, t: t + b * tempo, dur: nd, tipo: 'triangle', vol: 0.2, soltura: sol, corte: 500 + tn * 600, rev: 0.03 });
      if (!LEVE && energia < 2) voz({ midi: m - 12, t: t + b * tempo, dur: nd, vol: 0.18, soltura: sol, rev: 0 });
    });
    // Bateria: frio = quase nada; quente = bumbo em todo tempo e chimbal em semicolcheias
    if (!inicioMusica) {
      const bumbos = [[0], [0, 2], [0, 1, 2, 3], [0, 1, 2, 2.5, 3]][ritmo];
      bumbos.forEach((b, k) => bumbo(t + b * tempo, k === 0 ? 0.28 : 0.22));
    }
    const sub = [2, 8, 16, 16][ritmo];
    for (let k = 0; k < sub; k++) chimbal(t + k * dur / sub + (k % 2 ? tempo * 0.03 : 0), k % 2 ? 0.024 : 0.014 + energia * 0.004);
  }

  // Texturas de clima, só nos extremos, para o frio e o calor terem "cara" própria:
  // frio = vento agudo e sinos de gelo; calor = prato de ataque e um zumbido grave que pulsa.
  if (v.temp !== undefined && base) {
    if (tn < 0.35) {
      const forca = (0.35 - tn) / 0.35;
      ruido({ t, dur: dur * 0.9, vol: 0.02 + forca * 0.03, freq: 5200 - forca * 1800, q: 6, rev: 0.7, pan: Math.sin(compasso) * 0.7 });
      // Os sinos de frio saem quando o tema Gelo está tocando, para não disputarem o mesmo lugar
      if (v.gelo === undefined) notasDoAcorde(acorde, 84, 96).slice(0, 3).forEach((m, k) => sino({ midi: m, t: t + (k * 1.25 + 0.5) * tempo, vol: (0.02 + forca * 0.025) * mix, pan: k - 1, rev: 0.7 }));
    }
    if (tn > 0.65) {
      const forca = (tn - 0.65) / 0.35;
      ruido({ t, dur: 1.2, vol: 0.025 + forca * 0.035, freq: 7500, tipo: 'highpass', q: 0.4, rev: 0.4 });
      // Grave que cresce ao longo do compasso: peso, sem zumbido
      const raiz = voicing([acorde[0]], 31)[0];
      voz({ midi: raiz, t, dur: dur * 0.95, tipo: 'sine', vol: 0.05 + forca * 0.05, ataque: dur * 0.5, soltura: 0.4, rev: 0.05 });
    }
  }

  // Temperatura → melodia: frio = flauta grave e lenta; quente = violoncelo agudo, áspero e rápido
  if (v.temp !== undefined) {
    const centro = 50 + tn * 30;
    const notas = notasDoAcorde(acorde, 40, 96);
    const variacao = Math.floor(compasso / 4) % 2; // a cada frase, a melodia sobe um degrau
    const ancora = notas.reduce((a, m) => (Math.abs(m - centro) < Math.abs(a - centro) ? m : a), notas[0]);
    const mot = energia === 0 ? MOTIVOS[3] : MOTIVOS[pos];
    const repete = ritmo >= 2 ? 2 : 1; // no calor, o motivo vem em dobro (o dobro de notas)
    for (let rep = 0; rep < repete; rep++) mot.r.forEach((b, k) => {
      const idx = Math.min(notas.length - 1, notas.indexOf(ancora) + mot.passo[k] + variacao + rep);
      const ini = (b / repete + rep * 4 / repete) * tempo;
      voz({
        midi: notas[idx], t: t + ini, dur: (mot.d[k] / repete) * tempo * 0.95,
        tipo: tn < 0.3 ? 'sine' : tn < 0.55 ? 'triangle' : 'sawtooth', vol: (tn < 0.3 ? 0.09 : 0.05) * mix,
        ataque: tn < 0.3 ? 0.15 : 0.03, soltura: 0.25, corte: 900 + tn * tn * 2600, q: 0.8 + tn * 1.5,
        vibrato: 4 + tn * 14, rev: 0.4, eco: 0.12,
      });
    });
  }

  // Raios → caixa no 2 e no 4 + batidas extras no ritmo (mais raios, mais batidas)
  if (v.raios !== undefined) {
    const forca = (0.08 + v.raios * 0.1) * mix;
    caixa(t + tempo, forca); caixa(t + 3 * tempo, forca);
    euclides(Math.round(v.raios * 6 * dens), 16).forEach((b, k) => {
      if (!b || k % 4 === 0) return;
      const tk = t + k * s16;
      ruido({ t: tk, dur: 0.05, vol: (0.03 + v.raios * 0.035) * mix, freq: 2800, q: 1.5, pan: k % 2 ? 0.5 : -0.5, rev: 0.3 });
      aoRaio(tk);
    });
    aoRaio(t + tempo); aoRaio(t + 3 * tempo);
  }

  // Luzes noturnas → arpejo em colcheias; mais luz = mais notas
  if (v.luzes !== undefined) {
    const notas = voicing(acorde, 69); notas.push(notas[0] + 12);
    let i = 0;
    euclides(Math.round((3 + v.luzes * 5) * dens), 8).forEach((b, k) => {
      if (!b) return;
      piano({ midi: notas[[0, 2, 1, 3, 4, 3, 2, 1][i++ % 8]], t: t + k * tempo / 2, vol: (0.03 + v.luzes * 0.02) * mix, dur: 0.6, pan: k % 2 ? 0.4 : 0.1, rev: 0.3, eco: v.gelo !== undefined ? 0.12 : 0.3 });
    });
  }

  // Chuva → garoa (um chiado suave e contínuo) + gotas: notas curtas do acorde, como pingos
  // numa calha. Mais chuva, mais gotas e garoa mais cheia. As gotas ficam entre o arpejo e os sinos.
  if (v.chuva !== undefined) {
    garoa({ t, dur, vol: (0.008 + v.chuva * 0.026) * mix, freq: 900 + v.chuva * 900 });
    const notas = notasDoAcorde(acorde, 76, 91);
    const n = LEVE ? 8 : 16, k0 = (compasso * 5) % n; // o padrão gira a cada compasso, como chuva de verdade
    let i = 0;
    euclides(Math.max(1, Math.round((1 + v.chuva * (LEVE ? 4 : 8)) * dens)), n).forEach((b, k) => {
      if (!b) return;
      const kk = (k + k0) % n;
      gota({ midi: notas[(i++ * 5 + compasso) % notas.length], t: t + kk * dur / n, vol: (0.035 + v.chuva * 0.02) * mix, pan: Math.sin(kk * 2.3 + compasso) * 0.7 });
    });
  }

  // Gelo → sinos; menos gelo = menos sinos; abaixo da metade do maior mês, eles descem e entra um bordão grave
  if (v.gelo !== undefined) {
    const abaixo = v.gelo < LIMIAR_MEDIA_GELO;
    // Com o arpejo das luzes tocando, os sinos sobem uma oitava e ficam nos tempos fortes
    const comLuzes = v.luzes !== undefined;
    const notas = voicing(acorde, (abaixo ? 72 : 79) + (comLuzes ? 12 : 0));
    const passos = comLuzes ? 4 : 8;
    let i = 0;
    euclides(Math.max(1, Math.round(v.gelo * (comLuzes ? 3 : 6) * dens)), passos).forEach((b, k) => {
      if (!b) return;
      sino({ midi: notas[(i++ * 3) % 4], t: t + k * dur / passos, vol: 0.045 * mix, pan: Math.sin(k * 1.7) * 0.6, rev: 0.6, eco: 0.2 });
    });
    if (abaixo) voz({ midi: voicing([acorde[0]], 38)[0], t, dur, tipo: 'triangle', vol: 0.06 * mix, ataque: 0.6, soltura: 0.8, corte: 280, rev: 0.4 });
  }
}

const AMOSTRAS = { temp: { temp: 0.2 }, raios: { raios: 0.7 }, luzes: { luzes: 0.7 }, gelo: { gelo: 0.85 }, chuva: { chuva: 0.7 } };
export function tocarAmostra(id, aoRaio) {
  // Som preparado mas ainda pausado: espera destravar (leva um instante) e então toca
  if (ctx && ctx.state === 'suspended') { ctx.resume().then(() => { if (pronto()) tocarAmostra(id, aoRaio); }).catch(() => {}); return; }
  if (!pronto()) return;
  tocarPasso(AMOSTRAS[id], ctx.currentTime + 0.03, SEG_POR_COMPASSO * 0.75, aoRaio, { base: false });
}

/* ---------- "Aprenda a ouvir": exemplos curtos, um contraste de cada vez ---------- */
const LICOES = {
  // Mesma frase em duas alturas: grave (Ré 2) e aguda (Ré 5)
  grave: t => { [50, 54, 57, 62].forEach((m, k) => piano({ midi: m - 12, t: t + k * 0.45, vol: 0.1, dur: 1.4, rev: 0.25 })); return 2.6; },
  agudo: t => { [50, 54, 57, 62].forEach((m, k) => piano({ midi: m + 24, t: t + k * 0.45, vol: 0.06, dur: 1.4, rev: 0.25 })); return 2.6; },
  // Mesmo tempo de relógio: 6 batidas a 70 bpm contra 12 a 140 bpm
  lento: t => { const b = 60 / 70; for (let k = 0; k < 6; k++) { bumbo(t + k * b, k % 2 ? 0.25 : 0.4); piano({ midi: [62, 66, 69, 66, 62, 57][k], t: t + k * b, vol: 0.06, dur: 0.9 }); } return 6 * b; },
  rapido: t => { const b = 60 / 140; for (let k = 0; k < 12; k++) { bumbo(t + k * b, k % 2 ? 0.25 : 0.4); chimbal(t + (k + 0.5) * b, 0.05); piano({ midi: [62, 66, 69, 66][k % 4], t: t + k * b, vol: 0.06, dur: 0.5 }); } return 12 * b; },
  // Acorde maior com sétima (sereno) contra um acorde com notas vizinhas que se chocam (tenso)
  calmo: t => { voicing(ACORDES.I, 52).forEach(m => voz({ midi: m, t, dur: 2.6, tipo: 'sine', vol: 0.05, ataque: 0.25, soltura: 0.8, rev: 0.4 })); return 3.2; },
  tenso: t => { [50, 56, 57, 63].forEach(m => voz({ midi: m, t, dur: 2.6, tipo: 'sawtooth', vol: 0.03, ataque: 0.05, soltura: 0.6, corte: 1800, vibrato: 25, rev: 0.3 })); return 3.2; },
  // Mesma duração, poucas notas contra muitas
  pouco: t => { [62, 69, 74].forEach((m, k) => piano({ midi: m, t: t + k * 1.0, vol: 0.06, dur: 1.2, rev: 0.3 })); return 3.2; },
  muito: t => { const n = notasDoAcorde(ACORDES.I, 62, 86); for (let k = 0; k < 18; k++) piano({ midi: n[(k * 3) % n.length], t: t + k * (3 / 18), vol: 0.045, dur: 0.6, pan: Math.sin(k) * 0.5, rev: 0.3 }); return 3.2; },
  // Tudo junto: dois compassos de um ano frio e dois de um ano quente
  frio: t => tocarAno({ temp: -0.5, calorRel: 0 }, t),
  quente: t => tocarAno({ temp: 1.2, calorRel: 1 }, t),
  // Gelo acima e abaixo da metade do maior mês: os sinos descem e entra o bordão grave
  gelocheio: t => tocarAno({ gelo: 0.95 }, t, 1),
  gelobaixo: t => tocarAno({ gelo: 0.4 }, t, 1),
};
function tocarAno(v, t, n = 2) {
  const d = duracaoCompasso(v);
  for (let k = 0; k < n; k++) tocarPasso(v, t + k * d, d, () => {}, { base: true, compasso: k });
  return n * d;
}
/** Toca um exemplo de "Aprenda a ouvir" e devolve a duração em segundos. */
export function tocarLicao(id) {
  if (!pronto() || !LICOES[id]) return 0;
  silenciar();
  return LICOES[id](ctx.currentTime + 0.05);
}
