"""Tabela por município-zona eleitoral: perfil do eleitorado 2026 + votos e comparecimento 2022/2026.

Unidade: par (município, zona), a menor unidade com perfil e votos publicados juntos no TSE.
Zonas que mudaram entre 2022 e 2026 (rezoneamento) ficam sem dados de 2022 e são marcadas.

Saída: data/demografia/zonas.csv
"""
import sys
import zipfile
from pathlib import Path
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "tse"))
from common import REPO, TSE_RAW, tse_to_ibge  # noqa: E402
from http_zip import HttpFile  # noqa: E402

OUT = REPO / "data/demografia"
CDN = "https://cdn.tse.jus.br/estatistica/sead/odsele"
KEY = ["CD_MUNICIPIO", "NR_ZONA"]
PRES26 = {"LULA": "lula", "FLAVIO BOLSONARO": "flavio", "RONALDO CAIADO": "caiado", "RENAN SANTOS": "renan",
          "ESCRITOR AUGUSTO CURY": "cury"}
PRES22 = {"LULA": "lula", "JAIR BOLSONARO": "bolso", "SIMONE TEBET": "tebet", "CIRO GOMES": "ciro"}


def norm(d):
    d = d[d.SG_UF != "ZZ"].copy()
    d["CD_MUNICIPIO"] = d.CD_MUNICIPIO.str.zfill(5)
    d["NR_ZONA"] = d.NR_ZONA.astype(int)
    return d


def votos(fobj, member, names, turno="1"):
    cols = ["NR_TURNO", "SG_UF", "CD_MUNICIPIO", "NR_ZONA", "CD_CARGO", "NM_URNA_CANDIDATO", "QT_VOTOS_NOMINAIS_VALIDOS"]
    parts = []
    with zipfile.ZipFile(fobj) as z:
        for ch in pd.read_csv(z.open(member), sep=";", encoding="latin1", dtype=str, usecols=cols, chunksize=500_000):
            ch = norm(ch[(ch.CD_CARGO == "1") & (ch.NR_TURNO == turno)])
            ch["k"] = ch.NM_URNA_CANDIDATO.map(names).fillna("outros")
            ch["v"] = ch.QT_VOTOS_NOMINAIS_VALIDOS.astype(int)
            parts.append(ch.groupby(KEY + ["k"]).v.sum())
    w = pd.concat(parts).groupby(level=[0, 1, 2]).sum().unstack(fill_value=0)
    w["validos"] = w.sum(axis=1)
    return w


def comparec(path, turno="1"):
    with zipfile.ZipFile(path) as z:
        name = [n for n in z.namelist() if n.endswith("_BR.csv")][0]
        d = norm(pd.read_csv(z.open(name), sep=";", encoding="latin1", dtype=str))
    d = d[(d.CD_CARGO == "1") & (d.NR_TURNO == turno)]
    num = ["QT_APTOS", "QT_COMPARECIMENTO", "QT_ABSTENCOES", "QT_VOTOS_BRANCOS", "QT_TOTAL_VOTOS_NULOS"]
    d[num] = d[num].astype(int)
    return d.groupby(KEY)[num].sum()


def perfil():
    cols = ["SG_UF", "CD_MUNICIPIO", "NR_ZONA", "DS_GENERO", "DS_FAIXA_ETARIA", "DS_GRAU_ESCOLARIDADE", "DS_ESTADO_CIVIL", "QT_ELEITORES"]
    sys.path.insert(0, str(REPO / "scripts/tse"))
    from importlib import import_module
    pe = import_module("03_perfil_eleitorado")
    parts = []
    with zipfile.ZipFile(TSE_RAW / "tse_2026/perfil_eleitorado_2026.zip") as z:
        for name in z.namelist():
            if not name.endswith(".csv") or name.endswith(("_ZZ.csv", "_BRASIL.csv")):
                continue
            for ch in pd.read_csv(z.open(name), sep=";", encoding="latin1", dtype=str, usecols=cols, chunksize=1_000_000):
                ch = norm(ch)
                ch["n"] = ch.QT_ELEITORES.astype(int)
                ch["idade"] = ch.DS_FAIXA_ETARIA.map(pe.faixa)
                ch["esc"] = ch.DS_GRAU_ESCOLARIDADE.map(pe.ESC)
                ch["casado"] = ch.DS_ESTADO_CIVIL.eq("CASADO")
                ch["mulher"] = ch.DS_GENERO.eq("FEMININO")
                parts.append(ch.groupby(KEY + ["idade", "esc", "mulher", "casado"], dropna=False).n.sum())
            print(name, file=sys.stderr)
    p = pd.concat(parts).groupby(level=list(range(6)), dropna=False).sum().reset_index()
    tot = p.groupby(KEY).n.sum()
    out = pd.DataFrame({"eleitorado": tot})
    for col, pref in [("idade", "idade"), ("esc", "escol")]:
        w = p.pivot_table(index=KEY, columns=col, values="n", aggfunc="sum", fill_value=0)
        for c in w.columns:
            out[f"{pref}_{c}"] = (w[c] / tot).round(4)
    out["mulheres"] = (p[p.mulher].groupby(KEY).n.sum() / tot).round(4)
    out["casados"] = (p[p.casado].groupby(KEY).n.sum() / tot).round(4)
    # cruzamento idade × gênero (para os elos fracos por segmento)
    ag = p.groupby(KEY + ["idade", "mulher"]).n.sum().unstack(["idade", "mulher"], fill_value=0)
    for (i, m) in ag.columns:
        out[f"n_{i}_{'F' if m else 'M'}"] = ag[(i, m)]
    return out


