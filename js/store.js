// 本地存储层（v2 可替换为云端）。删除为软删除（deletedAt），回收站保留 30 天
import {sanitize} from './sanitize.js';
const KEY='dq.items.v2', SKEY='dq.settings.v1', SCHEMA=2;
export function raw(){let l;try{l=JSON.parse(localStorage.getItem(KEY))}catch{l=null}return Array.isArray(l)?l.map(sanitize).filter(x=>!x.error):[];}
export const all=()=>raw().filter(x=>!x.deletedAt);
export const trash=()=>raw().filter(x=>x.deletedAt);
export let lastSaveFailed=false;
export function save(l){lastSaveFailed=false;try{localStorage.setItem(KEY,JSON.stringify(l));localStorage.setItem('dq.schema',SCHEMA);return true;}
  catch(e){lastSaveFailed=true;globalThis.dispatchEvent?.(new CustomEvent('dq-storage-error',{detail:e}));return false;}}
export const get=id=>raw().find(x=>x.id===id);
export const uid=()=>(crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+Math.random().toString(36).slice(2));
export function upsert(it){const l=raw();const i=l.findIndex(x=>x.id===it.id);it.updatedAt=new Date().toISOString();
  if(i>=0)l[i]=it;else{it.id=it.id||uid();it.createdAt=it.createdAt||it.updatedAt;l.push(it);}save(l);return it;}
export function patch(id,f){const it=get(id);if(!it)return;f(it);return upsert(it);}
export function softDelete(ids,at=new Date().toISOString()){const l=raw();l.forEach(x=>{if(ids.includes(x.id))x.deletedAt=at;});save(l);}
export function restore(id){patch(id,x=>{delete x.deletedAt;});}
export function purge(id){save(raw().filter(x=>x.id!==id));}
export function emptyTrash(){save(raw().filter(x=>!x.deletedAt));}
export function purgeOld(now=Date.now(),days=30){const l=raw();const k=l.filter(x=>!x.deletedAt||now-Date.parse(x.deletedAt)<days*864e5);if(k.length!==l.length)save(k);return l.length-k.length;}
export function merge(list){const l=raw();for(const it of list){it.id=it.id||uid();const i=l.findIndex(x=>x.id===it.id);if(i>=0)l[i]=it;else l.push(it);}save(l);return list.length;}
export function replaceAll(l){save(l);}
// 撤销：操作前保存整份快照，只保留最近 1 步
let snap=null;export function snapshot(){snap=localStorage.getItem(KEY)||'[]';}
export function undo(){if(snap==null)return false;localStorage.setItem(KEY,snap);snap=null;return true;}
const DEF={soonDays:30,catIntensity:{},badge:false,iosTipClosed:false};
export function settings(){try{return Object.assign({},DEF,JSON.parse(localStorage.getItem(SKEY)||'{}'))}catch{return {...DEF}}}
export function saveSettings(s){try{localStorage.setItem(SKEY,JSON.stringify(s))}catch(e){globalThis.dispatchEvent?.(new CustomEvent('dq-storage-error',{detail:e}));}}
