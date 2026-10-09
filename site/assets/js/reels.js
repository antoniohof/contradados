// Kit de reels por cidade: um vídeo vertical que abre com uma notícia da própria cidade (sobre uma foto dela),
// liga a notícia ao que Lula fez e ao dinheiro federal que chega lá, mostra o que Flávio disse (com fonte) e,
// onde houver, um fato documentado da prefeitura do PL; termina chamando para o dia 25. Cada tela fica o tempo
// de ler. Toca na página e baixa em MP4. Junto: roteiro para gravar, legenda, mensagem e vídeos do Radar da Virada.
import { montarTopo, rodape, municipios, json, grande, n0, pct, esc, reais, linkWhats, copiar, baixarArquivo, RAIZ, semAcento } from "./ui.js";
import { aplicar, transferencia, completarQuaest, UFNOME } from "./frentes.js";
import { montarReel, prepararMapa, projetar, Player, gravar, capa } from "./reel.js";

montarTopo({ pagina: "reels/" });
rodape();

const [rows, radar, P, NOT, PREF] = await Promise.all([
  municipios(), json("data/radar.json"), json("data/pontos.json"), json("data/noticias.json"), json("data/prefeitos.json"),
]);
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
const dataCurta = (s) => { const [a, m, d] = String(s || "").split("-"); return !a ? "" : !m ? a : d ? `${+d}/${m}/${a}` : `${MESES[+m - 1]}/${a}`; };
const curto = (mil) => reais(mil).replace(" milhões", " mi").replace(" milhão", " mi");
const ASSUNTO = { saude: "Saúde", estrada: "Estrada", clima: "Clima", agua: "Água", obra: "Obra", educacao: "Escola", emprego: "Emprego", programa_federal: "Programa federal", economia: "Economia", agricultura: "Roça", cultura: "Festa e cultura", moradia: "Moradia", transporte: "Transporte", energia: "Energia" };

