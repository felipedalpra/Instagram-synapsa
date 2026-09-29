import {discoverAssets,synapsaRoot} from './assets.mjs';

const theme=process.argv.slice(2).join(' ')||'gestão clínica';
const assets=await discoverAssets(theme,{limit:30});
console.log(`Raiz: ${synapsaRoot()}`);
console.log(`Tema: ${theme}`);
console.table(assets.map(({id,tipo,arquivo,score})=>({id,tipo,score,arquivo})));
