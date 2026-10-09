// Página inicial: o feed em 10 posts e o mapa de pontos que muda a cada passo.
import { montarTopo, rodape, json, grande, n0, pct, esc, linkWhats, copiar, RAIZ } from "./ui.js";
import { Mapa, COR, COR_F, HEX, HEX_F, TXT_F, trajeto, ufDoCodigo } from "./dotmap.js";
import { barras, cascata, caminhos, empilhadas, pessoas, checklist, ranking } from "./esboco.js";
import { PESQUISAS, UFNOME } from "./frentes.js";
import { annotate } from "../vendor/rough-notation-0.5.1.esm.js";

const { painel } = montarTopo({ pagina: "", painel: '<div class="painel__titulo"><span>Legenda</span><span class="titulo-passo"></span></div><div class="painel__corpo"></div>' });
painel.classList.add("painel--legenda");
rodape();

const [P, R, divisas, DEN] = await Promise.all([json("data/pontos.json"), json("data/resumo.json"), json("data/divisas.json"), json("data/densidade.json")]);
const T = R.totais;

// ---------------------------------------------------------------- números no texto
const somaG = R.porPorte.reduce((s, p) => s + p.gTot, 0);
const peq = R.porPorte.find((p) => p.id === 2);
const calc = {
  difAptos: (T.diferenca / T.aptos) * 100,
  partePequenas: (peq.gTot / somaG) * 100,
  pequenas: peq.municipios,
  aptosPequenas: peq.aptos,
};
const FMT = { n0, pct: (v) => pct(v), pct0: (v) => Math.round(v) + "%", grande: (v) => grande(v) };
document.querySelectorAll("[data-n]").forEach((el) => {
  const [grupo, chave] = el.dataset.n.split(".");
  const v = grupo === "calc" ? calc[chave] : grupo === "totais" ? T[chave] : null;
  if (v != null) el.textContent = (FMT[el.dataset.f || "grande"] || FMT.grande)(v);
});

// ---------------------------------------------------------------- mapa
// Primeiro, um ponto por cidade (quem venceu). Depois, 1 ponto = 1.000 votos em jogo, sorteado dentro
// do território de cada cidade e pintado pela frente: a densidade mostra onde estão os votos, a cor mostra o caminho.
const canvas = document.getElementById("mapa");
const area = (w, h) => (w >= 900 ? [[Math.min(640, w * 0.46), 96], [w - 28, h - 28]] : [[10, 92], [w - 10, Math.max(260, h * 0.58)]]);
// rótulos e notas não vão para baixo do topo nem da legenda
const reservado = () => {
  const caixas = [[0, 0, innerWidth, 84]];
  const r = painel.getBoundingClientRect();
  if (r.width && !painel.classList.contains("fora")) caixas.push([r.left - 6, r.top - 6, r.right + 6, r.bottom + 6]);
  return caixas;
};
// num recorte (os roteiros), o enquadramento deixa livre o canto da legenda
const areaZoom = (w, h) => (w >= 900 ? [[Math.min(640, w * 0.46), 110], [w - 340, h - 40]] : area(w, h));
const mapa = new Mapa(canvas, { pontos: P, area, areaZoom, divisas, densidade: DEN, reservado });
const N = P.lon.length;
const gT = new Float64Array(N), princ = new Uint8Array(N);
for (let i = 0; i < N; i++) {
  const g = [2 * P.f1[i], P.f2[i], P.f3[i]];
  gT[i] = g[0] + g[1] + g[2];
  princ[i] = 1 + g.indexOf(Math.max(...g));
}
const idx = new Map(Array.from(P.ibge, (c, i) => [String(c), i]));
// os seis roteiros com mais votos em jogo, na ordem de visita
const rotas = R.roteiros.slice(0, 6).map((r) => {
  const cid = r.lista.map((c) => idx.get(String(c.ibge))).filter((i) => i != null).map((i) => ({ i, lon: P.lon[i], lat: P.lat[i], g: gT[i] }));
  const t = trajeto(cid, (c) => c.g);
  return { ...r, ordem: t.ordem.map((c) => c.i), km: t.total };
});
const naRota = rotas.flatMap((r) => r.ordem);
const gRota = Math.max(...naRota.map((i) => gT[i]));
// âncoras das notas: o centro dos pontos de cada frente na região citada no post
const NE = new Set(["MA", "PI", "CE", "RN", "PB", "PE", "AL", "SE", "BA"]);
const ufPonto = (j) => ufDoCodigo(P.ibge[DEN.m[j]]);
const meio = (ok) => { let x = 0, y = 0, n = 0; for (let j = 0; j < DEN.lon.length; j++) if (ok(j)) { x += DEN.lon[j]; y += DEN.lat[j]; n++; } return { lon: x / n, lat: y / n }; };
const ne = R.porRegiao.find((r) => r.id === "Nordeste"), sp = R.porUF.find((u) => u.id === "SP");
const notaNE = { ...meio((j) => DEN.f[j] === 2 && NE.has(ufPonto(j))), texto: `Nordeste: ${grande(ne.f2, true)} · ${Math.round((ne.f2 / T.f2) * 100)}%`, cor: TXT_F[2], dx: 30, dy: -105 };
const notaSP = { ...meio((j) => DEN.f[j] === 3 && ufPonto(j) === "SP"), texto: `São Paulo: ${grande(sp.f3, true)} · ${Math.round((sp.f3 / T.f3) * 100)}%`, cor: TXT_F[3], dx: -120, dy: -70 };

