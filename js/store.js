// 本地存储层（第二阶段可替换为云端，接口保持不变）
const KEY='dq.items.v2', SKEY='dq.settings.v1';
export function all(){try{return JSON.parse(localStorage.getItem(KEY))||[]}catch{return []}}
function save(l){localStorage.setItem(KEY,JSON.stringify(l));}
export const get=id=>all().find(x=>x.id===id);
const uid=()=>(crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+Math.random().toString(36).slice(2));
export function upsert(it){const l=all();const i=l.findIndex(x=>x.id===it.id);it.updatedAt=new Date().toISOString();
  if(i>=0)l[i]=it;else{it.id=it.id||uid();it.createdAt=it.createdAt||it.updatedAt;l.push(it);}save(l);return it;}
export function remove(id){save(all().filter(x=>x.id!==id));}
export function merge(list){const l=all();let n=0;for(const it of list){it.id=it.id||uid();const i=l.findIndex(x=>x.id===it.id);if(i>=0)l[i]=it;else l.push(it);n++;}save(l);return n;}
export function replaceAll(l){save(l);}
export function settings(){try{return Object.assign({soonDays:30,catIntensity:{}},JSON.parse(localStorage.getItem(SKEY)||'{}'))}catch{return {soonDays:30,catIntensity:{}}}}
export function saveSettings(s){localStorage.setItem(SKEY,JSON.stringify(s));}
