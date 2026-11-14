// Leitor de PNG sem dependências (8 bits, RGB/RGBA, com ou sem entrelaçamento Adam7).
import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';

function desfiltrar(raw, off, w, h, cpp) {
  const linha = w * cpp, out = Buffer.alloc(w * h * cpp);
  for (let y = 0; y < h; y++) {
    const f = raw[off + y * (linha + 1)], src = off + y * (linha + 1) + 1, dst = y * linha;
    for (let x = 0; x < linha; x++) {
      const a = x >= cpp ? out[dst + x - cpp] : 0;
      const c = y && x >= cpp ? out[dst - linha + x - cpp] : 0;
      const up = y ? out[dst - linha + x] : 0;
      let v = raw[src + x];
      if (f === 1) v += a; else if (f === 2) v += up; else if (f === 3) v += (a + up) >> 1;
      else if (f === 4) { const pp = a + up - c, pa = Math.abs(pp - a), pb = Math.abs(pp - up), pc = Math.abs(pp - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? up : c; }
      out[dst + x] = v & 255;
    }
  }
  return { out, usados: h ? h * (linha + 1) : 0 };
}

const ADAM7 = [[0, 0, 8, 8], [4, 0, 8, 8], [0, 4, 4, 8], [2, 0, 4, 4], [0, 2, 2, 4], [1, 0, 2, 2], [0, 1, 1, 2]];

export function lerPNG(caminho) {
  const b = readFileSync(caminho);
  let p = 8, w, h, tipo, prof, entrel; const idat = [];
  while (p < b.length) {
    const len = b.readUInt32BE(p); const t = b.toString('latin1', p + 4, p + 8);
    const d = b.subarray(p + 8, p + 8 + len);
    if (t === 'IHDR') { w = d.readUInt32BE(0); h = d.readUInt32BE(4); prof = d[8]; tipo = d[9]; entrel = d[12]; }
    else if (t === 'IDAT') idat.push(d);
    else if (t === 'IEND') break;
    p += 12 + len;
  }
  if (prof !== 8 || ![2, 6].includes(tipo)) throw new Error(`PNG não suportado: prof ${prof} tipo ${tipo}`);
  const cpp = tipo === 6 ? 4 : 3;
  const raw = inflateSync(Buffer.concat(idat));
  if (!entrel) return { w, h, cpp, px: desfiltrar(raw, 0, w, h, cpp).out };
  const px = Buffer.alloc(w * h * cpp); let off = 0;
  for (const [x0, y0, dx, dy] of ADAM7) {
    const pw = Math.ceil((w - x0) / dx), ph = Math.ceil((h - y0) / dy);
    if (pw <= 0 || ph <= 0) continue;
    const { out, usados } = desfiltrar(raw, off, pw, ph, cpp); off += usados;
    for (let y = 0; y < ph; y++) for (let x = 0; x < pw; x++)
      out.copy(px, ((y0 + y * dy) * w + x0 + x * dx) * cpp, (y * pw + x) * cpp, (y * pw + x + 1) * cpp);
  }
  return { w, h, cpp, px };
}
