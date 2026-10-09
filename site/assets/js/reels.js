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
// economia e pautas locais (pesquisa de 08/10): só para o painel de fatos, carrega em paralelo
const pLocais = json("data/locais.json").catch(() => ({}));
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
// cidades que pedem artigo ("no Rio de Janeiro")
const emCid = (cid) => (cid === "Rio de Janeiro" ? "No Rio de Janeiro" : `Em ${cid}`);

// ---------------------------------------------------------------- o que Lula fez, por assunto
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
  alfabetizacao: { frase: "Com Lula, o MEC criou o Compromisso Criança Alfabetizada: ler e escrever *na idade certa.*", fonte: "Ministério da Educação, Compromisso Nacional Criança Alfabetizada (2023)." },
  emprego: { frase: "Com Lula, quem ganha até R$ 5 mil *não paga mais Imposto de Renda.*", fonte: "Lei de 2025 que isenta do IR até R$ 5 mil." },
  moradia: { frase: "Com Lula, o Minha Casa Minha Vida *voltou a entregar casa.*", fonte: "Ministério das Cidades, Minha Casa Minha Vida." },
  energia: { frase: "Com Lula, o Luz para Todos voltou a levar *energia a quem não tinha.*", fonte: "Ministério de Minas e Energia, Luz para Todos." },
  agricultura: { frase: "Com Lula, a merenda *compra de quem planta aqui* e o Pronaf financia a roça.", fonte: "FNDE (merenda escolar) e Pronaf." },
  cultura: { frase: "Com Lula, a Lei Aldir Blanc manda *dinheiro para a cultura* das cidades.", fonte: "Ministério da Cultura, Política Nacional Aldir Blanc." },
  renda: { frase: "Com Lula, o Bolsa Família voltou: *R$ 600 por família* e mais R$ 150 por criança.", fonte: "Ministério do Desenvolvimento Social, Bolsa Família." },
  fome: { frase: "Com Lula, o Brasil saiu de novo do *Mapa da Fome* da ONU.", fonte: "FAO/ONU, relatório SOFI 2025." },
  salario: { frase: "Com Lula, o salário mínimo voltou a *subir acima da inflação.*", fonte: "Política de valorização do salário mínimo." },
};
// o assunto do vídeo em poucas palavras (para o "fio" do kit)
const ASSUNTO_FIO = { saude: "saúde", farmacia: "remédio", agua: "água", agua_sertao: "água no sertão", desastre: "estrago do tempo", chuva: "enchente",
  obra: "obra", creche: "escola", educacao: "escola", alfabetizacao: "alfabetização", emprego: "trabalho e renda", moradia: "moradia", energia: "energia",
  agricultura: "roça", cultura: "cultura", renda: "renda das famílias", fome: "fome", salario: "aposentadoria e salário mínimo" };
// semiárido: o Garantia-Safra só paga na área da Sudene, então quem recebeu em 2025 está no sertão
const sertao = (d) => d.safra > 0;
const NORTE = new Set(["AC", "AM", "AP", "PA", "RO", "RR", "TO"]);
const CHUVA = /chuva|enchente|alag|enxurr|cheia|inunda/;
const SECA = /\bseca\b|estiagem|falta de chuva|sem chuva|escassez h[ií]drica|crise h[ií]drica/;
const DESASTRE = /temporal|granizo|vendaval|tempestade|ventania|ciclone|tornado|desliza|desabrig|desalojad|deixaram suas casas|estragos?\b|tempo extremo|destelha|barragem/;
const AGUA = /adutora|abastecimento|po[cç]os? artesian|cisterna|[aá]gua tratada|(carro|caminh[aã]o|caminh[oõ]es)-pipa/;
const ROCA = /\bleit(e|eiro|eira)\b|queijo|\bsafra|lavoura|\bro[cç]a\b|rebanho|\bgado\b|produtor(es)? rura|agricultor|agricultura familiar|feira livre|\bpaa\b|aquisi[cç][aã]o de alimentos|microcr[eé]dito rural|agroamigo|quinta(l|is)/;
function programaPara(n, k, d) {
  const te = n?.te, txt = n ? `${n.r} ${n.g}`.toLowerCase() : "";
  const agua = /esgoto|saneamento/.test(txt) || !sertao(d) ? "agua" : "agua_sertao";
  if (!n) return null;
  if (/farm[aá]cia|rem[eé]dio/.test(n.g.toLowerCase()) || (te !== "saude" && /farm[aá]cia|rem[eé]dio/.test(txt))) return "farmacia";
  if (te === "saude") return "saude";
  if (/\bfome\b|cozinhas? comunit|seguran[cç]a alimentar|cestas? b[aá]sicas?|refei[cç][oõ]es gratuitas|restaurante popular/.test(txt)) return "fome";
  // gente indo embora da cidade: o assunto é trabalho
  if (/perdeu .{0,24}(moradores|habitantes|popula[cç][aã]o)|[eê]xodo/.test(txt)) return "emprego";
  if (/creche|educa[cç][aã]o infantil/.test(txt)) return "creche";
  // alfabetização e Ideb dos anos iniciais: o programa federal de alfabetização
  if (/alfabetiz/.test(txt) || (/ideb/.test(txt) && /anos iniciais/.test(txt))) return "alfabetizacao";
  // escola sendo construída ou reformada: a frase de creche e escola do Novo PAC, não o Pé-de-Meia
  if (te === "educacao" && /(constru|reform|amplia|nova|novas)\w* (de )?(uma |duas |\d+ )?escolas?|escolas? (nova|novas)\b/.test(txt)) return "creche";
  if (te === "agua") return agua;
  if (te === "clima") {
    // na Amazônia, cheia e seca isolam a cidade: o que chega é socorro da Defesa Civil
    if (DESASTRE.test(txt) || NORTE.has(d.uf)) return "desastre";
    // seca antes de chuva: "falta de chuvas" é seca, e o que resolve é água, não drenagem
    if (SECA.test(txt)) return sertao(d) ? agua : "agricultura";
    if (CHUVA.test(txt)) return "chuva";
    return agua;
  }
  if (te === "estrada" || te === "obra" || te === "transporte") {
    // ponte que caiu ou estrada destruída pela chuva: é socorro e reconstrução (Defesa Civil), não drenagem
    // (barragem aqui é obra, não rompimento: fica de fora)
    if (/temporal|granizo|vendaval|tempestade|ciclone|tornado|desliza|desabrig|desalojad/.test(txt) || (CHUVA.test(txt) && /desab|destru|ilhad|arrast|rompe|cedeu|cratera|caiu|recupera|reconstr/.test(txt))) return "desastre";
    return CHUVA.test(txt) ? "chuva" : AGUA.test(txt) ? agua : "obra";
  }
  if (["educacao", "moradia", "energia", "agricultura"].includes(te)) return te;
  if (te === "emprego" || te === "economia") {
    if (ROCA.test(txt)) return "agricultura";
    // dinheiro da União para a prefeitura investir: é obra
    if (/(garantia|aval) da uni[aã]o|(conv[eê]nio|recursos?|verbas?|emendas?) federa|governo federal/.test(txt)) return "obra";
    return "emprego";
  }
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
  if (te === "cultura") return "cultura";
  // sem assunto que ligue a um programa: quem chama decide (o perfil da cidade)
  return null;
}
// sem notícia (ou notícia sem assunto federal): o assunto que mais pesa no perfil da cidade
function perfilPrograma(d, k) {
  if (d.idosos >= 20 && d.bpc > 0) return "salario";
  if (k === 2 && d.bf > 0) return "renda";
  if (d.urbana >= 75) return "emprego";
  return d.bf > 0 ? "renda" : "salario";
}
// o dinheiro federal que chega na cidade, só quando é do mesmo programa do assunto (Portal da Transparência)
function dinheiroPara(prog, d) {
  const cid = d.municipio, PT = "Portal da Transparência (CGU)";
  if ((prog === "educacao" || prog === "creche") && d.pdm > 0) return { numero: curto(d.pdm), texto: `do Pé-de-Meia para estudantes de ${cid} em 2026.`, fonte: `${PT}, Pé-de-Meia, janeiro a agosto de 2026.`, de: "pdm" };
  // abaixo de R$ 50 mil o Garantia-Safra é número pequeno demais para tela (mesmo corte da página da cidade)
  if (["agricultura", "agua_sertao", "desastre"].includes(prog) && d.safra >= 50) return { numero: curto(d.safra), texto: `do Garantia-Safra para agricultores de ${cid} em 2025.`, fonte: `${PT}, Garantia-Safra 2025.`, de: "safra" };
  if ((prog === "renda" || prog === "fome") && d.bf > 0) return { numero: curto(d.bf), texto: `do Bolsa Família chegam a ${cid} todo mês.`, fonte: `${PT}, agosto de 2026.`, de: "bf" };
  if (prog === "salario" && d.bpc > 0) return { numero: curto(d.bpc), texto: `do BPC, um salário mínimo por pessoa, chegam a ${cid} todo mês.`, fonte: `${PT}, agosto de 2026.`, de: "bpc" };
  return null;
}

