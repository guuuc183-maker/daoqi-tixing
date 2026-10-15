// v1.6.0 验收（v1.6-v1.7迭代计划.md §二 + UX/v1.6-交互与文案.md）。点击数用计数器记录
const {chromium}=require('playwright-core');const B='http://localhost:8765/daoqi-tixing/';
(async()=>{const br=await chromium.launch({executablePath:'/usr/bin/google-chrome'});let ok=0,bad=0;const errs=[];const t=(c,m)=>{if(c)ok++;else{bad++;console.log('FAIL',m);}};
 const ctx=async(o={})=>{const c=await br.newContext({viewport:{width:390,height:844},acceptDownloads:true,...o});c.setDefaultTimeout(5000);const q=await c.newPage();q.on('pageerror',e=>errs.push(e.message));let clicks=0;q.tap=async s=>{clicks++;await q.click(s);};q.clicks=()=>clicks;q.reset=()=>{clicks=0;};return [c,q];};
 const today=(n=0)=>{const d=new Date();d.setDate(d.getDate()+n);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');};
 const IT=q=>q.evaluate(()=>JSON.parse(localStorage.getItem('dq.items.v2')||'[]'));
 // 1 老用户 3 次点击加牛奶 + 保存在首屏 + 回到原页
 {const [c,q]=await ctx({reducedMotion:'reduce'});await q.goto(B+'?demo=1#/');await q.evaluate(()=>{const s=JSON.parse(localStorage.getItem('dq.settings.v1'));s.tplUse={'牛奶':{n:3,at:new Date().toISOString()}};s.lastBackupAt=new Date().toISOString();localStorage.setItem('dq.settings.v1',JSON.stringify(s));});
  await q.goto(B+'#/');await q.reload();await q.waitForTimeout(400);q.reset();
  await q.tap('a[data-tab=new]');await q.waitForTimeout(300);
  const sb=await q.$eval('#saveTop',e=>{const r=e.getBoundingClientRect();return [r.top,r.bottom,innerHeight,scrollY];});t(sb[0]>=0&&sb[1]<=sb[2]&&sb[3]===0,'U1 保存在 390×844 首屏 '+sb);
  t(/最近/.test(await q.textContent('.tpl-recent').then(()=>q.textContent('.micro.pad'))),'U1 最近行');
  await q.tap('.tpl-recent [data-tpl="牛奶"]');await q.waitForTimeout(200);t(await q.inputValue('#dueP')===today(7),'U1 牛奶自动 +7 天');
  t(/以包装日期为准/.test(await q.textContent('.shelf-note')),'U1 保质期提示');
  await q.tap('#saveTop');await q.waitForTimeout(400);t(q.clicks()===3,'U1 3 次点击 '+q.clicks());
  const milk=(await IT(q)).filter(i=>i.name==='牛奶').pop();t(milk.due===today(7)&&milk.cat==='food','U1 保存正确');t(/#\/$/.test(q.url()),'U1 回到首页 '+q.url());
  t(/已添加「牛奶」/.test(await q.textContent('.toast')),'U1 toast');
  // 回车保存
  await q.goto(B+'#/cats');await q.waitForTimeout(200);await q.goto(B+'#/new');await q.waitForTimeout(300);await q.fill('#dueT','01.12.2026');await q.fill('[name=name]','洗衣液');await q.press('[name=name]','Enter');await q.waitForTimeout(400);
  const x=(await IT(q)).find(i=>i.name==='洗衣液');t(x&&x.cat==='daily','C1 洗衣液→日用品（回车保存） '+JSON.stringify(x));t(/#\/cats$/.test(q.url()),'U1 回到来源页 '+q.url());
  // 「更多设置」默认折叠
  await q.goto(B+'#/new');await q.waitForTimeout(300);t(await q.$eval('#more',e=>!e.open),'U1 更多设置默认折叠');
  // 新会话 lastCat 为空 → 条目最多的分类
  await q.evaluate(()=>{const s=JSON.parse(localStorage.getItem('dq.settings.v1'));delete s.lastCat;localStorage.setItem('dq.settings.v1',JSON.stringify(s));});await q.goto(B+'#/');await q.goto(B+'#/new');await q.reload();await q.waitForTimeout(300);
  const counts=await q.evaluate(()=>{const c={};JSON.parse(localStorage.getItem('dq.items.v2')).filter(i=>!i.deletedAt).forEach(i=>c[i.cat]=(c[i.cat]||0)+1);return Object.entries(c).sort((a,b)=>b[1]-a[1])[0][0];});
  t(await q.inputValue('[name=cat]')===counts,'U1 默认=条目最多的分类 '+counts);
  // U2 RCA + 计数一致
  await q.goto(B+'#/');await q.waitForTimeout(300);const N=+await q.textContent('#todayN'),X=+await q.textContent('#todayX'),Y=+await q.textContent('#todayS');
  await q.goto(B+'#/todo');await q.waitForTimeout(300);const rows=await q.$$eval('.card.todo:not(.later) .todo-row',e=>e.map(r=>r.querySelector('b').textContent));
  t(rows.includes('RCA 交强险'),'U2 RCA 在待办');t(N===rows.length&&X+Y===N,`U2 首页 ${N}=待办 ${rows.length}，${X}+${Y}`);
  // 明天再说不计入今天
  await q.click('.todo-row:has([data-a=more]) [data-a=more]');await q.click('[data-s=snooze]');await q.waitForTimeout(300);await q.goto(B+'#/');await q.waitForTimeout(300);t(+await q.textContent('#todayN')===N-1,'PM3 明天再说不算今天要办');
  // 按钮文案
  t(await q.locator('.todo-row [data-a=done]').count()>0&&!(await q.textContent('#view')).includes('已处理'),'U3 搞定文案');
  await c.close();}
 // U3 10 条全部搞定 ≤3 次点击 + 一次撤销全部恢复
 {const [c,q]=await ctx();await q.goto(B+'#/');await q.evaluate(d=>{const l=[];for(let i=0;i<10;i++)l.push({id:'t'+i,name:'待办'+i,due:d,cat:'other',...(i<2?{renewMonths:12}:{})});localStorage.setItem('dq.items.v2',JSON.stringify(l));localStorage.setItem('dq.settings.v1',JSON.stringify({onboarded:true,lastBackupAt:new Date().toISOString()}));},today(1));
  await q.reload();await q.waitForTimeout(400);q.reset();const before=await IT(q);
  await q.tap('#allDone');await q.waitForTimeout(700);t(/已搞定 10 件，其中 2 件已续到下期/.test(await q.textContent('.toast')),'U3 toast 文案');
  await q.goto(B+'#/todo');await q.waitForTimeout(300);t(await q.locator('.card.todo:not(.later) .todo-row').count()===0&&await q.locator('.done-state').count()===1,'U3 待办清空 + 完成卡');
  const mid=await IT(q);t(mid.filter(i=>i.handledAt).length===8&&mid.filter(i=>i.history?.length).length===2,'U3 有周期续期、其余搞定');
  await q.goto(B+'#/');await q.waitForTimeout(200);await q.evaluate(()=>{});
  // 撤销：重新执行并点撤销
  await q.evaluate(l=>localStorage.setItem('dq.items.v2',JSON.stringify(l)),before);await q.reload();await q.waitForTimeout(300);q.reset();
  await q.tap('#allDone');await q.waitForTimeout(500);await q.tap('.toast .undo');await q.waitForTimeout(300);t(JSON.stringify(await IT(q))===JSON.stringify(before),'U3 撤销恢复全部 10 条');t(q.clicks()<=3,'U3 点击数 '+q.clicks());
  // 1 条也显示，直接执行
  await q.evaluate(d=>localStorage.setItem('dq.items.v2',JSON.stringify([{id:'o1',name:'单条',due:d,cat:'other'}])),today(1));await q.reload();await q.waitForTimeout(300);t(await q.locator('#allDone').count()===1,'U3 1 条也显示全部搞定');
  // 多选
  await q.evaluate(d=>{const l=[];for(let i=0;i<4;i++)l.push({id:'m'+i,name:'多选'+i,due:d,cat:'other'});localStorage.setItem('dq.items.v2',JSON.stringify(l));},today(1));await q.goto(B+'#/todo');await q.reload();await q.waitForTimeout(300);
  await q.click('#selTog');await q.click('.todo-row[data-id=m0]');await q.click('.todo-row[data-id=m2]');await q.waitForTimeout(150);t(/已选 2 件/.test(await q.textContent('.sel-bar')),'U3 多选计数');
  await q.click('#selDone');await q.waitForTimeout(600);const ml=await IT(q);t(ml.filter(i=>i.handledAt).map(i=>i.id).join()==='m0,m2','U3 多选搞定');
  // 长按进入多选
  await q.goto(B+'#/todo');await q.waitForTimeout(300);const bb=await (await q.$('.todo-row[data-id=m1] .todo-main b')).boundingBox();await q.mouse.move(bb.x+5,bb.y+5);await q.mouse.down();await q.waitForTimeout(650);await q.mouse.up();await q.waitForTimeout(200);
  t(await q.locator('.sel-bar').count()===1,'U3 长按 500ms 进入多选');await c.close();}
 // U4 1 屏引导
 {const [c,q]=await ctx();await q.goto(B+'#/');await q.waitForTimeout(500);t(await q.locator('.ob1').count()===1&&await q.locator('.ob-track,[data-ob=next]').count()===0,'U4 引导 1 屏');
  t(/提前 7 天，提醒 1 次/.test(await q.textContent('.ob1 .lvls'))&&/提前 60 天起，共 14 次/.test(await q.textContent('.ob1 .lvls')),'U4 强度说明');
  q.reset();await q.tap('[data-ob=add]');await q.waitForTimeout(300);t(/#\/new/.test(q.url()),'U4 加第一条进新增页');
  await q.tap('[data-tpl="居留卡"]');await q.fill('#dueT','15.10.2027');await q.tap('#saveTop');await q.waitForTimeout(400);t(q.clicks()<=4&&(await IT(q)).length===1,'U4 首次录入 ≤4 次点击 '+q.clicks());
  await q.reload();await q.waitForTimeout(400);t(await q.locator('.ob1').count()===0,'U4 onboarded 刷新不出现');await c.close();}
 // U5 设置首屏备份 + 无 JSON/照片选项
 {const [c,q]=await ctx();await q.goto(B+'?demo=1#/settings');await q.waitForTimeout(400);
  const r=await q.$eval('#bkNow',e=>{const b=e.getBoundingClientRect();return b.bottom<=innerHeight-60&&scrollY===0;});t(r,'U5 设置首屏能看到备份到文件');
  t(await q.locator('#ejson,#incPh,#incTrash').count()===0,'U5 没有导出 JSON/包含照片');t(/推荐/.test(await q.textContent('#bkNow .bk-sub'))&&!/（推荐）/.test(await q.textContent('#bkNow')),'U5 推荐副标题');
  const [d]=await Promise.all([q.waitForEvent('download'),q.click('#bkNow')]);t(/^到期提醒-备份-\d{4}-\d{2}-\d{2}\.json$/.test(d.suggestedFilename()),'U5 文件名 '+d.suggestedFilename());
  t(/已备份 \d+ 条/.test(await q.textContent('.toast')),'U5 备份 toast');
  await q.evaluate(()=>localStorage.setItem('dq.items.v2','[]'));await q.goto(B+'#/');await q.reload();await q.waitForTimeout(300);t(await q.locator('#emptyRestore').count()===1,'U5 空状态从备份恢复');
  await q.goto(B+'#/settings');await q.waitForTimeout(300);t(/v\d+\.\d+\.\d+/.test(await q.textContent('.about .ver')),'V1 关于页版本');
  const ver=await q.evaluate(()=>import('./js/version.js').then(m=>m.VERSION));const keys=await q.evaluate(()=>caches.keys());t(await q.textContent('.about .ver')==='v'+ver,'V1 关于=version.js');
  await q.waitForTimeout(1000);t((await q.evaluate(()=>caches.keys())).includes('dq-v'+ver),'V1 SW 缓存名含版本 '+keys);await c.close();}

 // v1.6.1 P0-A 桌面宽屏引导 1 屏可走完 + 重新查看引导
 {const [c,q]=await ctx({viewport:{width:1280,height:800}});await q.goto(B+'#/');await q.waitForTimeout(500);
  const r=await q.$eval('.ob1',e=>{const b=e.getBoundingClientRect();return {w:b.width,vis:b.width>0&&b.height>0,pages:document.querySelectorAll('.ob-page').length};});t(r.vis&&r.pages<=1,'P0-A 1280 引导单屏 '+JSON.stringify(r));
  await q.click('[data-ob=add]');await q.waitForTimeout(300);t(/#\/new/.test(q.url())&&await q.locator('.ob').count()===0,'P0-A 1280 加第一条可用');
  await q.goto(B+'#/settings');await q.waitForTimeout(300);await q.$$eval('details.more-set',d=>d.forEach(x=>x.open=true));await q.click('#obAgain');await q.waitForTimeout(300);t(await q.locator('.ob1').count()===1,'P0-A 重新查看引导');
  await q.click('[data-ob=skip]');await q.waitForTimeout(300);t(await q.locator('.ob').count()===0,'P0-A 跳过');await c.close();}
 // P0-B 保存并再加一条只带分类
 {const [c,q]=await ctx();await q.goto(B+'#/');await q.evaluate(()=>localStorage.setItem('dq.settings.v1',JSON.stringify({onboarded:true,lastBackupAt:new Date().toISOString()})));
  await q.goto(B+'#/new');await q.reload();await q.waitForTimeout(300);await q.selectOption('[name=cat]','med');await q.fill('[name=name]','药A');await q.fill('#dueT','01.12.2026');
  await q.$eval('#more',e=>e.open=true);await q.click('[data-int=light]');await q.fill('[name=location]','药箱');await q.click('#saveMore');await q.waitForTimeout(400);
  t(await q.inputValue('[name=location]').catch(()=>'')==='','P0-B 位置不带');t(await q.inputValue('[name=cat]')==='med','P0-B 分类保留');
  await q.fill('[name=name]','药B');await q.fill('#dueT','02.12.2026');await q.click('#saveTop');await q.waitForTimeout(400);
  const b=(await IT(q)).find(i=>i.name==='药B');t(b&&b.intensitySource==='cat'&&!b.location,'P0-B 第二条强度跟随分类 '+JSON.stringify(b));await c.close();}
 // N9 新增页显示实际默认分类，保存即用它
 {const [c,q]=await ctx();await q.goto(B+'#/');await q.evaluate(()=>localStorage.setItem('dq.settings.v1',JSON.stringify({onboarded:true,lastBackupAt:new Date().toISOString()})));await q.goto(B+'#/new');await q.reload();await q.waitForTimeout(300);
  t(/食品 · 默认/.test(await q.textContent('.cat-field'))&&await q.locator('[data-cat].on').count()===0,'N9 显示「食品 · 默认」且全部行无高亮');
  await q.fill('[name=name]','xyzabc');await q.fill('#dueT','01.12.2026');await q.click('#saveTop');await q.waitForTimeout(400);t((await IT(q)).find(i=>i.name==='xyzabc')?.cat==='food','N9 保存为显示的默认分类');await c.close();}
 // P0-D 清空全部要二次确认
 {const [c,q]=await ctx();await q.goto(B+'?demo=1#/settings');await q.waitForTimeout(400);const n0=(await IT(q)).filter(i=>!i.deletedAt).length;
  await q.$$eval('details.more-set',d=>d.forEach(x=>x.open=true));await q.click('#clear');await q.waitForTimeout(300);t(await q.locator('#askOk').count()===1,'P0-D 弹出确认');
  await q.click('#askNo');await q.waitForTimeout(300);t((await IT(q)).filter(i=>!i.deletedAt).length===n0,'P0-D 取消不清空');
  await q.click('#clear');await q.waitForTimeout(300);await Promise.all([q.waitForEvent('download'),q.click('#askOk')]);await q.waitForTimeout(500);t((await IT(q)).filter(i=>!i.deletedAt).length===0,'P0-D 确认后清空');await c.close();}
 // P0-C 旧文案不得残留
 {const fs=require('fs');const src=fs.readFileSync('/workspace/到期提醒/app/js/app.js','utf8').replace(/\/\/.*$/gm,'');t(!/今日待处理|已处理|待处理|临期/.test(src),'P0-C 旧文案残留 '+(src.match(/.{10}(今日待处理|已处理|待处理|临期).{10}/)||[''])[0]);}

 // v1.6.2 R6
 {const [c,q]=await ctx();await q.goto(B+'?demo=1#/settings');await q.waitForTimeout(400);
  // R6-4 老用户 lastCat：显示「X · 默认」、全部行无高亮
  await q.evaluate(()=>{const s=JSON.parse(localStorage.getItem('dq.settings.v1'));s.lastCat='med';localStorage.setItem('dq.settings.v1',JSON.stringify(s));});await q.goto(B+'#/');await q.goto(B+'#/new');await q.reload();await q.waitForTimeout(300);
  t(/药品 · 默认/.test(await q.textContent('.cat-field'))&&await q.locator('[data-cat].on').count()===0&&!/上次使用/.test(await q.textContent('#view')),'R6-4 lastCat 显示「药品 · 默认」无高亮');
  // R6-5 保存再加一条后焦点在名称
  await q.fill('[name=name]','焦点A');await q.fill('#dueT','01.12.2026');await q.click('#saveMore');await q.waitForTimeout(400);t(await q.evaluate(()=>document.activeElement?.name)==='name','R6-5 焦点回到名称');
  // R6-1 导入覆盖确认（同 id）
  await q.goto(B+'#/settings');await q.waitForTimeout(300);const [d]=await Promise.all([q.waitForEvent('download'),q.click('#bkNow')]);await d.saveAs('/tmp/r6.json');
  await q.evaluate(()=>{const l=JSON.parse(localStorage.getItem('dq.items.v2'));l[0].name='改过的';localStorage.setItem('dq.items.v2',JSON.stringify(l));});await q.reload();await q.waitForTimeout(300);
  await q.setInputFiles('#imp','/tmp/r6.json');await q.waitForTimeout(400);await q.click('#impGo');await q.waitForTimeout(300);
  t(/将覆盖 \d+ 条/.test(await q.textContent('.sheet h3'))&&await q.locator('#askOk.danger').count()===1,'R6-1 导入覆盖确认 + 危险色');
  await q.click('#askNo');await q.waitForTimeout(200);t((await IT(q))[0].name==='改过的','R6-1 取消不覆盖');
  await q.click('#impGo');await q.waitForTimeout(200);await q.click('#askOk');await q.waitForTimeout(500);t((await IT(q))[0].name!=='改过的','R6-1 确认后覆盖');
  const t0=Date.now();await q.waitForSelector('.toast .undo');await q.waitForTimeout(7000);t(await q.locator('.toast .undo').count()===1,'R6-2 导入撤销 8 秒内仍在');
  await q.click('.toast .undo');await q.waitForTimeout(300);t((await IT(q))[0].name==='改过的','R6-2 导入可撤销');
  // R6-2 清空回收站：8 秒撤销 + 照片恢复
  await q.goto(B+'#/item/d3');await q.waitForTimeout(300);await q.setInputFiles('[data-addph]:not([capture])','/workspace/到期提醒/app/tests/fixtures-photo.jpg');await q.waitForTimeout(1500);
  await q.click('#del');await q.waitForTimeout(400);await q.goto(B+'#/trash');await q.waitForTimeout(300);await q.click('#empty');await q.waitForTimeout(200);t(await q.locator('#askOk').count()===1,'清空回收站确认');await q.click('#askOk');await q.waitForTimeout(7000);
  t(await q.locator('.toast .undo').count()===1,'R6-2 清空回收站撤销 8 秒内仍在');await q.click('.toast .undo');await q.waitForTimeout(500);
  await q.evaluate(()=>{const l=JSON.parse(localStorage.getItem('dq.items.v2'));const x=l.find(i=>i.id==='d3');x.deletedAt=null;localStorage.setItem('dq.items.v2',JSON.stringify(l));});
  await q.goto(B+'#/item/d3');await q.waitForTimeout(1200);t(await q.evaluate(()=>[...document.querySelectorAll('img[data-ph]')].some(i=>i.src&&!i.classList.contains('missing'))),'R6-2 撤销后照片还在');
  // v1.6.3 R7
  {const [c7,q7]=await ctx({reducedMotion:'reduce'});
   const HASH=(id)=>q7.evaluate(async id=>{const d=await new Promise(r=>{const o=indexedDB.open('dq-photos',1);o.onsuccess=()=>r(o.result);});const rec=await new Promise(r=>{const g=d.transaction('photos').objectStore('photos').get(id);g.onsuccess=()=>r(g.result);});d.close();if(!rec)return null;const b=await rec.blob.arrayBuffer();return [...new Uint8Array(await crypto.subtle.digest('SHA-256',b))].map(x=>x.toString(16).padStart(2,'0')).join('');},id);
   await q7.goto(B+'?demo=1#/');await q7.waitForTimeout(400);await q7.goto(B+'#/item/d3');await q7.waitForTimeout(300);await q7.setInputFiles('[data-addph]:not([capture])','/workspace/到期提醒/app/tests/fixtures-photo.jpg');await q7.waitForTimeout(1500);
   const pid=(await IT(q7)).find(i=>i.id==='d3').photos[0];const hB=await HASH(pid);
   await q7.goto(B+'#/settings');await q7.waitForTimeout(300);const [d7]=await Promise.all([q7.waitForEvent('download'),q7.click('#bkNow')]);await d7.saveAs('/tmp/r7.json');
   // 本机把同 id 照片换成另一份字节
   await q7.evaluate(async id=>{const d=await new Promise(r=>{const o=indexedDB.open('dq-photos',1);o.onsuccess=()=>r(o.result);});await new Promise(r=>{const tx=d.transaction('photos','readwrite');const st=tx.objectStore('photos');const g=st.get(id);g.onsuccess=()=>{const x=g.result;x.blob=new Blob([new Uint8Array([1,2,3,4,5])],{type:'image/jpeg'});st.put(x);};tx.oncomplete=r;});d.close();},pid);
   const hL=await HASH(pid);t(hL&&hL!==hB,'R7-1 准备：本机照片字节不同');
   await q7.reload();await q7.waitForTimeout(300);await q7.setInputFiles('#imp','/tmp/r7.json');await q7.waitForTimeout(400);await q7.click('#impGo');await q7.waitForTimeout(200);if(await q7.locator('#askOk').count())await q7.click('#askOk');
   await q7.waitForTimeout(1500);t(await HASH(pid)===hB,'R7-1 导入后照片为备份字节');
   await q7.click('.toast .undo');await q7.waitForTimeout(800);t(await HASH(pid)===hL,'R7-1 撤销后照片恢复为原字节');
   // R7-3 提示条无障碍
   await q7.goto(B+'#/item/d5');await q7.waitForTimeout(300);await q7.click('#del');await q7.waitForTimeout(300);
   t(await q7.getAttribute('.toast','role')==='status'&&await q7.getAttribute('.toast','aria-live')==='polite','R7-3 toast role=status aria-live=polite');
   t(await q7.evaluate(()=>document.activeElement?.classList.contains('undo')),'R7-3 删除后焦点直接在「撤销」');await q7.keyboard.press('Enter');await q7.waitForTimeout(300);t((await IT(q7)).find(i=>i.id==='d5')&&!(await IT(q7)).find(i=>i.id==='d5').deletedAt,'R7-3 Enter 即撤销');
   // R7-2 清空回收站 8 秒后照片真的删除
   await q7.goto(B+'#/item/d3');await q7.waitForTimeout(300);await q7.click('#del');await q7.waitForTimeout(300);await q7.goto(B+'#/trash');await q7.waitForTimeout(300);await q7.click('#empty');await q7.waitForTimeout(200);await q7.click('#askOk');
   await q7.waitForTimeout(3000);t(await HASH(pid)!==null,'R7-2 撤销窗口内照片还在');await q7.waitForTimeout(6000);t(await HASH(pid)===null,'R7-2 8 秒后照片已删除（不等重启）');
   await c7.close();}
  // R6 删除分类：应用内确认
  await q.goto(B+'#/catmgr');await q.waitForTimeout(200);await q.evaluate(()=>{const s=JSON.parse(localStorage.getItem('dq.settings.v1'));s.cats={...(s.cats||{}),custom:[{id:'c_x',name:'临时',icon:'box',color:'#D94545'}]};localStorage.setItem('dq.settings.v1',JSON.stringify(s));});await q.reload();await q.waitForTimeout(300);
  let nat=0;q.on('dialog',dg=>{nat++;dg.dismiss();});await q.click('.cm-row[data-k="c_x"]').catch(()=>q.click('text=临时'));await q.waitForTimeout(300);await q.click('#cDel');await q.waitForTimeout(300);
  t(nat===0&&await q.locator('#askOk').count()===1,'R6 删除分类用应用内确认');await q.click('#askOk');await q.waitForTimeout(300);t(!(await q.evaluate(()=>JSON.parse(localStorage.getItem('dq.settings.v1')).cats.custom.some(d=>d.id==='c_x'))),'删除分类执行');
  await c.close();}
 {const fs=require('fs');const src=fs.readFileSync('/workspace/到期提醒/app/js/app.js','utf8');t(!/\bconfirm\(/.test(src),'没有原生 confirm');t((src.match(/UNDO_MS/g)||[]).length>=2&&!/undo\?\(ms\|\|5000\)/.test(src),'撤销时长共用常量');}
 console.log(ok,'passed',bad,'failed');console.log('errors',errs);await br.close();})();
