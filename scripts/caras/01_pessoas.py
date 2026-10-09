"""Quem são as pessoas públicas de cada município "elo fraco" (Flávio abaixo de Jair 2022).

Municípios: data/demografia/municipal_base.csv com alvo_ii_flavio_menos_bolso22 < 0 (90).
Pessoas, todas candidatas e com dados públicos do TSE:
- prefeito e vice eleitos em 2024 (inclui suplementares, como em scripts/tse/01_candidatos_2024.py);
- vereadores eleitos em 2024 do PL e do PT;
- 3 deputados federais e 3 estaduais/distritais mais votados no município em 2026 (qualquer partido);
- por UF: governador (finalistas do 2º turno ou eleito) e senadores eleitos em 2026.

Só campos do papel público (nome, partido, cargo, situação, votos). Nada de CPF, e-mail,
título ou data de nascimento.

Saída: data/caras/pessoas.csv
"""
import sys
import zipfile
from pathlib import Path
import pandas as pd

REPO = Path(__file__).resolve().parents[2]
RAW = REPO.parent / "data/raw"
OUT = REPO / "data/caras"
OUT.mkdir(exist_ok=True)

base = pd.read_csv(REPO / "data/demografia/municipal_base.csv")
alvo = base[base.alvo_ii_flavio_menos_bolso22 < 0].copy()
master = pd.read_csv(REPO / "data/tse/municipios_master.csv", usecols=["IBGE", "SG_UE", "prefeito_sq"], dtype=str)
alvo["IBGE"] = alvo.IBGE.astype(str)
alvo = alvo.merge(master, on="IBGE", how="left")
sys.path.insert(0, str(REPO / "scripts/tse"))
from common import tse_to_ibge  # noqa: E402
ibge2ue = {v: k for k, v in tse_to_ibge().items()}
alvo["SG_UE"] = alvo.SG_UE.fillna(alvo.IBGE.map(ibge2ue)).str.zfill(5)  # Brasília não tem SG_UE no master
alvo["prefeito_sq"] = alvo.prefeito_sq.str.replace(r"\.0$", "", regex=True)
ufs = sorted(alvo.uf.unique())
ue2ibge = dict(zip(alvo.SG_UE, alvo.IBGE))
info = alvo.set_index("IBGE")[["municipio", "uf"]].to_dict("index")

rows = []


def add(escopo, ibge, uf, papel, ano, r, votos=None):
    rows.append({
        "escopo": escopo, "ibge": ibge, "municipio": info.get(ibge, {}).get("municipio", ""), "uf": uf,
        "papel": papel, "ano": ano, "sq": str(r.SQ_CANDIDATO), "nome_urna": r.NM_URNA_CANDIDATO.strip().title(),
        "nome": r.NM_CANDIDATO.strip().title(), "partido": r.SG_PARTIDO, "situacao": r.DS_SIT_TOT_TURNO,
        "votos_no_municipio": votos,
    })


# 2024 -------------------------------------------------------------------------------------
cols = ["NR_TURNO", "SG_UF", "SG_UE", "CD_CARGO", "SQ_CANDIDATO", "NR_CANDIDATO", "NM_CANDIDATO",
        "NM_URNA_CANDIDATO", "SG_PARTIDO", "DS_SIT_TOT_TURNO", "CD_TIPO_ELEICAO", "DT_ELEICAO"]
with zipfile.ZipFile(RAW / "tse_2024/consulta_cand_2024.zip") as z:
    d = pd.concat([pd.read_csv(z.open(f"consulta_cand_2024_{uf}.csv"), sep=";", encoding="latin1", dtype=str, usecols=cols)
                   for uf in ufs if f"consulta_cand_2024_{uf}.csv" in z.namelist()])
