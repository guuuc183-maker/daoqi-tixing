import * as S from './store.js';
import {CATEGORIES,TEMPLATES,INTENSITY,findTpl,PERISHABLE,CUSTOM_PRESET} from './templates.js';
import {daysLeft,label,todayStr,addDays,addMonths,fmt,nice,valid,parseInput,parse} from './dates.js';
import {catDefault,effInt,inferSource,remindDays,itemState,todoList,leadDays,effSoon,catSoon,globalSoon} from './logic.js';
import {icon} from './icons.js';
import {toCSV,parseCSV,parseJSON,toJSON,download,TEMPLATE_CSV} from './io.js';
import {toICS} from './ics.js';
import * as P from './photos.js';

const $=s=>document.querySelector(s), view=$('#view');
const h=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ST={safe:'安全',soon:'临期',expired:'已过期',ended:'已结束'};
const md=s=>{const [,m,d]=s.split('-');return `${+m}月${+d}日`;};
let afterRoute=null,homeSeg='all', calMonth=null, calSel=null, importState=null;
const st=()=>S.settings();
const cat=k=>CATEGORIES[k]||CATEGORIES.other;
const ci=(k,s=22)=>icon(CATEGORIES[k]?k:'other',s);

function applyTheme(){const t=st().theme;if(t&&t!=='auto')document.documentElement.dataset.theme=t;else delete document.documentElement.dataset.theme;}
// 通用 toast / 撤销条（5 秒）
let toastEl=null,toastTimer=null;
let errUntil=0;
function toast(m,undo,err){if(!err&&Date.now()<errUntil)return;if(err)errUntil=Date.now()+3000;toastEl?.remove();clearTimeout(toastTimer);const t=document.createElement('div');t.className='toast';
  t.innerHTML=`<span>${h(m)}</span>${undo?'<button>撤销</button>':''}`;document.body.appendChild(t);toastEl=t;
  if(undo)t.querySelector('button').onclick=()=>{if(S.undo()){t.remove();toast('已撤销');route();}else route();};
  if(err)t.classList.add('err');toastTimer=setTimeout(()=>t.remove(),undo?5000:err?3000:1900);}
function act(msg,fn){S.snapshot();fn();if(S.lastSaveFailed)return;toast(msg,true);updateBadge();}
// 底部弹出表单
function sheet(html,bind){closeSheet();const w=document.createElement('div');w.className='sheet-wrap';w.innerHTML=`<div class="sheet-bg"></div><div class="sheet">${html}</div>`;
  document.body.appendChild(w);w.querySelector('.sheet-bg').onclick=closeSheet;bind?.(w);return w;}
function closeSheet(){document.querySelector('.sheet-wrap')?.remove();}

function enrich(){const s=st();return S.all().map(it=>{inferSource(it,s);const n=daysLeft(it.due);return {...it,n,st:itemState(it,s)};}).sort((a,b)=>a.n-b.n);}
function top(title,{back=false,right=''}={}){return `<header class="top">${back?`<button class="icon-btn" data-back aria-label="返回">${icon('back',20)}</button>`:''}<h1>${title}</h1><div class="grow"></div>${right}</header>`;}
function row(it){return `<a class="row" href="#/item/${h(it.id)}">
  <span class="ic" style="--c:${cat(it.cat).color}">${ci(it.cat)}</span>
  ${it.photos?.length?`<img class="thumb" data-ph="${h(it.photos[0])}" alt="">`:''}<span class="grow"><b class="ell">${h(it.name)}</b><small>${h(it.due)}${it.qty?` · ${it.qty} 件`:''}${it.location?` · ${h(it.location)}`:''}${it.handledAt?' · 已处理':''}</small></span>
  <span class="cd ${it.st}"><span class="num">${it.n<0?-it.n:it.n}</span><small>${it.n<0?'天前过期':it.n===0?'今天':'天'}</small><i class="bar"></i></span></a>`;}
function ring(pct,size=148,w=14){const r=(size-w)/2,c=2*Math.PI*r;return `<svg class="ring" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
  <circle cx="${size/2}" cy="${size/2}" r="${r}" class="ring-bg" stroke-width="${w}" fill="none"/>
  <circle cx="${size/2}" cy="${size/2}" r="${r}" class="ring-fg" stroke-width="${w}" fill="none" stroke-linecap="round"
   stroke-dasharray="${c}" stroke-dashoffset="${c}" data-off="${c*(1-pct)}" transform="rotate(-90 ${size/2} ${size/2})"/></svg>`;}

const REASON={soon:'临期',expired:'已过期',today:'今天到期',remind:'',lead:'该办了',askRenew:'是否已续期？',snooze:'明天再提醒',weekly:'过期超 30 天 · 每周提醒'};
function todoRow(it){const tag=it.reason==='remind'||it.reason==='soon'?label(it.n):it.reason==='expired'?label(it.n):REASON[it.reason];
  return `<div class="todo-row" data-id="${h(it.id)}">
  <a href="#/item/${h(it.id)}" class="todo-main"><span class="ic sm" style="--c:${cat(it.cat).color}">${ci(it.cat,18)}</span>
   <span class="grow"><b class="ell">${h(it.name)}</b><small class="${it.n<0?'expired':it.n<=7?'soon':'muted'}">${h(tag)}${it.reason==='lead'||it.reason==='askRenew'?` · ${label(it.n)}`:''}${effInt(it,st())==='strong'?' · 强':''}</small></span></a>
  <div class="todo-act">${it.reason==='askRenew'?`<button data-a="renew">${icon('renew',16)}已续期</button><button data-a="noRenew">不再问</button>`:
   `<button data-a="done">${icon('check',16)}已处理</button><button data-a="more" class="more" aria-label="更多操作">⋯</button>`}</div></div>`;}
function bindTodo(root,rerender){root.querySelectorAll('.todo-row [data-a]').forEach(b=>b.onclick=e=>{e.preventDefault();const id=b.closest('.todo-row').dataset.id,a=b.dataset.a,it=S.get(id);
  if(a==='done'&&!b.dataset.anim&&!reduced()){const r=b.closest('.todo-row');b.dataset.anim=1;r.classList.add('leaving');return setTimeout(()=>b.click(),440);}
  if(a==='done')act(`已停止提醒「${it.name}」`,()=>S.patch(id,x=>{x.handledAt=todayStr();delete x.snoozeUntil;}));
  if(a==='snooze')act(`「${it.name}」明天再提醒`,()=>S.patch(id,x=>{x.snoozeUntil=addDays(todayStr(),1);}));
  if(a==='noRenew')act('已标记，不再询问',()=>S.patch(id,x=>{x.renewAsked=true;}));
  if(a==='renew')return renewFlow(id,rerender);
  if(a==='more'){const snoozed=b.closest('.later');return sheet(`<h3>${h(it.name)}</h3><p class="small muted">${h(label(daysLeft(it.due)))} · ${h(it.due)}</p>
    <div class="sheet-list"><button data-s="renew">${icon('renew',20)}已续期</button>${snoozed?'':`<button data-s="snooze">${icon('bell',20)}明天再提醒</button>`}<a href="#/item/${h(id)}">${icon('chev',20)}查看详情</a></div>`,w=>{
    w.querySelector('[data-s=renew]').onclick=()=>{closeSheet();renewFlow(id,rerender);};
    w.querySelector('[data-s=snooze]')&&(w.querySelector('[data-s=snooze]').onclick=()=>{closeSheet();act(`「${it.name}」明天再提醒`,()=>S.patch(id,x=>{x.snoozeUntil=addDays(todayStr(),1);}));rerender();});});}
  rerender();});}

