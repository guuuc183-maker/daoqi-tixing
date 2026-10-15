// 相对路径缓存，适配 GitHub Pages 子路径（如 /daoqi-tixing/）
const CACHE='dq-v2';
const ASSETS=['./','index.html','style.css','manifest.json','js/app.js','js/store.js','js/dates.js','js/io.js','js/templates.js','icons/icon-192.png','icons/icon-512.png','fonts/BarlowCondensed-Bold.ttf','fonts/BarlowCondensed-SemiBold.ttf'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)));self.skipWaiting();});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));self.clients.claim();});
self.addEventListener('fetch',e=>{if(e.request.method!=='GET'||new URL(e.request.url).origin!==location.origin)return;
 e.respondWith(fetch(e.request).then(r=>{const c=r.clone();caches.open(CACHE).then(x=>x.put(e.request,c));return r;})
  .catch(()=>caches.match(e.request,{ignoreSearch:true}).then(r=>r||caches.match('index.html'))));});
