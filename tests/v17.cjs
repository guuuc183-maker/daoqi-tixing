// v1.7.0 多语言验收：首次语言、切换不刷新、全页无中文残留、320/390 无横向溢出、底栏无省略号、离线语言包、备份跨语言恢复
const {chromium}=require('playwright-core');const fs=require('fs');const B='http://localhost:8765/daoqi-tixing/';
const PAGES=['#/','#/todo','#/cats','#/cat/doc','#/new','#/cal','#/settings','#/catrules','#/catmgr','#/trash','#/item/d1','#/item/d6'];
const CJK=/[\u3000-\u303f\u4e00-\u9fff\uff00-\uffef]/;
(async()=>{const br=await chromium.launch({executablePath:'/usr/bin/google-chrome'});let ok=0,bad=0;const t=(c,m)=>{if(c)ok++;else{bad++;console.log('FAIL',m);}};const errs=[];
 const ctx=async(locale,o={})=>{const c=await br.newContext({locale,viewport:{width:390,height:844},acceptDownloads:true,...o});c.setDefaultTimeout(5000);const q=await c.newPage();q.on('pageerror',e=>errs.push(locale+' '+e.message));return [c,q];};
 // 1 首次语言
 for(const [loc,l,word] of [['zh-CN','zh','首页'],['ro-RO','ro','Acasă'],['en-US','en','Home']]){const [c,q]=await ctx(loc);await q.goto(B+'#/');await q.waitForTimeout(500);
  t(await q.evaluate(()=>document.documentElement.lang)===(l==='zh'?'zh-CN':l),'L2 html lang '+loc);t((await q.textContent('[data-tab=home] span')).trim()===word,'L2 首次语言 '+loc);await c.close();}
 // 2 每种语言 × 320/390 × 浅/深：所有页面无溢出、ro/en 无中文
 for(const l of ['ro','en','zh'])for(const w of [320,390])for(const scheme of ['light','dark']){const [c,q]=await ctx(l==='zh'?'zh-CN':l,{viewport:{width:w,height:740},colorScheme:scheme});
  await q.goto(B+'?demo=1#/');await q.waitForTimeout(400);await q.evaluate(()=>{const s=JSON.parse(localStorage.getItem('dq.settings.v1'));s.lastBackupAt=new Date(Date.now()-20*864e5).toISOString();localStorage.setItem('dq.settings.v1',JSON.stringify(s));});
  for(const pg of PAGES){await q.goto(B+pg);await q.waitForTimeout(250);await q.$$eval('details',d=>d.forEach(x=>x.open=true));
   const r=await q.evaluate(()=>({sw:document.documentElement.scrollWidth,iw:innerWidth,txt:document.body.innerText,
     wide:[...document.querySelectorAll('#view *')].filter(e=>{const b=e.getBoundingClientRect();return b.width>0&&b.right>innerWidth+1&&getComputedStyle(e).position!=='fixed'&&!e.closest('[style*="overflow"],.chips,.tpl,.lang-seg,.seg-scroll')&&e.offsetParent;}).slice(0,3).map(e=>e.className||e.tagName),
     tabEll:[...document.querySelectorAll('.tabbar a span')].filter(s=>s.scrollWidth>s.clientWidth+1).map(s=>s.textContent)}));
   t(r.sw<=r.iw,`L7 ${l} ${w} ${scheme} ${pg} 横向溢出 ${r.sw}>${r.iw}`);
   if(scheme==='light'){t(r.wide.length===0,`L7 ${l} ${w} ${pg} 元素超出 ${r.wide}`);t(r.tabEll.length===0,`L7 ${l} ${w} 底栏省略 ${r.tabEll}`);
    if(l!=='zh'){const lines=r.txt.split('\n').filter(x=>CJK.test(x)&&x.trim()!=='中文');t(lines.length===0,`L1 ${l} ${pg} 中文残留: ${lines.slice(0,3).join(' | ')}`);}}}
  await c.close();}
 // 3 切换语言立即生效、刷新保持；<360 隐藏行图标但保留状态色
 {const [c,q]=await ctx('zh-CN',{viewport:{width:320,height:740}});await q.goto(B+'?demo=1#/settings');await q.waitForTimeout(400);
  await q.click('[data-lang=ro]');await q.waitForTimeout(500);t(/Setări|Profil/.test(await q.textContent('#view'))&&(await q.textContent('[data-tab=settings] span')).trim()==='Profil','L2 切到 ro 不刷新');
  t(await q.getAttribute('[data-lang=ro]','aria-checked')==='true','L2 aria-checked');
  await q.reload();await q.waitForTimeout(400);t((await q.textContent('[data-tab=home] span')).trim()==='Acasă','L2 刷新保持 ro');
  await q.goto(B+'#/');await q.waitForTimeout(300);const seg=await q.$$eval('.seg button',b=>b.map(x=>x.textContent.trim()));t(seg.join('/')==='Toate/Curând/Expirat/Sigur','L7 分段 '+seg.join('/'));
  const row=await q.evaluate(()=>{const r=document.querySelector('.todo-row');if(!r)return null;const ic=r.querySelector('.todo-main .ic');const sm=r.querySelector('.todo-main small');return {icon:ic?getComputedStyle(ic).display:'none',color:getComputedStyle(sm).color,body:getComputedStyle(document.body).color,nameW:r.querySelector('.todo-main b').getBoundingClientRect().width};});
  t(row&&row.icon==='none'&&row.color!==row.body&&row.nameW>=96,'L7 <360 隐藏图标、保留状态色、名称≥96 '+JSON.stringify(row));
  // 拉丁字体在前
  const ff=await q.evaluate(()=>getComputedStyle(document.body).fontFamily);t(/^system-ui/.test(ff),'字体栈拉丁在前 '+ff.slice(0,40));
  // ro 推断
  await q.goto(B+'#/new');await q.waitForTimeout(300);for(const [w,k] of [['lapte','food'],['pașaport','doc'],['detergent','daily']]){await q.fill('[name=name]',w);await q.press('[name=name]','Tab');await q.waitForTimeout(150);t(await q.inputValue('[name=cat]')===k,'L5 ro 推断 '+w);}
  t(await q.$eval('.cat-field',e=>getComputedStyle(e).display)==='flex'&&(await q.textContent('.lbl-wrap .lbl-t')).trim()==='Categorie','L7 分类框单行 + 标签单数');
  // 模板分组
  await q.goto(B+'#/new?cat=doc');await q.reload();await q.waitForTimeout(300);const grp=await q.$$eval('.tpl-grp',e=>e.map(x=>x.textContent));t(grp.join('/')==='China/General','L4 地区跟浏览器 zh-CN（不跟界面语言 ro）'+grp);
  await q.evaluate(()=>{const s=JSON.parse(localStorage.getItem('dq.settings.v1'));s.region='all';localStorage.setItem('dq.settings.v1',JSON.stringify(s));});await q.reload();await q.waitForTimeout(300);
  const g2=await q.$$eval('.tpl-grp',e=>e.map(x=>x.textContent));t(g2.join('/')==='România/China/General','L4 三组罗马尼亚在前 '+g2);
  // 日期格式
  await q.goto(B+'#/');await q.waitForTimeout(300);t(/\d{1,2} [a-zăîâșț]+\.? \d{4}, [a-zăîâșț]+/.test(await q.textContent('.micro')),'L3 ro 首页日期 '+await q.textContent('.micro'));
  await q.goto(B+'#/cal');await q.waitForTimeout(300);t(/^lun/i.test((await q.textContent('.cal-grid.wk span')).trim()),'L3 ro 日历周一开头');
  await c.close();}
 // R8-2 默认地区：地区码 → 时区 → 两组都显示（罗马尼亚在前）；R8 #3 日期用浏览器完整 locale
 for(const [loc,tz,exp] of [['ro-RO','Asia/Shanghai','România/General'],['en-US','Asia/Shanghai','China/General'],['en','Asia/Shanghai','China/General'],['en','Asia/Urumqi','China/General'],['en','Europe/Bucharest','România/General'],['zh','America/New_York','România/China/General'],['en-US','America/New_York','România/China/General'],['en-GB','Europe/London','România/China/General']]){
  const [c,q]=await ctx(loc,{timezoneId:tz});await q.goto(B+'?demo=1#/new?cat=doc');await q.waitForTimeout(400);await q.goto(B+'#/new?cat=doc');await q.reload();await q.waitForTimeout(300);
  const g=(await q.$$eval('.tpl-grp',e=>e.map(x=>x.textContent))).map(x=>({'中国':'China','罗马尼亚':'România','通用':'General','Romania':'România'}[x]||x));t(g.join('/')===exp,`R8-2 ${loc} ${tz} → ${g.join('/')}（应 ${exp}）`);
  if(loc==='en-US'&&tz==='America/New_York'){await q.goto(B+'#/settings');await q.waitForTimeout(300);await q.selectOption('#region','cn');await q.goto(B+'#/new?cat=doc');await q.waitForTimeout(300);
   const g3=(await q.$$eval('.tpl-grp',e=>e.map(x=>x.textContent)));t(g3.length===0||!g3.some(x=>/Rom/.test(x)),'R8-2 设置里手动改地区生效 '+g3);}
  await c.close();}
 for(const [loc,re] of [['en-US',/^[A-Z][a-z]{2}, [A-Z][a-z]{2} \d{1,2}, \d{4}$/],['en-GB',/^[A-Z][a-z]{2}, \d{1,2} [A-Z][a-z]{2} \d{4}$/],['en-AU',/^[A-Z][a-z]{2}, \d{1,2} [A-Z][a-z]{2} \d{4}$/],['en-IE',/^[A-Z][a-z]{2}, \d{1,2} [A-Z][a-z]{2} \d{4}$/]]){
  const [c,q]=await ctx(loc);await q.goto(B+'?demo=1#/');await q.waitForTimeout(400);const m=(await q.textContent('.micro')).split(' · ')[0].trim();t(re.test(m),`R8-3 ${loc} 首页日期 ${m}`);
  await q.goto(B+'#/item/d1');await q.waitForTimeout(300);const tx=await q.textContent('#view');t(loc==='en-US'?/[A-Z][a-z]{2} \d{1,2}, \d{4}/.test(tx):/\d{1,2} [A-Z][a-z]{2} \d{4}/.test(tx),`R8-3 ${loc} 详情日期`);await c.close();}
 // round9：R9-4 升级时自建「Home」改名、条目不变；R9-1 规则页复数；R9-2 强度说明
 {const [c,q]=await ctx('en-US');await q.goto(B+'?demo=1#/');await q.waitForTimeout(400);await q.goto(B+'#/');await q.reload();await q.waitForTimeout(400);
  await q.evaluate(()=>{const s=JSON.parse(localStorage.getItem('dq.settings.v1'));s.cats={...(s.cats||{}),custom:[{id:'c_myhome',name:'Home',icon:'home',color:'#D94545'}]};localStorage.setItem('dq.settings.v1',JSON.stringify(s));
   const l=JSON.parse(localStorage.getItem('dq.items.v2'));l[0].cat='c_myhome';localStorage.setItem('dq.items.v2',JSON.stringify(l));});
  const SNAP=()=>q.evaluate(()=>JSON.stringify(JSON.parse(localStorage.getItem('dq.items.v2')).map(i=>Object.keys(i).sort().reduce((o,k)=>(o[k]=i[k],o),{}))));const before=await SNAP();await q.reload();await q.waitForTimeout(500);
  t(await SNAP()===before&&before.includes('"cat":"c_myhome"'),'R9-4 升级后条目不变（仍在 c_myhome）');
  const nm=await q.evaluate(()=>JSON.parse(localStorage.getItem('dq.settings.v1')).cats.custom.find(c=>c.id==='c_myhome')?.name);t(nm&&nm!=='Home','R9-4 自建 Home 改名为 '+nm);
  await q.goto(B+'#/catmgr');await q.waitForTimeout(300);const names=await q.$$eval('.cm-row',e=>e.map(x=>x.querySelector('b')?.textContent.trim()||x.textContent.trim()));t(names.filter(x=>/^Home$/i.test(x)).length<=1,'R9-4 分类管理没有两个 Home '+names.join('|'));
  await q.reload();await q.waitForTimeout(400);t(await q.evaluate(()=>JSON.parse(localStorage.getItem('dq.settings.v1')).cats.custom.find(c=>c.id==='c_myhome')?.name)===nm,'R9-4 再次启动不重复改名');
  await c.close();}
 for(const [loc,exp] of [['ro-RO','30 de zile'],['en-US','30 days']]){const [c,q]=await ctx(loc);await q.goto(B+'?demo=1#/catrules');await q.waitForTimeout(400);
  const opts=(await q.$$eval('select option',e=>e.map(x=>x.textContent))).map(x=>x.replace(/\u00a0/g,' '));t(opts.some(x=>x.endsWith(exp))&&!opts.some(x=>/\b30 zile\b|\b1 days\b/.test(x)),`R9-1 ${loc} 规则页 ${exp}`);
  await q.goto(B+'#/new');await q.waitForTimeout(300);const tx=(await q.textContent('#view')).replace(/\u00a0/g,' ');t(!/\b1 zile\b|\b1 days\b/.test(tx),`R9-2 ${loc} 新增页无「1 zile/1 days」`);await c.close();}
 // 4 中文备份 → en 恢复
 {const [c,q]=await ctx('zh-CN');await q.goto(B+'?demo=1#/settings');await q.waitForTimeout(400);const [d]=await Promise.all([q.waitForEvent('download'),q.click('#bkNow')]);await d.saveAs('/tmp/v17bk.json');const n0=(await q.evaluate(()=>JSON.parse(localStorage.getItem('dq.items.v2')).filter(i=>!i.deletedAt).length));await c.close();
  const [c2,q2]=await ctx('en-US');await q2.goto(B+'#/');await q2.waitForTimeout(400);await q2.evaluate(()=>{localStorage.setItem('dq.settings.v1',JSON.stringify({onboarded:true}));});await q2.goto(B+'#/settings');await q2.reload();await q2.waitForTimeout(300);
  await q2.setInputFiles('#imp','/tmp/v17bk.json');await q2.waitForTimeout(400);await q2.click('#impGo');await q2.waitForTimeout(500);
  const it=await q2.evaluate(()=>JSON.parse(localStorage.getItem('dq.items.v2')).filter(i=>!i.deletedAt));t(it.length===n0&&it.every(i=>i.cat&&i.cat!=='other'||i.cat==='other'),'L6 zh 备份在 en 恢复 '+it.length+'/'+n0);
  t(it.some(i=>i.cat==='daily'||i.cat==='doc'),'L6 分类 id 保持');
  // 离线：三个语言包都在缓存
  await q2.waitForTimeout(800);const keys=await q2.evaluate(async()=>{const c=await caches.open((await caches.keys())[0]);return (await c.keys()).map(r=>r.url);});t(['zh','ro','en'].every(l=>keys.some(u=>u.endsWith('/i18n/'+l+'.js'))),'离线 三个语言包在缓存');
  await c2.close();}
 console.log(ok,'passed',bad,'failed');console.log('errors',errs.slice(0,5));await br.close();})();
