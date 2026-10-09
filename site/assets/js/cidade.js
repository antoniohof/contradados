// Ficha da cidade: as três frentes, o que fazer, políticas federais, contexto e vizinhas.
import { montarTopo, rodape, municipios, json, grande, n0, pct, dec, esc, reais, linkWhats, copiar, RAIZ } from "./ui.js";
import { aplicar, transferencia, completarQuaest, PORTES, UFNOME, PESQUISAS, PESQUISA_PADRAO } from "./frentes.js";
import { MapaPontos, CORES } from "./dotmap.js";

montarTopo({ pagina: "cidade/", abas: [["", "O caminho"], ["na-pratica/", "Na prática"], ["mapa/", "Mapa"]] });

const alvo = new URLSearchParams(location.search).get("ibge");
const [rows, regioes, divisas, radar] = await Promise.all([municipios(), json("data/regioes.json"), json("data/divisas.json"), json("data/radar.json")]);
completarQuaest(rows);
const D = aplicar(rows, transferencia());
const d = D.find((x) => x.ibge === alvo);
const main = document.getElementById("ficha");
const NOMES = ["", "reconquistar", "mobilizar", "convencer eleitores de terceiros"];
const ord = (n) => n + "ª";


// ---------------------------------------------------------------- sem cidade escolhida
function escolher() {
  const top = D.filter((x) => x.porte === 2).sort((a, b) => b.gTot - a.gTot).slice(0, 24);
  main.innerHTML = `
    <section class="faixa faixa--solida escolher">
      <div class="faixa__topo"><p class="rotulo">Ficha da cidade</p></div>
      <h1 class="grande">Escolha uma cidade.</h1>
      <p class="texto">Use a lupa no alto da página ou comece pelas cidades de 10 a 50 mil habitantes com mais votos em jogo.</p>
      <p class="linha" style="margin-top:16px"><button class="pill pill--lilas" type="button" id="abre-busca">Buscar cidade</button><a class="pill" href="${RAIZ}na-pratica/">Ver a lista completa</a></p>
      <div class="grade">${top.map((x) => `<a class="cartao${x.principal === 1 ? " cartao--f1" : x.principal === 3 ? " cartao--f3" : ""}" href="?ibge=${x.ibge}"><p class="cartao__titulo">${esc(x.municipio)}</p><p class="cartao__sub">${x.uf} · +${grande(x.gTot)} votos em jogo</p><p class="cartao__pe"><span>${NOMES[x.principal]} pesa mais</span></p></a>`).join("")}</div>
    </section>`;
  document.getElementById("abre-busca").addEventListener("click", (e) => { e.stopPropagation(); document.querySelector("[data-busca]").click(); });
}

