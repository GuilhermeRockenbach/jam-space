// Gera uma miniatura PNG (fator inteiro) de um quadro, para conferência visual.
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { lerPNG } from './png.mjs';
const [ent, sai, f = '8'] = process.argv.slice(2), k = +f;
const m = lerPNG(ent), w = Math.floor(m.w / k), h = Math.floor(m.h / k);
const raw = Buffer.alloc((w * 3 + 1) * h);
for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
  const i = ((y * k) * m.w + x * k) * m.cpp, o = y * (w * 3 + 1) + 1 + x * 3;
  raw[o] = m.px[i]; raw[o + 1] = m.px[i + 1]; raw[o + 2] = m.px[i + 2];
}
const crc = (buf) => { let c = ~0; for (const b of buf) { c ^= b; for (let j = 0; j < 8; j++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1)); } return ~c >>> 0; };
const bloco = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
const ih = Buffer.alloc(13); ih.writeUInt32BE(w, 0); ih.writeUInt32BE(h, 4); ih[8] = 8; ih[9] = 2;
writeFileSync(sai, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), bloco('IHDR', ih), bloco('IDAT', deflateSync(raw)), bloco('IEND', Buffer.alloc(0))]));
