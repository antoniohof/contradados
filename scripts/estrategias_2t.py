"""Three runoff strategies (25/10/2026), with targets by municipality and by electoral zone.

E1 mobilization: Lula strongholds with recoverable abstention.
E2 Flávio's soft vote toward blank/null/abstention: Flávio areas where a smaller
   turnout helps Lula, plus the right-leaning third-party stock (Renan, Caiado,
   Zema) that we want to stop going to Flávio.
E3 reconversion: Lula's 2022 voters who went to Flávio (or left Lula) in the 2026 1st round.

These are associations between places, not individual behaviour (ecological fallacy).
Run from the repo root: ../.venv/bin/python scripts/estrategias_2t.py
Output: data/estrategias_2t/*.csv + resumo.json
"""
import json
from pathlib import Path

import numpy as np
import pandas as pd

OUT = Path("data/estrategias_2t")
OUT.mkdir(parents=True, exist_ok=True)

# Quaest 02–03/10 transfer rates to Flávio in the runoff (source in RELATORIO / research)
TRANSF_FLAVIO = {"renan": 0.60, "caiado": 0.43, "cury": 0.34, "zema": 0.60}
TRANSF_LULA = {"renan": 0.11, "caiado": 0.19, "cury": 0.23, "zema": 0.10}

m = pd.read_csv("data/segundo_turno/municipios_2t.csv", dtype={"IBGE": str})
base = pd.read_csv("data/demografia/municipal_base.csv", dtype={"IBGE": str})
socio = pd.read_csv("data/socio/ibge_censo2022.csv", dtype={"ibge": str}).rename(columns={"ibge": "IBGE"})
df_pesq = pd.read_csv("data/pesquisas/datafolha_municipios.csv", dtype={"IBGE": str})
gov = pd.read_csv("notas_nuvem/fraquezas_eleitorais_municipios.csv", dtype={"ibge": str}).rename(columns={"ibge": "IBGE"})

pautas = {}
for p in json.load(open("data/pesquisa_local.json")):
    if p.get("pautas"):
        pautas[str(p["ibge"])] = " | ".join(p["pautas"][:2])

perfil_cols = ["idade_16_24_pct", "idade_25_34_pct", "idade_35_44_pct", "idade_45_59_pct",
               "idade_60_69_pct", "idade_70mais_pct", "mulheres_pct", "escol_sem_fundamental_pct",
               "escol_superior_pct"]
base["idade_16_24_pct"] = base["jovens_16_24_pct"]
d = (m.merge(base[["IBGE", "bolso22", "d_abst"] + perfil_cols], on="IBGE", how="left")
      .merge(socio, on="IBGE", how="left")
      .merge(df_pesq[["IBGE", "lula2p_A"]], on="IBGE", how="left")
      .merge(gov[["IBGE", "candidato", "adversario", "cand_pct", "deficit_vs_flavio"]], on="IBGE", how="left"))
d["pauta_local"] = d.IBGE.map(pautas).fillna("")
d["idosos_70mais_n"] = (d.aptos26 * d.idade_70mais_pct).round()

dois = d.votos_lula26 + d.votos_flavio26
d["liq_por_eleitor"] = ((d.votos_lula26 - d.votos_flavio26) / dois).round(3)  # net Lula votes per extra voter who votes like the place
# 2018 left out: the rolls were different (biometric purge), not comparable
d["abst_min"] = d[["abst22", "abst22_t2", "abst26"]].min(axis=1)
d["ausentes_recuperaveis"] = (d.ausentes26 - d.aptos26 * d.abst_min / 100).clip(lower=0).round()

