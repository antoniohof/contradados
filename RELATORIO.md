# Eleitor pendular 2026: onde o voto se moveu, onde ele faltou

*Relatório de 08/10/2026, entre o 1º turno (04/10) e o 2º turno (25/10/2026) da eleição presidencial.*

Quatro achados resumem o relatório:

- **713 municípios viraram de Lula para Flávio Bolsonaro.** Nenhum virou no sentido contrário. A comparação é entre os primeiros turnos de 2022 e de 2026, e o movimento se concentra no interior agrícola de MG, PR e RS.
- **A virada não segue o partido do prefeito.** Entre os 279 municípios analisados de perto, só 11 têm prefeito do PL. Nas cidades que viraram, governam sobretudo MDB, PP, PSD e Republicanos.
- **Nos 100 redutos do PT com mais ausentes, a abstenção quase empata com a vantagem de Lula.** Lá faltaram 1,1 milhão de eleitores, e a vantagem de Lula sobre Flávio nesses lugares foi de 1,15 milhão de votos.
- **As pautas locais mais citadas são as mesmas nos três grupos.** São saúde (hospital, UPA, especialistas), estradas e pontes, água e seca. No Sul e no Centro-Oeste pesam ainda as estiagens e a quebra de safra de 2025–26. No Norte aparecem garimpo e conflitos fundiários.

> Os dados descrevem **territórios**, não pessoas. Não é possível afirmar que os mesmos eleitores trocaram de voto: isso seria a falácia ecológica.

---

## 1. Dados e método

