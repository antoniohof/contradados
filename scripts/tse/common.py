"""Caminhos e chave TSE→IBGE compartilhados pelos scripts oficiais do TSE.

Os zips brutos do TSE são grandes demais para o git: ficam em TSE_RAW
(padrão: ../data/raw, ao lado do repositório). Baixe com scripts/tse/fetch_tse.sh.
"""
import os
from pathlib import Path
import pandas as pd

REPO = Path(__file__).resolve().parents[2]
TSE_RAW = Path(os.environ.get("TSE_RAW", REPO.parent / "data/raw"))
OUT = REPO / "data/tse"
OUT.mkdir(exist_ok=True)


def tse_to_ibge():
    """Código TSE (5 dígitos) → IBGE (7 dígitos). Fonte: tatipara/eleicao_2026_1turno,
    conferida nome a nome contra a API de localidades do IBGE (só diferenças de grafia).
    Não usar betafcc/Municipios-Brasileiros-TSE: troca códigos de 5 municípios da BA."""
    t = pd.read_csv(REPO / "data/raw/tatipara_presidente_2026_municipios_wide.csv", dtype=str, encoding="utf-8-sig")
    t = t[t.uf != "ZZ"]
    return dict(zip(t.cd_tse.str.zfill(5), t.cd_ibge))
