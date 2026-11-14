/* =====================================================================
   Jam Space — interface: liga camadas, tempo, som e disco 3D.
   ===================================================================== */
import { CAMADAS, ORDEM, REGIOES, faixaDisponivel, montarPassos, textoValores, titulo, descricao, limitar, lugarDe, soGelo, soCiclo, unidadeDe, TEXTO, legendaDe } from './dados.js';
import { iniciarMonitor, monitorCamadas, monitorTocando } from './monitor.js';
import { iniciarAudio, tocarPasso, tocarAmostra, agora, pronto, definirAndamento, duracaoCompasso, bpmDe, silenciar, FOLGA, tocarLicao } from './audio.js';

const $ = id => document.getElementById(id);
const reduzido = matchMedia('(prefers-reduced-motion: reduce)').matches;

const ICONES = {
  temp: '<path d="M10 14.5V5a2 2 0 1 1 4 0v9.5a4 4 0 1 1-4 0z"/><path d="M12 9v7"/>',
  raios: '<path d="M13 2 5 13h6l-1 9 8-11h-6z"/>',
  luzes: '<circle cx="6" cy="8" r="1.4"/><circle cx="12" cy="6" r="1.4"/><circle cx="17" cy="10" r="1.4"/><circle cx="9" cy="14" r="1.4"/><circle cx="15" cy="17" r="1.4"/><circle cx="6" cy="19" r="1.4"/>',
  gelo: '<path d="M12 2v20M3.3 7l17.4 10M3.3 17 20.7 7"/><path d="m9 4 3 2 3-2M9 20l3-2 3 2"/>',
  chuva: '<path d="M7 14a4 4 0 0 1 .4-8A5 5 0 0 1 17 7a3.5 3.5 0 0 1 0 7z"/><path d="m8 17-1 3M12 17l-1 3M16 17l-1 3"/>',
};

const estado = {
  rec: { camadas: [], regiao: 'mundo', inicio: null, fim: null },
  passos: [], conflito: '',
  atual: 0, proximo: 0,
  tocando: false, proxT: 0, timer: null, velocidade: 1,
  modo: 'linha',      // 'linha' = ano a ano; 'retrato' = média do período em loop
  media: null,        // valores médios do período (modo retrato)
  compassoN: 0,       // contador de compassos tocados no modo retrato
};
const retrato = () => estado.modo === 'retrato';
const durDe = valores => duracaoCompasso(valores, estado.velocidade);
// Duração média de um passo (para textos que pedem um número só)
const segPorPasso = () => (estado.passos.length ? duracao(true) / estado.passos.length : 2.4);

/*
 * Contraste dentro do período (modo ano a ano): o ano mais frio do período vira o
 * extremo "frio" da música e o mais quente, o extremo "quente". Um quarto do valor
 * continua absoluto, para que 2017–2023 ainda soe mais quente que 1900–1910.
 * No modo retrato, vale só o valor absoluto, porque ali a ideia é comparar períodos.
 */
function marcarCalorRelativo(passos) {
  const temps = passos.map(p => p.valores.temp).filter(t => t !== undefined);
  if (temps.length < 2) return;
  const min = Math.min(...temps), max = Math.max(...temps);
  const abs = t => limitar((t + 0.5) / 1.7, 0, 1);
  passos.forEach(p => {
    const t = p.valores.temp;
    const rel = max - min > 0.05 ? (t - min) / (max - min) : abs(t);
    p.valores.calorRel = 0.25 * abs(t) + 0.75 * rel;
  });
}

/** Média de cada camada ao longo dos passos do período. */
function mediaDe(passos) {
  if (!passos.length) return null;
  const soma = {};
  passos.forEach(p => { for (const [c, v] of Object.entries(p.valores)) if (c !== 'calorRel') soma[c] = (soma[c] || 0) + v; });
  for (const c in soma) soma[c] /= passos.length;
  return soma;
}

/* ---------- Cena 3D (com plano B se não houver WebGL) ---------- */
let cena = null;
try {
  const { criarCena } = await import('./cena.js');
  cena = criarCena($('palco'), { reduzido });
} catch (e) {
  console.warn('3D indisponível:', e);
  $('sem-3d').hidden = false;
}
const cenaFaz = (f, ...a) => cena && cena[f](...a);

