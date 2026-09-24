// Gera via Claude Code CLI (modo headless), usando a assinatura Pro/Max, sem chave de API.
// Local: basta estar logado no `claude`. CI: defina CLAUDE_CODE_OAUTH_TOKEN (gerado com `claude setup-token`).
import {spawn} from 'node:child_process';
import fs from 'node:fs/promises';
function claude(prompt, system){
  const args=['-p','--output-format','json','--max-turns','1','--tools','','--system-prompt',system];
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
export async function generate(item, feedback=null, anterior=null){
  const [brand,dirs,sys]=await Promise.all(['BRAND.md','DIRECOES.md','prompts/carrossel.md'].map(p=>fs.readFile(p,'utf8')));
  const user=[
    'TEMA: '+item.tema,
    'DIREÇÃO DE ARTE SORTEADA: '+JSON.stringify(item.direcao),
    'HISTÓRICO (não repetir): '+(item.historico.join(' | ')||'—'),
    feedback?'CORRIJA ESTES PROBLEMAS DA VERSÃO ANTERIOR:\n'+feedback:'',
    anterior?'VERSÃO ANTERIOR (html):\n'+anterior:''
  ].filter(Boolean).join('\n\n');
  const txt=await claude(user, sys+'\n\n--- BRAND.md ---\n'+brand+'\n\n--- DIRECOES.md ---\n'+dirs);
  return JSON.parse(txt.slice(txt.indexOf('{'),txt.lastIndexOf('}')+1));
}
