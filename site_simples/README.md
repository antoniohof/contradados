# Votos em jogo — site público

Site estático em português, com busca, mapa, rankings e relatórios por município
(`#m-<IBGE>`) e estado (`#uf-<UF>`). HTML, CSS e JavaScript sem bibliotecas externas.
Os números são um retrato de 08/10/2026; “votos em jogo” e “saldo potencial” são
estimativas de cenário, não previsão nem contagem de pessoas que mudaram de voto.

Na raiz do repositório:

```bash
python3 site_simples/build/build.py
python3 scripts/validate.py
python3 -m http.server 8000 --directory site_simples
```

Abra http://localhost:8000. Não abra `index.html` diretamente: o site usa `fetch`.
O build usa apenas a biblioteca padrão do Python, resolve os caminhos a partir
do arquivo e funciona sem rede. Argumento opcional: pasta com os dados de `docs/`.

- `build/build.py`: projeta a malha, calcula cenários e incorpora comparações de
  governador de `docs/data/extra.json`, aptos históricos da base oficial e Censo.
- `build/socio.py`: função de enriquecimento com o Censo 2022.
- `data/`: JSON gerados e versionados; o build não deve produzir diferenças
  quando os insumos não mudam.
- `relatorio.js`: relatórios e ressalvas de cobertura e método.
- `_headers`: cabeçalhos usados no Cloudflare; GitHub Pages não interpreta esse arquivo.

O site comparativo tem 5.570 municípios. Boa Esperança do Norte/MT está na base
oficial de 5.571, mas fica fora dessa vista porque não tem histórico de 2022.
Os dados censitários descrevem a população, e os do TSE descrevem o eleitorado.

Para GitHub Pages, siga o [README principal](../README.md). O mapa analítico de
`docs/` é publicado em `/mapas/` pelo mesmo workflow.

`publicar.sh` é uma alternativa para Cloudflare Pages; requer Node, Wrangler e
uma conta autenticada. Não é necessário para publicar no GitHub.
