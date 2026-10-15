import * as S from './store.js';
import {CATEGORIES,TEMPLATES,INTENSITY,remindDays,findTpl} from './templates.js';
import {daysLeft,status,label,todayStr,addDays,addMonths,parse,fmt,nice,valid} from './dates.js';
import {icon} from './icons.js';
import {toCSV,parseCSV,parseJSON,toJSON,download} from './io.js';

const $=s=>document.querySelector(s), view=$('#view');
const h=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ST={safe:'安全',soon:'临期',expired:'已过期'};
let homeSeg='all', calMonth=null, calSel=null;

function applyTheme(){const t=S.settings().theme;if(t&&t!=='auto')document.documentElement.dataset.theme=t;else delete document.documentElement.dataset.theme;}
function toast(m){const t=document.createElement('div');t.className='toast';t.textContent=m;document.body.appendChild(t);setTimeout(()=>t.remove(),1900);}
function enrich(){const soon=S.settings().soonDays;return S.all().map(it=>{const n=daysLeft(it.due);return {...it,n,st:status(n,soon)};}).sort((a,b)=>a.n-b.n);}
const cat=k=>CATEGORIES[k]||CATEGORIES.other;
const ci=(k,s=22)=>icon(CATEGORIES[k]?k:'other',s);
function top(title,{back=false,right=''}={}){return `<header class="top">${back?`<button class="icon-btn" data-back aria-label="返回">${icon('back',20)}</button>`:''}<h1>${title}</h1><div class="grow"></div>${right}</header>`;}
function row(it){return `<a class="row" href="#/item/${it.id}">
  <span class="ic" style="--c:${cat(it.cat).color}">${ci(it.cat)}</span>
  <span class="grow"><b class="ell">${h(it.name)}</b><small>${it.due}${it.qty?` · ${it.qty} 件`:''}${it.location?` · ${h(it.location)}`:''}</small></span>
  <span class="cd ${it.st}"><span class="num">${it.n<0?-it.n:it.n}</span><small>${it.n<0?'天前过期':it.n===0?'今天':'天'}</small></span></a>`;}
function ring(pct,size=148,w=14){const r=(size-w)/2,c=2*Math.PI*r;return `<svg class="ring" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
  <circle cx="${size/2}" cy="${size/2}" r="${r}" class="ring-bg" stroke-width="${w}" fill="none"/>
  <circle cx="${size/2}" cy="${size/2}" r="${r}" class="ring-fg" stroke-width="${w}" fill="none" stroke-linecap="round"
   stroke-dasharray="${c}" stroke-dashoffset="${c*(1-pct)}" transform="rotate(-90 ${size/2} ${size/2})"/></svg>`;}
// 今日应提醒的条目
function dueToday(items){return items.filter(it=>!it.handled&&(it.n<0?it.intensity==='strong':remindDays(it).includes(it.n)||it.n===0));}