# ---------------------------------------------------------------- E1
e1 = d[d.lula2p26 >= 60].copy()
e1["ganho_recuperar_minimo"] = (e1.ausentes_recuperaveis * e1.liq_por_eleitor).round()
e1["ganho_por_1pp_comparecimento"] = (e1.aptos26 * 0.01 * e1.liq_por_eleitor).round()
# defensive risk: abstention moving from the 1T to the 2T the way it did in 2022
e1["d_abst_1t_2t_2022"] = (e1.abst22_t2 - e1.abst22).round(2)
e1["perda_se_repetir_2022"] = (-e1.aptos26 * e1.d_abst_1t_2t_2022.clip(lower=0) / 100 * e1.liq_por_eleitor).round()
e1 = e1.sort_values("ganho_recuperar_minimo", ascending=False)
cols_e1 = ["IBGE", "municipio", "uf", "regiao", "porte", "aptos26", "abst26", "abst_min", "lula2p26",
           "liq_por_eleitor", "ausentes_recuperaveis", "ganho_recuperar_minimo", "ganho_por_1pp_comparecimento",
           "d_abst_1t_2t_2022", "perda_se_repetir_2022", "idade_70mais_pct", "idosos_70mais_n",
           "prefeito", "prefeito_partido", "pauta_local"]
e1[cols_e1].to_csv(OUT / "e1_mobilizacao_municipios.csv", index=False)

# zones of the big cities (periphery inside cities that are mixed overall)
z = pd.read_csv("data/demografia/zonas.csv", dtype={"IBGE": str})
z = z[z.comparavel & (z.validos26 > 0)].copy()
z["lula2p26"] = (100 * z.votos_lula26 / (z.votos_lula26 + z.votos_flavio26)).round(2)
z["liq_por_eleitor"] = ((z.votos_lula26 - z.votos_flavio26) / (z.votos_lula26 + z.votos_flavio26)).round(3)
z["abst_min"] = z[["abst22", "abst26"]].min(axis=1)
z["ausentes_recuperaveis"] = (z.aptos26 * (z.abst26 - z.abst_min) / 100).clip(lower=0).round()
z["ganho_recuperar_2022"] = (z.ausentes_recuperaveis * z.liq_por_eleitor).round()
z["ganho_por_1pp_comparecimento"] = (z.aptos26 * 0.01 * z.liq_por_eleitor).round()
grandes = d.loc[d.aptos26 >= 200_000, "IBGE"]
ze1 = z[z.IBGE.isin(grandes) & (z.lula2p26 >= 55)].sort_values("ganho_por_1pp_comparecimento", ascending=False)
ze1[["IBGE", "municipio", "uf", "NR_ZONA", "aptos26", "abst22", "abst26", "lula2p26", "liq_por_eleitor",
     "ausentes_recuperaveis", "ganho_recuperar_2022", "ganho_por_1pp_comparecimento", "idade_70mais",
     "idade_16_17", "idade_18_24", "mulheres"]].to_csv(OUT / "e1_mobilizacao_zonas_grandes_cidades.csv", index=False)

# ---------------------------------------------------------------- E2
e2 = d[d.lula2p26 <= 45].copy()
for k in ["renan", "caiado", "zema", "cury"]:
    e2[f"esperado_flavio_{k}"] = e2[f"votos_{k}26"] * TRANSF_FLAVIO[k]
