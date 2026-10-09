"""Fotos oficiais de candidatura (TSE, divulgação) das pessoas de data/caras/pessoas.csv.

Lê só os jpgs necessários dos zips do CDN do TSE por HTTP Range (o zip de GO 2024 tem 586 MB),
e grava miniaturas de 160 px (sips, macOS) em data/caras/fotos/{ano}_{sq}.jpg.
Rodar de novo só baixa o que falta.
"""
import subprocess
import sys
import tempfile
import zipfile
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import pandas as pd

REPO = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO / "scripts/demografia"))
from http_zip import HttpFile  # noqa: E402

FOTOS = REPO / "data/caras/fotos"
FOTOS.mkdir(parents=True, exist_ok=True)
URL = "https://cdn.tse.jus.br/estatistica/sead/eleicoes/eleicoes{ano}/fotos/foto_cand{ano}_{uf}_div.zip"

p = pd.read_csv(REPO / "data/caras/pessoas.csv", dtype=str).drop_duplicates(["ano", "sq"])
p = p[~p.foto.map(lambda f: (REPO / "data/caras" / f).exists())]


def lote(key):
    (ano, uf), g = key
    falta = []
    try:
        z = zipfile.ZipFile(HttpFile(URL.format(ano=ano, uf=uf), block=256 << 10))
    except Exception as e:  # noqa: BLE001
        return f"{ano} {uf}: zip indisponível ({e})", list(g.sq)
    nomes = {n.rsplit("/", 1)[-1].split("_")[0][3:]: n for n in z.namelist() if n.lower().endswith((".jpg", ".jpeg"))}
    for r in g.itertuples():
        n = nomes.get(r.sq)
        if not n:
            falta.append(r.sq)
            continue
        with tempfile.NamedTemporaryFile(suffix=".jpg") as t:
            t.write(z.read(n))
            t.flush()
            subprocess.run(["sips", "-Z", "160", "-s", "format", "jpeg", "-s", "formatOptions", "70",
                            t.name, "--out", str(FOTOS / f"{ano}_{r.sq}.jpg")], check=True, capture_output=True)
    return f"{ano} {uf}: {len(g) - len(falta)}/{len(g)}", falta


with ThreadPoolExecutor(6) as ex:
    res = list(ex.map(lote, p.groupby(["ano", "uf"])))
faltam = [sq for _, f in res for sq in f]
for msg, _ in res:
    print(msg)
print("sem foto:", len(faltam))
(REPO / "data/caras/sem_foto.txt").write_text("\n".join(faltam) + "\n")
