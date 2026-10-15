// v1.7.7: global visual review G01-G17 (contrast + narrow-width layout)
const {chromium}=require('playwright-core');const B='http://localhost:8765/daoqi-tixing/';let ok=0,bad=0;const T=(c,m)=>{c?ok++:(bad++,console.log('FAIL',m))};
const CR=`(()=>{const P=c=>{const m=c.match(/[\\d.]+/g).map(Number);return m};const L=([r,g,b])=>{const f=v=>{v/=255;return v<=.03928?v/12.92:((v+.055)/1.055)**2.4};return .2126*f(r)+.7152*f(g)+.0722*f(b)};
 window.__cr=(fg,bg)=>{const a=L(P(fg)),b=L(P(bg));return (Math.max(a,b)+.05)/(Math.min(a,b)+.05)};
 window.__bg=el=>{for(let e=el;e;e=e.parentElement){const c=getComputedStyle(e).backgroundColor;const m=c.match(/[\\d.]+/g);if(m&&(m.length<4||+m[3]>=.99))return c;}return getComputedStyle(document.documentElement).backgroundColor};
 window.__c=el=>__cr(getComputedStyle(el).color,__bg(el));})()`;
(async()=>{const br=await chromium.launch({executablePath:'/usr/bin/google-chrome'});
const page=async(l,th,w,h,{scheme,demo=true,ob=true}={})=>{const c=await br.newContext({viewport:{width:w,height:780},colorScheme:scheme||(th==='dark'?'dark':'light'),reducedMotion:'reduce',serviceWorkers:'block'});
 const set={lang:l,onboarded:ob};if(th)set.theme=th;await c.addInitScript(`if(!sessionStorage.x){sessionStorage.x=1;localStorage.clear();localStorage.setItem('dq.settings.v1',${JSON.stringify(JSON.stringify(set))});}`);
 await c.addInitScript(CR);const p=await c.newPage();p.on('pageerror',e=>T(0,'pageerror '+e));await p.goto(B+(demo?'?demo=1':'')+h);await p.waitForTimeout(500);await p.evaluate(CR);return [c,p];};
// G14/G15/G16 CSS variable values + computed contrast
for(const [th,scheme] of [['light'],['dark'],[null,'dark']]){const [c,p]=await page('ro',th,390,'#/settings',{scheme});
 const v=await p.evaluate(()=>{const s=getComputedStyle(document.documentElement);return ['--muted','--safe-text','--soon-text','--expired-text','--gold-text'].map(k=>s.getPropertyValue(k).trim())});
 const dark=th==='dark'||scheme==='dark';
 T(v[0].toUpperCase()===(dark?'#798792':'#6A6E6D'),'G14 muted '+th+scheme+' '+v[0]);
 if(!dark)T(v.slice(1).join()=== '#0C744A,#8F5900,#C12727,#866932','G15 text colors '+v);
 const tab=await p.evaluate(()=>__cr(getComputedStyle(document.querySelector('.tabbar a:not(.on) span')).color,getComputedStyle(document.documentElement).backgroundColor));
 T(tab>=4.2,'G14 tabbar contrast '+th+scheme+' '+tab.toFixed(2));
 const ver=await p.evaluate(()=>__c(document.querySelector('.about .ver')));T(ver>=4.5,'G15 version '+th+' '+ver.toFixed(2));
 const pill=await p.evaluate(()=>{const e=document.querySelector('.st-pill');return e?__c(e):9});T(pill>=4.5,'G15 st-pill '+th+' '+pill.toFixed(2));
 await p.goto(B+'#/cats');await p.waitForTimeout(400);await p.evaluate(CR);
 const bs=await p.evaluate(()=>[...document.querySelectorAll('.badges em.b')].map(e=>__c(e)));T(bs.length&&Math.min(...bs)>=4.5,'G16 badges '+th+scheme+' '+bs.map(x=>x.toFixed(2)));
 // G05 toast undo
 await p.goto(B+'#/item/d3');await p.waitForTimeout(300);await p.click('#del');await p.waitForTimeout(200);await p.evaluate(CR);
 const u=await p.evaluate(()=>__cr(getComputedStyle(document.querySelector('.toast .undo')).color,getComputedStyle(document.querySelector('.toast')).backgroundColor));T(u>=4.5&&(dark?(await p.evaluate(()=>getComputedStyle(document.querySelector('.toast .undo')).color))==='rgb(16, 126, 77)':true),'G05 undo '+th+scheme+' '+u.toFixed(2));
 // G04 toast uses full width
 const tw=await p.evaluate(()=>{const r=document.querySelector('.toast').getBoundingClientRect();return [r.left,r.right,innerWidth]});T(tw[0]>=15&&tw[2]-tw[1]>=15,'G04 toast within margins '+tw);
 await c.close();}
// narrow-width layout
for(const l of ['zh','ro','en'])for(const w of [320,390]){
 const [c,p]=await page(l,'light',w,'#/todo');
 const more=await p.evaluate(()=>[...document.querySelectorAll('.todo-act .more svg')].map(s=>s.getBoundingClientRect().width));T(more.length&&more.every(x=>x>=16),'G02 more icon '+l+w);
 const rows=await p.evaluate(()=>[...document.querySelectorAll('.todo-row')].map(r=>{const b=r.querySelector('.todo-main b');return b.getBoundingClientRect().width}));T(rows.every(x=>x>=(w<360?150:80)),'G12 name width '+l+w+' '+rows.map(Math.round));
 const h1=async()=>p.evaluate(()=>{const e=document.querySelector('.top h1');const r=document.createRange();r.selectNodeContents(e);const words=e.textContent.trim().split(/\s+/).length;const lines=new Set([...r.getClientRects()].map(x=>Math.round(x.top))).size;return {lines,words,over:e.scrollWidth>e.clientWidth+1}});
 for(const hs of ['#/cal','#/todo','#/catmgr','#/catrules','#/edit/d3']){await p.goto(B+hs);await p.waitForTimeout(300);const r=await h1();T(r.lines<=r.words&&!r.over,'G01 h1 '+l+w+hs+' '+JSON.stringify(r));}
 await p.goto(B+'#/item/d3');await p.waitForTimeout(300);
 const h2=await p.evaluate(()=>{const e=document.querySelector('.big-cd h2');return getComputedStyle(e).wordBreak});T(h2==='normal','G11 h2 word-break '+h2);
 // trash rows
 await p.evaluate(()=>{const x=JSON.parse(localStorage.getItem('dq.items.v2'));x.slice(0,3).forEach(i=>i.deletedAt=new Date().toISOString());localStorage.setItem('dq.items.v2',JSON.stringify(x))});
 await p.goto(B+'#/trash');await p.reload();await p.waitForTimeout(400);
 const tr=await p.evaluate(()=>[...document.querySelectorAll('.trash .row')].map(r=>[r.getBoundingClientRect().height,r.querySelector('.grow b').getBoundingClientRect().width]));T(tr.length===3&&tr.every(([h,b])=>h<=90&&b>=60),'G03 trash rows '+l+w+' '+JSON.stringify(tr));
 T(await p.evaluate(()=>[...document.querySelectorAll('[data-r]')].every(b=>b.getAttribute('aria-label'))),'G03 restore aria-label');
 // settings
 await p.goto(B+'#/settings');await p.waitForTimeout(400);
 const st=await p.evaluate(()=>{const pl=document.querySelector('.st-pill');const s3=document.querySelector('.stat3.three');const card=s3.closest('.card');const cs=getComputedStyle(card);
  const segs=[...document.querySelectorAll('.seg button')].filter(b=>b.offsetParent).map(b=>b.scrollWidth<=b.clientWidth+1);
  const btns=['#badge','#icsS2'].map(q=>document.querySelector(q)).filter(Boolean).map(b=>b.getBoundingClientRect().height<=48);
  return {pill:pl?pl.getBoundingClientRect().height<=26:true,s3:s3.getBoundingClientRect().right<=card.getBoundingClientRect().right-parseFloat(cs.paddingRight)+1,segs:segs.every(Boolean),btns:btns.every(Boolean),push:[...document.querySelectorAll('.push-note p')].map(x=>x.textContent).join('|')};});
 T(st.pill,'G06 pill '+l+w);T(st.s3,'G07 stat3 '+l+w);T(st.segs,'G08 seg overflow '+l+w);T(st.btns,'G09 buttons one line '+l+w);
 T(l==='zh'?!/\s/.test(st.push.replace(/[「」]/g,''))||!/。 /.test(st.push):(/\. [A-Z]/.test(st.push)&&!/  /.test(st.push)),'G17 push sentence join '+l+' '+st.push.slice(0,90));
 const short=await p.evaluate(()=>[...document.querySelectorAll('[data-soon]')].map(b=>b.textContent));if(w===390&&l==='zh')T(short[0]==='7 天','G08 zh 390 full '+short);
 // G13 confirm sheet
 await p.click('#clear');await p.waitForTimeout(250);
 const sh=await p.evaluate(()=>[...document.querySelectorAll('.sheet .btns.col .btn')].map(b=>b.getBoundingClientRect().height));T(sh.length===2&&sh.every(x=>x===48),'G13 sheet buttons '+l+w+' '+sh);
 const dg=await p.evaluate(()=>{const b=document.querySelector('#askOk');return [getComputedStyle(b).backgroundColor,__cr(getComputedStyle(b).color,getComputedStyle(b).backgroundColor)]});T(dg[1]>=4.5&&!/rgba\(0, 0, 0, 0\)/.test(dg[0]),'G13 danger solid '+dg);
 await c.close();
 // G10 onboarding cards
 const [c2,p2]=await page(l,'light',w,'',{demo:false,ob:false});await p2.waitForTimeout(300);
 const ob=await p2.evaluate(()=>[...document.querySelectorAll('.ob1 .lv small')].map(s=>[s.scrollHeight<=s.clientHeight+1,s.scrollWidth<=s.clientWidth+1,s.textContent]));T(ob.length===3&&ob.every(x=>x[0]&&x[1]),'G10 onboarding '+l+w+' '+JSON.stringify(ob));
 await c2.close();}
// G08 intensity labels fit at 320 (form)
for(const l of ['ro','en']){const [c,p]=await page(l,'light',320,'#/edit/d3');const r=await p.evaluate(()=>{document.querySelector('#more')&&(document.querySelector('#more').open=true);return [...document.querySelectorAll('[data-int]')].map(b=>b.scrollWidth<=b.clientWidth+1)});T(r.length&&r.every(Boolean),'G08 intensity '+l+' '+r);await c.close();}
// G12 calendar short day column
{const [c,p]=await page('ro','light',320,'#/cal');const r=await p.evaluate(()=>[...document.querySelectorAll('.cal-list .cd')].map(e=>[e.getBoundingClientRect().width,e.querySelector('small').textContent]));T(r.length&&r.every(([w,s])=>w<=48&&(s==='z'||s==='Azi'||s.length<8)),'G12 cal col '+JSON.stringify(r));await c.close();}

// UX G3: leave add/edit with unsaved changes
{const [c,p]=await page('en','light',390,'#/');const hash=()=>p.evaluate(()=>location.hash);const sheet=()=>p.locator('.sheet #askOk').count();
 // unchanged add form leaves directly
 await p.click('.tab-add');await p.waitForTimeout(300);T(await hash()==='#/new','G3 on new');await p.click('#tabbar [data-tab=cal]');await p.waitForTimeout(300);T(await hash()==='#/cal'&&!(await sheet()),'G3 unchanged leaves directly');
 // changed add form: tabbar -> dialog; Esc keeps editing
 await p.click('.tab-add');await p.waitForTimeout(300);await p.fill('[name=name]','Passport docs');await p.click('#tabbar [data-tab=cal]');await p.waitForTimeout(250);
 T(await sheet()===1,'G3 tabbar shows dialog');const txt=await p.textContent('.sheet');T(/Discard changes\?/.test(txt)&&/won't be saved/.test(txt),'G3 copy');
 T(await p.evaluate(()=>{const b=[...document.querySelectorAll('.sheet .btns.row2 .btn')];return b[0].id==='askNo'&&b[0].classList.contains('primary')&&b[0].textContent==='Continue'&&b[1].classList.contains('danger')&&b[1].textContent==='Discard'}),'G3 buttons keep primary + discard danger');
 await p.keyboard.press('Escape');await p.waitForTimeout(200);T(!(await sheet())&&await hash()==='#/new'&&await p.inputValue('[name=name]')==='Passport docs','G3 Esc keeps editing');
 // backdrop keeps editing
 await p.click('#tabbar [data-tab=cats]');await p.waitForTimeout(250);await p.mouse.click(195,60);await p.waitForTimeout(200);T(!(await sheet())&&await hash()==='#/new'&&await p.inputValue('[name=name]')==='Passport docs','G3 backdrop keeps editing');
 // discard leaves
 await p.click('#tabbar [data-tab=cats]');await p.waitForTimeout(250);await p.click('#askOk');await p.waitForTimeout(300);T(await hash()==='#/cats','G3 discard leaves');
 // edit: back button
 await p.goto(B+'#/item/d3');await p.waitForTimeout(300);await p.goto(B+'#/edit/d3');await p.waitForTimeout(400);const n0=await p.inputValue('[name=name]');
 await p.click('[data-back]');await p.waitForTimeout(300);T(!(await sheet())&&await hash()==='#/item/d3','G3 edit unchanged back leaves');
 await p.goto(B+'#/edit/d3');await p.waitForTimeout(400);await p.fill('[name=name]',n0+' x');await p.click('[data-back]');await p.waitForTimeout(250);T(await sheet()===1&&await hash()==='#/edit/d3','G3 back button dialog');
 await p.click('#askNo');await p.waitForTimeout(200);T(await hash()==='#/edit/d3'&&await p.inputValue('[name=name]')===n0+' x','G3 keep editing');
 // back gesture (popstate)
 await p.goBack();await p.waitForTimeout(350);T(await sheet()===1&&await hash()==='#/edit/d3','G3 popstate dialog '+await hash());
 await p.click('#askOk');await p.waitForTimeout(350);T(await hash()!=='#/edit/d3','G3 popstate discard leaves');
 const nm=await p.evaluate(()=>JSON.parse(localStorage.getItem('dq.items.v2')).find(x=>x.id==='d3').name);T(nm===n0,'G3 discarded not saved');
 // template change counts; save does not prompt
 await p.goto(B+'#/edit/d3');await p.waitForTimeout(400);await p.fill('[name=name]',n0+' y');await p.click('#saveTop');await p.waitForTimeout(350);T(!(await sheet())&&await hash()!=='#/edit/d3','G3 save no dialog');
 await c.close();}
// G17 joinSent unit
{const {joinSent}=await import('../js/i18n/i18n.js');T(joinSent('A. ','B','ro')==='A. B'&&joinSent('A.','B','en')==='A. B'&&joinSent('\u3002','x','zh')==='\u3002x','joinSent');}
await br.close();console.log('v177',ok,'pass',bad,'fail');process.exit(bad?1:0);})();
