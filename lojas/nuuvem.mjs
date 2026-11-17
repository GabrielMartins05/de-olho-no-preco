import { ehOJogo, baixarHTML, finalizar, descontoDe, decodificarHTML } from './util.mjs';

export async function nuuvem(produto) {
  const url = `https://www.nuuvem.com/br-pt/catalog/search/${encodeURIComponent(produto.busca || produto.nome)}`;
  const html = await baixarHTML(url, 'Nuuvem');

  const ofertas = [];
  const cards = html.split('data-wishlist-button-product-data-value="').slice(1);
  for (const card of cards) {
    let info;
    try {
      info = JSON.parse(decodificarHTML(card.slice(0, card.indexOf('"'))));
    } catch {
      continue;
    }
    if (!info?.name || !ehOJogo(info.name, produto.nome, produto.edicoes)) continue;
    if (!/<span>\s*Windows\s*<\/span>/.test(card.slice(0, 4000))) continue; // só PC

    const valor = (attr) => {
      const m = card.match(new RegExp(`${attr}="([^"]+)"`));
      try { return JSON.parse(decodificarHTML(m[1])).v / 100; } catch { return null; }
    };
    const preco = valor('data-price') ?? info.price;
    const original = valor('data-base-price') ?? preco;
    if (!preco) continue;
    ofertas.push({
      titulo: info.name,
      preco,
      original,
      desconto: descontoDe(preco, original),
      imagem: info.image_url,
      link: info.url,
    });
  }
  return finalizar(ofertas);
}
