import {mkdir,copyFile,readFile} from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const meta=JSON.parse(await readFile(path.join(root,'node_modules/pdfjs-dist/package.json'),'utf8'));
if(meta.version!=='4.10.38')throw Error('pdfjs-dist deve ter exatamente a versão 4.10.38');
await mkdir(path.join(root,'vendor'),{recursive:true});
for(const name of ['pdf.min.mjs','pdf.worker.min.mjs'])await copyFile(path.join(root,'node_modules/pdfjs-dist/build',name),path.join(root,'vendor',name));
console.log('PDF.js preparado: '+meta.version);
