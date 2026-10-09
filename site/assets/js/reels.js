// Kit de reels por cidade: um vídeo de 23 s que abre com uma notícia da própria cidade, liga a notícia a uma
// política de Lula, mostra o que o adversário disse (com fonte) e chama para o dia 25. Toca na página e baixa em MP4.
// Junto: roteiro para gravar, legenda, mensagem e vídeos do Radar da Virada para compartilhar na cidade.
import { montarTopo, rodape, municipios, json, grande, n0, pct, esc, reais, linkWhats, copiar, baixarArquivo, RAIZ, semAcento } from "./ui.js";
import { aplicar, transferencia, completarQuaest } from "./frentes.js";
import { montarReel, prepararMapa, projetar, Player, gravar, capa } from "./reel.js";

montarTopo({ pagina: "reels/" });
rodape();

const [rows, radar, P, NOT] = await Promise.all([municipios(), json("data/radar.json"), json("data/pontos.json"), json("data/noticias.json")]);
completarQuaest(rows);
const D = aplicar(rows, transferencia());
const porIbge = new Map(D.map((d) => [d.ibge, d]));
const TEMAS = Object.fromEntries(radar.temas.map((t) => [t.id, t]));
const M = prepararMapa(P);
const idxP = new Map(Array.from(P.ibge, (c, i) => [String(c), i]));
// cor forte, cor clara, cor de texto, nome
const COR = { 1: ["#e0201b", "#ffe0dd", "#c4130e", "Reconquistar"], 2: ["#12a088", "#d4f2eb", "#0b7a66", "Mobilizar"], 3: ["#3056c8", "#e0e7fb", "#2848b0", "Terceiros"] };
const limpo = (s) => String(s || "").replace(/\*/g, "");
const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const ASSUNTO = { saude: "Saúde", estrada: "Estrada", clima: "Clima", agua: "Água", obra: "Obra", educacao: "Escola", emprego: "Emprego", programa_federal: "Programa federal", economia: "Economia", agricultura: "Roça", cultura: "Festa e cultura", moradia: "Moradia", transporte: "Transporte", energia: "Energia" };
const dataCurta = (s) => { const [a, m, d] = String(s || "").split("-"); return !a ? "" : !m ? a : d ? `${+d}/${m}/${a}` : `${MESES[+m - 1]}/${a}`; };

