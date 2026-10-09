"""Valida o pacote público usando apenas a biblioteca padrão (sem rede)."""
import ast
import csv
import json
import math
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]


def load(path):
    with open(REPO / path, encoding="utf-8") as f:
        return json.load(f)


def require(condition, message):
    if not condition:
        raise ValueError(message)


for folder in ("scripts", "site_simples/build"):
    for path in (REPO / folder).rglob("*.py"):
        ast.parse(path.read_text(encoding="utf-8"), filename=str(path))

# O universo completo tem 5.571 registros; o site comparativo exclui o
# município novo sem histórico. Não confundir com exclusão do exterior.
master = {}
with open(REPO / "data/tse/municipios_master.csv", encoding="utf-8") as f:
    for row in csv.DictReader(f):
        require(row["IBGE"] not in master, "Código duplicado na base mestre")
        master[row["IBGE"]] = row
source = load("docs/data/municipios.json")
extra = load("docs/data/extra.json")
site = load("site_simples/data/municipios.json")
mapa = load("site_simples/data/mapa.json")
expected = {k for k, row in source.items() if row.get("l22t2") is not None}
require(set(site["mun"]) == expected, "Site diverge do universo comparável")
require(len(master) == len(source) == 5571, "Universo da base oficial mudou; revisar cobertura")
for code, row in site["mun"].items():
    require(code.isdigit() and len(code) == 7, f"Código IBGE inválido: {code}")
    official = master[code]
    require(row["apt"] == int(float(official["aptos_2026_1t"])), f"Aptos divergentes: {code}")
    require(row["dif"] == int(float(official["votos_lula_2026"])) - int(float(official["votos_flavio_2026"])), f"Margem divergente: {code}")
    require(row.get("apt22") == int(float(official["aptos_2022_1t"])), f"Histórico de aptos ausente: {code}")
    require(row["jogo"] >= 0 and row["aus"] >= 0, f"Contagem negativa: {code}")
    for key, value in row.items():
        if isinstance(value, float):
            require(math.isfinite(value), f"Número não finito: {code}/{key}")
    if code in extra["mun"]:
        require(row.get("gc") == extra["mun"][code].get("gc"), f"Comparação de governador perdida: {code}")
require(sum(row["dif"] == 0 for row in site["mun"].values()) == 2, "Empates divergentes")
with open(REPO / "data/socio/ibge_censo2022.csv", encoding="utf-8") as f:
    for row in csv.DictReader(f):
        if row["ibge"] in site["mun"] and row["renda_mediana"]:
            require(site["mun"][row["ibge"]].get("rmd") == float(row["renda_mediana"]), "Renda perdida no build")
require(mapa["w"] > 0 and mapa["h"] > 0 and len(mapa["p"]) > 5500, "Mapa incompleto")
for name in ("index.html", "app.js", "relatorio.js", "style.css"):
    require((REPO / "site_simples" / name).is_file(), f"Arquivo público ausente: {name}")
print(f"OK: Python, {len(master)} registros oficiais, {len(expected)} municípios comparáveis, empates, Censo e governadores")
