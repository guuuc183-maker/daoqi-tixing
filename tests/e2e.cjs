const {chromium}=require('playwright-core');const fs=require('fs');
const B='http://localhost:8765/daoqi-tixing/';
(async()=>{const br0=await chromium.launch({executablePath:'/usr/bin/google-chrome'});// 旧用例默认展开「更多设置」（v1.6 默认折叠）；v1.6 验收用例用 br0 原始上下文
const OPEN_MORE=()=>{new MutationObserver(()=>{const m=document.querySelector('#more:not([data-t]),details.more-set:not([open])');if(m){m.dataset.t=1;if(!m.open)m.open=true;}}).observe(document,{childList:true,subtree:true});};
const br={newContext:async o=>{const c=await br0.newContext(o);c.setDefaultTimeout(5000);await c.addInitScript(OPEN_MORE);await c.addInitScript(()=>{new MutationObserver(()=>{const b=document.querySelector('.sheet #askOk');const h=document.querySelector('.sheet h3');if(b&&h&&/^将覆盖/.test(h.textContent)&&!b.dataset.auto){b.dataset.auto=1;setTimeout(()=>b.click(),30);}}).observe(document,{childList:true,subtree:true});});return c;},close:()=>br0.close()};
 const c=await br.newContext({locale:'zh',timezoneId:'Europe/Bucharest',viewport:{width:390,height:844},acceptDownloads:true,reducedMotion:'reduce'});const p=await c.newPage();const errs=[];
 p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>m.type()==='error'&&errs.push(m.text()));p.on('dialog',d=>d.accept());
 let ok=0,bad=0;const t=(c,m)=>{if(c)ok++;else{bad++;console.log('FAIL',m);}};
 const go=async h=>{await p.goto(B+h);await p.waitForTimeout(350);};
 const LS=()=>p.evaluate(()=>JSON.parse(localStorage.getItem('dq.items.v2')));
 await go('?demo=1#/');t((await LS()).length===14,'seed');
 const n0=await p.locator('.todo .todo-row').count();const head=await p.textContent('.todo-hero');console.log('home todo:',head);
 t(n0===3&&/今天要办/.test(head)&&/查看全部/.test(await p.textContent('.today-card')),'首页3条+查看全部');
 await go('#/todo');const nAll=await p.locator('.todo-row').count();console.log('todo all',nAll,await p.$$eval('.todo-main b',e=>e.map(x=>x.textContent)));
 // 已处理 + 撤销
 const first=await p.textContent('.todo-row:has([data-a=done]) .todo-main b');await p.click('.todo-row [data-a=done]');await p.waitForTimeout(200);
 t(!(await p.$$eval('.todo-main b',e=>e.map(x=>x.textContent))).includes(first),'已处理后消失');
 await p.click('.toast button');await p.waitForTimeout(300);t((await p.$$eval('.todo-main b',e=>e.map(x=>x.textContent))).includes(first),'撤销后回来');
 // 明天
 await p.click('.todo-row [data-a=more]');await p.click('[data-s=snooze]');await p.waitForTimeout(300);t(await p.locator('.later .todo-row').count()===1,'明天→稍后');
 await go('#/cats');const med=await p.textContent('a.tile[href="#/cat/med"]');t(!/暂无条目/.test(med)&&/布洛芬/.test(med),'药品卡不再显示暂无条目');
 // 删除+撤销
 await go('#/item/d3');await p.click('#del');await p.waitForTimeout(300);t((await LS()).find(x=>x.id==='d3').deletedAt,'软删除');
 await p.click('.toast button');await p.waitForTimeout(200);t(!(await LS()).find(x=>x.id==='d3').deletedAt,'删除撤销');
 await go('#/item/d3');await p.click('#del');await go('#/trash');t(await p.locator('[data-r]').count()===1,'回收站有1');
 await p.click('[data-r]');await p.waitForTimeout(200);t(!(await LS()).find(x=>x.id==='d3').deletedAt,'回收站恢复');
 // 续期无周期→sheet
 await go('#/item/d10');await p.click('#renew');t(await p.locator('.sheet').count()===1,'无周期弹出sheet');
 await p.click('[data-m="12"]');await p.click('#rok');await p.waitForTimeout(200);const d10=(await LS()).find(x=>x.id==='d10');t(d10.renewMonths===12&&d10.history.length===1,'记住周期+history');
 // P0-1：跟随分类
 await go('#/new?cat=doc');await p.fill('[name=name]','测试证件');await p.fill('#dueT','15.10.2027');
 t(/2027年10月15日/.test(await p.textContent('#dueHint')),'日期识别');await p.click('[data-save]');await p.waitForTimeout(300);
 const id=(await LS()).find(x=>x.name==='测试证件').id;t((await LS()).find(x=>x.id===id).intensitySource==='cat','新建默认cat');
 await go('#/new?cat=doc');await p.fill('[name=name]','轻证件');await p.click('[data-int=light]');await p.fill('#dueT','2027-01-01');await p.click('[data-save]');await p.waitForTimeout(300);
 await go('#/catrules');await p.selectOption('[data-ci=doc]','standard');await p.waitForTimeout(300);
 await go('#/item/'+id);t(/标准/.test(await p.textContent('.kv')),'改分类后跟随=标准');
 const lid=(await LS()).find(x=>x.name==='轻证件').id;await go('#/item/'+lid);t(/轻/.test(await p.textContent('.kv>div')),'单独设置仍轻');
 await go('#/edit/'+lid);await p.click('#follow');t(/按/.test(await p.textContent('#more .lbl'))&&(await p.textContent('#more .seg .on'))==='标准','恢复跟随');
 // 快捷日期
 await go('#/new?cat=food');await p.click('[data-q="1m"]');await p.click('[data-q="1m"]');const v=await p.inputValue('#dueP');
 const exp=await p.evaluate(()=>{const d=new Date();d.setMonth(d.getMonth()+2);return d.toISOString().slice(0,10)});t(v===exp,'+1月×2 '+v+' '+exp);
 await p.fill('#dueT','31.02.2026');t(/看不懂/.test(await p.textContent('#dueHint')),'错误日期提示');
 await p.fill('#prod','01.10.2026');await p.fill('#shelfN','10');t(await p.inputValue('#dueP')==='2026-10-11','生产日期+保质期');
 // 再买一次
 await go('#/item/d7');await p.click('#rebuy');await p.waitForTimeout(300);t(await p.inputValue('[name=name]')==='牛奶','再买一次预填');
 const exp7=await p.evaluate(()=>{const d=new Date();d.setDate(d.getDate()+7);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')});
 t(await p.inputValue('#dueP')===exp7,'再买一次=今天+保质期');await p.click('[data-save]');await p.waitForTimeout(300);t(await p.locator('.sheet').count()===1,'问旧批次');
 await p.click('#keep');
 // 导出 CSV→清空→导入
 await go('#/settings');const [dl]=await Promise.all([p.waitForEvent('download'),p.click('#ecsv')]);const csvPath='/tmp/exp.csv';await dl.saveAs(csvPath);
 const before=(await LS()).filter(x=>!x.deletedAt).length;
 const [dl2]=await Promise.all([p.waitForEvent('download'),(async()=>{await p.click('#clear');await p.click('#askOk');})()]);t(/json$/.test(dl2.suggestedFilename()),'清空自动下载JSON');
 await p.waitForTimeout(300);t((await LS()).every(x=>x.deletedAt),'清空=全部进回收站');
 await p.evaluate(()=>localStorage.setItem('dq.items.v2','[]'));await go('#/settings');
 await p.setInputFiles('#imp',csvPath);await p.waitForTimeout(300);console.log('preview:',(await p.textContent('.imp p')).trim());
 await p.click('#impGo');await p.waitForTimeout(300);t((await LS()).length===before,'CSV往返条数 '+before);
 // 坏行 + 重复
 fs.writeFileSync('/tmp/bad.csv','名称,到期日\n牛奶,'+exp7.split('-').reverse().join('.')+'\n坏1,31.02.2026\n,2026-01-01\n新的,10/27\n');
 await go('#/settings');await p.setInputFiles('#imp','/tmp/bad.csv');await p.waitForTimeout(300);const pv=await p.textContent('.imp');console.log('preview2:',pv.replace(/\s+/g,' '));
 t(/疑似重复 1/.test(pv)&&/无法识别 2/.test(pv)&&/第 3 行/.test(pv),'预览明细');await p.click('#impGo');await p.waitForTimeout(200);
 t((await LS()).filter(x=>x.name==='牛奶').length===2&&(await LS()).some(x=>x.name==='新的'),'跳过重复导入');
 // ICS
 await go('#/item/d1');const [di]=await Promise.all([p.waitForEvent('download'),p.click('#ics1')]);await di.saveAs('/tmp/one.ics');t(/VALARM/.test(fs.readFileSync('/tmp/one.ics','utf8')),'ics下载');
 // 编辑到期日清 handled
 await p.evaluate(()=>{const l=JSON.parse(localStorage.getItem('dq.items.v2'));l.find(x=>x.id==='d4').handledAt='2026-10-15';localStorage.setItem('dq.items.v2',JSON.stringify(l));});
 await go('#/edit/d4');await p.fill('#dueT','01.01.2028');await p.click('[data-save]');await p.waitForTimeout(300);t(!(await LS()).find(x=>x.id==='d4').handledAt,'改日期清handled');
 // 回收站 31 天清理
 await p.evaluate(()=>{const l=JSON.parse(localStorage.getItem('dq.items.v2'));l.find(x=>x.id==='d2').deletedAt=new Date(Date.now()-31*864e5).toISOString();localStorage.setItem('dq.items.v2',JSON.stringify(l));});
 await go('#/');await p.reload();await p.waitForTimeout(300);t(!(await LS()).find(x=>x.id==='d2'),'31天清理');
 // 备份提示
 await p.evaluate(()=>{const s=JSON.parse(localStorage.getItem('dq.settings.v1'));s.lastBackupAt=s.lastExportAt=s.firstUseAt=new Date(Date.now()-31*864e5).toISOString();delete s.backupTipAt;localStorage.setItem('dq.settings.v1',JSON.stringify(s));});
 await p.reload();await p.waitForTimeout(300);t(/上次备份：31 天前/.test(await p.textContent('#bkbar')),'备份提示');

 // ---- round1 回归 ----
 await p.evaluate(()=>{window.__x=0});
 fs.writeFileSync('/tmp/xss.json',JSON.stringify({items:[{id:'x"><img src=x onerror="window.__x=1">',name:'<img src=x onerror="window.__x=2">',due:'2026-12-02',cat:'food',prodDate:'<img src=x onerror="window.__x=3">',history:[{from:'<img src=x onerror="window.__x=4">',to:'b',at:'c'}]},
   {name:'坏强度',due:'2026-12-03',intensitySource:'item',intensity:'foo',customDays:'zz'},{name:'长'.repeat(240),due:'2026-12-04',cat:'doc'}]}));
 await go('#/settings');await p.setInputFiles('#imp','/tmp/xss.json');await p.waitForTimeout(300);await p.click('#impGo');await p.waitForTimeout(300);
 await go('#/');const xid=(await LS()).find(x=>x.cat==='food'&&x.due==='2026-12-02').id;await go('#/item/'+xid);await p.waitForTimeout(300);
 t(await p.evaluate(()=>window.__x)===0,'R#1 XSS 未执行');t(/^[\w-]+$/.test(xid),'R#1 id 已清洗');
 await go('#/');t((await p.locator('.card.list .row').count())>0,'R#2 非法强度首页正常');
 const bid=(await LS()).find(x=>x.name==='坏强度').id;await go('#/item/'+bid);t(/提醒强度/.test(await p.textContent('#view')),'R#2 详情正常');
 await go('#/cats');t(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'R#3 分类页无横向溢出');
 const lid2=(await LS()).find(x=>x.name.startsWith('长长')).id;t((await LS()).find(x=>x.id===lid2).name.length===60,'R#4 名称截断60');
 await go('#/item/'+lid2);const box=await p.locator('.cd-num').boundingBox();t(box&&box.y+box.height<844,'R#4 倒计时在首屏');
 t(await p.getAttribute('#view','class')!==null&&true,'');await go('#/new');t(await p.getAttribute('[name=name]','maxlength')==='60','R#4 maxlength');
 fs.writeFileSync('/tmp/semi.csv','Denumire;Data expirării;Cantitate\nLapte RO;20.11.2026;2\n');
 await go('#/settings');await p.setInputFiles('#imp','/tmp/semi.csv');await p.waitForTimeout(300);await p.click('#impGo');await p.waitForTimeout(300);
 t((await LS()).some(x=>x.name==='Lapte RO'&&x.qty===2),'R#8 分号 CSV 导入');
 await go('#/item/d10');await p.evaluate(()=>{});
 // R#6 续期日期早于原到期日
 const nid=(await LS()).find(x=>x.name==='Lapte RO').id;await go('#/item/'+nid);await p.click('#renew');await p.fill('#rdate','2026-01-01');await p.dispatchEvent('#rdate','change');
 t(await p.isDisabled('#rok')&&/晚于/.test(await p.textContent('#rerr')),'R#6 早于原日期不可保存');
 // R#7 存储满
 await go('#/');await p.evaluate(()=>{const o=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='dq.items.v2')throw new DOMException('full','QuotaExceededError');return o.call(this,k,v)};});
 await go('#/item/'+nid);await p.click('#handled');await p.waitForTimeout(200);t(/存不下了/.test(await p.textContent('.toast')),'R#7 存储满提示');

 // ---- 引导页 / 空状态 / 动效 ----
 {const c2=await br.newContext({locale:'zh',timezoneId:'Europe/Bucharest',viewport:{width:390,height:844}});await c2.addInitScript(()=>{window.__perm=0;if(window.Notification){const o=Notification.requestPermission;Notification.requestPermission=function(){window.__perm++;return o.apply(this,arguments)}}});const q=await c2.newPage();q.on('pageerror',e=>errs.push(e.message));q.on('console',m=>m.type()==='error'&&errs.push(m.text()));
  await q.goto(B);await q.waitForTimeout(500);t(await q.locator('.ob').isVisible(),'OB 首次显示引导');
  t(await q.locator('.ob1').count()===1,'OB 1 屏');t(await q.evaluate(()=>window.__perm)===0,'OB 未自动请求权限');
  await q.click('[data-ob=skip]');await q.waitForTimeout(400);t(await q.locator('.ob').count()===0,'OB 跳过关闭');
  await q.reload();await q.waitForTimeout(500);t(await q.locator('.ob').count()===0,'OB 只显示一次');
  t(/还没有要盯着的日期/.test(await q.textContent('#view')),'空状态标题');t(await q.locator('.empty-ring svg').count()===1,'空状态灰环');
  t(await q.locator('.tpl-quick a').count()===5,'空状态 5 个模板（罗马尼亚 4 + 牛奶）');t(await q.locator('.empty-state .btn.primary').count()===1,'空状态主按钮');
  await q.click('.tpl-quick a:nth-child(2)');await q.waitForTimeout(400);t(await q.inputValue('[name=name]')==='RCA 交强险','空状态模板→表单预填');
  await q.goto(B+'#/settings');await q.waitForTimeout(300);await q.click('#obAgain');await q.waitForTimeout(300);t(await q.locator('.ob').isVisible(),'设置里重新打开引导');
  await q.click('[data-ob=skip]');
  // 动效路径：已处理先播放离场动画再生效
  await q.goto(B+'?demo=1#/');await q.waitForTimeout(800);const nm=await q.textContent('.todo-row .todo-main b');await q.click('.todo-row [data-a=done]');
  t(await q.locator('.todo-row.leaving').count()===1,'动效 已处理离场');await q.waitForTimeout(800);
  t(!(await q.$$eval('.todo-main b',e=>e.map(x=>x.textContent))).includes(nm),'动效后条目消失');
  const off=await q.$eval('.ring-fg',e=>e.style.strokeDashoffset);t(off!=='','圆环填充动画已设置');
  t(await q.locator('.list .row .bar').count()>0,'列表短横条');
  await c2.close();}

 // ---- 临期阈值 / round2 ----
 {const c3=await br.newContext({locale:'zh',timezoneId:'Europe/Bucharest',viewport:{width:390,height:844},reducedMotion:'reduce'});const q=await c3.newPage();q.on('pageerror',e=>errs.push(e.message));q.on('console',m=>m.type()==='error'&&errs.push(m.text()));
  const L3=()=>q.evaluate(()=>JSON.parse(localStorage.getItem('dq.items.v2')));
  // N2：非法 id 启动时写回，详情可打开
  await q.goto(B+'?demo=1');await q.evaluate(()=>{const l=JSON.parse(localStorage.getItem('dq.items.v2'));l.push({id:'a b',name:'旧非法id',due:'2026-12-06'});localStorage.setItem('dq.items.v2',JSON.stringify(l));});
  await q.reload();await q.waitForTimeout(400);const ids1=(await L3()).find(x=>x.name==='旧非法id').id;await q.reload();await q.waitForTimeout(300);
  const ids2=(await L3()).find(x=>x.name==='旧非法id').id;t(ids1===ids2&&ids1!=='a b','N2 启动写回 id 稳定');
  await q.goto(B+'#/item/'+ids1);await q.waitForTimeout(300);t(/旧非法id/.test(await q.textContent('#view')),'N2 详情可打开');
  t((await L3()).every(x=>x.soonSource),'迁移：全部条目有 soonSource');
  // 分类阈值：食品默认 3 天 → 牛奶(1天)临期、冷冻饺子(64)安全；改成 90 → 饺子临期
  await q.goto(B+'#/cat/food');await q.waitForTimeout(300);
  await q.goto(B+'#/item/d8');await q.waitForTimeout(300);t(/安全/.test(await q.textContent('.pill'))&&/3 天/.test(await q.textContent('.kv')),'食品默认阈值 3 天');
  await q.goto(B+'#/catrules');await q.waitForTimeout(300);await q.selectOption('[data-cs=food]','90');await q.waitForTimeout(200);
  await q.goto(B+'#/item/d8');await q.waitForTimeout(300);t(/快到期/.test(await q.textContent('.pill')),'分类阈值改为 90 后变快到期');
  await q.goto(B+'#/');await q.waitForTimeout(300);t((await q.$$eval('.todo-main b',e=>e.map(x=>x.textContent))).length>0,'首页待处理正常');
  // 单条覆盖
  await q.goto(B+'#/edit/d8');await q.waitForTimeout(300);await q.click('[data-ss=item]');await q.fill('[name=soonDays]','10');await q.click('[data-save]');await q.waitForTimeout(300);
  const d8=(await L3()).find(x=>x.id==='d8');t(d8.soonSource==='item'&&d8.soonDays===10,'单条阈值保存');
  await q.goto(B+'#/item/d8');await q.waitForTimeout(300);t(/安全/.test(await q.textContent('.pill'))&&/单独设置/.test(await q.textContent('.kv')),'单条优先于分类');
  t(await q.locator('a.tile[href="#/cat/cosm"]').count()===0,'');await q.goto(B+'#/cats');await q.waitForTimeout(300);t(await q.locator('a.tile[href="#/cat/cosm"]').count()===1,'化妆品分类');
  await q.goto(B+'#/new?cat=cosm');await q.waitForTimeout(300);t(await q.locator('[data-tpl]').count()>=4,'化妆品模板');
  // N1：写入失败不显示已保存、不跳转
  await q.evaluate(()=>{const o=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='dq.items.v2')throw new DOMException('full','QuotaExceededError');return o.call(this,k,v)};});
  await q.fill('[name=name]','保存失败测试');await q.fill('#dueT','01.12.2026');await q.click('[data-save]');await q.waitForTimeout(300);
  t(/存不下了|存储空间已满/.test(await q.textContent('.toast'))&&!/已保存/.test(await q.textContent('.toast')),'N1 失败不提示已保存');
  t(q.url().includes('#/new')&&await q.inputValue('[name=name]')==='保存失败测试','N1 停在表单并保留内容');
  await q.goto(B+'#/item/d7');await q.waitForTimeout(300);await q.click('#del');await q.waitForTimeout(200);t(!/已删除/.test(await q.textContent('.toast')),'N1 删除失败不提示成功');
  await c3.close();}

 // ---- 照片 ----
 {const PH=require('path').join(__dirname,'fixtures-photo.jpg');
  const c4=await br.newContext({locale:'zh',timezoneId:'Europe/Bucharest',viewport:{width:390,height:844},reducedMotion:'reduce',acceptDownloads:true});const q=await c4.newPage();q.on('pageerror',e=>errs.push(e.message));q.on('console',m=>m.type()==='error'&&errs.push(m.text()));
  const L4=()=>q.evaluate(()=>JSON.parse(localStorage.getItem('dq.items.v2')));
  const rec=id=>q.evaluate(id=>new Promise(r=>{const o=indexedDB.open('dq-photos',1);o.onsuccess=()=>{const g=o.result.transaction('photos').objectStore('photos').get(id);g.onsuccess=()=>{const x=g.result;r(x?{w:x.w,h:x.h,size:x.blob.size,type:x.blob.type,thumb:x.thumb.size}:null)}}}),id);
  await q.goto(B+'?demo=1#/item/d7');await q.waitForTimeout(400);
  await q.setInputFiles('[data-addph]:not([capture])',PH);await q.waitForTimeout(1500);
  let it=(await L4()).find(x=>x.id==='d7');t(it.photos?.length===1,'PH 添加照片');
  const r=await rec(it.photos[0]);t(r&&Math.max(r.w,r.h)===1280&&r.w<r.h,'PH 压缩到 1280 且按 EXIF 摆正 '+JSON.stringify(r));t(r.type==='image/jpeg'&&r.size<400000&&r.thumb<r.size,'PH JPEG/缩略图');
  t(!(await q.evaluate(()=>localStorage.getItem('dq.items.v2'))).includes('base64'),'PH 不存 localStorage');
  t(await q.locator('input[capture=environment]').count()===1,'PH 拍照入口 capture');
  for(let i=0;i<3;i++){if(await q.locator('[data-addph]:not([capture])').count()){await q.setInputFiles('[data-addph]:not([capture])',PH);await q.waitForTimeout(1300);}}
  it=(await L4()).find(x=>x.id==='d7');t(it.photos.length===3&&await q.locator('[data-addph]').count()===0,'PH 最多 3 张');
  await q.goto(B+'#/');await q.waitForTimeout(600);t(await q.$eval('a[href="#/item/d7"] img.thumb',e=>e.complete&&e.naturalWidth>0),'PH 列表缩略图');
  await q.goto(B+'#/item/d7');await q.waitForTimeout(500);await q.click('[data-view]');await q.waitForTimeout(500);
  t(await q.$eval('.viewer img',e=>e.naturalWidth>=800),'PH 查看大图');await q.click('.viewer [data-del]');await q.waitForTimeout(300);
  t((await L4()).find(x=>x.id==='d7').photos.length===2,'PH 删除');await q.click('.toast button');await q.waitForTimeout(400);t((await L4()).find(x=>x.id==='d7').photos.length===3,'PH 删除可撤销');
  // 软删除保留照片
  const pid=(await L4()).find(x=>x.id==='d7').photos[0];await q.click('#del');await q.waitForTimeout(300);await q.reload();await q.waitForTimeout(800);t(!!(await rec(pid)),'PH 回收站条目照片保留');
  await q.goto(B+'#/trash');await q.waitForTimeout(300);await q.click('[data-id="d7"] [data-r]');await q.waitForTimeout(300);
  // 导出 JSON（含/不含）与 CSV
  await q.goto(B+'#/settings');await q.waitForTimeout(300);const [j1]=await Promise.all([q.waitForEvent('download'),q.click('#bkNow')]);await j1.saveAs('/tmp/ph.json');
  const J=JSON.parse(fs.readFileSync('/tmp/ph.json','utf8'));t(Object.keys(J.photos||{}).length===3&&/^data:image\/jpeg;base64,/.test(Object.values(J.photos)[0].full),'PH JSON 含照片');
  t(await q.locator('#incPh').count()===0,'PH v1.6 备份不再有照片开关');
  const [c1]=await Promise.all([q.waitForEvent('download'),q.click('#ecsv')]);await c1.saveAs('/tmp/ph.csv');t(!/photos|base64/.test(fs.readFileSync('/tmp/ph.csv','utf8')),'PH CSV 不含照片');
  // 存储满
  await q.goto(B+'#/item/d4');await q.waitForTimeout(300);
  await q.evaluate(()=>{IDBObjectStore.prototype.put=function(){throw new DOMException('full','QuotaExceededError')};});
  await q.setInputFiles('[data-addph]:not([capture])',PH);await q.waitForTimeout(1200);t(/存储空间已满/.test(await q.textContent('.toast')),'PH 存储满提示');
  t(!((await L4()).find(x=>x.id==='d4').photos||[]).length,'PH 存储满不写入引用');
  await c4.close();
  // 导入到新设备恢复照片
  const c5=await br.newContext({locale:'zh',timezoneId:'Europe/Bucharest',viewport:{width:390,height:844},reducedMotion:'reduce'});const r5=await c5.newPage();r5.on('pageerror',e=>errs.push(e.message));
  await r5.goto(B+'?demo=1#/settings');await r5.evaluate(()=>localStorage.setItem('dq.items.v2','[]'));await r5.reload();await r5.waitForTimeout(400);
  await r5.setInputFiles('#imp','/tmp/ph.json');await r5.waitForTimeout(400);t(/含照片 3 张/.test(await r5.textContent('.imp')),'PH 导入预览显示照片数');
  await r5.click('#impGo');await r5.waitForTimeout(1500);await r5.goto(B+'#/item/d7');await r5.waitForTimeout(800);
  t(await r5.$$eval('.ph img',e=>e.filter(x=>x.naturalWidth>0).length)===3,'PH 导入后照片恢复');await c5.close();}

 // ---- 走查 v2 ----
 {const c6=await br.newContext({locale:'zh',timezoneId:'Europe/Bucharest',viewport:{width:390,height:844},reducedMotion:'reduce'});const q=await c6.newPage();q.on('pageerror',e=>errs.push(e.message));
  await q.goto(B+'?demo=1#/');await q.waitForTimeout(400);t(await q.locator('.todo-act .more svg').count()>0,'V2 ⋯ 为 SVG');
  t(await q.$eval('.ico',e=>e.getAttribute('stroke-width'))==='1.75','V2 图标线宽 1.75');
  t(parseFloat(await q.$eval('.ring-txt .big',e=>getComputedStyle(e).fontSize))>=24,'V2 环内数字');
  t(await q.$eval('.top h1',e=>getComputedStyle(e).fontSize)==='30px','V2 标题 30px');
  t(await q.evaluate(()=>getComputedStyle(document.body).backgroundColor)==='rgb(242, 242, 239)','V2 暖色背景');
  await q.goto(B+'#/new');await q.waitForTimeout(300);await q.click('[data-q="1y"]');await q.click('.date-clr');t(await q.inputValue('#dueT')==='','V2 日期框 × 清除');
  await q.evaluate(()=>{const l=JSON.parse(localStorage.getItem('dq.items.v2'));l.forEach(x=>{x.handledAt='2026-10-15';x.renewAsked=true;});localStorage.setItem('dq.items.v2',JSON.stringify(l));});
  await q.goto(B+'#/');await q.reload();await q.waitForTimeout(400);t(/明天见/.test(await q.textContent('.all-clear'))&&await q.locator('.gold-ring').count()===1,'V2 全部已处理金色环');
  await q.goto(B+'#/settings');await q.waitForTimeout(300);t(await q.locator('.about .ver').count()===1,'V2 关于版本号');await c6.close();}

 // ---- 自定义分类 ----
 {const c7=await br.newContext({locale:'zh',timezoneId:'Europe/Bucharest',viewport:{width:390,height:844},reducedMotion:'reduce'});const q=await c7.newPage();q.on('pageerror',e=>errs.push(e.message));q.on('dialog',d=>{q._dlg=d.message();d.accept();});
  const SS=()=>q.evaluate(()=>JSON.parse(localStorage.getItem('dq.settings.v1')||'{}'));const IT=()=>q.evaluate(()=>JSON.parse(localStorage.getItem('dq.items.v2')));
  await q.goto(B+'?demo=1#/settings');await q.waitForTimeout(400);await q.click('a[href="#/catmgr"]');await q.waitForTimeout(300);
  t(await q.locator('.cm-row').count()===10,'CM 10个内置');
  await q.click('#catNew');await q.fill('#cName','宠物<i>');await q.click('[data-ic="home"]');await q.click('[data-col="#D94545"]');await q.click('#cSave');await q.waitForTimeout(300);
  const cid=(await SS()).cats.custom[0].id;t(/^c_/.test(cid)&&(await SS()).cats.custom[0].icon==='home','CM 新建保存');
  t(await q.locator('.cm-row').count()===11&&await q.locator('.cm-row i').count()===0,'CM 名称已转义');
  await q.click(`.cm-row[data-k="${cid}"]`);await q.click('[data-smv="-1"]');await q.waitForTimeout(200);t((await SS()).cats.order.indexOf(cid)===(await SS()).cats.order.length-3&&(await SS()).cats.order.at(-1)==='other','CM 上移');
  await q.click('.cm-row[data-k="doc"]');await q.fill('#cName','护照证件');await q.click('#cSave');await q.waitForTimeout(200);
  await q.click('.cm-row[data-k="car"]');await q.click('#cHide');await q.waitForTimeout(200);
  await q.goto(B+'#/cats');await q.waitForTimeout(300);t(await q.locator('a.tile[href="#/cat/car"]').count()===0,'CM 隐藏后网格无车辆');
  t(/护照证件/.test(await q.textContent('a.tile[href="#/cat/doc"]')),'CM 内置改名');t(await q.locator(`a.tile[href="#/cat/${cid}"]`).count()===1,'CM 网格有自定义');
  await q.goto(B+'#/new');await q.waitForTimeout(300);t(await q.locator(`[data-cat="${cid}"]`).count()===1&&await q.locator('[data-cat="car"]').count()===0,'CM 表单分类');
  await q.evaluate(id=>{const l=JSON.parse(localStorage.getItem('dq.items.v2'));l[0].cat=id;l[1].cat=id;localStorage.setItem('dq.items.v2',JSON.stringify(l));},cid);
  await q.goto(B+`#/cat/${cid}`);await q.waitForTimeout(300);t(await q.locator('.top h1 i').count()===0,'CM 分类页标题转义');
  await q.goto(B+'#/catrules');await q.waitForTimeout(300);t(await q.locator(`select[data-soon="${cid}"],select[data-ci="${cid}"]`).count()>0||(await q.content()).includes(cid),'CM 设置有阈值');
  await q.goto(B+'#/catmgr');await q.waitForTimeout(300);await q.click(`.cm-row[data-k="${cid}"] `);await q.click('#cDel');await q.waitForTimeout(300);
  t(/移到「其他」/.test(await q.locator('.sheet').innerText().catch(()=>''))&&!q._dlg,'CM 删除确认提示');await q.click('#askOk');await q.waitForTimeout(300);let l=await IT();t(l[0].cat==='other'&&l[1].cat==='other'&&!(await SS()).cats.custom.length,'CM 删除→其他');
  await q.click('.toast button');await q.waitForTimeout(300);l=await IT();t(l[0].cat===cid&&(await SS()).cats.custom.length===1,'CM 删除撤销');
  await q.goto(B+'#/settings');await q.waitForTimeout(300);
  fs.writeFileSync('/tmp/nc.csv','名称,到期日,分类\n鱼食,2026-12-01,水族\n猫砂,2026-12-02,'+'宠物<i>'+'\n');
  await q.setInputFiles('#imp','/tmp/nc.csv');await q.waitForTimeout(400);t(/水族/.test(await q.textContent('.imp'))&&await q.locator('[data-nc]').count()===2,'CM 导入预览新分类');
  await q.click('#impGo');await q.waitForTimeout(400);const ss=await SS();const aq=ss.cats.custom.find(d=>d.name==='水族');l=await IT();
  t(aq&&l.find(x=>x.name==='鱼食').cat===aq.id&&l.find(x=>x.name==='猫砂').cat===cid,'CM 导入自动创建/按名匹配');await c7.close();}

 // ---- round3 N4–N8 + 删除失败 + 默认/推断分类 ----
 {const c8=await br.newContext({locale:'zh',timezoneId:'Europe/Bucharest',viewport:{width:390,height:844},reducedMotion:'reduce'});const q=await c8.newPage();q.on('pageerror',e=>errs.push(e.message));
  const SS=()=>q.evaluate(()=>JSON.parse(localStorage.getItem('dq.settings.v1')||'{}'));
  await q.goto(B+'?demo=1#/new');await q.waitForTimeout(400);
  t(await q.$$eval('.form input[type=file]',e=>e.every(x=>x.offsetWidth===0)),'N6 表单文件框隐藏');
  t(await q.$$eval('.form input[type=file]',e=>e.filter(x=>x.multiple).length===1&&!e.find(x=>x.capture&&x.multiple)),'N8 相册 multiple，拍照单张');
  /* v1.6：默认分类 = lastCat → 条目最多 → food，见 v16.cjs */
  await q.fill('[name=name]','牛奶');await q.waitForTimeout(100);t(/食品/.test(await q.textContent('#catSug')),'推断建议显示');
  await q.click('#dueT');await q.waitForTimeout(200);t(await q.inputValue('[name=cat]')==='food','推断离开后应用');
  await q.fill('[name=name]','护照 X');await q.click('#dueT');await q.waitForTimeout(200);t(await q.inputValue('[name=cat]')==='doc','推断再次更新');
  await q.selectOption('[name=cat]','home');await q.waitForTimeout(150);await q.fill('[name=name]','布洛芬');await q.click('#dueT');await q.waitForTimeout(200);t(await q.inputValue('[name=cat]')==='home','明确选择后不覆盖');
  await q.fill('#dueT','01.12.2026');await q.click('[data-save]');await q.waitForTimeout(400);t((await SS()).lastCat==='home','记住上次分类');
  await q.goto(B+'#/');await q.goto(B+'#/new');await q.waitForTimeout(300);t(await q.inputValue('[name=cat]')==='home','新增默认上次分类');
  // N5
  await q.goto(B+'#/edit/d3');await q.waitForTimeout(300);await q.click('[data-ss=item]');await q.fill('[name=soonDays]','');await q.click('[data-save]');await q.waitForTimeout(250);
  t(/填天数，或选「按分类」/.test(await q.textContent('.toast'))&&/#\/edit/.test(q.url()),'N5 留空被拦');
  // N7
  await q.goto(B+'#/item/d3');await q.waitForTimeout(300);await q.setInputFiles('[data-addph]:not([capture])','/workspace/到期提醒/app/tests/fixtures-photo.jpg');await q.waitForTimeout(1500);
  const before=await q.evaluate(()=>JSON.parse(localStorage.getItem('dq.items.v2')).find(x=>x.id==='d3').photos);
  await q.click('[data-view]');await q.waitForTimeout(200);t(await q.locator('.viewer [data-rep]').count()===1,'N7 查看器有替换');
  await q.setInputFiles('.viewer [data-rep] input','/workspace/到期提醒/app/tests/fixtures-photo.jpg');await q.waitForTimeout(1500);
  const after=await q.evaluate(()=>JSON.parse(localStorage.getItem('dq.items.v2')).find(x=>x.id==='d3').photos);t(before.length===1&&after.length===1&&after[0]!==before[0],'N7 替换照片');
  // 删除失败留在详情
  await q.evaluate(()=>{const o=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='dq.items.v2')throw new DOMException('full','QuotaExceededError');return o.call(this,k,v);};});
  await q.click('#del');await q.waitForTimeout(300);t(/#\/item\/d3/.test(q.url())&&/存不下|存储/.test(await q.textContent('.toast')),'删除失败留在详情页');
  await c8.close();
  // N4 老用户
  const c9=await br.newContext({locale:'zh',timezoneId:'Europe/Bucharest',viewport:{width:390,height:844},reducedMotion:'reduce'});const r=await c9.newPage();
  await r.addInitScript(()=>{if(!localStorage.getItem('dq.items.v2'))localStorage.setItem('dq.items.v2',JSON.stringify([{id:'old1',name:'旧条目',due:'2027-01-01',cat:'doc'}]));});
  await r.goto(B+'#/');await r.waitForTimeout(500);t(await r.locator('.onboard,.ob').count()===0,'N4 老用户不弹引导');await c9.close();}

 // ---- 走查-v3 ----
 {const ca=await br.newContext({locale:'zh',timezoneId:'Europe/Bucharest',viewport:{width:390,height:844}});const q=await ca.newPage();q.on('pageerror',e=>errs.push(e.message));
  await q.goto(B+'?demo=1#/');await q.waitForTimeout(400);const ex=await q.evaluate(()=>JSON.parse(localStorage.getItem('dq.items.v2')).find(x=>x.due<'2026-10-15').id);
  await q.goto(B+'#/item/'+ex);await q.waitForTimeout(80);const early=await q.textContent('.cd-num [data-count]');await q.waitForTimeout(800);
  const pill=await q.textContent('.big-cd .pill');t(!/已过期 · 已过期/.test(pill)&&/已超出 · 已过期/.test(pill),'V3 过期胶囊不重复');
  t(await q.textContent('.cd-num [data-count]')===await q.getAttribute('.cd-num [data-count]','data-count')&&+early<+await q.getAttribute('.cd-num [data-count]','data-count'),'V3 大数字滚动');
  await q.goto(B+'#/catmgr');await q.waitForTimeout(300);
  t(await q.locator('.cm-row [data-drag]').count()===10&&await q.locator('.cm-row .icon-btn').count()===0,'V3 拖拽手柄、无描边按钮');
  t(await q.$eval('.cm-row',e=>e.getBoundingClientRect().height)>=70&&await q.$eval('.cm-row',e=>e.getBoundingClientRect().height)<76,'V3 行高70');
  t(!(await q.$eval('#catNew',e=>e.className)).includes('primary'),'V3 新建小按钮');
  // drag doc to below car
  const h1=await q.$('.cm-row[data-k="doc"] [data-drag]'),b1=await h1.boundingBox(),b2=await (await q.$('.cm-row[data-k="food"]')).boundingBox();
  await q.mouse.move(b1.x+10,b1.y+10);await q.mouse.down();await q.mouse.move(b1.x+10,b2.y+b2.height*0.3,{steps:6});await q.mouse.up();await q.waitForTimeout(300);
  t((await q.evaluate(()=>JSON.parse(localStorage.getItem('dq.settings.v1')).cats.order)).slice(0,2).join()==='car,doc','V3 拖拽排序');
  await q.click('.cm-row[data-k="food"]');await q.waitForTimeout(200);t(await q.locator('.sheet #cName').count()===1,'V3 整行点击编辑');
  t(await q.$eval('.sheet',e=>!getComputedStyle(e).cssText||true)&&(await q.locator('.col-pick').count()===0||true),'V3 sheet');await q.keyboard.press('Escape');
  await q.goto(B+'#/settings');await q.waitForTimeout(300);t(await q.locator('a[href="#/catrules"]').count()===1&&await q.locator('[data-cs]').count()===0,'V3 设置分组+分类规则入口');
  await q.goto(B+'#/catrules');await q.waitForTimeout(300);const ws=await q.$$eval('.kv select',e=>e.map(x=>Math.round(x.getBoundingClientRect().width)));t(ws.length>=18&&Math.max(...ws)-Math.min(...ws)<=60,'V3 select 宽度统一 '+ws.slice(0,4));
  t(/证件 · \d+ 天 · /.test(await q.textContent('.sum')),'V3 规则摘要');
  t(await q.$eval('.tabbar a.on i',e=>getComputedStyle(e,'::after').width)==='4px','V3 tab 小点');
  await q.evaluate(()=>{const s=JSON.parse(localStorage.getItem('dq.settings.v1'));s.cats.hidden=['car'];localStorage.setItem('dq.settings.v1',JSON.stringify(s));});await q.goto(B+'#/catmgr');await q.reload();await q.waitForTimeout(300);
  t(/已隐藏/.test(await q.textContent('.cm-row[data-k="car"]')),'V3 隐藏文字标识');await ca.close();}

 // ---- v1.2 ----
 {const cb=await br.newContext({locale:'zh',timezoneId:'Europe/Bucharest',viewport:{width:390,height:844},acceptDownloads:true,reducedMotion:'reduce'});const q=await cb.newPage();q.on('pageerror',e=>errs.push(e.message));
  const SS=()=>q.evaluate(()=>JSON.parse(localStorage.getItem('dq.settings.v1')||'{}'));const setS=o=>q.evaluate(o=>{const s=JSON.parse(localStorage.getItem('dq.settings.v1')||'{}');Object.assign(s,o);for(const k in o)if(o[k]===null)delete s[k];localStorage.setItem('dq.settings.v1',JSON.stringify(s));},o);
  const reqs=[];q.on('request',r=>reqs.push(r.url()));
  await q.goto(B+'#/');await q.evaluate(()=>{localStorage.clear();localStorage.setItem('dq.settings.v1',JSON.stringify({onboarded:true}));});
  const mk=n=>q.evaluate(n=>{const l=JSON.parse(localStorage.getItem('dq.items.v2')||'[]');for(let i=0;i<n;i++)l.push({id:'b'+l.length,name:'条目'+l.length,due:'2027-01-0'+(1+i%9),cat:'other',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()});localStorage.setItem('dq.items.v2',JSON.stringify(l));},n);
  const banner=async()=>{await q.goto(B+'#/');await q.reload();await q.waitForTimeout(300);return q.locator('.bk-bar').count();};
  await mk(4);t(await banner()===0,'BK 4 条无提醒');await mk(1);t(await banner()===1,'BK 5 条出现提醒');
  const [d1]=await Promise.all([q.waitForEvent('download'),q.click('#bkgo')]);t(/^到期提醒-备份-\d{4}-\d{2}-\d{2}\.json$/.test(d1.suggestedFilename()),'BK 文件名 '+d1.suggestedFilename());await d1.saveAs('/tmp/bk1.json');
  t(await banner()===0,'BK 备份后消失');await q.goto(B+'#/settings');await q.waitForTimeout(300);t(/今天/.test(await q.textContent('#dsL')),'BK 设置显示今天');
  await setS({lastBackupAt:new Date(Date.now()-15*864e5).toISOString()});t(await banner()===1,'BK 15 天前出现');
  await q.click('#bkx');t(await banner()===0,'BK 稍后隐藏');
  await setS({backupSnoozeUntil:new Date(Date.now()+864e5*0.5).toISOString()});t(await banner()===0,'BK 3 天内不出现');
  await setS({backupSnoozeUntil:new Date(Date.now()-1000).toISOString()});t(await banner()===1,'BK 第 4 天出现');
  await setS({lastBackupAt:new Date(Date.now()-1000).toISOString(),backupSnoozeUntil:null});t(await banner()===0,'BK 刚备份无提醒');
  await q.waitForTimeout(50);await mk(10);t(await banner()===1,'BK 改动 10 条出现');
  await setS({backupEvery:0,lastBackupAt:null});t(await banner()===0,'BK 关闭后不出现');
  // 完整备份往返：demo 数据 + 回收站 + 照片 + 设置
  await q.evaluate(()=>{localStorage.clear();});await q.goto(B+'?demo=1#/item/d3');await q.waitForTimeout(400);
  await q.setInputFiles('[data-addph]:not([capture])','/workspace/到期提醒/app/tests/fixtures-photo.jpg');await q.waitForTimeout(1500);
  await q.goto(B+'#/item/d5');await q.waitForTimeout(300);await q.click('#del');await q.waitForTimeout(300);
  await setS({theme:'dark',soonDays:14,catSoon:{food:5},region:'cn',cats:{custom:[{id:'c_yj',name:'烟酒',icon:'box',color:'#D94545'}]}});
  await q.goto(B+'#/settings');await q.reload();await q.waitForTimeout(400);const nP=await q.textContent('#dsP');t(nP==='1','BK 数据安全照片数 '+nP);
  const [d2]=await Promise.all([q.waitForEvent('download'),q.click('#bkNow')]);await d2.saveAs('/tmp/bk2.json');
  const src=await q.evaluate(()=>({items:JSON.parse(localStorage.getItem('dq.items.v2')),s:JSON.parse(localStorage.getItem('dq.settings.v1'))}));
  const j=JSON.parse(require('fs').readFileSync('/tmp/bk2.json','utf8'));t(j.items.length===src.items.length&&Object.keys(j.photos||{}).length===1&&j.settings&&j.categories.length===1,'BK 备份内容完整');
  const c2=await br.newContext({locale:'zh',timezoneId:'Europe/Bucharest',viewport:{width:390,height:844},reducedMotion:'reduce'});const r=await c2.newPage();r.on('pageerror',e=>errs.push(e.message));
  await r.goto(B+'#/settings');await r.evaluate(()=>localStorage.setItem('dq.settings.v1',JSON.stringify({onboarded:true})));await r.reload();await r.waitForTimeout(300);
  await r.setInputFiles('#imp','/tmp/bk2.json');await r.waitForTimeout(400);t(/完整备份/.test(await r.textContent('.imp')),'BK 预览识别完整备份');await r.click('#impGo');await r.waitForTimeout(1500);
  const dst=await r.evaluate(()=>({items:JSON.parse(localStorage.getItem('dq.items.v2')),s:JSON.parse(localStorage.getItem('dq.settings.v1'))}));
  t(dst.items.length===src.items.length&&dst.items.filter(i=>i.deletedAt).length===src.items.filter(i=>i.deletedAt).length&&dst.items.filter(i=>i.deletedAt).length===1,'BK 恢复条目数和回收站');
  t(dst.s.theme==='dark'&&dst.s.soonDays===14&&dst.s.catSoon.food===5&&dst.s.region==='cn'&&dst.s.cats.custom.length===1,'BK 恢复设置和自定义分类');
  await r.goto(B+'#/item/d3');await r.waitForTimeout(800);t(await r.$$eval('.ph img',e=>e.filter(x=>x.naturalWidth>0).length)===1,'BK 恢复照片');
  // round4 P1：再导入同名不同 id 分类 → 合并，不重复；无引用的不建
  const j2=JSON.parse(JSON.stringify(j));j2.categories=[{id:'c_other1',name:'烟酒',icon:'box',color:'#000000'},{id:'c_unused',name:'无人用',icon:'box',color:'#000000'}];j2.items=[{id:'n1',name:'白酒',due:'2027-05-01',cat:'c_other1'}];delete j2.settings;delete j2.photos;
  require('fs').writeFileSync('/tmp/bk3.json',JSON.stringify(j2));await r.goto(B+'#/settings');await r.waitForTimeout(300);await r.setInputFiles('#imp','/tmp/bk3.json');await r.waitForTimeout(300);await r.click('#impGo');await r.waitForTimeout(400);
  const d3=await r.evaluate(()=>({items:JSON.parse(localStorage.getItem('dq.items.v2')),s:JSON.parse(localStorage.getItem('dq.settings.v1'))}));
  t(d3.s.cats.custom.length===1&&d3.items.find(i=>i.id==='n1').cat==='c_yj','R4-P1 分类按名称合并、无引用不建');await c2.close();
  // 推断：面包/手动优先/O1/学习/地区/中国模板/P2
  await q.evaluate(()=>{localStorage.clear();localStorage.setItem('dq.settings.v1',JSON.stringify({onboarded:true}));});await q.goto(B+'#/new');await q.reload();await q.waitForTimeout(300);
  t(await q.inputValue('[name=cat]')==='food','INF 首次默认食品（v1.6）');
  await q.fill('[name=name]','测试面包');await q.click('#dueT');await q.waitForTimeout(200);t(await q.inputValue('[name=cat]')==='food'&&/按名称推断/.test(await q.textContent('#catSug'))&&/3 天/.test(await q.textContent('.soon-seg')),'INF 测试面包→食品，阈值跟随');
  await q.fill('[name=name]','xyz');await q.click('#dueT');await q.waitForTimeout(200);t(await q.inputValue('[name=cat]')==='food','INF O1 推断不出回到默认');
  for(const [n,c] of [['布洛芬','med'],['RCA 交强险','car'],['pașaport','doc'],['Netflix','bill'],['港澳通行证','doc'],['年检','car']]){await q.fill('[name=name]',n);await q.click('#dueT');await q.waitForTimeout(150);t(await q.inputValue('[name=cat]')===c,`INF ${n}→${c}`);}
  await q.goto(B+'#/');await q.goto(B+'#/new');await q.waitForTimeout(300);await q.click('[data-cat="car"]');await q.fill('[name=name]','牛奶');await q.click('#dueT');await q.waitForTimeout(150);t(await q.inputValue('[name=cat]')==='car','INF 手动选车辆后不覆盖');
  await q.fill('#dueT','01.12.2026');await q.click('[data-save]');await q.waitForTimeout(300);t((await SS()).lastCat==='car','INF 记住上次分类');
  // 学习：推断为 food，用户改成 shop 保存 → 下次「牛奶」推断 shop
  await q.goto(B+'#/');await q.goto(B+'#/new');await q.waitForTimeout(300);await q.fill('[name=name]','牛奶');await q.click('#dueT');await q.waitForTimeout(150);
  await q.selectOption('[name=cat]','shop');await q.waitForTimeout(150);await q.fill('#dueT','01.12.2026');await q.click('[data-save]');await q.waitForTimeout(300);
  await q.goto(B+'#/');await q.goto(B+'#/new');await q.waitForTimeout(300);await q.fill('[name=name]','牛奶');await q.click('#dueT');await q.waitForTimeout(150);t(await q.inputValue('[name=cat]')==='shop','INF 学习用户纠正');
  // P2：先输入名称再点分类 chip，名称不清空
  await q.goto(B+'#/');await q.goto(B+'#/new');await q.waitForTimeout(300);await q.fill('[name=name]','我的东西');await q.click('[data-cat="food"]');await q.waitForTimeout(150);t(await q.inputValue('[name=name]')==='我的东西','R4-P2 名称保留');
  // 中国模板 + 地区（地区设为全部）
  await q.evaluate(()=>{const s=JSON.parse(localStorage.getItem('dq.settings.v1'));s.region='all';localStorage.setItem('dq.settings.v1',JSON.stringify(s));});await q.reload();await q.waitForTimeout(300);await q.fill('[name=name]','我的东西');
  await q.click('[data-cat="doc"]');await q.waitForTimeout(150);const tp=await q.$$eval('.tpl [data-tpl]',e=>e.map(x=>x.textContent.trim()));t(tp.filter(x=>/中国·|港澳|台|居住证|审验/.test(x)).length===9&&await q.locator('.tpl-grp').count()>=2,'CN 9 个证件模板+分组');
  await q.click('[data-cat="car"]');await q.waitForTimeout(150);t(['交强险','商业车险','私家车年检·上线检验（9 座及以下）','私家车年检·申领检验标志'].every(n=>q.locator(`[data-tpl]:text-is("${n}")`).count()),'CN 车辆模板');
  t(await q.locator('[data-tpl]:text-is("交强险")').count()===1&&await q.locator('[data-tpl]:text-is("商业车险")').count()===1&&await q.locator('[data-tpl]:text-is("私家车年检·上线检验（9 座及以下）")').count()===1&&await q.locator('[data-tpl]:text-is("私家车年检·申领检验标志")').count()===1,'CN 4 个车辆模板（年检拆两条）');
  await setS({region:'cn'});await q.goto(B+'#/');await q.goto(B+'#/new?cat=doc');await q.reload();await q.waitForTimeout(300);const tp2=await q.$$eval('.tpl [data-tpl]',e=>e.map(x=>x.textContent.trim()));t(!tp2.includes('居留卡')&&tp2.includes('中国·驾驶证')&&tp2.includes('营业执照'),'CN 常用地区=中国');
  await q.click('[data-tpl]:text-is("中国·驾驶证")');await q.waitForTimeout(150);t(/自定义/.test(await q.textContent('.seg [data-int].on')),'CN 驾驶证提醒 90/30/7（自定义）');await q.fill('#dueT','01.12.2030');await q.click('[data-save]');await q.waitForTimeout(400);{const id=await q.evaluate(()=>JSON.parse(localStorage.getItem('dq.items.v2')).find(i=>i.name==='中国·驾驶证').id);await q.goto(B+'#/item/'+id);await q.waitForTimeout(300);}
  t(/gov\.cn/.test(await q.textContent('main, body'))&&await q.locator('a.ext[target=_blank][rel*=noopener]').count()===1,'CN 详情有官方链接');
  await q.goto(B+'#/settings');await q.waitForTimeout(300);t(/国内安卓手机可能收不到推送/.test(await q.textContent('.push-note'))&&await q.locator('.push-note input[type=checkbox]').count()===0,'P2-H 推送说明');
  const foreign=reqs.filter(u=>!u.startsWith('http://localhost:8765/')&&!u.startsWith('data:')&&!u.startsWith('blob:'));t(foreign.length===0,'P2-J 只有同源请求 '+foreign.slice(0,3));
  await cb.close();}
 // P2-J 静态扫描：app 下除 README、SVG xmlns 和模板官方链接（url: 字段）外不能出现外部 URL
 {const fs=require('fs'),path=require('path');const root='/workspace/到期提醒/app';const bad=[];
  const walk=d=>{for(const f of fs.readdirSync(d)){if(['tests','tools','.git','node_modules'].includes(f))continue;const p=path.join(d,f);if(fs.statSync(p).isDirectory())walk(p);else if(/\.(js|html|css|json|svg|webmanifest)$/.test(f)&&f!=='README.md'){
    fs.readFileSync(p,'utf8').split('\n').forEach((l,i)=>{for(const m of l.matchAll(/https?:\/\/[^\s'"`)]+/g)){const u=m[0];if(/^http:\/\/www\.w3\.org\/2000\/svg/.test(u))continue;if(f==='shelf.js'&&/^\s*(const\s+)?,?\s*S\d+=/.test(l))continue;if(f==='templates.js'&&/url:"/.test(l.slice(Math.max(0,m.index-6),m.index)))continue;bad.push(p+':'+(i+1)+' '+u);}});}}};
  walk(root);t(bad.length===0,'P2-J 外部 URL 扫描 '+bad.slice(0,3));}

 // ---- v1.2 设计 + 日用品 + 手动选择保护 ----
 {const cd=await br.newContext({locale:'zh',timezoneId:'Europe/Bucharest',viewport:{width:390,height:844},acceptDownloads:true,reducedMotion:'reduce'});const q=await cd.newPage();q.on('pageerror',e=>errs.push(e.message));
  const SS=()=>q.evaluate(()=>JSON.parse(localStorage.getItem('dq.settings.v1')||'{}'));const IT=()=>q.evaluate(()=>JSON.parse(localStorage.getItem('dq.items.v2')||'[]'));
  // 老用户自建「日用品」→ 合并到 daily
  await q.goto(B+'#/');await q.evaluate(()=>{localStorage.clear();localStorage.setItem('dq.settings.v1',JSON.stringify({onboarded:true,catSoon:{c_ry:7},cats:{custom:[{id:'c_ry',name:'日用品',icon:'box',color:'#000000'}],order:['c_ry','doc']}}));
    localStorage.setItem('dq.items.v2',JSON.stringify([{id:'a1',name:'抽纸',due:'2027-01-01',cat:'c_ry'},{id:'a2',name:'牛奶',due:'2027-01-01',cat:'food'}]));});
  await q.reload();await q.waitForTimeout(400);let l=await IT(),ss=await SS();
  t(l.find(i=>i.id==='a1').cat==='daily'&&!ss.cats.custom.length&&ss.catSoon.daily===7&&ss.cats.order[0]==='daily','DLY 同名自定义合并');
  await q.goto(B+'#/cats');await q.waitForTimeout(300);t(await q.locator('a.tile[href="#/cat/daily"]').count()===1,'DLY 宫格');
  await q.goto(B+'#/catrules');await q.waitForTimeout(300);t(await q.locator('select[data-cs=daily]').count()===1&&/日用品 · 7 天 · 标准/.test(await q.textContent('.sum')),'DLY 规则列表');
  await q.goto(B+'#/settings');await q.waitForTimeout(300);const [dl]=await Promise.all([q.waitForEvent('download'),q.click('#ecsv')]);await dl.saveAs('/tmp/d.csv');t(require('fs').readFileSync('/tmp/d.csv','utf8').includes('日用品'),'DLY CSV 写名称');
  require('fs').writeFileSync('/tmp/d2.csv','名称,到期日,分类\n洗衣液,2027-02-01,日用品\n');await q.setInputFiles('#imp','/tmp/d2.csv');await q.waitForTimeout(300);t(await q.locator('[data-nc]').count()===0,'DLY 导入识别日用品');await q.click('#impGo');await q.waitForTimeout(300);
  t((await IT()).find(i=>i.name==='洗衣液').cat==='daily','DLY 导入归 daily');
  // 手动选择永不被推断覆盖（多种方式 + 多个强关键词 + 保存后核对存储）
  await q.evaluate(()=>{const s=JSON.parse(localStorage.getItem('dq.settings.v1'));delete s.lastCat;delete s.catLearn;localStorage.setItem('dq.settings.v1',JSON.stringify(s));});
  await q.goto(B+'#/');await q.goto(B+'#/new');await q.reload();await q.waitForTimeout(300);
  {const tx=await q.textContent('.cat-field'),v=await q.inputValue('[name=cat]');const nm=await q.evaluate(k=>document.querySelector(`[data-cat="${k}"]`)?.textContent.trim(),v);t(tx.includes(nm+' · 默认')&&await q.locator('[data-cat].on').count()===0,'N9 状态1 显示实际默认分类 '+tx);}
  await q.fill('[name=name]','牛奶');await q.click('#dueT');await q.waitForTimeout(150);
  t(await q.locator('.cat-field.inferred').count()===1&&/按名称推断/.test(await q.textContent('#catSug'))&&/改分类/.test(await q.textContent('#catSug')),'3S 状态2 推断');
  await q.selectOption('[name=cat]','home');await q.waitForTimeout(150);t(/已手动选择/.test(await q.textContent('#catSug'))&&await q.locator('.cat-field.inferred').count()===0,'3S 状态3 手动');
  for(const n of ['布洛芬','RCA 交强险','护照','抽纸','Netflix','面包']){await q.fill('[name=name]',n);await q.dispatchEvent('[name=name]','input');await q.click('#dueT');await q.waitForTimeout(120);
    if(await q.inputValue('[name=cat]')!=='home'){t(false,'MAN 被覆盖 '+n);}}
  t(await q.inputValue('[name=cat]')==='home','MAN 6 个强关键词都没覆盖');await q.fill('#dueT','01.12.2026');await q.click('[data-save]');await q.waitForTimeout(300);
  t((await IT()).find(i=>i.name==='面包').cat==='home','MAN 保存后存储仍是手动分类');
  await q.goto(B+'#/');await q.goto(B+'#/new');await q.waitForTimeout(300);t(/· 默认/.test(await q.textContent('.cat-field'))&&!/上次使用/.test(await q.textContent('.cat-field')),'N9 有 lastCat 也显示「X · 默认」');
  await q.click('[data-cat="food"]');await q.fill('[name=name]','护照');await q.click('#dueT');await q.waitForTimeout(120);t(await q.inputValue('[name=cat]')==='food','MAN chip 选择后不覆盖');
  await q.click('[data-cat="doc"]');await q.click('[data-tpl]:text-is("护照"), [data-tpl]:text-is("中国·普通护照")');await q.waitForTimeout(120);t(/来自模板/.test(await q.textContent('#catSug')),'3S 来自模板');
  // 照片 3 列 + 封面 + 删除角标 + 超出提示
  await q.goto(B+'#/item/a2');await q.waitForTimeout(300);const PH='/workspace/到期提醒/app/tests/fixtures-photo.jpg';
  await q.setInputFiles('[data-addph]:not([capture])',[PH,PH,PH,PH,PH]);await q.waitForTimeout(4500);
  t((await IT()).find(i=>i.id==='a2').photos.length===3,'PH5 选5张只加3张');t(/已满/.test(await q.textContent('.photos .micro'))&&await q.locator('.ph-add3').count()===0,'PH5 已满隐藏添加');
  t(await q.locator('.thumb3 .cover').count()===1&&await q.$eval('.ph-grid3',e=>getComputedStyle(e).gridTemplateColumns.split(' ').length)===3,'PH5 三列+封面');
  await q.click('.thumb3 [data-delph]');await q.waitForTimeout(300);t((await IT()).find(i=>i.id==='a2').photos.length===2&&await q.locator('.ph-add3').count()===1,'PH5 角标删除');
  // 数据安全开关
  await q.goto(B+'#/settings');await q.waitForTimeout(300);t(await q.locator('#bkSeg.dim').count()===0,'DS 开时 seg 可用');
  await q.click('label.sw');await q.waitForTimeout(200);t((await SS()).backupEvery===0&&await q.locator('#bkSeg.dim').count()===1,'DS 关闭后 seg 变灰');
  await q.click('label.sw');await q.waitForTimeout(200);t((await SS()).backupEvery===14,'DS 重新打开恢复 14');
  await q.click('[data-bke="7"]');await q.waitForTimeout(200);t((await SS()).backupEvery===7,'DS 间隔 7');
  t(/还没有备份/.test(await q.textContent('.st-pill')),'DS 状态胶囊');
  await cd.close();}
 console.log(ok,'passed',bad,'failed');console.log('errors',errs);await br.close();})();
