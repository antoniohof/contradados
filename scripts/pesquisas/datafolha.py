"""Datafolha 2º turno (divulgada em 08/10/2026) × resultado oficial do 1º turno (TSE).

Lê data/pesquisas/datafolha_2026-10-08.json e data/tse/municipios_master.csv (sem exterior).

O que calcula:
1. Região: Lula/(Lula+Flávio) na pesquisa × no 1T, e o deslocamento entre os dois.
2. Consistência: os resultados por sexo, idade e escolaridade, ponderados pelo perfil do
   eleitorado do TSE (jul/2026), reproduzem o total da pesquisa? E por região, ponderando
   pelos aptos ou pelo comparecimento do 1T?
3. Transferência: os 46/32/15 dos eleitores de terceiros aplicados ao 1T oficial, no
   Brasil e por região, comparados com o que a pesquisa mede.
4. Projeção municipal com dois modelos, ambos cenários e não previsões:
   A. deslocamento regional uniforme (lula2p do 1T + Δ da região na pesquisa);
   B. transferência dos terceiros com as taxas da pesquisa, aplicada aos votos de cada
      município.
   Depois, quanto comparecimento extra seria preciso para fechar a diferença.

Território, não indivíduos: a pesquisa mede pessoas, o TSE mede municípios. Nada aqui
estima o voto de um grupo a partir dos agregados do TSE (falácia ecológica).

Saídas em data/pesquisas/: datafolha_regioes.csv, datafolha_consistencia.csv,
datafolha_municipios.csv, datafolha_cenarios.csv, datafolha_resumo.json
"""
import json
from pathlib import Path
import numpy as np
import pandas as pd

REPO = Path(__file__).resolve().parents[2]
OUT = REPO / "data/pesquisas"
POLL = json.loads((OUT / "datafolha_2026-10-08.json").read_text())
SEG = POLL["segmentos"]

m = pd.read_csv(REPO / "data/tse/municipios_master.csv", low_memory=False).copy()
m["reg_df"] = m["regiao"].replace({"Norte": "Norte/Centro-Oeste", "Centro-Oeste": "Norte/Centro-Oeste"})
m["comp26"] = m["aptos26"] - m["ausentes26"]
m["bn26_votos"] = m["comp26"] - m["validos_2026"]


def l2p(d):
    """Lula / (Lula + Flávio), em %."""
    return 100 * d["lula"] / (d["lula"] + d["flavio"])


def wavg(rows, weights):
    w = np.array(weights, dtype=float)
    w = w / w.sum()
    out = {k: float(sum(r.get(k, 0) * wi for r, wi in zip(rows, w))) for k in ("flavio", "lula")}
    out["lula2p"] = l2p(out)
    return out


# 1. Regiões -----------------------------------------------------------------
g = m.groupby("reg_df").agg(
    aptos=("aptos26", "sum"), comp=("comp26", "sum"), ausentes=("ausentes26", "sum"),
    lula=("votos_lula_2026", "sum"), flavio=("votos_flavio_2026", "sum"),
    terceiros=("votos_terceiros26", "sum"), validos=("validos_2026", "sum"),
)
reg = pd.DataFrame({
    "aptos_pct": 100 * g.aptos / g.aptos.sum(),
    "comp_pct": 100 * g.comp / g.comp.sum(),
    "abst26": 100 * g.ausentes / g.aptos,
    "lula_1t": 100 * g.lula / g.validos,
    "flavio_1t": 100 * g.flavio / g.validos,
    "terceiros_1t": 100 * g.terceiros / g.validos,
    "lula2p_1t": 100 * g.lula / (g.lula + g.flavio),
})
reg["pesq_flavio"] = [SEG["regiao"][r]["flavio"] for r in reg.index]
reg["pesq_lula"] = [SEG["regiao"][r]["lula"] for r in reg.index]
reg["pesq_lula2p"] = 100 * reg.pesq_lula / (reg.pesq_lula + reg.pesq_flavio)
reg["delta_lula2p"] = reg.pesq_lula2p - reg.lula2p_1t
# erro amostral aproximado do lula2p na região (amostra proporcional ao comparecimento, efeito de desenho 1,5)
n_reg = POLL["amostra"] * reg.aptos_pct / 100 * (reg.pesq_lula + reg.pesq_flavio) / 100
reg["me_lula2p_aprox"] = 1.96 * np.sqrt(1.5 * reg.pesq_lula2p * (100 - reg.pesq_lula2p) / n_reg)
reg = reg.round(2)

nac_1t = {"lula": m.votos_lula_2026.sum(), "flavio": m.votos_flavio_2026.sum()}
regs = list(reg.index)
pesq_rows = [SEG["regiao"][r] for r in regs]
cons = []
for nome, w in [("região × aptos 2026 (TSE)", reg.aptos_pct), ("região × comparecimento 1T (TSE)", reg.comp_pct)]:
    cons.append({"recorte": nome, **wavg(pesq_rows, w)})