def main():
    print("perfil…", file=sys.stderr)
    P = perfil()
    print("votos 2026…", file=sys.stderr)
    v26 = votos(TSE_RAW / "tse_2026/votacao_candidato_munzona_2026.zip", "votacao_candidato_munzona_2026_BR.csv", PRES26)
    print("votos 2022 (zip remoto, só o membro _BR)…", file=sys.stderr)
    v22 = votos(HttpFile(f"{CDN}/votacao_candidato_munzona/votacao_candidato_munzona_2022.zip"),
                "votacao_candidato_munzona_2022_BR.csv", PRES22)
    c26 = comparec(TSE_RAW / "tse_2026/detalhe_votacao_munzona_2026.zip")
    c22 = comparec(TSE_RAW / "tse_2026/detalhe_votacao_munzona_2022.zip")

    z = P.copy()
    for k in ["lula", "flavio", "caiado", "renan", "cury"]:
        z[f"{k}26"] = (v26[k] / v26.validos * 100).round(2)
    z["terceiros26"] = (100 - z.lula26 - z.flavio26).round(2)
    z["votos_flavio26"], z["votos_lula26"], z["validos26"] = v26.flavio, v26.lula, v26.validos
    for k in ["lula", "bolso", "tebet", "ciro"]:
        z[f"{k}22"] = (v22[k] / v22.validos * 100).round(2)
    z["votos_bolso22"], z["validos22"] = v22.bolso, v22.validos
    z["aptos26"], z["abst26"] = c26.QT_APTOS, (c26.QT_ABSTENCOES / c26.QT_APTOS * 100).round(2)
    z["bn26"] = ((c26.QT_VOTOS_BRANCOS + c26.QT_TOTAL_VOTOS_NULOS) / c26.QT_COMPARECIMENTO * 100).round(2)
    z["aptos22"], z["abst22"] = c22.QT_APTOS, (c22.QT_ABSTENCOES / c22.QT_APTOS * 100).round(2)
    z["margem22"] = z.lula22 - z.bolso22
    z["margem26"] = z.lula26 - z.flavio26
    z["swing"] = (z.margem26 - z.margem22).round(2)
    z["flavio_menos_jair"] = (z.flavio26 - z.bolso22).round(2)
    z["d_abst"] = (z.abst26 - z.abst22).round(2)
    # zona comparável se o eleitorado não mudou mais de 15% entre 2022 e 2026
    z["comparavel"] = (z.aptos22 > 0) & ((z.aptos26 / z.aptos22 - 1).abs() <= 0.15)
    z = z.reset_index()
    xw = tse_to_ibge()
    z.insert(0, "IBGE", z.CD_MUNICIPIO.map(xw))
    uf = pd.read_csv(REPO / "data/tse/municipios_master.csv", dtype={"IBGE": str}, usecols=["IBGE", "municipio", "uf", "regiao"])
    z = uf.merge(z, on="IBGE", how="right")
    z.to_csv(OUT / "zonas.csv", index=False)
    print(z.shape, "comparáveis:", int(z.comparavel.sum()), "| flávio-jair médio ponderado:",
          round((z.flavio_menos_jair * z.aptos26).sum() / z.aptos26.sum(), 2), file=sys.stderr)


if __name__ == "__main__":
    main()
