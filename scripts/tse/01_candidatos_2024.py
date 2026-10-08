"""Prefeitos e vereadores eleitos em 2024 por município (base oficial TSE consulta_cand_2024).

Saída: data/tse/poder_local_2024.csv (uma linha por município, chave IBGE).
"""
import sys
import zipfile
from pathlib import Path
from common import TSE_RAW, OUT, tse_to_ibge
import pandas as pd

RAW = TSE_RAW / "tse_2024"

# Classificação ideológica simplificada (partidos de 2024). Documentada no README.
ESQUERDA = {"PT", "PC do B", "PCdoB", "PV", "PSOL", "REDE", "PSB", "PDT", "PSTU", "PCO", "UP", "PCB"}
DIREITA = {"PL", "PP", "REPUBLICANOS", "UNIÃO", "NOVO", "PRD", "PRTB", "DC"}
# demais = centro (MDB, PSD, PSDB, CIDADANIA, PODE, AVANTE, SOLIDARIEDADE, AGIR, MOBILIZA, PMB)


def bloco(p):
    return "esquerda" if p in ESQUERDA else "direita" if p in DIREITA else "centro"


def main():
    with zipfile.ZipFile(RAW / "consulta_cand_2024.zip") as z:
        d = pd.read_csv(z.open("consulta_cand_2024_BRASIL.csv"), sep=";", encoding="latin1", dtype=str)
    d["DT"] = pd.to_datetime(d.DT_ELEICAO, format="%d/%m/%Y")
    eleito = d.DS_SIT_TOT_TURNO.str.startswith("ELEITO")

    xw = pd.Series(tse_to_ibge(), name="IBGE").rename_axis("SG_UE").reset_index()

    # Prefeito: eleito na eleição mais recente do município (suplementar substitui a ordinária)
    pref = d[(d.DS_CARGO == "PREFEITO") & eleito].sort_values("DT").groupby("SG_UE").tail(1)
    pref = pref.assign(
        idade=((pd.Timestamp("2026-10-04") - pd.to_datetime(pref.DT_NASCIMENTO, format="%d/%m/%Y", errors="coerce")).dt.days // 365),
        suplementar=(pref.CD_TIPO_ELEICAO == "1"),
    )
    comp = pref.DS_COMPOSICAO_COLIGACAO.fillna("").str.replace("#NULO", "")
    pref_out = pd.DataFrame({
        "SG_UE": pref.SG_UE,
        "prefeito": pref.NM_URNA_CANDIDATO.str.title(),
        "prefeito_partido": pref.SG_PARTIDO,
        "prefeito_bloco": pref.SG_PARTIDO.map(bloco),
        "prefeito_genero": pref.DS_GENERO.str.lower(),
        "prefeito_idade": pref.idade,
        "prefeito_ocupacao": pref.DS_OCUPACAO.str.capitalize(),
        "prefeito_instrucao": pref.DS_GRAU_INSTRUCAO.str.capitalize(),
        "prefeito_coligacao": comp.str.replace(" / ", ", "),
        "prefeito_coligacao_tem_PL": comp.str.contains(r"\bPL\b"),
        "prefeito_coligacao_tem_PT": comp.str.contains(r"\bPT\b"),
        "prefeito_turno": pref.NR_TURNO,
        "prefeito_eleicao_suplementar": pref.suplementar,
        "prefeito_sq": pref.SQ_CANDIDATO,
    })
    # vice da chapa eleita: mesmo SQ_COLIGACAO e eleição
    vice = d[d.DS_CARGO == "VICE-PREFEITO"].merge(pref[["SG_UE", "SQ_COLIGACAO", "CD_ELEICAO"]], on=["SG_UE", "SQ_COLIGACAO", "CD_ELEICAO"])
    vice = vice.groupby("SG_UE").head(1)[["SG_UE", "NM_URNA_CANDIDATO", "SG_PARTIDO"]]
    vice.columns = ["SG_UE", "vice_prefeito", "vice_partido"]
    vice["vice_prefeito"] = vice.vice_prefeito.str.title()

    # Candidatos a prefeito do PL e do PT em 2024 (eleição ordinária)
    pc = d[(d.DS_CARGO == "PREFEITO") & (d.CD_TIPO_ELEICAO == "2") & (d.NR_TURNO == "1")]
    cand_pl = pc[pc.SG_PARTIDO == "PL"].groupby("SG_UE").agg(
        candidato_PL_prefeito_2024=("NM_URNA_CANDIDATO", lambda s: ", ".join(s.str.title())))
    cand_pt = pc[pc.SG_PARTIDO == "PT"].groupby("SG_UE").agg(
        candidato_PT_prefeito_2024=("NM_URNA_CANDIDATO", lambda s: ", ".join(s.str.title())))
    n_cand = pc.groupby("SG_UE").size().rename("n_candidatos_prefeito_2024")

    # Vereadores eleitos (ordinária)
    v = d[(d.DS_CARGO == "VEREADOR") & eleito & (d.CD_TIPO_ELEICAO == "2")].copy()
    v["bloco"] = v.SG_PARTIDO.map(bloco)
    vt = v.groupby("SG_UE").agg(vereadores_total=("SQ_CANDIDATO", "size"))
    for p in ["PL", "PT", "PSD", "MDB", "PP", "UNIÃO", "REPUBLICANOS"]:
        vt[f"vereadores_{p}"] = v[v.SG_PARTIDO == p].groupby("SG_UE").size()
    for b in ["esquerda", "centro", "direita"]:
        vt[f"vereadores_{b}"] = v[v.bloco == b].groupby("SG_UE").size()
    vt = vt.fillna(0).astype(int)
    vt["vereadores_PL_pct"] = (vt.vereadores_PL / vt.vereadores_total).round(3)
    top = v.groupby(["SG_UE", "SG_PARTIDO"]).size().reset_index(name="n").sort_values(["SG_UE", "n"], ascending=[True, False])
    vt["maior_bancada"] = top.groupby("SG_UE").apply(
        lambda g: ", ".join(f"{r.SG_PARTIDO} {r.n}" for r in g.head(3).itertuples()), include_groups=False)
    vt["vereadores_PL_nomes"] = v[v.SG_PARTIDO == "PL"].groupby("SG_UE").NM_URNA_CANDIDATO.apply(lambda s: ", ".join(s.str.title()))

    out = (pref_out.merge(vice, on="SG_UE", how="left")
           .merge(vt.reset_index(), on="SG_UE", how="outer")
           .merge(cand_pl.reset_index(), on="SG_UE", how="left")
           .merge(cand_pt.reset_index(), on="SG_UE", how="left")
           .merge(n_cand.reset_index(), on="SG_UE", how="left")
           .merge(xw, on="SG_UE", how="left"))
    miss = out.IBGE.isna().sum()
    if miss:
        print(f"aviso: {miss} códigos TSE sem IBGE", file=sys.stderr)
    out = out.dropna(subset=["IBGE"])
    out["PL_poder_local"] = out.apply(lambda r: "prefeito PL" if r.prefeito_partido == "PL"
                                      else "PL na coligação do prefeito" if r.prefeito_coligacao_tem_PL is True
                                      else ("vereadores PL" if r.vereadores_PL > 0 else "sem PL eleito"), axis=1)
    out.to_csv(OUT / "poder_local_2024.csv", index=False)
    print(out.shape, out.prefeito.notna().sum(), "prefeitos")
    print(out.prefeito_partido.value_counts().head(12).to_dict())
    print(out.PL_poder_local.value_counts().to_dict())


if __name__ == "__main__":
    main()
