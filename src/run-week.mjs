import fs from 'node:fs/promises';
import path from 'node:path';
import {plan} from './plan.mjs'; import {generate} from './generate.mjs'; import {render} from './render.mjs';
import {readJSON,writeJSON,today} from './lib.mjs';
const NUM=/\d+[.,]?\d*\s?%|\d{2,}\s?(mil|milhões)/i;
const itens=await plan(); const semana=path.join('output',today());
const hist=await readJSON('state/historico.json');
for(const item of itens){
  let out=await generate(item), rep, tent=0;
  const dir=path.join(semana,out.slug); await fs.mkdir(dir,{recursive:true});
  while(true){
    rep=await render(out.html,dir);
    if(NUM.test(out.html.replace(/<[^>]+>/g,' ')) && !(out.fontes||[]).length) rep.erros.push('há números sem fontes[] declaradas');
    if(!rep.erros.length||tent++>=2) break;
    out=await generate(item,rep.erros.join('\n'),out.html);
  }
  await fs.writeFile(path.join(dir,'carrossel.html'),out.html);
  await fs.writeFile(path.join(dir,'legenda.txt'),out.legenda+'\n\n'+out.hashtags.join(' '));
  await writeJSON(path.join(dir,'meta.json'),{tema:item.tema,direcao:item.direcao,dia:item.dia,hora:item.hora,fontes:out.fontes,
    status:rep.erros.length?'erro-lint':'pendente',erros:rep.erros,arquivos:rep.files.map(f=>path.basename(f))});
  hist.itens.push({data:today(),tema:item.tema,direcao:item.direcao,metafora_usada:out.metafora_usada});
  console.log(out.slug, rep.erros.length?'⚠ '+rep.erros.length+' erros':'ok');
}
await writeJSON('state/historico.json',hist);