const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
// 进场动效：每项错开 30ms，最多 8 项；圆环 420ms 填充
function hydrate(root=document){root.querySelectorAll('img[data-ph]:not([src])').forEach(img=>P.url(img.dataset.ph,img.dataset.kind||'thumb').then(u=>{if(u)img.src=u;else img.classList.add('missing');}).catch(()=>img.classList.add('missing')));}
function enter(){hydrate(view);const kids=[...view.children];kids.forEach((e,i)=>{e.classList.add('enter');e.style.setProperty('--i',Math.min(i,8));});
  view.querySelectorAll('.list .row').forEach((e,i)=>{e.classList.add('enter');e.style.setProperty('--i',Math.min(i,8));});
  fillRing();}
function fillRing(){requestAnimationFrame(()=>requestAnimationFrame(()=>view.querySelectorAll('.ring-fg[data-off]').forEach(c=>c.style.strokeDashoffset=c.dataset.off)));}
const EMPTY_TPL=[['居留卡','doc'],['RCA 交强险','car'],['ITP 车检','car'],['牛奶','food']];
function emptyState(){return `${top('到期提醒')}<section class="empty-state">
  <div class="empty-ring">${ring(0,120,12)}</div>
  <h2>还没有要盯着的日期</h2><p>从模板开始，10 秒加一条</p>
  <a class="btn primary cta" href="#/new">${icon('add',18)}添加第一条</a>
  <div class="tpl-quick">${EMPTY_TPL.map(([n,c])=>`<a href="#/new?tpl=${encodeURIComponent(n)}">${ci(c,16)}${n.replace(' 交强险','').replace(' 车检','')}</a>`).join('')}</div>
  <p class="small muted">也可以在 <a href="#/settings">设置</a> 里导入表格或载入示例数据</p></section>`;}
// 照片区块：缩略图 + 拍照/相册
function photoBlock(ids=[],inForm=false){ids=ids||[];const full=ids.length>=P.MAX_PHOTOS;
  return `<section class="${inForm?'photo-field':'card'} photos"><div class="micro">照片 · ${ids.length}/${P.MAX_PHOTOS}</div><div class="ph-grid">
   ${ids.map(id=>`<button type="button" class="ph" data-view="${h(id)}" aria-label="查看照片"><img data-ph="${h(id)}" alt=""></button>`).join('')}
   ${full?'':`<label class="ph add">${icon('add',20)}<span>拍照</span><input type="file" accept="image/*" capture="environment" data-addph hidden></label>
   <label class="ph add">${icon('upload',20)}<span>相册</span><input type="file" accept="image/*" data-addph hidden></label>`}</div>
   ${full?'<p class="small muted">每条最多 3 张照片</p>':''}</section>`;}
function photoErr(e){if(P.isQuota(e))toast('存储空间已满，照片没有保存。请删除一些照片或导出备份后再试',false,true);else toast(e?.message||'照片添加失败',false,true);}
function bindPhotos(root,getIds,onAdd,onDel){
  root.querySelectorAll('[data-addph]').forEach(inp=>inp.onchange=async()=>{const fs=[...inp.files];inp.value='';
    for(const f of fs){if(getIds().length>=P.MAX_PHOTOS){toast('每条最多 3 张照片');break;}try{toast('正在压缩照片…');await onAdd(f);}catch(e){photoErr(e);break;}}});
  root.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>viewer(b.dataset.view,onDel));}
function viewer(pid,onDel){document.querySelector('.viewer')?.remove();const v=document.createElement('div');v.className='viewer';v.setAttribute('role','dialog');
  v.innerHTML=`<img data-ph="${h(pid)}" data-kind="full" alt="照片"><div class="viewer-bar"><button class="btn" data-x>关闭</button><button class="btn danger" data-del>${icon('trash',18)}删除</button></div>`;
  document.body.appendChild(v);hydrate(v);const close=()=>v.remove();v.querySelector('[data-x]').onclick=close;v.onclick=e=>{if(e.target===v)close();};
  v.querySelector('[data-del]').onclick=()=>{close();onDel(pid);};}

function home(){
  const s=st(),items=enrich(),act=items.filter(i=>!i.handledAt);
  const c={expired:0,soon:0,safe:0};act.forEach(i=>c[i.st]++);
  const pct=act.length?c.safe/act.length:1,{todo}=todoList(S.all(),s);
  const shown=homeSeg==='all'?items:items.filter(i=>i.st===homeSeg);
  if(!items.length){view.innerHTML=emptyState();return;}
  const d=new Date(),ios=/iPhone|iPad|iPod/.test(navigator.userAgent)&&!navigator.standalone&&!s.iosTipClosed;
  view.innerHTML=`${top(`<span class="micro">${d.getMonth()+1}月${d.getDate()}日 · 周${'日一二三四五六'[d.getDay()]}</span><br>到期提醒`)}
  ${ios?`<div class="banner">添加到主屏幕，才能显示角标：点 Safari「分享」→「添加到主屏幕」<button class="x" id="iosx" aria-label="关闭">×</button></div>`:''}
  ${backupTip(s)}
  <div class="home-grid"><section class="card hero">
    <div class="ring-wrap">${ring(pct)}<div class="ring-txt"><span class="num big">${Math.round(pct*100)}<i>%</i></span><span class="micro">安全率</span></div></div>
    <div class="stats">
      <a href="#/" data-seg="expired" class="stat"><span class="dot expired"></span><span class="num">${c.expired}</span><small>已过期</small></a>
      <a href="#/" data-seg="soon" class="stat"><span class="dot soon"></span><span class="num">${c.soon}</span><small>临期</small></a>
      <a href="#/" data-seg="safe" class="stat"><span class="dot safe"></span><span class="num">${c.safe}</span><small>安全</small></a>
    </div>
  </section>
  <section class="card todo"><div class="todo-head"><span class="micro">今日待处理 · ${todo.length}</span>${todo.length>3?`<a href="#/todo" class="small">查看全部 ${todo.length} 条 ›</a>`:''}</div>
   ${todo.length?todo.slice(0,3).map(todoRow).join(''):`<div class="all-clear">${icon('check',18)} 今天没有要处理的</div>`}</section></div>
  <div class="seg" role="tablist">${[['all','全部'],['soon','临期'],['expired','已过期'],['safe','安全']].map(([k,n])=>`<button data-seg="${k}" class="${homeSeg===k?'on':''}">${n}</button>`).join('')}</div>
  <section class="card list">${shown.map(row).join('')||`<div class="empty">${items.length?'这一栏没有条目':'还没有条目<br><a href="#/new">添加第一条</a> 或在设置里载入示例数据'}</div>`}</section>`;
  view.querySelectorAll('[data-seg]').forEach(b=>b.onclick=e=>{e.preventDefault();homeSeg=b.dataset.seg;home();});
  $('#iosx')&&($('#iosx').onclick=()=>{const x=st();x.iosTipClosed=true;S.saveSettings(x);home();});
  $('#bkx')&&($('#bkx').onclick=()=>{const x=st();x.backupTipAt=new Date().toISOString();S.saveSettings(x);home();});
  $('#bkgo')&&($('#bkgo').onclick=()=>{exportJSON();home();});
  bindTodo(view,home);fillRing();hydrate(view);
}
// P1-2 备份提醒
function backupTip(s){const n=S.all().length,last=Math.max(Date.parse(s.lastExportAt||0)||0,Date.parse(s.backupTipAt||0)||0,Date.parse(s.firstUseAt||0)||0);
  return n>=10&&Date.now()-last>30*864e5?`<div class="banner">已有 ${n} 条记录，建议备份一下 <button class="btn sm" id="bkgo">导出</button><button class="x" id="bkx" aria-label="关闭">×</button></div>`:'';}

