# junta pesquisa da rodada 1 e 2 (rodada 2 completa/substitui campos vazios)
import json, glob
def empty(v):
    s = ' '.join(map(str, v)) if isinstance(v, list) else str(v or '')
    s = s.lower().strip()
    return (not s) or any(k in s for k in ('ver rodada 1', 'lacuna', 'não encontrado', 'não pesquis', 'interrompid', 'não verificado nesta rodada'))
M = {}
for f in sorted(glob.glob('data/pesquisa_bruta/lote_*.json')) + sorted(glob.glob('data/pesquisa_bruta/r2_*.json')):
    for x in json.load(open(f)):
        k = str(x.get('ibge')); cur = M.setdefault(k, {})
        for key, v in x.items():
            if key == 'fontes':
                cur['fontes'] = list(dict.fromkeys((cur.get('fontes') or []) + (v if isinstance(v, list) else [v])))
            elif key == 'obs':
                cur['obs'] = ' / '.join(t for t in [cur.get('obs'), v] if t)
            elif key not in cur or (empty(cur[key]) and not empty(v)):
                cur[key] = v
            elif not empty(v) and key in ('pautas', 'eventos', 'pl_local') and v != cur[key]:
                cur[key] = (cur[key] if isinstance(cur[key], list) else [cur[key]]) + (v if isinstance(v, list) else [v]) if key == 'pautas' else f"{cur[key]} / {v}"
json.dump(list(M.values()), open('data/pesquisa_local.json', 'w'), ensure_ascii=False, indent=1)
L = json.load(open('data/listas.json')); sel = {i for v in L.values() for i in v}
have = {k for k, v in M.items() if not empty(v.get('partido_prefeito'))}
paut = {k for k, v in M.items() if not empty(v.get('pautas'))}
print('pesquisados', len(M), 'dos selecionados', len(sel & set(M)), '/', len(sel), '| com partido do prefeito', len(sel & have), '| com pautas', len(sel & paut))
print('sem pesquisa:', len(sel - set(M)))
