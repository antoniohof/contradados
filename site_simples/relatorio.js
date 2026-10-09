// Relatórios por lugar: #m-<IBGE> (município) e #uf-<UF> (estado).
// Usa as funções e dados de app.js (M, CARDS, num, pct, fr, pp, esc, nome, km...).

// Pontos cegos: códigos gerados em build/build.py → texto para o leitor
const ALERTAS = {
  p: "Município pequeno (menos de 5 mil eleitores): poucos votos mudam muito os percentuais.",
  e: (v) => `O eleitorado mudou ${v}% desde 2022: as comparações com 2022 são frágeis.`,
  n: "Município novo, sem histórico de 2022: não há comparação com eleições anteriores.",
  a: "Abstenção acima de 30%: parte pode ser cadastro desatualizado (eleitores que mudaram ou morreram), não desinteresse.",
  i: "Mais de 15% dos eleitores têm 70 anos ou mais (voto facultativo): a abstenção tende a ser alta e difícil de mobilizar.",
  s: "Sem pesquisa local: pautas e contexto não foram levantados para este município.",
  b: "Pautas locais com confiança baixa (fontes institucionais ou genéricas).",
  g: "Parte das pautas vem do plano de governo do prefeito (o que ele prometeu), não de imprensa ou pesquisa.",
  j: "Há votos anulados sub judice para governador ou senado neste estado: os números podem mudar com decisões da Justiça Eleitoral.",
  t: "Empate exato entre Lula e Flávio em 2026.",
  f: "Prefeito não encontrado no registro de 2024 do TSE (possível eleição suplementar). Brasília e Fernando de Noronha não têm prefeito.",
};
// Pontos cegos que valem para todos os lugares
const CEGOS_GERAIS = [
  "O repasse dos votos de terceiros usa a média nacional da pesquisa Quaest (02–03/10). Não há pesquisa por município.",
  "Os dados mostram lugares, não pessoas: não dá para saber se os mesmos eleitores mudaram de voto.",
  "Renda, religião e urbano/rural vêm do Censo 2022 (população toda, não só eleitores). Ainda falta Bolsa Família por município. O perfil do eleitorado (idade, escolaridade, gênero) é de 2026 e também é usado para comparar com 2022.",
  "Votos do exterior (916 mil eleitores) ficam fora.",
  "Este site usa o retrato do 1º turno de 08/10/2026. Não incorpora resultados do 2º turno nem pesquisas posteriores nessa estimativa.",
];
// mediana das rendas medianas dos municípios (referência)
let MEDIANA_BR = null;
const textoAlerta = (c) => (c[0] === "e" ? ALERTAS.e(c.slice(1)) : ALERTAS[c] || c);

const lista = (itens) => `<ul>${itens.map((x) => `<li>${x}</li>`).join("")}</ul>`;
const links = (urls) => urls.length ? `<p class="fontes">Fontes: ${urls.map((u, i) => `<a href="${esc(u)}" target="_blank" rel="noopener">[${i + 1}] ${esc(u.replace(/^https?:\/\/(www\.)?/, "").split("/")[0])}</a>`).join(" ")}</p>` : "";
const quem = (v) => (v >= 0 ? `<span class="cor-l">Lula</span>` : `<span class="cor-f">Flávio</span>`);

function cartao(c) {
  if (!c) return "";
  return `<h3>${esc(c.cargo)}: ${esc(c.cand)} × ${esc(c.adv)}</h3>
    <p>1º turno: ${esc(c.t1)}. ${esc(c.status)}.</p>${lista(c.pontos.map(esc))}${links(c.urls)}`;
}

