// Gráficos com traço de desenho (rough.js, global `rough`), em SVG.
// Cada função desenha na largura atual do elemento e redesenha quando ela muda.
const NS = "http://www.w3.org/2000/svg";

function svgNovo(el, w, h) {
  el.innerHTML = "";
  const s = document.createElementNS(NS, "svg");
  s.setAttribute("viewBox", `0 0 ${w} ${h}`);
  s.setAttribute("width", w);
  s.setAttribute("height", h);
  s.setAttribute("class", "barras");
  s.setAttribute("role", "img");
  el.append(s);
  return s;
}
function texto(s, x, y, t, { anchor = "start", classe = "", tam = null, peso = null, cor = null, base = "middle" } = {}) {
  const e = document.createElementNS(NS, "text");
  e.setAttribute("x", x); e.setAttribute("y", y);
  e.setAttribute("text-anchor", anchor);
  e.setAttribute("dominant-baseline", base);
  if (classe) e.setAttribute("class", classe);
  if (tam) e.style.fontSize = tam + "px";
  if (peso) e.style.fontWeight = peso;
  if (cor) e.style.fill = cor;
  e.textContent = t;
  s.append(e);
  return e;
}
const traco = (extra = {}) => ({ stroke: "#000", strokeWidth: 1, roughness: 1.15, bowing: 0.7, fillStyle: "hachure", hachureGap: 3.6, fillWeight: 1.3, hachureAngle: -41, ...extra });

// redesenha ao mudar de largura
function vivo(el, desenhar) {
  let w0 = 0;
  const f = () => { const w = Math.round(el.clientWidth); if (w && w !== w0) { w0 = w; desenhar(w); } };
  new ResizeObserver(f).observe(el);
  f();
}

// ---------------------------------------------------------------- barras horizontais
// itens: [{ rotulo, valor, cor, texto, destaque }]
export function barras(el, itens, { max = null, formato = String, rotuloLargura = null, altura = 24, gap = 10, seed = 3, titulo = "" } = {}) {
  vivo(el, (W) => {
    const rl = rotuloLargura ?? Math.min(130, Math.round(W * 0.3));
    const h = itens.length * (altura + gap) + 4;
    const s = svgNovo(el, W, h);
    if (titulo) s.setAttribute("aria-label", titulo);
    const rc = rough.svg(s);
    const m = max ?? Math.max(...itens.map((d) => d.valor));
    const larg = Math.max(40, W - rl - 64);
    itens.forEach((d, i) => {
      const y = i * (altura + gap) + 2;
      texto(s, rl - 8, y + altura / 2, d.rotulo, { anchor: "end", classe: "rot", tam: 13 });
      const w = Math.max(2, (larg * d.valor) / m);
      s.append(rc.rectangle(rl, y, w, altura, traco({ fill: d.cor || "#000", seed: seed + i, fillStyle: d.destaque ? "solid" : "hachure" })));
      texto(s, rl + w + 6, y + altura / 2, d.texto ?? formato(d.valor), { classe: "val", tam: 14, peso: 600 });
    });
  });
}

// ---------------------------------------------------------------- cascata (diferença + terceiros = distância real)
// passos: [{ rotulo, valor, tipo: "base" | "soma" | "total", cor, texto }]
export function cascata(el, passos, { formato = String, seed = 11 } = {}) {
  vivo(el, (W) => {
    const H = 210, topo = 30, chao = 168;
    const s = svgNovo(el, W, H);
    const rc = rough.svg(s);
    const total = passos.find((p) => p.tipo === "total")?.valor ?? passos.reduce((a, p) => a + (p.tipo !== "total" ? p.valor : 0), 0);
    const esc = (v) => ((chao - topo) * v) / total;
    const n = passos.length, col = W / n, bw = Math.min(90, col * 0.56);
    let acum = 0;
    passos.forEach((p, i) => {
      const x = col * i + (col - bw) / 2;
      let y0, y1;
      if (p.tipo === "total") { y0 = chao - esc(p.valor); y1 = chao; }
      else { y1 = chao - esc(acum); acum += p.valor; y0 = chao - esc(acum); }
      s.append(rc.rectangle(x, y0, bw, y1 - y0, traco({ fill: p.cor, seed: seed + i, fillStyle: p.tipo === "total" ? "solid" : "hachure" })));
      texto(s, x + bw / 2, y0 - 12, p.texto ?? formato(p.valor), { anchor: "middle", classe: "val", tam: 15, peso: 650 });
      const linhas = p.rotulo.split("\n");
      linhas.forEach((l, k) => texto(s, x + bw / 2, chao + 14 + k * 14, l, { anchor: "middle", classe: "rot", tam: 12 }));
      if (i < n - 1 && p.tipo !== "total") {
        const yl = p.tipo === "total" ? y0 : y0;
        s.append(rc.line(x + bw, yl, col * (i + 1) + (col - bw) / 2, yl, { stroke: "#777", strokeWidth: 0.8, roughness: 0.6, strokeLineDash: [3, 3], seed: seed + 20 + i }));
      }
    });
    s.append(rc.line(4, chao, W - 4, chao, { stroke: "#000", strokeWidth: 1, roughness: 0.8, seed: seed + 40 }));
  });
}

