// Kit de reels por cidade: roteiro de 30 s, 4 cartões 1080×1920, legenda, mensagem e vídeos do Radar da Virada.
import { montarTopo, rodape, municipios, json, grande, n0, pct, dec, esc, reais, linkWhats, copiar, baixarArquivo, RAIZ, semAcento } from "./ui.js";
import { aplicar, transferencia, completarQuaest, UFNOME } from "./frentes.js";

montarTopo({ pagina: "reels/" });
rodape();

const [rows, radar, P] = await Promise.all([municipios(), json("data/radar.json"), json("data/pontos.json")]);
completarQuaest(rows);
const D = aplicar(rows, transferencia());
const porIbge = new Map(D.map((d) => [d.ibge, d]));
const TEMAS = Object.fromEntries(radar.temas.map((t) => [t.id, t]));
const ESTILO = {
  1: { fundo: "#ffe6e6", forte: "#ff1a1a", texto: "#c80000", nome: "Reconquistar" },
  2: { fundo: "#dccdfb", forte: "#7533ff", texto: "#5b1fe0", nome: "Mobilizar" },
  3: { fundo: "#ffe5bf", forte: "#ff9900", texto: "#9a5200", nome: "Terceiros" },
};

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
const peq = D.filter((d) => d.porte === 2);
const atalhos = [1, 2, 3].flatMap((k) => peq.filter((d) => d.principal === k).sort((a, b) => b["g" + k] - a["g" + k]).slice(0, 2));
document.getElementById("atalhos").innerHTML = `<span class="nota">Sugestões:</span>` + atalhos.map((d) => `<button class="pill ${d.principal === 1 ? "pill--vermelho" : d.principal === 3 ? "pill--laranja" : "pill--lilas"}" type="button" data-i="${d.ibge}">${esc(rotulo(d))}</button>`).join("");
document.querySelectorAll("[data-i]").forEach((b) => b.addEventListener("click", () => escolher(porIbge.get(b.dataset.i))));

function escolher(d, rolar = true) {
  campo.value = rotulo(d);
  history.replaceState(null, "", "?ibge=" + d.ibge);
  montar(d);
  if (rolar) document.getElementById("kit").scrollIntoView({ behavior: "smooth", block: "start" });
}

