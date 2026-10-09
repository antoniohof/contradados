#!/bin/bash
# Publica o mapa das três frentes no Cloudflare (Worker "onde-buscar-votos", só arquivos estáticos).
# Usa o wrangler.jsonc da raiz do repositório. Requer Node e uma conta Cloudflare;
# na primeira vez, o wrangler abre o navegador para login.
# Uso: bash mapa_frentes/publicar.sh
set -e
cd "$(dirname "$0")/.."
npx wrangler deploy
