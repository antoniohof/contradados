# números do RELATORIO.md, recalculados sobre a base com 2026 oficial (rodar depois de lists.py e merge.py)
import json, csv, statistics as st
from collections import Counter
B = [r for r in json.load(open('data/base_enriquecida.json')) if 'swing' in r]
I = {r['ibge']: r for r in B}
L = json.load(open('data/listas.json'))
P = {str(x['ibge']): x for x in json.load(open('data/pesquisa_local.json'))}
T = {r['IBGE']: r for r in csv.DictReader(open('data/tse/poder_local_2024.csv'))}
M = {r['IBGE']: r for r in csv.DictReader(open('data/tse/municipios_master.csv'))}
AB = 20.84

def corr(xs, ys):
    mx, my = st.mean(xs), st.mean(ys)
    sxy = sum((x - mx) * (y - my) for x, y in zip(xs, ys))
    return sxy / (sum((x - mx) ** 2 for x in xs) * sum((y - my) ** 2 for y in ys)) ** .5

print('## panorama')
print('viradas L→F', sum(r['virou'] for r in B), '| empates', [f"{r['municipio']}/{r['uf']}" for r in B if r.get('empate26')],
      '| viradas F→L', sum(1 for r in B if r['margem22'] < 0 and r['votos_lula26'] > r['votos_flavio26']))
print('swing mediano', round(st.median(r['swing'] for r in B), 1))
l50 = [r for r in B if r['lula26'] > 50]
print('Lula>50', len(l50), 'com abst>AB', sum(r['abst26'] > AB for r in l50), '| Flávio>=50', sum(r['flavio26'] >= 50 for r in B))
print('corr abst×Lula Brasil', round(corr([r['abst26'] for r in B], [r['lula26'] for r in B]), 2))
for reg in ('Sul', 'Sudeste', 'Centro-Oeste', 'Nordeste', 'Norte'):
    R = [r for r in B if r['regiao'] == reg]
    print(f'  {reg}', round(corr([r['abst26'] for r in R], [r['lula26'] for r in R]), 2))
R = [r for r in B if r.get('d_abst') is not None]
print('corr Δabst×swing', round(corr([r['d_abst'] for r in R], [r['swing'] for r in R]), 2))

for k in ('S1', 'S2', 'S3'):
    S = [I[i] for i in L[k]]
    print(f'\n## {k}', Counter(r['uf'] for r in S).most_common(6))
    if k == 'S2':
        print('ausentes', sum(r['ausentes26'] for r in S), '| vantagem Lula', sum(r['votos_lula26'] - r['votos_flavio26'] for r in S))
    for n, r in enumerate(S[:15], 1):
        t = T.get(r['ibge'], {})
        print(n, f"{r['municipio']}/{r['uf']}", r['aptos26'], f"L {r['lula22']}→{r['lula26']}", f"PL {r['bolso22']}→{r['flavio26']}", 'sw', r['swing'],
              f"abst {r.get('abst22')}→{r['abst26']}", 'aus', r['ausentes26'], r['hist'], 'idx', r['pendulo_score'],
              '|', t.get('prefeito'), f"({t.get('prefeito_partido')})", 'sup' if t.get('prefeito_eleicao_suplementar') == 'True' else '')

sel = {i for v in L.values() for i in v}
print('\n## prefeitos (TSE) entre os', len(sel))
print(Counter(T[i]['prefeito_partido'] for i in sel if i in T).most_common(12))
for i in sorted(sel):
    t = T.get(i, {})
    if t.get('prefeito_partido') == 'PL':
        print('  PL:', f"{I[i]['municipio']}/{I[i]['uf']}", t['prefeito'], [k for k, v in L.items() if i in v])
print('PL na coligação do prefeito', sum(T.get(i, {}).get('prefeito_coligacao_tem_PL') == 'True' for i in sel))
for k in ('S1', 'S2', 'S3'):
    v = [float(T[i]['vereadores_PL_pct']) for i in L[k] if T.get(i, {}).get('vereadores_PL_pct')]
    print(f'  {k} vereadores PL % média', round(100 * st.mean(v), 1), '| sem vereador PL', sum(x == 0 for x in v))
v = [float(r['vereadores_PL_pct']) for r in T.values() if r.get('vereadores_PL_pct')]
print('  Brasil vereadores PL % média', round(100 * st.mean(v), 1))
print('suplementares entre selecionados', [f"{I[i]['municipio']}/{I[i]['uf']}" for i in sel if T.get(i, {}).get('prefeito_eleicao_suplementar') == 'True'])

def empty(v):
    s = (' '.join(map(str, v)) if isinstance(v, list) else str(v or '')).lower().strip()
    return (not s) or any(k in s for k in ('ver rodada 1', 'lacuna', 'não encontrado', 'não pesquis', 'interrompid', 'não verificado nesta rodada'))  # mesmo critério de merge.py
print('\n## cobertura: pesquisados', len(sel & set(P)), '/', len(sel), '| pautas', sum(1 for i in sel if i in P and not empty(P[i].get('pautas'))),
      '| prefeito TSE', len(sel & set(T)))
print(Counter(P[i].get('confianca') for i in sel if i in P).most_common())