// ---------------------------------------------------------------- ficha
function ficha(d, local, cn) {
  document.title = `${d.municipio} (${d.uf}) · Onde buscar votos`;
  const [imNome, imInter] = regioes.imediatas[d.imediata] || ["", ""];
  const porteNome = PORTES.find((p) => p.id === d.porte)?.nome;
  const mesmos = D.filter((x) => x.uf === d.uf && x.porte === d.porte);
  const rank = (campo) => {
    const ok = mesmos.filter((x) => x[campo] > 0).sort((a, b) => b[campo] - a[campo]);
    const i = ok.indexOf(d);
    return i < 0 ? "" : `${ord(i + 1)} de ${ok.length} cidades de ${porteNome} habitantes ${artigo(d.uf)} ${UFNOME[d.uf]}`;
  };
  const p26 = d.parcela26 * 100, p22 = d.parcela22 * 100;
  const frase = d.gTot < 30 ? `Aqui o potencial é pequeno: poucos votos em jogo em qualquer frente.` :
    d.principal === 1 ? `Aqui, o caminho que mais rende é <em class="f1t">reconquistar</em>: a parcela de Lula caiu ${dec(d.f1Pct)} pontos desde 2022.` :
    d.principal === 2 ? `Aqui, o caminho que mais rende é <em class="f2t">mobilizar</em>: ${pct(d.abstencao * 100, 0)} dos eleitores não votaram, numa cidade onde Lula tem ${pct(p26, 0)} dos votos dos dois.` :
    `Aqui, o caminho que mais rende é <em class="f3t">convencer eleitores de terceiros</em>: ${n0(d.f3)} votos seguem em disputa.`;
  const urlFicha = location.origin + location.pathname + "?ibge=" + d.ibge;
  const t = PESQUISAS[PESQUISA_PADRAO];

  // ---- frentes
  const c1 = d.f1 > 0
    ? `<p class="grande-num f1t">${n0(d.f1)}</p><p class="exp">eleitores a reconquistar. Lula tinha ${pct(p22, 0)} dos votos dos dois em 2022; agora tem ${pct(p26, 0)}. Trazê-los de volta vale <b>+${n0(d.g1)}</b> na diferença.</p>`
    : `<p class="grande-num">0</p><p class="exp">Lula não perdeu terreno aqui: tinha ${pct(p22, 0)} dos votos dos dois em 2022 e tem ${pct(p26, 0)} agora.</p>`;
  const c2 = d.areaLula
    ? `<p class="grande-num f2t">+${n0(d.f2)}</p><p class="exp">de saldo para Lula se os ${n0(d.ausentes_26)} que não votaram (${pct(d.abstencao * 100)}) votassem como os vizinhos.${d.mais70 ? ` ${n0(d.mais70)} eleitores têm 70 anos ou mais; para eles, votar é facultativo.` : ""}</p>`
    : `<p class="grande-num">–</p><p class="exp">Fora da área de Lula (${pct(p26, 0)} dos votos dos dois em 2026; ${pct(d.lula_2t22_pct, 0)} no 2º turno de 2022). Aqui, mais comparecimento tende a ajudar Flávio.</p>`;
  const c3 = `<p class="grande-num f3t">${n0(d.f3)}</p><p class="exp">votos de eleitores de terceiros em disputa. ${pct(d.terceiros_26_pct)} dos válidos foram para Caiado, Renan, Cury e Zema; pela ${t.nome.split("/")[0]}, ${n0(d.paraLula)} tendem a Lula e ${n0(d.paraFlavio)} a Flávio.</p>`;
  const cart = (k, classe, corpo) => `<article class="cartao ${classe}${d.principal === k ? " principal" : ""}"><p class="cartao__titulo">${["", "Reconquistar", "Mobilizar", "Terceiros"][k]}</p>${d.principal === k ? '<span class="selo">frente principal aqui</span>' : ""}${corpo}<p class="rank">${rank("g" + k)}</p></article>`;

  // ---- o que fazer
  const fazer = acoes(d);
  // ---- políticas
  const pol = politicas(d);
  // ---- contexto
  const perfil = [
    d.urbana != null && [pct(d.urbana, 0), "da população vive na área urbana"],
    d.evangelicos != null && [pct(d.evangelicos, 0), "se declaram evangélicos (Censo 2022)"],
    d.jovens != null && [pct(d.jovens, 0), "do eleitorado tem de 16 a 24 anos"],
    d.idosos != null && [pct(d.idosos, 0), "do eleitorado tem 60 anos ou mais"],
    d.prefeito_partido && [esc(d.prefeito_partido), `partido de quem governa a cidade (${esc(d.prefeito_bloco || "–")}, eleição de 2024)`],
    [d.gov2t ? "Sim" : "Não", "tem 2º turno para governador"],
  ].filter(Boolean);
  const canaisHTML = cn.length ? `<div><h3>Canais públicos</h3><div class="canais">${cn.slice(0, 16).map(([tipo, nome, plat, url]) => `<a class="pill pill--branco" href="${esc(url)}" target="_blank" rel="noopener">${esc(rotTipo(tipo))} · ${esc(plat)}</a>`).join("")}</div><p class="fontes-locais">Prefeitura, câmara e imprensa local, levantados em 08/10/2026.</p></div>` : "";
  const localHTML = local ? `<div><h3>Economia e pautas locais</h3>${local.economia ? `<p class="exp" style="font:400 16px/21px var(--texto);margin:0 0 8px">${esc(local.economia)}</p>` : ""}<ul class="pautas">${local.pautas.slice(0, 5).map((p) => `<li>${esc(p)}</li>`).join("")}</ul><p class="fontes-locais">Fontes: ${local.fontes.slice(0, 6).map((u, i) => `<a href="${esc(u)}" target="_blank" rel="noopener">[${i + 1}]</a>`).join(" ")}</p></div>` : "";

  main.innerHTML = `
    <section class="faixa faixa--solida cab">
      <div class="faixa__topo">
        <p class="rotulo">${UFNOME[d.uf]}${imNome ? ` · região de ${esc(imNome)}` : ""}</p>
        <div class="linha">
          <a class="pill pill--laranja" href="${RAIZ}reels/?ibge=${d.ibge}">Kit de reels</a>
          <a class="pill" href="${linkWhats(`${d.municipio} (${d.uf}): onde buscar votos para Lula no 2º turno`, urlFicha)}" target="_blank" rel="noopener">WhatsApp</a>
          <button class="pill" type="button" id="copia">Copiar link</button>
        </div>
      </div>
      <h1 class="grande">${esc(d.municipio)}</h1>
      <p class="texto">${d.pop ? grande(d.pop) + " habitantes · " : ""}${n0(d.aptos_26)} eleitores${porteNome ? ` · cidade de ${porteNome} habitantes` : ""}. No 1º turno, Lula teve ${n0(d.votos_lula_26)} votos e Flávio, ${n0(d.votos_flavio_26)}.</p>
      <p class="frase">${frase}</p>
    </section>

    <section class="frentes grade grade--3" aria-label="As três frentes nesta cidade">
      ${cart(1, "cartao--f1", c1)}${cart(2, "", c2)}${cart(3, "cartao--f3", c3)}
    </section>

    <section class="faixa fazer" aria-labelledby="fazer-t">
      <div class="faixa__topo"><h2 class="rotulo" id="fazer-t">O que fazer aqui</h2><a class="pill pill--laranja" href="${RAIZ}reels/?ibge=${d.ibge}">Montar reels para ${esc(d.municipio)}</a></div>
      <ol>${fazer.map((a) => `<li>${a}</li>`).join("")}</ol>
    </section>

    <section class="faixa faixa--solida politicas" aria-labelledby="pol-t">
      <div class="faixa__topo"><h2 class="rotulo" id="pol-t">Políticas federais que chegam aqui</h2><span class="nota">Portal da Transparência</span></div>
      <div class="grade">${pol}</div>
      <p class="nota">Valores disponibilizados a moradores do município, pela consulta de benefícios ao cidadão do Portal da Transparência (CGU): Bolsa Família e BPC em agosto de 2026; Pé-de-Meia de janeiro a agosto de 2026; Garantia-Safra em 2025.</p>
    </section>

    <section class="faixa" aria-labelledby="ctx-t">
      <div class="faixa__topo"><h2 class="rotulo" id="ctx-t">Contexto local</h2></div>
      <div class="contexto">
        <div><h3>Perfil</h3><div class="perfil">${perfil.map(([v, r]) => `<div><b>${v}</b><span>${r}</span></div>`).join("")}</div></div>
        ${localHTML}${canaisHTML}
      </div>
    </section>

    <section class="faixa faixa--solida vizinhas" aria-labelledby="viz-t">
      <div class="faixa__topo"><h2 class="rotulo" id="viz-t">Cidades vizinhas${imNome ? ` · região de ${esc(imNome)}` : ""}</h2>${d.imediata ? `<a class="pill pill--lilas" href="${RAIZ}na-pratica/#roteiro=${d.imediata}">Ver roteiro da região</a>` : ""}</div>
      <div class="mapa-mini"><canvas id="mapa-mini" aria-label="Mapa das cidades da região"></canvas></div>
      <ol id="vizinhas"></ol>
      <p class="nota">Distâncias em linha reta. Região geográfica imediata do IBGE (2017)${imInter ? `, dentro da região intermediária de ${esc(regioes.intermediarias[imInter] || "")}` : ""}.</p>
    </section>`;
  document.getElementById("copia").addEventListener("click", (e) => copiar(urlFicha, e.currentTarget));
  vizinhas(d);
}

