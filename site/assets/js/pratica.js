// Na prática: filtros por frente, porte e estado; lista de cidades; roteiros por região imediata.
import { montarTopo, rodape, municipios, json, grande, n0, pct, dec, esc, baixarArquivo, RAIZ } from "./ui.js";
import { aplicar, transferencia, completarQuaest, PORTES, UFNOME, PESQUISAS, PESQUISA_PADRAO } from "./frentes.js";
import { MapaPontos, CORES } from "./dotmap.js";

montarTopo({ pagina: "na-pratica/", abas: [["", "O caminho"], ["na-pratica/", "Na prática"], ["mapa/", "Mapa"]] });
rodape();

const [rows, regioes, divisas] = await Promise.all([municipios(), json("data/regioes.json"), json("data/divisas.json")]);
completarQuaest(rows);
const D = aplicar(rows, transferencia()).filter((d) => d.lon != null);
const NOME_F = ["Todas", "Reconquistar", "Mobilizar", "Terceiros"];
const COR_F = ["#000", "#ff1a1a", "#7533ff", "#ff9900"];
const TXT_F = ["", "f1t", "f2t", "f3t"];

// ---------------------------------------------------------------- estado (vai para o endereço)
const S = { f: 0, p: 2, uf: "", q: "", ordem: "votos", n: 48, nRot: 12, roteiro: "" };
function lerHash() {
  const h = new URLSearchParams(location.hash.slice(1).replace(/^roteiros$/, "rot=1"));
  if (h.has("f")) S.f = +h.get("f") || 0;
  if (h.has("p")) S.p = +h.get("p") || 0;
  if (h.has("uf")) S.uf = (h.get("uf") || "").toUpperCase();
  if (h.has("q")) S.q = h.get("q");
  if (h.has("roteiro")) S.roteiro = h.get("roteiro");
  return h;
}
const h0 = lerHash();
function gravarHash() {
  const h = new URLSearchParams();
  if (S.f) h.set("f", S.f);
  if (S.p !== 2) h.set("p", S.p);
  if (S.uf) h.set("uf", S.uf);
  if (S.q) h.set("q", S.q);
  const t = h.toString();
  history.replaceState(null, "", t ? "#" + t : location.pathname);
}

// ---------------------------------------------------------------- medidas
// valor = votos na diferença; para Reconquistar, 2 × eleitores (um a menos para Flávio, um a mais para Lula)
const valor = (d, f = S.f) => (f === 0 ? d.gTot : f === 1 ? d.g1 : f === 2 ? d.g2 : d.g3);
const intensidade = (d, f = S.f) => (f === 0 ? (d.gTot / d.aptos_26) * 100 : f === 1 ? d.f1Pct : f === 2 ? d.f2Pct ?? 0 : d.f3Pct ?? 0);
const porteOk = (d, p = S.p) => (p === 0 ? true : p === 45 ? d.porte === 4 || d.porte === 5 : d.porte === p);
const semAc = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
function filtrar({ uf = S.uf, p = S.p, f = S.f, q = S.q } = {}) {
  const qq = semAc(q.trim());
  return D.filter((d) => porteOk(d, p) && (!uf || d.uf === uf) && valor(d, f) > 0 && (!qq || semAc(d.municipio).includes(qq)));
}
const soma = (arr, fn) => arr.reduce((s, d) => s + (fn(d) || 0), 0);

// ---------------------------------------------------------------- controles
const ufs = [...new Set(D.map((d) => d.uf))].sort((a, b) => UFNOME[a].localeCompare(UFNOME[b], "pt"));
const selUF = document.getElementById("uf");
selUF.insertAdjacentHTML("beforeend", ufs.map((u) => `<option value="${u}">${UFNOME[u]}</option>`).join(""));
const campoQ = document.getElementById("q");
document.querySelectorAll("[data-f]").forEach((b) => b.addEventListener("click", () => { S.f = +b.dataset.f; S.n = 48; S.nRot = 12; render(); }));
document.querySelectorAll("[data-p]").forEach((b) => b.addEventListener("click", () => { S.p = +b.dataset.p; S.n = 48; S.nRot = 12; render(); }));
selUF.addEventListener("change", () => { S.uf = selUF.value; S.n = 48; S.nRot = 12; render(true); });
let tq;
campoQ.addEventListener("input", () => { clearTimeout(tq); tq = setTimeout(() => { S.q = campoQ.value; S.n = 48; render(); }, 180); });
document.getElementById("mais").addEventListener("click", () => { S.n += 48; desenharLista(); });
document.getElementById("mais-rot").addEventListener("click", () => { S.nRot += 12; desenharRoteiros(); });
const bOrdem = document.getElementById("ordem");
bOrdem.addEventListener("click", () => { S.ordem = S.ordem === "votos" ? "pct" : "votos"; S.n = 48; desenharLista(); });
document.getElementById("csv").addEventListener("click", baixarCSV);

