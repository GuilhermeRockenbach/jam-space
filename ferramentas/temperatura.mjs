// Lê os quadros do SVS 5207 (GISTEMP, projeção Robinson) e devolve a anomalia média por região.
import { lerPNG } from './png.mjs';

const RX = [1, .9986, .9954, .99, .9822, .973, .96, .9427, .9216, .8962, .8679, .835, .7986, .7597, .7186, .6732, .6213, .5722, .5322];
const RY = [0, .062, .124, .186, .248, .31, .372, .434, .4958, .5571, .6176, .6769, .7346, .7903, .8435, .8936, .9394, .9761, 1];
const interp = (t, lat) => { const a = Math.min(Math.abs(lat) / 5, 17.999), i = Math.floor(a), f = a - i; return t[i] + (t[i + 1] - t[i]) * f; };

// Escala de cores: coluna central da barra, de cima (+máx) a baixo (−máx).
export function lerEscala(caminho, maxC) {
  const c = lerPNG(caminho), x = Math.round(c.w / 2), cores = [];
  for (let y = 0; y < c.h; y++) { const i = (y * c.w + x) * c.cpp; if (c.px[i + 3] > 250) cores.push([c.px[i], c.px[i + 1], c.px[i + 2]]); }
  return cores.map((rgb, k) => ({ rgb, v: maxC - (2 * maxC * k) / (cores.length - 1) }));
}

// Cor do mapa -> valor. O mapa tem sombreamento, então comparamos a direção da cor (p ≈ k·cor da escala).
function valorDe(p, escala) {
  let melhor = null, erro = 1e9;
  for (const e of escala) {
    const [r, g, b] = e.rgb, ee = r * r + g * g + b * b;
    const k = Math.min(1.15, Math.max(0.6, (p[0] * r + p[1] * g + p[2] * b) / ee));
    const d = (p[0] - k * r) ** 2 + (p[1] - k * g) ** 2 + (p[2] - k * b) ** 2;
    if (d < erro) { erro = d; melhor = e.v; }
  }
  return erro < 300 ? melhor : null; // linhas de costa e fronteiras ficam de fora
}

export const REGIOES = {
  mundo: () => true,
  brasil: (lat, lon) => lat > -33 && lat < 5 && lon > -73 && lon < -35,
  atlsul: (lat, lon) => lat > -50 && lat < -5 && lon > -35 && lon < 10,
  artico: (lat) => lat >= 66,
};

export function lerQuadro(caminho, escala, caixa) {
  const m = lerPNG(caminho), { x0, x1, y0, y1 } = caixa;
  const xc = (x0 + x1) / 2, yc = (y0 + y1) / 2, W2 = (x1 - x0) / 2, H2 = (y1 - y0) / 2;
  const soma = {}, peso = {};
  for (const r in REGIOES) { soma[r] = 0; peso[r] = 0; }
  for (let lat = -89.5; lat < 90; lat += 1) for (let lon = -179.5; lon < 180; lon += 1) {
    const x = Math.round(xc + W2 * interp(RX, lat) * lon / 180);
    const y = Math.round(yc - H2 * Math.sign(lat) * interp(RY, lat));
    const i = (y * m.w + x) * m.cpp, v = valorDe([m.px[i], m.px[i + 1], m.px[i + 2]], escala);
    if (v === null) continue;
    const w = Math.cos(lat * Math.PI / 180);
    for (const r in REGIOES) if (REGIOES[r](lat, lon)) { soma[r] += v * w; peso[r] += w; }
  }
  const out = {};
  for (const r in REGIOES) out[r] = peso[r] ? +(soma[r] / peso[r]).toFixed(3) : null;
  return out;
}
