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
 console.log(ok,'passed',bad,'failed');console.log('errors',errs);await br.close();})();