// ---------------------------------------------------------------- mapa
const P = { ibge: [], lon: [], lat: [], porte: [], lula: [], area: [], f1: [], f2: [], f3: [] };
D.forEach((d) => { P.ibge.push(+d.ibge); P.lon.push(d.lon); P.lat.push(d.lat); P.porte.push(d.porte || 0); P.lula.push(d.parcela26 > 0.5 ? 1 : 0); P.area.push(d.areaLula ? 1 : 0); P.f1.push(d.f1); P.f2.push(d.f2); P.f3.push(d.f3); });
const mapa = new MapaPontos(document.getElementById("mapa"), P, { area: (w, h) => [[10, 10], [w - 10, h - 10]], divisas });
mapa.aoRedimensionar = () => desenharMapa(true);
let selecaoAtual = [];
function desenharMapa(inst = false) {
  const sel = new Set(selecaoAtual.map((d) => d.ibge));
  const vals = D.map((d) => (sel.has(d.ibge) ? valor(d) : 0));
  const s = mapa.escala(vals, { piso: sel.size > 600 ? 0.4 : 0, fator: S.uf ? 1.4 : 1 });
  const alvo = S.roteiro ? new Set((roteiroPorCodigo(S.roteiro)?.cidades || []).map((d) => d.ibge)) : null;
  mapa.estado((i) => {
    const d = D[i];
    if (!sel.has(d.ibge)) return { cor: CORES.apagado, r: mapa.base * 0.8 };
    const hc = S.f || d.principal;
    const destaque = alvo && alvo.has(d.ibge);
    return { cor: destaque ? CORES.f2 : CORES.tinta, r: mapa.base * (destaque ? 2 : 1.15), halo: s(vals[i]), hc };
  }, { instantaneo: inst, rotulos: rotulosMapa() });
}
function rotulosMapa() {
  const lista = ordenar(selecaoAtual).slice(0, S.uf ? 10 : 6);
  return lista.map((d) => ({ lon: d.lon, lat: d.lat, texto: d.municipio, cor: COR_F[S.f || d.principal] }));
}

