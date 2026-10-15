const {chromium}=require('playwright-core');let ok=0,bad=0;const T=(c,m)=>{c?ok++:(bad++,console.log('FAIL',m))};
(async()=>{const br=await chromium.launch({executablePath:'/usr/bin/google-chrome'});
for(const [loc,tz,lang] of [['zh-CN','Asia/Shanghai','zh'],['ro-RO','Europe/Bucharest','ro'],['en-US','America/New_York','en']])for(const w of [320,390]){
const c=await br.newContext({locale:loc,timezoneId:tz,viewport:{width:w,height:800}});const q=await c.newPage();
await q.goto('http://localhost:8765/daoqi-tixing/#/');await q.waitForTimeout(400);await q.click('[data-ob=skip]').catch(()=>{});
const P=(await import('../js/i18n/'+lang+'.js'))[lang];
for(const id of ['cnInspectionMark','cnInspection']){const doc=P['tplDocs.'+id];T(doc&&doc.length<=300,lang+id+' len '+doc?.length);if(lang!=='en'||id!=='x')T(lang!=='zh'||id!=='cnInspectionMark'||doc.includes('12123'),'12123 zh');T(id!=='cnInspectionMark'||doc.includes('12123'),'12123 '+lang);
await q.goto('http://localhost:8765/daoqi-tixing/#/new?tpl='+id);await q.waitForTimeout(400);
const f=await q.$eval('.tpl-docs',e=>[e.textContent,e.scrollWidth<=e.clientWidth+1,e.getBoundingClientRect().right<=innerWidth]).catch(()=>null);
T(f&&f[0]===doc&&f[1]&&f[2],`form ${lang} ${w} ${id} ${f}`);}
const ch=await q.goto('http://localhost:8765/daoqi-tixing/#/').then(()=>q.waitForTimeout(300)).then(()=>q.$$eval('.tpl-quick a',e=>e.every(a=>a.scrollWidth<=a.clientWidth+1&&a.getBoundingClientRect().right<=innerWidth)));T(ch,'chips '+lang+w);
await c.close();}
console.log('r11pre',ok,'pass',bad,'fail');await br.close();process.exit(bad?1:0);})();