/* ---------- Anúncios ---------- */
function anunciar(msg) {
  const el = $('anuncio');
  el.textContent = '';
  setTimeout(() => { el.textContent = msg; }, 30);
  if ($('voz').checked && 'speechSynthesis' in window) {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(msg); u.lang = 'pt-BR';
    speechSynthesis.speak(u);
  }
}

/* ---------- Raios: clarão + vibração ---------- */
function aoRaio(tk) {
  const atraso = (tk - agora()) * 1000;
  cenaFaz('raio', atraso);
  if ($('vibrar').checked && navigator.vibrate) setTimeout(() => navigator.vibrate(25), Math.max(0, atraso));
}

/* ---------- Montagem da interface ---------- */
function montar() {
  const prat = $('prateleira');
  ORDEM.forEach(id => {
    const c = CAMADAS[id];
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'camada'; b.dataset.id = id;
    b.style.setProperty('--cor', c.cor);
    b.setAttribute('aria-pressed', 'false');
    const periodo = c.ciclo ? c.periodo : `${c.inicio} a ${c.fim}`;
    b.setAttribute('aria-label', `${c.nome}, toca ${c.som}, dados de ${periodo}`);
    b.innerHTML = `<span class="disco-mini"><svg viewBox="0 0 24 24" aria-hidden="true">${ICONES[id]}</svg></span>`
      + `<span class="rotulo">${c.nome}<span class="estado" aria-hidden="true">${c.som}</span></span>`;
    b.addEventListener('click', () => {
      if (b.dataset.arrastou) { delete b.dataset.arrastou; return; }
      alternar(id);
    });
    b.addEventListener('focus', () => { if (b.matches(':focus-visible')) tocarAmostra(id, aoRaio); });
    ligarArraste(b, id);
    prat.appendChild(b);
  });
  for (const [id, r] of Object.entries(REGIOES)) $('regiao').add(new Option(r.nome, id));
}

/* ---------- Arrastar um tema para dentro do disco (mouse, toque e caneta) ---------- */
function alvoDoDisco() {
  const r = $('palco').getBoundingClientRect();
  const raio = Math.min(r.width, r.height) * 0.36;
  $('palco').style.setProperty('--alvo', `${Math.round(raio * 2)}px`);
  return { x: r.left + r.width / 2, y: r.top + r.height / 2, raio };
}
function ligarArraste(b, id) {
  let inicio = null, fantasma = null, alvo = null;
  const dentro = e => Math.hypot(e.clientX - alvo.x, e.clientY - alvo.y) < alvo.raio;
  b.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    inicio = { x: e.clientX, y: e.clientY };
    b.setPointerCapture(e.pointerId);
  });
  b.addEventListener('pointermove', e => {
    if (!inicio) return;
    if (!fantasma) {
      if (Math.hypot(e.clientX - inicio.x, e.clientY - inicio.y) < 8) return;
      alvo = alvoDoDisco();
      fantasma = b.cloneNode(true);
      fantasma.classList.add('fantasma'); fantasma.removeAttribute('id');
      fantasma.setAttribute('aria-hidden', 'true');
      document.body.appendChild(fantasma);
      b.classList.add('levantada');
      $('palco').classList.add('arrastando');
    }
    fantasma.style.left = `${e.clientX}px`; fantasma.style.top = `${e.clientY}px`;
    $('palco').classList.toggle('sobre', dentro(e));
  });
  const soltar = (e, cancelado) => {
    if (!inicio) return;
    inicio = null;
    if (!fantasma) return;
    const caiu = !cancelado && dentro(e);
    fantasma.remove(); fantasma = null;
    b.classList.remove('levantada');
    $('palco').classList.remove('arrastando', 'sobre');
    b.dataset.arrastou = '1';               // o "click" que vem depois do arraste é ignorado
    setTimeout(() => delete b.dataset.arrastou, 0);
    if (caiu && !estado.rec.camadas.includes(id)) alternar(id);
  };
  b.addEventListener('pointerup', e => soltar(e, false));
  b.addEventListener('pointercancel', e => soltar(e, true));
}