// ---------------------------------------------------------------- barras 100% empilhadas
// linhas: [{ rotulo, partes: [{ valor, cor, nome }] }]
export function empilhadas(el, linhas, { seed = 21, legenda = [] } = {}) {
  vivo(el, (W) => {
    const rl = Math.min(118, Math.round(W * 0.28)), alt = 24, gap = 12;
    const H = linhas.length * (alt + gap) + 34;
    const s = svgNovo(el, W, H);
    const rc = rough.svg(s);
    const larg = W - rl - 8;
    linhas.forEach((ln, i) => {
      const y = i * (alt + gap) + 2;
      texto(s, rl - 8, y + alt / 2, ln.rotulo, { anchor: "end", classe: "rot", tam: 13 });
      let x = rl;
      const tot = ln.partes.reduce((a, p) => a + p.valor, 0);
      ln.partes.forEach((p, k) => {
        const w = (larg * p.valor) / tot;
        if (w < 0.5) return;
        s.append(rc.rectangle(x, y, w, alt, traco({ fill: p.cor, seed: seed + i * 5 + k, fillStyle: p.solido ? "solid" : "hachure", hachureGap: 3 })));
        if (w > 30) texto(s, x + w / 2, y + alt / 2, Math.round(p.valor) + "%", { anchor: "middle", classe: "val", tam: 12, peso: 650, cor: p.corTexto || "#000" });
        x += w;
      });
    });
    let lx = rl;
    const ly = linhas.length * (alt + gap) + 14;
    legenda.forEach((l, k) => {
      s.append(rc.rectangle(lx, ly - 6, 12, 12, traco({ fill: l.cor, seed: seed + 90 + k, fillStyle: l.solido ? "solid" : "hachure", hachureGap: 2.5 })));
      const t = texto(s, lx + 17, ly, l.nome, { classe: "rot", tam: 12 });
      lx += 17 + t.getComputedTextLength() + 16;
    });
  });
}

// ---------------------------------------------------------------- três caminhos
// frentes: [{ nome, valor, texto, cor, quem }]
export function caminhos(el, frentes, { seed = 31, formato = String } = {}) {
  vivo(el, (W) => {
    const H = W < 420 ? 250 : 230;
    const s = svgNovo(el, W, H);
    const rc = rough.svg(s);
    const col = W / 3;
    const vmax = Math.max(...frentes.map((f) => f.valor));
    const rmax = Math.min(col * 0.42, 62);
    frentes.forEach((f, i) => {
      const cx = col * i + col / 2, cy = 26 + rmax;
      const r = rmax * Math.sqrt(f.valor / vmax);
      s.append(rc.circle(cx, cy, r * 2, traco({ fill: f.cor, seed: seed + i, hachureGap: 3.2, roughness: 1.3 })));
      texto(s, cx, cy, f.texto ?? formato(f.valor), { anchor: "middle", classe: "val", tam: W < 420 ? 15 : 17, peso: 700 });
      texto(s, cx, 26 + 2 * rmax + 20, f.nome, { anchor: "middle", tam: 15, peso: 650 });
      const palavras = f.quem.split(" ");
      const linhas = [];
      let atual = "";
      const maxc = Math.max(12, Math.floor(col / 7.2));
      for (const p of palavras) { if ((atual + " " + p).trim().length > maxc) { linhas.push(atual.trim()); atual = p; } else atual += " " + p; }
      if (atual.trim()) linhas.push(atual.trim());
      linhas.slice(0, 4).forEach((l, k) => texto(s, cx, 26 + 2 * rmax + 40 + k * 15, l, { anchor: "middle", classe: "rot", tam: 12 }));
    });
  });
}

