// Reel animado 1080 × 1920: cinco cenas com texto que entra palavra por palavra, mapa de pontos e transições.
// Toca no navegador (Player) e é gravado em MP4 no próprio navegador (WebCodecs + mp4-muxer):
// H.264 quando o navegador tem; senão VP9 em MP4; em último caso, WebM pelo MediaRecorder.
export const W = 1080, H = 1920, FPS = 30;
const UI = '"Bricolage Grotesque", "Helvetica Neue", Arial, sans-serif';
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const saida = (t) => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
const X0 = 72, LARG = 900;        // margem esquerda e largura útil (à direita ficam os ícones do Instagram)
const ENTRADA = 0.35;             // duração da transição de cena

// ---------------------------------------------------------------- texto
function fonte(ctx, tam, peso, estreito) {
  ctx.font = `${peso} ${tam}px ${UI}`;
  if ("fontStretch" in ctx) ctx.fontStretch = estreito ? "condensed" : "normal";
}
// "*palavras*" entre asteriscos ganham caixa de destaque
function tokens(txt) {
  const out = [];
  let marcado = false;
  for (const bruto of String(txt).split(/\s+/).filter(Boolean)) {
    let w = bruto, ini = false, fim = false;
    if (w.startsWith("*")) { ini = true; w = w.slice(1); }
    if (w.endsWith("*") || /\*[.,!?;:”"]$/.test(w)) { fim = true; w = w.replace(/\*(?=[.,!?;:”"]?$)/, ""); }
    if (ini) marcado = true;
    out.push({ w, d: marcado });
    if (fim) marcado = false;
  }
  return out;
}
function linhas(ctx, toks, largura, esp) {
  const ls = [];
  let atual = [], larg = 0;
  for (const t of toks) {
    const tw = ctx.measureText(t.w).width;
    if (atual.length && larg + esp + tw > largura) { ls.push(atual); atual = []; larg = 0; }
    atual.push({ ...t, tw });
    larg += (atual.length > 1 ? esp : 0) + tw;
  }
  if (atual.length) ls.push(atual);
  return ls;
}
// desenha um bloco de texto que entra palavra por palavra; devolve o y da base da última linha
function texto(ctx, txt, o) {
  const { x = X0, y, largura = LARG, tam, peso = 800, cor = "#fff", t, entra = 0, passo = 0.05, altura = 1.06, estreito = true,
    corDestaque = "#e0201b", corTextoDestaque = "#fff", medir = false } = o;
  fonte(ctx, tam, peso, estreito);
  const esp = ctx.measureText(" ").width;
  const ls = linhas(ctx, tokens(txt), largura, esp);
  if (medir) return ls.length * tam * altura;
  let i = 0, yy = y;
  ctx.textBaseline = "alphabetic";
  for (const l of ls) {
    let xx = x;
    for (let k = 0; k < l.length; k++) {
      const p = clamp((t - (entra + i * passo)) / 0.3, 0, 1);
      const w = l[k];
      if (p > 0) {
        const sobe = (1 - saida(p)) * 28;
        if (w.d) {
          // caixa de destaque, emendada com a palavra seguinte se ela também estiver marcada
          const prox = l[k + 1];
          const larguraCaixa = w.tw + (prox && prox.d ? esp + 2 : 0);
          ctx.globalAlpha = 1;
          ctx.fillStyle = corDestaque;
          ctx.fillRect(xx - (k === 0 || !l[k - 1].d ? 10 : 0), yy - tam * 0.86 + sobe, (larguraCaixa + (k === 0 || !l[k - 1].d ? 10 : 0) + (prox && prox.d ? 0 : 10)) * saida(p), tam * 1.02);
        }
        ctx.globalAlpha = p;
        ctx.fillStyle = w.d ? corTextoDestaque : cor;
        ctx.fillText(w.w, xx, yy + sobe);
      }
      xx += w.tw + esp + (w.d && !(l[k + 1] && l[k + 1].d) ? 10 : 0);
      i++;
    }
    yy += tam * altura;
  }
  ctx.globalAlpha = 1;
  return yy - tam * altura;
}
function linhaFonte(ctx, txt, y, cor, t, entra = 0.9) {
  if (!txt) return;
  const p = clamp((t - entra) / 0.4, 0, 1);
  if (p <= 0) return;
  ctx.globalAlpha = p;
  fonte(ctx, 28, 400, false);
  ctx.fillStyle = cor;
  ctx.textBaseline = "alphabetic";
  const ls = linhas(ctx, tokens(txt), LARG, ctx.measureText(" ").width).slice(0, 2);
  ls.forEach((l, i) => ctx.fillText(l.map((w) => w.w).join(" "), X0, y + i * 36));
  ctx.globalAlpha = 1;
}
function pilula(ctx, txt, x, y, fundo, cor, tam = 38, p = 1) {
  if (p <= 0) return 0;
  fonte(ctx, tam, 700, false);
  const w = ctx.measureText(txt).width + 36, h = tam + 26;
  ctx.globalAlpha = p;
  ctx.fillStyle = fundo;
  ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, 12) : ctx.rect(x, y, w, h); ctx.fill();
  ctx.fillStyle = cor; ctx.textBaseline = "middle";
  ctx.fillText(txt, x + 18, y + h / 2 + 2);
  ctx.textBaseline = "alphabetic";
  ctx.globalAlpha = 1;
  return w;
}

