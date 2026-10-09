"""Gera os dados do mapa das três frentes (mapa_frentes/data/).

Entradas versionadas no repositório:
  docs/data/municipios.json          base municipal compilada do TSE (retrato de 08/10/2026)
  docs/data/municipios.topo.json     malha municipal do IBGE
  data/geo/arranjos_populacionais_ibge_2015.csv   arranjos populacionais do IBGE (2015, via geobr)

Saídas:
  mapa_frentes/data/municipios.csv   só os campos de entrada que a página usa; as contas
                                     das três frentes são feitas no navegador (função calcular)
  mapa_frentes/data/municipios.topo.json   cópia da malha

Uso, na raiz do repositório: python3 scripts/frentes/build_dados.py
Usa só a biblioteca padrão do Python.
"""
import csv
import json
import shutil
from collections import defaultdict
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
SRC = REPO / "docs/data/municipios.json"
ARR = REPO / "data/geo/arranjos_populacionais_ibge_2015.csv"
OUT = REPO / "mapa_frentes/data"

COLS = ["ibge", "municipio", "uf", "capital", "aptos_26", "ausentes_26", "votos_lula_26", "votos_flavio_26",
        "votos_terceiros_26", "terceiros_26_pct", "caiado_26_pct", "renan_26_pct", "cury_26_pct",
        "lula_22_pct", "bolsonaro_22_pct", "lula_2t22_pct", "abstencao_22_pct", "arranjo_codigo", "arranjo_nome"]


def arranjos():
    """Município -> (código, nome) do arranjo, só para arranjos com dois ou mais municípios."""
    grupos = defaultdict(list)
    with open(ARR, encoding="utf-8") as f:
        for r in csv.DictReader(f):
            grupos[(r["codigo_arranjo"], r["nome_arranjo"])].append(r["ibge"])
    return {m: g for g, ms in grupos.items() if len(ms) > 1 for m in ms}


def main():
    base = json.loads(SRC.read_text(encoding="utf-8"))
    arr = arranjos()
    OUT.mkdir(parents=True, exist_ok=True)
    with open(OUT / "municipios.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(COLS)
        for k in sorted(base):
            d = base[k]
            a = arr.get(k, ("", ""))
            w.writerow([k, d["n"], d["uf"], 1 if d.get("cap") else 0, d["apt"], d["aus"], d["vl"], d["vf"],
                        d["vt3"], d["t26"], d.get("cai") or 0, d.get("ren") or 0, d.get("cur") or 0,
                        d.get("l22", ""), d.get("b22", ""), d.get("l22t2", ""), d.get("a22", ""), a[0], a[1]])
    shutil.copyfile(REPO / "docs/data/municipios.topo.json", OUT / "municipios.topo.json")
    print(f"{len(base)} municípios; {len(arr)} em {len(set(arr.values()))} arranjos -> {OUT.relative_to(REPO)}")


if __name__ == "__main__":
    main()
