// Mapa de pontos: os 5.570 municípios como um campo de pontos (à moda do othernetwork),
// com halos que crescem e mudam de cor a cada passo da história.
// Depende de d3 (global) para a projeção. rough (global) é opcional, para as anotações a mão.

const UF_COD = { 11: "RO", 12: "AC", 13: "AM", 14: "RR", 15: "PA", 16: "AP", 17: "TO", 21: "MA", 22: "PI", 23: "CE", 24: "RN", 25: "PB", 26: "PE", 27: "AL", 28: "SE", 29: "BA", 31: "MG", 32: "ES", 33: "RJ", 35: "SP", 41: "PR", 42: "SC", 43: "RS", 50: "MS", 51: "MT", 52: "GO", 53: "DF" };
export const ufDoCodigo = (ibge) => UF_COD[String(ibge).slice(0, 2)];

const hex = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
export const CORES = {
  tinta: hex("#000000"), lula: hex("#ff1a1a"), flavio: hex("#6b6b6b"), apagado: hex("#d6d6d6"), meio: hex("#a9a9a9"),
  f1: hex("#ff1a1a"), f2: hex("#7533ff"), f3: hex("#ff9900"),
};
// halos: cores médias da paleta com transparência; sobreposições escurecem (multiply)
export const HALOS = [null, "rgba(255,127,127,0.42)", "rgba(186,153,255,0.48)", "rgba(255,204,127,0.6)", "rgba(0,0,0,0.07)", "rgba(255,26,26,0.16)"];

