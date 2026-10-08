# planilha final: 3 cenários + pautas + base completa
import json, glob
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.table import Table, TableStyleInfo

B = {r['ibge']: r for r in json.load(open('data/base_enriquecida.json'))}
L = json.load(open('data/listas.json'))
P = {str(x.get('ibge')): x for x in json.load(open('data/pesquisa_local.json'))}
# prefeitos e vereadores eleitos em 2024, base oficial TSE (gerado por scripts/tse/01_candidatos_2024.py)
import csv, os
T = {r['IBGE']: r for r in csv.DictReader(open('data/tse/poder_local_2024.csv'))} if os.path.exists('data/tse/poder_local_2024.csv') else {}
def tse(k):
    return lambda r: T.get(r['ibge'], {}).get(k, '')
def n_int(k):
    return lambda r: int(float(T[r['ibge']][k])) if T.get(r['ibge'], {}).get(k) else ''
def diverge(r):
    p, t = P.get(r['ibge'], {}), T.get(r['ibge'], {})
    if not t or not p.get('partido_prefeito_sigla') or p.get('partido_prefeito_incerto'): return ''
    return 'sim' if p['partido_prefeito_sigla'] != t['prefeito_partido'] else 'não'

F = 'Arial'
HDR = PatternFill('solid', fgColor='1F2937'); HF = Font(name=F, bold=True, color='FFFFFF', size=10)
BODY = Font(name=F, size=10)

def j(v):
    if isinstance(v, list): return ' | '.join(map(str, v))
    return '' if v is None else str(v)

def status(p):
    if not p: return 'pendente (lote não pesquisado)'
    t = j(p.get('pautas')).lower()
    if not t or any(k in t for k in ('lacuna', 'não encontrado', 'não pesquis', 'interrompid', 'ver rodada 1', 'não verificado nesta rodada')): return 'pautas pendentes'
    return f"ok ({p.get('confianca','?')})"

# colunas: (cabeçalho, chave ou função, formato)
pct = '0.0%'; pp = '+0.0;-0.0;0.0'; num = '#,##0'
COLS = [
 ('Rank', None, None), ('IBGE', 'ibge', '@'), ('Município', 'municipio', None), ('UF', 'uf', None), ('Região', 'regiao', None),
 ('Capital', lambda r: 'sim' if r['capital'] else '', None),
 ('Eleitores aptos 2026', 'aptos26', num),
 ('Lula 1T 2022', lambda r: r['lula22']/100, pct), ('Bolsonaro 1T 2022', lambda r: r['bolso22']/100, pct),
 ('Lula 1T 2026', lambda r: r['lula26']/100, pct), ('Flávio 1T 2026', lambda r: r['flavio26']/100, pct),
 ('Terceiros 2026', lambda r: r['terceiros26']/100, pct),
 ('Margem 2022 (Lula−Bolso, p.p.)', 'margem22', pp), ('Margem 2026 (Lula−Flávio, p.p.)', 'margem26', pp),
 ('Swing (p.p.)', 'FORMULA_SWING', pp),
 ('Abstenção 2022', lambda r: r['abst22']/100, pct), ('Abstenção 2026', lambda r: r['abst26']/100, pct),
 ('Δ Abstenção (p.p.)', 'FORMULA_DABST', pp), ('Ausentes 2026', 'ausentes26', num),
 ('Brancos+nulos 2026', lambda r: r['brancnul26']/100, pct),
 ('Bolsonaro 2T 2022', lambda r: r['bolso22_t2']/100, pct),
 ('Histórico 2T18-2T22-1T26', 'hist', None), ('Índice pêndulo (0-5)', 'pendulo_score', '0'),
 ('Gov. mais votado no município', 'gov_mais_votado', None), ('Candidato PL a governador', 'gov_PL', None),
 ('PL gov % local', lambda r: (r['gov_PL_pct']/100) if r['gov_PL_pct'] != '' else '', pct),
 ('Candidatos PL ao Senado (% local)', 'sen_PL', None), ('Senador mais votado', 'sen_mais_votado', None),
 ('Governador no 2T apoia', 'apoio_governador_2T', None),
 ('Prefeito 2024 (TSE)', tse('prefeito'), None), ('Partido prefeito (TSE)', tse('prefeito_partido'), None),
 ('Coligação do prefeito (TSE)', tse('prefeito_coligacao'), None),
 ('Eleição suplementar', lambda r: 'sim' if T.get(r['ibge'], {}).get('prefeito_eleicao_suplementar') == 'True' else '', None),
 ('Vereadores PL', n_int('vereadores_PL'), '0'), ('Vereadores total', n_int('vereadores_total'), '0'),
 ('Maior bancada', tse('maior_bancada'), None),
 ('Prefeito 2024 (pesquisa web)', lambda r: j(P.get(r['ibge'], {}).get('prefeito_2024')), None),
 ('Partido prefeito (web)', lambda r: j(P.get(r['ibge'], {}).get('partido_prefeito_sigla')), None),
 ('Partido web ≠ TSE', diverge, None),
 ('PL local', lambda r: j(P.get(r['ibge'], {}).get('pl_local')), None),
 ('Economia', lambda r: j(P.get(r['ibge'], {}).get('economia')), None),
 ('Pautas da comunidade', lambda r: j(P.get(r['ibge'], {}).get('pautas')), None),
 ('Eventos recentes', lambda r: j(P.get(r['ibge'], {}).get('eventos')), None),
 ('Fontes', lambda r: j(P.get(r['ibge'], {}).get('fontes')), None),
 ('Obs. pesquisa', lambda r: j(P.get(r['ibge'], {}).get('obs')), None),
 ('Status pesquisa', lambda r: status(P.get(r['ibge'])), None),
 ('Cenários', lambda r: ', '.join(r.get('cenarios', [])), None),
]
idx = {h: i+1 for i, (h, _, _) in enumerate(COLS)}
def colL(h): return get_column_letter(idx[h])

