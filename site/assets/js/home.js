// Página inicial: o feed em 10 posts e o mapa de pontos que muda a cada passo.
import { montarTopo, rodape, json, grande, n0, pct, esc, linkWhats, copiar, RAIZ } from "./ui.js";
import { MapaPontos, CORES } from "./dotmap.js";
import { barras, cascata, caminhos, empilhadas, pessoas, checklist, ranking } from "./esboco.js";
import { PESQUISAS, UFNOME } from "./frentes.js";
import { annotate } from "../vendor/rough-notation-0.5.1.esm.js";

const { painel } = montarTopo({ pagina: "", painel: '<div class="painel__titulo"><span>Legenda</span><span class="titulo-passo"></span></div><div class="painel__corpo"></div>' });
painel.classList.add("painel--legenda");
rodape();

const [P, R, divisas] = await Promise.all([json("data/pontos.json"), json("data/resumo.json"), json("data/divisas.json")]);
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
const canvas = document.getElementById("mapa");
const area = (w, h) => (w >= 900 ? [[Math.min(640, w * 0.46), 96], [w - 28, h - 28]] : [[10, 92], [w - 10, Math.max(260, h * 0.58)]]);
const mapa = new MapaPontos(canvas, P, { area, divisas });
const N = P.lon.length;
const gT = new Float64Array(N), princ = new Uint8Array(N);
for (let i = 0; i < N; i++) {
  const g = [2 * P.f1[i], P.f2[i], P.f3[i]];
  gT[i] = g[0] + g[1] + g[2];
  princ[i] = 1 + g.indexOf(Math.max(...g));
}
const idx = new Map(Array.from(P.ibge, (c, i) => [String(c), i]));
const rotas = R.roteiros.slice(0, 6);
const naRota = new Set(rotas.flatMap((r) => r.lista.map((c) => c.ibge)));
const centroRota = (r) => {
  const is = r.lista.map((c) => idx.get(c.ibge)).filter((i) => i != null);
  return { lon: is.reduce((s, i) => s + P.lon[i], 0) / is.length, lat: is.reduce((s, i) => s + P.lat[i], 0) / is.length };
};

const PASSOS = {
  inicio: () => () => ({ cor: CORES.tinta }),
  vencedor: () => (i) => ({ cor: P.lula[i] ? CORES.lula : CORES.flavio, r: mapa.base * 1.12 }),
  tres: () => { const s = mapa.escala(gT, { piso: 0.6 }); return (i) => ({ cor: CORES.tinta, halo: s(gT[i]), hc: princ[i] }); },
  f1: () => { const s = mapa.escala(P.f1, { piso: 0.55 }); return (i) => ({ cor: P.f1[i] > 0 ? CORES.tinta : CORES.apagado, halo: s(P.f1[i]), hc: 1 }); },
  f2: () => { const s = mapa.escala(P.f2, { piso: 0.35 }); return (i) => ({ cor: P.area[i] ? CORES.tinta : CORES.apagado, halo: s(P.f2[i]), hc: 2 }); },
  f3: () => { const s = mapa.escala(P.f3, { piso: 0.55 }); return (i) => ({ cor: CORES.tinta, halo: s(P.f3[i]), hc: 3 }); },
  pequenas: () => {
    const v = gT.map((x, i) => (P.porte[i] === 2 ? x : 0)), s = mapa.escala(v, { piso: 0.45 });
    return (i) => (P.porte[i] === 2 ? { cor: CORES.tinta, r: mapa.base * 1.15, halo: s(v[i]), hc: princ[i] } : { cor: CORES.apagado, r: mapa.base * 0.85 });
  },
  roteiros: () => {
    const v = gT.map((x, i) => (naRota.has(String(P.ibge[i])) ? x : 0)), s = mapa.escala(gT.map((x, i) => (P.porte[i] === 2 ? x : 0)));
    return (i) => (v[i] > 0 ? { cor: CORES.tinta, r: mapa.base * 1.3, halo: s(v[i]), hc: princ[i] } : { cor: CORES.apagado, r: mapa.base * 0.85 });
  },
  lei: () => () => ({ cor: CORES.meio }),
};
const EXTRAS = {
  f2: { anotacoes: [{ ufs: ["MA", "PI", "CE", "RN", "PB", "PE", "AL", "SE", "BA"], texto: "Nordeste: " + grande(R.porRegiao.find((r) => r.id === "Nordeste").f2, true), cor: "#6526e8", lado: "dir" }] },
  f3: { anotacoes: [{ ufs: ["SP"], texto: "São Paulo: " + Math.round((R.porUF.find((u) => u.id === "SP").f3 / T.f3) * 100) + "%", cor: "#a85a00", lado: "dir" }] },
  roteiros: { rotulos: rotas.map((r) => ({ ...centroRota(r), texto: `${r.nome} (${r.uf})`, cor: "#000" })) },
};

