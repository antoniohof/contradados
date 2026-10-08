"""Dados das abas "Elos fracos" e "Candidatos do campo PL" do site (docs/data/extra.json).

- Governador, 2º turno com candidato do campo PL (AC, AM, DF, ES, RJ, TO): % do candidato e do
  adversário por município e quantos pontos o candidato ficou abaixo de Flávio no mesmo lugar
  (arquivo oficial votacao_candidato_munzona_2026; % sobre válidos oficiais).
- Zonas onde Flávio ficou abaixo de Jair (data/demografia/zonas.csv).
- Tabelas de elos fracos (data/demografia/elos_regressao.csv, elos_fracos.csv).
- Cartões: números eleitorais calculados aqui + pontos documentados com URL própria
  (data/candidatos/pontos_documentados.json). Compilação documentada, não avaliação.
"""
import json
import zipfile
from importlib import import_module
import pandas as pd
from common import REPO, OUT, TSE_RAW, tse_to_ibge

r02 = import_module("02_resultados_2026")
WEB = REPO / "docs/data"


def fmt(x, d=1):
    return f"{x:.{d}f}".replace(".", ",")


def main():
    cfg = json.load(open(REPO / "data/candidatos/pontos_documentados.json"))
    races = [r for r in cfg["races"] if r["uf"] != "BR"]
    xw = tse_to_ibge()
    m = pd.read_csv(OUT / "municipios_master.csv", dtype={"IBGE": str}, low_memory=False).set_index("IBGE")
    st = json.load(open(REPO / "data/segundo_turno/resumo.json")).get("status_2t_governador", {})
    z = zipfile.ZipFile(TSE_RAW / "tse_2026/votacao_candidato_munzona_2026.zip")
    mun, cards = {}, []
    for race in races:
        uf = race["uf"]
        d = r02.read_member(z, f"votacao_candidato_munzona_2026_{uf}.csv", {"3"})
        d = d[d.NR_TURNO == "1"]
        tot = d.groupby("CD_MUNICIPIO").v.sum()
        c = d[d.NM_URNA_CANDIDATO == race["cand"]].groupby("CD_MUNICIPIO").v.sum()
        a = d[d.NM_URNA_CANDIDATO == race["adv"]].groupby("CD_MUNICIPIO").v.sum()
        assert len(c) and len(a), race
        t = pd.DataFrame({"c": c, "a": a, "tot": tot}).fillna(0)
        t.index = t.index.map(xw)
        t = t.join(m[["municipio", "flavio26", "aptos26"]])
        t["gc"], t["ga"] = t.c / t.tot * 100, t.a / t.tot * 100
        t["gd"] = t.flavio26 - t.gc
        for ibge, r in t.iterrows():
            mun[ibge] = dict(gc=round(r.gc, 1), ga=round(r.ga, 1), gd=round(r.gd, 1), gcn=race["rotulo_cand"], gan=race["rotulo_adv"])
        C, A, T = t.c.sum(), t.a.sum(), t.tot.sum()
        fl_uf = (m[m.uf == uf].votos_flavio_2026.sum() / m[m.uf == uf].validos_2026.sum()) * 100
        big = t.sort_values("aptos26", ascending=False).head(4)
        n_adv = int((t.a > t.c).sum())
        dv = f"{abs(int(C - A)):,}".replace(",", ".")
        rel = lambda g: f"{fmt(abs(g))} p.p. {'abaixo' if g > 0 else 'acima'}"
        eleit = [f"{race['rotulo_cand'].split(' (')[0]} {'à frente' if C > A else 'atrás'} por {dv} votos no 1º turno.",
                 f"Ficou {rel(fl_uf - C / T * 100)} de Flávio no estado (Flávio: {fmt(fl_uf)}%)."]
        if len(t) > 1:
            grandes = t[t.aptos26 >= 20000].sort_values("gd", ascending=False).head(3)
            eleit += [f"{race['rotulo_adv'].split(' (')[0]} ficou à frente em {n_adv} de {len(t)} municípios.",
                      "Nos maiores municípios: " + "; ".join(f"{titulo(n)}, {rel(g)}" for n, g in zip(big.municipio, big.gd)) + ".",
                      "Maiores distâncias para Flávio (20 mil+ eleitores): " + "; ".join(f"{titulo(n)}, {rel(g)}" for n, g in zip(grandes.municipio, grandes.gd)) + "."]
        status = st.get(uf, "")
        cards.append(dict(uf=uf, cargo="Governador", cand=race["rotulo_cand"], adv=race["rotulo_adv"],
                          t1=f"{fmt(C / T * 100)}% × {fmt(A / T * 100)}%",
                          status="2º turno em 25/10" if status == "confirmado" else ("2º turno provavelmente cancelado" if status.startswith("provavelmente") else status),
                          status_txt=status, eleitorais=eleit, pontos=race["pontos"]))
        print(uf, eleit[0], "| abaixo de Flávio:", fmt(fl_uf - C / T * 100))
    br = cfg["races"][0]
    n = json.load(open(WEB / "meta.json"))["nacional"]
    cards.insert(0, dict(uf="BR", cargo="Presidente", cand=br["rotulo_cand"], adv=br["rotulo_adv"], t1="47,0% × 45,2%",
                         status="2º turno em 25/10", status_txt="",
                         eleitorais=["Flávio à frente por " + f"{n['flavio'] + n['exterior']['flavio'] - n['lula'] - n['exterior']['lula']:,}".replace(",", ".") + " votos, incluindo o exterior.",
                                     f"Fora do placar: {fmt(n['ausentes'] / 1e6)} mi de ausentes e {fmt(n['terceiros'] / 1e6)} mi de votos em terceiros (sem exterior)."],
                         pontos=br["pontos"]))

    zn = pd.read_csv(REPO / "data/demografia/zonas.csv", dtype={"IBGE": str})
    ab = zn[zn.comparavel & (zn.flavio_menos_jair < 0)].groupby("IBGE").agg(zfj=("NR_ZONA", "size"), zfja=("aptos26", "sum"))
    for ibge, r in ab.iterrows():
        mun.setdefault(ibge, {}).update(zfj=int(r.zfj), zfja=int(r.zfja))

    reg = pd.read_csv(REPO / "data/demografia/elos_regressao.csv")
    b = reg[reg.escopo == "Brasil"]
    def cell(g, a):
        x = b[(b.grupo == g) & (b.alvo == a)].iloc[0]
        return (f"{x.efeito_1dp:+.1f}" if abs(x.efeito_1dp) >= 0.05 else "0,0").replace(".", ",").replace("-", "−") + ("*" if x.p_valor < 0.05 else "")
    grupos = [("sem fundamental completo", "Sem fundamental completo"), ("superior completo", "Superior completo"),
              ("mulheres", "Mulheres"), ("16–24 anos", "16–24 anos"), ("70+ anos", "70+ anos")]
    elos_nac = [[lab, cell(g, "swing"), cell(g, "flavio_menos_jair"), cell(g, "d_abst")] for g, lab in grupos]
    ef = pd.read_csv(REPO / "data/demografia/elos_fracos.csv")
    celulas = ef.sort_values(["eleitores_no_segmento"], ascending=False).head(12)[["escopo", "grupo", "eleitores_no_segmento", "n_sinais_pl_mole"]].values.tolist()
    out = dict(mun=mun, cards=cards, elos_nac=elos_nac, celulas=[[a, b_, int(c), int(d)] for a, b_, c, d in celulas],
               status_2t_governador=st)
    json.dump(out, open(WEB / "extra.json", "w"), ensure_ascii=False, separators=(",", ":"))
    print("extra.json:", len(mun), "municípios,", len(cards), "cartões")


def titulo(s):
    import re
    return re.sub(r"\b(De|Da|Do|Das|Dos|E)\b", lambda w: w.group(0).lower(), str(s))


if __name__ == "__main__":
    main()