// ---------------------------------------------------------------- o que Lula fez ou propõe, por assunto da notícia
const PROGRAMAS = {
  saude: { nome: "Agora Tem Especialistas", frase: "Com Lula, o SUS faz *mutirão de consultas, exames e cirurgias* com especialista.", fonte: "Ministério da Saúde, programa Agora Tem Especialistas." },
  farmacia: { nome: "Farmácia Popular", frase: "Com Lula, o Farmácia Popular dá *remédio de graça* para pressão alta, diabetes e asma.", fonte: "Ministério da Saúde, Farmácia Popular." },
  agua_sertao: { nome: "Novo PAC", frase: "Com Lula, o Novo PAC voltou a fazer *adutora e barragem* no sertão.", fonte: "Governo federal, Novo PAC." },
  agua: { nome: "Novo PAC", frase: "Com Lula, o Novo PAC investe em *água e saneamento* nas cidades.", fonte: "Governo federal, Novo PAC." },
  desastre: { nome: "Defesa Civil Nacional", frase: "Com Lula, a Defesa Civil Nacional manda *dinheiro para socorro e reconstrução.*", fonte: "Ministério da Integração e do Desenvolvimento Regional, Defesa Civil Nacional." },
  chuva: { nome: "Novo PAC", frase: "Com Lula, o Novo PAC tem obra de *drenagem e contenção* para quem sofre com a chuva.", fonte: "Governo federal, Novo PAC." },
  obra: { nome: "Novo PAC", frase: "Com Lula, o Novo PAC voltou a mandar *obra para cidade pequena.*", fonte: "Governo federal, Novo PAC." },
  creche: { nome: "Novo PAC", frase: "Com Lula, o Novo PAC voltou a construir *creche e escola.*", fonte: "Ministério da Educação e Novo PAC." },
  educacao: { nome: "Pé-de-Meia", frase: "Com Lula, o Pé-de-Meia *paga para o jovem* estudar e terminar o ensino médio.", fonte: "Ministério da Educação, Pé-de-Meia." },
  emprego: { nome: "Imposto de Renda", frase: "Com Lula, quem ganha até R$ 5 mil por mês *não paga mais Imposto de Renda.*", fonte: "Lei de 2025 que isentou do IR quem ganha até R$ 5 mil, em vigor desde janeiro de 2026." },
  moradia: { nome: "Minha Casa Minha Vida", frase: "Com Lula, o Minha Casa Minha Vida *voltou a entregar casa* para quem precisa.", fonte: "Ministério das Cidades, Minha Casa Minha Vida." },
  energia: { nome: "Luz para Todos", frase: "Com Lula, o Luz para Todos voltou a levar *energia a quem não tinha.*", fonte: "Ministério de Minas e Energia, Luz para Todos." },
  agricultura: { nome: "Merenda e Pronaf", frase: "Com Lula, a merenda escolar *compra de quem planta aqui* e o Pronaf financia a roça.", fonte: "FNDE (merenda escolar) e Pronaf." },
  cultura: { nome: "Lei Aldir Blanc", frase: "Com Lula, a Lei Aldir Blanc manda *dinheiro para a cultura* de toda cidade.", fonte: "Ministério da Cultura, Política Nacional Aldir Blanc." },
  renda: { nome: "Bolsa Família", frase: "Com Lula, o Bolsa Família voltou: *R$ 600 por família* e mais R$ 150 por criança pequena.", fonte: "Ministério do Desenvolvimento Social, Bolsa Família." },
  salario: { nome: "Salário mínimo", frase: "Com Lula, o salário mínimo voltou a *subir acima da inflação.*", fonte: "Política de valorização do salário mínimo." },
};
// semiárido: Nordeste e norte de Minas
const NORDESTE = new Set(["AL", "BA", "CE", "MA", "PB", "PE", "PI", "RN", "SE"]);
const sertao = (d) => NORDESTE.has(d.uf) || (d.uf === "MG" && d.lat > -17.5);
function programaPara(n, k, d) {
  const te = n?.te, txt = n ? `${n.r} ${n.g}`.toLowerCase() : "";
  const agua = sertao(d) ? "agua_sertao" : "agua";
  if (/farm[aá]cia|rem[eé]dio/.test(txt)) return "farmacia";
  if (te === "saude") return "saude";
  if (/creche|educa[cç][aã]o infantil/.test(txt)) return "creche";
  if (te === "agua") return agua;
  if (te === "clima") {
    if (/temporal|granizo|vendaval|tempestade|ventania|ciclone|tornado|desliza|desabrig|desalojad|deixaram suas casas|estragos?\b|tempo extremo|destelha|barragem/.test(txt)) return "desastre";
    if (/chuva|enchente|alag|enxurr|cheia|inunda/.test(txt)) return "chuva";
    if (/\bseca\b|estiagem/.test(txt) && !sertao(d)) return "agricultura";
    return agua;
  }
  if (te === "estrada" || te === "obra" || te === "transporte") return "obra";
  if (["educacao", "moradia", "energia", "agricultura"].includes(te)) return te;
  if (te === "emprego" || te === "economia") return "emprego";
  if (te === "programa_federal") {
    if (/p[eé]-de-meia/.test(txt)) return "educacao";
    if (/minha casa/.test(txt)) return "moradia";
    if (/luz para todos/.test(txt)) return "energia";
    if (/aldir/.test(txt)) return "cultura";
    if (/m[eé]dic|sa[uú]de/.test(txt)) return "saude";
    return "obra";
  }
  if (/\bleit(e|eiro|eira)\b|queijo|\bsafra|lavoura|\bro[cç]a\b|rebanho|\bgado\b|produtor(es)? rura|agricultor|feira livre/.test(txt)) return "agricultura";
  if (te === "cultura" && /aldir|cultura/.test(txt)) return "cultura";
  return k === 2 ? "renda" : d.urbana >= 75 ? "emprego" : "salario";
}

