import { USER_AGENT, normalizar, precoParaNumero, decodificarHTML, contemTodasPalavras, ehOJogo, esperar } from './util.mjs';

const EH_PC = /\b(pc|steam|windows|key|chave|codigo digital|digital code)\b/;
const NAO_EH_JOGO_PC =
  /\b(playstation|ps4|ps5|xbox|switch|nintendo|livro|livros|book|artbook|detonado|guia|guide|revista|magazine|camiseta|manga|volume|vol|poster|caneca|chaveiro|action figure|estatua|funko|mouse ?pad|adesivo|quadro|placa)\b/;
const ACESSORIO = /\b(cadarco|cadarcos|palmilha|palmilhas|capa|capinha|case|pelicula|adesivo|chaveiro|kit limpeza|limpador|suporte para)\b/;
const MAX_OFERTAS_PRODUTO = 10;

async function baixar(url) {
  for (let tentativa = 1; tentativa <= 2; tentativa++) {
    const r = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept-Language': 'pt-BR,pt;q=0.9',
        Accept: 'text/html',
      },
    });
    if (r.ok) return r.text();
    if (tentativa === 2) throw new Error(`Amazon respondeu ${r.status} (bloqueio temporário, tenta de novo mais tarde)`);
    await esperar(5000);
  }
}

export async function amazon(produto) {
  const ehJogo = produto.tipo === 'jogo';
  const base = produto.busca || produto.nome;
  const termo = ehJogo ? `${base} pc` : base;
  const url = `https://www.amazon.com.br/s?k=${encodeURIComponent(termo)}`;
  const html = await baixar(url);
  if (/captcha/i.test(html) && !html.includes('s-search-result')) {
    throw new Error('Amazon pediu captcha, tenta de novo mais tarde');
  }

  const ofertas = [];
  const vistos = new Set();
  const blocos = html.split('data-component-type="s-search-result"').slice(1);
  for (const b of blocos) {
    const asin = (b.match(/data-asin="(\w{10})"/) || [])[1];
    const candidatos = [...b.matchAll(/<h2([^>]*)>([\s\S]*?)<\/h2>/g)].map(
      (m) => (m[1].match(/aria-label="([^"]+)"/) || [])[1] || m[2].replace(/<[^>]+>/g, ''),
    );
    const tituloBruto = candidatos.sort((x, y) => y.length - x.length)[0];
    if (!asin || !tituloBruto || vistos.has(asin)) continue;
    const titulo = decodificarHTML(tituloBruto).replace(/^Anúncio patrocinado\s*[–-]\s*/i, '').replace(/\s+/g, ' ').trim();

    const precos = [...b.matchAll(/a-offscreen">([^<]+)/g)].map((m) => m[1]);
    const atualTxt = precos.find((p) => !/^De:/i.test(p));
    const deTxt = precos.find((p) => /^De:/i.test(p));
    const preco = precoParaNumero(atualTxt || '');
    if (preco == null) continue;

    const n = normalizar(titulo);
    if (!contemTodasPalavras(titulo, produto.nome)) continue;
    if (ehJogo) {
      if (!EH_PC.test(n) || NAO_EH_JOGO_PC.test(n) || !ehOJogo(titulo, produto.nome, produto.edicoes)) continue;
    } else if (ACESSORIO.test(n) && !ACESSORIO.test(normalizar(produto.nome))) {
      continue;
    }

    vistos.add(asin);
    const original = precoParaNumero(deTxt || '') || preco;
    const desconto = original > preco ? Math.round((1 - preco / original) * 100) : 0;
    const tagImg = (b.match(/<img[^>]*class="s-image"[^>]*>/) || [])[0] || '';
    const imagem = (tagImg.match(/src="([^"]+)"/) || [])[1];
    ofertas.push({ titulo, preco, original, desconto, imagem, link: `https://www.amazon.com.br/dp/${asin}` });
  }

  ofertas.sort((a, b) => a.preco - b.preco);
  const lista = ehJogo ? ofertas : ofertas.slice(0, MAX_OFERTAS_PRODUTO);
  return { status: lista.length ? 'ok' : 'vazio', ofertas: lista, extra: { busca: url } };
}