// ---------------------------------------------------------------- mapa (cônica equivalente, como no site)
const RAD = Math.PI / 180;
const N_ = (Math.sin(-2 * RAD) + Math.sin(-22 * RAD)) / 2, C_ = Math.cos(-2 * RAD) ** 2 + 2 * N_ * Math.sin(-2 * RAD);
const rho = (f) => Math.sqrt(C_ - 2 * N_ * Math.sin(f)) / N_;
export function projetar(lon, lat) {
  const th = N_ * (lon * RAD + 54 * RAD), r = rho(lat * RAD);
  return [r * Math.sin(th), -(rho(0) - r * Math.cos(th))];
}
export function prepararMapa(P) {
  const n = P.lon.length, u = new Float32Array(n), v = new Float32Array(n);
  let u0 = Infinity, u1 = -Infinity, v0 = Infinity, v1 = -Infinity;
  for (let i = 0; i < n; i++) {
    const [a, b] = projetar(P.lon[i], P.lat[i]);
    u[i] = a; v[i] = b;
    u0 = Math.min(u0, a); u1 = Math.max(u1, a); v0 = Math.min(v0, b); v1 = Math.max(v1, b);
  }
  return { n, u, v, caixa: [u0, v0, u1, v1] };
}
// do Brasil inteiro até a região da cidade (num quadro menor, os pontos encolhem junto)
function mapa(ctx, M, alvo, cor, t, area) {
  const [ax, ay, aw, ah] = area;
  const [u0, v0, u1, v1] = M.caixa;
  const kBR = Math.min(aw / (u1 - u0), ah / (v1 - v0));
  const kPerto = kBR * 5.5;
  const z = saida(clamp((t - 0.2) / 2.2, 0, 1));
  const k = kBR * Math.pow(kPerto / kBR, z);
  const cuBR = (u0 + u1) / 2, cvBR = (v0 + v1) / 2;
  const cu = cuBR + (alvo[0] - cuBR) * z, cv = cvBR + (alvo[1] - cvBR) * z;
  const ox = ax + aw / 2 - cu * k, oy = ay + ah / 2 - cv * k;
  const esc = clamp(aw / 900, 0.4, 1);
  const r = (2.2 + 2.4 * z) * esc;
  ctx.fillStyle = "#4a4a4a";
  ctx.beginPath();
  for (let i = 0; i < M.n; i++) {
    const x = M.u[i] * k + ox, y = M.v[i] * k + oy;
    if (x < ax - 4 || x > ax + aw + 4 || y < ay - 4 || y > ay + ah + 4) continue;
    ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, 6.2832);
  }
  ctx.fill();
  const cx = alvo[0] * k + ox, cy = alvo[1] * k + oy;
  const pulso = (t * 1.3) % 1;
  ctx.strokeStyle = cor; ctx.lineWidth = 6 * esc;
  ctx.globalAlpha = 1 - pulso;
  ctx.beginPath(); ctx.arc(cx, cy, (18 + pulso * 70) * esc, 0, 6.2832); ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.fillStyle = cor;
  ctx.beginPath(); ctx.arc(cx, cy, 18 * esc, 0, 6.2832); ctx.fill();
  ctx.lineWidth = 6 * esc; ctx.strokeStyle = "#fff"; ctx.stroke();
}