function todoPage(){const {todo,later}=todoList(S.all(),st());
  view.innerHTML=`${top('今日待处理',{back:true})}<section class="card todo">${todo.map(todoRow).join('')||`<div class="all-clear">${icon('check',18)} 今天没有要处理的</div>`}</section>
  ${later.length?`<div class="micro pad">稍后 · ${later.length}</div><section class="card todo later">${later.map(todoRow).join('')}</section>`:''}`;
  bindTodo(view,todoPage);}

function cats(){
  const items=enrich();
  view.innerHTML=`${top('分类')}<section class="grid">${Object.entries(CATEGORIES).map(([k,c])=>{
    const l=items.filter(i=>i.cat===k&&!i.handledAt),e=l.filter(i=>i.st==='expired').length,s=l.filter(i=>i.st==='soon').length,next=l.find(i=>i.n>=0)||l[0];
    return `<a class="tile" href="#/cat/${k}" style="--c:${c.color}"><span class="tile-ic">${ci(k)}</span><b>${c.name}</b>
    <span class="badges">${e?`<em class="b expired">${e}</em>`:''}${s?`<em class="b soon">${s}</em>`:''}<span class="num cnt">${l.length}</span></span>
    <small class="ell">${next?`最近：${h(next.name)} · ${next.n<0?`已过期 ${-next.n} 天`:next.n===0?'今天到期':`${next.n} 天`}`:'暂无条目'}</small></a>`;}).join('')}</section>`;
}
function catList(k){
  const items=enrich().filter(i=>i.cat===k),c=cat(k);
  view.innerHTML=`${top(c.name,{back:true,right:`<a class="btn sm" href="#/new?cat=${k}">${icon('add',16)} 添加</a>`})}
  <section class="grid photo">${items.map(it=>`<a class="ptile" href="#/item/${h(it.id)}"><span class="pic" style="--c:${c.color}">${ci(k,44)}</span><b class="ell">${h(it.name)}</b>
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
  view.innerHTML=`${top('日历',{right:`<button class="btn sm" id="ics">${icon('cal',16)} 导出到日历</button>`})}<section class="card cal">
   <div class="cal-head"><button class="icon-btn" data-mv="-1">${icon('back',20)}</button><b class="num">${y} 年 ${m} 月</b><button class="icon-btn" data-mv="1">${icon('chev',20)}</button></div>
   <div class="cal-grid wk">${[...'日一二三四五六'].map(w=>`<span>${w}</span>`).join('')}</div><div class="cal-grid">${cells}</div>
   <div class="micro center">本月到期 ${monthItems.length} 项</div></section>
  <div class="micro pad">${calSel?nice(calSel):'本月到期'}</div>
  <section class="card list">${list.map(row).join('')||'<div class="empty">没有到期条目</div>'}</section>`;
  view.querySelectorAll('[data-mv]').forEach(b=>b.onclick=()=>{calMonth=addMonths(calMonth+'-01',+b.dataset.mv).slice(0,7);calSel=null;cal();});
  view.querySelectorAll('[data-d]').forEach(b=>b.onclick=()=>{calSel=calSel===b.dataset.d?null:b.dataset.d;cal();});
  $('#ics').onclick=icsSheet;
}

// 已续期：有周期一键顺延，否则底部表单
function doRenew(id,months,remember){const it=S.get(id),n=daysLeft(it.due),base=n<0?todayStr():it.due,nx=addMonths(base,months);
  act(`已续期至 ${nx}`,()=>S.patch(id,x=>{(x.history=x.history||[]).push({from:x.due,to:nx,at:todayStr()});x.due=nx;delete x.handledAt;delete x.snoozeUntil;delete x.renewAsked;if(remember)x.renewMonths=months;}));}
function renewFlow(id,after){const it=S.get(id);
  if(it.renewMonths){doRenew(id,it.renewMonths);after?.();return;}
  sheet(`<h3>续期「${h(it.name)}」</h3><p class="small muted">当前到期日 ${h(it.due)}${daysLeft(it.due)<0?'（已过期，从今天起算）':''}</p>
   <div class="chips wrap">${[[1,'+1月'],[6,'+6月'],[12,'+1年'],[24,'+2年']].map(([m,l])=>`<button data-m="${m}">${l}</button>`).join('')}</div>
   <label class="small">或选日期<input type="date" id="rdate" class="inp"></label>
   <p class="small expired" id="rerr"></p><label class="check"><input type="checkbox" id="rem" checked> 记住这个周期，下次一键顺延</label>
   <button class="btn primary block" id="rok" disabled>确定</button>`,w=>{let pick=null;
    w.querySelectorAll('[data-m]').forEach(b=>b.onclick=()=>{pick=+b.dataset.m;w.querySelectorAll('[data-m]').forEach(x=>x.classList.toggle('on',x===b));w.querySelector('#rdate').value='';w.querySelector('#rok').disabled=false;});
    w.querySelector('#rdate').onchange=e=>{pick=null;w.querySelectorAll('[data-m]').forEach(x=>x.classList.remove('on'));const v=e.target.value,bad=v&&v<=it.due;w.querySelector('#rok').disabled=!v||bad;w.querySelector('#rerr').textContent=bad?`新日期要晚于当前到期日 ${it.due}`:'';};
    w.querySelector('#rok').onclick=()=>{const rem=w.querySelector('#rem').checked;closeSheet();
      if(pick)doRenew(id,pick,rem);else{const d=w.querySelector('#rdate').value;
        act(`已续期至 ${d}`,()=>S.patch(id,x=>{(x.history=x.history||[]).push({from:x.due,to:d,at:todayStr()});
          if(rem){const a=parse(x.due),b=parse(d);const mm=(b.getFullYear()-a.getFullYear())*12+b.getMonth()-a.getMonth();if(mm>0)x.renewMonths=mm;}
          x.due=d;delete x.handledAt;delete x.snoozeUntil;delete x.renewAsked;}));}
      after?.();};});}

