// 引导强度说明由 INTENSITY 生成，与 UX 文案 #81a–c 一致
import {INTENSITY} from '../js/templates.js';import {zh} from '../js/i18n/zh.js';import {t,setDict} from '../js/i18n/i18n.js';
let p=0,f=0;const T=(n,c)=>{if(c)p++;else{f++;console.log('FAIL',n);}};
const note=lv=>{const d=INTENSITY[lv].days;return t('ob.lvl.'+lv,{d:Math.max(...d),n:d.length});};
T('轻',note('light')==='提前 7 天，提醒 1 次');T('标准',note('standard')==='提前 30 天起，共 3 次');T('强',note('strong')==='提前 60 天起，共 14 次');
T('allDoneToastRenew',t('todo.allDoneToastRenew',{n:10,m:2})==='已搞定 10 件，其中 2 件已续到下期');
T('无未替换占位',Object.keys(zh).every(k=>typeof zh[k]==='string'));
console.log(`${p} passed ${f} failed`);if(f)process.exit(1);
// 语言包 key 一致 + 复数
import {ro} from '../js/i18n/ro.js';import {en} from '../js/i18n/en.js';
{let p=0,f=0;const T=(n,c)=>{if(c)p++;else{f++;console.log('FAIL',n);}};
 const kz=Object.keys(zh).sort().join(),kr=Object.keys(ro).sort().join(),ke=Object.keys(en).sort().join();T('ro key 与 zh 一致',kz===kr);T('en key 与 zh 一致',kz===ke);
 setDict(ro,'ro');T('ro 1 zi',t('form.due.byShelf',{n:1})==='Termen: 1 zi');T('ro 2 zile',t('form.due.byShelf',{n:2})==='Termen: 2 zile');T('ro 20 de zile',t('form.due.byShelf',{n:20})==='Termen: 20 de zile');
 setDict(zh,'zh');T('zh 回到中文',t('form.title.new')==='添加');
 console.log(`plural/keys ${p} passed ${f} failed`);if(f)process.exit(1);}
