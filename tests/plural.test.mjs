// R8-1：复数 key 只能用参数 n；ro/en 在 1、2、20、30 的输出
import fs from 'fs';import path from 'path';import {fileURLToPath} from 'url';
import {zh} from '../js/i18n/zh.js';import {ro} from '../js/i18n/ro.js';import {en} from '../js/i18n/en.js';import {t,setLang} from '../js/i18n/i18n.js';
const root=path.join(path.dirname(fileURLToPath(import.meta.url)),'..');let p=0,f=0;const T=(n,c)=>{if(c)p++;else{f++;console.log('FAIL',n);}};
const plural=new Set([...Object.entries(ro),...Object.entries(en)].filter(([,v])=>v&&typeof v==='object').map(([k])=>k));
// 1. 所有复数形式都用 {n}
for(const d of [ro,en])for(const k of plural)if(d[k]&&typeof d[k]==='object'){const vs=Object.values(d[k]);T(`${k} 各形式占位一致`,vs.every(v=>v.includes('{n}'))||vs.every(v=>!/\{\w+\}/.test(v)));}
// 2. 源码里调用复数 key 时必须传 n
const src=fs.readdirSync(path.join(root,'js')).filter(f=>f.endsWith('.js')).map(f=>[f,fs.readFileSync(path.join(root,'js',f),'utf8')]);
let calls=0;for(const [f,s] of src){const re=/\bt\(\s*'([\w.]+)'\s*(?:,\s*\{([^}]*)\})?/g;let m;while((m=re.exec(s))){if(!plural.has(m[1]))continue;calls++;const args=(m[2]||'').split(',').map(x=>x.split(':')[0].trim());T(`${f}: t('${m[1]}') 参数只能是 n（实际 ${args.join('/')||'无'}）`,!m[2]||args.includes('n'));}}
// 动态 key（ob.lvl.*）
T('obNote 传 n',/t\('ob\.lvl\.'\+lv,\{[^}]*\bn:/.test(src.find(([f])=>f==='app.js')[1]));
T('找到复数调用',calls>=10);
// 3. 输出
const N=x=>String(x).replace(/\u00a0/g,' ');const exp={ro:{1:'1 zi',2:'2 zile',20:'20 de zile',30:'30 de zile'},en:{1:'1 day',2:'2 days',20:'20 days',30:'30 days'}};
for(const l of ['ro','en']){setLang(l);for(const n of [1,2,20,30]){
  T(`${l} ui.dDays ${n}`,N(t('ui.dDays',{n}))===exp[l][n]);
  for(const k of ['ui.detail.17','ui.settings.11'])T(`${l} ${k} ${n} → ${t(k,{n})}`,N(t(k,{n}))===exp[l][n]);
  T(`${l} ui.settings.3 ${n}`,N(t('ui.settings.3',{n})).endsWith(exp[l][n]));
  T(`${l} ui.detail.22 ${n}`,N(t('ui.detail.22',{n})).endsWith(exp[l][n]));
  for(const k of plural){const out=t(k,{n,days:'X',name:'A',name2:'B',lead:'L',m:1,s:1,cat:'C'});T(`${l} ${k} ${n} 无未替换 {n}`,!out.includes('{n}'));}}}
setLang('ro');T('ro detail.24 30',N(t('ui.detail.24',{lead:'1 oct.',days:t('ui.dDays',{n:30})}))==='1 oct. (cu 30 de zile înainte)');
setLang('en');T('en 1 reminder',N(t('ob.lvl.light',{days:t('ui.dDays',{n:7}),n:1}))==='−7 days\n1 reminder');
// 4. ro/en 中写死的「N zile / N days」只允许出现在固定数字文案里（不能紧跟占位符）
for(const [l,d] of [['ro',ro],['en',en]])for(const [k,v] of Object.entries(d))if(typeof v==='string')T(`${l} ${k} 占位符后写死单位: ${v}`,!/\{\w+\}\s*(de\s+)?(zile|zi|days?)\b/.test(v));
setLang('zh');console.log(`plural ${p} passed ${f} failed`);if(f)process.exit(1);