// ---------------------------------------------------------------- conteúdo do kit
function compor(d) {
  const k = d.gTot < 30 ? (d.areaLula ? 2 : 1) : d.principal;
  const p26 = Math.round(d.parcela26 * 100);
  const cid = d.municipio;
  const tema = k === 3 ? TEMAS.constituicao : k === 1 ? (d.urbana >= 75 ? TEMAS["6x1"] : TEMAS.bolso) : (d.bpc > 0 ? TEMAS.bolso : TEMAS["6x1"]);
  const fonteTema = tema ? [tema.prova?.f, ...tema.fontes.slice(0, 2).map((f) => f.f)].filter(Boolean).join("; ") : "";
  const politica = d.bf > 0
    ? { titulo: `Todo mês, ${reais(d.bf)} do Bolsa Família chegam a ${cid}.`, sub: d.bpc > 0 ? `E mais ${reais(d.bpc)} do BPC para idosos e pessoas com deficiência.` : "É dinheiro que gira no comércio da cidade.", fonte: d.pdm > 0 ? "Portal da Transparência (CGU): Bolsa Família e BPC em agosto de 2026; Pé-de-Meia, média mensal de janeiro a agosto de 2026" : "Portal da Transparência (CGU), agosto de 2026" }
    : { titulo: `${cid} recebe programas federais todo mês.`, sub: "Bolsa Família, BPC e Pé-de-Meia.", fonte: "Portal da Transparência (CGU)" };
  politica.barras = [["Bolsa Família", d.bf, "por mês"], ["BPC", d.bpc, "por mês"], ["Pé-de-Meia", d.pdm ? d.pdm / 8 : 0, "média mensal em 2026"]]
    .filter(([, v]) => v > 0).map(([n, v, u]) => ({ nome: n, valor: v, texto: reais(v), unidade: u }));

  const c = [];
  if (k === 2) {
    c.push({ kicker: "1º turno", numero: n0(d.ausentes_26), titulo: `pessoas de ${cid} não votaram.`, sub: "Dia 25 de outubro, a gente decide.", fonte: "TSE, 1º turno de 2026", mapa: true });
    c.push({ kicker: "Na sua cidade", ...politica });
    c.push({ kicker: "A conta", titulo: `Aqui, Lula venceu com ${p26}% dos votos.`, sub: `Se quem faltou for votar, a vantagem pode crescer em até ${n0(d.f2)} votos.`, fonte: "TSE, 1º turno de 2026. Estimativa: ausentes votando como os vizinhos.",
      barras: [{ nome: "Lula", valor: d.votos_lula_26, texto: n0(d.votos_lula_26), cor: "#ff1a1a" }, { nome: "Flávio", valor: d.votos_flavio_26, texto: n0(d.votos_flavio_26), cor: "#6b6b6b" }, { nome: "Não votaram", valor: d.ausentes_26, texto: n0(d.ausentes_26), cor: "#7533ff" }] });
  } else if (k === 1) {
    const ganhou22 = d.parcela22 > 0.5;
    c.push({ kicker: "Desde 2022", numero: dec(d.f1Pct, 1).replace(",0", "") + " pts", titulo: ganhou22 ? `foi o que Lula perdeu em ${cid}, que votou nele em 2022.` : `foi o que Lula perdeu em ${cid} desde 2022.`, sub: "Dá para trazer esses votos de volta.", fonte: "TSE, 1º turnos de 2022 e 2026", mapa: true });
    c.push({ kicker: "Na sua cidade", ...politica });
    c.push({ kicker: tema.titulo, titulo: tema.pergunta, sub: tema.prova ? `${tema.prova.num} ${tema.prova.txt}` : "", fato: tema.fato, fonte: fonteTema });
  } else {
    c.push({ kicker: "1º turno", numero: pct(d.terceiros_26_pct, 0), titulo: `de ${cid} votou em Caiado, Renan, Cury ou Zema.`, sub: `${n0(d.f3)} votos ainda estão em aberto.`, fonte: "TSE, 1º turno de 2026; AtlasIntel, 3 a 8/10/2026", mapa: true });
    c.push({ kicker: "Na sua cidade", ...politica });
    c.push({ kicker: tema.titulo, titulo: tema.pergunta, sub: tema.prova ? `${tema.prova.num} ${tema.prova.txt}` : "", fato: tema.fato, fonte: fonteTema });
  }
  c.push({ kicker: "25 de outubro", titulo: k === 3 ? "No 2º turno, escolha a democracia. Vote 13." : "Dia 25, vote 13.", sub: "Das 8h às 17h (horário de Brasília). Chame alguém para ir com você. Seu local de votação está no app e-Título.", nota: "Ônibus gratuito no dia é dever do poder público (STF, ADPF 1.013).", cheio: true, grande: "25/10" });

  const roteiro = [
    { t: "0–3 s", nome: "Gancho", tela: (c[0].numero ? c[0].numero + " " : "") + c[0].titulo, fala: `Olha esse número de ${cid}.`, fonte: c[0].fonte },
    { t: "3–12 s", nome: "Na cidade", tela: c[1].titulo, fala: d.bf > 0 ? `Isso é Bolsa Família${d.bpc > 0 ? " e BPC" : ""}: dinheiro que entra todo mês e gira no comércio daqui.` : "São programas federais que chegam aqui todo mês.", fonte: c[1].fonte },
    { t: "12–24 s", nome: k === 2 ? "A conta" : "O tema", tela: c[2].titulo, fala: k === 2 ? `Aqui o Lula ganhou. Quem faltou no 1º turno pode decidir o 2º.` : tema.pergunta, fonte: c[2].fonte, links: k === 2 ? [] : tema.fontes.slice(0, 2) },
    { t: "24–30 s", nome: "Chamada", tela: c[3].titulo, fala: "Dia 25, vote 13. E chama alguém para ir com você.", fonte: c[3].nota },
  ];
  const tag = "#" + semAcento(cid).replace(/[^a-z0-9]/g, "");
  const legenda = `${cid}, dia 25 é a nossa vez. ${c[0].numero ? c[0].numero + " " : ""}${c[0].titulo} ${c[1].titulo} Fontes: TSE e Portal da Transparência. ${tag} #2ºturno #vote13`;
  const urlCidade = new URL(`${RAIZ}cidade/?ibge=${d.ibge}`, location.href).href;
  const zap = `*${cid} decide no dia 25*\n${c[0].numero ? c[0].numero + " " : ""}${c[0].titulo}\n${c[1].titulo} (Portal da Transparência)\n${k === 2 ? `Aqui o Lula ganhou com ${p26}%. Se quem faltou votar, a vantagem cresce.` : tema.zap}\nVeja os números da cidade: ${urlCidade}`;

  // vídeos do Radar: mesma frente, com bônus para o mesmo tema
  const letra = ["", "r", "m", "t"][k];
  const temasAfins = { "6x1": ["6x1", "trabalho"], bolso: ["bolso", "saude"], constituicao: ["constituicao", "democracia", "direita", "renan", "cury_renan"] }[tema?.id] || [];
  const videos = radar.videos.filter((v) => v.frentes.includes(letra))
    .map((v) => ({ ...v, nota: v.views * (temasAfins.includes(v.tema) ? 3 : 1) }))
    .sort((a, b) => b.nota - a.nota).slice(0, 6);
  return { k, cartoes: c, roteiro, legenda, zap, videos, tema };
}

