// 照片：压缩后存 IndexedDB（不放 localStorage）。每条最多 3 张
export const MAX_PHOTOS=3, LONG_EDGE=1280, QUALITY=.8, THUMB=200;
const DB='dq-photos', ST='photos';
let dbp=null;
function db(){return dbp||(dbp=new Promise((res,rej)=>{const r=indexedDB.open(DB,1);r.onupgradeneeded=()=>r.result.createObjectStore(ST,{keyPath:'id'});r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);}));}
function tx(mode,fn){return db().then(d=>new Promise((res,rej)=>{const t=d.transaction(ST,mode),s=t.objectStore(ST);let out;const r=fn(s);if(r)r.onsuccess=()=>{out=r.result;};
  t.oncomplete=()=>res(out);t.onerror=()=>rej(t.error||r?.error);t.onabort=()=>rej(t.error||new DOMException('aborted','AbortError'));}));}
export const isQuota=e=>e&&(e.name==='QuotaExceededError'||e.code===22||/quota/i.test(e.message||''));
export const put=rec=>tx('readwrite',s=>s.put(rec));
export const get=id=>tx('readonly',s=>s.get(id));
export const del=id=>tx('readwrite',s=>s.delete(id));
export const allKeys=()=>tx('readonly',s=>s.getAllKeys());
// 读图（按 EXIF 方向摆正）→ 缩放到长边 max → JPEG
async function decode(file){
  if(globalThis.createImageBitmap){try{return await createImageBitmap(file,{imageOrientation:'from-image'});}catch{}}
  return await new Promise((res,rej)=>{const u=URL.createObjectURL(file),i=new Image();i.style.imageOrientation='from-image';i.onload=()=>{URL.revokeObjectURL(u);res(i);};i.onerror=()=>{URL.revokeObjectURL(u);rej(new Error('无法读取这张图片'));};i.src=u;});}
function draw(img,max,q){const w=img.width||img.naturalWidth,h=img.height||img.naturalHeight,k=Math.min(1,max/Math.max(w,h));
  const c=document.createElement('canvas');c.width=Math.max(1,Math.round(w*k));c.height=Math.max(1,Math.round(h*k));const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);x.drawImage(img,0,0,c.width,c.height);
  return new Promise((res,rej)=>c.toBlob(b=>b?res({blob:b,w:c.width,h:c.height}):rej(new Error('压缩失败')),'image/jpeg',q));}
export async function compress(file){if(!/^image\//.test(file.type||'image/'))throw new Error('只能添加图片');const img=await decode(file);
  const full=await draw(img,LONG_EDGE,QUALITY),thumb=await draw(img,THUMB,.7);img.close?.();return {full,thumb};}
export async function addPhoto(itemId,file){const {full,thumb}=await compress(file);
  const id='p'+Date.now().toString(36)+Math.random().toString(36).slice(2,8);
  await put({id,itemId,blob:full.blob,thumb:thumb.blob,w:full.w,h:full.h,createdAt:new Date().toISOString()});return id;}
// 对象 URL 缓存
const urls={};
export async function url(id,kind='thumb'){const k=id+':'+kind;if(urls[k])return urls[k];const r=await get(id);if(!r)return null;return urls[k]=URL.createObjectURL(kind==='thumb'?r.thumb:r.blob);}
// 清理不再被任何条目（含回收站）引用的照片
export async function cleanup(referenced){try{const keys=await allKeys(),ref=new Set(referenced);let n=0;for(const k of keys)if(!ref.has(k)){await del(k);n++;}return n;}catch{return 0;}}
const toB64=b=>new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=()=>rej(r.error);r.readAsDataURL(b);});
const fromB64=d=>fetch(d).then(r=>r.blob());
export async function exportPhotos(ids){const out={};for(const id of ids){const r=await get(id);if(r)out[id]={itemId:r.itemId,w:r.w,h:r.h,full:await toB64(r.blob),thumb:await toB64(r.thumb)};}return out;}
// 导入：只接受 jpeg/png/webp 的 data URL
const OK=/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;
export async function importPhotos(map,ids){let n=0;for(const id of ids){const p=map?.[id];if(!p||!OK.test(p.full||'')||!/^[\w-]{1,64}$/.test(id))continue;
  const full=await fromB64(p.full),thumb=OK.test(p.thumb||'')?await fromB64(p.thumb):full;await put({id,itemId:String(p.itemId||''),blob:full,thumb,w:+p.w||0,h:+p.h||0,createdAt:new Date().toISOString()});n++;}return n;}