// ---------------------------------------------------------------- fotos
const pronta = (img) => !!(img && img.complete && img.naturalWidth);
// foto cobrindo a área, com zoom lento ao longo da cena
function foto(ctx, img, t, dur, { x = 0, y = 0, w = W, h = H, zoom = 0.1, foco = [0.5, 0.45] } = {}) {
  if (!pronta(img)) return false;
  const iw = img.naturalWidth, ih = img.naturalHeight;
  const s = Math.max(w / iw, h / ih) * (1 + zoom * clamp(t / dur, 0, 1));
  const dw = iw * s, dh = ih * s;
  ctx.save();
  ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  ctx.drawImage(img, x + (w - dw) * foco[0], y + (h - dh) * foco[1], dw, dh);
  ctx.restore();
  return true;
}
function veu(ctx, y0, y1, a0, a1) {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, `rgba(0,0,0,${a0})`); g.addColorStop(1, `rgba(0,0,0,${a1})`);
  ctx.fillStyle = g; ctx.fillRect(0, y0, W, y1 - y0);
}
function caixa(ctx, x, y, w, h, cor, r = 16) {
  ctx.fillStyle = cor;
  ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h); ctx.fill();
}
// fundo na cor da frente com a foto em tom único por cima
function duotom(ctx, img, cor, t, dur) {
  ctx.fillStyle = cor; ctx.fillRect(0, 0, W, H);
  if (!pronta(img)) return;
  ctx.save();
  ctx.globalCompositeOperation = "multiply";
  ctx.globalAlpha = 0.5;
  if ("filter" in ctx) ctx.filter = "grayscale(1) contrast(1.15) brightness(1.15)";
  foto(ctx, img, t, dur, { zoom: 0.06 });
  ctx.restore();
}

// ---------------------------------------------------------------- tempo de leitura
// Cada tela fica o tempo de ler com calma: 3,4 palavras por segundo, mais uma pausa.
const LEITURA = 3.4;
export const palavras = (...txts) => txts.filter(Boolean).join(" ").replace(/\*/g, "").split(/\s+/).filter(Boolean).length;
const tempo = (n, min = 4, max = 11, extra = 0) => clamp(1.1 + n / LEITURA + extra, min, max);
// quando entra cada bloco de texto (para não começar o seguinte antes de o anterior terminar)
const fimDe = (entra, txt, passo = 0.06) => entra + tokens(txt).length * passo + 0.35;

