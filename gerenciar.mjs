import { coletarTudo } from './coletor.mjs';
import { adicionarProduto, removerProduto, trocarTipo } from './produtos.mjs';

const e = process.env;
const acao = (e.ACAO || 'coletar').trim();
const id = (e.ID || '').trim();

let mensagem;
switch (acao) {
  case 'adicionar': {
    const novo = await adicionarProduto({ nome: e.NOME, busca: e.BUSCA, tipo: e.TIPO || 'auto', imagem: e.IMAGEM, steamAppId: e.STEAM });
    console.log(`Adicionado: ${novo.nome} (${novo.tipo})`);
    await coletarTudo(novo.id);
    mensagem = `Adiciona ${novo.nome}`;
    break;
  }
  case 'remover':
    if (!id) throw new Error('Faltou o ID');
    await removerProduto(id);
    mensagem = `Remove ${id}`;
    break;
  case 'tipo':
    if (!id) throw new Error('Faltou o ID');
    if (await trocarTipo(id, (e.TIPO || '').trim())) await coletarTudo(id);
    mensagem = `Troca tipo de ${id} para ${e.TIPO}`;
    break;
  case 'coletar':
    await coletarTudo(id || undefined);
    mensagem = id ? `Atualiza preços de ${id}` : 'Atualiza preços';
    break;
  default:
    throw new Error(`Ação desconhecida: ${acao}`);
}

if (e.GITHUB_OUTPUT) {
  const fs = await import('node:fs');
  fs.appendFileSync(e.GITHUB_OUTPUT, `mensagem=${mensagem.replace(/[\r\n]/g, ' ')}\n`);
}
console.log(mensagem);