function home(){
  const items=enrich(), act=items.filter(i=>!i.handled);
  const c={expired:0,soon:0,safe:0};act.forEach(i=>c[i.st]++);
  const pct=act.length?c.safe/act.length:1, todo=dueToday(items);
  const shown=homeSeg==='all'?items:items.filter(i=>i.st===homeSeg);
  const d=new Date();
  view.innerHTML=`${top(`<span class="micro">${d.getMonth()+1}月${d.getDate()}日 · 周${'日一二三四五六'[d.getDay()]}</span><br>到期提醒`)}
  <section class="card hero">
    <div class="ring-wrap">${ring(pct)}<div class="ring-txt"><span class="num big">${Math.round(pct*100)}<i>%</i></span><span class="micro">安全率</span></div></div>
    <div class="stats">
      <a href="#/" data-seg="expired" class="stat"><span class="dot expired"></span><span class="num">${c.expired}</span><small>已过期</small></a>
      <a href="#/" data-seg="soon" class="stat"><span class="dot soon"></span><span class="num">${c.soon}</span><small>${S.settings().soonDays} 天内到期</small></a>
      <a href="#/" data-seg="safe" class="stat"><span class="dot safe"></span><span class="num">${c.safe}</span><small>安全</small></a>
    </div>
  </section>
  ${todo.length?`<section class="card todo"><div class="micro">今日待处理 · ${todo.length}</div>${todo.slice(0,4).map(it=>`<a href="#/item/${it.id}" class="todo-row"><span class="il" style="color:${cat(it.cat).color}">${ci(it.cat,18)}<em>${h(it.name)}</em></span><span class="${it.st}">${label(it.n)}</span></a>`).join('')}</section>`:''}
  <div class="seg" role="tablist">${[['all','全部'],['soon','临期'],['expired','已过期'],['safe','安全']].map(([k,n])=>`<button data-seg="${k}" class="${homeSeg===k?'on':''}">${n}</button>`).join('')}</div>
  <section class="card list">${shown.map(row).join('')||`<div class="empty">${items.length?'这一栏没有条目':'还没有条目<br><a href="#/new">添加第一条</a> 或在设置里载入示例数据'}</div>`}</section>`;
  view.querySelectorAll('[data-seg]').forEach(b=>b.onclick=e=>{e.preventDefault();homeSeg=b.dataset.seg;home();});
}

function cats(){
  const items=enrich();
  view.innerHTML=`${top('分类')}<section class="grid">${Object.entries(CATEGORIES).map(([k,c])=>{
    const l=items.filter(i=>i.cat===k&&!i.handled),e=l.filter(i=>i.st==='expired').length,s=l.filter(i=>i.st==='soon').length,next=l.find(i=>i.n>=0);
    return `<a class="tile" href="#/cat/${k}" style="--c:${c.color}"><span class="tile-ic">${ci(k)}</span><b>${c.name}</b>
    <span class="badges">${e?`<em class="b expired">${e}</em>`:''}${s?`<em class="b soon">${s}</em>`:''}<span class="num cnt">${l.length}</span></span>
    <small class="ell">${next?`最近：${h(next.name)} · ${next.n} 天`:'暂无条目'}</small></a>`;}).join('')}</section>`;
}
function catList(k){
  const items=enrich().filter(i=>i.cat===k),c=cat(k);
  view.innerHTML=`${top(c.name,{back:true,right:`<a class="btn sm" href="#/new?cat=${k}">${icon('add',16)} 添加</a>`})}
  <section class="grid photo">${items.map(it=>`<a class="ptile" href="#/item/${it.id}"><span class="pic" style="--c:${c.color}">${ci(k,44)}</span><b class="ell">${h(it.name)}</b>
  <span class="${it.st}"><span class="num">${Math.abs(it.n)}</span> 天${it.n<0?'前':''}${it.qty?` <small class="muted">${it.qty} 件</small>`:''}</span></a>`).join('')||'<div class="empty card">这个分类还没有条目</div>'}</section>`;
}

function cal(){
  const items=enrich();if(!calMonth)calMonth=todayStr().slice(0,7);
  const [y,m]=calMonth.split('-').map(Number),first=new Date(y,m-1,1),days=new Date(y,m,0).getDate(),pad=first.getDay(),today=todayStr();
  const by={};items.forEach(i=>(by[i.due]=by[i.due]||[]).push(i));
  let cells='';for(let i=0;i<pad;i++)cells+='<span></span>';
  for(let d=1;d<=days;d++){const ds=fmt(new Date(y,m-1,d)),l=by[ds]||[];
    cells+=`<button data-d="${ds}" class="${ds===today?'today':''} ${ds===calSel?'sel':''}"><span class="num">${d}</span><span class="dots">${l.slice(0,3).map(i=>`<i class="${i.st}"></i>`).join('')}</span></button>`;}
  const monthItems=items.filter(i=>i.due.startsWith(calMonth)), list=calSel?(by[calSel]||[]):monthItems;
  view.innerHTML=`${top('日历')}<section class="card cal">
   <div class="cal-head"><button class="icon-btn" data-mv="-1">${icon('back',20)}</button><b class="num">${y} 年 ${m} 月</b><button class="icon-btn" data-mv="1">${icon('chev',20)}</button></div>
   <div class="cal-grid wk">${[...'日一二三四五六'].map(w=>`<span>${w}</span>`).join('')}</div><div class="cal-grid">${cells}</div>
   <div class="micro center">本月到期 ${monthItems.length} 项</div></section>
  <div class="micro pad">${calSel?nice(calSel):'本月到期'}</div>
  <section class="card list">${list.map(row).join('')||'<div class="empty">没有到期条目</div>'}</section>`;
  view.querySelectorAll('[data-mv]').forEach(b=>b.onclick=()=>{calMonth=addMonths(calMonth+'-01',+b.dataset.mv).slice(0,7);calSel=null;cal();});
  view.querySelectorAll('[data-d]').forEach(b=>b.onclick=()=>{calSel=calSel===b.dataset.d?null:b.dataset.d;cal();});
}

