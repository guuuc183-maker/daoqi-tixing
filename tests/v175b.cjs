// v1.7.5：R12-2 自动地区；R12-3 名称原样保存；R12-1 语言包无「待核实」标记
const {chromium}=require('playwright-core');const fs=require('fs');const B='http://localhost:8765/daoqi-tixing/';let ok=0,bad=0;const T=(c,m)=>{c?ok++:(bad++,console.log('FAIL',m))};
(async()=>{
for(const l of ['zh','ro','en']){const s=fs.readFileSync(__dirname+'/../js/i18n/'+l+'.js','utf8');for(const m of ['待核实','to be verified','de verificat'])T(!s.toLowerCase().includes(m),'marker '+l+' '+m);}
const P=(await import('../js/templates.js')).TEMPLATES;T(!P.some(x=>x.verify),'no verify flags '+P.filter(x=>x.verify).map(x=>x.id));
for(const i of ['cnHkEndorse','cnTaiwan','cnTaiwanCompat','cnResidence'])T(P.find(x=>x.id===i)&&!P.find(x=>x.id===i).verify,'verify '+i);
T(P.find(x=>x.id==='cnId').url==='https://www.gov.cn/gongbao/content/2003/content_62254.htm','cnId url');
const br=await chromium.launch({executablePath:'/usr/bin/google-chrome'});
const ctx=async(loc,tz,init)=>{const c=await br.newContext({locale:loc,timezoneId:tz,viewport:{width:390,height:844}});if(init)await c.addInitScript(init);const q=await c.newPage();q.on('pageerror',e=>T(0,'pageerror '+e));return [c,q];};
const ex=q=>q.$$eval('.tpl-quick a',e=>e.map(a=>a.dataset.ex));
// 默认 = 自动；混合时时区组在前
{const [c,q]=await ctx('zh-CN','Europe/Bucharest',`localStorage.setItem('dq.settings.v1',JSON.stringify({obDone:true}))`);await q.goto(B+'#/settings');await q.waitForTimeout(400);
 T(await q.$eval('#region',e=>e.value)==='auto','default auto');T((await q.$eval('#region option[value=auto]',e=>e.textContent))==='自动','label 自动');
 await q.goto(B+'#/');await q.waitForTimeout(300);let i=await ex(q);T(i.indexOf('roRca')>=0&&i.indexOf('roRca')<i.indexOf('cnId')&&!i.includes('carIns'),'auto mixed '+i);
 await q.goto(B+'#/settings');await q.waitForTimeout(300);await q.selectOption('#region','all');await q.goto(B+'#/');await q.waitForTimeout(300);i=await ex(q);T(i.includes('carIns')&&i.indexOf('roRca')<i.indexOf('cnId'),'all '+i);
 await q.goto(B+'#/settings');await q.waitForTimeout(300);T(await q.$eval('#region',e=>e.value)==='all','all kept');await q.selectOption('#region','auto');
 await q.goto(B+'#/');await q.waitForTimeout(300);i=await ex(q);T(!i.includes('carIns')&&i.includes('cnId'),'back to auto '+i);
 await q.goto(B+'#/settings');await q.waitForTimeout(300);T(await q.$eval('#region',e=>e.value)==='auto','auto kept');await c.close();}
for(const [loc,lab] of [['ro-RO','Automat'],['en-US','Auto']]){const [c,q]=await ctx(loc,'Europe/Bucharest',`localStorage.setItem('dq.settings.v1',JSON.stringify({obDone:true}))`);await q.goto(B+'#/settings');await q.waitForTimeout(400);T((await q.$eval('#region option[value=auto]',e=>e.textContent))===lab,'label '+lab);await c.close();}
// R12-3：全角括号保留
{const nm='私家车年检·上线检验（9 座及以下）';const [c,q]=await ctx('zh-CN','Asia/Shanghai',`if(!localStorage.getItem('dq.items.v2'))localStorage.setItem('dq.items.v2',JSON.stringify([{id:'f1',cat:'car',name:'${nm}',due:'2027-03-01',intensitySource:'cat'},{id:'f2',cat:'car',name:'私家车年检·上线检验(9 座及以下)',due:'2027-03-02',intensitySource:'cat'}]));localStorage.setItem('dq.settings.v1',JSON.stringify({obDone:true}))`);
 await q.goto(B+'#/');await q.waitForTimeout(500);await q.reload();await q.waitForTimeout(500);const it=JSON.parse(await q.evaluate(()=>localStorage.getItem('dq.items.v2')));
 T(it.find(x=>x.id==='f1')?.name===nm,'full-width kept '+it.find(x=>x.id==='f1')?.name);T(it.find(x=>x.id==='f2')?.name==='私家车年检·上线检验(9 座及以下)','old half-width untouched');
 const {findTpl}=await import('../js/templates.js');T(findTpl('car','私家车年检·上线检验(9 座及以下)')?.id==='cnInspection','NFKC compare');
 await q.goto(B+'#/new');await q.waitForTimeout(400);await q.fill('[name=name]','测试（全角）');await q.fill('[name=due]','2027-05-05').catch(()=>{});
 await c.close();}
{const zh=(await import('../js/i18n/zh.js')).zh;for(const i of ['cnHkEndorse','cnTaiwan','cnTaiwanCompat','cnResidence']){
 const [c,q]=await ctx('zh-CN','Asia/Shanghai',`localStorage.setItem('dq.settings.v1',JSON.stringify({obDone:true}));localStorage.setItem('dq.items.v2',JSON.stringify([{id:'v1',cat:'doc',name:${JSON.stringify(zh['tpl.'+i])},due:'2027-03-01',intensitySource:'cat'}]))`);
 await q.goto(B+'#/item/v1');await q.waitForTimeout(500);const tx=await q.textContent('body');T(!tx.includes('⚠')&&tx.includes(zh['tplDocs.'+i].slice(0,12)),'detail '+i);await c.close();}}
console.log('v175b',ok,'pass',bad,'fail');await br.close();process.exit(bad?1:0);})();
