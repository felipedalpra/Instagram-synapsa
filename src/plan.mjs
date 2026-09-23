import {readJSON,pick,eixos,today} from './lib.mjs';
export async function plan(){
  const {temas}=await readJSON('config/temas.json');
  const ag=await readJSON('config/agenda.json');
  const hist=await readJSON('state/historico.json');
  const corte=Date.now()-ag.janela_sem_repetir_semanas*7*864e5;
  const recentes=hist.itens.filter(i=>new Date(i.data)>=corte);
  const usados=new Set(recentes.map(i=>i.tema));
  const livres=temas.filter(t=>!usados.has(t)).sort(()=>Math.random()-.5);
  const E=await eixos(); const [kM,kR,kC,kV]=Object.keys(E);
  const combos=new Set(recentes.map(i=>JSON.stringify(i.direcao)));
  return livres.slice(0,ag.posts_por_semana).map((tema,i)=>{
    let d; do { d={metafora:pick(E[kM]),ritmo:pick(E[kR]),composicao:pick(E[kC]),gancho:pick(E[kV])}; }
    while (combos.has(JSON.stringify(d)) || recentes.slice(-3).some(r=>r.direcao.metafora===d.metafora));
    combos.add(JSON.stringify(d));
    return {tema,direcao:d,dia:ag.dias[i],hora:ag.hora,historico:recentes.map(r=>r.metafora_usada)};
  });
}
