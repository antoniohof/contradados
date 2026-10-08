"""Elos fracos demográficos, passada municipal (complementa a análise por zona em scripts/demografia/).

Pergunta: em que perfis de eleitorado (idade, escolaridade, sexo) o voto no PL foi mais mole entre 2022 e 2026?
Correlações e regressões ENTRE MUNICÍPIOS: descrevem territórios, não pessoas (falácia ecológica).

Entradas: data/tse/municipios_master.csv (perfil do eleitorado TSE jul/2026, votos 2022/2026 oficiais)
          data/segundo_turno/municipios_2t.csv (d_lula2p_22, porte, reserva26)
Saídas:   data/demografia/municipal_correlacoes.csv  correlação ponderada por aptos26, por Brasil/região/UF
          data/demografia/municipal_ols.csv          MQO ponderado por região (coef. em p.p. por +10 p.p. de fatia)
          data/demografia/municipal_segmentos.csv    segmento × território: eleitores do segmento nos municípios
                                                     do quartil "PL mais fraco" de cada UF, e sobrerrepresentação
          data/demografia/municipal_base.csv         base municipal com alvos e perfis
"""
from pathlib import Path
import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'data/demografia'
OUT.mkdir(exist_ok=True)

m = pd.read_csv(ROOT / 'data/tse/municipios_master.csv', dtype={'IBGE': str})
t2 = pd.read_csv(ROOT / 'data/segundo_turno/municipios_2t.csv', dtype={'IBGE': str},
                 usecols=['IBGE', 'd_lula2p_22', 'porte', 'reserva26'])
d = m.merge(t2, on='IBGE', how='left')
d = d[d.swing.notna() & d.aptos26.gt(0)].copy()

# perfis (fatias 0–1 do eleitorado apto, TSE jul/2026)
d['jovens_16_24_pct'] = d.idade_16_17_pct + d.idade_18_24_pct
d['idosos_60mais_pct'] = d.idade_60_69_pct + d.idade_70mais_pct
PERFIS = ['idade_16_17_pct', 'idade_18_24_pct', 'idade_25_34_pct', 'idade_35_44_pct', 'idade_45_59_pct',
          'idade_60_69_pct', 'idade_70mais_pct', 'jovens_16_24_pct', 'idosos_60mais_pct',
          'escol_sem_fundamental_pct', 'escol_fundamental_pct', 'escol_medio_pct', 'escol_superior_pct', 'mulheres_pct']
# alvos (p.p.); sinal escolhido para que "maior" = mais fraco para o PL, exceto (i)
d['alvo_i_swing_para_PL'] = -d.swing                      # (i) + = movimento para o PL entre 2022 e 2026
d['alvo_ii_flavio_menos_bolso22'] = d.flavio26 - d.bolso22  # (ii) − = Flávio abaixo de Jair 2022 (1º turno)
d['alvo_iii_d_abst'] = d.d_abst                            # (iii) + = abstenção subiu
d['alvo_iv_terceiros'] = d.terceiros26                     # (iv) voto em terceiros 2026
ALVOS = ['alvo_i_swing_para_PL', 'alvo_ii_flavio_menos_bolso22', 'alvo_iii_d_abst', 'alvo_iv_terceiros',
         'renan26', 'caiado26', 'cury26']


def wcorr(x, y, w):
    ok = x.notna() & y.notna()
    x, y, w = x[ok], y[ok], w[ok]
    mx, my = np.average(x, weights=w), np.average(y, weights=w)
    cov = np.average((x - mx) * (y - my), weights=w)
    return cov / np.sqrt(np.average((x - mx) ** 2, weights=w) * np.average((y - my) ** 2, weights=w))


# 1. correlações ponderadas por aptos26
rows = []
escopos = [('Brasil', 'Brasil', d)] + [('regiao', r, g) for r, g in d.groupby('regiao')] + [('UF', u, g) for u, g in d.groupby('uf')]
for nivel, nome, g in escopos:
    for a in ALVOS:
        for p in PERFIS:
            rows.append({'nivel': nivel, 'escopo': nome, 'alvo': a, 'perfil': p, 'r_ponderado': round(wcorr(g[p], g[a], g.aptos26), 3),
                         'r_simples': round(g[p].corr(g[a]), 3), 'municipios': len(g), 'aptos26': int(g.aptos26.sum())})
corr = pd.DataFrame(rows)
corr.to_csv(OUT / 'municipal_correlacoes.csv', index=False)

