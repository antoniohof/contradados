// Na prática: filtros por frente, porte e estado; lista de cidades; roteiros por região imediata.
import { montarTopo, rodape, municipios, json, grande, n0, pct, dec, esc, baixarArquivo, copiar, linkWhats, RAIZ } from "./ui.js";
import { aplicar, transferencia, completarQuaest, PORTES, UFNOME, PESQUISAS, PESQUISA_PADRAO } from "./frentes.js";
import { Mapa, COR, COR_F as RGB_F, trajeto } from "./dotmap.js";

montarTopo({ pagina: "na-pratica/" });
rodape();

const [rows, regioes, divisas, DEN0] = await Promise.all([municipios(), json("data/regioes.json"), json("data/divisas.json"), json("data/densidade.json")]);
completarQuaest(rows);
const D = aplicar(rows, transferencia()).filter((d) => d.lon != null);
const NOME_F = ["Todas", "Reconquistar", "Mobilizar", "Terceiros"];
const COR_F = ["#000", "#e0201b", "#12a088", "#3056c8"];
const TXT_F = ["", "f1t", "f2t", "f3t"];

// ---------------------------------------------------------------- estado (vai para o endereço)
const S = { f: 0, p: 2, uf: "", q: "", ordem: "votos", n: 48, nRot: 30, roteiro: "", vista: "cidades" };
function lerHash() {
  const h = new URLSearchParams(location.hash.slice(1).replace(/^roteiros$/, "rot=1"));
  if (h.has("f")) S.f = +h.get("f") || 0;
  if (h.has("p")) S.p = +h.get("p") || 0;
  if (h.has("uf")) S.uf = (h.get("uf") || "").toUpperCase();
  if (h.has("q")) S.q = h.get("q");
  if (h.has("roteiro")) S.roteiro = h.get("roteiro");
  if (h.has("rot") || h.get("v") === "rot" || S.roteiro) S.vista = "roteiros";
  return h;
}
const h0 = lerHash();
function gravarHash() {
  const h = new URLSearchParams();
  if (S.f) h.set("f", S.f);
  if (S.p !== 2) h.set("p", S.p);
  if (S.uf) h.set("uf", S.uf);
  if (S.q) h.set("q", S.q);
  if (S.vista === "roteiros") h.set("v", "rot");
  if (S.roteiro) h.set("roteiro", S.roteiro);
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
document.querySelectorAll("[data-f]").forEach((b) => b.addEventListener("click", () => { S.f = +b.dataset.f; S.n = 48; S.nRot = 30; S.roteiro = ""; render(); }));
document.querySelectorAll("[data-p]").forEach((b) => b.addEventListener("click", () => { S.p = +b.dataset.p; S.n = 48; S.nRot = 30; S.roteiro = ""; render(); }));
selUF.addEventListener("change", () => { S.uf = selUF.value; S.n = 48; S.nRot = 30; S.roteiro = ""; render(); });
let tq;
campoQ.addEventListener("input", () => { clearTimeout(tq); tq = setTimeout(() => { S.q = campoQ.value; S.n = 48; S.roteiro = ""; render(); }, 180); });
document.getElementById("mais").addEventListener("click", () => { S.n += 48; desenharLista(); });
document.getElementById("mais-rot").addEventListener("click", () => { S.nRot += 30; desenharRoteiros(); });
const bOrdem = document.getElementById("ordem");
bOrdem.addEventListener("click", () => { S.ordem = S.ordem === "votos" ? "pct" : "votos"; S.n = 48; desenharLista(); });
document.getElementById("csv").addEventListener("click", baixarCSV);

// ---------------------------------------------------------------- mapa
// No Brasil inteiro, com muitas cidades, 1 ponto = 1.000 votos (como no caminho): a densidade mostra onde está a seleção.
// Num estado, num roteiro ou numa seleção curta, cada cidade vira um espinho com altura proporcional aos votos em jogo,
// na cor da frente (ou da frente que mais pesa). Passe o mouse para ver a cidade; clique para abrir a ficha.
const P = { lon: D.map((d) => d.lon), lat: D.map((d) => d.lat) };
const indice = new Map(D.map((d, i) => [d.ibge, i]));
const posD = DEN0.cidades.map((c) => indice.get(String(c)) ?? -1);
const fica = [];
for (let j = 0; j < DEN0.m.length; j++) if (posD[DEN0.m[j]] >= 0) fica.push(j);
const DEN = { lon: fica.map((j) => DEN0.lon[j]), lat: fica.map((j) => DEN0.lat[j]), f: fica.map((j) => DEN0.f[j]), m: fica.map((j) => posD[DEN0.m[j]]) };
const ROT_V = ["votos em jogo, somando as três frentes", "na diferença, se os eleitores perdidos voltarem", "de saldo, se os ausentes votarem como os vizinhos", "votos de eleitores de terceiros em disputa"];
const CLS_F = ["", "f1t", "f2t", "f3t"];
function dicaCidade(i) {
  const d = D[i], f = S.f || d.principal;
  return `<b>${esc(d.municipio)}</b> · ${d.uf}<span class="v ${CLS_F[f]}">+${grande(valor(d))}</span><small>${ROT_V[S.f]}${S.f ? "" : ` · ${NOME_F[f].toLowerCase()} pesa mais`}</small><small>${d.pop ? grande(d.pop) + " hab. · " : ""}Lula ${pct(d.parcela26 * 100, 0)} no 1º turno</small><a href="${RAIZ}cidade/?ibge=${d.ibge}">Abrir a ficha →</a>`;
}
const mapa = new Mapa(document.getElementById("mapa"), {
  pontos: P, divisas, densidade: DEN,
  area: (w, h) => [[10, Math.min(84, h * 0.13)], [w - 10, h - 10]],
  dica: dicaCidade,
  aoClicar: (i) => { location.href = `${RAIZ}cidade/?ibge=${D[i].ibge}`; },
});
mapa.aoRedimensionar = () => desenharMapa(true);
const voltar = document.createElement("button");
voltar.type = "button"; voltar.className = "pill pill--branco mapa-voltar"; voltar.hidden = true;
voltar.textContent = "← Voltar à seleção";
voltar.addEventListener("click", () => fecharRoteiro());
document.querySelector(".mapa-caixa").append(voltar);
let selecaoAtual = [];
function desenharMapa(inst = false) {
  const sel = new Set(selecaoAtual.map((d) => indice.get(d.ibge)));
  const rot = S.roteiro ? roteiroPorCodigo(S.roteiro) : null;
  const naRota = rot ? new Set(rot.cidades.map((c) => indice.get(c.ibge))) : null;
  const ordem = rot ? trajeto(rot.cidades, (c) => valor(c)).ordem.map((c) => indice.get(c.ibge)) : [];
  const uf = S.uf ? D.map((d, i) => (d.uf === S.uf ? i : -1)).filter((i) => i >= 0) : null;
  const espinhos = !!(rot || S.uf || sel.size <= 150);
  voltar.hidden = !rot;
  const c = { base: () => ({ cor: COR.claro, r: 0.8 }), enquadre: rot ? ordem : uf };
  if (espinhos) {
    const vals = D.map((d, i) => (sel.has(i) ? valor(d) : 0));
    const e = mapa.escala(vals);
    c.espinhos = {
      altura: (i) => (rot && !naRota.has(i) ? e.altura(vals[i]) * 0.6 : e.altura(vals[i])),
      cor: (i) => (rot && !naRota.has(i) ? COR.apagado : RGB_F[S.f || D[i].principal]),
      corte: (i) => e.corte(vals[i]),
    };
    c.regua = e.regua && { altura: e.regua.altura, texto: `${grande(e.regua.valor)} votos` };
  } else {
    c.densidade = (j) => (sel.has(DEN.m[j]) && (!S.f || DEN.f[j] === S.f) ? { cor: RGB_F[DEN.f[j]] } : null);
    c.regua = { ponto: true, cor: S.f ? `rgb(${RGB_F[S.f]})` : "#555", texto: S.f === 1 ? "1 ponto = 1.000 eleitores a reconquistar" : "1 ponto = 1.000 votos" };
  }
  c.rotas = rot ? [{ cidades: ordem }] : [];
  c.rotulos = rot ? ordem.map((i, k) => ({ i, texto: `${k + 1}. ${D[i].municipio}` })) : rotulosMapa();
  mapa.cena(c, { instantaneo: inst });
}
function rotulosMapa() {
  return ordenar(selecaoAtual).slice(0, S.uf ? 10 : 7).map((d) => ({ i: indice.get(d.ibge), texto: d.municipio }));
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
      <span class="r">${g.nome}</span><span class="b"><i style="width:${(100 * g.v / m).toFixed(1)}%;background:${S.p === g.p ? (S.f ? COR_F[S.f] : "#111") : "#bdbdbd"}"></i></span><span class="v">+${grande(g.v, true)}</span>
    </button>`).join("");
  document.querySelectorAll("[data-pp]").forEach((b) => b.addEventListener("click", () => { S.p = +b.dataset.pp; S.n = 48; S.roteiro = ""; render(); }));

  // estados
  const porUF = new Map();
  for (const d of filtrar({ uf: "" })) porUF.set(d.uf, (porUF.get(d.uf) || 0) + valor(d));
  const top = [...porUF].sort((a, b) => b[1] - a[1]).slice(0, 12);
  document.getElementById("estados").innerHTML = `<p class="nota">Estados com mais potencial nesta seleção</p><ul>${top.map(([u, v]) => `<li><button type="button" data-uf="${u}">${UFNOME[u]}</button><span class="num">+${grande(v, true)}</span></li>`).join("")}</ul>`;
  document.querySelectorAll("[data-uf]").forEach((b) => b.addEventListener("click", () => { S.uf = b.dataset.uf; selUF.value = S.uf; S.n = 48; S.roteiro = ""; render(); }));
}

// ---------------------------------------------------------------- lista de cidades
const ordenar = (arr) => arr.slice().sort((a, b) => (S.ordem === "pct" ? intensidade(b) - intensidade(a) : valor(b) - valor(a)));
function cartao(d) {
  const f = S.f || d.principal;
  const g = [d.g1, d.g2, d.g3], gm = Math.max(...g) || 1;
  const rot = S.f === 0 ? "votos em jogo, somando as três frentes" : S.f === 1 ? `${n0(d.f1)} eleitores a reconquistar (${dec(d.f1Pct)} p.p.)` : S.f === 2 ? `${n0(d.ausentes_26)} não votaram (${pct(d.f2Pct)})` : `em disputa: ${pct(d.f3Pct, 2)} dos válidos`;
  const linhas = [["Reconquistar", "f1t", 0], ["Mobilizar", "f2t", 1], ["Terceiros", "f3t", 2]].map(([n, c, k]) =>
    `<div class="${c}"><span>${n}</span><i style="width:${((100 * g[k]) / gm).toFixed(0)}%"></i><span class="t">${g[k] > 0 ? "+" + grande(g[k]) : "–"}</span></div>`).join("");
  return `<a class="cartao cidade cartao--f${f}" href="${RAIZ}cidade/?ibge=${d.ibge}">
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
  document.getElementById("lista-roteiros").innerHTML = lista.map((r, i) => {
    const t = trajeto(r.cidades, (c) => valor(c));
    const f = S.f || 1 + r.g.indexOf(Math.max(...r.g));
    const nomes = t.ordem.slice(0, 3).map((c) => esc(c.municipio)).join(", ") + (t.ordem.length > 3 ? "…" : "");
    return `<li><button type="button" class="rot${S.roteiro === r.cod ? " sel" : ""}" data-rot="${r.cod}" id="roteiro-${r.cod}">
      <span class="rot__pos">${i + 1}</span>
      <span class="rot__nome"><b>${esc(r.nome)}</b> ${r.uf}</span>
      <span class="rot__v ${TXT_F[f]}">+${grande(r.v)}</span>
      <span class="rot__info"><i class="ponto f${f}"></i>${r.cidades.length} cidades · ~${n0(t.total)} km · ${nomes}</span>
    </button></li>`;
  }).join("") || `<li class="texto">Sem roteiros com duas ou mais cidades nesta seleção.</li>`;
  document.getElementById("mais-rot").hidden = roteirosAtuais.length <= S.nRot;
}
document.getElementById("lista-roteiros").addEventListener("click", (e) => {
  const b = e.target.closest("[data-rot]");
  if (b) abrirRoteiro(b.dataset.rot, true);
});
// abre um roteiro: o mapa mostra o caminho e o painel ao lado mostra as paradas, com anterior e próximo
function abrirRoteiro(cod, rolar = false) {
  S.roteiro = cod;
  const i = roteirosAtuais.findIndex((r) => r.cod === cod);
  if (i >= S.nRot) S.nRot = i + 1;
  desenharRoteiros();
  desenharDetalhe();
  desenharMapa();
  gravarHash();
  if (rolar) document.querySelector(".painel-dados").scrollIntoView({ behavior: "smooth", block: "start" });
}
function fecharRoteiro() {
  S.roteiro = "";
  desenharRoteiros();
  desenharDetalhe();
  desenharMapa();
  gravarHash();
}
function textoRoteiro(r, t) {
  const link = `${location.origin}${location.pathname}#v=rot&roteiro=${r.cod}`;
  return [`Roteiro ${r.nome} (${r.uf}): ${r.cidades.length} cidades, +${grande(r.v)} votos em jogo, ~${n0(t.total)} km em linha reta`,
    ...t.ordem.map((c, i) => `${i + 1}. ${c.municipio} (+${grande(valor(c))})${i ? ` · ${n0(t.passos[i])} km` : ""}`), link].join("\n");
}
function desenharDetalhe() {
  const caixa = document.getElementById("rot-detalhe");
  const r = S.roteiro ? roteiroPorCodigo(S.roteiro) : null;
  document.querySelectorAll(".resumo > :not(#rot-detalhe)").forEach((x) => (x.hidden = !!r));
  caixa.hidden = !r;
  if (!r) { caixa.innerHTML = ""; return; }
  const i = roteirosAtuais.findIndex((x) => x.cod === r.cod);
  const t = trajeto(r.cidades, (c) => valor(c));
  const f = S.f || 1 + r.g.indexOf(Math.max(...r.g));
  const txt = textoRoteiro(r, t);
  caixa.innerHTML = `
    <div class="rot-det__nav">
      <button class="pill" type="button" data-nav="-1"${i <= 0 ? " disabled" : ""}>← Anterior</button>
      <span class="nota">${i >= 0 ? `Roteiro ${i + 1} de ${n0(roteirosAtuais.length)}` : "Roteiro"}</span>
      <button class="pill" type="button" data-nav="1"${i < 0 || i >= roteirosAtuais.length - 1 ? " disabled" : ""}>Próximo →</button>
    </div>
    <h3 class="rot-det__nome">${esc(r.nome)} (${r.uf})</h3>
    <p class="meta">${r.cidades.length} cidades · região intermediária de ${esc(r.inter)} · ${["", "reconquistar", "mobilizar", "terceiros"][f]} pesa mais</p>
    <p class="valor ${TXT_F[f]}">+${grande(r.v)} <span class="nota">votos em jogo · ~${n0(t.total)} km em linha reta</span></p>
    <ol class="paradas">${t.ordem.map((c, k) => `<li><a href="${RAIZ}cidade/?ibge=${c.ibge}">${esc(c.municipio)}</a> <small>+${grande(valor(c))}${k ? ` · ${n0(t.passos[k])} km da anterior` : " · comece aqui"}</small> <a class="reel-link" href="${RAIZ}reels/?ibge=${c.ibge}">reel</a></li>`).join("")}</ol>
    <p class="linha">
      <button class="pill pill--acento" type="button" id="rot-copiar">Copiar roteiro</button>
      <a class="pill pill--branco" target="_blank" rel="noopener" href="${linkWhats(txt)}">Mandar no WhatsApp</a>
      <button class="pill" type="button" id="rot-fechar">Voltar à seleção</button>
    </p>
    <p class="nota">Setas do teclado ← → trocam de roteiro.</p>`;
  caixa.querySelectorAll("[data-nav]").forEach((b) => b.addEventListener("click", () => {
    const j = i + +b.dataset.nav;
    if (roteirosAtuais[j]) abrirRoteiro(roteirosAtuais[j].cod);
  }));
  caixa.querySelector("#rot-copiar").addEventListener("click", (e) => copiar(txt, e.currentTarget));
  caixa.querySelector("#rot-fechar").addEventListener("click", fecharRoteiro);
}
document.addEventListener("keydown", (e) => {
  if (!S.roteiro || e.target.closest("input, select, textarea") || e.altKey || e.metaKey || e.ctrlKey) return;
  if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
  const i = roteirosAtuais.findIndex((r) => r.cod === S.roteiro);
  const j = i + (e.key === "ArrowRight" ? 1 : -1);
  if (roteirosAtuais[j]) { e.preventDefault(); abrirRoteiro(roteirosAtuais[j].cod); }
});
// cidades ou roteiros
function mostrarVista() {
  document.querySelectorAll(".controles [data-vista]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.vista === S.vista)));
  document.getElementById("cidades").hidden = S.vista !== "cidades";
  document.getElementById("roteiros").hidden = S.vista !== "roteiros";
}
document.querySelectorAll("[data-vista]").forEach((b) => b.addEventListener("click", (e) => {
  e.preventDefault();
  S.vista = b.dataset.vista;
  if (S.vista === "cidades" && S.roteiro) fecharRoteiro();
  mostrarVista();
  gravarHash();
  if (b.closest(".abre")) document.getElementById("controles").scrollIntoView({ behavior: "smooth", block: "start" });
}));

// ---------------------------------------------------------------- CSV
function baixarCSV() {
  const cab = ["ibge", "municipio", "uf", "populacao_2022", "eleitores_2026", "frente_principal", "potencial_diferenca_total", "reconquistar_eleitores", "reconquistar_pp", "mobilizar_saldo", "abstencao_1t_pct", "terceiros_em_disputa", "terceiros_em_disputa_pct_validos", "lula_parcela_1t_2026_pct", "regiao_imediata"];
  const linhas = ordenar(selecaoAtual).map((d) => [d.ibge, `"${d.municipio.replace(/"/g, '""')}"`, d.uf, d.pop ?? "", d.aptos_26, NOME_F[d.principal], Math.round(d.gTot), Math.round(d.f1), d.f1Pct.toFixed(2), Math.round(d.f2), (d.abstencao * 100).toFixed(2), Math.round(d.f3), d.f3Pct == null ? "" : d.f3Pct.toFixed(3), (d.parcela26 * 100).toFixed(2), `"${(regioes.imediatas[d.imediata] || [""])[0]}"`].join(","));
  const nome = `cidades_${NOME_F[S.f].toLowerCase()}_${S.p ? "porte" + S.p : "todas"}${S.uf ? "_" + S.uf : ""}.csv`;
  baixarArquivo(nome, "﻿" + [cab.join(","), ...linhas].join("\n"));
}

// ---------------------------------------------------------------- tudo
function render() {
  document.querySelectorAll("[data-f]").forEach((b) => b.setAttribute("aria-pressed", String(+b.dataset.f === S.f)));
  document.querySelectorAll("[data-p]").forEach((b) => b.setAttribute("aria-pressed", String(+b.dataset.p === S.p)));
  selUF.value = S.uf;
  if (campoQ.value !== S.q) campoQ.value = S.q;
  selecaoAtual = filtrar();
  roteirosAtuais = calcularRoteiros(selecaoAtual);
  desenharResumo(selecaoAtual);
  desenharLista();
  if (S.roteiro && !roteirosAtuais.some((r) => r.cod === S.roteiro)) S.roteiro = "";
  desenharRoteiros();
  desenharDetalhe();
  desenharMapa();
  mostrarVista();
  gravarHash();
}
render();

// vindo de um link para um roteiro (pode estar fora da seleção atual: entra no topo da lista)
if (h0.has("roteiro") && !S.roteiro) {
  const r = calcularRoteiros(D.filter((d) => d.imediata === h0.get("roteiro") && valor(d, 0) > 0))[0];
  if (r) { roteirosAtuais.unshift(r); abrirRoteiro(r.cod); }
}
if (S.vista === "roteiros") setTimeout(() => document.getElementById(S.roteiro ? "controles" : "roteiros").scrollIntoView({ block: "start" }), 300);

document.querySelector(".abre .nota")?.remove();
document.querySelector(".abre").insertAdjacentHTML("beforeend", `<p class="nota">Terceiros calculados com a ${PESQUISAS[PESQUISA_PADRAO].nome} (${PESQUISAS[PESQUISA_PADRAO].campo}). Os números são tetos: mostram onde há mais votos possíveis, não quantos serão conquistados.</p>`);
