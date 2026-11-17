import { contemTodasPalavras, baixarHTML, finalizar, precoParaNumero, decodificarHTML, atributo, descontoDe } from './util.mjs';

export async function dafiti(produto) {
  const q = encodeURIComponent(produto.busca || produto.nome).replace(/%20/g, '+');
  const url = `https://www.dafiti.com.br/catalog/?q=${q}`;
  const html = await baixarHTML(url, 'Dafiti');

  const ofertas = [];
  for (const caixa of html.split('<div class="product-box"').slice(1)) {
    const link = (caixa.match(/href="(https:\/\/www\.dafiti\.com\.br\/[^"]+\.html)"/) || [])[1];
    const titulo = decodificarHTML((caixa.match(/product-box-title">([^<]+)/) || [])[1] || '').trim();
    if (!link || !titulo || !contemTodasPalavras(titulo, produto.nome)) continue;
    const de = precoParaNumero((caixa.match(/product-box-price-from">([^<]+)/) || [])[1] || '');
    const por = precoParaNumero((caixa.match(/product-box-price-to">([^<]+)/) || [])[1] || '');
    const preco = por || de;
    if (!preco) continue;
    ofertas.push({
      titulo,
      preco,
      original: de || preco,
      desconto: descontoDe(preco, de || preco),
      imagem: atributo(caixa, 'data-product-picture') || undefined,
      link,
    });
  }
  return finalizar(ofertas);
}
