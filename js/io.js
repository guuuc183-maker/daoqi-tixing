// CSV / JSON 导入导出
export const FIELDS=['id','name','cat','due','intensity','customDays','renewMonths','qty','location','note','handled','createdAt','updatedAt'];
const esc=v=>{v=v==null?'':Array.isArray(v)?v.join('/'):String(v);return /[",\n\r]/.test(v)?`"${v.replace(/"/g,'""')}"`:v;};
export function toCSV(items){return '\ufeff'+[FIELDS.join(','),...items.map(it=>FIELDS.map(f=>esc(it[f])).join(','))].join('\r\n');}
function rows(t){const out=[];let row=[],f='',q=false;t=t.replace(/^\ufeff/,'');
  for(let i=0;i<t.length;i++){const c=t[i];
    if(q){if(c=='"'){if(t[i+1]=='"'){f+='"';i++;}else q=false;}else f+=c;}
    else if(c=='"')q=true;else if(c==','){row.push(f);f='';}
    else if(c=='\n'||c=='\r'){if(c=='\r'&&t[i+1]=='\n')i++;row.push(f);out.push(row);row=[];f='';}else f+=c;}
  if(f||row.length){row.push(f);out.push(row);}return out.filter(r=>r.some(x=>x!==''));}
// 中文表头别名，方便用户自己做表导入
const ALIAS={'名称':'name','分类':'cat','到期日':'due','提醒强度':'intensity','备注':'note','数量':'qty','位置':'location'};
export function parseCSV(text){const r=rows(text);if(!r.length)return [];const head=r[0].map(h=>ALIAS[h.trim()]||h.trim());
  return r.slice(1).map(c=>{const o={};head.forEach((h,i)=>{if(c[i]!==undefined&&c[i]!=='')o[h]=c[i];});return normalize(o);}).filter(Boolean);}
export function parseJSON(text){const d=JSON.parse(text);return (Array.isArray(d)?d:d.items||[]).map(normalize).filter(Boolean);}
export function toJSON(items){return JSON.stringify({app:'daoqi-tixing',version:1,exportedAt:new Date().toISOString(),items},null,2);}
function normalize(o){if(!o.name||!/^\d{4}-\d{2}-\d{2}$/.test(o.due||''))return null;
  if(typeof o.customDays==='string')o.customDays=o.customDays.split(/[\/ ;]+/).filter(Boolean).map(Number);
  for(const k of ['renewMonths','qty'])if(o[k]!==undefined&&o[k]!=='')o[k]=Number(o[k]);
  o.handled=o.handled===true||o.handled==='true';o.cat=o.cat||'other';o.intensity=o.intensity||'standard';return o;}
export function download(name,text,type){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}