// ---------------------------------------------------------------- o contraste: o que o adversário disse (temas do Radar da Virada, com fonte)
const ATAQUES = {
  bolso: {
    nome: "Aposentadoria e BPC",
    ataque: "A equipe dele planejou *desligar a aposentadoria e o BPC* do aumento real do salário mínimo.",
    sub: "Em público, promete aumento, mas não diz se mantém a regra. E o plano dele prevê cortar R$ 190 bilhões.",
    soco: (cid) => `Quem paga essa conta é *${cid}.*`,
    fonte: "Folha de S.Paulo, Gazeta do Povo e Poder360. A campanha de Flávio nega o plano.",
    tema: "bolso", links: ["140578", "fbccaa", "d3cc21"], radar: ["bolso", "idosos", "direitos", "saude"],
  },
  "6x1": {
    nome: "Escala 6x1",
    ataque: "Sobre o fim da escala 6x1, ele disse que mais folga *“não adianta”* com trabalhador endividado.",
    sub: "",
    soco: () => "Quem trabalha 6 por 1 sabe de que lado *ficar.*",
    fonte: "O Globo, outubro de 2026.",
    tema: "6x1", links: ["a0ab2b"], radar: ["6x1", "trabalho"],
  },
  constituicao: {
    nome: "Democracia",
    ataque: "Ele diz que o Brasil *não vive uma democracia plena* e quer mudar a Constituição.",
    sub: "Deixou em aberto até aumentar o mandato de presidente.",
    soco: () => "Com as regras do jogo não se *brinca.*",
    fonte: "Jornal de Brasília, 6 e 7 de outubro de 2026.",
    tema: "constituicao", links: ["753fc6", "016734"], radar: ["constituicao", "democracia", "direita", "renan", "cury_renan"],
  },
};
function ataquePara(d, k, n) {
  if (k === 3) return "constituicao";
  if (n && (n.te === "emprego" || n.te === "economia")) return "6x1";
  if (k === 1) return d.urbana >= 75 ? "6x1" : "bolso";
  return d.idosos >= 22 || d.bpc > 0 ? "bolso" : "6x1";
}
const FEDERAL = /federal|novo pac|\bpac\b|codevasf|bndes|minist[eé]rio|\buni[aã]o\b|mais m[eé]dicos|p[eé]-de-meia|farm[aá]cia popular|minha casa|luz para todos|aldir blanc|defesa civil nacional/i;
// "Polícia Federal", "Justiça Federal" e "Ministério Público" não são dinheiro do governo federal
const temFederal = (s) => FEDERAL.test(String(s).replace(/pol[ií]cia federal|justi[cç]a federal|tribunal regional federal|minist[eé]rio p[uú]blico( federal)?/gi, ""));

