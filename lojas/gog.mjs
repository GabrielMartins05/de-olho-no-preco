import { ehOJogo, baixarHTML, finalizar, descontoDe } from './util.mjs';

export async function gog(produto) {
  const q = encodeURIComponent(`like:${produto.busca || produto.nome}`);
  const url = `https://catalog.gog.com/v1/catalog?query=${q}&countryCode=BR&currencyCode=BRL&locale=pt-BR&limit=20&productType=in:game,pack`;
  const dados = JSON.parse(await baixarHTML(url, 'GOG', 'application/json'));

  const ofertas = [];
  for (const p of dados.products || []) {
    if (!ehOJogo(p.title, produto.nome, produto.edicoes)) continue;
    const preco = Number(p.price?.finalMoney?.amount);
    const original = Number(p.price?.baseMoney?.amount) || preco;
    if (!preco) continue;
    ofertas.push({
      titulo: p.title,
      preco,
      original,
      desconto: descontoDe(preco, original),
      imagem: p.coverHorizontal,
      link: p.storeLink.replace('/en/', '/pt/'),
    });
  }
  return finalizar(ofertas);
}
