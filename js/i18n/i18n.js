// 语言包入口：t() 插值 + 复数（Intl.PluralRules），语言选择和 Intl 日期/数字格式
import {zh} from './zh.js';import {ro} from './ro.js';import {en} from './en.js';
export const DICTS={zh,ro,en};
// 语言自称（不翻译），给语言切换控件用
export const LANGS=[['zh','\u4e2d\u6587'],['ro','Română'],['en','English']];
const LOC0={zh:'zh-CN',ro:'ro-RO',en:'en-GB'};
// 日期格式用浏览器完整 locale：en-US 用美式，其余 en-* 一律英式；zh/ro 用浏览器里同语言的 locale（R8 #3）
export function pickLocale(l,list){list=list||(typeof navigator!=='undefined'?(navigator.languages&&navigator.languages.length?navigator.languages:[navigator.language]):[]);
  const m=list.map(x=>String(x||'')).find(x=>x.toLowerCase().split(/[-_]/)[0]===l);
  if(l==='en')return m&&/^en[-_]us$/i.test(m)?'en-US':'en-GB';
  if(!m||!m.includes('-'))return LOC0[l];try{return Intl.getCanonicalLocales(m.replace('_','-'))[0];}catch{return LOC0[l];}}
const LOC={...LOC0};
let lang='zh',dict=zh;
export const getLang=()=>lang;
// G17：两句拼接。zh 不加空格；其他语言恰好一个空格（文案末尾自带空格也不会变成两个）
export const joinSent=(a,b,l=lang)=>l==='zh'?String(a).trimEnd()+String(b).trimStart():String(a).trimEnd()+' '+String(b).trimStart();
export const locale=()=>LOC[lang];
// 首次打开：按 navigator.languages 顺序找第一个支持的语言，都没有就用英文
export function detectLang(list){list=list||(typeof navigator!=='undefined'?(navigator.languages&&navigator.languages.length?navigator.languages:[navigator.language]):[]);
  for(const l of list){const b=String(l||'').toLowerCase();if(b.startsWith('zh'))return 'zh';if(b.startsWith('ro')||b.startsWith('mo'))return 'ro';if(b.startsWith('en'))return 'en';}return 'en';}
export function setLang(l){lang=DICTS[l]?l:'zh';dict=DICTS[lang];LOC[lang]=pickLocale(lang);
  if(typeof document!=='undefined'){document.documentElement.lang=lang==='zh'?'zh-CN':lang;}return lang;}
// 兼容旧调用：setDict(对象, 语言代码)
export function setDict(d,l){dict=d;lang=l;}
function pick(v,p){if(v&&typeof v==='object'){const n=Number(p.n??p.count??0);let c='other';try{c=new Intl.PluralRules(LOC[lang]||lang).select(n);}catch{}return v[c]??v.other??Object.values(v)[0];}return v;}
export function t(key,p={}){let s=dict[key];if(s==null)s=zh[key];if(s==null)return key;
  return String(pick(s,p)).replace(/\{(\w+)\}/g,(m,k)=>p[k]!=null?(typeof p[k]==='number'?fmtNum(p[k]):p[k]):m);}
// 某个 key 在所有语言里的取值（导入识别分类名、判断模板名用）
export const anyLang=key=>Object.values(DICTS).flatMap(d=>{const v=d[key];return v==null?[]:typeof v==='object'?Object.values(v):[v];});
export const fmtNum=n=>Number.isInteger(n)&&Math.abs(n)<10000?String(n):new Intl.NumberFormat(LOC[lang]).format(n);
const D=iso=>{const [y,m,d]=String(iso).slice(0,10).split('-').map(Number);return new Date(y,m-1,d);};
const F=(o,d)=>new Intl.DateTimeFormat(LOC[lang],o).format(d);
// 首页抬头：zh「10月15日 周四」/ ro「15 oct. 2026, joi」/ en「Thu, 15 Oct 2026」
export function fmtDay(iso){const d=D(iso);if(lang==='zh')return F({month:'long',day:'numeric'},d)+' '+F({weekday:'short'},d);
  if(lang==='ro')return F({day:'numeric',month:'short',year:'numeric'},d)+', '+F({weekday:'long'},d);
  if(LOC[lang]==='en-US')return F({weekday:'short',month:'short',day:'numeric',year:'numeric'},d);
  return F({weekday:'short'},d)+', '+F({day:'numeric',month:'short',year:'numeric'},d);}
export const fmtDate=iso=>F({day:'numeric',month:lang==='zh'?'long':'short',year:'numeric'},D(iso));
export const fmtMD=iso=>F({day:'numeric',month:lang==='zh'?'long':'short'},D(iso));
export const fmtTime=d=>F({hour:'2-digit',minute:'2-digit',hour12:false},d);
export const fmtMonth=(y,m)=>F({year:'numeric',month:'long'},new Date(y,m-1,1));
// 日历：中文周日开头（保持原行为），ro/en 周一开头
export const weekStart=()=>lang==='zh'?0:1;
export const weekdays=()=>{const r=[];for(let i=0;i<7;i++){const wd=(weekStart()+i)%7;r.push(F({weekday:lang==='zh'?'narrow':'short'},new Date(2026,0,4+wd)));}return r;};
// 带年份的完整日期（日期识别提示等）：zh「2027年10月15日 周五」，ro/en 同 fmtDay
export const fmtFull=iso=>lang==='zh'?fmtDate(iso)+' '+F({weekday:'short'},D(iso)):fmtDay(iso);