const claro = () => ({ cor: COR.claro, r: 0.85 });
const so = (k) => (j) => (DEN.f[j] === k ? { cor: COR_F[k] } : null);
const PASSOS = {
  inicio: () => ({ base: () => ({ cor: COR.tinta }) }),
  vencedor: () => ({ base: (i) => ({ cor: P.lula[i] ? COR.lula : COR.flavio, r: 1.1 }) }),
  tres: () => ({ base: claro, densidade: (j) => ({ cor: COR_F[DEN.f[j]] }) }),
  f1: () => ({ base: claro, densidade: so(1) }),
  f2: () => ({ base: claro, densidade: so(2), notas: [notaNE] }),
  f3: () => ({ base: claro, densidade: so(3), notas: [notaSP] }),
  pequenas: () => ({ base: claro, densidade: (j) => (P.porte[DEN.m[j]] === 2 ? { cor: COR_F[DEN.f[j]] } : { cor: COR.apagado }) }),
  roteiros: () => ({
    base: (i) => (P.porte[i] === 2 ? { cor: COR.apagado, r: 0.62 } : { cor: COR.claro, r: 0.5 }),
    densidade: null, espalhar: 1,
    rotas: rotas.map((r) => ({ cidades: r.ordem })),
    nos: naRota.map((i) => ({ i, r: 1.5 + 2.7 * Math.sqrt(gT[i] / gRota), cor: HEX_F[princ[i]] })),
    rotulos: rotas.map((r, k) => ({ grupo: r.ordem, texto: `${k + 1}. ${r.nome}` })),
    enquadre: naRota,
  }),
  lei: () => ({ base: () => ({ cor: COR.meio }) }),
};

// ---------------------------------------------------------------- legenda (painel)
const curto = (v) => grande(v, true);
const chip = (cor, txt) => `<span class="chave"><i style="background:${cor}"></i>${txt}</span>`;
const topUF = (campo) => R.porUF.slice().sort((a, b) => b[campo] - a[campo]).slice(0, 5).map((u) => `<li><span>${UFNOME[u.id]}</span><span class="num">${curto(u[campo])}</span></li>`).join("");
const LEGENDA = {
  inicio: ["", chip("#000", "cada ponto é uma cidade")],
  vencedor: ["1º turno", `<ul><li>${chip(HEX.f1, "Lula venceu")}<span class="num">${n0(T.vencidosLula)}</span></li><li>${chip(HEX.flavio, "Flávio venceu")}<span class="num">${n0(T.municipiosNaConta - T.vencidosLula)}</span></li></ul><small>Cada ponto é uma cidade.</small>`],
  tres: ["1 ponto = 1.000 votos", `<ul><li>${chip(HEX.f1, "Reconquistar")}<span class="num">${curto(T.f1)}</span></li><li>${chip(HEX.f2, "Mobilizar")}<span class="num">${curto(T.f2)}</span></li><li>${chip(HEX.f3, "Terceiros")}<span class="num">${curto(T.f3)}</span></li></ul><small>Cada ponto cai num lugar sorteado dentro do território da cidade.</small>`],
  f1: ["onde mais pesa", `<ul>${topUF("f1")}</ul><small>${chip(HEX.f1, "1 ponto = 1.000 eleitores a reconquistar")}</small>`],
  f2: ["onde mais pesa", `<ul>${topUF("f2")}</ul><small>${chip(HEX.f2, "1 ponto = 1.000 votos de saldo")}</small>`],
  f3: ["onde mais pesa", `<ul>${topUF("f3")}</ul><small>${chip(HEX.f3, "1 ponto = 1.000 votos em disputa")}</small>`],
  pequenas: ["10 a 50 mil hab.", `<ul>${R.porUF.slice().sort((a, b) => b.pequenasGTot - a.pequenasGTot).slice(0, 5).map((u) => `<li><span>${UFNOME[u.id]} <span class="num">· ${u.pequenas} cidades</span></span><span class="num">${curto(u.pequenasGTot)}</span></li>`).join("")}</ul><small>Em cor, os votos dessas cidades; em cinza, os das outras.</small>`],
  roteiros: ["ordem de visita", `<ul>${rotas.map((r) => `<li><span>${esc(r.nome)} (${r.uf})</span><span class="num">${r.cidades} cid. · ${n0(r.km)} km</span></li>`).join("")}</ul><small>Círculo: votos em jogo na cidade, na cor da frente que mais pesa.</small>`],
  lei: ["", chip(HEX.meio, "cada ponto é uma cidade")],
};
function legenda(passo) {
  const [t, corpo] = LEGENDA[passo] || LEGENDA.inicio;
  painel.querySelector(".titulo-passo").textContent = t;
  painel.querySelector(".painel__corpo").innerHTML = corpo;
}

