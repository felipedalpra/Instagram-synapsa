import {chromium} from 'playwright';
import path from 'node:path';
import fs from 'node:fs/promises';

const mime=file=>({'.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp'}[path.extname(file).toLowerCase()]||'application/octet-stream');
const dataUrl=(buffer,type)=>`data:${type};base64,${buffer.toString('base64')}`;

async function materialize(html,assets){
  const replacements=[
    {placeholder:'{{LOGO_CLARO}}',path:'assets/synapsa-logo.png'},
    {placeholder:'{{LOGO_ESCURO}}',path:'assets/synapsa-logo-escuro.png'},
    ...(assets||[])
  ];
  const used=[]; const missing=[];
  for(const asset of replacements){
    const {placeholder}=asset;
    if(!html.includes(placeholder)) continue;
    try{
      let buffer,type;
      if(asset.url){
        const response=await fetch(asset.url);
        if(!response.ok) throw new Error(`HTTP ${response.status}`);
        buffer=Buffer.from(await response.arrayBuffer());
        type=response.headers.get('content-type')||'image/jpeg';
      }else{
        buffer=await fs.readFile(asset.path); type=mime(asset.path);
      }
      html=html.replaceAll(placeholder,dataUrl(buffer,type));
      if(placeholder.startsWith('{{MEDIA_')) used.push(placeholder);
    }catch(error){ missing.push(`${placeholder}: ${asset.path||asset.url} (${error.message})`); }
  }
  return {html,used,missing,unresolved:[...html.matchAll(/{{(?:LOGO|MEDIA)_[A-Z0-9_]+}}/g)].map(m=>m[0])};
}

async function contactSheet(browser,files,outDir){
  const cards=[];
  for(const [index,file] of files.entries()) cards.push(`<figure><img src="${dataUrl(await fs.readFile(file),'image/jpeg')}"><figcaption>${String(index+1).padStart(2,'0')}</figcaption></figure>`);
  const page=await browser.newPage({viewport:{width:960,height:1200},deviceScaleFactor:1});
  await page.setContent(`<!doctype html><style>*{box-sizing:border-box}body{margin:0;padding:42px;background:#0B0A2E;font-family:Arial;color:white}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:24px}figure{margin:0}img{display:block;width:100%;aspect-ratio:4/5;object-fit:cover;border-radius:12px}figcaption{text-align:center;margin-top:8px;font-size:18px}</style><div class="grid">${cards.join('')}</div>`);
  const file=path.join(outDir,'contato.jpg');
  await page.screenshot({path:file,type:'jpeg',quality:88,fullPage:true});
  await page.close(); return file;
}

