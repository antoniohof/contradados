"""2º turno (25/10/2026): o que está em jogo em cada município, estado e cenário.

Lê data/tse/municipios_master.csv (1º turno oficial) e, quando o TSE publicar o 2º turno
nos mesmos zips (NR_TURNO == "2"), acrescenta os resultados e as variações 1T → 2T.

Definições (votos, sem exterior):
- gap = votos Lula − votos Flávio no 1T (negativo = vantagem de Flávio).
- reserva = ausentes + votos em terceiros + brancos e nulos. É o estoque de votos que não
  foi para nenhum dos dois finalistas. Não supõe para onde iria.
- reserva_sobre_gap_nacional = reserva / |gap nacional|: quanto do placar nacional cabe ali.
- ausentes_excesso = ausentes acima do limiar de abstenção (média nacional oficial).
- lula2p = Lula / (Lula + candidato do PL), em p.p. Compara 1T e 2T sem efeito dos terceiros.
- d_lula2p_22 = lula2p 2T22 − lula2p 1T22: como o município se moveu entre os turnos de 2022.

Território, não indivíduos: nada aqui diz que os mesmos eleitores mudaram de voto.

Saídas em data/segundo_turno/: municipios_2t.csv, uf_2t.csv, cenarios_2t.csv, porte_2t.csv, resumo.json
"""
import json
import sys
import zipfile
from pathlib import Path
import pandas as pd

REPO = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO / "scripts/tse"))
OUT = REPO / "data/segundo_turno"
OUT.mkdir(exist_ok=True)

KEEP = ["IBGE", "municipio", "uf", "regiao", "capital", "hist", "pendulo_score", "virou", "venc26",
        "prefeito", "prefeito_partido", "PL_poder_local", "vereadores_PL_pct", "gov_mais_votado", "gov_PL_pct",
        "aptos26", "comp26", "ausentes26", "abst26", "lula26", "flavio26", "terceiros26", "brancnul26",
        "margem26", "swing", "abst22", "abst22_t2"]
TERCEIROS = ["caiado", "renan", "cury", "zema", "outros"]
# UFs com 2º turno para governador em 2022 (detalhe_votacao_munzona_2022: NR_TURNO 2, CD_CARGO 3)
GOV_2T_2022 = {"AL", "AM", "BA", "ES", "MS", "PB", "PE", "RO", "RS", "SC", "SE", "SP"}
# Situação do 2º turno de governador que os arquivos do TSE ainda não refletem. Revisar até 25/10.
GOV_2T_STATUS = {
    "RJ": "provavelmente cancelado: o TSE formou maioria para anular os 274.411 votos de Garotinho "
          "(RO 0602359-26.2026.6.19.0000, 08/10); com isso, Ruas teria 50,9% dos válidos. "
          "Falta a retotalização e proclamação pelo TRE-RJ.",
}
PORTE = ([0, 10e3, 50e3, 200e3, 1e6, 1e9], ["<10 mil", "10–50 mil", "50–200 mil", "200 mil–1 mi", ">1 mi"])


def votos_2t22(m):
    """Votos de Lula e Bolsonaro no 2T de 2022 (o master guarda só %)."""
    val = m.comparecimento_2022_2t - m.brancos_2022_2t - m.nulos_2022_2t
    return (m.lula22_t2 / 100 * val).round(), (m.bolso22_t2 / 100 * val).round()


def lula2p(lula, pl):
    return (lula / (lula + pl) * 100).round(2)


def municipios(m, limiar, listas):
    d = m[KEEP].copy()
    d["votos_lula26"] = m.votos_lula_2026
    d["votos_flavio26"] = m.votos_flavio_2026
    d["gap26"] = m.margem_lula_flavio_votos_2026
    for k in TERCEIROS:
        d[f"votos_{k}26"] = m[f"votos_{k}_2026"]
    d["votos_terceiros26"] = m.votos_terceiros26
    d["terceiro_principal"] = m[[f"votos_{k}_2026" for k in TERCEIROS[:-1]]].idxmax(axis=1).str.split("_").str[1]
    d["brancos_nulos26"] = m.brancos_2026_1t + m.nulos_2026_1t
    d["reserva26"] = d.ausentes26 + d.votos_terceiros26 + d.brancos_nulos26
    d["ausentes_excesso"] = (d.ausentes26 - d.aptos26 * limiar / 100).clip(lower=0).round()
    d["lula2p26"] = lula2p(d.votos_lula26, d.votos_flavio26)

    l22, b22 = votos_2t22(m)
    d["lula2p22_t1"] = lula2p(m.votos_lula22, m.votos_bolso22)
    d["lula2p22_t2"] = lula2p(l22, b22)
    d["d_lula2p_22"] = (d.lula2p22_t2 - d.lula2p22_t1).round(2)
    d["d_abst_22"] = (d.abst22_t2 - d.abst22).round(2)

    gov2t = set(pd.read_csv(REPO / "data/tse/estados_2026.csv").query("cargo == 'Governador' and situacao == '2º TURNO'").UF)
    d["gov_2t_uf"] = d.uf.isin(gov2t)
    d["gov_2t_status"] = d.uf.map(GOV_2T_STATUS).str.split(":").str[0].where(d.gov_2t_uf, None)
    d.loc[d.gov_2t_uf & d.gov_2t_status.isna(), "gov_2t_status"] = "confirmado"
    d["gov_2t_uf_2022"] = d.uf.isin(GOV_2T_2022)
    d["porte"] = pd.cut(d.aptos26, PORTE[0], labels=PORTE[1])

    for s in ["S1", "S2", "S3"]:
        rank = {ibge: i + 1 for i, ibge in enumerate(listas[s])}
        d[f"rank_{s}"] = d.IBGE.map(rank).astype("Int64")
    return d


