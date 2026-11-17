import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { exec } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { coletarTudo, lerJSON, ARQ_HISTORICO } from './coletor.mjs';
import { adicionarProduto, removerProduto, trocarTipo, montarDados } from './produtos.mjs';

const PORTA = 4747;
const PASTA = path.dirname(fileURLToPath(import.meta.url));
const PUBLICA = path.join(PASTA, 'public');
const HORAS_ENTRE_COLETAS = 6;
const TIPOS_ARQUIVO = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

let coletando = false;

async function coletar(apenasId) {
  if (coletando) return false;
  coletando = true;
  try {
    await coletarTudo(apenasId);
  } finally {
    coletando = false;
  }
  return true;
}

function responder(res, codigo, corpo, tipo = 'application/json; charset=utf-8') {
  res.writeHead(codigo, { 'Content-Type': tipo, 'Cache-Control': 'no-store' });
  res.end(typeof corpo === 'string' || Buffer.isBuffer(corpo) ? corpo : JSON.stringify(corpo));
}

async function lerCorpo(req) {
  let s = '';
  for await (const parte of req) s += parte;
  return s ? JSON.parse(s) : {};
}

const servidor = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const idDaUrl = () => decodeURIComponent(url.pathname.split('/').pop());
  try {
    if (req.method === 'GET' && url.pathname === '/api/dados') {
      return responder(res, 200, await montarDados({ modo: 'local', coletando }));
    }

    if (req.method === 'POST' && url.pathname === '/api/atualizar') {
      const { id } = await lerCorpo(req);
      const ok = await coletar(id);
      return responder(res, ok ? 200 : 409, { ok, mensagem: ok ? 'Atualizado' : 'Já tem uma coleta rodando' });
    }

    if (req.method === 'POST' && url.pathname === '/api/produtos') {
      const novo = await adicionarProduto(await lerCorpo(req));
      await coletar(novo.id);
      return responder(res, 200, { ok: true, produto: novo });
    }

    if (req.method === 'PATCH' && url.pathname.startsWith('/api/produtos/')) {
      const { tipo } = await lerCorpo(req);
      if (await trocarTipo(idDaUrl(), tipo)) await coletar(idDaUrl());
      return responder(res, 200, { ok: true });
    }

    if (req.method === 'DELETE' && url.pathname.startsWith('/api/produtos/')) {
      await removerProduto(idDaUrl());
      return responder(res, 200, { ok: true });
    }

    if (req.method === 'GET') {
      const nome = url.pathname === '/' ? 'index.html' : url.pathname.slice(1);
      const arquivo = path.join(PUBLICA, path.normalize(nome));
      if (arquivo.startsWith(PUBLICA)) {
        try {
          const conteudo = await fs.readFile(arquivo);
          return responder(res, 200, conteudo, TIPOS_ARQUIVO[path.extname(arquivo)] || 'application/octet-stream');
        } catch {}
      }
    }

    responder(res, 404, { ok: false, mensagem: 'Não encontrado' });
  } catch (e) {
    console.error(e);
    responder(res, 500, { ok: false, mensagem: e.message });
  }
});

servidor.listen(PORTA, '127.0.0.1', async () => {
  const endereco = `http://localhost:${PORTA}`;
  console.log(`Site de preços rodando em ${endereco}  (feche esta janela para desligar)`);
  if (process.argv.includes('--abrir')) exec(`start "" ${endereco}`);

  const h = await lerJSON(ARQ_HISTORICO, []);
  const ultima = h.length ? h[h.length - 1].data : null;
  const limite = HORAS_ENTRE_COLETAS * 3600 * 1000;
  if (!ultima || Date.now() - new Date(ultima).getTime() > limite) coletar();
  setInterval(() => coletar(), limite);
});

servidor.on('error', (e) => {
  if (e.code === 'EADDRINUSE') {
    console.log(`O site já está aberto em http://localhost:${PORTA}`);
    if (process.argv.includes('--abrir')) exec(`start "" http://localhost:${PORTA}`);
    setTimeout(() => process.exit(0), 1500);
  } else throw e;
});
