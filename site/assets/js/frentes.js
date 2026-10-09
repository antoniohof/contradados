/* =====================================================================
   A conta das três frentes.
   Este arquivo roda no navegador (todas as páginas) e no build
   (scripts/site/resumo.mjs). Uma conta só, nos dois lugares.

   m = uma linha de site/data/municipios.csv já convertida (lerLinha)
   T = transferência da pesquisa: T[candidato] = [% para Lula, % para Flávio]
   ===================================================================== */

export function calcular(m, T) {
  // ---- Frente 1 · Reconquistar ----
  // "Parcela" de Lula = Lula ÷ (Lula + adversário). Ignora terceiros, brancos e nulos.
  const votosDois = m.votos_lula_26 + m.votos_flavio_26;          // votos em Lula + Flávio, 1º turno 2026
  const parcela26 = m.votos_lula_26 / votosDois;                    // parcela de Lula em 2026
  const parcela22 = m.lula_22_pct / (m.lula_22_pct + m.bolsonaro_22_pct); // parcela de Lula no 1º turno de 2022
  const perda = parcela22 - parcela26;                              // > 0: Lula perdeu terreno para Flávio
  const f1Pct = Math.max(0, perda) * 100;                           // em pontos percentuais
  const f1Votos = Math.max(0, perda) * votosDois;                   // eleitores estimados a reconquistar (saldo)

  // ---- Frente 2 · Mobilizar ----
  const areaLula = parcela26 > 0.5 && m.lula_2t22_pct > 50;         // Lula vence aqui em 2026 e venceu o 2º turno de 2022
  const abstencao = m.ausentes_26 / m.aptos_26;                     // fração dos aptos que não votou
  const vantagem = parcela26 - (1 - parcela26);                     // voto líquido para Lula por eleitor dos dois
  const f2Pct = areaLula ? abstencao * 100 : null;                  // abstenção, só nas áreas de Lula
  const f2Votos = areaLula ? m.ausentes_26 * vantagem : 0;          // saldo se os ausentes votassem como os vizinhos

  // ---- Frente 3 · Terceiros ----
  const validos = votosDois + m.votos_terceiros_26;                 // votos válidos, 1º turno 2026
  // votos de cada terceiro = total exato de votos em terceiros × participação dele (% com 1 casa decimal)
  const parte = (pct) => (m.terceiros_26_pct > 0 ? m.votos_terceiros_26 * pct / m.terceiros_26_pct : 0);
  const votos3 = { caiado: parte(m.caiado_26_pct), renan: parte(m.renan_26_pct), cury: parte(m.cury_26_pct) };
  votos3.outros = Math.max(0, m.votos_terceiros_26 - votos3.caiado - votos3.renan - votos3.cury); // Zema e nanicos
  let paraLula = 0, paraFlavio = 0, emDisputa = 0;
  for (const c in votos3) {
    paraLula   += votos3[c] * T[c][0] / 100;
    paraFlavio += votos3[c] * T[c][1] / 100;
    emDisputa  += votos3[c] * (100 - T[c][0] - T[c][1]) / 100;      // branco, nulo ou indeciso
  }
  const f3Pct = validos > 0 ? emDisputa / validos * 100 : null;     // em disputa, % dos votos válidos
  const f3Votos = emDisputa;

  return { votosDois, parcela22, parcela26, perda, f1Pct, f1Votos,
           areaLula, abstencao, vantagem, f2Pct, f2Votos,
           validos, votos3, paraLula, paraFlavio, f3Pct, f3Votos };
}

/* ---------------------------------------------------------------------
   Pesquisas para a Frente 3. [% para Lula, % para Flávio] entre os
   eleitores de cada candidato no 1º turno. Em disputa = o que sobra até 100.
   --------------------------------------------------------------------- */
