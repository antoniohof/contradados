"""Monta os dados do site (site/data/) a partir das bases versionadas do repositório.

Uso, na raiz do repositório:
    python3 scripts/site/build_dados.py   # junta as bases (só biblioteca padrão do Python)
    node scripts/site/resumo.mjs          # aplica a conta (site/assets/js/frentes.js) e gera os resumos

Entradas
  docs/data/municipios.json                 base municipal do TSE (1º turno de 2026, retrato de 08/10/2026)
  docs/data/municipios.topo.json            malha municipal do IBGE (centroides e divisas)
  data/ibge/populacao_censo2022.csv         população do Censo 2022 (IBGE, API de agregados, tabela 4709)
  data/ibge/regioes_geograficas.csv         regiões geográficas imediatas e intermediárias (IBGE, 2017)
  data/beneficios/beneficios_municipio.csv  Portal da Transparência: valores por município (R$ mil)
  data/socio/ibge_censo2022.csv             urbanização e religião (Censo 2022)
  data/geo/arranjos_populacionais_ibge_2015.csv
  data/canais/canais.csv                    canais públicos (prefeitura, câmara, imprensa local)
  data/radar/radar_2026-10-09.json          recorte do Radar da Virada (temas com fonte e vídeos)
  data/noticias/noticias_locais.json        notícias e pautas locais das cidades pequenas (ganchos dos reels)
  data/prefeitos/prefeitos_pl.json          fatos documentados da gestão de prefeitos eleitos pelo PL (reels)

Saídas em site/data/
  municipios.csv        uma linha por município; as contas das frentes ficam no navegador
  municipios.topo.json  malha municipal (página Mapa)
  divisas.json          divisas estaduais e fronteira, simplificadas (mapas de pontos)
  regioes.json          nomes das regiões imediatas e intermediárias
  locais.json           economia e pautas locais com fontes (pesquisa local, ~300 cidades)
  canais.json           canais públicos por município
  radar.json            temas e vídeos do Radar da Virada
  noticias.json         ganchos locais por município, do melhor para o pior
  prefeitos.json        prefeitos do PL com fato documentado: frase do vídeo, estágio, fonte
"""
import csv
import json
import math
import re
import shutil
from collections import defaultdict
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
OUT = REPO / "site/data"

COLS = ["ibge", "municipio", "uf", "capital", "pop_2022", "aptos_26", "ausentes_26", "votos_lula_26", "votos_flavio_26",
        "votos_terceiros_26", "terceiros_26_pct", "caiado_26_pct", "renan_26_pct", "cury_26_pct",
        "lula_22_pct", "bolsonaro_22_pct", "lula_2t22_pct", "abstencao_22_pct", "arranjo_codigo", "arranjo_nome",
        "regiao_imediata", "lon", "lat", "bolsa_familia_mil", "bpc_mil", "pe_de_meia_mil", "garantia_safra_mil",
        "urbana_pct", "evangelicos_pct", "eleitores_16a24_pct", "eleitores_60mais_pct", "eleitores_70mais",
        "prefeito_partido", "prefeito_bloco", "gov_2t"]


MINUSCULAS = re.compile(r"\b(De|Da|Do|Das|Dos|E)\b")


def nome_bonito(n):
    """'São Francisco Do Conde' -> 'São Francisco do Conde' (o TSE capitaliza as preposições)."""
    return MINUSCULAS.sub(lambda m: m.group(1).lower(), n)


def ler_csv(caminho, chave="ibge"):
    with open(REPO / caminho, encoding="utf-8") as f:
        return {r[chave]: r for r in csv.DictReader(f)}


def arranjos():
    """Município -> (código, nome) do arranjo, só para arranjos com dois ou mais municípios."""
    grupos = defaultdict(list)
    with open(REPO / "data/geo/arranjos_populacionais_ibge_2015.csv", encoding="utf-8") as f:
        for r in csv.DictReader(f):
            grupos[(r["codigo_arranjo"], r["nome_arranjo"])].append(r["ibge"])
    return {m: g for g, ms in grupos.items() if len(ms) > 1 for m in ms}


# ---------------------------------------------------------------- malha
def decodificar_arcos(topo):
    sx, sy = topo["transform"]["scale"]
    tx, ty = topo["transform"]["translate"]
    arcos = []
    for arc in topo["arcs"]:
        x = y = 0
        pts = []
        for dx, dy in arc:
            x += dx
            y += dy
            pts.append((x * sx + tx, y * sy + ty))
        arcos.append(pts)
    return arcos


def anel(indices, arcos):
    pts = []
    for i in indices:
        a = arcos[i] if i >= 0 else arcos[~i][::-1]
        pts.extend(a if not pts else a[1:])
    return pts


