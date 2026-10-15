const {chromium}=require('playwright-core');const fs=require('fs');
const B='http://localhost:8765/daoqi-tixing/';
(async()=>{const br=await chromium.launch({executablePath:'/usr/bin/google-chrome'});
 const c=await br.newContext({viewport:{width:390,height:844},acceptDownloads:true,reducedMotion:'reduce'});const p=await c.newPage();const errs=[];
 p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>m.type()==='error'&&errs.push(m.text()));p.on('dialog',d=>d.accept());
 let ok=0,bad=0;const t=(c,m)=>{if(c)ok++;else{bad++;console.log('FAIL',m);}};
 const go=async h=>{await p.goto(B+h);await p.waitForTimeout(350);};
 const LS=()=>p.evaluate(()=>JSON.parse(localStorage.getItem('dq.items.v2')));
 await go('?demo=1#/');t((await LS()).length===14,'seed');
 const n0=await p.locator('.todo .todo-row').count();const head=await p.textContent('.todo-head');console.log('home todo:',head);
 t(n0===3&&/查看全部/.test(head),'首页3条+查看全部');
 await go('#/todo');const nAll=await p.locator('.todo-row').count();console.log('todo all',nAll,await p.$$eval('.todo-main b',e=>e.map(x=>x.textContent)));
 // 已处理 + 撤销
 const first=await p.textContent('.todo-row .todo-main b');await p.click('.todo-row [data-a=done]');await p.waitForTimeout(200);
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
 await go('#/settings');await p.selectOption('[data-ci=doc]','standard');await p.waitForTimeout(300);
 await go('#/item/'+id);t(/标准/.test(await p.textContent('.kv')),'改分类后跟随=标准');
 const lid=(await LS()).find(x=>x.name==='轻证件').id;await go('#/item/'+lid);t(/轻/.test(await p.textContent('.kv>div')),'单独设置仍轻');
 await go('#/edit/'+lid);await p.click('#follow');t(/跟随分类/.test(await p.textContent('.lbl'))&&(await p.textContent('.seg .on'))==='标准','恢复跟随');
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
 const [dl2]=await Promise.all([p.waitForEvent('download'),p.click('#clear')]);t(/json$/.test(dl2.suggestedFilename()),'清空自动下载JSON');
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
 await p.evaluate(()=>{const s=JSON.parse(localStorage.getItem('dq.settings.v1'));s.lastExportAt=s.firstUseAt=new Date(Date.now()-31*864e5).toISOString();delete s.backupTipAt;localStorage.setItem('dq.settings.v1',JSON.stringify(s));});
 await p.reload();await p.waitForTimeout(300);t(/建议备份/.test(await p.textContent('#view')),'备份提示');

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
 await go('#/item/'+nid);await p.click('#handled');await p.waitForTimeout(200);t(/存储已满/.test(await p.textContent('.toast')),'R#7 存储满提示');

 // ---- 引导页 / 空状态 / 动效 ----
 {const c2=await br.newContext({viewport:{width:390,height:844}});await c2.addInitScript(()=>{window.__perm=0;if(window.Notification){const o=Notification.requestPermission;Notification.requestPermission=function(){window.__perm++;return o.apply(this,arguments)}}});const q=await c2.newPage();q.on('pageerror',e=>errs.push(e.message));q.on('console',m=>m.type()==='error'&&errs.push(m.text()));
  await q.goto(B);await q.waitForTimeout(500);t(await q.locator('.ob').isVisible(),'OB 首次显示引导');
  t(await q.locator('.ob-page').count()===3,'OB 3 屏');
  await q.click('[data-ob=next]');await q.waitForTimeout(500);await q.click('[data-ob=next]');await q.waitForTimeout(500);
  t(/开启提醒|开始使用/.test(await q.textContent('[data-ob=next]')),'OB 第3屏按钮');t(await q.evaluate(()=>window.__perm)===0,'OB 未自动请求权限');
  await q.click('[data-ob=next]');await q.waitForTimeout(400);t(await q.locator('.ob').count()===0,'OB 完成关闭');
  await q.reload();await q.waitForTimeout(500);t(await q.locator('.ob').count()===0,'OB 只显示一次');
  t(/还没有要盯着的日期/.test(await q.textContent('#view')),'空状态标题');t(await q.locator('.empty-ring svg').count()===1,'空状态灰环');
  t(await q.locator('.tpl-quick a').count()===4,'空状态 4 个模板');t(await q.locator('.empty-state .btn.primary').count()===1,'空状态主按钮');
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
 {const c3=await br.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});const q=await c3.newPage();q.on('pageerror',e=>errs.push(e.message));q.on('console',m=>m.type()==='error'&&errs.push(m.text()));
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
  await q.goto(B+'#/settings');await q.waitForTimeout(300);await q.selectOption('[data-cs=food]','90');await q.waitForTimeout(200);
  await q.goto(B+'#/item/d8');await q.waitForTimeout(300);t(/临期/.test(await q.textContent('.pill')),'分类阈值改为 90 后变临期');
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
  t(/存储已满/.test(await q.textContent('.toast'))&&!/已保存/.test(await q.textContent('.toast')),'N1 失败不提示已保存');
  t(q.url().includes('#/new')&&await q.inputValue('[name=name]')==='保存失败测试','N1 停在表单并保留内容');
  await q.goto(B+'#/item/d7');await q.waitForTimeout(300);await q.click('#del');await q.waitForTimeout(200);t(!/已删除/.test(await q.textContent('.toast')),'N1 删除失败不提示成功');
  await c3.close();}

 // ---- 照片 ----
 {const PH=require('path').join(__dirname,'fixtures-photo.jpg');
  const c4=await br.newContext({viewport:{width:390,height:844},reducedMotion:'reduce',acceptDownloads:true});const q=await c4.newPage();q.on('pageerror',e=>errs.push(e.message));q.on('console',m=>m.type()==='error'&&errs.push(m.text()));
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
  await q.goto(B+'#/settings');await q.waitForTimeout(300);const [j1]=await Promise.all([q.waitForEvent('download'),q.click('#ejson')]);await j1.saveAs('/tmp/ph.json');
  const J=JSON.parse(fs.readFileSync('/tmp/ph.json','utf8'));t(Object.keys(J.photos||{}).length===3&&/^data:image\/jpeg;base64,/.test(Object.values(J.photos)[0].full),'PH JSON 含照片');
  await q.uncheck('#incPh');const [j2]=await Promise.all([q.waitForEvent('download'),q.click('#ejson')]);await j2.saveAs('/tmp/ph2.json');t(!JSON.parse(fs.readFileSync('/tmp/ph2.json','utf8')).photos,'PH JSON 不含照片');
  const [c1]=await Promise.all([q.waitForEvent('download'),q.click('#ecsv')]);await c1.saveAs('/tmp/ph.csv');t(!/photos|base64/.test(fs.readFileSync('/tmp/ph.csv','utf8')),'PH CSV 不含照片');
  // 存储满
  await q.goto(B+'#/item/d4');await q.waitForTimeout(300);
  await q.evaluate(()=>{IDBObjectStore.prototype.put=function(){throw new DOMException('full','QuotaExceededError')};});
  await q.setInputFiles('[data-addph]:not([capture])',PH);await q.waitForTimeout(1200);t(/存储空间已满/.test(await q.textContent('.toast')),'PH 存储满提示');
  t(!((await L4()).find(x=>x.id==='d4').photos||[]).length,'PH 存储满不写入引用');
  await c4.close();
  // 导入到新设备恢复照片
  const c5=await br.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});const r5=await c5.newPage();r5.on('pageerror',e=>errs.push(e.message));
  await r5.goto(B+'?demo=1#/settings');await r5.evaluate(()=>localStorage.setItem('dq.items.v2','[]'));await r5.reload();await r5.waitForTimeout(400);
  await r5.setInputFiles('#imp','/tmp/ph.json');await r5.waitForTimeout(400);t(/含照片 3 张/.test(await r5.textContent('.imp')),'PH 导入预览显示照片数');
  await r5.click('#impGo');await r5.waitForTimeout(1500);await r5.goto(B+'#/item/d7');await r5.waitForTimeout(800);
  t(await r5.$$eval('.ph img',e=>e.filter(x=>x.naturalWidth>0).length)===3,'PH 导入后照片恢复');await c5.close();}

 // ---- 走查 v2 ----
 {const c6=await br.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});const q=await c6.newPage();q.on('pageerror',e=>errs.push(e.message));
  await q.goto(B+'?demo=1#/');await q.waitForTimeout(400);t(await q.locator('.todo-act .more svg').count()>0,'V2 ⋯ 为 SVG');
  t(await q.$eval('.ico',e=>e.getAttribute('stroke-width'))==='1.75','V2 图标线宽 1.75');
  t(await q.$eval('.ring-txt .big',e=>getComputedStyle(e).fontSize)==='52px','V2 环内数字 52px');
  t(await q.$eval('.top h1',e=>getComputedStyle(e).fontSize)==='30px','V2 标题 30px');
  t(await q.evaluate(()=>getComputedStyle(document.body).backgroundColor)==='rgb(242, 242, 239)','V2 暖色背景');
  await q.goto(B+'#/new');await q.waitForTimeout(300);await q.click('[data-q="1y"]');await q.click('.date-clr');t(await q.inputValue('#dueT')==='','V2 日期框 × 清除');
  await q.evaluate(()=>{const l=JSON.parse(localStorage.getItem('dq.items.v2'));l.forEach(x=>{x.handledAt='2026-10-15';x.renewAsked=true;});localStorage.setItem('dq.items.v2',JSON.stringify(l));});
  await q.goto(B+'#/');await q.reload();await q.waitForTimeout(400);t(/全部已处理/.test(await q.textContent('.all-clear'))&&await q.locator('.gold-ring').count()===1,'V2 全部已处理金色环');
  await q.goto(B+'#/settings');await q.waitForTimeout(300);t(await q.locator('.about .ver').count()===1,'V2 关于版本号');await c6.close();}

 // ---- 自定义分类 ----
 {const c7=await br.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});const q=await c7.newPage();q.on('pageerror',e=>errs.push(e.message));q.on('dialog',d=>{q._dlg=d.message();d.accept();});
  const SS=()=>q.evaluate(()=>JSON.parse(localStorage.getItem('dq.settings.v1')||'{}'));const IT=()=>q.evaluate(()=>JSON.parse(localStorage.getItem('dq.items.v2')));
  await q.goto(B+'?demo=1#/settings');await q.waitForTimeout(400);await q.click('a[href="#/catmgr"]');await q.waitForTimeout(300);
  t(await q.locator('.cm-row').count()===9,'CM 9个内置');
  await q.click('#catNew');await q.fill('#cName','宠物<i>');await q.click('[data-ic="home"]');await q.click('[data-col="#D94545"]');await q.click('#cSave');await q.waitForTimeout(300);
  const cid=(await SS()).cats.custom[0].id;t(/^c_/.test(cid)&&(await SS()).cats.custom[0].icon==='home','CM 新建保存');
  t(await q.locator('.cm-row').count()===10&&await q.locator('.cm-row i').count()===0,'CM 名称已转义');
  await q.click(`.cm-row[data-k="${cid}"] [data-mv="-1"]`);await q.waitForTimeout(200);t((await SS()).cats.order.indexOf(cid)===(await SS()).cats.order.length-3&&(await SS()).cats.order.at(-1)==='other','CM 上移');
  await q.click('.cm-row[data-k="doc"] [data-edit]');await q.fill('#cName','护照证件');await q.click('#cSave');await q.waitForTimeout(200);
  await q.click('.cm-row[data-k="car"] [data-edit]');await q.click('#cHide');await q.waitForTimeout(200);
  await q.goto(B+'#/cats');await q.waitForTimeout(300);t(await q.locator('a.tile[href="#/cat/car"]').count()===0,'CM 隐藏后网格无车辆');
  t(/护照证件/.test(await q.textContent('a.tile[href="#/cat/doc"]')),'CM 内置改名');t(await q.locator(`a.tile[href="#/cat/${cid}"]`).count()===1,'CM 网格有自定义');
  await q.goto(B+'#/new');await q.waitForTimeout(300);t(await q.locator(`[data-cat="${cid}"]`).count()===1&&await q.locator('[data-cat="car"]').count()===0,'CM 表单分类');
  await q.evaluate(id=>{const l=JSON.parse(localStorage.getItem('dq.items.v2'));l[0].cat=id;l[1].cat=id;localStorage.setItem('dq.items.v2',JSON.stringify(l));},cid);
  await q.goto(B+`#/cat/${cid}`);await q.waitForTimeout(300);t(await q.locator('.top h1 i').count()===0,'CM 分类页标题转义');
  await q.goto(B+'#/settings');await q.waitForTimeout(300);t(await q.locator(`select[data-soon="${cid}"],select[data-ci="${cid}"],[data-k="${cid}"]`).count()>0||(await q.content()).includes(cid),'CM 设置有阈值');
  await q.goto(B+'#/catmgr');await q.waitForTimeout(300);await q.click(`.cm-row[data-k="${cid}"] [data-edit]`);await q.click('#cDel');await q.waitForTimeout(300);
  t(/移到「其他」/.test(q._dlg||''),'CM 删除确认提示');let l=await IT();t(l[0].cat==='other'&&l[1].cat==='other'&&!(await SS()).cats.custom.length,'CM 删除→其他');
  await q.click('.toast button');await q.waitForTimeout(300);l=await IT();t(l[0].cat===cid&&(await SS()).cats.custom.length===1,'CM 删除撤销');
  await q.goto(B+'#/settings');await q.waitForTimeout(300);
  fs.writeFileSync('/tmp/nc.csv','名称,到期日,分类\n鱼食,2026-12-01,水族\n猫砂,2026-12-02,'+'宠物<i>'+'\n');
  await q.setInputFiles('#imp','/tmp/nc.csv');await q.waitForTimeout(400);t(/水族/.test(await q.textContent('.imp'))&&await q.locator('[data-nc]').count()===2,'CM 导入预览新分类');
  await q.click('#impGo');await q.waitForTimeout(400);const ss=await SS();const aq=ss.cats.custom.find(d=>d.name==='水族');l=await IT();
  t(aq&&l.find(x=>x.name==='鱼食').cat===aq.id&&l.find(x=>x.name==='猫砂').cat===cid,'CM 导入自动创建/按名匹配');await c7.close();}
 console.log(ok,'passed',bad,'failed');console.log('errors',errs);await br.close();})();
