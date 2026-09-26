// Publica todos os itens aprovados. Roda de hora em hora (rede de segurança)
// e também é disparado na hora pelo Worker assim que alguém aprova pelo email.
import fs from 'node:fs/promises'; import path from 'node:path'; import {readJSON,writeJSON} from './lib.mjs';
const G='https://graph.facebook.com/v21.0', {IG_USER_ID:U,IG_ACCESS_TOKEN:T,PUBLIC_BASE_URL:BASE}=process.env;
const post=async(p,params)=>{const r=await fetch(G+p,{method:'POST',body:new URLSearchParams({...params,access_token:T})});const j=await r.json();if(j.error)throw new Error(JSON.stringify(j.error));return j;};
const get=async p=>(await fetch(G+p+(p.includes('?')?'&':'?')+'access_token='+T)).json();
for(const semana of await fs.readdir('output').catch(()=>[])) for(const slug of await fs.readdir(path.join('output',semana))){
  const mp=path.join('output',semana,slug,'meta.json'); const m=await readJSON(mp);
  if(m.status!=='aprovado') continue;
  const legenda=await fs.readFile(path.join('output',semana,slug,'legenda.txt'),'utf8');
  const filhos=[]; for(const a of m.arquivos) filhos.push((await post('/'+U+'/media',{image_url:BASE+'/'+semana+'/'+slug+'/'+a,is_carousel_item:'true'})).id);
  const c=await post('/'+U+'/media',{media_type:'CAROUSEL',children:filhos.join(','),caption:legenda});
  for(let i=0;i<20;i++){const s=await get('/'+c.id+'?fields=status_code'); if(s.status_code==='FINISHED')break; await new Promise(r=>setTimeout(r,3000));}
  const pub=await post('/'+U+'/media_publish',{creation_id:c.id});
  await writeJSON(mp,{...m,status:'publicado',ig_media_id:pub.id,publicado_em:new Date().toISOString()}); console.log('publicado',slug);
}
