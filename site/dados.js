/* =====================================================================
   Camadas, regiões e valores. TODOS os valores vêm de leituras de
   visualizações da NASA (Earth Information Center / SVS), em dados/*.json:
     Temperatura  SVS 5207  (GISTEMP)                     1881–2023, por ano
     Raios        SVS 5011  (LIS na ISS)                   2017–2023, por ano
     Luzes        SVS 5313  (Black Marble, VIIRS)          2012–2023, por ano
     Chuva        SVS 5149  (GEOS-FP, painel Earth Now)    24 retratos, 29/10–13/11/2026
     Gelo         SVS 5099  (gelo marinho diário, Ártico)  24 meses, mai/2021–abr/2023
   Não há valores inventados: se um arquivo não carregar, o tema sai do app.
   ===================================================================== */
import { L, LOCALE } from './lingua.js';

export const CAMADAS = {
  temp:  { nome: L('Temperatura', 'Temperature'), som: L('baixo e acordes', 'bass and chords'), inicio: 1881, fim: 2023, cor: '#ff6f4a', svs: '5207' },
  raios: { nome: L('Raios', 'Lightning'), som: L('percussão', 'percussion'), inicio: 2017, fim: 2023, cor: '#8fb8ff', svs: '5011' },
  chuva: { nome: L('Chuva', 'Rain'), som: L('chuvisco', 'drizzle'), cor: '#57d6b0', svs: '5149', ciclo: true, periodo: L('29 de outubro a 13 de novembro de 2026', '29 October to 13 November 2026') },
  luzes: { nome: L('Luzes noturnas', 'Night lights'), som: L('melodia', 'arpeggio'), inicio: 2012, fim: 2023, cor: '#f7f3b0', svs: '5313' },
  gelo:  { nome: L('Gelo do Ártico', 'Arctic sea ice'), som: L('sinos', 'bells'), cor: '#9fe6ff', svs: '5099', ciclo: true, periodo: L('maio de 2021 a abril de 2023', 'May 2021 to April 2023') },
};
const TODAS = ['temp', 'raios', 'luzes', 'gelo', 'chuva'];

export const REGIOES = {
  mundo:  { nome: L('Mundo', 'World') },
  brasil: { nome: L('Brasil', 'Brazil') },
  atlsul: { nome: L('Atlântico Sul', 'South Atlantic') },
  artico: { nome: L('Ártico', 'Arctic') },
};

export const limitar = (v, a, b) => Math.min(b, Math.max(a, v));

async function ler(nome) {
  try { const r = await fetch(`dados/${nome}.json`); return r.ok ? await r.json() : null; } catch { return null; }
}
const [jTemp, jRaios, jLuzes, jChuva, jGelo] = await Promise.all(['temperatura', 'raios', 'luzes', 'chuva', 'gelo'].map(ler));
const DADOS = { temp: jTemp?.anos, raios: jRaios?.anos, luzes: jLuzes?.anos, chuva: jChuva?.quadros, gelo: jGelo?.meses };

/** Temas com dados carregados. Sem arquivo, o tema não aparece. */
export const ORDEM = TODAS.filter(c => DADOS[c]);
export const FONTE_TEMP = DADOS.temp ? 'nasa' : 'sem dados';

for (const c of ['temp', 'raios', 'luzes']) if (DADOS[c]) {
  const anos = Object.keys(DADOS[c]).map(Number);
  CAMADAS[c].inicio = Math.min(...anos); CAMADAS[c].fim = Math.max(...anos);
}

/* Escalas: o som recebe 0 a 1. Raios, luzes e chuva usam a raiz da razão pelo maior valor lido
   (em qualquer região), para os valores pequenos não sumirem; o gelo usa a fração do maior mês.
   O valor real é recuperado com bruto = v² × máximo, para mostrar na tela. */
const maxDe = (obj, f) => Math.max(...Object.values(obj).flatMap(f));
export const MAXIMO = {
  raios: DADOS.raios ? maxDe(DADOS.raios, a => Object.values(a)) : 1,
  luzes: DADOS.luzes ? maxDe(DADOS.luzes, a => ['mundo', 'brasil', 'atlsul', 'artico'].map(r => a[r].luz)) : 1,
  chuva: DADOS.chuva ? maxDe(DADOS.chuva, q => Object.values(q).map(r => r.area)) : 1,
  gelo: DADOS.gelo ? Math.max(...DADOS.gelo.map(m => m.mkm2)) : 1,
};
export const bruto = (c, v) => (c === 'gelo' ? v : v * v) * MAXIMO[c];

