// Recorta um PNG RGBA na área não transparente (com margem) e salva.
// Uso: node ferramentas/render/recortar.mjs <entrada.png> <saida.png> [margem=8]
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { lerPNG } from '../png.mjs';

const [entrada, saida, margemTxt] = process.argv.slice(2);
const m = lerPNG(entrada), margem = +(margemTxt || 8);
if (m.cpp !== 4) throw new Error('precisa de PNG com transparência (RGBA)');
let x0 = m.w, y0 = m.h, x1 = -1, y1 = -1;
for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
  if (m.px[(y * m.w + x) * 4 + 3] > 8) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
}
if (x1 < 0) throw new Error('imagem toda transparente');
x0 = Math.max(0, x0 - margem); y0 = Math.max(0, y0 - margem);
x1 = Math.min(m.w - 1, x1 + margem); y1 = Math.min(m.h - 1, y1 + margem);
const w = x1 - x0 + 1, h = y1 - y0 + 1, cru = Buffer.alloc(h * (1 + w * 4));
for (let y = 0; y < h; y++) {
  cru[y * (1 + w * 4)] = 0; // filtro "nenhum"
  m.px.subarray(((y + y0) * m.w + x0) * 4, ((y + y0) * m.w + x0 + w) * 4)
    .forEach((v, i) => { cru[y * (1 + w * 4) + 1 + i] = v; });
}
const crcTab = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc = b => { let c = 0xffffffff; for (const v of b) c = crcTab[(c ^ v) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const bloco = (tipo, dados) => {
  const t = Buffer.from(tipo), len = Buffer.alloc(4), c = Buffer.alloc(4);
  len.writeUInt32BE(dados.length); c.writeUInt32BE(crc(Buffer.concat([t, dados])));
  return Buffer.concat([len, t, dados, c]);
};
const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
writeFileSync(saida, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), bloco('IHDR', ihdr), bloco('IDAT', deflateSync(cru)), bloco('IEND', Buffer.alloc(0))]));
console.log(`${saida}: ${w}x${h}`);
