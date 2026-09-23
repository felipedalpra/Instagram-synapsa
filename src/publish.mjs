// Publica itens aprovados cuja data/hora já chegou. Rode de hora em hora.
import fs from 'node:fs/promises'; import path from 'node:path'; import {readJSON,writeJSON} from './lib.mjs';
const G='https://graph.facebook.com/v21.0', {IG_USER_ID:U,IG_ACCESS_TOKEN:T,PUBLIC_BASE_URL:BASE}=process.env;
const post=async(p,params)=>{const r=await fetch(G+p,{method:'POST',body:new URLSearchParams({...params,access_token:T})});const j=await r.json();if(j.error)throw new Error(JSON.stringify(j.error));return j;};
const get=async p=>(await fetch(G+p+(p.includes('?')?'&':'?')+'access_token='+T)).json();
const DIAS={domingo:0,segunda:1,terca:2,quarta:3,quinta:4,sexta:5,sabado:6};
function vencido(semana,m){ const d=new Date(semana+'T00:00:00-03:00'); d.setDate(d.getDate()+((DIAS[m.dia]-d.getDay()+7)%7));
  const [h,mi]=m.hora.split(':'); d.setHours(+h+3,+mi); return Date.now()>=d; } // -03:00 → UTC
for(const semana of await fs.readdir('output').catch(()=>[])) for(const slug of await fs.readdir(path.join('output',semana))){
  const mp=path.join('output',semana,slug,'meta.json'); const m=await readJSON(mp);
  if(m.status!=='aprovado'||!vencido(semana,m)) continue;
  const legenda=await fs.readFile(path.join('output',semana,slug,'legenda.txt'),'utf8');
  const filhos=[]; for(const a of m.arquivos) filhos.push((await post('/'+U+'/media',{image_url:BASE+'/'+semana+'/'+slug+'/'+a,is_carousel_item:'true'})).id);
  const c=await post('/'+U+'/media',{media_type:'CAROUSEL',children:filhos.join(','),caption:legenda});
  for(let i=0;i<20;i++){const s=await get('/'+c.id+'?fields=status_code'); if(s.status_code==='FINISHED')break; await new Promise(r=>setTimeout(r,3000));}
  const pub=await post('/'+U+'/media_publish',{creation_id:c.id});
  await writeJSON(mp,{...m,status:'publicado',ig_media_id:pub.id,publicado_em:new Date().toISOString()}); console.log('publicado',slug);
}