// ---------------------------------------------------------------- desenho dos cartões (1080 × 1920)
const W = 1080, H = 1920, M = 84;
const proj = d3geo();
function d3geo() {
  // projeção cônica equivalente simplificada (a mesma família do mapa do site), sem depender de d3
  const lon0 = -54 * Math.PI / 180, p1 = -2 * Math.PI / 180, p2 = -22 * Math.PI / 180;
  const n = (Math.sin(p1) + Math.sin(p2)) / 2, C = Math.cos(p1) ** 2 + 2 * n * Math.sin(p1);
  const rho = (phi) => Math.sqrt(C - 2 * n * Math.sin(phi)) / n;
  return ([lon, lat]) => { const l = lon * Math.PI / 180, f = lat * Math.PI / 180, th = n * (l - lon0), r = rho(f); return [r * Math.sin(th), -(rho(0) - r * Math.cos(th))]; };
}
const XY = Array.from(P.lon, (lo, i) => proj([lo, P.lat[i]]));
const bx = { x0: Math.min(...XY.map((p) => p[0])), x1: Math.max(...XY.map((p) => p[0])), y0: Math.min(...XY.map((p) => p[1])), y1: Math.max(...XY.map((p) => p[1])) };
const idxIbge = new Map(Array.from(P.ibge, (c, i) => [String(c), i]));

