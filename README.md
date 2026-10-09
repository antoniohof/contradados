# eleitor-pendular-2026

Onde o voto presidencial se moveu entre 2022 e 2026 no Brasil, e onde ele faltou. São três listas de 100 municípios:

1. **Viraram para o PL:** municípios em que Lula venceu o 1º turno de 2022 e Flávio venceu o de 2026.
2. **Reduto do 13 com alta abstenção:** municípios em que Lula passa de 50% e a abstenção fica acima da média.
3. **Base Flávio, mas pendular:** municípios com voto alto em Flávio e baixa abstenção, mas com histórico de alternância.

Cada município traz o prefeito de 2024, a força local do PL e as principais pautas da comunidade, com fontes.

- **Relatório:** [`RELATORIO.md`](RELATORIO.md)
- **Planilha:** [`outputs/eleitor_pendular_2026.xlsx`](outputs/eleitor_pendular_2026.xlsx)
- **Dados:** [`data/base_municipios.csv`](data/base_municipios.csv) (todos os municípios) e [`data/cenarios.csv`](data/cenarios.csv) (os 300 registros dos cenários)
- **Mapas interativos:** [`docs/`](docs/), um site estático. Para abrir localmente, rode `python3 -m http.server -d docs` e acesse `localhost:8000`. Ele tem os 3 cenários, a reserva do 2º turno e 24 camadas por município.
- **Base oficial do TSE:** [`data/tse/municipios_master.csv`](data/tse/municipios_master.csv), com 5.571 municípios: resultados de 2026 por candidato, comparecimento 2022/2026, prefeitos e vereadores de 2024 e perfil do eleitorado. Pipeline em [`scripts/tse/`](scripts/tse/), com os zips brutos do TSE em `../data/raw/`.
  Atenção: os % de governador e senado usam os votos válidos oficiais. Os votos "Anulado sub judice" ficam de fora, e no RJ eles mudam a leitura (Ruas tem 50,9% dos válidos, mas 49,3% contando os 274 mil de Garotinho). A outra base está em `data/tse/estados_2026.csv` (`pct_com_sub_judice`), e os votos sub judice por município estão em `gov_votos_sub_judice` / `sen_votos_sub_judice`.
- **Elos fracos demográficos:** [`notas_local/elos_fracos.md`](notas_local/elos_fracos.md), com dados em [`data/demografia/`](data/demografia/).
- **Como continuar / pipeline:** [`HANDOFF.md`](HANDOFF.md)

Os resultados de 2026, o comparecimento, os candidatos de 2024 e o perfil do eleitorado vêm direto dos arquivos oficiais do TSE (dados abertos, gerados em 08/10/2026). O histórico de 2018 e 2022 vem das compilações de [lucashang07/laboratorio-voto-2026](https://github.com/lucashang07/laboratorio-voto-2026), [tatipara/eleicao_2026_1turno](https://github.com/tatipara/eleicao_2026_1turno) e [lfbl-cp/painel-eleicoes-2026](https://github.com/lfbl-cp/painel-eleicoes-2026), e conferidos entre si. A análise é descritiva e politicamente neutra. Os dados falam de territórios, não de indivíduos.

## Site público e execução local

A interface principal está em [`site_simples/`](site_simples/): busca de município,
mapa, rankings e relatórios com links próprios. A interface analítica com mais
camadas continua em [`docs/`](docs/).

```bash
python3 site_simples/build/build.py
python3 scripts/validate.py
python3 -m http.server 8000 --directory site_simples
```

Abra http://localhost:8000. O site e seu build não precisam de pacotes Python,
Node ou acesso à rede. O build completo conserva os indicadores do Censo 2022,
os aptos históricos e as comparações de governador.

A base oficial tem 5.571 registros municipais. A interface comparativa tem
5.570: Boa Esperança do Norte/MT fica fora por não ter histórico de 2022.
O exterior não integra nenhuma dessas contagens.

## Publicar no GitHub

1. Crie um repositório vazio no GitHub e conecte esta pasta
   (`eleitor-pendular-2026/`, que contém `.git`) ao endereço escolhido.
2. Envie a branch `main`.
3. Em **Settings → Pages → Build and deployment → Source**, escolha **GitHub Actions**.
4. Em **Actions → Publish GitHub Pages → Run workflow**, execute o workflow em `main`.

O workflow publica apenas os arquivos do site, com a interface analítica em
`/mapas/`. Novas publicações são manuais. O workflow **Validate** roda em pushes e
pull requests: verifica os dados contra a base mestre, a sintaxe do código e a
reprodutibilidade do build. A configuração segue a
[documentação oficial do GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

## Reproduzir a análise

Use Python 3.10 ou superior e instale as dependências do pipeline:

```bash
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
```

A sequência de scripts e os insumos estão em [`HANDOFF.md`](HANDOFF.md).
Os ZIPs grandes do TSE ficam fora do repositório; configure `TSE_RAW` para sua
pasta local. Os CSVs e JSONs processados são incluídos para permitir explorar e
reconstruir o site sem baixar esses ZIPs. A planilha existente é um artefato da
análise; gerar novamente exige recalcular suas fórmulas em Excel ou LibreOffice.

## Escopo, fontes e material de trabalho

O relatório descreve resultados e correlações territoriais. O indicador “votos
em jogo” combina mudança da parcela bipartidária, repasse hipotético de terceiros,
brancos/nulos e abstenção excedente; não identifica indivíduos nem prevê voto.
Os parâmetros de repasse do site são os do modelo de 08/10/2026, e não são
atualizados automaticamente por pesquisas posteriores.

[`data/socio/`](data/socio/) contém indicadores do Censo 2022, separados do perfil
do eleitorado. A fonte é IBGE/SIDRA (tabelas 9923, 9537, 10295 e 10297).
[`notas_nuvem/`](notas_nuvem/), [`notas_local/estrategias_2t/`](notas_local/estrategias_2t/)
e [`data/estrategias_2t/`](data/estrategias_2t/) preservam rascunhos e análises
exploratórias anteriores; não são insumos de publicação automática. Neles há
hipóteses, bases anteriores e itens marcados como não verificados. Consulte o
relatório e os dados oficiais para resultados consolidados.

Não foi definida uma licença para o código deste projeto. Fontes, fotografias e
dados de terceiros mantêm suas próprias condições de uso; sua inclusão não
representa uma licença geral de redistribuição.
