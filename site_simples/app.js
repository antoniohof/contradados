// Votos em jogo 2026 — JS simples, sem bibliotecas.
// Dados: data/municipios.json (gerado por build/build.py) e data/mapa.json (caminhos SVG já projetados).

const $ = (s) => document.querySelector(s);
const fmt = new Intl.NumberFormat("pt-BR");
const num = (v) => (v == null ? "–" : fmt.format(Math.round(v)));
const pct = (v) => (v == null ? "–" : v.toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + "%");
const fr = (v) => (v == null ? "–" : pct(v * 100)); // fração 0–1 → %
const pp = (v) => (v == null ? "–" : (v > 0 ? "+" : v < 0 ? "−" : "") + Math.abs(v).toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + " p.p.");
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const nomeBonito = (s) => String(s).replace(/\b(De|Da|Do|Das|Dos|E)\b/g, (w) => w.toLowerCase());
const nome = (m) => `${nomeBonito(m.n)}/${m.uf}`;
const cor = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();

let M = {};      // municípios por código IBGE
let CARDS = {};  // pontos fracos dos candidatos do campo PL, por UF ("BR" = presidente)
let sel = null;
let porte = [0, 10000];
let mostrar = 15;

// ---------- cores ----------
function hexMix(a, b, t) {
  const pa = a.match(/\w\w/g).map((h) => parseInt(h, 16)), pb = b.match(/\w\w/g).map((h) => parseInt(h, 16));
  return "#" + pa.map((x, i) => Math.round(x + (pb[i] - x) * t).toString(16).padStart(2, "0")).join("");
}
const clamp = (t) => Math.max(0, Math.min(1, t));
// cada camada: valor, faixa e cores (2 cores = sequencial; 3 = divergente com cinza no meio)
const CAMADAS = {
  pct: { v: (m) => (m.jogo / m.apt) * 100, min: 5, max: 25, cores: () => [cor("--neutro"), "#7a3fb0"], rot: ["5%", "25%+ dos eleitores"] },
  saldo: { v: (m) => (m.saldo / m.apt) * 100, min: -4, max: 4, cores: () => [cor("--flavio"), cor("--neutro"), cor("--lula")], rot: ["Flávio", "Lula"] },
  sw: { v: (m) => m.sw, min: -25, max: 25, cores: () => [cor("--flavio"), cor("--neutro"), cor("--lula")], rot: ["→ PL", "→ Lula"] },
  a26: { v: (m) => m.a26, min: 12, max: 30, cores: () => [cor("--neutro"), "#2f2f2c"], rot: ["12%", "30%+"] },
};
function corDe(camada, m, k) {
  const c = CAMADAS[camada], v = c.v(m);
  if (v == null || isNaN(v)) return k.length === 3 ? k[1] : k[0];
  const t = clamp((v - c.min) / (c.max - c.min));
  if (k.length === 2) return hexMix(k[0], k[1], t);
  return t < 0.5 ? hexMix(k[0], k[1], t * 2) : hexMix(k[1], k[2], (t - 0.5) * 2);
}

// ---------- mapa ----------
// quantidades: círculo por município, área proporcional ao número de votos
const QTD = {
  q_jogo: { v: (m) => m.jogo, nome: "votos em jogo" },
  q_volL: { v: (m) => m.volL, nome: "queda estimada da parcela de Lula", cor: "--lula" },
  q_ter: { v: (m) => (m.tL || 0) + (m.tF || 0) + (m.tI || 0), nome: "votos em terceiros" },
  q_bn: { v: (m) => m.bn, nome: "brancos e nulos" },
  q_abs: { v: (m) => m.abs, nome: "ausentes extras" },
  q_saldo: { v: (m) => m.saldo, nome: "saldo potencial", sinal: true },
};
const RMAX = 26; // raio do maior círculo (unidades do mapa)
let CENTRO = {}; // centro de cada município no desenho
let LIMITES = {};
let MAPA_BASE = { x: 0, y: 0, w: 1000, h: 990 };
let MAPA_VISTA = { ...MAPA_BASE };
let mapaIgnorarClique = false;