def write(ws, rows, name, cols=COLS, rank=True):
    for c, (h, _, _) in enumerate(cols, 1):
        cell = ws.cell(1, c, h); cell.font = HF; cell.fill = HDR; cell.alignment = Alignment(wrap_text=True, vertical='top')
    for i, r in enumerate(rows, 2):
        for c, (h, k, fmt) in enumerate(cols, 1):
            if h == 'Rank': v = i-1
            elif k == 'FORMULA_SWING': v = f"={colL('Margem 2026 (Lula−Flávio, p.p.)')}{i}-{colL('Margem 2022 (Lula−Bolso, p.p.)')}{i}"
            elif k == 'FORMULA_DABST': v = f"=({colL('Abstenção 2026')}{i}-{colL('Abstenção 2022')}{i})*100"
            elif callable(k): v = k(r)
            else: v = r.get(k, '')
            cell = ws.cell(i, c, v); cell.font = BODY
            if fmt: cell.number_format = fmt
    widths = {'Município': 22, 'Pautas da comunidade': 60, 'Fontes': 40, 'Economia': 35, 'PL local': 35, 'Eventos recentes': 40,
              'Obs. pesquisa': 35, 'Coligação do prefeito (TSE)': 28, 'Maior bancada': 22, 'Prefeito 2024 (pesquisa web)': 24, 'Candidatos PL ao Senado (% local)': 34, 'Gov. mais votado no município': 26, 'Candidato PL a governador': 26}
    for c, (h, _, _) in enumerate(cols, 1):
        ws.column_dimensions[get_column_letter(c)].width = widths.get(h, 13)
    ws.row_dimensions[1].height = 42
    ws.freeze_panes = 'D2'
    t = Table(displayName=name, ref=f"A1:{get_column_letter(len(cols))}{len(rows)+1}")
    t.tableStyleInfo = TableStyleInfo(name='TableStyleLight9', showRowStripes=True)
    ws.add_table(t)

wb = Workbook()
ws0 = wb.active; ws0.title = 'Leia-me'
S = [B[i] for i in L['S1']], [B[i] for i in L['S2']], [B[i] for i in L['S3']]
for title, rows, tn in (('1 Viraram para o PL', S[0], 'Cenario1'), ('2 Reduto 13 + abstenção', S[1], 'Cenario2'),
                        ('3 Base Flávio pendular', S[2], 'Cenario3')):
    write(wb.create_sheet(title), rows, tn)
# base completa (sem colunas de pesquisa)
base_cols = [c for c in COLS if c[0] not in ('Prefeito 2024 (pesquisa web)','Partido prefeito (web)','Partido web ≠ TSE','PL local','Economia','Pautas da comunidade','Eventos recentes','Fontes','Obs. pesquisa','Status pesquisa')]
base_cols = base_cols + [('Virou Lula→Flávio', lambda r: 'sim' if r['virou'] else 'não', None)]
allrows = sorted([r for r in B.values() if 'swing' in r], key=lambda r: r['swing'])
wsb = wb.create_sheet('Base completa 5570')
write(wsb, allrows, 'Base', base_cols)
nb = len(allrows) + 1
def bc(h): return f"'Base completa 5570'!${get_column_letter([c[0] for c in base_cols].index(h)+1)}$2:${get_column_letter([c[0] for c in base_cols].index(h)+1)}${nb}"

