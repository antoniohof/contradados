// Método: cada frente em um gráfico (antes na página do mapa), a tabela de pesquisas e o código da conta.
import { montarTopo, rodape, esc, municipios, n0, dec, pct, grande, RAIZ } from "./ui.js";
import { calcular, aplicar, transferencia, completarQuaest, PESQUISAS, PESQUISA_PADRAO, CANDS } from "./frentes.js";

montarTopo({ pagina: "metodo/" });
rodape();
document.getElementById("codigo").textContent = calcular.toString();

// ---------------------------------------------------------------- pesquisas (tabela)
const ks = Object.keys(PESQUISAS);
const fmt = (v) => (v == null ? "média dos três" : v.toLocaleString("pt-BR"));
document.getElementById("pesquisas-tab").innerHTML =
  `<thead><tr><th>Eleitores de</th>${ks.map((k) => `<th><a href="${PESQUISAS[k].url}" target="_blank" rel="noopener">${esc(PESQUISAS[k].nome)}</a><br><span style="font-weight:400">${esc(PESQUISAS[k].campo)} · ${esc(PESQUISAS[k].amostra)} entrevistas · ${esc(PESQUISAS[k].reg)}</span></th>`).join("")}</tr></thead><tbody>` +
  CANDS.map(([c, n]) => `<tr><td>${esc(n)}</td>${ks.map((k) => { const t = PESQUISAS[k].t[c]; return `<td>${t ? `${fmt(t[0])} / ${fmt(t[1])}` : "média dos três"}</td>`; }).join("")}</tr>`).join("") + "</tbody>";

// ---------------------------------------------------------------- dados
const rows = await municipios();
completarQuaest(rows);
const D = aplicar(rows, transferencia());
const soma = (arr, f) => arr.reduce((s, d) => s + (f(d) || 0), 0);
const SP = D.find((d) => d.ibge === "3550308");

// faixas de cor (sequencial, uma cor só, do claro ao escuro) e cinza para quem está fora da frente
const FAIXAS = { 1: [3, 5, 7, 9, 12], 2: [15, 18, 21, 24, 27] };
const ESC = {
  1: ["#ffd4cf", "#ffaaa1", "#fb7d72", "#ec4c41", "#cc2a20", "#951711"],
  2: ["#c9ece3", "#99dbcb", "#66c6b0", "#34ad95", "#138e78", "#0b6656"],
};
const ZERO = "#d6d6d6";
const faixa = (v, k) => { const b = FAIXAS[k]; let i = 0; while (i < b.length && v >= b[i]) i++; return i; };
const chave = (k, unidade, fora) => {
  const b = FAIXAS[k], rot = [`até ${b[0]}`, ...b.slice(1).map((v, i) => `${b[i]} a ${v}`), `${b[b.length - 1]} ou mais`];
  return `<span class="titulo">${unidade}:</span>${ESC[k].map((c, i) => `<span><i style="background:${c}"></i>${rot[i]}</span>`).join("")}<span><i style="background:${ZERO}"></i>${fora}</span>`;
};

