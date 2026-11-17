
export const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';

export function normalizar(texto = '') {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function precoParaNumero(texto = '') {
  const m = texto.replace(/\s/g, '').match(/([\d.]+),(\d{2})/);
  if (!m) return null;
  return Number(m[1].replace(/\./g, '') + '.' + m[2]);
}

export function decodificarHTML(t = '') {
  return t
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ');
}

const PALAVRAS_VAZIAS = new Set(['de', 'da', 'do', 'das', 'dos', 'para', 'pra', 'com', 'the', 'of', 'e', 'a', 'o']);

export function palavrasChave(nome) {
  return normalizar(nome)
    .split(' ')
    .filter((p) => p.length > 1 && !PALAVRAS_VAZIAS.has(p));
}

export function contemTodasPalavras(titulo, nome) {
  const t = ' ' + normalizar(titulo) + ' ';
  return palavrasChave(nome).every((p) => t.includes(' ' + p + ' '));
}

const PALAVRAS_EDICAO = new Set([
  'edition', 'edicao', 'deluxe', 'standard', 'padrao', 'complete', 'completa', 'completo', 'goty', 'game', 'year',
  'gold', 'ultimate', 'definitive', 'definitiva', 'premium', 'collector', 'collectors', 'bundle', 'collection',
  'pc', 'steam', 'key', 'chave', 'digital', 'codigo', 'midia', 'fisica', 'windows', 'br', 'original', 'jogo',
  'versao', 'para', 'de', 'do', 'da', 'of', 'the', 'and', 'e', 'bandai', 'namco', 'entertainment',
]);
const NAO_E_O_JOGO = /\b(soundtrack|ost|trilha|artbook|dlc|season pass|upgrade|expansion|expansao|costume|skin|pack|demo|playtest|dedicated server)\b/;

const nucleo = (titulo) => normalizar(titulo).split(' ').filter((p) => p && !PALAVRAS_EDICAO.has(p)).join(' ');

export function ehOJogo(titulo, nome, edicoes = []) {
  const t = normalizar(titulo);
  if (!contemTodasPalavras(titulo, nome)) return false;
  if (NAO_E_O_JOGO.test(t) && !NAO_E_O_JOGO.test(normalizar(nome))) return false;
  const doNome = new Set(palavrasChave(nome));
  const sobra = t.split(' ').filter((p) => p && !doNome.has(p));
  if (sobra.every((p) => PALAVRAS_EDICAO.has(p))) return true;
  const marcaEdicao = (x) => /\b(edition|edicao|goty|bundle|collection)\b/.test(normalizar(x));
  if (edicoes.length) return edicoes.some((e) => nucleo(e) === nucleo(titulo) && marcaEdicao(e) === marcaEdicao(titulo));
  return marcaEdicao(titulo);
}

export const esperar =(ms) => new Promise((r) => setTimeout(r, ms));

export async function baixarHTML(url, loja, aceitar = 'text/html') {
  for (let tentativa = 1; tentativa <= 2; tentativa++) {
    const r = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, 'Accept-Language': 'pt-BR,pt;q=0.9', Accept: aceitar },
      signal: AbortSignal.timeout(25000),
    });
    if (r.ok) return r.text();
    if (tentativa === 2) throw new Error(`${loja} respondeu ${r.status} (bloqueio temporário, tenta de novo mais tarde)`);
    await esperar(10000);
  }
}

export const atributo = (html, nome) => decodificarHTML((html.match(new RegExp(`${nome}="([^"]*)"`)) || [])[1] || '');

export function finalizar(ofertas, max = 10) {
  const vistos = new Set();
  const unicas = ofertas.filter((o) => (vistos.has(o.link) ? false : vistos.add(o.link)));
  unicas.sort((a, b) => a.preco - b.preco);
  const lista = unicas.slice(0, max);
  return { status: lista.length ? 'ok' : 'vazio', ofertas: lista };
}

export const descontoDe = (preco, original) => (original > preco ? Math.round((1 - preco / original) * 100) : 0);
