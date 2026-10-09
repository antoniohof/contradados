// Aplica a conta das frentes (site/assets/js/frentes.js, a mesma do navegador)
// e grava os resumos usados pelas páginas.
//   node scripts/site/resumo.mjs
// Entrada: site/data/municipios.csv (gerado por scripts/site/build_dados.py)
// Saídas:  site/data/resumo.json  (totais, portes, regiões, listas, roteiros)
//          site/data/pontos.json  (mapa de pontos da página inicial)
//          site/data/densidade.json (1 ponto = 1.000 votos, por frente)
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  lerLinha, aplicar, transferencia, completarQuaest, saldoTerceiros, PESQUISAS, PESQUISA_PADRAO, PORTES, REGIAO,
} from "../../site/assets/js/frentes.js";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "../..");
const DATA = join(REPO, "site/data");

// CSV simples (aspas duplas, vírgula)
function lerCSV(txt) {
  const linhas = [];
  let campo = "", linha = [], aspas = false;
  for (let i = 0; i < txt.length; i++) {
    const ch = txt[i];
    if (aspas) {
      if (ch === '"') { if (txt[i + 1] === '"') { campo += '"'; i++; } else aspas = false; }
      else campo += ch;
    } else if (ch === '"') aspas = true;
    else if (ch === ",") { linha.push(campo); campo = ""; }
    else if (ch === "\n") { linha.push(campo); linhas.push(linha); linha = []; campo = ""; }
    else if (ch !== "\r") campo += ch;
  }
  if (campo || linha.length) { linha.push(campo); linhas.push(linha); }
  const [cab, ...resto] = linhas;
  return resto.filter((l) => l.length === cab.length).map((l) => Object.fromEntries(cab.map((c, i) => [c, l[i]])));
}

const rows = lerCSV(readFileSync(join(DATA, "municipios.csv"), "utf8")).map(lerLinha);
completarQuaest(rows);
const regioes = JSON.parse(readFileSync(join(DATA, "regioes.json"), "utf8"));

const soma = (arr, f) => arr.reduce((s, d) => s + (f(d) || 0), 0);
const r0 = (v) => Math.round(v);
const D = aplicar(rows, transferencia(PESQUISA_PADRAO));

// ---------- totais nacionais
const lula = soma(rows, (m) => m.votos_lula_26), flavio = soma(rows, (m) => m.votos_flavio_26);
const terc = soma(rows, (m) => m.votos_terceiros_26), aptos = soma(rows, (m) => m.aptos_26), aus = soma(rows, (m) => m.ausentes_26);
const porPesquisa = {};
for (const k of Object.keys(PESQUISAS)) {
  const Dk = aplicar(rows, transferencia(k));
  const s = saldoTerceiros(Dk);
  porPesquisa[k] = { f3: r0(soma(Dk, (d) => d.f3)), paraLula: r0(s.lula), paraFlavio: r0(s.flavio), saldoFlavio: r0(s.saldo) };
}
const st = porPesquisa[PESQUISA_PADRAO];
const areaLula = D.filter((d) => d.areaLula);
const totais = {
  lula, flavio, diferenca: flavio - lula, terceiros: terc, aptos, ausentes: aus,
  f1: r0(soma(D, (d) => d.f1)), f2: r0(soma(D, (d) => d.f2)), f3: st.f3,
  g1: r0(soma(D, (d) => d.g1)),
  saldoTerceirosDecididos: st.saldoFlavio,
  diferencaEfetiva: flavio - lula + st.saldoFlavio,
  municipiosAreaLula: areaLula.length,
  ausentesAreaLula: soma(areaLula, (d) => d.ausentes_26),
  municipios: rows.length, municipiosNaConta: D.length,
  vencidosLula: D.filter((d) => d.parcela26 > 0.5).length,
};

// ---------- por porte (população do Censo 2022)
const porPorte = PORTES.map((p) => {
  const g = D.filter((d) => d.porte === p.id);
  return {
    id: p.id, nome: p.nome, curto: p.curto, municipios: g.length, pop: soma(g, (d) => d.pop), aptos: soma(g, (d) => d.aptos_26),
    f1: r0(soma(g, (d) => d.f1)), f2: r0(soma(g, (d) => d.f2)), f3: r0(soma(g, (d) => d.f3)),
    g1: r0(soma(g, (d) => d.g1)), gTot: r0(soma(g, (d) => d.gTot)),
    areaLula: g.filter((d) => d.areaLula).length, ausentesAreaLula: soma(g.filter((d) => d.areaLula), (d) => d.ausentes_26),
  };
});

