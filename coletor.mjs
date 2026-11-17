import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { detectarJogo } from './lojas/steam.mjs';
import { TIPOS, lojasDo, linkConfiavel } from './lojas/index.mjs';

const PASTA = path.dirname(fileURLToPath(import.meta.url));
export const ARQ_PRODUTOS = path.join(PASTA, 'produtos.json');
export const ARQ_HISTORICO = path.join(PASTA, 'dados', 'historico.json');

export async function definirTipo(produto, escolha = 'auto') {
  if (escolha === 'jogo' || escolha === 'produto') {
    produto.tipo = escolha;
    return produto;
  }
  if (produto.steamAppId) {
    produto.tipo = 'jogo';
    return produto;
  }
  const appId = await detectarJogo(produto.busca || produto.nome).catch(() => null);
  produto.tipo = appId ? 'jogo' : 'produto';
  if (appId) produto.steamAppId = appId;
  return produto;
}

async function garantirTipos(produtos) {
  let mudou = false;
  for (const p of produtos) {
    if (!p.tipo) {
      await definirTipo(p);
      mudou = true;
    }
  }
  if (mudou) await salvarJSON(ARQ_PRODUTOS, produtos);
  return produtos;
}

export async function lerJSON(arquivo, padrao) {
  try {
    return JSON.parse(await fs.readFile(arquivo, 'utf8'));
  } catch {
    return padrao;
  }
}

export async function salvarJSON(arquivo, dados) {
  await fs.mkdir(path.dirname(arquivo), { recursive: true });
  const tmp = arquivo + '.tmp';
  await fs.writeFile(tmp, JSON.stringify(dados, null, 2), 'utf8');
  await fs.rename(tmp, arquivo);
}

export async function coletarProduto(produto, data = new Date().toISOString()) {
  const lojas = Object.entries(lojasDo(produto));
  const consultar = async ([loja, { ler }], prod) => {
      try {
        const r = await ler(prod);
        const ofertas = r.ofertas.filter((o) => linkConfiavel(loja, o.link));
        const descartados = r.ofertas.length - ofertas.length;
        if (descartados) console.log(`  ${loja}: ${descartados} link(s) fora do domínio oficial descartado(s)`);
        console.log(`  ${loja}: ${ofertas.length} oferta(s)`);
        return { data, produtoId: produto.id, loja, status: ofertas.length ? 'ok' : 'vazio', ofertas, extra: r.extra };
      } catch (e) {
        console.log(`  ${loja}: ERRO ${e.message}`);
        return { data, produtoId: produto.id, loja, status: 'erro', erro: e.message, ofertas: [] };
      }
  };

  const steam = lojas.find(([l]) => l === 'Steam');
  const resto = lojas.filter(([l]) => l !== 'Steam');
  const registros = [];
  let prod = produto;
  if (steam) {
    const r = await consultar(steam, produto);
    registros.push(r);
    if (r.ofertas.length) prod = { ...produto, edicoes: r.ofertas.map((o) => o.titulo) };
  }
  registros.push(...(await Promise.all(resto.map((l) => consultar(l, prod)))));
  return registros;
}

export async function coletarTudo(apenasId) {
  const produtos = await garantirTipos(await lerJSON(ARQ_PRODUTOS, []));
  const data = new Date().toISOString();
  const novos = [];
  let primeiro = true;
  for (const p of produtos) {
    if (apenasId && p.id !== apenasId) continue;
    if (!primeiro) await new Promise((r) => setTimeout(r, 8000));
    primeiro = false;
    console.log(`Coletando ${p.nome} (${TIPOS[p.tipo]})...`);
    novos.push(...(await coletarProduto(p, data)));
  }
  const historico = await lerJSON(ARQ_HISTORICO, []);
  historico.push(...novos);
  await salvarJSON(ARQ_HISTORICO, historico);
  return novos;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await coletarTudo();
  console.log('Pronto.');
}
