// Gera 3 opções de logotipo do Jam Space (símbolo em SVG) e uma prancha de comparação.
// Uso: node ferramentas/render/logos.mjs  → entregas/logos/*.svg e entregas/logos/prancha.html
import { mkdirSync, writeFileSync } from 'node:fs';

const CEU = '#0a1030', SOL = '#ffc85c', TEXTO = '#eef1ff', SUAVE = '#aab4dd';
const MAR = '#1f8fa0', FUNDO = '#163a7a', VERDE = '#3f7a4e', AREIA = '#c9b27a', GELO = '#f2f6fb', QUENTE = '#ff7a59';
const f = n => +n.toFixed(2);
const pol = (cx, cy, r, a) => [cx + r * Math.cos(a), cy + r * Math.sin(a)];

// ---------- A: Disco Terra — o vinil visto de cima, o rótulo é a Terra, a faixa dourada é a música tocando
function discoTerra() {
  const sulcos = [53, 48.5, 44, 39.5].map((r, i) => `<circle cx="60" cy="60" r="${r}" fill="none" stroke="#24306e" stroke-width="${i % 2 ? 0.9 : 1.4}"/>`).join('');
  const [x0, y0] = pol(60, 60, 51, -Math.PI * 0.62), [x1, y1] = pol(60, 60, 51, Math.PI * 0.08);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
  <defs><radialGradient id="a-mar" cx="0.38" cy="0.32" r="0.8"><stop offset="0" stop-color="${MAR}"/><stop offset="1" stop-color="${FUNDO}"/></radialGradient>
  <clipPath id="a-rot"><circle cx="60" cy="60" r="33"/></clipPath></defs>
  <circle cx="60" cy="60" r="57" fill="#121a46"/>${sulcos}
  <path d="M${f(x0)} ${f(y0)} A51 51 0 0 1 ${f(x1)} ${f(y1)}" fill="none" stroke="${SOL}" stroke-width="4" stroke-linecap="round"/>
  <g clip-path="url(#a-rot)">
    <circle cx="60" cy="60" r="33" fill="url(#a-mar)"/>
    <g transform="translate(60 60) scale(1.3) translate(-60 -60)">
    <path d="M38 50c6-7 14-9 19-6 4 2 3 7-1 9-5 3-6 9-11 10-5 1-10-6-7-13z" fill="${VERDE}"/>
    <path d="M62 58c5-3 12-2 15 3 3 5 1 12-4 16-4 3-8 1-9-4-1-4-5-6-2-15z" fill="${AREIA}"/>
    <path d="M60 30c8 0 15 2 20 6-6 2-13 3-20 2-6 1-13 0-19-2 5-4 12-6 19-6z" fill="${GELO}"/>
    </g>
  </g>
  <circle cx="60" cy="60" r="33" fill="none" stroke="${CEU}" stroke-opacity="0.5" stroke-width="1.5"/>
  <circle cx="60" cy="60" r="3" fill="${TEXTO}"/>
</svg>`;
}

// ---------- B: Órbita sonora — um planeta cujo anel é uma onda de som
function orbitaSonora() {
  const pts = [];
  for (let k = 0; k <= 240; k++) {
    const a = (k / 240) * Math.PI * 2, janela = Math.max(0, Math.sin(a)) ** 3; // a onda aparece só na frente do planeta
    pts.push([60 + 55 * Math.cos(a), 60 + 15 * Math.sin(a) + 7 * janela * Math.sin(a * 16)]);
  }
  const rot = (x, y) => { const t = -0.32, dx = x - 60, dy = y - 60; return [60 + dx * Math.cos(t) - dy * Math.sin(t), 60 + dx * Math.sin(t) + dy * Math.cos(t)]; };
  const caminho = (ini, fim) => pts.slice(ini, fim + 1).map(([x, y], i) => { const [a, b] = rot(x, y); return `${i ? 'L' : 'M'}${f(a)} ${f(b)}`; }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
  <defs><radialGradient id="b-pl" cx="0.35" cy="0.3" r="0.85"><stop offset="0" stop-color="#3d6ee0"/><stop offset="0.55" stop-color="#2848a8"/><stop offset="1" stop-color="${CEU}"/></radialGradient>
  <linearGradient id="b-anel" x1="0" x2="1"><stop offset="0" stop-color="${QUENTE}"/><stop offset="1" stop-color="${SOL}"/></linearGradient></defs>
  <path d="${caminho(120, 240)}" fill="none" stroke="url(#b-anel)" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" opacity="0.55"/>
  <circle cx="60" cy="60" r="30" fill="url(#b-pl)"/>
  <path d="M41 48c7-6 16-7 21-3 3 3 0 7-4 8-6 1-8 7-13 6-4-1-7-6-4-11z" fill="${MAR}" opacity="0.9"/>
  <path d="M64 62c5-2 11 0 13 5 1 5-3 10-8 11-4 1-6-3-6-7 0-3-3-6 1-9z" fill="${MAR}" opacity="0.9"/>
  <path d="${caminho(0, 120)}" fill="none" stroke="url(#b-anel)" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;
}

// ---------- C: Agulha J — monograma: o braço do toca-discos desenha o J e a agulha pousa num planeta
function agulhaJ() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
  <defs><radialGradient id="c-pl" cx="0.35" cy="0.3" r="0.9"><stop offset="0" stop-color="${MAR}"/><stop offset="1" stop-color="${FUNDO}"/></radialGradient></defs>
  <rect x="2" y="2" width="116" height="116" rx="28" fill="${CEU}"/>
  <circle cx="52" cy="72" r="30" fill="url(#c-pl)"/>
  <path d="M30 70c6-4 13-4 16 0 2 4-2 7-6 8-5 1-8-2-10-8z" fill="${VERDE}"/>
  <path d="M56 80c4-3 10-2 12 2 1 4-2 8-6 8-3 0-5-3-6-10z" fill="${AREIA}"/>
  <path d="M38 47c9-5 21-5 29 0-9 3-20 3-29 0z" fill="${GELO}"/>
  <circle cx="52" cy="72" r="36" fill="none" stroke="${SUAVE}" stroke-opacity="0.35" stroke-width="1.2" stroke-dasharray="2 3"/>
  <circle cx="86" cy="26" r="7" fill="${TEXTO}"/>
  <path d="M86 26V68a18 18 0 0 1-18 18h-3" fill="none" stroke="${SOL}" stroke-width="7" stroke-linecap="round"/>
  <rect x="55" y="80.5" width="11" height="11" rx="2.5" fill="${SOL}"/>
</svg>`;
}

