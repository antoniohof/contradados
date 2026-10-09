# Gera os dados do site simples: data/mapa.json (caminhos SVG já projetados) e data/municipios.json
# Rodar da pasta do site:  python3 build/build.py <pasta_docs_data>
import csv, json, math, sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
SITE = REPO / "site_simples"
(SITE / "data").mkdir(exist_ok=True)
SRC = sys.argv[1] if len(sys.argv) > 1 else str(REPO / 'docs/data')
topo = json.load(open(f'{SRC}/municipios.topo.json'))
D = json.load(open(f'{SRC}/municipios.json'))
X = json.load(open(f'{SRC}/extra.json'))

# --- 1. mapa: decodifica topojson e projeta (Mercator) para um quadro 1000 x 1000 ---
sx, sy = topo['transform']['scale']; tx, ty = topo['transform']['translate']
arcs = []
for a in topo['arcs']:
    x = y = 0; pts = []
    for dx, dy in a:
        x += dx; y += dy; pts.append((x * sx + tx, y * sy + ty))
    arcs.append(pts)
def merc(lon, lat): return lon, math.degrees(math.log(math.tan(math.pi / 4 + math.radians(lat) / 2)))
allp = [merc(*p) for a in arcs for p in a]
x0, x1 = min(p[0] for p in allp), max(p[0] for p in allp); y0, y1 = min(p[1] for p in allp), max(p[1] for p in allp)
k = 1000 / max(x1 - x0, y1 - y0); W, H = round((x1 - x0) * k), round((y1 - y0) * k)
def proj(p):
    x, y = merc(*p); return (round((x - x0) * k, 1), round((y1 - y) * k, 1))
def ring(idx):
    pts = []
    for i in idx:
        a = arcs[i] if i >= 0 else arcs[~i][::-1]
        pts += a if not pts else a[1:]
    out = []
    for p in map(proj, pts):
        if not out or abs(p[0] - out[-1][0]) + abs(p[1] - out[-1][1]) >= 0.6: out.append(p)
    return 'M' + 'L'.join(f'{x:g},{y:g}' for x, y in out) + 'Z' if len(out) > 2 else ''
paths = {}
centro = {}  # lon/lat aproximado de cada município (média dos pontos do maior anel)
for g in topo['objects']['municipios']['geometries']:
    polys0 = g['arcs'] if g['type'] == 'MultiPolygon' else [g['arcs']]
    pts = max(([p for i in poly[0] for p in (arcs[i] if i >= 0 else arcs[~i])] for poly in polys0), key=len)
    centro[g['properties']['id']] = (round(sum(p[0] for p in pts) / len(pts), 3), round(sum(p[1] for p in pts) / len(pts), 3))
    polys = g['arcs'] if g['type'] == 'MultiPolygon' else [g['arcs']]
    paths[g['properties']['id']] = ''.join(ring(r) for poly in polys for r in poly)
json.dump({'w': W, 'h': H, 'p': paths}, open(SITE / 'data/mapa.json', 'w'), separators=(',', ':'))

# eleitores aptos em 2022 (opcional: compilação laboratorio-voto-2026), para medir mudança do eleitorado
with open(REPO / 'data/tse/municipios_master.csv', encoding='utf-8') as f:
    APT22 = {r['IBGE']: int(float(r['aptos_2022_1t'])) for r in csv.DictReader(f) if r['aptos_2022_1t']}
UF_SJ = {}  # UFs com votos anulados sub judice para governador/senado
for d in D.values():
    if (d.get('gsj') or 0) + (d.get('ssj') or 0) > 0: UF_SJ[d['uf']] = 1

def alertas(k, d):
    # pontos cegos do município, em códigos curtos (os textos ficam em app.js, ALERTAS)
    a = []
    if d['apt'] < 5000: a.append('p')
    if APT22.get(k) and abs(d['apt'] / APT22[k] - 1) > 0.15: a.append('e%+.0f' % ((d['apt'] / APT22[k] - 1) * 100))
    if d.get('l22t2') is None: a.append('n')
    if d['a26'] > 30: a.append('a')
    if (d.get('i70') or 0) > 0.15: a.append('i')
    if not d.get('pau'): a.append('s')
    elif d.get('conf') == 'baixa': a.append('b')
    if d.get('pau') and 'plano de governo' in d['pau'].lower(): a.append('g')
    if UF_SJ.get(d['uf']): a.append('j')
    if d.get('emp'): a.append('t')
    if not d.get('pf'): a.append('f')
    return a

