/* =====================================================================
   Cena 3D (EXEMPLO "planeta no vinil"): o disco é a Terra vista de cima do
   Polo Norte. Centro = Ártico, borda = 60°S. Terra e mar vêm da máscara tirada
   do Blue Marble das imagens do NASA SVS 5149; o relevo é estilizado.
   - Ao entrar a primeira camada, os continentes sobem do mar, de dentro para fora.
   - O oceano é uma resina azul sobre os sulcos, mais escura onde é fundo.
   - Gelo: uma placa de gelo marinho com fendas flutua no centro; o tamanho
     segue a área do mês lida no SVS 5099.
   - Temperatura: cor da terra (verde → ocre), brilho nos sulcos e faíscas.
   - Gelo: geleiras crescem da borda (polo) para dentro e recuam quando o
     gelo diminui. O anel amarelo marca a metade do maior mês do período.
   - Luzes noturnas: cidades acendem sobre os continentes.
   - Raios: nuvens de tempestade com descargas sincronizadas ao som.
   - Chuva: riscos de água caindo sobre o disco; mais chuva, mais riscos.
   Puramente visual: tudo o que aparece aqui também é descrito em texto.
   ===================================================================== */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const R = 2.4;            // raio do vinil
const R_ROTULO = 0.82;    // raio do rótulo central
const TOPO = 0.021;       // altura da face de cima do vinil
const T_IN = R_ROTULO * 1.1, T_OUT = R * 0.985; // anel do terreno
const MAX_CHUVA = 700, MAX_LUZES = 900, MAX_CALOR = 520, MAX_GEADA = 260, N_RAIOS = 6, N_NUVENS = 9;
const LIMIAR_MEDIA_GELO = 0.5; // metade do maior mês lido no SVS 5099

import { MAXIMO } from './dados.js';
import { L } from './lingua.js';

/* ---------- Planeta: máscara terra/mar (1°) e campos derivados ---------- */
const MASC = await (await fetch('dados/mascara-terra.json')).json();
const MW = 360, MH = 180, TERRA_M = new Uint8Array(MW * MH);
for (let i = 0; i < MW * MH; i++) TERRA_M[i] = MASC.terra[i] === '1' ? 1 : 0;
function distanciaCosta(alvo) { // distância (em graus) até a costa, por busca em largura
  const d = new Float32Array(MW * MH).fill(1e9), fila = [];
  for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
    const i = y * MW + x; if (TERRA_M[i] !== alvo) continue;
    if ([[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]].some(([a, b]) => b >= 0 && b < MH && TERRA_M[b * MW + ((a + MW) % MW)] !== alvo)) { d[i] = 0.5; fila.push(i); }
  }
  for (let k = 0; k < fila.length; k++) {
    const i = fila[k], x = i % MW, y = (i / MW) | 0;
    for (const [a, b] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
      if (b < 0 || b >= MH) continue; const j = b * MW + ((a + MW) % MW);
      if (TERRA_M[j] === alvo && d[j] > d[i] + 1) { d[j] = d[i] + 1; fila.push(j); }
    }
  }
  return d;
}
const SD = (() => {
  const dT = distanciaCosta(1), dM = distanciaCosta(0), a = new Float32Array(MW * MH), b = new Float32Array(MW * MH);
  for (let i = 0; i < MW * MH; i++) a[i] = TERRA_M[i] ? Math.min(dT[i], 14) : -Math.min(dM[i], 14);
  for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
    let t = 0, n = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const yy = y + dy; if (yy < 0 || yy >= MH) continue; t += a[yy * MW + ((x + dx + MW) % MW)]; n++; }
    b[y * MW + x] = t / n;
  }
  return b;
})();
function distSinal(lat, lon) { // > 0 em terra (graus até a costa), < 0 no mar
  const fy = 89.5 - lat, fx = lon + 179.5;
  const y0 = Math.max(0, Math.min(MH - 1, Math.floor(fy))), y1 = Math.min(MH - 1, y0 + 1), ty = Math.max(0, Math.min(1, fy - y0));
  const x0 = ((Math.floor(fx) % MW) + MW) % MW, x1 = (x0 + 1) % MW, tx = fx - Math.floor(fx);
  return (SD[y0 * MW + x0] * (1 - tx) + SD[y0 * MW + x1] * tx) * (1 - ty) + (SD[y1 * MW + x0] * (1 - tx) + SD[y1 * MW + x1] * tx) * ty;
}
// Projeção do disco: 90°N no centro, 60°S na borda; o expoente amplia o Ártico
const P_R0 = 0.12, P_R1 = 2.4 * 0.985, P_EXP = 0.5;
const latDeR = r => 90 - Math.pow(Math.max(0, r - P_R0) / (P_R1 - P_R0), 1 / P_EXP) * 150;
const rDeLat = lat => P_R0 + (P_R1 - P_R0) * Math.pow(Math.max(0, 90 - lat) / 150, P_EXP);
// Área de gelo marinho (fração do maior mês, SVS 5099) → latitude da borda da calota: A = 2πR²(1 − cos θ)
const HEMI = 2 * Math.PI * 6371 * 6371 / 1e6;
const latGelo = f => 90 - Math.acos(Math.max(-1, 1 - Math.max(0.02, f) * MAXIMO.gelo / HEMI)) * 180 / Math.PI;

const amort = (k, dt) => 1 - Math.exp(-k * dt);
const lerp = (a, b, k) => a + (b - a) * k;
const suave = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
function semente(s) { return () => (s = (s * 16807) % 2147483647) / 2147483647; }

// Ruído de valor 2D determinístico (o mesmo planeta sempre)
function hash(x, y) { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); }
function ruido2(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x, y, oit = 4) { let s = 0, a = 0.5, f = 1; for (let i = 0; i < oit; i++) { s += a * ruido2(x * f, y * f); f *= 2.03; a *= 0.5; } return s; }

const FRIO = new THREE.Color(0.32, 0.56, 1.0);
const NEUTRO = new THREE.Color(0.9, 0.93, 0.97);
const QUENTE = new THREE.Color(1.0, 0.3, 0.16);
function corTemp(a, alvo) {
  return a < 0 ? alvo.copy(NEUTRO).lerp(FRIO, Math.min(1, -a / 0.6)) : alvo.copy(NEUTRO).lerp(QUENTE, Math.min(1, a / 1.3));
}
// Cores do terreno
const srgb = hex => new THREE.Color().setStyle(hex, THREE.SRGBColorSpace); // cores pensadas em sRGB
const TERRA_NEUTRA = srgb("#2c5636");
// Frio = escuro e azulado; quente = claro e ocre. A diferença de brilho
// mantém o aquecimento visível também para quem tem daltonismo.
const TERRA_FRIA = srgb("#1f4a63");
const TERRA_QUENTE = srgb("#c99a3e");
const ROCHA = srgb("#5b544c");
const GELO = srgb("#c4d6e4");
const MAR = srgb("#123a6b");
const tmpC = new THREE.Color();

