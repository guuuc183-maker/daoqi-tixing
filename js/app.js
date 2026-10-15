import * as S from './store.js';
import {VERSION} from './version.js';
import {CATEGORIES,TEMPLATES,INTENSITY,findTpl,PERISHABLE,CUSTOM_PRESET,applyCats,visibleCats,ICON_SET,COLORS,inferTop2,normName,tplFor,REGIONS,mergeIntoBuiltin} from './templates.js';
const defaultCat=s=>CATEGORIES[s.lastCat]&&!CATEGORIES[s.lastCat].hidden?s.lastCat:'other';
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
const ci=(k,s=22)=>icon(cat(k).icon||'other',s);
applyCats(S.settings());
// v1.2：自建的「日用品」并入内置 daily
{const m=mergeIntoBuiltin(S.settings(),JSON.parse(localStorage.getItem('dq.items.v2')||'[]'));if(m.changed){localStorage.setItem('dq.items.v2',JSON.stringify(m.items));S.saveSettings(m.st);}}

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
   `<button data-a="done">${icon('check',16)}已处理</button><button data-a="more" class="more" aria-label="更多操作">${icon('more',20)}</button>`}</div></div>`;}
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
  <div class="empty-ring">${ring(0,64,6)}</div>
  <h2>还没有要盯着的日期</h2><p>从模板开始，10 秒加一条</p>
  <a class="btn sm primary cta" href="#/new">${icon('add',18)}添加第一条</a>
  <div class="tpl-quick">${EMPTY_TPL.map(([n,c])=>`<a href="#/new?tpl=${encodeURIComponent(n)}">${ci(c,16)}${n.replace(' 交强险','').replace(' 车检','')}</a>`).join('')}</div>
  <p class="small muted">也可以在 <a href="#/settings">设置</a> 里导入表格或载入示例数据</p></section>`;}
// 照片区块：缩略图 + 拍照/相册
let capMsg='',capUntil=0;
function photoBlock(ids=[],inForm=false){ids=ids||[];const full=ids.length>=P.MAX_PHOTOS;
  return `<section class="${inForm?'photo-field':'card'} photos"><div class="micro">照片 · ${ids.length}/${P.MAX_PHOTOS}${full?' · 已满':''}</div><div class="ph-grid3">
   ${ids.map((id,i)=>`<div class="thumb3 ph"><button type="button" class="ph-open" data-view="${h(id)}" aria-label="查看或替换照片"><img data-ph="${h(id)}" alt=""></button><button type="button" class="del" data-delph="${h(id)}" aria-label="删除照片">${icon('add',14)}</button>${i===0?'<span class="cover">封面</span>':''}</div>`).join('')}
   ${full?'':`<label class="ph-add3" for="phAlbum">${icon('add',20)}<span>添加</span></label>`}</div>
   ${full?'':`<div class="ph-btns"><label class="btn">${icon('camera',18)}拍照<input type="file" accept="image/*" capture="environment" data-addph hidden></label>
   <label class="btn">${icon('photos',18)}相册（可多选）<input type="file" id="phAlbum" accept="image/*" multiple data-addph hidden></label></div>`}
   ${Date.now()<capUntil?`<div class="cap-note">${icon('bell',16)}${h(capMsg)}</div>`:''}
   ${ids.length?'<p class="hint-l ph-hint">点缩略图可「替换」</p>':''}</section>`;}
function photoErr(e){if(P.isQuota(e))toast('存储空间已满，照片没有保存。请先到「设置 → 一键备份」，再删除一些照片',false,true);else toast(e?.message||'照片添加失败',false,true);}
function bindPhotos(root,getIds,onAdd,onDel,onRep){
  root.querySelectorAll('[data-addph]').forEach(inp=>inp.onchange=async()=>{const fs=[...inp.files];inp.value='';
    let added=0;const over=fs.length>P.MAX_PHOTOS-getIds().length;if(over){capMsg=`每条最多 ${P.MAX_PHOTOS} 张，已加前 ${P.MAX_PHOTOS-getIds().length} 张`;capUntil=Date.now()+4000;}
    for(const f of fs){if(getIds().length>=P.MAX_PHOTOS){toast(capMsg||`每条最多 ${P.MAX_PHOTOS} 张`);break;}try{toast('正在压缩照片…');await onAdd(f);added++;}catch(e){photoErr(e);break;}}});
  root.querySelectorAll('[data-delph]').forEach(b=>b.onclick=e=>{e.stopPropagation();onDel(b.dataset.delph);});
  root.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>viewer(b.dataset.view,onDel,onRep&&(async(pid,f)=>{try{toast('正在压缩照片…');await onRep(pid,f);}catch(e){photoErr(e);}})));}
