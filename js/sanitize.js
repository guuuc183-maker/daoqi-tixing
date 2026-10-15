// 统一的字段白名单校验（导入、读取存储时都会经过这里）
import {t} from './i18n/i18n.js';
import {parseInput,valid} from './dates.js';
import {INTENSITY,catIdByName,CUSTOM_ID} from './templates.js';
export const LIMITS={name:60,location:40,note:500};
const ID=/^[A-Za-z0-9_-]{1,64}$/;
const newId=()=>(globalThis.crypto?.randomUUID?crypto.randomUUID():Date.now().toString(36)+Math.random().toString(36).slice(2));
const day=v=>{const d=typeof v==='string'&&valid(v)?v:parseInput(v);return d||undefined;};
const iso=v=>typeof v==='string'&&!isNaN(Date.parse(v))&&/^\d{4}-\d{2}-\d{2}/.test(v)?new Date(v).toISOString():undefined;
const num=(v,max=1e6)=>{if(v===''||v==null)return '';const n=Number(typeof v==='string'?v.normalize('NFKC').trim():v);return Number.isFinite(n)&&n>=0&&n<=max?Math.round(n):'';};
const str=(v,max)=>v==null?'':String(v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,'').trim().slice(0,max);
// 返回干净对象或 {error}
export function sanitize(o){
  if(!o||typeof o!=='object')return {error:t('err.item')};
  const name=str(o.name,LIMITS.name);if(!name)return {error:t('err.noName')};
  const due=day(o.due);if(!due)return {error:t('err.badDue',{v:str(o.due,20)||t('err.empty')})};
  let cat=str(o.cat,20);cat=catIdByName(cat)||(CUSTOM_ID.test(cat)?cat:'other');
  const r={id:ID.test(String(o.id||''))?String(o.id):newId(),name,cat,due};
  let src=o.intensitySource==='item'||o.intensitySource==='cat'?o.intensitySource:undefined;
  if(INTENSITY[o.intensity])r.intensity=o.intensity;else if(src==='item')src='cat';
  if(src)r.intensitySource=src;
  const sd=num(o.soonDays,3650);if((o.soonSource==='item'||!o.soonSource)&&sd!==''){r.soonSource='item';r.soonDays=sd;}else r.soonSource='cat';
  let cd=o.customDays;if(typeof cd==='string')cd=cd.split(/[\/ ;,]+/);
  if(Array.isArray(cd))r.customDays=[...new Set(cd.map(Number).filter(n=>Number.isInteger(n)&&n>=0&&n<=366))].slice(0,20);
  if(r.intensity==='custom'&&!(r.customDays||[]).length)r.customDays=[7,1];
  for(const[k,m]of [['renewMonths',1200],['qty',1e6],['shelfDays',36500]]){const n=num(o[k],m);if(n!=='')r[k]=n;}
  for(const k of ['location','note']){const s=str(o[k],LIMITS[k]);if(s)r[k]=s;}
  for(const k of ['prodDate','handledAt','snoozeUntil']){const d=day(o[k]);if(d)r[k]=d;}
  if(o.handled===true||o.handled==='true')r.handledAt=r.handledAt||due;
  if(o.renewAsked===true||o.renewAsked==='true')r.renewAsked=true;
  if(Array.isArray(o.photos)){const ps=[...new Set(o.photos.filter(x=>typeof x==='string'&&ID.test(x)))].slice(0,3);if(ps.length)r.photos=ps;}
  let hist=o.history;if(typeof hist==='string'){try{hist=JSON.parse(hist)}catch{hist=null}}
  if(Array.isArray(hist)){const hs=hist.map(x=>x&&({from:day(x.from),to:day(x.to),at:day(x.at)})).filter(x=>x&&x.from&&x.to&&x.at).slice(-50);if(hs.length)r.history=hs;}
  for(const k of ['deletedAt','createdAt','updatedAt']){const t=iso(o[k]);if(t)r[k]=t;}
  return r;}