// ---------------------------------------------------------------- dispersão (uma cidade por ponto)
// o desenho tem a largura da caixa (o texto fica no tamanho certo no celular)
const larguraDe = (caixa) => Math.round(Math.min(640, Math.max(300, caixa.clientWidth || 560)));
function dispersao(id, o) {
  const caixa = document.getElementById(id);
  caixa.innerHTML = "";
  const W = larguraDe(caixa), H = Math.round(W * (W < 460 ? 0.86 : 0.77)), m = { t: 12, r: 14, b: 46, l: 48 };
  const svg = d3.select(caixa).append("svg").attr("viewBox", `0 0 ${W} ${H}`).attr("role", "img").attr("aria-label", o.aria);
  const x = d3.scaleLinear().domain(o.xd).range([m.l, W - m.r]);
  const y = d3.scaleLinear().domain(o.yd).range([H - m.b, m.t]);
  svg.append("g").attr("class", "linhas").selectAll("line").data(y.ticks(5)).join("line").attr("x1", m.l).attr("x2", W - m.r).attr("y1", y).attr("y2", y);
  svg.append("g").attr("class", "eixo").attr("transform", `translate(0,${H - m.b})`).call(d3.axisBottom(x).ticks(5).tickSize(4).tickFormat((v) => v + "%"));
  svg.append("g").attr("class", "eixo").attr("transform", `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(5).tickSize(4).tickFormat((v) => v + "%"));
  svg.append("text").attr("class", "titulo-eixo").attr("x", (m.l + W - m.r) / 2).attr("y", H - 8).attr("text-anchor", "middle").text(o.xl);
  svg.append("text").attr("class", "titulo-eixo").attr("transform", `translate(12,${(m.t + H - m.b) / 2}) rotate(-90)`).attr("text-anchor", "middle").text(o.yl);
  o.refs(svg, x, y);
  // maiores primeiro, para os pequenos ficarem por cima
  const dados = D.filter((d) => isFinite(o.x(d)) && isFinite(o.y(d))).sort((a, b) => o.r(b) - o.r(a));
  const r = d3.scaleSqrt().domain([0, d3.max(dados, o.r)]).range([0.7, (15 * W) / 560]);
  svg.append("g").selectAll("circle").data(dados).join("circle")
    .attr("cx", (d) => x(o.x(d))).attr("cy", (d) => y(o.y(d))).attr("r", (d) => r(o.r(d)))
    .attr("fill", o.cor).attr("fill-opacity", 0.62).attr("stroke", "#fff").attr("stroke-width", 0.5);
  if (o.exemplo) o.exemplo(svg.append("g"), x, y);

  // dica: cidade mais próxima do cursor (até 20 unidades); clique abre a ficha; no toque, a dica fica aberta com o link
  const anel = svg.append("circle").attr("class", "anel").attr("r", 7).style("display", "none");
  const dica = document.createElement("div");
  dica.className = "mapa-dica"; dica.hidden = true;
  caixa.append(dica);
  const del = d3.Delaunay.from(dados, (d) => x(o.x(d)), (d) => y(o.y(d)));
  const achar = (e) => {
    const [px, py] = d3.pointer(e, svg.node());
    const d = dados[del.find(px, py)];
    return d && (x(o.x(d)) - px) ** 2 + (y(o.y(d)) - py) ** 2 < 400 ? d : null;
  };
  const mostrar = (d, fixa = false) => {
    if (!d) { anel.style("display", "none"); dica.hidden = true; dica.classList.remove("fixa"); return; }
    const cx = x(o.x(d)), cy = y(o.y(d)), k = caixa.clientWidth / W;
    anel.attr("cx", cx).attr("cy", cy).style("display", null);
    dica.innerHTML = o.dica(d) + `<a href="${RAIZ}cidade/?ibge=${d.ibge}">Abrir a ficha →</a>`;
    dica.classList.toggle("fixa", fixa);
    dica.hidden = false;
    let left = cx * k + 12, top = cy * k - dica.offsetHeight - 8;
    if (left + dica.offsetWidth > caixa.clientWidth) left = cx * k - dica.offsetWidth - 12;
    if (top < 0) top = cy * k + 12;
    dica.style.left = Math.max(0, left) + "px";
    dica.style.top = top + "px";
  };
  let tipo = "mouse";
  svg.append("rect").attr("x", m.l).attr("y", m.t).attr("width", W - m.l - m.r).attr("height", H - m.t - m.b)
    .attr("fill", "transparent").style("cursor", "pointer")
    .on("pointerdown", (e) => { tipo = e.pointerType; })
    .on("pointermove", (e) => { if (e.pointerType === "mouse") mostrar(achar(e)); })
    .on("pointerleave", () => { if (!dica.classList.contains("fixa")) mostrar(null); })
    .on("click", (e) => {
      const d = achar(e);
      if (d && tipo !== "touch") location.href = `${RAIZ}cidade/?ibge=${d.ibge}`;
      else mostrar(d, true);
    });
}

// rótulo com contorno branco, legível por cima dos pontos
const rotulo = (g, x, y, texto, ancora = "start") => g.append("text").attr("class", "rot-forte").attr("x", x).attr("y", y).attr("text-anchor", ancora).text(texto);

// ---- reconquistar: parcela de Lula em 2022 × 2026
const G1 = {
  aria: "Gráfico de dispersão: parcela de Lula entre os dois em 2022 e em 2026, uma cidade por ponto",
  xd: [0, 100], yd: [0, 100], xl: "Parcela de Lula, 1º turno de 2022", yl: "Parcela de Lula, 1º turno de 2026",
  x: (d) => d.parcela22 * 100, y: (d) => d.parcela26 * 100, r: (d) => d.votosDois,
  cor: (d) => (d.perda > 0 ? ESC[1][faixa(d.f1Pct, 1)] : ZERO),
  refs: (s, x, y) => {
    s.append("line").attr("class", "ref").attr("x1", x(0)).attr("y1", y(0)).attr("x2", x(100)).attr("y2", y(100));
    const ang = (Math.atan2(y(100) - y(0), x(100) - x(0)) * 180) / Math.PI;
    s.append("text").attr("class", "rot").attr("x", x(20)).attr("y", y(25)).attr("transform", `rotate(${ang} ${x(20)} ${y(25)})`).text("sem mudança");
    s.append("text").attr("class", "rot").attr("x", x(63)).attr("y", y(20)).text("abaixo da diagonal:");
    s.append("text").attr("class", "rot").attr("x", x(63)).attr("y", y(20) + 15).text("Lula perdeu terreno");
  },
  exemplo: (g, x, y) => {
    if (!SP) return;
    const cx = x(SP.parcela22 * 100), cy = y(SP.parcela26 * 100), yd = y(SP.parcela22 * 100);
    g.append("line").attr("class", "queda").attr("x1", cx).attr("x2", cx).attr("y1", yd).attr("y2", cy);
    g.append("circle").attr("class", "anel").attr("cx", cx).attr("cy", cy).attr("r", 7);
    rotulo(g, cx + 11, cy - 6, "São Paulo");
    rotulo(g, cx + 11, cy + 10, `perda de ${dec(SP.f1Pct)} pontos`).attr("font-weight", 400);
  },
  dica: (d) => `<b>${esc(d.municipio)}</b> · ${d.uf}<span class="v f1t">${d.perda > 0 ? `−${dec(d.f1Pct)} pontos` : "sem perda"}</span><small>parcela de Lula: ${pct(d.parcela22 * 100)} em 2022, ${pct(d.parcela26 * 100)} em 2026</small>${d.f1 > 0 ? `<small>${n0(d.f1)} eleitores a reconquistar</small>` : ""}`,
};
document.getElementById("g1-chave").innerHTML = chave(1, "perda, em pontos", "sem perda") + `<span class="titulo">· tamanho: votos em Lula e Flávio</span>`;
const NL = soma(rows, (d) => d.votos_lula_26), NF = soma(rows, (d) => d.votos_flavio_26);
document.getElementById("g1-nota").textContent = `${n0(D.filter((d) => d.perda > 0).length)} de ${n0(D.length)} cidades estão abaixo da diagonal. No país, a parcela de Lula entre os dois caiu de 52,9% para ${pct((NL / (NL + NF)) * 100)}.`;

// ---- mobilizar: parcela de Lula em 2026 × abstenção
const maxAbs = Math.max(50, Math.ceil(d3.max(D, (d) => d.abstencao * 100) / 5) * 5);
const G2 = {
  aria: "Gráfico de dispersão: parcela de Lula entre os dois em 2026 e abstenção no 1º turno, uma cidade por ponto",
  xd: [0, 100], yd: [0, maxAbs], xl: "Parcela de Lula, 1º turno de 2026", yl: "Abstenção, 1º turno de 2026",
  x: (d) => d.parcela26 * 100, y: (d) => d.abstencao * 100, r: (d) => d.ausentes_26,
  cor: (d) => (d.areaLula ? ESC[2][faixa(d.f2Pct, 2)] : ZERO),
  refs: (s, x, y) => {
    s.append("line").attr("class", "ref").attr("x1", x(50)).attr("y1", y(0)).attr("x2", x(50)).attr("y2", y(maxAbs));
    s.append("text").attr("class", "rot").attr("x", x(51.5)).attr("y", y(maxAbs * 0.94)).text("cidades de Lula →");
    s.append("text").attr("class", "rot").attr("x", x(48.5)).attr("y", y(maxAbs * 0.94)).attr("text-anchor", "end").text("← Flávio à frente");
  },
  exemplo: (g, x, y) => {
    if (!SP) return;
    const cx = x(SP.parcela26 * 100), cy = y(SP.abstencao * 100);
    g.append("circle").attr("class", "anel").attr("cx", cx).attr("cy", cy).attr("r", 7);
    rotulo(g, cx + 11, cy - 8, "São Paulo");
  },
  dica: (d) => `<b>${esc(d.municipio)}</b> · ${d.uf}<span class="v f2t">${d.areaLula ? `+${n0(d.f2)} de saldo` : "fora das cidades de Lula"}</span><small>Lula ${pct(d.parcela26 * 100, 0)} dos votos dos dois · abstenção ${pct(d.abstencao * 100)}</small><small>${n0(d.ausentes_26)} não votaram</small>`,
};
document.getElementById("g2-chave").innerHTML = chave(2, "abstenção nas cidades de Lula, %", "fora das cidades de Lula") + `<span class="titulo">· tamanho: ausentes</span>`;
const subiu = D.filter((d) => d.areaLula && d.abstencao_22_pct != null && d.abstencao * 100 > d.abstencao_22_pct).length;
document.getElementById("g2-nota").textContent = `${n0(D.filter((d) => d.areaLula).length)} cidades são de Lula; em ${n0(subiu)} delas a abstenção subiu desde 2022. Abstenção alta não é a regra nessas cidades: o Nordeste teve a menor abstenção do país.`;

// ---- terceiros: o eleitorado de cada candidato dividido pela pesquisa
const vNac = Object.fromEntries(CANDS.map(([c]) => [c, soma(D, (d) => d.votos3[c])]));
const COR3 = [["L", "#e0201b", "para Lula"], ["X", "#3056c8", "em disputa"], ["F", "#8c8c8c", "para Flávio"]];
let pesquisa = PESQUISA_PADRAO;
function terceiros() {
  const T = transferencia(pesquisa), P = PESQUISAS[pesquisa];
  const dados = CANDS.map(([c, n]) => { const v = vNac[c]; return { n, v, L: (v * T[c][0]) / 100, X: (v * (100 - T[c][0] - T[c][1])) / 100, F: (v * T[c][1]) / 100 }; });
  const caixa = d3.select("#g3").html("");
  const W = larguraDe(caixa.node()), linha = 54, m = { t: 6, r: 14, b: 26, l: W < 420 ? 100 : 120 }, H = m.t + m.b + linha * dados.length;
  const svg = caixa.append("svg").attr("viewBox", `0 0 ${W} ${H}`).attr("role", "img").attr("aria-label", `Eleitorado de cada candidato dividido entre Lula, em disputa e Flávio, pela ${P.nome}`);
  const x = d3.scaleLinear().domain([0, d3.max(dados, (d) => d.v)]).range([m.l, W - m.r]);
  svg.append("g").attr("class", "linhas").selectAll("line").data(x.ticks(4)).join("line").attr("x1", x).attr("x2", x).attr("y1", m.t).attr("y2", H - m.b);
  svg.append("g").attr("class", "eixo").attr("transform", `translate(0,${H - m.b})`).call(d3.axisBottom(x).ticks(4).tickSize(4).tickFormat((v) => grande(v, true)));
  dados.forEach((d, i) => {
    const y0 = m.t + i * linha + 4, bh = 18;
    svg.append("text").attr("class", "cat").attr("x", m.l - 8).attr("y", y0 + 13).attr("text-anchor", "end").text(d.n);
    svg.append("text").attr("class", "sub").attr("x", m.l - 8).attr("y", y0 + 29).attr("text-anchor", "end").text(grande(d.v, true) + " votos");
    let xa = x(0);
    for (const [k, cor] of COR3) {
      const w = x(d[k]) - x(0);
      if (w <= 0) continue;
      svg.append("rect").attr("x", xa).attr("y", y0).attr("width", Math.max(0, w - 2)).attr("height", bh).attr("rx", 2).attr("fill", cor);
      if (w > 30) svg.append("text").attr("class", "seg").attr("x", xa + 2).attr("y", y0 + bh + 13).text(Math.round((d[k] / d.v) * 100) + "%");
      xa += w;
    }
  });
  const L = soma(dados, (d) => d.L), F = soma(dados, (d) => d.F), X = soma(dados, (d) => d.X);
  document.getElementById("g3-nota").innerHTML = `Pela ${esc(P.nome)} (${esc(P.campo)}): ${grande(L)} para Lula, ${grande(F)} para Flávio e <b>${grande(X)} em disputa</b>. ${esc(P.nota)} <a href="${P.url}" target="_blank" rel="noopener">Fonte</a>.`;
  document.querySelectorAll("#g3-pesquisas button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.p === pesquisa)));
}
const CURTO = { atlas: "AtlasIntel", datafolha: "Datafolha", quaest: "Quaest" };
document.getElementById("g3-pesquisas").innerHTML = ks.map((k) => `<button class="pill pill--p" type="button" data-p="${k}">${esc(CURTO[k] || PESQUISAS[k].nome)}</button>`).join("");
document.querySelectorAll("#g3-pesquisas button").forEach((b) => b.addEventListener("click", () => { pesquisa = b.dataset.p; terceiros(); }));

function desenhar() { dispersao("g1", G1); dispersao("g2", G2); terceiros(); }
desenhar();
let largura = document.getElementById("g1").clientWidth;
new ResizeObserver(() => {
  const w = document.getElementById("g1").clientWidth;
  if (Math.abs(w - largura) > 24) { largura = w; desenhar(); }
}).observe(document.getElementById("graficos"));

// ---------------------------------------------------------------- para ter escala
const area = D.filter((d) => d.areaLula);
const T1 = soma(D, (d) => d.f1), T2 = soma(D, (d) => d.f2), T3 = soma(D, (d) => d.f3);
const aus2 = soma(area, (d) => d.ausentes_26);
const umPonto = soma(area, (d) => d.aptos_26 * 0.01 * d.vantagem);
const saldo3 = soma(D, (d) => d.paraFlavio) - soma(D, (d) => d.paraLula);
document.getElementById("escala").innerHTML = [
  `Para virar, Lula precisa tirar cerca de <b>${grande(NF - NL + saldo3)}</b> votos: a diferença do 1º turno mais o saldo dos eleitores de terceiros que já escolheram.`,
  `Cada <b>1 ponto a mais de comparecimento</b> nas cidades de Lula vale cerca de <b>${grande(umPonto)}</b> votos na diferença.`,
  `Reconquistar <b>10%</b> dos eleitores perdidos desde 2022 vale <b>${grande(T1 * 0.2)}</b> na diferença.`,
  `Ganhar <b>metade</b> dos eleitores de terceiros em disputa vale <b>${grande(T3 * 0.5)}</b>.`,
  `Por pessoa: um eleitor reconquistado vale 2; um ausente que vai votar, ${dec(T2 / aus2)} em média; um indeciso de terceiro, 1.`,
].map((t) => `<li>${t}</li>`).join("");
