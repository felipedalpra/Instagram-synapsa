import test from 'node:test';
import assert from 'node:assert/strict';
import {discoverPexels,pexelsQuery} from '../src/pexels.mjs';

test('traduz o tema para uma busca fotográfica contextual',()=>{
  assert.equal(pexelsQuery('Lembretes automáticos de consulta'),'therapist office calendar desk');
  assert.equal(pexelsQuery('Terapia online: o que muda'),'online therapy home office');
});

test('consulta Pexels com autenticação e preserva crédito e licença',async()=>{
  let request;
  const fetchImpl=async(url,options)=>{
    request={url:String(url),options};
    return {ok:true,json:async()=>({photos:[{
      id:42,alt:'A calm professional office',photographer:'Ana Foto',url:'https://www.pexels.com/photo/42/',
      src:{portrait:'https://images.pexels.com/photos/42/portrait.jpeg'}
    }]})};
  };
  const [asset]=await discoverPexels('Gestão clínica',{apiKey:'segredo',fetchImpl});
  assert.equal(request.options.headers.Authorization,'segredo');
  assert.match(request.url,/orientation=portrait/);
  assert.equal(asset.tipo,'pexels');
  assert.equal(asset.fotografo,'Ana Foto');
  assert.equal(asset.licenca,'Pexels License');
});

test('segue sem banco público quando a chave não existe',async()=>{
  assert.deepEqual(await discoverPexels('Agenda',{apiKey:''}),[]);
});