// ---------------------------------------------------------------- composição do kit
function compor(d, escolha = {}) {
  const k = d.gTot < 30 ? (d.areaLula ? 2 : 1) : d.principal;
  const [cor, corClara, corTexto, nomeFrente] = COR[k];
  const cid = d.municipio;
  const noticias = NOT[d.ibge] || [];
  const n = escolha.noticia === -1 ? null : noticias[escolha.noticia ?? 0] || null;
  const atq = ATAQUES[escolha.ataque || ataquePara(d, k, n)];
  const prog = PROGRAMAS[programaPara(n, k, d)];
  const dinheiro = (d.bf || 0) + (d.bpc || 0);

  // 1. gancho: a notícia da cidade; sem notícia, um dado da cidade
  let gancho, ganchoFonte, ganchoDado = null;
  if (n) { gancho = n.g; ganchoFonte = `Fonte: ${n.v}${n.d ? `, ${dataCurta(n.d)}` : ""}.`; }
  else if (k === 2) { gancho = `${cid}: *${n0(d.ausentes_26)} pessoas* não votaram no 1º turno.`; ganchoFonte = "Fonte: TSE, 1º turno de 2026."; ganchoDado = "ausentes"; }
  else if (k === 3) { gancho = `Em ${cid}, *${pct(d.terceiros_26_pct, 0)}* votaram em Caiado, Renan, Cury ou Zema.`; ganchoFonte = "Fonte: TSE, 1º turno de 2026."; ganchoDado = "terceiros"; }
  else { gancho = d.parcela22 > 0.5 ? `${cid} votou em *Lula* em 2022.` : `Em ${cid}, Lula perdeu terreno desde 2022.`; ganchoFonte = "Fonte: TSE, 1º turnos de 2022 e 2026."; }

  // 2. virada: a emoção, e o que Lula fez ou propõe sobre o assunto
  const virada = n
    ? n.to === "problema" ? `Quem mora em ${cid} sabe o quanto isso *pesa.*`
      : n.to === "conquista" ? (temFederal(`${n.r} ${n.g}`) ? "Isso tem dinheiro do *governo federal.*" : `${cid} merece muito mais *conquistas assim.*`)
      : `${cid} merece atenção *de verdade.*`
    : k === 1 ? "Tem coisa que voltou e não pode *ir embora de novo.*"
      : k === 2 ? "Aqui, a gente sabe de que lado *está.*"
      : "Não é sobre gostar do Lula. É sobre o que está *em jogo.*";

  // 4. um número da cidade, com emoção
  let numero, numeroTexto, numeroEmocao, numeroFonte;
  if (k === 2 && ganchoDado !== "ausentes") {
    numero = n0(d.ausentes_26); numeroTexto = `pessoas de ${cid} não votaram no 1º turno.`;
    numeroEmocao = "Aqui, Lula ganha. Mas só se a gente *for votar.*"; numeroFonte = "Fonte: TSE, 1º turno de 2026.";
  } else if (k === 3 && ganchoDado !== "terceiros") {
    numero = pct(d.terceiros_26_pct, 0); numeroTexto = `de ${cid} votou em Caiado, Renan, Cury ou Zema no 1º turno.`;
    numeroEmocao = "No 2º turno, quem decide *é você.*"; numeroFonte = "Fonte: TSE, 1º turno de 2026.";
  } else if (dinheiro > 0) {
    numero = reais(dinheiro).replace(" milhões", " mi").replace(" milhão", " mi"); numeroTexto = `do Bolsa Família e do BPC chegam a ${cid} todo mês.`;
    numeroEmocao = "Dinheiro que gira no comércio *daqui.*"; numeroFonte = "Fonte: Portal da Transparência (CGU), agosto de 2026.";
  } else {
    numero = n0(d.aptos_26); numeroTexto = `eleitores em ${cid}.`;
    numeroEmocao = "Cada voto daqui *conta.*"; numeroFonte = "Fonte: TSE, 2026.";
  }

  // 5. chamada
  const chamadaTopo = k === 1 ? `${cid}, volta pra casa.` : k === 2 ? `${cid}, bora votar.` : `${cid}, pela democracia.`;
  const chamadaAcao = k === 1 ? "Conversa com quem foi de Flávio. Sem briga, com respeito."
    : k === 2 ? "Chama tua mãe, teu vizinho, teu colega. Vão juntos."
    : "No 2º turno, a escolha é entre o diálogo e a aventura.";

  const i = idxP.get(d.ibge);
  const alvo = i != null ? [M.u[i], M.v[i]] : projetar(d.lon, d.lat);
  const reel = {
    cidade: cid, uf: d.uf, cor, corClara, corTexto, alvo,
    gancho, ganchoFonte, virada, proposta: prog.frase, propostaFonte: `Fonte: ${prog.fonte}`,
    ataque: atq.ataque, ataqueSub: atq.sub, soco: atq.soco(cid), ataqueFonte: `Fontes: ${atq.fonte}`,
    numero, numeroTexto, numeroEmocao, numeroFonte, chamadaTopo, chamadaAcao,
  };

  // roteiro para quem vai gravar o próprio vídeo
  const roteiro = [
    { t: "0–5 s", nome: "Gancho da cidade", tela: limpo(gancho), fala: n ? `Você viu? ${limpo(gancho)}` : limpo(gancho), fonte: limpo(ganchoFonte) },
    { t: "5–9 s", nome: "Virada", tela: limpo(prog.frase), fala: `${limpo(virada)} ${limpo(prog.frase)}`, fonte: limpo(reel.propostaFonte) },
    { t: "9–14 s", nome: "O adversário", tela: `E o Flávio? ${limpo(atq.ataque)}`, fala: `E o Flávio? ${limpo(atq.ataque)} ${limpo(reel.soco)}`, fonte: limpo(reel.ataqueFonte), links: (TEMAS[atq.tema]?.fontes || []).filter((f) => !atq.links || atq.links.includes(f.id)) },
    { t: "14–18 s", nome: "A cidade", tela: `${numero} ${numeroTexto}`, fala: limpo(numeroEmocao), fonte: limpo(numeroFonte) },
    { t: "18–23 s", nome: "Chamada", tela: `${chamadaTopo} Dia 25, é 13.`, fala: `${chamadaTopo} Dia 25, é 13. ${chamadaAcao}`, fonte: "Domingo, 25/10, das 8h às 17h (horário de Brasília)." },
  ];
  const tag = "#" + semAcento(cid).replace(/[^a-z0-9]/g, "");
  const legenda = `${limpo(gancho)} ${limpo(virada)} ${limpo(prog.frase)} E o Flávio? ${limpo(atq.ataque)} ${chamadaTopo} Dia 25, é 13. Fontes: ${[n?.v, prog.fonte.split(",")[0], atq.fonte.split(".")[0]].filter(Boolean).join("; ")}. Feito com auxílio de IA. ${tag} #2ºturno #vote13`;
  const urlCidade = new URL(`${RAIZ}cidade/?ibge=${d.ibge}`, location.href).href;
  const zap = `*${cid}, isso é com a gente*\n${limpo(gancho)}${n ? ` (${n.v})` : ""}\n${limpo(prog.frase)}\nE o Flávio? ${limpo(atq.ataque)} (${atq.fonte.split(".")[0]})\n${chamadaTopo} Dia 25, é 13.\nOs números da cidade: ${urlCidade}`;

  // vídeos do Radar da Virada para compartilhar na cidade: mesma frente e mesmo assunto primeiro
  const letra = ["", "r", "m", "t"][k];
  const afins = new Set([...atq.radar, ...(prog === PROGRAMAS.educacao ? ["jovens"] : []), ...(prog === PROGRAMAS.saude || prog === PROGRAMAS.farmacia ? ["saude"] : []), ...(d.idosos >= 22 ? ["idosos"] : [])]);
  const videos = radar.videos
    .map((v) => ({ ...v, nota: (v.frentes.includes(letra) ? 3 : 0) + (afins.has(v.tema) ? 3 : 0) + Math.log10(v.views) }))
    .sort((a, b) => b.nota - a.nota).slice(0, 4);

  return { k, nomeFrente, cor, corTexto, n, noticias, atq, prog, reel, roteiro, legenda, zap, videos };
}