function detail(id){
  const it=enrich().find(i=>i.id===id);if(!it){location.hash='#/';return;}
  const s=st(),c=cat(it.cat),tpl=findTpl(it.cat,it.name),plan=remindDays(it,s).filter(d=>d>=0),ei=effInt(it,s),lead=leadDays(it);
  const nx=plan.filter(d=>d<=it.n).sort((a,b)=>b-a)[0];
  view.innerHTML=`${top('',{back:true,right:`<a class="icon-btn" href="#/edit/${h(it.id)}" aria-label="编辑">${icon('edit',20)}</a>`})}
  <section class="card big-cd ${it.st}">
    <span class="tile-ic lg" style="--c:${c.color}">${ci(it.cat,34)}</span>
    <h2>${h(it.name)}</h2><div class="muted small">${c.name}${it.qty?` · ${it.qty} 件`:''}${it.location?` · ${h(it.location)}`:''}</div>
    <div class="cd-num num">${Math.abs(it.n)}<small>天</small></div>
    <div class="pill ${it.st}">${it.n<0?'已过期':it.n===0?'今天到期':'距离到期'} · ${ST[it.st]}</div>
    <div class="muted small">${nice(it.due)}</div>
  </section>
  ${it.handledAt?`<div class="card handled">${icon('check',18)}<span class="grow">已处理（${h(md(it.handledAt))}）· 本周期不再提醒</span><button class="btn sm" id="unhandle">恢复提醒</button></div>`:''}
  <div class="actions"><button class="btn primary" id="renew">${icon('renew',20)}已续期</button>${it.handledAt?'':`<button class="btn" id="handled">${icon('check',20)}已处理</button>`}</div>
  ${PERISHABLE.includes(it.cat)?`<div class="actions sub"><button class="btn" id="rebuy">${icon('add',18)}再买一次</button></div>`:''}
  <section class="card kv">
    <div><span>提醒强度</span><b>${INTENSITY[ei].name}<small class="muted"> · ${it.intensitySource==='item'?'单独设置':'跟随分类'}</small></b></div>
    <div><span>提前提醒</span><b>${ei==='strong'?'提前 60 天起，最后一周每天':plan.length?plan.map(d=>d===0?'当天':d+' 天').join(' / '):'无'}</b></div>
    <div><span>下次提醒</span><b>${it.handledAt?'已停止':nx===undefined?(it.n<0?'每天（直到处理）':'—'):addDays(it.due,-nx)}</b></div>
    <div><span>临期阈值</span><b>${effSoon(it,s)} 天<small class="muted"> · ${it.soonSource==='item'?'单独设置':'跟随分类'}</small></b></div>
    <div><span>续期周期</span><b>${it.renewMonths?it.renewMonths+' 个月':'不重复'}</b></div>
    ${it.prodDate?`<div><span>生产日期</span><b>${h(it.prodDate)}${it.shelfDays?` · 保质期 ${it.shelfDays} 天`:''}</b></div>`:''}
    ${lead?`<div><span>建议开始办理</span><b>${md(addDays(it.due,-lead))} 前（提前 ${lead} 天）</b></div>`:''}
    <button class="btn ghost cal-btn" id="ics1">${icon('cal',18)}加入日历</button>
  </section>
  ${photoBlock(it.photos)}
  ${tpl?.docs?`<section class="card"><div class="micro">办理材料（参考）</div><p class="small">${h(tpl.docs)}</p><p class="small muted">以官方为准（IGI / 使馆 / RAR 等）</p></section>`:''}
  ${it.note?`<section class="card"><div class="micro">备注</div><p class="small">${h(it.note)}</p></section>`:''}
  ${it.history?.length?`<section class="card"><div class="micro">续期记录</div>${it.history.slice().reverse().map(x=>`<p class="small">${h(x.at)}：${h(x.from)} → ${h(x.to)}</p>`).join('')}</section>`:''}
  <button class="btn danger ghost" id="del">${icon('trash',18)}删除</button>`;
  $('#renew').onclick=()=>renewFlow(id,()=>detail(id));
  bindPhotos(view,()=>S.get(id).photos||[],async f=>{const pid=await P.addPhoto(id,f);if(!S.patch(id,x=>{x.photos=[...(x.photos||[]),pid].slice(0,P.MAX_PHOTOS);}))return;toast('照片已添加');detail(id);},
    pid=>{act('已删除照片',()=>S.patch(id,x=>{x.photos=(x.photos||[]).filter(p=>p!==pid);}));detail(id);});hydrate(view);
  $('#handled')&&($('#handled').onclick=()=>{act('已停止提醒',()=>S.patch(id,x=>{x.handledAt=todayStr();delete x.snoozeUntil;}));detail(id);});
  $('#unhandle')&&($('#unhandle').onclick=()=>{act('已恢复提醒',()=>S.patch(id,x=>{delete x.handledAt;delete x.renewAsked;}));detail(id);});
  $('#rebuy')&&($('#rebuy').onclick=()=>{const raw=S.get(id);const created=(raw.prodDate||raw.createdAt||todayStr()).slice(0,10);
    const shelf=raw.shelfDays||Math.max(1,daysLeft(raw.due,created));
    sessionStorage.setItem('dq.prefill',JSON.stringify({cat:raw.cat,name:raw.name,intensity:raw.intensity,intensitySource:raw.intensitySource,customDays:raw.customDays,location:raw.location,qty:raw.qty,shelfDays:shelf,due:addDays(todayStr(),shelf),rebuyFrom:id}));
    location.hash='#/new';});
  $('#ics1').onclick=()=>download(`${it.name}.ics`,toICS([S.get(id)],s),'text/calendar;charset=utf-8');
  $('#del').onclick=()=>{act(`已删除「${it.name}」`,()=>S.softDelete([id]));location.hash='#/';};
}