# 2. MQO ponderado por região. Categorias de referência: 25–59 anos; ensino fundamental/médio; homens.
X_VARS = ['jovens_16_24_pct', 'idosos_60mais_pct', 'escol_sem_fundamental_pct', 'escol_superior_pct', 'mulheres_pct', 'log_aptos']
d['log_aptos'] = np.log10(d.aptos26)
ols = []
for nome, g in [('Brasil', d)] + list(d.groupby('regiao')):
    for a in ALVOS[:4]:
        gg = g[X_VARS + [a, 'aptos26']].dropna()
        X = np.column_stack([np.ones(len(gg))] + [gg[v] for v in X_VARS]); y = gg[a].to_numpy(); w = gg.aptos26.to_numpy()
        sw = np.sqrt(w); beta, *_ = np.linalg.lstsq(X * sw[:, None], y * sw, rcond=None)
        res = y - X @ beta
        r2 = 1 - np.average(res ** 2, weights=w) / np.average((y - np.average(y, weights=w)) ** 2, weights=w)
        # erro-padrão robusto (HC1) com pesos
        Xw = X * sw[:, None]; XtX_inv = np.linalg.inv(Xw.T @ Xw)
        meat = (Xw * (res * sw)[:, None]).T @ (Xw * (res * sw)[:, None]) * len(y) / (len(y) - X.shape[1])
        se = np.sqrt(np.diag(XtX_inv @ meat @ XtX_inv))
        for k, v in enumerate(X_VARS, 1):
            esc = 0.1 if v != 'log_aptos' else 1  # fatias: efeito de +10 p.p.; tamanho: ×10 eleitores
            ols.append({'escopo': nome, 'alvo': a, 'variavel': v, 'coef_pp': round(beta[k] * esc, 2), 'ep_robusto': round(se[k] * esc, 2),
                        't': round(beta[k] / se[k], 1), 'r2': round(r2, 3), 'municipios': len(gg)})
pd.DataFrame(ols).to_csv(OUT / 'municipal_ols.csv', index=False)

# 3. segmento × território: municípios do quartil em que o PL foi mais fraco em cada UF, por alvo
SEG = {'jovens 16–24': 'jovens_16_24_pct', '16–17 (voto facultativo)': 'idade_16_17_pct', 'idosos 60+': 'idosos_60mais_pct',
       '70+ (voto facultativo)': 'idade_70mais_pct', 'sem fundamental completo': 'escol_sem_fundamental_pct',
       'ensino superior': 'escol_superior_pct', 'mulheres': 'mulheres_pct'}
FRACO = {'alvo_ii_flavio_menos_bolso22': ('Flávio mais abaixo de Jair 2022', True),  # quartil inferior
         'alvo_i_swing_para_PL': ('menor swing para o PL', True),
         'alvo_iii_d_abst': ('maior alta da abstenção', False),
         'alvo_iv_terceiros': ('maior voto em terceiros', False)}
seg = []
for uf, g in d.groupby('uf'):
    if len(g) < 8: continue
    for a, (rot, baixo) in FRACO.items():
        q = g[a].quantile(0.25 if baixo else 0.75)
        sel = g[g[a] <= q] if baixo else g[g[a] >= q]
        for s, col in SEG.items():
            n_sel = (sel[col] * sel.aptos26).sum(); n_uf = (g[col] * g.aptos26).sum()
            seg.append({'uf': uf, 'regiao': g.regiao.iloc[0], 'alvo': a, 'territorio': f'quartil: {rot}', 'segmento': s,
                        'municipios_territorio': len(sel), 'aptos_territorio': int(sel.aptos26.sum()),
                        'eleitores_segmento_territorio': int(round(n_sel)),
                        'fatia_segmento_territorio': round(n_sel / sel.aptos26.sum(), 4), 'fatia_segmento_uf': round(n_uf / g.aptos26.sum(), 4),
                        'sobrerrepresentacao': round((n_sel / sel.aptos26.sum()) / (n_uf / g.aptos26.sum()), 2),
                        'media_alvo_territorio': round(np.average(sel[a], weights=sel.aptos26), 2),
                        'media_alvo_uf': round(np.average(g[a], weights=g.aptos26), 2)})
pd.DataFrame(seg).to_csv(OUT / 'municipal_segmentos.csv', index=False)

keep = ['IBGE', 'municipio', 'uf', 'regiao', 'porte', 'aptos26', 'lula22', 'bolso22', 'lula26', 'flavio26', 'swing', 'd_abst', 'abst26',
        'terceiros26', 'renan26', 'caiado26', 'cury26', 'd_lula2p_22', 'reserva26'] + PERFIS + ALVOS[:4]
d[keep].to_csv(OUT / 'municipal_base.csv', index=False)

# resumo no terminal
print('municípios', len(d), '| Flávio abaixo de Jair 2022 (1T):', int((d.alvo_ii_flavio_menos_bolso22 < 0).sum()),
      'com', int(d.loc[d.alvo_ii_flavio_menos_bolso22 < 0, 'aptos26'].sum()), 'aptos')
b = corr[corr.nivel.isin(['Brasil', 'regiao'])].pivot_table(index=['alvo', 'perfil'], columns='escopo', values='r_ponderado')
pd.set_option('display.width', 200)
for a in ALVOS[:4]:
    print('\n', a); print(b.loc[a].loc[['jovens_16_24_pct', 'idade_16_17_pct', 'idosos_60mais_pct', 'idade_70mais_pct', 'escol_sem_fundamental_pct', 'escol_superior_pct', 'mulheres_pct']])
o = pd.DataFrame(ols)
print('\nMQO (p.p. por +10 p.p. de fatia; t robusto)')
print(o[o.variavel != 'log_aptos'].pivot_table(index=['alvo', 'variavel'], columns='escopo', values='coef_pp').round(1))
print(o.groupby(['alvo', 'escopo']).r2.first().unstack().round(2))
