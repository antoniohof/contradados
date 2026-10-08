# Coordenação entre agentes

Este arquivo é o canal de comunicação entre:
- **Agente local (VS Code)**: roda scripts, baixa dados do TSE, faz commits.
- **Agente na nuvem (Claude, acionado pelo celular do Alberto)**: lê esta pasta pela ponte com o Mac, analisa, pesquisa na web e escreve arquivos de volta. Ele **não** consegue rodar comandos neste Mac no momento (só ler/escrever arquivos), nem conversar com você diretamente.

## Protocolo
1. **Ao começar cada tarefa, leia este arquivo.** Ao terminar, acrescente uma linha em "Log" (data/hora, quem, o que mudou, arquivos).
2. Pedidos de um agente para o outro vão em "Caixa de entrada" com `[ ]`. Quem fizer marca `[x]` e escreve o resultado embaixo.
3. Não editem o mesmo arquivo ao mesmo tempo: o agente na nuvem só escreve em `eleitor-pendular-2026/notas_nuvem/` e neste arquivo, a menos que um pedido diga outra coisa.
4. Neutralidade e fontes: descrever, não opinar; nunca inventar números ou URLs.

## Estado atual (visto pelo agente na nuvem em 08/10/2026 ~18:10)
- Base oficial TSE já baixada localmente (consulta_cand_2024, votacao_candidato_munzona_2024, detalhe_votacao_munzona 2022/2026, propostas de governo 2024 de AL/GO/MA/MS).
- `data/processed/poder_local_2024.csv` resolve prefeitos e vereadores 2024 por município (tarefa 1 do HANDOFF = feita).
- Em andamento: `segundo_turno.py`, `canais_sites.py`, rodada 4 de pautas via planos de governo, site em `docs/index.html`.

## Mudança de foco (pedido do Alberto, 08/10 18:13)
Imprensa local deixa de ser prioridade. O foco agora é:
(a) mapear os **elos fracos demográficos**: segmentos do eleitorado em que o voto no PL é mais mole ou caiu;
(b) mapear os **candidatos do campo bolsonarista e suas fraquezas**. A nuvem cuida de (b). O agente local cuida de (a), porque os arquivos grandes estão neste Mac.

## Quem faz o quê no Mac (sessões locais; coordenação: elei-es-bb, 08/10 ~18:25)
- **elei-es-31:** dados oficiais TSE (`scripts/tse/`, `data/tse/`), site `docs/` (já com a aba "2º turno: a reserva") e agora os **elos fracos (a)** em `data/demografia/` e `scripts/demografia/`.
- **elei-es-28:** pesquisa local, planilha e `RELATORIO.md` (v2 com números oficiais). Termina a rodada r5 (36 municípios sem pautas com fonte) e depois faz a versão **municipal** de (a) (ver abaixo).
- **elei-es-32:** canais públicos institucionais (prefeitura e câmara) em `data/canais/`. Links de convite de grupos de WhatsApp/Telegram ficam **fora** até decisão do Alberto. A imprensa local foi rebaixada: fecha o que está rodando e não abre mais lotes.
- **elei-es-bb:** coordenação e camada do 2º turno (`scripts/segundo_turno.py` → `data/segundo_turno/`: reserva × gap, precedente de 2022, porte, 2º turno para governador). Roda de novo em 25/10 com os resultados do 2T.
- Disco do Mac quase cheio (~1 GB livre): ler zips do TSE em streaming, sem descompactar.
- **Para a nuvem, sobre (b):** `data/tse/estados_2026.csv` traz os 4 primeiros para governador e Senado por UF, com a situação ("2º TURNO", "ELEITO"). `data/tse/municipios_master.csv` traz por município `gov_PL_candidato`/`gov_PL_pct` e `sen_PL_candidato`/`sen_PL_pct`. Os pontos fracos territoriais de cada candidato do PL podem vir daí, sem precisar de pesquisa web.

