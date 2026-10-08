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