// variação de texto por cidade: a mesma cidade sempre recebe a mesma frase, cidades vizinhas recebem outras
function hash(s) { let h = 2166136261; for (const ch of String(s)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
const variar = (lista, semente, sal) => lista[hash(`${semente}:${sal}`) % lista.length];
const com = (txt, cid) => txt.replaceAll("{cid}", cid);

// ---------------------------------------------------------------- o que Lula fez, por assunto da notícia
const PROGRAMAS = {
  saude: { frase: "Com Lula, o SUS faz *mutirão de consultas, exames e cirurgias* com especialista.", fonte: "Ministério da Saúde, Agora Tem Especialistas." },
  farmacia: { frase: "Com Lula, o Farmácia Popular dá *remédio de graça* para pressão alta, diabetes e asma.", fonte: "Ministério da Saúde, Farmácia Popular." },
  agua_sertao: { frase: "Com Lula, o Novo PAC voltou a fazer *adutora e barragem* no sertão.", fonte: "Governo federal, Novo PAC." },
  agua: { frase: "Com Lula, o Novo PAC investe em *água e saneamento* nas cidades.", fonte: "Governo federal, Novo PAC." },
  desastre: { frase: "Com Lula, a Defesa Civil Nacional manda *dinheiro para socorro e reconstrução.*", fonte: "Defesa Civil Nacional (MIDR)." },
  chuva: { frase: "Com Lula, o Novo PAC tem obra de *drenagem e contenção* contra enchente.", fonte: "Governo federal, Novo PAC." },
  obra: { frase: "Com Lula, o Novo PAC voltou a mandar *obra para cidade pequena.*", fonte: "Governo federal, Novo PAC." },
  creche: { frase: "Com Lula, o Novo PAC voltou a construir *creche e escola.*", fonte: "Ministério da Educação e Novo PAC." },
  educacao: { frase: "Com Lula, o Pé-de-Meia *paga para o jovem* terminar o ensino médio.", fonte: "Ministério da Educação, Pé-de-Meia." },
  emprego: { frase: "Com Lula, quem ganha até R$ 5 mil *não paga mais Imposto de Renda.*", fonte: "Lei de 2025 que isenta do IR até R$ 5 mil." },
  moradia: { frase: "Com Lula, o Minha Casa Minha Vida *voltou a entregar casa.*", fonte: "Ministério das Cidades, Minha Casa Minha Vida." },
  energia: { frase: "Com Lula, o Luz para Todos voltou a levar *energia a quem não tinha.*", fonte: "Ministério de Minas e Energia, Luz para Todos." },
  agricultura: { frase: "Com Lula, a merenda *compra de quem planta aqui* e o Pronaf financia a roça.", fonte: "FNDE (merenda escolar) e Pronaf." },
  cultura: { frase: "Com Lula, a Lei Aldir Blanc manda *dinheiro para a cultura* das cidades.", fonte: "Ministério da Cultura, Política Nacional Aldir Blanc." },
  renda: { frase: "Com Lula, o Bolsa Família voltou: *R$ 600 por família* e mais R$ 150 por criança.", fonte: "Ministério do Desenvolvimento Social, Bolsa Família." },
  salario: { frase: "Com Lula, o salário mínimo voltou a *subir acima da inflação.*", fonte: "Política de valorização do salário mínimo." },
};
// semiárido: o Garantia-Safra só paga na área da Sudene, então quem recebeu em 2025 está no sertão
const sertao = (d) => d.safra > 0;
const NORTE = new Set(["AC", "AM", "AP", "PA", "RO", "RR", "TO"]);
const CHUVA = /chuva|enchente|alag|enxurr|cheia|inunda/;
const DESASTRE = /temporal|granizo|vendaval|tempestade|ventania|ciclone|tornado|desliza|desabrig|desalojad|deixaram suas casas|estragos?\b|tempo extremo|destelha|barragem/;
const AGUA = /adutora|abastecimento|po[cç]os? artesian|cisterna|[aá]gua tratada|(carro|caminh[aã]o|caminh[oõ]es)-pipa/;
const ROCA = /\bleit(e|eiro|eira)\b|queijo|\bsafra|lavoura|\bro[cç]a\b|rebanho|\bgado\b|produtor(es)? rura|agricultor|agricultura familiar|feira livre|\bpaa\b|aquisi[cç][aã]o de alimentos/;
function programaPara(n, k, d) {
  const te = n?.te, txt = n ? `${n.r} ${n.g}`.toLowerCase() : "";
  const agua = /esgoto|saneamento/.test(txt) || !sertao(d) ? "agua" : "agua_sertao";
  if (/farm[aá]cia|rem[eé]dio/.test(txt)) return "farmacia";
  if (te === "saude") return "saude";
  if (/creche|educa[cç][aã]o infantil/.test(txt)) return "creche";
  if (te === "agua") return agua;
  if (te === "clima") {
    // na Amazônia, cheia e seca isolam a cidade: o que chega é socorro da Defesa Civil
    if (DESASTRE.test(txt) || NORTE.has(d.uf)) return "desastre";
    if (CHUVA.test(txt)) return "chuva";
    if (/\bseca\b|estiagem/.test(txt) && !sertao(d)) return "agricultura";
    return agua;
  }
  if (te === "estrada" || te === "obra" || te === "transporte") return CHUVA.test(txt) ? "chuva" : AGUA.test(txt) ? agua : "obra";
  if (["educacao", "moradia", "energia", "agricultura"].includes(te)) return te;
  if (te === "emprego" || te === "economia") return ROCA.test(txt) ? "agricultura" : "emprego";
  if (te === "programa_federal") {
    if (ROCA.test(txt)) return "agricultura";
    if (/p[eé]-de-meia/.test(txt)) return "educacao";
    if (/minha casa/.test(txt)) return "moradia";
    if (/luz para todos/.test(txt)) return "energia";
    if (/aldir/.test(txt)) return "cultura";
    if (/m[eé]dic|sa[uú]de/.test(txt)) return "saude";
    return AGUA.test(txt) ? agua : "obra";
  }
  if (ROCA.test(txt)) return "agricultura";
  if (te === "cultura" && /aldir|cultura/.test(txt)) return "cultura";
  return k === 2 ? "renda" : d.urbana >= 75 ? "emprego" : "salario";
}
// o dinheiro federal que chega na cidade, do programa mais perto do assunto (Portal da Transparência)
function dinheiroPara(prog, d) {
  const cid = d.municipio, PT = "Portal da Transparência (CGU)";
  if ((prog === "educacao" || prog === "creche") && d.pdm > 0) return { numero: curto(d.pdm), texto: `do Pé-de-Meia para estudantes de ${cid} em 2026.`, fonte: `${PT}, Pé-de-Meia, janeiro a agosto de 2026.` };
  if (["agricultura", "agua_sertao", "desastre"].includes(prog) && d.safra > 0) return { numero: curto(d.safra), texto: `do Garantia-Safra para agricultores de ${cid} em 2025.`, fonte: `${PT}, Garantia-Safra 2025.` };
  if (prog === "renda" && d.bf > 0) return { numero: curto(d.bf), texto: `do Bolsa Família chegam a ${cid} todo mês.`, fonte: `${PT}, agosto de 2026.` };
  if (prog === "salario" && d.bpc > 0) return { numero: curto(d.bpc), texto: `do BPC, um salário mínimo por pessoa, chegam a ${cid} todo mês.`, fonte: `${PT}, agosto de 2026.` };
  const v = (d.bf || 0) + (d.bpc || 0);
  return v > 0 ? { numero: curto(v), texto: `do Bolsa Família e do BPC chegam a ${cid} todo mês.`, fonte: `${PT}, agosto de 2026.` } : null;
}

// ---------------------------------------------------------------- o contraste: o que Flávio disse (temas do Radar da Virada, com fonte)
const ATAQUES = {
  bolso: {
    nome: "Aposentadoria e BPC",
    ataque: "A equipe dele planejou *desligar a aposentadoria e o BPC* do aumento real do salário mínimo.",
    sub: "Em público, ele promete aumento. Mas não diz se mantém a regra.",
    soco: (d) => (d.bpc > 0 ? `Em ${d.municipio}, o BPC soma *${curto(d.bpc)} por mês.*` : `Quem paga a conta é *${d.municipio}.*`),
    fonte: "Folha de S.Paulo, Gazeta do Povo e Poder360. A campanha de Flávio nega o plano.",
    tema: "bolso", links: ["140578", "fbccaa", "d3cc21"], radar: ["bolso", "idosos", "direitos", "saude"],
  },
  "6x1": {
    nome: "Escala 6x1",
    ataque: "Sobre o fim da escala 6x1, ele disse que mais folga *“não adianta”* com trabalhador endividado.",
    sub: "A proposta em votação dá dois dias de descanso sem cortar salário.",
    soco: () => "Quem trabalha 6 por 1 sabe de que lado *ficar.*",
    fonte: "O Globo e g1, outubro de 2026.",
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
const FEDERAL = /federal|novo pac|\bpac\b|codevasf|bndes|\bdnit\b|\bpaa\b|aquisi[cç][aã]o de alimentos|minist[eé]rio|\buni[aã]o\b|mais m[eé]dicos|p[eé]-de-meia|farm[aá]cia popular|minha casa|luz para todos|aldir blanc|defesa civil nacional/i;
// "Polícia Federal", "Justiça Federal" e "Ministério Público" não são dinheiro do governo federal
const temFederal = (s) => FEDERAL.test(String(s).replace(/pol[ií]cia federal|justi[cç]a federal|tribunal regional federal|minist[eé]rio p[uú]blico( federal)?/gi, ""));

// ---------------------------------------------------------------- frases com variação
const VIRADA = {
  problema: ["Quem mora em {cid} sabe o quanto isso *pesa.*", "Em {cid}, isso não é notícia. É o *dia a dia.*", "Quem vive em {cid} sente isso *na pele.*"],
  conquista: ["{cid} merece muito mais *conquistas assim.*", "É assim que {cid} anda *para a frente.*", "Isso muda a vida de quem mora em *{cid}.*"],
  federal: ["Isso tem dinheiro do *governo federal.*", "Isso tem a mão do *governo Lula.*"],
  neutro: ["{cid} merece atenção *de verdade.*", "O que acontece em {cid} importa para o *Brasil inteiro.*", "{cid} precisa de governo que *olhe para cá.*"],
  1: ["Tem coisa que voltou e não pode *ir embora de novo.*", "{cid} já sabe como era *antes.*"],
  2: ["Aqui, a gente sabe de que lado *está.*", "{cid} é Lula. Falta *ir votar.*"],
  3: ["Não é sobre gostar do Lula. É sobre o que está *em jogo.*", "No 2º turno, {cid} *decide.*"],
};
const CHAMADA = {
  1: { topo: ["{cid}, volta pra casa.", "{cid}, bora voltar.", "{cid}, lembra de 2022?"],
       acao: ["Conversa com quem foi de Flávio. Sem briga, com respeito.", "Liga pra quem mudou de voto. Escuta antes de falar.", "Puxa conversa na feira e no trabalho. Com calma."] },
  2: { topo: ["{cid}, bora votar.", "{cid}, vai votar.", "{cid}, não fica em casa."],
       acao: ["Chama tua mãe, teu vizinho, teu colega. Vão juntos.", "Confere o local no e-Título e vai cedo.", "Combina com a família e vai votar junto."] },
  3: { topo: ["{cid}, pela democracia.", "{cid}, o 2º turno é agora.", "{cid}, a escolha é sua."],
       acao: ["No 2º turno, a escolha é entre o diálogo e a aventura.", "Quem votou em outro no 1º turno decide agora.", "Vote pensando nos próximos quatro anos."] },
};
const EMOCAO = {
  2: ["Aqui, Lula ganha. Mas só se a gente *for votar.*", "Cada uma delas pode *virar a eleição.*", "Se metade for votar, *a conta muda.*"],
  3: ["No 2º turno, quem decide *é você.*", "Agora a escolha é entre *dois caminhos.*"],
};
const SOCO_PL = ["É esse o jeito do PL de *governar?*", "Quer isso no Brasil *inteiro?*", "Agora eles querem o *Brasil.*"];

// ---------------------------------------------------------------- composição do kit
// escolha: { gancho: "n0" (notícia), "pl0" (fato da prefeitura do PL) ou "dado", ataque, local: índice do fato da prefeitura,
//            blocos: {lula, flavio, local, numero} }
function compor(d, escolha = {}) {
  const k = d.gTot < 30 ? (d.areaLula ? 2 : 1) : d.principal;
  const [cor, corClara, corTexto, nomeFrente] = COR[k];
  const cid = d.municipio, sem = d.ibge;
  const noticias = NOT[d.ibge] || [];
  const pref = PREF[d.ibge] || null;
  const fatoPL = pref ? pref.i[escolha.local ?? 0] || pref.i[0] : null;
  // sem notícia local, a prefeitura do PL abre o vídeo
  const ganchoId = escolha.gancho || (noticias.length ? "n0" : fatoPL ? "pl" : "dado");
  const n = ganchoId.startsWith("n") ? noticias[+ganchoId.slice(1)] || null : null;
  const ganchoPL = ganchoId === "pl" && !!fatoPL;
  const atqId = escolha.ataque || ataquePara(d, k, n);
  const atq = ATAQUES[atqId];
  const progId = programaPara(n, k, d);
  const prog = PROGRAMAS[progId];
  const din = dinheiroPara(progId, d);

  // 1. gancho: a notícia da cidade; sem notícia, um dado da cidade
  let gancho, ganchoFonte, ganchoDado = null;
  if (n) { gancho = n.g; ganchoFonte = `Fonte: ${n.v}${n.d ? `, ${dataCurta(n.d)}` : ""}.`; }
  else if (ganchoPL) { gancho = `Em ${cid}, ${fatoPL.t[0].toLowerCase()}${fatoPL.t.slice(1)}`; ganchoFonte = `Fonte: ${fatoPL.v}, ${dataCurta(fatoPL.d)}.`; }
  else if (k === 2) { gancho = `${cid}: *${n0(d.ausentes_26)} pessoas* não votaram no 1º turno.`; ganchoFonte = "Fonte: TSE, 1º turno de 2026."; ganchoDado = "numero"; }
  else if (k === 3) { gancho = `Em ${cid}, *${pct(d.terceiros_26_pct, 0)}* votaram em Caiado, Renan, Cury ou Zema.`; ganchoFonte = "Fonte: TSE, 1º turno de 2026."; ganchoDado = "numero"; }
  else if (d.parcela22 > 0.5) { gancho = `Em 2022, *${pct(d.parcela22 * 100, 0)}* dos votos de ${cid} entre Lula e Bolsonaro foram para Lula.`; ganchoFonte = "Fonte: TSE, 1º turno de 2022."; ganchoDado = "numero"; }
  else { gancho = `Em ${cid}, cada voto que volta para Lula *conta dobrado.*`; ganchoFonte = "Um voto a menos para Flávio e um a mais para Lula. Fonte: TSE, 1º turno de 2026."; }

  // 2. virada: a emoção
  const tom = ganchoPL ? "problema" : !n ? k : n.to === "conquista" ? (temFederal(`${n.r} ${n.g}`) ? "federal" : "conquista") : n.to === "problema" ? "problema" : "neutro";
  const virada = com(variar(VIRADA[tom], sem, "virada"), cid);

  // 3. o número da cidade (voto)
  let numero = null;
  if (k === 2) numero = { numero: n0(d.ausentes_26), texto: `pessoas de ${cid} não votaram no 1º turno.`, emocao: variar(EMOCAO[2], sem, "emocao"), fonte: "Fonte: TSE, 1º turno de 2026." };
  else if (k === 3) numero = { numero: pct(d.terceiros_26_pct, 0), texto: `de ${cid} votou em Caiado, Renan, Cury ou Zema no 1º turno.`, emocao: variar(EMOCAO[3], sem, "emocao"), fonte: "Fonte: TSE, 1º turno de 2026." };
  else if (d.parcela22 > 0.5) numero = { numero: pct(d.parcela22 * 100, 0), texto: `dos votos dados a Lula ou Bolsonaro em ${cid} foram para Lula em 2022.`, emocao: `Agora, contra Flávio, são ${pct(d.parcela26 * 100, 0)}. Dá para *voltar.*`, fonte: "Fonte: TSE, 1º turnos de 2022 e 2026." };

  // partes do vídeo (o usuário liga e desliga)
  const b = escolha.blocos || {};
  const blocos = {
    lula: b.lula ?? true,
    flavio: b.flavio ?? true,
    local: !!fatoPL && (b.local ?? true),
    numero: !!numero && ganchoDado !== "numero" && (b.numero ?? !fatoPL),
  };

  const topo = com(variar(CHAMADA[k].topo, sem, "topo"), cid);
  const acao = variar(CHAMADA[k].acao, sem, "acao");
  const quem = pref ? `${pref.g === "a" ? "A prefeita" : "O prefeito"} ${pref.pc ? "é do" : `foi eleit${pref.g === "a" ? "a" : "o"} pelo`} *PL*, o partido de Flávio.` : "";
  const socoPL = variar(SOCO_PL, sem, "pl");
  const telas = [{ tipo: "gancho", texto: gancho, status: ganchoPL ? fatoPL.e : "", fonte: ganchoFonte, nome: "Gancho da cidade" }];
  if (blocos.lula) {
    telas.push({ tipo: "frase", texto: virada, nome: "Virada" });
    telas.push({ tipo: "proposta", texto: prog.frase, numero: din?.numero, numeroTexto: din?.texto, fonte: `Fonte: ${prog.fonte}${din ? ` ${din.fonte}` : ""}`, nome: "O que Lula fez" });
  }
  if (blocos.flavio) {
    telas.push({ tipo: "ataque", titulo: "E o Flávio?", texto: atq.ataque, fonte: `Fontes: ${atq.fonte}`, nome: "O adversário" });
    telas.push({ tipo: "ataque2", texto: atq.sub, soco: atq.soco(d), fonte: d.bpc > 0 && atqId === "bolso" ? "Valor do BPC: Portal da Transparência (CGU), agosto de 2026." : "", nome: "O adversário" });
  }
  if (blocos.local) {
    // se o fato já abriu o vídeo, não repete: fica quem governa e a pergunta
    telas.push({ tipo: "local", titulo: ganchoPL ? `E quem governa ${cid}?` : `E aqui em ${cid}?`, quem, soco: ganchoPL ? socoPL : "", legendaFoto: escolha.creditoPrefeito || "", nome: "A prefeitura do PL" });
    if (!ganchoPL) telas.push({ tipo: "local2", texto: fatoPL.t, status: fatoPL.e, soco: socoPL, fonte: `Fonte: ${fatoPL.v}, ${dataCurta(fatoPL.d)}.`, nome: "A prefeitura do PL" });
  }
  if (blocos.numero) telas.push({ tipo: "numero", ...numero, nome: "A cidade" });
  telas.push({ tipo: "chamada", topo, acao, nome: "Chamada" });

  const i = idxP.get(d.ibge);
  const alvo = i != null ? [M.u[i], M.v[i]] : projetar(d.lon, d.lat);
  const reel = { cidade: cid, uf: d.uf, cor, corClara, corTexto, alvo, telas };

  // falas para quem vai gravar o próprio vídeo
  const fala = (s) => ({
    gancho: `${n || ganchoPL ? "Você viu? " : ""}${limpo(s.texto)}${s.status ? ` ${s.status}` : ""}`,
    frase: limpo(s.texto),
    proposta: `${limpo(s.texto)}${s.numero ? ` Aqui são ${s.numero} ${limpo(s.numeroTexto)}` : ""}`,
    ataque: `E o Flávio? ${limpo(s.texto)}`,
    ataque2: `${limpo(s.texto)} ${limpo(s.soco)}`,
    local: `${limpo(s.titulo)} ${limpo(s.quem)}${s.soco ? ` ${limpo(s.soco)}` : ""}`,
    local2: `${limpo(s.texto)} ${limpo(s.status)} ${limpo(s.soco)}`,
    numero: `${s.numero} ${limpo(s.texto)} ${limpo(s.emocao)}`,
    chamada: `${s.topo} Dia 25, é 13. ${s.acao}`,
  })[s.tipo];
  const tela = (s) => ({
    gancho: `${limpo(s.texto)}${s.status ? ` ${s.status}` : ""}`, frase: limpo(s.texto), proposta: limpo(s.texto) + (s.numero ? ` ${s.numero} ${limpo(s.numeroTexto)}` : ""),
    ataque: `E o Flávio? ${limpo(s.texto)}`, ataque2: `${limpo(s.texto)} ${limpo(s.soco)}`, local: `${s.titulo} ${limpo(s.quem)}`,
    local2: `${limpo(s.texto)} ${limpo(s.status)}`, numero: `${s.numero} ${limpo(s.texto)}`, chamada: `${s.topo} Dia 25, é 13.`,
  })[s.tipo];
  const fonteDe = (s) => (s.tipo === "chamada" ? "Domingo, 25/10, das 8h às 17h (horário de Brasília)." : limpo(s.fonte || ""));
  const links = {
    gancho: n ? [{ f: n.v, u: n.u }] : ganchoPL ? [{ f: fatoPL.v, u: fatoPL.u }] : [],
    ataque: (TEMAS[atq.tema]?.fontes || []).filter((f) => !atq.links || atq.links.includes(f.id)).map((f) => ({ f: f.f, u: f.u })),
    local2: fatoPL && !ganchoPL ? [{ f: fatoPL.v, u: fatoPL.u }] : [],
  };

  const tag = "#" + semAcento(cid).replace(/[^a-z0-9]/g, "");
  const partes = [limpo(gancho)];
  if (blocos.lula) partes.push(limpo(virada), limpo(prog.frase) + (din ? ` Aqui são ${din.numero} ${limpo(din.texto)}` : ""));
  if (blocos.flavio) partes.push(`E o Flávio? ${limpo(atq.ataque)} ${limpo(atq.sub)}`);
  if (blocos.local) partes.push(ganchoPL ? limpo(quem) : `${limpo(quem)} ${limpo(fatoPL.t)} ${fatoPL.e}`);
  const fontes = [n?.v, blocos.lula && prog.fonte.split(",")[0], blocos.lula && din && "Portal da Transparência", blocos.flavio && atq.fonte.split(".")[0], blocos.local && fatoPL.v].filter(Boolean);
  const legenda = `${partes.join(" ")} ${topo} Dia 25, é 13. Fontes: ${fontes.join("; ")}. Feito com auxílio de IA. ${tag} #2ºturno #vote13`;
  const urlCidade = new URL(`${RAIZ}cidade/?ibge=${d.ibge}`, location.href).href;
  const zap = [`*${cid}, isso é com a gente*`, `${limpo(gancho)}${n ? ` (${n.v})` : ""}`,
    blocos.lula && `${limpo(prog.frase)}${din ? ` Aqui são ${din.numero} ${limpo(din.texto)}` : ""}`,
    blocos.flavio && `E o Flávio? ${limpo(atq.ataque)} (${atq.fonte.split(".")[0]})`,
    blocos.local && (ganchoPL ? limpo(quem) : `${limpo(quem)} ${limpo(fatoPL.t)} ${fatoPL.e} (${fatoPL.v})`),
    `${topo} Dia 25, é 13.`, `Os números da cidade: ${urlCidade}`].filter(Boolean).join("\n");

  // vídeos do Radar da Virada para compartilhar na cidade: mesma frente e mesmo assunto primeiro
  const letra = ["", "r", "m", "t"][k];
  const afins = new Set([...atq.radar, ...(progId === "educacao" ? ["jovens"] : []), ...(progId === "saude" || progId === "farmacia" ? ["saude"] : []), ...(d.idosos >= 22 ? ["idosos"] : [])]);
  const videos = radar.videos
    .map((v) => ({ ...v, nota: (v.frentes.includes(letra) ? 3 : 0) + (afins.has(v.tema) ? 3 : 0) + Math.log10(v.views) }))
    .sort((a, b) => b.nota - a.nota).slice(0, 4);

  return { k, nomeFrente, cor, corTexto, n, noticias, ganchoId, ganchoPL, atq, atqId, prog, din, pref, fatoPL, blocos, numero, reel, fala, tela, fonteDe, links, legenda, zap, videos };
}

// ---------------------------------------------------------------- fotos da cidade (Wikimedia Commons, com crédito)
// A foto vem da Wikidata (imagem principal do município, pelo código do IBGE) e do Commons, que dá autor e licença.
// O navegador de quem usa o site busca na hora; se não achar ou a rede falhar, o vídeo sai com o mapa de pontos.
const FOTOS = new Map();
async function pegarJSON(url, ms = 9000) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  try { const r = await fetch(url, { signal: ctl.signal }); return r.ok ? await r.json() : null; } finally { clearTimeout(t); }
}
function carregarImagem(src, cruzada = true) {
  return new Promise((ok, erro) => {
    const img = new Image();
    if (cruzada) img.crossOrigin = "anonymous";
    img.decoding = "async";
    img.onload = () => ok(img);
    img.onerror = () => erro(new Error("imagem"));
    img.src = src;
  });
}
const textoDeHTML = (h) => new DOMParser().parseFromString(String(h), "text/html").body.textContent.replace(/\s+/g, " ").trim();
function fotoDaCidade(d) {
  if (!FOTOS.has(d.ibge)) FOTOS.set(d.ibge, (async () => {
    try {
      const busca = await pegarJSON(`https://www.wikidata.org/w/api.php?action=query&list=search&srsearch=haswbstatement:P1585=${d.ibge}&srlimit=1&format=json&origin=*`);
      const qid = busca?.query?.search?.[0]?.title;
      if (!qid) return null;
      const ent = await pegarJSON(`https://www.wikidata.org/w/api.php?action=wbgetclaims&entity=${qid}&property=P18&format=json&origin=*`);
      const arquivo = ent?.claims?.P18?.[0]?.mainsnak?.datavalue?.value;
      if (!arquivo) return null;
      const info = await pegarJSON(`https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent("File:" + arquivo)}&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=1280&format=json&origin=*`);
      const ii = Object.values(info?.query?.pages || {})[0]?.imageinfo?.[0];
      if (!ii?.thumburl) return null;
      const meta = ii.extmetadata || {};
      const autor = textoDeHTML(meta.Artist?.value || "").slice(0, 60) || "autor no Commons";
      const licenca = textoDeHTML(meta.LicenseShortName?.value || "");
      const img = await carregarImagem(ii.thumburl);
      return { img, credito: `Foto: ${autor}${licenca ? `, ${licenca}` : ""}, via Wikimedia Commons.`, pagina: ii.descriptionurl, arquivo };
    } catch { return null; }
  })());
  return FOTOS.get(d.ibge);
}

// ---------------------------------------------------------------- lista de cidades por importância
const S = { f: 0, p: 0, uf: "", q: "", noticia: false, pl: false, n: 30 };
const valor = (d) => (S.f === 0 ? d.gTot : S.f === 1 ? d.g1 : S.f === 2 ? d.g2 : d.g3);
const porteOk = (d) => (S.p === 0 ? true : S.p === 45 ? d.porte === 4 || d.porte === 5 : d.porte === S.p);
const NOME_F = ["", "reconquistar", "mobilizar", "terceiros"];
const elLista = document.getElementById("lista-reels"), elMais = document.getElementById("mais-reels"), elConta = document.getElementById("conta-reels");
const selUF = document.getElementById("uf-reels"), campo = document.getElementById("cidade");
selUF.innerHTML = `<option value="">Brasil</option>` + Object.entries(UFNOME).sort((a, b) => a[1].localeCompare(b[1], "pt-BR")).map(([uf, nome]) => `<option value="${uf}">${nome}</option>`).join("");
let atual = null;
function filtrados() {
  const q = semAcento(S.q.trim());
  return D.filter((d) => d.pop && porteOk(d) && (!S.uf || d.uf === S.uf) && valor(d) > 0 && (!q || semAcento(d.municipio).includes(q))
    && (!S.noticia || NOT[d.ibge]) && (!S.pl || PREF[d.ibge])).sort((a, b) => valor(b) - valor(a));
}
function desenharLista() {
  document.querySelectorAll("[data-rf]").forEach((b) => b.setAttribute("aria-pressed", String(+b.dataset.rf === S.f)));
  document.querySelectorAll("[data-rp]").forEach((b) => b.setAttribute("aria-pressed", String(+b.dataset.rp === S.p)));
  document.getElementById("so-noticia").setAttribute("aria-pressed", String(S.noticia));
  document.getElementById("so-pl").setAttribute("aria-pressed", String(S.pl));
  const L = filtrados();
  elConta.textContent = `${n0(L.length)} cidades, da que tem mais votos em jogo para a que tem menos`;
  elLista.innerHTML = L.slice(0, S.n).map((d, i) => {
    const f = S.f || d.principal;
    return `<li><button type="button" class="cid${atual === d.ibge ? " sel" : ""}" data-i="${d.ibge}">
      <span class="cid__pos">${i + 1}</span>
      <span class="cid__nome"><b>${esc(d.municipio)}</b> ${d.uf}</span>
      <span class="cid__v f${f}t">+${grande(valor(d))}</span>
      <span class="cid__info"><i class="ponto f${f}"></i>${NOME_F[f]}${d.pop ? ` · ${grande(d.pop, true)} hab.` : ""}${NOT[d.ibge] ? ` · <span class="selo">notícia local</span>` : ""}${PREF[d.ibge] ? ` · <span class="selo selo--pl">prefeitura do PL</span>` : ""}</span>
    </button></li>`;
  }).join("") || `<li class="nota">Nenhuma cidade com esse filtro.</li>`;
  elMais.hidden = L.length <= S.n;
}
const reiniciar = () => { S.n = 30; desenharLista(); };
document.querySelectorAll("[data-rf]").forEach((b) => b.addEventListener("click", () => { S.f = +b.dataset.rf; reiniciar(); }));
document.querySelectorAll("[data-rp]").forEach((b) => b.addEventListener("click", () => { S.p = +b.dataset.rp; reiniciar(); }));
document.getElementById("so-noticia").addEventListener("click", () => { S.noticia = !S.noticia; reiniciar(); });
document.getElementById("so-pl").addEventListener("click", () => { S.pl = !S.pl; reiniciar(); });
selUF.addEventListener("change", () => { S.uf = selUF.value; reiniciar(); });
let tq;
campo.addEventListener("input", () => { clearTimeout(tq); tq = setTimeout(() => { S.q = campo.value; reiniciar(); }, 160); });
campo.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); const d = filtrados()[0]; if (d) escolher(d); } });
elMais.addEventListener("click", () => { S.n += 30; desenharLista(); });
elLista.addEventListener("click", (e) => { const b = e.target.closest("[data-i]"); if (b) escolher(porIbge.get(b.dataset.i)); });

