// node src/aprovar.mjs output/2026-09-28/<slug>   → marca como aprovado
import {readJSON,writeJSON} from './lib.mjs';
for(const d of process.argv.slice(2)){const p=d+'/meta.json';const m=await readJSON(p);await writeJSON(p,{...m,status:'aprovado'});console.log('aprovado',d);}
