// Mapa em camadas, desenhado em canvas.
//   base       um ponto por cidade; cor, tamanho e opacidade mudam a cada passo
//   densidade  1 ponto = 1.000 votos, sorteado dentro do território da cidade, na cor da frente
//   espinhos   um espinho por cidade, com altura proporcional aos votos; de norte a sul, com borda branca
//   por cima   rotas, nós, rótulos sem colisão, notas de região e a régua dos espinhos
// A projeção é calculada uma vez, em espaço unitário. Enquadrar (zoom) é só mudar a vista,
// animada com d3.interpolateZoom. Depende de d3 (global).

const UF_COD = { 11: "RO", 12: "AC", 13: "AM", 14: "RR", 15: "PA", 16: "AP", 17: "TO", 21: "MA", 22: "PI", 23: "CE", 24: "RN", 25: "PB", 26: "PE", 27: "AL", 28: "SE", 29: "BA", 31: "MG", 32: "ES", 33: "RJ", 35: "SP", 41: "PR", 42: "SC", 43: "RS", 50: "MS", 51: "MT", 52: "GO", 53: "DF" };
export const ufDoCodigo = (ibge) => UF_COD[String(ibge).slice(0, 2)];

const hex = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
// marcas no mapa: as três frentes passam no teste de daltonismo em todas as combinações
export const HEX = { tinta: "#000000", f1: "#e0201b", f2: "#7533ff", f3: "#e58a00", flavio: "#7a7a7a", claro: "#e6e6e6", apagado: "#cfcfcf", meio: "#a6a6a6" };
export const COR = Object.fromEntries(Object.entries(HEX).map(([k, v]) => [k, hex(v)]));
COR.lula = COR.f1;
export const COR_F = [COR.tinta, COR.f1, COR.f2, COR.f3];
export const HEX_F = [HEX.tinta, HEX.f1, HEX.f2, HEX.f3];
// tons de texto (contraste AA sobre branco)
export const TXT_F = ["#000000", "#d10000", "#6526e8", "#a85a00"];

const FONTE = "'Bricolage Grotesque', 'Helvetica Neue', Helvetica, Arial, sans-serif";
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const reduzido = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
// cor + opacidade numa chave numérica, para agrupar marcas iguais num só preenchimento
const chave = (arr, i, a) => ((Math.round(arr[i * 3]) << 16) | (Math.round(arr[i * 3 + 1]) << 8) | Math.round(arr[i * 3 + 2])) * 64 + Math.round(a * 63);
const estilo = (k) => { const c = Math.floor(k / 64); return `rgba(${c >> 16},${(c >> 8) & 255},${c & 255},${(k % 64) / 63})`; };
const peso = (k) => { const c = Math.floor(k / 64), r = c >> 16, g = (c >> 8) & 255, b = c & 255; return 765 - r - g - b + 2 * (Math.max(r, g, b) - Math.min(r, g, b)); };
const rgb = (arr, i) => `rgb(${Math.round(arr[i * 3])},${Math.round(arr[i * 3 + 1])},${Math.round(arr[i * 3 + 2])})`;

