// Máscara terra/mar (grade de 1°) a partir dos quadros do SVS 5149 (Blue Marble da NASA ao fundo).
// Um ponto é mar se aparece azul-escuro em algum quadro (as nuvens mudam, o mar fica).
// Usada só para alinhar outros mapas da NASA (luzes, raios) à mesma grade de latitude e longitude.
import { readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { lerPNG } from './png.mjs';
const [pasta, saida] = process.argv.slice(2);
const mar = new Uint8Array(180 * 360);
for (const f of readdirSync(pasta).filter(f => /^\d{8}\.png$/.test(f))) {
  const m = lerPNG(join(pasta, f));
  for (let j = 0; j < 180; j++) for (let i = 0; i < 360; i++) {
    const x = Math.floor((i + 0.5) / 360 * m.w), y = Math.floor((j + 0.5) / 180 * m.h), k = (y * m.w + x) * m.cpp;
    const r = m.px[k], g = m.px[k + 1], b = m.px[k + 2];
    if (b > r + 15 && b >= g && r + g + b < 330) mar[j * 360 + i] = 1;
  }
}
// Logotipo da NASA no canto superior esquerdo dos quadros (77°N a 90°N, 180°W a 116°W):
// ali não há terra (é o Oceano Ártico ao norte do Alasca), então vira mar.
for (let j = 0; j < 13; j++) for (let i = 0; i < 64; i++) mar[j * 360 + i] = 1;
writeFileSync(saida, JSON.stringify({ linhas: 180, colunas: 360, nota: 'linha 0 = 89,5°N; coluna 0 = 179,5°W; 1 = terra', terra: Array.from(mar, v => 1 - v).join('') }));
console.log('terra:', Array.from(mar).filter(v => !v).length, 'de', mar.length);