// ---------------------------------------------------------------- resumo
function desenharResumo(sel) {
  const tot = soma(sel, (d) => valor(d));
  const aptos = soma(sel, (d) => d.aptos_26);
  const nacional = soma(D, (d) => valor(d));
  const rot = ["votos em jogo na diferença (as três frentes)", "na diferença, se os eleitores perdidos voltarem", "na diferença, se os ausentes votarem como os vizinhos", "votos de eleitores de terceiros em disputa"][S.f];
  const extra = S.f === 1 ? `<div class="numero"><b class="f1t">${grande(soma(sel, (d) => d.f1))}</b><span>eleitores a reconquistar</span></div>` :
    S.f === 2 ? `<div class="numero"><b class="f2t">${grande(soma(sel, (d) => d.ausentes_26))}</b><span>pessoas não votaram no 1º turno</span></div>` :
    S.f === 3 ? `<div class="numero"><b class="f3t">${pct((tot / soma(sel, (d) => d.validos)) * 100, 1)}</b><span>dos votos válidos estão em disputa</span></div>` :
    `<div class="numero"><b>${pct((tot / nacional) * 100, 0)}</b><span>do potencial do país</span></div>`;
  document.getElementById("numeros").innerHTML = `
    <div class="numero"><b>${n0(sel.length)}</b><span>cidades na seleção</span></div>
    <div class="numero"><b class="${TXT_F[S.f]}">+${grande(tot)}</b><span>${rot}</span></div>
    <div class="numero"><b>${grande(aptos)}</b><span>eleitores</span></div>
    ${extra}`;

  // por porte, no estado escolhido
  const base = D.filter((d) => (!S.uf || d.uf === S.uf) && valor(d) > 0);
  const grupos = [[1, "até 10 mil"], [2, "10 a 50 mil"], [3, "50 a 200 mil"], [45, "mais de 200 mil"]].map(([p, nome]) => ({ p, nome, v: soma(base.filter((d) => porteOk(d, p)), (d) => valor(d)), n: base.filter((d) => porteOk(d, p)).length }));
  const m = Math.max(...grupos.map((g) => g.v)) || 1;
  document.getElementById("porte-tit").textContent = `Potencial por tamanho de cidade · ${S.uf ? UFNOME[S.uf] : "Brasil"} · ${NOME_F[S.f].toLowerCase()}`;
  document.getElementById("porte").innerHTML = grupos.map((g) => `
    <button class="barra-porte${S.p === g.p ? " ativa" : ""}" type="button" data-pp="${g.p}">
      <span class="r">${g.nome}</span><span class="b"><i style="width:${(100 * g.v / m).toFixed(1)}%;background:${S.p === g.p ? COR_F[S.f] === "#000" ? "#7533ff" : COR_F[S.f] : "#bdbdbd"}"></i></span><span class="v">+${grande(g.v, true)}</span>
    </button>`).join("");
  document.querySelectorAll("[data-pp]").forEach((b) => b.addEventListener("click", () => { S.p = +b.dataset.pp; S.n = 48; render(); }));

  // estados
  const porUF = new Map();
  for (const d of filtrar({ uf: "" })) porUF.set(d.uf, (porUF.get(d.uf) || 0) + valor(d));
  const top = [...porUF].sort((a, b) => b[1] - a[1]).slice(0, 12);
  document.getElementById("estados").innerHTML = `<p class="nota">Estados com mais potencial nesta seleção</p><ul>${top.map(([u, v]) => `<li><button type="button" data-uf="${u}">${UFNOME[u]}</button><span class="num">+${grande(v, true)}</span></li>`).join("")}</ul>`;
  document.querySelectorAll("[data-uf]").forEach((b) => b.addEventListener("click", () => { S.uf = b.dataset.uf; selUF.value = S.uf; S.n = 48; render(true); }));
}

// ---------------------------------------------------------------- lista de cidades
const ordenar = (arr) => arr.slice().sort((a, b) => (S.ordem === "pct" ? intensidade(b) - intensidade(a) : valor(b) - valor(a)));
function cartao(d) {
  const f = S.f || d.principal;
  const g = [d.g1, d.g2, d.g3], gm = Math.max(...g) || 1;
  const rot = S.f === 0 ? "votos em jogo, somando as três frentes" : S.f === 1 ? `${n0(d.f1)} eleitores a reconquistar (${dec(d.f1Pct)} p.p.)` : S.f === 2 ? `${n0(d.ausentes_26)} não votaram (${pct(d.f2Pct)})` : `em disputa: ${pct(d.f3Pct, 2)} dos válidos`;
  const linhas = [["Reconquistar", "f1t", 0], ["Mobilizar", "f2t", 1], ["Terceiros", "f3t", 2]].map(([n, c, k]) =>
    `<div class="${c}"><span>${n}</span><i style="width:${((100 * g[k]) / gm).toFixed(0)}%"></i><span class="t">${g[k] > 0 ? "+" + grande(g[k]) : "–"}</span></div>`).join("");
  return `<a class="cartao cidade${f === 1 ? " cartao--f1" : f === 3 ? " cartao--f3" : ""}" href="${RAIZ}cidade/?ibge=${d.ibge}">
    <p class="cartao__titulo">${esc(d.municipio)}</p>
    <p class="cartao__sub">${d.uf} · ${d.pop ? grande(d.pop) + " hab." : "sem Censo"}</p>
    <p class="valor">+${grande(valor(d))}<small>${rot}</small></p>
    <div class="mini">${linhas}</div>
    <p class="cartao__pe"><span>Lula ${pct(d.parcela26 * 100, 0)} no 1º turno</span><span>Ficha e kit de reels</span></p>
  </a>`;
}
function desenharLista() {
  const lista = ordenar(selecaoAtual);
  bOrdem.setAttribute("aria-pressed", String(S.ordem === "pct"));
  bOrdem.textContent = S.ordem === "pct" ? "Ordenar por votos" : "Ordenar por %";
  document.getElementById("lista-sub").textContent = `${n0(lista.length)} cidades · ordem: ${S.ordem === "pct" ? "intensidade (%)" : "votos na diferença"}`;
  document.getElementById("cartoes").innerHTML = lista.slice(0, S.n).map(cartao).join("") || `<p class="texto">Nenhuma cidade com esse filtro.</p>`;
  document.getElementById("mais").hidden = lista.length <= S.n;
}

