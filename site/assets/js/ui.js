// Peças comuns: formatação pt-BR, leitura de dados, topo, menu, busca e compartilhamento.
import { lerLinha } from "./frentes.js";

export const RAIZ = document.documentElement.dataset.raiz || "";
export const DIA_2T = new Date(2026, 9, 25); // 25/10/2026

// ---------------------------------------------------------------- formatação
const nf = new Intl.NumberFormat("pt-BR");
export const n0 = (v) => (v == null || !isFinite(v) ? "–" : nf.format(Math.round(v)));
export const dec = (v, n = 1) => (v == null || !isFinite(v) ? "–" : v.toLocaleString("pt-BR", { minimumFractionDigits: n, maximumFractionDigits: n }));
export const pct = (v, n = 1) => (v == null || !isFinite(v) ? "–" : dec(v, n) + "%");
// 4.514.899 -> "4,5 milhões"; 66.946 -> "67 mil"; 812 -> "812"
export function grande(v, curto = false) {
  if (v == null || !isFinite(v)) return "–";
  const a = Math.abs(v);
  if (a >= 1e6) {
    const x = v / 1e6;
    const t = x.toLocaleString("pt-BR", { maximumFractionDigits: a >= 1e8 ? 0 : 1 });
    return t + (curto ? " mi" : Math.abs(x) >= 2 ? " milhões" : " milhão");
  }
  if (a >= 1e4) return (v / 1e3).toLocaleString("pt-BR", { maximumFractionDigits: 0 }) + " mil";
  if (a >= 1e3) return (v / 1e3).toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + " mil";
  return n0(v);
}
// valores em R$ mil -> "R$ 1,2 milhão", "R$ 230 mil"
export function reais(mil) {
  if (mil == null || !isFinite(mil)) return "–";
  const v = mil * 1000;
  if (v >= 1e9) return "R$ " + (v / 1e9).toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + " bilhão".replace("bilhão", v >= 2e9 ? "bilhões" : "bilhão");
  if (v >= 1e6) { const x = v / 1e6; return "R$ " + x.toLocaleString("pt-BR", { maximumFractionDigits: x >= 10 ? 0 : 1 }) + (x >= 2 ? " milhões" : " milhão"); }
  if (v >= 1e3) return "R$ " + Math.round(v / 1e3).toLocaleString("pt-BR") + " mil";
  return "R$ " + n0(v);
}
export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const semAcento = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
export function diasAte2T(hoje = new Date()) {
  const h = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  return Math.round((DIA_2T - h) / 864e5);
}

// ---------------------------------------------------------------- dados
export function lerCSV(txt) {
  const linhas = [];
  let campo = "", linha = [], aspas = false;
  for (let i = 0; i < txt.length; i++) {
    const ch = txt[i];
    if (aspas) {
      if (ch === '"') { if (txt[i + 1] === '"') { campo += '"'; i++; } else aspas = false; } else campo += ch;
    } else if (ch === '"') aspas = true;
    else if (ch === ",") { linha.push(campo); campo = ""; }
    else if (ch === "\n") { linha.push(campo); linhas.push(linha); linha = []; campo = ""; }
    else if (ch !== "\r") campo += ch;
  }
  if (campo || linha.length) { linha.push(campo); linhas.push(linha); }
  const [cab, ...resto] = linhas;
  return resto.filter((l) => l.length === cab.length).map((l) => Object.fromEntries(cab.map((c, i) => [c, l[i]])));
}
const cache = new Map();
export function json(caminho) {
  if (!cache.has(caminho)) cache.set(caminho, fetch(RAIZ + caminho).then((r) => { if (!r.ok) throw new Error(caminho + " " + r.status); return r.json(); }));
  return cache.get(caminho);
}
export async function municipios() {
  if (!cache.has("csv")) cache.set("csv", fetch(RAIZ + "data/municipios.csv").then((r) => r.text()).then((t) => lerCSV(t).map(lerLinha)));
  return cache.get("csv");
}

// ---------------------------------------------------------------- ícones
const ICO = {
  menu: '<svg viewBox="0 0 15 15" aria-hidden="true"><path d="M1 3.5h13M1 7.5h13M1 11.5h13" stroke="currentColor" stroke-width="1.4"/></svg>',
  fechar: '<svg viewBox="0 0 15 15" aria-hidden="true"><path d="M2.5 2.5l10 10M12.5 2.5l-10 10" stroke="currentColor" stroke-width="1.4"/></svg>',
  busca: '<svg viewBox="0 0 15 15" aria-hidden="true"><circle cx="6.5" cy="6.5" r="4.5" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M10 10l3.5 3.5" stroke="currentColor" stroke-width="1.4"/></svg>',
};

