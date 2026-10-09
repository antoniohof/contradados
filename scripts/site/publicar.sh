#!/bin/bash
# Publica o site (pasta site/) no Cloudflare, no Worker "onde-buscar-votos".
# Normalmente não é preciso: cada push na branch main publica sozinho (Workers Builds).
# Use este script só para publicar à mão. Requer Node; na primeira vez o wrangler abre o navegador para login.
# Uso, de qualquer pasta: bash scripts/site/publicar.sh
set -e
cd "$(dirname "$0")/../.."
python3 scripts/site/build_dados.py
node scripts/site/resumo.mjs > /dev/null
node scripts/site/montar_arquivo.mjs
npx wrangler deploy