let atual = null;
function aplicar(passo, instantaneo = false) {
  mapa.cena(PASSOS[passo](), { instantaneo });
  legenda(passo);
}
mapa.aoRedimensionar = () => aplicar(atual || "inicio", true);
aplicar("inicio", true);

// ---------------------------------------------------------------- gráficos dos posts
const VIZ = {
  placar: (el) => barras(el, [
    { rotulo: "Flávio", valor: T.flavio, cor: "#8a8a8a", texto: curto(T.flavio) },
    { rotulo: "Lula", valor: T.lula, cor: "#e0201b", texto: curto(T.lula) },
  ], { rotuloLargura: 64, altura: 28 }),
  cascata: (el) => cascata(el, [
    { rotulo: "Diferença\nno 1º turno", valor: T.diferenca, cor: "#8a8a8a", tipo: "base", texto: curto(T.diferenca) },
    { rotulo: "Terceiros que\njá escolheram", valor: T.saldoTerceirosDecididos, cor: "#3056c8", tipo: "soma", texto: "+" + curto(T.saldoTerceirosDecididos) },
    { rotulo: "Distância\nreal", valor: T.diferencaEfetiva, cor: "#6b6b6b", tipo: "total", texto: curto(T.diferencaEfetiva) },
  ]),
  caminhos: (el) => caminhos(el, [
    { nome: "Reconquistar", valor: T.f1, cor: "#e0201b", quem: "quem votou em Lula em 2022 e foi de Flávio", texto: curto(T.f1) },
    { nome: "Mobilizar", valor: T.f2, cor: "#12a088", quem: "quem não votou, nas cidades onde Lula ganha", texto: curto(T.f2) },
    { nome: "Convencer", valor: T.f3, cor: "#3056c8", quem: "eleitores de terceiros que não escolheram lado", texto: curto(T.f3) },
  ]),
  "regiao-f1": (el) => barras(el, R.porRegiao.slice().sort((a, b) => b.f1 - a.f1).map((r) => ({ rotulo: r.id, valor: r.f1, cor: "#e0201b", texto: curto(r.f1) })), { rotuloLargura: 98 }),
  "regiao-f2": (el) => barras(el, R.porRegiao.slice().sort((a, b) => b.f2 - a.f2).map((r) => ({ rotulo: r.id, valor: r.f2, cor: "#12a088", texto: curto(r.f2) })), { rotuloLargura: 98 }),
  terceiros: (el) => {
    const t = PESQUISAS.atlas.t;
    const linha = (nome, [l, f]) => ({ rotulo: nome, partes: [{ valor: l, cor: "#ff8f8a" }, { valor: f, cor: "#a9a9a9" }, { valor: 100 - l - f, cor: "#3056c8", solido: true }] });
    empilhadas(el, [linha("Caiado", t.caiado), linha("Renan Santos", t.renan), linha("Augusto Cury", t.cury), linha("Zema e outros", t.outros)],
      { legenda: [{ nome: "Lula", cor: "#ff8f8a" }, { nome: "Flávio", cor: "#a9a9a9" }, { nome: "em disputa", cor: "#3056c8", solido: true }] });
  },
  pessoas: (el) => pessoas(el, [
    { valor: "+2", nome: "volta de Flávio\npara Lula", cor: "#e0201b", corTexto: "#c4130e" },
    { valor: "+1", nome: "indeciso de terceiros\nescolhe Lula", cor: "#3056c8", corTexto: "#2848b0" },
    { valor: "+0,4", nome: "não votou e vai\n(cidade 70% Lula)", cor: "#12a088", corTexto: "#0b7a66" },
  ]),
  portes: (el) => barras(el, R.porPorte.map((p) => ({ rotulo: p.curto, valor: p.gTot, cor: p.id === 2 ? "#111111" : "#a9a9a9", destaque: p.id === 2, texto: curto(p.gTot) })), { rotuloLargura: 96 }),
  roteiros: (el) => ranking(el, rotas.map((r) => {
    const g = [r.g1, r.f2, r.f3], f = 1 + g.indexOf(Math.max(...g));
    return { titulo: `${r.nome} (${r.uf})`, sub: `${r.cidades} cidades · ${["", "reconquistar", "mobilizar", "terceiros"][f]} pesa mais`, valor: r.gTot, cor: ["", "#e0201b", "#12a088", "#3056c8"][f], href: `${RAIZ}na-pratica/#roteiro=${r.codigo}` };
  }), { formato: (v) => "+" + grande(v) }),
  lei: (el) => checklist(el, [
    { ok: true, texto: "Conversar olho no olho com quem você conhece: família, vizinhos, trabalho, igreja." },
    { ok: true, texto: "Gravar vídeos curtos sobre a sua cidade, com números que têm fonte." },
    { ok: true, texto: "Lembrar data, horário e local de votação (app e-Título)." },
    { ok: true, texto: "Cobrar da prefeitura ônibus de graça e na frequência de dia útil: é dever do poder público." },
    { ok: false, texto: "Levar eleitor para votar de carro, van ou barco: é crime, de véspera até o dia seguinte. Só família no próprio carro." },
    { ok: false, texto: "Disparo em massa, impulsionamento pago por apoiador e conteúdo feito com IA sem aviso." },
  ]),
};
document.querySelectorAll("[data-viz]").forEach((el) => VIZ[el.dataset.viz]?.(el));

