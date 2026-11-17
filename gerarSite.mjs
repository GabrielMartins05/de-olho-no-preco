import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { montarDados } from './produtos.mjs';

const PASTA = path.dirname(fileURLToPath(import.meta.url));
const SAIDA = path.join(PASTA, '_site');

await fs.rm(SAIDA, { recursive: true, force: true });
await fs.cp(path.join(PASTA, 'public'), SAIDA, { recursive: true });

const repo = process.env.GITHUB_REPOSITORY || '';
const dados = await montarDados({ modo: 'nuvem', repo, geradoEm: new Date().toISOString() });
await fs.writeFile(path.join(SAIDA, 'dados.json'), JSON.stringify(dados));

const sw = await fs.readFile(path.join(SAIDA, 'sw.js'), 'utf8');
await fs.writeFile(path.join(SAIDA, 'sw.js'), sw.replace('__VERSAO__', Date.now().toString(36)));

console.log(`Site gerado em _site (${dados.produtos.length} produtos, repo ${repo || '(local)'})`);