const OPCOES = [
  { id: 'a-disco-terra', nome: 'A · Disco Terra', ideia: 'O vinil visto de cima: o rótulo é a Terra e a faixa dourada é a música tocando. Fala direto do disco 3D do site.', svg: discoTerra() },
  { id: 'b-orbita-sonora', nome: 'B · Órbita sonora', ideia: 'Um planeta cujo anel é uma onda de som, do quente (coral) ao sol (dourado). Mais "espacial", lê bem pequeno.', svg: orbitaSonora() },
  { id: 'c-agulha-j', nome: 'C · Agulha J', ideia: 'Monograma: o braço do toca-discos forma o J e a agulha pousa no planeta. Bom como ícone de app e favicon.', svg: agulhaJ() },
];

const pasta = 'entregas/logos';
mkdirSync(pasta, { recursive: true });
for (const o of OPCOES) writeFileSync(`${pasta}/${o.id}.svg`, o.svg);

const marca = (o, cor, sub) => `<div class="marca">${o.svg}<div><div class="nome" style="color:${cor}">Jam Space</div><div class="sub" style="color:${sub}">a Terra em música · dados NASA</div></div></div>`;
writeFileSync(`${pasta}/prancha.html`, `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700&family=Unbounded:wght@500;700&display=swap" rel="stylesheet">
<style>
  body { margin: 0; background: #e9ecf7; font-family: "Atkinson Hyperlegible", sans-serif; width: 1800px; }
  .op { display: grid; grid-template-columns: 300px 1fr 1fr 150px; align-items: center; gap: 28px; padding: 26px 40px; border-bottom: 1px solid #c9cfe6; }
  .op h2 { font-family: Unbounded, sans-serif; font-size: 26px; margin: 0 0 8px; color: ${CEU}; }
  .op p { margin: 0; font-size: 17px; line-height: 1.45; color: #39406a; }
  .cx { border-radius: 18px; padding: 28px 30px; }
  .escuro { background: ${CEU}; } .claro { background: #fff; }
  .marca { display: flex; align-items: center; gap: 22px; }
  .marca svg { width: 110px; height: 110px; flex: none; }
  .nome { font-family: Unbounded, sans-serif; font-weight: 700; font-size: 46px; letter-spacing: -0.5px; line-height: 1; }
  .sub { font-size: 17px; margin-top: 8px; }
  .icones { display: flex; align-items: end; gap: 14px; }
  .icones svg:nth-child(1) { width: 64px; height: 64px; } .icones svg:nth-child(2) { width: 32px; height: 32px; } .icones svg:nth-child(3) { width: 16px; height: 16px; }
</style></head><body>
${OPCOES.map(o => `<section class="op"><div><h2>${o.nome}</h2><p>${o.ideia}</p></div>
<div class="cx escuro">${marca(o, TEXTO, SUAVE)}</div><div class="cx claro">${marca(o, CEU, '#4a527c')}</div>
<div class="icones">${o.svg}${o.svg}${o.svg}</div></section>`).join('\n')}
</body></html>`);
console.log('ok');