export async function render(sourceHtml,outDir,assets=[]){
  const prepared=await materialize(sourceHtml,assets);
  const browser=await chromium.launch(); let page;
  try{
    page=await browser.newPage({viewport:{width:1080,height:1350},deviceScaleFactor:1});
    await page.setContent(prepared.html,{waitUntil:'networkidle'});
    await page.evaluate(()=>document.fonts.ready);
    await page.waitForFunction(()=>[...document.images].every(img=>img.complete),null,{timeout:10000}).catch(()=>{});
    const report=await page.evaluate(()=>{
      const slides=[...document.querySelectorAll('section.slide')]; const erros=[]; const layouts=[];
      const rgb=value=>{const m=value.match(/rgba?\((\d+)[, ]+(\d+)[, ]+(\d+)(?:[, /]+([\d.]+))?\)/);return m?[+m[1],+m[2],+m[3],m[4]===undefined?1:+m[4]]:null};
      const luminance=c=>{const v=c.slice(0,3).map(x=>{x/=255;return x<=.03928?x/12.92:((x+.055)/1.055)**2.4});return .2126*v[0]+.7152*v[1]+.0722*v[2]};
      const contrast=(a,b)=>{const [l1,l2]=[luminance(a),luminance(b)].sort((x,y)=>y-x);return (l1+.05)/(l2+.05)};
      slides.forEach((slide,index)=>{
        const number=index+1,rect=slide.getBoundingClientRect(); let chars=0; const layout=[];
        if(Math.round(rect.width)!==1080||Math.round(rect.height)!==1350) erros.push(`slide ${number}: tamanho ${rect.width}x${rect.height}`);
        slide.querySelectorAll('img').forEach(img=>{
          if(!img.complete||!img.naturalWidth) erros.push(`slide ${number}: imagem quebrada`);
          if(img.classList.contains('media-real')&&getComputedStyle(img).objectFit==='fill') erros.push(`slide ${number}: asset real sem object-fit intencional`);
        });
        slide.querySelectorAll('*').forEach(el=>{
          const own=[...el.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent.trim()).join(' ');
          if(!own) return; chars+=own.length;
          const cs=getComputedStyle(el),fontSize=parseFloat(cs.fontSize),box=el.getBoundingClientRect();
          if(fontSize<24) erros.push(`slide ${number}: texto ${fontSize}px < 24px ("${own.slice(0,30)}")`);
          if(!el.closest('[data-bleed="true"]')&&(box.left<rect.left+88||box.right>rect.right-88||box.top<rect.top+88||box.bottom>rect.bottom-88)) erros.push(`slide ${number}: texto fora da margem segura ("${own.slice(0,30)}")`);
          const clipsX=['hidden','clip'].includes(cs.overflowX),clipsY=['hidden','clip'].includes(cs.overflowY);
          if((clipsX&&el.scrollWidth>el.clientWidth+3)||(clipsY&&el.scrollHeight>el.clientHeight+3)) erros.push(`slide ${number}: texto cortado ("${own.slice(0,30)}")`);
          if(!/Poppins|DM Mono/.test(cs.fontFamily)) erros.push(`slide ${number}: fonte fora da marca ${cs.fontFamily}`);
          const fg=rgb(cs.color),bg=rgb(cs.backgroundColor);
          if(fg&&bg&&bg[3]>.95&&contrast(fg,bg)<(fontSize>=36?3:4.2)) erros.push(`slide ${number}: contraste baixo ("${own.slice(0,30)}")`);
          if(fontSize>=36) layout.push(`${Math.round((box.left-rect.left)/135)}:${Math.round((box.top-rect.top)/169)}:${Math.round(fontSize/18)}`);
        });
        if(chars>500) erros.push(`slide ${number}: texto demais (${chars} caracteres)`);
        layouts.push(layout.sort().join('|'));
      });
      for(let i=1;i<layouts.length-1;i++) if(layouts[i]&&layouts[i]===layouts[i-1]) erros.push(`slides ${i} e ${i+1}: composição principal repetida`);
      const last=slides.at(-1),logo=last?.querySelector('img.logo-final');
      if(!logo||!logo.complete||!logo.naturalWidth) erros.push('último slide sem logo válida com class="logo-final"');
      if(slides.length<5||slides.length>8) erros.push(`número de slides ${slides.length} (esperado 5–8)`);
      return {n:slides.length,erros:[...new Set(erros)].slice(0,40),layouts};
    });
    report.erros.push(...prepared.missing.map(x=>'asset ausente: '+x),...prepared.unresolved.map(x=>'placeholder não resolvido: '+x));
    if((assets||[]).some(a=>a.score>=15)&&!prepared.used.length) report.erros.push('há assets reais relevantes, mas nenhum foi usado');
    const files=[]; let sheet=null;
    if(!report.erros.length){
      const elements=await page.$$('section.slide');
      for(let i=0;i<elements.length;i++){
        const file=path.join(outDir,String(i+1).padStart(2,'0')+'.jpg');
        await elements[i].screenshot({path:file,type:'jpeg',quality:92}); files.push(file);
      }
      sheet=await contactSheet(browser,files,outDir);
    }
    return {...report,erros:[...new Set(report.erros)].slice(0,40),files,contactSheet:sheet,html:prepared.html,assetsUsados:prepared.used};
  }finally{
    await page?.close().catch(()=>{}); await browser.close();
  }
}