// ---------------------------------------------------------------- escolha da cidade
const campo = document.getElementById("cidade");
const lista = D.filter((d) => d.pop).sort((a, b) => b.pop - a.pop);
const rotulo = (d) => `${d.municipio} (${d.uf})`;
document.getElementById("lista-cidades").innerHTML = lista.map((d) => `<option value="${esc(rotulo(d))}">`).join("");
const porRotulo = new Map(lista.map((d) => [semAcento(rotulo(d)), d]));
function acharCidade(txt) {
  const q = semAcento(txt.trim());
  if (!q) return null;
  return porRotulo.get(q) || lista.find((d) => semAcento(d.municipio) === q) || lista.find((d) => semAcento(d.municipio).startsWith(q)) || null;
}
campo.addEventListener("change", () => { const d = acharCidade(campo.value); if (d) escolher(d); });
campo.addEventListener("keydown", (e) => { if (e.key === "Enter") { const d = acharCidade(campo.value); if (d) escolher(d); } });
// sugestões: cidades pequenas com notícia local e mais votos em jogo, duas por frente
const peq = D.filter((d) => d.porte === 2);
const comNoticia = peq.filter((d) => NOT[d.ibge]);
const atalhos = [1, 2, 3].flatMap((k) => (comNoticia.some((d) => d.principal === k) ? comNoticia : peq).filter((d) => d.principal === k).sort((a, b) => b.gTot - a.gTot).slice(0, 2));
document.getElementById("atalhos").innerHTML = `<span class="nota">Sugestões:</span>` + atalhos.map((d) => `<button class="pill ${["", "pill--vermelho", "pill--verde", "pill--azul"][d.principal] || ""}" type="button" data-i="${d.ibge}">${esc(rotulo(d))}</button>`).join("");
document.querySelectorAll("[data-i]").forEach((b) => b.addEventListener("click", () => escolher(porIbge.get(b.dataset.i))));

