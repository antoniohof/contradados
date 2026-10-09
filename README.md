# Contra Dados – Onde buscar votos · 2º turno de 2026

Endereço: [contradados.online](https://contradados.online)

Site para quem organiza a campanha de Lula no 2º turno (25/10/2026): onde e por que buscar
os votos que faltam, em três frentes, cidade por cidade. Dados do TSE (1º turno de 2026,
arquivos de 08/10/2026), do IBGE e do Portal da Transparência. Os números descrevem
territórios, não pessoas, e mostram tetos, não previsões.

## O site (`site/`)

| Endereço | O que tem |
| --- | --- |
| `/` | **O caminho**: 10 posts em formato de feed, com o mapa mudando a cada passo (scrollytelling): primeiro um ponto por cidade, depois 1 ponto = 1.000 votos, na cor de cada frente. |
| `/na-pratica/` | **Cidade por cidade**: frente × tamanho da cidade × estado e lista para baixar. Em **Roteiros**, as regiões imediatas do IBGE viram caminhos por cidades vizinhas: ao abrir um, o mapa mostra o trajeto e o painel ao lado as paradas, com anterior/próximo (setas do teclado), cópia e envio por WhatsApp. No Brasil, mapa de densidade; num estado ou roteiro, um espinho por cidade (altura = votos em jogo). |
| `/cidade/?ibge=…` | **Ficha**: as três frentes, o que fazer, políticas federais que chegam lá, contexto local e cidades vizinhas. |
| `/reels/?ibge=…` | **Kit de reels**: lista de todas as cidades por votos em jogo (filtros de frente, tamanho, estado, notícia local e prefeitura do PL). Para cada uma, um vídeo vertical em que cada tela fica o tempo de ler (40–50 s): notícia local sobre uma foto da cidade (Wikimedia Commons, com crédito; dá para trocar), o que Lula fez e o dinheiro federal que chega lá (Portal da Transparência), o que Flávio disse (com fonte), um fato documentado da prefeitura do PL onde houver, e a chamada. Partes ligam e desligam; textos variam de cidade para cidade. Toca na página e baixa em MP4, com capa, roteiro, legenda, mensagem de WhatsApp e vídeos do Radar da Virada. |
| `/mapa/` | Redireciona para `/metodo/#graficos` (o antigo mapa das frentes saiu; os gráficos e o método foram para Método). |
| `/metodo/` | A conta, cada frente em um gráfico, como os mapas foram desenhados, fontes, limites e regras eleitorais. |
| `/arquivo/` | Versão anterior (`site_simples/` e, em `/arquivo/mapas/`, `docs/`), fora do menu. |

As três frentes: **reconquistar** (quem votou em Lula em 2022 e foi de Flávio), **mobilizar**
(quem não votou, nas cidades de Lula) e **terceiros** (eleitores de Caiado, Renan, Cury e Zema
que não escolheram lado). A conta fica em `site/assets/js/frentes.js`, usada pelas páginas e
pelo build. 

Visual: botões, menus e faixas partem do desenho do othernetwork.io, com cores próprias (preto,
branco e cinza na interface; vermelho, verde-água e azul nas frentes, testadas para daltonismo); Newsreader (texto e manchetes) e
Bricolage Grotesque (interface e números), auto-hospedadas; desenhos com rough.js; MP4 dos reels
gravado no navegador (WebCodecs + mp4-muxer, copiado em `site/assets/vendor/`). A única chamada externa
é a foto de fundo dos reels, que o navegador busca na Wikidata e no Wikimedia Commons; sem rede, o vídeo
usa o mapa de pontos.

## Ver localmente

```bash
python3 -m http.server 8000 --directory site
```

Abra http://localhost:8000.

## Publicar (Cloudflare)

O site é a pasta `site/`, servida pelo Cloudflare Workers no Worker `onde-buscar-votos`
(`wrangler.jsonc`). Com o repositório ligado ao Cloudflare, **cada push na `main` publica**.

Domínio: `contradados.online`. Com o domínio no Cloudflare, ligue-o ao Worker em **Workers & Pages** →
`onde-buscar-votos` → **Settings → Domains & Routes → Add → Custom domain**. As páginas já apontam
`og:url`, `canonical` e a imagem de compartilhamento para `https://contradados.online`.

Ligar o deploy automático (uma vez): painel do Cloudflare → **Workers & Pages** →
`onde-buscar-votos` → **Settings → Builds → Connect** → GitHub `mneunomne/contradados`, branch
`main`, *Build command* vazio, *Deploy command* `npx wrangler deploy`, *Root directory* `/`.
Se ativar *builds for non-production branches*, pushes em outras branches (como `dev`) geram links de prévia.

Publicar à mão: `bash scripts/site/publicar.sh` (refaz os dados e roda `npx wrangler deploy`).

## Atualizar os dados

```bash
python3 scripts/site/build_dados.py       # junta TSE, IBGE, Portal da Transparência e Radar (Python padrão)
node scripts/site/resumo.mjs              # aplica a conta e gera resumo.json, pontos.json e densidade.json (1 ponto = 1.000 votos)
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
- `data/noticias/noticias_locais.json`: notícias locais de 2026 de cidades pequenas, com veículo,
  data, link, assunto, tom e a frase de gancho do reel (`confirmado` = matéria aberta e conferida).
  O build guarda até 3 por cidade em `site/data/noticias.json`.
- `data/prefeitos/prefeitos_pl.json`: fatos documentados (MP, TCE, PF, Câmara, imprensa) sobre a gestão de
  prefeitos eleitos pelo PL em 2024, nas 80 cidades do PL com mais votos em jogo; frase do vídeo, estágio do
  caso e resposta da prefeitura. Vai para `site/data/prefeitos.json`.

A planilha da Frente 2 (1.310 cidades pró-Lula de 10 a 50 mil habitantes) fica em
`outputs/frente2_cidades_10a50mil_habitantes.xlsx` e para download em `/data/`.

**Validate** (GitHub Actions) confere a sintaxe e se `site/data` e `site/arquivo` saem iguais
das bases do repositório.

## Dados e método

A base oficial tem 5.571 registros; o site compara 5.570 municípios. Boa Esperança do
Norte/MT não tem histórico de 2022 nem Censo. Exterior excluído. Pesquisas da Frente 3:
AtlasIntel/Bloomberg (padrão), Datafolha e Quaest, com registro no TSE. Detalhes em
`/metodo/`.

- [Relatório](RELATORIO.md) · [Planilha geral](outputs/eleitor_pendular_2026.xlsx) ·
  [Base oficial](data/tse/municipios_master.csv) · [Guia para continuar](HANDOFF.md)

## Versão anterior e pipeline de análise

`site_simples/` e `docs/` são a versão anterior, publicada em `/arquivo/`. O pipeline que gera
`docs/data/` está descrito no [HANDOFF](HANDOFF.md) (`scripts/tse/`, Python 3.10+ e
`requirements.txt`; ZIPs brutos do TSE fora do Git, em `TSE_RAW`). `notas_nuvem/` e
`estrategias_2t/` guardam pesquisa exploratória.

Sem licença definida para o código. Fontes: SIL Open Font License (Newsreader, Bricolage
Grotesque). mp4-muxer 5.2.2: licença MIT
(`site/assets/vendor/mp4-muxer-5.2.2.LICENSE.txt`). Materiais de terceiros mantêm suas
condições de uso.