// ---------------------------------------------------------------- legenda (painel)
const chip = (cor, txt, halo = false) => `<span class="chave"><i class="${halo ? "halo" : ""}" style="background:${cor}"></i>${txt}</span>`;
const topUF = (campo, fmt = (v) => grande(v, true)) => R.porUF.slice().sort((a, b) => b[campo] - a[campo]).slice(0, 5).map((u) => `<li><span>${UFNOME[u.id]}</span><span class="num">${fmt(u[campo])}</span></li>`).join("");
const LEGENDA = {
  inicio: ["", `${chip("#000", "cada ponto é uma cidade")}`],
  vencedor: ["1º turno", `<ul><li>${chip("#ff1a1a", "Lula venceu")}<span class="num">${n0(T.vencidosLula)}</span></li><li>${chip("#6b6b6b", "Flávio venceu")}<span class="num">${n0(T.municipiosNaConta - T.vencidosLula)}</span></li></ul>`],
  tres: ["frente que mais pesa", `<ul><li>${chip("#ff7f7f", "Reconquistar", true)}</li><li>${chip("#ba99ff", "Mobilizar", true)}</li><li>${chip("#ffcc7f", "Terceiros", true)}</li></ul><small>Tamanho do halo: potencial somado das três frentes.</small>`],
  f1: ["onde mais pesa", `<ul>${topUF("f1")}</ul><small>${chip("#ff7f7f", "votos a reconquistar", true)}</small>`],
  f2: ["onde mais pesa", `<ul>${topUF("f2")}</ul><small>${chip("#ba99ff", "saldo se os ausentes votassem", true)}</small>`],
  f3: ["onde mais pesa", `<ul>${topUF("f3")}</ul><small>${chip("#ffcc7f", "votos em disputa", true)}</small>`],
  pequenas: ["10 a 50 mil hab.", `<ul>${R.porUF.slice().sort((a, b) => b.pequenasGTot - a.pequenasGTot).slice(0, 5).map((u) => `<li><span>${UFNOME[u.id]} <span class="num">· ${u.pequenas} cidades</span></span><span class="num">${grande(u.pequenasGTot, true)}</span></li>`).join("")}</ul>`],
  roteiros: ["regiões imediatas", `<ul>${rotas.map((r) => `<li><span>${esc(r.nome)} (${r.uf})</span><span class="num">${r.cidades} cid.</span></li>`).join("")}</ul>`],
  lei: ["", `${chip("#7533ff", "pode")} ${chip("#ff1a1a", "não pode")}`],
};
function legenda(passo) {
  const [t, corpo] = LEGENDA[passo] || LEGENDA.inicio;
  painel.querySelector(".titulo-passo").textContent = t;
  painel.querySelector(".painel__corpo").innerHTML = corpo;
}

let atual = null;
function aplicar(passo, instantaneo = false) {
  mapa.estado(PASSOS[passo](), { ...(EXTRAS[passo] || {}), instantaneo });
  legenda(passo);
}
mapa.aoRedimensionar = () => aplicar(atual || "inicio", true);
aplicar("inicio", true);