function alternar(id) {
  iniciarAudio();
  const tinha = estado.rec.camadas.includes(id);
  let aviso = '';
  if (tinha) estado.rec.camadas = estado.rec.camadas.filter(c => c !== id);
  else estado.rec.camadas = [...estado.rec.camadas, id];
  if (!tinha && CAMADAS[id].ciclo && !soCiclo(estado.rec.camadas)) {
    aviso = `${CAMADAS[id].nome} entrou: toca em ciclo os dados de ${CAMADAS[id].periodo}, junto com os outros temas.`;
  }
  estado.rec.inicio = estado.rec.fim = null;
  atualizar();
  if (!tinha) { tocarAmostra(id, aoRaio); cenaFaz('onda', CAMADAS[id].cor); }
  mudanca(aviso || (tinha
    ? `${CAMADAS[id].nome} saiu: o ${CAMADAS[id].som} parou de tocar.`
    : `${CAMADAS[id].nome} entrou: agora toca ${CAMADAS[id].som}.`));
  anunciar(`${CAMADAS[id].nome} ${tinha ? 'saiu do' : 'entrou no'} disco. ${aviso} ${descricao(estado.rec, estado.passos, estado.conflito, segPorPasso())}`);
}

function preencherAnos(sel, lo, hi, valor) {
  if (sel.dataset.faixa !== `${lo}-${hi}`) {
    sel.length = 0;
    for (let a = lo; a <= hi; a++) sel.add(new Option(a, a));
    sel.dataset.faixa = `${lo}-${hi}`;
  }
  sel.value = valor;
}

function atualizar() {
  if (estado.tocando) pausar(false);
  const { rec } = estado;
  const faixa = faixaDisponivel(rec.camadas.length ? rec.camadas : ['temp']);
  const anual = rec.camadas.length > 0 && !soCiclo(rec.camadas) && faixa.lo <= faixa.hi;

  if (anual) {
    const { lo, hi } = faixa;
    if (rec.inicio === null) { rec.inicio = lo; rec.fim = hi; }
    rec.inicio = limitar(rec.inicio, lo, hi);
    rec.fim = limitar(rec.fim, rec.inicio, hi);
    preencherAnos($('inicio'), lo, hi, rec.inicio);
    preencherAnos($('fim'), lo, hi, rec.fim);
  }
  $('inicio').disabled = $('fim').disabled = !anual;
  $('regiao').disabled = soGelo(rec.camadas);

  ({ passos: estado.passos, conflito: estado.conflito } = montarPassos(rec));
  estado.media = mediaDe(estado.passos);
  marcarCalorRelativo(estado.passos);
  estado.atual = estado.proximo = 0;

  const n = estado.passos.length;
  const linha = $('linha');
  linha.max = Math.max(0, n - 1); linha.value = 0; linha.disabled = !n || retrato();
  linha.hidden = retrato();

  document.querySelectorAll('.camada').forEach(b => {
    const ligado = rec.camadas.includes(b.dataset.id);
    b.setAttribute('aria-pressed', String(ligado));
    b.querySelector('.estado').textContent = ligado ? 'no disco' : CAMADAS[b.dataset.id].som;
  });
  $('dica').classList.toggle('some', rec.camadas.length > 0);
  $('descricao').textContent = descricao(rec, estado.passos, estado.conflito, segPorPasso());

  const primeira = rec.camadas[0];
  cenaFaz('definirCamadas', rec.camadas);
  monitorCamadas(rec.camadas);
  cenaFaz('definirFaixas', retrato() ? 1 : n);
  cenaFaz('definirRotulo', { texto: titulo(rec, estado.passos), cor: primeira ? CAMADAS[primeira].cor : '#2848a8' });

  // Resumo do disco: o que você está montando
  $('receita-titulo').textContent = n ? titulo(rec, estado.passos) : 'Disco vazio';
  const unid = unidadeDe(rec.camadas);
  estado.subPadrao = !n ? (estado.conflito || 'A Terra também pode ser ouvida. Toque num tema ou arraste para o disco.')
    : retrato() ? `Retrato: a média de ${n} ${unid} vira uma música em loop · ${bpmDe(estado.media)} batidas por minuto`
    : `${n} ${unid} = ${n} compassos de música · ${duracao()}`;
  $('receita-sub').textContent = estado.subPadrao;
  const periodoTxt = anual ? `${rec.inicio}–${rec.fim}` : (n > 1 ? `${estado.passos[0].curto}–${estado.passos[n - 1].curto}` : '');
  $('resumo-ajustes').textContent = [lugarDe(rec), periodoTxt, retrato() ? 'retrato' : 'ano a ano'].filter(Boolean).join(' · ');

  if (n && retrato()) mostrarRetrato(true);
  else if (n) mostrar(0, false, true);
  else {
    $('ano').textContent = '';
    $('medidores').innerHTML = '';
    linha.removeAttribute('aria-valuetext');
    cenaFaz('definirProgresso', 0, false);
  }
  atualizarPlay();
  salvarNaURL();
}

