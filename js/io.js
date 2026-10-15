// CSV / JSON 导入导出
import {t,anyLang} from './i18n/i18n.js';
import {parseInput} from './dates.js';
import {sanitize} from './sanitize.js';
import {CATEGORIES,catIdByName,CUSTOM_ID} from './templates.js';
export const FIELDS=['id','name','cat','due','intensity','intensitySource','soonSource','soonDays','customDays','renewMonths','qty','location','note','prodDate','shelfDays','handledAt','snoozeUntil','renewAsked','history','deletedAt','createdAt','updatedAt'];
const esc=v=>{v=v==null?'':Array.isArray(v)?(v.length&&typeof v[0]==='object'?JSON.stringify(v):v.join('/')):String(v);return /[",\n\r]/.test(v)?`"${v.replace(/"/g,'""')}"`:v;};
// CSV 中分类写名称（导入时按名称或 id 识别）
export function toCSV(items){return '\ufeff'+[FIELDS.join(','),...items.map(it=>FIELDS.map(f=>esc(f==='cat'?(CATEGORIES[it.cat]?.name||it.cat):it[f])).join(','))].join('\r\n');}
// 导入模板跟随界面语言（表头和示例都在语言包里）
export const templateCSV=()=>'\ufeff'+['name','cat','due','qty','location','note'].map(f=>t('csv.h.'+f)).join(',')+'\r\n'+t('csv.sample1')+'\r\n'+t('csv.sample2')+'\r\n';
// 自动判断分隔符（, 或 ;），罗马尼亚版 Excel 默认用分号
export function sniff(t){const line=t.replace(/^\ufeff/,'').split(/\r?\n/)[0]||'';let c=0,sc=0,q=false;for(const ch of line){if(ch=='"')q=!q;else if(!q){if(ch==',')c++;else if(ch==';')sc++;}}return sc>c?';':',';}
function rows(t){const out=[];let row=[],f='',q=false;t=t.replace(/^\ufeff/,'');const D=sniff(t);
  for(let i=0;i<t.length;i++){const c=t[i];
    if(q){if(c=='"'){if(t[i+1]=='"'){f+='"';i++;}else q=false;}else f+=c;}
    else if(c=='"')q=true;else if(c==D){row.push(f);f='';}
    else if(c=='\n'||c=='\r'){if(c=='\r'&&t[i+1]=='\n')i++;row.push(f);out.push(row);row=[];f='';}else f+=c;}
  if(f||row.length){row.push(f);out.push(row);}return out;}
let ALIAS0=null;const aliasLang=()=>ALIAS0||(ALIAS0=Object.fromEntries(['name','cat','due','intensity','soonDays','note','qty','location'].flatMap(f=>[...anyLang('csv.h.'+f),...anyLang('csv.alt.'+f)].map(h=>[h.toLowerCase(),f]))));
const ALIAS={
  'denumire':'name','data expirării':'due','data expirarii':'due','cantitate':'qty','categorie':'cat','locație':'location','locatie':'location','notă':'note','nota':'note',
  'expiry':'due','expiration':'due','expires':'due','category':'cat','quantity':'qty'};
const key=h=>{h=h.trim();return ALIAS[h]||ALIAS[h.toLowerCase()]||aliasLang()[h.toLowerCase()]||h;};
// 返回 {items:[{row,item}], errors:[{row,reason}]}
export function parseCSV(text){const r=rows(text);const res={items:[],errors:[]};if(!r.length)return res;const head=r[0].map(key);
  r.slice(1).forEach((c,i)=>{const line=i+2;if(!c.some(x=>x.trim()))return;const o={};head.forEach((h,j)=>{if(c[j]!==undefined&&c[j]!=='')o[h]=c[j];});
    const nc=newCatName(o.cat);const v=normalize(o);if(v.error)res.errors.push({row:line,reason:v.error});else res.items.push(nc?{row:line,item:v,newCat:nc}:{row:line,item:v});});return res;}
// 不认识的分类名（不是现有名称/id/别名）
export function newCatName(c){if(c==null)return null;const n=String(c).normalize('NFKC').trim().slice(0,20);return n&&!catIdByName(n)&&!CUSTOM_ID.test(n)?n:null;}
export function parseJSON(text){const d=JSON.parse(text);const res={items:[],errors:[],photos:d&&typeof d==='object'&&!Array.isArray(d)&&d.photos&&typeof d.photos==='object'?d.photos:null};
  (Array.isArray(d)?d:d.items||[]).forEach((o,i)=>{const nc=newCatName(o?.cat);const v=normalize({...o});if(v.error)res.errors.push({row:i+1,reason:v.error});else res.items.push(nc?{row:i+1,item:v,newCat:nc}:{row:i+1,item:v});});
  res.categories=d&&Array.isArray(d.categories)?d.categories:null;res.settings=d&&d.settings&&typeof d.settings==='object'&&!Array.isArray(d.settings)?d.settings:null;return res;}
export function toJSON(items,photos,categories,settings){const o={app:'daoqi-tixing',version:3,exportedAt:new Date().toISOString(),items};if(categories?.length)o.categories=categories;if(settings)o.settings=settings;if(photos)o.photos=photos;return JSON.stringify(o,null,2);}
export function normalize(o){return sanitize(o);}
export function download(name,text,type){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type}));a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}