def soma(g):
    """Agrega votos e recalcula as taxas a partir das somas (nunca média de %)."""
    v = g[["aptos26", "comp26", "ausentes26", "votos_lula26", "votos_flavio26", "gap26", "votos_terceiros26",
           "brancos_nulos26", "reserva26", "ausentes_excesso"] + [f"votos_{k}26" for k in TERCEIROS]].sum()
    v["municipios"] = len(g)
    v["abst26"] = round(v.ausentes26 / v.aptos26 * 100, 2)
    v["lula2p26"] = round(v.votos_lula26 / (v.votos_lula26 + v.votos_flavio26) * 100, 2)
    if "votos_lula26_t2" in g:
        t = g[["aptos26_t2", "ausentes26_t2", "votos_lula26_t2", "votos_flavio26_t2", "gap26_t2"]].sum()
        v = pd.concat([v, t])
        v["abst26_t2"] = round(t.ausentes26_t2 / t.aptos26_t2 * 100, 2)
        v["lula2p26_t2"] = round(t.votos_lula26_t2 / (t.votos_lula26_t2 + t.votos_flavio26_t2) * 100, 2)
        v["d_abst_26"] = round(v.abst26_t2 - v.abst26, 2)
        v["d_lula2p_26"] = round(v.lula2p26_t2 - v.lula2p26, 2)
    return v


def segundo_turno(T26):
    """Resultados do 2T, se já estiverem nos zips do TSE. Devolve None caso contrário."""
    import importlib
    r = importlib.import_module("02_resultados_2026")
    zp = T26 / "votacao_candidato_munzona_2026.zip"
    if not zp.exists():
        return None
    p = r.read_member(zipfile.ZipFile(zp), "votacao_candidato_munzona_2026_BR.csv", {"1"})
    p = p[p.NR_TURNO == "2"]
    if p.empty:
        return None
    p["CD_MUNICIPIO"] = p.CD_MUNICIPIO.str.zfill(5)
    p["key"] = p.NM_URNA_CANDIDATO.map(r.PRES)
    w = p.pivot_table(index="CD_MUNICIPIO", columns="key", values="v", aggfunc="sum", fill_value=0)
    c = r.comparecimento(T26 / "detalhe_votacao_munzona_2026.zip", 2026)
    t2 = pd.DataFrame({"votos_lula26_t2": w.lula, "votos_flavio26_t2": w.flavio}).join(c.filter(like="2026_2t"))
    t2.index = t2.index.map(r.tse_to_ibge())
    t2.index.name = "IBGE"
    return t2.rename(columns={"aptos_2026_2t": "aptos26_t2", "comparecimento_2026_2t": "comp26_t2",
                              "abstencoes_2026_2t": "ausentes26_t2"}).reset_index()


def junta_2t(d, t2):
    d = d.merge(t2, on="IBGE", how="left")
    d["abst26_t2"] = (d.ausentes26_t2 / d.aptos26_t2 * 100).round(2)
    d["lula26_t2"] = lula2p(d.votos_lula26_t2, d.votos_flavio26_t2)
    d["gap26_t2"] = d.votos_lula26_t2 - d.votos_flavio26_t2
    d["d_abst_26"] = (d.abst26_t2 - d.abst26).round(2)
    d["d_lula2p_26"] = (d.lula26_t2 - d.lula2p26).round(2)
    d["d_gap_26"] = d.gap26_t2 - d.gap26
    return d


