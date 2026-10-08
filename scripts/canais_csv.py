# junta sites_oficiais.json (varredura) + midia_lote_*.json (pesquisa) -> data/canais/canais.csv
# chave: ibge. Uma linha por canal. Grupos de WhatsApp/Telegram e números pessoais ficam de fora.
import csv, glob, html, json, re, sys, os
from concurrent.futures import ThreadPoolExecutor
sys.path.insert(0, os.path.dirname(__file__))
from canais_sites import get
HOJE = '2026-10-08'
COLS = ['ibge', 'municipio', 'uf', 'tipo', 'nome', 'plataforma', 'url', 'fonte', 'verificado_em', 'obs']
PLAT = {'whatsapp_canal': 'whatsapp_canal', 'whatsapp_atendimento': 'whatsapp_atendimento', 'telegram': 'telegram_canal',
        'facebook': 'facebook', 'instagram': 'instagram', 'youtube': 'youtube', 'tiktok': 'tiktok'}
GRUPO = re.compile(r'chat\.whatsapp\.com|t\.me/(\+|joinchat)|facebook\.com/groups', re.I)
def norm(u):
    u = str(u or '').strip()
    if u and not u.startswith('http'): u = 'https://' + u
    return re.sub(r'^http://', 'https://', u).rstrip('/')
rows = []
for r in json.load(open('data/canais/sites_oficiais.json')):
    base = {'ibge': r['ibge'], 'municipio': r['municipio'], 'uf': r['uf']}
    for tipo in ('prefeitura', 'camara'):
        site = r[f'{tipo}_site']
        if not site: continue
        nome = ('Prefeitura de ' if tipo == 'prefeitura' else 'Câmara Municipal de ') + r['municipio']
        rows.append({**base, 'tipo': tipo, 'nome': nome, 'plataforma': 'site', 'url': norm(site), 'fonte': 'varredura de domínio', 'verificado_em': HOJE, 'obs': ''})
        for k, links in r[f'{tipo}_canais'].items():
            for l in links:
                rows.append({**base, 'tipo': tipo, 'nome': nome, 'plataforma': PLAT[k], 'url': norm(l), 'fonte': norm(site), 'verificado_em': HOJE,
                             'obs': 'número de atendimento publicado no site oficial; uso: atendimento ao cidadão, não é canal de comunicação política' if k == 'whatsapp_atendimento' else ''})
nomes = {r['ibge']: (r['municipio'], r['uf']) for r in rows}
for f in sorted(glob.glob('data/canais/midia_lote_*.json')):
    for x in json.load(open(f)):
        k = str(x.get('ibge'))
        if not x.get('plataforma') and not x.get('url'):
            continue
        u = norm(x.get('url'))
        if GRUPO.search(u) or re.search(r'wa\.me|api\.whatsapp', u): continue
        m, uf = nomes.get(k, (x.get('municipio'), x.get('uf')))
        rows.append({'ibge': k, 'municipio': m, 'uf': uf, 'tipo': x.get('tipo', ''), 'nome': x.get('nome', ''), 'plataforma': x.get('plataforma', ''),
                     'url': u, 'fonte': x.get('fonte', ''), 'verificado_em': HOJE, 'obs': x.get('obs', '')})
# dedup por (ibge, url)
seen, out = set(), []
for r in rows:
    key = (r['ibge'], r['url'].lower())
    if key in seen: continue
    seen.add(key); out.append(r)
# confere canais de WhatsApp: a página pública traz og:title com o nome do canal
def conf(r):
    if r['plataforma'] != 'whatsapp_canal': return r
    _, h = get(r['url'])
    t = re.search(r'<meta property="og:title" content="([^"]*)"', h or '')
    nome = html.unescape(t.group(1)).strip() if t else ''
    r['obs'] = '; '.join(filter(None, [r['obs'], f'canal confirmado: "{nome}"' if nome and nome.lower() != 'whatsapp' else 'canal não confirmado (página sem título)']))
    return r
with ThreadPoolExecutor(16) as ex: out = list(ex.map(conf, out))
# municípios sem nenhum canal ainda aparecem, para registrar a lacuna
todos = {}
for r in csv.DictReader(open('data/cenarios.csv')): todos[r['ibge']] = (r['municipio'], r['uf'])
com = {r['ibge'] for r in out}
for k, (m, uf) in todos.items():
    if k not in com: out.append({'ibge': k, 'municipio': m, 'uf': uf, 'tipo': '', 'nome': '', 'plataforma': '', 'url': '', 'fonte': '', 'verificado_em': HOJE, 'obs': 'nada encontrado'})
out = [r for r in out if r['ibge'] in todos]  # só a lista atual dos cenários (fontes ficam p/ reruns)
out.sort(key=lambda r: (r['uf'], r['municipio'], r['tipo'], r['nome'], r['plataforma']))
with open('data/canais/canais.csv', 'w', newline='') as f:
    w = csv.DictWriter(f, COLS, extrasaction='ignore'); w.writeheader(); w.writerows(out)
import collections
print(len(out), 'linhas |', len({r['ibge'] for r in out if r['url']}), 'municípios com canal |', dict(collections.Counter(r['plataforma'] for r in out)))
print('por tipo', dict(collections.Counter(r['tipo'] for r in out)))