function mapaAjustarBolhas() {
  const escala = MAPA_BASE.w / MAPA_VISTA.w;
  document.querySelectorAll("#bolhas circle").forEach((c) => c.setAttribute("r", Number(c.dataset.raio) / escala));
}
function mapaVista(vista) {
  MAPA_VISTA = vista;
  $("#mapa").setAttribute("viewBox", `${vista.x} ${vista.y} ${vista.w} ${vista.h}`);
  mapaAjustarBolhas();
  const escala = MAPA_BASE.w / vista.w;
  $("#zoom-in").disabled = escala >= 60 - 0.001;
  $("#zoom-out").disabled = escala <= 1 + 0.001;
}
function mapaZoom(fator, centro = [MAPA_VISTA.x + MAPA_VISTA.w / 2, MAPA_VISTA.y + MAPA_VISTA.h / 2]) {
  const v = MAPA_VISTA;
  const escala = Math.max(1, Math.min(60, MAPA_BASE.w / v.w * fator));
  const w = MAPA_BASE.w / escala, h = MAPA_BASE.h / escala;
  mapaVista({ x: centro[0] - (centro[0] - v.x) * w / v.w,
    y: centro[1] - (centro[1] - v.y) * h / v.h, w, h });
}
function mapaFocar(id) {
  const b = LIMITES[id]; if (!b) return;
  const escala = Math.max(4, Math.min(60, Math.min(MAPA_BASE.w / (Math.max(b.width, 1) * 3), MAPA_BASE.h / (Math.max(b.height, 1) * 3))));
  const w = MAPA_BASE.w / escala, h = MAPA_BASE.h / escala;
  mapaVista({ x: b.x + b.width / 2 - w / 2, y: b.y + b.height / 2 - h / 2, w, h });
}
function mapaAmpliar(ativo) {
  $(".mapa").classList.toggle("ampliada", ativo);
  document.body.classList.toggle("mapa-ampliado", ativo);
  $("#mapa-ampliar").setAttribute("aria-pressed", String(ativo));
  $("#mapa-ampliar").textContent = ativo ? "Fechar" : "Ampliar";
  $("#mapa-ampliar").title = ativo ? "Fechar mapa ampliado (Esc)" : "Ampliar mapa";
}
function navegarMapa() {
  const svg = $("#mapa"), pontos = new Map(), info = $("#mapa-info");
  const ponto = (p) => {
    const q = svg.createSVGPoint(); q.x = p.x; q.y = p.y;
    const r = q.matrixTransform(svg.getScreenCTM().inverse()); return [r.x, r.y];
  };
  const meio = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  const distancia = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  let inicio = null;
  $("#zoom-in").addEventListener("click", () => mapaZoom(2));
  $("#zoom-out").addEventListener("click", () => mapaZoom(0.5));
  $("#zoom-reset").addEventListener("click", () => mapaVista({ ...MAPA_BASE }));
  $("#zoom-municipio").addEventListener("click", () => mapaFocar(sel));
  $("#mapa-ampliar").addEventListener("click", () => mapaAmpliar(!$(".mapa").classList.contains("ampliada")));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && $(".mapa").classList.contains("ampliada")) {
      mapaAmpliar(false); $("#mapa-ampliar").focus();
    }
  });
  svg.addEventListener("keydown", (e) => {
    if (["+", "=", "-", "Home", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) e.preventDefault();
    if (e.key === "+" || e.key === "=") mapaZoom(2);
    else if (e.key === "-") mapaZoom(0.5);
    else if (e.key === "Home") mapaVista({ ...MAPA_BASE });
    else if (e.key.startsWith("Arrow")) {
      const v = MAPA_VISTA;
      mapaVista({ ...v, x: v.x + (e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0) * v.w * 0.1,
        y: v.y + (e.key === "ArrowDown" ? 1 : e.key === "ArrowUp" ? -1 : 0) * v.h * 0.1 });
    }
  });
  svg.addEventListener("wheel", (e) => {
    e.preventDefault(); info.hidden = true;
    const delta = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 300 : 1);
    mapaZoom(Math.exp(-delta * 0.002), ponto({ x: e.clientX, y: e.clientY }));
  }, { passive: false });
  svg.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    if (!pontos.size) { mapaIgnorarClique = false; inicio = { x: e.clientX, y: e.clientY }; }
    pontos.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pontos.size > 1) mapaIgnorarClique = true;
    // Capturar no elemento original preserva a seleção por clique.
    e.target.setPointerCapture(e.pointerId);
  });
  svg.addEventListener("pointermove", (e) => {
    const atual = { x: e.clientX, y: e.clientY };
    if (pontos.has(e.pointerId)) {
      const antes = [...pontos.values()];
      pontos.set(e.pointerId, atual);
      const depois = [...pontos.values()];
      if (pontos.size === 1 && !mapaIgnorarClique && distancia(inicio, atual) <= 5) return;
      mapaIgnorarClique = true; info.hidden = true; svg.classList.add("movendo");
      const a = antes.length > 1 ? meio(antes[0], antes[1]) : antes[0];
      const b = depois.length > 1 ? meio(depois[0], depois[1]) : depois[0];
      const pa = ponto(a), pb = ponto(b);
      mapaVista({ ...MAPA_VISTA, x: MAPA_VISTA.x + pa[0] - pb[0], y: MAPA_VISTA.y + pa[1] - pb[1] });
      if (antes.length > 1) mapaZoom(distancia(depois[0], depois[1]) / Math.max(1, distancia(antes[0], antes[1])), ponto(b));
      return;
    }
    const id = e.target.dataset?.id, m = M[id];
    if (!m || e.pointerType === "touch") { info.hidden = true; return; }
    const camada = $("#camada").value, q = QTD[camada];
    info.textContent = `${nome(m)} · ${q ? num(q.v(m)) : pct(CAMADAS[camada].v(m))}`;
    info.hidden = false;
    const r = $(".mapa-janela").getBoundingClientRect();
    info.style.left = Math.max(8, Math.min(e.clientX - r.left + 14, r.width - info.offsetWidth - 8)) + "px";
    info.style.top = Math.max(8, Math.min(e.clientY - r.top + 14, r.height - info.offsetHeight - 8)) + "px";
  });
  const soltar = (e) => { pontos.delete(e.pointerId); if (!pontos.size) svg.classList.remove("movendo"); };
  svg.addEventListener("pointerup", soltar);
  svg.addEventListener("pointercancel", soltar);
  svg.addEventListener("lostpointercapture", soltar);
  svg.addEventListener("pointerleave", () => { info.hidden = true; });
}
function desenharMapa(mapa) {
  const svg = $("#mapa");
  MAPA_BASE = { x: 0, y: 0, w: mapa.w, h: mapa.h };
  mapaVista({ ...MAPA_BASE });
  svg.innerHTML = `<g id="areas">${Object.entries(mapa.p).map(([id, d]) => `<path data-id="${id}" d="${d}"></path>`).join("")}</g><g id="bolhas"></g>`;
  svg.querySelectorAll("#areas path").forEach((p) => { const b = p.getBBox(); CENTRO[p.dataset.id] = [b.x + b.width / 2, b.y + b.height / 2]; LIMITES[p.dataset.id] = { x: b.x, y: b.y, width: b.width, height: b.height }; });
  svg.addEventListener("click", (e) => { if (mapaIgnorarClique) { mapaIgnorarClique = false; return; } const id = e.target.dataset?.id; if (id) escolher(id, false); });
  navegarMapa();
  pintar();
}
const fmtCurto = (v) => (v >= 1e6 ? (v / 1e6).toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + " mi" : v >= 1000 ? Math.round(v / 1000) + " mil" : String(Math.round(v)));
function pintar() {
  const camada = $("#camada").value, vazio = cor("--neutro");
  const q = QTD[camada], paths = document.querySelectorAll("#areas path"), bolhas = $("#bolhas");
  if (q) {
    paths.forEach((p) => p.setAttribute("fill", vazio));
    const vals = Object.keys(M).map((id) => [id, q.v(M[id]) || 0]).filter((x) => x[1] !== 0 && CENTRO[x[0]]);
    const max = Math.max(...vals.map((x) => Math.abs(x[1])));
    const r = (v) => Math.sqrt(Math.abs(v) / max) * RMAX;
    const corBase = (v) => (q.sinal ? (v > 0 ? cor("--lula") : cor("--flavio")) : cor(q.cor || "--fg"));
    vals.sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])); // grandes atrás, pequenos na frente
    bolhas.innerHTML = vals.map(([id, v]) => `<circle data-id="${id}" cx="${CENTRO[id][0].toFixed(1)}" cy="${CENTRO[id][1].toFixed(1)}" r="${r(v).toFixed(2)}" data-raio="${r(v).toFixed(2)}" fill="${corBase(v)}"><title>${esc(nome(M[id]))}: ${num(Math.abs(v))}</title></circle>`).join("");
    mapaAjustarBolhas();
    const refs = [1e4, 1e5, 1e6].filter((x) => x < max * 1.2);
    const total = vals.reduce((a, x) => a + x[1], 0);
    let x0 = 0;
    const circs = refs.map((x) => { const rr = r(x), cx = x0 + rr + 2; x0 = cx + rr + 34; return `<circle cx="${cx}" cy="${RMAX * 2 - rr}" r="${rr}"></circle><text x="${cx + rr + 3}" y="${RMAX * 2 - 2}">${fmtCurto(x)}</text>`; }).join("");
    $("#legenda").innerHTML = `<span>${q.sinal ? `Área do círculo = tamanho do saldo potencial (<b class="cor-l">Lula</b> / <b class="cor-f">Flávio</b>). Brasil: ${total >= 0 ? "Lula +" : "Flávio +"}${num(Math.abs(total))}.` : `Área do círculo = número de ${q.nome}. Brasil: ${num(total)}.`}</span>
      <svg class="ref" viewBox="0 0 ${x0} ${RMAX * 2 + 2}" aria-hidden="true">${circs}</svg>`;
    $("#mapa").classList.add("qtd");
  } else {
    bolhas.innerHTML = "";
    const c = CAMADAS[camada], k = c.cores();
    paths.forEach((p) => { const m = M[p.dataset.id]; p.setAttribute("fill", m ? corDe(camada, m, k) : vazio); });
    $("#legenda").innerHTML = `<span>${c.rot[0]}</span><span class="rampa" style="background:linear-gradient(90deg,${k.join(",")})"></span><span>${c.rot[1]}</span>`;
    $("#mapa").classList.remove("qtd");
  }
}

