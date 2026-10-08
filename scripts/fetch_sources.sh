#!/usr/bin/env bash
# baixa as fontes brutas (repos públicos que compilaram dados do TSE) para data/raw/
set -e
mkdir -p data/raw /tmp/ep_src && cd /tmp/ep_src
git clone -q --depth 1 https://github.com/lucashang07/laboratorio-voto-2026.git || true
git clone -q --depth 1 https://github.com/tatipara/eleicao_2026_1turno.git || true
git clone -q --depth 1 https://github.com/lfbl-cp/painel-eleicoes-2026.git || true
cd - >/dev/null
python3 - <<'PY'
import json
s = open('/tmp/ep_src/laboratorio-voto-2026/index.html', encoding='utf-8').read()
a = s.index('<script id="appdata" type="application/json">'); a = s.index('>', a) + 1
json.dump(json.loads(s[a:s.index('</script>', a)]), open('data/raw/votocruzado_appdata.json', 'w'))
PY
cp /tmp/ep_src/painel-eleicoes-2026/output/results/2022/BR_municipio_presidente_t1.json data/raw/lfbl_2022_presidente_t1.json
cp /tmp/ep_src/eleicao_2026_1turno/presidente_2026_municipios_wide.csv data/raw/tatipara_presidente_2026_municipios_wide.csv
echo "ok: data/raw atualizado"