function detail(id){
  const it=enrich().find(i=>i.id===id);if(!it){location.hash='#/';return;}
  const c=cat(it.cat),tpl=findTpl(it.cat,it.name),plan=remindDays(it).filter(d=>d>=0);
  const lead=tpl?.lead;
  view.innerHTML=`${top('',{back:true,right:`<a class="icon-btn" href="#/edit/${it.id}" aria-label="编辑">${icon('edit',20)}</a>`})}
  <section class="card big-cd ${it.st}">
    <span class="tile-ic lg" style="--c:${c.color}">${ci(it.cat,34)}</span>
    <h2>${h(it.name)}</h2><div class="muted small">${c.name}${it.qty?` · ${it.qty} 件`:''}${it.location?` · ${h(it.location)}`:''}</div>
    <div class="cd-num num">${Math.abs(it.n)}<small>天</small></div>
    <div class="pill ${it.st}">${it.n<0?'已过期':it.n===0?'今天到期':'距离到期'} · ${ST[it.st]}</div>
    <div class="muted small">${nice(it.due)}</div>
    ${it.handled?`<div class="pill safe">${icon('check',14)} 已处理，提醒已停止</div>`:''}
  </section>
  <div class="actions"><button class="btn primary" id="renew">${icon('renew',20)}已续期</button>${it.intensity==='strong'&&!it.handled?`<button class="btn" id="handled">${icon('check',20)}已处理</button>`:''}</div>
  <section class="card kv">
    <div><span>提醒强度</span><b>${INTENSITY[it.intensity]?.name||'标准'}</b></div>
    <div><span>提前提醒</span><b>${it.intensity==='strong'?'提前 60 天起，最后一周每天':plan.length?plan.map(d=>d===0?'当天':d+' 天').join(' / '):'无'}</b></div>
    <div><span>下次提醒</span><b>${(()=>{const nx=plan.filter(d=>d<=it.n).sort((a,b)=>b-a)[0];return nx===undefined?(it.n<0?'已过期':'—'):addDays(it.due,-nx);})()}</b></div>
    <div><span>续期周期</span><b>${it.renewMonths?it.renewMonths+' 个月':'不重复'}</b></div>
    ${lead?`<div><span>建议提前办理</span><b>${lead} 天（${addDays(it.due,-lead)} 前）</b></div>`:''}
  </section>
  ${tpl?.docs?`<section class="card"><div class="micro">办理材料（参考）</div><p class="small">${h(tpl.docs)}</p></section>`:''}
  ${it.note?`<section class="card"><div class="micro">备注</div><p class="small">${h(it.note)}</p></section>`:''}
  <button class="btn danger ghost" id="del">${icon('trash',18)}删除</button>`;
  $('#renew').onclick=()=>{let months=it.renewMonths;
    if(!months){const v=prompt('续期多少个月？（例如 12）','12');if(!v)return;months=Number(v);if(!months)return;}
    const base=it.n<0?todayStr():it.due;const nx=addMonths(base,months);const raw=S.get(id);raw.due=nx;raw.handled=false;raw.renewMonths=raw.renewMonths||months;
    (raw.history=raw.history||[]).push({from:it.due,to:nx,at:todayStr()});S.upsert(raw);toast('已续期至 '+nx);detail(id);};
  $('#handled')&&($('#handled').onclick=()=>{const raw=S.get(id);raw.handled=true;S.upsert(raw);toast('已标记处理');detail(id);});
  $('#del').onclick=()=>{if(confirm(`删除「${it.name}」？`)){S.remove(id);toast('已删除');location.hash='#/';}};
}

