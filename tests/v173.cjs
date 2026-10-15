// v1.7.3：示例跟地区走（中国 / 罗马尼亚 / 未知），罗马尼亚专有名词解释，320/390 无溢出，手动地区
const {chromium}=require('playwright-core');const B='http://localhost:8765/daoqi-tixing/';
(async()=>{const br=await chromium.launch({executablePath:'/usr/bin/google-chrome'});let ok=0,bad=0;const t=(c,m)=>{if(c)ok++;else{bad++;console.log('FAIL',m);}};const errs=[];
 const ctx=async(locale,timezoneId,w=390)=>{const c=await br.newContext({locale,timezoneId,viewport:{width:w,height:w<360?568:844}});c.setDefaultTimeout(5000);const q=await c.newPage();q.on('pageerror',e=>errs.push(e.message));return [c,q];};
 const chips=q=>q.$$eval('.tpl-quick a',e=>e.map(x=>x.dataset.ex+'='+x.textContent.trim()));
 const ENV=[['zh-CN','Asia/Shanghai','cn'],['zh','Asia/Shanghai','cn'],['ro-RO','Europe/Bucharest','ro'],['zh','Europe/Bucharest','ro'],['en-US','America/New_York','all'],['zh-TW','America/New_York','all']];
 for(const [loc,tz,r] of ENV)for(const w of [320,390]){const [c,q]=await ctx(loc,tz,w);
  // 引导
  await q.goto(B+'#/');await q.waitForTimeout(500);const lead=await q.textContent('.ob .lead');
  const ov=()=>q.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&[...document.querySelectorAll('.ob *,#view *')].every(e=>{const b=e.getBoundingClientRect();return !b.width||b.right<=innerWidth+1||e.closest('.chips,.seg-scroll')}));
  t(await ov(),`${loc} ${tz} ${w} 引导无溢出`);
  if(w===390){if(loc==='zh-CN')t(/身份证/.test(lead)&&!/居留卡|RCA/.test(lead),'CN 引导说明 '+lead);if(loc==='zh'&&r==='ro')t(/RCA 车辆强制险/.test(lead),'RO(zh) 引导说明带解释 '+lead);}
  await q.click('[data-ob=skip]');await q.waitForTimeout(400);
  // 空状态示例
  const ch=await chips(q),ids=ch.map(x=>x.split('=')[0]);t(await ov(),`${loc} ${tz} ${w} 空状态无溢出`);
  if(w===390){
   if(r==='cn')t(['cnId','cnPassport','cnDriving','cnCompulsory','cnCommercial','cnInspection','cnMedical'].every(x=>ids.includes(x))&&!ids.some(x=>/^ro/.test(x)),`${loc} CN 示例 ${ch}`);
   if(r==='ro')t(['roPermit','roRca','roItp','roRovinieta'].every(x=>ids.includes(x))&&!ids.some(x=>/^cn/.test(x)),`${loc} RO 示例 ${ch}`);
   if(r==='all')t(ids.slice(0,4).join()==='passport,carIns,milk,meds'&&ids.indexOf('roRca')>3&&ids.indexOf('roRca')<ids.indexOf('cnId'),`${loc} 未知：通用+罗在前 ${ch}`);
   if(loc==='zh-CN')t(ch.some(x=>/=身份证$/.test(x))&&ch.some(x=>/=交强险$/.test(x))&&ch.some(x=>/=上线年检$/.test(x))&&ch.some(x=>/=检验标志$/.test(x))&&ch.some(x=>/=医保$/.test(x)),'CN 中文短名 '+ch);
   if(loc==='zh'&&r==='ro')t(['RCA 车辆强制险','ITP 车辆年检','Rovinieta 公路使用费','罗马尼亚居留卡'].every(s=>ch.some(x=>x.endsWith('='+s))),'zh 界面罗马尼亚示例带中文解释 '+ch);
   if(loc==='ro-RO')t(!ch.some(x=>/车|公路/.test(x))&&ch.some(x=>x.endsWith('=RCA')),'ro 界面不加解释 '+ch);
   // 新增页冷启动常用
   await q.goto(B+'#/new');await q.waitForTimeout(300);const cold=await q.$$eval('.tpl-recent [data-tpl]',e=>e.map(x=>x.dataset.tpl));
   if(r==='cn')t(cold.includes('cnId')&&!cold.includes('roPermit'),'CN 常用 '+cold);if(r==='ro')t(cold.includes('roPermit')&&!cold.includes('cnId'),'RO 常用 '+cold);
   // 示例数据
   await q.goto(B+'?demo=1#/');await q.waitForTimeout(500);const it=await q.evaluate(()=>JSON.parse(localStorage.getItem('dq.items.v2')));
   const d1=it.find(i=>i.id==='d1').name;if(r==='cn')t(!it.some(i=>/RCA|ITP|Rovin/i.test(i.name)),'CN 示例数据无罗马尼亚 '+d1);if(r==='ro')t(it.some(i=>/RCA/.test(i.name)),'RO 示例数据 '+d1);
   // 手动改地区
   if(loc==='zh-CN'){await q.evaluate(()=>{localStorage.removeItem('dq.items.v2');});await q.goto(B+'#/settings');await q.reload();await q.waitForTimeout(300);await q.selectOption('#region','ro');await q.goto(B+'#/');await q.waitForTimeout(300);
    const c2=(await chips(q)).map(x=>x.split('=')[0]);t(c2.includes('roRca')&&!c2.includes('cnId'),'手动改为罗马尼亚 '+c2);}}
  await c.close();}
 // 设置「更多」分组列表
 for(const [loc,w0] of [['zh-CN','中文'],['ro-RO','ro'],['en-US','en']])for(const w of [320,390])for(const scheme of ['light','dark']){
  const c=await br.newContext({locale:loc,timezoneId:'Europe/Bucharest',viewport:{width:w,height:844},colorScheme:scheme});const q=await c.newPage();q.on('pageerror',e=>errs.push(e.message));
  await q.goto(B+'?demo=1#/');await q.waitForTimeout(400);await q.evaluate(()=>{const l=JSON.parse(localStorage.getItem('dq.items.v2'));l[0].deletedAt=new Date().toISOString();localStorage.setItem('dq.items.v2',JSON.stringify(l));});
  await q.goto(B+'#/settings');await q.reload();await q.waitForTimeout(400);
  const r=await q.evaluate(()=>{const rows=[...document.querySelectorAll('.set-row.go')];return {ids:rows.map(e=>e.id||e.getAttribute('href')),
    wrap:rows.flatMap(e=>[...e.querySelectorAll('.rt b,.rt small')]).filter(x=>x.getBoundingClientRect().height>(x.tagName==='B'?21:17)).map(x=>x.textContent),
    ics:!!document.querySelector('#icsS'),det:!!document.querySelector('details.more-set,.more-set'),
    last:(()=>{const secs=[...document.querySelectorAll('#view section')];const l=secs[secs.length-1];return l.querySelector('#clear')&&l.querySelectorAll('.set-row').length===1&&!document.querySelector('.about #clear')&&l.parentElement.id==='view'&&l.previousElementSibling?.classList.contains('danger-h');})(),
    red:(()=>{const b=document.querySelector('#clear .rt b');return getComputedStyle(b).color===getComputedStyle(document.documentElement).getPropertyValue('--expired').trim()||/rgb\((193, 39, 39|217, 69, 69|255, 107, 107)\)/.test(getComputedStyle(b).color);})(),
    rn:document.querySelector('a[href="#/trash"] .rn')?.textContent,sw:document.documentElement.scrollWidth<=innerWidth,
    heads:[...document.querySelectorAll('#view .micro.pad')].map(x=>x.textContent)}});
  const tag=`${loc} ${w} ${scheme}`;
  t(r.ids.join()==='ecsv,tpl,#/trash,obAgain,demo,clear',tag+' 行顺序 '+r.ids);t(!r.ics&&!r.det,tag+' 无 #icsS / 折叠');t(r.last,tag+' 清空全部单独在最底');t(r.red,tag+' 危险行红色');
  t(r.rn==='1',tag+' 回收站数量 '+r.rn);t(r.wrap.length===0,tag+' 不换行 '+r.wrap);t(r.sw,tag+' 无横向溢出');
  await q.click('#ecsv').catch(()=>{});await q.click('#clear');await q.waitForTimeout(200);t(await q.locator('#askOk').count()===1,tag+' 清空仍有确认');
  await c.close();}
 // UX 长度上限（320px）：行标题 20、副标题 28（回收站 25）、分组标题 36
 {const [c,q]=await ctx('zh-CN','Asia/Shanghai');await q.goto(B+'#/');
  const L=await q.evaluate(async()=>{const o={};for(const l of ['zh','ro','en']){const d=(await import('./js/i18n/'+l+'.js'))[l];o[l]=d;}return o;});
  const T=['set.exportCsv','set.csvTpl','ui.trashPage.1','ui.settings.32','ui.settings.33','ui.settings.34'],S=['set.row.csv.sub','set.row.tpl.sub','set.row.ob.sub','set.row.demo.sub','set.row.clr.sub'],G=['set.grp.data','set.grp.tools','set.grp.danger'];
  for(const l of ['zh','ro','en']){const d=L[l],len=k=>[...String(d[k])].length;
   for(const k of T)t(len(k)<=20,`UX ${l} ${k} ≤20：${d[k]}`);for(const k of S)t(len(k)<=28,`UX ${l} ${k} ≤28：${d[k]}`);t(len('set.row.trash.sub')<=25,`UX ${l} 回收站副标题 ≤25：${d['set.row.trash.sub']}`);for(const k of G)t(len(k)<=36,`UX ${l} ${k} ≤36`);
   t(!('set.row.csv' in d)&&!('set.more' in d),`UX ${l} 无 set.row.csv / set.more`);}
  t(L.zh['set.grp.data']==='表格'&&L.ro['set.grp.data']==='Tabel'&&L.en['set.grp.data']==='Spreadsheet','UX 分组名 表格/Tabel/Spreadsheet');
  await q.goto(B+'?demo=1#/settings');await q.waitForTimeout(400);t(await q.$eval('#tpl .ri',e=>e.innerHTML.includes('M12 4v11')),'UX 模板行用下载图标');
  await c.close();}
 // 分类宫格：天数在名称下面单独一行，320 三语都完整显示
 for(const loc of ['zh-CN','ro-RO','en-US']){const [c,q]=await ctx(loc,'Europe/Bucharest',320);await q.goto(B+'?demo=1#/');await q.waitForTimeout(400);
  await q.evaluate(()=>{const l=JSON.parse(localStorage.getItem('dq.items.v2'));const x=l.find(i=>i.cat==='med');x.name='Ibuprofen 400 mg comprimate filmate extra long name';localStorage.setItem('dq.items.v2',JSON.stringify(l));});
  await q.goto(B+'#/cats');await q.reload();await q.waitForTimeout(400);
  const r=await q.$eval('a.tile[href="#/cat/med"]',a=>{const d=a.querySelector('.tile-d'),n=a.querySelector('small.ell:not(.tile-d)');const bd=d.getBoundingClientRect(),bn=n.getBoundingClientRect();return {txt:d.textContent,full:d.scrollWidth<=d.clientWidth+1,below:bd.top>=bn.bottom-1,expired:d.classList.contains('expired')};});
  t(r.full&&r.below&&/\d/.test(r.txt),`宫格 ${loc} 320 天数单独一行完整 ${JSON.stringify(r)}`);t(await q.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`宫格 ${loc} 320 无溢出`);
  const g=await q.evaluate(()=>{const tiles=[...document.querySelectorAll('a.tile')];const h1=document.querySelector('.top h1');const cs=getComputedStyle(h1);
   return {prefix:tiles.some(a=>/Următorul|Next:|最近：/.test(a.querySelector('.tile-n').textContent)),
    cls:tiles.map(a=>{const d=a.querySelector('.tile-d');return [d.textContent.trim(),d.className.replace(/ell|tile-d/g,'').trim()]}),
    h1one:h1.getBoundingClientRect().height<=parseFloat(cs.lineHeight||'40')*1.3||h1.scrollHeight<=h1.clientHeight+2,h1full:h1.scrollWidth<=h1.clientWidth+1,h1txt:h1.textContent};});
  t(!g.prefix,`宫格 ${loc} 第一行无前缀`);t(g.cls.every(([tx,c])=>!/\d/.test(tx)||c===''||c==='soon'||c==='expired')&&g.cls.some(([,c])=>c==='expired')&&g.cls.some(([,c])=>c==='soon'),`宫格 ${loc} 天数按状态着色 ${JSON.stringify(g.cls)}`);
  t(g.h1one&&g.h1full,`分类页标题 ${loc} 320 不断词 ${g.h1txt}`);await c.close();}
 // R10-1：JSON 备份里旧分类名（4 种写法）并入 home，不新建自定义分类
 {const fs=require('fs');const bk={app:'daoqi-tixing',version:2,items:[1,2,3,4].map(i=>({id:'w'+i,name:'W'+i,due:'2027-01-0'+i,cat:'c_w'+i})),categories:[{id:'c_w1',name:'Warranties'},{id:'c_w2',name:' garantii '},{id:'c_w3',name:'Garanţii'},{id:'c_w4',name:'Warranty'},{id:'c_p2',name:'Pets2'}]};
  bk.items.push({id:'p1',name:'Cat food',due:'2027-02-01',cat:'c_p2'});fs.writeFileSync('/tmp/r10.json',JSON.stringify(bk));
  const [c,q]=await ctx('en-US','Europe/Bucharest');await q.goto(B+'#/');await q.evaluate(()=>localStorage.setItem('dq.settings.v1',JSON.stringify({onboarded:true})));await q.goto(B+'#/settings');await q.reload();await q.waitForTimeout(300);
  await q.setInputFiles('#imp','/tmp/r10.json');await q.waitForTimeout(400);await q.click('#impGo');await q.waitForTimeout(200);if(await q.locator('#askOk').count())await q.click('#askOk');await q.waitForTimeout(500);
  const r=await q.evaluate(()=>({it:JSON.parse(localStorage.getItem('dq.items.v2')),cu:(JSON.parse(localStorage.getItem('dq.settings.v1')).cats?.custom||[]).map(c=>c.name)}));
  t(r.it.filter(i=>/^w/.test(i.id)).every(i=>i.cat==='home'),'R10-1 4 种旧名条目归入 home '+r.it.map(i=>i.cat));t(!r.cu.some(n=>/warrant|garan/i.test(n))&&r.cu.includes('Pets2'),'R10-1 不新建旧名分类，Pets2 照常 '+r.cu);
  await c.close();}
 // lbl.expired.full 在详情页（可换行）
 for(const [loc,re] of [['ro-RO',/Expirat de 12 zile/],['en-US',/Expired 12 days ago/],['zh-CN',/已过期 12 天/]]){const [c,q]=await ctx(loc,'Europe/Bucharest',320);await q.goto(B+'?demo=1#/');await q.waitForTimeout(400);await q.goto(B+'#/item/d9');await q.waitForTimeout(400);t(re.test(await q.textContent('.exp-full')),`详情 ${loc} 完整过期说明`);await c.close();}
 // 默认值
 {const [c,q]=await ctx('zh-CN','Asia/Shanghai');await q.goto(B+'#/');
  const tp=await q.evaluate(async()=>{const m=await import('./js/templates.js');const o={};for(const x of m.TEMPLATES)if(x.region==='cn')o[x.id]={renew:x.renew,int:x.int,days:x.days};return o;});
  const J=JSON.stringify;t(tp.cnId.renew===120&&tp.cnDriving.renew===''&&J(tp.cnDriving.days)==='[90,30,7]','中国 身份证/驾驶证 '+J([tp.cnId,tp.cnDriving]));
  t(tp.cnCompulsory.renew===12&&tp.cnCommercial.renew===12&&tp.cnCompulsory.int==='standard'&&tp.cnCommercial.int==='standard','中国 交强险/商业险 12 月 30/7/1');
  t(tp.cnInspectionMark?.renew===24&&tp.cnInspection.renew==='','中国 年检拆成 标志(2 年)/上线(用户填) '+J([tp.cnInspectionMark,tp.cnInspection]));
  t(tp.cnPassport.renew===120&&J(tp.cnPassport.days)==='[180,90,30]','中国 护照 10 年 180/90/30');t(tp.cnMedical.renew===12&&J(tp.cnMedical.days)==='[91,30]','中国 医保 每年 10-01/12-01');
  // 套用模板后条目带上提醒天数，周期可改
  await q.evaluate(()=>{const s=JSON.parse(localStorage.getItem('dq.settings.v1')||'{}');s.onboarded=true;localStorage.setItem('dq.settings.v1',JSON.stringify(s));});
  await q.goto(B+'#/new?tpl=cnDriving');await q.reload();await q.waitForTimeout(400);await q.fill('#dueT','01.06.2030');await q.click('#saveTop');await q.waitForTimeout(400);
  const it=await q.evaluate(()=>JSON.parse(localStorage.getItem('dq.items.v2')).find(i=>/驾驶证/.test(i.name)));t(it&&it.intensity==='custom'&&J(it.customDays)==='[90,30,7]'&&!it.renewMonths,'套用驾驶证模板 '+J(it));
  await q.goto(B+'#/new?tpl=cnCompulsory');await q.reload();await q.waitForTimeout(400);await q.$$eval('details',d=>d.forEach(x=>x.open=true));const rm=q.locator('[name=renewMonths]');t(await rm.count()>0&&await rm.first().inputValue()==='12'&&await rm.first().isEditable(),'交强险周期 12 且可编辑');
  await c.close();}
 console.log(ok,'passed',bad,'failed');console.log('errors',errs.slice(0,5));await br.close();})();
