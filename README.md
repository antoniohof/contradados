# Votos em jogo · Brasil 2026

Mapa e dados do voto presidencial por município. Retrato de 08/10/2026,
antes do segundo turno. Análise territorial; os cenários não são previsões.

## Abrir o site

```bash
cd eleitor-pendular-2026  # se você estiver na pasta externa
python3 -m http.server 8000 --directory site_simples
```

Abra http://localhost:8000. Sem instalação de dependências.

## Desenvolver

- `site_simples/index.html` — página principal.
- `site_simples/style.css` — branco, títulos Georgia, vermelho e azul.
- `site_simples/app.js` — mapa, busca, ranking e fichas.
- `site_simples/relatorio.js` — relatórios e fontes.
- `site_simples/build/` — geração dos JSONs.
- `docs/` — interface analítica adicional.

Após alterar os dados:

```bash
python3 site_simples/build/build.py
python3 scripts/validate.py
node --check site_simples/app.js
node --check site_simples/relatorio.js
```

O build é offline e usa apenas Python padrão. O pipeline de análise exige
Python 3.10+ e os pacotes de `requirements.txt`.

## Publicar

Envie `main` ao GitHub. Em **Settings → Pages**, escolha **GitHub Actions**.
Execute **Actions → Publish GitHub Pages → Run workflow**.

A página principal publica `site_simples/`; a interface adicional fica em
`/mapas/`. **Validate** verifica cada push e pull request. Publicação manual.

## Dados e método

Fontes: TSE, IBGE/Censo 2022 e pesquisas citadas nos dados.
A base oficial tem 5.571 registros; o site compara 5.570 municípios.
Boa Esperança do Norte/MT não tem histórico de 2022. Exterior excluído.

“Votos em jogo” combina mudança da parcela de voto, terceiros, brancos/nulos
e abstenção excedente. Não identifica pessoas que trocaram de voto.

- [Relatório](RELATORIO.md)
- [Planilha](outputs/eleitor_pendular_2026.xlsx)
- [Base oficial](data/tse/municipios_master.csv)
- [Guia para continuar](HANDOFF.md)

`notas_nuvem/` e `estrategias_2t/` preservam pesquisa exploratória;
não alimentam a publicação automaticamente. ZIPs brutos do TSE ficam fora
do Git; configure `TSE_RAW` para reproduzir o pipeline completo.

Sem licença definida para o código. Materiais de terceiros mantêm suas
condições de uso.