// ---------------------------------------------------------------- quanto vale cada pessoa
// itens: [{ valor: "+2", nome, cor, figuras: 1 | 2 }]
export function pessoas(el, itens, { seed = 41 } = {}) {
  vivo(el, (W) => {
    const H = 190;
    const s = svgNovo(el, W, H);
    const rc = rough.svg(s);
    const col = W / itens.length;
    itens.forEach((it, i) => {
      const cx = col * i + col / 2;
      const o = traco({ seed: seed + i * 7, strokeWidth: 1.4, roughness: 1.2 });
      // cabeça, corpo, braços, pernas
      s.append(rc.circle(cx, 46, 26, { ...o, fill: it.cor, fillStyle: "solid" }));
      s.append(rc.line(cx, 59, cx, 102, o));
      s.append(rc.line(cx - 20, 74, cx + 20, 74, o));
      s.append(rc.line(cx, 102, cx - 15, 128, o));
      s.append(rc.line(cx, 102, cx + 15, 128, o));
      texto(s, cx + 26, 30, it.valor, { classe: "val", tam: 26, peso: 750, cor: it.corTexto || "#000" });
      it.nome.split("\n").forEach((l, k) => texto(s, cx, 148 + k * 15, l, { anchor: "middle", classe: "rot", tam: 12.5 }));
    });
  });
}

// ---------------------------------------------------------------- lista de checagem
// itens: [{ ok: true|false, texto }]
export function checklist(el, itens, { seed = 51 } = {}) {
  vivo(el, (W) => {
    const linha = 30;
    // quebra de linha simples
    const maxc = Math.max(24, Math.floor((W - 40) / 7.6));
    const blocos = itens.map((it) => {
      const ps = it.texto.split(" "), ls = []; let a = "";
      for (const p of ps) { if ((a + " " + p).trim().length > maxc) { ls.push(a.trim()); a = p; } else a += " " + p; }
      if (a.trim()) ls.push(a.trim());
      return { ...it, ls };
    });
    const H = blocos.reduce((h, b) => h + Math.max(linha, b.ls.length * 17 + 12), 4);
    const s = svgNovo(el, W, H);
    const rc = rough.svg(s);
    let y = 4;
    blocos.forEach((b, i) => {
      const hb = Math.max(linha, b.ls.length * 17 + 12);
      const cx = 13, cy = y + 13;
      s.append(rc.rectangle(cx - 10, cy - 10, 20, 20, traco({ seed: seed + i, fill: b.ok ? "#dccdfb" : "#ffe6e6", fillStyle: "solid", roughness: 1 })));
      if (b.ok) s.append(rc.linearPath([[cx - 6, cy], [cx - 1, cy + 6], [cx + 8, cy - 8]], { stroke: "#5b1fe0", strokeWidth: 2.2, roughness: 1, seed: seed + 30 + i }));
      else { s.append(rc.line(cx - 6, cy - 6, cx + 6, cy + 6, { stroke: "#d10000", strokeWidth: 2.2, roughness: 1, seed: seed + 50 + i })); s.append(rc.line(cx + 6, cy - 6, cx - 6, cy + 6, { stroke: "#d10000", strokeWidth: 2.2, roughness: 1, seed: seed + 70 + i })); }
      b.ls.forEach((l, k) => texto(s, 34, cy + k * 17, l, { tam: 14.5, peso: k === 0 ? 500 : 400 }));
      y += hb;
    });
  });
}

// ---------------------------------------------------------------- lista numerada com barrinhas (roteiros)
// itens: [{ titulo, sub, valor, cor, href }]
export function ranking(el, itens, { formato = String, seed = 61 } = {}) {
  vivo(el, (W) => {
    const alt = 46;
    const H = itens.length * alt + 4;
    const s = svgNovo(el, W, H);
    const rc = rough.svg(s);
    const m = Math.max(...itens.map((d) => d.valor));
    const x0 = 30, larg = Math.max(60, W - x0 - 70);
    itens.forEach((d, i) => {
      const y = i * alt + 4;
      texto(s, 10, y + 10, String(i + 1), { anchor: "middle", tam: 15, peso: 700 });
      const a = document.createElementNS(NS, "a");
      if (d.href) a.setAttribute("href", d.href);
      s.append(a);
      const t = texto(a, x0, y + 10, d.titulo, { tam: 14.5, peso: 600 });
      t.remove(); a.append(t);
      texto(s, x0, y + 26, d.sub, { classe: "rot", tam: 12 });
      const w = Math.max(3, (larg * d.valor) / m);
      s.append(rc.line(x0, y + 38, x0 + w, y + 38, { stroke: d.cor || "#7533ff", strokeWidth: 3.2, roughness: 0.9, seed: seed + i }));
      texto(s, x0 + w + 6, y + 38, formato(d.valor), { classe: "val", tam: 12.5, peso: 650 });
    });
  });
}
