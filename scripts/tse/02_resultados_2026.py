"""Resultados oficiais do 1º turno de 2026 por município, lidos direto dos zips do TSE.

- Presidente: votos de todos os candidatos (arquivo _BR do votacao_candidato_munzona_2026)
- Governador, Senado, Deputado federal/estadual: vencedor local, desempenho do PL e do PT
- Comparecimento/abstenção/brancos/nulos: detalhe_votacao_munzona 2026 e 2022

Saída: data/tse/resultados_2026.csv, comparecimento_2022_2026.csv, estados_2026.csv
"""
import zipfile
from pathlib import Path
from common import TSE_RAW, OUT, tse_to_ibge
import pandas as pd

T26 = TSE_RAW / "tse_2026"
UFS = "AC AL AM AP BA CE DF ES GO MA MG MS MT PA PB PE PI PR RJ RN RO RR RS SC SE SP TO".split()
COLS = ["NR_TURNO", "SG_UF", "CD_MUNICIPIO", "CD_CARGO", "NR_CANDIDATO", "NM_URNA_CANDIDATO",
        "SG_PARTIDO", "QT_VOTOS_NOMINAIS", "QT_VOTOS_NOMINAIS_VALIDOS", "NM_TIPO_DESTINACAO_VOTOS", "DS_SIT_TOT_TURNO"]
NUM = ["QT_VOTOS_NOMINAIS", "QT_VOTOS_NOMINAIS_VALIDOS"]
# Votos "Anulado sub judice": candidatos com registro sob julgamento. O TSE não os conta como
# válidos (QT_VOTOS_NOMINAIS_VALIDOS = 0), então os % de governador/senado aqui são sobre os
# válidos oficiais. Em 2026 isso afeta governador (RJ, MA, SE...) e senado (AC, SE, RO...),
# nunca presidente. `vn` guarda os nominais, incluindo os sub judice.
PRES = {"LULA": "lula", "FLAVIO BOLSONARO": "flavio", "RONALDO CAIADO": "caiado", "RENAN SANTOS": "renan",
        "ESCRITOR AUGUSTO CURY": "cury", "ZEMA": "zema"}


def read_member(z, name, cargos):
    parts = []
    for ch in pd.read_csv(z.open(name), sep=";", encoding="latin1", dtype=str, usecols=COLS, chunksize=500_000):
        ch = ch[ch.CD_CARGO.isin(cargos) & (ch.SG_UF != "ZZ")]
        ch["CD_MUNICIPIO"] = ch.CD_MUNICIPIO.str.zfill(5)  # o arquivo _BR vem sem zeros à esquerda
        ch = ch.assign(v=ch.QT_VOTOS_NOMINAIS_VALIDOS.astype(int), vn=ch.QT_VOTOS_NOMINAIS.astype(int)).drop(columns=NUM)
        parts.append(ch.groupby([c for c in COLS if c not in NUM], dropna=False)[["v", "vn"]].sum().reset_index())
    d = pd.concat(parts)
    return d.groupby([c for c in d.columns if c not in ("v", "vn")], dropna=False)[["v", "vn"]].sum().reset_index()


def pct(a, b):
    return (a / b).round(4)


def local_race(d, cargo, label):
    """Vencedor local, % do PL e do PT (melhor candidato de cada partido) num cargo."""
    x = d[d.CD_CARGO == cargo].copy()
    tot = x.groupby("CD_MUNICIPIO").v.sum()
    x["p"] = x.v / x.CD_MUNICIPIO.map(tot)
    x = x.sort_values(["CD_MUNICIPIO", "v"], ascending=[True, False])
    win = x.groupby("CD_MUNICIPIO").head(1).set_index("CD_MUNICIPIO")
    out = pd.DataFrame({f"{label}_mais_votado": win.NM_URNA_CANDIDATO.str.title() + " (" + win.SG_PARTIDO + ")",
                        f"{label}_mais_votado_pct": win.p.round(4)})
    for party in ["PL", "PT"]:
        bp = x[x.SG_PARTIDO == party].groupby("CD_MUNICIPIO").head(1).set_index("CD_MUNICIPIO")
        out[f"{label}_{party}_candidato"] = bp.NM_URNA_CANDIDATO.str.title()
        out[f"{label}_{party}_pct"] = bp.p.round(4)
    sj = d[(d.CD_CARGO == cargo) & (d.NM_TIPO_DESTINACAO_VOTOS != "Válido")]
    out[f"{label}_votos_sub_judice"] = sj.groupby("CD_MUNICIPIO").vn.sum().reindex(out.index).fillna(0).astype(int)
    return out


def party_share(d, cargo, label):
    x = d[d.CD_CARGO == cargo]
    tot = x.groupby("CD_MUNICIPIO").v.sum()
    out = pd.DataFrame(index=tot.index)
    for party in ["PL", "PT"]:
        out[f"{label}_{party}_pct"] = pct(x[x.SG_PARTIDO == party].groupby("CD_MUNICIPIO").v.sum().reindex(tot.index).fillna(0), tot)
    top = x.sort_values("v", ascending=False).groupby("CD_MUNICIPIO").head(1).set_index("CD_MUNICIPIO")
    out[f"{label}_mais_votado"] = top.NM_URNA_CANDIDATO.str.title() + " (" + top.SG_PARTIDO + ")"
    out[f"{label}_mais_votado_pct"] = pct(top.v, tot)
    return out