function quebrar(ctx, txt, larg) {
  const ps = String(txt).split(/\s+/), ls = [];
  let a = "";
  for (const p of ps) { const t = a ? a + " " + p : p; if (ctx.measureText(t).width > larg && a) { ls.push(a); a = p; } else a = t; }
  if (a) ls.push(a);
  return ls;
}
function pilula(ctx, txt, x, y, fundo = "#fff", cor = "#000", tam = 34) {
  ctx.font = `500 ${tam}px "Bricolage Grotesque"`;
  const w = ctx.measureText(txt).width + 32, h = tam + 22;
  ctx.fillStyle = fundo; ctx.beginPath(); ctx.roundRect(x, y, w, h, 10); ctx.fill();
  ctx.fillStyle = cor; ctx.textBaseline = "middle"; ctx.fillText(txt, x + 16, y + h / 2 + 1);
  return w;
}
function mapaPontos(ctx, d, est, x, y, w, h) {
  const s = Math.min(w / (bx.x1 - bx.x0), h / (bx.y1 - bx.y0));
  const ox = x + (w - (bx.x1 - bx.x0) * s) / 2, oy = y + (h - (bx.y1 - bx.y0) * s) / 2;
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.beginPath();
  for (const [px, py] of XY) { const X = ox + (px - bx.x0) * s, Y = oy + (py - bx.y0) * s; ctx.moveTo(X + 2.6, Y); ctx.arc(X, Y, 2.6, 0, 6.2832); }
  ctx.fill();
  const i = idxIbge.get(d.ibge);
  if (i != null) {
    const X = ox + (XY[i][0] - bx.x0) * s, Y = oy + (XY[i][1] - bx.y0) * s;
    ctx.fillStyle = est.forte; ctx.globalAlpha = 0.28; ctx.beginPath(); ctx.arc(X, Y, 64, 0, 6.2832); ctx.fill();
    ctx.globalAlpha = 1; ctx.beginPath(); ctx.arc(X, Y, 15, 0, 6.2832); ctx.fill();
    ctx.lineWidth = 5; ctx.strokeStyle = "#fff"; ctx.stroke();
  }
}
function desenharCartao(cv, d, kit, n) {
  const ctx = cv.getContext("2d");
  const c = kit.cartoes[n], est = ESTILO[kit.k];
  const cheio = !!c.cheio;
  ctx.fillStyle = cheio ? est.forte : est.fundo;
  ctx.fillRect(0, 0, W, H);
  // topo: cidade e contador
  pilula(ctx, `${d.municipio} · ${d.uf}`, M, M, "#fff", "#000");
  ctx.font = '500 34px "Bricolage Grotesque"';
  const cont = `${n + 1}/4`;
  pilula(ctx, cont, W - M - ctx.measureText(cont).width - 32, M, "#fff", "#000");
  // rótulo da seção
  let y = 300;
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = cheio ? "#fff" : est.texto;
  ctx.font = '600 40px "Bricolage Grotesque"';
  ctx.fillText(c.kicker, M, y);
  y += 40;
  // número grande
  if (c.numero) {
    ctx.font = '700 230px "Bricolage Grotesque"';
    ctx.fillStyle = cheio ? "#fff" : est.texto;
    let tam = 230;
    while (ctx.measureText(c.numero).width > W - 2 * M && tam > 120) { tam -= 10; ctx.font = `700 ${tam}px "Bricolage Grotesque"`; }
    y += tam * 0.9;
    ctx.fillText(c.numero, M - 6, y);
    y += 30;
  } else y += 30;
  // manchete
  const tamT = c.numero ? 78 : c.titulo.length > 90 ? 76 : 96;
  ctx.font = `500 ${tamT}px "Newsreader"`;
  ctx.fillStyle = cheio ? "#fff" : "#000";
  for (const l of quebrar(ctx, c.titulo, W - 2 * M)) { y += tamT * 1.05; ctx.fillText(l, M, y); }
  // apoio
  if (c.sub) {
    y += 44;
    ctx.font = '500 46px "Bricolage Grotesque"';
    ctx.fillStyle = cheio ? "rgba(255,255,255,0.92)" : "#1d1d1d";
    for (const l of quebrar(ctx, c.sub, W - 2 * M)) { y += 56; ctx.fillText(l, M, y); }
  }
  // mapa de pontos no primeiro cartão
  if (c.mapa) mapaPontos(ctx, d, est, M, Math.max(y + 60, 1080), W - 2 * M, H - Math.max(y + 60, 1080) - 230);
  // barras de dados
  if (c.barras && c.barras.length) {
    const vmax = Math.max(...c.barras.map((b) => b.valor));
    let by = Math.max(y + 120, 1150);
    for (const b of c.barras) {
      ctx.font = '600 38px "Bricolage Grotesque"'; ctx.fillStyle = "#000"; ctx.textBaseline = "alphabetic";
      ctx.fillText(b.nome, M, by);
      const wn = ctx.measureText(b.nome).width;
      if (b.unidade) { ctx.font = '400 30px "Bricolage Grotesque"'; ctx.fillStyle = "#444"; ctx.fillText(b.unidade, M + wn + 16, by); }
      const bw = Math.max(8, (W - 2 * M - 360) * (b.valor / vmax));
      ctx.fillStyle = b.cor || est.forte; ctx.fillRect(M, by + 18, bw, 54);
      ctx.font = '700 44px "Bricolage Grotesque"'; ctx.fillStyle = "#000"; ctx.fillText(b.texto, M + bw + 18, by + 62);
      by += 150;
    }
  }
  if (c.fato) {
    ctx.font = '400 38px "Newsreader"'; ctx.fillStyle = "#1d1d1d"; ctx.textBaseline = "alphabetic";
    const ls = quebrar(ctx, c.fato, W - 2 * M).slice(0, 9);
    let fy = Math.max(y + 110, H - 300 - ls.length * 50);
    ctx.fillStyle = est.forte; ctx.fillRect(M, fy - 46, 8, ls.length * 50 + 10);
    ctx.fillStyle = "#1d1d1d";
    for (const l of ls) { ctx.fillText(l, M + 30, fy); fy += 50; }
  }
  if (c.grande) {
    ctx.font = '700 300px "Bricolage Grotesque"'; ctx.fillStyle = "rgba(255,255,255,0.95)"; ctx.textBaseline = "alphabetic";
    ctx.fillText(c.grande, M - 10, H - 330);
    ctx.font = '600 52px "Bricolage Grotesque"'; ctx.fillText("domingo · 8h às 17h", M, H - 250);
  }
  // fonte
  ctx.font = '400 30px "Bricolage Grotesque"';
  ctx.fillStyle = cheio ? "rgba(255,255,255,0.85)" : "#3a3a3a";
  const fl = quebrar(ctx, c.nota || "Fonte: " + c.fonte, W - 2 * M).slice(0, 3);
  let fy = H - M - (fl.length - 1) * 38;
  for (const l of fl) { ctx.fillText(l, M, fy); fy += 38; }
}