// ---------------------------------------------------------------- telas
// k: conteúdo do kit (ver reels.js). k.telas = lista de telas na ordem do vídeo; cada tipo sabe se desenhar
// a partir do próprio tempo local e diz quanto tempo precisa.
const TELAS = {
  gancho(k, s, M) {
    const dur = tempo(palavras(s.texto, s.status), 5.5, 11, 0.8);
    const entraSt = fimDe(0.6, s.texto) + 0.2;
    return { dur, fundo: "#0d0d0d", desenhar: (ctx, t) => {
      // o bloco de texto termina logo acima das fontes e cresce para cima o quanto precisar
      const hT = texto(ctx, s.texto, { tam: 88, medir: true });
      const hS = s.status ? 40 + texto(ctx, s.status, { tam: 50, peso: 500, estreito: false, medir: true }) : 0;
      const topo = 1420 - hT - hS;
      const mapaH = clamp(topo - 400, 360, 700);
      const comFoto = foto(ctx, k.foto, t, dur, { zoom: 0.12 });
      if (comFoto) {
        ctx.fillStyle = "rgba(0,0,0,0.22)"; ctx.fillRect(0, 0, W, H);
        veu(ctx, Math.min(820, topo - 200), H, 0, 0.9);
        // o mapa vira um quadro no canto: mostra onde fica a cidade
        const q = 300, qx = W - X0 - q, qy = 200;
        ctx.globalAlpha = clamp(t / 0.4, 0, 1);
        caixa(ctx, qx, qy, q, q, "rgba(13,13,13,0.78)", 18);
        mapa(ctx, M, k.alvo, k.cor, t, [qx + 12, qy + 12, q - 24, q - 24]);
        ctx.globalAlpha = 1;
      } else mapa(ctx, M, k.alvo, k.cor, t, [X0, 330, LARG, mapaH]);
      pilula(ctx, `${k.cidade} · ${k.uf}`, X0, 230, "#fff", "#000", 40, clamp(t / 0.3, 0, 1));
      const y0 = Math.max(comFoto ? 640 : 330 + mapaH + 80, topo + 88 * 0.86);
      const y = texto(ctx, s.texto, { y: y0, tam: 88, t, entra: 0.6, corDestaque: k.cor });
      if (s.status) texto(ctx, s.status, { y: y + 40 + 50 * 0.86 + 88 * 0.2, tam: 50, peso: 500, cor: "#e6e6e6", t, entra: entraSt, estreito: false });
      linhaFonte(ctx, s.fonte, 1470, "#c8c8c8", t, 1.4);
      if (comFoto && k.fotoCredito) linhaFonte(ctx, k.fotoCredito, 1548, "rgba(255,255,255,0.72)", t, 1.4);
    } };
  },
  frase(k, s) {
    const dur = tempo(palavras(s.texto), 3.6, 6);
    return { dur, fundo: "#ffffff", desenhar: (ctx, t) => {
      pilula(ctx, k.cidade, X0, 230, "#0d0d0d", "#fff", 38, clamp(t / 0.3, 0, 1));
      texto(ctx, s.texto, { y: 760, tam: 104, cor: "#0d0d0d", t, entra: 0.15, corDestaque: k.cor });
    } };
  },
  proposta(k, s) {
    const n = palavras(s.texto) + 0.6 * palavras(s.numeroTexto);
    const dur = tempo(n, 5, 10, s.numero ? 0.6 : 0);
    const entraN = fimDe(0.15, s.texto) + 0.2;
    return { dur, fundo: "#ffffff", desenhar: (ctx, t) => {
      pilula(ctx, "O que Lula fez", X0, 230, k.cor, "#fff", 38, clamp(t / 0.3, 0, 1));
      const y = texto(ctx, s.texto, { y: 500, tam: 80, peso: 800, cor: "#0d0d0d", t, entra: 0.15, corDestaque: k.cor });
      if (s.numero) {
        const p = clamp((t - entraN) / 0.5, 0, 1);
        fonte(ctx, s.numero.length > 10 ? 150 : 190, 800, true);
        ctx.globalAlpha = p; ctx.fillStyle = k.corTexto;
        ctx.fillText(s.numero, X0 - 6, y + 270 + (1 - saida(p)) * 40);
        ctx.globalAlpha = 1;
        texto(ctx, s.numeroTexto, { y: y + 370, tam: 58, peso: 600, cor: "#0d0d0d", t, entra: entraN + 0.3, estreito: false });
      }
      linhaFonte(ctx, s.fonte, 1470, "#6b6b6b", t, 1.2);
    } };
  },
  ataque(k, s) {
    const dur = tempo(palavras(s.texto), 5, 9);
    return { dur, fundo: "#0d0d0d", desenhar: (ctx, t) => {
      texto(ctx, s.titulo || "E o Flávio?", { y: 330, tam: 64, peso: 700, cor: k.cor, t, entra: 0.1, estreito: false });
      texto(ctx, s.texto, { y: 560, tam: 90, cor: "#fff", t, entra: 0.5, corDestaque: k.cor });
      linhaFonte(ctx, s.fonte, 1470, "#9a9a9a", t, 1.2);
    } };
  },
  ataque2(k, s) {
    const dur = tempo(palavras(s.texto, s.soco), 5, 9);
    const entraS = fimDe(0.15, s.texto) + 0.4;
    return { dur, fundo: "#0d0d0d", desenhar: (ctx, t) => {
      const y = texto(ctx, s.texto, { y: 520, tam: 70, peso: 600, cor: "#e6e6e6", t, entra: 0.15, estreito: false });
      texto(ctx, s.soco, { y: Math.max(y + 230, 1000), tam: 92, cor: "#fff", t, entra: entraS, corDestaque: k.cor });
      linhaFonte(ctx, s.fonte, 1470, "#9a9a9a", t, 1);
    } };
  },
  // a gestão do PL na cidade, com o fato documentado e a resposta da prefeitura
  local(k, s) {
    const dur = tempo(palavras(s.quem, s.soco), 4.5, 8, pronta(k.fotoPrefeito) ? 0.8 : 0);
    const entraS = fimDe(0.6, s.quem) + 0.4;
    return { dur, fundo: "#0d0d0d", desenhar: (ctx, t) => {
      const yt = texto(ctx, s.titulo, { y: 330, tam: 64, peso: 700, cor: k.cor, t, entra: 0.1, estreito: false });
      let y0 = Math.max(600, yt + 200);
      if (pronta(k.fotoPrefeito)) {
        const p = clamp((t - 0.3) / 0.5, 0, 1);
        ctx.globalAlpha = p;
        const fw = 460, fh = 560, fx = X0, fy = yt + 60;
        ctx.save(); ctx.beginPath(); ctx.roundRect ? ctx.roundRect(fx, fy, fw, fh, 18) : ctx.rect(fx, fy, fw, fh); ctx.clip();
        foto(ctx, k.fotoPrefeito, 0, 1, { x: fx, y: fy, w: fw, h: fh, zoom: 0, foco: [0.5, 0.3] });
        ctx.restore();
        if (s.legendaFoto) linhaFonte(ctx, s.legendaFoto, fy + fh + 44, "#bdbdbd", t, 0.5);
        ctx.globalAlpha = 1;
        y0 = fy + fh + 170;
      }
      const y = texto(ctx, s.quem, { y: y0, tam: 84, cor: "#fff", t, entra: 0.6, corDestaque: k.cor });
      if (s.soco) texto(ctx, s.soco, { y: y + 200, tam: 88, cor: "#fff", t, entra: entraS, corDestaque: k.cor });
    } };
  },
  local2(k, s) {
    const dur = tempo(palavras(s.texto, s.status, s.soco), 6, 11);
    const entraSt = fimDe(0.15, s.texto) + 0.2, entraS = entraSt + 0.9;
    return { dur, fundo: "#0d0d0d", desenhar: (ctx, t) => {
      const y = texto(ctx, s.texto, { y: 520, tam: 80, cor: "#fff", t, entra: 0.15, corDestaque: k.cor });
      const y2 = s.status ? texto(ctx, s.status, { y: y + 130, tam: 52, peso: 500, cor: "#cfcfcf", t, entra: entraSt, estreito: false }) : y;
      texto(ctx, s.soco, { y: Math.max(y2 + 200, 1120), tam: 88, cor: "#fff", t, entra: entraS, corDestaque: k.cor });
      linhaFonte(ctx, s.fonte, 1470, "#9a9a9a", t, 1);
    } };
  },
  numero(k, s) {
    const dur = tempo(palavras(s.texto, s.emocao), 5, 9);
    const entraE = fimDe(0.6, s.texto) + 0.3;
    return { dur, fundo: k.corClara, desenhar: (ctx, t) => {
      pilula(ctx, k.cidade, X0, 230, "#0d0d0d", "#fff", 38, clamp(t / 0.3, 0, 1));
      const p = clamp((t - 0.2) / 0.5, 0, 1);
      fonte(ctx, s.numero.length > 9 ? 170 : 220, 800, true);
      ctx.globalAlpha = p; ctx.fillStyle = k.corTexto;
      ctx.fillText(s.numero, X0 - 6, 720 + (1 - saida(p)) * 40);
      ctx.globalAlpha = 1;
      const y = texto(ctx, s.texto, { y: 860, tam: 70, peso: 700, cor: "#0d0d0d", t, entra: 0.6, corDestaque: k.cor });
      texto(ctx, s.emocao, { y: y + 160, tam: 80, cor: "#0d0d0d", t, entra: entraE, corDestaque: k.cor });
      linhaFonte(ctx, s.fonte, 1470, "#4d4d4d", t, 1.2);
    } };
  },
  chamada(k, s) {
    const dur = tempo(palavras(s.topo, "Dia 25, é 13.", s.acao), 6, 10, 0.6);
    return { dur, fundo: k.cor, desenhar: (ctx, t) => {
      duotom(ctx, k.foto, k.cor, t, dur);
      texto(ctx, s.topo, { y: 420, tam: 84, peso: 700, cor: "#fff", t, entra: 0.1, estreito: false });
      const p = clamp((t - 0.6) / 0.5, 0, 1);
      fonte(ctx, 300, 800, true);
      ctx.globalAlpha = p; ctx.fillStyle = "#fff";
      ctx.fillText("25/10", X0 - 10, 800 + (1 - saida(p)) * 50);
      ctx.globalAlpha = 1;
      texto(ctx, "Dia 25, é *13.*", { y: 980, tam: 110, cor: "#fff", t, entra: 1.1, corDestaque: "#0d0d0d" });
      texto(ctx, s.acao, { y: 1170, tam: 64, peso: 600, cor: "#fff", t, entra: 2, estreito: false });
      linhaFonte(ctx, "Domingo, 25 de outubro, das 8h às 17h. Feito com auxílio de IA.", 1470, "rgba(255,255,255,0.9)", t, 2.4);
    } };
  },
};