const ART = { AC: "no", AL: "em", AP: "no", AM: "no", BA: "na", CE: "no", DF: "no", ES: "no", GO: "em", MA: "no", MT: "em", MS: "em", MG: "em", PA: "no", PB: "na", PR: "no", PE: "em", PI: "no", RJ: "no", RN: "no", RS: "no", RO: "em", RR: "em", SC: "em", SP: "em", SE: "em", TO: "no" };
function artigo(uf) { return ART[uf] || "em"; }
function rotTipo(t) { return { prefeitura: "Prefeitura", camara: "Câmara", jornal: "Imprensa", radio: "Rádio", tv: "TV", portal: "Portal" }[t] || t; }

// ---------------------------------------------------------------- ações sob medida
function acoes(d) {
  const lista = [];
  const ordem = [1, 2, 3].sort((a, b) => d["g" + b] - d["g" + a]).filter((k) => d["g" + k] > 0);
  const bolso = radar.temas.find((x) => x.id === "bolso");
  const fonteBolso = bolso ? bolso.fontes.slice(0, 2).map((f) => `<a href="${esc(f.u)}" target="_blank" rel="noopener">${esc(f.f)}</a>`).join(", ") : "";
  for (const k of ordem.slice(0, 2)) {
    if (k === 1) lista.push(`<b>Reconquistar quem votou em Lula em 2022.</b> Aqui são cerca de ${n0(d.f1)} eleitores. Conversa sem julgamento, a partir do bolso: salário mínimo, aposentadoria, escala 6x1.`);
    if (k === 2) lista.push(`<b>Mobilizar quem não votou.</b> ${n0(d.ausentes_26)} pessoas faltaram no 1º turno. Lembre a data (domingo, 25/10, das 8h às 17h, horário de Brasília) e ajude a achar o local no app e-Título.${d.mais70 ? ` Fale também com os ${n0(d.mais70)} eleitores de 70 anos ou mais.` : ""}`);
    if (k === 3) lista.push(`<b>Convencer eleitores de terceiros.</b> ${n0(d.f3)} votos de Caiado, Renan, Cury e Zema seguem em aberto. Respeite o voto do 1º turno e compare propostas; democracia e Constituição são os temas que pesam para esse eleitor.`);
  }
  if (d.bpc > 0) lista.push(`<b>Fale do que chega aqui.</b> ${reais(d.bpc)} do BPC por mês sustentam idosos e pessoas com deficiência da cidade. O valor segue o salário mínimo. Segundo a Folha, a equipe de Flávio planejou desligar o reajuste do BPC e da aposentadoria do ganho real do mínimo; a campanha nega (${fonteBolso}).`);
  if (d.pdm > 0 && d.jovens >= 13) lista.push(`<b>Jovens:</b> ${pct(d.jovens, 0)} do eleitorado tem de 16 a 24 anos, e ${reais(d.pdm)} do Pé-de-Meia foram pagos a estudantes daqui em 2026.`);
  if (d.areaLula) lista.push(`<b>Transporte no dia:</b> cobre da prefeitura${d.prefeito_partido ? ` (${esc(d.prefeito_partido)})` : ""} ônibus de graça e na frequência de dia útil, como manda o STF. Dar carona a eleitor fora da família é crime.`);
  lista.push(`<b>Grave um vídeo curto sobre ${esc(d.municipio)}.</b> O <a href="${RAIZ}reels/?ibge=${d.ibge}">kit de reels</a> traz roteiro, cartões e vídeos do Radar da Virada para adaptar.`);
  return lista;
}

