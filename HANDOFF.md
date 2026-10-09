# Para continuar — Antonio

Site atual: `site/` (Cloudflare, publica a cada push na `main`). Comece pelo [README](README.md).
Versão anterior: `site_simples/` e `docs/`, publicadas em `/arquivo/` (copiadas por `scripts/site/montar_arquivo.mjs`).
As notas abaixo descrevem a versão anterior e o pipeline de análise.

- Visual: fundo branco, Georgia nos títulos, vermelho `#c4001a`, azul `#0050c8`.
- Texto: rótulos curtos; contexto longo em seções expansíveis.
- Layout: mapa fixo à esquerda; fichas, relatórios e navegação no painel direito com rolagem própria.
- Mapa: zoom/arraste/pinça, foco no município e modo ampliado.
- Dados: não foram alterados pela revisão visual.
- Build: `python3 site_simples/build/build.py`.
- Validar: `python3 scripts/validate.py` e `node --check` nos dois JS do site.
- Publicar: workflow manual **Publish GitHub Pages**.

O build do site usa os dados processados versionados. Recalcular análises exige
`requirements.txt` e os ZIPs do TSE em `TSE_RAW`.

## Pipeline de análise

Na raiz do repositório, com as dependências instaladas:

```bash
python3 scripts/build.py
python3 scripts/lists.py
python3 scripts/merge.py
python3 scripts/export_csv.py
python3 scripts/make_xlsx.py
```

Os scripts oficiais ficam em `scripts/tse/` (01 a 06, nessa ordem).
`segundo_turno.py` e `scripts/demografia/` geram análises complementares.
Após gerar a planilha, recalcule as fórmulas em Excel ou LibreOffice.

## Antes de atualizar

- Preserve fontes e a distinção entre cenário e resultado observado.
- Dados municipais não provam mudança de voto individual.
- Abstenção nacional sem exterior: 20,84% no retrato atual.
- “Virada” compara votos; os dois empates não contam.
- `notas_nuvem/` e `estrategias_2t/` são rascunhos, com bases e hipóteses distintas.
- Novos resultados exigem revisar datas, parâmetros e textos, além dos JSONs.

Pendências de pesquisa: Bolsa Família/CadÚnico e maior cobertura local.
Não foram incluídas na revisão da interface.
