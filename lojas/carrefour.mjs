import { contemTodasPalavras, baixarHTML, finalizar, precoParaNumero, decodificarHTML, atributo } from './util.mjs';

export async function carrefour(produto) {
  const url = `https://www.carrefour.com.br/busca/${encodeURIComponent(produto.busca || produto.nome)}`;
  const html = await baixarHTML(url, 'Carrefour');

  const ofertas = [];
  const cartoes = html.match(/<a [^>]*href="\/produto\/[^"]+"[^>]*data-testid="search-product-card"[\s\S]*?<\/a>/g) || [];
  for (const c of cartoes) {
    const caminho = atributo(c, 'href');
    const titulo = decodificarHTML((c.match(/<h2[^>]*>([^<]+)<\/h2>/) || [])[1] || '').trim();
    const precos = [...c.matchAll(/R\$\s?[\d.]+,\d{2}/g)].map((m) => precoParaNumero(m[0]));
    if (!titulo || !precos.length || !contemTodasPalavras(titulo, produto.nome)) continue;
    const preco = precos[0];
    const riscado = (c.match(/line-through[^>]*>\s*(R\$\s?[\d.]+,\d{2})/) || [])[1];
    const original = precoParaNumero(riscado || '') || preco;
    ofertas.push({
      titulo,
      preco,
      original,
      desconto: original > preco ? Math.round((1 - preco / original) * 100) : 0,
      imagem: (c.match(/<img[^>]*src="([^"]+)"/) || [])[1]?.replace(/&amp;/g, '&'),
      obs: 'preço à vista no Pix',
      link: `https://www.carrefour.com.br${caminho}`,
    });
  }
  return finalizar(ofertas);
}