function viewer(pid,onDel,onRep){document.querySelector('.viewer')?.remove();const v=document.createElement('div');v.className='viewer';v.setAttribute('role','dialog');
  v.innerHTML=`<img data-ph="${h(pid)}" data-kind="full" alt="照片"><div class="viewer-bar"><button class="btn" data-x>关闭</button>${onRep?`<label class="btn" data-rep>${icon('renew',18)}替换<input type="file" accept="image/*" hidden></label>`:''}<button class="btn danger" data-del>${icon('trash',18)}删除</button></div>`;
  document.body.appendChild(v);hydrate(v);const close=()=>v.remove();v.querySelector('[data-x]').onclick=close;v.onclick=e=>{if(e.target===v)close();};
  v.querySelector('[data-del]').onclick=()=>{close();onDel(pid);};
  const ri=v.querySelector('[data-rep] input');if(ri){ri.onclick=e=>e.stopPropagation();ri.onchange=()=>{const f=ri.files[0];if(!f)return;close();onRep(pid,f);};}}

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
   ${todo.length?todo.slice(0,3).map(todoRow).join(''):`<div class="all-clear"><span class="gold-ring">${ring(1,40,4)}</span><span>全部已处理 · 今天没有要处理的</span></div>`}</section></div>
  <div class="seg" role="tablist">${[['all','全部'],['soon','临期'],['expired','已过期'],['safe','安全']].map(([k,n])=>`<button data-seg="${k}" class="${homeSeg===k?'on':''}">${n}</button>`).join('')}</div>
  <section class="card list">${shown.map(row).join('')||`<div class="empty">${items.length?'这一栏没有条目':'还没有条目<br><a href="#/new">添加第一条</a> 或在设置里载入示例数据'}</div>`}</section>`;
  view.querySelectorAll('[data-seg]').forEach(b=>b.onclick=e=>{e.preventDefault();homeSeg=b.dataset.seg;home();});
  $('#iosx')&&($('#iosx').onclick=()=>{const x=st();x.iosTipClosed=true;S.saveSettings(x);home();});
  const bkLater=()=>{const x=st();x.backupSnoozeUntil=new Date(Date.now()+3*864e5).toISOString();S.saveSettings(x);collapse($('#bkbar'));};
  $('#bkx')&&($('#bkx').onclick=bkLater);$('#bkx2')&&($('#bkx2').onclick=bkLater);
  $('#bkgo')&&($('#bkgo').onclick=async()=>{if(!await backupNow())return;const bar=$('#bkbar');if(!bar)return;bar.classList.add('ok');bar.querySelector('b').textContent='已备份 · 今天';
    bar.querySelector('small')?.remove();bar.querySelector('.bk-act').remove();bar.querySelector('.bk-ic').innerHTML=icon('check',20);setTimeout(()=>collapse(bar),3000);});
  bindTodo(view,home);fillRing();hydrate(view);
}
// P1-2 备份提醒
// v1.2 P0-A 备份提醒：从没备份且 ≥5 条；距上次 ≥ N 天（设置可改/关闭）；上次备份后改动 ≥10 条；「稍后」3 天内不再出现
function collapse(el){if(!el)return;if(reduced()){el.remove();return;}el.style.maxHeight=el.offsetHeight+'px';el.classList.add('closing');requestAnimationFrame(()=>{el.style.maxHeight='0px';});setTimeout(()=>el.remove(),300);}
function backupState(s,now=Date.now()){const last=Date.parse(s.lastBackupAt||'')||0,n=S.all().length;
  const changes=last?S.raw().filter(i=>[i.updatedAt,i.createdAt,i.deletedAt].some(t=>t&&Date.parse(t)>last)).length:n;
  const days=last?Math.floor((now-last)/864e5):null,every=+(s.backupEvery??14);
  let need=false;if(every>0&&!(Date.parse(s.backupSnoozeUntil||'')>now))need=(!last&&n>=5)||(last&&days>=every)||(last&&changes>=10);
  return {need,last,days,changes,n};}
const onIOS=()=>/iPhone|iPad|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
function backupTip(s){const b=backupState(s);if(!b.need)return '';
  const title=b.last?`上次备份：${b.days?b.days+' 天前':'今天'}`:`已有 ${b.n} 条，还没有备份过`,sub=!b.last?'':b.changes>=10&&b.days<+(s.backupEvery??14)?`已改动 ${b.changes} 条`:'备份后换手机、清缓存也不丢';
  return `<div class="bk-bar enter" id="bkbar"><span class="bk-ic">${icon('download',20)}</span><b>${title}</b>${sub?`<small>${sub}</small>`:''}
   <div class="bk-act"><button class="btn primary" id="bkgo">一键备份</button><button class="btn later" id="bkx">稍后</button></div>
   <button class="bk-x" id="bkx2" aria-label="关闭，3 天后再提醒">${icon('add',18)}</button>
   ${onIOS()?'<div class="bk-ios">手机长期不用这个网站时，iOS 可能会清理数据，请把备份存到「文件」或 iCloud 云盘</div>':''}</div>`;}
// v1.2 P0-B 一键备份：条目（含回收站）+ 照片 + 设置 + 自定义分类；能分享文件就分享，否则下载
async function backupNow(){const s=st(),items=S.raw();let photos=null;
  if(globalThis.indexedDB){try{photos=await P.exportPhotos(items.flatMap(i=>i.photos||[]));}catch{toast('照片读取失败，本次只备份文字数据',false,true);}}
  const {backupSnoozeUntil,...keep}=s;const text=toJSON(items,photos,(s.cats?.custom)||[],keep);
  const name=`到期提醒-备份-${todayStr().replace(/-/g,'')}.json`;let ok=false;
  try{const file=new File([text],name,{type:'application/json'});
    if(navigator.canShare&&navigator.canShare({files:[file]})){await navigator.share({files:[file],title:'到期提醒备份'});ok=true;}}catch(e){if(e?.name==='AbortError')return false;}
  if(!ok){download(name,text,'application/json');ok=true;}
  const x=st();x.lastBackupAt=x.lastExportAt=new Date().toISOString();delete x.backupSnoozeUntil;S.saveSettings(x);toast('已备份 · '+name);return true;}

function todoPage(){const {todo,later}=todoList(S.all(),st());
  view.innerHTML=`${top('今日待处理',{back:true})}<section class="card todo">${todo.map(todoRow).join('')||`<div class="all-clear">${icon('check',18)} 今天没有要处理的</div>`}</section>
  ${later.length?`<div class="micro pad">稍后 · ${later.length}</div><section class="card todo later">${later.map(todoRow).join('')}</section>`:''}`;
  bindTodo(view,todoPage);}

function cats(){
  const items=enrich();
  view.innerHTML=`${top('分类',{right:`<a class="btn sm" href="#/catmgr">${icon('gear',16)} 管理</a>`})}<section class="grid">${visibleCats().map(([k,c])=>{
    const l=items.filter(i=>i.cat===k&&!i.handledAt),e=l.filter(i=>i.st==='expired').length,s=l.filter(i=>i.st==='soon').length,next=l.find(i=>i.n>=0)||l[0];
    return `<a class="tile" href="#/cat/${k}" style="--c:${c.color}"><span class="tile-ic">${ci(k)}</span><b>${h(c.name)}</b>
    <span class="badges">${e?`<em class="b expired">${e}</em>`:''}${s?`<em class="b soon">${s}</em>`:''}<span class="num cnt">${l.length}</span></span>
    <small class="ell">${next?`最近：${h(next.name)} · ${next.n<0?`已过期 ${-next.n} 天`:next.n===0?'今天到期':`${next.n} 天`}`:'暂无条目'}</small></a>`;}).join('')}</section>`;
}
function catList(k){
  const items=enrich().filter(i=>i.cat===k),c=cat(k);
  view.innerHTML=`${top(h(c.name),{back:true,right:`<a class="btn sm" href="#/new?cat=${k}">${icon('add',16)} 添加</a>`})}
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

// 详情大数字：从 0 滚到目标值（减少动态效果时直接显示）
let lastCount=null;addEventListener('hashchange',()=>{lastCount=null;});
function countUp(root,key){const el=root.querySelector('[data-count]');if(!el||reduced()||lastCount===key){lastCount=key;return;}lastCount=key;const to=+el.dataset.count;if(!to)return;
  const t0=performance.now(),D=600,ease=x=>1-Math.pow(1-x,3);el.textContent='0';
  const step=t=>{const k=Math.min(1,(t-t0)/D);el.textContent=String(Math.round(to*ease(k)));if(k<1&&el.isConnected)requestAnimationFrame(step);};requestAnimationFrame(step);}