function duracao(emSegundos = false) {
  const total = estado.passos.reduce((a, p) => a + durDe(p.valores), 0);
  if (emSegundos) return total;
  const s = Math.round(total);
  return s >= 60 ? `${Math.floor(s / 60)} min ${s % 60} s` : `${s} s`;
}

/* Mostra, em destaque, o que acabou de mudar e o efeito disso na música. */
let timerMudanca = null;
function mudanca(msg) {
  const caixa = $('receita');
  $('receita-sub').textContent = msg;
  caixa.classList.remove('mudou'); void caixa.offsetWidth; caixa.classList.add('mudou');
  clearTimeout(timerMudanca);
  timerMudanca = setTimeout(() => { $('receita-sub').textContent = estado.subPadrao; }, 6000);
}

/* Medidores: o valor de cada camada no passo atual, com a cor do instrumento */
const fmtTemp = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1, signDisplay: 'always' });
const MEDIDA = {
  temp: v => ({ pct: limitar((v + 0.6) / 2.4, 0, 1), txt: `${fmtTemp.format(v)} °C` }),
  raios: v => ({ pct: v, txt: TEXTO.raios(v) }),
  luzes: v => ({ pct: v, txt: TEXTO.luzes(v) }),
  gelo: v => ({ pct: v, txt: TEXTO.gelo(v) }),
  chuva: v => ({ pct: v, txt: TEXTO.chuva(v) }),
};
function desenharMedidores(valores, passo = null) {
  $('medidores').dataset.n = ORDEM.filter(c => valores[c] !== undefined).length;
  $('medidores').innerHTML = ORDEM.filter(c => valores[c] !== undefined).map(c => {
    const { pct, txt } = MEDIDA[c](valores[c]);
    const leg = legendaDe(c, valores[c], estado.rec.regiao, passo);
    return `<li class="m-${c}" style="--cor:${CAMADAS[c].cor}"><svg class="m-icone" viewBox="0 0 24 24" aria-hidden="true">${ICONES[c]}</svg><span class="m-nome">${CAMADAS[c].nome}</span><span class="m-barra"><i style="width:${Math.round(pct * 100)}%"></i></span><span class="m-valor">${txt}</span><span class="m-legenda">${leg}</span></li>`;
  }).join('');
}

/* ---------- Mostrar um passo ---------- */
function mostrar(i, automatico, silencioso = false) {
  const p = estado.passos[i];
  if (!p) return;
  estado.atual = i;
  const texto = textoValores(p.valores);
  $('ano').textContent = p.rotulo;
  $('compasso').textContent = `compasso ${i + 1} de ${estado.passos.length}`;
  desenharMedidores(p.valores, p);
  const linha = $('linha');
  linha.value = i;
  linha.setAttribute('aria-valuetext', `${p.rotulo}: ${texto}`);
  const n = estado.passos.length;
  cenaFaz('definirValores', p.valores);
  cenaFaz('definirProgresso', n > 1 ? i / (n - 1) : 0, true);
  if (silencioso) return;
  if (!automatico || i === 0 || i === n - 1 || (n > 12 && i % 10 === 0)) anunciar(`${p.rotulo}: ${texto}`);
}

/* ---------- Modo retrato: um único "passo" com a média do período ---------- */
function mostrarRetrato(silencioso = false) {
  const p = estado.passos, m = estado.media;
  if (!p.length) return;
  const periodo = p.length > 1 ? `${p[0].rotulo} a ${p[p.length - 1].rotulo}` : p[0].rotulo;
  $('ano').textContent = p.length > 1 ? `${p[0].curto}–${p[p.length - 1].curto}` : p[0].curto;
  $('compasso').textContent = `média de ${p.length} ${unidadeDe(estado.rec.camadas)}`;
  desenharMedidores(m);
  cenaFaz('definirValores', m);
  if (!silencioso) anunciar(`Retrato de ${periodo}, em média: ${textoValores(m)}.`);
}

