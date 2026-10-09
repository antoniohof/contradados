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
// do Brasil inteiro até a região da cidade
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
  const r = 2.2 + 2.4 * z;
  ctx.fillStyle = "#4a4a4a";
  ctx.beginPath();
  for (let i = 0; i < M.n; i++) {
    const x = M.u[i] * k + ox, y = M.v[i] * k + oy;
    if (x < ax - 10 || x > ax + aw + 10 || y < ay - 10 || y > ay + ah + 10) continue;
    ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, 6.2832);
  }
  ctx.fill();
  const cx = alvo[0] * k + ox, cy = alvo[1] * k + oy;
  const pulso = (t * 1.3) % 1;
  ctx.strokeStyle = cor; ctx.lineWidth = 6;
  ctx.globalAlpha = 1 - pulso;
  ctx.beginPath(); ctx.arc(cx, cy, 18 + pulso * 70, 0, 6.2832); ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.fillStyle = cor;
  ctx.beginPath(); ctx.arc(cx, cy, 18, 0, 6.2832); ctx.fill();
  ctx.lineWidth = 6; ctx.strokeStyle = "#fff"; ctx.stroke();
}

// ---------------------------------------------------------------- cenas
// k: conteúdo do kit (ver reels.js). Cada cena desenha a partir do seu próprio tempo local.
export function montarReel(k, M) {
  const cor = k.cor, claro = k.corClara, txtCor = k.corTexto;
  const cenas = [
    { dur: 4.6, fundo: "#0d0d0d", desenhar: (ctx, t) => {
      mapa(ctx, M, k.alvo, cor, t, [X0, 330, LARG, 700]);
      pilula(ctx, `${k.cidade} · ${k.uf}`, X0, 230, "#fff", "#000", 40, clamp(t / 0.3, 0, 1));
      texto(ctx, k.gancho, { y: 1150, tam: 88, t, entra: 0.6, corDestaque: cor });
      linhaFonte(ctx, k.ganchoFonte, 1470, "#9a9a9a", t, 1.4);
    } },
    { dur: 4.6, fundo: "#ffffff", desenhar: (ctx, t) => {
      pilula(ctx, k.cidade, X0, 230, "#0d0d0d", "#fff", 38, clamp(t / 0.3, 0, 1));
      const y = texto(ctx, k.virada, { y: 600, tam: 92, cor: "#0d0d0d", t, entra: 0.15, corDestaque: cor });
      texto(ctx, k.proposta, { y: y + 170, tam: 70, peso: 700, cor: "#0d0d0d", t, entra: 0.15 + tokens(k.virada).length * 0.05 + 0.3, corDestaque: cor });
      linhaFonte(ctx, k.propostaFonte, 1470, "#6b6b6b", t, 2);
    } },
    { dur: 5.4, fundo: "#0d0d0d", desenhar: (ctx, t) => {
      texto(ctx, "E o Flávio?", { y: 330, tam: 64, peso: 700, cor, t, entra: 0.1, estreito: false });
      const y = texto(ctx, k.ataque, { y: 520, tam: 84, cor: "#fff", t, entra: 0.45, corDestaque: cor });
      const y2 = k.ataqueSub ? texto(ctx, k.ataqueSub, { y: y + 120, tam: 56, peso: 500, cor: "#d9d9d9", t, entra: 1.6, estreito: false }) : y;
      texto(ctx, k.soco, { y: Math.max(y2 + 160, 1180), tam: 76, cor: "#fff", t, entra: 2.6, corDestaque: cor });
      linhaFonte(ctx, k.ataqueFonte, 1470, "#9a9a9a", t, 1.6);
    } },
    { dur: 4.2, fundo: claro, desenhar: (ctx, t) => {
      pilula(ctx, k.cidade, X0, 230, "#0d0d0d", "#fff", 38, clamp(t / 0.3, 0, 1));
      const p = clamp((t - 0.2) / 0.5, 0, 1);
      fonte(ctx, k.numero.length > 9 ? 170 : 220, 800, true);
      ctx.globalAlpha = p; ctx.fillStyle = txtCor;
      ctx.fillText(k.numero, X0 - 6, 720 + (1 - saida(p)) * 40);
      ctx.globalAlpha = 1;
      const y = texto(ctx, k.numeroTexto, { y: 860, tam: 68, peso: 700, cor: "#0d0d0d", t, entra: 0.6, corDestaque: cor });
      texto(ctx, k.numeroEmocao, { y: y + 150, tam: 76, cor: "#0d0d0d", t, entra: 1.5, corDestaque: cor });
      linhaFonte(ctx, k.numeroFonte, 1470, "#4d4d4d", t, 1.2);
    } },
    { dur: 4.6, fundo: cor, desenhar: (ctx, t) => {
      texto(ctx, k.chamadaTopo, { y: 420, tam: 84, peso: 700, cor: "#fff", t, entra: 0.1, estreito: false });
      const p = clamp((t - 0.5) / 0.5, 0, 1);
      fonte(ctx, 300, 800, true);
      ctx.globalAlpha = p; ctx.fillStyle = "#fff";
      ctx.fillText("25/10", X0 - 10, 800 + (1 - saida(p)) * 50);
      ctx.globalAlpha = 1;
      texto(ctx, "Dia 25, é *13.*", { y: 980, tam: 110, cor: "#fff", t, entra: 0.9, corDestaque: "#0d0d0d" });
      texto(ctx, k.chamadaAcao, { y: 1170, tam: 62, peso: 600, cor: "#fff", t, entra: 1.6, estreito: false });
      linhaFonte(ctx, "Domingo, 25 de outubro, das 8h às 17h. Feito com auxílio de IA.", 1470, "rgba(255,255,255,0.85)", t, 2);
    } },
  ];
  let ini = 0;
  for (const c of cenas) { c.ini = ini; ini += c.dur; }
  const duracao = ini;
  function desenhar(ctx, t) {
    t = clamp(t, 0, duracao - 1e-3);
    let i = cenas.findIndex((c) => t < c.ini + c.dur);
    if (i < 0) i = cenas.length - 1;
    const c = cenas[i], tl = t - c.ini;
    // transição: a cena nova sobe por cima da anterior
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
  return { duracao, cenas, desenhar };
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
export function capa(reel, t = 2.6) {
  const cv = document.createElement("canvas");
  cv.width = W; cv.height = H;
  reel.desenhar(cv.getContext("2d"), t);
  return new Promise((r) => cv.toBlob(r, "image/png"));
}