def comparecimento(path, ano):
    z = zipfile.ZipFile(path)
    name = [n for n in z.namelist() if n.endswith("_BR.csv")][0]
    d = pd.read_csv(z.open(name), sep=";", encoding="latin1", dtype=str)
    d = d[(d.CD_CARGO == "1") & (d.SG_UF != "ZZ")].copy()
    d["CD_MUNICIPIO"] = d.CD_MUNICIPIO.str.zfill(5)
    num = ["QT_APTOS", "QT_COMPARECIMENTO", "QT_ABSTENCOES", "QT_VOTOS_BRANCOS", "QT_TOTAL_VOTOS_NULOS", "QT_VOTOS_NOMINAIS_VALIDOS"]
    d[num] = d[num].astype(int)
    g = d.groupby(["NR_TURNO", "CD_MUNICIPIO"])[num].sum().reset_index()
    out = []
    for t, gg in g.groupby("NR_TURNO"):
        gg = gg.set_index("CD_MUNICIPIO")
        s = f"{ano}_{t}t"
        out.append(pd.DataFrame({
            f"aptos_{s}": gg.QT_APTOS, f"comparecimento_{s}": gg.QT_COMPARECIMENTO,
            f"abstencoes_{s}": gg.QT_ABSTENCOES, f"abstencao_pct_{s}": pct(gg.QT_ABSTENCOES, gg.QT_APTOS),
            f"brancos_{s}": gg.QT_VOTOS_BRANCOS, f"nulos_{s}": gg.QT_TOTAL_VOTOS_NULOS,
            f"brancos_nulos_pct_{s}": pct(gg.QT_VOTOS_BRANCOS + gg.QT_TOTAL_VOTOS_NULOS, gg.QT_COMPARECIMENTO),
        }))
    return pd.concat(out, axis=1)


def main():
    xw = tse_to_ibge()
    z = zipfile.ZipFile(T26 / "votacao_candidato_munzona_2026.zip")

    # Presidente
    p = read_member(z, "votacao_candidato_munzona_2026_BR.csv", {"1"})
    p = p[p.NR_TURNO == "1"]
    p["key"] = p.NM_URNA_CANDIDATO.map(PRES).fillna("outros")
    w = p.pivot_table(index="CD_MUNICIPIO", columns="key", values="v", aggfunc="sum", fill_value=0)
    w["validos"] = w.sum(axis=1)
    pres = pd.DataFrame(index=w.index)
    for k in list(PRES.values()) + ["outros"]:
        pres[f"votos_{k}_2026"] = w[k]
        pres[f"{k}_2026"] = pct(w[k], w.validos)
    pres["validos_2026"] = w.validos
    pres["terceiros_2026"] = pct(w.validos - w.lula - w.flavio, w.validos)
    pres["margem_lula_flavio_votos_2026"] = w.lula - w.flavio
    print("Brasil (sem exterior): Flávio", w.flavio.sum(), "Lula", w.lula.sum())

    # Demais cargos, UF a UF
    races = []
    for uf in UFS:
        d = read_member(z, f"votacao_candidato_munzona_2026_{uf}.csv", {"3", "5", "6", "7"})
        d = d[d.NR_TURNO == "1"]
        r = pd.concat([local_race(d, "3", "gov"), local_race(d, "5", "sen"),
                       party_share(d, "6", "depfed"), party_share(d, "7", "depest")], axis=1)
        races.append(r)
        print(uf, len(r))
    races = pd.concat(races)

    res = pres.join(races, how="left")
    res.index = res.index.map(xw)
    res.index.name = "IBGE"
    res.reset_index().to_csv(OUT / "resultados_2026.csv", index=False)

    # Comparecimento
    c26 = comparecimento(T26 / "detalhe_votacao_munzona_2026.zip", 2026)
    c22 = comparecimento(T26 / "detalhe_votacao_munzona_2022.zip", 2022)
    c = c22.join(c26, how="outer")
    c.index = c.index.map(xw)
    c.index.name = "IBGE"
    c.reset_index().to_csv(OUT / "comparecimento_2022_2026.csv", index=False)
    print("abstenção 2026 1T:", c.abstencoes_2026_1t.sum(), "/", c.aptos_2026_1t.sum(),
          round(c.abstencoes_2026_1t.sum() / c.aptos_2026_1t.sum() * 100, 2), "%")

    # Estado: quem foi ao 2º turno para governador / eleitos para o Senado
    est = []
    for uf in UFS:
        d = read_member(z, f"votacao_candidato_munzona_2026_{uf}.csv", {"3", "5"})
        d = d[d.NR_TURNO == "1"]
        for cargo, lab in [("3", "Governador"), ("5", "Senador")]:
            x = d[d.CD_CARGO == cargo].groupby(["NM_URNA_CANDIDATO", "SG_PARTIDO", "DS_SIT_TOT_TURNO", "NM_TIPO_DESTINACAO_VOTOS"])[["v", "vn"]].sum().reset_index()
            x["pct"] = pct(x.v, x.v.sum())                      # base oficial: válidos
            x["pct_com_sub_judice"] = pct(x.vn, x.vn.sum())     # base: válidos + anulados sub judice
            sj = x[x.NM_TIPO_DESTINACAO_VOTOS != "Válido"]
            x = pd.concat([x.sort_values("vn", ascending=False).head(4), sj]).drop_duplicates()
            for r in x.sort_values("vn", ascending=False).itertuples():
                est.append(dict(UF=uf, cargo=lab, candidato=r.NM_URNA_CANDIDATO.title(), partido=r.SG_PARTIDO,
                                votos=r.v, votos_nominais=r.vn, destinacao=r.NM_TIPO_DESTINACAO_VOTOS,
                                pct=r.pct, pct_com_sub_judice=r.pct_com_sub_judice, situacao=r.DS_SIT_TOT_TURNO))
    pd.DataFrame(est).to_csv(OUT / "estados_2026.csv", index=False)


if __name__ == "__main__":
    main()
