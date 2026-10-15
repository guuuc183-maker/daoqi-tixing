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
 console.log(ok,'passed',bad,'failed');console.log('errors',errs);await br.close();})();