// ---------- por região e UF
const agrupa = (chave) => {
  const m = new Map();
  for (const d of D) {
    const k = d[chave];
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(d);
  }
  return [...m].map(([k, g]) => ({
    id: k, municipios: g.length, aptos: soma(g, (d) => d.aptos_26),
    f1: r0(soma(g, (d) => d.f1)), f2: r0(soma(g, (d) => d.f2)), f3: r0(soma(g, (d) => d.f3)), gTot: r0(soma(g, (d) => d.gTot)),
    pequenas: g.filter((d) => d.porte === 2).length,
    pequenasGTot: r0(soma(g.filter((d) => d.porte === 2), (d) => d.gTot)),
  })).sort((a, b) => b.gTot - a.gTot);
};

// ---------- listas: cidades de 10 a 50 mil habitantes
const enxuto = (d) => ({
  ibge: d.ibge, nome: d.municipio, uf: d.uf, pop: d.pop, aptos: d.aptos_26, lon: d.lon, lat: d.lat,
  f1: r0(d.f1), f2: r0(d.f2), f3: r0(d.f3), g1: r0(d.g1), gTot: r0(d.gTot), principal: d.principal,
  f1Pct: +d.f1Pct.toFixed(1), f2Pct: d.f2Pct == null ? null : +d.f2Pct.toFixed(1), f3Pct: d.f3Pct == null ? null : +d.f3Pct.toFixed(2),
  parcela26: +(d.parcela26 * 100).toFixed(1), areaLula: d.areaLula,
});
const peq = D.filter((d) => d.porte === 2);
const top = (arr, f, n) => arr.filter((d) => f(d) > 0).sort((a, b) => f(b) - f(a)).slice(0, n).map(enxuto);
const listas = {
  pequenas: { municipios: peq.length, f1: top(peq, (d) => d.f1, 30), f2: top(peq, (d) => d.f2, 30), f3: top(peq, (d) => d.f3, 30), todas: top(peq, (d) => d.gTot, 30) },
  todas: { f1: top(D, (d) => d.f1, 20), f2: top(D, (d) => d.f2, 20), f3: top(D, (d) => d.f3, 20) },
};

// ---------- roteiros: cidades de 10 a 50 mil na mesma região imediata do IBGE
const porImediata = new Map();
for (const d of peq) {
  if (!d.imediata) continue;
  if (!porImediata.has(d.imediata)) porImediata.set(d.imediata, []);
  porImediata.get(d.imediata).push(d);
}
const roteiros = [...porImediata].map(([cod, g]) => {
  g.sort((a, b) => b.gTot - a.gTot);
  const [nome, inter] = regioes.imediatas[cod] || ["", ""];
  return {
    codigo: cod, nome, uf: g[0].uf, intermediaria: regioes.intermediarias[inter] || "",
    cidades: g.length, gTot: r0(soma(g, (d) => d.gTot)), g1: r0(soma(g, (d) => d.g1)), f2: r0(soma(g, (d) => d.f2)), f3: r0(soma(g, (d) => d.f3)),
    lista: g.map((d) => ({ ibge: d.ibge, nome: d.municipio, gTot: r0(d.gTot), principal: d.principal })),
  };
}).filter((r) => r.cidades >= 2).sort((a, b) => b.gTot - a.gTot);

const resumo = {
  pesquisa: PESQUISA_PADRAO,
  totais, porPesquisa, porPorte,
  porRegiao: agrupa("regiao"), porUF: agrupa("uf"),
  listas, roteiros: roteiros.slice(0, 60), roteirosTotal: roteiros.length,
};
writeFileSync(join(DATA, "resumo.json"), JSON.stringify(resumo));

// ---------- pontos para o mapa da página inicial (colunas)
const P = { ibge: [], lon: [], lat: [], porte: [], lula: [], area: [], f1: [], f2: [], f3: [] };
for (const d of D) {
  if (d.lon == null) continue;
  P.ibge.push(+d.ibge); P.lon.push(+d.lon.toFixed(2)); P.lat.push(+d.lat.toFixed(2)); P.porte.push(d.porte || 0);
  P.lula.push(d.parcela26 > 0.5 ? 1 : 0); P.area.push(d.areaLula ? 1 : 0);
  P.f1.push(r0(d.f1)); P.f2.push(r0(d.f2)); P.f3.push(r0(d.f3));
}
writeFileSync(join(DATA, "pontos.json"), JSON.stringify(P));

