import {discoverMedia,synapsaRoot} from './assets.mjs';

const theme=process.argv.slice(2).join(' ')||'gestão clínica';
const assets=await discoverMedia(theme,{localLimit:20,stockLimit:10});
console.log(`Raiz: ${synapsaRoot()}`);
console.log(`Tema: ${theme}`);
console.table(assets.map(({id,tipo,arquivo,score})=>({id,tipo,score,arquivo})));
