// v1.7.6：正文字体 Noto Sans SC 子集（自托管）；用户输入/子集外字符整行走系统字体；子集覆盖语言包
const {chromium}=require('playwright-core');const fs=require('fs');const {spawnSync}=require('child_process');
const B='http://localhost:8765/daoqi-tixing/';let ok=0,bad=0;const T=(c,m)=>{c?ok++:(bad++,console.log('FAIL',m))};
(async()=>{
const R=__dirname+'/..';
const chk=spawnSync('python3',[R+'/tools/build_font_subset.py','--check'],{encoding:'utf8'});T(chk.status===0,'子集与语言包一致 '+chk.stdout+chk.stderr);
const cm=spawnSync('python3',['-c',`
import sys;from fontTools.ttLib import TTFont
need=set()
for l in ('zh','ro','en'):need|=set(open('${R}/js/i18n/'+l+'.js',encoding='utf-8').read())
need={c for c in need if c>' ' and not 0x1F000<=ord(c)}
for w in (400,700):
  cm=TTFont('${R}/fonts/NotoSansSC-%d.woff2'%w).getBestCmap();m=[c for c in need if ord(c) not in cm]
  if m:print(w,''.join(sorted(m)));sys.exit(1)
print('ok',len(need))`],{encoding:'utf8'});T(cm.status===0,'字体 cmap 覆盖三语言包全部字符 '+cm.stdout+cm.stderr);
const {COVER}=await import('../js/font-cover.js');const C=new Set(COVER);
const need=new Set();for(const f of ['js/i18n/zh.js','js/i18n/ro.js','js/i18n/en.js','index.html'])for(const ch of fs.readFileSync(R+'/'+f,'utf8'))if(/[\u3000-\u303f\u3400-\u9fff\uff00-\uffef]/.test(ch))need.add(ch);
const miss=[...need].filter(c=>!C.has(c));T(need.size>500&&!miss.length,'子集覆盖全部语言包汉字/全角标点 '+need.size+' 缺 '+miss.join(''));
for(const w of [400,700]){const s=fs.statSync(R+`/fonts/NotoSansSC-${w}.woff2`).size;T(s<120*1024,'woff2 '+w+' '+s);}
const sw=fs.readFileSync(R+'/sw.js','utf8');for(const a of ['fonts/NotoSansSC-400.woff2','fonts/NotoSansSC-700.woff2','js/fontfit.js','js/font-cover.js'])T(sw.includes(`'${a}'`),'SW 预缓存 '+a);
const html=fs.readFileSync(R+'/index.html','utf8');T(/rel="preload" href="\.\/fonts\/NotoSansSC-400\.woff2" as="font" type="font\/woff2" crossorigin/.test(html),'preload');
const css=fs.readFileSync(R+'/style.css','utf8');T((css.match(/font-family:"DQ Sans"[^}]*font-display:swap/g)||[]).length===2,'font-display swap');
const br=await chromium.launch({executablePath:'/usr/bin/google-chrome'});
const items=JSON.stringify([{id:'a1',cat:'doc',name:'护照',due:'2027-03-01',intensitySource:'cat'},{id:'a2',cat:'doc',name:'张堃的驾照𠀀',due:'2026-11-01',intensitySource:'cat'},{id:'a3',cat:'doc',name:'Pașaport Ștefan',due:'2027-05-01',intensitySource:'cat'}]);
const ctx=async(loc)=>{const c=await br.newContext({locale:loc,timezoneId:'Europe/Bucharest',viewport:{width:390,height:844}});
 await c.addInitScript(`localStorage.setItem('dq.settings.v1',JSON.stringify({obDone:true}));localStorage.setItem('dq.items.v2',${JSON.stringify(items)})`);
 const q=await c.newPage();const reqs=[];q.on('request',r=>reqs.push(r.url()));q.on('pageerror',e=>T(0,'pageerror '+e));return [c,q,reqs];};
const ff=(q,sel)=>q.$eval(sel,e=>getComputedStyle(e).fontFamily);
{const [c,q,reqs]=await ctx('zh-CN');await q.goto(B+'#/');await q.waitForTimeout(800);await q.evaluate(()=>document.fonts.ready);
 const fr=reqs.filter(u=>/NotoSansSC-\d+\.woff2/.test(u));T(fr.length&&fr.every(u=>u.startsWith(B+'fonts/')),'字体同源 '+fr);
 T(reqs.every(u=>u.startsWith('http://localhost:8765/')||/^(data|blob):/.test(u)),'只有同源请求');
 T(await q.evaluate(()=>document.fonts.check('16px "DQ Sans"','到期')),'DQ Sans 已加载');
 T((await ff(q,'body')).startsWith('"DQ Sans"'),'界面 body 用 Noto '+await ff(q,'body'));
 T((await ff(q,'.tabbar a span, [data-tab] span')).startsWith('"DQ Sans"'),'底栏文案用 Noto');
 // 每个含子集外字符的文字，所在元素都是系统字体；且这些元素所在的整行（.uc）里没有元素在用 DQ Sans
 const r=await q.evaluate(async()=>{const {covered,lineOf}=await import('./js/fontfit.js');const out={bad:[],n:0,mixed:[]};const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let x;
  while((x=w.nextNode())){const p=x.parentElement;if(!p||!x.data.trim()||p.closest('script,style'))continue;const f=getComputedStyle(p).fontFamily;
   if(!covered(x.data)){out.n++;if(f.startsWith('"DQ Sans"'))out.bad.push(x.data);const L=lineOf(p);
    L.querySelectorAll('*').forEach(e=>{if(getComputedStyle(e).fontFamily.startsWith('"DQ Sans"')&&[...e.childNodes].some(t=>t.nodeType===3&&t.data.trim()))out.mixed.push(e.textContent)});}}
  return out;});
 T(r.n>=2&&!r.bad.length,'子集外字符走系统字体 n='+r.n+' '+r.bad);T(!r.mixed.length,'同一行不混字体 '+r.mixed.slice(0,3));
 const rowF=await q.evaluate(()=>{const f=t=>[...document.querySelectorAll('b,h3,span')].find(e=>e.textContent===t);return [getComputedStyle(f('护照')).fontFamily,getComputedStyle(f('张堃的驾照𠀀')).fontFamily];});
 T(rowF[0].startsWith('"DQ Sans"')&&!rowF[1].includes('DQ Sans'),'普通名用 Noto，生僻字名整行系统 '+rowF);
 await q.goto(B+'#/edit/a2');await q.waitForTimeout(500);
 for(const s of ['input[name=name]','textarea','select'])if(await q.$(s))T(!(await ff(q,s)).includes('DQ Sans'),'输入控件系统字体 '+s+' '+await ff(q,s));
 T((await ff(q,'input[name=name]')).startsWith('system-ui'),'输入框系统字体栈');
 await q.goto(B+'#/settings');await q.waitForTimeout(400);T((await ff(q,'h1')).startsWith('"DQ Sans"'),'设置页标题 Noto');await c.close();}
for(const l of ['en-GB','ro-RO']){const [c,q]=await ctx(l);await q.goto(B+'#/');await q.waitForTimeout(500);T((await ff(q,'body')).startsWith('"DQ Sans"'),l+' 界面 Noto');T(!(await ff(q,'.uc')).includes('DQ Sans'),l+' 生僻字行系统字体');await q.goto(B+'#/new');await q.waitForTimeout(400);T(!(await ff(q,'input[name=name]')).includes('DQ Sans'),l+' 输入框系统字体');await c.close();}
await br.close();console.log('v176',ok,'pass',bad,'fail');process.exit(bad?1:0);})();