// ---------------------------------------------------------------- políticas federais
function politicas(d) {
  const porMorador = (mil, meses = 1) => (d.pop ? `R$ ${n0((mil * 1000) / d.pop / meses)} por morador por mês` : "");
  const c = [];
  if (d.bf > 0) c.push(["Bolsa Família", reais(d.bf), `por mês · ${porMorador(d.bf)}`, "Renda para famílias de baixa renda. Gira no comércio da cidade."]);
  if (d.bpc > 0) c.push(["BPC", reais(d.bpc), `por mês · ${porMorador(d.bpc)}`, "Um salário mínimo por mês para idosos e pessoas com deficiência de baixa renda."]);
  if (d.pdm > 0) c.push(["Pé-de-Meia", reais(d.pdm), "pagos de janeiro a agosto de 2026", "Poupança para estudantes do ensino médio público de famílias do CadÚnico."]);
  if (d.safra >= 50) c.push(["Garantia-Safra", reais(d.safra), "pagos em 2025", "Proteção para agricultores familiares do semiárido que perdem a safra."]);
  return c.map(([t, v, s, e], i) => `<article class="cartao${i === 1 ? " cartao--f3" : i === 2 ? " cartao--f1" : ""}"><p class="cartao__titulo">${t}</p><p class="valor">${v}<small>${s}</small></p><p class="exp">${e}</p></article>`).join("") || `<p class="texto">Sem valores no Portal da Transparência para esta cidade.</p>`;
}

