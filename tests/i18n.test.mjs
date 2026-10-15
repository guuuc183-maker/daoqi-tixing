// v1.7 i18n 验收（v1.6-v1.7迭代计划.md §三）：硬编码扫描、三语 key 一致、复数、日期、ro 推断
import fs from 'fs';import path from 'path';import {fileURLToPath} from 'url';
import {zh} from '../js/i18n/zh.js';import {ro} from '../js/i18n/ro.js';import {en} from '../js/i18n/en.js';
import {t,setLang,detectLang,fmtDay,fmtDate,weekdays,anyLang} from '../js/i18n/i18n.js';
import {inferCat,catIdByName,applyCats,TEMPLATES} from '../js/templates.js';
let p=0,f=0;const T=(n,c)=>{if(c)p++;else{f++;console.log('FAIL',n);}};
const dir=path.join(path.dirname(fileURLToPath(import.meta.url)),'../js');
// 1 硬编码扫描。白名单：i18n/（语言包）、cat-dict.js（三语分类词典，计划允许「词典除外」）；注释不算
const WHITE=new Set(['cat-dict.js']);const CJK=/[\u3000-\u303f\u4e00-\u9fff\uff00-\uffef]/;const bad=[];
for(const fn of fs.readdirSync(dir)){if(!fn.endsWith('.js')||WHITE.has(fn))continue;
  const src=fs.readFileSync(path.join(dir,fn),'utf8').replace(/\/\*[\s\S]*?\*\//g,'').split('\n');
  src.forEach((l,i)=>{const code=l.replace(/(^|[^:'"\\])\/\/.*$/,'$1');if(CJK.test(code))bad.push(fn+':'+(i+1)+' '+code.trim().slice(0,60));});}
T('js/ 下（除 i18n/ 和词典）没有中文 '+bad.slice(0,5).join(' | '),bad.length===0);
// 2 key 一致
const kz=Object.keys(zh).sort(),kr=Object.keys(ro).sort(),ke=Object.keys(en).sort();
T('ro key 一致 '+kz.filter(k=>!ro[k]&&ro[k]!=='').concat(kr.filter(k=>!(k in zh))).slice(0,5),kz.join()===kr.join());
T('en key 一致 '+kz.filter(k=>!(k in en)).concat(ke.filter(k=>!(k in zh))).slice(0,5),kz.join()===ke.join());
// 只用逗号下加符 ș ț
T('ro 没有 cedilla ş ţ',!/[şţŞŢ]/.test(JSON.stringify(ro)));
// 3 复数
setLang('ro');T('ro 1 zi',t('ui.dDays',{n:1})==='1\u00a0zi');T('ro 2 zile',t('ui.dDays',{n:2})==='2\u00a0zile');T('ro 20 de zile',t('ui.dDays',{n:20})==='20\u00a0de zile');
setLang('en');T('en 1 day / 2 days',t('ui.dDays',{n:1})==='1\u00a0day'&&t('ui.dDays',{n:2})==='2\u00a0days');
// 4 日期
setLang('zh');T('zh 日期 '+fmtDay('2026-10-15'),fmtDay('2026-10-15')==='10月15日 周四');T('zh 周日开头',weekdays()[0]==='日');
setLang('ro');T('ro 日期 '+fmtDay('2026-10-15'),fmtDay('2026-10-15')==='15 oct. 2026, joi');T('ro 周一开头 '+weekdays()[0],/^lun/i.test(weekdays()[0]));
setLang('en');T('en 日期 '+fmtDay('2026-10-15'),fmtDay('2026-10-15')==='Thu, 15 Oct 2026');
// 5 语言检测
T('detect zh-CN',detectLang(['zh-CN'])==='zh');T('detect ro-RO',detectLang(['ro-RO'])==='ro');T('detect en-US',detectLang(['en-US'])==='en');T('detect de → en',detectLang(['de-DE'])==='en');T('detect de,ro → ro',detectLang(['de','ro'])==='ro');
// 6 ro 推断 + 三语分类名
setLang('ro');applyCats({});T('lapte→food',inferCat('lapte')==='food');T('pașaport→doc',inferCat('pașaport')==='doc');T('detergent→daily',inferCat('detergent')==='daily');
T('分类名三语识别',['日用品','Uz casnic','Household'].every(n=>catIdByName(n)==='daily'));T('ro 分类名跟随语言',applyCats({})&&t('cat.daily')==='Uz casnic');
// 7 模板三语都有名称
T('模板三语名称',TEMPLATES.every(x=>zh['tpl.'+x.id]&&ro['tpl.'+x.id]&&en['tpl.'+x.id]));
setLang('zh');
console.log(`i18n ${p} passed ${f} failed`);if(f)process.exit(1);