// ---------- ficha do município ----------
function escolher(id, rolar) {
  const m = M[id]; if (!m) return;
  if (rolar && location.hash) location.hash = ""; // sai do relatório
  sel = id;
  $("#zoom-municipio").disabled = false;
  document.querySelectorAll("#mapa .sel").forEach((p) => p.classList.remove("sel"));
  const p = document.querySelector(`#areas path[data-id="${id}"]`);
  if (p) { p.classList.add("sel"); p.parentNode.appendChild(p); } // traz o contorno para a frente
  document.querySelectorAll("#ranking li").forEach((li) => li.classList.toggle("sel", li.dataset.id === id));
  $("#ficha").innerHTML = ficha(m);
  perto(id);
  if (rolar) { mapaFocar(id); $(".mapa").scrollIntoView({ block: "start" }); }
}

function ficha(m) {
  const partes = [["Queda de Lula (estimativa)", m.volL, cor("--lula")], ["Terceiros → Lula", m.tL, cor("--lula")],
    ["Terceiros → Flávio", m.tF, cor("--flavio")], ["Queda do PL (estimativa)", m.volF, cor("--flavio")],
    ["Terceiros indecisos", m.tI, "#8a8a84"], ["Brancos e nulos", m.bn, "#b9b8b0"], ["Ausentes extras", m.abs, "#55554f"]];
  const barra = partes.filter((x) => x[1] > 0).map((x) => `<i title="${esc(x[0])}: ${num(x[1])}" style="flex:${x[1]};background:${x[2]}"></i>`).join("");
  const lider = m.dif === 0 ? "Empate em votos" : m.dif > 0 ? `<span class="cor-l">Lula +${num(m.dif)}</span>` : `<span class="cor-f">Flávio +${num(-m.dif)}</span>`;
  const saldo = m.saldo >= 0 ? `<span class="cor-l">Lula +${num(m.saldo)}</span>` : `<span class="cor-f">Flávio +${num(-m.saldo)}</span>`;
  const kv = (rows) => `<dl class="kv">${rows.filter((r) => r[1] != null && r[1] !== "–").map((r) => `<dt>${esc(r[0])}</dt><dd>${r[1]}</dd>`).join("")}</dl>`;
  const card = (c) => c ? `<div class="bloco"><h4>${esc(c.cargo)}</h4>
      <p>${esc(c.cand)} × ${esc(c.adv)}<br>${esc(c.t1)}</p>
      <details><summary>Contexto</summary><p>${esc(c.status)}</p><ul>${c.pontos.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></details>
      <p class="fontes">${c.urls.map((u, i) => `<a href="${esc(u)}" target="_blank" rel="noopener">Fonte ${i + 1}</a>`).join(" · ")}</p></div>` : "";
  const pautas = m.pau ? m.pau.split(" | ").filter(Boolean) : [];
  const fontes = m.fon ? m.fon.split(" | ").filter((u) => /^https?:/.test(u)) : [];
  return `
    <h3>${esc(nome(m))}</h3>
    <p class="sub">${num(m.apt)} eleitores · 1º turno 2026: ${lider}</p>
    <div class="grande">${num(m.jogo)} <small>votos em jogo (${pct((m.jogo / m.apt) * 100)} dos eleitores)</small></div>
    <p class="cenario">Cenário, não previsão.</p>
    <div class="barra">${barra}</div>
    ${kv([["Queda de Lula (estimativa)", num(m.volL)], ["Terceiros", num(m.tL + m.tF + m.tI)], ["Indecisos", num(m.tI)],
      ["Brancos e nulos", num(m.bn)], ["Ausentes extras", num(m.abs)], ["Saldo estimado", saldo]])}
    <div class="bloco"><h4>Voto para presidente</h4>
      ${kv([["2022: Lula × Bolsonaro", `${pct(m.l22)} × ${pct(m.b22)}`], ["2026: Lula × Flávio", `${pct(m.l26)} × ${pct(m.f26)}`],
        ["Terceiros 2026", pct(m.t26)], ["Mudança 2022 → 2026", pp(m.sw)], ["Abstenção 2022 → 2026", `${pct(m.a22)} → ${pct(m.a26)}`]])}</div>
    <details><summary>Poder local e eleitorado</summary>
    <div class="bloco"><h4>Poder local (2024)</h4>
      ${kv([["Prefeito(a)", m.pf ? `${esc(nomeBonito(m.pf))} (${esc(m.pp)})` : "–"], ["Vereadores do PL", m.vtot ? `${m.vpl ?? 0} de ${m.vtot}` : "–"]])}</div>
    <div class="bloco"><h4>Eleitorado</h4>
      ${kv([["70 anos ou mais", fr(m.i70)], ["Ensino superior", fr(m.esup)], ["Mulheres", fr(m.mul)], ["Renda mediana (Censo)", m.rmd != null ? "R$ " + num(m.rmd) : "–"], ["Evangélicos (Censo)", pct(m.evg)], ["Área urbana (Censo)", pct(m.urb)]])}</div>
    ${m.gc != null ? `<div class="bloco"><h4>Governador no município</h4>${kv([[m.gcn, pct(m.gc)], [m.gan, pct(m.ga)], ["Diferença para Flávio", pp(m.gd)]])}</div>` : ""}
    </details>
    ${CARDS[m.uf] || CARDS.BR ? `<details><summary>Candidatos</summary>${card(CARDS[m.uf])}${card(CARDS.BR)}</details>` : ""}
    ${pautas.length ? `<details><summary>Pautas e fontes</summary><div class="bloco">${m.eco ? `<p>${esc(m.eco)}</p>` : ""}<ul>${pautas.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>
      ${fontes.length ? `<p class="fontes">Fontes: ${fontes.map((u, i) => `<a href="${esc(u)}" target="_blank" rel="noopener">[${i + 1}]</a>`).join(" ")}</p>` : ""}</div></details>` : ""}
    ${m.al && m.al.length ? `<details><summary>Limites dos dados</summary><ul>${m.al.map((c) => `<li>${esc(textoAlerta(c))}</li>`).join("")}</ul></details>` : ""}
    <p class="acoes"><a class="botao" href="#m-${m.id}">Ver relatório</a> <a class="botao" href="#uf-${m.uf}">Estado (${m.uf})</a></p>`;
}

// ---------- perto daqui ----------
function km(a, b) { // distância aproximada (haversine) entre dois municípios
  const r = Math.PI / 180, dLat = (b.lt - a.lt) * r, dLon = (b.ln - a.ln) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lt * r) * Math.cos(b.lt * r) * Math.sin(dLon / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
}
function perto(id) {
  const c = M[id]; if (!c || c.lt == null) return;
  const viz = Object.keys(M).filter((k) => k !== id && M[k].lt != null).map((k) => [k, km(c, M[k])]).filter((x) => x[1] <= 100)
    .sort((a, b) => M[b[0]].jogo - M[a[0]].jogo).slice(0, 5);
  $("#perto-titulo").textContent = `Perto de ${nome(c)}`;
  $("#perto").innerHTML = viz.length ? viz.map(([k, d]) => {
    const m = M[k], dica = m.pau ? m.pau.split(" | ")[0] : m.gc != null ? `Governador: ${m.gcn} ${pct(m.gc)}` : `Prefeito: ${m.pf ? nomeBonito(m.pf) + " (" + m.pp + ")" : "–"}`;
    return `<li data-id="${k}"><span>${esc(nome(m))} · ${Math.round(d)} km</span><span>${num(m.jogo)} em jogo</span><small>${esc(dica)}</small></li>`;
  }).join("") : `<li><span>Nenhum município a até 100 km.</span></li>`;
}

// ---------- localização: só com permissão, só no navegador, nada é enviado ou guardado ----------
function usarLocalizacao() {
  const msg = $("#local-msg"); msg.hidden = false; msg.textContent = "Procurando…";
  navigator.geolocation.getCurrentPosition((pos) => {
    const eu = { lt: pos.coords.latitude, ln: pos.coords.longitude };
    let melhor = null, dist = Infinity;
    Object.entries(M).forEach(([k, m]) => { if (m.lt != null) { const d = km(eu, m); if (d < dist) { dist = d; melhor = k; } } });
    if (!melhor || dist > 300) { msg.textContent = "Você parece estar fora do Brasil. Escolha um município acima."; return; }
    msg.textContent = `Mais próximo: ${nome(M[melhor])} (${Math.round(dist)} km).`;
    escolher(melhor, true);
  }, () => { msg.textContent = "Localização não permitida ou indisponível aqui. Escolha o município acima."; },
  { timeout: 10000, maximumAge: 600000, enableHighAccuracy: false });
}

// ---------- ranking por porte ----------
function ranking() {
  const ids = Object.keys(M).filter((id) => M[id].apt >= porte[0] && M[id].apt < porte[1])
    .sort((a, b) => M[b].jogo / M[b].apt - M[a].jogo / M[a].apt);
  $("#ranking").innerHTML = ids.slice(0, mostrar).map((id) =>
    `<li data-id="${id}" class="${id === sel ? "sel" : ""}"><span>${esc(nome(M[id]))}</span><span>${pct((M[id].jogo / M[id].apt) * 100)} · ${num(M[id].jogo)}</span></li>`).join("");
  $("#mais").hidden = mostrar >= ids.length;
  return ids;
}

// ---------- Brasil ----------
function brasil() {
  const t = { jogo: 0, volL: 0, volF: 0, tF: 0, tL: 0, tI: 0, bn: 0, abs: 0, dif: 0 };
  Object.values(M).forEach((m) => Object.keys(t).forEach((k) => (t[k] += m[k] || 0)));
  // quantidades por tipo de área
  const grupos = (titulo, regras) => {
    const linhas = regras.map(([rot, f]) => {
      const g = { n: 0, apt: 0, jogo: 0, volL: 0, ter: 0, bn: 0, abs: 0, saldo: 0 };
      Object.values(M).filter(f).forEach((m) => { g.n++; g.apt += m.apt; g.jogo += m.jogo || 0; g.volL += m.volL || 0; g.ter += (m.tL || 0) + (m.tF || 0) + (m.tI || 0); g.bn += m.bn || 0; g.abs += m.abs || 0; g.saldo += m.saldo || 0; });
      return `<tr><th>${rot}<small>${num(g.n)} mun. · ${fmtCurto(g.apt)} eleitores</small></th><td><b>${fmtCurto(g.jogo)}</b></td><td>${fmtCurto(g.volL)}</td><td>${fmtCurto(g.ter)}</td><td>${fmtCurto(g.bn)}</td><td>${fmtCurto(g.abs)}</td><td class="${g.saldo >= 0 ? "cor-l" : "cor-f"}">${g.saldo >= 0 ? "L" : "F"} +${fmtCurto(Math.abs(g.saldo))}</td></tr>`;
    }).join("");
    return `<h4 class="ufs-t">${titulo}</h4><div class="tabela"><table><thead><tr><th></th><th>Em jogo</th><th>Queda Lula</th><th>Terceiros</th><th>Br./nulos</th><th>Ausentes</th><th>Saldo</th></tr></thead><tbody>${linhas}</tbody></table></div>`;
  };
  const porTamanho = grupos("Por tamanho do município", [["Até 10 mil", (m) => m.apt < 1e4], ["10–50 mil", (m) => m.apt >= 1e4 && m.apt < 5e4], ["50–200 mil", (m) => m.apt >= 5e4 && m.apt < 2e5], ["200 mil+", (m) => m.apt >= 2e5]]);
  const porUrb = grupos("Rural ou urbano (Censo 2022)", [["Mais rural (<50% urbano)", (m) => m.urb != null && m.urb < 50], ["Misto (50–80% urbano)", (m) => m.urb >= 50 && m.urb < 80], ["Urbano (80%+)", (m) => m.urb >= 80]]);
  const porRenda = grupos("Por renda (Censo 2022, mediana por pessoa)", [["Até R$ 700", (m) => m.rmd != null && m.rmd <= 700], ["R$ 700–1.200", (m) => m.rmd > 700 && m.rmd <= 1200], ["Acima de R$ 1.200", (m) => m.rmd > 1200]]);
  $("#brasil").innerHTML = `<div class="grande">${num(t.jogo)} <small>votos em jogo · Flávio +${num(-t.dif)} no 1º turno</small></div>
    <dl class="kv"><dt>Queda de Lula (estimativa)</dt><dd>${num(t.volL)}</dd><dt>Terceiros → Flávio (pesquisa)</dt><dd>${num(t.tF)}</dd>
    <dt>Terceiros → Lula (pesquisa)</dt><dd>${num(t.tL)}</dd><dt>Terceiros indecisos</dt><dd>${num(t.tI)}</dd>
    <dt>Brancos e nulos</dt><dd>${num(t.bn)}</dd><dt>Ausentes extras</dt><dd>${num(t.abs)}</dd></dl>
    <details><summary>Comparar grupos</summary>${porTamanho}${porUrb}${porRenda}</details>
    <h4 class="ufs-t">Relatório por estado</h4><p class="chips">${[...new Set(Object.values(M).map((m) => m.uf))].sort().map((u) => `<a class="botao" href="#uf-${u}">${u}</a>`).join("")}</p>`;
}

// ---------- início ----------
async function iniciar() {
  const [dados, mapa] = await Promise.all([fetch("data/municipios.json").then((r) => r.json()), fetch("data/mapa.json").then((r) => r.json())]);
  M = dados.mun; CARDS = dados.cards;
  Object.keys(M).forEach((k) => (M[k].id = k));
  $("#lista-municipios").innerHTML = Object.values(M).map((m) => `<option value="${esc(nome(m))}">`).join("");
  desenharMapa(mapa);
  brasil();
  const ids = ranking();
  escolher(ids[0], false);

  $("#camada").addEventListener("change", pintar);
  $("#busca").addEventListener("change", (e) => {
    const q = e.target.value.trim().toLowerCase();
    const id = Object.keys(M).find((id) => nome(M[id]).toLowerCase() === q) || Object.keys(M).find((id) => M[id].n.toLowerCase().startsWith(q.split("/")[0]));
    if (id) escolher(id, true);
  });
  $("#portes").addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    document.querySelectorAll("#portes button").forEach((x) => x.setAttribute("aria-pressed", x === b));
    porte = b.dataset.p.split(",").map(Number); mostrar = 15; ranking();
  });
  if (navigator.geolocation) { $("#local").hidden = false; $("#local").addEventListener("click", usarLocalizacao); }
  $("#perto").addEventListener("click", (e) => { const li = e.target.closest("li[data-id]"); if (li) escolher(li.dataset.id, true); });
  $("#ranking").addEventListener("click", (e) => { const li = e.target.closest("li"); if (li) escolher(li.dataset.id, true); });
  $("#mais").addEventListener("click", () => { mostrar += 30; ranking(); });
  // relatórios por lugar
  window.addEventListener("hashchange", rota);
  $("#relatorio").addEventListener("click", (e) => {
    if (!e.target.closest("#copiar")) return;
    navigator.clipboard?.writeText(location.href).then(() => (e.target.textContent = "Link copiado"), () => (e.target.textContent = "Copie o endereço do navegador"));
  });
  rota();
}
iniciar().catch((e) => { $("#ficha").innerHTML = `<p class="vazio">Não foi possível carregar os dados (${esc(e.message)}).</p>`; });