function form(id,q){
  const ex=id?S.get(id):null,s=st();
  let pre=null;if(!ex){try{pre=JSON.parse(sessionStorage.getItem('dq.prefill'))}catch{}sessionStorage.removeItem('dq.prefill');}
  const it=ex?inferSource({...ex},s):Object.assign({cat:q.get('cat')||'doc',name:'',due:'',intensitySource:'cat',soonSource:'cat',customDays:[],renewMonths:'',qty:'',location:'',note:'',prodDate:'',shelfDays:''},pre||{});
  if(pre&&q.get('cat'))it.cat=q.get('cat');
  if(!it.id)it.id=S.uid();if(pre)it.photos=[];
  {const tq=q.get('tpl'),t=tq&&TEMPLATES.find(x=>x.name===tq);if(t&&!ex){it.cat=t.cat;it.name=t.name;it.renewMonths=t.renew||'';}}
  let dueText=it.due||'',chain=false,shelfUnit='d',shelfN=it.shelfDays||'';
  const draw=(focus)=>{const ei=effInt(it,s),per=PERISHABLE.includes(it.cat);
    view.innerHTML=`${top(ex?'编辑':it.rebuyFrom?'再买一次':'新增',{back:true})}
    ${ex?'':`<div class="micro pad">选择模板</div><div class="chips">${Object.entries(CATEGORIES).map(([k,c])=>`<button data-cat="${k}" class="${it.cat===k?'on':''}">${ci(k,16)}${c.name}</button>`).join('')}</div>
    <div class="chips tpl ${TEMPLATES.filter(t=>t.cat===it.cat).length<=8?'wrap':''}">${TEMPLATES.filter(t=>t.cat===it.cat).map(t=>`<button data-tpl="${h(t.name)}" class="${it.name===t.name?'on':''}">${ci(t.cat,16)}${h(t.name)}</button>`).join('')}</div>`}
    <form class="card form" id="f" novalidate>
      <label>名称<input name="name" maxlength="60" required value="${h(it.name)}" placeholder="例如：居留卡"></label>
      <label>分类<select name="cat">${Object.entries(CATEGORIES).map(([k,c])=>`<option value="${k}" ${k===it.cat?'selected':''}>${c.name}</option>`).join('')}</select></label>
      ${per?`<div class="two"><label>生产日期<input name="prodDate" id="prod" inputmode="numeric" value="${h(it.prodDate||'')}" placeholder="可选，如 01.10.2026"></label>
        <label>保质期<span class="shelf"><input id="shelfN" type="number" min="1" value="${h(shelfN)}" placeholder="—"><select id="shelfU"><option value="d" ${shelfUnit==='d'?'selected':''}>天</option><option value="m" ${shelfUnit==='m'?'selected':''}>月</option></select></span></label></div>`:''}
      <label>到期日<span class="date-field"><input id="dueT" inputmode="numeric" autocomplete="off" value="${h(dueText)}" placeholder="15.10.2026 或 10/26">
        <span class="date-pick">${icon('cal',20)}<input type="date" id="dueP" value="${valid(it.due||'')?it.due:''}" aria-label="选日期"></span></span></label>
      <div id="dueHint" class="hint-l"></div>
      <div class="chips wrap quick">${[['7d','+7天'],['1m','+1月'],['3m','+3月'],['1y','+1年'],['2y','+2年']].map(([k,l])=>`<button type="button" data-q="${k}">${l}</button>`).join('')}<button type="button" data-q="clr" class="ghost">清除</button></div>
      <div class="lbl">提醒强度 <span class="src">${it.intensitySource==='item'?`已单独设置 · <a href="#" id="follow">恢复跟随分类</a>`:`跟随分类：${cat(it.cat).name} · ${INTENSITY[catDefault(it.cat,s)].name}`}</span></div>
      <div class="seg">${Object.entries(INTENSITY).map(([k,v])=>`<button type="button" data-int="${k}" class="${ei===k?'on':''}">${v.name}</button>`).join('')}</div>
      <p class="hint-l">${INTENSITY[ei].desc}</p>
      ${ei==='custom'?`<div class="chips wrap">${[90,60,30,14,7,3,1,0].map(d=>`<button type="button" data-cd="${d}" class="${(it.customDays||[]).includes(d)?'on':''}">${d?d+' 天':'当天'}</button>`).join('')}</div>`:''}
      <div class="lbl">临期阈值 <span class="src">${it.soonSource==='item'?'已单独设置':`跟随分类：${cat(it.cat).name} · ${catSoon(it.cat,s)} 天`}</span></div>
      <div class="seg soon-seg"><button type="button" data-ss="cat" class="${it.soonSource!=='item'?'on':''}">跟随分类（${catSoon(it.cat,s)} 天）</button><button type="button" data-ss="item" class="${it.soonSource==='item'?'on':''}">自定义</button></div>
      ${it.soonSource==='item'?`<label class="inline-n">剩余 <input name="soonDays" type="number" min="0" max="3650" value="${h(it.soonDays??'')}" required> 天内算临期</label>`:''}
      <div class="two"><label>续期周期（月）<input name="renewMonths" type="number" min="0" value="${it.renewMonths??''}" placeholder="不重复"></label>
      <label>数量<input name="qty" type="number" min="0" value="${it.qty??''}" placeholder="可选"></label></div>
      ${photoBlock(it.photos,true)}
      <label>位置<input name="location" maxlength="40" value="${h(it.location||'')}" placeholder="冰箱 / 抽屉 / 店里货架"></label>
      <label>备注<textarea name="note" maxlength="500" rows="2">${h(it.note||'')}</textarea></label>
      <button class="btn primary block" data-save="1">保存</button>
      ${ex?'':`<button type="button" class="btn block" id="saveMore">保存并再加一条</button>`}
    </form>`;
    const f=$('#f'),dueT=$('#dueT');
    const sync=()=>{const fd=new FormData(f);for(const[k,v]of fd)it[k]=v;dueText=dueT.value;if($('#shelfN')){shelfN=$('#shelfN').value;shelfUnit=$('#shelfU').value;}};
    const hint=()=>{const v=parseInput(dueT.value),e=$('#dueHint');it.due=v||'';
      if(!dueT.value){e.className='hint-l';e.textContent='支持 15.10.2026、2026-10-15、151026、10/26（月/年）';}
      else if(!v){e.className='hint-l err';e.textContent='看不懂这个日期，试试 15.10.2026';}
      else{const n=daysLeft(v);e.className='hint-l '+(n<0?'warn':'ok');e.textContent=`= ${nice(v)} · ${label(n)}${n<0?'（已经过期，确定吗？可以补录）':''}`;}};
    const setDue=v=>{dueT.value=v.split('-').reverse().join('.');$('#dueP').value=v;hint();};
    dueT.oninput=()=>{chain=false;hint();const v=parseInput(dueT.value);if(v)$('#dueP').value=v;};
    $('#dueP').onchange=e=>{if(e.target.value){chain=false;setDue(e.target.value);}};
    $('.date-pick').onclick=e=>{if(e.target.id!=='dueP'){try{$('#dueP').showPicker()}catch{}}};
    const calcShelf=()=>{const p=parseInput($('#prod')?.value),n=+$('#shelfN')?.value;if(p&&n){const d=$('#shelfU').value==='m'?addMonths(p,n):addDays(p,n);it.shelfDays=daysLeft(d,p);setDue(d);}};
    if($('#prod')){$('#prod').oninput=calcShelf;$('#shelfN').oninput=calcShelf;$('#shelfU').onchange=calcShelf;}
    view.querySelectorAll('[data-q]').forEach(b=>b.onclick=()=>{const k=b.dataset.q;if(k==='clr'){chain=false;dueT.value='';$('#dueP').value='';hint();return;}
      const base=chain&&it.due?it.due:(parseInput($('#prod')?.value)||todayStr());const n=+k.slice(0,-1),u=k.slice(-1);
      setDue(u==='d'?addDays(base,n):addMonths(base,u==='m'?n:n*12));chain=true;});
    hint();if(focus==='due'){dueT.focus();}
    view.querySelectorAll('[data-cat]').forEach(b=>b.onclick=()=>{sync();it.cat=b.dataset.cat;it.name='';draw();});
    f.querySelector('[name=cat]').onchange=()=>{sync();draw();};
    view.querySelectorAll('[data-tpl]').forEach(b=>b.onclick=()=>{sync();const t=findTpl(it.cat,b.dataset.tpl);it.name=t.name==='自定义'?'':t.name;it.renewMonths=t.renew||'';draw('due');});
    view.querySelectorAll('[data-int]').forEach(b=>b.onclick=()=>{sync();it.intensity=b.dataset.int;it.intensitySource='item';
      if(it.intensity==='custom'&&!(it.customDays||[]).length)it.customDays=(CUSTOM_PRESET[it.cat]||[7,1]).slice();draw();});
    $('#follow')&&($('#follow').onclick=e=>{e.preventDefault();sync();it.intensitySource='cat';delete it.intensity;draw();});
    bindPhotos(view,()=>it.photos||[],async f=>{sync();const pid=await P.addPhoto(it.id,f);it.photos=[...(it.photos||[]),pid].slice(0,P.MAX_PHOTOS);draw();},pid=>{sync();it.photos=(it.photos||[]).filter(p=>p!==pid);draw();});hydrate(view);
    view.querySelectorAll('[data-ss]').forEach(b=>b.onclick=()=>{sync();it.soonSource=b.dataset.ss;if(it.soonSource==='item'&&(it.soonDays===''||it.soonDays==null))it.soonDays=catSoon(it.cat,s);draw();});
    view.querySelectorAll('[data-cd]').forEach(b=>b.onclick=()=>{sync();const d=+b.dataset.cd,cd=it.customDays||[];it.customDays=cd.includes(d)?cd.filter(x=>x!==d):[...cd,d];draw();});
    const save=more=>{sync();hint();const due=parseInput(dueT.value);if(!it.name.trim())return toast('请填写名称');if(!due)return toast('请填写有效的到期日');
      it.due=due;it.name=it.name.trim().slice(0,60);if(it.intensitySource==='cat')delete it.intensity;
      if(ex&&ex.due!==due){delete it.handledAt;delete it.snoozeUntil;delete it.renewAsked;}
      if(it.soonSource==='item'){const v=Number(it.soonDays);if(!Number.isInteger(v)||v<0||v>3650)return toast('临期天数要是 0–3650 的整数');it.soonDays=v;}else{it.soonSource='cat';delete it.soonDays;}
      for(const k of ['renewMonths','qty','shelfDays'])it[k]=it[k]===''||it[k]==null?'':Number(it[k]);
      it.prodDate=parseInput(it.prodDate)||'';const from=it.rebuyFrom;delete it.rebuyFrom;
      const saved=S.upsert(it);if(!saved)return;updateBadge();
      if(more){toast('已保存，继续添加');sessionStorage.setItem('dq.prefill',JSON.stringify({cat:it.cat,intensity:it.intensity,intensitySource:it.intensitySource,customDays:it.customDays,location:it.location}));route();return;}
      if(from&&S.get(from)&&!S.get(from).deletedAt){afterRoute=()=>sheet(`<h3>旧的这批用完了吗？</h3><p class="small muted">「${h(S.get(from).name)}」到期 ${h(S.get(from).due)}</p><div class="actions"><button class="btn primary" id="used">用完了，移入回收站</button><button class="btn" id="keep">还有，保留</button></div>`,w=>{
          w.querySelector('#used').onclick=()=>{closeSheet();act('旧批次已移入回收站',()=>S.softDelete([from]));};w.querySelector('#keep').onclick=closeSheet;});location.hash='#/item/'+saved.id;return;}
      toast('已保存');location.hash='#/item/'+saved.id;};
    f.onsubmit=e=>{e.preventDefault();save(false);};$('#saveMore')&&($('#saveMore').onclick=()=>save(true));
  };draw(it.rebuyFrom?'due':null);
}

