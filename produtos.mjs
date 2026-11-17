import { lerJSON, salvarJSON, definirTipo, ARQ_PRODUTOS, ARQ_HISTORICO } from './coletor.mjs';
import { TIPOS, lojasDo, linksManuais, infoLojas } from './lojas/index.mjs';
import { normalizar } from './lojas/util.mjs';

export async function adicionarProduto({ nome, busca, steamAppId, imagem, tipo }) {
  nome = String(nome || '').trim().slice(0, 120);
  if (!nome) throw new Error('Faltou o nome');
  const produtos = await lerJSON(ARQ_PRODUTOS, []);
  let id = normalizar(nome).replace(/ /g, '-') || 'produto';
  while (produtos.some((p) => p.id === id)) id += '-2';
  const novo = { id, nome, busca: String(busca || nome).trim().slice(0, 120) || nome };
  const appId = Number(String(steamAppId || '').match(/\d+/)?.[0]);
  if (appId) novo.steamAppId = appId;
  const img = String(imagem || '').trim();
  if (/^https:\/\/\S+$/.test(img)) novo.imagem = img;
  await definirTipo(novo, appId ? 'jogo' : tipo);
  produtos.push(novo);
  await salvarJSON(ARQ_PRODUTOS, produtos);
  return novo;
}

export async function removerProduto(id) {
  const produtos = await lerJSON(ARQ_PRODUTOS, []);
  await salvarJSON(ARQ_PRODUTOS, produtos.filter((p) => p.id !== id));
  const historico = await lerJSON(ARQ_HISTORICO, []);
  await salvarJSON(ARQ_HISTORICO, historico.filter((r) => r.produtoId !== id));
}

export async function trocarTipo(id, tipo) {
  if (!TIPOS[tipo]) throw new Error('Tipo inválido');
  const produtos = await lerJSON(ARQ_PRODUTOS, []);
  const p = produtos.find((x) => x.id === id);
  if (!p) throw new Error('Produto não encontrado');
  if (p.tipo === tipo) return false;
  p.tipo = tipo;
  await salvarJSON(ARQ_PRODUTOS, produtos);
  const historico = await lerJSON(ARQ_HISTORICO, []);
  await salvarJSON(ARQ_HISTORICO, historico.filter((r) => r.produtoId !== id));
  return true;
}

export async function montarDados(extra = {}) {
  const produtos = await lerJSON(ARQ_PRODUTOS, []);
  const historico = await lerJSON(ARQ_HISTORICO, []);
  return {
    produtos: produtos.map((p) => ({ ...p, lojas: Object.keys(lojasDo(p)), links: linksManuais(p) })),
    historico,
    tipos: TIPOS,
    lojas: infoLojas(),
    ultimaColeta: historico.length ? historico[historico.length - 1].data : null,
    ...extra,
  };
}