// ---------------------------------------------------------------- vizinhas + mapa
function vizinhas(d) {
  const km = (a, b) => { const R = 6371, r = Math.PI / 180, dLa = (b.lat - a.lat) * r, dLo = (b.lon - a.lon) * r; const x = Math.sin(dLa / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLo / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(x)); };
  const regiao = D.filter((x) => x.imediata && x.imediata === d.imediata && x.lon != null);
  const outras = regiao.filter((x) => x !== d && x.gTot > 0).map((x) => ({ x, dist: km(d, x) })).sort((a, b) => a.dist - b.dist).slice(0, 18);
  document.getElementById("vizinhas").innerHTML = outras.map(({ x, dist }) => `<li><a href="?ibge=${x.ibge}"><span>${esc(x.municipio)}</span><span class="km">${n0(dist)} km</span><small>+${grande(x.gTot)} votos em jogo · ${NOMES[x.principal]} pesa mais${x.pop ? ` · ${grande(x.pop)} hab.` : ""}</small></a></li>`).join("");
  // mapa da região
  const cx = document.getElementById("mapa-mini");
  const caixa = cx.parentElement;
  caixa.style.height = "340px";
  cx.style.width = "100%"; cx.style.height = "100%";
  const base = D.filter((x) => x.lon != null);
  const P = { ibge: [], lon: [], lat: [], porte: [], lula: [], area: [], f1: [], f2: [], f3: [] };
  base.forEach((x) => { P.ibge.push(+x.ibge); P.lon.push(x.lon); P.lat.push(x.lat); P.porte.push(x.porte || 0); P.lula.push(0); P.area.push(0); P.f1.push(x.f1); P.f2.push(x.f2); P.f3.push(x.f3); });
  const mapa = new MapaPontos(cx, P, { area: (w, h) => [[12, 12], [w - 12, h - 12]], divisas, raioPonto: () => 2.2 });
  const naRegiao = new Set(regiao.map((x) => x.ibge));
  const ids = base.map((x, i) => (naRegiao.has(x.ibge) ? i : -1)).filter((i) => i >= 0);
  mapa.enquadrar(ids.length ? ids : null);
  const desenhar = (inst) => {
    const s = mapa.escala(base.map((x) => (naRegiao.has(x.ibge) ? x.gTot : 0)), { piso: 0, fator: 1.6 });
    mapa.estado((i) => {
      const x = base[i];
      if (x === d) return { cor: CORES.f2, r: 5, halo: s(x.gTot), hc: x.principal };
      if (naRegiao.has(x.ibge)) return { cor: CORES.tinta, r: 2.6, halo: s(x.gTot), hc: x.principal };
      return { cor: CORES.apagado, r: 1.8 };
    }, { instantaneo: inst, rotulos: [{ lon: d.lon, lat: d.lat, texto: d.municipio, cor: "#7533ff" }, ...outras.slice(0, 6).map(({ x }) => ({ lon: x.lon, lat: x.lat, texto: x.municipio }))] });
  };
  mapa.aoRedimensionar = () => desenhar(true);
  desenhar(true);
}

// ---------------------------------------------------------------- início
if (!d) {
  escolher();
} else {
  const [locais, canais] = await Promise.all([json("data/locais.json"), json("data/canais.json")]);
  ficha(d, locais[d.ibge], canais[d.ibge] || []);
}
rodape();
