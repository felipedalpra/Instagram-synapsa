import fs from 'node:fs/promises';
export const readJSON = async p => JSON.parse(await fs.readFile(p,'utf8'));
export const writeJSON = (p,d) => fs.writeFile(p, JSON.stringify(d,null,2));
export const pick = a => a[Math.floor(Math.random()*a.length)];
export const today = () => new Date().toISOString().slice(0,10);
// Lê os eixos de DIRECOES.md: cada "## X." vira um eixo e cada "- item" uma opção
export async function eixos(){
  const md = await fs.readFile('DIRECOES.md','utf8'); const out={}; let k=null;
  for (const l of md.split('\n')){
    const h=l.match(/^## [A-Z]\. (.+)/); if(h){k=h[1].split(' ')[0].toLowerCase(); out[k]=[]; continue;}
    const i=l.match(/^- ([^:]+)/); if(k&&i) out[k].push(i[1].trim());
  } return out; // {metáfora-herói:[..], ritmo:[..], composição:[..], voz:[..]}
}
