"""Base mestra: histórico (data/base.json) + resultados oficiais 2026 + poder local 2024
+ perfil do eleitorado + pesquisa local. Recalcula os 3 cenários com números oficiais.

Definições idênticas a scripts/lists.py; só muda a fonte de aptos/abstenção/terceiros
(TSE oficial) e o limiar de abstenção (média nacional oficial sem exterior).

Saídas em data/tse/: municipios_master.csv, listas_oficial.json, diff_listas.csv, prefeitos_web_vs_tse.csv
"""
import json
import warnings
import pandas as pd
from common import REPO, OUT

D = REPO / "data"
warnings.simplefilter("ignore", pd.errors.PerformanceWarning)


def main():
    b = pd.DataFrame(json.load(open(D / "base.json")))
    hist_cols = ["ibge", "municipio", "uf", "regiao", "capital", "lula22", "bolso22", "abst22", "bolso22_t2",
                 "votos_lula22", "votos_bolso22", "bolso18_t2", "abst18", "margem22", "venc22", "hist"]
    m = b[hist_cols].rename(columns={"ibge": "IBGE"})
    res = pd.read_csv(OUT / "resultados_2026.csv", dtype={"IBGE": str})
    com = pd.read_csv(OUT / "comparecimento_2022_2026.csv", dtype={"IBGE": str})
    pl = pd.read_csv(OUT / "poder_local_2024.csv", dtype={"IBGE": str, "SG_UE": str})
    m = m.merge(res, on="IBGE", how="left").merge(com, on="IBGE", how="left").merge(pl, on="IBGE", how="left")
    perfil = OUT / "perfil_eleitorado_2026.csv"
    if perfil.exists():
        m = m.merge(pd.read_csv(perfil, dtype={"IBGE": str}), on="IBGE", how="left")

    # Indicadores 2026 em pontos percentuais (mesma escala de base.json)
    m["aptos26"] = m.aptos_2026_1t
    m["comp26"] = m.comparecimento_2026_1t
    m["ausentes26"] = m.abstencoes_2026_1t
    m["abst26"] = (m.abstencao_pct_2026_1t * 100).round(2)
    m["brancnul26"] = (m.brancos_nulos_pct_2026_1t * 100).round(2)
    for k in ["lula", "flavio", "caiado", "renan", "cury", "zema", "outros", "terceiros"]:
        m[f"{k}26"] = (m[f"{k}_2026"] * 100).round(2)
    m["abst22_t2"] = (m.abstencao_pct_2022_2t * 100).round(2)
    m["lula22_t2"] = (100 - m.bolso22_t2).round(2)
    m["margem26"] = (m.lula26 - m.flavio26).round(2)
    m["swing"] = (m.margem26 - m.margem22).round(2)
    m["d_abst"] = (m.abst26 - m.abst22).round(2)
    m["virou"] = (m.margem22 > 0) & (m.margem26 < 0)
    m["virou_para_lula"] = (m.margem22 < 0) & (m.margem26 > 0)
    m["venc26"] = m.margem26.apply(lambda x: "Lula" if x > 0 else "Flávio" if x < 0 else "Empate")
    m["empate26"] = m.votos_lula_2026 == m.votos_flavio_2026  # Trabiju/SP e Crixás do Tocantins/TO
    m["pendulo_score"] = ((m["hist"].str[0] == "H").astype(int) + (m["hist"].str[2] == "L") + (m.swing <= -15)
                          + (m.terceiros26 >= 8) + (m.margem26.abs() <= 20))
    # terceiros que podem decidir: votos de terceiros vs. margem absoluta Lula-Flávio
    m["votos_terceiros26"] = m.validos_2026 - m.votos_lula_2026 - m.votos_flavio_2026
    m["terceiros_sobre_margem"] = (m.votos_terceiros26 / m.margem_lula_flavio_votos_2026.abs().clip(lower=1)).round(2)
    m["ausentes_sobre_margem"] = (m.ausentes26 / m.margem_lula_flavio_votos_2026.abs().clip(lower=1)).round(2)

    AB = round(m.ausentes26.sum() / m.aptos26.sum() * 100, 2)
    print("abstenção média oficial (sem exterior):", AB)
    s1 = m[m.virou & (m.aptos26 >= 10000)].sort_values(["swing", "aptos26", "IBGE"], ascending=[True, False, True]).head(100)
    s2 = m[(m.lula26 > 50) & (m.abst26 > AB)].sort_values(["ausentes26", "aptos26", "IBGE"], ascending=[False, False, True]).head(100)
    s3 = m[(m.flavio26 >= 50) & (m.abst26 < AB) & (m.pendulo_score >= 3)]\
        .sort_values(["pendulo_score", "aptos26", "IBGE"], ascending=[False, False, True]).head(100)
    listas = {"S1": s1.IBGE.tolist(), "S2": s2.IBGE.tolist(), "S3": s3.IBGE.tolist()}
    json.dump({"limiar_abstencao": AB, **listas}, open(OUT / "listas_oficial.json", "w"))
    m["cenarios"] = ""
    for k, ids in listas.items():
        for i, x in enumerate(ids, 1):
            m.loc[m.IBGE == x, "cenarios"] += f"{k}#{i} "
    m["cenarios"] = m.cenarios.str.strip()
    m["candidato_S1"] = m.virou & (m.aptos26 >= 10000)
    m["candidato_S2"] = (m.lula26 > 50) & (m.abst26 > AB)
    m["candidato_S3"] = (m.flavio26 >= 50) & (m.abst26 < AB) & (m.pendulo_score >= 3)
    print("universo:", int(m.candidato_S1.sum()), int(m.candidato_S2.sum()), int(m.candidato_S3.sum()),
          "| viraram L→F:", int(m.virou.sum()), "F→L:", int(m.virou_para_lula.sum()))

    old = json.load(open(D / "listas.json"))
    diff = []
    for k in listas:
        a, o = set(listas[k]), set(old[k])
        for x in a - o:
            diff.append(dict(cenario=k, IBGE=x, mudanca="entra"))
        for x in o - a:
            diff.append(dict(cenario=k, IBGE=x, mudanca="sai"))
        print(k, "entram", len(a - o), "saem", len(o - a))
    diff = pd.DataFrame(diff, columns=["cenario", "IBGE", "mudanca"])
    diff = diff.merge(m[["IBGE", "municipio", "uf", "abst26", "aptos26", "swing", "pendulo_score"]], on="IBGE", how="left")
    diff.merge(b[["ibge", "abst26", "aptos26"]].rename(columns={"ibge": "IBGE", "abst26": "abst26_compilado",
                                                                  "aptos26": "aptos26_compilado"}), on="IBGE", how="left") \
        .to_csv(OUT / "diff_listas.csv", index=False)

    # Pesquisa local (somente leitura) + conferência prefeito web x TSE
    pq = pd.DataFrame(json.load(open(D / "pesquisa_local.json")))
    pq = pq.rename(columns={"ibge": "IBGE"})
    keep = ["IBGE", "economia", "pautas", "eventos", "fontes", "confianca", "obs",
            "prefeito_2024_nome", "partido_prefeito_sigla", "partido_prefeito_incerto"]
    pq = pq[[c for c in keep if c in pq.columns]]
    for c in ["pautas", "fontes"]:
        pq[c] = pq[c].apply(lambda v: " | ".join(v) if isinstance(v, list) else v)
    m = m.merge(pq, on="IBGE", how="left")
    if "partido_prefeito_sigla" in m:
        chk = m[m.partido_prefeito_sigla.fillna("").ne("") & ~m.partido_prefeito_incerto.fillna(False).astype(bool)]
        chk = chk.assign(confere=chk.partido_prefeito_sigla == chk.prefeito_partido)
        chk[["IBGE", "municipio", "uf", "prefeito_2024_nome", "partido_prefeito_sigla", "prefeito", "prefeito_partido",
             "prefeito_eleicao_suplementar", "confere"]].to_csv(OUT / "prefeitos_web_vs_tse.csv", index=False)
        print("prefeitos web x TSE: conferem", int(chk.confere.sum()), "divergem", int((~chk.confere).sum()))

    m.to_csv(OUT / "municipios_master.csv", index=False)
    print(m.shape)


if __name__ == "__main__":
    main()
