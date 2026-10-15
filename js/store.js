// 本地存储层（第二阶段替换为 Firestore，接口保持不变）
const KEY='dq.items.v1', SKEY='dq.settings.v1';
export function all(){try{return JSON.parse(localStorage.getItem(KEY))||[]}catch{return []}}
function save(list){localStorage.setItem(KEY,JSON.stringify(list));}
export function get(id){return all().find(x=>x.id===id);}
export function upsert(item){const l=all();const i=l.findIndex(x=>x.id===item.id);
  item.updatedAt=new Date().toISOString();if(i>=0)l[i]=item;else{item.id=item.id||crypto.randomUUID();item.createdAt=item.updatedAt;l.push(item);}save(l);return item;}
export function remove(id){save(all().filter(x=>x.id!==id));}
export function replaceAll(list){save(list);}
export function settings(){return Object.assign({notifyTime:'09:00',timezone:'Europe/Bucharest'},JSON.parse(localStorage.getItem(SKEY)||'{}'));}
export function saveSettings(s){localStorage.setItem(SKEY,JSON.stringify(s));}
