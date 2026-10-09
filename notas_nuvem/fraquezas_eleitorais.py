# fraquezas eleitorais dos candidatos do campo PL no 2º turno de governador (por município)
import json, csv
vc = json.load(open('data/raw/votocruzado_appdata.json'))
out, resumo = [], []
for u, U in vc['ufs'].items():
    g2 = [i for i, c in enumerate(U['gov']) if c['st'] == '2º turno']
    if len(g2) != 2: continue
    ib = [i for i in g2 if U['gov'][i]['pl']]
    if not ib: continue
    i = ib[0]; j = [k for k in g2 if k != i][0]
    C, O = U['gov'][i], U['gov'][j]; ng = len(U['gov'])
    tot = dict(cand=0, opp=0, fl=0, vvp=0, vvg=0, aus=0, outros_gov=0, bn_gov=0)
    for m in vc['mun']:
        if m['uf'] != u: continue
        g = m['g']; vvg = sum(g[:ng]) or 1; p = m['p']; vvp = sum(p[:8]) or 1
        cand, opp = g[i], g[j]; outros = vvg - cand - opp; bn = g[ng] + g[ng+1]
        r = dict(uf=u.upper(), ibge=m['id'], municipio=m['n'].title(), aptos=m['te'], ausentes=m['te']-m['cp'],
                 candidato=f"{C['n'].title()} ({C['p']})", adversario=f"{O['n'].title()} ({O['p']})",
                 cand_pct=round(100*cand/vvg, 1), adv_pct=round(100*opp/vvg, 1), outros_gov_pct=round(100*outros/vvg, 1),
                 flavio_pct=round(100*p[0]/vvp, 1), lula_pct=round(100*p[1]/vvp, 1),
                 deficit_vs_flavio=round(100*p[0]/vvp - 100*cand/vvg, 1),
                 votos_cand=cand, votos_adv=opp, votos_outros_gov=outros, brancos_nulos_gov=bn)
        r['lider'] = 'candidato PL' if cand > opp else 'adversário'
        out.append(r)
        tot['cand'] += cand; tot['opp'] += opp; tot['outros_gov'] += outros; tot['bn_gov'] += bn; tot['aus'] += r['ausentes']
        tot['fl'] += p[0]; tot['vvp'] += vvp; tot['vvg'] += vvg
    rows = [r for r in out if r['uf'] == u.upper()]
    weak = sorted([r for r in rows if r['aptos'] >= 5000], key=lambda r: -r['deficit_vs_flavio'] * r['aptos'])[:8]
    resumo.append(dict(uf=u.upper(), candidato=f"{C['n'].title()} ({C['p']}; coligação: {C['c']})", adversario=f"{O['n'].title()} ({O['p']}; coligação: {O['c']})",
        cand_pct_1t=round(C['pc'], 1), adv_pct_1t=round(O['pc'], 1), diferenca_votos=tot['cand'] - tot['opp'],
        reserva_outros_gov=tot['outros_gov'], reserva_brancos_nulos=tot['bn_gov'], reserva_ausentes=tot['aus'],
        flavio_pct_uf=round(100*tot['fl']/tot['vvp'], 1),
        municipios_adv_lidera=sum(r['lider'] == 'adversário' for r in rows), municipios=len(rows),
        apoio_governador_2t=U['stance'],
        maiores_deficits=[f"{r['municipio']} (Flávio {r['flavio_pct']}% x cand {r['cand_pct']}%, {r['aptos']:,} eleitores)" for r in weak]))
with open('notas_nuvem/fraquezas_eleitorais_municipios.csv', 'w', newline='', encoding='utf-8') as f:
    w = csv.DictWriter(f, fieldnames=list(out[0].keys())); w.writeheader(); w.writerows(out)
json.dump(resumo, open('notas_nuvem/resumo_2t_governador.json', 'w'), ensure_ascii=False, indent=1)
for r in resumo: print(json.dumps(r, ensure_ascii=False)); print()
