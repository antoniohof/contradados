# votos em jogo no 2º turno por município (mesmo modelo da aba "Votos em jogo" do site)
import json, csv
D = json.load(open('docs/data/municipios.json'))
REPASSE = {'ren': (60, 11, 29), 'cai': (43, 19, 38), 'cur': (34, 23, 43), 'zem': (43, 19, 38)}  # Flávio, Lula, indeciso (Quaest 02-03/10)
rows = []
for k, d in D.items():
    if d.get('l22t2') is None: continue
    val = d['vl'] + d['vf'] + d['vt3']; two = d['vl'] + d['vf']; comp = d['apt'] - d['aus']
    volL = max(0, d['l22t2'] - d['l2p']) / 100 * two; volF = max(0, d['l2p'] - d['l22t2']) / 100 * two
    tL = tF = tI = 0
    for c, (f, l, i) in REPASSE.items():
        v = val * (d.get(c) or 0) / 100; tF += v * f / 100; tL += v * l / 100; tI += v * i / 100
    bn = comp * d['bn'] / 100
    absx = max(0, d['a26'] - min(x for x in (d['a18'], d['a22'], d['a22t2'], d['a26']) if x is not None)) / 100 * d['apt']
    jogo = volL + volF + tL + tF + tI + bn + absx
    saldo = (tL - tF) + absx * (2 * d['l2p'] / 100 - 1) + volL - volF
    rows.append(dict(ibge=k, municipio=d['n'], uf=d['uf'], aptos=d['apt'], dif_1t=d['vl'] - d['vf'], votos_em_jogo=round(jogo), pct_aptos=round(100 * jogo / d['apt'], 2),
                     ex_eleitores_lula_2022=round(volL), ex_eleitores_bolso_2022=round(volF), terceiros_flavio=round(tF), terceiros_lula=round(tL), terceiros_indecisos=round(tI),
                     brancos_nulos=round(bn), ausentes_extras=round(absx), teto_lula=round(volL + tI + bn + absx + tF), teto_flavio=round(volF + tI + bn + absx + tL), saldo_lula=round(saldo)))
rows.sort(key=lambda r: -r['votos_em_jogo'])
with open('notas_nuvem/v2/votos_em_jogo.csv', 'w', newline='', encoding='utf-8') as f:
    w = csv.DictWriter(f, fieldnames=list(rows[0])); w.writeheader(); w.writerows(rows)
print(len(rows))