# 2. Consistência demográfica: segmentos da pesquisa × perfil do eleitorado TSE ----------------
el = m["eleitorado_perfil_2026"]
tot = el.sum()
share = lambda col: float((m[col] * el).sum() / tot)
perfil = {
    "sexo": {"Mulheres": share("mulheres_pct"), "Homens": 1 - share("mulheres_pct")},
    "idade": {
        "16-24": share("idade_16_17_pct") + share("idade_18_24_pct"),
        "25-34": share("idade_25_34_pct"),
        "35-44": share("idade_35_44_pct"),
        "45-59": share("idade_45_59_pct"),
        "60+": share("idade_60_69_pct") + share("idade_70mais_pct"),
    },
    "escolaridade": {
        "Fundamental": share("escol_sem_fundamental_pct") + share("escol_fundamental_pct"),
        "Médio": share("escol_medio_pct"),
        "Superior": share("escol_superior_pct"),
    },
}
for dim, cats in perfil.items():
    s = sum(cats.values())
    cats = {k: v / s for k, v in cats.items()}  # renormaliza (TSE tem "não informado")
    perfil[dim] = cats
    cons.append({"recorte": f"{dim} × perfil TSE", **wavg([SEG[dim][k] for k in cats], list(cats.values()))})
cons.append({"recorte": "total publicado", "flavio": 49.0, "lula": 45.0, "lula2p": l2p({"lula": 45, "flavio": 49})})
cons = pd.DataFrame(cons).round(2)
cons["dif_lula2p_vs_total"] = (cons.lula2p - l2p({"lula": 45, "flavio": 49})).round(2)

# 3. Transferência dos terceiros (Brasil e região) ------------------------------------------------
T = POLL["transferencia_terceiros_1t"]
tf, tl = T["flavio"] / 100, T["lula"] / 100
g["lula_B"] = g.lula + tl * g.terceiros
g["flavio_B"] = g.flavio + tf * g.terceiros
reg["transf_lula2p"] = (100 * g.lula_B / (g.lula_B + g.flavio_B)).round(2)
reg["pesq_menos_transf"] = (reg.pesq_lula2p - reg.transf_lula2p).round(2)
nac_B = {"lula": g.lula_B.sum(), "flavio": g.flavio_B.sum()}

# 4. Projeção municipal ------------------------------------------------------------------------
m["lula2p_1t"] = 100 * m.votos_lula_2026 / (m.votos_lula_2026 + m.votos_flavio_2026)
m["delta_reg"] = m.reg_df.map(reg.delta_lula2p)
m["lula2p_A"] = (m.lula2p_1t + m.delta_reg).clip(0, 100)
m["lula2p_B"] = 100 * (m.votos_lula_2026 + tl * m.votos_terceiros26) / (
    m.votos_lula_2026 + m.votos_flavio_2026 + (tl + tf) * m.votos_terceiros26)
m["venc_1t"] = np.where(m.votos_lula_2026 > m.votos_flavio_2026, "Lula",
                        np.where(m.votos_lula_2026 < m.votos_flavio_2026, "Flávio", "empate"))
for k in ("A", "B"):
    m[f"venc_{k}"] = np.where(m[f"lula2p_{k}"] > 50, "Lula", np.where(m[f"lula2p_{k}"] < 50, "Flávio", "empate"))
m["validos2_A"] = m.votos_lula_2026 + m.votos_flavio_2026 + (tl + tf) * m.votos_terceiros26
m["gap_A"] = (2 * m.lula2p_A / 100 - 1) * m.validos2_A  # Lula − Flávio, votos
m["gap_B"] = (m.votos_lula_2026 + tl * m.votos_terceiros26) - (m.votos_flavio_2026 + tf * m.votos_terceiros26)

# ganho líquido de Lula por eleitor ausente que passar a votar, se votar como a região na pesquisa
reg["liq_por_ausente"] = ((reg.pesq_lula - reg.pesq_flavio) / 100).round(3)
m["liq_por_ausente"] = m.reg_df.map(reg.liq_por_ausente)
m["ganho_lula_10pp_comp"] = 0.10 * m.aptos26 * m.liq_por_ausente  # +10 p.p. de comparecimento
# variante local (teto otimista para Lula onde ele é forte): o ausente vota como o próprio município no modelo A,
# com a fração de brancos/nulos da região na pesquisa
bn_reg = {r: (100 - v["flavio"] - v["lula"]) / 100 for r, v in SEG["regiao"].items()}
m["liq_local_por_ausente"] = (1 - m.reg_df.map(bn_reg)) * (2 * m.lula2p_A / 100 - 1)

# cenários S1/S2/S3 do relatório
m["cenarios"] = m["cenarios"].fillna("")  # ex.: "S1#31;S3#5"