def area_centroide(pts):
    a = cx = cy = 0.0
    for (x0, y0), (x1, y1) in zip(pts, pts[1:] + pts[:1]):
        k = x0 * y1 - x1 * y0
        a += k
        cx += (x0 + x1) * k
        cy += (y0 + y1) * k
    if abs(a) < 1e-12:
        xs, ys = zip(*pts)
        return 0.0, (sum(xs) / len(xs), sum(ys) / len(ys))
    return a / 2, (cx / (3 * a), cy / (3 * a))


def centroides(topo, arcos):
    """Centroide do maior polígono de cada município (ilhas não puxam o ponto para o mar)."""
    out = {}
    for g in topo["objects"]["municipios"]["geometries"]:
        polis = [g["arcs"]] if g["type"] == "Polygon" else g["arcs"]
        melhor = None
        for poli in polis:
            a, c = area_centroide(anel(poli[0], arcos))
            if melhor is None or abs(a) > melhor[0]:
                melhor = (abs(a), c)
        out[g["properties"]["id"]] = melhor[1]
    return out


def simplificar(pts, tol):
    """Douglas-Peucker em graus (suficiente para divisas desenhadas em escala de país)."""
    if len(pts) < 3:
        return pts
    (x0, y0), (x1, y1) = pts[0], pts[-1]
    dx, dy = x1 - x0, y1 - y0
    n = math.hypot(dx, dy) or 1e-12
    dmax, imax = -1, 0
    for i in range(1, len(pts) - 1):
        x, y = pts[i]
        d = abs(dy * x - dx * y + x1 * y0 - y1 * x0) / n if (dx or dy) else math.hypot(x - x0, y - y0)
        if d > dmax:
            dmax, imax = d, i
    if dmax <= tol:
        return [pts[0], pts[-1]]
    return simplificar(pts[: imax + 1], tol)[:-1] + simplificar(pts[imax:], tol)


def divisas(topo, arcos, tol=0.012):
    """Arcos entre estados diferentes (divisas) e arcos de uso único (fronteira e litoral)."""
    usos = defaultdict(list)
    for g in topo["objects"]["municipios"]["geometries"]:
        uf = g["properties"]["uf"]
        polis = [g["arcs"]] if g["type"] == "Polygon" else g["arcs"]
        for poli in polis:
            for ring in poli:
                for i in ring:
                    usos[i if i >= 0 else ~i].append(uf)
    uf_lin, br_lin = [], []
    for i, ufs in usos.items():
        if len(ufs) == 1:
            destino = br_lin
        elif len(set(ufs)) > 1:
            destino = uf_lin
        else:
            continue
        pts = simplificar(arcos[i], tol)
        destino.append([[round(x, 3), round(y, 3)] for x, y in pts])
    return {"uf": uf_lin, "br": br_lin}