function escolher(d, rolar = true) {
  atual = d.ibge;
  history.replaceState(null, "", "?ibge=" + d.ibge);
  desenharLista();
  montar(d);
  if (rolar) document.getElementById("kit").scrollIntoView({ behavior: "smooth", block: "start" });
}

// ---------------------------------------------------------------- página do kit
let fontesProntas = null;
const fontes = () => (fontesProntas ||= Promise.all(["800 90px", "700 60px", "600 60px", "500 40px", "400 28px"].map((f) => document.fonts.load(`${f} "Bricolage Grotesque"`))).catch(() => null));
let player = null;
const mmss = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}`;
// imagens da cidade aberta: a foto automática, a enviada pelo usuário, a do prefeito
const IMG = { ibge: null, auto: null, propria: null, credito: "", semFoto: false, prefeito: null };

async function montar(d, escolha = {}) {
  if (IMG.ibge !== d.ibge) Object.assign(IMG, { ibge: d.ibge, auto: null, propria: null, credito: "", semFoto: false, prefeito: null });
  const kit = compor(d, escolha);
  const slug = semAcento(d.municipio).replace(/[^a-z0-9]+/g, "-");
  const el = document.getElementById("kit");
  const nAtual = kit.n;
  const opcoesGancho = kit.noticias.map((x, i) => `<button class="pill pill--p" type="button" data-gancho="n${i}" aria-pressed="${kit.n === x}">${esc(`${ASSUNTO[x.te] || "Notícia"}${x.d ? ` · ${dataCurta(x.d).replace(/\/\d{4}$/, "")}` : ""}`)}</button>`).join("")
    + (kit.fatoPL ? `<button class="pill pill--p" type="button" data-gancho="pl" aria-pressed="${kit.ganchoPL}">Prefeitura do PL</button>` : "")
    + `<button class="pill pill--p" type="button" data-gancho="dado" aria-pressed="${kit.ganchoId === "dado"}">Dado da cidade</button>`;
  const opcoesAtaque = Object.entries(ATAQUES).map(([id, a]) => `<button class="pill pill--p" type="button" data-ataque="${id}" aria-pressed="${kit.atq === a}">${esc(a.nome)}</button>`).join("");
  const resumir = (t, n = 34) => (t.length > n ? t.slice(0, t.lastIndexOf(" ", n)) + "…" : t);
  const opcoesLocal = kit.pref ? kit.pref.i.map((x, i) => `<button class="pill pill--p" type="button" data-local="${i}" aria-pressed="${kit.fatoPL === x}" title="${esc(x.t)}">${esc(resumir(x.t))} · ${esc(dataCurta(x.d).replace(/^\d+\//, ""))}</button>`).join("") : "";
  const bloco = (id, nome, ok = true) => (ok ? `<button class="pill pill--p" type="button" data-bloco="${id}" aria-pressed="${kit.blocos[id]}">${nome}</button>` : "");
  const quemPref = kit.pref ? (kit.pref.g === "a" ? "da prefeita" : "do prefeito") : "";
  el.innerHTML = `
    <div class="kit__cab">
      <h2 class="medio">${esc(d.municipio)} (${d.uf}): <em style="color:${kit.corTexto}">${kit.nomeFrente.toLowerCase()}</em> é a frente que mais rende.</h2>
      <div class="linha"><a class="pill pill--acento" href="${RAIZ}cidade/?ibge=${d.ibge}">Ficha da cidade</a><a class="pill pill--branco" href="#escolha">Outra cidade</a></div>
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
          <button class="pill pill--acento" type="button" id="mp4">Baixar vídeo (MP4)</button>
          <button class="pill pill--branco" type="button" id="png">Baixar capa (PNG)</button>
        </div>
        <p class="nota" id="estado-video"></p>
        <div class="reel__opcoes">
          <div><span class="nota">Partes do vídeo</span><div class="linha">${bloco("lula", "O que Lula fez")}${bloco("flavio", "Flávio")}${bloco("local", "Prefeitura do PL", !!kit.pref)}${bloco("numero", "Número da cidade", !!kit.numero)}</div></div>
          <div><span class="nota">Gancho</span><div class="linha">${opcoesGancho}</div></div>
          <div><span class="nota">Contraste com Flávio</span><div class="linha">${opcoesAtaque}</div></div>
          ${kit.pref ? `<div><span class="nota">Fato da prefeitura do PL</span><div class="linha">${opcoesLocal}</div></div>` : ""}
          <div class="fotos">
            <span class="nota">Foto de fundo</span>
            <p class="nota" id="foto-estado"></p>
            <div class="linha">
              <label class="pill pill--p arquivo">Usar outra foto<input type="file" accept="image/*" id="foto-arquivo"></label>
              <button class="pill pill--p" type="button" id="foto-tirar">Sem foto</button>
            </div>
            <input class="pill campo campo--p" id="foto-credito" type="text" placeholder="Crédito da foto (autor e licença)" hidden>
          </div>
          ${kit.pref ? `<div class="fotos">
            <span class="nota">Foto ${quemPref} (opcional)</span>
            <p class="nota">Use foto oficial ou de imprensa, com crédito, sem montagem nem alteração.</p>
            <div class="linha"><label class="pill pill--p arquivo">Enviar foto<input type="file" accept="image/*" id="pref-arquivo"></label></div>
            <input class="pill campo campo--p" id="pref-credito" type="text" placeholder="Crédito da foto" value="${esc(escolha.creditoPrefeito || "")}">
          </div>` : ""}
        </div>
      </div>
      <div class="roteiro-reel">
        ${kit.ganchoPL ? "" : nAtual ? `<div class="noticia"><p class="nota">A notícia de ${esc(d.municipio)} que abre o vídeo</p><p class="noticia__resumo">${esc(nAtual.r)}</p><p class="nota"><a href="${esc(nAtual.u)}" target="_blank" rel="noopener">${esc(nAtual.v)}${nAtual.d ? `, ${dataCurta(nAtual.d)}` : ""} ↗</a>${nAtual.c ? "" : " · confira a matéria antes de postar"}</p></div>`
          : `<div class="noticia"><p class="nota">Ainda não temos notícia local de ${esc(d.municipio)}: o vídeo abre com um dado da cidade. Se você sabe de algo que aconteceu aí, grave o seu próprio gancho com o roteiro abaixo.</p></div>`}
        ${kit.blocos.local || kit.ganchoPL ? `<div class="noticia noticia--pl"><p class="nota">${kit.pref.g === "a" ? "A prefeita" : "O prefeito"} ${esc(kit.pref.p)} (${kit.pref.pc ? "PL" : "eleito pelo PL"}) · o fato que entra no vídeo</p><p class="noticia__resumo">${esc(kit.fatoPL.f)}</p><p class="nota">${esc(kit.fatoPL.e)}${kit.fatoPL.r ? ` Resposta: ${esc(kit.fatoPL.r)}` : ""} · <a href="${esc(kit.fatoPL.u)}" target="_blank" rel="noopener">${esc(kit.fatoPL.v)}, ${dataCurta(kit.fatoPL.d)} ↗</a>${kit.fatoPL.c ? "" : " · confira a matéria antes de postar"}</p><p class="nota"><b>Investigação não é condenação.</b> Diga sempre em que pé está o caso e a resposta da prefeitura, como no vídeo.</p></div>` : ""}
        <div class="faixa__topo" style="margin:14px 0 10px"><h3 class="rotulo">Roteiro para gravar</h3><span class="nota" id="duracao-roteiro"></span></div>
        <ol id="roteiro"></ol>
        <p class="dica"><b>Como gravar:</b> num lugar que todo mundo da cidade reconhece (a praça, a feira, a igreja matriz, a rodoviária). Fale como fala com o vizinho: com emoção, sem ler. Celular na vertical, legenda na tela.</p>
        <div class="acoes-kit"><button class="pill" type="button" id="copia-roteiro">Copiar roteiro</button><button class="pill" type="button" id="copia-legenda">Copiar legenda</button></div>
      </div>
    </div>
    <div class="faixa mensagem">
      <div class="faixa__topo"><h3 class="rotulo">Mensagem para WhatsApp</h3><div class="linha"><a class="pill pill--acento" target="_blank" rel="noopener" href="${linkWhats(kit.zap)}">Abrir no WhatsApp</a><button class="pill" type="button" id="copia-zap">Copiar</button></div></div>
      <textarea id="zap" aria-label="Mensagem">${esc(kit.zap)}</textarea>
      <p class="nota">Mande para pessoas e grupos que você conhece. Disparo em massa é proibido.</p>
    </div>
    <div class="faixa faixa--solida videos">
      <div class="faixa__topo"><h3 class="rotulo">Do Radar da Virada, para compartilhar em ${esc(d.municipio)}</h3><span class="nota">recorte de ${radar.coletado_em.split("-").reverse().join("/")} · <a href="${radar.fonte}" target="_blank" rel="noopener">ver os mais recentes</a></span></div>
      <div class="grade">${kit.videos.map((v) => `<article class="cartao cartao--f${kit.k}"><p class="cartao__titulo">${esc(v.fonte)}</p><p class="cartao__sub">${esc(v.titulo)}</p><p class="cartao__pe"><span>${grande(v.views)} visualizações</span></p><p class="linha"><a class="pill pill--branco pill--p" href="${esc(v.url)}" target="_blank" rel="noopener">Assistir</a><a class="pill pill--acento pill--p" href="${linkWhats(`Pra quem é de ${d.municipio}: ${v.titulo} ${v.url}`)}" target="_blank" rel="noopener">Mandar no WhatsApp</a></p></article>`).join("")}</div>
      <p class="nota">Escolhidos pela frente que mais pesa na cidade e pelo assunto do vídeo acima. São links para conteúdo de terceiros, como o Radar da Virada lista: assista antes de mandar.</p>
    </div>`;

  await fontes();
  const cv = document.getElementById("reel"), tempo = document.getElementById("tempo"), relogio = document.getElementById("relogio");
  const bToca = document.getElementById("toca"), bPlay = document.getElementById("play"), estado = document.getElementById("estado-video");
  const fotoEstado = document.getElementById("foto-estado"), fotoCredito = document.getElementById("foto-credito");
  let reel = null, txtRoteiro = "";

  function avisoFoto() {
    if (IMG.semFoto) fotoEstado.textContent = "Vídeo sem foto de fundo.";
    else if (IMG.propria) fotoEstado.textContent = "Usando a foto que você enviou. Ponha o crédito abaixo.";
    else if (IMG.auto) fotoEstado.innerHTML = `Foto livre do Wikimedia Commons: <a href="${esc(IMG.auto.pagina)}" target="_blank" rel="noopener">${esc(IMG.auto.credito.replace(/^Foto: /, ""))}</a>`;
    else if (IMG.auto === false) fotoEstado.textContent = `Não achamos foto livre de ${d.municipio}. O vídeo usa o mapa; você pode enviar uma foto.`;
    else fotoEstado.textContent = `Procurando uma foto livre de ${d.municipio} no Wikimedia Commons…`;
    fotoCredito.hidden = !IMG.propria;
    fotoCredito.value = IMG.credito;
  }
  // monta (ou remonta) o vídeo com as imagens que já chegaram
  function atualizar(manterTempo = true) {
    const foto = IMG.semFoto ? null : IMG.propria || IMG.auto?.img || null;
    const credito = IMG.semFoto ? "" : IMG.propria ? (IMG.credito ? `Foto: ${IMG.credito}` : "") : IMG.auto?.credito || "";
    reel = montarReel({ ...kit.reel, foto, fotoCredito: credito, fotoPrefeito: IMG.prefeito }, M);
    const t = manterTempo && player && player.c === cv ? Math.min(player.t, reel.duracao) : reel.capaT;
    if (player && player.c === cv) { player.pausar(); player.reel = reel; player.ir(t); }
    else {
      player?.pausar();
      player = new Player(cv, reel, { escala: 0.5, aoMudar: (tt, dur, tocando) => {
        tempo.value = String(Math.round((tt / dur) * 1000));
        relogio.textContent = `${mmss(tt)} / ${mmss(dur)}`;
        bToca.textContent = tocando ? "Pausar" : "Tocar";
        bPlay.hidden = tocando;
      } });
      player.ir(t);
    }
    estado.textContent = `Vídeo vertical de ${Math.round(reel.duracao)} segundos, 1080 × 1920, sem som: escolha a música no Instagram ou no TikTok. Cada tela fica o tempo de ler com calma.`;
    desenharRoteiro();
  }
  function desenharRoteiro() {
    // telas seguidas da mesma parte viram um item só
    const itens = [];
    reel.cenas.forEach((c, i) => {
      const s = kit.reel.telas[i], ult = itens[itens.length - 1];
      const extra = { tela: kit.tela(s), fala: kit.fala(s), fonte: kit.fonteDe(s), links: kit.links[s.tipo] || [] };
      if (ult && ult.nome === s.nome) { ult.fim = c.ini + c.dur; ult.tela.push(extra.tela); ult.fala.push(extra.fala); ult.fonte.push(extra.fonte); ult.links.push(...extra.links); }
      else itens.push({ nome: s.nome, ini: c.ini, fim: c.ini + c.dur, tela: [extra.tela], fala: [extra.fala], fonte: [extra.fonte], links: [...extra.links] });
    });
    document.getElementById("duracao-roteiro").textContent = `${Math.round(reel.duracao)} segundos`;
    const fontesTxt = (b) => [...new Set(b.fonte.filter(Boolean))].join(" ");
    document.getElementById("roteiro").innerHTML = itens.map((b) => `<li><div class="tempo">${Math.floor(b.ini)}–${Math.round(b.fim)} s<small>${b.nome}</small></div><div><div class="tela">Na tela: ${esc(b.tela.join(" "))}</div><p class="fala">“${esc(b.fala.join(" "))}”</p><p class="fonte">${esc(fontesTxt(b))}${b.links.length ? " · " + b.links.slice(0, 3).map((f) => `<a href="${esc(f.u)}" target="_blank" rel="noopener">${esc(f.f)}</a>`).join(", ") : ""}</p></div></li>`).join("");
    txtRoteiro = itens.map((b) => `${Math.floor(b.ini)}–${Math.round(b.fim)} s · ${b.nome}\nNa tela: ${b.tela.join(" ")}\nFala: ${b.fala.join(" ")}\n${fontesTxt(b)}`).join("\n\n");
  }
  avisoFoto();
  atualizar(false);

  const alternar = () => (player.tocando ? player.pausar() : player.tocar());
  bToca.addEventListener("click", alternar);
  bPlay.addEventListener("click", alternar);
  cv.addEventListener("click", alternar);
  tempo.addEventListener("input", () => { const v = +tempo.value; player.tocando = false; player.ir((v / 1000) * reel.duracao); });

  // foto automática (uma busca por cidade)
  if (IMG.auto === null && !IMG.propria && !IMG.semFoto) {
    const pedido = d.ibge;
    fotoDaCidade(d).then((r) => {
      if (IMG.ibge !== pedido) return;
      IMG.auto = r || false;
      if (!document.body.contains(fotoEstado)) return;
      avisoFoto();
      if (r) atualizar();
    });
  }
  document.getElementById("foto-arquivo").addEventListener("change", async (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    try { IMG.propria = await carregarImagem(URL.createObjectURL(f), false); IMG.semFoto = false; avisoFoto(); atualizar(); }
    catch { fotoEstado.textContent = "Não deu para abrir essa imagem."; }
  });
  fotoCredito.addEventListener("input", () => { IMG.credito = fotoCredito.value.trim(); atualizar(); });
  document.getElementById("foto-tirar").addEventListener("click", () => { IMG.semFoto = true; IMG.propria = null; avisoFoto(); atualizar(); });
  if (kit.pref) {
    const credPref = document.getElementById("pref-credito");
    document.getElementById("pref-arquivo").addEventListener("change", async (e) => {
      const f = e.target.files?.[0]; if (!f) return;
      try { IMG.prefeito = await carregarImagem(URL.createObjectURL(f), false); montar(d, { ...escolha, creditoPrefeito: credPref.value.trim() }); } catch { /* imagem inválida */ }
    });
    credPref.addEventListener("change", () => montar(d, { ...escolha, creditoPrefeito: credPref.value.trim() }));
  }

  const bMp4 = document.getElementById("mp4");
  bMp4.addEventListener("click", async () => {
    bMp4.disabled = true;
    const txt = bMp4.textContent;
    player.pausar();
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

  el.querySelectorAll("[data-gancho]").forEach((b) => b.addEventListener("click", () => montar(d, { ...escolha, gancho: b.dataset.gancho })));
  el.querySelectorAll("[data-ataque]").forEach((b) => b.addEventListener("click", () => montar(d, { ...escolha, ataque: b.dataset.ataque })));
  el.querySelectorAll("[data-local]").forEach((b) => b.addEventListener("click", () => montar(d, { ...escolha, local: +b.dataset.local })));
  el.querySelectorAll("[data-bloco]").forEach((b) => b.addEventListener("click", () => {
    const id = b.dataset.bloco;
    montar(d, { ...escolha, blocos: { ...kit.blocos, [id]: !kit.blocos[id] } });
  }));
  document.getElementById("copia-roteiro").addEventListener("click", (e) => copiar(txtRoteiro, e.currentTarget));
  document.getElementById("copia-legenda").addEventListener("click", (e) => copiar(kit.legenda, e.currentTarget));
  document.getElementById("copia-zap").addEventListener("click", (e) => copiar(document.getElementById("zap").value, e.currentTarget));
}

// ---------------------------------------------------------------- início
const pedidoIbge = new URLSearchParams(location.search).get("ibge");
desenharLista();
const inicial = (pedidoIbge && porIbge.get(pedidoIbge)) || filtrados().find((d) => NOT[d.ibge] && d.porte === 2) || filtrados()[0];
escolher(inicial, false);