// ---------- mapa de densidade: 1 ponto = 1.000 votos, sorteado dentro do território do município
// Cada frente vira pontos (reconquistar = eleitores, mobilizar = saldo, terceiros = votos em disputa).
// Arredondamento sorteado: um município com 1.400 votos tem 1 ponto e 40% de chance de um 2º.
// Sorteio com semente fixa: o arquivo sai igual a cada build.
const UNIDADE = 1000;
const topo = JSON.parse(readFileSync(join(DATA, "municipios.topo.json"), "utf8"));
const [sx, sy] = topo.transform.scale, [tx0, ty0] = topo.transform.translate;
const arcos = topo.arcs.map((arc) => { let x = 0, y = 0; return arc.map(([dx, dy]) => { x += dx; y += dy; return [x * sx + tx0, y * sy + ty0]; }); });
const anel = (idx) => { const pts = []; for (const i of idx) { const a = i >= 0 ? arcos[i] : arcos[~i].slice().reverse(); pts.push(...(pts.length ? a.slice(1) : a)); } return pts; };
const geom = new Map();
for (const g of topo.objects.municipios.geometries) {
  const polis = g.type === "Polygon" ? [g.arcs] : g.arcs;
  const aneis = polis.flatMap((p) => p.map(anel));
  let x0 = 180, x1 = -180, y0 = 90, y1 = -90;
  for (const r of aneis) for (const [x, y] of r) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  geom.set(String(g.properties.id), { aneis, caixa: [x0, y0, x1, y1] });
}
const dentro = (x, y, aneis) => {
  let c = false;
  for (const r of aneis) for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
    const [xi, yi] = r[i], [xj, yj] = r[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
};
const sorteio = (semente) => { let a = semente >>> 0; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const DEN = [];
let im = -1;
for (const d of D) {
  if (d.lon == null) continue;
  im++;
  const g = geom.get(d.ibge);
  for (const k of [1, 2, 3]) {
    const v = d["f" + k];
    if (!(v > 0)) continue;
    const r = sorteio(+d.ibge * 10 + k);
    const n = Math.floor(v / UNIDADE) + (r() < (v % UNIDADE) / UNIDADE ? 1 : 0);
    for (let q = 0; q < n; q++) {
      let x = d.lon, y = d.lat;
      if (g) {
        const [x0, y0, x1, y1] = g.caixa;
        for (let t = 0; t < 400; t++) { const px = x0 + r() * (x1 - x0), py = y0 + r() * (y1 - y0); if (dentro(px, py, g.aneis)) { x = px; y = py; break; } }
      }
      DEN.push([+x.toFixed(3), +y.toFixed(3), k, im]);
    }
  }
}
const embaralha = sorteio(2026);
for (let i = DEN.length - 1; i > 0; i--) { const j = Math.floor(embaralha() * (i + 1)); [DEN[i], DEN[j]] = [DEN[j], DEN[i]]; }
writeFileSync(join(DATA, "densidade.json"), JSON.stringify({
  // m aponta para a cidade em "cidades" (mesma ordem de pontos.json)
  unidade: UNIDADE, cidades: P.ibge, lon: DEN.map((p) => p[0]), lat: DEN.map((p) => p[1]), f: DEN.map((p) => p[2]), m: DEN.map((p) => p[3]),
}));
console.log("densidade:", DEN.length, "pontos;", [1, 2, 3].map((k) => DEN.filter((p) => p[2] === k).length).join(" / "));

console.log(JSON.stringify({ totais, porPesquisa, porPorte }, null, 1));
console.log("roteiros:", roteiros.length, "| top:", roteiros.slice(0, 5).map((r) => `${r.nome}/${r.uf} ${r.cidades} ${r.gTot}`).join("; "));
console.log("top pequenas f2:", listas.pequenas.f2.slice(0, 8).map((d) => `${d.nome}/${d.uf} ${d.f2}`).join("; "));
console.log("top pequenas f1:", listas.pequenas.f1.slice(0, 8).map((d) => `${d.nome}/${d.uf} ${d.f1}`).join("; "));
console.log("top pequenas f3:", listas.pequenas.f3.slice(0, 8).map((d) => `${d.nome}/${d.uf} ${d.f3}`).join("; "));
console.log("regiões:", resumo.porRegiao.map((r) => `${r.id} f1 ${r.f1} f2 ${r.f2} f3 ${r.f3}`).join(" | "));