function relatorioMunicipio(id) {
  const m = M[id]; if (!m) return "<p>Município não encontrado.</p>";
  const pautas = m.pau ? m.pau.split(" | ").filter(Boolean) : [];
  const fontes = m.fon ? m.fon.split(" | ").filter((u) => /^https?:/.test(u)) : [];
  const viz = Object.keys(M).filter((k) => k !== id && M[k].lt != null && m.lt != null).map((k) => [k, km(m, M[k])])
    .filter((x) => x[1] <= 100).sort((a, b) => M[b[0]].jogo - M[a[0]].jogo).slice(0, 5);
  const razao = Math.abs(m.dif) > 0 ? m.jogo / Math.abs(m.dif) : null;
  const virou = m.dif === 0 ? "terminou empatado" : m.l22 > m.b22 && m.f26 > m.l26 ? "virou de Lula para Flávio" : m.l22 > m.b22 ? "continuou com Lula" : "continuou com o PL";
  return `
  <p class="voltar"><a href="#">← Voltar</a> · <a href="#uf-${m.uf}">Relatório do estado (${m.uf})</a> · <button id="copiar" class="link" type="button">Copiar link</button></p>
  <h2>${esc(nome(m))}</h2>
  <p class="sub">Relatório de 08/10/2026 · ${num(m.apt)} eleitores · IBGE ${id}</p>

  <h3>Resumo</h3>
  <p>No 1º turno de 2022, Lula teve ${pct(m.l22)} e Bolsonaro ${pct(m.b22)}. Em 2026, Lula teve ${pct(m.l26)} e Flávio ${pct(m.f26)}: o município ${virou}
  (mudança de ${pp(m.sw)} na margem). ${m.dif === 0 ? "Os dois candidatos empataram em votos." : `${quem(m.dif)} terminou ${num(Math.abs(m.dif))} votos à frente.`}
  Há ${num(m.jogo)} votos em jogo para o 2º turno${razao ? `, ${razao.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} vezes a diferença atual` : ""}.</p>

  <h3>Votos em jogo</h3>
  ${lista([`Queda da parcela bipartidária de Lula desde o 2º turno de 2022, convertida em votos atuais: <b>${num(m.volL)}</b>`,
    `Aumento da parcela bipartidária de Lula desde 2022, convertido em votos atuais: <b>${num(m.volF)}</b>`,
    `Votos em terceiros: <b>${num(m.tL + m.tF + m.tI)}</b> (pela pesquisa: ${num(m.tF)} para Flávio, ${num(m.tL)} para Lula, ${num(m.tI)} indecisos)`,
    `Brancos e nulos no 1º turno: <b>${num(m.bn)}</b>`,
    `Ausentes acima da menor abstenção já registrada aqui: <b>${num(m.abs)}</b>`,
    `Saldo potencial (cenário): ${m.saldo >= 0 ? `<span class="cor-l">Lula +${num(m.saldo)}</span>` : `<span class="cor-f">Flávio +${num(-m.saldo)}</span>`}`])}

  <h3>Comparecimento</h3>
  <p>Abstenção no 1º turno: ${pct(m.a18)} em 2018, ${pct(m.a22)} em 2022 e ${pct(m.a26)} em 2026. Faltaram ${num(m.aus)} eleitores.</p>

  <h3>Poder local (eleição de 2024)</h3>
  ${lista([`Prefeito(a): ${m.pf ? `${esc(nomeBonito(m.pf))} (${esc(m.pp)})` : "não encontrado"}${m.vice ? `; vice ${esc(nomeBonito(m.vice))} (${esc(m.vp)})` : ""}`,
    `Câmara: ${m.vtot ? `${m.vtot} vereadores, ${m.vpl ?? 0} do PL` : "–"}${m.mb ? `; maiores bancadas: ${esc(m.mb)}` : ""}`,
    `Força do PL no poder local: ${esc(m.plp || "–")}`])}

  <h3>Eleição de 2026 no município</h3>
  ${lista([m.gov ? `Governador mais votado: ${esc(m.gov)} (${fr(m.govp)})` : null,
    m.gc != null ? `2º turno para governador: ${esc(m.gcn)} ${pct(m.gc)} × ${esc(m.gan)} ${pct(m.ga)}; o candidato do campo PL ficou ${pp(m.gd)} abaixo de Flávio aqui` : null,
    m.sen ? `Senador mais votado: ${esc(m.sen)}` : null,
    m.dfpl != null ? `Deputado federal: PL ${fr(m.dfpl)} e PT ${fr(m.dfpt)} dos votos nominais` : null,
    `Terceiros para presidente: Caiado ${pct(m.cai)}, Renan ${pct(m.ren)}, Cury ${pct(m.cur)}`].filter(Boolean))}

  <h3>Eleitorado</h3>
  <p>${fr(m.i16)} têm 16–17 anos e ${fr(m.i70)} têm 70 ou mais (os dois grupos com voto facultativo). ${fr(m.esup)} têm ensino superior,
  ${fr(m.esf)} não completaram o fundamental e ${fr(m.mul)} são mulheres.</p>
  ${m.rmd != null ? `<h3>Renda e religião (Censo 2022)</h3>
  ${lista([`Renda por pessoa: mediana R$ ${num(m.rmd)}, média R$ ${num(m.rme)} por mês (no Brasil, a mediana municipal é R$ ${num(MEDIANA_BR)})`,
    `${pct(m.ofo)} da renda vem de fora do trabalho (aposentadorias, pensões, programas sociais)`,
    `Religião (10 anos ou mais): ${pct(m.cat)} católicos, ${pct(m.evg)} evangélicos, ${pct(m.sem)} sem religião`,
    `${pct(m.urb)} moram em área urbana`])}` : ""}

  <h3>Contexto local</h3>
  ${pautas.length ? `${m.eco ? `<p>${esc(m.eco)}</p>` : ""}${lista(pautas.map(esc))}${m.eve ? `<p>${esc(m.eve)}</p>` : ""}${links(fontes)}`
    : "<p>Sem pesquisa local para este município. Veja o ponto cego abaixo.</p>"}

  ${CARDS[m.uf] ? cartao(CARDS[m.uf]) : ""}
  ${cartao(CARDS.BR)}

  ${viz.length ? `<h3>Perto daqui (até 100 km)</h3>${lista(viz.map(([k, d]) => `<a href="#m-${k}">${esc(nome(M[k]))}</a> · ${Math.round(d)} km · ${num(M[k].jogo)} votos em jogo`))}` : ""}

  <h3>Pontos cegos</h3>
  ${lista((m.al || []).map(textoAlerta).concat(CEGOS_GERAIS).map(esc))}`;
}

