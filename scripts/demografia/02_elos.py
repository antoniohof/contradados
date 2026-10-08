"""Elos fracos demográficos do PL: correlações ecológicas por zona eleitoral.

Método: regressão ponderada (WLS, peso = aptos 2026, erro-padrão agrupado por município,
efeitos fixos de UF, controle de porte do município) sobre data/demografia/zonas.csv (zonas
comparáveis). Para cada alvo, mede quanto ele muda quando a parcela de um grupo no eleitorado
da zona sobe 1 desvio-padrão (e 10 p.p.), mantendo os demais grupos constantes.
Grupos de referência: 35–44 anos e ensino médio.

Testamos também a regressão de Goodman (taxas de voto por grupo). Ela deu taxas impossíveis
(negativas ou acima de 100%) para faixas etárias, mesmo com efeitos fixos de UF, e falhou no
teste de sanidade da abstenção dos 70+. Por isso não é usada: a composição etária das zonas
está muito misturada com diferenças entre lugares (urbano/rural, renda) para inferir taxas
por grupo. Ver ecologica_teste() e notas_local/elos_fracos.md.

ATENÇÃO: são associações entre territórios (falácia ecológica). Não descrevem o comportamento
individual de nenhum grupo; servem para levantar hipóteses e escolher onde olhar.

Saídas: data/demografia/elos_regressao.csv, elos_fracos.csv, zonas_abaixo_de_jair.csv
"""
import sys
import warnings
from pathlib import Path
import numpy as np
import pandas as pd
import statsmodels.formula.api as smf
from scipy.optimize import lsq_linear

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "tse"))
from common import REPO  # noqa: E402

warnings.filterwarnings("ignore")
D = REPO / "data/demografia"
AVISO = "Associação entre territórios (zonas eleitorais), não comportamento individual (falácia ecológica)."

IDADE = ["idade_16_24", "idade_25_34", "idade_35_44", "idade_45_59", "idade_60_69", "idade_70mais"]
ESCOL = ["escol_sem_fundamental", "escol_fundamental", "escol_medio", "escol_superior"]
ROT = {"idade_16_24": "16–24 anos", "idade_25_34": "25–34 anos", "idade_35_44": "35–44 anos", "idade_45_59": "45–59 anos",
       "idade_60_69": "60–69 anos", "idade_70mais": "70+ anos", "escol_sem_fundamental": "sem fundamental completo",
       "escol_fundamental": "fundamental (até médio incompleto)", "escol_medio": "médio (até superior incompleto)",
       "escol_superior": "superior completo", "mulheres": "mulheres", "casados": "casados"}
ALVOS = {"swing": "Swing de margem 2022→2026 (p.p.; negativo = rumo ao PL)",
         "flavio_menos_jair": "Flávio 2026 − Bolsonaro 2022, 1º turno (p.p. dos válidos)",
         "d_abst": "Δ abstenção 1T 2022→2026 (p.p.)",
         "terceiros26": "Voto em terceiros 2026 (% válidos)",
         "renan26": "Renan Santos 2026 (% válidos)", "caiado26": "Caiado 2026 (% válidos)", "cury26": "Cury 2026 (% válidos)"}


def carregar():
    z = pd.read_csv(D / "zonas.csv", dtype={"IBGE": str, "CD_MUNICIPIO": str})
    z = z[z.comparavel & z.aptos26.gt(0) & z.regiao.notna()].copy()
    z["idade_16_24"] = z.idade_16_17 + z.idade_18_24
    for c in IDADE + ESCOL + ["mulheres", "casados"]:
        z[c + "_10"] = z[c] * 10  # coeficiente lido "por +10 p.p. do grupo"
    mun = z.groupby("IBGE").aptos26.transform("sum")
    z["log_porte_mun"] = np.log10(mun)  # controle: tamanho do município (proxy de urbanização)
    return z