def main():
    from common import TSE_RAW
    m = pd.read_csv(REPO / "data/tse/municipios_master.csv", dtype={"IBGE": str})
    listas = json.load(open(REPO / "data/tse/listas_oficial.json"))
    limiar = listas["limiar_abstencao"]
    d = municipios(m, limiar, listas)

    t2 = segundo_turno(TSE_RAW / "tse_2026")
    if t2 is not None:
        d = junta_2t(d, t2)
        print("2º turno incluído:", t2.votos_lula26_t2.notna().sum(), "municípios")
    else:
        print("2º turno ainda não publicado nos zips do TSE: só 1T.")

    gap_nac = abs(d.gap26.sum())
    d["reserva_sobre_gap_nacional"] = (d.reserva26 / gap_nac).round(4)
    d["ausentes_sobre_gap_nacional"] = (d.ausentes26 / gap_nac).round(4)
    d.to_csv(OUT / "municipios_2t.csv", index=False)

    uf = d.groupby("uf").apply(soma, include_groups=False)
    uf["gov_2t_uf"] = d.groupby("uf").gov_2t_uf.first()
    # 2022 entre turnos, por UF, a partir das somas de votos
    l22, b22 = votos_2t22(m)
    tmp = pd.DataFrame({"uf": m.uf, "l1": m.votos_lula22, "b1": m.votos_bolso22, "l2": l22, "b2": b22}).groupby("uf").sum()
    uf["lula2p22_t1"] = lula2p(tmp.l1, tmp.b1)
    uf["lula2p22_t2"] = lula2p(tmp.l2, tmp.b2)
    uf["d_lula2p_22"] = (uf.lula2p22_t2 - uf.lula2p22_t1).round(2)
    uf["reserva_sobre_gap_nacional"] = (uf.reserva26 / gap_nac).round(4)
    uf.reset_index().to_csv(OUT / "uf_2t.csv", index=False)

    grupos = {"Brasil": d}
    grupos.update({s: d[d[f"rank_{s}"].notna()] for s in ["S1", "S2", "S3"]})
    grupos["S1∪S2∪S3"] = d[d[[f"rank_{s}" for s in ["S1", "S2", "S3"]]].notna().any(axis=1)]
    cen = pd.DataFrame({k: soma(g) for k, g in grupos.items()}).T
    cen["reserva_sobre_gap_nacional"] = (cen.reserva26 / gap_nac).round(4)
    cen["excesso_sobre_gap_nacional"] = (cen.ausentes_excesso / gap_nac).round(4)
    cen.index.name = "grupo"
    cen.reset_index().to_csv(OUT / "cenarios_2t.csv", index=False)

    porte = pd.DataFrame({k: soma(g) for k, g in d.groupby("porte", observed=True)}).T
    porte["pct_reserva"] = (porte.reserva26 / porte.reserva26.sum() * 100).round(1)
    porte.index.name = "porte"
    porte.reset_index().to_csv(OUT / "porte_2t.csv", index=False)

    # Precedente 2022 entre turnos (medianas municipais, sem ponderar)
    def med(g):
        return {"municipios": len(g), "d_lula2p_22": round(g.d_lula2p_22.median(), 2), "d_abst_22": round(g.d_abst_22.median(), 2)}
    hist22 = {
        "pct_municipios_lula2p_caiu": round((d.d_lula2p_22 < 0).mean() * 100, 1),
        "por_regiao": {r: med(g) for r, g in d.groupby("regiao")},
        "por_cenario": {s: med(d[d[f"rank_{s}"].notna()]) for s in ["S1", "S2", "S3"]},
        "gov_2t_2022_por_regiao": {r: {"com_2t_gov": med(g[g.gov_2t_uf_2022]), "sem_2t_gov": med(g[~g.gov_2t_uf_2022])}
                                   for r, g in d.groupby("regiao")},
    }

    b = cen.loc["Brasil"]
    resumo = {
        "gap_nacional_1t": int(d.gap26.sum()), "limiar_abstencao": limiar,
        "ausentes": int(b.ausentes26), "terceiros": int(b.votos_terceiros26), "brancos_nulos": int(b.brancos_nulos26),
        "terceiros_por_candidato": {k: int(b[f"votos_{k}26"]) for k in TERCEIROS},
        "lula2p_1t26": float(b.lula2p26),
        "lula2p_2022": {"t1": float(lula2p(tmp.l1.sum(), tmp.b1.sum())), "t2": float(lula2p(tmp.l2.sum(), tmp.b2.sum()))},
        "uf_com_2t_governador": sorted(uf.index[uf.gov_2t_uf]),
        "status_2t_governador": {u: GOV_2T_STATUS.get(u, "confirmado") for u in sorted(uf.index[uf.gov_2t_uf])},
        "cenarios": cen[["municipios", "gap26", "ausentes26", "ausentes_excesso", "votos_terceiros26",
                         "reserva_sobre_gap_nacional"]].astype(float).to_dict(orient="index"),
        "porte": porte[["municipios", "gap26", "reserva26", "pct_reserva"]].astype(float).to_dict(orient="index"),
        "precedente_2022": hist22,
        "tem_2t": t2 is not None,
    }
    json.dump(resumo, open(OUT / "resumo.json", "w"), ensure_ascii=False, indent=1)
    print(json.dumps(resumo, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main()
