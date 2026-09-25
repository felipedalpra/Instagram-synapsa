// Roda depois do commit+push da semana: manda 1 email por carrossel pendente,
// com as imagens (já públicas via PUBLIC_BASE_URL) e um botão de aprovar assinado.
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {readJSON,writeJSON} from './lib.mjs';

const {RESEND_API_KEY, RESEND_FROM, APROVAR_PARA, APPROVAL_SECRET, APPROVAL_WORKER_URL, PUBLIC_BASE_URL} = process.env;

function assinar(item){
  return crypto.createHmac('sha256', APPROVAL_SECRET).update(item).digest('hex');
}

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
  if(m.status!=='pendente' || m.notificado) continue;

  const item=path.relative('output',path.dirname(p)); // "2026-09-24/slug"
  const slug=path.basename(path.dirname(p));
  const sig=assinar(item);
  const aprovarUrl=`${APPROVAL_WORKER_URL}/aprovar?item=${encodeURIComponent(item)}&sig=${sig}`;
  const imgs=m.arquivos.map(a=>`${PUBLIC_BASE_URL}/${item}/${a}`);
  const legenda=await fs.readFile(path.join(path.dirname(p),'legenda.txt'),'utf8').catch(()=>'');

  const html=`
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
      <h2>Novo carrossel: ${m.tema}</h2>
      <p><strong>Agendado:</strong> ${m.dia} às ${m.hora}</p>
      ${imgs.map(u=>`<img src="${u}" width="100%" style="border-radius:12px;margin-bottom:8px">`).join('')}
      <p style="white-space:pre-wrap;background:#f5f5f5;padding:12px;border-radius:8px">${legenda}</p>
      <p style="text-align:center;margin:24px 0">
        <a href="${aprovarUrl}" style="background:#7c3aed;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold">Aprovar e publicar</a>
      </p>
    </div>`;

  const r=await fetch('https://api.resend.com/emails',{
    method:'POST',
    headers:{Authorization:`Bearer ${RESEND_API_KEY}`,'Content-Type':'application/json'},
    body:JSON.stringify({from:RESEND_FROM,to:APROVAR_PARA,subject:`Aprovar carrossel: ${m.tema}`,html})
  });
  if(!r.ok) throw new Error('falha ao enviar email: '+await r.text());
  console.log('email enviado', slug);

  await writeJSON(p,{...m,notificado:true});
}