function relatorioUF(uf) {
  const ids = Object.keys(M).filter((k) => M[k].uf === uf);
  if (!ids.length) return "<p>Estado não encontrado.</p>";
  const t = { apt: 0, jogo: 0, volL: 0, tF: 0, tL: 0, tI: 0, bn: 0, abs: 0, dif: 0, aus: 0 };
  ids.forEach((k) => Object.keys(t).forEach((c) => (t[c] += M[k][c] || 0)));
  const viraram = ids.filter((k) => M[k].l22 > M[k].b22 && M[k].f26 > M[k].l26);
  const topo = [...ids].sort((a, b) => M[b].jogo - M[a].jogo).slice(0, 10);
  const pequenos = ids.filter((k) => M[k].apt < 10000).sort((a, b) => M[b].jogo / M[b].apt - M[a].jogo / M[a].apt).slice(0, 10);
  const conta = (c) => ids.filter((k) => (M[k].al || []).some((a) => a[0] === c)).length;
  return `
  <p class="voltar"><a href="#">← Voltar</a> · <button id="copiar" class="link" type="button">Copiar link</button></p>
  <h2>${uf}: relatório do estado</h2>
  <p class="sub">Relatório de 08/10/2026 · ${ids.length} municípios · ${num(t.apt)} eleitores</p>

  <h3>Resumo</h3>
  <p>${quem(t.dif)} terminou o 1º turno ${num(Math.abs(t.dif))} votos à frente no estado. ${viraram.length} municípios viraram de Lula para Flávio
  desde 2022. Há ${num(t.jogo)} votos em jogo: ${num(t.volL)} votos equivalentes à queda da parcela bipartidária de Lula desde 2022, ${num(t.tF + t.tL + t.tI)} em terceiros,
  ${num(t.bn)} brancos e nulos e ${num(t.abs)} ausentes acima do normal.</p>

  <h3>Onde há mais votos em jogo</h3>
  ${lista(topo.map((k) => `<a href="#m-${k}">${esc(nome(M[k]))}</a> · ${num(M[k].jogo)} (${pct((M[k].jogo / M[k].apt) * 100)} dos eleitores)`))}

  <h3>Cidades pequenas (até 10 mil eleitores)</h3>
  ${lista(pequenos.map((k) => `<a href="#m-${k}">${esc(nome(M[k]))}</a> · ${pct((M[k].jogo / M[k].apt) * 100)} em jogo · ${num(M[k].apt)} eleitores`))}

  ${CARDS[uf] ? cartao(CARDS[uf]) : ""}

  <h3>Pontos cegos no estado</h3>
  ${lista([`${conta("s")} de ${ids.length} municípios sem pesquisa local de pautas.`,
    `${conta("e")} municípios com eleitorado que mudou mais de 15% desde 2022.`,
    `${conta("a")} com abstenção acima de 30% (possível cadastro desatualizado).`,
    `${conta("p")} com menos de 5 mil eleitores (percentuais instáveis).`]
    .concat(conta("j") ? ["Há votos anulados sub judice para governador ou senado no estado."] : []).concat(CEGOS_GERAIS).map(esc))}`;
}

// ---------- rotas: #m-<IBGE> e #uf-<UF>; sem hash = página principal ----------
function rota() {
  if (MEDIANA_BR == null) { const v = Object.values(M).map((m) => m.rmd).filter((x) => x != null).sort((a, b) => a - b); MEDIANA_BR = v[v.length >> 1]; }
  const h = location.hash.slice(1), box = $("#relatorio");
  let html = "";
  if (/^m-\d{7}$/.test(h)) html = relatorioMunicipio(h.slice(2));
  else if (/^uf-[A-Z]{2}$/.test(h)) html = relatorioUF(h.slice(3));
  box.hidden = !html; $("main").hidden = !!html;
  if (html) { box.innerHTML = html; window.scrollTo(0, 0); }
}
