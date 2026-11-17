import { baixarHTML } from './util.mjs';

export async function lerWishlist(steamId) {
  const url = `https://api.steampowered.com/IWishlistService/GetWishlist/v1/?steamid=${encodeURIComponent(steamId)}`;
  const { response } = JSON.parse(await baixarHTML(url, 'Steam (lista de desejos)', 'application/json'));
  const itens = response?.items || [];
  if (!itens.length) return [];

  const jogos = [];
  for (let i = 0; i < itens.length; i += 50) {
    const lote = itens.slice(i, i + 50);
    const input = {
      ids: lote.map((x) => ({ appid: x.appid })),
      context: { language: 'brazilian', country_code: 'BR' },
      data_request: {},
    };
    const url2 = `https://api.steampowered.com/IStoreBrowseService/GetItems/v1/?input_json=${encodeURIComponent(JSON.stringify(input))}`;
    const { response: r } = JSON.parse(await baixarHTML(url2, 'Steam (nomes)', 'application/json'));
    for (const s of r?.store_items || []) {
      if (s.name) jogos.push({ appid: s.appid, nome: s.name.trim() });
    }
  }
  return jogos;
}