def regressoes(z):
    preds = ["idade_16_24", "idade_25_34", "idade_45_59", "idade_60_69", "idade_70mais",
             "escol_sem_fundamental", "escol_fundamental", "escol_superior", "mulheres"]
    rhs = " + ".join(p + "_10" for p in preds) + " + log_porte_mun"
    out = []
    escopos = [("Brasil", z)] + [(rg, g) for rg, g in z.groupby("regiao")] + \
              [(uf, g) for uf, g in z.groupby("uf") if len(g) >= 60]
    for alvo in ALVOS:
        for esc, g in escopos:
            fe = " + C(uf)" if g.uf.nunique() > 1 else ""
            m = smf.wls(f"{alvo} ~ {rhs}{fe}", data=g, weights=g.aptos26).fit(
                cov_type="cluster", cov_kwds={"groups": pd.factorize(g.IBGE)[0]})
            for p in preds:
                sd = float(np.sqrt(np.cov(g[p], aweights=g.aptos26)))
                out.append(dict(alvo=alvo, escopo=esc, nivel="Brasil" if esc == "Brasil" else "UF" if len(esc) == 2 else "região",
                                grupo=ROT[p], coef_por_10pp=round(m.params[p + "_10"], 2),
                                efeito_1dp=round(m.params[p + "_10"] * sd * 10, 2), dp_do_grupo_pp=round(sd * 100, 1),
                                erro_padrao=round(m.bse[p + "_10"], 2), p_valor=round(m.pvalues[p + "_10"], 4),
                                n_zonas=len(g), r2=round(m.rsquared, 3)))
    r = pd.DataFrame(out)
    r["aviso"] = AVISO
    return r


def goodman(g, groups, y):
    """y = proporção dos aptos; X = parcelas dos grupos. Retorna taxa por grupo em [0,1]."""
    X = g[groups].to_numpy()
    X = X / X.sum(axis=1, keepdims=True)
    w = np.sqrt(g.aptos26.to_numpy())
    res = lsq_linear(X * w[:, None], y.to_numpy() * w, bounds=(0, 1))
    return res.x


def ecologica_teste(z):
    z = z.copy()
    z["y_flavio26"] = z.votos_flavio26 / z.aptos26
    z["y_bolso22"] = z.votos_bolso22 / z.aptos22
    z["y_lula26"] = z.votos_lula26 / z.aptos26
    z["y_lula22"] = z.lula22 / 100 * z.validos22 / z.aptos22
    z["y_abst26"], z["y_abst22"] = z.abst26 / 100, z.abst22 / 100
    z["y_terc26"] = (z.validos26 - z.votos_lula26 - z.votos_flavio26) / z.aptos26
    for k in ["renan", "caiado", "cury"]:
        z[f"y_{k}26"] = z[f"{k}26"] / 100 * z.validos26 / z.aptos26
    ys = ["y_bolso22", "y_flavio26", "y_lula22", "y_lula26", "y_abst22", "y_abst26", "y_terc26", "y_renan26", "y_caiado26", "y_cury26"]
    out = []
    escopos = [("Brasil", z)] + [(rg, g) for rg, g in z.groupby("regiao")] + [(uf, g) for uf, g in z.groupby("uf")]
    for esc, g in escopos:
        for dim, groups in [("idade", IDADE), ("escolaridade", ESCOL)]:
            # dispersão do perfil entre zonas: pouca variação = estimativa frágil
            disp = float(np.mean([g[c].std() for c in groups]))
            est = {y: goodman(g, groups, g[y]) for y in ys}
            for i, grp in enumerate(groups):
                eleit = float((g[grp] * g.eleitorado).sum())
                out.append(dict(escopo=esc, dimensao=dim, grupo=ROT[grp], eleitores_2026=int(eleit), n_zonas=len(g),
                                confiabilidade="baixa" if len(g) < 60 or disp < 0.02 else "média",
                                **{y[2:]: round(est[y][i] * 100, 1) for y in ys}))
    e = pd.DataFrame(out)
    e["d_pl"] = (e.flavio26 - e.bolso22).round(1)          # p.p. do grupo que votou PL (sobre aptos)
    e["d_lula"] = (e.lula26 - e.lula22).round(1)
    e["d_abst"] = (e.abst26 - e.abst22).round(1)
    e["aviso"] = AVISO + " Taxas estimadas por regressão de Goodman com limites [0,1], em % dos aptos do grupo."
    return e


