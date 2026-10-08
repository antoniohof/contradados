# junta pesquisa da rodada 1 e 2 (rodada 2 completa/substitui campos vazios)
import json, glob, re
def empty(v):
    # lista: vazia só se todos os itens forem lacunas (um item "Lacuna: ..." não anula os demais)
    if isinstance(v, list): return all(empty(x) for x in v)
    s = str(v or '').lower().strip()
    return (not s) or any(k in s for k in ('ver rodada 1', 'lacuna', 'não encontrad', 'foram encontrad', 'sem pautas', 'nenhuma pauta', 'não pesquis', 'interrompid', 'não verificado nesta rodada'))
NIVEL = {'baixa': 0, 'média': 1, 'alta': 2}
M = {}
for f in sorted(glob.glob('data/pesquisa_bruta/lote_*.json')) + sorted(glob.glob('data/pesquisa_bruta/r2_*.json')) + sorted(glob.glob('data/pesquisa_bruta/r3_*.json')) + sorted(glob.glob('data/pesquisa_bruta/r4_*.json')) + sorted(glob.glob('data/pesquisa_bruta/r5_*.json')):
    for x in json.load(open(f)):
        k = str(x.get('ibge')); cur = M.setdefault(k, {})
        # confiança acompanha as pautas: lote que preenche pautas vazias define a confiança; se somar pautas, fica a maior
        if not empty(x.get('pautas')) and x.get('confianca') in NIVEL:
            antes = cur.get('confianca')
            if empty(cur.get('pautas')) or antes not in NIVEL or NIVEL[x['confianca']] > NIVEL[antes]:
                cur['confianca'] = x['confianca']
            x = {kk: vv for kk, vv in x.items() if kk != 'confianca'}
        for key, v in x.items():
            if key == 'fontes':
                cur['fontes'] = list(dict.fromkeys((cur.get('fontes') or []) + (v if isinstance(v, list) else [v])))
            elif key == 'obs':
                cur['obs'] = ' / '.join(t for t in [cur.get('obs'), v] if t)
            elif key not in cur or (empty(cur[key]) and not empty(v)):
                cur[key] = v
            elif not empty(v) and key in ('pautas', 'eventos', 'pl_local') and v != cur[key]:
                cur[key] = (cur[key] if isinstance(cur[key], list) else [cur[key]]) + (v if isinstance(v, list) else [v]) if key == 'pautas' else f"{cur[key]} / {v}"
# normaliza partido para a sigla do TSE (consulta_cand) e limpa o nome do prefeito; campos brutos ficam intactos
SIGLA = {'união brasil': 'UNIÃO', 'uniao brasil': 'UNIÃO', 'união': 'UNIÃO', 'podemos': 'PODE', 'pode': 'PODE', 'republicanos': 'REPUBLICANOS',
         'avante': 'AVANTE', 'solidariedade': 'SOLIDARIEDADE', 'cidadania': 'CIDADANIA', 'novo': 'NOVO', 'pcdob': 'PC do B', 'pc do b': 'PC do B'}
def sigla(p):
    p = str(p or '').strip()
    if not p or p.lower().startswith(('não', 'nao')) or ';' in p:
        return '', bool(p)
    incerto = bool(re.search(r'provável|não confirmado', p, re.I))
    p = re.sub(r'\s*\(.*?\)', '', p).strip()
    return SIGLA.get(p.lower(), p.upper()), incerto
def limpa_nome(n):
    n = str(n or '').strip()
    if n.lower().startswith(('não', 'nao')): return ''
    n = re.split(r'\s*\((?=[^)]*(\d|%|nome de urna|válidos|prefeit|reeleit|atual|grafado))', n)[0]
    return n.split(';')[0].strip()
for v in M.values():
    if isinstance(v.get('pautas'), list) and not empty(v['pautas']):  # tira notas de lacuna quando há pautas
        v['pautas'] = [x for x in v['pautas'] if not empty(x)]
    v['partido_prefeito_sigla'], v['partido_prefeito_incerto'] = sigla(v.get('partido_prefeito'))
    v['prefeito_2024_nome'] = limpa_nome(v.get('prefeito_2024'))
json.dump(list(M.values()), open('data/pesquisa_local.json', 'w'), ensure_ascii=False, indent=1)
L = json.load(open('data/listas.json')); sel = {i for v in L.values() for i in v}
have = {k for k, v in M.items() if not empty(v.get('partido_prefeito'))}
paut = {k for k, v in M.items() if not empty(v.get('pautas'))}
print('pesquisados', len(M), 'dos selecionados', len(sel & set(M)), '/', len(sel), '| com partido do prefeito', len(sel & have), '| com pautas', len(sel & paut))
print('sem pesquisa:', len(sel - set(M)))