export function montarReel(k, M) {
  const cenas = k.telas.map((s) => ({ tipo: s.tipo, ...TELAS[s.tipo](k, s, M) }));
  let ini = 0;
  for (const c of cenas) { c.ini = ini; ini += c.dur; }
  const duracao = ini;
  // quadro da capa: fim da primeira tela, com o texto todo na tela
  const capaT = Math.max(0.5, cenas[0].dur - 0.4);
  function desenhar(ctx, t) {
    t = clamp(t, 0, duracao - 1e-3);
    let i = cenas.findIndex((c) => t < c.ini + c.dur);
    if (i < 0) i = cenas.length - 1;
    const c = cenas[i], tl = t - c.ini;
    // transição: a tela nova sobe por cima da anterior
    const p = i > 0 ? saida(clamp(tl / ENTRADA, 0, 1)) : 1;
    if (p < 1) {
      const a = cenas[i - 1];
      ctx.save();
      ctx.fillStyle = a.fundo; ctx.fillRect(0, 0, W, H);
      a.desenhar(ctx, a.dur);
      ctx.restore();
    }
    ctx.save();
    if (p < 1) { ctx.beginPath(); ctx.rect(0, H * (1 - p), W, H * p); ctx.clip(); ctx.translate(0, H * (1 - p) * 0.15); }
    ctx.fillStyle = c.fundo; ctx.fillRect(0, -H, W, 3 * H);
    c.desenhar(ctx, tl);
    ctx.restore();
  }
  return { duracao, cenas, desenhar, capaT };
}