async function exportJSON(all,withPhotos=true){const s=st(),items=all?S.raw():S.all();let photos=null;
  if(withPhotos&&globalThis.indexedDB){try{photos=await P.exportPhotos(items.flatMap(i=>i.photos||[]));}catch{toast('照片读取失败，本次只导出文字数据',false,true);}}
  download(`到期提醒-${todayStr()}.json`,toJSON(items,photos),'application/json');s.lastExportAt=new Date().toISOString();S.saveSettings(s);}
function icsSheet(){sheet(`<h3>导出到日历（.ics）</h3><p class="small muted">每条生成一个全天事件，并按提醒天数设好闹钟（当天 09:00）。iPhone：下载后点文件 →「添加到日历」。续期后请重新导出这一条。</p>
  <label class="small">范围<select id="icsR" class="inp"><option value="">全部（${S.all().length} 条）</option>${Object.entries(CATEGORIES).map(([k,c])=>`<option value="${k}">${c.name}（${S.all().filter(i=>i.cat===k).length}）</option>`).join('')}</select></label>
  <label class="check"><input type="checkbox" id="icsH"> 包含已处理的条目</label><button class="btn primary block" id="icsGo">${icon('download',18)}下载 .ics</button>`,w=>{
  w.querySelector('#icsGo').onclick=()=>{const r=w.querySelector('#icsR').value,hd=w.querySelector('#icsH').checked;
    const l=S.all().filter(i=>(!r||i.cat===r)&&(hd||!i.handledAt));download(`到期提醒${r?'-'+cat(r).name:''}.ics`,toICS(l,st()),'text/calendar;charset=utf-8');closeSheet();toast(`已导出 ${l.length} 个日历事件`);};});}

// 导入：先预览，再确认
function analyzeImport(res){const ex=S.all(),seen=new Set(ex.map(i=>i.name+'|'+i.due)),ids=new Set(S.raw().map(i=>i.id));const out={add:[],upd:[],dup:[],bad:res.errors};
  for(const r of res.items){const it=r.item;if(it.id&&ids.has(it.id))out.upd.push(r);else if(seen.has(it.name+'|'+it.due))out.dup.push(r);else{out.add.push(r);seen.add(it.name+'|'+it.due);}}return out;}
function importPreview(){const a=importState.a,n=a.add.length+a.upd.length+a.dup.length+a.bad.length;
  return `<section class="card imp"><div class="micro">导入预览 · ${h(importState.file)}</div>
  <p>识别 <b class="num">${n}</b> 条${importState.photos?`（含照片 ${Object.keys(importState.photos).length} 张）`:''}：新增 <b class="safe">${a.add.length}</b> · 更新 ${a.upd.length}（同 id）· 疑似重复 <b class="soon">${a.dup.length}</b>（同名+同到期日）· 无法识别 <b class="expired">${a.bad.length}</b></p>
  ${a.bad.length||a.dup.length?`<details><summary class="small">查看明细</summary>${a.bad.map(e=>`<p class="small expired">第 ${e.row} 行：${h(e.reason)}</p>`).join('')}${a.dup.map(e=>`<p class="small soon">第 ${e.row} 行：「${h(e.item.name)} ${h(e.item.due)}」疑似重复</p>`).join('')}</details>`:''}
  ${a.dup.length?`<div class="seg"><button data-dup="skip" class="${importState.dup==='skip'?'on':''}">跳过重复</button><button data-dup="keep" class="${importState.dup==='keep'?'on':''}">仍导入</button></div>`:''}
  <div class="actions"><button class="btn primary" id="impGo">导入</button><button class="btn" id="impNo">取消</button></div></section>`;}

