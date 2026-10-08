# gera as três listas + base completa
import json, csv
vc = json.load(open('data/raw/votocruzado_appdata.json'))
base = {r['ibge']: r for r in json.load(open('data/base.json'))}
AB = 20.75  # abstenção média nacional (sem exterior) na compilação votocruzado
# 2026 oficial (TSE, scripts/tse/04_master.py): aptos, comparecimento, abstenção, brancos/nulos e terceiros.
# A compilação tem 182 mil aptos a menos que o TSE; votos de Lula e Flávio são idênticos.
OFICIAL = 'data/tse/municipios_master.csv'
try:
    with open(OFICIAL, encoding='utf-8') as f:
        for o in csv.DictReader(f):
            r = base.get(o['IBGE'])
            if r is None or not o['aptos26']: continue
            for k in ('aptos26', 'comp26'): r[k] = int(float(o[k]))
            for k in ('abst26', 'brancnul26', 'terceiros26'): r[k] = round(float(o[k]), 2)
            if 'abst22' in r: r['d_abst'] = round(r['abst26'] - r['abst22'], 2)
    AB = 20.84  # abstenção média nacional oficial (sem exterior)
except FileNotFoundError:
    pass
for m in vc['mun']:
    r = base[m['id']]; U = vc['ufs'][m['uf']]
    g = m['g']; ng = len(U['gov']); vvg = sum(g[:ng]) or 1
    i = max(range(ng), key=lambda k: g[k]); c = U['gov'][i]
    r['gov_mais_votado'] = f"{c['n'].title()} ({c['p']})"; r['gov_mais_votado_pct'] = round(100*g[i]/vvg, 1)
    pl = [k for k, c in enumerate(U['gov']) if c['p'] == 'PL']
    r['gov_PL'] = f"{U['gov'][pl[0]]['n'].title()} – {U['gov'][pl[0]]['st']}" if pl else ''
    r['gov_PL_pct'] = round(100*g[pl[0]]/vvg, 1) if pl else ''
    s = m['s']; ns = len(U['sen']); vvs = sum(s[:ns]) or 1
    i = max(range(ns), key=lambda k: s[k]); c = U['sen'][i]
    r['sen_mais_votado'] = f"{c['n'].title()} ({c['p']})"
    pl = [k for k, c in enumerate(U['sen']) if c['p'] == 'PL']
    r['sen_PL'] = '; '.join(f"{U['sen'][k]['n'].title()} – {U['sen'][k]['st']} ({round(100*s[k]/vvs,1)}% local)" for k in pl)
    r['apoio_governador_2T'] = U['stance']
R = [r for r in base.values() if 'swing' in r]
for r in R:  # virada estrita: empate exato (Trabiju/SP, Crixás do Tocantins/TO) não conta como virada
    r['empate26'] = r['votos_lula26'] == r['votos_flavio26']
    r['virou'] = r['margem22'] > 0 and r['votos_lula26'] < r['votos_flavio26']
def score(r):
    return (r['hist'][0]=='H') + (r['hist'][2]=='L') + (r['swing']<=-15) + (r['terceiros26']>=8) + (abs(r['margem26'])<=20)
for r in R:
    r['pendulo_score'] = score(r)
    r['ausentes26'] = r['aptos26'] - r['comp26']
s1 = sorted([r for r in R if r['virou'] and r['aptos26'] >= 10000], key=lambda r: (r['swing'], -r['aptos26'], r['ibge']))[:100]
s2 = sorted([r for r in R if r['lula26'] > 50 and r['abst26'] > AB], key=lambda r: (-r['ausentes26'], -r['aptos26'], r['ibge']))[:100]
s3 = sorted([r for r in R if r['flavio26'] >= 50 and r['abst26'] < AB and r['pendulo_score'] >= 3],
            key=lambda r: (-r['pendulo_score'], -r['aptos26'], r['ibge']))[:100]
for n, L in (('S1', s1), ('S2', s2), ('S3', s3)):
    for i, r in enumerate(L, 1): r.setdefault('cenarios', []).append(f'{n}#{i}')
json.dump({'S1': [r['ibge'] for r in s1], 'S2': [r['ibge'] for r in s2], 'S3': [r['ibge'] for r in s3]}, open('data/listas.json', 'w'))
json.dump(list(base.values()), open('data/base_enriquecida.json', 'w'), ensure_ascii=False)
sel = {r['ibge'] for L in (s1, s2, s3) for r in L}
print(len(s1), len(s2), len(s3), 'únicos', len(sel))
for n, L in (('S1', s1), ('S2', s2), ('S3', s3)):
    print(n, [f"{r['municipio']}/{r['uf']} {r['swing']} a{r['abst26']}" for r in L[:12]])