function texturaSprite() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,0.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Luz sob o disco: textura própria, maior e sem mipmaps. A textura pequena dos pontos, esticada num
// plano de 10×10 visto de lado, virava pontinhos coloridos no iPhone (ruído das mipmaps).
function texturaHalo() {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,0.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.generateMipmaps = false; t.minFilter = THREE.LinearFilter;
  return t;
}

export function criarCena(palco, { reduzido }) {
  const canvas = palco.querySelector('canvas');
  // Celular/tablet: sem pós-processamento (brilho/bloom). Nos chips de celular (iPhone, por exemplo)
  // a imagem intermediária em meia precisão com antisserrilhado virava quadradinhos coloridos em
  // volta do disco. Lá a cena é desenhada direto na tela, com o antisserrilhado do próprio navegador.
  const semPos = matchMedia('(pointer: coarse)').matches;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: semPos, powerPreference: 'high-performance' });
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const cena = new THREE.Scene();
  cena.background = new THREE.Color(0x0a1030);
  const pmrem = new THREE.PMREMGenerator(renderer);
  cena.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  cena.environmentIntensity = 0.5;
  pmrem.dispose();

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 60);
  const direcaoCamera = new THREE.Vector3(0, 0.78, 0.63).normalize();

  const luzChave = new THREE.DirectionalLight(0xfff0dc, 1.9); luzChave.position.set(-4, 6, 3); cena.add(luzChave);
  if (!(reduzido || matchMedia('(pointer: coarse)').matches)) {
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    luzChave.castShadow = true; luzChave.shadow.mapSize.set(1024, 1024);
    Object.assign(luzChave.shadow.camera, { left: -3, right: 3, top: 3, bottom: -3, near: 1, far: 16 });
    luzChave.shadow.bias = -0.0005; luzChave.shadow.normalBias = 0.02;
  }
  const luzContra = new THREE.DirectionalLight(0x7aa2ff, 1.3); luzContra.position.set(4, 3, -5); cena.add(luzContra);
  const luzRaio = new THREE.PointLight(0xcdb8ff, 0, 9, 1.6); luzRaio.position.set(0, 1.8, 0); cena.add(luzRaio);

  const sprite = texturaSprite();

  /* ---------- Céu: estrelas ---------- */
  const estrelas = (() => {
    const r = semente(7), n = 900, pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const th = r() * Math.PI * 2, ph = Math.acos(r() * 2 - 1), d = 22 + r() * 8;
      pos.set([d * Math.sin(ph) * Math.cos(th), d * Math.cos(ph), d * Math.sin(ph) * Math.sin(th)], i * 3);
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const p = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.09, map: sprite, color: 0x9fb2ff, transparent: true, opacity: 0.7, depthWrite: false }));
    // No celular a tela é pequena e a resolução baixa: as estrelas viravam pontinhos soltos e
    // borrados em volta do disco, parecendo sujeira. Lá o céu fica liso.
    // Vale para toque e para qualquer tela estreita (celular em "modo computador" não se diz de toque).
    p.visible = !(reduzido || matchMedia('(pointer: coarse), (max-width: 760px)').matches);
    cena.add(p);
    return p;
  })();

  /* ---------- Halo sob o toca-discos ---------- */
  const halo = new THREE.Mesh(
    new THREE.PlaneGeometry(10, 10),
    new THREE.MeshBasicMaterial({ map: texturaHalo(), color: 0x3657c9, transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false }),
  );
  halo.rotation.x = -Math.PI / 2; halo.position.y = -0.2;
  cena.add(halo);
  const corHaloBase = new THREE.Color(0x3657c9), corHaloAlvo = corHaloBase.clone();

  /* ---------- Prato de metal ---------- */
  const prato = new THREE.Mesh(
    new THREE.CylinderGeometry(R * 1.05, R * 1.07, 0.12, 128),
    new THREE.MeshStandardMaterial({ color: 0x3a4157, metalness: 0.85, roughness: 0.32 }),
  );
  prato.position.y = -0.08;
  cena.add(prato);

  /* ---------- Vinil (gira) ---------- */
  const disco = new THREE.Group();
  cena.add(disco);

  const sulcosCanvas = document.createElement('canvas'); sulcosCanvas.width = sulcosCanvas.height = 1024;
  const sulcos = new THREE.CanvasTexture(sulcosCanvas);
  sulcos.colorSpace = THREE.SRGBColorSpace; sulcos.anisotropy = renderer.capabilities.getMaxAnisotropy();
  // Os sulcos finos são desenhados uma vez só; numa troca de tema só as divisões entre faixas mudam
  // (redesenhar os ~250 círculos a cada troca travava um quadro)
  const sulcosBase = document.createElement('canvas'); sulcosBase.width = sulcosBase.height = 1024;
  let faixasFeitas = null;
  function desenharSulcos(faixas) {
    const rIni = 512 * (R_ROTULO / R) * 1.04, rFim = 506, c = 512;
    if (faixasFeitas === null) {
      const gb = sulcosBase.getContext('2d'), rr = semente(31);
      gb.fillStyle = '#0c0c12'; gb.fillRect(0, 0, 1024, 1024);
      for (let r = rIni; r < rFim; r += 1.7) {
        const l = 22 + rr() * 26;
        gb.strokeStyle = `rgb(${l},${l},${l + 8})`; gb.lineWidth = 0.9;
        gb.beginPath(); gb.arc(c, c, r, 0, Math.PI * 2); gb.stroke();
      }
    }
    const visiveis = faixas > 1 && faixas <= 40 ? faixas : 0;
    if (visiveis === faixasFeitas) return;
    faixasFeitas = visiveis;
    const g = sulcosCanvas.getContext('2d');
    g.drawImage(sulcosBase, 0, 0);
    if (visiveis) {
      for (let i = 1; i < faixas; i++) {
        const r = rFim - (i / faixas) * (rFim - rIni);
        g.strokeStyle = '#050508'; g.lineWidth = 3;
        g.beginPath(); g.arc(c, c, r, 0, Math.PI * 2); g.stroke();
      }
    }
    sulcos.needsUpdate = true;
  }
  desenharSulcos(0);

  const matTopo = new THREE.MeshPhysicalMaterial({
    color: 0xffffff, map: sulcos, bumpMap: sulcos, bumpScale: 1.2,
    roughness: 0.38, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.18,
    emissive: new THREE.Color(0, 0, 0), emissiveMap: sulcos, emissiveIntensity: 0,
  });
  const matLado = new THREE.MeshStandardMaterial({ color: 0x07070b, roughness: 0.4 });
  disco.add(new THREE.Mesh(new THREE.CylinderGeometry(R, R, 0.042, 160), [matLado, matTopo, matLado]));

  // Rótulo central
  const rotuloCanvas = document.createElement('canvas'); rotuloCanvas.width = rotuloCanvas.height = 1024;
  const texRotulo = new THREE.CanvasTexture(rotuloCanvas); texRotulo.colorSpace = THREE.SRGBColorSpace;
  texRotulo.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const rotulo = new THREE.Mesh(new THREE.CircleGeometry(R_ROTULO, 96), new THREE.MeshStandardMaterial({ map: texRotulo, roughness: 0.65 }));
  rotulo.rotation.x = -Math.PI / 2; rotulo.position.y = TOPO + 0.002;
  // (no exemplo, o centro do disco é o Ártico: sem rótulo)

  function textoCurvo(g, texto, raio, embaixo) {
    const larg = g.measureText(texto).width;
    let ang = (embaixo ? 1 : -1) * larg / raio / 2;
    for (const ch of texto) {
      const w = g.measureText(ch).width;
      g.save();
      if (embaixo) { g.rotate(ang - w / 2 / raio); g.translate(0, raio); ang -= w / raio; }
      else { g.rotate(ang + w / 2 / raio); g.translate(0, -raio); ang += w / raio; }
      g.fillText(ch, 0, 0);
      g.restore();
    }
  }
  let ultimoRotulo = { texto: '', cor: '#2848a8' };
  function desenharRotulo({ texto, cor }, forcar = false) {
    if (!forcar && texto === ultimoRotulo.texto && cor === ultimoRotulo.cor) return; // nada mudou: não reenvia a textura
    ultimoRotulo = { texto, cor };
    const g = rotuloCanvas.getContext('2d');
    g.clearRect(0, 0, 1024, 1024);
    g.save(); g.translate(512, 512);
    g.fillStyle = cor; g.beginPath(); g.arc(0, 0, 512, 0, Math.PI * 2); g.fill();
    const gr = g.createRadialGradient(-140, -160, 40, 0, 0, 520);
    gr.addColorStop(0, 'rgba(255,255,255,0.28)'); gr.addColorStop(1, 'rgba(0,0,0,0.25)');
    g.fillStyle = gr; g.beginPath(); g.arc(0, 0, 512, 0, Math.PI * 2); g.fill();
    g.strokeStyle = 'rgba(10,16,48,0.35)'; g.lineWidth = 6;
    g.beginPath(); g.arc(0, 0, 330, 0, Math.PI * 2); g.stroke();
    g.fillStyle = '#0a1030'; g.textAlign = 'center'; g.textBaseline = 'middle';
    // o título ocupa no máximo meia volta do rótulo; se for longo, a fonte diminui
    const titulo = texto || 'Jam Space', maxArco = Math.PI * 420 * 0.92;
    g.font = '600 54px Unbounded, system-ui, sans-serif';
    const larg = g.measureText(titulo).width;
    if (larg > maxArco) g.font = `600 ${Math.max(30, Math.floor(54 * maxArco / larg))}px Unbounded, system-ui, sans-serif`;
    textoCurvo(g, titulo, 420, false);
    g.font = '400 40px "Atkinson Hyperlegible", system-ui, sans-serif';
    textoCurvo(g, L('Jam Space · dados NASA EIC', 'Jam Space · NASA EIC data'), 410, true);
    g.restore();
    texRotulo.needsUpdate = true;
  }
  desenharRotulo(ultimoRotulo, true);
  document.fonts?.ready.then(() => desenharRotulo(ultimoRotulo, true));

  const pino = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.16, 24), new THREE.MeshStandardMaterial({ color: 0xc9d1e6, metalness: 1, roughness: 0.2 }));
  pino.position.y = 0.08; cena.add(pino);

  /* =====================================================================
     TERRENO: a Terra vista de cima do Polo Norte, sobre o vinil
     ===================================================================== */
  const leve = reduzido || matchMedia('(pointer: coarse)').matches;
  const NA = leve ? 480 : 620, NR = leve ? 128 : 160;
  const NV = (NR + 1) * (NA + 1);
  const AGUA = TOPO + 0.016; // nível do mar
  const posArr = new Float32Array(NV * 3), corT = new Float32Array(NV * 3);
  const vR = new Float32Array(NV), vLat = new Float32Array(NV), vTerra = new Uint8Array(NV), vAlt = new Float32Array(NV), vFundo = new Float32Array(NV);
  const vBase = new Float32Array(NV * 3), vMonte = new Float32Array(NV), vCosta = new Float32Array(NV), vPolar = new Uint8Array(NV);
  const C_RASO = srgb('#1f8fa0'), C_FUNDO = srgb('#0a2350'), C_ABISMO = srgb('#050d24'), C_PRAIA = srgb('#c9b27a'), C_VERDE = srgb('#3f7a4e'), C_FLOR = srgb('#24502f'), C_SECO = srgb('#b8873a'), C_NEVE = srgb('#f2f6fb');
  {
    let k = 0;
    for (let i = 0; i <= NR; i++) {
      const r = P_R0 + (P_R1 - P_R0) * i / NR, lat = latDeR(r);
      const afina = suave(P_R0, P_R0 + 0.05, r) * (1 - suave(P_R1 - 0.06, P_R1, r));
      for (let j = 0; j <= NA; j++, k++) {
        const a = Math.PI * 2 * j / NA, lon = ((-a * 180 / Math.PI) % 360 + 540) % 360 - 180;
        posArr[k * 3] = Math.sin(a) * r; posArr[k * 3 + 2] = Math.cos(a) * r;
        const sd = distSinal(lat, lon), n = fbm(lon * 0.09 + 11, lat * 0.09 - 3), cr = 1 - Math.abs(fbm(lon * 0.05, lat * 0.05) * 2 - 1);
        vR[k] = r; vLat[k] = lat; vCosta[k] = sd;
        if (sd > 0 && afina > 0.5) {
          const interior = Math.min(1, sd / 9), polar = lat > 60 || lat < -62;
          let h = 0.008 + Math.pow(interior, 0.8) * (0.055 + 0.075 * cr) * (0.6 + 0.8 * n);
          if (polar) h = 0.012 + 0.045 * Math.pow(interior, 0.6) + 0.006 * n;
          vTerra[k] = 1; vPolar[k] = polar ? 1 : 0; vAlt[k] = AGUA + h * afina; vMonte[k] = Math.min(1, Math.max(0, (h - 0.06) * 14));
          tmpC.copy(C_VERDE).lerp(C_FLOR, Math.max(0, 1 - Math.abs(lat) / 25) * 0.7).lerp(C_SECO, (Math.abs(lat) < 35 && Math.abs(lat) > 12 ? 0.6 : 0.15) * n * 1.4);
          if (sd < 0.9) tmpC.lerp(C_PRAIA, 0.5);
          tmpC.lerp(ROCHA, vMonte[k]);
          if (polar) tmpC.lerp(C_NEVE, 0.92); else if (h > 0.12 && Math.abs(lat) > 28) tmpC.lerp(C_NEVE, 0.8);
        } else {
          const prof = Math.min(1, Math.max(0, -sd) / 10);
          vAlt[k] = vFundo[k] = TOPO + 0.001 + (1 - prof) * 0.01;
          tmpC.copy(C_RASO).lerp(C_FUNDO, Math.min(1, prof * 1.6)).lerp(C_ABISMO, Math.max(0, prof - 0.6) * 2).multiplyScalar(0.88 + 0.12 * Math.sin(r * 520));
        }
        vFundo[k] = vFundo[k] || TOPO + 0.002;
        vBase[k * 3] = tmpC.r; vBase[k * 3 + 1] = tmpC.g; vBase[k * 3 + 2] = tmpC.b;
      }
    }
  }
  const idxT = [];
  for (let i = 0; i < NR; i++) for (let j = 0; j < NA; j++) { const a = i * (NA + 1) + j, b = a + NA + 1; idxT.push(a, b, a + 1, b, b + 1, a + 1); }
  const terrenoGeo = new THREE.BufferGeometry();
  terrenoGeo.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
  terrenoGeo.setAttribute('color', new THREE.BufferAttribute(corT, 3));
  terrenoGeo.setIndex(idxT);
  const posT = terrenoGeo.attributes.position, nV = NV;
  // Cor base fica fixa na malha; a tinta da temperatura é aplicada na placa de vídeo (uniform),
  // então mudar a temperatura não obriga a recalcular os ~100 mil vértices.
  const tingir = new Float32Array(NV);
  for (let i = 0; i < NV; i++) {
    corT[i * 3] = vBase[i * 3]; corT[i * 3 + 1] = vBase[i * 3 + 1]; corT[i * 3 + 2] = vBase[i * 3 + 2];
    tingir[i] = vTerra[i] && !vPolar[i] ? 1 - vMonte[i] * 0.5 : 0;
  }
  terrenoGeo.setAttribute('tingir', new THREE.BufferAttribute(tingir, 1));
  const uTinta = { uCorTerra: { value: new THREE.Color() }, uMistura: { value: 0 } };
  const matTerreno = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.82, metalness: 0 });
  matTerreno.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, uTinta);
    sh.vertexShader = 'attribute float tingir;\nuniform vec3 uCorTerra;\nuniform float uMistura;\n' +
      sh.vertexShader.replace('#include <color_vertex>', '#include <color_vertex>\n  vColor.rgb = mix(vColor.rgb, uCorTerra, uMistura * tingir);');
  };
  const terreno = new THREE.Mesh(terrenoGeo, matTerreno);
  terreno.castShadow = false; terreno.receiveShadow = !leve; // o relevo é baixo: projetar sombra nele mesmo custava uma passada inteira
  disco.add(terreno);
  const alturaT = new Float32Array(nV); // reaproveitado pelas cidades

  // Oceano: resina azul transparente por cima dos sulcos
  const agua = (() => {
    const pos = [], idx = [], N = 360;
    for (let j = 0; j <= N; j++) { const a = Math.PI * 2 * j / N; for (const r of [P_R0 + 0.03, P_R1 - 0.03]) pos.push(Math.sin(a) * r, 0, Math.cos(a) * r); }
    for (let j = 0; j < N; j++) { const a = 2 * j; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    const m = new THREE.Mesh(g, new THREE.MeshPhysicalMaterial({ color: 0x0c3d78, transparent: true, opacity: 0.38, roughness: 0.05, clearcoat: 1, clearcoatRoughness: 0.04, depthWrite: false, side: THREE.DoubleSide }));
    m.position.y = AGUA - 0.002; m.renderOrder = 2;
    return m;
  })();
  disco.add(agua);

  // Placa de gelo marinho com fendas; o contorno é desenhado para o maior mês e escala com o gelo
  const placa = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 1024;
    const g = c.getContext('2d'); g.fillStyle = '#eef5fb'; g.fillRect(0, 0, 1024, 1024);
    const rnd = semente(7);
    for (let q = 0; q < 900; q++) { g.fillStyle = `rgba(160,195,225,${rnd() * 0.25})`; g.beginPath(); g.arc(rnd() * 1024, rnd() * 1024, 4 + rnd() * 30, 0, 7); g.fill(); }
    g.strokeStyle = 'rgba(70,120,165,0.85)'; g.lineCap = 'round';
    for (let q = 0; q < 70; q++) {
      let x = rnd() * 1024, y = rnd() * 1024; g.lineWidth = 0.8 + rnd() * 2.2; g.beginPath(); g.moveTo(x, y);
      for (let p = 0; p < 9; p++) { x += (rnd() - 0.5) * 90; y += (rnd() - 0.5) * 90; g.lineTo(x, y); }
      g.stroke();
    }
    const tex = new THREE.CanvasTexture(c); tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.colorSpace = THREE.SRGBColorSpace; tex.repeat.set(1.4, 1.4);
    const forma = new THREE.Shape(), L = latGelo(1);
    for (let j = 0; j <= 360; j++) {
      const a = Math.PI * 2 * j / 360, lon = ((-a * 180 / Math.PI) % 360 + 540) % 360 - 180;
      const r = rDeLat(L + (fbm(lon * 0.08, 7.3) - 0.5) * 5), x = Math.sin(a) * r, y = -Math.cos(a) * r;
      if (j === 0) forma.moveTo(x, y); else forma.lineTo(x, y);
    }
    const geo = new THREE.ExtrudeGeometry(forma, { depth: 0.034, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.01, bevelSegments: 2, curveSegments: 4 });
    geo.rotateX(-Math.PI / 2);
    const m = new THREE.Mesh(geo, [
      new THREE.MeshPhysicalMaterial({ map: tex, roughness: 0.4, clearcoat: 0.6, clearcoatRoughness: 0.25, emissive: 0x7fc4ff, emissiveIntensity: 0 }),
      new THREE.MeshPhysicalMaterial({ color: 0xa8d8ff, roughness: 0.2, emissive: 0x4aa8ff, emissiveIntensity: 0 }),
    ]);
    m.position.y = AGUA - 0.012; m.castShadow = m.receiveShadow = !leve; m.visible = false;
    return m;
  })();
  disco.add(placa);
  const rPlacaMax = rDeLat(latGelo(1));
  // Borda do gelo: anel ciano que pulsa, mostra até onde o gelo chega neste mês
  const bordaGelo = new THREE.Mesh(
    new THREE.RingGeometry(0.955, 1.045, 160),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(0.5, 1.2, 1.7), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }),
  );
  bordaGelo.rotation.x = -Math.PI / 2; bordaGelo.position.y = AGUA + 0.045; bordaGelo.renderOrder = 9;
  disco.add(bordaGelo);
  // Geada: cristais que brilham e sobem devagar sobre o gelo
  const geadaUnit = new Float32Array(MAX_GEADA * 3), geadaPos = new Float32Array(MAX_GEADA * 3);
  {
    const r = semente(77);
    for (let i = 0; i < MAX_GEADA; i++) { const a = r() * Math.PI * 2, d = Math.sqrt(r()); geadaUnit.set([Math.sin(a) * d, r(), Math.cos(a) * d], i * 3); }
  }
  const geadaGeo = new THREE.BufferGeometry(); geadaGeo.setAttribute('position', new THREE.BufferAttribute(geadaPos, 3));
  // Geada: cor quase sem estourar o bloom (com 2.1 virava uma névoa branca sobre o disco)
  const geadaMat = new THREE.PointsMaterial({ size: 0.04, color: new THREE.Color(0.75, 1.0, 1.3), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
  const geada = new THREE.Points(geadaGeo, geadaMat); geada.visible = false;
  disco.add(geada);
  const geloRaio = g => rDeLat(latGelo(g));

  // Anel amarelo: metade do maior mês do período (SVS 5099)
  const anelMedia = new THREE.Mesh(
    new THREE.RingGeometry(0.985, 1.015, 160),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(1.5, 1.15, 0.3), transparent: true, opacity: 0, depthTest: false, depthWrite: false }),
  );
  anelMedia.rotation.x = -Math.PI / 2; anelMedia.position.y = TOPO + 0.12;
  anelMedia.scale.setScalar(geloRaio(LIMIAR_MEDIA_GELO)); anelMedia.renderOrder = 10;
  disco.add(anelMedia);

  /* ---------- Sulco atual (onde a agulha está) ---------- */
  const anelAtual = new THREE.Mesh(
    new THREE.RingGeometry(0.994, 1.006, 160),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.15, 0.55), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }),
  );
  anelAtual.rotation.x = -Math.PI / 2; anelAtual.position.y = TOPO + 0.003;
  cena.add(anelAtual);

  /* ---------- Onda ao adicionar camada ---------- */
  const onda = new THREE.Mesh(
    new THREE.RingGeometry(0.97, 1, 128),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }),
  );
  onda.rotation.x = -Math.PI / 2; onda.position.y = TOPO + 0.01;
  cena.add(onda);
  let ondaT = 1;

  /* ---------- Temperatura: faíscas de calor (ou flocos, se frio) ---------- */
  const calorPos = new Float32Array(MAX_CALOR * 3), calorVel = new Float32Array(MAX_CALOR);
  {
    const r = semente(101);
    for (let i = 0; i < MAX_CALOR; i++) {
      const a = r() * Math.PI * 2, d = R_ROTULO * 1.1 + Math.sqrt(r()) * (R - R_ROTULO * 1.1);
      calorPos.set([Math.cos(a) * d, 0.05 + r() * 1.5, Math.sin(a) * d], i * 3);
      calorVel[i] = 0.6 + r() * 0.8;
    }
  }
  const calorGeo = new THREE.BufferGeometry(); calorGeo.setAttribute('position', new THREE.BufferAttribute(calorPos, 3));
  const calorMat = new THREE.PointsMaterial({ size: 0.09, map: sprite, color: 0xffffff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
  const calor = new THREE.Points(calorGeo, calorMat);
  cena.add(calor);

  /* ---------- Luzes noturnas: cidades sobre os continentes ---------- */
  const cidadesIdx = new Uint32Array(MAX_LUZES), cidadesJit = new Float32Array(MAX_LUZES * 2);
  {
    const cand = [];
    for (let i = 0; i < nV; i++) if (vTerra[i] && !vPolar[i] && vCosta[i] < 5 && vLat[i] > -45 && vLat[i] < 62) cand.push(i);
    const r = semente(2024);
    for (let k = 0; k < MAX_LUZES; k++) {
      cidadesIdx[k] = cand.length ? cand[Math.floor(r() * cand.length)] : 0;
      cidadesJit[k * 2] = (r() - 0.5) * 0.02; cidadesJit[k * 2 + 1] = (r() - 0.5) * 0.02;
    }
  }
  const luzesPos = new Float32Array(MAX_LUZES * 3);
  const luzesGeo = new THREE.BufferGeometry(); luzesGeo.setAttribute('position', new THREE.BufferAttribute(luzesPos, 3));
  luzesGeo.setDrawRange(0, 0);
  const luzesMat = new THREE.PointsMaterial({ size: 0.11, map: sprite, color: new THREE.Color(3, 2, 0.85), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
  disco.add(new THREE.Points(luzesGeo, luzesMat));

  /* ---------- Raios: nuvens de tempestade + descargas ---------- */
  const nuvens = new THREE.Group(); cena.add(nuvens);
  const matNuvem = new THREE.SpriteMaterial({ map: sprite, color: new THREE.Color(0.5, 0.48, 0.72), transparent: true, opacity: 0, depthWrite: false });
  const posNuvens = [];
  {
    const r = semente(404);
    for (let i = 0; i < N_NUVENS; i++) {
      const a = (i / N_NUVENS) * Math.PI * 2 + r() * 0.4, d = 1.3 + r() * 0.8;
      const s = new THREE.Sprite(matNuvem); s.visible = false; // nuvens desligadas: só a origem dos raios
      s.position.set(Math.cos(a) * d, 0.75 + r() * 0.2, Math.sin(a) * d);
      s.scale.setScalar(0.55 + r() * 0.35);
      nuvens.add(s); posNuvens.push(s.position);
    }
  }
  const raios = [];
  for (let i = 0; i < N_RAIOS; i++) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(9 * 3), 3));
    const mat = new THREE.LineBasicMaterial({ color: new THREE.Color(1.6, 1.4, 2.2), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
    const linha = new THREE.Line(geo, mat);
    nuvens.add(linha);
    raios.push(linha);
  }
  const impacto = new THREE.Sprite(new THREE.SpriteMaterial({ map: sprite, color: new THREE.Color(2.2, 1.9, 3), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
  impacto.scale.setScalar(0.9); nuvens.add(impacto);
  let proximoRaio = 0, sementeRaio = 1;
  function dispararRaio() {
    const linha = raios[proximoRaio]; proximoRaio = (proximoRaio + 1) % N_RAIOS;
    const r = semente(sementeRaio++ * 977 + 13);
    const ini = posNuvens[Math.floor(r() * N_NUVENS)];
    const fx = ini.x * 0.85 + (r() - 0.5) * 0.3, fz = ini.z * 0.85 + (r() - 0.5) * 0.3;
    const p = linha.geometry.attributes.position;
    for (let k = 0; k < 9; k++) {
      const t = k / 8, desvio = k === 0 || k === 8 ? 0 : 0.2;
      p.setXYZ(k, lerp(ini.x, fx, t) + (r() - 0.5) * desvio, lerp(ini.y - 0.1, TOPO + 0.06, t), lerp(ini.z, fz, t) + (r() - 0.5) * desvio);
    }
    p.needsUpdate = true;
    linha.material.opacity = 1;
    impacto.position.set(fx, TOPO + 0.08, fz);
    luzRaio.position.set(ini.x, 1.0, ini.z);
    luzRaio.intensity = reduzido ? 6 : 20;
    clarao = 1;
  }
  let clarao = 0;

  /* ---------- Chuva: riscos que caem sobre o disco ---------- */
  const chuvaPos = new Float32Array(MAX_CHUVA * 6), chuvaVel = new Float32Array(MAX_CHUVA);
  {
    const r = semente(321);
    for (let i = 0; i < MAX_CHUVA; i++) {
      const a = r() * Math.PI * 2, d = Math.sqrt(r()) * R * 0.95, y = 0.1 + r() * 1.5;
      const x = Math.cos(a) * d, z = Math.sin(a) * d;
      chuvaPos.set([x, y, z, x, y + 0.15, z], i * 6);
      chuvaVel[i] = 0.8 + r() * 0.4;
    }
  }
  const chuvaGeo = new THREE.BufferGeometry(); chuvaGeo.setAttribute('position', new THREE.BufferAttribute(chuvaPos, 3));
  chuvaGeo.setDrawRange(0, 0);
  const chuvaMat = new THREE.LineBasicMaterial({ color: new THREE.Color(0.55, 1.1, 0.95), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
  cena.add(new THREE.LineSegments(chuvaGeo, chuvaMat));

  /* ---------- Braço do toca-discos ---------- */
  const PIVO = new THREE.Vector2(2.75, -1.5), COMP = 2.7;
  const braco = new THREE.Group(); braco.position.set(PIVO.x, 0.36, PIVO.y);
  const metal = new THREE.MeshStandardMaterial({ color: 0x9aa3ba, metalness: 1, roughness: 0.38 });
  const haste = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, COMP, 16), metal);
  haste.rotation.z = Math.PI / 2; haste.position.x = COMP / 2;
  const capsula = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.1, 0.16), new THREE.MeshStandardMaterial({ color: 0x1b2140, metalness: 0.4, roughness: 0.4 }));
  capsula.position.set(COMP, -0.08, 0);
  const ponta = new THREE.Mesh(new THREE.SphereGeometry(0.03, 12, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(2, 1.4, 0.6) }));
  ponta.position.set(COMP, -0.16, 0);
  const contrapeso = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.22, 24), metal);
  contrapeso.rotation.z = Math.PI / 2; contrapeso.position.x = -0.32;
  braco.add(haste, capsula, ponta, contrapeso);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.24, 0.5, 32), new THREE.MeshStandardMaterial({ color: 0x2b3147, metalness: 0.8, roughness: 0.35 }));
  base.position.set(PIVO.x, 0.12, PIVO.y);
  cena.add(braco, base);

  function anguloPara(r) {
    const dist = PIVO.length(), phi = Math.atan2(PIVO.y, PIVO.x);
    const k = THREE.MathUtils.clamp((r * r - dist * dist - COMP * COMP) / (2 * COMP * dist), -1, 1);
    const a1 = phi + Math.acos(k), a2 = phi - Math.acos(k);
    const z1 = PIVO.y + COMP * Math.sin(a1), z2 = PIVO.y + COMP * Math.sin(a2);
    return z1 > z2 ? a1 : a2;
  }

  /* ---------- Estado animado ---------- */
  const alvo = { temp: 0, raios: 0, luzes: 0, gelo: 0, chuva: 0 };
  const atual = { temp: 0, raios: 0, luzes: 0, gelo: 0, chuva: 0 };
  const presencaAlvo = { temp: 0, raios: 0, luzes: 0, gelo: 0, chuva: 0 };
  const presenca = { temp: 0, raios: 0, luzes: 0, gelo: 0, chuva: 0 };
  let tocando = false, velocidade = 0, progressoAlvo = 0, progresso = 0, temPassos = false;
  let crescer = 0; // 0 = vinil liso, 1 = continentes formados
  const cor = new THREE.Color(), corTerra = new THREE.Color(), tmpCor = new THREE.Color();

  /* ---------- Pós-processamento ---------- */
  const alvoRender = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 });
  const composer = new EffectComposer(renderer, alvoRender);
  composer.addPass(new RenderPass(cena, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.55, 0.45, 1.2);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  const desenhar = () => (semPos ? renderer.render(cena, camera) : composer.render());

  let qualidadeBaixa = false;
  function redimensionar() {
    const w = palco.clientWidth, h = palco.clientHeight;
    if (!w || !h) return;
    const dpr = Math.min(window.devicePixelRatio, qualidadeBaixa ? 1 : 1.5);
    renderer.setPixelRatio(dpr); renderer.setSize(w, h, false);
    if (!semPos) { composer.setPixelRatio(dpr); composer.setSize(w, h); }
    camera.aspect = w / h;
    const vFov = THREE.MathUtils.degToRad(camera.fov), hFov = 2 * Math.atan(Math.tan(vFov / 2) * camera.aspect);
    camera.position.copy(direcaoCamera).multiplyScalar(3.25 / Math.sin(Math.min(vFov, hFov) / 2));
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(redimensionar).observe(palco);
  redimensionar();

  /* ---------- Relevo: só muda quando os continentes sobem ou descem ---------- */
  // Normais direto da grade (diferenças centrais entre os vizinhos), bem mais leve que o
  // computeVertexNormals genérico, que travava o disco enquanto os continentes subiam
  terrenoGeo.computeVertexNormals();
  const norT = terrenoGeo.attributes.normal, nrm = norT.array;
  function normaisDaGrade() {
    const L = NA + 1;
    for (let i = 0; i <= NR; i++) {
      const ia = i > 0 ? i - 1 : i, ib = i < NR ? i + 1 : i;
      for (let j = 0; j <= NA; j++) {
        const ja = j > 0 ? j - 1 : NA - 1, jb = j < NA ? j + 1 : 1; // a costura (j = 0 e j = NA) dá a volta
        const a = (ia * L + j) * 3, b = (ib * L + j) * 3, c = (i * L + ja) * 3, d = (i * L + jb) * 3;
        const rx = posArr[b] - posArr[a], ry = posArr[b + 1] - posArr[a + 1], rz = posArr[b + 2] - posArr[a + 2];
        const tx = posArr[d] - posArr[c], ty = posArr[d + 1] - posArr[c + 1], tz = posArr[d + 2] - posArr[c + 2];
        let nx = ry * tz - rz * ty, ny = rz * tx - rx * tz, nz = rx * ty - ry * tx;
        if (ny < 0) { nx = -nx; ny = -ny; nz = -nz; }
        const m = 1 / (Math.hypot(nx, ny, nz) || 1), k = (i * L + j) * 3;
        nrm[k] = nx * m; nrm[k + 1] = ny * m; nrm[k + 2] = nz * m;
      }
    }
    norT.needsUpdate = true;
  }
  function atualizarRelevo() {
    const frente = P_R0 - 0.3 + crescer * (P_R1 - P_R0 + 0.6); // os continentes sobem do mar, de dentro para fora
    for (let i = 0; i < nV; i++) {
      const y = vTerra[i] ? vFundo[i] + (vAlt[i] - vFundo[i]) * suave(frente, frente - 0.35, vR[i]) : vAlt[i];
      posArr[i * 3 + 1] = y; alturaT[i] = y;
    }
    posT.needsUpdate = true;
    normaisDaGrade();
  }
  atualizarRelevo();

  /* ---------- Laço de animação ---------- */
  const relogio = new THREE.Clock();
  let crescerFeito = -1, quadro = 0;
  // Qualidade adaptativa: se a média passar de ~24 ms por quadro, baixa a resolução e tira a sombra
  let somaDt = 0, nDt = 0;
  function medirDesempenho(dtReal) {
    if (qualidadeBaixa || document.hidden || quadro < 90) return; // ignora o início (compilação dos shaders)
    somaDt += Math.min(dtReal, 0.1); nDt++;
    if (nDt < 120) return;
    if (somaDt / nDt > 0.024) {
      // Congela a sombra em vez de desligá-la: desligar a sombra recompila todos os materiais (trava ~1 s)
      qualidadeBaixa = true; renderer.shadowMap.autoUpdate = false; renderer.shadowMap.needsUpdate = true; redimensionar();
    }
    somaDt = 0; nDt = 0;
  }
  // Compila de uma vez os shaders de tudo (gelo, geada, calor, raios...) antes do primeiro quadro.
  // Sem isso, cada objeto compila na primeira vez que aparece e o disco trava ao somar um tema.
  // (objetos ainda em escala 0, como a placa de gelo, também: sem frustumCulled = false a câmera os pula)
  const escondidos = [], semCorte = [];
  cena.traverse(o => {
    if (!o.visible) { escondidos.push(o); o.visible = true; }
    if (o.frustumCulled) { semCorte.push(o); o.frustumCulled = false; }
  });
  // Um quadro de verdade pelo mesmo caminho do bloom compila exatamente as versões usadas na tela
  // (renderer.compile sozinho compila outra variante e não resolve)
  try { desenhar(); } catch { /* compila sob demanda, como antes */ }
  escondidos.forEach(o => { o.visible = false; });
  semCorte.forEach(o => { o.frustumCulled = true; });

  renderer.setAnimationLoop(() => {
    const dtReal = relogio.getDelta(), dt = Math.min(dtReal, 0.05);
    medirDesempenho(dtReal); quadro++;
    const t = relogio.elapsedTime;
    let mudou = false;

    for (const k in alvo) {
      const a0 = atual[k], p0 = presenca[k];
      atual[k] = lerp(atual[k], alvo[k], amort(3, dt));
      presenca[k] = lerp(presenca[k], presencaAlvo[k], amort(2.5, dt));
      if (Math.abs(atual[k] - a0) + Math.abs(presenca[k] - p0) > 1e-5) mudou = true;
    }
    const algumaCamada = Object.values(presencaAlvo).some(Boolean);
    const c0 = crescer;
    crescer = reduzido ? (algumaCamada ? 1 : 0) : lerp(crescer, algumaCamada ? 1 : 0, amort(algumaCamada ? 0.9 : 2, dt));
    if (Math.abs(crescer - c0) > 1e-5) mudou = true;

    velocidade = lerp(velocidade, tocando && !reduzido ? 0.9 : 0, amort(tocando ? 1.6 : 2.5, dt));
    disco.rotation.y -= velocidade * dt;
    if (!reduzido) { estrelas.rotation.y += dt * 0.004; nuvens.rotation.y -= dt * 0.05; }

    // Onda
    if (ondaT < 1) {
      ondaT = Math.min(1, ondaT + dt * 0.9);
      onda.scale.setScalar(R_ROTULO + (R * 1.15 - R_ROTULO) * (1 - Math.pow(1 - ondaT, 3)));
      onda.material.opacity = (1 - ondaT) * 0.9;
      mudou = true;
    }

    // Relevo: só recalcula enquanto os continentes sobem ou descem (e no máximo a cada 2 quadros)
    const dc = Math.abs(crescer - crescerFeito);
    if (dc > 0.004 && quadro % 2 === 0 || (dc > 1e-4 && (crescer > 0.995 || crescer < 0.005))) { atualizarRelevo(); crescerFeito = crescer; }
    // Cor da terra pela temperatura: só dois números para a placa de vídeo
    const tn = Math.min(1, Math.max(0, (atual.temp + 0.4) / 1.8));
    if (presenca.temp > 0.01) corTerra.copy(TERRA_FRIA).lerp(TERRA_QUENTE, tn); else corTerra.copy(TERRA_NEUTRA);
    uTinta.uCorTerra.value.copy(corTerra); uTinta.uMistura.value = 0.65 * presenca.temp;
    // Placa de gelo: tamanho do mês (fração do maior), aparece com o tema
    placa.visible = presenca.gelo > 0.01;
    if (placa.visible) { const k = geloRaio(atual.gelo) / rPlacaMax * Math.min(1, presenca.gelo * 1.2); placa.scale.set(k, Math.max(0.05, presenca.gelo), k); }
    terreno.visible = agua.visible = crescer > 0.002 || presenca.gelo > 0.002;

    // Temperatura: brilho nos sulcos + faíscas
    corTemp(atual.temp, cor);
    const forca = Math.min(1, Math.abs(atual.temp) / 1.4);
    matTopo.emissive.copy(cor);
    matTopo.emissiveIntensity = presenca.temp * (0.25 + forca * 1.3);
    calor.visible = presenca.temp > 0.01;
    if (calor.visible) {
      calorMat.color.copy(cor).multiplyScalar(1.6);
      calorMat.opacity = presenca.temp * (0.45 + forca * 0.55);
      const sobe = atual.temp >= 0 ? 1 : -1, vel = reduzido ? 0 : (0.12 + forca * 0.55) * sobe;
      const p = calorGeo.attributes.position.array;
      for (let i = 0; i < MAX_CALOR; i++) {
        let y = p[i * 3 + 1] + vel * calorVel[i] * dt;
        if (y > 1.6) y -= 1.55; else if (y < 0.05) y += 1.55;
        p[i * 3 + 1] = y;
      }
      calorGeo.attributes.position.needsUpdate = true;
    }

    // Gelo: anel da média, borda que pulsa, brilho da placa e geada
    const pg = presenca.gelo;
    anelMedia.material.opacity = pg * 0.85;
    const rGelo = geloRaio(atual.gelo) * Math.min(1, pg * 1.2);
    bordaGelo.visible = geada.visible = pg > 0.01;
    if (pg > 0.01) {
      const pulso = reduzido ? 0.8 : 0.65 + 0.35 * Math.sin(t * 2.4);
      bordaGelo.scale.setScalar(rGelo); bordaGelo.material.opacity = pg * pulso;
      placa.material[0].emissiveIntensity = pg * (0.05 + 0.05 * pulso); placa.material[1].emissiveIntensity = pg * 0.22;
      const sobe = reduzido ? 0 : t * 0.06;
      for (let i = 0; i < MAX_GEADA; i++) {
        const h = (geadaUnit[i * 3 + 1] + sobe) % 1;
        geadaPos[i * 3] = geadaUnit[i * 3] * rGelo; geadaPos[i * 3 + 2] = geadaUnit[i * 3 + 2] * rGelo;
        geadaPos[i * 3 + 1] = AGUA + 0.04 + h * 0.5;
      }
      geadaGeo.attributes.position.needsUpdate = true;
      geadaMat.opacity = pg * (reduzido ? 0.45 : 0.35 + 0.25 * Math.sin(t * 5));
    }

    // Temperatura também tinge o mar
    agua.material.emissive.copy(cor);
    agua.material.emissiveIntensity = presenca.temp * (0.03 + forca * 0.12);
    agua.material.opacity = 0.38 + 0.2 * presenca.chuva;

    // Luzes noturnas: a cena escurece (vira noite) para as cidades aparecerem
    const noite = presenca.luzes;
    luzChave.intensity = 1.9 * (1 - 0.6 * noite); luzContra.intensity = 1.3 * (1 - 0.35 * noite);
    cena.environmentIntensity = 0.5 * (1 - 0.6 * noite);

    // Luzes noturnas: cidades acompanham o relevo
    const nCid = Math.floor(MAX_LUZES * atual.luzes * presenca.luzes * crescer);
    luzesGeo.setDrawRange(0, nCid);
    if (nCid) {
      for (let k = 0; k < nCid; k++) {
        const i = cidadesIdx[k];
        luzesPos[k * 3] = posT.getX(i) + cidadesJit[k * 2];
        luzesPos[k * 3 + 1] = alturaT[i] + 0.015;
        luzesPos[k * 3 + 2] = posT.getZ(i) + cidadesJit[k * 2 + 1];
      }
      luzesGeo.attributes.position.needsUpdate = true;
    }
    luzesMat.opacity = presenca.luzes * (reduzido ? 1 : 0.85 + 0.15 * Math.sin(t * 3));

    // Chuva: riscos caindo; a velocidade e a quantidade sobem com a chuva
    const nChuva = Math.floor(MAX_CHUVA * Math.min(1, 0.15 + atual.chuva) * presenca.chuva);
    chuvaGeo.setDrawRange(0, nChuva * 2);
    chuvaMat.opacity = presenca.chuva * 0.9;
    if (nChuva && !reduzido) {
      const vel = 1.6 + atual.chuva * 1.8;
      for (let i = 0; i < nChuva; i++) {
        let y = chuvaPos[i * 6 + 1] - vel * chuvaVel[i] * dt;
        if (y < TOPO + 0.02) y += 1.5;
        chuvaPos[i * 6 + 1] = y; chuvaPos[i * 6 + 4] = y + 0.15;
      }
      chuvaGeo.attributes.position.needsUpdate = true;
    }

    // Raios: nuvens e descargas
    clarao = Math.max(0, clarao - dt * 4);
    matNuvem.opacity = presenca.raios * (0.12 + atual.raios * 0.12) + clarao * 0.2 * presenca.raios;
    matNuvem.color.setRGB(0.42 + clarao * 0.5, 0.4 + clarao * 0.45, 0.62 + clarao * 0.4);
    for (const l of raios) if (l.material.opacity > 0) l.material.opacity = Math.max(0, l.material.opacity - dt * 5);
    impacto.material.opacity = clarao * presenca.raios;
    bloom.strength = 0.55 + (reduzido ? 0 : clarao * 0.3 * presenca.raios);
    luzRaio.intensity = lerp(luzRaio.intensity, 0, amort(12, dt));

    // Halo
    corHaloAlvo.copy(corHaloBase);
    if (presenca.temp > 0.01) corHaloAlvo.lerp(cor, 0.6 * presenca.temp);
    if (presenca.gelo > 0.01) corHaloAlvo.lerp(FRIO, 0.35 * presenca.gelo);
    halo.material.color.lerp(corHaloAlvo, amort(3, dt));

    // Agulha e sulco atual
    progresso = lerp(progresso, progressoAlvo, amort(6, dt));
    const rAgulha = temPassos ? R * 0.96 - progresso * (R * 0.96 - R_ROTULO * 1.15) : R * 1.32;
    anelAtual.scale.setScalar(Math.min(rAgulha, R));
    anelAtual.material.opacity = lerp(anelAtual.material.opacity, temPassos ? 0.9 : 0, amort(4, dt));
    braco.rotation.y = lerp(braco.rotation.y, -anguloPara(rAgulha), amort(5, dt));
    braco.rotation.z = lerp(braco.rotation.z, tocando ? 0 : 0.05, amort(4, dt));

    desenhar();
  });

  return {
    definirCamadas(lista) { for (const k in presencaAlvo) presencaAlvo[k] = lista.includes(k) ? 1 : 0; },
    definirValores(v) { for (const k in alvo) if (v[k] !== undefined) alvo[k] = v[k]; },
    definirProgresso(p, ha) { progressoAlvo = p; temPassos = ha; },
    definirTocando(b) { tocando = b; },
    definirFaixas(n) { desenharSulcos(n); },
    definirRotulo(r) { desenharRotulo(r); },
    raio(atrasoMs) { setTimeout(dispararRaio, Math.max(0, atrasoMs)); },
    onda(corCss) {
      if (reduzido) return;
      onda.material.color.set(corCss).multiplyScalar(1.5); ondaT = 0;
    },
  };
}