# Leia-me + resumo com fórmulas
txt = [
 ('Eleitor pendular 2026 — municípios-chave para o 2º turno', True),
 ('Gerado em 08/10/2026. Votos do exterior excluídos. Percentuais de candidatos sobre votos válidos; abstenção sobre eleitores aptos.', False),
 ('', False),
 ('OS 3 CENÁRIOS', True),
 ('1 Viraram para o PL — municípios com 10 mil+ eleitores onde Lula venceu o 1º turno de 2022 e Flávio venceu o 1º turno de 2026; ordenados pelo maior swing. (713 municípios viraram no total — todos marcados na Base completa.)', False),
 ('2 Reduto 13 + abstenção — Lula acima de 50% dos válidos em 2026 e abstenção acima da média nacional (20,75%); ordenados pelo número absoluto de ausentes (potencial de mobilização).', False),
 ('3 Base Flávio pendular — Flávio com 50%+ e abstenção abaixo da média, mas com índice pêndulo ≥ 3; ordenados pelo índice e depois pelo tamanho.', False),
 ('Índice pêndulo (0–5): +1 se o PT venceu o 2T de 2018 (Haddad); +1 se Lula venceu o 2T de 2022; +1 se swing ≤ −15 p.p.; +1 se terceiros ≥ 8%; +1 se margem 2026 ≤ 20 p.p.', False),
 ('Swing = margem 2026 (Lula−Flávio) − margem 2022 (Lula−Bolsonaro), em pontos. Negativo = movimento para o PL.', False),
 ('Histórico: H/B = vencedor do 2T 2018 (Haddad/Bolsonaro); L/B = 2T 2022; L/F = 1T 2026.', False),
 ('', False),
 ('RESUMO (fórmulas sobre a Base completa)', True),
]
r0 = 1
for t, b in txt:
    c = ws0.cell(r0, 1, t); c.font = Font(name=F, bold=b, size=12 if b else 10); c.alignment = Alignment(wrap_text=True); r0 += 1
summ = [
 ('Municípios na base', f"=COUNTA({bc('IBGE')})", num),
 ('Viraram de Lula (2022) para Flávio (2026)', f"=COUNTIF({bc('Virou Lula→Flávio')},\"sim\")", num),
 ('Viraram de Bolsonaro (2022) para Lula (2026)', '=0', num),
 ('Municípios com Lula > 50% em 2026', f"=COUNTIF({bc('Lula 1T 2026')},\">0.5\")", num),
 ('…desses, com abstenção acima de 20,75%', f"=COUNTIFS({bc('Lula 1T 2026')},\">0.5\",{bc('Abstenção 2026')},\">0.2075\")", num),
 ('Municípios com Flávio ≥ 50% em 2026', f"=COUNTIF({bc('Flávio 1T 2026')},\">=0.5\")", num),
 ('Swing médio (p.p., média simples dos municípios)', f"=AVERAGE({bc('Swing (p.p.)')})", '0.0'),
 ('Correlação abstenção 2026 × voto Lula 2026 (todos)', f"=CORREL({bc('Abstenção 2026')},{bc('Lula 1T 2026')})", '0.00'),
 ('Correlação Δ abstenção × swing', f"=CORREL({bc('Δ Abstenção (p.p.)')},{bc('Swing (p.p.)')})", '0.00'),
]
for t, f_, fmt in summ:
    ws0.cell(r0, 1, t).font = BODY; c = ws0.cell(r0, 2, f_); c.font = BODY; c.number_format = fmt; r0 += 1
r0 += 1
extra = [
 ('CORRELAÇÃO ABSTENÇÃO × VOTO LULA POR REGIÃO (calculada em Python): Sul 0,52 · Sudeste 0,43 · Centro-Oeste 0,16 · Nordeste 0,08 · Norte −0,08. No Sul e Sudeste, onde o PT vai melhor, falta mais gente; no Nordeste não há relação.', False),
 ('', False),
 ('FONTES', True),
 ('Votos 2026, 2022 e 2018 por município: TSE, compilados no repositório aberto lucashang07/laboratorio-voto-2026 (votocruzado.com.br) e conferidos contra mais duas bases independentes (tatipara/eleicao_2026_1turno para 2026; lfbl-cp/painel-eleicoes-2026 para 2022). Divergências: zero. Total Flávio 56.104.503 x Lula 53.879.538 bate com o TSE.', False),
 ('Prefeitos 2024, PL local, economia e pautas: pesquisa web por município (fontes na coluna Fontes). Ver Status pesquisa: parte dos municípios ainda está pendente.', False),
 ('', False),
 ('LIMITES', True),
 ('Os dados mostram territórios, não pessoas: não dá para afirmar que os mesmos eleitores mudaram de voto (falácia ecológica).', False),
 ('“Pautas” vêm de imprensa local, sites de prefeitura/câmara e planos de governo — não de pesquisas de opinião. Confiança indicada por município.', False),
 ('Status (08/10/2026): pesquisa local em 267 de 279 municípios selecionados; partido do prefeito em 255; pautas em 165. Prefeitos ainda devem ser conferidos com a base oficial do TSE (consulta_cand_2024) — ver HANDOFF.md.', False),
]
for t, b in extra:
    c = ws0.cell(r0, 1, t); c.font = Font(name=F, bold=b, size=12 if b else 10); c.alignment = Alignment(wrap_text=True); r0 += 1
ws0.column_dimensions['A'].width = 110; ws0.column_dimensions['B'].width = 14
wb.save('outputs/eleitor_pendular_2026.xlsx')
print('ok')