// ---------------------------------------------------------------- página do kit
let fontesProntas = null;
async function fontes() {
  if (!fontesProntas) fontesProntas = Promise.all([
    document.fonts.load('500 96px "Newsreader"'), document.fonts.load('700 200px "Bricolage Grotesque"'),
    document.fonts.load('500 40px "Bricolage Grotesque"'), document.fonts.load('400 30px "Bricolage Grotesque"'),
  ]).catch(() => null);
  return fontesProntas;
}

async function montar(d) {
  const kit = compor(d);
  const est = ESTILO[kit.k];
  const slug = semAcento(d.municipio).replace(/[^a-z0-9]+/g, "-");
  const el = document.getElementById("kit");
  el.innerHTML = `
    <div class="kit__cab">
      <h2 class="medio">${esc(d.municipio)} (${d.uf}): <em style="color:${est.texto}">${est.nome.toLowerCase()}</em> é a frente que mais rende.</h2>
      <div class="linha"><a class="pill pill--lilas" href="${RAIZ}cidade/?ibge=${d.ibge}">Ficha da cidade</a><button class="pill" type="button" id="baixa-todos">Baixar os 4 cartões</button></div>
    </div>
    <div class="kit__grade">
      <div class="roteiro-reel">
        <div class="faixa__topo" style="margin-bottom:10px"><h3 class="rotulo">Roteiro de 30 segundos</h3></div>
        <ol>${kit.roteiro.map((b) => `<li><div class="tempo">${b.t}<small>${b.nome}</small></div><div><div class="tela">Na tela: ${esc(b.tela)}</div><p class="fala">“${esc(b.fala)}”</p><p class="fonte">Fonte: ${esc(b.fonte)}${b.links && b.links.length ? " · " + b.links.map((f) => `<a href="${esc(f.u)}" target="_blank" rel="noopener">${esc(f.f)}</a>`).join(", ") : ""}</p></div></li>`).join("")}</ol>
        <p class="dica"><b>Como gravar:</b> num lugar que todo mundo reconhece (a praça, a feira, a igreja matriz, a rodoviária). Celular na vertical, até 30 segundos, legenda na tela. Use os cartões como fundo ou como fim do vídeo.</p>
        <div class="acoes-kit"><button class="pill" type="button" id="copia-roteiro">Copiar roteiro</button><button class="pill" type="button" id="copia-legenda">Copiar legenda</button></div>
      </div>
      <div class="cartoes-reel">${kit.cartoes.map((c, i) => `<figure><canvas width="${W}" height="${H}" id="cv${i}" aria-label="Cartão ${i + 1}: ${esc(c.titulo)}"></canvas><figcaption><span>${i + 1}. ${esc(c.kicker)}</span><button class="pill pill--branco" type="button" data-baixa="${i}">PNG</button></figcaption></figure>`).join("")}</div>
    </div>
    <div class="faixa mensagem">
      <div class="faixa__topo"><h3 class="rotulo">Mensagem para WhatsApp</h3><div class="linha"><a class="pill pill--lilas" target="_blank" rel="noopener" href="${linkWhats(kit.zap)}">Abrir no WhatsApp</a><button class="pill" type="button" id="copia-zap">Copiar</button></div></div>
      <textarea id="zap" aria-label="Mensagem">${esc(kit.zap)}</textarea>
      <p class="nota">Mande para pessoas e grupos que você conhece. Disparo em massa é proibido.</p>
    </div>
    <div class="faixa faixa--solida videos">
      <div class="faixa__topo"><h3 class="rotulo">Vídeos do Radar da Virada para ${est.nome.toLowerCase()}</h3><span class="nota">recorte de ${radar.coletado_em.split("-").reverse().join("/")} · <a href="${radar.fonte}" target="_blank" rel="noopener">ver os mais recentes</a></span></div>
      <div class="grade">${kit.videos.map((v) => `<a class="cartao${kit.k === 1 ? " cartao--f1" : kit.k === 3 ? " cartao--f3" : ""}" href="${esc(v.url)}" target="_blank" rel="noopener"><p class="cartao__titulo">${esc(v.fonte)}</p><p class="cartao__sub">${esc(v.titulo)}</p><p class="cartao__pe"><span>${grande(v.views)} visualizações</span><span>Abrir</span></p></a>`).join("")}</div>
      <p class="nota">Links para conteúdo de terceiros, como o Radar da Virada lista. Antes de repostar ou remixar, assista e confira.</p>
    </div>`;
  await fontes();
  kit.cartoes.forEach((_, i) => desenharCartao(document.getElementById("cv" + i), d, kit, i));
  const baixar = (i) => new Promise((ok) => document.getElementById("cv" + i).toBlob((b) => { baixarArquivo(`reel-${slug}-${i + 1}.png`, b); setTimeout(ok, 350); }, "image/png"));
  el.querySelectorAll("[data-baixa]").forEach((b) => b.addEventListener("click", () => baixar(+b.dataset.baixa)));
  document.getElementById("baixa-todos").addEventListener("click", async () => { for (let i = 0; i < 4; i++) await baixar(i); });
  const txtRoteiro = kit.roteiro.map((b) => `${b.t} · ${b.nome}\nNa tela: ${b.tela}\nFala: ${b.fala}\nFonte: ${b.fonte}`).join("\n\n");
  document.getElementById("copia-roteiro").addEventListener("click", (e) => copiar(txtRoteiro, e.currentTarget));
  document.getElementById("copia-legenda").addEventListener("click", (e) => copiar(kit.legenda, e.currentTarget));
  document.getElementById("copia-zap").addEventListener("click", (e) => copiar(document.getElementById("zap").value, e.currentTarget));
}

// ---------------------------------------------------------------- início
const pedido = new URLSearchParams(location.search).get("ibge");
const inicial = (pedido && porIbge.get(pedido)) || [...peq].sort((a, b) => b.gTot - a.gTot)[0];
escolher(inicial, false);
