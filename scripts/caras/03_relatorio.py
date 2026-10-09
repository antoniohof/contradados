"""Junta pessoas (TSE), fotos e notícias (data/caras/noticias/lote_*.json) por município.

Saídas:
- data/caras/caras.json: {"municipios": {IBGE: {...números, "pessoas": [...]}}, "uf": {UF: [...]}}.
  É o formato combinado com elei-es-31 para a seção "Rostos" do site docs/.
- HTML autocontido (fotos em data: URI) no caminho dado em argv[1], para publicar.
"""
import base64
import json
import sys
from pathlib import Path
import pandas as pd

REPO = Path(__file__).resolve().parents[2]
D = REPO / "data/caras"

pes = pd.read_csv(D / "pessoas.csv", dtype=str).fillna("")
base = pd.read_csv(REPO / "data/demografia/municipal_base.csv", dtype={"IBGE": str})
alvo = base[base.alvo_ii_flavio_menos_bolso22 < 0].sort_values("aptos26", ascending=False)
proj = pd.read_csv(REPO / "data/pesquisas/datafolha_municipios.csv", dtype={"IBGE": str}).set_index("IBGE")

# notícias: chave (ano, sq); pessoas fora da base TSE entram por (uf, municipio)
news, extras = {}, []
for f in sorted((D / "noticias").glob("lote_*.json")):
    for p in json.loads(f.read_text()).get("pessoas", []):
        if p.get("sq"):
            news[(str(p.get("ano", "")), str(p["sq"]))] = p
        else:
            extras.append(p)

ORDEM = ["prefeito", "vice", "vereador", "deputado(a) federal", "deputado(a) estadual", "deputado(a) distrital",
         "governador", "senador"]


def ordem(papel):
    return next((i for i, k in enumerate(ORDEM) if papel.startswith(k)), 99)


def pessoa(r):
    n = news.get((r.ano, r.sq), {})
    foto = D / r.foto
    return {
        "cargo": r.papel, "nome": r.nome_urna, "nome_completo": r.nome, "partido": r.partido,
        "situacao": r.situacao, "votos_no_municipio": int(float(r.votos_no_municipio)) if r.votos_no_municipio else None,
        "foto": r.foto if foto.exists() else None,
        "posicao_2t": n.get("posicao_2t"), "pontos": n.get("pontos", []), "sem_noticias": n.get("sem_noticias"),
        "pesquisado": bool(n),
    }


def extra(p):
    return {"cargo": p.get("papel", ""), "nome": p.get("nome_urna", ""), "nome_completo": p.get("nome", ""),
            "partido": p.get("partido", ""), "situacao": "", "votos_no_municipio": None, "foto": None,
            "posicao_2t": p.get("posicao_2t"), "pontos": p.get("pontos", []), "sem_noticias": p.get("sem_noticias"),
            "pesquisado": True, "obs": p.get("obs", "")}


out = {"gerado_em": "2026-10-09", "municipios": {}, "uf": {}}
for r in alvo.itertuples():
    g = pes[(pes.escopo == "municipio") & (pes.ibge == r.IBGE)].copy()
    g["o"] = g.papel.map(ordem)
    g["v"] = pd.to_numeric(g.votos_no_municipio, errors="coerce").fillna(0)
    pessoas = [pessoa(x) for x in g.sort_values(["o", "v"], ascending=[True, False]).itertuples()]
    pessoas += [extra(p) for p in extras if p.get("municipios", "").lower() == r.municipio.lower()]
    out["municipios"][r.IBGE] = {
        "municipio": r.municipio, "uf": r.uf, "regiao": r.regiao, "aptos26": int(r.aptos26),
        "lula26": r.lula26, "flavio26": r.flavio26, "bolso22": r.bolso22, "lula22": r.lula22,
        "flavio_menos_jair": round(r.alvo_ii_flavio_menos_bolso22, 2), "swing": r.swing,
        "abst26": r.abst26, "d_abst": r.d_abst, "terceiros26": r.terceiros26, "caiado26": r.caiado26,
        "renan26": r.renan26, "cury26": r.cury26,
        "mulheres_pct": round(100 * r.mulheres_pct, 1), "superior_pct": round(100 * r.escol_superior_pct, 1),
        "idosos_60_pct": round(100 * r.idosos_60mais_pct, 1),
        "lula2p_1t": float(proj.loc[r.IBGE, "lula2p_1t"]), "lula2p_datafolha_A": float(proj.loc[r.IBGE, "lula2p_A"]),
        "pessoas": pessoas,
    }
for uf, g in pes[pes.escopo == "uf"].groupby("uf"):
    g = g.assign(o=g.papel.map(ordem))
    out["uf"][uf] = [pessoa(x) for x in g.sort_values("o").itertuples()]
(D / "caras.json").write_text(json.dumps(out, ensure_ascii=False, indent=1))

n_p = sum(len(m["pessoas"]) for m in out["municipios"].values()) + sum(len(v) for v in out["uf"].values())
n_news = len(news)
print(f"{len(out['municipios'])} municípios, {n_p} fichas, {n_news} pessoas com pesquisa de notícias")

if len(sys.argv) > 1:
    fotos = {}
    for f in sorted((D / "fotos").glob("*.jpg")):
        fotos["fotos/" + f.name] = "data:image/jpeg;base64," + base64.b64encode(f.read_bytes()).decode()
    tpl = (REPO / "scripts/caras/relatorio.html").read_text()
    data = json.dumps(out, ensure_ascii=False).replace("</", "<\\/")
    page = tpl.replace("/*__DATA__*/null", data).replace("/*__FOTOS__*/null", json.dumps(fotos))
    Path(sys.argv[1]).write_text(page)
    print("html:", sys.argv[1], f"{len(page) / 1e6:.1f} MB")