function form(id,q){
  const ex=id?S.get(id):null,st=S.settings();
  const it=ex?{...ex}:{cat:q.get('cat')||'doc',name:'',due:addDays(todayStr(),30),intensity:'',customDays:[7,1],renewMonths:'',qty:'',location:'',note:''};
  if(!it.intensity)it.intensity=st.catIntensity[it.cat]||cat(it.cat).intensity;
  const draw=()=>{
    view.innerHTML=`${top(ex?'编辑':'新增',{back:true})}
    ${ex?'':`<div class="micro pad">选择模板</div><div class="chips">${Object.entries(CATEGORIES).map(([k,c])=>`<button data-cat="${k}" class="${it.cat===k?'on':''}">${ci(k,16)}${c.name}</button>`).join('')}</div>
    <div class="chips tpl">${TEMPLATES.filter(t=>t.cat===it.cat).map(t=>`<button data-tpl="${h(t.name)}" class="${it.name===t.name?'on':''}">${ci(t.cat,16)}${h(t.name)}</button>`).join('')}</div>`}
    <form class="card form" id="f">
      <label>名称<input name="name" required value="${h(it.name)}" placeholder="例如：居留卡"></label>
      <label>分类<select name="cat">${Object.entries(CATEGORIES).map(([k,c])=>`<option value="${k}" ${k===it.cat?'selected':''}>${c.name}</option>`).join('')}</select></label>
      <label>到期日<input type="date" name="due" required value="${it.due}"></label>
      <div class="lbl">提醒强度</div>
      <div class="seg">${Object.entries(INTENSITY).map(([k,v])=>`<button type="button" data-int="${k}" class="${it.intensity===k?'on':''}">${v.name}</button>`).join('')}</div>
      <p class="hint-l">${INTENSITY[it.intensity].desc}</p>
      ${it.intensity==='custom'?`<div class="chips wrap">${[90,60,30,14,7,3,1,0].map(d=>`<button type="button" data-cd="${d}" class="${it.customDays.includes(d)?'on':''}">${d?d+' 天':'当天'}</button>`).join('')}</div>`:''}
      <div class="two"><label>续期周期（月）<input name="renewMonths" type="number" min="0" value="${it.renewMonths??''}" placeholder="不重复"></label>
      <label>数量<input name="qty" type="number" min="0" value="${it.qty??''}" placeholder="可选"></label></div>
      <label>位置<input name="location" value="${h(it.location||'')}" placeholder="冰箱 / 抽屉 / 店里货架"></label>
      <label>备注<textarea name="note" rows="2">${h(it.note||'')}</textarea></label>
      <button class="btn primary block">保存</button>
    </form>`;
    const f=$('#f');const sync=()=>{const fd=new FormData(f);for(const[k,v]of fd)it[k]=v;};
    view.querySelectorAll('[data-cat]').forEach(b=>b.onclick=()=>{sync();it.cat=b.dataset.cat;it.name='';it.intensity=st.catIntensity[it.cat]||cat(it.cat).intensity;draw();});
    view.querySelectorAll('[data-tpl]').forEach(b=>b.onclick=()=>{sync();const t=findTpl(it.cat,b.dataset.tpl);it.name=t.name==='自定义'?'':t.name;it.renewMonths=t.renew||'';draw();});
    view.querySelectorAll('[data-int]').forEach(b=>b.onclick=()=>{sync();it.intensity=b.dataset.int;draw();});
    view.querySelectorAll('[data-cd]').forEach(b=>b.onclick=()=>{sync();const d=+b.dataset.cd;it.customDays=it.customDays.includes(d)?it.customDays.filter(x=>x!==d):[...it.customDays,d];draw();});
    f.onsubmit=e=>{e.preventDefault();sync();if(!valid(it.due))return toast('请选择到期日');
      it.renewMonths=it.renewMonths?Number(it.renewMonths):'';it.qty=it.qty?Number(it.qty):'';const saved=S.upsert(it);toast('已保存');location.hash='#/item/'+saved.id;};
  };draw();
}