// ---------------------------------------------------------------- ações de cada post
const base = location.origin + location.pathname;
document.querySelectorAll(".post").forEach((post) => {
  const pe = post.querySelector(".post__acoes");
  const titulo = post.querySelector(".post__titulo").textContent.trim();
  const url = base + "#" + post.id;
  const f = pe.dataset.filtro;
  const extra = !f ? "" :
    f === "roteiros" ? `<a class="pill pill--acento" href="${RAIZ}na-pratica/#roteiros">Ver os ${R.roteirosTotal} roteiros</a>` :
    f === "cidade" ? `<button class="pill pill--acento" type="button" data-acha>Achar minha cidade</button><a class="pill pill--branco" href="${RAIZ}reels/">Kit de reels</a>` :
    `<a class="pill pill--acento" href="${RAIZ}na-pratica/#${f}">Ver cidades</a>`;
  pe.innerHTML = `${extra}<a class="pill" href="${linkWhats(titulo, url)}" target="_blank" rel="noopener">WhatsApp</a><button class="pill" type="button" data-copia>Copiar link</button>`;
  pe.querySelector("[data-copia]").addEventListener("click", (e) => copiar(url, e.currentTarget));
  pe.querySelector("[data-acha]")?.addEventListener("click", (e) => { e.stopPropagation(); document.querySelector("[data-busca]").click(); });
});

// ---------------------------------------------------------------- rolagem: cada post ativa um passo
const marcados = new Set();
function destacar(post) {
  if (marcados.has(post.id)) return;
  marcados.add(post.id);
  post.querySelectorAll(".post__titulo em").forEach((em, k) => {
    const cor = em.classList.contains("f1t") ? "#ffe0dd" : em.classList.contains("f2t") ? "#d4f2eb" : em.classList.contains("f3t") ? "#e0e7fb" : null;
    const opc = { type: "highlight", color: cor || "#d6ef94" };
    setTimeout(() => annotate(em, { ...opc, animationDuration: 700, multiline: true, iterations: 1 }).show(), 250 + k * 200);
  });
}
const posts = [...document.querySelectorAll(".post")];
const obs = new IntersectionObserver((ents) => {
  for (const e of ents) {
    if (!e.isIntersecting) continue;
    const passo = e.target.dataset.passo;
    destacar(e.target);
    if (passo !== atual) { atual = passo; aplicar(passo); }
  }
}, { rootMargin: matchMedia("(max-width: 899px)").matches ? "-78% 0px -4% 0px" : "-40% 0px -45% 0px" });
posts.forEach((p) => obs.observe(p));
// de volta ao topo: mapa neutro
new IntersectionObserver((ents) => {
  if (ents[0].isIntersecting && atual !== "inicio") { atual = "inicio"; aplicar("inicio"); }
}, { rootMargin: "0px 0px -60% 0px" }).observe(document.querySelector(".abertura .faixa"));

// ---------------------------------------------------------------- letreiro
const top = R.listas.pequenas.todas.slice(0, 18);
const item = (d) => `<a class="letreiro__item" href="${RAIZ}cidade/?ibge=${d.ibge}"><b>${esc(d.nome)}</b>${d.uf} · +${grande(d.gTot)}</a>`;
document.getElementById("letreiro").innerHTML = top.map(item).join("") + top.map(item).join("");

// legenda some no fim da página (não cobre o rodapé)
new IntersectionObserver((ents) => painel.classList.toggle("fora", ents[0].isIntersecting), { rootMargin: "0px 0px -30% 0px" }).observe(document.querySelector(".fim"));
