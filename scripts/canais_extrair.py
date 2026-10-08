# uso: python3 scripts/canais_extrair.py URL [URL...]  -> imprime JSON {url_final: {plataforma: [links]}}
# não guarda HTML em disco; grupos de WhatsApp/Telegram são ignorados de propósito
import json, sys, os
sys.path.insert(0, os.path.dirname(__file__))
from canais_sites import get, extract
out = {}
for u in sys.argv[1:]:
    final, html = get(u if u.startswith('http') else 'https://' + u)
    if not html and u.startswith('https://'): final, html = get(u.replace('https://', 'http://'))
    out[u] = {'final': final, 'canais': extract(html) if html else None}
print(json.dumps(out, ensure_ascii=False, indent=1))
