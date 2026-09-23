import {chromium} from 'playwright';
import path from 'node:path';
export async function render(html, outDir){
  const abs=p=>'file://'+path.resolve(p);
  html=html.replaceAll('{{LOGO_CLARO}}',abs('assets/synapsa-logo.png')).replaceAll('{{LOGO_ESCURO}}',abs('assets/synapsa-logo-escuro.png'));
  const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1080,height:1350}});
  await p.setContent(html,{waitUntil:'networkidle'}); await p.evaluate(()=>document.fonts.ready);
  const report=await p.evaluate(()=>{
    const slides=[...document.querySelectorAll('section.slide')]; const erros=[];
    slides.forEach((s,i)=>{
      const r=s.getBoundingClientRect();
      if(Math.round(r.width)!==1080||Math.round(r.height)!==1350) erros.push('slide '+(i+1)+': tamanho '+r.width+'x'+r.height);
      s.querySelectorAll('*').forEach(el=>{
        if(![...el.childNodes].some(n=>n.nodeType===3&&n.textContent.trim())) return;
        const cs=getComputedStyle(el), fs=parseFloat(cs.fontSize), e=el.getBoundingClientRect();
        if(fs<24) erros.push('slide '+(i+1)+': texto '+fs+'px < 24px ("'+el.textContent.trim().slice(0,30)+'")');
        if(e.left<r.left+60||e.right>r.right-60||e.top<r.top+60||e.bottom>r.bottom-60) erros.push('slide '+(i+1)+': texto fora da margem ("'+el.textContent.trim().slice(0,30)+'")');
        if(!/Poppins|DM Mono/.test(cs.fontFamily)) erros.push('slide '+(i+1)+': fonte fora da marca '+cs.fontFamily);
      });
    });
    const last=slides.at(-1); if(!last?.querySelector('img[src*="synapsa-logo"]')) erros.push('último slide sem logo');
    if(slides.length<5||slides.length>8) erros.push('número de slides '+slides.length+' (esperado 5–8)');
    return {n:slides.length,erros:[...new Set(erros)].slice(0,25)};
  });
  const files=[];
  if(!report.erros.length){
    const els=await p.$$('section.slide');
    for(let i=0;i<els.length;i++){const f=path.join(outDir,String(i+1).padStart(2,'0')+'.jpg'); await els[i].screenshot({path:f,type:'jpeg',quality:92}); files.push(f);}
  }
  await b.close(); return {...report,files};
}