| Item | Fonte | Observação |
|---|---|---|
| Votos para presidente por município em 2018, 2022 e 2026, com aptos e comparecimento | TSE, via [lucashang07/laboratorio-voto-2026](https://github.com/lucashang07/laboratorio-voto-2026) (votocruzado.com.br) | 5.570 municípios; exterior excluído |
| Conferência de 2026 | TSE, via [tatipara/eleicao_2026_1turno](https://github.com/tatipara/eleicao_2026_1turno) | Divergência zero. Totais: Flávio 56.104.503 x Lula 53.879.538 |
| Conferência de 2022 | TSE, via [lfbl-cp/painel-eleicoes-2026](https://github.com/lfbl-cp/painel-eleicoes-2026) | Divergência zero. Lula 48,43% x Bolsonaro 43,20% |
| Governador e Senado 2026 por município, com o partido dos candidatos | o mesmo arquivo do votocruzado | Inclui a votação local dos candidatos do PL |
| Prefeitos 2024, PL local, economia, pautas e eventos | Pesquisa web por município (imprensa local, IBGE Cidades, sites de prefeituras e câmaras) | Fontes por município em `data/cenarios.csv` |

**Definições**

- **Margem**: % de Lula − % do candidato do PL, sobre votos válidos no 1º turno.
- **Swing**: margem de 2026 − margem de 2022, em pontos percentuais (p.p.). Valor negativo significa movimento para o PL.
- **Abstenção**: 1 − comparecimento / aptos. A média nacional sem o exterior é **20,75%**.
- **Histórico**: vencedor no 2º turno de 2018 (H = Haddad, B = Bolsonaro) – no 2º turno de 2022 (L/B) – no 1º turno de 2026 (L/F).
- **Índice pêndulo (0–5)**: soma 1 ponto para cada condição abaixo:
  - o PT venceu o 2º turno de 2018;
  - Lula venceu o 2º turno de 2022;
  - swing ≤ −15 p.p.;
  - terceiros ≥ 8% dos válidos;
  - margem de 2026 ≤ 20 p.p.

**Os três cenários**

| Cenário | Regra | Ordenação |
|---|---|---|
| **1 · Viraram para o PL** | Lula venceu em 2022, Flávio venceu em 2026, município com ≥ 10 mil eleitores | Maior swing |
| **2 · Reduto do 13 com alta abstenção** | Lula > 50% em 2026 e abstenção > 20,75% | Número absoluto de ausentes |
| **3 · Base Flávio, mas pendular** | Flávio ≥ 50%, abstenção < 20,75% e índice pêndulo ≥ 3 | Índice, depois tamanho |

São 100 municípios por cenário, 279 diferentes no total, porque há sobreposição entre os cenários 1 e 3.

---

## 2. Panorama nacional

| Indicador | Valor |
|---|---|
| Municípios que viraram de Lula para Flávio (1T22 → 1T26) | **713** |
| Municípios que viraram de Bolsonaro para Lula | **0** |
| Swing mediano por município | −11,1 p.p. |
| Municípios com Lula > 50% em 2026 | 2.401, dos quais 985 com abstenção acima da média |
| Municípios com Flávio ≥ 50% | 2.561 |
| Correlação abstenção 2026 × voto em Lula, Brasil | −0,02 (nula) |
| … Sul / Sudeste | **0,52 / 0,43** |
| … Centro-Oeste / Nordeste / Norte | 0,16 / 0,08 / −0,08 |
| Correlação Δ abstenção (22→26) × swing | **−0,22** |

O número de 713 viradas bate com o noticiado pela imprensa ([Diário de Cuiabá](https://www.diariodecuiaba.com.br/brasil/flavio-bolsonaro-conquista-714-cidades-que-tiveram-maioria-de-lula-em-2022/756906)).

As duas correlações sugerem duas coisas:

1. **No Sul e no Sudeste, quem falta são sobretudo eleitores de lugares onde o PT vai bem.** Nesses lugares, a abstenção é uma reserva potencial de votos para Lula. No Nordeste não há relação, e a abstenção é baixa.
2. **Onde a abstenção mais subiu desde 2022, o PT mais perdeu margem.** Os dados não mostram se isso aconteceu porque eleitores de Lula deixaram de votar ou porque os que votaram mudaram de lado.

---

## 3. Cenário 1: viraram para o PL

**Por estado:** MG 26 · PR 19 · RS 19 · PA 8 · GO 7 · SP 7 (top 100).

Os 15 primeiros:

| # | Município | Eleitores | Lula 22 → 26 | PL 22 → 26 | Swing | Prefeito 2024 |
|---|---|---|---|---|---|---|
| 1 | São João do Triunfo/PR | 11.622 | 58,6 → 37,8 | 33,8 → 51,6 | −38,6 | Mário Cezar da Silva (PT) |
| 2 | Dom Feliciano/RS | 10.375 | 54,0 → 35,3 | 39,5 → 56,5 | −35,6 | Tiago Szortyka (PSB) |
| 3 | Senador José Porfírio/PA | 14.882 | 51,8 → 35,3 | 43,2 → 61,3 | −34,7 | Leonaldo (PSD) |
| 4 | Humaitá/AM | 34.906 | 52,6 → 39,5 | 41,1 → 54,9 | −27,0 | Dedei Lobo (União) |
| 5 | São Francisco de Assis/RS | 14.252 | 54,6 → 41,8 | 38,0 → 51,8 | −26,6 | Paulinho Salbego (PDT) |
| 6 | Soledade/RS | 21.730 | 49,5 → 36,5 | 43,9 → 57,4 | −26,5 | Paulo Cattaneo (MDB) |
| 7 | Balsas/MA | 71.207 | 51,7 → 38,4 | 43,2 → 55,5 | −25,6 | Alan da Marissol (PRD) |
| 8 | Tailândia/PA | 55.593 | 52,3 → 39,9 | 42,3 → 54,9 | −25,1 | Lauro (MDB) |
| 9 | Júlio de Castilhos/RS | 14.988 | 55,1 → 42,9 | 37,0 → 49,9 | −25,0 | Bernardo Dalla Corte (PSDB) |
| 10 | Ouvidor/GO | 10.501 | 53,1 → 37,2 | 40,5 → 49,3 | −24,7 | Cebinha (Podemos) |
| 11 | Rio Paranaíba/MG | 11.055 | 51,1 → 38,6 | 43,0 → 55,1 | −24,5 | Adriano (**PL**) |
| 12 | Dom Pedrito/RS | 29.233 | 53,9 → 41,6 | 38,9 → 51,1 | −24,5 | Guiga (PP) |
| 13 | Turvo/PR | 11.863 | 58,2 → 45,9 | 34,8 → 46,7 | −24,2 | Marcos Seguro (PSD) |
| 14 | Bituruna/PR | 12.807 | 55,6 → 43,7 | 38,6 → 50,7 | −24,0 | *não confirmado* |
| 15 | Candói/PR | 12.050 | 55,5 → 42,8 | 39,8 → 50,4 | −23,3 | Dino Goldoni (PSD) |

O que aparece neste cenário:

- **A virada se dá no interior pequeno e médio,** em geral com perfil agropecuário, com fumo, soja e pecuária no Sul.
- **O prefeito quase nunca é do PL.** O caso mais extremo, São João do Triunfo, tem prefeito do PT. A virada presidencial parece desligada da máquina municipal.
- **Choques locais aparecem com frequência nas pautas:**
  - estiagem 2025 no RS (Júlio de Castilhos, Jari, Lagoa Bonita do Sul, Novo Barreiro e outros), com quebra de soja na safra 25/26;
  - garimpo e operações da PF (Humaitá);
  - mineração de ouro da Belo Sun (Senador José Porfírio);
  - BR-230 sem asfalto (Rurópolis);
  - ponte da BR-235 interditada (Pedro Afonso/TO);
  - crise fiscal municipal (Balsas, Coroatá).

---

## 4. Cenário 2: reduto do 13 com alta abstenção

**Por estado:** MG 20 · BA 19 · MA 14 · AM 11 · PE 10 · AL 7.

**Soma dos 100 municípios:** 1.107.651 ausentes, contra uma vantagem de Lula de 1.150.533 votos.

| # | Município | Eleitores | Lula 26 | Abst 22 → 26 | Ausentes | Prefeito 2024 |
|---|---|---|---|---|---|---|
| 1 | Diadema/SP | 330.772 | 52,4 | 19,8 → 22,6 | 74.613 | Taka Yamauchi (MDB) |
| 2 | Rio Grande/RS | 149.771 | 56,2 | 24,2 → 27,1 | 40.581 | Darlene Pereira (PT) |
| 3 | Lauro de Freitas/BA | 163.386 | 59,1 | 21,3 → 22,7 | 37.057 | Débora Régis (União) |
| 4 | Francisco Morato/SP | 126.743 | 52,3 | 22,6 → 24,8 | 31.393 | *não confirmado* |
| 5 | Alagoinhas/BA | 114.281 | 65,8 | 19,9 → 20,8 | 23.742 | Gustavo Carmo (PSD) |
| 6 | Codó/MA | 82.433 | 71,5 | 25,8 → 24,9 | 20.484 | Chiquinho FC (PT) |
| 7 | Paulo Afonso/BA | 83.608 | 75,0 | 25,7 → 21,8 | 18.264 | Mário Galinho (PSD) |
| 8 | Itacoatiara/AM | 76.067 | 59,0 | 22,9 → 23,3 | 17.682 | Mário Abrahim (Republicanos) |
| 9 | Manacapuru/AM | 81.115 | 51,4 | 20,8 → 21,0 | 17.036 | Valcileia Maciel (MDB) |
| 10 | Parintins/AM | 73.019 | 78,7 | 24,3 → 22,4 | 16.328 | Mateus Assayag (PSD) |
| 11 | Valença/RJ | 56.821 | 51,3 | 26,1 → 26,2 | 14.897 | Saulo Correa (MDB) |
| 12 | Januária/MG | 51.290 | 70,7 | 30,0 → 28,7 | 14.735 | Maurício Almeida (Podemos) |
| 13 | Pinheiro/MA | 62.810 | 68,4 | 22,8 → 23,3 | 14.644 | André da Ralpnet (Podemos) |
| 14 | Candeias/BA | 64.825 | 77,7 | 19,8 → 21,6 | 13.997 | Eriton Ramos (PP) |
| 15 | Ouro Preto/MG | 64.299 | 60,9 | 18,5 → 21,5 | 13.816 | Angelo Oswaldo |

O que aparece neste cenário:

- **Dois perfis distintos.**
  - O primeiro são periferias metropolitanas e cidades médias industriais: Diadema, Francisco Morato, Rio Grande, Lauro de Freitas, Candeias. Nelas a abstenção **subiu** em relação a 2022.
  - O segundo é o interior do Norte e Nordeste, com longas distâncias e transporte fluvial: Amazonas, Maranhão, norte de Minas. Ali a abstenção já era alta e às vezes caiu.
- **Pautas dominantes:**
  - saúde: Hospital Nair Alves de Souza em Paulo Afonso, Hospital Jorge Novis em Lauro de Freitas;
  - água e seca: Adutora do Agreste em PE, Águas do Sertão em AL;
  - crise fiscal municipal: calamidade financeira em Lauro de Freitas, queda de ICMS em São Francisco do Conde;
  - segurança e garimpo no Amazonas, onde o prefeito de Coari foi afastado pelo STF e depois reconduzido.
- **Pesquisa sobre transporte gratuito no dia da eleição:** em 2022, segundo o Ipea, ele não aumentou o comparecimento. Em 2026 já é obrigatório por resolução do TSE. Ver `research/`.

---

## 5. Cenário 3: base Flávio, baixa abstenção, mas pendular

**Por estado:** RS 34 · PR 16 · TO 13 · SC 12 · MG 8 · SP 6.

| # | Município | Eleitores | Histórico | Índice | Flávio 26 | Abst 26 | Prefeito 2024 |
|---|---|---|---|---|---|---|---|
| 1 | São João do Triunfo/PR | 11.622 | H-L-F | 5 | 51,6 | 17,3 | PT |
| 2 | Jari/RS | 2.794 | H-L-F | 5 | 52,7 | 19,0 | MDB |
| 3 | Canudos do Vale/RS | 1.944 | H-L-F | 5 | 53,2 | 13,3 | PSB |
| 4 | São Miguel da Boa Vista/SC | 1.757 | H-L-F | 5 | 51,5 | 17,3 | *pendente* |
| 5 | Balsas/MA | 71.207 | H-L-F | 4 | 55,5 | 20,1 | PRD |
| 6 | Dom Eliseu/PA | 30.137 | H-L-F | 4 | 53,0 | 20,0 | União |
| 7 | Ulianópolis/PA | 20.159 | H-L-F | 4 | 54,4 | 20,2 | MDB |
| 8 | Belterra/PA | 17.778 | H-L-F | 4 | 51,9 | 19,3 | MDB |
| 9 | Itinga do Maranhão/MA | 17.555 | H-L-F | 4 | 51,2 | 19,0 | PP |
| 10 | Carmópolis de Minas/MG | 13.900 | B-L-F | 4 | 51,8 | 15,2 | União |

O que aparece neste cenário:

- **São lugares que votaram em Haddad em 2018 e em Lula em 2022, e agora deram maioria a Flávio** com comparecimento alto. Pela definição, é o retrato mais próximo de um swing voter.
- **A maioria são municípios pequenos de agricultura familiar do Sul,** em especial no noroeste gaúcho, sudoeste do PR e oeste de SC, além da fronteira agrícola do Pará e Maranhão.
- **As pautas mais frequentes** são estiagem e quebra de safra, saúde, estradas rurais e emprego ligado ao agro.

---

## 6. PL local

Prefeitos do PL encontrados entre os 279 municípios:

| Município | Prefeito | Cenário |
|---|---|---|
| Rio Paranaíba/MG | Adriano | 1 |
| Santo Augusto/RS | Lilian Depiere | 1 |
| Miranorte/TO | Leandro Barbosa | 1 e 3 |
| Posse/GO | Paulo Krauspenhar | 1 |
| Nova Olímpia/MT | Arizão | 1 |
| Herveiras/RS | Nazario Kuentzer | 3 |
| Leopoldina/MG | Pedro Augusto | 2 |
| Lábrea/AM | Gerlando Lopes | 2 |
| Tutóia/MA | Diringa | 2 |
| Viana/MA | Carrinho Cidreira | 2 |
| Zé Doca/MA | Flavinha Cunha | 2 |

Três observações:

- **Cinco desses prefeitos estão em municípios do cenário 2.** Ali Lula venceu mesmo com prefeito do PL.
- **Partidos dos prefeitos entre os 279:** MDB (47) e PP (38) lideram, seguidos de Republicanos, PSD e União. O PT tem 10.
- **Candidatos do PL em 2026 em cada município** (governador e Senado, com a % local) estão nas colunas da planilha. Exemplos: Zucco (governador eleito no RS), Domingos Sávio (senador eleito em MG), Gustavo Gayer (senador eleito em GO).

---

## 7. Limites e pendências

- **Cobertura da pesquisa local**, em 08/10/2026:
  - 267 de 279 municípios foram pesquisados;
  - 255 têm o partido do prefeito;
  - 165 têm pautas com fonte;
  - a lista do que falta está em `data/pendencias.csv`.
- **Prefeitos não foram conferidos com a base oficial do TSE.** Vários foram cruzados por nome de urna e estão marcados em `obs`. O próximo passo é usar o arquivo `consulta_cand_2024` do TSE.
- **"Pautas" vêm de imprensa local, sites de prefeitura e câmara e planos de governo,** não de pesquisas de opinião. Várias são institucionais (o que a prefeitura divulga). Cada município tem um campo de confiança.
- **A classificação dos cenários depende de cortes arbitrários,** como 10 mil eleitores, 20,75% de abstenção e o índice ≥ 3. A base completa permite refazer as listas com outros critérios.
- **As fontes eleitorais são compilações abertas de dados do TSE**, conferidas entre si. Ainda vale reconferir com os arquivos oficiais `votacao_secao_2026` e `detalhe_votacao_munzona` quando forem publicados no portal de dados abertos.

## Arquivos

- `outputs/eleitor_pendular_2026.xlsx`: planilha com os 3 cenários, as pautas e a base completa (fórmulas recalculadas).
- `data/base_municipios.csv`: os 5.570 municípios com todos os indicadores.
- `data/cenarios.csv`: os 300 registros dos cenários com a pesquisa local e as fontes.
- `data/pesquisa_local.json`: a pesquisa consolidada. A pesquisa bruta por lote está em `data/pesquisa_bruta/`.
- `research/`: o relatório de contexto anterior (literatura, abstenção, perfis demográficos), com as notas.