d = d[d.SG_UE.isin(ue2ibge)]
pref_sq = dict(zip(alvo.SG_UE, alvo.prefeito_sq))
for ue, sq in pref_sq.items():
    if pd.isna(sq):
        continue  # Brasília não tem prefeito
    p = d[d.SQ_CANDIDATO == sq].sort_values("NR_TURNO").iloc[-1]
    add("municipio", ue2ibge[ue], p.SG_UF, "prefeito(a) 2024", 2024, p)
    v = d[(d.SG_UE == ue) & (d.CD_CARGO == "12") & (d.NR_CANDIDATO == p.NR_CANDIDATO) & (d.DT_ELEICAO == p.DT_ELEICAO)]
    if len(v):
        add("municipio", ue2ibge[ue], p.SG_UF, "vice-prefeito(a) 2024", 2024, v.iloc[0])
ver = d[(d.CD_CARGO == "13") & d.DS_SIT_TOT_TURNO.str.startswith("ELEITO", na=False) & d.SG_PARTIDO.isin(["PL", "PT"])]
for r in ver.drop_duplicates("SQ_CANDIDATO").itertuples():
    add("municipio", ue2ibge[r.SG_UE], r.SG_UF, f"vereador(a) {r.SG_PARTIDO} 2024", 2024, r)

# 2026 -------------------------------------------------------------------------------------
cols = ["SG_UF", "CD_MUNICIPIO", "CD_CARGO", "SQ_CANDIDATO", "NM_CANDIDATO", "NM_URNA_CANDIDATO", "SG_PARTIDO",
        "DS_SIT_TOT_TURNO", "QT_VOTOS_NOMINAIS_VALIDOS", "NR_TURNO"]
with zipfile.ZipFile(RAW / "tse_2026/votacao_candidato_munzona_2026.zip") as z:
    v = pd.concat([pd.read_csv(z.open(f"votacao_candidato_munzona_2026_{uf}.csv"), sep=";", encoding="latin1",
                               dtype=str, usecols=cols) for uf in ufs])
v = v[v.NR_TURNO == "1"]
v["votos"] = v.QT_VOTOS_NOMINAIS_VALIDOS.astype(int)
v["CD_MUNICIPIO"] = v.CD_MUNICIPIO.str.zfill(5)
keys = ["SG_UF", "CD_CARGO", "SQ_CANDIDATO", "NM_CANDIDATO", "NM_URNA_CANDIDATO", "SG_PARTIDO", "DS_SIT_TOT_TURNO"]

loc = v[v.CD_MUNICIPIO.isin(ue2ibge) & v.CD_CARGO.isin(["6", "7", "8"])]
loc = loc.groupby(["CD_MUNICIPIO"] + keys, as_index=False).votos.sum()
for (ue, cargo), g in loc.groupby(["CD_MUNICIPIO", "CD_CARGO"]):
    papel = {"6": "deputado(a) federal 2026", "7": "deputado(a) estadual 2026", "8": "deputado(a) distrital 2026"}[cargo]
    for r in g.nlargest(3, "votos").itertuples():
        add("municipio", ue2ibge[ue], r.SG_UF, papel + " (top 3 no município)", 2026, r, r.votos)

est = v[v.CD_CARGO.isin(["3", "5"])].groupby(keys, as_index=False).votos.sum()
for uf, g in est.groupby("SG_UF"):
    gov = g[g.CD_CARGO == "3"]
    fin = gov[gov.DS_SIT_TOT_TURNO.isin(["2º TURNO", "ELEITO"])]
    for r in (fin if len(fin) else gov.nlargest(1, "votos")).itertuples():
        add("uf", "", uf, "governador(a) 2026", 2026, r, r.votos)
    for r in g[(g.CD_CARGO == "5") & g.DS_SIT_TOT_TURNO.str.startswith("ELEITO", na=False)].itertuples():
        add("uf", "", uf, "senador(a) eleito(a) 2026", 2026, r, r.votos)

p = pd.DataFrame(rows)
p["foto"] = "fotos/" + p.ano.astype(str) + "_" + p.sq + ".jpg"
p.to_csv(OUT / "pessoas.csv", index=False)
print(len(p), "linhas;", p.drop_duplicates(["ano", "sq"]).shape[0], "pessoas distintas")
print(p.groupby("papel").size().to_string())
