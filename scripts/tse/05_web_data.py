"""Exporta os dados do site (docs/data/) a partir de data/tse/municipios_master.csv.

docs/data/municipios.json  um objeto por município, chaves curtas (ver KEYS)
docs/data/meta.json        totais nacionais, listas, governos estaduais, correlações
docs/data/municipios.topo.json  malha IBGE simplificada (copiada de data/geo/)
"""
import json
import math
import shutil
import pandas as pd
from common import REPO, OUT

WEB = REPO / "docs/data"
WEB.mkdir(parents=True, exist_ok=True)

KEYS = {  # chave curta: (coluna, casas decimais | None para texto/inteiro)
    "n": ("municipio", None), "uf": ("uf", None), "rg": ("regiao", None), "cap": ("capital", None),
    "l22": ("lula22", 1), "b22": ("bolso22", 1), "m22": ("margem22", 1), "l22t2": ("lula22_t2", 1),
    "l26": ("lula26", 1), "f26": ("flavio26", 1), "m26": ("margem26", 1), "sw": ("swing", 1),
    "t26": ("terceiros26", 1), "cai": ("caiado26", 1), "ren": ("renan26", 1), "cur": ("cury26", 1), "zem": ("zema26", 1),
    "vl": ("votos_lula_2026", None), "vf": ("votos_flavio_2026", None), "vt3": ("votos_terceiros26", None),
    "mg": ("margem_lula_flavio_votos_2026", None),
    "a18": ("abst18", 1), "a22": ("abst22", 1), "a22t2": ("abst22_t2", 1), "a26": ("abst26", 1), "da": ("d_abst", 1),
    "apt": ("aptos26", None), "aus": ("ausentes26", None), "bn": ("brancnul26", 1),
    "h": ("hist", None), "ps": ("pendulo_score", None), "vir": ("virou", None), "emp": ("empate26", None),
    "c": ("cenarios", None), "tsm": ("terceiros_sobre_margem", 2), "asm": ("ausentes_sobre_margem", 2),
    "pf": ("prefeito", None), "pp": ("prefeito_partido", None), "pb": ("prefeito_bloco", None),
    "pcol": ("prefeito_coligacao", None), "psup": ("prefeito_eleicao_suplementar", None),
    "pid": ("prefeito_idade", None), "pg": ("prefeito_genero", None), "pocu": ("prefeito_ocupacao", None),
    "vice": ("vice_prefeito", None), "vp": ("vice_partido", None),
    "vtot": ("vereadores_total", None), "vpl": ("vereadores_PL", None), "vpt": ("vereadores_PT", None),
    "vesq": ("vereadores_esquerda", None), "vcen": ("vereadores_centro", None), "vdir": ("vereadores_direita", None),
    "vplp": ("vereadores_PL_pct", 3), "mb": ("maior_bancada", None), "vpln": ("vereadores_PL_nomes", None),
    "plp": ("PL_poder_local", None), "cpl": ("candidato_PL_prefeito_2024", None), "cpt": ("candidato_PT_prefeito_2024", None),
    "gov": ("gov_mais_votado", None), "govp": ("gov_mais_votado_pct", 3), "gpl": ("gov_PL_candidato", None),
    "gplp": ("gov_PL_pct", 3), "gpt": ("gov_PT_candidato", None), "gptp": ("gov_PT_pct", 3),
    "sen": ("sen_mais_votado", None), "senp": ("sen_mais_votado_pct", 3), "spl": ("sen_PL_candidato", None),
    "splp": ("sen_PL_pct", 3), "spt": ("sen_PT_candidato", None), "sptp": ("sen_PT_pct", 3),
    "gsj": ("gov_votos_sub_judice", None), "ssj": ("sen_votos_sub_judice", None),
    "dfpl": ("depfed_PL_pct", 3), "dfpt": ("depfed_PT_pct", 3), "dfm": ("depfed_mais_votado", None), "dfmp": ("depfed_mais_votado_pct", 3),
    "depl": ("depest_PL_pct", 3), "dept": ("depest_PT_pct", 3), "dem": ("depest_mais_votado", None),
    "i16": ("idade_16_17_pct", 3), "i18": ("idade_18_24_pct", 3), "i25": ("idade_25_34_pct", 3), "i35": ("idade_35_44_pct", 3),
    "i45": ("idade_45_59_pct", 3), "i60": ("idade_60_69_pct", 3), "i70": ("idade_70mais_pct", 3), "i70n": ("idade_70mais_n", None),
    "esup": ("escol_superior_pct", 3), "esf": ("escol_sem_fundamental_pct", 3), "mul": ("mulheres_pct", 3),
    "eco": ("economia", None), "pau": ("pautas", None), "eve": ("eventos", None), "fon": ("fontes", None),
    "conf": ("confianca", None), "obs": ("obs", None),
}

