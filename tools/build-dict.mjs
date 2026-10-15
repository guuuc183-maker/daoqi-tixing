// 由分类词典 JSON 生成 js/cat-dict.js（运行时不联网）。用法：node tools/build-dict.mjs [词典.json]
import fs from 'fs';import path from 'path';import {fileURLToPath} from 'url';
const here=path.dirname(fileURLToPath(import.meta.url));
const src=process.argv[2]||path.join(here,'../../分类词典-v2.1.json');
const d=JSON.parse(fs.readFileSync(src,'utf8'));
const cats=d.categories?Object.fromEntries(Object.entries(d.categories).map(([k,v])=>[k,v.keywords||[]])):Object.fromEntries(Object.entries(d).filter(([k])=>k!=='_meta'));
// 产品要求的补充词（缺了才加）
const EXTRA={doc:['港澳通行证','台胞证','居住证'],car:['交强险','商业险','年检','审验']};
const norm=s=>String(s).normalize('NFKC').toLowerCase().normalize('NFD').replace(/\p{M}/gu,'').replace(/\s+/g,' ').trim();
const seen=new Set(Object.values(cats).flat().map(norm));
for(const [k,ws] of Object.entries(EXTRA))for(const w of ws)if(!seen.has(norm(w))){(cats[k]=cats[k]||[]).push(w);seen.add(norm(w));}
const priority=(d._meta?.priority||['doc','car','med','food','cosm','shop','bill','home']);
const out=`// 自动生成，请勿手改：node tools/build-dict.mjs ${path.basename(src)}\n// 来源 ${path.basename(src)} · ${d._meta?.version||''} · ${d._meta?.date||''}\nexport const DICT_VERSION=${JSON.stringify(d._meta?.version||'')};\nexport const PRIORITY=${JSON.stringify(priority)};\nexport const KEYWORDS=${JSON.stringify(cats)};\n`;
fs.writeFileSync(path.join(here,'../js/cat-dict.js'),out);
console.log('wrote js/cat-dict.js',Object.fromEntries(Object.entries(cats).map(([k,v])=>[k,v.length])));
