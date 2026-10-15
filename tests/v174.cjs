// v1.7.4：R11-1 自选天数显示全部提前量；R11-2/3/4/5；PM 地区规则（语言地区≠时区地区 → 两组，时区组在前）
const {chromium}=require('playwright-core');const B='http://localhost:8765/daoqi-tixing/';let ok=0,bad=0;const T=(c,m)=>{c?ok++:(bad++,console.log('FAIL',m))};
(async()=>{const br=await chromium.launch({executablePath:'/usr/bin/google-chrome'});
const ctx=async(loc,tz,w=390,init)=>{const c=await br.newContext({locale:loc,timezoneId:tz,viewport:{width:w,height:844}});if(init)await c.addInitScript(init);const q=await c.newPage();q.on('pageerror',e=>T(0,'pageerror '+e));return [c,q];};
const chips=async q=>{await q.goto(B+'#/');await q.waitForTimeout(400);await q.click('[data-ob=skip]').catch(()=>{});await q.waitForTimeout(300);return q.$$eval('.tpl-quick a',e=>e.map(a=>a.dataset.ex));};
const pre=r=>`localStorage.setItem('dq.settings.v1',JSON.stringify({region:'${r}',obDone:true}))`;
// 地区规则
for(const [loc,tz,exp] of [['zh-CN','Europe/Bucharest','ro>cn'],['ro-RO','Asia/Shanghai','cn>ro'],['zh-CN','Asia/Shanghai','cn'],['ro-RO','Europe/Bucharest','ro'],['zh','Asia/Shanghai','cn'],['en-RO','America/New_York','ro'],['fr-FR','America/New_York','all']]){
 const [c,q]=await ctx(loc,tz);const ids=await chips(q);const hasR=ids.includes('roRca'),hasC=ids.includes('cnId'),gen=ids.includes('carIns');
 if(exp==='ro>cn')T(hasR&&hasC&&!gen&&ids.indexOf('roRca')<ids.indexOf('cnId'),loc+tz+ids);
 else if(exp==='cn>ro')T(hasR&&hasC&&!gen&&ids.indexOf('cnId')<ids.indexOf('roRca'),loc+tz+ids);
 else if(exp==='cn')T(hasC&&!hasR,loc+tz+ids);else if(exp==='ro')T(hasR&&!hasC,loc+tz+ids);else T(gen&&hasR&&hasC,loc+tz+ids);
 if(exp.includes('>')){await q.goto(B+'#/new?cat=car');await q.waitForTimeout(400);const g=await q.$$eval('.tpl-grp',e=>e.map(x=>x.textContent));T(g.length===3,'groups '+g);
  const f=await q.$$eval('.chips.tpl [data-tpl]',e=>e.map(b=>b.dataset.tpl));T(exp==='ro>cn'?f.indexOf('roRca')<f.indexOf('cnCompulsory'):f.indexOf('cnCompulsory')<f.indexOf('roRca'),'form order '+f);}
 await c.close();}
// 手动设置优先
for(const r of ['cn','ro','all']){const [c,q]=await ctx('zh-CN','Europe/Bucharest',390,pre(r));await q.goto(B+'#/');await q.waitForTimeout(400);const ids=await q.$$eval('.tpl-quick a',e=>e.map(a=>a.dataset.ex));
 T(r==='cn'?ids.includes('cnId')&&!ids.includes('roRca'):r==='ro'?ids.includes('roRca')&&!ids.includes('cnId'):ids.includes('carIns'),'manual '+r+ids);
 await q.goto(B+'#/settings');await q.waitForTimeout(300);T(await q.$eval('#region',e=>e.value)===r,'select '+r);await c.close();}
// R11-1：自选天数显示全部提前量并可取消
for(const w of [320,390])for(const [id,d] of [['cnPassport',180],['cnMedical',91],['cnId',60]]){const [c,q]=await ctx('zh-CN','Asia/Shanghai',w,pre('cn'));await q.goto(B+'#/new?tpl='+id);await q.waitForTimeout(500);
 const on=await q.$$eval('[data-cd].on',e=>e.map(b=>+b.dataset.cd));T(on.includes(d),id+' on '+on);
 const vis=await q.$eval(`[data-cd="${d}"]`,b=>{const r=b.getBoundingClientRect();return r.width>0&&r.right<=innerWidth;}).catch(()=>false);T(vis,id+' visible '+w);
 await q.$eval(`[data-cd="${d}"]`,b=>b.click());await q.waitForTimeout(200);T(!(await q.$$eval('[data-cd].on',e=>e.map(b=>+b.dataset.cd))).includes(d),id+' untick');
 await q.$eval(`[data-cd="${d}"]`,b=>b.click());await q.waitForTimeout(200);T((await q.$$eval('[data-cd].on',e=>e.map(b=>+b.dataset.cd))).includes(d),id+' retick');await c.close();}
// R11-1：已有条目带非常规天数（如 45）也能看到
{const [c,q]=await ctx('zh-CN','Asia/Shanghai',390,pre('cn')+`;localStorage.setItem('dq.items.v2',JSON.stringify([{id:'x1',cat:'doc',name:'X',due:'2027-06-01',intensitySource:'item',intensity:'custom',customDays:[45,2]}]))`);
 await q.goto(B+'#/edit/x1');await q.waitForTimeout(500);const on=await q.$$eval('[data-cd].on',e=>e.map(b=>+b.dataset.cd));T(on.includes(45)&&on.includes(2),'existing 45/2 '+on);await c.close();}
// R11-2 预设
const tpl=(await import('../js/templates.js')).TEMPLATES;const g=i=>tpl.find(x=>x.id===i);
T(g('cnId').renew===120&&g('cnId').int==='custom'&&String(g('cnId').days)==='60,30,7','cnId');
for(const i of ['cnInspectionMark','cnInspection'])T(g(i).int==='custom'&&String(g(i).days)==='30,7',i);
// R11-5 链接
T(g('cnId').url==='http://www.npc.gov.cn/c2/c12435/201905/t20190522_81831.html','url id');T(g('cnPassport').url==='https://www.nia.gov.cn/n741440/n741547/c1014017/content.html','url pp');T(g('cnDriving').url==='https://www.gov.cn/gongbao/2025/issue_11866/202502/content_7004031.html','url dl');
const zh=(await import('../js/i18n/zh.js')).zh;T(!zh['tplDocs.cnCompulsory'].includes('待核实'),'待核实');
// R11-4
const zv=Object.entries(zh).filter(([k])=>!k.startsWith('tplOld.'));T(!zv.some(([k,v])=>/RCA/.test(v)&&/交强险/.test(String(v))),'RCA 交强险');T(!zv.some(([k,v])=>/rovinieta/.test(String(v))),'rovinieta lower');
T(zh['tpl.roRca']==='RCA 车辆强制险'&&zh['gloss.roRca']==='RCA 车辆强制险','RCA names');
// R11-3 未知地区示例数据
{const [c,q]=await ctx('fr-FR','America/New_York');await q.goto(B+'?demo=1#/');await q.waitForTimeout(800);const it=JSON.parse(await q.evaluate(()=>localStorage.getItem('dq.items.v2')));const n=it.map(x=>x.name).join('|');
 T(n.includes('Passport')&&!/RCA|ITP|vignette|Residence/.test(n),'generic seed '+n);await c.close();}
{const [c,q]=await ctx('zh-CN','Europe/Bucharest');await q.goto(B+'?demo=1#/');await q.waitForTimeout(800);const n=JSON.parse(await q.evaluate(()=>localStorage.getItem('dq.items.v2'))).map(x=>x.name).join('|');T(/RCA 车辆强制险/.test(n),'mixed seed tz first '+n);await c.close();}
// 旧名仍能匹配模板
const {findTpl}=await import('../js/templates.js');T(findTpl('car','RCA 交强险')?.id==='roRca','old name');
console.log('v174',ok,'pass',bad,'fail');await br.close();process.exit(bad?1:0);})();
