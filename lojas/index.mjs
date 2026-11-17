import { steam } from './steam.mjs';
import { gog } from './gog.mjs';
import { nuuvem } from './nuuvem.mjs';
import { amazon } from './amazon.mjs';
import { kabum } from './kabum.mjs';
import { carrefour } from './carrefour.mjs';
import { dafiti } from './dafiti.mjs';

export const LOJAS = {
  Steam: {
    ler: steam, tipos: ['jogo'], cor: '#66c0f4', dominios: ['store.steampowered.com'],
    confianca: { nivel: 'oficial', texto: 'Loja oficial da Valve. Venda direta.' },
  },
  GOG: {
    ler: gog, tipos: ['jogo'], cor: '#b06ad9', dominios: ['www.gog.com'],
    confianca: { nivel: 'oficial', texto: 'Loja oficial da CD Projekt. Venda direta, jogos sem DRM.' },
  },
  Nuuvem: {
    ler: nuuvem, tipos: ['jogo'], cor: '#4cc38a', dominios: ['www.nuuvem.com'],
    confianca: { nivel: 'oficial', texto: 'Revendedora oficial autorizada pelas publicadoras, brasileira desde 2008. Entrega a chave pra ativar na Steam/outra loja.' },
  },
  Amazon: {
    ler: amazon, tipos: ['jogo', 'produto'], cor: '#ff9900', dominios: ['www.amazon.com.br'],
    confianca: { nivel: 'grande', texto: 'Varejista grande. Alguns itens são de vendedores parceiros, mas têm a garantia de devolução da Amazon.' },
  },
  'KaBuM!': {
    ler: kabum, tipos: ['produto'], cor: '#0060b1', dominios: ['www.kabum.com.br'],
    confianca: { nivel: 'grande', texto: 'Varejista brasileira de tecnologia (grupo Magalu). Tem marketplace: veja se o vendedor é a própria KaBuM!.' },
  },
  Carrefour: {
    ler: carrefour, tipos: ['produto'], cor: '#1e5bc6', dominios: ['www.carrefour.com.br'],
    confianca: { nivel: 'grande', texto: 'Varejista grande. Tem marketplace: confira na página quem vende.' },
  },
  Dafiti: {
    ler: dafiti, tipos: ['produto'], cor: '#e83e8c', dominios: ['www.dafiti.com.br'],
    confianca: { nivel: 'grande', texto: 'Varejista grande de moda e calçados. Tem marketplace: o vendedor aparece abaixo do produto.' },
  },
};

export const LOJAS_MANUAIS = {
  'Epic Games': {
    tipos: ['jogo'],
    url: (base) => `https://store.epicgames.com/pt-BR/browse?q=${encodeURIComponent(base)}`,
    confianca: { nivel: 'oficial', texto: 'Loja oficial da Epic. Venda direta.' },
  },
  'Mercado Livre': {
    tipos: ['jogo', 'produto'],
    url: (base, termo) => `https://lista.mercadolivre.com.br/${encodeURIComponent(termo.toLowerCase().replace(/\s+/g, '-'))}`,
    confianca: { nivel: 'marketplace', texto: 'Marketplace. Prefira "Loja oficial" ou vendedor com termômetro verde (MercadoLíder).' },
  },
  Shopee: {
    tipos: ['jogo', 'produto'],
    url: (base, termo) => `https://shopee.com.br/search?keyword=${encodeURIComponent(termo)}`,
    confianca: { nivel: 'marketplace', texto: 'Marketplace com muitos vendedores pequenos. Cuidado com réplicas e chaves de jogo baratas demais. Prefira "Shopee Mall".' },
  },
  Shein: {
    tipos: ['produto'],
    url: (base) => `https://br.shein.com/pdsearch/${encodeURIComponent(base)}/`,
    confianca: { nivel: 'grande', texto: 'Loja grande de moda. Produtos próprios, não vende marcas como Nike original. Prazo de entrega longo.' },
  },
};

export const TIPOS = {
  jogo: 'Jogo de PC',
  produto: 'Produto',
};

const tipoDe = (produto) => (TIPOS[produto.tipo] ? produto.tipo : 'produto');

export const lojasDo = (produto) =>
  Object.fromEntries(Object.entries(LOJAS).filter(([, l]) => l.tipos.includes(tipoDe(produto))));

export function linksManuais(produto) {
  const base = (produto.busca || produto.nome).trim();
  const termo = tipoDe(produto) === 'jogo' ? `${base} pc` : base;
  return Object.entries(LOJAS_MANUAIS)
    .filter(([, l]) => l.tipos.includes(tipoDe(produto)))
    .map(([loja, l]) => ({ loja, url: l.url(base, termo), confianca: l.confianca }));
}

export function linkConfiavel(loja, link) {
  try {
    const u = new URL(link);
    return u.protocol === 'https:' && LOJAS[loja].dominios.includes(u.hostname);
  } catch {
    return false;
  }
}

export const infoLojas = () => ({
  ...Object.fromEntries(Object.entries(LOJAS).map(([n, l]) => [n, { cor: l.cor, confianca: l.confianca }])),
});