e2["terceiros_direita"] = e2.votos_renan26 + e2.votos_caiado26 + e2.votos_zema26
e2["esperado_flavio_terceiros"] = e2[[f"esperado_flavio_{k}" for k in ["renan", "caiado", "zema", "cury"]]].sum(axis=1).round()
e2["flavio_menos_jair"] = (e2.flavio26 - e2.bolso22).round(2)
e2["bolsonaristas_fora_do_flavio"] = (e2.votos_flavio26 * (-e2.flavio_menos_jair).clip(lower=0) / e2.flavio26).round()
# soft-vote signals (each 0/1 + description); none of them is the voter, all are about the place
e2["sinal_flavio_abaixo_jair"] = (e2.flavio_menos_jair < 0).astype(int)
e2["sinal_abstencao_subiu"] = (e2.d_abst > 1).astype(int)
e2["sinal_catolico"] = (e2.cat >= e2.cat.median()).astype(int) & (e2.evg < e2.evg.median()).astype(int)
e2["sinal_atrito_gov"] = (e2.uf.isin(["AC", "DF", "ES", "TO", "AM"]) & (e2.deficit_vs_flavio > 10)).astype(int)
e2["sinal_superior"] = (e2.escol_superior_pct >= e2.escol_superior_pct.quantile(0.75)).astype(int)
e2["n_sinais"] = e2[[c for c in e2.columns if c.startswith("sinal_")]].sum(axis=1)
# stock to keep away from Flávio: what the third parties would hand him + Jair's voters who already skipped him
e2["estoque_E2"] = (e2.esperado_flavio_terceiros + e2.bolsonaristas_fora_do_flavio).round()
e2 = e2.sort_values("estoque_E2", ascending=False)
cols_e2 = ["IBGE", "municipio", "uf", "regiao", "porte", "aptos26", "lula2p26", "flavio26", "flavio_menos_jair",
           "votos_flavio26", "votos_renan26", "votos_caiado26", "votos_cury26", "votos_zema26",
           "esperado_flavio_terceiros", "bolsonaristas_fora_do_flavio", "estoque_E2", "d_abst", "cat", "evg",
           "escol_superior_pct", "mulheres_pct", "candidato", "deficit_vs_flavio", "n_sinais",
           "sinal_flavio_abaixo_jair", "sinal_abstencao_subiu", "sinal_catolico", "sinal_atrito_gov",
           "sinal_superior", "prefeito", "prefeito_partido", "pauta_local"]
e2[cols_e2].to_csv(OUT / "e2_voto_mole_flavio_municipios.csv", index=False)

ze2 = z[z.IBGE.isin(grandes) & (z.lula2p26 <= 45)].copy()
ze2["votos_renan26"] = (ze2.renan26 / 100 * ze2.validos26).round()
ze2["votos_caiado26"] = (ze2.caiado26 / 100 * ze2.validos26).round()
ze2["votos_cury26"] = (ze2.cury26 / 100 * ze2.validos26).round()
ze2["esperado_flavio_terceiros"] = (ze2.votos_renan26 * .6 + ze2.votos_caiado26 * .43 + ze2.votos_cury26 * .34).round()
ze2.sort_values("esperado_flavio_terceiros", ascending=False)[
    ["IBGE", "municipio", "uf", "NR_ZONA", "aptos26", "lula2p26", "flavio26", "flavio_menos_jair",
     "renan26", "caiado26", "cury26", "esperado_flavio_terceiros", "escol_superior", "idade_18_24", "mulheres"]
].to_csv(OUT / "e2_voto_mole_flavio_zonas_grandes_cidades.csv", index=False)

# ---------------------------------------------------------------- E3
e3 = d.copy()
validos2 = e3.votos_lula26 + e3.votos_flavio26
e3["queda_lula2p_1t"] = (e3.lula2p22_t1 - e3.lula2p26).round(2)       # like-for-like 1T 2022 → 1T 2026
e3["queda_lula2p_vs_2t22"] = (e3.lula2p22_t2 - e3.lula2p26).round(2)  # vs Lula's 2022 runoff
e3["votos_a_reconverter"] = (validos2 * e3.queda_lula2p_1t.clip(lower=0) / 100).round()
e3["virou_2t22"] = (e3.lula2p22_t2 > 50) & (e3.lula2p26 < 50)
e3 = e3[e3.votos_a_reconverter > 0].sort_values("votos_a_reconverter", ascending=False)
cols_e3 = ["IBGE", "municipio", "uf", "regiao", "porte", "aptos26", "lula2p22_t1", "lula2p22_t2", "lula2p26",
           "queda_lula2p_1t", "queda_lula2p_vs_2t22", "votos_a_reconverter", "virou_2t22", "venc26",
           "lula2p_A", "idade_25_34_pct", "idade_35_44_pct", "idade_45_59_pct", "mulheres_pct",
           "escol_sem_fundamental_pct", "urb", "evg", "cat", "renda_mediana", "prefeito", "prefeito_partido",
           "PL_poder_local", "pauta_local"]