/* ---------- Reprodução ---------- */
// Atualizações de tela agendadas para quando cada compasso começa; canceladas na pausa
const timersTela = new Set();
function depois(ms, f) {
  const id = setTimeout(() => { timersTela.delete(id); f(); }, Math.max(0, ms));
  timersTela.add(id);
}

async function tocar() {
  if (!estado.passos.length) return;
  await iniciarAudio();          // no celular, espera o som destravar antes de agendar
  if (estado.tocando) return;    // dois toques rápidos no play não começam duas vezes
  silenciar();
  if (estado.proximo >= estado.passos.length) estado.proximo = 0;
  estado.tocando = true; monitorTocando(true);
  estado.compassoN = 0;
  definirAndamento(retrato() ? durDe(estado.media) : durDe(estado.passos[estado.proximo].valores));
  if (retrato()) mostrarRetrato();
  estado.proxT = agora() + 0.15;
  estado.timer = setInterval(agendar, 50);
  agendar();
  cenaFaz('definirTocando', true);
  atualizarPlay();
}

function pausar(avisar = true, cortar = true) {
  estado.tocando = false; monitorTocando(false);
  clearInterval(estado.timer);
  timersTela.forEach(clearTimeout); timersTela.clear();
  if (cortar) silenciar();       // corta as notas que já estavam agendadas (no fim do disco, deixa o eco acabar)
  cenaFaz('definirTocando', false);
  atualizarPlay();
  if (avisar) anunciar('Pausado.');
}

function agendar() {
  // Se o celular atrasou (aba em segundo plano, 3D pesado), recomeça do agora em vez de
  // despejar de uma vez todas as notas atrasadas
  if (estado.tocando && estado.proxT < agora()) estado.proxT = agora() + 0.05;
  if (retrato()) {
    // Retrato: a mesma média, compasso após compasso, até pausar. As frases variam sozinhas.
    const dur = durDe(estado.media);
    while (estado.tocando && estado.proxT < agora() + FOLGA) {
      const n = estado.compassoN++;
      tocarPasso(estado.media, estado.proxT, dur, aoRaio, { compasso: n });
      const t0 = estado.proxT;
      depois((t0 - agora()) * 1000, () => cenaFaz('definirProgresso', (n % 8) / 7, true));
      estado.proxT += dur;
    }
    return;
  }
  while (estado.tocando && estado.proxT < agora() + FOLGA) {
    if (estado.proximo >= estado.passos.length) {
      clearInterval(estado.timer);
      const fimEm = (estado.proxT - agora()) * 1000;
      depois(fimEm, () => { if (estado.tocando) { pausar(false, false); anunciar('Fim do disco.'); } });
      return;
    }
    const i = estado.proximo;
    const dur = durDe(estado.passos[i].valores); // o calor acelera: cada ano tem o seu andamento
    tocarPasso(estado.passos[i].valores, estado.proxT, dur, aoRaio, { compasso: i });
    depois((estado.proxT - agora()) * 1000, () => mostrar(i, true));
    estado.proximo++;
    estado.proxT += dur;
  }
}

function atualizarPlay() {
  const b = $('play'), ha = estado.passos.length > 0;
  b.disabled = !ha;
  b.classList.toggle('tocando', estado.tocando);
  b.setAttribute('aria-label', estado.tocando ? 'Pausar' : (ha ? `Tocar o disco: ${titulo(estado.rec, estado.passos)}` : 'Tocar'));
}

/* ---------- URL: mesma receita, mesma música ---------- */
function salvarNaURL() {
  const r = estado.rec, partes = [];
  if (r.camadas.length) partes.push(`c=${r.camadas.join(',')}`);
  if (r.regiao !== 'mundo') partes.push(`r=${r.regiao}`);
  if (r.inicio !== null && !soCiclo(r.camadas)) partes.push(`p=${r.inicio}-${r.fim}`);
  if (retrato()) partes.push('m=retrato');
  history.replaceState(null, '', partes.length ? `#${partes.join('&')}` : location.pathname);
}

