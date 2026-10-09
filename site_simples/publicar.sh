#!/bin/bash
# Publica o site no Cloudflare Pages (projeto "votos-em-jogo").
# Uso: bash publicar.sh   (na pasta site_simples)
set -e
cd "$(dirname "$0")"
D=$(mktemp -d)
mkdir -p "$D/data"
cp index.html app.js relatorio.js style.css _headers "$D/"
cp data/municipios.json data/mapa.json "$D/data/"
npx wrangler pages project create votos-em-jogo --production-branch main 2>/dev/null || true
npx wrangler pages deploy "$D" --project-name votos-em-jogo --branch main --commit-dirty=true
rm -rf "$D"
