// Lê quadros do SVS 5149 (GEOS-FP Precipitation and Clouds, mapa plano 2048x1024)
// e devolve, por região, a fração da área com chuva e a intensidade média (posição na legenda, 0 a 1).
// Uso: node ferramentas/chuva.mjs <pasta-dos-quadros> <saida.json>
import { readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { lerPNG } from './png.mjs';

const [pasta, saida] = process.argv.slice(2);

// Legenda: linha do meio da barra "plain" (528x165), da esquerda (chuva fraca) à direita (forte).
function lerLegenda(caminho) {
  const c = lerPNG(caminho), y = Math.round(c.h * 0.58), cores = [];
  for (let x = 0; x < c.w; x++) {
    const i = (y * c.w + x) * c.cpp, [r, g, b] = [c.px[i], c.px[i + 1], c.px[i + 2]];
    const a = c.cpp === 4 ? c.px[i + 3] : 255;
    if (a < 250 || (r > 235 && g > 235 && b > 235)) continue; // fundo branco ou transparente
    cores.push([r, g, b]);
  }
  return cores.map((rgb, k) => ({ rgb, v: k / (cores.length - 1) }));
}

// Só cores saturadas da legenda contam como chuva; nuvens (cinza/branco), terra e mar ficam de fora.
function valorDe(r, g, b, legenda) {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  if (mx - mn < 70) return null; // cinza, branco, nuvem
  let melhor = null, erro = 1e9;
  for (const e of legenda) {
    const d = (r - e.rgb[0]) ** 2 + (g - e.rgb[1]) ** 2 + (b - e.rgb[2]) ** 2;
    if (d < erro) { erro = d; melhor = e.v; }
  }
  return erro < 900 ? melhor : null;
}

export const REGIOES = {
  mundo: () => true,
  brasil: (lat, lon) => lat > -33 && lat < 5 && lon > -73 && lon < -35,
  atlsul: (lat, lon) => lat > -50 && lat < -5 && lon > -35 && lon < 10,
  artico: (lat) => lat >= 66,
};

const legenda = lerLegenda(join(pasta, 'escala.png'));
console.log('cores na legenda:', legenda.length);
const quadros = readdirSync(pasta).filter(f => /^\d{8}\.png$/.test(f)).sort();
const resultado = { fonte: 'NASA SVS 5149, GEOS-FP Precipitation and Clouds (Earth Information Center, painel Earth Now). Quadros 2048x1024, mapa plano. Valor: fração da área com chuva (0 a 1) e intensidade média na legenda (0 a 1).', quadros: {} };

for (const f of quadros) {
  const m = lerPNG(join(pasta, f));
  const soma = {}, peso = {}, chove = {};
  for (const r in REGIOES) { soma[r] = 0; peso[r] = 0; chove[r] = 0; }
  for (let lat = -89.75; lat < 90; lat += 0.5) for (let lon = -179.75; lon < 180; lon += 0.5) {
    const x = Math.floor(((lon + 180) / 360) * m.w), y = Math.floor(((90 - lat) / 180) * m.h);
    // fora: logotipo (canto superior esquerdo) e data (canto inferior esquerdo)
    if ((y < 0.06 * m.h && x < 0.18 * m.w) || (y > 0.9 * m.h && x < 0.26 * m.w)) continue;
    const i = (y * m.w + x) * m.cpp, v = valorDe(m.px[i], m.px[i + 1], m.px[i + 2], legenda);
    const w = Math.cos(lat * Math.PI / 180);
    for (const r in REGIOES) if (REGIOES[r](lat, lon)) {
      peso[r] += w;
      if (v !== null) { chove[r] += w; soma[r] += v * w; }
    }
  }
  const out = {};
  for (const r in REGIOES) out[r] = { area: +(chove[r] / peso[r]).toFixed(4), intensidade: chove[r] ? +(soma[r] / chove[r]).toFixed(3) : 0 };
  resultado.quadros[f] = out;
  console.log(f, JSON.stringify(out));
}
writeFileSync(saida, JSON.stringify(resultado, null, 1));