function detail(id){
  const it=enrich().find(i=>i.id===id);if(!it){location.hash='#/';return;}
  const s=st(),c=cat(it.cat),tpl=findTpl(it.cat,it.name),plan=remindDays(it,s).filter(d=>d>=0),ei=effInt(it,s),lead=leadDays(it);
  const nx=plan.filter(d=>d<=it.n).sort((a,b)=>b-a)[0];
  view.innerHTML=`${top('',{back:true,right:`<a class="icon-btn" href="#/edit/${h(it.id)}" aria-label="编辑">${icon('edit',20)}</a>`})}
  <section class="card big-cd ${it.st}">
    <span class="tile-ic lg" style="--c:${c.color}">${ci(it.cat,34)}</span>
    <h2>${h(it.name)}</h2><div class="muted small">${h(c.name)}${it.qty?` · ${it.qty} 件`:''}${it.location?` · ${h(it.location)}`:''}</div>
    <div class="cd-num num"><span data-count="${Math.abs(it.n)}">${Math.abs(it.n)}</span><small>天</small></div>
    <div class="pill ${it.st}">${it.n<0?'已超出':it.n===0?'今天到期':'距离到期'} · ${ST[it.st]}</div>
    <div class="muted small">${nice(it.due)}</div>
    ${it.history?.length?`<div class="milestone">${icon('check',16)}已按时续期 ${it.history.length} 次</div>`:''}
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
  ${tpl?.docs?`<section class="card"><div class="micro">办理材料（参考）</div><p class="small">${h(tpl.docs)}</p>${tpl.url?`<p class="small">官方链接：<a class="ext" href="${h(tpl.url)}" target="_blank" rel="noopener noreferrer">${h(tpl.url.replace(/^https?:\/\//,'').split('/')[0])}</a></p>`:''}${tpl.verify?'<p class="small soon">⚠ 规则待核实</p>':''}<p class="small muted">${tpl.region==='cn'?'以官方为准（公安 / 出入境 / 车管所）':'以官方为准（IGI / 使馆 / RAR 等）'}</p></section>`:''}
  ${it.note?`<section class="card"><div class="micro">备注</div><p class="small">${h(it.note)}</p></section>`:''}
  ${it.history?.length?`<section class="card"><div class="micro">续期记录</div>${it.history.slice().reverse().map(x=>`<p class="small">${h(x.at)}：${h(x.from)} → ${h(x.to)}</p>`).join('')}</section>`:''}
  <button class="btn danger ghost" id="del">${icon('trash',18)}删除</button>`;
  $('#renew').onclick=()=>renewFlow(id,()=>detail(id));
  bindPhotos(view,()=>S.get(id).photos||[],async f=>{const pid=await P.addPhoto(id,f);if(!S.patch(id,x=>{x.photos=[...(x.photos||[]),pid].slice(0,P.MAX_PHOTOS);}))return;toast('照片已添加');detail(id);},
    pid=>{act('已删除照片',()=>S.patch(id,x=>{x.photos=(x.photos||[]).filter(p=>p!==pid);}));detail(id);},
    async(pid,f)=>{const np=await P.addPhoto(id,f);act('照片已替换',()=>S.patch(id,x=>{x.photos=(x.photos||[]).map(p=>p===pid?np:p);}));detail(id);});hydrate(view);countUp(view,id+'|'+location.hash);
  $('#handled')&&($('#handled').onclick=()=>{act('已停止提醒',()=>S.patch(id,x=>{x.handledAt=todayStr();delete x.snoozeUntil;}));detail(id);});
  $('#unhandle')&&($('#unhandle').onclick=()=>{act('已恢复提醒',()=>S.patch(id,x=>{delete x.handledAt;delete x.renewAsked;}));detail(id);});
  $('#rebuy')&&($('#rebuy').onclick=()=>{const raw=S.get(id);const created=(raw.prodDate||raw.createdAt||todayStr()).slice(0,10);
    const shelf=raw.shelfDays||Math.max(1,daysLeft(raw.due,created));
    sessionStorage.setItem('dq.prefill',JSON.stringify({cat:raw.cat,name:raw.name,intensity:raw.intensity,intensitySource:raw.intensitySource,customDays:raw.customDays,location:raw.location,qty:raw.qty,shelfDays:shelf,due:addDays(todayStr(),shelf),rebuyFrom:id}));
    location.hash='#/new';});
  $('#ics1').onclick=()=>download(`${it.name}.ics`,toICS([S.get(id)],s),'text/calendar;charset=utf-8');
  $('#del').onclick=()=>{act(`已删除「${it.name}」`,()=>S.softDelete([id]));if(!S.lastSaveFailed)location.hash='#/';};
}

