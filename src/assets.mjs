import fs from 'node:fs/promises';
import path from 'node:path';

const IMAGE_EXTENSIONS=new Set(['.png','.jpg','.jpeg','.webp']);
const COLLECTIONS=[
  {dir:'_previews_tmp',kind:'produto',priority:12},
  {dir:'Prints uso video',kind:'produto',priority:10},
  {dir:'Prints plat psi',kind:'produto',priority:10},
  {dir:'Prints plat paci',kind:'produto',priority:7},
  {dir:'Marketing/Criativos-synapsa',kind:'criativo',priority:6},
  {dir:'Marketing/Assets',kind:'marca',priority:5},
  {dir:'logos_branding_novo',kind:'marca',priority:3},
  {dir:'assets/library',kind:'curado',priority:15,local:true}
];

const TOPIC_HINTS=[
  [/agenda|lembrete|falta|cancel|consulta/,['agenda','consulta','dashboard','atendimento','calendario']],
  [/ia|lyra|inteligencia/,['lyra','ia','workspace']],
  [/gestao|planilha|tempo|tarefa|burnout/,['dashboard','workspace','financeiro','relatorio']],
  [/prontuario|tratamento|adesao|sessao|paciente/,['paciente','praticas','escalas','relatorio']],
  [/seo|google|perfil|divulgacao/,['perfil-publico','demonstracao-publico','biohub']],
  [/preco|precifica|pagamento|financeiro/,['financeiro','pagamento','dashboard']],
  [/escala|avaliacao|progresso/,['escalas','progresso','relatorio']]
];

const normalize=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const words=s=>new Set(normalize(s).split(/[^a-z0-9]+/).filter(w=>w.length>2));

async function walk(dir,out=[]){
  let entries;
  try{ entries=await fs.readdir(dir,{withFileTypes:true}); }catch{ return out; }
  for(const entry of entries){
    if(entry.name.startsWith('.')) continue;
    const file=path.join(dir,entry.name);
    if(entry.isDirectory()) await walk(file,out);
    else if(IMAGE_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) out.push(file);
  }
  return out;
}

export function synapsaRoot(){
  return path.resolve(process.env.SYNAPSA_MEDIA_ROOT||path.join(process.cwd(),'../..'));
}

export async function discoverAssets(theme,{limit=12,root=synapsaRoot()}={}){
  const themeWords=words(theme); const hints=[]; const normalizedTheme=normalize(theme);
  for(const [pattern,values] of TOPIC_HINTS) if(pattern.test(normalizedTheme)) hints.push(...values);
  const candidates=[];
  for(const collection of COLLECTIONS){
    const base=collection.local?path.join(process.cwd(),collection.dir):path.join(root,collection.dir);
    for(const file of await walk(base)){
      const relative=collection.local?path.relative(process.cwd(),file):path.relative(root,file);
      const haystack=normalize(relative); const fileWords=words(relative);
      let score=collection.priority;
      for(const word of themeWords) if(fileWords.has(word)||haystack.includes(word)) score+=8;
      for(const hint of hints) if(haystack.includes(normalize(hint))) score+=12;
      if(/logo|favicon|placeholder/.test(haystack)) score-=8;
      if(/criativo|apresentacao/.test(haystack)) score+=1;
      candidates.push({file:path.resolve(file),relative,kind:collection.kind,score});
    }
  }
  candidates.sort((a,b)=>b.score-a.score||a.relative.localeCompare(b.relative));
  const selected=[]; const names=new Set();
  for(const candidate of candidates){
    const key=normalize(path.basename(candidate.file)).replace(/\W/g,'');
    if(names.has(key)) continue;
    names.add(key); selected.push(candidate);
    if(selected.length>=limit) break;
  }
  return selected.map((asset,index)=>({
    id:`MEDIA_${String(index+1).padStart(2,'0')}`,
    placeholder:`{{MEDIA_${String(index+1).padStart(2,'0')}}}`,
    path:asset.file,
    arquivo:asset.relative,
    tipo:asset.kind,
    score:asset.score
  }));
}

export function assetsForPrompt(assets){
  if(!assets.length) return 'Nenhum asset real disponível neste ambiente. Use recursos CSS e não invente telas do produto.';
  return assets.map(a=>`${a.placeholder} | ${a.tipo} | ${a.arquivo}`).join('\n');
}
