/* Eleitor pendular 2026: mapas municipais dos três cenários + 2º turno + camadas livres.
   Dados: data/municipios.json (chaves curtas, ver scripts/tse/05_web_data.py), data/meta.json,
   data/municipios.topo.json (malha IBGE). */
(async function () {
  const [topo, D, meta] = await Promise.all([
    d3.json("data/municipios.topo.json"), d3.json("data/municipios.json"), d3.json("data/meta.json"),
  ]);

  // ---------- formatação ----------
  const nf = new Intl.NumberFormat("pt-BR");
  const n0 = (v) => (v == null ? "–" : nf.format(Math.round(v)));
  const p1 = (v) => (v == null ? "–" : v.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + "%");
  const f1 = (v) => (v == null ? "–" : v.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }));
  const pp = (v) => (v == null ? "–" : (v > 0 ? "+" : v < 0 ? "−" : "") + f1(Math.abs(v)) + " p.p.");
  const fr = (v) => (v == null ? "–" : p1(v * 100)); // fração 0–1 → %
  const mi = (v) => (v / 1e6).toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + " mi";
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const titulo = (s) => String(s || "").replace(/\b(De|Da|Do|Das|Dos|E)\b/g, (w) => w.toLowerCase());
  const nome = (d) => `${titulo(d.n)}/${d.uf}`;
  const LIM = meta.limiar_abstencao;

  // ---------- tema e cores ----------
  const root = document.documentElement;
  const isDark = () => root.dataset.theme === "dark" || (root.dataset.theme !== "light" && matchMedia("(prefers-color-scheme: dark)").matches);
  const T = () => {
    const dk = isDark();
    return {
      dk,
      off: dk ? "#222220" : "#ecebe6", nodata: dk ? "#1f1f1d" : "#f4f3f0",
      mid: dk ? "#4a4945" : "#d6d5ce",
      blue: dk ? ["#104281", "#2a78d6", "#86b6ef"] : ["#cde2fb", "#2a78d6", "#0d366b"],
      seq: dk ? ["#173a66", "#1c5cab", "#3987e5", "#86b6ef", "#cde2fb"] : ["#cde2fb", "#86b6ef", "#3987e5", "#1c5cab", "#0d366b"],
      // divergente político: azul = PL/Flávio, vermelho = Lula/PT, cinza no meio
      pl: dk ? ["#5598e7", "#2a6cc0", "#1f3d63"] : ["#0d366b", "#2a78d6", "#86b6ef"],
      pt: dk ? ["#5c2a29", "#a83f3f", "#ec7d7d"] : ["#f2b8b7", "#e34948", "#8f1f1f"],
      // divergente neutro (não partidário): aqua = caiu, laranja = subiu
      down: dk ? ["#2fc48d", "#178a60", "#14432f"] : ["#0b6b4a", "#1baf7a", "#a7e3cc"],
      up: dk ? ["#5a2a12", "#b4501f", "#f08a55"] : ["#f8c9b3", "#eb6834", "#8a3412"],
      terc: dk ? { cury: "#199e70", caiado: "#c98500", renan: "#9085e9" } : { cury: "#1baf7a", caiado: "#eda100", renan: "#4a3aa7" },
      bloco: dk ? { esquerda: "#e66767", centro: "#008300", direita: "#3987e5" } : { esquerda: "#e34948", centro: "#008300", direita: "#2a78d6" },
    };
  };
  let C = T();

  function seqScale(dom, log) {
    const s = (log ? d3.scaleSymlog().constant(0.01) : d3.scaleLinear()).domain(d3.ticks(dom[0], dom[1], 4).length ? [dom[0], dom[1]] : dom).clamp(true);
    const t = d3.scaleLinear().domain([0, 1]).range([0, 1]);
    const interp = d3.piecewise(d3.interpolateLab, C.seq);
    const f = (v) => interp(t((s(v) - s(dom[0])) / (s(dom[1]) - s(dom[0]))));
    f.domain = dom; f.interp = interp; f.kind = "seq"; f.log = log;
    return f;
  }
  function divScale(lo, hi, neg, pos) { // neg: lado negativo (lo), pos: lado positivo (hi)
    const negInterp = d3.piecewise(d3.interpolateLab, [neg[0], neg[1], neg[2], C.mid]);
    const posInterp = d3.piecewise(d3.interpolateLab, [C.mid, pos[0], pos[1], pos[2]]);
    const f = (v) => v == null ? C.nodata : v < 0 ? negInterp(1 - Math.min(1, v / lo)) : posInterp(Math.min(1, v / hi));
    f.domain = [lo, 0, hi]; f.kind = "div"; f.negInterp = negInterp; f.posInterp = posInterp;
    return f;
  }
  // nota: em modo claro C.pl vai do escuro (extremo PL) ao claro; o lado negativo usa [extremo, forte, claro]
  const polit = (lo, hi) => divScale(lo, hi, C.pl, C.pt);
  const neutro = (lo, hi) => divScale(lo, hi, isDark() ? C.down : C.down, C.up);
  function catScale(map, labels) { const f = (v) => map[v] ?? C.nodata; f.kind = "cat"; f.map = map; f.labels = labels; return f; }

  // ---------- camadas (variável → cor) ----------
  const LAYERS = {
    sw: { label: "Swing 2022→2026 (p.p.)", v: (d) => d.sw, scale: () => polit(-30, 30), fmt: pp, ends: ["→ PL", "→ Lula"] },
    m26: { label: "Margem 1T 2026: Lula − Flávio (p.p.)", v: (d) => d.m26, scale: () => polit(-60, 60), fmt: pp, ends: ["Flávio à frente", "Lula à frente"] },
    m22: { label: "Margem 1T 2022: Lula − Bolsonaro (p.p.)", v: (d) => d.m22, scale: () => polit(-60, 60), fmt: pp, ends: ["Bolsonaro à frente", "Lula à frente"] },
    fj: { label: "Flávio 2026 − Bolsonaro 2022, 1º turno (p.p.)", v: (d) => (d.f26 == null || d.b22 == null ? null : d.f26 - d.b22), scale: () => divScale(-15, 15, [C.pt[2], C.pt[1], C.pt[0]], [C.pl[2], C.pl[1], C.pl[0]]), fmt: pp, ends: ["Flávio abaixo de Jair", "Flávio acima de Jair"] },
    l26: { label: "Lula 1T 2026 (% válidos)", v: (d) => d.l26, scale: () => seqScale([20, 80]), fmt: p1 },
    f26: { label: "Flávio 1T 2026 (% válidos)", v: (d) => d.f26, scale: () => seqScale([20, 80]), fmt: p1 },
    t26: { label: "Terceiros 1T 2026 (% válidos)", v: (d) => d.t26, scale: () => seqScale([2, 20]), fmt: p1 },
    tp: { label: "Terceiro colocado mais votado", v: (d) => (d.tp === "zema" ? null : d.tp), scale: () => catScale(C.terc, { cury: "Augusto Cury", caiado: "Ronaldo Caiado", renan: "Renan Santos" }), fmt: (v) => v || "–" },
    a26: { label: "Abstenção 1T 2026 (% aptos)", v: (d) => d.a26, scale: () => seqScale([10, 32]), fmt: p1 },
    da: { label: "Δ abstenção 1T 2022→2026 (p.p.)", v: (d) => d.da, scale: () => neutro(-6, 6), fmt: pp, ends: ["caiu", "subiu"] },
    bn: { label: "Brancos + nulos 1T 2026 (% comparecimento)", v: (d) => d.bn, scale: () => seqScale([2, 10]), fmt: p1 },
    ps: { label: "Índice pêndulo (0–5)", v: (d) => d.ps ?? 0, scale: () => seqScale([0, 5]), fmt: (v) => (v ?? 0).toLocaleString("pt-BR"), noplus: true },
    plp: { label: "Força do PL no poder local (2024)", v: (d) => d.plp, fmt: (v) => v || "–",
      scale: () => catScale({ "sem PL eleito": C.mid, "vereadores PL": C.seq[1], "PL na coligação do prefeito": C.seq[2], "prefeito PL": C.seq[4] },
        { "sem PL eleito": "Sem PL eleito", "vereadores PL": "Só vereadores do PL", "PL na coligação do prefeito": "PL na coligação do prefeito", "prefeito PL": "Prefeito do PL" }) },
    pb: { label: "Campo do prefeito eleito em 2024", v: (d) => d.pb, fmt: (v) => v || "–",
      scale: () => catScale(C.bloco, { esquerda: "Esquerda (PT, PSB, PDT, PSOL, PCdoB, PV, Rede…)", centro: "Centro (PSD, MDB, PSDB, Podemos, Avante…)", direita: "Direita (PL, PP, União, Republicanos, Novo…)" }) },
    vplp: { label: "Vereadores do PL eleitos em 2024 (% da câmara)", v: (d) => (d.vtot ? (d.vplp || 0) * 100 : null), scale: () => seqScale([0, 40]), fmt: p1 },
    dfpl: { label: "PL para deputado federal 2026 (% votos nominais)", v: (d) => (d.dfpl ?? null) * 100, scale: () => seqScale([0, 40]), fmt: p1 },
    dfpt: { label: "PT para deputado federal 2026 (% votos nominais)", v: (d) => (d.dfpt ?? null) * 100, scale: () => seqScale([0, 40]), fmt: p1 },
    gplp: { label: "Candidato do PL a governador 2026 (% válidos)", v: (d) => (d.gplp == null ? null : d.gplp * 100), scale: () => seqScale([0, 70]), fmt: p1 },
    i70: { label: "Eleitores com 70 anos ou mais (voto facultativo)", v: (d) => d.i70 * 100, scale: () => seqScale([4, 18]), fmt: p1 },
    i16: { label: "Eleitores de 16 e 17 anos (voto facultativo)", v: (d) => d.i16 * 100, scale: () => seqScale([0.5, 3]), fmt: p1 },
    esup: { label: "Eleitores com ensino superior completo", v: (d) => d.esup * 100, scale: () => seqScale([2, 30]), fmt: p1 },
    rsg: { label: "Reserva (ausentes + terceiros + brancos/nulos) ÷ diferença nacional", v: (d) => (d.rsg == null ? null : d.rsg * 100), scale: () => seqScale([0.01, 3], true), fmt: (v) => (v == null ? "–" : v.toLocaleString("pt-BR", { maximumFractionDigits: 2 }) + "% da diferença") },
    rsp: { label: "Reserva (ausentes + terceiros + brancos/nulos) em % dos aptos", v: (d) => (d.rsv == null || !d.apt ? null : (d.rsv / d.apt) * 100), scale: () => seqScale([20, 45]), fmt: p1 },
    asm: { label: "Ausentes ÷ diferença local Lula−Flávio", v: (d) => d.asm, scale: () => seqScale([0.1, 10], true), fmt: (v) => (v == null ? "–" : f1(v) + "×") },
    dl2p22: { label: "Lula, voto bipartidário: 1T → 2T de 2022 (p.p.)", v: (d) => d.dl2p22, scale: () => polit(-8, 8), fmt: pp, ends: ["→ Bolsonaro", "→ Lula"] },
    dab22: { label: "Δ abstenção 1T → 2T de 2022 (p.p.)", v: (d) => d.dab22, scale: () => neutro(-5, 5), fmt: pp, ends: ["caiu", "subiu"] },
    dl2p26: { label: "Lula, voto bipartidário: 1T → 2T de 2026 (p.p.)", v: (d) => d.dl2p26, scale: () => polit(-8, 8), fmt: pp, ends: ["→ Flávio", "→ Lula"] },
    da26: { label: "Δ abstenção 1T → 2T de 2026 (p.p.)", v: (d) => d.da26, scale: () => neutro(-5, 5), fmt: pp, ends: ["caiu", "subiu"] },
  };
  const tem2t = Object.values(D).some((d) => d.dl2p26 != null);

  // ---------- vistas ----------
  const L = meta.listas;
  const VIEWS = {
    S1: {
      tab: "1 · Viraram para o PL",
      title: "1. Municípios que viraram de Lula para Flávio",
      lede: `Lula venceu o 1º turno de 2022 e Flávio venceu o de 2026. Foram ${n0(meta.nacional.viraram_lula_flavio)} municípios nesse sentido e nenhum no sentido contrário (mais ${meta.nacional.empates.length} empates exatos). A lista traz os 100 com maior swing entre os que têm 10 mil eleitores ou mais.`,
      uni: (d) => d.vir && d.apt >= 10000, uniLabel: "viraram, com 10 mil+ eleitores",
      layer: "sw", list: L.S1, mk: (d) => d.apt, mkLabel: "eleitores aptos",
      cols: [["Swing", (d) => pp(d.sw)], ["Flávio 26", (d) => p1(d.f26)], ["Lula 22", (d) => p1(d.l22)]],
      layers: ["sw", "fj", "m26", "m22", "plp", "pb", "gplp", "dfpl"],
      note: "Cor: swing de margem entre os 1os turnos (negativo = movimento para o PL). Pontos: os 100 da lista, com tamanho pelo número de eleitores. Fora do universo, em cinza.",
    },
    S2: {
      tab: "2 · Reduto do 13 + abstenção",
      title: "2. Redutos de Lula onde muita gente faltou",
      lede: `Lula com mais de 50% dos válidos e abstenção acima da média nacional (${f1(LIM)}%). São ${n0(meta.nacional.universo.S2)} municípios. A lista ordena pelos ausentes em números absolutos: é onde uma mobilização teria mais votos para buscar.`,
      uni: (d) => d.l26 > 50 && d.a26 > LIM, uniLabel: `Lula > 50% e abstenção > ${f1(LIM)}%`,
      layer: "a26", list: L.S2, mk: (d) => d.aus, mkLabel: "ausentes",
      cols: [["Ausentes", (d) => n0(d.aus)], ["Abst.", (d) => p1(d.a26)], ["Lula 26", (d) => p1(d.l26)]],
      layers: ["a26", "da", "i70", "asm", "l26", "pb", "esup"],
      note: "Cor: abstenção no 1º turno de 2026. Pontos: os 100 da lista, com tamanho pelo número de ausentes. A abstenção alta não se concentra nas regiões mais pobres: o Nordeste teve a menor taxa do país.",
    },
    S3: {
      tab: "3 · Base Flávio pendular",
      title: "3. Base de Flávio, com baixa abstenção, mas com histórico de alternância",
      lede: `Flávio com 50% ou mais, abstenção abaixo da média e índice pêndulo ≥ 3: o PT venceu ali em 2018 ou 2022, houve virada forte, muito voto em terceiros ou margem estreita. São ${n0(meta.nacional.universo.S3)} municípios, quase todos no Sul e no Tocantins.`,
      uni: (d) => d.f26 >= 50 && d.a26 < LIM && d.ps >= 3, uniLabel: "Flávio ≥ 50%, abstenção baixa, índice ≥ 3",
      layer: "ps", list: L.S3, mk: (d) => d.apt, mkLabel: "eleitores aptos",
      cols: [["Índice", (d) => d.ps], ["Histórico", (d) => d.h], ["Flávio 26", (d) => p1(d.f26)]],
      layers: ["ps", "sw", "t26", "tp", "plp", "gplp"],
      note: "Cor: índice pêndulo (+1 se Haddad venceu o 2T de 2018, +1 se Lula venceu o 2T de 2022, +1 se swing ≤ −15, +1 se terceiros ≥ 8%, +1 se margem 2026 ≤ 20 p.p.). Histórico: vencedor do 2T 2018 (H/B), do 2T 2022 (L/B) e do 1T 2026 (L/F).",
    },
    T2: {
      tab: "2º turno: a reserva",
      title: "2º turno: onde está a reserva de votos",
      lede: `No 1º turno, Flávio terminou ${n0(Math.abs(meta.segundo_turno?.gap_nacional_1t ?? (meta.nacional.lula - meta.nacional.flavio)))} votos à frente (sem o exterior). Fora desse placar ficaram ${mi(meta.nacional.ausentes)} de ausentes, ${mi(meta.nacional.terceiros)} de votos em terceiros e ${mi(meta.nacional.brancos + meta.nacional.nulos)} de brancos e nulos.` + (tem2t ? "" : " Quando o TSE publicar o 2º turno, este mapa ganha as variações entre os turnos."),
      uni: () => true, uniLabel: "todos",
      layer: tem2t ? "dl2p26" : "rsp", list: null, mk: (d) => d.rsv, mkLabel: "reserva de votos",
      cols: [["Reserva", (d) => n0(d.rsv)], ["Dif. local", (d) => n0(Math.abs(d.mg))], ["Lula 2p", (d) => p1(d.l2p)]],
      layers: (tem2t ? ["dl2p26", "da26"] : []).concat(["rsp", "asm", "dl2p22", "dab22", "rsg", "tp", "t26"]),
      note: "Cor: reserva em % dos eleitores aptos do município. Pontos: os 100 municípios com mais votos na reserva (tamanho = reserva em votos). Reserva = ausentes + votos em terceiros + brancos e nulos no 1º turno. Em 2022, a parcela bipartidária de Lula caiu de 52,9% no 1º turno para 50,9% no 2º: o 2º turno não repete o 1º.",
    },
    EX: {
      tab: "Explorar camadas",
      title: "Explorar: todas as camadas, todos os municípios",
      lede: "Escolha uma variável para colorir os 5.570 municípios. As camadas incluem votos, abstenção, terceiros, poder local de 2024 (prefeito, PL), candidatos de 2026 e o perfil etário e escolar do eleitorado.",
      uni: () => true, uniLabel: "todos",
      layer: "m26", list: null, mk: null,
      cols: [["Valor", null], ["Lula 26", (d) => p1(d.l26)], ["Flávio 26", (d) => p1(d.f26)]],
      layers: Object.keys(LAYERS).filter((k) => tem2t || !["dl2p26", "da26"].includes(k)),
      note: "A lista mostra os 100 municípios com maior valor na camada escolhida (com 5 mil eleitores ou mais, para evitar distorções de lugares muito pequenos).",
    },
  };
  // listas das vistas sem lista fixa
  VIEWS.T2.list = Object.keys(D).filter((k) => D[k].rsv != null).sort((a, b) => D[b].rsv - D[a].rsv).slice(0, 100);

  const state = { view: "S1", layer: "sw", onlyUni: true, sel: null, q: "" };

  // ---------- estatísticas nacionais ----------
  const N = meta.nacional;
  const fT = N.flavio + N.exterior.flavio, lT = N.lula + N.exterior.lula;
  const stats = [
    ["Flávio × Lula, 1º turno", `${p1(47.03)} × ${p1(45.16)}`, `diferença de ${n0(fT - lT)} votos (com exterior)`],
    ["Ausentes", mi(N.ausentes), `${p1(N.ausentes / N.aptos * 100)} dos aptos, sem exterior`],
    ["Votos em terceiros", mi(N.terceiros), `${p1(N.terceiros / N.validos * 100)} dos válidos`],
    ["Brancos e nulos", mi(N.brancos + N.nulos), "1º turno de 2026"],
    ["Municípios que viraram", n0(N.viraram_lula_flavio), "de Lula para Flávio; 0 no sentido oposto"],
    ["Eleitores com 70+", mi(N.idosos70), "voto facultativo"],
  ];
  d3.select("#stats").selectAll("div").data(stats).join("div").attr("class", "stat")
    .html((s) => `<div class="k">${s[0]}</div><div class="v">${s[1]}</div><div class="s">${s[2]}</div>`);

  // ---------- abas ----------
  d3.select("#tabs").selectAll("button").data(Object.entries(VIEWS)).join("button")
    .attr("role", "tab").text(([, v]) => v.tab)
    .on("click", (e, [k]) => setView(k));

  // ---------- mapa ----------
  const obj = topo.objects.municipios;
  const feats = topojson.feature(topo, obj).features;
  const W = 1000, H = 920;
  const proj = d3.geoMercator().fitExtent([[10, 10], [W - 10, H - 10]], { type: "FeatureCollection", features: feats });
  const path = d3.geoPath(proj);
  const svg = d3.select("#map").attr("viewBox", `0 0 ${W} ${H}`);
  const g = svg.append("g");
  const gm = g.append("g");
  const mun = gm.selectAll("path").data(feats).join("path").attr("class", "mun").attr("d", path)
    .attr("data-id", (f) => f.properties.id);
  g.append("path").attr("class", "uf").attr("d", path(topojson.mesh(topo, obj, (a, b) => a.properties.uf !== b.properties.uf)));
  g.append("path").attr("class", "pais").attr("d", path(topojson.mesh(topo, obj, (a, b) => a === b)));
  const gk = g.append("g");
  const centro = {};
  feats.forEach((f) => { centro[f.properties.id] = path.centroid(f); });
  const bounds = {};
  feats.forEach((f) => { bounds[f.properties.id] = path.bounds(f); });

  let k = 1;
  const zoom = d3.zoom().scaleExtent([1, 60]).on("zoom", (e) => {
    k = e.transform.k; g.attr("transform", e.transform);
    gk.selectAll("circle").attr("r", (d) => d.r / Math.sqrt(k));
  });
  svg.call(zoom);
  d3.select("#zin").on("click", () => svg.transition().call(zoom.scaleBy, 2));
  d3.select("#zout").on("click", () => svg.transition().call(zoom.scaleBy, 0.5));
  d3.select("#zreset").on("click", () => svg.transition().duration(600).call(zoom.transform, d3.zoomIdentity));
  function zoomTo(id) {
    const b = bounds[id]; if (!b) return;
    const [[x0, y0], [x1, y1]] = b;
    const s = Math.min(24, 0.25 / Math.max((x1 - x0) / W, (y1 - y0) / H));
    const t = d3.zoomIdentity.translate(W / 2, H / 2).scale(Math.max(4, s)).translate(-(x0 + x1) / 2, -(y0 + y1) / 2);
    svg.transition().duration(700).call(zoom.transform, t);
  }

  // ---------- tooltip ----------
  const tip = d3.select("#tip");
  function showTip(e, id) {
    const d = D[id]; if (!d) return;
    const Ly = LAYERS[state.layer];
    tip.style("display", "block").html(
      `<b>${esc(nome(d))}</b><div class="row"><span>${esc(Ly.label.split(" (")[0])}</span><span>${Ly.fmt(Ly.v(d))}</span></div>` +
      `<div class="row"><span>Flávio × Lula 1T 26</span><span>${p1(d.f26)} × ${p1(d.l26)}</span></div>` +
      `<div class="row"><span>Abstenção 26</span><span>${p1(d.a26)}</span></div>` +
      (d.pf ? `<div class="row"><span>Prefeito</span><span>${esc(d.pp)}</span></div>` : "") +
      (d.c ? `<div class="row"><span>Cenários</span><span>${esc(d.c)}</span></div>` : ""));
    moveTip(e);
  }
  function moveTip(e) {
    const x = e.clientX + 14, y = e.clientY + 14;
    const w = tip.node().offsetWidth, h = tip.node().offsetHeight;
    tip.style("left", Math.min(x, innerWidth - w - 8) + "px").style("top", Math.min(y, innerHeight - h - 8) + "px");
  }
  const hideTip = () => tip.style("display", "none");
  mun.on("mousemove", (e, f) => showTip(e, f.properties.id)).on("mouseleave", hideTip)
    .on("click", (e, f) => select(f.properties.id, false));

  // ---------- render ----------
  let scale;
  function render() {
    C = T();
    const V = VIEWS[state.view], Ly = LAYERS[state.layer];
    scale = Ly.scale();
    mun.attr("fill", (f) => {
      const d = D[f.properties.id];
      if (!d) return C.nodata;
      if (state.onlyUni && !V.uni(d)) return C.off;
      const v = Ly.v(d);
      return v == null || Number.isNaN(v) ? C.nodata : scale(v);
    }).classed("sel", (f) => f.properties.id === state.sel);

    // pontos da lista
    const ids = currentList();
    const mkv = V.mk || ((d) => d.apt);
    const r = d3.scaleSqrt().domain([0, d3.max(ids, (id) => mkv(D[id])) || 1]).range([2, 10]);
    const pts = ids.filter((id) => centro[id]).map((id) => ({ id, r: r(mkv(D[id]) || 0), c: centro[id] }));
    gk.selectAll("circle").data(V.mk || state.view === "EX" ? pts : [], (d) => d.id).join("circle")
      .attr("class", (d) => "mk" + (d.id === state.sel ? " sel" : ""))
      .attr("cx", (d) => d.c[0]).attr("cy", (d) => d.c[1]).attr("r", (d) => d.r / Math.sqrt(k))
      .on("mousemove", (e, d) => showTip(e, d.id)).on("mouseleave", hideTip)
      .on("click", (e, d) => select(d.id, false));
    renderLegend(V, Ly);
    renderList(V, Ly, ids);
  }

  function currentList() {
    const V = VIEWS[state.view];
    if (state.view !== "EX") return V.list;
    const Ly = LAYERS[state.layer];
    if (scale.kind === "cat") return Object.keys(D).filter((id) => D[id].apt >= 5000 && Ly.v(D[id]) != null)
      .sort((a, b) => D[b].apt - D[a].apt).slice(0, 100);
    return Object.keys(D).filter((id) => D[id].apt >= 5000 && Ly.v(D[id]) != null && !Number.isNaN(Ly.v(D[id])))
      .sort((a, b) => Ly.v(D[b]) - Ly.v(D[a])).slice(0, 100);
  }

  function renderLegend(V, Ly) {
    const el = d3.select("#legend").html("");
    if (scale.kind === "cat") {
      const counts = d3.rollup(Object.values(D).filter((d) => !state.onlyUni || V.uni(d)), (v) => v.length, (d) => Ly.v(d));
      Object.entries(scale.map).forEach(([key, col]) => {
        el.append("span").attr("class", "sw").html(`<i style="background:${col}"></i>${esc(scale.labels[key] || key)} <span style="color:var(--muted)">(${n0(counts.get(key) || 0)})</span>`);
      });
    } else {
      const box = el.append("div").attr("class", "ramp");
      box.append("div").text(Ly.label).style("color", "var(--ink)");
      let stops, ticks;
      if (scale.kind === "div") {
        const [lo, , hi] = scale.domain;
        stops = d3.range(0, 1.0001, 0.05).map((t) => (t < 0.5 ? scale(lo * (1 - t * 2)) : scale(hi * (t * 2 - 1))));
        ticks = [Ly.fmt(lo).replace(" p.p.", ""), "0", Ly.fmt(hi).replace(" p.p.", "")];
        if (Ly.ends) ticks = [`${ticks[0]} ${Ly.ends[0]}`, "0", `${Ly.ends[1]} ${ticks[2]}`];
      } else {
        const [a, b] = scale.domain;
        const vals = d3.range(0, 1.0001, 0.05).map((t) => (scale.log ? a * Math.pow(b / a, t) : a + (b - a) * t));
        stops = vals.map(scale);
        ticks = [Ly.fmt(a), Ly.fmt(scale.log ? Math.sqrt(a * b) : (a + b) / 2), Ly.fmt(b) + (Ly.noplus ? "" : "+")];
      }
      box.append("div").attr("class", "bar").style("background", `linear-gradient(90deg, ${stops.join(",")})`);
      box.append("div").attr("class", "ticks").selectAll("span").data(ticks).join("span").text((t) => t);
    }
    if (state.onlyUni && state.view !== "EX" && state.view !== "T2") el.append("span").attr("class", "sw").html(`<i style="background:${C.off}"></i>fora do universo (${esc(V.uniLabel)} não se aplica)`);
    if (V.mk || state.view === "EX") el.append("span").attr("class", "sw mkkey").html(`<i></i>os 100 da lista${V.mk ? ` (tamanho = ${esc(V.mkLabel)})` : ""}`);
  }

  function renderList(V, Ly, ids) {
    const cols = V.cols.map((c, i) => (i === 0 && c[1] == null ? ["Valor", (d) => Ly.fmt(Ly.v(d)).replace(" p.p.", "")] : c));
    d3.select("#ltitle").text(state.view === "EX" ? `Top 100: ${Ly.label}` : state.view === "T2" ? "Os 100 com maior reserva de votos" : `A lista: 100 municípios`);
    d3.select("#lsub").text(state.view === "EX" ? "Municípios com 5 mil eleitores ou mais." : state.view === "T2" ? "Ausentes + terceiros + brancos/nulos no 1º turno, em votos." : `Universo: ${n0(Object.values(D).filter(V.uni).length)} municípios (${V.uniLabel}).`);
    const t = d3.select("#list").html("");
    t.append("thead").append("tr").selectAll("th").data(["#", "Município"].concat(cols.map((c) => c[0]))).join("th").text((x) => x);
    const rows = t.append("tbody").selectAll("tr").data(ids).join("tr")
      .classed("sel", (id) => id === state.sel).attr("data-id", (id) => id)
      .on("click", (e, id) => select(id, true));
    rows.append("td").attr("class", "rk").text((id, i) => i + 1);
    rows.append("td").text((id) => nome(D[id]));
    cols.forEach((c) => rows.append("td").text((id) => c[1](D[id])));
    d3.select("#lcount").text(`${ids.length} municípios`);
  }

  function csv() {
    const V = VIEWS[state.view], ids = currentList();
    const head = ["rank", "ibge", "municipio", "uf", "eleitores_aptos", "lula22", "bolsonaro22", "lula26", "flavio26", "terceiros26", "swing", "abstencao22", "abstencao26", "ausentes26", "historico", "indice_pendulo", "prefeito", "partido_prefeito", "vereadores_PL", "vereadores_total", "PL_poder_local", "gov_mais_votado", "cenarios"];
    const rows = ids.map((id, i) => { const d = D[id]; return [i + 1, id, titulo(d.n), d.uf, d.apt, d.l22, d.b22, d.l26, d.f26, d.t26, d.sw, d.a22, d.a26, d.aus, d.h, d.ps ?? 0, d.pf, d.pp, d.vpl ?? 0, d.vtot, d.plp, d.gov, d.c]; });
    const text = [head].concat(rows).map((r) => r.map((x) => (x == null ? "" : /[",\n;]/.test(String(x)) ? `"${String(x).replace(/"/g, '""')}"` : x)).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["﻿" + text], { type: "text/csv" }));
    a.download = `eleitor_pendular_${state.view}${state.view === "EX" ? "_" + state.layer : ""}.csv`;
    a.click();
  }
  d3.select("#csvbtn").on("click", csv);

  // ---------- detalhe ----------
  function stack(parts) {
    return `<div class="stack">${parts.filter((p) => p[1] > 0).map((p) => `<div title="${esc(p[0])}: ${p1(p[1])}" style="flex:${p[1]};background:${p[2]}"></div>`).join("")}</div>`;
  }
  function select(id, zoomIt) {
    state.sel = id;
    const d = D[id]; if (!d) return;
    mun.classed("sel", (f) => f.properties.id === id);
    gk.selectAll("circle").classed("sel", (x) => x.id === id);
    d3.selectAll("#list tr").classed("sel", function () { return this.dataset.id === id; });
    if (zoomIt) zoomTo(id);
    const css = getComputedStyle(root), LU = css.getPropertyValue("--lula").trim(), FL = css.getPropertyValue("--flavio").trim(), TE = css.getPropertyValue("--terc").trim();
    const chips = (d.c ? d.c.split(" ").map((c) => `<span class="chip">Cenário ${c.replace("#", " · nº ")}</span>`) : [])
      .concat(d.cap ? ['<span class="chip">Capital</span>'] : [])
      .concat(d.vir ? ['<span class="chip">Virou Lula → Flávio</span>'] : [])
      .concat(d.emp ? ['<span class="chip">Empate exato em 2026</span>'] : [])
      .concat(d.psup ? ['<span class="chip">Prefeito de eleição suplementar</span>'] : [])
      .concat(d.g2t ? ['<span class="chip">2º turno para governador na UF</span>'] : []);
    const hist = (d.h || "").split("-");
    const histTxt = hist.length === 3 ? `2T 2018: ${hist[0] === "H" ? "Haddad" : "Bolsonaro"} · 2T 2022: ${hist[1] === "L" ? "Lula" : "Bolsonaro"} · 1T 2026: ${hist[2] === "L" ? "Lula" : "Flávio"}` : "–";
    const pautas = d.pau ? d.pau.split(" | ").filter(Boolean) : [];
    const fontes = d.fon ? d.fon.split(" | ").filter((u) => /^https?:/.test(u)) : [];
    const rowsKV = (arr) => `<div class="kv">${arr.filter((r) => r[1] != null && r[1] !== "–" && r[1] !== "").map((r) => `<span>${esc(r[0])}</span><span>${esc(r[1])}</span>`).join("")}</div>`;
    d3.select("#detail").html(`
      <div class="dhead"><h3>${esc(nome(d))}</h3><div class="meta">${esc(d.rg || "")} · ${n0(d.apt)} eleitores aptos · IBGE ${id}</div></div>
      <div class="chips">${chips.join("")}</div>
      <div class="sec"><h4>Presidente, 1º turno</h4>
        <div class="stackrow"><span>2022</span>${stack([["Lula", d.l22, LU], ["Bolsonaro", d.b22, FL], ["Outros", 100 - (d.l22 || 0) - (d.b22 || 0), TE]])}</div>
        <div class="stackrow"><span>2026</span>${stack([["Lula", d.l26, LU], ["Flávio", d.f26, FL], ["Outros", d.t26, TE]])}</div>
        <div class="stacklab"><span><i style="background:${LU}"></i>Lula</span><span><i style="background:${FL}"></i>Bolsonaro / Flávio</span><span><i style="background:${TE}"></i>outros</span></div>
        ${rowsKV([["Lula 2022 → 2026", `${p1(d.l22)} → ${p1(d.l26)}`], ["Bolsonaro 2022 → Flávio 2026", `${p1(d.b22)} → ${p1(d.f26)}`],
          ["Swing de margem", pp(d.sw)], ["Votos: Lula × Flávio", `${n0(d.vl)} × ${n0(d.vf)}`],
          ["Terceiros 2026", `${p1(d.t26)} (Cury ${f1(d.cur)}, Caiado ${f1(d.cai)}, Renan ${f1(d.ren)})`],
          ["Lula no 2T 2022", p1(d.l22t2)], ["Histórico", histTxt], ["Índice pêndulo", `${d.ps ?? 0} de 5`]])}
      </div>
      <div class="sec"><h4>Comparecimento</h4>
        ${rowsKV([["Abstenção 1T 2018 · 2022 · 2026", `${p1(d.a18)} · ${p1(d.a22)} · ${p1(d.a26)}`], ["Abstenção 2T 2022", p1(d.a22t2)],
          ["Ausentes em 2026", n0(d.aus)], ["Ausentes ÷ diferença local", d.asm == null ? "–" : f1(d.asm) + "×"],
          ["Brancos + nulos 2026", p1(d.bn)], ["Reserva (ausentes + terceiros + brancos/nulos)", d.rsv == null ? null : n0(d.rsv)]])}
      </div>
      <div class="sec"><h4>Poder local (eleição de 2024, TSE)</h4>
        ${rowsKV([["Prefeito(a)", d.pf ? `${titulo(d.pf)} (${d.pp})` : "–"], ["Vice", d.vice ? `${titulo(d.vice)} (${d.vp})` : null],
          ["Perfil", d.pid ? `${d.pid} anos, ${d.pg}, ${String(d.pocu || "").toLowerCase()}` : null],
          ["Vereadores do PL", d.vtot ? `${d.vpl ?? 0} de ${d.vtot}` : null], ["Vereadores do PT", d.vtot ? `${d.vpt ?? 0} de ${d.vtot}` : null],
          ["Câmara: esquerda · centro · direita", d.vtot ? `${d.vesq ?? 0} · ${d.vcen ?? 0} · ${d.vdir ?? 0}` : null],
          ["Maiores bancadas", d.mb], ["PL no poder local", d.plp], ["Candidato do PL a prefeito", d.cpl], ["Candidato do PT a prefeito", d.cpt]])}
        ${d.pcol ? `<div class="fontes" style="margin-top:4px">Coligação do prefeito: ${esc(d.pcol)}</div>` : ""}
        ${d.vpln ? `<div class="fontes">Vereadores do PL: ${esc(titulo(d.vpln))}</div>` : ""}
      </div>
      <div class="sec"><h4>Candidatos de 2026 no município</h4>
        ${rowsKV([["Governador mais votado", d.gov ? `${d.gov} ${fr(d.govp)}` : null], ["Candidato do PL a governador", d.gpl ? `${d.gpl} ${fr(d.gplp)}` : null],
          ["Candidato do PT a governador", d.gpt ? `${d.gpt} ${fr(d.gptp)}` : null], ["Senador mais votado", d.sen ? `${d.sen} ${fr(d.senp)}` : null],
          ["Melhor do PL ao Senado", d.spl ? `${d.spl} ${fr(d.splp)}` : null], ["Melhor do PT ao Senado", d.spt ? `${d.spt} ${fr(d.sptp)}` : null],
          ["Votos anulados sub judice (gov. · senado)", d.gsj || d.ssj ? `${n0(d.gsj || 0)} · ${n0(d.ssj || 0)}` : null],
          ["Dep. federal mais votado", d.dfm ? `${d.dfm} ${fr(d.dfmp)}` : null], ["PL · PT para dep. federal", `${fr(d.dfpl)} · ${fr(d.dfpt)}`],
          ["Dep. estadual mais votado", d.dem], ["PL · PT para dep. estadual", `${fr(d.depl)} · ${fr(d.dept)}`]])}
        ${d.gsj || d.ssj ? `<p class="fontes">Os % de governador e senado são sobre os votos válidos oficiais. Votos em candidatos com registro sub judice ficam fora até o julgamento (no RJ, Garotinho teve 274 mil; com eles, Douglas Ruas cai de 50,9% para 49,3%).</p>` : ""}
      </div>
      <div class="sec"><h4>Eleitorado 2026 (TSE)</h4>
        ${rowsKV([["16–17 anos · 18–24 · 25–34", `${fr(d.i16)} · ${fr(d.i18)} · ${fr(d.i25)}`], ["35–44 · 45–59 · 60–69", `${fr(d.i35)} · ${fr(d.i45)} · ${fr(d.i60)}`],
          ["70 anos ou mais", `${fr(d.i70)} (${n0(d.i70n)})`], ["Ensino superior completo", fr(d.esup)], ["Sem fundamental completo", fr(d.esf)], ["Mulheres", fr(d.mul)]])}
      </div>
      ${d.eco || pautas.length || d.eve ? `<div class="sec"><h4>Contexto local${d.conf ? ` · confiança ${esc(d.conf)}` : ""}</h4>
        ${d.eco ? `<p style="margin:0 0 6px;font-size:13px">${esc(d.eco)}</p>` : ""}
        ${pautas.length ? `<ul class="pautas">${pautas.map((p) => `<li>${esc(p)}</li>`).join("")}</ul>` : ""}
        ${d.eve ? `<p style="margin:6px 0;font-size:13px;color:var(--ink2)">${esc(d.eve)}</p>` : ""}
        ${d.obs ? `<p class="fontes">${esc(d.obs)}</p>` : ""}
        ${fontes.length ? `<div class="fontes">Fontes: ${fontes.map((u, i) => `<a href="${esc(u)}" target="_blank" rel="noopener">[${i + 1}] ${esc(u.replace(/^https?:\/\/(www\.)?/, "").split("/")[0])}</a>`).join(" ")}</div>` : ""}
      </div>` : `<div class="sec"><h4>Contexto local</h4><p class="fontes">Sem pesquisa local para este município (feita só para os 279 das três listas).</p></div>`}
    `);
  }

  // ---------- painel extra (2º turno) ----------
  function renderExtra() {
    const ex = d3.select("#extra");
    const ST = meta.segundo_turno;
    if (state.view !== "T2" || !ST) { ex.attr("hidden", true).html(""); return; }
    ex.attr("hidden", null).html(`<h3>Reserva × diferença, por cenário</h3><div class="sub">Votos do 1º turno de 2026. A diferença é Lula − Flávio no grupo (negativa = Flávio à frente).</div><div class="bars" id="bars"></div>`);
    const css = getComputedStyle(root);
    const groups = ["S1", "S2", "S3", "S1∪S2∪S3"].map((k) => ({ k, ...ST.cenarios[k] }));
    const lab = { S1: "1 · Viraram para o PL", S2: "2 · Reduto do 13 + abstenção", S3: "3 · Base Flávio pendular", "S1∪S2∪S3": "As três listas juntas (279)" };
    const bars = d3.select("#bars");
    groups.forEach((gr) => {
      const items = [["Diferença", Math.abs(gr.gap26), gr.gap26 > 0 ? css.getPropertyValue("--lula") : css.getPropertyValue("--flavio"), (gr.gap26 > 0 ? "Lula +" : "Flávio +") + n0(Math.abs(gr.gap26))],
        ["Ausentes", gr.ausentes26, css.getPropertyValue("--ink2"), n0(gr.ausentes26)],
        ["Terceiros", gr.votos_terceiros26, css.getPropertyValue("--muted"), n0(gr.votos_terceiros26)]];
      const mx = d3.max(items, (i) => i[1]);
      const box = bars.append("div").attr("class", "grp");
      box.append("b").text(lab[gr.k]);
      items.forEach((it) => {
        box.append("div").attr("class", "br").html(`<span>${it[0]}</span><div><div class="t" style="width:${(it[1] / mx) * 100}%;background:${it[2]}"></div></div><span class="n">${it[3]}</span>`);
      });
    });
    const U = ST.cenarios["S1∪S2∪S3"];
    bars.append("p").attr("class", "fontes").html(`Brasil: Flávio ${n0(Math.abs(ST.gap_nacional_1t))} votos à frente, contra uma reserva de ${n0(ST.ausentes + ST.terceiros + ST.brancos_nulos)} (${n0(ST.ausentes)} ausentes, ${n0(ST.terceiros)} em terceiros, ${n0(ST.brancos_nulos)} brancos e nulos). Só nos 279 municípios das três listas, a reserva equivale a ${f1(U.reserva_sobre_gap_nacional)}× a diferença nacional.` +
      (ST.uf_com_2t_governador ? ` UFs com 2º turno para governador: ${ST.uf_com_2t_governador.join(", ")}.` : ""));
  }

  // ---------- controles ----------
  function renderControls() {
    const V = VIEWS[state.view];
    const c = d3.select("#controls").html("");
    const lab = c.append("label").text("Cor: ");
    lab.append("select").on("change", (e) => { state.layer = e.target.value; render(); })
      .selectAll("option").data(V.layers).join("option").attr("value", (x) => x).property("selected", (x) => x === state.layer).text((x) => LAYERS[x].label);
    if (state.view !== "EX" && state.view !== "T2") {
      const u = c.append("label");
      u.append("input").attr("type", "checkbox").property("checked", state.onlyUni).on("change", (e) => { state.onlyUni = e.target.checked; render(); });
      u.append("span").text("só o universo do cenário");
    }
    const s = c.append("label").text("Buscar: ");
    const inp = s.append("input").attr("type", "search").attr("list", "munlist").attr("placeholder", "Nome do município/UF");
    inp.on("change", (e) => {
      const q = e.target.value.trim().toLowerCase();
      const id = Object.keys(D).find((id) => nome(D[id]).toLowerCase() === q) || Object.keys(D).find((id) => titulo(D[id].n).toLowerCase().startsWith(q.split("/")[0]));
      if (id) select(id, true);
    });
  }
  const dl = d3.select("body").append("datalist").attr("id", "munlist");
  dl.selectAll("option").data(Object.keys(D)).join("option").attr("value", (id) => nome(D[id]));

  function setView(v) {
    state.view = v;
    const V = VIEWS[v];
    state.layer = V.layer;
    state.onlyUni = v !== "EX" && v !== "T2";
    d3.selectAll("#tabs button").attr("aria-selected", ([key]) => String(key === v));
    d3.select("#vtitle").text(V.title);
    d3.select("#vlede").text(V.lede);
    d3.select("#vnote").text(V.note);
    renderControls();
    render();
    renderExtra();
    try { history.replaceState(null, "", "#" + v); } catch (e) { /* sem histórico */ }
  }

  // ---------- tema ----------
  try { const t = new URLSearchParams(location.search).get("theme") || localStorage.getItem("ep-theme"); if (t) root.dataset.theme = t; } catch (e) { /* sem storage */ }
  d3.select("#themebtn").on("click", () => {
    root.dataset.theme = isDark() ? "light" : "dark";
    try { localStorage.setItem("ep-theme", root.dataset.theme); } catch (e) { /* sem storage */ }
    render(); renderExtra(); if (state.sel) select(state.sel, false);
  });
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => { render(); renderExtra(); });

  const start = (location.hash || "").slice(1);
  setView(VIEWS[start] ? start : "S1");
  select(VIEWS[state.view].list?.[0] || "3550308", false);
})();
