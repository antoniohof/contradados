# Datafolha 2º turno (08/10) × 1º turno oficial (TSE)

*Nota de 09/10/2026. Script: `scripts/pesquisas/datafolha.py`. Dados: `data/pesquisas/`.*

**A pesquisa.** Datafolha, registro BR-02949/2026, 2.520 entrevistas presenciais com eleitores de 16 anos ou mais, campo de 06 a 08/10 (algumas matérias dizem 06 a 07/10). Margem de erro de ±2 p.p. com 95% de confiança.

- Total: **Flávio 49% x Lula 45%**, 5% branco/nulo/nenhum, 1% não sabe.
- Válidos: **Flávio 52% x Lula 48%**.
- Rejeição: Lula 46%, Flávio 43%. Avaliação do governo: 40% ruim/péssimo, 35% ótimo/bom. 94% dizem estar totalmente decididos.
- Os números por segmento foram conferidos em pelo menos duas matérias (ver `fontes` no JSON). Ficaram de fora o recorte por cor/raça, porque a única transcrição encontrada soma mais de 100%, e a matéria da Voz da Bahia, que traz números de outra pesquisa.

## 1. A pesquisa é quase o 1º turno somado aos votos dos terceiros

| | Lula / (Lula + Flávio) |
|---|---|
| 1º turno oficial (TSE, sem exterior) | 48,98% |
| 1º turno + votos de terceiros divididos como a pesquisa diz (46% Flávio, 32% Lula, 15% branco/nulo) | 48,49% |
| Datafolha, válidos | **48,0%** |

A pesquisa fica 0,5 p.p. abaixo da simples redistribuição dos 9,3 milhões de votos de Cury, Renan, Caiado e Zema, o que está dentro da margem de erro. **Não há sinal de movimento próprio entre os turnos.** O placar de 52 a 48 é o que se espera quando os votos dos terceiros vão mais para Flávio. A taxa de transferência (46/32/15) vem de uma única matéria (CNN) e por isso tem confiança média.

Em votos: 4 p.p. sobre cerca de 117 milhões de válidos dão uma diferença de **~4,7 milhões** a favor de Flávio. No 1º turno a diferença foi de 2,24 milhões.

## 2. Por região: a pesquisa aproxima as regiões entre si

| Região (agrupamento Datafolha) | % dos aptos | Lula2p 1T | Lula2p pesquisa | Δ | erro aprox. |
|---|---|---|---|---|---|
| Nordeste | 27,6 | 67,4 | 63,5 | **−3,9** | ±4,5 |
| Norte/Centro-Oeste | 15,9 | 42,6 | 39,0 | **−3,6** | ±6,0 |
| Sudeste | 42,0 | 43,6 | 45,7 | **+2,1** | ±3,8 |
| Sul | 14,5 | 34,2 | 37,6 | **+3,4** | ±6,3 |

*Lula2p = Lula / (Lula + Flávio). O erro é uma aproximação: amostra proporcional ao eleitorado e efeito de desenho de 1,5.*

- **Nenhuma diferença regional ultrapassa o erro da subamostra.** Mesmo assim, o padrão chama atenção porque é o oposto da geografia do 1º turno: Lula cai onde foi forte e sobe onde foi fraco. Isso pode ser ruído de subamostra, que tende a puxar os extremos para a média. Também pode ser um movimento real no Sudeste, onde está 42% do eleitorado.
- **Para comparar com as próximas pesquisas (Quaest, AtlasIntel), a métrica é o Sudeste.** Se Lula se mantiver acima de ~45% de Lula2p no SE com o NE estável, o 52 a 48 nacional não se sustenta. Se o NE realmente caiu 4 p.p., é ali que está a perda.

## 3. Conferência: a pesquisa ponderada pelo eleitorado do TSE

Os resultados de cada segmento foram multiplicados pelo peso do segmento no eleitorado (TSE, perfil de jul/2026) e comparados com o total publicado (Lula2p 47,9%):

| Recorte | Lula2p reconstruído | Diferença |
|---|---|---|
| Região × aptos | 48,5 | +0,6 |
| Sexo × perfil TSE | 48,7 | +0,8 |
| Idade × perfil TSE | 48,4 | +0,5 |
| **Escolaridade × perfil TSE** | **51,4** | **+3,6** |

Sexo, idade e região batem com o total dentro do arredondamento. **A escolaridade não bate.** No cadastro do TSE, 55% do eleitorado aparece com até o ensino fundamental. Essa informação é autodeclarada no alistamento e raramente atualizada, por isso fica abaixo da escolaridade real. A amostra do Datafolha, que segue o IBGE, tem bem menos eleitores com só o fundamental.

**Consequência para `notas_local/elos_fracos.md` e `data/demografia/`:** as colunas `escol_*` do TSE servem para comparar municípios e zonas entre si (correlações e ordenações), mas não como nível absoluto. Não se deve combiná-las com taxas por escolaridade de pesquisas.

## 4. Projeção por município: dois cenários, não previsões

- **Modelo A (deslocamento regional uniforme):** cada município recebe o Δ de Lula2p da sua região. Viram para Lula **146 municípios**, quase todos cidades médias do SE e do Sul onde Lula ficou entre 47% e 50% no 1º turno: Osasco, Ribeirão das Neves, Araraquara, Alvorada, Sapucaia do Sul, Sabará, Poá, Bagé, Nova Lima, Jandira. Viram para Flávio **91**, no NE e no N/CO. Dos 100 municípios do cenário 1 (os que viraram para o PL), **17 voltam para Lula**.
- **Modelo B (votos dos terceiros divididos 46/32 em cada município):** nenhum município vira para Lula e 44 viram para Flávio.

As duas colunas estão em `data/pesquisas/datafolha_municipios.csv` (`lula2p_A`, `lula2p_B`, `venc_A`, `venc_B`).

## 5. A abstenção não fecha 4,7 milhões

| Hipótese | Ganho líquido de Lula |
|---|---|
| Todos os ausentes do cenário 2 (redutos do 13) votam como o próprio município | **+0,34 mi** |
| O mesmo, votando como o NE na pesquisa (61 a 35) | +0,07 mi |
| A abstenção cai até a média nacional onde está acima dela, e os novos eleitores votam como o município | −0,04 mi |
| Todos os 32,9 milhões de ausentes do país votam (como o município) | −1,0 mi |
| Fechar a diferença só com o Nordeste (+0,26 voto líquido por ausente) | exigiria 18 milhões de novos eleitores, 2,25 vezes os 8 milhões de ausentes da região |

Isso atualiza o achado do RELATORIO de que nos redutos do 13 a abstenção quase empata com a vantagem de Lula. A comparação continua certa, mas **mobilizar esses ausentes renderia no máximo um décimo do que falta**. Com os números desta pesquisa, a diferença só fecha com mudança de voto, sobretudo no Sudeste e nos 9,3 milhões de eleitores dos terceiros. Hoje esses eleitores vão 46 a 32 para Flávio; cada 10 p.p. que migrarem de Flávio para Lula valem cerca de **1,9 milhão** de votos de diferença.

> Pesquisa mede pessoas; o TSE mede territórios. As projeções acima aplicam taxas regionais ou nacionais a municípios e não dizem nada sobre eleitores individuais.
