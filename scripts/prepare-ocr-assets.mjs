// Ejecutar npm ci --prefix scripts/ocr-deps --ignore-scripts antes de preparar.
import {mkdir,copyFile,readFile,writeFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url)),deps=process.env.OCR_NODE_MODULES||join(root,'scripts/ocr-deps/node_modules'),out=join(root,'public/vendor/ocr/6.0.1');
await mkdir(out,{recursive:true});await mkdir(join(out,'core'),{recursive:true});await mkdir(join(out,'lang'),{recursive:true});
const files=[['tesseract.js/dist/tesseract.esm.min.js','tesseract.esm.min.js'],['tesseract.js/dist/worker.min.js','worker.min.js'],['tesseract.js/LICENSE.md','LICENSE-TESSERACT.txt'],['tesseract.js-core/LICENSE','LICENSE-CORE.txt'],['tesseract.js/dist/tesseract.min.js.LICENSE.txt','NOTICE-BUNDLE.txt'],['tesseract.js/dist/worker.min.js.LICENSE.txt','NOTICE-WORKER.txt'],...['','-simd','-lstm','-simd-lstm'].map(s=>[`tesseract.js-core/tesseract-core${s}.wasm.js`,`core/tesseract-core${s}.wasm.js`]),...['eng','spa'].map(l=>[`@tesseract.js-data/${l}/4.0.0_best_int/${l}.traineddata.gz`,`lang/${l}.traineddata.gz`])];
const manifest={version:'6.0.1',coreVersion:'6.0.0',languageVersion:'1.0.0',files:[]};
for(const[source,target]of files){const bytes=await readFile(join(deps,source));await copyFile(join(deps,source),join(out,target));manifest.files.push({path:target,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});}
const notice='Motor Tesseract.js 6.0.1 y tesseract.js-core 6.0.0: Apache-2.0.\nModelos eng/spa 4.0.0_best_int: naptha/tessdata y tesseract-ocr/tessdata, Apache-2.0; paquetes @tesseract.js-data/eng y /spa 1.0.0 indican MIT para el empaquetado.\nFuentes: https://github.com/naptha/tesseract.js y https://github.com/naptha/tessdata\nDistribución reproducible: versiones exactas y hashes de integridad npm en scripts/ocr-deps/package-lock.json. No se consulta un CDN en ejecución.\n';
await writeFile(join(out,'NOTICE.txt'),notice);await writeFile(join(out,'manifest.json'),JSON.stringify(manifest,null,2));console.log(`OCR autoalojado: ${manifest.files.length} recursos, ${(manifest.files.reduce((n,f)=>n+f.bytes,0)/1024/1024).toFixed(1)} MB; integridad npm lock verificada al instalar.`);
