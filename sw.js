// 相对路径缓存，适配 GitHub Pages 子路径（如 /daoqi-tixing/）
const VERSION='1.6.1'; // 与 js/version.js 保持一致（测试比对）
const CACHE='dq-v'+VERSION;
const ASSETS=['./','index.html','style.css','manifest.json','js/app.js','js/store.js','js/dates.js','js/io.js','js/templates.js','js/cat-dict.js','js/version.js','js/shelf.js','js/i18n/zh.js','js/icons.js','js/logic.js','js/ics.js','js/sanitize.js','js/photos.js','icons/icon-192.png','icons/icon-512.png','icons/icon.svg','icons/icon-maskable-192.png','icons/icon-maskable-512.png','icons/apple-touch-icon.png','icons/favicon.ico','icons/badge-96.png','icons/icon-48.png','fonts/BarlowCondensed-Bold.ttf','fonts/BarlowCondensed-SemiBold.ttf'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)));self.skipWaiting();});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));self.clients.claim();});
self.addEventListener('fetch',e=>{if(e.request.method!=='GET'||new URL(e.request.url).origin!==location.origin)return;
 e.respondWith(fetch(e.request).then(r=>{const c=r.clone();caches.open(CACHE).then(x=>x.put(e.request,c));return r;})
  .catch(()=>caches.match(e.request,{ignoreSearch:true}).then(r=>r||caches.match('index.html'))));});