def elos_fracos(r, z):
    """Segmento × território: onde mais eleitores do grupo vêm junto com o PL mais fraco.

    Sinal de elo fraco (p < 0,05, efeito de 1 desvio-padrão):
      Flávio − Jair < 0 (Flávio abaixo de Jair) ou swing > 0 (movimento para Lula) ou terceiros > 0.
    """
    piv = r.pivot_table(index=["escopo", "nivel", "grupo"], columns="alvo", values=["efeito_1dp", "p_valor"]).reset_index()
    piv.columns = [a if not b else f"{a}__{b}" for a, b in piv.columns]
    sig = lambda a, sgn: (piv[f"p_valor__{a}"] < 0.05) & (np.sign(piv[f"efeito_1dp__{a}"]) == sgn)
    piv["abaixo_de_jair"] = sig("flavio_menos_jair", -1)
    piv["swing_para_lula"] = sig("swing", 1)
    piv["mais_terceiros"] = sig("terceiros26", 1)
    piv["mais_abstencao"] = sig("d_abst", 1)
    piv["n_sinais_pl_mole"] = piv[["abaixo_de_jair", "swing_para_lula", "mais_terceiros"]].sum(axis=1)
    # tamanho do segmento no escopo
    rev = {v: k for k, v in ROT.items()}
    def tamanho(row):
        g = z if row.escopo == "Brasil" else z[z.uf == row.escopo] if row.nivel == "UF" else z[z.regiao == row.escopo]
        return int((g[rev[row.grupo]] * g.eleitorado).sum())
    piv["eleitores_no_segmento"] = piv.apply(tamanho, axis=1)
    def leitura(row):
        partes = []
        if row.abaixo_de_jair:
            partes.append(f"Flávio fica {abs(row['efeito_1dp__flavio_menos_jair']):.1f} p.p. mais abaixo de Jair")
        if row.swing_para_lula:
            partes.append(f"swing {row['efeito_1dp__swing']:+.1f} p.p. rumo a Lula")
        if row.mais_terceiros:
            partes.append(f"terceiros {row['efeito_1dp__terceiros26']:+.1f} p.p.")
        if row.mais_abstencao:
            partes.append(f"abstenção sobe {row['efeito_1dp__d_abst']:+.1f} p.p.")
        return ("Zonas com mais eleitores deste grupo (+1 desvio-padrão): " + "; ".join(partes)) if partes else ""
    piv["leitura"] = piv.apply(leitura, axis=1)
    out = piv[piv.n_sinais_pl_mole > 0].copy()
    cols = ["escopo", "nivel", "grupo", "eleitores_no_segmento", "n_sinais_pl_mole", "leitura",
            "efeito_1dp__flavio_menos_jair", "p_valor__flavio_menos_jair", "efeito_1dp__swing", "p_valor__swing",
            "efeito_1dp__terceiros26", "efeito_1dp__renan26", "efeito_1dp__caiado26", "efeito_1dp__cury26",
            "efeito_1dp__d_abst", "p_valor__d_abst"]
    out = out[cols].sort_values(["n_sinais_pl_mole", "eleitores_no_segmento"], ascending=False)
    out["aviso"] = AVISO
    return out


def main():
    z = carregar()
    print("zonas usadas:", len(z), file=sys.stderr)
    r = regressoes(z)
    r.to_csv(D / "elos_regressao.csv", index=False)
    elos_fracos(r, z).to_csv(D / "elos_fracos.csv", index=False)
    abaixo = z[z.flavio_menos_jair < 0]
    cols = ["IBGE", "municipio", "uf", "NR_ZONA", "aptos26", "bolso22", "flavio26", "flavio_menos_jair", "swing", "abst22", "abst26",
            "terceiros26", "renan26", "caiado26", "cury26", "idade_16_24", "idade_70mais", "escol_superior", "mulheres"]
    abaixo[cols].sort_values("flavio_menos_jair").to_csv(D / "zonas_abaixo_de_jair.csv", index=False)
    print("zonas com Flávio abaixo de Jair:", len(abaixo), "aptos:", int(abaixo.aptos26.sum()), file=sys.stderr)


if __name__ == "__main__":
    main()
