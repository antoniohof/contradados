# Handoff: instructions for the coding agent

You are continuing a data project about **swing voters ("eleitor pendular") in Brazil's 2026 presidential election**. The 1st round was on 04/10/2026, Flávio Bolsonaro (PL) 47.03% vs Lula (PT) 45.16%. The 2nd round is on 25/10/2026. The owner is an artist/creative developer. Keep the analysis **descriptive and politically neutral**. Write user-facing text in **Portuguese**.

Read `RELATORIO.md` first, then this file.

## Repo layout

```
RELATORIO.md            full report (PT)
HANDOFF.md              this file
data/raw/               compiled TSE data (inputs to the pipeline)
data/base*.json         generated municipal base
data/base_municipios.csv  5,570 municipalities × all indicators
data/listas.json        the 3 scenario lists (IBGE codes, ranked)
data/cenarios.csv       300 scenario rows + local research + sources
data/pesquisa_bruta/    raw per-batch research JSON (round 1 = lote_*, round 2 = r2_*)
data/pesquisa_local.json  merged research (output of merge.py)
data/pendencias.csv     what is still missing (mayor / pautas / not researched)
scripts/                pipeline
prompts/                prompt used for the per-municipality web research
outputs/eleitor_pendular_2026.xlsx
research/               earlier context report + notes (literature, abstention, polls)
```

## Pipeline (run from repo root, Python 3.10+, openpyxl)

```bash
./scripts/fetch_sources.sh        # optional: re-download raw inputs from GitHub
python3 scripts/build.py          # -> data/base.json (cross-checks 2022 and 2026 against 2nd source; prints divergences)
python3 scripts/lists.py          # -> data/base_enriquecida.json, data/listas.json (3 scenarios)
python3 scripts/merge.py          # -> data/pesquisa_local.json (merges data/pesquisa_bruta/*)
python3 scripts/export_csv.py     # -> data/base_municipios.csv, data/cenarios.csv
python3 scripts/make_xlsx.py      # -> outputs/eleitor_pendular_2026.xlsx
python3 scripts/segundo_turno.py   # -> data/segundo_turno/ (2nd-round view; after scripts/tse/04_master.py)
```

**After `make_xlsx.py`, recalculate the formulas.** Open the file in LibreOffice or Excel and save it, or run `soffice --headless --convert-to xlsx`. If you skip this, the summary and swing cells show empty in previews.

## Key definitions (do not change silently)

- `margem = lula% − PL%` of valid votes, 1st round. `swing = margem26 − margem22`. Negative values mean a shift toward the PL.
- `abst = 1 − comparecimento/aptos`. The national average without voters abroad is 20.75%.
- `hist` = winner in the 2nd round of 2018 (H/B), the 2nd round of 2022 (L/B), and the 1st round of 2026 (L/F).
- `pendulo_score` (0–5): one point each for H in 2018, L in 2022, swing ≤ −15, third-party vote ≥ 8%, and |margem26| ≤ 20.
- Scenarios:
  - **S1**: Lula won in 2022 and Flávio won in 2026, with aptos ≥ 10k. Sorted by swing.
  - **S2**: Lula > 50% and abst > 20.75. Sorted by absolute number of absentees.
  - **S3**: Flávio ≥ 50%, abst < 20.75 and score ≥ 3. Sorted by score, then size.
- Bug already fixed: `virou` must compare the **sign of the margin**, not winner names (2022 says "Bolsonaro", 2026 says "Flávio").

## Open tasks, in priority order

1. **Mayors 2024 from official TSE data.** This replaces the web guesses.
   - Download `https://cdn.tse.jus.br/estatistica/sead/odsele/consulta_cand/consulta_cand_2024.zip` and read `consulta_cand_2024_BRASIL.csv` (`;`-separated, latin-1).
   - Filter `DS_CARGO == 'PREFEITO'` and `DS_SIT_TOT_TURNO` containing `ELEITO`. Use the 2nd-round row where there was one.
   - Map `SG_UE` (TSE municipality code) to IBGE. `data/raw/tatipara_presidente_2026_municipios_wide.csv` has `cd_tse` and `cd_ibge`.
   - Also count `VEREADOR` elected per party, especially PL.
   - Add these columns: `prefeito_tse`, `partido_tse`, `vereadores_PL`, `vereadores_total`. Flag every row where the web value differs from the TSE value.
   - Watch for supplementary elections in 2025–26, for example Oiapoque/AP and Cruzeiro do Iguaçu/PR. `obs` mentions them.
