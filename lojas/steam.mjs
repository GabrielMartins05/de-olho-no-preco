import { normalizar } from './util.mjs';

async function acharAppId(nome) {
  const url = `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(nome)}&cc=br&l=portuguese`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`busca Steam respondeu ${r.status}`);
  const { items = [] } = await r.json();
  const alvo = normalizar(nome);
  const exato = items.find((i) => normalizar(i.name) === alvo);
  return (exato || items[0])?.id ?? null;
}

export async function detectarJogo(nome) {
  const url = `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(nome)}&cc=br&l=portuguese`;
  const r = await fetch(url);
  if (!r.ok) return null;
  const { items = [] } = await r.json();
  const alvo = normalizar(nome);
  const exato = items.find((i) => normalizar(i.name) === alvo);
  return exato ? exato.id : null;
}

export async function steam(produto) {
  const appId = produto.steamAppId || (await acharAppId(produto.busca || produto.nome));
  if (!appId) return { status: 'vazio', ofertas: [] };

  const url = `https://store.steampowered.com/api/appdetails?appids=${appId}&cc=br&l=portuguese`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Steam respondeu ${r.status}`);
  const dados = (await r.json())[appId];
  if (!dados?.success) return { status: 'vazio', ofertas: [] };
  const d = dados.data;
  const link = `https://store.steampowered.com/app/${appId}`;

  if (d.release_date?.coming_soon && !d.price_overview && !d.is_free) {
    return {
      status: 'embreve',
      ofertas: [],
      extra: { appId, imagem: d.header_image, lancamento: d.release_date.date || 'a ser anunciada', link },
    };
  }

  if (d.is_free) {
    return { status: 'ok', ofertas: [{ titulo: d.name, preco: 0, original: 0, desconto: 0, link }] };
  }

  const ofertas = [];
  for (const grupo of d.package_groups || []) {
    for (const sub of grupo.subs || []) {
      const preco = sub.price_in_cents_with_discount / 100;
      const desconto = Number((sub.percent_savings_text || '').replace(/[^\d]/g, '')) || 0;
      const titulo = sub.option_text
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s*-\s*R\$.*$/s, '')
        .replace(/\s+/g, ' ')
        .trim();
      const original = desconto ? Math.round((preco / (1 - desconto / 100)) * 100) / 100 : preco;
      if (preco > 0) ofertas.push({ titulo, preco, original, desconto, link });
    }
  }

  if (!ofertas.length && d.price_overview) {
    const p = d.price_overview;
    ofertas.push({
      titulo: d.name,
      preco: p.final / 100,
      original: p.initial / 100,
      desconto: p.discount_percent,
      link,
    });
  }

  return { status: ofertas.length ? 'ok' : 'vazio', ofertas, extra: { appId, imagem: d.header_image } };
}
