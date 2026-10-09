# Elos fracos demográficos do PL (1º turno 2022 → 2026)

> **Ressalva obrigatória.** Tudo aqui são associações entre territórios (zonas eleitorais e municípios), não comportamento de pessoas. "Zonas com mais mulheres tiveram menos swing para o PL" **não** quer dizer que as mulheres mudaram de voto (falácia ecológica). Use estes resultados para escolher onde olhar e quais hipóteses testar com pesquisas de opinião.

## Em uma frase

Onde o PL avançou menos entre 2022 e 2026, o eleitorado é mais escolarizado, mais urbano e um pouco mais feminino. Onde avançou mais, predominam eleitores sem o fundamental completo, em municípios pequenos e no interior. Flávio só ficou abaixo do Bolsonaro de 2022 em poucos lugares: **Brasília, Grande Recife, cidade do Rio de Janeiro, Goiânia e entorno (efeito Caiado), Rio Branco e Aracaju**.

## O que foi feito

- **Unidade.** Município × zona eleitoral, a menor unidade em que o TSE publica juntos o perfil do eleitorado e os votos.
  - São 6.106 unidades. Delas, 5.847 são comparáveis entre 2022 e 2026: o eleitorado mudou menos de 15%. Elas somam 148 milhões de aptos.
  - Script: `scripts/demografia/01_zonas.py`. Saída: `data/demografia/zonas.csv`.
- **Dados.** Todos são arquivos oficiais do TSE (CDN de dados abertos, 08/10/2026):
  - `perfil_eleitorado_2026` (jul/2026): faixa etária, gênero, escolaridade e estado civil;
  - `votacao_candidato_munzona` 2022 e 2026, 1º turno, presidente;
  - `detalhe_votacao_munzona` 2022 e 2026: abstenção, brancos e nulos.
  - O perfil de 2026 também é usado para 2022.
- **Alvos:**
  1. swing de margem (Lula − PL), 2022 → 2026;
  2. Flávio 2026 − Bolsonaro 2022, em % dos válidos;
  3. Δ abstenção;
  4. voto em terceiros, no total e para Renan, Caiado e Cury.
- **Modelo.** Regressão ponderada pelos aptos, com:
  - efeitos fixos de UF, que comparam zonas dentro do mesmo estado;
  - controle de porte do município;
  - erro-padrão agrupado por município.

  Efeitos em **pontos percentuais por +1 desvio-padrão** da parcela do grupo na zona. Grupos de referência: 35–44 anos e ensino médio. Script: `scripts/demografia/02_elos.py`.
- **Escolaridade: comparar, não ler o nível.** A escolaridade do cadastro do TSE é autodeclarada e desatualizada: 55% dos eleitores aparecem "até o fundamental".
  - Ao ponderar a pesquisa Datafolha de 08/10 pelo perfil do TSE, sexo e idade reproduzem o resultado geral com diferença de 0,5 a 0,8 p.p. A escolaridade erra por 3,6 p.p. a favor de Lula (sessão elei-es-bf, `notas_local/datafolha.md`).
  - Por isso, as variáveis `escol_*` servem para comparar zonas entre si (correlações e regressões), mas não como medida do nível de escolaridade do eleitorado.
- **O que não funcionou.** A inferência ecológica de Goodman (taxas de voto por faixa etária) deu resultados impossíveis: taxas negativas ou acima de 100%, mesmo com efeitos fixos de UF. Também falhou no teste de sanidade, que é a abstenção alta dos 70+. Por isso não publicamos "x% dos jovens votaram em Flávio": a composição etária das zonas está misturada demais com o tipo de lugar.

## Resultados (zonas eleitorais, dentro de cada UF)

Efeito de +1 desvio-padrão do grupo na zona. Asterisco: p < 0,05. Swing positivo é movimento rumo a Lula; Flávio − Jair negativo quer dizer Flávio abaixo de Jair.

| Grupo (1 dp) | Swing | Flávio − Jair | Δ abstenção | Renan |
|---|---|---|---|---|
| Sem fundamental completo (12,6 p.p.) | **−1,6\*** (rumo ao PL) | **+1,0\*** | −0,8\* | −0,2\* |
| Superior completo (8,3 p.p.) | −0,3 | +0,5\* | −0,2 | +0,1\* |
| Mulheres (1,8 p.p.) | **+0,7\*** | **−0,4\*** | 0,0 | 0,0 |
| 16–24 anos (2,8 p.p.) | +0,5 | −0,2 | **−0,6\*** | 0,0 |
| 70+ anos (3,4 p.p.) | **+0,8\*** | −0,1 | **+0,8\*** | −0,1\* |

1. **Escolaridade baixa é onde o PL mais cresceu, e o padrão é o mais sólido de todos.** Zonas com mais eleitores sem o fundamental completo tiveram swing para o PL em todas as cinco regiões:
   - Norte −4,1;
   - Sul −3,4;
   - Centro-Oeste −1,4;
   - Sudeste −1,2;
   - Nordeste −0,7.

   Nessas zonas, Flávio também passou Jair em todas as regiões. É o interior agro do relatório, visto pelo perfil do eleitorado. O espelho, ou seja o elo fraco, são as zonas mais escolarizadas e urbanas.