// ---------------------------------------------------------------- roteiros
const km = (a, b) => {
  const R = 6371, rad = Math.PI / 180;
  const dLa = (b.lat - a.lat) * rad, dLo = (b.lon - a.lon) * rad;
  const x = Math.sin(dLa / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLo / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
};
function trajeto(cidades) {
  const resto = cidades.slice().sort((a, b) => valor(b) - valor(a));
  const ordem = [resto.shift()];
  const passos = [0];
  while (resto.length) {
    const atual = ordem[ordem.length - 1];
    let k = 0, dmin = Infinity;
    resto.forEach((c, i) => { const dd = km(atual, c); if (dd < dmin) { dmin = dd; k = i; } });
    ordem.push(resto.splice(k, 1)[0]);
    passos.push(dmin);
  }
  return { ordem, passos, total: passos.reduce((a, b) => a + b, 0) };
}
let roteirosAtuais = [];
function calcularRoteiros(sel) {
  const g = new Map();
  for (const d of sel) { if (!d.imediata) continue; if (!g.has(d.imediata)) g.set(d.imediata, []); g.get(d.imediata).push(d); }
  return [...g].filter(([, c]) => c.length >= 2).map(([cod, cidades]) => {
    const [nome, inter] = regioes.imediatas[cod] || ["", ""];
    return { cod, nome, inter: regioes.intermediarias[inter] || "", uf: cidades[0].uf, cidades, v: soma(cidades, (d) => valor(d)), g: [soma(cidades, (d) => d.g1), soma(cidades, (d) => d.g2), soma(cidades, (d) => d.g3)] };
  }).sort((a, b) => b.v - a.v);
}
function roteiroPorCodigo(cod) {
  return roteirosAtuais.find((r) => r.cod === cod) || calcularRoteiros(D.filter((d) => d.imediata === cod && porteOk(d, 2) && valor(d, 0) > 0))[0];
}
function desenharRoteiros() {
  const lista = roteirosAtuais.slice(0, S.nRot);
  document.getElementById("lista-roteiros").innerHTML = lista.map((r) => {
    const t = trajeto(r.cidades);
    const f = S.f || 1 + r.g.indexOf(Math.max(...r.g));
    return `<article class="roteiro${S.roteiro === r.cod ? " alvo" : ""}" id="roteiro-${r.cod}">
      <h3>${esc(r.nome)} (${r.uf})</h3>
      <p class="meta">${r.cidades.length} cidades · região intermediária de ${esc(r.inter)} · ${["", "reconquistar", "mobilizar", "terceiros"][f]} pesa mais</p>
      <p class="valor ${TXT_F[f]}">+${grande(r.v)} <span class="nota">votos em jogo · ~${n0(t.total)} km em linha reta</span></p>
      <ol>${t.ordem.map((c, i) => `<li><a href="${RAIZ}cidade/?ibge=${c.ibge}">${esc(c.municipio)}</a> <small>+${grande(valor(c))}${i ? ` · ${n0(t.passos[i])} km` : ""}</small></li>`).join("")}</ol>
      <p class="linha"><button class="pill pill--lilas" type="button" data-ver="${r.cod}">Ver no mapa</button><a class="pill pill--laranja" href="${RAIZ}reels/?ibge=${t.ordem[0].ibge}">Reels para ${esc(t.ordem[0].municipio)}</a></p>
    </article>`;
  }).join("") || `<p class="texto">Sem roteiros com duas ou mais cidades nesta seleção.</p>`;
  document.getElementById("mais-rot").hidden = roteirosAtuais.length <= S.nRot;
  document.querySelectorAll("[data-ver]").forEach((b) => b.addEventListener("click", () => {
    S.roteiro = b.dataset.ver;
    const r = roteiroPorCodigo(S.roteiro);
    mapa.enquadrar(r.cidades.map((c) => D.indexOf(c)));
    desenharMapa();
    document.querySelector(".mapa-caixa").scrollIntoView({ behavior: "smooth", block: "center" });
  }));
}

// ---------------------------------------------------------------- CSV
function baixarCSV() {
  const cab = ["ibge", "municipio", "uf", "populacao_2022", "eleitores_2026", "frente_principal", "potencial_diferenca_total", "reconquistar_eleitores", "reconquistar_pp", "mobilizar_saldo", "abstencao_1t_pct", "terceiros_em_disputa", "terceiros_em_disputa_pct_validos", "lula_parcela_1t_2026_pct", "regiao_imediata"];
  const linhas = ordenar(selecaoAtual).map((d) => [d.ibge, `"${d.municipio.replace(/"/g, '""')}"`, d.uf, d.pop ?? "", d.aptos_26, NOME_F[d.principal], Math.round(d.gTot), Math.round(d.f1), d.f1Pct.toFixed(2), Math.round(d.f2), (d.abstencao * 100).toFixed(2), Math.round(d.f3), d.f3Pct == null ? "" : d.f3Pct.toFixed(3), (d.parcela26 * 100).toFixed(2), `"${(regioes.imediatas[d.imediata] || [""])[0]}"`].join(","));
  const nome = `cidades_${NOME_F[S.f].toLowerCase()}_${S.p ? "porte" + S.p : "todas"}${S.uf ? "_" + S.uf : ""}.csv`;
  baixarArquivo(nome, "﻿" + [cab.join(","), ...linhas].join("\n"));
}

// ---------------------------------------------------------------- tudo
function render(reenquadrar = false) {
  document.querySelectorAll("[data-f]").forEach((b) => b.setAttribute("aria-pressed", String(+b.dataset.f === S.f)));
  document.querySelectorAll("[data-p]").forEach((b) => b.setAttribute("aria-pressed", String(+b.dataset.p === S.p)));
  selUF.value = S.uf;
  if (campoQ.value !== S.q) campoQ.value = S.q;
  selecaoAtual = filtrar();
  roteirosAtuais = calcularRoteiros(selecaoAtual);
  if (reenquadrar || S.uf || mapa.enquadre) mapa.enquadrar(S.uf ? D.map((d, i) => (d.uf === S.uf ? i : -1)).filter((i) => i >= 0) : null);
  desenharResumo(selecaoAtual);
  desenharLista();
  desenharRoteiros();
  desenharMapa();
  gravarHash();
}
render(true);

// vindo de um link para um roteiro ou para a lista de roteiros
if (S.roteiro) {
  const r = roteiroPorCodigo(S.roteiro);
  if (r) {
    if (!roteirosAtuais.some((x) => x.cod === S.roteiro)) { roteirosAtuais.unshift(r); desenharRoteiros(); }
    setTimeout(() => document.getElementById("roteiro-" + S.roteiro)?.scrollIntoView({ block: "start" }), 300);
    mapa.enquadrar(r.cidades.map((c) => D.indexOf(c)));
    desenharMapa(true);
  }
} else if (h0.has("rot")) setTimeout(() => document.getElementById("roteiros").scrollIntoView({ block: "start" }), 300);

document.querySelector(".abre .nota")?.remove();
document.querySelector(".abre").insertAdjacentHTML("beforeend", `<p class="nota">Terceiros calculados com a ${PESQUISAS[PESQUISA_PADRAO].nome} (${PESQUISAS[PESQUISA_PADRAO].campo}). Os números são tetos: mostram onde há mais votos possíveis, não quantos serão conquistados.</p>`);