export const PESQUISAS = {
  atlas: {
    nome: "AtlasIntel/Bloomberg", campo: "3 a 8/10/2026", amostra: "5.026", reg: "BR-03663/2026", quando: "depois do 1º turno",
    url: "https://em.com.br/politica/2026/10/7517802-pesquisa-atlas-flavio-bolsonaro-tem-511-e-lula-457-no-2-turno.html", veiculo: "Estado de Minas",
    t: { caiado: [26.9, 54.9], renan: [28.1, 40.3], cury: [50.4, 38.9], outros: [14.8, 83.4] },
    nota: "Única pesquisa divulgada após o 1º turno com o cruzamento por candidato. Zema e nanicos usam a linha 'outros candidatos'.",
  },
  datafolha: {
    nome: "Datafolha", campo: "6 a 8/10/2026", amostra: "2.520", reg: "BR-02949/2026", quando: "depois do 1º turno",
    url: "https://www.opovo.com.br/noticias/politica/eleicoes/2026/10/08/datafolha-quem-ganha-os-votos-de-cury-renan-caiado-e-zema.html", veiculo: "O Povo",
    t: { caiado: [32, 46], renan: [32, 46], cury: [32, 46], outros: [32, 46] },
    nota: "Divulgou só o total dos eleitores de Cury, Renan, Caiado e Zema (46% Flávio, 32% Lula); o mesmo valor vale para todos.",
  },
  quaest: {
    nome: "Genial/Quaest", campo: "2 e 3/10/2026", amostra: "3.702", reg: "BR-02197/2026", quando: "antes do 1º turno",
    url: "https://www.band.com.br/politica/eleicoes/2026/quaest-para-onde-vao-os-votos-de-caiado-renan-e-cury-em-um-2o-turno-entre-lula-e-flavio-bolsonaro", veiculo: "Band",
    t: { caiado: [19, 43], renan: [11, 60], cury: [23, 34], outros: null },
    nota: "Feita na véspera do 1º turno: mede intenção. Zema e nanicos: média dos três, ponderada pelos votos.",
  },
};
export const PESQUISA_PADRAO = "atlas";
export const CANDS = [["caiado", "Caiado"], ["renan", "Renan Santos"], ["cury", "Augusto Cury"], ["outros", "Zema e outros"]];

/* ---------------------------------------------------------------------
   Tabelas de apoio
   --------------------------------------------------------------------- */
export const REGIAO = {
  AC: "Norte", AM: "Norte", AP: "Norte", PA: "Norte", RO: "Norte", RR: "Norte", TO: "Norte",
  AL: "Nordeste", BA: "Nordeste", CE: "Nordeste", MA: "Nordeste", PB: "Nordeste", PE: "Nordeste", PI: "Nordeste", RN: "Nordeste", SE: "Nordeste",
  DF: "Centro-Oeste", GO: "Centro-Oeste", MS: "Centro-Oeste", MT: "Centro-Oeste",
  ES: "Sudeste", MG: "Sudeste", RJ: "Sudeste", SP: "Sudeste", PR: "Sul", RS: "Sul", SC: "Sul",
};
export const UFNOME = {
  AC: "Acre", AL: "Alagoas", AM: "Amazonas", AP: "Amapá", BA: "Bahia", CE: "Ceará", DF: "Distrito Federal", ES: "Espírito Santo",
  GO: "Goiás", MA: "Maranhão", MG: "Minas Gerais", MS: "Mato Grosso do Sul", MT: "Mato Grosso", PA: "Pará", PB: "Paraíba", PE: "Pernambuco",
  PI: "Piauí", PR: "Paraná", RJ: "Rio de Janeiro", RN: "Rio Grande do Norte", RO: "Rondônia", RR: "Roraima", RS: "Rio Grande do Sul",
  SC: "Santa Catarina", SE: "Sergipe", SP: "São Paulo", TO: "Tocantins",
};

// Porte pela população do Censo 2022 (IBGE). Cidades novas sem Censo ficam sem porte.
export const PORTES = [
  { id: 1, nome: "até 10 mil", curto: "<10 mil", min: 0, max: 10000 },
  { id: 2, nome: "10 a 50 mil", curto: "10–50 mil", min: 10000, max: 50000 },
  { id: 3, nome: "50 a 200 mil", curto: "50–200 mil", min: 50000, max: 200000 },
  { id: 4, nome: "200 mil a 1 milhão", curto: "200 mil–1 mi", min: 200000, max: 1000000 },
  { id: 5, nome: "mais de 1 milhão", curto: "1 mi+", min: 1000000, max: Infinity },
];
export function porte(pop) {
  if (!(pop > 0)) return null;
  for (const p of PORTES) if (pop >= p.min && pop < p.max) return p.id;
  return null;
}

export const FRENTES = {
  1: { id: 1, chave: "f1", nome: "Reconquistar", verbo: "Reconquistar", cor: "var(--f1)", quem: "quem votou em Lula em 2022 e agora foi de Flávio", vale: 2 },
  2: { id: 2, chave: "f2", nome: "Mobilizar", verbo: "Mobilizar", cor: "var(--f2)", quem: "quem não votou no 1º turno, em cidades onde Lula ganha", vale: null },
  3: { id: 3, chave: "f3", nome: "Terceiros", verbo: "Convencer", cor: "var(--f3)", quem: "quem votou em Caiado, Renan, Cury ou Zema e ainda não decidiu", vale: 1 },
};