// ---------------------------------------------------------------- player na página
export class Player {
  constructor(canvas, reel, { escala = 0.5, aoMudar = null } = {}) {
    this.c = canvas; this.ctx = canvas.getContext("2d");
    this.escala = escala; this.reel = reel; this.aoMudar = aoMudar;
    canvas.width = Math.round(W * escala); canvas.height = Math.round(H * escala);
    this.t = 0; this.tocando = false;
    this.quadro(0);
  }
  trocar(reel) { this.reel = reel; this.t = 0; this.quadro(0); }
  quadro(t) {
    this.t = t;
    this.ctx.setTransform(this.escala, 0, 0, this.escala, 0, 0);
    this.reel.desenhar(this.ctx, t);
    this.aoMudar?.(t, this.reel.duracao, this.tocando);
  }
  tocar() {
    if (this.tocando) return;
    if (this.t >= this.reel.duracao - 0.05) this.t = 0;
    this.tocando = true;
    const ini = performance.now() - this.t * 1000;
    const passo = (agora) => {
      if (!this.tocando) return;
      const t = (agora - ini) / 1000;
      if (t >= this.reel.duracao) { this.tocando = false; this.quadro(this.reel.duracao); return; }
      this.quadro(t);
      requestAnimationFrame(passo);
    };
    requestAnimationFrame(passo);
  }
  pausar() { this.tocando = false; this.quadro(this.t); }
  ir(t) { this.quadro(clamp(t, 0, this.reel.duracao)); }
}

