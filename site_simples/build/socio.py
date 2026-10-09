"""Junta indicadores do Censo 2022 ao JSON do site."""
import csv
import json
from pathlib import Path


def enrich(source, target):
    with open(target, encoding="utf-8") as f:
        data = json.load(f)
    count = 0
    fields = {"urb": "urb", "cat": "cat", "evg": "evg", "sem": "sem",
              "rmd": "renda_mediana", "rme": "renda_media", "ofo": "outras_fontes"}
    with open(source, encoding="utf-8", newline="") as f:
        for row in csv.DictReader(f):
            municipality = data["mun"].get(row["ibge"])
            if municipality is None:
                continue
            for key, column in fields.items():
                if row[column] != "":
                    municipality[key] = float(row[column])
            count += 1
    with open(target, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, separators=(",", ":"))
    return count


if __name__ == "__main__":
    repo = Path(__file__).resolve().parents[2]
    print(enrich(repo / "data/socio/ibge_censo2022.csv",
                 repo / "site_simples/data/municipios.json"))
