import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {render} from '../src/render.mjs';

test('renderiza slides, resolve a logo e cria folha de contato',async()=>{
  const out=await fs.mkdtemp(path.join(os.tmpdir(),'synapsa-render-'));
  const slides=[180,340,500,660].map((top,index)=>`<section class="slide"><h1 style="top:${top}px">Mensagem ${index+1}</h1></section>`);
  slides.push('<section class="slide"><h1 style="top:220px">Fechamento</h1><img class="logo-final" src="{{LOGO_CLARO}}"></section>');
  const html=`<!doctype html><style>*{box-sizing:border-box}body{margin:0}.slide{width:1080px;height:1350px;position:relative;overflow:hidden;background:#E1E8FF}.slide h1{position:absolute;left:96px;margin:0;color:#0E0D3A;font:800 80px/1 Poppins,sans-serif}.logo-final{position:absolute;left:96px;top:600px;width:560px}</style>${slides.join('')}`;
  const result=await render(html,out);
  assert.deepEqual(result.erros,[]);
  assert.equal(result.files.length,5);
  assert.ok(result.contactSheet);
  assert.equal(result.html.includes('{{LOGO_CLARO}}'),false);
});