function form(id,q){
  const ex=id?S.get(id):null,s=st();
  let pre=null;if(!ex){try{pre=JSON.parse(sessionStorage.getItem('dq.prefill'))}catch{}sessionStorage.removeItem('dq.prefill');}
  const it=ex?inferSource({...ex},s):Object.assign({cat:q.get('cat')||defaultCat(s),name:'',due:'',intensitySource:'cat',soonSource:'cat',customDays:[],renewMonths:'',qty:'',location:'',note:'',prodDate:'',shelfDays:''},pre||{});
  if(pre&&q.get('cat'))it.cat=q.get('cat');
  let picked=!!(ex||q.get('cat')||q.get('tpl')||pre?.cat||pre?.name),sug=null,cands=[],auto=false,inferredFor=null;
  if(!it.id)it.id=S.uid();if(pre)it.photos=[];
  {const tq=q.get('tpl'),t=tq&&TEMPLATES.find(x=>x.name===tq);if(t&&!ex){it.cat=t.cat;it.name=t.name;it.renewMonths=t.renew||'';}}
  // 分类来源：none 未选 / last 上次使用 / auto 按名称推断 / manual 手动 / tpl 来自模板
  let fromTpl=!!q.get('tpl');const lastOK=!!(CATEGORIES[s.lastCat]&&!CATEGORIES[s.lastCat].hidden);
  const catSrc=()=>ex?'edit':fromTpl?'tpl':picked?'manual':auto?'auto':lastOK?'last':'none';
  const sugHTML=(typing)=>{const src=catSrc();if(src==='edit')return '';
    if(src==='manual'||src==='tpl')return `<span class="man-tag">${icon('check',14)}${src==='tpl'?'来自模板':'已手动选择 · 改名称不会再覆盖'}</span>`;
    if(!sug)return '';const two=cands.length>1,applied=auto&&it.cat===sug;
    return `<span class="inf-tag">${icon('sparkle',14)}按名称推断</span>${two?cands.map(k=>`<button type="button" class="chip-s ${it.cat===k&&auto?'on':''}" data-sug="${k}">${ci(k,14)}${h(cat(k).name)}</button>`).join(''):''}<span class="inf-hint">${typing&&!applied?`${two?'':`<b>${h(cat(sug).name)}</b> · `}离开输入框后应用`:`强度 ${INTENSITY[effInt(it,s)].name} · 临期 ${it.soonSource==='item'?it.soonDays:catSoon(it.cat,s)} 天 · <u data-chg>改分类</u>`}</span>`;};
  let dueText=it.due||'',chain=false,shelfUnit='d',shelfN=it.shelfDays||'';
  const draw=(focus)=>{const ei=effInt(it,s),per=PERISHABLE.includes(it.cat);
    view.innerHTML=`${top(ex?'编辑':it.rebuyFrom?'再买一次':'新增',{back:true})}
    ${ex?'':`<div class="micro pad">选择模板</div><div class="chips">${visibleCats().map(([k,c])=>`<button data-cat="${k}" class="${it.cat===k?'on':''}">${ci(k,16)}${h(c.name)}</button>`).join('')}</div>
    ${(()=>{const ts=tplFor(it.cat,s.region),grp=['cn','ro',undefined].map(r=>[r,ts.filter(t=>t.region===r)]).filter(([,l])=>l.length),multi=grp.filter(([r])=>r).length>1||(grp.length>1);
      return `<div class="chips tpl ${ts.length<=8?'wrap':''}">${grp.map(([r,l])=>`${multi?`<span class="tpl-grp">${r?REGIONS[r]:'通用'}</span>`:''}${l.map(t=>`<button data-tpl="${h(t.name)}" class="${it.name===t.name?'on':''}">${ci(t.cat,16)}${h(t.name)}</button>`).join('')}`).join('')}</div>`;})()}`}
    <form class="card form" id="f" novalidate>
      <label>名称<input name="name" maxlength="60" required value="${h(it.name)}" placeholder="例如：居留卡"></label>
      <div class="lbl-wrap"><span class="lbl-t">分类</span><label class="cat-field ${!ex&&auto&&!picked?'inferred enter':''}">${catSrc()==='none'?`<span class="cat-ph">未选择 · 保存时用『其他』</span>`:`<span class="ic" style="--c:${cat(it.cat).color}">${ci(it.cat,16)}</span><span class="cat-nm">${h(cat(it.cat).name)}</span>${catSrc()==='last'?'<small class="cat-last">上次使用</small>':''}`}<span class="chev">${icon('chev',16)}</span>
        <select name="cat" aria-label="分类">${Object.entries(CATEGORIES).filter(([k,c])=>!c.hidden||k===it.cat).map(([k,c])=>`<option value="${k}" ${k===it.cat?'selected':''}>${h(c.name)}</option>`).join('')}</select></label>
        <div id="catSug" class="cat-state">${sugHTML()}</div></div>
      ${per?`<div class="two"><label>生产日期<input name="prodDate" id="prod" inputmode="numeric" value="${h(it.prodDate||'')}" placeholder="可选，如 01.10.2026"></label>
        <label>保质期<span class="shelf"><input id="shelfN" type="number" min="1" value="${h(shelfN)}" placeholder="—"><select id="shelfU"><option value="d" ${shelfUnit==='d'?'selected':''}>天</option><option value="m" ${shelfUnit==='m'?'selected':''}>月</option></select></span></label></div>`:''}
      <label>到期日<span class="date-field"><input id="dueT" inputmode="numeric" autocomplete="off" value="${h(dueText)}" placeholder="15.10.2026 或 10/26">
        <button type="button" data-q="clr" class="date-clr" aria-label="清除日期">${icon('add',16)}</button><span class="date-pick">${icon('cal',20)}<input type="date" id="dueP" value="${valid(it.due||'')?it.due:''}" aria-label="选日期"></span></span></label>
      <div id="dueHint" class="hint-l"></div>
      <div class="chips quick">${[['7d','+7天'],['1m','+1月'],['3m','+3月'],['1y','+1年'],['2y','+2年']].map(([k,l])=>`<button type="button" data-q="${k}">${l}</button>`).join('')}</div>
      <div class="lbl">提醒强度 <span class="src">${it.intensitySource==='item'?`已单独设置 · <a href="#" id="follow">恢复跟随分类</a>`:`跟随分类：${h(cat(it.cat).name)} · ${INTENSITY[catDefault(it.cat,s)].name}`}</span></div>
      <div class="seg">${Object.entries(INTENSITY).map(([k,v])=>`<button type="button" data-int="${k}" class="${ei===k?'on':''}">${v.name}</button>`).join('')}</div>
      <p class="hint-l">${INTENSITY[ei].desc}</p>
      ${ei==='custom'?`<div class="chips wrap">${[90,60,30,14,7,3,1,0].map(d=>`<button type="button" data-cd="${d}" class="${(it.customDays||[]).includes(d)?'on':''}">${d?d+' 天':'当天'}</button>`).join('')}</div>`:''}
      <div class="lbl">临期阈值 <span class="src">${it.soonSource==='item'?'已单独设置':`跟随分类：${h(cat(it.cat).name)} · ${catSoon(it.cat,s)} 天`}</span></div>
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
    view.querySelectorAll('[data-cat]').forEach(b=>b.onclick=()=>{sync();it.cat=b.dataset.cat;if(TEMPLATES.some(t=>t.name===it.name))it.name='';picked=true;fromTpl=false;sug=null;auto=false;draw();});
    f.querySelector('[name=cat]').onchange=()=>{sync();picked=true;fromTpl=false;sug=null;auto=false;draw();};
    // 名称推断分类：仅在用户没有明确选过分类时作为建议
    const nameI=f.querySelector('[name=name]'),showSug=()=>{const g=$('#catSug');if(g){g.innerHTML=sugHTML(true);bindSug();}};
    const bindSug=()=>{view.querySelectorAll('[data-sug]').forEach(b=>b.onclick=()=>{sync();it.cat=b.dataset.sug;sug=it.cat;auto=true;inferredFor=it.name;picked=false;draw();});
      const ch=$('[data-chg]');if(ch)ch.onclick=()=>{const sel=f.querySelector('[name=cat]');sel.focus();try{sel.showPicker()}catch{}};};
    if(!ex){nameI.oninput=()=>{if(picked)return;cands=inferTop2(nameI.value,s.catLearn).filter(k=>!CATEGORIES[k]?.hidden);sug=cands[0]||null;showSug();};
      // 离开名称框：自动应用第一个候选；之前是自动推断而这次推断不出，就回到默认分类（O1）
      nameI.onchange=()=>{if(picked)return;sync();if(sug){if(sug!==it.cat||!auto){it.cat=sug;auto=true;inferredFor=it.name;draw();}}else if(auto){it.cat=defaultCat(s);auto=false;draw();}};}
    bindSug();
    view.querySelectorAll('[data-tpl]').forEach(b=>b.onclick=()=>{sync();picked=true;fromTpl=true;sug=null;auto=false;const t=findTpl(it.cat,b.dataset.tpl);it.name=t.name==='自定义'?'':t.name;it.renewMonths=t.renew||'';draw('due');});
    view.querySelectorAll('[data-int]').forEach(b=>b.onclick=()=>{sync();it.intensity=b.dataset.int;it.intensitySource='item';
      if(it.intensity==='custom'&&!(it.customDays||[]).length)it.customDays=(CUSTOM_PRESET[it.cat]||[7,1]).slice();draw();});
    $('#follow')&&($('#follow').onclick=e=>{e.preventDefault();sync();it.intensitySource='cat';delete it.intensity;draw();});
    bindPhotos(view,()=>it.photos||[],async f=>{sync();const pid=await P.addPhoto(it.id,f);it.photos=[...(it.photos||[]),pid].slice(0,P.MAX_PHOTOS);draw();},pid=>{sync();it.photos=(it.photos||[]).filter(p=>p!==pid);draw();},async(pid,f)=>{sync();const np=await P.addPhoto(it.id,f);it.photos=(it.photos||[]).map(p=>p===pid?np:p);draw();});hydrate(view);
    view.querySelectorAll('[data-ss]').forEach(b=>b.onclick=()=>{sync();it.soonSource=b.dataset.ss;if(it.soonSource==='item'&&(it.soonDays===''||it.soonDays==null))it.soonDays=catSoon(it.cat,s);draw();});
    view.querySelectorAll('[data-cd]').forEach(b=>b.onclick=()=>{sync();const d=+b.dataset.cd,cd=it.customDays||[];it.customDays=cd.includes(d)?cd.filter(x=>x!==d):[...cd,d];draw();});
    const save=more=>{sync();hint();const due=parseInput(dueT.value);if(!it.name.trim())return toast('请填写名称');if(!due)return toast('请填写有效的到期日');
      it.due=due;it.name=it.name.trim().slice(0,60);if(it.intensitySource==='cat')delete it.intensity;
      if(ex&&ex.due!==due){delete it.handledAt;delete it.snoozeUntil;delete it.renewAsked;}
      if(it.soonSource==='item'){if(String(it.soonDays??'').trim()==='')return toast('请填写临期天数，或选「跟随分类」');const v=Number(it.soonDays);if(!Number.isInteger(v)||v<0||v>3650)return toast('临期天数要是 0–3650 的整数');it.soonDays=v;}else{it.soonSource='cat';delete it.soonDays;}
      for(const k of ['renewMonths','qty','shelfDays'])it[k]=it[k]===''||it[k]==null?'':Number(it[k]);
      it.prodDate=parseInput(it.prodDate)||'';const from=it.rebuyFrom;delete it.rebuyFrom;
      const saved=S.upsert(it);if(!saved)return;updateBadge();
      if(!ex){const x=st();x.lastCat=it.cat;const nn=normName(it.name);const guess=inferTop2(it.name,x.catLearn)[0]||null;
        // 用户把推断结果改掉了：本地记住「名称→分类」，下次优先
        if(picked&&guess&&guess!==it.cat){x.catLearn={...(x.catLearn||{}),[nn]:it.cat};const ks=Object.keys(x.catLearn);if(ks.length>300)delete x.catLearn[ks[0]];}
        S.saveSettings(x);}
      if(more){toast('已保存，继续添加');sessionStorage.setItem('dq.prefill',JSON.stringify({cat:it.cat,intensity:it.intensity,intensitySource:it.intensitySource,customDays:it.customDays,location:it.location}));route();return;}
      if(from&&S.get(from)&&!S.get(from).deletedAt){afterRoute=()=>sheet(`<h3>旧的这批用完了吗？</h3><p class="small muted">「${h(S.get(from).name)}」到期 ${h(S.get(from).due)}</p><div class="actions"><button class="btn primary" id="used">用完了，移入回收站</button><button class="btn" id="keep">还有，保留</button></div>`,w=>{
          w.querySelector('#used').onclick=()=>{closeSheet();act('旧批次已移入回收站',()=>S.softDelete([from]));};w.querySelector('#keep').onclick=closeSheet;});location.hash='#/item/'+saved.id;return;}
      toast('已保存');location.hash='#/item/'+saved.id;};
    f.onsubmit=e=>{e.preventDefault();save(false);};$('#saveMore')&&($('#saveMore').onclick=()=>save(true));
  };draw(it.rebuyFrom?'due':null);
}

async function exportJSON(all,withPhotos=true){const s=st(),items=all?S.raw():S.all();let photos=null;
  if(withPhotos&&globalThis.indexedDB){try{photos=await P.exportPhotos(items.flatMap(i=>i.photos||[]));}catch{toast('照片读取失败，本次只导出文字数据',false,true);}}
  download(`到期提醒-${todayStr()}.json`,toJSON(items,photos,(s.cats?.custom)||[]),'application/json');const x=st();x.lastExportAt=x.lastBackupAt=new Date().toISOString();S.saveSettings(x);}
function icsSheet(){sheet(`<h3>导出到日历（.ics）</h3><p class="small muted">每条生成一个全天事件，并按提醒天数设好闹钟（当天 09:00）。iPhone：下载后点文件 →「添加到日历」。续期后请重新导出这一条。</p>
  <label class="small">范围<select id="icsR" class="inp"><option value="">全部（${S.all().length} 条）</option>${Object.entries(CATEGORIES).map(([k,c])=>`<option value="${k}">${h(c.name)}（${S.all().filter(i=>i.cat===k).length}）</option>`).join('')}</select></label>
  <label class="check"><input type="checkbox" id="icsH"> 包含已处理的条目</label><button class="btn primary block" id="icsGo">${icon('download',18)}下载 .ics</button>`,w=>{
  w.querySelector('#icsGo').onclick=()=>{const r=w.querySelector('#icsR').value,hd=w.querySelector('#icsH').checked;
    const l=S.all().filter(i=>(!r||i.cat===r)&&(hd||!i.handledAt));download(`到期提醒${r?'-'+cat(r).name:''}.ics`,toICS(l,st()),'text/calendar;charset=utf-8');closeSheet();toast(`已导出 ${l.length} 个日历事件`);};});}

// 导入：先预览，再确认
function analyzeImport(res){const ex=S.all(),seen=new Set(ex.map(i=>i.name+'|'+i.due)),ids=new Set(S.raw().map(i=>i.id));const out={add:[],upd:[],dup:[],bad:res.errors};
  for(const r of res.items){const it=r.item;if(it.id&&ids.has(it.id))out.upd.push(r);else if(seen.has(it.name+'|'+it.due))out.dup.push(r);else{out.add.push(r);seen.add(it.name+'|'+it.due);}}return out;}
function importPreview(){const a=importState.a,n=a.add.length+a.upd.length+a.dup.length+a.bad.length;
  return `<section class="card imp"><div class="micro">导入预览 · ${h(importState.file)}</div>
  <p>识别 <b class="num">${n}</b> 条${importState.photos?`${importState.settings?'（完整备份，含设置）':''}（含照片 ${Object.keys(importState.photos).length} 张）`:''}：新增 <b class="safe">${a.add.length}</b> · 更新 ${a.upd.length}（同 id）· 疑似重复 <b class="soon">${a.dup.length}</b>（同名+同到期日）· 无法识别 <b class="expired">${a.bad.length}</b></p>
  ${a.bad.length||a.dup.length?`<details><summary class="small">查看明细</summary>${a.bad.map(e=>`<p class="small expired">第 ${e.row} 行：${h(e.reason)}</p>`).join('')}${a.dup.map(e=>`<p class="small soon">第 ${e.row} 行：「${h(e.item.name)} ${h(e.item.due)}」疑似重复</p>`).join('')}</details>`:''}
  ${(()=>{const nc=[...new Set([...a.add,...a.upd,...a.dup].map(r=>r.newCat).filter(Boolean))];return nc.length?`<p class="small">新分类：${nc.map(n=>`「${h(n)}」`).join('、')}</p><div class="seg"><button data-nc="create" class="${importState.newCat==='create'?'on':''}">自动创建分类</button><button data-nc="other" class="${importState.newCat==='other'?'on':''}">归入「其他」</button></div>`:'';})()}
  ${a.dup.length?`<div class="seg"><button data-dup="skip" class="${importState.dup==='skip'?'on':''}">跳过重复</button><button data-dup="keep" class="${importState.dup==='keep'?'on':''}">仍导入</button></div>`:''}
  <div class="actions"><button class="btn primary" id="impGo">导入</button><button class="btn" id="impNo">取消</button></div></section>`;}

function settings(){
  const s=st(),n=S.all().length,tr=S.trash().length,badgeOK='setAppBadge' in navigator;
  const nItem=k=>S.all().filter(i=>i.cat===k&&inferSource(i,s).intensitySource==='item').length;
  view.innerHTML=`${top('设置')}
  ${importState?importPreview():''}
  <div class="micro pad">外观</div><section class="card"><div class="seg">${[['auto','跟随系统'],['light','浅色'],['dark','深色']].map(([k,v])=>`<button data-theme="${k}" class="${(s.theme||'auto')===k?'on':''}">${v}</button>`).join('')}</div></section>
  <div class="micro pad">数据安全</div><section class="card safe-card">${(()=>{const b=backupState(s),on=+(s.backupEvery??14)>0,ev=+(s.backupEvery||s.backupEveryLast||14),over=b.last&&b.days>=ev;
   const pill=!b.last?'<span class="st-pill warn">还没有备份</span>':over&&on?`<span class="st-pill warn">${b.days} 天未备份</span>`:`<span class="st-pill ok">已备份 · ${b.days?b.days+' 天前':'今天'}</span>`;
   const lt=b.last?(()=>{const d=new Date(b.last);return `${d.getMonth()+1}月${d.getDate()}日 ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')} · ${b.days?b.days+' 天前':'今天'}`;})():'从未';
   return `<div class="sec-head"><span class="ic" style="--c:var(--text2)">${icon('box',20)}</span><b>本机数据</b>${pill}</div>
   <div class="stat3" id="stat3"><div><span class="num" id="dsN">${n}</span><small>条目</small></div><div><span class="num" id="dsP">${S.raw().reduce((a,i)=>a+(i.photos||[]).length,0)}</span><small>照片</small></div><div id="dsSRow" hidden><span class="num" id="dsS"></span><small>占用</small></div></div>
   <div class="kv"><div><span>上次备份</span><b id="dsL">${lt}</b></div>
   <div><span>备份提醒</span><label class="sw ${on?'on':''}"><input type="checkbox" role="switch" id="bkOn" ${on?'checked':''} aria-label="备份提醒"></label></div></div>
   <div class="lbl ${on?'':'dim-l'}" style="margin-top:12px">提醒间隔</div><div class="seg ${on?'':'dim'}" id="bkSeg">${[7,14,30].map(d=>`<button data-bke="${d}" class="${ev===d?'on':''}">${d} 天</button>`).join('')}</div>
   <button class="btn primary block bk-now" id="bkNow">${icon('download',18)}<span>一键备份</span></button>
   <p class="hint">生成「到期提醒-备份-${todayStr().replace(/-/g,'')}.json」，含条目、设置、回收站和照片</p>`;})()}</section>
  <div class="micro pad">提醒</div><section class="card"><div class="lbl" style="margin-bottom:8px">全局临期阈值（未单独设置的分类）</div><div class="seg">${[7,14,30,60].map(d=>`<button data-soon="${d}" class="${globalSoon(s)==d?'on':''}">${d} 天</button>`).join('')}</div>

   ${badgeOK?`<div class="kv"><div><span>图标角标（待处理数）</span><b><button class="btn sm" id="badge">${s.badge?'已开启 · 关闭':'开启图标角标'}</button></b></div></div>`:''}
   <p class="small muted">iPhone：需要先「添加到主屏幕」。角标只在打开 App 时更新，App 关着的时候不会自动变化。想要准时提醒，请用「导出到日历」。</p>

   <div class="kv"><div><span>常用地区（新增时的模板）</span><select id="region">${[['all','都显示'],['cn','中国'],['ro','罗马尼亚']].map(([k,v])=>`<option value="${k}" ${(s.region||'all')===k?'selected':''}>${v}</option>`).join('')}</select></div></div></section>
  <div class="micro pad">通知</div><section class="card push-note"><span class="bk-ic">${icon('bell',20)}</span><div><b>准时推送和邮件提醒</b><span class="ver-pill">v1.3</span>
   <p>推送和邮件提醒在后续版本提供（推送需要 iOS 16.4 以上并添加到主屏幕）；国内安卓手机可能收不到推送，会用邮件。现在请用「导出到日历」。</p>
   <button class="btn" id="icsS2">${icon('cal',16)}导出到日历（.ics）</button></div></section>
  <div class="micro pad">分类</div><section class="card list set-list">
   <a class="set-row" href="#/catrules"><span class="grow">分类规则<small>每个分类的临期阈值和提醒强度</small></span>${icon('chev',18)}</a>
   <a class="set-row" href="#/catmgr"><span class="grow">分类管理<small>新建、改名、排序、隐藏 · 共 ${Object.keys(CATEGORIES).length} 个</small></span>${icon('chev',18)}</a></section>
  <div class="micro pad">导入导出 · 共 ${n} 条</div><section class="card btns">
   <button class="btn" id="ecsv">${icon('download',18)}导出 CSV</button><button class="btn" id="ejson">${icon('download',18)}导出 JSON</button>
   <label class="btn">${icon('upload',18)}导入 CSV / JSON<input type="file" id="imp" accept=".csv,.json,text/csv,application/json" hidden></label>
   <button class="btn" id="tpl">${icon('download',18)}下载导入模板</button>
   <label class="check full"><input type="checkbox" id="incTrash"> 导出时包含回收站</label>
   <label class="check full"><input type="checkbox" id="incPh" checked> JSON 包含照片（文件会变大；CSV 不含照片）</label></section>
  <div class="micro pad">数据</div><section class="card btns"><a class="btn" href="#/trash">${icon('trash',18)}回收站（${tr}）</a><button class="btn" id="obAgain">${icon('sparkle',18)}重新查看引导</button><button class="btn" id="demo">${icon('sparkle',18)}载入示例数据</button><button class="btn danger ghost" id="clear">${icon('trash',18)}清空全部</button></section>
  <div class="micro pad">关于</div><section class="card about"><div class="kv"><div><span>到期提醒</span><b class="ver num">v${VERSION}</b></div></div><p class="small muted" id="persist">数据只保存在本机浏览器</p></section>`;
  if(navigator.storage?.persisted)navigator.storage.persisted().then(p=>{const e=$('#persist');if(e)e.textContent=`数据只保存在本机浏览器 · 存储：${p?'已持久化':'可能被系统清理，请定期导出'}`;});
  view.querySelectorAll('[data-theme]').forEach(b=>b.onclick=()=>{s.theme=b.dataset.theme;S.saveSettings(s);applyTheme();settings();});
  $('#badge')&&($('#badge').onclick=async()=>{if(!s.badge&&'Notification' in window&&Notification.permission==='default'){try{await Notification.requestPermission()}catch{}}
    s.badge=!s.badge;S.saveSettings(s);updateBadge();settings();});
  $('#icsS2').onclick=icsSheet;
  $('#region').onchange=e=>{const x=st();x.region=e.target.value;S.saveSettings(x);toast('常用地区已更新');};
  $('#bkOn').onchange=e=>{const x=st();if(e.target.checked){x.backupEvery=+(x.backupEveryLast||14);}else{x.backupEveryLast=+(x.backupEvery||14);x.backupEvery=0;}S.saveSettings(x);settings();};
  view.querySelectorAll('[data-bke]').forEach(b=>b.onclick=()=>{const x=st();x.backupEvery=x.backupEveryLast=+b.dataset.bke;S.saveSettings(x);settings();});
  $('#bkNow').onclick=async()=>{const b=$('#bkNow');if(!await backupNow())return;b.innerHTML=`${icon('check',18)}<span>已备份</span>`;setTimeout(()=>settings(),1500);};
  navigator.storage?.estimate?.().then(e=>{const r=$('#dsSRow'),b=$('#dsS');if(r&&e&&e.usage!=null){b.innerHTML=`${(e.usage/1048576).toFixed(1)}<small class="u">MB</small>`;r.hidden=false;$('#stat3')?.classList.add('three');}}).catch(()=>{});
  $('#ecsv').onclick=()=>{download(`到期提醒-${todayStr()}.csv`,toCSV($('#incTrash').checked?S.raw():S.all()),'text/csv;charset=utf-8');s.lastExportAt=new Date().toISOString();S.saveSettings(s);};
  $('#ejson').onclick=()=>exportJSON($('#incTrash').checked,$('#incPh').checked);
  $('#tpl').onclick=()=>download('到期提醒-导入模板.csv',TEMPLATE_CSV,'text/csv;charset=utf-8');
  $('#imp').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{const t=await f.text();const res=/\.json$/i.test(f.name)||/^\s*[\[{]/.test(t)?parseJSON(t):parseCSV(t);
    importState={file:f.name,a:analyzeImport(res),dup:'skip',photos:res.photos,categories:res.categories,settings:res.settings,newCat:'create'};settings();window.scrollTo(0,0);}catch(err){toast('导入失败：'+err.message);}};
  view.querySelectorAll('[data-dup]').forEach(b=>b.onclick=()=>{importState.dup=b.dataset.dup;settings();});
  view.querySelectorAll('[data-nc]').forEach(b=>b.onclick=()=>{importState.newCat=b.dataset.nc;settings();});
  $('#impNo')&&($('#impNo').onclick=()=>{importState=null;settings();});
  $('#impGo')&&($('#impGo').onclick=()=>{const a=importState.a,rows=[...a.add,...a.upd,...(importState.dup==='keep'?a.dup.map(r=>({...r,item:{...r.item,id:undefined}})):[])];
    S.snapshot();const cs=st();cs.cats=cs.cats||{};cs.cats.custom=cs.cats.custom||[];
    // 分类按名称合并；没有条目引用的分类不创建（round4 P1）
    const remap={};for(const d of importState.categories||[]){if(!d||!/^c_[a-z0-9]{1,24}$/.test(d.id)||CATEGORIES[d.id]||cs.cats.custom.some(c=>c.id===d.id))continue;const nm=String(d.name||'').normalize('NFKC').trim().slice(0,20);
      const same=Object.entries(CATEGORIES).find(([,c])=>c.name===nm)?.[0]||cs.cats.custom.find(c=>c.name===nm)?.id;if(same){remap[d.id]=same;continue;}
      if(!rows.some(r=>r.item.cat===d.id))continue;cs.cats.custom.push({id:d.id,name:nm,icon:d.icon,color:d.color});}
    for(const r of rows)if(remap[r.item.cat])r.item.cat=remap[r.item.cat];
    // 完整备份里的设置：恢复偏好（不覆盖本机已有的分类定义）
    const bs=importState.settings;if(bs){for(const k of ['theme','soonDays','catSoon','catIntensity','badge','backupEvery','region','catLearn','lastCat','onboarded','lastBackupAt'])if(bs[k]!==undefined)cs[k]=bs[k];
      if(bs.cats){const mine=cs.cats;for(const d of Array.isArray(bs.cats.custom)?bs.cats.custom:[])if(d&&/^c_[a-z0-9]{1,24}$/.test(d.id)&&!CATEGORIES[d.id]&&!mine.custom.some(c=>c.id===d.id||c.name===d.name)&&!Object.values(CATEGORIES).some(c=>c.name===d.name))mine.custom.push({id:d.id,name:String(d.name||'').slice(0,20),icon:d.icon,color:d.color});for(const k of ['hidden','names','order'])if(!(mine[k]&&Object.keys(mine[k]).length)&&bs.cats[k])mine[k]=bs.cats[k];}}
    if(importState.newCat==='create'){const made={};for(const r of rows)if(r.newCat){if(!made[r.newCat]){const id='c_'+Math.random().toString(36).slice(2,10);made[r.newCat]=id;cs.cats.custom.push({id,name:r.newCat,icon:'box',color:COLORS[cs.cats.custom.length%COLORS.length]});}r.item.cat=made[r.newCat];}}
    S.saveSettings(cs);applyCats(cs);const l=rows.map(r=>inferSource(r.item,cs));
    const ph=importState.photos;importState=null;S.merge(l);if(!S.lastSaveFailed){toast(`已导入 ${l.length} 条`,true);updateBadge();}
    if(ph&&!S.lastSaveFailed&&globalThis.indexedDB){P.importPhotos(ph,l.flatMap(i=>i.photos||[])).then(n=>{if(n)toast(`已导入 ${l.length} 条，照片 ${n} 张`);}).catch(photoErr);}settings();});
  $('#obAgain').onclick=onboarding;
  $('#demo').onclick=()=>{act('已载入示例数据',seed);settings();};
  $('#clear').onclick=async()=>{if(!n)return;await exportJSON();act(`已清空 ${n} 条（已自动下载备份，可在回收站恢复）`,()=>S.softDelete(S.all().map(i=>i.id)));settings();};
}
// 分类规则二级页：每个分类的临期阈值 + 默认提醒强度
function catRules(){const s=st(),nItem=k=>S.all().filter(i=>i.cat===k&&inferSource(i,s).intensitySource==='item').length;
  view.innerHTML=`${top('分类规则',{back:true})}
  <section class="card list set-list sum">${Object.entries(CATEGORIES).map(([k,c])=>`<div class="set-row"><span class="il" style="color:${c.color}">${ci(k,18)}</span><span class="grow">${h(c.name)} · ${catSoon(k,s)} 天 · ${INTENSITY[catDefault(k,s)].name}</span></div>`).join('')}</section>
  <div class="micro pad">临期阈值（单条可再单独设置）</div><section class="card kv rules">${Object.entries(CATEGORIES).map(([k,c])=>{const v=(s.catSoon||{})[k],def=c.soon;
    return `<div><span class="il" style="color:${c.color}">${ci(k,18)}<em>${h(c.name)}</em></span><select data-cs="${k}" aria-label="${h(c.name)}临期阈值">
    <option value="" ${v==null?'selected':''}>默认 ${def!=null?def:globalSoon(s)} 天</option>
    ${def!=null?`<option value="g" ${v==='g'?'selected':''}>全局 ${globalSoon(s)} 天</option>`:''}
    ${[1,3,7,14,30,60,90,180].map(d=>`<option value="${d}" ${v===d?'selected':''}>${d} 天</option>`).join('')}</select></div>`;}).join('')}</section>
  <div class="micro pad">默认提醒强度（跟随分类的条目立即生效）</div><section class="card kv rules">${Object.entries(CATEGORIES).map(([k,c])=>`<div><span class="il" style="color:${c.color}">${ci(k,18)}<em>${h(c.name)}</em></span>
   <span class="ci-r">${nItem(k)?`<a href="#" data-over="${k}" class="small">覆盖 ${nItem(k)} 条单独设置</a>`:''}<select data-ci="${k}">${Object.entries(INTENSITY).filter(([x])=>x!=='custom').map(([x,v])=>`<option value="${x}" ${catDefault(k,s)===x?'selected':''}>${v.name}</option>`).join('')}</select></span></div>`).join('')}</section>`;
  view.querySelectorAll('[data-cs]').forEach(x=>x.onchange=()=>{s.catSoon=s.catSoon||{};const v=x.value;if(v==='')delete s.catSoon[x.dataset.cs];else s.catSoon[x.dataset.cs]=v==='g'?'g':+v;
    S.saveSettings(s);toast(`${h(cat(x.dataset.cs).name)}临期阈值：${catSoon(x.dataset.cs,s)} 天`);});
  view.querySelectorAll('[data-soon]').forEach(b=>b.onclick=()=>{s.soonDays=+b.dataset.soon;S.saveSettings(s);catRules();});
  view.querySelectorAll('[data-ci]').forEach(x=>x.onchange=()=>{const old=S.all().map(i=>inferSource(i,st()));s.catIntensity[x.dataset.ci]=x.value;S.saveSettings(s);
    // 先固化旧数据的来源，避免改默认后被误判
    S.replaceAll(S.raw().map(i=>i.deletedAt?i:(old.find(o=>o.id===i.id)||i)));toast(`${h(cat(x.dataset.ci).name)}默认改为「${INTENSITY[x.value].name}」`);catRules();});
  view.querySelectorAll('[data-over]').forEach(a=>a.onclick=e=>{e.preventDefault();const k=a.dataset.over,v=catDefault(k,s),cnt=nItem(k);
    if(!confirm(`将覆盖 ${cnt} 条单独设置，全部改为跟随分类（${INTENSITY[v].name}），可撤销。继续？`))return;
    act(`已覆盖 ${cnt} 条单独设置`,()=>S.replaceAll(S.raw().map(i=>i.cat===k&&!i.deletedAt?{...inferSource(i,s),intensitySource:'cat',intensity:undefined}:i)));catRules();});
}

// 分类管理：新建 / 改名 / 图标与颜色 / 排序 / 隐藏内置 / 删除自定义
function catMgr(){const s=st(),cnt=k=>S.all().filter(i=>i.cat===k).length,keys=Object.keys(CATEGORIES);
  view.innerHTML=`${top('分类管理',{back:true,right:`<button class="btn sm" id="catNew">${icon('add',16)} 新建</button>`})}
  <section class="card list catmgr">${keys.map((k,i)=>{const c=CATEGORIES[k];return `<div class="row cm-row ${c.hidden?'is-hidden':''}" data-k="${h(k)}">
   <span class="ic" style="--c:${c.color}">${ci(k)}</span><span class="grow"><b class="ell">${h(c.name)}</b><small>${c.builtin?'内置':'自定义'} · ${cnt(k)} 条${c.hidden?'<em class="hid-tag">已隐藏</em>':''}</small></span>
   <span class="drag" data-drag aria-label="拖动排序" title="拖动排序"><svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor"><circle cx="7" cy="5" r="1.4"/><circle cx="13" cy="5" r="1.4"/><circle cx="7" cy="10" r="1.4"/><circle cx="13" cy="10" r="1.4"/><circle cx="7" cy="15" r="1.4"/><circle cx="13" cy="15" r="1.4"/></svg></span></div>`;}).join('')}</section>
  <p class="hint catmgr-hint">点一行编辑；按住右侧手柄拖动排序。内置分类可以改名或隐藏，自定义分类可以改图标、颜色或删除。</p>`;
  const save=(msg,f)=>{const x=st();x.cats=x.cats||{};f(x.cats,x);act(msg,()=>S.saveSettings(x));catMgr();};
  view.querySelectorAll('.cm-row').forEach(r=>r.onclick=e=>{if(e.target.closest('[data-drag]'))return;catSheet(r.dataset.k);});
  // 拖拽排序（指针事件，触屏和鼠标通用）
  const list=view.querySelector('.catmgr');
  view.querySelectorAll('[data-drag]').forEach(hd=>hd.onpointerdown=e=>{e.preventDefault();const row=hd.closest('.cm-row');row.classList.add('dragging');
    // 移动节点会丢失 pointer capture，所以监听挂在 window 上
    const mv=ev=>{const rows=[...list.querySelectorAll('.cm-row')].filter(x=>x!==row);const t=rows.find(x=>{const b=x.getBoundingClientRect();return ev.clientY<b.top+b.height/2;});if((t||null)!==row.nextElementSibling)list.insertBefore(row,t||null);};
    const up=()=>{removeEventListener('pointermove',mv);removeEventListener('pointerup',up);removeEventListener('pointercancel',up);row.classList.remove('dragging');
      const o=[...list.querySelectorAll('.cm-row')].map(x=>x.dataset.k);if(o.join()!==Object.keys(CATEGORIES).join())save('已调整顺序',c=>{c.order=o;});};
    addEventListener('pointermove',mv);addEventListener('pointerup',up);addEventListener('pointercancel',up);});
  window.catMove=(k,d)=>save('已调整顺序',c=>{const o=Object.keys(CATEGORIES),i=o.indexOf(k),j=i+d;if(j<0||j>=o.length)return;[o[i],o[j]]=[o[j],o[i]];c.order=o;});
  $('#catNew').onclick=()=>catSheet(null);}
function catSheet(k){const c=k?CATEGORIES[k]:{name:'',icon:'box',color:COLORS[0],custom:true};let ic=c.icon,col=c.color;const n=k?S.all().filter(i=>i.cat===k).length:0;
  sheet(`<h3>${k?'编辑分类':'新建分类'}</h3><label class="small">名称<input id="cName" class="inp" maxlength="20" value="${h(c.name)}" placeholder="例如：宠物"></label>
   ${c.builtin?'':`<div class="small muted">图标</div><div class="ic-pick">${ICON_SET.map(x=>`<button type="button" data-ic="${x}" class="${x===ic?'on':''}" aria-label="${x}">${icon(x,20)}</button>`).join('')}</div>
   <div class="small muted">颜色</div><div class="col-pick">${COLORS.map(x=>`<button type="button" data-col="${x}" class="${x===col?'on':''}" style="--c:${x}" aria-label="${x}"></button>`).join('')}</div>`}
   ${k?`<div class="seg mv-seg"><button type="button" data-smv="-1">${icon('back',16)} 上移</button><button type="button" data-smv="1">下移 ${icon('chev',16)}</button></div>`:''}
   <button class="btn primary block" id="cSave">保存</button>
   ${k&&c.builtin&&k!=='other'?`<button class="btn block" id="cHide">${c.hidden?'取消隐藏':'隐藏这个分类'}</button>`:''}
   ${k&&c.custom?`<button class="btn danger ghost block" id="cDel">${icon('trash',18)}删除分类</button>`:''}`,w=>{
   w.querySelectorAll('[data-ic]').forEach(b=>b.onclick=()=>{ic=b.dataset.ic;w.querySelectorAll('[data-ic]').forEach(x=>x.classList.toggle('on',x===b));});
   w.querySelectorAll('[data-col]').forEach(b=>b.onclick=()=>{col=b.dataset.col;w.querySelectorAll('[data-col]').forEach(x=>x.classList.toggle('on',x===b));});
   w.querySelectorAll('[data-smv]').forEach(b=>b.onclick=()=>{closeSheet();window.catMove(k,+b.dataset.smv);});
   w.querySelector('#cSave').onclick=()=>{const name=w.querySelector('#cName').value.normalize('NFKC').trim().slice(0,20);if(!name)return toast('请填写分类名称');
     if(Object.entries(CATEGORIES).some(([id,x])=>id!==k&&x.name===name))return toast('已有同名分类');
     const x=st();x.cats=x.cats||{};x.cats.custom=x.cats.custom||[];x.cats.names=x.cats.names||{};
     if(!k){const id='c_'+Math.random().toString(36).slice(2,10);x.cats.custom.push({id,name,icon:ic,color:col});}
     else if(c.builtin)x.cats.names[k]=name;else{const d=x.cats.custom.find(d=>d.id===k);Object.assign(d,{name,icon:ic,color:col});}
     closeSheet();act(k?'分类已更新':`已新建分类「${name}」`,()=>S.saveSettings(x));catMgr();};
   w.querySelector('#cHide')&&(w.querySelector('#cHide').onclick=()=>{const x=st();x.cats=x.cats||{};const hd=new Set(x.cats.hidden||[]);hd.has(k)?hd.delete(k):hd.add(k);x.cats.hidden=[...hd];
     closeSheet();act(hd.has(k)?`已隐藏「${c.name}」`:`已显示「${c.name}」`,()=>S.saveSettings(x));catMgr();});
   w.querySelector('#cDel')&&(w.querySelector('#cDel').onclick=()=>{if(!confirm(`删除分类「${c.name}」？${n?`其中的 ${n} 条会移到「其他」。`:''}可以撤销。`))return;
     closeSheet();act(`已删除分类「${c.name}」${n?`，${n} 条已移到「其他」`:''}`,()=>{
       S.replaceAll(S.raw().map(i=>i.cat===k?{...i,cat:'other'}:i));const x=st();x.cats.custom=(x.cats.custom||[]).filter(d=>d.id!==k);x.cats.order=(x.cats.order||[]).filter(o=>o!==k);
       if(x.catSoon)delete x.catSoon[k];if(x.catIntensity)delete x.catIntensity[k];S.saveSettings(x);});catMgr();});});}

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

document.querySelectorAll('#tabbar [data-ic]').forEach(e=>e.innerHTML=e.dataset.ic==='add'?icon('add',20,'',2.25):icon(e.dataset.ic,24));
function route(){
  applyTheme();applyCats(st());closeSheet();document.querySelector('.viewer')?.remove();const [path,qs]=(location.hash.slice(1)||'/').split('?'),q=new URLSearchParams(qs),p=path.split('/').filter(Boolean);
  const tab={'':'home',todo:'home',cats:'cats',cat:'cats',cal:'cal',settings:'settings',trash:'settings',catmgr:'settings',catrules:'settings',new:'new'}[p[0]||'']||'';
  document.querySelectorAll('#tabbar a').forEach(a=>a.classList.toggle('on',a.dataset.tab===tab));
  view.classList.remove('in');window.scrollTo(0,0);
  const r={'':home,todo:todoPage,cats,cat:()=>catList(p[1]),cal,item:()=>detail(p[1]),new:()=>form(null,q),edit:()=>form(p[1],q),settings,trash:trashPage,catmgr:catMgr,catrules:catRules}[p[0]||''];
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
// N4：已有数据的老用户升级后不再弹引导
if(!st().onboarded&&S.raw().length){const s=st();s.onboarded=true;S.saveSettings(s);}
if(!st().onboarded)onboarding();
addEventListener('hashchange',route);route();updateBadge();
document.addEventListener('visibilitychange',()=>{if(!document.hidden){updateBadge();if(!location.hash.startsWith('#/new')&&!location.hash.startsWith('#/edit'))route();}});
if('serviceWorker' in navigator&&location.protocol!=='file:')navigator.serviceWorker.register('./sw.js').catch(()=>{});
