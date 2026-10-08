# exporta CSVs simples para análise/visualização
import json, csv
B = json.load(open('data/base_enriquecida.json'))
L = json.load(open('data/listas.json'))
P = {str(x['ibge']): x for x in json.load(open('data/pesquisa_local.json'))}
T = {r['IBGE']: r for r in csv.DictReader(open('data/tse/poder_local_2024.csv'))}
cols = ['ibge','municipio','uf','regiao','capital','aptos26','comp26','ausentes26','abst22','abst26','d_abst','lula22','bolso22','lula26','flavio26','terceiros26','brancnul26',
        'margem22','margem26','swing','bolso22_t2','bolso18_t2','hist','virou','pendulo_score','gov_mais_votado','gov_PL','gov_PL_pct','sen_PL','apoio_governador_2T']
with open('data/base_municipios.csv', 'w', newline='', encoding='utf-8') as f:
    w = csv.DictWriter(f, fieldnames=cols + ['cenarios'], extrasaction='ignore'); w.writeheader()
    for r in B:
        if 'swing' in r: w.writerow({**r, 'cenarios': ';'.join(r.get('cenarios', []))})
nomes = {'S1': 'viraram_para_PL', 'S2': 'reduto_13_alta_abstencao', 'S3': 'base_flavio_pendular'}
idx = {r['ibge']: r for r in B}
with open('data/cenarios.csv', 'w', newline='', encoding='utf-8') as f:
    # colunas numéricas estáveis (usadas pela visão do 2º turno): percentuais em 0–100
    w = csv.writer(f); w.writerow(['cenario','rank','ibge','municipio','uf','aptos','abst26','lula26','flavio26','margem_votos26','terceiros26','brancos_nulos26',
                                   'prefeito_tse','partido_tse','vereadores_PL','vereadores_total',
                                   'prefeito_2024','partido_prefeito','pl_local','economia','pautas','eventos','fontes','confianca'])
    for k, ids in L.items():
        for n, i in enumerate(ids, 1):
            p = P.get(i, {}); j = lambda v: ' | '.join(map(str, v)) if isinstance(v, list) else (v or '')
            b = idx[i]; t = T.get(i, {})
            w.writerow([nomes[k], n, i, b['municipio'], b['uf'], b['aptos26'], b['abst26'], b['lula26'], b['flavio26'], b['votos_lula26'] - b['votos_flavio26'],
                        b['terceiros26'], b['brancnul26'], t.get('prefeito', ''), t.get('prefeito_partido', ''),
                        int(float(t['vereadores_PL'])) if t.get('vereadores_PL') else '', int(float(t['vereadores_total'])) if t.get('vereadores_total') else '',
                        j(p.get('prefeito_2024')), j(p.get('partido_prefeito_sigla')), j(p.get('pl_local')),
                        j(p.get('economia')), j(p.get('pautas')), j(p.get('eventos')), j(p.get('fontes')), j(p.get('confianca'))])
print('ok')