function lerDaURL() {
  const q = new URLSearchParams(location.hash.slice(1));
  estado.rec.camadas = [...new Set((q.get('c') || '').split(',').filter(id => CAMADAS[id]))];
  estado.rec.regiao = REGIOES[q.get('r')] ? q.get('r') : 'mundo';
  const p = (q.get('p') || '').match(/^(\d{4})-(\d{4})$/);
  estado.rec.inicio = p ? +p[1] : null;
  estado.rec.fim = p ? +p[2] : null;
  $('regiao').value = estado.rec.regiao;
  estado.modo = q.get('m') === 'retrato' ? 'retrato' : 'linha';
  document.querySelector(`input[name="modo"][value="${estado.modo}"]`).checked = true;
}

/* ---------- Eventos ---------- */
function ligar() {
  $('play').addEventListener('click', () => (estado.tocando ? pausar() : tocar()));

  // Linha do tempo: ao arrastar, a tela acompanha na hora, mas o som toca no máximo
  // a cada 220 ms e sempre corta o anterior (antes, os compassos se empilhavam).
  let ultimoSom = 0, somPendente = null, anoTocado = -1;
  const ouvirAno = () => {
    somPendente = null;
    const i = +$('linha').value;
    if (i === anoTocado || !pronto() || !estado.passos[i]) return;
    anoTocado = i; ultimoSom = performance.now();
    silenciar();
    const v = estado.passos[i].valores;
    tocarPasso(v, agora() + 0.03, durDe(v), aoRaio, { compasso: i });
  };
  $('linha').addEventListener('input', e => {
    if (estado.tocando) pausar(false);
    iniciarAudio();
    const i = +e.target.value;
    estado.proximo = i;
    mostrar(i, false);
    clearTimeout(somPendente);
    const espera = 220 - (performance.now() - ultimoSom);
    somPendente = setTimeout(ouvirAno, Math.max(0, espera));
  });
  $('linha').addEventListener('pointerdown', () => { anoTocado = -1; iniciarAudio(); });

  $('regiao').addEventListener('change', e => {
    estado.rec.regiao = e.target.value; atualizar();
    const msg = `Lugar: ${REGIOES[estado.rec.regiao].nome}. Os mesmos instrumentos, agora tocando os dados dessa região.`;
    mudanca(msg); anunciar(msg);
  });
  const mudouPeriodo = () => {
    atualizar();
    const msg = retrato()
      ? `Período: ${estado.rec.inicio} a ${estado.rec.fim}. O retrato agora é a média desses ${estado.passos.length} anos: ${textoValores(estado.media)}.`
      : `Período: ${estado.rec.inicio} a ${estado.rec.fim}. Cada ano é um compasso: ${estado.passos.length} compassos, ${duracao()}.`;
    mudanca(msg); anunciar(msg);
  };
  $('inicio').addEventListener('change', e => {
    estado.rec.inicio = +e.target.value;
    if (estado.rec.fim < estado.rec.inicio) estado.rec.fim = estado.rec.inicio;
    mudouPeriodo();
  });
  $('fim').addEventListener('change', e => {
    estado.rec.fim = +e.target.value;
    if (estado.rec.inicio > estado.rec.fim) estado.rec.inicio = estado.rec.fim;
    mudouPeriodo();
  });

  document.querySelectorAll('input[name="modo"]').forEach(r => r.addEventListener('change', e => {
    estado.modo = e.target.value; atualizar();
    const msg = retrato()
      ? 'Modo retrato: o período inteiro vira uma música só, feita da média dos dados. Toca em loop.'
      : 'Modo ano a ano: cada ano é um compasso, e você ouve a mudança ao longo do tempo.';
    mudanca(msg); anunciar(msg);
  }));

  $('velocidade').addEventListener('change', e => {
    estado.velocidade = +e.target.value;
    $('descricao').textContent = descricao(estado.rec, estado.passos, estado.conflito, segPorPasso());
    atualizar();
    mudanca(`Velocidade: ${e.target.selectedOptions[0].text.toLowerCase()}.${retrato() ? '' : ` O disco agora dura ${duracao()}.`}`);
  });
  $('descrever').addEventListener('click', () => {
    const p = estado.passos[estado.atual];
    anunciar(descricao(estado.rec, estado.passos, estado.conflito, segPorPasso()) + (p ? ` Agora: ${p.rotulo}, ${textoValores(p.valores)}.` : ''));
  });
  $('compartilhar').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(location.href); anunciar('Link do disco copiado.'); }
    catch { anunciar('Não deu para copiar. O link está na barra de endereço.'); }
  });

  const disco = $('disco');
  $('abrir-disco').addEventListener('click', () => disco.showModal());
  $('fechar-disco').addEventListener('click', () => disco.close());
  disco.addEventListener('click', e => { if (e.target === disco) disco.close(); });

  const dialogo = $('opcoes');
  $('abrir-opcoes').addEventListener('click', () => dialogo.showModal());
  $('fechar-opcoes').addEventListener('click', () => dialogo.close());
  dialogo.addEventListener('click', e => { if (e.target === dialogo) dialogo.close(); }); // clique fora fecha

  const info = $('info');
  $('abrir-info').addEventListener('click', () => info.showModal());
  $('fechar-info').addEventListener('click', () => info.close());
  info.addEventListener('click', e => { if (e.target === info) info.close(); });

  // "Aprenda a ouvir": cada botão toca um exemplo curto; o disco pausa enquanto isso
  const ouvir = $('ouvir');
  let fimLicao = 0;
  const pararLicao = () => { clearTimeout(fimLicao); ouvir.querySelectorAll('.tocando').forEach(x => x.classList.remove('tocando')); };
  $('abrir-ouvir').addEventListener('click', () => ouvir.showModal());
  $('fechar-ouvir').addEventListener('click', () => ouvir.close());
  ouvir.addEventListener('click', e => { if (e.target === ouvir) ouvir.close(); });
  ouvir.addEventListener('close', () => { pararLicao(); silenciar(); });
  ouvir.querySelectorAll('[data-licao], [data-amostra]').forEach(b => b.addEventListener('click', async () => {
    if (estado.tocando) pausar(false);
    await iniciarAudio();
    pararLicao();
    b.classList.add('tocando');
    let seg;
    if (b.dataset.licao) seg = tocarLicao(b.dataset.licao);
    else { silenciar(); tocarAmostra(b.dataset.amostra, () => {}); seg = 2; }
    fimLicao = setTimeout(pararLicao, seg * 1000 + 300);
  }));

  // Monitor do som em telas menores: abre e fecha um painel por cima, sem parar a música
  const mon = $('monitor'), botaoMon = $('abrir-monitor');
  const abrirMonitor = sim => {
    mon.classList.toggle('aberto', sim);
    botaoMon.setAttribute('aria-expanded', String(sim));
    if (sim) $('fechar-monitor').focus(); else if (document.activeElement && mon.contains(document.activeElement)) botaoMon.focus();
  };
  botaoMon.addEventListener('click', () => abrirMonitor(!mon.classList.contains('aberto')));
  $('fechar-monitor').addEventListener('click', () => abrirMonitor(false));
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && mon.classList.contains('aberto')) abrirMonitor(false); });

  addEventListener('hashchange', () => { lerDaURL(); atualizar(); });

  // Atalhos de teclado: a página inteira funciona sem mouse e sem enxergar
  document.addEventListener('keydown', e => {
    if (e.ctrlKey || e.metaKey || e.altKey || document.querySelector('dialog[open]')) return;
    const alvo = e.target, digitando = alvo.matches('input, select, textarea');
    const k = e.key.toLowerCase();
    if (['1', '2', '3', '4', '5'].includes(k) && !digitando) { e.preventDefault(); alternar(ORDEM[+k - 1]); }
    else if (k === ' ' && !alvo.matches('button, input, select, textarea')) { e.preventDefault(); if (!$('play').disabled) $('play').click(); }
    else if (k === 'd' && !digitando) $('descrever').click();
    else if (k === 'l' && !digitando) $('disco').showModal();
    else if (k === 'i' && !digitando) $('info').showModal();
    else if (k === 'a' && !digitando) $('ouvir').showModal();
  });
}

montar();
lerDaURL();
ligar();
atualizar();
iniciarMonitor();