## Caixa de entrada — para o agente local (VS Code)
- [ ] **PRIORIDADE — Elos fracos demográficos (inferência ecológica por zona eleitoral).**
  - Dados: `data/raw/tse_2026/perfil_eleitorado_2026.zip` (faixa etária, gênero, escolaridade, estado civil por município/zona/seção) + votos por zona (`votacao_candidato_munzona_2026` / `detalhe_votacao_munzona_2026` e os de 2022).
  - Passo 1 — Montar uma tabela por **zona eleitoral** (ou seção, se der) com:
    - as % de cada faixa etária (16–17, 18–24, 25–34, 35–44, 45–59, 60–69, 70+);
    - as % por gênero;
    - as % por escolaridade (até fundamental / médio / superior);
    - voto Flávio 2026, voto Bolsonaro 2022, abstenção 2022/2026, brancos/nulos e terceiros.
  - Passo 2 — Regressões simples / correlações dentro de cada UF e região, com 4 variáveis-alvo:
    - (i) swing para o PL;
    - (ii) Flávio 2026 − Bolsonaro 2022, ou seja, onde Flávio ficou **abaixo** de Jair;
    - (iii) alta de abstenção;
    - (iv) voto em terceiros (Renan, Caiado, Cury).
  - Passo 3 — Saídas:
    - `data/demografia/zonas.csv`;
    - `data/demografia/elos_fracos.csv`, com os segmentos × território em que o PL é mais fraco ou perdeu terreno, e o tamanho de cada um em eleitores;
    - um resumo em `notas_local/elos_fracos.md`.
  - Ressalva obrigatória: são correlações entre territórios (falácia ecológica), não comportamento individual.
  - **Em andamento (agente local TSE/mapas, 08/10 18:25):** saídas em `data/demografia/`, `scripts/demografia/` e `notas_local/elos_fracos.md`.
- [x] (mantido) Confirme a base eleitoral oficial do projeto (`data/tse/municipios_master.csv`?) e se S1/S2/S3 foram recalculados com ela.
  - **Sim.** A base oficial é `data/tse/municipios_master.csv` (5.571 municípios, arquivos do CDN do TSE gerados em 08/10).
  - As listas S1/S2/S3 foram recalculadas com ela: `data/tse/listas_oficial.json`, com limiar de abstenção de 20,84% (sem o exterior). `data/listas.json` já é idêntico.
  - Única mudança de membros: Guarapuava/PR entra em S3 e Salgado Filho/PR sai.
  - São 711 viradas Lula→Flávio e 2 empates exatos (Trabiju/SP 574×574 e Crixás do Tocantins/TO 679×679).
  - Totais oficiais:
    - sem o exterior: Flávio 55.960.603 × Lula 53.722.151, abstenção 20,84%;
    - com o exterior: 56.104.503 × 53.879.538 (47,03% × 45,16%), abstenção 21,08%.
  - Site de mapas: `docs/` (commit c3db123).
- [ ] (rebaixado) Pautas por imprensa/planos de governo: só se sobrar tempo.

## Caixa de entrada — para o agente na nuvem
- (vazio)

## Log
- 08/10 ~18:45 · local (elei-es-28) · (a) passada municipal: `scripts/elos_municipal.py` → `data/demografia/municipal_{correlacoes,ols,segmentos,base}.csv`. Achados enviados a elei-es-31 para `notas_local/elos_fracos.md`. RELATORIO v2 com números oficiais; rodada r5 (36 municípios) em andamento, depois sem novas rodadas de pesquisa.
- 08/10 18:25 · local (elei-es-bb) · Registrou a divisão entre as sessões locais e os insumos para (b); pautas e imprensa rebaixadas, conforme a mudança de foco.
- 08/10 18:15 · nuvem · Registrou a mudança de foco pedida pelo Alberto; tarefa de demografia para o local; nuvem começa a mapear candidatos do campo bolsonarista (2º turno de governador + senadores + Flávio).
- 08/10 18:10 · nuvem · Criou este arquivo. Leu o estado da pasta. Nenhum arquivo do projeto foi alterado.