2. **Zonas mais femininas: PL mais mole.** Swing rumo a Lula (+0,7) e Flávio abaixo de Jair (−0,4) no Brasil, no Sudeste (+0,7 / −0,4) e no Sul (+0,8 / −0,5). O sinal se repete nas UFs com muitas zonas: BA, MG, PR, ES, MT e TO. A parcela de mulheres varia pouco entre zonas, então o efeito por desvio-padrão é pequeno. O grupo, porém, é enorme: 78 milhões de eleitoras.
3. **Idosos 70+: swing para Lula e abstenção em alta.** No Norte o sinal é forte (swing +6,0; Flávio − Jair −2,4; abstenção +1,1). Lá, zonas mais idosas tiveram swing rumo a Lula, Flávio abaixo de Jair e mais abstenção. Isso reforça a leitura do relatório: os 70+, com voto facultativo, são o maior bloco de ausentes (17,2 milhões de eleitores) e pendem menos para o PL.
4. **Jovens 16–24: menos abstenção, sem sinal claro de voto.** A abstenção caiu mais onde há mais jovens, sobretudo no Nordeste (−1,0). Não há associação consistente com o swing: é positiva no Norte (+3,1) e negativa no Sul (−1,5). Na escala municipal, Renan e Cury crescem onde há mais escolaridade, não onde há mais jovens.
5. **Terceiros.** Renan cresce onde há mais superior completo e menos eleitores sem o fundamental, em todas as regiões. Cury é mais fraco em zonas mais velhas e menos escolarizadas. Caiado é um efeito de Goiás e do Centro-Oeste.

## Onde Flávio ficou abaixo de Jair

São 130 zonas, com 8,6 milhões de aptos (`data/demografia/zonas_abaixo_de_jair.csv`):

| Município | Zonas | Aptos | Flávio − Jair (média) | Observação |
|---|---|---|---|---|
| Brasília/DF | 13 | 1,52 mi | −0,8 | Caiado 4,8% |
| Recife/PE | 11 | 1,23 mi | −0,8 | e mais Jaboatão, Olinda, Paulista e Cabo (+1,2 mi) |
| Rio de Janeiro/RJ | 11 | 1,21 mi | −0,4 | |
| Goiânia/GO | 9 | 1,02 mi | −1,4 | Caiado 13,5%; também Aparecida e Luziânia (Caiado ~15%) |
| Rio Branco/AC | 2 | 0,27 mi | −0,3 | |
| Aracaju/SE | 1 | 0,14 mi | −0,1 | |

Fora daí, Flávio igualou ou superou Jair. O segundo turno sem Caiado na urna torna Goiás e o DF os casos mais interessantes: os votos de Caiado tinham vindo em parte de quem votou em Bolsonaro em 2022.

## Segmento × território: as maiores células

`data/demografia/elos_fracos.csv` traz 71 combinações de grupo e território (UF com 60 ou mais zonas, ou região) com pelo menos um sinal de PL mais mole: Flávio abaixo de Jair, swing para Lula ou mais terceiros. Cada uma traz o tamanho do segmento. As maiores:

- **Mulheres**: Brasil (78 mi), Sudeste (32 mi), Sul (11,6 mi), MG (8,5 mi), BA (5,9 mi, com 3 sinais), PR (4,4 mi), ES, MT e TO.
- **45–59 anos no Nordeste** (10,7 mi): BA 2,9 mi, PE 1,8 mi.
- **60–69 anos no Nordeste** (4,9 mi): BA, PE e CE.
- **45–59 e 25–34 anos no Norte** (2,8 e 2,6 mi).
- **Ensino fundamental (até médio incompleto) no Centro-Oeste** (2,5 mi, 3 sinais) e em GO (1,1 mi): efeito Caiado.
- **70+ em MG** (2,1 mi).

## Cruzamento com a passada municipal (sessão elei-es-28)

Os resultados de `data/demografia/municipal_*.csv` (5.570 municípios) contam a mesma história:

- **Mulheres.** A correlação entre o swing para o PL e a parcela feminina é de −0,57. Mas essa parcela também se correlaciona 0,62 com o porte do município, porque os lugares mais masculinos são fronteiras agrícolas.
- **Escolaridade.** Superior completo tem correlação de −0,39 com o swing para o PL. Sem fundamental completo tem +0,47.
- **Superior no quartil de menor avanço do PL.** No quartil de municípios em que o PL menos avançou em cada UF, quem tem superior completo está sobre-representado em 25 das 26 UFs, num total de 12,1 milhões de pessoas.
- **Flávio abaixo de Jair.** São 90 municípios, com 8,1 milhões de aptos, concentrados em GO, na Grande Recife e no DF.

A escala de zona acrescenta duas coisas:

1. **A capital do Rio de Janeiro** aparece entre os lugares com Flávio abaixo de Jair em 11 zonas, o que some no total municipal.
2. **O efeito de "mulheres" resiste** ao controle de porte e à comparação dentro da mesma UF. Ou seja, não é só um efeito de urbanização, embora continue sendo uma correlação entre lugares.

## Arquivos

- `data/demografia/zonas.csv`: perfil e votos por município × zona.
- `data/demografia/elos_regressao.csv`: coeficientes por alvo, grupo e escopo (Brasil, região e UFs com 60 ou mais zonas).
- `data/demografia/elos_fracos.csv`: segmento × território com sinal de PL mole e o tamanho do segmento.
- `data/demografia/zonas_abaixo_de_jair.csv`: as 130 zonas em que Flávio ficou abaixo de Jair.
- `data/demografia/municipal_*.csv`: passada municipal da sessão elei-es-28.