// distância em linha reta (km)
export const km = (a, b) => {
  const R = 6371, r = Math.PI / 180, dLa = (b.lat - a.lat) * r, dLo = (b.lon - a.lon) * r;
  const x = Math.sin(dLa / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLo / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
};
// ordem de visita: começa pela cidade com mais votos em jogo e segue sempre para a mais próxima
export function trajeto(itens, valor) {
  const resto = itens.slice().sort((a, b) => valor(b) - valor(a));
  const ordem = resto.length ? [resto.shift()] : [];
  const passos = [0];
  while (resto.length) {
    const atual = ordem[ordem.length - 1];
    let k = 0, dmin = Infinity;
    resto.forEach((c, i) => { const d = km(atual, c); if (d < dmin) { dmin = d; k = i; } });
    ordem.push(resto.splice(k, 1)[0]);
    passos.push(dmin);
  }
  return { ordem, passos, total: passos.reduce((a, b) => a + b, 0) };
}

export class Mapa {
  constructor(canvas, { pontos, area, areaZoom = null, divisas = null, densidade = null, dica = null, aoClicar = null, reservado = null } = {}) {
    this.c = canvas;
    canvas.mapa = this; // acesso para depuração no console
    this.ctx = canvas.getContext("2d");
    this.P = pontos;
    const n = (this.n = pontos.lon.length);
    this.area = area || ((w, h) => [[12, 12], [w - 12, h - 12]]);
    this.areaZoom = areaZoom; // área para enquadrar um recorte (por exemplo, sem a parte coberta pela legenda)
    this.proj = d3.geoConicEqualArea().parallels([-2, -22]).rotate([54, 0]).scale(1).translate([0, 0]);
    this.ux = new Float32Array(n); this.uy = new Float32Array(n);
    for (let i = 0; i < n; i++) { const p = this.proj([pontos.lon[i], pontos.lat[i]]); this.ux[i] = p[0]; this.uy[i] = p[1]; }
    this.sx = new Float32Array(n); this.sy = new Float32Array(n);
    // espinhos de norte a sul: o de baixo cobre o de cima
    this.ordemY = Uint32Array.from({ length: n }, (_, i) => i).sort((a, b) => this.uy[a] - this.uy[b]);
    const tres = (m, k) => [new Float32Array(m * k), new Float32Array(m * k), new Float32Array(m * k)];
    [this.bc, this.bc0, this.bc1] = tres(n, 3);
    [this.br, this.br0, this.br1] = tres(n, 1);
    [this.ba, this.ba0, this.ba1] = tres(n, 1);
    [this.eh, this.eh0, this.eh1] = tres(n, 1);
    [this.ec, this.ec0, this.ec1] = tres(n, 3);
    this.corte = new Uint8Array(n);
    this.dest = new Uint8Array(n); // espinho em destaque (contorno preto)
    this.br.fill(1); this.ba.fill(1);
    this.D = densidade;
    if (densidade) {
      const m = (this.dn = densidade.lon.length);
      this.dux = new Float32Array(m); this.duy = new Float32Array(m);
      for (let j = 0; j < m; j++) { const p = this.proj([densidade.lon[j], densidade.lat[j]]); this.dux[j] = p[0]; this.duy[j] = p[1]; }
      this.dsx = new Float32Array(m); this.dsy = new Float32Array(m);
      [this.dc, this.dc0, this.dc1] = tres(m, 3);
      [this.da, this.da0, this.da1] = tres(m, 1);
      this.E = this.E0 = this.E1 = 0;
    }
    if (divisas) { this.pathUF = this._caminho(divisas.uf); this.pathBR = this._caminho(divisas.br); }
    this.caixaBR = this._caixaBrasil(divisas);
    this.alvo = this.caixaBR;
    this.topo = { rotas: [], nos: [], rotulos: [], notas: [], regua: null };
    this.t = 1; this.so = 1; this.hover = -1;
    this.dica = dica; this.aoClicar = aoClicar;
    this.reservado = reservado; // () => [[x0, y0, x1, y1], ...]: áreas cobertas por outros elementos (legenda)
    this.resize();
    this.vista = this._vistaPara(this.alvo);
    this._projetar();
    this._ro = new ResizeObserver(() => this._aoMudarTamanho());
    this._ro.observe(canvas);
    if (dica || aoClicar) this._interacao();
    document.fonts?.ready.then(() => { if (!this._anim) { this.desenhar(); this._guardar(); } });
  }

  // ------------------------------------------------------------ geometria e vista
  _caminho(linhas) {
    const p = new Path2D();
    for (const l of linhas) l.forEach(([lo, la], k) => { const q = this.proj([lo, la]); k ? p.lineTo(q[0], q[1]) : p.moveTo(q[0], q[1]); });
    return p;
  }
  _caixaBrasil(divisas) {
    let u0 = Infinity, u1 = -Infinity, v0 = Infinity, v1 = -Infinity;
    const usa = (u, v) => { if (u < u0) u0 = u; if (u > u1) u1 = u; if (v < v0) v0 = v; if (v > v1) v1 = v; };
    if (divisas) for (const l of divisas.br) for (const c of l) { const q = this.proj(c); usa(q[0], q[1]); }
    else for (let i = 0; i < this.n; i++) usa(this.ux[i], this.uy[i]);
    return [[u0, v0], [u1, v1]];
  }
  _caixa(indices) {
    let u0 = Infinity, u1 = -Infinity, v0 = Infinity, v1 = -Infinity;
    for (const i of indices) { const u = this.ux[i], v = this.uy[i]; if (u < u0) u0 = u; if (u > u1) u1 = u; if (v < v0) v0 = v; if (v > v1) v1 = v; }
    const lado = Math.max(u1 - u0, v1 - v0);
    const m = Math.max(0.004, lado * 0.12);
    const cx = (u0 + u1) / 2, cy = (v0 + v1) / 2;
    const hw = Math.max((u1 - u0) / 2, 0.008) + m, hh = Math.max((v1 - v0) / 2, 0.008) + m;
    return [[cx - hw, cy - hh], [cx + hw, cy + hh]];
  }
  _vistaPara(caixa) {
    const [[u0, v0], [u1, v1]] = caixa;
    if (caixa === this.caixaBR || !this.areaZoom) return { cx: (u0 + u1) / 2, cy: (v0 + v1) / 2, k: Math.min(this.aw / (u1 - u0), this.ah / (v1 - v0)) };
    // enquadra na área de zoom e devolve a vista equivalente na área principal
    const [[x0, y0], [x1, y1]] = this.areaZoom(this.largura, this.altura);
    const k = Math.min((x1 - x0) / (u1 - u0), (y1 - y0) / (v1 - v0));
    const sx = (x0 + x1) / 2, sy = (y0 + y1) / 2;
    return { cx: (u0 + u1) / 2 + (this.ax - sx) / k, cy: (v0 + v1) / 2 + (this.ay - sy) / k, k };
  }
  resize() {
    const rect = this.c.getBoundingClientRect();
    const w = Math.max(1, rect.width), h = Math.max(1, rect.height);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.largura = w; this.altura = h; this.dpr = dpr;
    this.c.width = Math.round(w * dpr); this.c.height = Math.round(h * dpr);
    const [[x0, y0], [x1, y1]] = this.area(w, h);
    this.caixaTela = [[x0, y0], [x1, y1]];
    this.ax = (x0 + x1) / 2; this.ay = (y0 + y1) / 2;
    this.aw = Math.max(10, x1 - x0); this.ah = Math.max(10, y1 - y0);
    this.kBR = this._vistaPara(this.caixaBR).k;
    const lado = Math.min(this.aw, this.ah);
    this.rb = clamp(lado / 380, 0.9, 1.8);   // ponto de cidade
    this.rd = clamp(lado / 540, 0.72, 1.3);  // ponto de densidade
    this.ew = clamp(lado / 130, 3.5, 6);     // largura da base do espinho
    this.hMax = clamp(this.ah * 0.2, 45, 150);
    this.cache = null;
  }
  _aoMudarTamanho() {
    const w = this.largura, h = this.altura;
    if (this._anim) { cancelAnimationFrame(this._anim); this._anim = null; this._passo(1); this.t = 1; this.so = 1; }
    this.resize();
    this.vista = this._vistaPara(this.alvo);
    this._projetar();
    if (this.aoRedimensionar && (Math.abs(w - this.largura) > 1 || Math.abs(h - this.altura) > 60)) this.aoRedimensionar();
    else { this.desenhar(); this._guardar(); }
  }
  _projetar() {
    const { k, cx, cy } = this.vista;
    const ox = this.ax - cx * k, oy = this.ay - cy * k;
    for (let i = 0; i < this.n; i++) { this.sx[i] = this.ux[i] * k + ox; this.sy[i] = this.uy[i] * k + oy; }
    if (this.D) for (let j = 0; j < this.dn; j++) { this.dsx[j] = this.dux[j] * k + ox; this.dsy[j] = this.duy[j] * k + oy; }
    this.zf = Math.min(2.2, Math.sqrt(k / this.kBR));
  }
  tela(lon, lat) {
    const p = this.proj([lon, lat]), { k, cx, cy } = this.vista;
    return [this.ax + (p[0] - cx) * k, this.ay + (p[1] - cy) * k];
  }
  get larguraEspinho() { return this.ew * Math.min(1.35, Math.sqrt(this.zf)); }

  // escala linear dos espinhos. O topo é o maior valor, a não ser que poucos valores
  // fujam muito do resto: aí o topo é o percentil 99,5 e quem passa de 125% dele é cortado (com marca de corte).
  escala(vals, { fator = 1 } = {}) {
    const v = [];
    for (const x of vals) if (x > 0) v.push(x);
    v.sort((a, b) => a - b);
    if (!v.length) return { altura: () => 0, corte: () => false, regua: null };
    const max = v[v.length - 1], p = v[Math.min(v.length - 1, Math.floor(v.length * 0.995))];
    const topo = max <= p * 1.35 ? max : p;
    const H = this.hMax * fator, teto = topo * 1.25;
    const altura = (x) => (x > 0 ? (H * Math.min(x, teto)) / topo : 0);
    const e = Math.pow(10, Math.floor(Math.log10(topo * 0.6)));
    const ref = [5, 2, 1].map((m) => m * e).find((r) => r <= topo * 0.6) || e;
    return { altura, corte: (x) => x > teto, topo, regua: { valor: ref, altura: altura(ref) } };
  }

  // ------------------------------------------------------------ cena
  // c.base(i) -> {cor, r (multiplicador), a}; c.densidade(j) -> {cor, a} | null; c.espalhar 0|1
  // c.espinhos {altura(i), cor(i), corte(i)}; c.rotas [{cidades:[i], cor}]; c.nos [{i, r, cor, contorno}]
  // c.rotulos [{i | lon,lat, texto, cor, forte}]; c.notas [{lon, lat, texto, cor, dx, dy}]; c.regua {altura, texto}
  // c.enquadre: índices das cidades a enquadrar (vazio: Brasil)
  cena(c = {}, { instantaneo = false } = {}) {
    const n = this.n;
    const fb = c.base || (() => null);
    for (let i = 0; i < n; i++) {
      const s = fb(i) || {};
      this.bc0.set(this.bc.subarray(i * 3, i * 3 + 3), i * 3);
      this.bc1.set(s.cor || COR.tinta, i * 3);
      this.br0[i] = this.br[i]; this.br1[i] = s.r ?? 1;
      this.ba0[i] = this.ba[i]; this.ba1[i] = s.a ?? 1;
    }
    const e = c.espinhos;
    for (let i = 0; i < n; i++) {
      this.eh0[i] = this.eh[i];
      this.ec0.set(this.ec.subarray(i * 3, i * 3 + 3), i * 3);
      const h = e ? e.altura(i) || 0 : 0;
      this.eh1[i] = h;
      this.corte[i] = h > 0 && e.corte ? +!!e.corte(i) : 0;
      this.dest[i] = h > 0 && e.destaque ? +!!e.destaque(i) : 0;
      if (h > 0) {
        const cor = e.cor(i) || COR.tinta;
        this.ec1.set(cor, i * 3);
        if (this.eh[i] < 0.4) this.ec0.set(cor, i * 3);
      } else this.ec1.set(this.ec.subarray(i * 3, i * 3 + 3), i * 3);
    }
    if (this.D) {
      const fd = c.densidade;
      for (let j = 0; j < this.dn; j++) {
        this.dc0.set(this.dc.subarray(j * 3, j * 3 + 3), j * 3);
        this.da0[j] = this.da[j];
        const s = fd ? fd(j) : null;
        if (s && (s.a ?? 1) > 0) {
          this.dc1.set(s.cor, j * 3); this.da1[j] = s.a ?? 1;
          if (this.da[j] < 0.02) this.dc0.set(s.cor, j * 3);
        } else { this.dc1.set(this.dc.subarray(j * 3, j * 3 + 3), j * 3); this.da1[j] = 0; }
      }
      this.E0 = this.E; this.E1 = c.espalhar ?? (fd ? 1 : 0);
    }
    this.topo = { rotas: c.rotas || [], nos: (c.nos || []).slice().sort((a, b) => b.r - a.r), rotulos: c.rotulos || [], notas: c.notas || [], regua: c.regua || null };
    this.alvo = c.enquadre && c.enquadre.length ? this._caixa(c.enquadre) : this.caixaBR;
    const v0 = this.vista, v1 = this._vistaPara(this.alvo);
    this.iz = d3.interpolateZoom([v0.cx, v0.cy, this.aw / v0.k], [v1.cx, v1.cy, this.aw / v1.k]);
    const muda = Math.abs(v0.k - v1.k) / v1.k > 0.01 || Math.hypot(v0.cx - v1.cx, v0.cy - v1.cy) * v1.k > 2;
    this.dur = muda ? clamp(this.iz.duration * 0.8, 800, 1500) : 800;
    this.cache = null; this.hover = -1; this.fixa = false; this._esconderDica();
    if (this._anim) { cancelAnimationFrame(this._anim); this._anim = null; }
    if (instantaneo || reduzido()) { this._passo(1); this.t = 1; this.so = 1; this.desenhar(); this._guardar(); return; }
    this.t = 0; this.so = 0; this.t0 = performance.now();
    this._anim = requestAnimationFrame((ts) => this._loop(ts));
  }
  _passo(e) {
    const n = this.n;
    for (let k = 0; k < n * 3; k++) {
      this.bc[k] = this.bc0[k] + (this.bc1[k] - this.bc0[k]) * e;
      this.ec[k] = this.ec0[k] + (this.ec1[k] - this.ec0[k]) * e;
    }
    for (let i = 0; i < n; i++) {
      this.br[i] = this.br0[i] + (this.br1[i] - this.br0[i]) * e;
      this.ba[i] = this.ba0[i] + (this.ba1[i] - this.ba0[i]) * e;
      this.eh[i] = this.eh0[i] + (this.eh1[i] - this.eh0[i]) * e;
    }
    if (this.D) {
      for (let k = 0; k < this.dn * 3; k++) this.dc[k] = this.dc0[k] + (this.dc1[k] - this.dc0[k]) * e;
      for (let j = 0; j < this.dn; j++) this.da[j] = this.da0[j] + (this.da1[j] - this.da0[j]) * e;
      this.E = this.E0 + (this.E1 - this.E0) * e;
    }
    const z = this.iz(e);
    this.vista = { cx: z[0], cy: z[1], k: this.aw / z[2] };
    this._projetar();
  }
  _loop(ts) {
    const el = ts - this.t0;
    const t = Math.min(1, el / this.dur);
    if (this.t < 1) { this.t = t; this._passo(ease(t)); }
    this.so = clamp((el - this.dur) / 280, 0, 1);
    this.desenhar();
    if (this.so < 1) this._anim = requestAnimationFrame((x) => this._loop(x));
    else { this._anim = null; this._guardar(); }
  }

  // ------------------------------------------------------------ desenho
  desenhar() {
    const { ctx, dpr } = this;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, this.largura, this.altura);
    this._divisas();
    this._base();
    if (this.D) this._densidade();
    this._espinhos();
    if (this.so > 0) {
      ctx.globalAlpha = this.so;
      this._rotas(); this._nos(); this._textos();
      ctx.globalAlpha = 1;
    }
  }
  _divisas() {
    if (!this.pathUF) return;
    const { ctx, dpr } = this, { k, cx, cy } = this.vista;
    ctx.setTransform(dpr * k, 0, 0, dpr * k, dpr * (this.ax - cx * k), dpr * (this.ay - cy * k));
    ctx.lineJoin = "round";
    ctx.lineWidth = 0.7 / k; ctx.strokeStyle = "#e3e3e3"; ctx.stroke(this.pathUF);
    ctx.lineWidth = 0.9 / k; ctx.strokeStyle = "#d0d0d0"; ctx.stroke(this.pathBR);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  _base() {
    const { ctx, n } = this, r0 = this.rb * this.zf;
    const grupos = new Map();
    for (let i = 0; i < n; i++) {
      const a = this.ba[i];
      if (a < 0.02 || this.br[i] * r0 < 0.15) continue;
      const k = chave(this.bc, i, a);
      let g = grupos.get(k);
      if (!g) grupos.set(k, (g = []));
      g.push(i);
    }
    for (const k of [...grupos.keys()].sort((a, b) => peso(a) - peso(b))) {
      ctx.fillStyle = estilo(k);
      ctx.beginPath();
      for (const i of grupos.get(k)) { const r = this.br[i] * r0; ctx.moveTo(this.sx[i] + r, this.sy[i]); ctx.arc(this.sx[i], this.sy[i], r, 0, 6.2832); }
      ctx.fill();
    }
  }
  _densidade() {
    const { ctx } = this, r = this.rd * this.zf, E = this.E, M = this.D.m;
    // em fatias intercaladas, para nenhuma cor ficar sempre por cima
    const K = 6;
    for (let f = 0; f < K; f++) {
      const grupos = new Map();
      for (let j = f; j < this.dn; j += K) {
        const a = this.da[j];
        if (a < 0.02) continue;
        const k = chave(this.dc, j, a);
        let g = grupos.get(k);
        if (!g) grupos.set(k, (g = []));
        g.push(j);
      }
      for (const [k, g] of grupos) {
        ctx.fillStyle = estilo(k);
        ctx.beginPath();
        for (const j of g) {
          const m = M[j];
          const x = this.sx[m] + (this.dsx[j] - this.sx[m]) * E, y = this.sy[m] + (this.dsy[j] - this.sy[m]) * E;
          ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, 6.2832);
        }
        ctx.fill();
      }
    }
  }
  _espinho(i, w) {
    const { ctx } = this, x = this.sx[i], y = this.sy[i], h = this.eh[i];
    ctx.beginPath(); ctx.moveTo(x - w / 2, y); ctx.lineTo(x, y - h); ctx.lineTo(x + w / 2, y); ctx.closePath();
  }
  _espinhos() {
    const { ctx } = this, w = this.larguraEspinho;
    ctx.lineJoin = "round"; ctx.lineWidth = 0.8; ctx.strokeStyle = "#fff";
    for (const i of this.ordemY) {
      if (this.eh[i] < 0.4) continue;
      if (this.dest[i]) {
        this._espinho(i, w + 1.5);
        ctx.fillStyle = rgb(this.ec, i); ctx.fill();
        ctx.lineWidth = 1.2; ctx.strokeStyle = "#000"; ctx.stroke(); ctx.lineWidth = 0.8; ctx.strokeStyle = "#fff";
      } else {
        this._espinho(i, w);
        ctx.fillStyle = rgb(this.ec, i); ctx.fill(); ctx.stroke();
      }
      if (this.corte[i] && this.t >= 1) {
        // marca de corte: o valor passa do topo da escala
        const x = this.sx[i], y = this.sy[i] - this.eh[i] * 0.55;
        ctx.save(); ctx.lineWidth = 1.6; ctx.beginPath();
        ctx.moveTo(x - w, y + 1.5); ctx.lineTo(x + w, y - 1.5); ctx.moveTo(x - w, y + 4.5); ctx.lineTo(x + w, y + 1.5);
        ctx.stroke(); ctx.restore();
      }
    }
  }
  _rotas() {
    const { ctx } = this;
    ctx.lineJoin = "round"; ctx.lineCap = "round";
    for (const r of this.topo.rotas) {
      if (r.cidades.length < 2) continue;
      ctx.beginPath();
      r.cidades.forEach((i, k) => (k ? ctx.lineTo(this.sx[i], this.sy[i]) : ctx.moveTo(this.sx[i], this.sy[i])));
      ctx.lineWidth = 4; ctx.strokeStyle = "rgba(255,255,255,0.9)"; ctx.stroke();
      ctx.lineWidth = 1.5; ctx.strokeStyle = r.cor || "#000"; ctx.stroke();
    }
  }
  _nos() {
    const { ctx } = this;
    for (const no of this.topo.nos) {
      const x = this.sx[no.i], y = this.sy[no.i];
      ctx.beginPath(); ctx.arc(x, y, no.r + 1.6, 0, 6.2832); ctx.fillStyle = "#fff"; ctx.fill();
      ctx.beginPath(); ctx.arc(x, y, no.r, 0, 6.2832); ctx.fillStyle = no.cor || "#000"; ctx.fill();
      if (no.contorno) { ctx.lineWidth = 1.6; ctx.strokeStyle = "#000"; ctx.beginPath(); ctx.arc(x, y, no.r + 3, 0, 6.2832); ctx.stroke(); }
    }
  }
  // caixa livre para um texto de tw × th, testando posições em volta da âncora
  _lugar(tw, th, ax, ay, cands, ocupado) {
    const [[x0, y0], [x1, y1]] = this.caixaTela;
    const L = [Math.max(4, x0 - 10), 4, Math.min(this.largura - 4, x1 + 10), Math.min(this.altura - 4, y1 + 10)];
    for (const [dx, dy] of cands) {
      const x = ax + dx, y = ay + dy, b = [x, y, x + tw, y + th];
      if (b[0] < L[0] || b[2] > L[2] || b[1] < L[1] || b[3] > L[3]) continue;
      if (ocupado.some((o) => !(b[2] < o[0] || b[0] > o[2] || b[3] < o[1] || b[1] > o[3]))) continue;
      return b;
    }
    return null;
  }
  _textos() {
    const { ctx } = this, ocupado = this.reservado ? this.reservado().map((b) => b.slice()) : [];
    for (const no of this.topo.nos) { const x = this.sx[no.i], y = this.sy[no.i], r = no.r + 1; ocupado.push([x - r, y - r, x + r, y + r]); }
    // os espinhos das cidades rotuladas (e o destacado) não ficam embaixo de outro rótulo
    const we = this.larguraEspinho / 2 + 1;
    for (const r of this.topo.rotulos) if (r.i != null && this.eh[r.i] >= 0.4) ocupado.push([this.sx[r.i] - we, this.sy[r.i] - this.eh[r.i], this.sx[r.i] + we, this.sy[r.i] + 1]);
    ctx.textBaseline = "middle";
    // régua dos espinhos, no canto de baixo à esquerda da área
    const rg = this.topo.regua;
    if (rg && rg.ponto && this.D) {
      const x = this.caixaTela[0][0] + 8, y = this.caixaTela[1][1] - 8, r = this.rd * this.zf + 0.4;
      ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832); ctx.fillStyle = rg.cor || "#555"; ctx.fill();
      ctx.font = `500 13px ${FONTE}`;
      const tw = ctx.measureText(rg.texto).width;
      ctx.fillStyle = "#444"; ctx.fillText(rg.texto, x + 8, y + 0.5);
      ocupado.push([x - 6, y - 10, x + 12 + tw, y + 10]);
    } else if (rg && rg.altura > 3) {
      const w = this.larguraEspinho, x = this.caixaTela[0][0] + 6 + w / 2, y = this.caixaTela[1][1] - 4;
      ctx.beginPath(); ctx.moveTo(x - w / 2, y); ctx.lineTo(x, y - rg.altura); ctx.lineTo(x + w / 2, y); ctx.closePath();
      ctx.fillStyle = "#8c8c8c"; ctx.fill();
      ctx.beginPath(); ctx.moveTo(x + w / 2 + 2, y - rg.altura); ctx.lineTo(x + w / 2 + 8, y - rg.altura); ctx.strokeStyle = "#8c8c8c"; ctx.lineWidth = 1; ctx.stroke();
      ctx.font = `500 13px ${FONTE}`;
      const tw = ctx.measureText(rg.texto).width;
      ctx.fillStyle = "#444"; ctx.fillText(rg.texto, x + w / 2 + 11, y - rg.altura + 0.5);
      if (rg.sub) { ctx.font = `400 12px ${FONTE}`; ctx.fillStyle = "#666"; ctx.fillText(rg.sub, x + w / 2 + 11, y - rg.altura + 16); }
      ocupado.push([x - w, y - rg.altura - 9, x + w / 2 + 14 + Math.max(tw, 90), y + 2]);
    }
    // notas de região: texto colorido, com fio até a âncora
    const s = clamp(Math.min(this.aw, this.ah) / 560, 0.55, 1.15);
    for (const nt of this.topo.notas) {
      const [px, py] = this.tela(nt.lon, nt.lat);
      ctx.font = `500 15px ${FONTE}`;
      const tw = ctx.measureText(nt.texto).width + 14, th = 24;
      const dx = (nt.dx ?? 60) * s, dy = (nt.dy ?? -40) * s;
      const c = (ex, ey) => [ex - tw / 2, ey - th / 2];
      const b = this._lugar(tw, th, px, py, [c(dx, dy), c(-dx, dy), c(dx, -dy), c(-dx, -dy), c(0, -Math.abs(dy) - 20), c(0, Math.abs(dy) + 20)], ocupado)
        || [clamp(px + dx - tw / 2, 4, this.largura - tw - 4), clamp(py + dy - th / 2, 4, this.altura - th - 4), 0, 0];
      b[2] = b[0] + tw; b[3] = b[1] + th;
      ocupado.push(b);
      const ex = clamp(px, b[0], b[2]), ey = clamp(py, b[1], b[3]);
      ctx.strokeStyle = nt.cor || "#000"; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(ex, ey); ctx.stroke();
      ctx.beginPath(); ctx.arc(px, py, 2.6, 0, 6.2832); ctx.fillStyle = nt.cor || "#000"; ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.96)"; rrect(ctx, b[0], b[1], tw, th, 5); ctx.fill();
      ctx.fillStyle = nt.cor || "#000"; ctx.fillText(nt.texto, b[0] + 7, b[1] + th / 2 + 0.5);
    }
    // rótulos de cidades (na ponta do espinho, se houver), sem sobreposição
    for (const r of this.topo.rotulos) {
      let ax, ay, pino = false;
      if (r.grupo) {
        // rótulo ao lado de um grupo de cidades (um roteiro): testa direita, esquerda, acima e abaixo da caixa do grupo
        let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
        for (const i of r.grupo) { x0 = Math.min(x0, this.sx[i]); x1 = Math.max(x1, this.sx[i]); y0 = Math.min(y0, this.sy[i]); y1 = Math.max(y1, this.sy[i]); }
        ctx.font = `600 14px ${FONTE}`;
        const tw = ctx.measureText(r.texto).width + 12, th = 21, cy = (y0 + y1) / 2 - th / 2, cx = (x0 + x1) / 2 - tw / 2;
        const b = this._lugar(tw, th, 0, 0, [[x1 + 9, cy], [x0 - tw - 9, cy], [cx, y0 - th - 9], [cx, y1 + 9], [x1 + 9, y0 - th / 2], [x0 - tw - 9, y1 - th / 2]], ocupado);
        if (!b) continue;
        ocupado.push(b);
        let best = null, dmin = Infinity;
        for (const i of r.grupo) {
          const ex = clamp(this.sx[i], b[0], b[2]), ey = clamp(this.sy[i], b[1], b[3]), d = (ex - this.sx[i]) ** 2 + (ey - this.sy[i]) ** 2;
          if (d < dmin) { dmin = d; best = [this.sx[i], this.sy[i], ex, ey]; }
        }
        if (best && dmin > 64) { ctx.beginPath(); ctx.moveTo(best[0], best[1]); ctx.lineTo(best[2], best[3]); ctx.strokeStyle = "#000"; ctx.lineWidth = 1; ctx.stroke(); }
        ctx.fillStyle = "rgba(255,255,255,0.94)"; rrect(ctx, b[0], b[1], tw, th, 4); ctx.fill();
        ctx.fillStyle = r.cor || "#000"; ctx.fillText(r.texto, b[0] + 6, b[1] + th / 2 + 0.5);
        continue;
      }
      if (r.i != null) { ax = this.sx[r.i]; ay = this.sy[r.i]; if (this.eh[r.i] >= 0.4) ay -= this.eh[r.i]; else pino = !this.topo.nos.some((no) => no.i === r.i); }
      else { [ax, ay] = this.tela(r.lon, r.lat); }
      ctx.font = `${r.forte ? 600 : 500} ${r.forte ? 14 : 12}px ${FONTE}`;
      const tw = ctx.measureText(r.texto).width + 12, th = r.forte ? 21 : 18;
      const cands = [[-tw / 2, -th - 5], [6, -th / 2], [-tw - 6, -th / 2], [5, -th - 3], [-tw - 5, -th - 3], [-tw / 2, 7], [6, 3], [-tw - 6, 3]];
      const b = this._lugar(tw, th, ax, ay, cands, ocupado);
      if (!b) continue;
      ocupado.push(b);
      ctx.fillStyle = "rgba(255,255,255,0.94)"; rrect(ctx, b[0], b[1], tw, th, 4); ctx.fill();
      ctx.fillStyle = r.cor || "#000"; ctx.fillText(r.texto, b[0] + 6, b[1] + th / 2 + 0.5);
      if (pino) { ctx.beginPath(); ctx.arc(ax, ay, 2.4, 0, 6.2832); ctx.fillStyle = r.cor || "#000"; ctx.fill(); }
    }
  }

  // ------------------------------------------------------------ interação: dica ao passar o mouse, clique abre a cidade
  _guardar() {
    if (!this.dica && !this.aoClicar) return;
    if (!this.cache) this.cache = document.createElement("canvas");
    this.cache.width = this.c.width; this.cache.height = this.c.height;
    this.cache.getContext("2d").drawImage(this.c, 0, 0);
    if (this.hover >= 0) this._realce();
  }
  _interacao() {
    const cv = this.c, caixa = cv.parentElement;
    if (getComputedStyle(caixa).position === "static") caixa.style.position = "relative";
    this.dicaEl = document.createElement("div");
    this.dicaEl.className = "mapa-dica";
    this.dicaEl.hidden = true;
    caixa.appendChild(this.dicaEl);
    let tipo = "mouse", fila = null;
    const pos = (e) => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    cv.addEventListener("pointerdown", (e) => { tipo = e.pointerType; });
    cv.addEventListener("pointermove", (e) => {
      if (e.pointerType !== "mouse" || this.fixa) return;
      const p = pos(e);
      if (!fila) fila = requestAnimationFrame(() => { fila = null; this._marcar(this._achar(...p)); });
    });
    cv.addEventListener("pointerleave", () => { if (!this.fixa) this._marcar(-1); });
    cv.addEventListener("click", (e) => {
      const i = this._achar(...pos(e));
      if (tipo !== "touch" && i >= 0 && this.aoClicar) { this.aoClicar(i); return; }
      this.fixa = i >= 0;
      this._marcar(i, true);
    });
  }
  _achar(mx, my) {
    if (this._anim) return -1;
    const m = this.larguraEspinho / 2 + 2.5;
    for (let k = this.n - 1; k >= 0; k--) {
      const i = this.ordemY[k], h = this.eh[i];
      if (h < 0.4) continue;
      const x = this.sx[i], y = this.sy[i];
      if (mx >= x - m && mx <= x + m && my <= y + 3 && my >= y - h - 3) return i;
    }
    let best = -1, dmin = 12 * 12;
    const testa = (i) => { const d = (this.sx[i] - mx) ** 2 + (this.sy[i] - my) ** 2; if (d < dmin) { dmin = d; best = i; } };
    for (const no of this.topo.nos) testa(no.i);
    if (best < 0) for (let i = 0; i < this.n; i++) if (this.eh[i] >= 0.4) testa(i);
    if (best < 0 && this.D && this.E > 0.5) {
      // ponto de densidade mais próximo (até 7 px): devolve a cidade dele
      let d2 = 7 * 7;
      for (let j = 0; j < this.dn; j++) {
        if (this.da[j] < 0.5) continue;
        const d = (this.dsx[j] - mx) ** 2 + (this.dsy[j] - my) ** 2;
        if (d < d2) { d2 = d; best = this.D.m[j]; }
      }
    }
    return best;
  }
  _realce() {
    const i = this.hover, { ctx, dpr } = this;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (this.D && this.E > 0.5 && this.eh[i] < 0.4) {
      if (!this._pontosDe) { this._pontosDe = new Map(); for (let j = 0; j < this.dn; j++) { const m = this.D.m[j]; if (!this._pontosDe.has(m)) this._pontosDe.set(m, []); this._pontosDe.get(m).push(j); } }
      const r = this.rd * this.zf + 0.9;
      ctx.beginPath();
      for (const j of this._pontosDe.get(i) || []) if (this.da[j] >= 0.5) { ctx.moveTo(this.dsx[j] + r, this.dsy[j]); ctx.arc(this.dsx[j], this.dsy[j], r, 0, 6.2832); }
      ctx.fillStyle = "#000"; ctx.fill();
      ctx.beginPath(); ctx.arc(this.sx[i], this.sy[i], 5, 0, 6.2832); ctx.lineWidth = 1.6; ctx.strokeStyle = "#000"; ctx.stroke();
      return;
    }
    if (this.eh[i] >= 0.4) {
      this._espinho(i, this.larguraEspinho + 1);
      ctx.fillStyle = rgb(this.ec, i); ctx.fill();
      ctx.lineWidth = 1.6; ctx.strokeStyle = "#000"; ctx.stroke();
    } else {
      ctx.beginPath(); ctx.arc(this.sx[i], this.sy[i], 6, 0, 6.2832); ctx.lineWidth = 1.6; ctx.strokeStyle = "#000"; ctx.stroke();
    }
  }
  _marcar(i, fixar = false) {
    if (i === this.hover && !fixar) return;
    this.hover = i;
    if (!this._anim) {
      if (!this.cache) { this.desenhar(); this._guardar(); }
      const { ctx } = this;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(this.cache, 0, 0);
      if (i >= 0) this._realce();
    }
    this.c.style.cursor = i >= 0 && this.aoClicar ? "pointer" : "";
    if (i < 0 || !this.dica) { this._esconderDica(); return; }
    const el = this.dicaEl;
    el.innerHTML = this.dica(i);
    el.classList.toggle("fixa", fixar);
    el.hidden = false;
    const ax = this.sx[i], ay = this.sy[i] - (this.eh[i] >= 0.4 ? this.eh[i] : 4);
    const w = el.offsetWidth, h = el.offsetHeight;
    let x = ax + 12, y = ay - h - 6;
    if (x + w > this.largura - 4) x = ax - w - 12;
    if (y < 4) y = Math.min(this.altura - h - 4, ay + 14);
    el.style.left = Math.max(4, x) + "px";
    el.style.top = Math.max(4, y) + "px";
  }
  _esconderDica() { if (this.dicaEl) { this.dicaEl.hidden = true; this.dicaEl.classList.remove("fixa"); } }
}

function rrect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