function escolher(d, rolar = true) {
  campo.value = rotulo(d);
  history.replaceState(null, "", "?ibge=" + d.ibge);
  montar(d);
  if (rolar) document.getElementById("kit").scrollIntoView({ behavior: "smooth", block: "start" });
}

// ---------------------------------------------------------------- página do kit
let fontesProntas = null;
const fontes = () => (fontesProntas ||= Promise.all(["800 90px", "700 60px", "600 60px", "500 40px", "400 28px"].map((f) => document.fonts.load(`${f} "Bricolage Grotesque"`))).catch(() => null));
let player = null;

async function montar(d, escolha = {}) {
  const kit = compor(d, escolha);
  const slug = semAcento(d.municipio).replace(/[^a-z0-9]+/g, "-");
  const el = document.getElementById("kit");
  const nAtual = kit.n;
  const opcoesGancho = kit.noticias.map((x, i) => `<button class="pill pill--p" type="button" data-gancho="${i}" aria-pressed="${kit.n === x}">${esc(`${ASSUNTO[x.te] || "Notícia"}${x.d ? ` · ${dataCurta(x.d).replace(/\/\d{4}$/, "")}` : ""}`)}</button>`).join("")
    + `<button class="pill pill--p" type="button" data-gancho="-1" aria-pressed="${!kit.n}">Dado da cidade</button>`;
  const opcoesAtaque = Object.entries(ATAQUES).map(([id, a]) => `<button class="pill pill--p" type="button" data-ataque="${id}" aria-pressed="${kit.atq === a}">${esc(a.nome)}</button>`).join("");
  el.innerHTML = `
    <div class="kit__cab">
      <h2 class="medio">${esc(d.municipio)} (${d.uf}): <em style="color:${kit.corTexto}">${kit.nomeFrente.toLowerCase()}</em> é a frente que mais rende.</h2>
      <div class="linha"><a class="pill pill--tinta" href="${RAIZ}cidade/?ibge=${d.ibge}">Ficha da cidade</a></div>
    </div>
    <div class="kit__grade">
      <div class="reel">
        <div class="reel__tela"><canvas id="reel" aria-label="Prévia do reel de ${esc(d.municipio)}"></canvas><button class="reel__play" type="button" id="play" aria-label="Tocar o vídeo">▶</button></div>
        <div class="reel__controles">
          <button class="pill" type="button" id="toca">Tocar</button>
          <input type="range" id="tempo" min="0" max="1000" value="0" aria-label="Posição no vídeo">
          <span class="num" id="relogio">0:00</span>
        </div>
        <div class="linha">
          <button class="pill pill--tinta" type="button" id="mp4">Baixar vídeo (MP4)</button>
          <button class="pill pill--branco" type="button" id="png">Baixar capa (PNG)</button>
        </div>
        <p class="nota" id="estado-video">Vídeo vertical de 23 segundos, 1080 × 1920, sem som: escolha a música no Instagram ou no TikTok.</p>
        <div class="reel__opcoes">
          <div><span class="nota">Gancho</span><div class="linha">${opcoesGancho}</div></div>
          <div><span class="nota">Contraste</span><div class="linha">${opcoesAtaque}</div></div>
        </div>
      </div>
      <div class="roteiro-reel">
        ${nAtual ? `<div class="noticia"><p class="nota">A notícia de ${esc(d.municipio)} que abre o vídeo</p><p class="noticia__resumo">${esc(nAtual.r)}</p><p class="nota"><a href="${esc(nAtual.u)}" target="_blank" rel="noopener">${esc(nAtual.v)}${nAtual.d ? `, ${dataCurta(nAtual.d)}` : ""} ↗</a>${nAtual.c ? "" : " · confira a matéria antes de postar"}</p></div>`
          : `<div class="noticia"><p class="nota">Ainda não temos notícia local de ${esc(d.municipio)}: o vídeo abre com um dado da cidade. Se você sabe de algo que aconteceu aí, grave o seu próprio gancho com o roteiro abaixo.</p></div>`}
        <div class="faixa__topo" style="margin:14px 0 10px"><h3 class="rotulo">Roteiro para gravar</h3></div>
        <ol>${kit.roteiro.map((b) => `<li><div class="tempo">${b.t}<small>${b.nome}</small></div><div><div class="tela">Na tela: ${esc(b.tela)}</div><p class="fala">“${esc(b.fala)}”</p><p class="fonte">${esc(b.fonte)}${b.links && b.links.length ? " · " + b.links.slice(0, 3).map((f) => `<a href="${esc(f.u)}" target="_blank" rel="noopener">${esc(f.f)}</a>`).join(", ") : ""}</p></div></li>`).join("")}</ol>
        <p class="dica"><b>Como gravar:</b> num lugar que todo mundo da cidade reconhece (a praça, a feira, a igreja matriz, a rodoviária). Fale como fala com o vizinho: com emoção, sem ler. Celular na vertical, até 30 segundos, legenda na tela.</p>
        <div class="acoes-kit"><button class="pill" type="button" id="copia-roteiro">Copiar roteiro</button><button class="pill" type="button" id="copia-legenda">Copiar legenda</button></div>
      </div>
    </div>
    <div class="faixa mensagem">
      <div class="faixa__topo"><h3 class="rotulo">Mensagem para WhatsApp</h3><div class="linha"><a class="pill pill--tinta" target="_blank" rel="noopener" href="${linkWhats(kit.zap)}">Abrir no WhatsApp</a><button class="pill" type="button" id="copia-zap">Copiar</button></div></div>
      <textarea id="zap" aria-label="Mensagem">${esc(kit.zap)}</textarea>
      <p class="nota">Mande para pessoas e grupos que você conhece. Disparo em massa é proibido.</p>
    </div>
    <div class="faixa faixa--solida videos">
      <div class="faixa__topo"><h3 class="rotulo">Do Radar da Virada, para compartilhar em ${esc(d.municipio)}</h3><span class="nota">recorte de ${radar.coletado_em.split("-").reverse().join("/")} · <a href="${radar.fonte}" target="_blank" rel="noopener">ver os mais recentes</a></span></div>
      <div class="grade">${kit.videos.map((v) => `<article class="cartao cartao--f${kit.k}"><p class="cartao__titulo">${esc(v.fonte)}</p><p class="cartao__sub">${esc(v.titulo)}</p><p class="cartao__pe"><span>${grande(v.views)} visualizações</span></p><p class="linha"><a class="pill pill--branco pill--p" href="${esc(v.url)}" target="_blank" rel="noopener">Assistir</a><a class="pill pill--tinta pill--p" href="${linkWhats(`Pra quem é de ${d.municipio}: ${v.titulo} ${v.url}`)}" target="_blank" rel="noopener">Mandar no WhatsApp</a></p></article>`).join("")}</div>
      <p class="nota">Escolhidos pela frente que mais pesa na cidade e pelo assunto do vídeo acima. São links para conteúdo de terceiros, como o Radar da Virada lista: assista antes de mandar.</p>
    </div>`;

  await fontes();
  const reel = montarReel(kit.reel, M);
  const cv = document.getElementById("reel"), tempo = document.getElementById("tempo"), relogio = document.getElementById("relogio");
  const bToca = document.getElementById("toca"), bPlay = document.getElementById("play");
  const mmss = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}`;
  player?.pausar();
  player = new Player(cv, reel, {
    escala: 0.5,
    aoMudar: (t, dur, tocando) => {
      tempo.value = String(Math.round((t / dur) * 1000));
      relogio.textContent = `${mmss(t)} / ${mmss(dur)}`;
      bToca.textContent = tocando ? "Pausar" : "Tocar";
      bPlay.hidden = tocando;
    },
  });
  player.ir(2.4); // primeiro quadro com o gancho já na tela
  const alternar = () => (player.tocando ? player.pausar() : player.tocar());
  bToca.addEventListener("click", alternar);
  bPlay.addEventListener("click", alternar);
  cv.addEventListener("click", alternar);
  tempo.addEventListener("input", () => { const v = +tempo.value; player.tocando = false; player.ir((v / 1000) * reel.duracao); });

  const estado = document.getElementById("estado-video"), bMp4 = document.getElementById("mp4");
  bMp4.addEventListener("click", async () => {
    bMp4.disabled = true;
    const txt = bMp4.textContent;
    try {
      const r = await gravar(reel, { aoProgresso: (p) => { bMp4.textContent = `Gerando vídeo… ${Math.round(p * 100)}%`; } });
      baixarArquivo(`reel-${slug}.${r.ext}`, r.blob);
      estado.textContent = r.ext === "mp4"
        ? (r.codec === "avc" ? "Pronto: MP4 (H.264), aceito no Instagram, no TikTok e no WhatsApp." : "Pronto: MP4 com codec VP9. Se o app não aceitar, gere de novo no Chrome ou no Safari.")
        : "Pronto: vídeo em WebM. Para MP4, use o Chrome ou o Safari atualizados.";
    } catch (e) {
      estado.textContent = "Não deu para gerar o vídeo neste navegador. Tente no Chrome ou no Safari atualizados.";
    } finally { bMp4.disabled = false; bMp4.textContent = txt; }
  });
  document.getElementById("png").addEventListener("click", async () => baixarArquivo(`reel-${slug}-capa.png`, await capa(reel)));

  el.querySelectorAll("[data-gancho]").forEach((b) => b.addEventListener("click", () => montar(d, { ...escolha, noticia: +b.dataset.gancho })));
  el.querySelectorAll("[data-ataque]").forEach((b) => b.addEventListener("click", () => montar(d, { ...escolha, ataque: b.dataset.ataque })));
  const txtRoteiro = kit.roteiro.map((b) => `${b.t} · ${b.nome}\nNa tela: ${b.tela}\nFala: ${b.fala}\n${b.fonte}`).join("\n\n");
  document.getElementById("copia-roteiro").addEventListener("click", (e) => copiar(txtRoteiro, e.currentTarget));
  document.getElementById("copia-legenda").addEventListener("click", (e) => copiar(kit.legenda, e.currentTarget));
  document.getElementById("copia-zap").addEventListener("click", (e) => copiar(document.getElementById("zap").value, e.currentTarget));
}

// ---------------------------------------------------------------- início
const pedido = new URLSearchParams(location.search).get("ibge");
const inicial = (pedido && porIbge.get(pedido)) || [...(comNoticia.length ? comNoticia : peq)].sort((a, b) => b.gTot - a.gTot)[0];
escolher(inicial, false);