T2KEYS = {  # colunas de data/segundo_turno/municipios_2t.csv; as de 2T real aparecem quando publicadas
    "rsv": ("reserva26", None), "rsg": ("reserva_sobre_gap_nacional", 4), "aex": ("ausentes_excesso", None),
    "tp": ("terceiro_principal", None), "l2p": ("lula2p26", 2), "l2p22a": ("lula2p22_t1", 2), "l2p22b": ("lula2p22_t2", 2),
    "dl2p22": ("d_lula2p_22", 2), "dab22": ("d_abst_22", 2), "g2t": ("gov_2t_uf", None), "g2ts": ("gov_2t_status", None),
    "vl2": ("votos_lula26_t2", None), "vf2": ("votos_flavio26_t2", None), "a26t2": ("abst26_t2", 2),
    "l26t2": ("lula26_t2", 2), "g26t2": ("gap26_t2", None), "da26": ("d_abst_26", 2),
    "dl2p26": ("d_lula2p_26", 2), "dg26": ("d_gap_26", None),
}


def clean(v, dec):
    if v is None or (isinstance(v, float) and math.isnan(v)):
        return None
    if isinstance(v, bool):
        return v
    if dec is not None:
        return round(float(v), dec)
    if isinstance(v, float) and v.is_integer():
        return int(v)
    if hasattr(v, "item"):
        return v.item()
    return v


def main():
    m = pd.read_csv(OUT / "municipios_master.csv", dtype={"IBGE": str}, low_memory=False)
    st = REPO / "data/segundo_turno"
    if (st / "municipios_2t.csv").exists():  # camada do 2º turno (scripts/segundo_turno.py, sessão elei-es-bb)
        t2 = pd.read_csv(st / "municipios_2t.csv", dtype={"IBGE": str}, low_memory=False)
        t2cols = [c for c in T2KEYS.values() if c[0] in t2.columns]
        m = m.merge(t2[["IBGE"] + [c[0] for c in t2cols]].rename(columns={c[0]: "t2_" + c[0] for c in t2cols}),
                    on="IBGE", how="left")
        KEYS.update({k: ("t2_" + c, d) for k, (c, d) in T2KEYS.items() if c in t2.columns})
    rows = {}
    for r in m.to_dict("records"):
        o = {}
        for k, (col, dec) in KEYS.items():
            v = clean(r.get(col), dec)
            if v not in (None, "", False):
                o[k] = v
        rows[r["IBGE"]] = o
    json.dump(rows, open(WEB / "municipios.json", "w"), ensure_ascii=False, separators=(",", ":"))

    listas = json.load(open(OUT / "listas_oficial.json"))
    est = pd.read_csv(OUT / "estados_2026.csv")
    corr = {rg: round(g.abst26.corr(g.lula26), 2) for rg, g in m.groupby("regiao")}
    nat = dict(
        lula=int(m.votos_lula_2026.sum()), flavio=int(m.votos_flavio_2026.sum()),
        terceiros=int(m.votos_terceiros26.sum()), validos=int(m.validos_2026.sum()),
        aptos=int(m.aptos26.sum()), ausentes=int(m.ausentes26.sum()),
        brancos=int(m.brancos_2026_1t.sum()), nulos=int(m.nulos_2026_1t.sum()),
        idosos70=int(m.idade_70mais_n.sum()),
        exterior=dict(lula=157387, flavio=143900),
        viraram_lula_flavio=int(m.virou.sum()), viraram_flavio_lula=int(m.virou_para_lula.sum()),
        empates=m[m.empate26].municipio.tolist(),
        lula_perdeu_pct=round(float((m.lula26 < m.lula22).mean() * 100), 1),
        universo=dict(S1=int(m.candidato_S1.sum()), S2=int(m.candidato_S2.sum()), S3=int(m.candidato_S3.sum())),
    )
    uf = m.groupby("uf").agg(vl=("votos_lula_2026", "sum"), vf=("votos_flavio_2026", "sum"), v=("validos_2026", "sum"),
                             vl22=("votos_lula22", "sum"), vb22=("votos_bolso22", "sum"),
                             apt=("aptos26", "sum"), aus=("ausentes26", "sum")).reset_index()
    meta = dict(
        gerado="2026-10-08", limiar_abstencao=listas["limiar_abstencao"],
        listas={k: listas[k] for k in ["S1", "S2", "S3"]}, nacional=nat,
        corr_abst_lula_regiao=corr, estados=est.to_dict("records"), uf=uf.to_dict("records"),
    )
    if (st / "resumo.json").exists():
        meta["segundo_turno"] = json.load(open(st / "resumo.json"))
        meta["segundo_turno"]["uf"] = pd.read_csv(st / "uf_2t.csv").to_dict("records")
    json.dump(meta, open(WEB / "meta.json", "w"), ensure_ascii=False, separators=(",", ":"))
    shutil.copy(REPO / "data/geo/municipios.topo.json", WEB / "municipios.topo.json")
    print(len(rows), "municípios;", (WEB / "municipios.json").stat().st_size // 1024, "KB;", nat)


if __name__ == "__main__":
    main()
