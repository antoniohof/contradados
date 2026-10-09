# Onde buscar votos para Lula · mapa das três frentes

Página única (`index.html`) que mostra, por município, aglomerado urbano, estado ou
região, onde estão os votos mais ao alcance no 2º turno de 25/10/2026, em total e em
percentual. Retrato de 08/10/2026. Os totais são tetos para comparar lugares, não previsões.

- **Frente 1 · Reconquistar**: parcela de Lula entre Lula e o adversário caiu do 1º turno
  de 2022 para o de 2026. Total = perda × votos em Lula + Flávio.
- **Frente 2 · Mobilizar**: abstenção onde Lula costuma ganhar (Lula > 50% entre os dois
  em 2026 e vitória no 2º turno de 2022). Total = ausentes × vantagem de Lula.
- **Frente 3 · Terceiros**: eleitores de Caiado, Renan Santos, Cury e Zema que, pela
  pesquisa escolhida (AtlasIntel, Datafolha ou Quaest), votariam branco, nulo ou não
  decidiram. A tabela de transferência é editável na página.

A conta de cada município é feita no navegador pela função `calcular()` do `index.html`,
que a própria página mostra na seção "O código que faz a conta". O método completo,
fontes, premissas e limites estão na página.

## Dados

`data/municipios.csv` traz só os campos de entrada; `data/municipios.topo.json` é a malha
do IBGE. Para regenerar, na raiz do repositório:

```bash
python3 scripts/frentes/build_dados.py      # a partir de docs/data/ e data/geo/
python3 scripts/frentes/lista_frente2.py    # planilha outputs/frente2_cidades_10a50mil_eleitores.xlsx
```

Aglomerados urbanos: arranjos populacionais do IBGE (2015), em
`data/geo/arranjos_populacionais_ibge_2015.csv` (arquivo do geobr/Ipea).

## Abrir e publicar

```bash
python3 -m http.server 8000 --directory mapa_frentes   # http://localhost:8000
npx wrangler deploy                                    # Cloudflare, na raiz do repositório
```

O `wrangler.jsonc` da raiz publica esta pasta como o Worker `onde-buscar-votos`
(só arquivos estáticos); `.assetsignore` deixa README e script de fora.
`bash mapa_frentes/publicar.sh` faz o mesmo.

A página carrega d3 e topojson-client do cdnjs/jsDelivr e fontes do Google Fonts.
Publicada, fica pública para quem tiver o link, a menos que se use Cloudflare Access.
