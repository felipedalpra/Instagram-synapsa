// Gera via Claude Code CLI (modo headless), usando a assinatura Pro/Max, sem chave de API.
// Local: basta estar logado no `claude`. CI: defina CLAUDE_CODE_OAUTH_TOKEN (gerado com `claude setup-token`).
import {spawn} from 'node:child_process';
import fs from 'node:fs/promises';
import {discoverAssets,assetsForPrompt} from './assets.mjs';
function claude(prompt, system){
  // Versões atuais do Claude Code podem usar uma etapa interna adicional para
  // concluir a resposta estruturada, mesmo sem ferramentas externas habilitadas.
  const args=['-p','--output-format','json','--max-turns','3','--tools','','--system-prompt',system];
  if(process.env.CLAUDE_MODEL) args.push('--model',process.env.CLAUDE_MODEL);
  return new Promise((ok,fail)=>{
    const c=spawn('claude',args,{env:process.env}); let out='',err='';
    c.stdout.on('data',d=>out+=d); c.stderr.on('data',d=>err+=d);
    c.on('error',e=>fail(new Error('spawn error: '+e.message)));
    c.on('close',code=>{ if(code) return fail(new Error('claude saiu com '+code+' stderr='+JSON.stringify(err)+' stdout='+JSON.stringify(out)));
      const j=JSON.parse(out); if(j.is_error) return fail(new Error(j.result)); ok(j.result); });
    c.stdin.end(prompt);
  });
}
async function createBrief(item,assets,brand,dirs){
  const prompt=`Você é estrategista editorial e diretor de criação da Synapsa.
Planeje um carrossel realmente útil para psicólogos clínicos brasileiros.

TEMA: ${item.tema}
DIREÇÃO INICIAL (pode adaptar se não servir ao tema): ${JSON.stringify(item.direcao)}
HISTÓRICO A EVITAR: ${item.historico.join(' | ')||'—'}

ASSETS REAIS DISPONÍVEIS:
${assetsForPrompt(assets)}

Crie 3 alternativas de capa substancialmente diferentes, escolha a que melhor combina clareza, originalidade e força visual, e então desenvolva o carrossel. Escolha uma família editorial coerente (produto na prática, cena da rotina, anatomia de funcionalidade, educação profissional, dado como história, bastidores ou comparação de processo). Use somente fatos demonstráveis. Se houver assets adequados, selecione de 1 a 4 placeholders e faça deles parte central da narrativa.

Retorne APENAS JSON válido:
{"familia":"...","objetivo":"...","alternativas_capa":[{"gancho":"...","visual":"..."},{"gancho":"...","visual":"..."},{"gancho":"...","visual":"..."}],"gancho_escolhido":"até 10 palavras","promessa_editorial":"...","assets_escolhidos":["{{MEDIA_01}}"],"slides":[{"papel":"capa|problema|prova|explicacao|passo|fechamento","mensagem":"...","visual":"..."}],"direcao_visual":"...","evitar":["..."]}

O plano deve ter de 5 a 8 slides. Não escreva HTML.`;
  const raw=await claude(prompt,`Siga estas regras de marca:\n${brand}\n\nUse estas direções como repertório, não como obrigação aleatória:\n${dirs}`);
  return JSON.parse(raw.slice(raw.indexOf('{'),raw.lastIndexOf('}')+1));
}
export async function generate(item, feedback=null, anterior=null){
  const [brand,dirs,sys,assets]=await Promise.all([
    ...['BRAND.md','DIRECOES.md','prompts/carrossel.md'].map(p=>fs.readFile(p,'utf8')),
    discoverAssets(item.tema)
  ]);
  const brief=feedback&&item.brief?item.brief:await createBrief(item,assets,brand,dirs);
  const user=[
    'TEMA: '+item.tema,
    'BRIEFING EDITORIAL APROVADO: '+JSON.stringify(brief),
    'ASSETS REAIS DISPONÍVEIS (use exatamente os placeholders):\n'+assetsForPrompt(assets),
    'HISTÓRICO (não repetir): '+(item.historico.join(' | ')||'—'),
    feedback?'CORRIJA ESTES PROBLEMAS DA VERSÃO ANTERIOR:\n'+feedback:'',
    anterior?'VERSÃO ANTERIOR (html):\n'+anterior:''
  ].filter(Boolean).join('\n\n');
  const txt=await claude(user, sys+'\n\n--- BRAND.md ---\n'+brand+'\n\n--- DIRECOES.md ---\n'+dirs);
  const result=JSON.parse(txt.slice(txt.indexOf('{'),txt.lastIndexOf('}')+1));
  result.brief=brief;
  Object.defineProperty(result,'_assets',{value:assets,enumerable:false});
  return result;
}