linhas = []
for nome, mask in [("Brasil", m.IBGE.notna())] + [(s, m.cenarios.str.contains(s)) for s in ("S1", "S2", "S3")]:
    d = m[mask]
    linhas.append({
        "grupo": nome, "municipios": len(d),
        "lula_venceu_1t": int((d.venc_1t == "Lula").sum()),
        "lula_venceria_A": int((d.venc_A == "Lula").sum()),
        "lula_venceria_B": int((d.venc_B == "Lula").sum()),
        "gap_1t": int((d.votos_lula_2026 - d.votos_flavio_2026).sum()),
        "gap_A": int(d.gap_A.sum()), "gap_B": int(d.gap_B.sum()),
        "ausentes": int(d.ausentes26.sum()),
        "ganho_lula_se_comp_mais_10pp": int(d.ganho_lula_10pp_comp.sum()),
        "ganho_lula_todos_ausentes_regional": int((d.ausentes26 * d.liq_por_ausente).sum()),
        "ganho_lula_todos_ausentes_local": int((d.ausentes26 * d.liq_local_por_ausente).sum()),
    })
cen = pd.DataFrame(linhas)

# quanto comparecimento extra fecharia o gap nacional da pesquisa (votos válidos do 2T ≈ válidos do 1T − 15% dos terceiros)
val2 = m.validos2_A.sum()
gap_pesq = (POLL["validos"]["lula"] - POLL["validos"]["flavio"]) / 100 * val2
ne = reg.loc["Nordeste"]
aus_ne = g.loc["Nordeste", "ausentes"]
resumo = {
    "pesquisa": {k: POLL[k] for k in ("instituto", "divulgacao", "campo", "registro_tse", "amostra", "margem_erro_pp")},
    "lula2p_1t_oficial": round(l2p(nac_1t), 2),
    "lula2p_pesquisa": round(l2p(POLL["validos"]), 2),
    "lula2p_transferencia_terceiros": round(l2p(nac_B), 2),
    "gap_pesquisa_votos_aprox": int(gap_pesq),
    "validos_2t_aprox": int(val2),
    "nordeste": {
        "ausentes_1t": int(aus_ne),
        "liq_lula_por_ausente": float(ne.liq_por_ausente),
        "ausentes_necessarios_para_fechar_gap": int(-gap_pesq / ne.liq_por_ausente),
        "fracao_dos_ausentes": round(-gap_pesq / ne.liq_por_ausente / aus_ne, 2),
    },
    "S2_todos_ausentes_votando_ganho_lula": {
        "regional": int((m[m.cenarios.str.contains("S2")].ausentes26 * m.liq_por_ausente).sum()),
        "local": int((m[m.cenarios.str.contains("S2")].ausentes26 * m.liq_local_por_ausente).sum()),
    },
    "lula_ausentes_excedentes_local": {
        "descricao": "ganho de Lula se a abstenção caísse até a média nacional (20,84%) onde está acima dela, votando como o município",
        "votos": int((m.ausentes26 - 0.2084 * m.aptos26).clip(lower=0).mul(m.liq_local_por_ausente).sum()),
    },
    "municipios_que_viram_para_lula": {
        "A": int(((m.venc_1t != "Lula") & (m.venc_A == "Lula")).sum()),
        "B": int(((m.venc_1t != "Lula") & (m.venc_B == "Lula")).sum()),
    },
    "municipios_que_viram_para_flavio": {
        "A": int(((m.venc_1t != "Flávio") & (m.venc_A == "Flávio")).sum()),
        "B": int(((m.venc_1t != "Flávio") & (m.venc_B == "Flávio")).sum()),
    },
    "perfil_tse_usado": {k: {kk: round(vv, 4) for kk, vv in v.items()} for k, v in perfil.items()},
}

reg.to_csv(OUT / "datafolha_regioes.csv")
cons.to_csv(OUT / "datafolha_consistencia.csv", index=False)
cen.to_csv(OUT / "datafolha_cenarios.csv", index=False)
cols = ["IBGE", "municipio", "uf", "regiao", "reg_df", "cenarios", "aptos26", "abst26", "lula2p_1t",
        "delta_reg", "lula2p_A", "lula2p_B", "venc_1t", "venc_A", "venc_B", "gap_A", "gap_B",
        "liq_por_ausente", "liq_local_por_ausente", "ganho_lula_10pp_comp"]
m[cols].round(2).to_csv(OUT / "datafolha_municipios.csv", index=False)
(OUT / "datafolha_resumo.json").write_text(json.dumps(resumo, ensure_ascii=False, indent=1))

pd.set_option("display.width", 200)
print(reg, "\n")
print(cons, "\n")
print(cen, "\n")
print(json.dumps(resumo, ensure_ascii=False, indent=1))
