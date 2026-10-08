# varre sites oficiais (prefeitura .gov.br e câmara .leg.br) dos municípios dos cenários
# e extrai links públicos de canais: WhatsApp (canal/grupo/atendimento), Telegram, Facebook, Instagram, YouTube, TikTok
import csv, json, re, ssl, unicodedata, urllib.request
from concurrent.futures import ThreadPoolExecutor
ctx = ssl.create_default_context(); ctx.check_hostname = False; ctx.verify_mode = ssl.CERT_NONE
UA = {'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/124 Safari/537.36'}
PAT = {
    'whatsapp_canal': r'whatsapp\.com/channel/[A-Za-z0-9]+',
    'whatsapp_atendimento': r'(?:wa\.me/\+?\d{10,13}|api\.whatsapp\.com/send/?\?phone=\+?\d{10,13})',
    'telegram': r't\.me/(?!share)[A-Za-z0-9_+]{4,}',
    'facebook': r'facebook\.com/(?!sharer|share|plugins|tr\b|dialog|login|policy|privacy|help)(?:groups/)?[A-Za-z0-9_.\-]{3,}',
    'instagram': r'instagram\.com/(?!p/|reel/|explore|accounts|share)[A-Za-z0-9_.]{3,}',
    'youtube': r'youtube\.com/(?:@[A-Za-z0-9_.\-]+|channel/[A-Za-z0-9_\-]+|c/[A-Za-z0-9_.\-]+|user/[A-Za-z0-9_.\-]+)',
    'tiktok': r'tiktok\.com/@[A-Za-z0-9_.]+',
}
JUNK = re.compile(r'(facebook\.com/(?:[A-Za-z0-9_.\-]*\.php|2008|v\d|people|pages|facebook|groups)\b|instagram\.com/(?:about|developer|static|embed)|youtube\.com/@.{0,2}$)', re.I)
# grupos de WhatsApp/Telegram ficam de fora até decisão do usuário (ver HANDOFF / coordenação)
def tokens(m):
    t = [slug(w) for w in re.findall(r'\w+', m) if len(slug(w)) >= 4 and slug(w) not in ('para', 'santa', 'santo', 'nova', 'novo', 'serra', 'campo')]
    return t + ['pref', 'camara', 'cm', 'pm', 'cv', 'leg', 'municipio', 'mun', slug(m)[:6]]
def oficial(handle, m):
    h = slug(handle.split('/', 1)[-1])
    return any(k in h for k in tokens(m))
def slug(s):
    s = unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode().lower()
    return re.sub(r"[^a-z0-9]", '', s)
def cands(m, uf):
    s, u = slug(m), uf.lower()
    s2 = slug(re.sub(r'\b(d[aeo]s?)\b', '', m, flags=re.I))  # sem preposições
    pre = [f'https://www.{s}.{u}.gov.br', f'https://{s}.{u}.gov.br', f'https://www.prefeitura{s}.{u}.gov.br', f'https://www.pm{s}.{u}.gov.br']
    if s2 != s: pre += [f'https://www.{s2}.{u}.gov.br']
    cam = [f'https://www.{s}.{u}.leg.br', f'https://www.camara{s}.{u}.gov.br', f'https://camara{s}.{u}.gov.br', f'https://www.cm{s}.{u}.gov.br']
    return pre, cam
def get(url):
    try:
        r = urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=15, context=ctx)
        b = r.read(3_000_000)
        return r.geturl(), b.decode('utf-8', 'ignore')
    except Exception:
        return None, None
def extract(html):
    out = {}
    for k, p in PAT.items():
        v = sorted({m.rstrip('/.') for m in re.findall(p, html, re.I) if not JUNK.search(m)})
        if v: out[k] = v
    return out
def host(u): return re.sub(r'^https?://(www\.)?', '', u or '').split('/')[0].lower()
def municipal(final, m):
    # o endereço final tem de ser do próprio município (descarta redireções p/ google, sites estaduais, agências, outra cidade)
    h = host(final)
    if not re.search(r'\.(gov|leg)\.br$|\.atende\.net$', h): return False
    labels = [l for l in h.split('.')[:-1] if l not in ('gov', 'leg', 'br', 'atende', 'cam', 'www') and len(l) > 2]
    sig = ''.join(slug(w)[0] for w in re.findall(r'\w+', m) if slug(w) and slug(w) not in ('de', 'da', 'do', 'das', 'dos', 'd'))
    alvo = [slug(m), slug(re.sub(r'\b(d[aeo]s?)\b', '', m, flags=re.I))]
    for l in labels:
        if any(t in l for t in alvo): return True
        if len(sig) >= 2 and l in {p + sig for p in ('pm', 'cm', 'cmv', 'camara', 'prefeitura', 'pref')}: return True
    return False
def eh_camara(u): return bool(re.search(r'(^|[.\-])(camara|cam|cm|cmv)[a-z]*[.\-]|\.leg\.br$|^camara|^cm', host(u)))
def first_ok(urls, m, tipo):
    urls = urls + [u.replace('https://', 'http://') for u in urls]
    for u in urls:
        final, html = get(u)
        if html and len(html) > 500 and municipal(final, m) and eh_camara(final) == (tipo == 'camara'):
            return final, html
    return None, None
SEED = {}
try:
    for x in json.load(open('data/pesquisa_local.json')):
        for u in x.get('fontes') or []:
            m = re.match(r'https?://[^/]+', str(u))
            if m and re.search(r'\.(gov|leg)\.br$', m.group()) and not re.search(r'\b(ibge|tse|tre-|camara\.leg|senado|planalto|saude|educacao|agricultura|aen|estado|governo|pr\.gov\.br$)', m.group()):
                SEED.setdefault(str(x['ibge']), []).append(m.group())
except FileNotFoundError: pass
def run(row):
    pre, cam = cands(row['municipio'], row['uf'])
    for u in dict.fromkeys(SEED.get(row['ibge'], [])):
        (cam if eh_camara(u) else pre).insert(0, u)
    res = dict(row)
    for tipo, urls in (('prefeitura', pre), ('camara', cam)):
        final, html = first_ok(urls, row['municipio'], tipo)
        res[f'{tipo}_site'] = final or ''
        c = extract(html) if html else {}
        res[f'{tipo}_canais'] = {k: [x for x in v if k.startswith('whatsapp') or oficial(x, row['municipio'])] for k, v in c.items()}
        res[f'{tipo}_descartados'] = sorted({x for k, v in c.items() for x in v} - {x for v in res[f'{tipo}_canais'].values() for x in v})
    return res
if __name__ == '__main__':
    import sys
    rows = {}
    for r in csv.DictReader(open('data/cenarios.csv')):
        rows.setdefault(r['ibge'], {'ibge': r['ibge'], 'municipio': r['municipio'], 'uf': r['uf'], 'cenarios': []})['cenarios'].append(r['cenario'])
    rows = list(rows.values())
    if len(sys.argv) > 1: rows = rows[:int(sys.argv[1])]
    with ThreadPoolExecutor(24) as ex: out = list(ex.map(run, rows))
    json.dump(out, open('data/canais/sites_oficiais.json', 'w'), ensure_ascii=False, indent=1)
    print(len(out), 'municípios | prefeitura achada', sum(bool(x['prefeitura_site']) for x in out), '| câmara achada', sum(bool(x['camara_site']) for x in out))
    for k in PAT: print(k, sum(bool(x['prefeitura_canais'].get(k) or x['camara_canais'].get(k)) for x in out))
