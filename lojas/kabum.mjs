import { contemTodasPalavras, baixarHTML, finalizar, descontoDe } from './util.mjs';

export async function kabum(produto) {
  const termo = (produto.busca || produto.nome).trim().toLowerCase().replace(/\s+/g, '-');
  const url = `https://www.kabum.com.br/busca/${encodeURIComponent(termo)}`;
  const html = await baixarHTML(url, 'KaBuM!');
  const bruto = html.match(/<script id="__NEXT_DATA__"[^>]*>(.*?)<\/script>/s)?.[1];
  if (!bruto) throw new Error('KaBuM! mudou o formato da página');

  const lista = JSON.parse(bruto)?.props?.pageProps?.data?.catalogServer?.data || [];
  const ofertas = [];
  for (const p of lista) {
    if (!p.available || !contemTodasPalavras(p.name, produto.nome)) continue;
    const preco = p.priceWithDiscount || p.price;
    const original = Math.max(p.oldPrice || 0, p.price || 0, preco);
    ofertas.push({
      titulo: p.name,
      preco,
      original,
      desconto: descontoDe(preco, original),
      imagem: p.image,
      vendedor: p.sellerName && !/kabum/i.test(p.sellerName) ? p.sellerName : undefined,
      obs: 'preço à vista no Pix',
      link: `https://www.kabum.com.br/produto/${p.code}/${p.friendlyName || ''}`,
    });
  }
  return finalizar(ofertas);
}
