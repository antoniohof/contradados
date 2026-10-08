# monta base municipal 2018/2022/2026
import json, csv, sys
vc = json.load(open('data/raw/votocruzado_appdata.json'))
l22 = json.load(open('data/raw/lfbl_2022_presidente_t1.json'))
lula22 = next(c for c in l22['candidatos'].values() if c['nome']=='Lula')['valores']
bol22 = next(c for c in l22['candidatos'].values() if c['nome']=='Jair Bolsonaro')['valores']
tp = {r['cd_ibge']: r for r in csv.DictReader(open('data/raw/tatipara_presidente_2026_municipios_wide.csv', encoding='utf-8-sig'))}
reg = {u: vc['ufs'][u]['reg'] for u in vc['ufs']}
rows, bad = [], []
for m in vc['mun']:
    p = m['p']; F, L = p[0], p[1]; TW = sum(p[2:6]); VV = sum(p[0:8]); BN = p[8]+p[9]
    r = dict(ibge=m['id'], municipio=m['n'].title(), uf=m['uf'].upper(), regiao=reg[m['uf']], capital=m['cap'],
             aptos26=m['te'], comp26=m['cp'])
    r['abst26'] = round(100*(1-m['cp']/m['te']), 2)
    r['flavio26'] = round(100*F/VV, 2); r['lula26'] = round(100*L/VV, 2); r['terceiros26'] = round(100*TW/VV, 2)
    r['brancnul26'] = round(100*BN/m['cp'], 2)
    r['votos_flavio26'] = F; r['votos_lula26'] = L
    h = m.get('h22')
    if h:
        r['bolso22'] = round(100*h[0]/h[3], 2); r['lula22'] = round(100*h[1]/h[3], 2)
        r['abst22'] = round(100*(1-h[6]/h[7]), 2)
        r['bolso22_t2'] = round(100*h[8]/h[10], 2)
        r['votos_bolso22'] = h[0]; r['votos_lula22'] = h[1]
        # checagem cruzada
        if abs(r['lula22'] - lula22.get(m['id'], -99)) > 0.3: bad.append(('l22', m['id'], r['lula22'], lula22.get(m['id'])))
    k = m.get('h18')
    if k:
        r['bolso18_t2'] = round(100*k[10]/k[12], 2); r['abst18'] = round(100*(1-k[8]/k[9]), 2)
    t = tp.get(m['id'])
    if t and abs(int(t['FLAVIO BOLSONARO']) - F) > 5: bad.append(('f26', m['id'], F, t['FLAVIO BOLSONARO']))
    if 'lula22' in r:
        r['margem22'] = round(r['lula22'] - r['bolso22'], 2)   # + = Lula
        r['margem26'] = round(r['lula26'] - r['flavio26'], 2)
        r['swing'] = round(r['margem26'] - r['margem22'], 2)   # negativo = direita
        r['d_abst'] = round(r['abst26'] - r['abst22'], 2)
        r['venc22'] = 'Lula' if r['margem22'] > 0 else 'Bolsonaro'
        r['venc26'] = 'Lula' if r['margem26'] > 0 else 'Flávio'
        r['virou'] = (r['margem22'] > 0) != (r['margem26'] > 0)
        # vencedores 2T 2018 / 2T 2022 / 1T 2026 (sequência)
        w18 = 'B' if r.get('bolso18_t2', 0) > 50 else 'H'
        w22 = 'B' if r['bolso22_t2'] > 50 else 'L'
        r['hist'] = f"{w18}-{w22}-{'F' if r['margem26']<0 else 'L'}"
    rows.append(r)
print('municipios', len(rows), 'divergencias', len(bad), bad[:10], file=sys.stderr)
json.dump(rows, open('data/base.json', 'w'), ensure_ascii=False)