2. **Fill missing pautas** for the rows in `data/pendencias.csv`: 117 rows are missing pautas, and 12 were never researched.
   - Use `prompts/prompt_pesquisa_local_r2.txt` as the template.
   - Keep the JSON schema: `ibge, municipio, uf, prefeito_2024, partido_prefeito, pl_local, economia, pautas[], eventos, fontes[], confianca, obs`.
   - Save new batches as `data/pesquisa_bruta/r3_*.json`, then rerun `merge.py`, `export_csv.py` and `make_xlsx.py`.
   - Never invent URLs. Many items marked "conhecimento geral / não verificado" in `economia` need a real source.
3. **Normalize party names** (`Podemos`/`PODE`, `União Brasil`/`UNIÃO`, `Republicanos`/`REPUBLICANOS`). Strip vote shares that some researchers put inside `prefeito_2024`.
4. **Re-verify the electoral numbers** against the official TSE files when they appear on dadosabertos.tse.jus.br (`votacao_secao_2026`, `detalhe_votacao_munzona_2026`). The current inputs are third-party compilations that were cross-checked with zero divergence.
5. **Visualizations** for the artistic/data-viz project:
   - municipal choropleth of swing;
   - abstention × Lula scatter by region (correlations: Sul 0.52, Sudeste 0.43, Nordeste 0.08);
   - "flow" between 2018/2022/2026 using `hist`;
   - small multiples per scenario.

   Municipal geometries: the TopoJSON files in `lfbl-cp/painel-eleicoes-2026/output/geo/`, or `geobr` (IPEA).
6. **Second round (25/10/2026):** `scripts/segundo_turno.py` (needs pandas) reads `data/tse/municipios_master.csv` and writes `data/segundo_turno/` (`municipios_2t.csv`, `uf_2t.csv`, `cenarios_2t.csv`, `porte_2t.csv`, `resumo.json`). Today it covers the 1st-round gap, the reserve per place (absentees + third parties + blank/null), the 2022 between-round precedent and the governor runoffs.
   - On 25/10, re-download `votacao_candidato_munzona_2026.zip` and `detalhe_votacao_munzona_2026.zip` into `TSE_RAW/tse_2026/` and rerun the script. It detects `NR_TURNO == "2"` and adds `*_t2` columns plus the deltas `d_abst_26`, `d_lula2p_26` and `d_gap_26`, at municipality, UF and scenario level.
   - `lula2p` = Lula / (Lula + PL) in p.p., so the 1T and 2T shares compare on the same basis.
   - In 2022, Lula's two-party share fell between rounds in 97.9% of municipalities, from 52.85 to 50.90 nationally. Read the 2026 deltas against that precedent.
   - Local factors on 25/10 that can move turnout:
     - Governor runoffs in AC, AM, DF, ES, RJ, RN and TO. In RJ, Garotinho's 274k votes are "anulado sub judice"; Ruas has 49.27% counting them and 50.88% of valid votes without them (see `data/tse/estados_2026.csv`, `pct_com_sub_judice`).
     - A supplementary mayoral election in Narandiba/SP. Flag it before reading its d_abst_26.

## Gotchas

- TSE results JSON (`resultados.tse.jus.br`) disallows automated access in robots.txt. Use the open-data CDN files instead.
- `data/raw/votocruzado_appdata.json` field codes, per municipality `mun[]`:
  - `te` = aptos, `cp` = comparecimento.
  - `p` = presidente 2026, ordered as `presLabels` (Flávio, Lula, Cury, Renan, Caiado, Zema, esquerda nanicos, DC, branco, nulo).
  - `h22` = [Bolsonaro, Lula, outros, válidos, brancos, nulos, comparecimento, aptos, Bolso 2T, Lula 2T, válidos 2T, _, _, comparecimento 2T, aptos 2T].
  - `h18` = [Bolsonaro, Haddad, Ciro, Alckmin, outros, válidos, brancos, nulos, comparecimento, aptos, Bolso 2T, Haddad 2T, válidos 2T, _, _, comparecimento 2T, aptos 2T].
  - `g` / `s` = governador / Senado votes, ordered as `ufs[uf].gov` / `ufs[uf].sen`, followed by brancos and nulos.
- Ecological fallacy: talk about places, not about individuals changing their vote.