// ---------------------------------------------------------------- topo, menu e busca
const PAGINAS = [
  ["", "O caminho", "Por que e onde buscar votos para Lula no 2º turno, em 10 posts."],
  ["na-pratica/", "Na prática", "Cidade por cidade: por frente, porte e estado. Roteiros por região."],
  ["reels/", "Kit de reels", "Um vídeo por cidade, aberto por uma notícia local: toca aqui e baixa em MP4. Com roteiro e vídeos do Radar da Virada."],
  ["metodo/", "Método e fontes", "De onde vêm os números, a conta de cada frente em gráficos, os limites e as regras eleitorais."],
];

// as mesmas abas em todas as páginas; a ficha da cidade fica sob "Na prática"
const ABAS = [["", "O caminho"], ["na-pratica/", "Na prática"], ["reels/", "Reels"], ["metodo/", "Método"]];

export function montarTopo({ pagina = "", painel = null } = {}) {
  const dias = diasAte2T();
  const topo = document.createElement("header");
  topo.className = "topo";
  topo.innerHTML = `
    <div class="topo__esq">
      <button class="pill pill--ico" type="button" data-menu aria-label="Abrir menu" aria-expanded="false">${ICO.menu}</button>
      <button class="pill pill--ico" type="button" data-busca aria-label="Buscar cidade" aria-expanded="false">${ICO.busca}</button>
      <a class="pill marca" href="${RAIZ}"><b>Contra Dados</b><span class="oculto-movel">– Onde buscar votos</span></a>
    </div>
    <div class="topo__dir">
      <a class="mais mais--acento" href="${RAIZ}na-pratica/"><span class="mais__txt"><span class="oculto-movel">Cidade por cidade</span><span class="so-movel">Cidades</span></span><span class="mais__ico" aria-hidden="true">+</span></a>
      <a class="mais mais--branco oculto-movel" href="${RAIZ}reels/"><span class="mais__txt">Kit de reels</span><span class="mais__ico" aria-hidden="true">+</span></a>
    </div>`;
  document.body.prepend(topo);
  if (pagina !== "") {
    const fundo = document.createElement("div");
    fundo.className = "topo-fundo";
    fundo.setAttribute("aria-hidden", "true");
    document.body.prepend(fundo);
  }

  const barra = document.createElement("nav");
  barra.className = "abas";
  barra.setAttribute("aria-label", "Seções");
  const ativa = pagina === "cidade/" ? "na-pratica/" : pagina;
  barra.innerHTML = ABAS.map(([h, t]) => `<a class="pill${h === ativa ? " ativa" : ""}" href="${RAIZ}${h}"${h === pagina ? ' aria-current="page"' : ""}>${t}</a>`).join("") +
    (dias >= 0 ? `<span class="pill pill--branco contagem oculto-movel" title="Segundo turno em 25 de outubro de 2026">25/10 · ${dias === 0 ? "é hoje" : dias === 1 ? "falta 1 dia" : `faltam ${dias} dias`}</span>` : "");
  topo.after(barra);

  const menu = document.createElement("div");
  menu.className = "menu";
  menu.hidden = true;
  menu.id = "menu";
  menu.innerHTML = `
    <nav class="menu__lista" aria-label="Páginas">
      ${PAGINAS.map(([h, t, d]) => `<a class="pill" href="${RAIZ}${h}"${h === pagina ? ' aria-current="page"' : ""}>${t}</a><small>${d}</small>`).join("")}
    </nav>
    <nav class="menu__pe" aria-label="Links">
      <a class="pill" href="https://github.com/mneunomne/contradados" target="_blank" rel="noopener">Código no GitHub</a>
      <a class="pill" href="https://radardavirada.pages.dev/" target="_blank" rel="noopener">Radar da Virada</a>
      <a class="pill" href="${RAIZ}data/municipios.csv" download>Baixar dados (CSV)</a>
      <a class="pill" href="${RAIZ}metodo/#regras">Regras eleitorais</a>
    </nav>`;
  document.body.append(menu);

  const bMenu = topo.querySelector("[data-menu]");
  const abrirMenu = (sim) => {
    menu.hidden = !sim;
    bMenu.setAttribute("aria-expanded", String(sim));
    bMenu.setAttribute("aria-label", sim ? "Fechar menu" : "Abrir menu");
    bMenu.innerHTML = sim ? ICO.fechar : ICO.menu;
    document.documentElement.style.overflow = sim ? "hidden" : "";
    if (sim) abrirBusca(false);
  };
  bMenu.addEventListener("click", () => abrirMenu(menu.hidden));

  // busca de cidade
  const caixa = document.createElement("div");
  caixa.className = "busca";
  caixa.hidden = true;
  caixa.innerHTML = `<label class="sr" for="busca-cidade">Buscar cidade</label><input id="busca-cidade" type="search" autocomplete="off" placeholder="Digite o nome da cidade"><ul role="listbox" aria-label="Cidades"></ul>`;
  document.body.append(caixa);
  const bBusca = topo.querySelector("[data-busca]");
  const inp = caixa.querySelector("input"), ul = caixa.querySelector("ul");
  let lista = null, sel = 0;
  async function abrirBusca(sim) {
    caixa.hidden = !sim;
    bBusca.setAttribute("aria-expanded", String(sim));
    if (!sim) return;
    abrirMenu(false);
    inp.focus();
    if (!lista) {
      const b = await json("data/busca.json");
      lista = b.map(([ibge, nome, uf, pop]) => ({ ibge, nome, uf, pop, k: semAcento(nome) }));
    }
    filtrar();
  }
  function filtrar() {
    if (!lista) return;
    const q = semAcento(inp.value.trim());
    const res = (q ? lista.filter((d) => d.k.includes(q)).sort((a, b) => (b.k.startsWith(q) - a.k.startsWith(q)) || (b.pop - a.pop)) : lista.slice().sort((a, b) => b.pop - a.pop)).slice(0, 12);
    sel = 0;
    ul.innerHTML = res.map((d, i) => `<li><a href="${RAIZ}cidade/?ibge=${d.ibge}" class="${i === 0 ? "sel" : ""}"><span>${esc(d.nome)} <small>${d.uf}</small></span><small>${d.pop ? grande(d.pop) + " hab." : ""}</small></a></li>`).join("");
  }
  bBusca.addEventListener("click", () => abrirBusca(caixa.hidden));
  inp.addEventListener("input", filtrar);
  inp.addEventListener("keydown", (e) => {
    const as = [...ul.querySelectorAll("a")];
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      sel = Math.max(0, Math.min(as.length - 1, sel + (e.key === "ArrowDown" ? 1 : -1)));
      as.forEach((a, i) => a.classList.toggle("sel", i === sel));
    } else if (e.key === "Enter" && as[sel]) location.href = as[sel].href;
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") { abrirMenu(false); abrirBusca(false); } });
  document.addEventListener("click", (e) => { if (!caixa.hidden && !caixa.contains(e.target) && !bBusca.contains(e.target)) abrirBusca(false); });

  if (painel) {
    const p = document.createElement("aside");
    p.className = "painel";
    p.setAttribute("aria-live", "polite");
    p.innerHTML = painel;
    document.body.append(p);
    return { topo, painel: p };
  }
  return { topo };
}

// ---------------------------------------------------------------- compartilhar
export function linkWhats(texto, url) {
  return "https://wa.me/?text=" + encodeURIComponent(texto + (url ? "\n" + url : ""));
}
export async function copiar(texto, botao) {
  try {
    await navigator.clipboard.writeText(texto);
    if (botao) { const t = botao.textContent; botao.textContent = "Copiado"; setTimeout(() => (botao.textContent = t), 1600); }
  } catch (e) {
    window.prompt("Copie o link:", texto);
  }
}
export function baixarArquivo(nome, conteudo, tipo = "text/csv;charset=utf-8") {
  const blob = conteudo instanceof Blob ? conteudo : new Blob([conteudo], { type: tipo });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = nome;
  document.body.append(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}

// ---------------------------------------------------------------- rodapé comum
export function rodape(extra = "") {
  const f = document.createElement("footer");
  f.className = "rodape";
  f.innerHTML = `
    <nav class="linha" aria-label="Rodapé">
      ${PAGINAS.map(([h, t]) => `<a class="pill pill--branco pill--p" href="${RAIZ}${h}">${t}</a>`).join("")}
    </nav>
    ${extra}
    <p>Dados: TSE (1º turno de 2026, arquivos de 08/10/2026, e eleições de 2022), IBGE (Censo 2022, malhas e regiões geográficas),
    Portal da Transparência (benefícios por município) e pesquisas AtlasIntel, Datafolha e Quaest com registro no TSE.
    Vídeos e temas: <a href="https://radardavirada.pages.dev/" target="_blank" rel="noopener">Radar da Virada</a>.
    Os números descrevem territórios, não pessoas. Os potenciais são tetos, não previsões. <a href="${RAIZ}metodo/">Método e limites</a>.</p>`;
  document.body.append(f);
}
