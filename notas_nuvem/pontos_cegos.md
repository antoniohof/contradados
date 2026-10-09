# Pontos cegos dos dados — auditoria (08/10/2026)

Base: 5.570 municípios, 157,8 milhões de eleitores (sem exterior). Cada município recebe códigos em `al` (build/build.py) que o site mostra na ficha e no relatório (`#m-<IBGE>`, `#uf-<UF>`).

## Por município

| Código | O que falta / distorce | Municípios | Eleitores |
|---|---|---:|---:|
| s | Sem pesquisa local de pautas | 5.266 | 149,8 mi (95%) |
| j | Votos sub judice p/ governador ou senado no estado (18 UFs) | 4.206 | 124,7 mi (79%) |
| p | Menos de 5 mil eleitores (percentuais instáveis) | 1.432 | 4,9 mi |
| i | 70+ acima de 15% (voto facultativo, abstenção estrutural) | 610 | 14,9 mi |
| e | Eleitorado mudou >15% desde 2022 | 193 | 3,1 mi |
| b | Pautas com confiança baixa | 178 | 4,1 mi |
| a | Abstenção >30% (possível cadastro desatualizado) | 119 | 1,1 mi |
| g | Pautas tiradas do plano de governo do prefeito | 29 | 1,0 mi |
| f | Prefeito não achado no TSE 2024 (inclui Brasília e Noronha, que não têm) | 19 | 2,7 mi |
| t | Empate exato Lula × Flávio | 2 | 3,5 mil |

O maior buraco: **95% dos votos em jogo (20,5 de 21,6 milhões) estão em municípios sem pesquisa local**, incluindo 529 dos 711 que viraram para o PL.

## No modelo (vale para todos)

1. Repasse de terceiros = média nacional Quaest (02–03/10). Sem recorte regional ou municipal.
2. Falácia ecológica: dados de lugar, não de pessoas. Não prova que o mesmo eleitor mudou.
3. Renda, religião e urbano/rural agora vêm do Censo 2022 (IBGE/SIDRA, tabelas 9923, 9537, 10295 e 10297), mas descrevem a população toda, não só eleitores. Ainda falta Bolsa Família/CadÚnico por município. Perfil do eleitorado de 2026 usado também para 2022.
4. Exterior (916 mil eleitores) fora.
5. "Ausentes extras" usa a menor abstenção desde 2018; não separa cadastro morto de desinteresse.
6. Sem pesquisas de 2º turno com recortes por grupo ainda.

## Próximos passos sugeridos (agentes locais)

- Bolsa Família/CadÚnico por município (Censo 2022 já incluído). Correlação entre municípios: renda mediana × voto em Lula 2026 = −0,83; parcela da renda de fora do trabalho × Lula = +0,79; % evangélicos × Lula = −0,36.
- Pesquisa local de pautas para os 529 municípios que viraram e ainda estão sem `pau`, priorizando os de maior `jogo`.
- Quando sair pesquisa de 2º turno por região, trocar o repasse nacional por regional.
