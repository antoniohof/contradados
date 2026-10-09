// Copia a versão anterior do site para site/arquivo/ (servida em /arquivo/).
//   node scripts/site/montar_arquivo.mjs
// Origem: site_simples/ (interface principal antiga) e docs/ (interface analítica, em /arquivo/mapas/).
// O resultado fica versionado: o deploy do Cloudflare não precisa de etapa de build.
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "../..");
const ARQ = join(REPO, "site/arquivo");
rmSync(ARQ, { recursive: true, force: true });
mkdirSync(join(ARQ, "data"), { recursive: true });

for (const f of ["index.html", "app.js", "relatorio.js", "style.css"]) cpSync(join(REPO, "site_simples", f), join(ARQ, f));
cpSync(join(REPO, "site_simples/data"), join(ARQ, "data"), { recursive: true, filter: (s) => statSync(s).isDirectory() || s.endsWith(".json") });
cpSync(join(REPO, "docs"), join(ARQ, "mapas"), { recursive: true });

// faixa no topo das páginas antigas, com link para a versão atual
const faixa = (raiz) => `<div style="position:sticky;top:0;z-index:9999;display:flex;gap:8px;align-items:center;justify-content:center;flex-wrap:wrap;padding:6px 10px;background:#dccdfb;color:#000;font:500 15px/18px Helvetica,Arial,sans-serif">` +
  `Versão anterior (arquivo, 08/10/2026). <a href="${raiz}" style="color:#000;font-weight:700">Ir para o site atual →</a></div>`;
for (const [arq, raiz] of [[join(ARQ, "index.html"), "../"], [join(ARQ, "mapas/index.html"), "../../"]]) {
  const html = readFileSync(arq, "utf8")
    // bibliotecas servidas pelo próprio site, sem CDN
    .replace("https://cdnjs.cloudflare.com/ajax/libs/d3/7.9.0/d3.min.js", raiz + "assets/vendor/d3-7.9.0.min.js")
    .replace("https://cdn.jsdelivr.net/npm/topojson-client@3.1.0/dist/topojson-client.min.js", raiz + "assets/vendor/topojson-client-3.1.0.min.js");
  writeFileSync(arq, html.replace(/<body([^>]*)>/, (m) => m + "\n" + faixa(raiz)));
}
console.log("arquivo montado em site/arquivo/");