// ---------------------------------------------------------------- o contraste: o que Flávio diz ou planeja, no mesmo assunto (com fonte)
const ATAQUES = {
  corte: {
    nome: "Corte de gastos", verbo: "planeja",
    ataque: ["O plano de Flávio prevê *cortar R$ 190 bilhões* em gastos do governo.", "A equipe de Flávio planeja *cortar R$ 190 bilhões* em gastos do governo."],
    sub: "Corte desse tamanho sai de algum lugar.",
    // a pergunta volta ao assunto do vídeo: é pergunta, não afirmação sobre onde o corte cai
    soco: (d, jaMostrou, prog) => com(variar(SOCO_CORTE[prog] || ["Em {cid}, quem *paga a conta?*", "Quem vai pagar essa conta em *{cid}?*"], d.ibge, "corte"), d.municipio),
    fonte: "Gazeta do Povo, com Daniella Marques, da campanha de Flávio.",
    tema: "bolso", links: ["d3cc21"], radar: ["bolso", "propostas", "direitos", "saude"],
  },
  bolso: {
    nome: "Aposentadoria e BPC", verbo: "planeja",
    ataque: "A equipe dele planejou *desligar a aposentadoria e o BPC* do aumento real do salário mínimo.",
    sub: "Em público, ele promete aumento. Mas não diz se mantém a regra.",
    // se o valor do BPC já apareceu na tela de Lula, o soco não repete o número
    soco: (d, jaMostrou) => (d.bpc > 0 && !jaMostrou ? `Em ${d.municipio}, o BPC soma *${curto(d.bpc)} por mês.*` : `Quem perde é quem mora em *${d.municipio}.*`),
    fonte: "Folha de S.Paulo, Gazeta do Povo e Poder360. A campanha de Flávio nega o plano.",
    tema: "bolso", links: ["140578", "fbccaa", "d3cc21"], radar: ["bolso", "idosos", "direitos", "saude"],
  },
  "6x1": {
    nome: "Escala 6x1", verbo: "diz",
    ataque: "Perguntado sobre o fim da escala 6x1, Flávio disse que mais folga *“não adianta”*.",
    sub: "A proposta em votação dá dois dias de descanso sem cortar salário.",
    soco: () => "Quem trabalha 6 por 1 sabe de que lado *ficar.*",
    fonte: "O Globo e g1, outubro de 2026.",
    nota: "A frase inteira, no O Globo: mais folga “não adianta” com trabalhador endividado. Tenha a matéria à mão se alguém perguntar.",
    tema: "6x1", links: ["a0ab2b"], radar: ["6x1", "trabalho"],
  },
  constituicao: {
    nome: "Democracia", verbo: "diz",
    ataque: "Flávio quer mudar a Constituição e *mexer no Judiciário.*",
    sub: "Diz que o Brasil não vive uma democracia plena e deixou em aberto aumentar o mandato.",
    soco: () => "Com as regras do jogo não se *brinca.*",
    fonte: "Jornal de Brasília, 6 e 7 de outubro de 2026.",
    tema: "constituicao", links: ["753fc6", "016734"], radar: ["constituicao", "democracia", "direita", "renan", "cury_renan"],
  },
};
const SOCO_CORTE = {
  saude: ["A saúde de {cid} *entra nessa conta?*"], farmacia: ["O remédio de graça *entra nessa conta?*"],
  agua: ["A água de {cid} *entra nessa conta?*"], agua_sertao: ["A água do sertão *entra nessa conta?*"],
  desastre: ["O socorro a {cid} *entra nessa conta?*"], chuva: ["A obra contra enchente *entra nessa conta?*"],
  obra: ["A obra de {cid} *entra nessa conta?*"], creche: ["A escola de {cid} *entra nessa conta?*"], educacao: ["A escola de {cid} *entra nessa conta?*"],
  alfabetizacao: ["A escola de {cid} *entra nessa conta?*"], moradia: ["A casa própria *entra nessa conta?*"], energia: ["A luz de quem não tinha *entra nessa conta?*"],
  agricultura: ["Quem planta em {cid} *entra nessa conta?*"], cultura: ["A cultura de {cid} *entra nessa conta?*"], fome: ["O prato de comida *entra nessa conta?*"],
};
// cada assunto puxa o contraste do mesmo campo: serviço público com o corte de gastos, renda com a aposentadoria, trabalho com a 6x1
const CONTRASTE = { emprego: "6x1", renda: "bolso", salario: "bolso" };
const contrastePara = (prog) => CONTRASTE[prog] || "corte";
const textoAtaque = (a, d) => (Array.isArray(a.ataque) ? variar(a.ataque, d.ibge, "ataque") : a.ataque);
// o assunto de um fato da prefeitura do PL: puxa o contraste e o que Lula fez no mesmo campo
function assuntoPL(f) {
  const t = `${f.t} ${f.f || ""}`.toLowerCase();
  if (/sal[aá]rio|subs[ií]dio|aposentad|previd|rpps|\binss\b/.test(t)) return { prog: "salario", atq: "bolso" };
  if (/justi[cç]a eleitoral|eleitoral|compra de votos?|abuso de poder|ineleg/.test(t)) return { prog: null, atq: "constituicao" };
  if (/hospital|sa[uú]de|\bupa\b|posto|m[eé]dic|rem[eé]dio/.test(t)) return { prog: "saude", atq: "corte" };
  if (/escola|educa|fundeb|merenda|creche|livros?\b/.test(t)) return { prog: "educacao", atq: "corte" };
  if (/[aá]gua|esgoto|saneamento/.test(t)) return { prog: "agua", atq: "corte" };
  if (/obras?\b|asfalto|estrada|\bruas?\b|pavimenta|ponte|lixo|limpeza/.test(t)) return { prog: "obra", atq: "corte" };
  // corrupção sem um serviço no meio: quem investiga e julga são as instituições que Flávio quer mudar
  return { prog: null, atq: "constituicao" };
}
const FEDERAL = /federal|novo pac|\bpac\b|codevasf|bndes|\bdnit\b|\bpaa\b|aquisi[cç][aã]o de alimentos|minist[eé]rio|\buni[aã]o\b|mais m[eé]dicos|p[eé]-de-meia|farm[aá]cia popular|minha casa|luz para todos|aldir blanc|defesa civil nacional|banco do nordeste|agroamigo|pronaf|\bbnb\b/i;
// "Polícia Federal", "Justiça Federal" e "Ministério Público" não são dinheiro do governo federal
const temFederal = (s) => FEDERAL.test(String(s).replace(/pol[ií]cia federal|justi[cç]a federal|tribunal regional federal|minist[eé]rio p[uú]blico( federal)?/gi, ""));

