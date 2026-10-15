// CSV / JSON 导入导出
import {parseInput} from './dates.js';
import {sanitize} from './sanitize.js';
export const FIELDS=['id','name','cat','due','intensity','intensitySource','customDays','renewMonths','qty','location','note','prodDate','shelfDays','handledAt','snoozeUntil','renewAsked','history','deletedAt','createdAt','updatedAt'];
const esc=v=>{v=v==null?'':Array.isArray(v)?(v.length&&typeof v[0]==='object'?JSON.stringify(v):v.join('/')):String(v);return /[",\n\r]/.test(v)?`"${v.replace(/"/g,'""')}"`:v;};
export function toCSV(items){return '\ufeff'+[FIELDS.join(','),...items.map(it=>FIELDS.map(f=>esc(it[f])).join(','))].join('\r\n');}
export const TEMPLATE_CSV='\ufeff名称,分类,到期日,数量,位置,备注\r\n居留卡,证件,15.03.2027,,,IGI 预约\r\n牛奶,食品,20.10.2026,2,冰箱,\r\n';
// 自动判断分隔符（, 或 ;），罗马尼亚版 Excel 默认用分号
export function sniff(t){const line=t.replace(/^\ufeff/,'').split(/\r?\n/)[0]||'';let c=0,sc=0,q=false;for(const ch of line){if(ch=='"')q=!q;else if(!q){if(ch==',')c++;else if(ch==';')sc++;}}return sc>c?';':',';}
function rows(t){const out=[];let row=[],f='',q=false;t=t.replace(/^\ufeff/,'');const D=sniff(t);
  for(let i=0;i<t.length;i++){const c=t[i];
    if(q){if(c=='"'){if(t[i+1]=='"'){f+='"';i++;}else q=false;}else f+=c;}
    else if(c=='"')q=true;else if(c==D){row.push(f);f='';}
    else if(c=='\n'||c=='\r'){if(c=='\r'&&t[i+1]=='\n')i++;row.push(f);out.push(row);row=[];f='';}else f+=c;}
  if(f||row.length){row.push(f);out.push(row);}return out;}
const ALIAS={'名称':'name','分类':'cat','到期日':'due','提醒强度':'intensity','备注':'note','数量':'qty','位置':'location',
  'denumire':'name','data expirării':'due','data expirarii':'due','cantitate':'qty','categorie':'cat','locație':'location','locatie':'location','notă':'note','nota':'note',
  'expiry':'due','expiration':'due','expires':'due','category':'cat','quantity':'qty'};
const key=h=>{h=h.trim();return ALIAS[h]||ALIAS[h.toLowerCase()]||h;};
// 返回 {items:[{row,item}], errors:[{row,reason}]}
export function parseCSV(text){const r=rows(text);const res={items:[],errors:[]};if(!r.length)return res;const head=r[0].map(key);
  r.slice(1).forEach((c,i)=>{const line=i+2;if(!c.some(x=>x.trim()))return;const o={};head.forEach((h,j)=>{if(c[j]!==undefined&&c[j]!=='')o[h]=c[j];});
    const v=normalize(o);if(v.error)res.errors.push({row:line,reason:v.error});else res.items.push({row:line,item:v});});return res;}
export function parseJSON(text){const d=JSON.parse(text);const res={items:[],errors:[]};
  (Array.isArray(d)?d:d.items||[]).forEach((o,i)=>{const v=normalize({...o});if(v.error)res.errors.push({row:i+1,reason:v.error});else res.items.push({row:i+1,item:v});});return res;}
export function toJSON(items){return JSON.stringify({app:'daoqi-tixing',version:2,exportedAt:new Date().toISOString(),items},null,2);}
export function normalize(o){return sanitize(o);}
export function download(name,text,type){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type}));a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}
