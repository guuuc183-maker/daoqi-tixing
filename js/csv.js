export const FIELDS=['id','name','category','dueDate','remindDays','repeatYearly','note','quantity','location','createdAt','updatedAt'];
const esc=v=>{v=v==null?'':String(v);return /[",\n\r]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v;};
export function toCSV(items){return '\uFEFF'+[FIELDS.join(','),...items.map(it=>FIELDS.map(f=>esc(f==='remindDays'?(it.remindDays||[]).join('/'):f==='repeatYearly'?(it.repeatYearly?1:0):it[f])).join(','))].join('\r\n');}
export function parseCSV(text){text=text.replace(/^\uFEFF/,'');const rows=[];let row=[],cur='',q=false;
  for(let i=0;i<text.length;i++){const c=text[i];
    if(q){if(c==='"'){if(text[i+1]==='"'){cur+='"';i++;}else q=false;}else cur+=c;}
    else if(c==='"')q=true;else if(c===','){row.push(cur);cur='';}
    else if(c==='\n'||c==='\r'){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cur);rows.push(row);row=[];cur='';}else cur+=c;}
  if(cur||row.length){row.push(cur);rows.push(row);}
  const [head,...body]=rows.filter(r=>r.some(c=>c!==''));if(!head)return [];
  return body.map(r=>{const o={};head.forEach((h,i)=>o[h.trim()]=r[i]??'');
    o.remindDays=String(o.remindDays||'').split('/').filter(Boolean).map(Number);o.repeatYearly=o.repeatYearly==='1'||o.repeatYearly==='true';
    if(!o.id)o.id=crypto.randomUUID();return o;}).filter(o=>o.name&&/^\d{4}-\d{2}-\d{2}$/.test(o.dueDate));}
