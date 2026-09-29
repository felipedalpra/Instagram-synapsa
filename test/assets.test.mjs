import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {discoverAssets} from '../src/assets.mjs';

test('prioriza assets reais relacionados ao tema',async()=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'synapsa-assets-'));
  await fs.mkdir(path.join(root,'_previews_tmp'),{recursive:true});
  await fs.writeFile(path.join(root,'_previews_tmp','psicologo-agenda.jpg'),'teste');
  await fs.writeFile(path.join(root,'_previews_tmp','paciente-lyra.jpg'),'teste');
  const assets=await discoverAssets('Lembretes automáticos de consulta',{root,limit:2});
  assert.equal(assets[0].arquivo,'_previews_tmp/psicologo-agenda.jpg');
  assert.equal(assets[0].placeholder,'{{MEDIA_01}}');
  assert.ok(assets[0].score>assets[1].score);
});

test('não percorre coleções pessoais fora da lista segura',async()=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'synapsa-assets-'));
  await fs.mkdir(path.join(root,'time'),{recursive:true});
  await fs.writeFile(path.join(root,'time','pessoa.jpg'),'teste');
  assert.deepEqual(await discoverAssets('equipe',{root}),[]);
});
