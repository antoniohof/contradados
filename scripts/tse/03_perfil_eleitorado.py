"""Perfil do eleitorado 2026 por município (TSE perfil_eleitorado_2026, julho/2026).

Faixas etárias agregadas em blocos que importam para o voto: 16–17 (facultativo),
18–24, 25–34, 35–44, 45–59, 60–69 e 70+ (facultativo). Também escolaridade e gênero.

Saída: data/tse/perfil_eleitorado_2026.csv
"""
import re
import zipfile
import pandas as pd
from common import TSE_RAW, OUT, tse_to_ibge

COLS = ["SG_UF", "CD_MUNICIPIO", "DS_GENERO", "DS_FAIXA_ETARIA", "DS_GRAU_ESCOLARIDADE", "QT_ELEITORES"]


def faixa(s):
    m = re.match(r"(\d+)", s)
    if not m:
        return None
    a = int(m.group(1))
    for lim, lab in [(17, "16_17"), (24, "18_24"), (34, "25_34"), (44, "35_44"), (59, "45_59"), (69, "60_69")]:
        if a <= lim:
            return lab
    return "70mais"


ESC = {"ANALFABETO": "sem_fundamental", "LÊ E ESCREVE": "sem_fundamental", "ENSINO FUNDAMENTAL INCOMPLETO": "sem_fundamental",
       "ENSINO FUNDAMENTAL COMPLETO": "fundamental", "ENSINO MÉDIO INCOMPLETO": "fundamental",
       "ENSINO MÉDIO COMPLETO": "medio", "SUPERIOR INCOMPLETO": "medio", "SUPERIOR COMPLETO": "superior"}


def main():
    z = zipfile.ZipFile(TSE_RAW / "tse_2026/perfil_eleitorado_2026.zip")
    parts = []
    for name in z.namelist():
        if not name.endswith(".csv") or name.endswith(("_ZZ.csv", "_BRASIL.csv")):
            continue
        for ch in pd.read_csv(z.open(name), sep=";", encoding="latin1", dtype=str, usecols=COLS, chunksize=1_000_000):
            ch["n"] = ch.QT_ELEITORES.astype(int)
            parts.append(ch.groupby(["CD_MUNICIPIO", "DS_GENERO", "DS_FAIXA_ETARIA", "DS_GRAU_ESCOLARIDADE"]).n.sum().reset_index())
        print(name)
    d = pd.concat(parts)
    d["CD_MUNICIPIO"] = d.CD_MUNICIPIO.str.zfill(5)
    d["faixa"] = d.DS_FAIXA_ETARIA.map(faixa)
    d["esc"] = d.DS_GRAU_ESCOLARIDADE.map(ESC)
    tot = d.groupby("CD_MUNICIPIO").n.sum()
    out = pd.DataFrame({"eleitorado_perfil_2026": tot})
    for col, pref in [("faixa", "idade"), ("esc", "escol")]:
        p = d.pivot_table(index="CD_MUNICIPIO", columns=col, values="n", aggfunc="sum", fill_value=0)
        for c in p.columns:
            out[f"{pref}_{c}_pct"] = (p[c] / tot).round(4)
    out["idade_70mais_n"] = d[d.faixa == "70mais"].groupby("CD_MUNICIPIO").n.sum()
    out["mulheres_pct"] = (d[d.DS_GENERO == "FEMININO"].groupby("CD_MUNICIPIO").n.sum() / tot).round(4)
    out.index = out.index.map(tse_to_ibge())
    out.index.name = "IBGE"
    out = out[out.index.notna()]
    out.reset_index().to_csv(OUT / "perfil_eleitorado_2026.csv", index=False)
    print(out.shape, "70+ no país:", int(out.idade_70mais_n.sum()))


if __name__ == "__main__":
    main()