// ---------------------------------------------------------------- gráficos dos posts
const curto = (v) => grande(v, true);
const VIZ = {
  placar: (el) => barras(el, [
    { rotulo: "Flávio", valor: T.flavio, cor: "#8a8a8a", texto: curto(T.flavio) },
    { rotulo: "Lula", valor: T.lula, cor: "#ff1a1a", texto: curto(T.lula) },
  ], { rotuloLargura: 64, altura: 28 }),
  cascata: (el) => cascata(el, [
    { rotulo: "Diferença\nno 1º turno", valor: T.diferenca, cor: "#8a8a8a", tipo: "base", texto: curto(T.diferenca) },
    { rotulo: "Terceiros que\njá escolheram", valor: T.saldoTerceirosDecididos, cor: "#ff9900", tipo: "soma", texto: "+" + curto(T.saldoTerceirosDecididos) },
    { rotulo: "Distância\nreal", valor: T.diferencaEfetiva, cor: "#6b6b6b", tipo: "total", texto: curto(T.diferencaEfetiva) },
  ]),
  caminhos: (el) => caminhos(el, [
    { nome: "Reconquistar", valor: T.f1, cor: "#ff1a1a", quem: "quem votou em Lula em 2022 e foi de Flávio", texto: curto(T.f1) },
    { nome: "Mobilizar", valor: T.f2, cor: "#7533ff", quem: "quem não votou, nas cidades onde Lula ganha", texto: curto(T.f2) },
    { nome: "Convencer", valor: T.f3, cor: "#ff9900", quem: "eleitores de terceiros que não escolheram lado", texto: curto(T.f3) },
  ]),
  "regiao-f1": (el) => barras(el, R.porRegiao.slice().sort((a, b) => b.f1 - a.f1).map((r) => ({ rotulo: r.id, valor: r.f1, cor: "#ff1a1a", texto: curto(r.f1) })), { rotuloLargura: 98 }),
  "regiao-f2": (el) => barras(el, R.porRegiao.slice().sort((a, b) => b.f2 - a.f2).map((r) => ({ rotulo: r.id, valor: r.f2, cor: "#7533ff", texto: curto(r.f2) })), { rotuloLargura: 98 }),
  terceiros: (el) => {
    const t = PESQUISAS.atlas.t;
    const linha = (nome, [l, f]) => ({ rotulo: nome, partes: [{ valor: l, cor: "#ff7f7f" }, { valor: f, cor: "#a9a9a9" }, { valor: 100 - l - f, cor: "#ff9900", solido: true }] });
    empilhadas(el, [linha("Caiado", t.caiado), linha("Renan Santos", t.renan), linha("Augusto Cury", t.cury), linha("Zema e outros", t.outros)],
      { legenda: [{ nome: "Lula", cor: "#ff7f7f" }, { nome: "Flávio", cor: "#a9a9a9" }, { nome: "em disputa", cor: "#ff9900", solido: true }] });
  },
  pessoas: (el) => pessoas(el, [
    { valor: "+2", nome: "volta de Flávio\npara Lula", cor: "#ff1a1a", corTexto: "#d10000" },
    { valor: "+1", nome: "indeciso de terceiros\nescolhe Lula", cor: "#ff9900", corTexto: "#a85a00" },
    { valor: "+0,4", nome: "não votou e vai\n(cidade 70% Lula)", cor: "#7533ff", corTexto: "#6526e8" },
  ]),
  portes: (el) => barras(el, R.porPorte.map((p) => ({ rotulo: p.curto, valor: p.gTot, cor: p.id === 2 ? "#7533ff" : "#a9a9a9", destaque: p.id === 2, texto: curto(p.gTot) })), { rotuloLargura: 96 }),
  roteiros: (el) => ranking(el, rotas.map((r) => {
    const g = [r.g1, r.f2, r.f3], f = 1 + g.indexOf(Math.max(...g));
    return { titulo: `${r.nome} (${r.uf})`, sub: `${r.cidades} cidades · ${["", "reconquistar", "mobilizar", "terceiros"][f]} pesa mais`, valor: r.gTot, cor: ["", "#ff1a1a", "#7533ff", "#ff9900"][f], href: `${RAIZ}na-pratica/#roteiro=${r.codigo}` };
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
    f === "roteiros" ? `<a class="pill pill--lilas" href="${RAIZ}na-pratica/#roteiros">Ver os ${R.roteirosTotal} roteiros</a>` :
    f === "cidade" ? `<button class="pill pill--lilas" type="button" data-acha>Achar minha cidade</button><a class="pill pill--laranja" href="${RAIZ}reels/">Kit de reels</a>` :
    `<a class="pill pill--lilas" href="${RAIZ}na-pratica/#${f}">Ver cidades</a>`;
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
    const cor = em.classList.contains("f1t") ? "#ffe6e6" : em.classList.contains("f2t") ? "#dccdfb" : em.classList.contains("f3t") ? "#ffe5bf" : "#dccdfb";
    setTimeout(() => annotate(em, { type: "highlight", color: cor, animationDuration: 700, multiline: true, iterations: 1 }).show(), 250 + k * 200);
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