// ---------------------------------------------------------------- a ponte: por que a notícia da cidade tem a ver com a eleição
// p = problema, c = conquista ou neutro. Com dinheiro federal na notícia, a ponte diz isso.
const PONTE = {
  saude: { p: ["Saúde de cidade pequena *depende de Brasília.*", "Hospital do interior precisa de *verba federal.*"], c: ["Saúde perto de casa *muda a vida* de quem mora aqui."] },
  farmacia: { p: ["Remédio caro *pesa no bolso* todo mês."], c: ["Remédio de graça *alivia o bolso* todo mês."] },
  agua: { p: ["Obra de água é obra grande. *Precisa de Brasília.*"], c: ["Água tratada é saúde. E obra de água *precisa de Brasília.*"] },
  agua_sertao: { p: ["No sertão, água é *questão de sobrevivência.*"], c: ["No sertão, cada adutora *muda uma vida.*"] },
  desastre: { p: ["Depois do estrago, cidade pequena *não se vira sozinha.*"], c: ["Depois do estrago, cidade pequena *não se vira sozinha.*"] },
  chuva: { p: ["Contra enchente, precisa de obra que a *prefeitura sozinha não paga.*"], c: ["Contra enchente, precisa de obra que a *prefeitura sozinha não paga.*"] },
  obra: { p: ["Obra assim, cidade pequena *não paga sozinha.*"], c: ["Obra assim, cidade pequena *não paga sozinha.*", "Obra que chega é *emprego e dignidade.*"] },
  creche: { p: ["Escola boa é o que muda o *futuro de uma cidade.*"], c: ["Escola boa é o que muda o *futuro de uma cidade.*"] },
  educacao: { p: ["Escola boa é o que muda o *futuro de uma cidade.*"], c: ["{cid} mostra que escola pública *funciona.*", "Escola boa é o que muda o *futuro de uma cidade.*"] },
  alfabetizacao: { p: ["Criança que lê na idade certa *vai mais longe.*"], c: ["{cid} mostra que escola pública *funciona.*"] },
  emprego: { p: ["Emprego é o que *segura a família* na cidade."], c: ["Emprego é o que *segura a família* na cidade."] },
  moradia: { p: ["Casa própria é o sonho de *muita família daqui.*"], c: ["Casa própria é o sonho de *muita família daqui.*"] },
  energia: { p: ["Sem luz, não tem *geladeira, escola nem trabalho.*"], c: ["Sem luz, não tem *geladeira, escola nem trabalho.*"] },
  agricultura: { p: ["Aqui, quem planta é quem *sustenta a cidade.*"], c: ["Aqui, quem planta é quem *sustenta a cidade.*"] },
  cultura: { p: ["Cultura e turismo também são *dinheiro girando na cidade.*"], c: ["Cultura e turismo também são *dinheiro girando na cidade.*"] },
  renda: { p: ["Cada real que chega aqui *gira no comércio da cidade.*"], c: ["Cada real que chega aqui *gira no comércio da cidade.*"] },
  fome: { p: ["Ninguém deveria passar *fome* em {cid}."], c: ["Comida no prato é o *mínimo.*"] },
  salario: { p: ["Aposentadoria e BPC sustentam *muita família daqui.*"], c: ["Aposentadoria e BPC sustentam *muita família daqui.*"] },
};
const PONTE_GERAL = ["{cid} merece governo que *olhe para cá.*", "O que acontece em {cid} importa para o *Brasil inteiro.*"];
const PONTE_FEDERAL = ["Isso tem dinheiro do *governo federal.*", "Isso tem a mão do *governo Lula.*"];
const PONTE_PL = ["Agora o PL quer governar o *Brasil inteiro.*", "E agora o PL quer o *Brasil.*"];
// sem notícia: a virada vem da frente que mais rende na cidade
const PONTE_DADO = {
  1: ["Tem coisa que voltou e não pode *ir embora de novo.*", "{cid} já sabe como era *antes.*"],
  2: ["Aqui, Lula ganha. Mas só se a gente *for votar.*", "Cada uma delas pode *virar a eleição.*"],
  3: ["Não é sobre gostar do Lula. É sobre o que está *em jogo.*", "No 2º turno, a escolha é entre *dois caminhos.*"],
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
const SOCO_PL = ["É esse o jeito do PL de *governar?*", "Quer isso no Brasil *inteiro?*"];

// ---------------------------------------------------------------- composição do kit
// Cada vídeo segue um fio só, no mesmo assunto do começo ao fim:
//   notícia da cidade → por que importa → o que Lula fez nisso → o que Flávio diz ou planeja nisso → o que está em jogo aqui → chamada
//   fato da prefeitura do PL → quem governa (é do PL) → agora o PL quer o Brasil → o plano do candidato do PL → o que Lula fez → chamada
//   dado da cidade (sem notícia) → a virada da frente → o que Lula fez → o contraste → chamada
// escolha: { gancho: "n0" (notícia), "pl" (fato da prefeitura do PL) ou "dado", ataque, local: índice do fato da prefeitura,
//            blocos: {lula, flavio, local, numero} }
function compor(d, escolha = {}) {
  const k = d.gTot < 30 ? (d.areaLula ? 2 : 1) : d.principal;
  const [cor, corClara, corTexto, nomeFrente] = COR[k];
  const cid = d.municipio, sem = d.ibge;
  const noticias = NOT[d.ibge] || [];
  const pref = PREF[d.ibge] || null;
  const fatoPL = pref ? pref.i[escolha.local ?? 0] || pref.i[0] : null;
  // abre com a primeira notícia que tem assunto ligado a um programa; sem ela, o fato da prefeitura do PL; depois, qualquer notícia
  const iBoa = noticias.findIndex((x) => programaPara(x, k, d));
  const ganchoId = escolha.gancho || (iBoa >= 0 ? `n${iBoa}` : fatoPL ? "pl" : noticias.length ? "n0" : "dado");
  const n = ganchoId.startsWith("n") ? noticias[+ganchoId.slice(1)] || null : null;
  const ganchoPL = ganchoId === "pl" && !!fatoPL;
  const arco = n ? "noticia" : ganchoPL ? "pl" : "dado";

  // o assunto puxa o que Lula fez e o contraste com Flávio
  const aPL = ganchoPL ? assuntoPL(fatoPL) : null;
  const progN = n ? programaPara(n, k, d) : null;
  const progId = progN || aPL?.prog || perfilPrograma(d, k);
  const atqSugerido = aPL ? aPL.atq : arco === "dado" && k === 3 ? "constituicao" : contrastePara(progId);
  const atqId = ATAQUES[escolha.ataque] ? escolha.ataque : atqSugerido;
  const atq = ATAQUES[atqId];
  const prog = PROGRAMAS[progId];
  const din = dinheiroPara(progId, d);
  const assunto = atqSugerido === "constituicao" && !progN ? "democracia" : ASSUNTO_FIO[progId];

  // 1. gancho: a notícia da cidade, o fato da prefeitura do PL ou um dado da cidade
  let gancho, ganchoFonte, ganchoDado = null;
  if (n) { gancho = n.g; ganchoFonte = `Fonte: ${n.v}${n.d ? `, ${dataCurta(n.d)}` : ""}.`; }
  else if (ganchoPL) { gancho = `Em ${cid}, ${fatoPL.t[0].toLowerCase()}${fatoPL.t.slice(1)}`; ganchoFonte = `Fonte: ${fatoPL.v}, ${dataCurta(fatoPL.d)}.`; }
  else if (k === 2) { gancho = `${cid}: *${n0(d.ausentes_26)} pessoas* não votaram no 1º turno.`; ganchoFonte = "Fonte: TSE, 1º turno de 2026."; ganchoDado = "numero"; }
  else if (k === 3) { gancho = `${emCid(cid)}, *${pct(d.terceiros_26_pct, 0)}* votaram em Caiado, Renan, Cury ou Zema.`; ganchoFonte = "Fonte: TSE, 1º turno de 2026."; ganchoDado = "numero"; }
  else if (d.parcela22 > 0.5) { gancho = `Em 2022, *${pct(d.parcela22 * 100, 0)}* dos votos de ${cid} entre Lula e Bolsonaro foram para Lula.`; ganchoFonte = "Fonte: TSE, 1º turno de 2022."; ganchoDado = "numero"; }
  else { gancho = `${emCid(cid)}, cada voto que volta para Lula *conta dobrado.*`; ganchoFonte = "Um voto a menos para Flávio e um a mais para Lula. Fonte: TSE, 1º turno de 2026."; }

  // 2. a ponte
  let ponte;
  if (n) {
    const federal = n.to === "conquista" && temFederal(`${n.r} ${n.g}`);
    ponte = federal ? variar(PONTE_FEDERAL, sem, "ponte") : !progN ? variar(PONTE_GERAL, sem, "ponte") : variar((PONTE[progId] || PONTE.obra)[n.to === "problema" ? "p" : "c"], sem, "ponte");
  } else ponte = variar(ganchoPL ? PONTE_PL : PONTE_DADO[k], sem, "ponte");
  ponte = com(ponte, cid);

  // o número da cidade (voto), opcional no fim
  let numero = null;
  if (k === 2) numero = { numero: n0(d.ausentes_26), texto: `pessoas de ${cid} não votaram no 1º turno.`, emocao: variar(EMOCAO[2], sem, "emocao"), fonte: "Fonte: TSE, 1º turno de 2026." };
  else if (k === 3) numero = { numero: pct(d.terceiros_26_pct, 0), texto: `de ${cid} votou em Caiado, Renan, Cury ou Zema no 1º turno.`, emocao: variar(EMOCAO[3], sem, "emocao"), fonte: "Fonte: TSE, 1º turno de 2026." };
  else if (d.parcela22 > 0.5) numero = { numero: pct(d.parcela22 * 100, 0), texto: `dos votos dados a Lula ou Bolsonaro em ${cid} foram para Lula em 2022.`, emocao: `Agora, contra Flávio, são ${pct(d.parcela26 * 100, 0)}. Dá para *voltar.*`, fonte: "Fonte: TSE, 1º turnos de 2022 e 2026." };

  // partes do vídeo (o usuário liga e desliga). Quando o fio é a democracia, o vídeo fecha nela, sem a tela de programa.
  const b = escolha.blocos || {};
  const blocos = {
    lula: b.lula ?? atqSugerido !== "constituicao",
    flavio: b.flavio ?? true,
    local: !!fatoPL && (b.local ?? true),
    numero: !!numero && ganchoDado !== "numero" && (b.numero ?? !fatoPL),
  };

  const topo = com(variar(CHAMADA[k].topo, sem, "topo"), cid);
  const acao = variar(CHAMADA[k].acao, sem, "acao");
  const quem = pref ? `${pref.g === "a" ? "A prefeita" : "O prefeito"} ${pref.pc ? "é do" : `foi eleit${pref.g === "a" ? "a" : "o"} pelo`} *PL*, o partido de Flávio.` : "";
  const socoPL = variar(SOCO_PL, sem, "pl");
  const nomeGancho = n ? "A notícia" : ganchoPL ? "O fato da prefeitura" : "O dado da cidade";
  const nomeAtaque = `O que Flávio ${atq.verbo}`;
  const proposta = { tipo: "proposta", texto: prog.frase, numero: din?.numero, numeroTexto: din?.texto, fonte: `Fonte: ${prog.fonte}${din ? ` ${din.fonte}` : ""}`, nome: "O que Lula fez" };
  const jaMostrouBPC = blocos.lula && din?.de === "bpc";
  const ataques = [
    { tipo: "ataque", titulo: ganchoPL ? "E o candidato do PL?" : "E o Flávio?", texto: textoAtaque(atq, d), fonte: `Fontes: ${atq.fonte}`, nome: nomeAtaque },
    { tipo: "ataque2", texto: atq.sub, soco: atq.soco(d, jaMostrouBPC, progId), fonte: atqId === "bolso" && d.bpc > 0 && !jaMostrouBPC ? "Valor do BPC: Portal da Transparência (CGU), agosto de 2026." : "", nome: nomeAtaque },
  ];
  const localTelas = !fatoPL || ganchoPL ? [] : [
    { tipo: "local", titulo: `E aqui em ${cid}?`, quem, soco: "", legendaFoto: escolha.creditoPrefeito || "", nome: "A prefeitura do PL" },
    { tipo: "local2", texto: fatoPL.t, status: fatoPL.e, soco: socoPL, fonte: `Fonte: ${fatoPL.v}, ${dataCurta(fatoPL.d)}.`, nome: "A prefeitura do PL" },
  ];

  const telas = [{ tipo: "gancho", texto: gancho, status: ganchoPL ? fatoPL.e : "", fonte: ganchoFonte, nome: nomeGancho }];
  if (ganchoPL) {
    // o fato abre; em seguida, quem governa e a pergunta; depois o PL nacional
    telas.push({ tipo: "local", titulo: `E quem governa ${cid}?`, quem, soco: "É esse o jeito do PL de *governar?*", legendaFoto: escolha.creditoPrefeito || "", nome: "Quem governa" });
    telas.push({ tipo: "frase", texto: ponte, nome: "O PL quer o Brasil" });
    if (blocos.flavio) telas.push(...ataques);
    if (blocos.lula) telas.push(proposta);
  } else {
    telas.push({ tipo: "frase", texto: ponte, nome: n ? "Por que importa" : "A virada" });
    // na democracia (eleitor de terceiros) o contraste vem antes; nos outros fios, primeiro o que Lula fez
    if (atqId === "constituicao") { if (blocos.flavio) telas.push(...ataques); if (blocos.lula) telas.push(proposta); }
    else { if (blocos.lula) telas.push(proposta); if (blocos.flavio) telas.push(...ataques); }
    if (blocos.local) telas.push(...localTelas);
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
    ataque: `${s.titulo} ${limpo(s.texto)}`,
    ataque2: `${limpo(s.texto)} ${limpo(s.soco)}`,
    local: `${limpo(s.titulo)} ${limpo(s.quem)}${s.soco ? ` ${limpo(s.soco)}` : ""}`,
    local2: `${limpo(s.texto)} ${limpo(s.status)} ${limpo(s.soco)}`,
    numero: `${s.numero} ${limpo(s.texto)} ${limpo(s.emocao)}`,
    chamada: `${s.topo} Dia 25, é 13. ${s.acao}`,
  })[s.tipo];
  const tela = (s) => ({
    gancho: `${limpo(s.texto)}${s.status ? ` ${s.status}` : ""}`, frase: limpo(s.texto), proposta: limpo(s.texto) + (s.numero ? ` ${s.numero} ${limpo(s.numeroTexto)}` : ""),
    ataque: `${s.titulo} ${limpo(s.texto)}`, ataque2: `${limpo(s.texto)} ${limpo(s.soco)}`, local: `${s.titulo} ${limpo(s.quem)}${s.soco ? ` ${limpo(s.soco)}` : ""}`,
    local2: `${limpo(s.texto)} ${limpo(s.status)}`, numero: `${s.numero} ${limpo(s.texto)}`, chamada: `${s.topo} Dia 25, é 13.`,
  })[s.tipo];
  const fonteDe = (s) => (s.tipo === "chamada" ? "Domingo, 25/10, das 8h às 17h (horário de Brasília)." : limpo(s.fonte || ""));
  const linksAtaque = (TEMAS[atq.tema]?.fontes || []).filter((f) => !atq.links || atq.links.includes(f.id)).map((f) => ({ f: f.f, u: f.u }));
  const links = {
    gancho: n ? [{ f: n.v, u: n.u }] : ganchoPL ? [{ f: fatoPL.v, u: fatoPL.u }] : [],
    ataque: linksAtaque,
    local2: fatoPL && !ganchoPL ? [{ f: fatoPL.v, u: fatoPL.u }] : [],
  };

  // legenda e mensagem seguem o mesmo fio das telas
  const tag = "#" + semAcento(cid).replace(/[^a-z0-9]/g, "");
  const corpo = telas.filter((s) => s.tipo !== "chamada").map((s) => tela(s));
  const temLula = telas.some((s) => s.tipo === "proposta"), temFlavio = telas.some((s) => s.tipo === "ataque");
  const temPL = telas.some((s) => s.tipo === "local" || s.tipo === "local2");
  const fontes = [n?.v, temLula && prog.fonte.split(",")[0], temLula && din && "Portal da Transparência", temFlavio && atq.fonte.split(".")[0], temPL && fatoPL.v].filter(Boolean);
  const legenda = `${corpo.join(" ")} ${topo} Dia 25, é 13. Fontes: ${[...new Set(fontes)].join("; ")}. Feito com auxílio de IA. ${tag} #2ºturno #vote13`;
  const urlCidade = new URL(`${RAIZ}cidade/?ibge=${d.ibge}`, location.href).href;
  const comFonte = (s) => {
    const t = tela(s);
    if (s.tipo === "gancho" && (n || ganchoPL)) return `${t} (${n ? n.v : fatoPL.v})`;
    if (s.tipo === "ataque") return `${t} (${atq.fonte.split(".")[0]})`;
    if (s.tipo === "local2") return `${t} (${fatoPL.v})`;
    return t;
  };
  const zap = [`*${cid}, isso é com a gente*`, ...telas.filter((s) => s.tipo !== "chamada").map(comFonte), `${topo} Dia 25, é 13.`, `Os números da cidade: ${urlCidade}`].join("\n");

  const fio = { arco, assunto, passos: [...new Set(telas.map((s) => s.nome))] };
  return { k, nomeFrente, cor, corTexto, n, noticias, ganchoId, ganchoPL, atq, atqId, atqSugerido, prog, progId, din, pref, fatoPL, blocos, numero, reel, fala, tela, fonteDe, links, legenda, zap, fio };
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

// ---------------------------------------------------------------- temas que viram voto (Radar da Virada), na ordem do que mais pesa na cidade
// O Radar só lista temas com efeito comprovado em pesquisa. Aqui cada tema ganha o motivo de pesar nesta cidade, com o dado e a fonte.
const mediana = (f) => { const v = D.map(f).filter((x) => x > 0 && isFinite(x)).sort((a, b) => a - b); return v.length ? v[Math.floor(v.length / 2)] : 1; };
const MED = { idosos: mediana((x) => x.idosos), urbana: mediana((x) => x.urbana), terceiros: mediana((x) => x.terceiros_26_pct), bpc: mediana((x) => (x.pop ? x.bpc / x.pop : 0)) };
const CARTOES = [
  { id: "bolso", ataques: ["bolso", "corte"], tags: ["bolso", "idosos", "direitos", "saude", "propostas"],
    peso: (d) => ((d.idosos || 0) / MED.idosos + (d.pop ? d.bpc / d.pop / MED.bpc : 0)) / 2,
    aqui: (d) => `${pct(d.idosos, 0)} do eleitorado tem 60 anos ou mais${d.bpc > 0 ? `, e o BPC soma ${reais(d.bpc)} por mês` : ""}.`,
    fonteAqui: "TSE, perfil do eleitorado 2026; Portal da Transparência (CGU), agosto de 2026.",
    extra: "O plano de Flávio também prevê cortar R$ 190 bilhões em gastos do governo, segundo Daniella Marques, da campanha (Gazeta do Povo).",
    zap: (t, d, aqui) => `*${t.titulo}*\n${t.prova.num} ${t.prova.txt} (${t.prova.f})\nFlávio promete aumento ao aposentado, mas a equipe dele planejou desligar a aposentadoria e o BPC do aumento real do salário mínimo (Folha; a campanha nega). O plano dele também prevê cortar R$ 190 bilhões em gastos do governo (Gazeta do Povo).\nEm ${d.municipio}, ${aqui}\nDia 25, é 13.` },
  { id: "6x1", ataques: ["6x1"], tags: ["6x1", "trabalho"],
    peso: (d) => (d.urbana || 0) / MED.urbana,
    aqui: (d) => `${pct(d.urbana, 0)} da população vive na área urbana${d.jovens ? `, e ${pct(d.jovens, 0)} do eleitorado tem de 16 a 24 anos` : ""}.`,
    fonteAqui: "IBGE, Censo 2022; TSE, perfil do eleitorado 2026.",
    zap: (t, d, aqui) => `*${t.titulo}*\n${t.prova.num} ${t.prova.txt} (${t.prova.f})\nPerguntado sobre o fim da 6x1, Flávio disse que mais folga “não adianta” (O Globo).\nA proposta em votação dá dois dias de descanso sem cortar salário.\nEm ${d.municipio}, ${aqui}\nQuem trabalha 6 por 1 sabe de que lado ficar. Dia 25, é 13.` },
  { id: "constituicao", ataques: ["constituicao"], tags: ["constituicao", "democracia", "direita", "renan", "cury_renan"],
    peso: (d) => (d.terceiros_26_pct || 0) / MED.terceiros,
    aqui: (d) => `${pct(d.terceiros_26_pct, 0)} dos votos válidos foram para Caiado, Renan, Cury ou Zema no 1º turno.`,
    fonteAqui: "TSE, 1º turno de 2026.",
    zap: (t, d, aqui) => `*${t.titulo}*\n${t.prova.num} ${t.prova.txt} (${t.prova.f})\nFlávio diz que o Brasil não vive uma democracia plena e quer mudar a Constituição, até o tamanho do mandato (Jornal de Brasília).\nEm ${d.municipio}, ${aqui}\nCom as regras do jogo não se brinca. Dia 25, é 13.` },
];
const minusc = (s) => s[0].toLowerCase() + s.slice(1);
function painelTemas(d, kit) {
  const letra = ["", "r", "m", "t"][kit.k];
  const cartoes = CARTOES.map((c) => ({ c, t: TEMAS[c.id], p: c.peso(d) })).filter((x) => x.t).sort((a, b) => b.p - a.p);
  const textos = {};
  const html = cartoes.map(({ c, t }) => {
    const aqui = c.aqui(d);
    const usa = c.ataques.includes(kit.atqId) && kit.blocos.flavio;
    const videos = radar.videos.filter((v) => c.tags.includes(v.tema))
      .map((v) => ({ ...v, nota: (v.frentes.includes(letra) ? 1 : 0) + Math.log10(v.views) })).sort((a, b) => b.nota - a.nota).slice(0, 2);
    const zap = c.zap(t, d, minusc(aqui));
    textos[c.id] = zap;
    const fontes = t.fontes.map((f) => `<a href="${esc(f.u)}" target="_blank" rel="noopener">${esc(f.f)}</a>`).join(", ");
    return `<article class="tema${usa ? " tema--usado" : ""}">
      <div class="tema__cab"><p class="tema__titulo">${esc(t.titulo)}</p>${usa ? `<span class="selo">no vídeo</span>` : ""}</div>
      <p class="tema__gancho">${esc(t.gancho)}</p>
      <div class="tema__prova"><b>${esc(t.prova.num)}</b><p>${esc(t.prova.txt)} <a href="${esc(t.prova.u)}" target="_blank" rel="noopener">Pesquisa: ${esc(t.prova.f)} ↗</a></p></div>
      <p class="tema__aqui"><b>Em ${esc(d.municipio)}:</b> ${esc(aqui)} <small>${esc(c.fonteAqui)}</small></p>
      <p class="tema__pergunta"><b>Pergunte:</b> ${esc(t.pergunta)}</p>
      ${videos.length ? `<ul class="tema__videos">${videos.map((v) => `<li><a href="${esc(v.url)}" target="_blank" rel="noopener">${esc(v.titulo)}</a><small>${esc(v.fonte)} · ${grande(v.views)} visualizações · <a href="${linkWhats(`Pra quem é de ${d.municipio}: ${v.titulo}`, v.url)}" target="_blank" rel="noopener">mandar no zap</a></small></li>`).join("")}</ul>` : ""}
      <details><summary>Fato e fontes</summary><p>${esc(t.fato)}${c.extra ? ` ${esc(c.extra)}` : ""}</p><p class="nota">${fontes}</p></details>
      <div class="linha tema__acoes">${!usa ? `<button class="pill pill--acento" type="button" data-usar="${c.ataques[0]}">Usar no vídeo</button>` : kit.atqId !== c.ataques[0] ? `<button class="pill" type="button" data-usar="${c.ataques[0]}">Trocar para ${esc(ATAQUES[c.ataques[0]].nome.toLowerCase())}</button>` : ""}<a class="pill" href="${linkWhats(zap)}" target="_blank" rel="noopener">Mandar no zap</a><button class="pill" type="button" data-copiar-tema="${c.id}">Copiar</button></div>
    </article>`;
  }).join("");
  return { html, textos };
}

// ---------------------------------------------------------------- fatos da cidade, com fonte, para quem quer escrever o próprio roteiro
function painelFatos(d, kit, local) {
  const p26 = d.parcela26 * 100, p22 = d.parcela22 * 100;
  const T26 = "TSE, 1º turno de 2026", PT = "Portal da Transparência (CGU)", CENSO = "IBGE, Censo 2022", ELEIT = "TSE, perfil do eleitorado 2026";
  const grupos = [];
  grupos.push(["Voto", [
    [`${n0(d.votos_lula_26)} votos`, `para Lula e ${n0(d.votos_flavio_26)} para Flávio no 1º turno.`, T26],
    [pct(p26, 0), `dos votos dados aos dois foram para Lula. Em 2022, contra Bolsonaro, eram ${pct(p22, 0)}.`, "TSE, 1º turnos de 2022 e 2026"],
    [n0(d.ausentes_26), `eleitores (${pct(d.abstencao * 100, 0)}) não votaram no 1º turno.`, T26],
    [pct(d.terceiros_26_pct, 0), "dos votos válidos foram para Caiado, Renan, Cury ou Zema.", T26],
    [`+${grande(d.gTot)}`, `votos em jogo na diferença; a frente que mais rende aqui é ${kit.nomeFrente.toLowerCase()}.`, "cálculo do Contra Dados com dados do TSE (ver Método)"],
  ]]);
  const dinheiro = [
    d.bf > 0 && [reais(d.bf), "do Bolsa Família por mês.", `${PT}, agosto de 2026`],
    d.bpc > 0 && [reais(d.bpc), "do BPC por mês, um salário mínimo por pessoa.", `${PT}, agosto de 2026`],
    d.pdm > 0 && [reais(d.pdm), "do Pé-de-Meia para estudantes, de janeiro a agosto.", `${PT}, 2026`],
    d.safra >= 50 && [reais(d.safra), "do Garantia-Safra para agricultores.", `${PT}, 2025`],
  ].filter(Boolean);
  if (dinheiro.length) grupos.push(["Dinheiro federal que chega aqui", dinheiro]);
  grupos.push(["Perfil", [
    d.pop && [grande(d.pop), "habitantes.", CENSO],
    d.urbana != null && [pct(d.urbana, 0), "vivem na área urbana.", CENSO],
    d.evangelicos != null && [pct(d.evangelicos, 0), "se declaram evangélicos.", CENSO],
    d.jovens != null && [pct(d.jovens, 0), "do eleitorado tem de 16 a 24 anos.", ELEIT],
    d.idosos != null && [pct(d.idosos, 0), `do eleitorado tem 60 anos ou mais${d.mais70 ? `; ${n0(d.mais70)} eleitores têm 70 ou mais, e para eles votar é facultativo` : ""}.`, ELEIT],
    d.prefeito_partido && [d.prefeito_partido, "é o partido pelo qual o prefeito ou a prefeita foi eleito em 2024.", "TSE, eleição de 2024"],
  ].filter(Boolean)]);
  // listas com link
  const noticias = kit.noticias.map((x) => ({ txt: x.g, f: `${x.v}${x.d ? `, ${dataCurta(x.d)}` : ""}`, u: x.u, conferir: !x.c }));
  const pl = kit.pref ? kit.pref.i.map((x) => ({ txt: `${x.t} ${x.e}`, f: `${x.v}${x.d ? `, ${dataCurta(x.d)}` : ""}`, u: x.u, conferir: !x.c })) : [];
  const pautas = local ? [...(local.economia ? [{ txt: local.economia }] : []), ...local.pautas.slice(0, 5).map((t) => ({ txt: t }))] : [];
  const li = ([v, t, f]) => `<li><b>${esc(v)}</b> ${esc(t)} <small>${esc(f)}</small></li>`;
  const liLink = (x) => `<li>${esc(x.txt)}${x.u ? ` <small><a href="${esc(x.u)}" target="_blank" rel="noopener">${esc(x.f)} ↗</a>${x.conferir ? " · conferir antes de usar" : ""}</small>` : ""}</li>`;
  const quemPL = kit.pref ? `${kit.pref.g === "a" ? "Prefeita" : "Prefeito"} ${kit.pref.p ? `${kit.pref.p}, ` : ""}${kit.pref.pc ? "do PL" : "eleit" + (kit.pref.g === "a" ? "a" : "o") + " pelo PL"}` : "";
  const html = `
    ${grupos.map(([g, itens]) => `<section><h4>${esc(g)}</h4><ul>${itens.map(li).join("")}</ul></section>`).join("")}
    ${noticias.length ? `<section><h4>Notícias de ${esc(d.municipio)}</h4><ul>${noticias.map(liLink).join("")}</ul></section>` : ""}
    ${pl.length ? `<section><h4>${esc(quemPL)}: o que está documentado</h4><ul>${pl.map(liLink).join("")}</ul><p class="nota">Investigação não é condenação: diga em que pé está e a resposta da prefeitura.</p></section>` : ""}
    ${pautas.length ? `<section><h4>Economia e pautas locais</h4><ul>${pautas.map(liLink).join("")}</ul><p class="nota">Fontes: ${local.fontes.slice(0, 6).map((u, i) => `<a href="${esc(u)}" target="_blank" rel="noopener">[${i + 1}]</a>`).join(" ")}</p></section>` : ""}`;
  // o mesmo conteúdo em texto, para colar num roteiro
  const linhas = [`Fatos de ${d.municipio} (${d.uf}) — Contra Dados`];
  for (const [g, itens] of grupos) { linhas.push("", g.toUpperCase()); itens.forEach(([v, t, f]) => linhas.push(`- ${v} ${t} (Fonte: ${f})`)); }
  if (noticias.length) { linhas.push("", "NOTÍCIAS"); noticias.forEach((x) => linhas.push(`- ${x.txt} (${x.f}: ${x.u})${x.conferir ? " [conferir]" : ""}`)); }
  if (pl.length) { linhas.push("", quemPL.toUpperCase()); pl.forEach((x) => linhas.push(`- ${x.txt} (${x.f}: ${x.u})${x.conferir ? " [conferir]" : ""}`)); }
  if (pautas.length) { linhas.push("", "ECONOMIA E PAUTAS LOCAIS"); pautas.forEach((x) => linhas.push(`- ${x.txt}`)); linhas.push(`Fontes: ${local.fontes.slice(0, 6).join(" ")}`); }
  return { html, texto: linhas.join("\n") };
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
  const local = (await pLocais)[d.ibge] || null;
  if (IMG.ibge !== d.ibge) return; // outra cidade foi aberta enquanto carregava
  const temas = painelTemas(d, kit), fatos = painelFatos(d, kit, local);
  el.innerHTML = `
    <div class="kit__cab">
      <div class="kit__titulo">
        <p class="rotulo">Sugestão de reel</p>
        <h2 class="medio">${esc(d.municipio)} (${d.uf}): <em style="color:${kit.corTexto}">${kit.nomeFrente.toLowerCase()}</em> é a frente que mais rende.</h2>
        <p class="fio"><b>O fio deste vídeo${kit.fio.assunto ? `: ${esc(kit.fio.assunto)}` : ""}.</b> ${kit.fio.passos.map(esc).join(" → ")}.</p>
        <p class="nota">É só uma sugestão: mude as partes do vídeo ou use os temas e os fatos abaixo para fazer o seu.</p>
      </div>
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
        ${kit.atq.nota && kit.blocos.flavio ? `<p class="dica"><b>Para quem posta:</b> ${esc(kit.atq.nota)}</p>` : ""}
        <p class="dica"><b>Como gravar:</b> num lugar que todo mundo da cidade reconhece (a praça, a feira, a igreja matriz, a rodoviária). Fale como fala com o vizinho: com emoção, sem ler. Celular na vertical, legenda na tela.</p>
        <div class="acoes-kit"><button class="pill" type="button" id="copia-roteiro">Copiar roteiro</button><button class="pill" type="button" id="copia-legenda">Copiar legenda</button></div>
      </div>
    </div>
    <div class="faixa faixa--solida temas-voto">
      <div class="faixa__topo"><h3 class="rotulo">Temas que viram voto em ${esc(d.municipio)}</h3><span class="nota">Do <a href="${radar.fonte}" target="_blank" rel="noopener">Radar da Virada</a>: só temas com efeito comprovado em pesquisa, na ordem do que mais pesa aqui. Recorte de ${radar.coletado_em.split("-").reverse().join("/")}.</span></div>
      <div class="temas">${temas.html}</div>
      <p class="nota">Os vídeos são de terceiros, como o Radar lista: assista antes de mandar. Mande para pessoas e grupos que você conhece; disparo em massa é proibido.</p>
    </div>
    <div class="faixa fatos">
      <div class="faixa__topo"><h3 class="rotulo">Fatos de ${esc(d.municipio)} para criar o seu reel</h3><div class="linha"><button class="pill pill--acento" type="button" id="copia-fatos">Copiar fatos com as fontes</button><a class="pill pill--branco" href="${RAIZ}metodo/">Método</a></div></div>
      <div class="fatos__grade">${fatos.html}</div>
    </div>
    <div class="faixa mensagem">
      <div class="faixa__topo"><h3 class="rotulo">Mensagem para WhatsApp</h3><div class="linha"><a class="pill pill--acento" target="_blank" rel="noopener" href="${linkWhats(kit.zap)}">Abrir no WhatsApp</a><button class="pill" type="button" id="copia-zap">Copiar</button></div></div>
      <textarea id="zap" aria-label="Mensagem">${esc(kit.zap)}</textarea>
      <p class="nota">Mande para pessoas e grupos que você conhece. Disparo em massa é proibido.</p>
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
  document.getElementById("copia-fatos").addEventListener("click", (e) => copiar(fatos.texto, e.currentTarget));
  el.querySelectorAll("[data-copiar-tema]").forEach((b) => b.addEventListener("click", (e) => copiar(temas.textos[b.dataset.copiarTema], e.currentTarget)));
  el.querySelectorAll("[data-usar]").forEach((b) => b.addEventListener("click", () => {
    montar(d, { ...escolha, ataque: b.dataset.usar, blocos: { ...kit.blocos, flavio: true } });
    document.getElementById("kit").scrollIntoView({ behavior: "smooth", block: "start" });
  }));
}

// ---------------------------------------------------------------- início
const pedidoIbge = new URLSearchParams(location.search).get("ibge");
desenharLista();
const inicial = (pedidoIbge && porIbge.get(pedidoIbge)) || filtrados().find((d) => NOT[d.ibge] && d.porte === 2) || filtrados()[0];
escolher(inicial, false);