// ---------------------------------------------------------------- gravação
async function codecMp4() {
  if (typeof VideoEncoder === "undefined") return null;
  const base = { width: W, height: H, bitrate: 6_000_000, framerate: FPS };
  const opcoes = [
    ["avc1.640028", "avc", { avc: { format: "avc" } }], ["avc1.4d0028", "avc", { avc: { format: "avc" } }],
    ["avc1.640033", "avc", { avc: { format: "avc" } }], ["avc1.42e028", "avc", { avc: { format: "avc" } }],
    ["vp09.00.40.08", "vp9", {}], ["av01.0.08M.08", "av1", {}],
  ];
  for (const [codec, mux, extra] of opcoes) {
    const config = { ...base, codec, ...extra };
    try { if ((await VideoEncoder.isConfigSupported(config)).supported) return { config, mux }; } catch { /* próximo */ }
  }
  return null;
}
// devolve { blob, ext, codec }
export async function gravar(reel, { aoProgresso = () => {} } = {}) {
  const cv = document.createElement("canvas");
  cv.width = W; cv.height = H;
  const ctx = cv.getContext("2d");
  const total = Math.round(reel.duracao * FPS);
  const escolha = await codecMp4();
  if (escolha) {
    const { Muxer, ArrayBufferTarget } = await import("../vendor/mp4-muxer-5.2.2.mjs");
    const muxer = new Muxer({ target: new ArrayBufferTarget(), video: { codec: escolha.mux, width: W, height: H, frameRate: FPS }, fastStart: "in-memory", firstTimestampBehavior: "offset" });
    let erro = null;
    const enc = new VideoEncoder({ output: (chunk, meta) => muxer.addVideoChunk(chunk, meta), error: (e) => { erro = e; } });
    enc.configure(escolha.config);
    for (let i = 0; i < total; i++) {
      if (erro) throw erro;
      reel.desenhar(ctx, i / FPS);
      const f = new VideoFrame(cv, { timestamp: Math.round((i * 1e6) / FPS), duration: Math.round(1e6 / FPS) });
      enc.encode(f, { keyFrame: i % (FPS * 2) === 0 });
      f.close();
      if (enc.encodeQueueSize > 4) await new Promise((r) => { const tempo = setTimeout(r, 50); enc.addEventListener?.("dequeue", () => { clearTimeout(tempo); r(); }, { once: true }); });
      if (i % 6 === 0) { aoProgresso(i / total); await new Promise((r) => setTimeout(r, 0)); }
    }
    await enc.flush();
    if (erro) throw erro;
    muxer.finalize();
    aoProgresso(1);
    return { blob: new Blob([muxer.target.buffer], { type: "video/mp4" }), ext: "mp4", codec: escolha.mux };
  }
  // sem WebCodecs: grava em tempo real
  if (typeof MediaRecorder === "undefined" || !cv.captureStream) throw new Error("Este navegador não grava vídeo.");
  const tipo = ["video/mp4;codecs=avc1", "video/mp4", "video/webm;codecs=vp9", "video/webm"].find((m) => MediaRecorder.isTypeSupported(m));
  const rec = new MediaRecorder(cv.captureStream(FPS), { mimeType: tipo, videoBitsPerSecond: 6_000_000 });
  const partes = [];
  rec.ondataavailable = (e) => e.data.size && partes.push(e.data);
  const fim = new Promise((r) => (rec.onstop = r));
  rec.start();
  const ini = performance.now();
  await new Promise((r) => {
    const passo = () => {
      const t = (performance.now() - ini) / 1000;
      reel.desenhar(ctx, Math.min(t, reel.duracao));
      aoProgresso(Math.min(1, t / reel.duracao));
      if (t >= reel.duracao) return r();
      requestAnimationFrame(passo);
    };
    requestAnimationFrame(passo);
  });
  rec.stop();
  await fim;
  const ext = tipo.startsWith("video/mp4") ? "mp4" : "webm";
  return { blob: new Blob(partes, { type: tipo.split(";")[0] }), ext, codec: tipo };
}
// capa: um quadro em PNG
export function capa(reel, t = reel.capaT ?? 2.6) {
  const cv = document.createElement("canvas");
  cv.width = W; cv.height = H;
  reel.desenhar(cv.getContext("2d"), t);
  return new Promise((r) => cv.toBlob(r, "image/png"));
}
