// 把 JSON（{zh:{},ro:{},en:{}}）合并进 js/i18n/{zh,ro,en}.js，保持原有顺序和文件头注释
import fs from 'fs';import path from 'path';import {fileURLToPath,pathToFileURL} from 'url';
const here=path.dirname(fileURLToPath(import.meta.url)),dir=path.join(here,'../../js/i18n');
const add=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
for(const l of ['zh','ro','en']){const f=path.join(dir,l+'.js');const src=fs.readFileSync(f,'utf8');const head=src.slice(0,src.indexOf('export const'));
  const cur=(await import(pathToFileURL(f).href+'?'+Date.now()))[l];const out={...cur,...(add[l]||{})};
  for(const k of add.remove||[])delete out[k];
  fs.writeFileSync(f,head+`export const ${l}={\n`+Object.entries(out).map(([k,v])=>` ${JSON.stringify(k)}: ${JSON.stringify(v)}`).join(',\n')+'\n};\n');
  console.log(l,Object.keys(out).length);}