# ---------------------------------------------------------------- principal
def main():
    base = json.loads((REPO / "docs/data/municipios.json").read_text(encoding="utf-8"))
    topo = json.loads((REPO / "docs/data/municipios.topo.json").read_text(encoding="utf-8"))
    arcos = decodificar_arcos(topo)
    cent = centroides(topo, arcos)
    pop = ler_csv("data/ibge/populacao_censo2022.csv")
    reg = ler_csv("data/ibge/regioes_geograficas.csv")
    ben = ler_csv("data/beneficios/beneficios_municipio.csv")
    soc = ler_csv("data/socio/ibge_censo2022.csv")
    arr = arranjos()
    OUT.mkdir(parents=True, exist_ok=True)

    def pct(v):
        return "" if v is None else round(v * 100, 1)

    with open(OUT / "municipios.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(COLS)
        for k in sorted(base):
            d = base[k]
            a = arr.get(k, ("", ""))
            lon, lat = cent.get(k, (None, None))
            b = ben.get(k, {})
            s = soc.get(k, {})
            jov = None if d.get("i16") is None else (d.get("i16") or 0) + (d.get("i18") or 0)
            ido = None if d.get("i60") is None else (d.get("i60") or 0) + (d.get("i70") or 0)
            w.writerow([
                k, nome_bonito(d["n"]), d["uf"], 1 if d.get("cap") else 0, pop.get(k, {}).get("populacao_2022", ""),
                d["apt"], d["aus"], d["vl"], d["vf"], d["vt3"], d["t26"], d.get("cai") or 0, d.get("ren") or 0, d.get("cur") or 0,
                d.get("l22", ""), d.get("b22", ""), d.get("l22t2", ""), d.get("a22", ""), a[0], a[1],
                reg.get(k, {}).get("regiao_imediata_codigo", ""),
                "" if lon is None else round(lon, 4), "" if lat is None else round(lat, 4),
                b.get("bolsa_familia_ago2026_mil", ""), b.get("bpc_ago2026_mil", ""), b.get("pe_de_meia_jan_ago2026_mil", ""),
                b.get("garantia_safra_2025_mil", ""),
                s.get("urb", ""), s.get("evg", ""), pct(jov), pct(ido), d.get("i70n") if d.get("i70n") is not None else "",
                d.get("pp") or "", d.get("pb") or "", 1 if d.get("g2t") else 0,
            ])

    # busca de cidades (topo de todas as páginas)
    busca = [[k, nome_bonito(base[k]["n"]), base[k]["uf"], int(pop[k]["populacao_2022"]) if k in pop else 0] for k in sorted(base)]
    (OUT / "busca.json").write_text(json.dumps(busca, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")

    # regiões geográficas
    imediatas, inter = {}, {}
    for r in reg.values():
        imediatas[r["regiao_imediata_codigo"]] = [r["regiao_imediata"], r["regiao_intermediaria_codigo"]]
        inter[r["regiao_intermediaria_codigo"]] = r["regiao_intermediaria"]
    (OUT / "regioes.json").write_text(json.dumps({"imediatas": imediatas, "intermediarias": inter}, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")

    # pesquisa local (economia e pautas com fontes)
    locais = {}
    for k, d in base.items():
        if d.get("pau") or d.get("eco"):
            locais[k] = {
                "economia": d.get("eco") or "",
                "pautas": [p.strip() for p in (d.get("pau") or "").split("|") if p.strip()],
                "fontes": [u.strip() for u in (d.get("fon") or "").split("|") if u.strip().startswith("http")],
            }
    (OUT / "locais.json").write_text(json.dumps(locais, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")

    # canais públicos
    canais = defaultdict(list)
    with open(REPO / "data/canais/canais.csv", encoding="utf-8") as f:
        for r in csv.DictReader(f):
            if r["url"].startswith("http"):
                canais[r["ibge"]].append([r["tipo"], r["nome"], r["plataforma"], r["url"]])
    (OUT / "canais.json").write_text(json.dumps(canais, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")

    # malhas
    (OUT / "divisas.json").write_text(json.dumps(divisas(topo, arcos), separators=(",", ":")), encoding="utf-8")
    shutil.copyfile(REPO / "docs/data/municipios.topo.json", OUT / "municipios.topo.json")
    shutil.copyfile(REPO / "data/radar/radar_2026-10-09.json", OUT / "radar.json")

    # notícias locais (ganchos dos reels): as confirmadas, recentes e de temas do dia a dia primeiro
    fonte_not = json.loads((REPO / "data/noticias/noticias_locais.json").read_text(encoding="utf-8"))
    prioritarios = {"saude", "agua", "estrada", "clima", "educacao", "emprego", "programa_federal", "moradia", "energia", "agricultura"}
    def nota(x):
        ano = x["data"][:4]
        return (2 if x["confirmado"] else 0) + (2 if ano == "2026" else 1 if ano == "2025" else 0) \
            + (1 if x["tom"] != "neutro" else 0) + (1 if x["tema"] in prioritarios else 0)
    noticias = {}
    for k, c in fonte_not["cidades"].items():
        itens = sorted(c["noticias"], key=lambda x: (nota(x), x["data"]), reverse=True)[:3]
        if itens:
            noticias[k] = [{"d": x["data"], "v": x["veiculo"], "u": x["url"], "r": x["resumo"], "te": x["tema"], "to": x["tom"], "g": x["gancho"], "c": int(x["confirmado"])} for x in itens]
    (OUT / "noticias.json").write_text(json.dumps(noticias, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")

    # prefeitos do PL com fato documentado (o mais recente primeiro)
    fonte_pref = json.loads((REPO / "data/prefeitos/prefeitos_pl.json").read_text(encoding="utf-8"))
    prefeitos = {}
    for k, c in fonte_pref["cidades"].items():
        itens = sorted(c["itens"], key=lambda x: x["data"], reverse=True)
        prefeitos[k] = {"p": c["prefeito"], "g": c["genero"], "pc": int(c["partido_confirmado"]),
                        "i": [{"d": x["data"], "t": x["tela"], "e": x["estagio"], "f": x["fato"], "v": x["veiculo"], "u": x["url"],
                               "r": x["resposta"], "c": int(x["confirmado"])} for x in itens]}
    (OUT / "prefeitos.json").write_text(json.dumps(prefeitos, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")

    sem_pop = [k for k in base if k not in pop]
    print(f"{len(base)} municípios -> {OUT.relative_to(REPO)}/municipios.csv; sem Censo: {sem_pop}; "
          f"{len(locais)} com pesquisa local; {len(canais)} com canais; {len(noticias)} com notícia local; "
          f"{len(prefeitos)} com fato sobre prefeito do PL")


if __name__ == "__main__":
    main()
