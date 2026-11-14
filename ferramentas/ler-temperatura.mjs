// Baixa o último quadro de cada ano do SVS 5207, lê e apaga.
// Uso: node ferramentas/ler-temperatura.mjs <pasta-fontes> <saida.json>
import { readFileSync, writeFileSync, unlinkSync, mkdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { lerEscala, lerQuadro } from './temperatura.mjs';

const BASE = 'https://svs.gsfc.nasa.gov/vis/a000000/a005200/a005207/frames/3840x2160_16x9_30p/';
const [fontes, saida] = process.argv.slice(2);
const anos = readFileSync(`${fontes}/time.txt`, 'utf8').trim().split(/\r?\n/).map(Number);
const ultimo = {}; anos.forEach((a, i) => { ultimo[a] = i; });
const escala = lerEscala(`${fontes}/giss_navy_anomaly_Vertical-both.png`, 2);
const caixa = { x0: 53, x1: 3792, y0: 25, y1: 2059 };
mkdirSync(`${fontes}/temp`, { recursive: true });

// Retoma de onde parou, se já houver saída
const res = existsSync(saida) ? JSON.parse(readFileSync(saida, 'utf8')).anos : {};
for (const [ano, q] of Object.entries(ultimo)) {
  if (res[ano]) continue;
  const nome = `GISTEMP_Map_4K${String(q).padStart(3, '0')}.png`, arq = `${fontes}/temp/${nome}`;
  execFileSync('curl', ['-sSf', '--retry', '3', '-o', arq, BASE + nome]);
  res[ano] = { quadro: q, ...lerQuadro(arq, escala, caixa) };
  unlinkSync(arq);
  console.log(ano, JSON.stringify(res[ano]));
  writeFileSync(saida, JSON.stringify({
    fonte: 'NASA SVS 5207 (GISTEMP), último quadro de cada ano, 3840x2160; média móvel de 24 meses; anomalia em °C sobre 1951–1980; escala ±2 °C',
    anos: res,
  }));
}
