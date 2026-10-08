# Eleitor pendular 2026: onde o voto se moveu, onde ele faltou

*Relatório de 08/10/2026, entre o 1º turno (04/10) e o 2º turno (25/10/2026) da eleição presidencial. Versão 2: números oficiais do TSE.*

Quatro achados resumem o relatório:

- **711 municípios viraram de Lula para Flávio Bolsonaro, e outros 2 terminaram empatados.** Nenhum virou no sentido contrário. A comparação é entre os primeiros turnos de 2022 e de 2026, e o movimento se concentra no interior agrícola de MG, PR e RS. A versão anterior contava 713 viradas porque incluía os dois empates exatos: Trabiju/SP (574 x 574) e Crixás do Tocantins/TO (679 x 679).
- **A virada não segue o partido do prefeito.** Entre os 279 municípios analisados de perto, **21 têm prefeito do PL**, e não 11 como dizia a versão anterior, que se baseava em pesquisa web. Isso dá 9% dos municípios que viraram, praticamente a mesma fatia do PL entre todos os prefeitos do país (9,3%). Nas cidades que viraram, governam sobretudo MDB, PP, PSD e União.
- **Nos 100 redutos do PT com mais ausentes, a abstenção quase empata com a vantagem de Lula.** Lá faltaram 1,11 milhão de eleitores, e a vantagem de Lula sobre Flávio nesses lugares foi de 1,15 milhão de votos.
- **As pautas locais mais citadas são as mesmas nos três grupos.** São saúde (hospital, UPA, especialistas), estradas e pontes, água e seca. No Sul e no Centro-Oeste pesam ainda as estiagens e a quebra de safra de 2025–26. No Norte aparecem garimpo e conflitos fundiários. Em Minas, mineração (lítio, minério de ferro, zinco) e enchentes.

> Os dados descrevem **territórios**, não pessoas. Não é possível afirmar que os mesmos eleitores trocaram de voto: isso seria a falácia ecológica.

---

## 1. Dados e método