function settings(){
  const st=S.settings(),n=S.all().length;
  view.innerHTML=`${top('设置')}
  <div class="micro pad">外观</div><section class="card"><div class="seg">${[['auto','跟随系统'],['light','浅色'],['dark','深色']].map(([k,v])=>`<button data-theme="${k}" class="${(st.theme||'auto')===k?'on':''}">${v}</button>`).join('')}</div></section>
  <div class="micro pad">临期阈值</div><section class="card"><div class="seg">${[7,14,30,60].map(d=>`<button data-soon="${d}" class="${st.soonDays==d?'on':''}">${d} 天</button>`).join('')}</div></section>
  <div class="micro pad">按分类统一提醒强度（新建条目默认值）</div><section class="card kv">${Object.entries(CATEGORIES).map(([k,c])=>`<div><span class="il" style="color:${c.color}">${ci(k,18)}<em>${c.name}</em></span>
   <select data-ci="${k}">${Object.entries(INTENSITY).filter(([x])=>x!=='custom').map(([x,v])=>`<option value="${x}" ${(st.catIntensity[k]||c.intensity)===x?'selected':''}>${v.name}</option>`).join('')}</select></div>`).join('')}
   <button class="btn sm" id="applyAll">应用到该分类已有条目</button></section>
  <div class="micro pad">备份 · 共 ${n} 条</div><section class="card btns">
   <button class="btn" id="ecsv">${icon('download',18)}导出 CSV</button><button class="btn" id="ejson">${icon('download',18)}导出 JSON</button>
   <label class="btn">${icon('upload',18)}导入 CSV / JSON<input type="file" id="imp" accept=".csv,.json,text/csv,application/json" hidden></label></section>
  <div class="micro pad">通知</div><section class="card il-row">${icon('bell',22)}<p class="small muted">浏览器推送、邮件兜底与家人同时提醒将在第二阶段提供。目前请打开 App 查看首页「今日待处理」。</p></section>
  <div class="micro pad">数据</div><section class="card btns"><button class="btn" id="demo">${icon('sparkle',18)}载入示例数据</button><button class="btn danger ghost" id="clear">${icon('trash',18)}清空全部</button></section>
  <p class="hint">数据只保存在本机浏览器 · v1</p>`;
  view.querySelectorAll('[data-theme]').forEach(b=>b.onclick=()=>{st.theme=b.dataset.theme;S.saveSettings(st);applyTheme();settings();});
  view.querySelectorAll('[data-soon]').forEach(b=>b.onclick=()=>{st.soonDays=+b.dataset.soon;S.saveSettings(st);settings();});
  view.querySelectorAll('[data-ci]').forEach(s=>s.onchange=()=>{st.catIntensity[s.dataset.ci]=s.value;S.saveSettings(st);toast('已保存');});
  $('#applyAll').onclick=()=>{const l=S.all();l.forEach(i=>{const v=st.catIntensity[i.cat];if(v&&i.intensity!=='custom')i.intensity=v;});S.replaceAll(l);toast('已应用');};
  $('#ecsv').onclick=()=>download(`到期提醒-${todayStr()}.csv`,toCSV(S.all()),'text/csv;charset=utf-8');
  $('#ejson').onclick=()=>download(`到期提醒-${todayStr()}.json`,toJSON(S.all()),'application/json');
  $('#imp').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{const t=await f.text();const l=/\.json$/i.test(f.name)||t.trim().startsWith('{')||t.trim().startsWith('[')?parseJSON(t):parseCSV(t);
    toast(`已导入 ${S.merge(l)} 条`);settings();}catch(err){toast('导入失败：'+err.message);}};
  $('#demo').onclick=()=>{seed();toast('已载入示例数据');settings();};
  $('#clear').onclick=()=>{if(confirm('清空全部条目？此操作不可撤销，建议先导出备份。')){S.replaceAll([]);settings();}};
}