function settings(){
  const s=st(),n=S.all().length,tr=S.trash().length,badgeOK='setAppBadge' in navigator;
  const nItem=k=>S.all().filter(i=>i.cat===k&&inferSource(i,s).intensitySource==='item').length;
  view.innerHTML=`${top('设置')}
  ${importState?importPreview():''}
  <div class="micro pad">外观</div><section class="card"><div class="seg">${[['auto','跟随系统'],['light','浅色'],['dark','深色']].map(([k,v])=>`<button data-theme="${k}" class="${(s.theme||'auto')===k?'on':''}">${v}</button>`).join('')}</div></section>
  <div class="micro pad">全局临期阈值（未单独设置的分类）</div><section class="card"><div class="seg">${[7,14,30,60].map(d=>`<button data-soon="${d}" class="${globalSoon(s)==d?'on':''}">${d} 天</button>`).join('')}</div></section>
  <div class="micro pad">分类临期阈值（单条可再单独设置）</div><section class="card kv">${Object.entries(CATEGORIES).map(([k,c])=>{const v=(s.catSoon||{})[k],def=c.soon;
    return `<div><span class="il" style="color:${c.color}">${ci(k,18)}<em>${c.name}</em></span><select data-cs="${k}" aria-label="${c.name}临期阈值">
    <option value="" ${v==null?'selected':''}>默认（${def!=null?def+' 天':'跟随全局 '+globalSoon(s)+' 天'}）</option>
    ${def!=null?`<option value="g" ${v==='g'?'selected':''}>跟随全局（${globalSoon(s)} 天）</option>`:''}
    ${[1,3,7,14,30,60,90,180].map(d=>`<option value="${d}" ${v===d?'selected':''}>${d} 天</option>`).join('')}</select></div>`;}).join('')}</section>
  <div class="micro pad">分类默认提醒强度（跟随分类的条目立即生效）</div><section class="card kv">${Object.entries(CATEGORIES).map(([k,c])=>`<div><span class="il" style="color:${c.color}">${ci(k,18)}<em>${c.name}</em></span>
   <span class="ci-r">${nItem(k)?`<a href="#" data-over="${k}" class="small">覆盖 ${nItem(k)} 条单独设置</a>`:''}<select data-ci="${k}">${Object.entries(INTENSITY).filter(([x])=>x!=='custom').map(([x,v])=>`<option value="${x}" ${catDefault(k,s)===x?'selected':''}>${v.name}</option>`).join('')}</select></span></div>`).join('')}</section>
  <div class="micro pad">提醒与角标</div><section class="card">
   ${badgeOK?`<div class="kv"><div><span>图标角标（待处理数）</span><b><button class="btn sm" id="badge">${s.badge?'已开启 · 关闭':'开启图标角标'}</button></b></div></div>`:''}
   <p class="small muted">iPhone：需要先「添加到主屏幕」。角标只在打开 App 时更新，App 关着的时候不会自动变化。想要准时提醒，请用「导出到日历」。</p>
   <button class="btn block" id="icsS">${icon('cal',18)}导出到日历（.ics）</button>
   <p class="small muted">推送通知、邮件兜底、同时提醒家人将在 v2 提供。</p></section>
  <div class="micro pad">备份 · 共 ${n} 条</div><section class="card btns">
   <button class="btn" id="ecsv">${icon('download',18)}导出 CSV</button><button class="btn" id="ejson">${icon('download',18)}导出 JSON</button>
   <label class="btn">${icon('upload',18)}导入 CSV / JSON<input type="file" id="imp" accept=".csv,.json,text/csv,application/json" hidden></label>
   <button class="btn" id="tpl">${icon('download',18)}下载导入模板</button>
   <label class="check full"><input type="checkbox" id="incTrash"> 导出时包含回收站</label>
   <label class="check full"><input type="checkbox" id="incPh" checked> JSON 包含照片（文件会变大；CSV 不含照片）</label></section>
  <div class="micro pad">数据</div><section class="card btns"><a class="btn" href="#/trash">${icon('trash',18)}回收站（${tr}）</a><button class="btn" id="obAgain">${icon('sparkle',18)}重新查看引导</button><button class="btn" id="demo">${icon('sparkle',18)}载入示例数据</button><button class="btn danger ghost" id="clear">${icon('trash',18)}清空全部</button></section>
  <p class="hint" id="persist">数据只保存在本机浏览器 · v1.1</p>`;
  if(navigator.storage?.persisted)navigator.storage.persisted().then(p=>{const e=$('#persist');if(e)e.textContent=`数据只保存在本机浏览器 · 存储：${p?'已持久化':'可能被系统清理，请定期导出'} · v1.1`;});
  view.querySelectorAll('[data-theme]').forEach(b=>b.onclick=()=>{s.theme=b.dataset.theme;S.saveSettings(s);applyTheme();settings();});
  view.querySelectorAll('[data-cs]').forEach(x=>x.onchange=()=>{s.catSoon=s.catSoon||{};const v=x.value;if(v==='')delete s.catSoon[x.dataset.cs];else s.catSoon[x.dataset.cs]=v==='g'?'g':+v;
    S.saveSettings(s);toast(`${cat(x.dataset.cs).name}临期阈值：${catSoon(x.dataset.cs,s)} 天`);});
  view.querySelectorAll('[data-soon]').forEach(b=>b.onclick=()=>{s.soonDays=+b.dataset.soon;S.saveSettings(s);settings();});
  view.querySelectorAll('[data-ci]').forEach(x=>x.onchange=()=>{const old=S.all().map(i=>inferSource(i,st()));s.catIntensity[x.dataset.ci]=x.value;S.saveSettings(s);
    // 先固化旧数据的来源，避免改默认后被误判
    S.replaceAll(S.raw().map(i=>i.deletedAt?i:(old.find(o=>o.id===i.id)||i)));toast(`${cat(x.dataset.ci).name}默认改为「${INTENSITY[x.value].name}」`);settings();});
  view.querySelectorAll('[data-over]').forEach(a=>a.onclick=e=>{e.preventDefault();const k=a.dataset.over,v=catDefault(k,s),cnt=nItem(k);
    if(!confirm(`将覆盖 ${cnt} 条单独设置，全部改为跟随分类（${INTENSITY[v].name}），可撤销。继续？`))return;
    act(`已覆盖 ${cnt} 条单独设置`,()=>S.replaceAll(S.raw().map(i=>i.cat===k&&!i.deletedAt?{...inferSource(i,s),intensitySource:'cat',intensity:undefined}:i)));settings();});
  $('#badge')&&($('#badge').onclick=async()=>{if(!s.badge&&'Notification' in window&&Notification.permission==='default'){try{await Notification.requestPermission()}catch{}}
    s.badge=!s.badge;S.saveSettings(s);updateBadge();settings();});
  $('#icsS').onclick=icsSheet;
  $('#ecsv').onclick=()=>{download(`到期提醒-${todayStr()}.csv`,toCSV($('#incTrash').checked?S.raw():S.all()),'text/csv;charset=utf-8');s.lastExportAt=new Date().toISOString();S.saveSettings(s);};
  $('#ejson').onclick=()=>exportJSON($('#incTrash').checked,$('#incPh').checked);
  $('#tpl').onclick=()=>download('到期提醒-导入模板.csv',TEMPLATE_CSV,'text/csv;charset=utf-8');
  $('#imp').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{const t=await f.text();const res=/\.json$/i.test(f.name)||/^\s*[\[{]/.test(t)?parseJSON(t):parseCSV(t);
    importState={file:f.name,a:analyzeImport(res),dup:'skip',photos:res.photos};settings();window.scrollTo(0,0);}catch(err){toast('导入失败：'+err.message);}};
  view.querySelectorAll('[data-dup]').forEach(b=>b.onclick=()=>{importState.dup=b.dataset.dup;settings();});
  $('#impNo')&&($('#impNo').onclick=()=>{importState=null;settings();});
  $('#impGo')&&($('#impGo').onclick=()=>{const a=importState.a,l=[...a.add,...a.upd,...(importState.dup==='keep'?a.dup.map(r=>({...r,item:{...r.item,id:undefined}})):[])].map(r=>inferSource(r.item,s));
    const ph=importState.photos;importState=null;act(`已导入 ${l.length} 条`,()=>S.merge(l));
    if(ph&&!S.lastSaveFailed&&globalThis.indexedDB){P.importPhotos(ph,l.flatMap(i=>i.photos||[])).then(n=>{if(n)toast(`已导入 ${l.length} 条，照片 ${n} 张`);}).catch(photoErr);}settings();});
  $('#obAgain').onclick=onboarding;
  $('#demo').onclick=()=>{act('已载入示例数据',seed);settings();};
  $('#clear').onclick=async()=>{if(!n)return;await exportJSON();act(`已清空 ${n} 条（已自动下载备份，可在回收站恢复）`,()=>S.softDelete(S.all().map(i=>i.id)));settings();};
}
function trashPage(){const l=S.trash().sort((a,b)=>b.deletedAt.localeCompare(a.deletedAt));
  view.innerHTML=`${top('回收站',{back:true,right:l.length?`<button class="btn sm danger" id="empty">清空回收站</button>`:''})}
  <p class="hint">删除的条目保留 30 天后自动清除</p>
  <section class="card list">${l.map(it=>`<div class="row" data-id="${h(it.id)}"><span class="ic" style="--c:${cat(it.cat).color}">${ci(it.cat)}</span>
   <span class="grow"><b class="ell">${h(it.name)}</b><small>到期 ${h(it.due)} · 删除于 ${h(it.deletedAt.slice(0,10))}</small></span>
   <button class="btn sm" data-r>恢复</button><button class="btn sm danger" data-p aria-label="彻底删除">${icon('trash',16)}</button></div>`).join('')||'<div class="empty">回收站是空的</div>'}</section>`;
  view.querySelectorAll('[data-r]').forEach(b=>b.onclick=()=>{const id=b.closest('[data-id]').dataset.id;act('已恢复',()=>S.restore(id));trashPage();});
  view.querySelectorAll('[data-p]').forEach(b=>b.onclick=()=>{const id=b.closest('[data-id]').dataset.id;act('已彻底删除',()=>S.purge(id));trashPage();});
  $('#empty')&&($('#empty').onclick=()=>{if(confirm(`彻底删除回收站里的 ${l.length} 条？`)){act('回收站已清空',()=>S.emptyTrash());trashPage();}});}

function seed(){const t=todayStr(),D=n=>addDays(t,n);
  S.merge([
   {id:'d1',cat:'doc',name:'居留卡',due:D(40),intensitySource:'cat',renewMonths:60,note:'IGI 布加勒斯特，需提前预约'},
   {id:'d2',cat:'doc',name:'护照',due:D(412),intensitySource:'cat',renewMonths:120},
   {id:'d3',cat:'doc',name:'驾照',due:D(-3),intensitySource:'item',intensity:'standard',renewMonths:120},
   {id:'d4',cat:'car',name:'RCA 交强险',due:D(6),intensitySource:'cat',renewMonths:12},
   {id:'d5',cat:'car',name:'ITP 车检',due:D(143),intensitySource:'cat',renewMonths:24},
   {id:'d6',cat:'car',name:'Rovinieta 公路费',due:D(21),intensitySource:'item',intensity:'light',renewMonths:12},
   {id:'d7',cat:'food',name:'牛奶',due:D(1),intensitySource:'cat',qty:2,location:'冰箱',shelfDays:7},
   {id:'d8',cat:'food',name:'冷冻饺子',due:D(64),intensitySource:'cat',qty:3,location:'冷冻层'},
   {id:'d9',cat:'med',name:'布洛芬',due:D(-12),intensitySource:'cat',qty:1,location:'药箱'},
   {id:'d10',cat:'shop',name:'老干妈辣酱',due:D(15),intensitySource:'cat',qty:24,location:'货架 B2'},
   {id:'d11',cat:'bill',name:'视频会员',due:D(9),intensitySource:'item',intensity:'custom',customDays:[3,1],renewMonths:12},
   {id:'d12',cat:'home',name:'洗衣机保修',due:D(230),intensitySource:'cat'},
   {id:'d13',cat:'other',name:'春节机票',due:D(90),intensitySource:'cat',note:'提前 60 天关注价格'},
   {id:'d14',cat:'food',name:'鸡蛋',due:D(0),intensitySource:'cat',qty:10,location:'冰箱'},
  ]);}

// 引导页：最多 3 屏，可跳过，只自动显示一次
const isIOS=()=>/iPhone|iPad|iPod/.test(navigator.userAgent)&&!navigator.standalone;
function onboarding(){document.querySelector('.ob')?.remove();const el=document.createElement('div');el.className='ob';el.setAttribute('role','dialog');el.setAttribute('aria-label','欢迎');
  const demo=`<div class="ob-card"><div class="ob-row"><span class="ic sm" style="--c:#3D7BE0">${ci('doc',18)}</span><b>居留卡</b><span class="num soon">40<small>天</small></span></div>
    <div class="ob-row"><span class="ic sm" style="--c:#7A5AF0">${ci('car',18)}</span><b>RCA 交强险</b><span class="num soon">6<small>天</small></span></div>
    <div class="ob-row"><span class="ic sm" style="--c:#E08A1E">${ci('food',18)}</span><b>牛奶</b><span class="num expired">1<small>天</small></span></div></div>`;
  const lv=`<div class="ob-levels">${[['轻','提前 7 天',1],['标准','30 / 7 / 1 天',3],['强','直到处理',8]].map(([n,d,k])=>`<div class="lvl"><div class="dots">${'<i></i>'.repeat(k)}</div><b>${n}</b><small>${d}</small></div>`).join('')}</div>`;
  const ios=isIOS();
  const s3=ios?`<div class="ob-ios"><div class="step"><span class="num">1</span>点 Safari 底部的「分享」${icon('upload',20)}</div><div class="step"><span class="num">2</span>选「添加到主屏幕」</div><div class="step"><span class="num">3</span>从主屏打开，再开启提醒</div></div>`
    :`<div class="ob-bell">${icon('bell',72)}</div>`;
  const pages=[['所有到期，一屏看清','证件、车辆、食品，按剩余天数排好，颜色告诉你哪个最急。',demo],
    ['重要的事，提醒到你处理为止','三档强度：轻、标准、强。强档最后一周每天提醒，点「已处理」才停。',lv],
    ['开启提醒',ios?'iPhone 需要先添加到主屏幕，才能显示角标和提醒。':'打开 App 时显示今日待处理和图标角标。想要准时闹钟，可以「导出到日历」。',s3]];
  el.innerHTML=`<button class="ob-skip" data-ob="skip">跳过</button><div class="ob-track">${pages.map(([t,d,v],i)=>`<section class="ob-page" data-i="${i}"><div class="ob-visual">${v}</div><h1>${t}</h1><p>${d}</p></section>`).join('')}</div>
   <div class="ob-foot"><div class="ob-dots">${pages.map((_,i)=>`<i class="${i?'':'on'}"></i>`).join('')}</div><button class="btn primary block" data-ob="next">下一步</button></div>`;
  document.body.appendChild(el);const tr=el.querySelector('.ob-track'),next=el.querySelector('[data-ob=next]');let cur=0;
  const upd=()=>{cur=Math.round(tr.scrollLeft/tr.clientWidth);el.querySelectorAll('.ob-dots i').forEach((d,i)=>d.classList.toggle('on',i===cur));
    next.textContent=cur<2?'下一步':ios?'我知道了':('Notification' in window&&Notification.permission==='default'?'开启提醒':'开始使用');};
  tr.addEventListener('scroll',()=>requestAnimationFrame(upd));
  const done=()=>{const s=st();s.onboarded=true;S.saveSettings(s);el.classList.add('out');setTimeout(()=>el.remove(),reduced()?0:220);};
  el.querySelector('[data-ob=skip]').onclick=done;
  next.onclick=async()=>{if(cur<2){tr.scrollTo({left:tr.clientWidth*(cur+1),behavior:reduced()?'auto':'smooth'});setTimeout(upd,reduced()?0:350);return;}
    // 授权只在用户点击这里时请求
    if(!ios&&'Notification' in window&&Notification.permission==='default'){try{const r=await Notification.requestPermission();if(r==='granted'&&'setAppBadge' in navigator){const s=st();s.badge=true;S.saveSettings(s);updateBadge();}}catch{}}
    done();};}

function updateBadge(){const s=st();if(!('setAppBadge' in navigator))return;
  if(!s.badge){navigator.clearAppBadge?.().catch(()=>{});return;}
  const n=todoList(S.all(),s).todo.length;(n?navigator.setAppBadge(n):navigator.clearAppBadge()).catch(()=>{});}

document.querySelectorAll('#tabbar [data-ic]').forEach(e=>e.innerHTML=icon(e.dataset.ic,e.dataset.ic==='add'?22:24));
function route(){
  applyTheme();closeSheet();document.querySelector('.viewer')?.remove();const [path,qs]=(location.hash.slice(1)||'/').split('?'),q=new URLSearchParams(qs),p=path.split('/').filter(Boolean);
  const tab={'':'home',todo:'home',cats:'cats',cat:'cats',cal:'cal',settings:'settings',trash:'settings',new:'new'}[p[0]||'']||'';
  document.querySelectorAll('#tabbar a').forEach(a=>a.classList.toggle('on',a.dataset.tab===tab));
  view.classList.remove('in');window.scrollTo(0,0);
  const r={'':home,todo:todoPage,cats,cat:()=>catList(p[1]),cal,item:()=>detail(p[1]),new:()=>form(null,q),edit:()=>form(p[1],q),settings,trash:trashPage}[p[0]||''];
  try{(r||home)();}catch(err){console.warn(err);view.innerHTML=`${top('出错了')}<section class="card"><p class="small">这一页显示失败：${h(err.message)}</p><p class="small muted">数据没有丢失。可以先到设置里导出备份。</p><a class="btn" href="#/settings">去设置</a></section>`;}
  enter();
  if(afterRoute){const f=afterRoute;afterRoute=null;f();}
  view.querySelectorAll('[data-back]').forEach(b=>b.onclick=()=>history.length>1?history.back():location.hash='#/');
}
// 启动：清理 30 天前的回收站；记录首次使用；请求持久化存储
addEventListener('dq-storage-error',()=>toast('存储已满或不可用，修改未保存，请先导出备份',false,true));
S.migrate();S.purgeOld();
if(globalThis.indexedDB)P.cleanup(S.raw().flatMap(i=>i.photos||[])).catch(()=>{});{const s=st();if(!s.firstUseAt){s.firstUseAt=new Date().toISOString();S.saveSettings(s);}}
navigator.storage?.persist?.().catch(()=>{});
{const qs=new URLSearchParams(location.search);if(qs.has('demo')){if(!S.raw().length)seed();const s=st();s.onboarded=true;S.saveSettings(s);}}
if(!st().onboarded)onboarding();
addEventListener('hashchange',route);route();updateBadge();
document.addEventListener('visibilitychange',()=>{if(!document.hidden){updateBadge();if(!location.hash.startsWith('#/new')&&!location.hash.startsWith('#/edit'))route();}});
if('serviceWorker' in navigator&&location.protocol!=='file:')navigator.serviceWorker.register('./sw.js').catch(()=>{});