| Item | Fonte | Observação |
|---|---|---|
| Votos para presidente, governador, Senado e deputados por município em 2026; aptos, comparecimento, brancos e nulos | TSE, dados abertos: `votacao_candidato_munzona_2026` e `detalhe_votacao_munzona_2026` (gerados em 08/10/2026) | 5.571 municípios; exterior excluído |
| Totais oficiais 2026, 1º turno | os mesmos arquivos | Sem exterior: Flávio 55.960.603 x Lula 53.722.151; abstenção 20,84%. Com exterior: 56.104.503 x 53.879.538 (47,03% x 45,16%) |
| Votos de 2018 e 2022 por município | TSE, via [lucashang07/laboratorio-voto-2026](https://github.com/lucashang07/laboratorio-voto-2026) (votocruzado.com.br), conferido com [lfbl-cp/painel-eleicoes-2026](https://github.com/lfbl-cp/painel-eleicoes-2026) e com o `detalhe_votacao_munzona_2022` do TSE | Divergência zero nos votos de 2022 |
| Prefeitos, vices e vereadores eleitos em 2024 | TSE, `consulta_cand_2024`, incluindo eleições suplementares | Substitui a pesquisa web da versão anterior |
| Perfil do eleitorado 2026 (idade, escolaridade, sexo) | TSE, `perfil_eleitorado` (jul/2026) | Na planilha mestre `data/tse/municipios_master.csv` |
| Economia, pautas e eventos locais | Pesquisa web por município (imprensa local, IBGE Cidades, prefeituras e câmaras) e planos de governo 2024 registrados no TSE | Fontes por município em `data/cenarios.csv` |

**Conferência com a versão anterior.** Na versão 1 os dados de 2026 vinham de compilações abertas (votocruzado e [tatipara/eleicao_2026_1turno](https://github.com/tatipara/eleicao_2026_1turno)). Os votos de Lula e Flávio batem com o TSE em todos os municípios, mas a compilação tinha 182.612 eleitores aptos a menos, espalhados em cerca de 1.650 municípios. Por isso a abstenção nacional sem exterior passa de 20,75% para **20,84%**, e a abstenção municipal muda até 1,26 p.p. em 247 municípios.

**Definições**

- **Margem**: % de Lula − % do candidato do PL, sobre votos válidos no 1º turno.
- **Swing**: margem de 2026 − margem de 2022, em pontos percentuais (p.p.). Valor negativo significa movimento para o PL.
- **Virada**: Lula à frente em 2022 e Flávio à frente em 2026, em votos. Empate exato não conta como virada.
- **Abstenção**: 1 − comparecimento / aptos. A média nacional oficial sem o exterior é **20,84%**.
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
| **2 · Reduto do 13 com alta abstenção** | Lula > 50% em 2026 e abstenção > 20,84% | Número absoluto de ausentes |
| **3 · Base Flávio, mas pendular** | Flávio ≥ 50%, abstenção < 20,84% e índice pêndulo ≥ 3 | Índice, depois tamanho |

Empates na ordenação são desfeitos pelo número de aptos (maior primeiro) e depois pelo código IBGE. São 100 municípios por cenário, 279 diferentes no total, porque há sobreposição entre os cenários 1 e 3.

**O que mudou nas listas com os dados oficiais.** O novo corte de abstenção (20,84%) e os aptos oficiais mudaram só um nome. No cenário 3, **Guarapuava/PR entra** (abstenção oficial 19,55%) e **Salgado Filho/PR sai**, empurrado para fora pela ordenação. Os cenários 1 e 2 não mudaram de composição. O detalhe está em `data/tse/diff_listas.csv`.

---

## 2. Panorama nacional

| Indicador | Valor |
|---|---|
| Municípios que viraram de Lula para Flávio (1T22 → 1T26) | **711**, mais 2 empates exatos |
| Municípios que viraram de Bolsonaro para Lula | **0** |
| Swing mediano por município | −11,1 p.p. |
| Municípios com Lula > 50% em 2026 | 2.401, dos quais 966 com abstenção acima da média |
| Municípios com Flávio ≥ 50% | 2.561 |
| Correlação abstenção 2026 × voto em Lula, Brasil | −0,02 (nula) |
| … Sul / Sudeste | **0,52 / 0,43** |
| … Centro-Oeste / Nordeste / Norte | 0,16 / 0,08 / −0,08 |
| Correlação Δ abstenção (22→26) × swing | **−0,21** |

A imprensa noticiou 714 viradas ([Diário de Cuiabá](https://www.diariodecuiaba.com.br/brasil/flavio-bolsonaro-conquista-714-cidades-que-tiveram-maioria-de-lula-em-2022/756906)). A diferença para os 711 daqui deve vir de critério: contar empates como virada, ou incluir o exterior.

As duas correlações sugerem duas coisas:

1. **No Sul e no Sudeste, quem falta são sobretudo eleitores de lugares onde o PT vai bem.** Nesses lugares, a abstenção é uma reserva potencial de votos para Lula. No Nordeste não há relação, e a abstenção é baixa.
2. **Onde a abstenção mais subiu desde 2022, o PT mais perdeu margem.** Os dados não mostram se isso aconteceu porque eleitores de Lula deixaram de votar ou porque os que votaram mudaram de lado.

---

## 3. Cenário 1: viraram para o PL

**Por estado:** MG 26 · PR 19 · RS 19 · PA 8 · GO 7 · SP 7 (top 100).

Os 15 primeiros:

| # | Município | Eleitores | Lula 22 → 26 | PL 22 → 26 | Swing | Prefeito 2024 (TSE) |
|---|---|---|---|---|---|---|
| 1 | São João do Triunfo/PR | 11.623 | 58,6 → 37,8 | 33,8 → 51,6 | −38,6 | Mario Cezar (PT) |
| 2 | Dom Feliciano/RS | 10.375 | 54,0 → 35,3 | 39,5 → 56,5 | −35,6 | Tiago Szortyka (PSB) |
| 3 | Senador José Porfírio/PA | 14.884 | 51,8 → 35,3 | 43,2 → 61,3 | −34,7 | Leonaldo (PSD) |
| 4 | Humaitá/AM | 34.907 | 52,6 → 39,5 | 41,1 → 54,9 | −27,0 | Dedei Lobo (União) |
| 5 | São Francisco de Assis/RS | 14.252 | 54,6 → 41,8 | 38,0 → 51,8 | −26,6 | Paulinho Salbego (PDT) |
| 6 | Soledade/RS | 21.730 | 49,5 → 36,5 | 43,9 → 57,4 | −26,5 | Paulo Cattaneo (MDB) |
| 7 | Balsas/MA | 71.213 | 51,7 → 38,4 | 43,2 → 55,5 | −25,6 | Alan da Marissol (PRD) |
| 8 | Tailândia/PA | 55.596 | 52,3 → 39,9 | 42,3 → 54,9 | −25,1 | Lauro (MDB) |
| 9 | Júlio de Castilhos/RS | 14.988 | 55,1 → 42,9 | 37,0 → 49,9 | −25,0 | Bernardo (PSDB) |
| 10 | Ouvidor/GO | 10.501 | 53,1 → 37,2 | 40,5 → 49,3 | −24,7 | Cebinha (Podemos) |
| 11 | Rio Paranaíba/MG | 11.055 | 51,1 → 38,6 | 43,0 → 55,1 | −24,5 | Adriano (**PL**) |
| 12 | Dom Pedrito/RS | 29.233 | 53,9 → 41,6 | 38,9 → 51,1 | −24,5 | Guiga (PP) |
| 13 | Turvo/PR | 11.863 | 58,2 → 45,9 | 34,8 → 46,7 | −24,2 | Marcos Seguro (PSD) |
| 14 | Bituruna/PR | 12.808 | 55,6 → 43,7 | 38,6 → 50,7 | −24,0 | Rodrigo Rossoni (PSDB) |
| 15 | Candói/PR | 12.050 | 55,5 → 42,8 | 39,8 → 50,4 | −23,3 | Dino (PSD) |

O que aparece neste cenário:

- **A virada se dá no interior pequeno e médio,** em geral com perfil agropecuário, com fumo, soja e pecuária no Sul.
- **O prefeito raramente é do PL: são 9 em 100,** a mesma proporção do país. Em 42 dos 100 o PL estava na coligação do prefeito eleito em 2024. O caso mais extremo, São João do Triunfo, tem prefeito do PT. A virada presidencial parece desligada da máquina municipal.
- **Choques locais aparecem com frequência nas pautas:**
  - estiagem 2025 no RS (Júlio de Castilhos, Jari, Lagoa Bonita do Sul, Novo Barreiro e outros), com quebra de soja na safra 25/26;
  - garimpo e operações da PF (Humaitá, onde a PF destruiu 71 dragas em set/2025), além da cheia de 2025;
  - mineração de ouro da Belo Sun, licenciada em 2026 (Senador José Porfírio);
  - BR-230 sem asfalto (Rurópolis);
  - ponte da BR-235 interditada (Pedro Afonso/TO);
  - crise fiscal municipal (Balsas, Coroatá) e processo de impeachment do prefeito (Santa Helena de Goiás);
  - enchente do rio Acre e decreto de emergência em dez/2025 (Feijó/AC).
- **Somados, os 100 municípios deram a Flávio 158.560 votos de vantagem.**

---

## 4. Cenário 2: reduto do 13 com alta abstenção

**Por estado:** MG 20 · BA 19 · MA 14 · AM 11 · PE 10 · AL 7.

**Soma dos 100 municípios:** 1.109.200 ausentes, contra uma vantagem de Lula de 1.150.533 votos. Desses ausentes, 135.887 são o excesso sobre a abstenção média nacional.

| # | Município | Eleitores | Lula 26 | Abst 22 → 26 | Ausentes | Prefeito 2024 (TSE) |
|---|---|---|---|---|---|---|
| 1 | Diadema/SP | 331.016 | 52,4 | 19,8 → 22,6 | 74.857 | Taka Yamauchi (MDB) |
| 2 | Rio Grande/RS | 150.202 | 56,2 | 24,2 → 27,3 | 41.012 | Darlene (PT) |
| 3 | Lauro de Freitas/BA | 163.871 | 59,1 | 21,3 → 22,9 | 37.542 | Débora Regis (União) |
| 4 | Francisco Morato/SP | 126.796 | 52,3 | 22,6 → 24,8 | 31.446 | Ildo Gusmão (Republicanos) |
| 5 | Alagoinhas/BA | 114.417 | 65,8 | 19,9 → 20,9 | 23.878 | Gustavo Carmo (PSD) |
| 6 | Codó/MA | 82.435 | 71,5 | 25,8 → 24,9 | 20.486 | Chiquinho FC (PT) |
| 7 | Paulo Afonso/BA | 83.620 | 75,0 | 25,7 → 21,9 | 18.276 | Mario Galinho (PSD) |
| 8 | Itacoatiara/AM | 76.067 | 59,0 | 22,9 → 23,3 | 17.682 | Mário Abrahim (Republicanos) |
| 9 | Manacapuru/AM | 81.115 | 51,4 | 20,8 → 21,0 | 17.036 | Valcileia Maciel (MDB) |
| 10 | Parintins/AM | 73.020 | 78,7 | 24,3 → 22,4 | 16.329 | Mateus Assayag (PSD) |
| 11 | Valença/RJ | 56.821 | 51,3 | 26,1 → 26,2 | 14.897 | Saulo Correa (MDB) |
| 12 | Januária/MG | 51.291 | 70,7 | 30,0 → 28,7 | 14.736 | Maurício Almeida (Podemos) |
| 13 | Pinheiro/MA | 62.812 | 68,4 | 22,8 → 23,3 | 14.646 | André da Ralpnet (Podemos) |
| 14 | Candeias/BA | 64.825 | 77,7 | 19,8 → 21,6 | 13.997 | Eriton Ramos (PP) |
| 15 | Ouro Preto/MG | 64.302 | 60,9 | 18,5 → 21,5 | 13.819 | Angelo Oswaldo (PV) |

O que aparece neste cenário:

- **Dois perfis distintos.**
  - O primeiro são periferias metropolitanas e cidades médias industriais: Diadema, Francisco Morato, Rio Grande, Lauro de Freitas, Candeias. Nelas a abstenção **subiu** em relação a 2022.
  - O segundo é o interior do Norte e Nordeste, com longas distâncias e transporte fluvial: Amazonas, Maranhão, norte de Minas. Ali a abstenção já era alta e às vezes caiu.
- **Pautas dominantes:**
  - saúde: Hospital Nair Alves de Souza em Paulo Afonso, Hospital Jorge Novis em Lauro de Freitas, Hospital Deraldo Guimarães em Almenara, Casa de Caridade Leopoldinense em Leopoldina, Hospital Geral de Codó atingido por temporal em jan/2026;
  - água e seca: Adutora do Agreste em PE, decreto estadual de 30/06/2026 que declarou emergência por estiagem em 75 municípios pernambucanos, falta d'água e esgoto em Penedo e Delmiro Gouveia (AL);
  - enchentes e áreas de risco: drenagem e córregos em Diadema, deslizamento que descarrilou um trem da CPTM em Francisco Morato (fev/2025), enchente em Barreiros/PE (ago/2025);
  - crise fiscal municipal: calamidade financeira em Lauro de Freitas, queda de ICMS em São Francisco do Conde, dívida de mineradoras de lítio com Araçuaí;
  - passivos industriais e ambientais: contaminação por chumbo em Santo Amaro (BA), barragem em risco em Porteirinha (MG), potássio em Autazes (AM);
  - segurança e garimpo no Amazonas, onde o prefeito de Coari foi afastado pelo STF e depois reconduzido.
- **O PL é fraco nas câmaras municipais deste cenário:** em média 4,6% das cadeiras de vereador, contra 8,4% no país. Ainda assim, 5 desses municípios têm prefeito do PL e Lula venceu neles.
- **Pesquisa sobre transporte gratuito no dia da eleição:** em 2022, segundo o Ipea, ele não aumentou o comparecimento. Em 2026 já é obrigatório por resolução do TSE. Ver `research/`.

---

## 5. Cenário 3: base Flávio, baixa abstenção, mas pendular

**Por estado:** RS 34 · PR 16 · TO 13 · SC 12 · MG 8 · SP 6.

| # | Município | Eleitores | Histórico | Índice | Flávio 26 | Abst 26 | Prefeito 2024 (TSE) |
|---|---|---|---|---|---|---|---|
| 1 | São João do Triunfo/PR | 11.623 | H-L-F | 5 | 51,6 | 17,3 | PT |
| 2 | Jari/RS | 2.794 | H-L-F | 5 | 52,7 | 19,0 | MDB |
| 3 | Canudos do Vale/RS | 1.944 | H-L-F | 5 | 53,2 | 13,3 | PSB |
| 4 | São Miguel da Boa Vista/SC | 1.757 | H-L-F | 5 | 51,5 | 17,3 | **PL** |
| 5 | Balsas/MA | 71.213 | H-L-F | 4 | 55,5 | 20,1 | PRD |
| 6 | Dom Eliseu/PA | 30.137 | H-L-F | 4 | 53,0 | 20,0 | União |
| 7 | Ulianópolis/PA | 20.159 | H-L-F | 4 | 54,4 | 20,2 | MDB |
| 8 | Belterra/PA | 17.778 | H-L-F | 4 | 51,9 | 19,3 | MDB |
| 9 | Itinga do Maranhão/MA | 17.555 | H-L-F | 4 | 51,2 | 19,0 | PP |
| 10 | Carmópolis de Minas/MG | 13.900 | B-L-F | 4 | 51,8 | 15,2 | União |

O que aparece neste cenário:

- **São lugares que votaram em Haddad em 2018 e em Lula em 2022, e agora deram maioria a Flávio** com comparecimento alto. Pela definição, é o retrato mais próximo de um swing voter.
- **A maioria são municípios pequenos de agricultura familiar do Sul,** em especial no noroeste gaúcho, sudoeste do PR e oeste de SC, além da fronteira agrícola do Pará e Maranhão.
- **As pautas mais frequentes** são estiagem e quebra de safra, saúde, estradas rurais e emprego ligado ao agro. Exemplos recentes:
  - emergência por estiagem reconhecida pelo governo federal em abr/2025 em Nova Itaberaba e Paial (SC), e em 2026 em Nova Prata do Iguaçu e Planalto (PR);
  - em Marmeleiro/PR, granizo em 30/08/2026 atingiu cerca de 848 casas, com emergência reconhecida em 16/09/2026;
  - temporal no próprio dia da eleição (04/10/2026) no Sudoeste do Paraná, com cerca de 91,6 mil desligamentos de energia; segundo o TRE-PR, as urnas funcionaram com bateria;
  - demandas regionais da Carta do Sudoeste 2026 da associação de municípios (Amsop): aeroporto em Renascença e porto seco em Santo Antônio do Sudoeste.
- **10 dos 100 têm prefeito do PL,** quase todos no PR e em SC.
- **Somados, os 100 municípios deram a Flávio 92.371 votos de vantagem.**

---

## 6. PL local

Na versão anterior, a lista de prefeitos vinha de pesquisa web e só encontrava 11 do PL. Pela base oficial do TSE, **são 21 prefeitos do PL entre os 279 municípios**:

| Município | Prefeito (nome de urna) | Cenário |
|---|---|---|
| Rio Paranaíba/MG | Adriano | 1 |
| Palmital/PR | Roberto Rossi | 1 |
| Santo Augusto/RS | Lilian Fontoura Depiere | 1 |
| Nova Olímpia/MT | Ari Candido Batista | 1 |
| Indiara/GO | Dr Conin | 1 |
| Posse/GO | Paulo Trabalho | 1 |
| Miranorte/TO | Leandro Barbosa | 1 e 3 |
| Marmeleiro/PR | Jander Loss | 1 e 3 |
| Santo Antônio do Sudoeste/PR | Ricardinho | 1 e 3 |
| Guarapuava/PR | Denilson Baitala | 3 |
| Ventania/PR | Zelio | 3 |
| Palma Sola/SC | Marcio | 3 |
| São Miguel da Boa Vista/SC | Vanderlei Bonaldo | 3 |
| Herveiras/RS | Nazario | 3 |
| Silveiras/SP | Edson Mota | 3 |
| Campo Alegre de Goiás/GO | Douglas Sertório | 3 |
| Lábrea/AM | Gerlando Lopes | 2 |
| Leopoldina/MG | Pedro Augusto | 2 |
| Tutóia/MA | Viriato Cardoso | 2 |
| Viana/MA | Carrinho Cidreira | 2 |
| Zé Doca/MA | Flavinha Cunha | 2 |

Quatro observações:

- **A fatia de prefeitos do PL nos cenários é a mesma do país.** No Brasil, 9,3% dos prefeitos eleitos em 2024 são do PL. Nos cenários a fatia é de 9% (cenário 1), 5% (cenário 2) e 10% (cenário 3).
- **Cinco desses prefeitos estão em municípios do cenário 2.** Ali Lula venceu mesmo com prefeito do PL.
- **Partidos dos prefeitos entre os 279:** MDB 52, PP 44, PSD 30, Republicanos 25, União 23, PL 21, PDT 18, PT 13, PSB 13 e PSDB 12. O PL estava na coligação do prefeito eleito em 88 dos 279.
- **Todos os 242 prefeitos com partido confirmado pela pesquisa web batem com o TSE** (`data/tse/prefeitos_web_vs_tse.csv`). Três municípios selecionados tiveram eleição suplementar depois de 2024: Cruzeiro do Iguaçu/PR, Guará/SP e Oiapoque/AP. Neles vale o prefeito da eleição mais recente.

Os candidatos do PL em 2026 em cada município (governador, Senado e deputados, com a % local) e os vereadores do PL por município estão na planilha.

---

## 7. Para o 2º turno (25/10)

Os números abaixo vêm de `data/segundo_turno/resumo.json`, calculados sobre os dados oficiais sem o exterior. Eles descrevem o tamanho dos grupos de eleitores, não para onde esses votos irão.

- **A diferença nacional no 1º turno foi de 2.238.452 votos a favor de Flávio.**
- **Fora dos dois finalistas ficaram:**
  - 32,89 milhões de ausentes;
  - 9,29 milhões de votos em terceiros: Cury 3,44 milhões, Renan 2,67 milhões, Caiado 2,60 milhões e Zema 0,32 milhão;
  - 5,96 milhões de brancos e nulos.
- **No voto só entre os dois finalistas, Lula teve 48,98% no 1º turno.**
- **Referência de 2022:** a fatia de Lula entre os dois finalistas foi de 52,85% no 1º turno para 50,90% no 2º, uma perda de 1,95 p.p. entre os turnos. Ela caiu em 97,9% dos municípios.
- **Há 2º turno para governador em AC, AM, DF, ES, RJ, RN e TO,** o que mantém uma segunda disputa na urna nesses estados.

---

## 8. Limites e pendências

- **Cobertura da pesquisa local**, em 08/10/2026:
  - os 279 municípios têm prefeito e vereadores pela base oficial do TSE;
  - os 279 foram pesquisados; 243 têm pautas com fonte (imprensa, órgão público ou plano de governo) e 36 seguem só com lacunas;
  - a confiança declarada é alta em 6, média em 109 e baixa em 164;
  - a lista do que falta está em `data/pendencias.csv`.
- **"Pautas" vêm de imprensa local, sites de prefeitura e câmara e planos de governo,** não de pesquisas de opinião.
  - Várias são institucionais, ou seja, o que a prefeitura divulga, e estão marcadas como "agenda da prefeitura".
  - As que vêm dos planos de governo de 2024 começam com "[plano de governo 2024]".
  - Cada município tem um campo de confiança, e a maioria está em confiança baixa ou média.
- **A classificação dos cenários depende de cortes arbitrários,** como 10 mil eleitores, 20,84% de abstenção e o índice ≥ 3. A base completa permite refazer as listas com outros critérios.
- **Os votos de 2018 e 2022 vêm de compilação aberta** conferida com uma segunda base e com o arquivo de comparecimento do TSE. Os de 2026 são oficiais.

## Arquivos

- `outputs/eleitor_pendular_2026.xlsx`: planilha com os 3 cenários, as pautas, o prefeito pelo TSE ao lado do prefeito da pesquisa web e a base completa. Recalcule as fórmulas ao abrir.
- `data/base_municipios.csv`: os 5.570 municípios com todos os indicadores.
- `data/cenarios.csv`: os 300 registros dos cenários com números oficiais, prefeito pelo TSE, pesquisa local e fontes.
- `data/tse/municipios_master.csv`: a base mestre oficial, com cerca de 160 colunas por município.
- `data/pesquisa_local.json`: a pesquisa consolidada. A pesquisa bruta por rodada está em `data/pesquisa_bruta/` (`lote_*`, `r2_*`, `r3_*`, `r4_planos_*`).
- `data/segundo_turno/`: a visão para o 2º turno.
- `docs/`: o mapa interativo dos cenários.
- `research/`: o relatório de contexto anterior (literatura, abstenção, perfis demográficos), com as notas.