function seed(){const t=todayStr(),D=n=>addDays(t,n);
  S.merge([
   {id:'d1',cat:'doc',name:'居留卡',due:D(38),intensity:'strong',renewMonths:60,note:'IGI 布加勒斯特，需提前预约'},
   {id:'d2',cat:'doc',name:'护照',due:D(412),intensity:'strong',renewMonths:120},
   {id:'d3',cat:'doc',name:'驾照',due:D(-3),intensity:'standard',renewMonths:120},
   {id:'d4',cat:'car',name:'RCA 交强险',due:D(6),intensity:'standard',renewMonths:12},
   {id:'d5',cat:'car',name:'ITP 车检',due:D(143),intensity:'standard',renewMonths:24},
   {id:'d6',cat:'car',name:'Rovinieta 公路费',due:D(21),intensity:'light',renewMonths:12},
   {id:'d7',cat:'food',name:'牛奶',due:D(1),intensity:'light',qty:2,location:'冰箱'},
   {id:'d8',cat:'food',name:'冷冻饺子',due:D(64),intensity:'light',qty:3,location:'冷冻层'},
   {id:'d9',cat:'med',name:'布洛芬',due:D(-12),intensity:'standard',qty:1,location:'药箱'},
   {id:'d10',cat:'shop',name:'老干妈辣酱',due:D(15),intensity:'light',qty:24,location:'货架 B2'},
   {id:'d11',cat:'bill',name:'视频会员',due:D(9),intensity:'custom',customDays:[3,1],renewMonths:12},
   {id:'d12',cat:'home',name:'洗衣机保修',due:D(230),intensity:'light'},
   {id:'d13',cat:'other',name:'春节机票',due:D(90),intensity:'standard',note:'提前 60 天关注价格'},
   {id:'d14',cat:'food',name:'鸡蛋',due:D(0),intensity:'light',qty:10,location:'冰箱'},
  ]);}

document.querySelectorAll('#tabbar [data-ic]').forEach(e=>e.innerHTML=icon(e.dataset.ic,e.dataset.ic==='add'?22:24));
function route(){
  applyTheme();const [path,qs]=(location.hash.slice(1)||'/').split('?'),q=new URLSearchParams(qs),p=path.split('/').filter(Boolean);
  const tab={'':'home',cats:'cats',cat:'cats',cal:'cal',settings:'settings',new:'new'}[p[0]||'']||'';
  document.querySelectorAll('#tabbar a').forEach(a=>a.classList.toggle('on',a.dataset.tab===tab));
  view.classList.remove('in');void view.offsetWidth;view.classList.add('in');window.scrollTo(0,0);
  if(!p[0])home();else if(p[0]==='cats')cats();else if(p[0]==='cat')catList(p[1]);else if(p[0]==='cal')cal();
  else if(p[0]==='item')detail(p[1]);else if(p[0]==='new')form(null,q);else if(p[0]==='edit')form(p[1],q);else if(p[0]==='settings')settings();else home();
  view.querySelectorAll('[data-back]').forEach(b=>b.onclick=()=>history.length>1?history.back():location.hash='#/');
}
if(new URLSearchParams(location.search).has('demo')&&!S.all().length)seed();
addEventListener('hashchange',route);route();
if('serviceWorker' in navigator&&location.protocol!=='file:')navigator.serviceWorker.register('./sw.js').catch(()=>{});