/* ---------------------------------------------------------------------
   Leitura do CSV (texto → números) e utilitários de conta
   --------------------------------------------------------------------- */
const num = (v) => (v === "" || v == null ? null : +v);
export function lerLinha(r) {
  return {
    ibge: r.ibge, municipio: r.municipio, uf: r.uf, capital: r.capital === "1",
    pop: num(r.pop_2022),
    aptos_26: +r.aptos_26, ausentes_26: +r.ausentes_26, votos_lula_26: +r.votos_lula_26, votos_flavio_26: +r.votos_flavio_26,
    votos_terceiros_26: +r.votos_terceiros_26, terceiros_26_pct: +r.terceiros_26_pct,
    caiado_26_pct: +r.caiado_26_pct, renan_26_pct: +r.renan_26_pct, cury_26_pct: +r.cury_26_pct,
    lula_22_pct: num(r.lula_22_pct), bolsonaro_22_pct: num(r.bolsonaro_22_pct),
    lula_2t22_pct: num(r.lula_2t22_pct), abstencao_22_pct: num(r.abstencao_22_pct),
    arranjo_codigo: r.arranjo_codigo || "", arranjo_nome: r.arranjo_nome || "",
    imediata: r.regiao_imediata || "",
    lon: num(r.lon), lat: num(r.lat),
    bf: num(r.bolsa_familia_mil), bpc: num(r.bpc_mil), pdm: num(r.pe_de_meia_mil), safra: num(r.garantia_safra_mil),
    urbana: num(r.urbana_pct), evangelicos: num(r.evangelicos_pct),
    jovens: num(r.eleitores_16a24_pct), idosos: num(r.eleitores_60mais_pct), mais70: num(r.eleitores_70mais),
    prefeito_partido: r.prefeito_partido || "", prefeito_bloco: r.prefeito_bloco || "",
    gov2t: r.gov_2t === "1",
  };
}

// Quaest não traz Zema e nanicos: média dos três, ponderada pelos votos nacionais.
export function completarQuaest(rows) {
  if (PESQUISAS.quaest.t.outros) return;
  const vNac = { caiado: 0, renan: 0, cury: 0 };
  rows.forEach((m) => {
    if (m.terceiros_26_pct > 0) ["caiado", "renan", "cury"].forEach((c) => (vNac[c] += m.votos_terceiros_26 * m[c + "_26_pct"] / m.terceiros_26_pct));
  });
  const w = vNac.caiado + vNac.renan + vNac.cury;
  PESQUISAS.quaest.t.outros = [0, 1].map((i) => Math.round((["caiado", "renan", "cury"].reduce((s, c) => s + PESQUISAS.quaest.t[c][i] * vNac[c], 0) / w) * 10) / 10);
}

export function transferencia(chave = PESQUISA_PADRAO) {
  return Object.fromEntries(CANDS.map(([c]) => [c, PESQUISAS[chave].t[c].slice()]));
}

// Aplica a conta. Municípios sem histórico de 2022 (criados depois) ficam fora das frentes.
// f1, f2, f3 = o número de cada frente (eleitores a reconquistar, saldo da mobilização, votos em disputa).
// g1, g2, g3 = o mesmo em diferença de votos: quem volta de Flávio para Lula muda a diferença em 2
// (um a menos para ele, um a mais para Lula); o saldo da mobilização e o voto em disputa contam 1.
export function aplicar(rows, T) {
  const out = [];
  for (const m of rows) {
    if (m.lula_22_pct == null || m.lula_2t22_pct == null) continue;
    const c = calcular(m, T);
    const g = [2 * c.f1Votos, c.f2Votos, c.f3Votos];
    out.push({
      ...m, ...c,
      porte: porte(m.pop),
      regiao: REGIAO[m.uf],
      f1: c.f1Votos, f2: c.f2Votos, f3: c.f3Votos,
      g1: g[0], g2: g[1], g3: g[2], gTot: g[0] + g[1] + g[2],
      principal: 1 + g.indexOf(Math.max(...g)),
    });
  }
  return out;
}

// Saldo líquido de terceiros já decididos (quem já escolheu lado na pesquisa)
export function saldoTerceiros(D) {
  let lula = 0, flavio = 0;
  for (const d of D) { lula += d.paraLula; flavio += d.paraFlavio; }
  return { lula, flavio, saldo: flavio - lula };
}