/** Abaixo da metade do maior mês do período: os sinos descem e entra o bordão grave. */
export const LIMIAR_MEDIA_GELO = 0.5;

const QUADROS_CHUVA = DADOS.chuva ? Object.keys(DADOS.chuva).sort() : [];
const MESES = L(['jan.', 'fev.', 'mar.', 'abr.', 'mai.', 'jun.', 'jul.', 'ago.', 'set.', 'out.', 'nov.', 'dez.'],
  ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']);

// Quadro 1 do SVS 5149 = 29/10/2026, 9 h UTC; cada quadro é uma hora. Mostramos no horário de Brasília (UTC−3).
function rotuloChuva(i) {
  const n = Number(QUADROS_CHUVA[i].slice(0, 8));
  const d = new Date(Date.UTC(2026, 9, 29, 9 - 3) + (n - 1) * 3600e3);
  const dia = d.getUTCDate(), mes = d.getUTCMonth(), h = d.getUTCHours();
  return L({ rotulo: `${dia} de ${MESES[mes].replace('.', '')}. de 2026, ${h} h`, curto: `${dia}/${mes + 1} ${h}h` },
    { rotulo: `${MESES[mes]} ${dia}, 2026, ${h}:00 (UTC−3)`, curto: `${mes + 1}/${dia} ${h}h` });
}
function rotuloGelo(i) {
  const [a, m] = DADOS.gelo[i].mes.split('-').map(Number);
  return { rotulo: L(`${MESES[m - 1]} de ${a}`, `${MESES[m - 1]} ${a}`), curto: `${MESES[m - 1]} ${String(a).slice(2)}` };
}

const valorTemp = (ano, reg) => DADOS.temp?.[ano]?.[reg];
const valorRaios = (ano, reg) => { const f = DADOS.raios?.[ano]?.[reg]; return f === undefined ? undefined : Math.sqrt(f / MAXIMO.raios); };
const valorLuzes = (ano, reg) => { const f = DADOS.luzes?.[ano]?.[reg]?.luz; return f === undefined ? undefined : Math.sqrt(f / MAXIMO.luzes); };
const valorChuva = (i, reg) => Math.sqrt(DADOS.chuva[QUADROS_CHUVA[i % QUADROS_CHUVA.length]][reg].area / MAXIMO.chuva);
const valorGelo = i => DADOS.gelo[i % DADOS.gelo.length].mkm2 / MAXIMO.gelo;
const tamanhoCiclo = c => c === 'chuva' ? QUADROS_CHUVA.length : DADOS.gelo.length;

const ehCiclo = c => CAMADAS[c].ciclo;
/** Só temas de ciclo (chuva, gelo) no disco: a música anda retrato a retrato, sem anos. */
export const soCiclo = camadas => camadas.length > 0 && camadas.every(ehCiclo);
export const soGelo = camadas => camadas.length === 1 && camadas[0] === 'gelo';
export const unidadeDe = camadas => !soCiclo(camadas) ? L('anos', 'years') : camadas.includes('gelo') ? L('meses', 'months') : L('retratos', 'snapshots');

export function faixaDisponivel(todas) {
  // Chuva e gelo não limitam o período: junto com os temas anuais, eles tocam em ciclo.
  const camadas = todas.filter(c => !ehCiclo(c));
  if (!camadas.length) return { lo: 1, hi: 0 };
  return {
    lo: Math.max(...camadas.map(c => CAMADAS[c].inicio)),
    hi: Math.min(...camadas.map(c => CAMADAS[c].fim)),
  };
}

// Em qual retrato de chuva e mês de gelo está cada passo (para a legenda dos medidores)
function cicloDe(camadas, i) {
  const c = {};
  if (camadas.includes('chuva')) c.chuva = rotuloChuva(i % QUADROS_CHUVA.length).rotulo;
  if (camadas.includes('gelo')) c.gelo = rotuloGelo(i % DADOS.gelo.length).rotulo;
  return c;
}

function valoresCiclo(camadas, i, regiao) {
  const v = {};
  if (camadas.includes('chuva')) v.chuva = valorChuva(i, regiao);
  if (camadas.includes('gelo')) v.gelo = valorGelo(i);
  return v;
}

/** Receita → lista de passos (um por ano; ou por retrato, só com chuva e gelo). */
export function montarPassos(rec) {
  const { camadas, regiao } = rec;
  if (!camadas.length) return { passos: [], conflito: '' };

  if (soCiclo(camadas)) {
    const n = Math.max(...camadas.map(tamanhoCiclo));
    const rot = camadas.includes('gelo') ? rotuloGelo : rotuloChuva;
    return { passos: Array.from({ length: n }, (_, i) => ({ ...rot(i), ciclo: cicloDe(camadas, i), valores: valoresCiclo(camadas, i, regiao) })), conflito: '' };
  }

  const { lo, hi } = faixaDisponivel(camadas);
  if (lo > hi) {
    const nomes = camadas.filter(c => !ehCiclo(c)).map(c => `${CAMADAS[c].nome} (${CAMADAS[c].inicio}–${CAMADAS[c].fim})`).join(L(' e ', ' and '));
    return { passos: [], conflito: L(`Não há anos em comum entre ${nomes}. Tire uma das camadas.`, `${nomes} have no years in common. Remove one of the layers.`) };
  }
  const passos = [];
  for (let ano = rec.inicio; ano <= rec.fim; ano++) {
    const valores = valoresCiclo(camadas, ano - rec.inicio, regiao); // chuva e gelo em ciclo, um retrato por compasso
    if (camadas.includes('temp')) valores.temp = valorTemp(ano, regiao);
    if (camadas.includes('raios')) { const r = valorRaios(ano, regiao); if (r !== undefined) valores.raios = r; }
    if (camadas.includes('luzes')) valores.luzes = valorLuzes(ano, regiao);
    passos.push({ rotulo: String(ano), curto: String(ano), ciclo: cicloDe(camadas, ano - rec.inicio), valores });
  }
  return { passos, conflito: '' };
}

/* ---------- Textos (com as unidades reais) ---------- */
const fmt1 = new Intl.NumberFormat(LOCALE, { minimumFractionDigits: 1, maximumFractionDigits: 1, signDisplay: 'always' });
const pct = (x, casas = 1) => `${(x * 100).toLocaleString(LOCALE, { minimumFractionDigits: casas, maximumFractionDigits: casas })}%`;
export const TEXTO = {
  temp: v => `${fmt1.format(v)} °C`,
  raios: v => L(`${pct(bruto('raios', v), 2)} da área`, `${pct(bruto('raios', v), 2)} of the area`),
  luzes: v => L(`${Math.round(v * 10)} de 10`, `${Math.round(v * 10)} out of 10`),
  chuva: v => L(`${pct(bruto('chuva', v), 0)} da área`, `${pct(bruto('chuva', v), 0)} of the area`),
  gelo: v => L(`${Math.round(v * 100)}% do maior mês`, `${Math.round(v * 100)}% of the largest month`),
};

/* Legenda de cada medidor: o que o número quer dizer, em palavras. */
const AREA = L({ mundo: 'do planeta', brasil: 'do Brasil', atlsul: 'do Atlântico Sul', artico: 'do Ártico' },
  { mundo: 'of the planet', brasil: 'of Brazil', atlsul: 'of the South Atlantic', artico: 'of the Arctic' });
function ondeMaximo() {
  const r = { luzes: '', gelo: '' };
  if (DADOS.luzes) for (const [ano, a] of Object.entries(DADOS.luzes)) for (const reg of ['mundo', 'brasil', 'atlsul', 'artico'])
    if (a[reg].luz === MAXIMO.luzes) r.luzes = L(`${REGIOES[reg].nome} em ${ano}`, `${REGIOES[reg].nome} in ${ano}`);
  if (DADOS.gelo) r.gelo = rotuloGelo(DADOS.gelo.findIndex(m => m.mkm2 === MAXIMO.gelo)).rotulo;
  return r;
}
const MAX_EM = ondeMaximo();
const fmtAbs = new Intl.NumberFormat(LOCALE, { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** passo: o passo atual (null no modo retrato, que mostra a média). */
export function legendaDe(c, v, regiao, passo) {
  const area = AREA[regiao];
  if (c === 'temp') {
    if (Math.abs(v) < 0.05) return L('igual à média de 1951–1980', 'same as the 1951–1980 average');
    return L(`${fmtAbs.format(Math.abs(v))} °C ${v < 0 ? 'mais frio' : 'mais quente'} que a média de 1951–1980`,
      `${fmtAbs.format(Math.abs(v))} °C ${v < 0 ? 'colder' : 'warmer'} than the 1951–1980 average`);
  }
  if (c === 'raios') return L(`${regiao === 'mundo' ? 'do planeta (entre 52°S e 52°N)' : area} com raios vistos da ISS, média do ano`,
    `${regiao === 'mundo' ? 'of the planet (between 52°S and 52°N)' : area} with lightning seen from the ISS, yearly mean`);
  if (c === 'luzes') return L(`brilho das luzes à noite; 10 = ${MAX_EM.luzes}, o mais iluminado`, `brightness of the lights at night; 10 = ${MAX_EM.luzes}, the brightest`);
  if (c === 'chuva') return passo?.ciclo?.chuva
    ? L(`${area} chovendo em ${passo.ciclo.chuva}`, `${area} with rain on ${passo.ciclo.chuva}`)
    : L(`${area} chovendo, média dos retratos`, `${area} with rain, mean of the snapshots`);
  if (c === 'gelo') return passo?.ciclo?.gelo
    ? L(`área de gelo marinho em ${passo.ciclo.gelo}; 100% = ${MAX_EM.gelo}`, `sea-ice area in ${passo.ciclo.gelo}; 100% = ${MAX_EM.gelo}`)
    : L(`área de gelo marinho, média dos meses; 100% = ${MAX_EM.gelo}`, `sea-ice area, mean of the months; 100% = ${MAX_EM.gelo}`);
  return '';
}

export function textoValores(v) {
  const partes = [];
  if (v.temp !== undefined) partes.push(L(`${fmt1.format(v.temp)} °C em relação a 1951–1980`, `${fmt1.format(v.temp)} °C relative to 1951–1980`));
  if (v.raios !== undefined) partes.push(L(`raios em ${TEXTO.raios(v.raios)}`, `lightning over ${TEXTO.raios(v.raios)}`));
  if (v.luzes !== undefined) partes.push(L(`luzes ${TEXTO.luzes(v.luzes)}`, `lights ${TEXTO.luzes(v.luzes)}`));
  if (v.chuva !== undefined) partes.push(L(`chuva em ${TEXTO.chuva(v.chuva)}`, `rain over ${TEXTO.chuva(v.chuva)}`));
  if (v.gelo !== undefined) partes.push(L(`gelo em ${TEXTO.gelo(v.gelo)}${v.gelo < LIMIAR_MEDIA_GELO ? ', abaixo da metade' : ''}`,
    `sea ice at ${TEXTO.gelo(v.gelo)}${v.gelo < LIMIAR_MEDIA_GELO ? ', below half' : ''}`));
  return partes.join('; ');
}

export function lugarDe(rec) {
  return soGelo(rec.camadas) ? REGIOES.artico.nome : REGIOES[rec.regiao].nome;
}

export function titulo(rec, passos) {
  if (!rec.camadas.length) return '';
  const nomes = ORDEM.filter(c => rec.camadas.includes(c)).map(c => CAMADAS[c].nome).join(' + ');
  const periodo = passos.length > 1 ? `${passos[0].curto}–${passos[passos.length - 1].curto}` : (passos[0]?.curto ?? '');
  return `${lugarDe(rec)}, ${nomes}${periodo ? `, ${periodo}` : ''}`;
}

export function descricao(rec, passos, conflito, segPorPasso) {
  if (!rec.camadas.length) return L('Disco vazio. Escolha uma camada para começar.', 'Empty disc. Choose a layer to start.');
  if (conflito) return conflito;
  const s = Math.round(passos.length * segPorPasso);
  const dur = s >= 60 ? `${Math.floor(s / 60)} min ${s % 60} s` : `${s} s`;
  let texto = L(`Disco ${titulo(rec, passos)}. ${passos.length} passos, ${dur}.`, `Disc: ${titulo(rec, passos)}. ${passos.length} steps, ${dur}.`);
  const a = passos[0].valores, b = passos[passos.length - 1].valores;
  if (a.temp !== undefined && passos.length > 1) texto += L(` A temperatura vai de ${fmt1.format(a.temp)} a ${fmt1.format(b.temp)} °C.`, ` Temperature goes from ${fmt1.format(a.temp)} to ${fmt1.format(b.temp)} °C.`);
  if (rec.camadas.includes('raios') && rec.regiao === 'artico') texto += L(' Sem raios no Ártico: a órbita da ISS só vai até cerca de 52° de latitude.', ' No lightning in the Arctic: the ISS orbit only reaches about 52° latitude.');
  if (rec.camadas.includes('chuva') && !soCiclo(rec.camadas)) texto += L(' A chuva toca em ciclo os retratos de 29 de outubro a 13 de novembro de 2026.', ' Rain loops the snapshots from 29 October to 13 November 2026.');
  if (rec.camadas.includes('gelo') && !soCiclo(rec.camadas)) texto += L(' O gelo toca em ciclo os meses de maio de 2021 a abril de 2023.', ' Sea ice loops the months from May 2021 to April 2023.');
  return texto;
}