# --- 2. votos em jogo por município (mesmo modelo de notas_nuvem/v2/votos_em_jogo.py) ---
REPASSE = {'ren': (60, 11, 29), 'cai': (43, 19, 38), 'cur': (34, 23, 43), 'zem': (43, 19, 38)}  # Flávio, Lula, indeciso (Quaest 02-03/10)
cards = {c['uf']: c for c in X['cards']}
out = {}
for k_, d in D.items():
    d = {**d, **X['mun'].get(k_, {})}
    if d.get('l22t2') is None: continue
    val = d['vl'] + d['vf'] + (d.get('vt3') or 0); two = d['vl'] + d['vf']; comp = d['apt'] - d['aus']
    volL = max(0, d['l22t2'] - d['l2p']) / 100 * two; volF = max(0, d['l2p'] - d['l22t2']) / 100 * two
    tL = tF = tI = 0
    for c, (f, l, i) in REPASSE.items():
        v = val * (d.get(c) or 0) / 100; tF += v * f / 100; tL += v * l / 100; tI += v * i / 100
    bn = comp * (d.get('bn') or 0) / 100
    absx = max(0, d['a26'] - min(x for x in (d['a18'], d['a22'], d['a22t2'], d['a26']) if x is not None)) / 100 * d['apt']
    jogo = volL + volF + tL + tF + tI + bn + absx
    r = dict(n=d['n'], uf=d['uf'], apt=d['apt'], l22=d['l22'], b22=d['b22'], l26=d['l26'], f26=d['f26'], t26=d['t26'],
             a22=d['a22'], a26=d['a26'], sw=d.get('sw'), aus=d['aus'], dif=d['vl'] - d['vf'],
             jogo=round(jogo), volL=round(volL), volF=round(volF), tF=round(tF), tL=round(tL), tI=round(tI), bn=round(bn), abs=round(absx),
             saldo=round((tL - tF) + absx * (2 * d['l2p'] / 100 - 1) + volL - volF),
             pf=d.get('pf'), pp=d.get('pp'), vpl=d.get('vpl'), vtot=d.get('vtot'), h=d.get('h'),
             i70=d.get('i70'), esup=d.get('esup'), mul=d.get('mul'))
    if k_ in centro: r['ln'], r['lt'] = centro[k_]
    r['al'] = alertas(k_, d)
    if APT22.get(k_): r['apt22'] = APT22[k_]
    r.update(i16=d.get('i16'), esf=d.get('esf'), cai=d.get('cai'), ren=d.get('ren'), cur=d.get('cur'), a18=d.get('a18'), conf=d.get('conf'), eve=d.get('eve'),
             vice=d.get('vice'), vp=d.get('vp'), mb=d.get('mb'), plp=d.get('plp'), spl=d.get('spl'), splp=d.get('splp'), sen=d.get('sen'), gov=d.get('gov'), govp=d.get('govp'),
             dfpl=d.get('dfpl'), dfpt=d.get('dfpt'), vir=d.get('vir'), c=d.get('c'))
    if d.get('gc') is not None: r.update(gc=d['gc'], ga=d.get('ga'), gcn=d.get('gcn'), gan=d.get('gan'), gd=d.get('gd'))
    if d.get('pau'): r.update(pau=d['pau'], fon=d.get('fon'), eco=d.get('eco'))
    out[k_] = {a: (round(b, 4) if isinstance(b, float) else b) for a, b in r.items() if b is not None and b != []}
cards_out = {}
for uf, c in cards.items():
    cards_out[uf] = dict(cargo=c['cargo'], cand=c['cand'], adv=c['adv'], t1=c['t1'], status=c.get('status_txt') or c['status'],
                         pontos=[(p if isinstance(p, str) else p['texto']) for p in c['pontos']],
                         urls=[u for p in c['pontos'] if not isinstance(p, str) for u in p.get('urls', [])][:6])
json.dump({'mun': out, 'cards': cards_out, 'gerado': '2026-10-08'}, open(SITE / 'data/municipios.json', 'w'), ensure_ascii=False, separators=(',', ':'))
print('mapa', W, H, len(paths), '| municipios', len(out))

# O build completo preserva os indicadores do Censo, sem etapa manual posterior.
from socio import enrich
print(enrich(REPO / 'data/socio/ibge_censo2022.csv', SITE / 'data/municipios.json'), 'municípios com dados do Censo')
