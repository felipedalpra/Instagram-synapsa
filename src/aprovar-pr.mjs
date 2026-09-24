// Roda no workflow de review: marca como "aprovado" todo meta.json pendente em output/.
// Itens com status "erro-lint" (falharam a checagem de qualidade 2x) não são auto-aprovados.
import fs from 'node:fs/promises';
import path from 'node:path';
import {readJSON,writeJSON} from './lib.mjs';

async function achar(dir){
  const out=[];
  for(const e of await fs.readdir(dir,{withFileTypes:true})){
    const p=path.join(dir,e.name);
    if(e.isDirectory()) out.push(...await achar(p));
    else if(e.name==='meta.json') out.push(p);
  }
  return out;
}

for(const p of await achar('output').catch(()=>[])){
  const m=await readJSON(p);
  if(m.status==='pendente'){ await writeJSON(p,{...m,status:'aprovado'}); console.log('aprovado',p); }
}