e3[cols_e3].to_csv(OUT / "e3_reconversao_municipios.csv", index=False)

# archetypes: region × size, where the reconversion stock sits
arq = (e3.groupby(["regiao", "porte"])
         .agg(municipios=("IBGE", "size"), aptos=("aptos26", "sum"), votos_a_reconverter=("votos_a_reconverter", "sum"),
              viradas=("virou_2t22", "sum"), queda_media=("queda_lula2p_1t", "mean"),
              renda_mediana=("renda_mediana", "median"), evg=("evg", "median"), urb=("urb", "median"))
         .reset_index().sort_values("votos_a_reconverter", ascending=False))
arq["pct_estoque"] = (100 * arq.votos_a_reconverter / arq.votos_a_reconverter.sum()).round(1)
arq.round(2).to_csv(OUT / "e3_arquetipos.csv", index=False)


def uf_tab(df, col):
    return df.groupby("uf")[col].sum().sort_values(ascending=False).round().astype(int).head(10).to_dict()


resumo = {
    "nota": "Associações entre territórios; ganhos em votos líquidos de Lula sobre Flávio. Diferença no Datafolha 08/10 ~4,7 mi; no 1T 2,24 mi.",
    "E1": {
        "municipios_lula2p_ge_60": int(len(e1)),
        "aptos": int(e1.aptos26.sum()),
        "ausentes": int(e1.ausentes26.sum()),
        "ausentes_recuperaveis": int(e1.ausentes_recuperaveis.sum()),
        "ganho_se_voltar_ao_minimo_historico": int(e1.ganho_recuperar_minimo.sum()),
        "ganho_por_1pp_comparecimento": int(e1.ganho_por_1pp_comparecimento.sum()),
        "perda_se_abstencao_subir_como_2022": int(e1.perda_se_repetir_2022.sum()),
        "idosos_70mais": int(e1.idosos_70mais_n.sum()),
        "zonas_grandes_cidades_lula2p_ge_55": int(len(ze1)),
        "zonas_ganho_por_1pp": int(ze1.ganho_por_1pp_comparecimento.sum()),
        "top_uf_ganho": uf_tab(e1, "ganho_recuperar_minimo"),
    },
    "E2": {
        "municipios_lula2p_le_45": int(len(e2)),
        "votos_flavio": int(e2.votos_flavio26.sum()),
        "terceiros_direita_renan_caiado_zema": int(e2.terceiros_direita.sum()),
        "esperado_para_flavio_dos_terceiros": int(e2.esperado_flavio_terceiros.sum()),
        "bolsonaristas_2022_fora_do_flavio": int(e2.bolsonaristas_fora_do_flavio.sum()),
        "municipios_flavio_abaixo_jair": int(e2.sinal_flavio_abaixo_jair.sum()),
        "top_uf_estoque": uf_tab(e2, "estoque_E2"),
        "nacional_esperado_flavio_terceiros": int(sum(d[f"votos_{k}26"].sum() * TRANSF_FLAVIO[k] for k in TRANSF_FLAVIO)),
        "nacional_esperado_lula_terceiros": int(sum(d[f"votos_{k}26"].sum() * TRANSF_LULA[k] for k in TRANSF_LULA)),
    },
    "E3": {
        "municipios_com_queda": int(len(e3)),
        "votos_a_reconverter": int(e3.votos_a_reconverter.sum()),
        "municipios_virados_vs_2t22": int(e3.virou_2t22.sum()),
        "votos_a_reconverter_nos_virados": int(e3.loc[e3.virou_2t22, "votos_a_reconverter"].sum()),
        "top_uf": uf_tab(e3, "votos_a_reconverter"),
    },
}
json.dump(resumo, open(OUT / "resumo.json", "w"), ensure_ascii=False, indent=1)
print(json.dumps(resumo, ensure_ascii=False, indent=1))