const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export class MapaPontos {
  constructor(canvas, P, { area, divisas = null, raioPonto = null } = {}) {
    this.c = canvas;
    this.ctx = canvas.getContext("2d");
    this.P = P;
    this.n = P.lon.length;
    this.area = area || ((w, h) => [[16, 16], [w - 16, h - 16]]);
    this.divisas = divisas;
    this.raioPontoFn = raioPonto;
    this.uf = Array.from(P.ibge, ufDoCodigo);
    const n = this.n;
    this.x = new Float32Array(n); this.y = new Float32Array(n);
    // atual / início / alvo
    this.cor = new Float32Array(n * 3); this.cor0 = new Float32Array(n * 3); this.cor1 = new Float32Array(n * 3);
    this.r = new Float32Array(n); this.r0 = new Float32Array(n); this.r1 = new Float32Array(n);
    this.h = new Float32Array(n); this.h0 = new Float32Array(n); this.h1 = new Float32Array(n);
    this.hc = new Uint8Array(n);
    this.rotulos = [];
    this.anotacoes = [];
    this.t = 1;
    this.proj = d3.geoConicEqualArea().parallels([-2, -22]).rotate([54, 0]);
    this.resize();
    for (let i = 0; i < n; i++) { this.cor.set(CORES.tinta, i * 3); this.r[i] = this.base; }
    this._ro = new ResizeObserver(() => {
      const w = this.largura, h = this.altura;
      this.resize();
      if (this.aoRedimensionar && (Math.abs(w - this.largura) > 1 || Math.abs(h - this.altura) > 60)) this.aoRedimensionar();
      else this.desenhar();
    });
    this._ro.observe(canvas);
  }

  resize() {
    const rect = this.c.getBoundingClientRect();
    const w = Math.max(1, rect.width), h = Math.max(1, rect.height);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.largura = w; this.altura = h; this.dpr = dpr;
    this.c.width = Math.round(w * dpr); this.c.height = Math.round(h * dpr);
    const caixa = this.area(w, h);
    const geo = this.enquadre || { type: "MultiPoint", coordinates: [[-73.99, -33.75], [-34.79, 5.27], [-73.99, 5.27], [-34.79, -33.75]] };
    this.proj.fitExtent(caixa, geo);
    for (let i = 0; i < this.n; i++) {
      const p = this.proj([this.P.lon[i], this.P.lat[i]]);
      this.x[i] = p[0]; this.y[i] = p[1];
    }
    const lado = Math.min(caixa[1][0] - caixa[0][0], caixa[1][1] - caixa[0][1]);
    this.base = this.raioPontoFn ? this.raioPontoFn(lado) : Math.max(0.9, Math.min(1.8, lado / 380));
    this.hmax = Math.max(9, Math.min(26, lado / 27));
    if (this.divisas) {
      const caminho = (linhas) => {
        const p = new Path2D();
        for (const l of linhas) l.forEach(([lo, la], k) => { const q = this.proj([lo, la]); k ? p.lineTo(q[0], q[1]) : p.moveTo(q[0], q[1]); });
        return p;
      };
      this.pathUF = caminho(this.divisas.uf);
      this.pathBR = caminho(this.divisas.br);
    }
  }

  // aproxima o mapa num conjunto de pontos (índices); sem índices volta ao Brasil inteiro
  enquadrar(indices = null) {
    if (indices && indices.length) {
      let lo0 = 180, lo1 = -180, la0 = 90, la1 = -90;
      for (const i of indices) { lo0 = Math.min(lo0, this.P.lon[i]); lo1 = Math.max(lo1, this.P.lon[i]); la0 = Math.min(la0, this.P.lat[i]); la1 = Math.max(la1, this.P.lat[i]); }
      const m = Math.max(0.12, Math.max(lo1 - lo0, la1 - la0) * 0.12);
      this.enquadre = { type: "MultiPoint", coordinates: [[lo0 - m, la0 - m], [lo1 + m, la1 + m], [lo0 - m, la1 + m], [lo1 + m, la0 - m]] };
    } else this.enquadre = null;
    this.resize();
  }

  // escala de raio do halo (raiz quadrada; o topo é o percentil 99,5 para um único ponto não achatar o resto)
  // piso: fração dos menores valores que fica sem halo (menos ruído onde há muitos pontos)
  escala(vals, { piso: fp = 0.2, fator = 1 } = {}) {
    const v = Array.from(vals).filter((x) => x > 0).sort((a, b) => a - b);
    const topo = v.length ? v[Math.min(v.length - 1, Math.floor(v.length * 0.995))] : 1;
    const hm = this.hmax * fator;
    const piso = v.length ? v[Math.floor(v.length * fp)] : 0;
    return (x) => (x > piso ? Math.min(hm * 1.25, hm * Math.sqrt(x / topo)) : 0);
  }

  // fn(i) -> { cor: [r,g,b], r: raio do ponto, halo: raio do halo, hc: índice da cor do halo }
  estado(fn, { rotulos = [], anotacoes = [], instantaneo = false } = {}) {
    for (let i = 0; i < this.n; i++) {
      const s = fn(i);
      this.cor0.set(this.cor.subarray(i * 3, i * 3 + 3), i * 3);
      this.cor1.set(s.cor || CORES.tinta, i * 3);
      this.r0[i] = this.r[i]; this.r1[i] = s.r == null ? this.base : s.r;
      const hc = s.hc || 0;
      if (hc !== this.hc[i]) { this.h0[i] = 0; this.hc[i] = hc; } else this.h0[i] = this.h[i];
      this.h1[i] = hc ? s.halo || 0 : 0;
    }
    this.rotulos = rotulos;
    this.anotacoes = anotacoes;
    if (instantaneo || matchMedia("(prefers-reduced-motion: reduce)").matches) { this.t = 1; this._passo(1); this.desenhar(); return; }
    this.t = 0;
    this.t0 = performance.now();
    if (!this._anim) this._anim = requestAnimationFrame((ts) => this._loop(ts));
  }

  _passo(e) {
    const n = this.n;
    for (let k = 0; k < n * 3; k++) this.cor[k] = this.cor0[k] + (this.cor1[k] - this.cor0[k]) * e;
    for (let i = 0; i < n; i++) {
      this.r[i] = this.r0[i] + (this.r1[i] - this.r0[i]) * e;
      this.h[i] = this.h0[i] + (this.h1[i] - this.h0[i]) * e;
    }
  }

  _loop(ts) {
    const t = Math.min(1, (ts - this.t0) / 850);
    this.t = t;
    this._passo(ease(t));
    if (t < 1) { this._anim = requestAnimationFrame((x) => this._loop(x)); this.desenhar(); }
    else { this._anim = null; this.desenhar(); }
  }

  desenhar() {
    const { ctx, n, dpr } = this;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, this.largura, this.altura);
    if (this.pathUF) {
      ctx.lineWidth = 0.7; ctx.strokeStyle = "#e4e4e4"; ctx.stroke(this.pathUF);
      ctx.lineWidth = 0.9; ctx.strokeStyle = "#d2d2d2"; ctx.stroke(this.pathBR);
    }
    // halos, por cor, em multiply
    ctx.globalCompositeOperation = "multiply";
    for (let c = 1; c < HALOS.length; c++) {
      ctx.fillStyle = HALOS[c];
      ctx.beginPath();
      let algum = false;
      for (let i = 0; i < n; i++) {
        if (this.hc[i] !== c || this.h[i] < 0.6) continue;
        ctx.moveTo(this.x[i] + this.h[i], this.y[i]);
        ctx.arc(this.x[i], this.y[i], this.h[i], 0, 6.2832);
        algum = true;
      }
      if (algum) ctx.fill();
    }
    ctx.globalCompositeOperation = "source-over";
    // pontos, agrupados por cor
    const grupos = new Map();
    for (let i = 0; i < n; i++) {
      if (this.r[i] < 0.2) continue;
      const k = (Math.round(this.cor[i * 3]) << 16) | (Math.round(this.cor[i * 3 + 1]) << 8) | Math.round(this.cor[i * 3 + 2]);
      let g = grupos.get(k);
      if (!g) grupos.set(k, (g = []));
      g.push(i);
    }
    // cinzas primeiro, cores por cima
    const ordem = [...grupos.keys()].sort((a, b) => satur(a) - satur(b));
    for (const k of ordem) {
      ctx.fillStyle = "#" + k.toString(16).padStart(6, "0");
      ctx.beginPath();
      for (const i of grupos.get(k)) { ctx.moveTo(this.x[i] + this.r[i], this.y[i]); ctx.arc(this.x[i], this.y[i], this.r[i], 0, 6.2832); }
      ctx.fill();
    }
    if (this.t >= 1) this._desenharAnotacoes();
  }

  _desenharAnotacoes() {
    const { ctx } = this;
    // elipses a mão em volta de grupos de estados
    if (this.anotacoes.length && window.rough) {
      const rc = window.rough.canvas(this.c);
      for (const a of this.anotacoes) {
        const xs = [], ys = [];
        for (let i = 0; i < this.n; i++) if (a.ufs.includes(this.uf[i])) { xs.push(this.x[i]); ys.push(this.y[i]); }
        if (!xs.length) continue;
        const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
        const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, w = (x1 - x0) * 1.16 + 22, h = (y1 - y0) * 1.16 + 22;
        rc.ellipse(cx, cy, w, h, { stroke: a.cor || "#000", strokeWidth: 1.6, roughness: 1.4, bowing: 1.2, seed: 7 });
        if (a.texto) {
          // etiqueta no alto da elipse, à esquerda, sempre dentro da tela
          const ang = -2.2, ex = cx + (w / 2) * Math.cos(ang), ey = cy + (h / 2) * Math.sin(ang);
          etiqueta(ctx, a.texto, Math.max(8, Math.min(this.largura - 8, ex)), Math.max(16, ey), "right", a.cor, this.largura);
        }
      }
    }
    // rótulos de cidades, sem sobreposição
    if (this.rotulos.length) {
      const ocupado = [];
      ctx.font = "500 12px 'Bricolage Grotesque', Helvetica, Arial, sans-serif";
      for (const r of this.rotulos) {
        const p = this.proj([r.lon, r.lat]);
        if (!p) continue;
        const tw = ctx.measureText(r.texto).width + 12;
        const cands = [[p[0] + 7, p[1] - 9], [p[0] - tw - 7, p[1] - 9], [p[0] - tw / 2, p[1] - 26], [p[0] - tw / 2, p[1] + 8]];
        let ok = null;
        for (const [x, y] of cands) {
          const box = [x, y, x + tw, y + 18];
          if (box[0] < 4 || box[2] > this.largura - 4 || box[1] < 4 || box[3] > this.altura - 4) continue;
          if (ocupado.some((b) => !(box[2] < b[0] || box[0] > b[2] || box[3] < b[1] || box[1] > b[3]))) continue;
          ok = box; break;
        }
        if (!ok) continue;
        ocupado.push(ok);
        ctx.fillStyle = "rgba(255,255,255,0.94)";
        rrect(ctx, ok[0], ok[1], tw, 18, 3); ctx.fill();
        ctx.fillStyle = "#000";
        ctx.textBaseline = "middle";
        ctx.fillText(r.texto, ok[0] + 6, ok[1] + 9.5);
        ctx.beginPath(); ctx.arc(p[0], p[1], 2.6, 0, 6.2832); ctx.fillStyle = r.cor || "#000"; ctx.fill();
      }
    }
  }
}

function satur(k) { const r = k >> 16, g = (k >> 8) & 255, b = k & 255; return Math.max(r, g, b) - Math.min(r, g, b); }
function rrect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
function etiqueta(ctx, texto, x, y, alinhar, cor, largura = 1e9) {
  ctx.font = "500 14px 'Bricolage Grotesque', Helvetica, Arial, sans-serif";
  const tw = ctx.measureText(texto).width + 12;
  let x0 = alinhar === "right" ? x - tw : x;
  x0 = Math.max(6, Math.min(largura - tw - 6, x0));
  ctx.fillStyle = "rgba(255,255,255,0.95)"; rrect(ctx, x0, y - 11, tw, 22, 4); ctx.fill();
  ctx.fillStyle = cor || "#000"; ctx.textBaseline = "middle"; ctx.fillText(texto, x0 + 6, y + 0.5);
}
