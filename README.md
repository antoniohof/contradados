# Onde buscar votos · 2º turno de 2026

Site para quem organiza a campanha de Lula no 2º turno (25/10/2026): onde e por que buscar
os votos que faltam, em três frentes, cidade por cidade. Dados do TSE (1º turno de 2026,
arquivos de 08/10/2026), do IBGE e do Portal da Transparência. Os números descrevem
territórios, não pessoas, e mostram tetos, não previsões.

## O site (`site/`)

| Endereço | O que tem |
| --- | --- |
| `/` | **O caminho**: 10 posts em formato de feed, com o mapa de pontos mudando a cada passo (scrollytelling). |
| `/na-pratica/` | **Cidade por cidade**: frente × tamanho da cidade × estado, lista para baixar e roteiros por região imediata do IBGE. |
| `/cidade/?ibge=…` | **Ficha**: as três frentes, o que fazer, políticas federais que chegam lá, contexto local e cidades vizinhas. |
| `/reels/?ibge=…` | **Kit de reels**: roteiro de 30 s, 4 cartões 1080×1920 em PNG, mensagem de WhatsApp e vídeos do Radar da Virada. |
| `/mapa/` | **Mapa das frentes**: mapa interativo, pesquisa editável, agrupamentos e método completo com o código. |
| `/metodo/` | Fontes, a conta, limites e regras eleitorais. |
| `/arquivo/` | Versão anterior (`site_simples/` e, em `/arquivo/mapas/`, `docs/`). |

As três frentes: **reconquistar** (quem votou em Lula em 2022 e foi de Flávio), **mobilizar**
(quem não votou, nas cidades de Lula) e **terceiros** (eleitores de Caiado, Renan, Cury e Zema
que não escolheram lado). A conta fica em `site/assets/js/frentes.js`, usada pelas páginas e
pelo build.

Visual: botões, menus e faixas no estilo de othernetwork.io; Newsreader (texto e manchetes) e
Bricolage Grotesque (interface e números), auto-hospedadas; desenhos com rough.js. Sem
dependências externas em tempo de execução.

## Ver localmente

```bash
python3 -m http.server 8000 --directory site
```

Abra http://localhost:8000.

## Publicar (Cloudflare)

O site é a pasta `site/`, servida pelo Cloudflare Workers no Worker `onde-buscar-votos`
(`wrangler.jsonc`). Com o repositório ligado ao Cloudflare, **cada push na `main` publica**.

Ligar o deploy automático (uma vez): painel do Cloudflare → **Workers & Pages** →
`onde-buscar-votos` → **Settings → Builds → Connect** → GitHub `mneunomne/contradados`, branch
`main`, *Build command* vazio, *Deploy command* `npx wrangler deploy`, *Root directory* `/`.
Se ativar *builds for non-production branches*, pushes em outras branches (como `dev`) geram links de prévia.

Publicar à mão: `bash scripts/site/publicar.sh` (refaz os dados e roda `npx wrangler deploy`).

## Atualizar os dados

```bash
python3 scripts/site/build_dados.py       # junta TSE, IBGE, Portal da Transparência e Radar (Python padrão)
node scripts/site/resumo.mjs              # aplica a conta e gera site/data/resumo.json e pontos.json
node scripts/site/montar_arquivo.mjs      # copia a versão anterior para site/arquivo/
python3 scripts/frentes/lista_frente2.py  # planilha da Frente 2, cidades de 10 a 50 mil habitantes (openpyxl)
```

Entradas novas desta versão:

- `data/ibge/populacao_censo2022.csv`: população do Censo 2022 (IBGE, tabela 4709).
- `data/ibge/regioes_geograficas.csv`: regiões geográficas imediatas e intermediárias (IBGE, 2017).
- `data/beneficios/beneficios_municipio.csv`: Bolsa Família e BPC (ago/2026), Pé-de-Meia
  (jan–ago/2026) e Garantia-Safra (2025), em R$ mil, pelo Portal da Transparência.
- `data/radar/radar_2026-10-09.json`: temas com fonte e vídeos do
  [Radar da Virada](https://radardavirada.pages.dev/), com marcação de frente.

A planilha da Frente 2 (1.310 cidades pró-Lula de 10 a 50 mil habitantes) fica em
`outputs/frente2_cidades_10a50mil_habitantes.xlsx` e para download em `/data/`.

**Validate** (GitHub Actions) confere a sintaxe e se `site/data` e `site/arquivo` saem iguais
das bases do repositório.

## Dados e método

A base oficial tem 5.571 registros; o site compara 5.570 municípios. Boa Esperança do
Norte/MT não tem histórico de 2022 nem Censo. Exterior excluído. Pesquisas da Frente 3:
AtlasIntel/Bloomberg (padrão), Datafolha e Quaest, com registro no TSE. Detalhes em
`/metodo/` e em `/mapa/#metodo`.

- [Relatório](RELATORIO.md) · [Planilha geral](outputs/eleitor_pendular_2026.xlsx) ·
  [Base oficial](data/tse/municipios_master.csv) · [Guia para continuar](HANDOFF.md)

## Versão anterior e pipeline de análise

`site_simples/` e `docs/` são a versão anterior, publicada em `/arquivo/`. O pipeline que gera
`docs/data/` está descrito no [HANDOFF](HANDOFF.md) (`scripts/tse/`, Python 3.10+ e
`requirements.txt`; ZIPs brutos do TSE fora do Git, em `TSE_RAW`). `notas_nuvem/` e
`estrategias_2t/` guardam pesquisa exploratória.

Sem licença definida para o código. Fontes: SIL Open Font License (Newsreader, Bricolage
Grotesque). Materiais de terceiros mantêm suas condições de uso.
