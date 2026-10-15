import * as S from './store.js';
import {VERSION} from './version.js';
import {t,joinSent,setLang,getLang,detectLang,LANGS,anyLang,fmtDay,fmtDate,fmtMD,fmtTime,fmtMonth,weekdays,weekStart,fmtNum} from './i18n/i18n.js';
import {CATEGORIES,TEMPLATES,INTENSITY,findTpl,PERISHABLE,CUSTOM_PRESET,applyCats,visibleCats,ICON_SET,COLORS,inferTop2,normName,tplFor,REGIONS,mergeIntoBuiltin,renameDupCustom,isTplName,catAlias} from './templates.js';
// 默认分类：上次保存的分类 > 条目最多的分类 > 食品
const defaultCat=s=>{if(CATEGORIES[s.lastCat]&&!CATEGORIES[s.lastCat].hidden)return s.lastCat;const c={};for(const i of S.all())if(CATEGORIES[i.cat]&&!CATEGORIES[i.cat].hidden)c[i.cat]=(c[i.cat]||0)+1;const top=Object.entries(c).sort((a,b)=>b[1]-a[1])[0];return top?top[0]:'food';};
import {daysLeft,label,labelFull,todayStr,addDays,addMonths,fmt,nice,valid,parseInput,parse} from './dates.js';
import {catDefault,effInt,inferSource,remindDays,itemState,todoList,leadDays,effSoon,catSoon,globalSoon} from './logic.js';
import {icon} from './icons.js';
import {toCSV,parseCSV,parseJSON,toJSON,download,templateCSV} from './io.js';
import {toICS} from './ics.js';
import * as P from './photos.js';

const $=s=>document.querySelector(s), view=$('#view');
const h=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ST=new Proxy({},{get:(o,k)=>t('state.'+String(k))});
const md=s=>fmtMD(s);
let afterRoute=null,homeSeg='all', calMonth=null, calSel=null, importState=null;
const st=()=>S.settings();
const cat=k=>CATEGORIES[k]||CATEGORIES.other;
const ci=(k,s=22)=>icon(cat(k).icon||'other',s);
const curLang=()=>{const l=S.settings().lang;return ['zh','ro','en'].includes(l)?l:detectLang();};
setLang(curLang());
// 常用地区：没设置过时按语言给默认值（zh 都显示；ro/en 罗马尼亚 + 通用）
// 默认地区与界面语言无关：先看 navigator.language 的地区码，再看时区，都判断不了就中罗两组都显示（R8-2）
const CN_TZ=/^(Asia\/(Shanghai|Chongqing|Chungking|Harbin|Urumqi|Kashgar)|PRC)$/,RO_TZ=/^Europe\/Bucharest$/;
export function detectRegion(lang=globalThis.navigator?.language,tz=(()=>{try{return Intl.DateTimeFormat().resolvedOptions().timeZone;}catch{return '';}})()){
  const rg=(String(lang||'').split(/[-_]/).slice(1).find(x=>/^[a-z]{2}$/i.test(x))||'').toUpperCase();
  const lr=rg==='CN'?'cn':rg==='RO'?'ro':'',tr=CN_TZ.test(tz||'')?'cn':RO_TZ.test(tz||'')?'ro':'';
  // v1.7.4 PM：语言地区与时区地区都已知且不同 → 两组都显示，时区组在前（如 'ro+cn'）
  if(lr&&tr&&lr!==tr)return tr+'+'+lr;return tr||lr||'all';}
const regs=r=>String(r||'all').split('+');
const regionOf=s=>(s.region&&s.region!=='auto'?s.region:'')||detectRegion();
applyCats(S.settings());
// 静态外壳（底栏、侧栏品牌、标题）跟随语言
function chrome(){document.title=t('app.name');const b=document.querySelector('.side-brand');if(b&&b.lastChild&&b.lastChild.nodeType===3)b.lastChild.textContent=t('app.name');
  document.querySelectorAll('[data-tab]').forEach(a=>{const sp=a.querySelector('span');if(sp)sp.textContent=t('tab.'+(a.dataset.tab==='settings'?'me':a.dataset.tab));});}
// v1.2：自建的「日用品」并入内置 daily
{const m=mergeIntoBuiltin(S.settings(),JSON.parse(localStorage.getItem('dq.items.v2')||'[]'));if(m.changed){S.snapshot();localStorage.setItem('dq.items.v2',JSON.stringify(m.items));S.saveSettings(m.st);setTimeout(()=>toast(t('cat.mergeToast'),true),600);}}
// v1.7.2：自建「Home」等与内置同名的分类改名（条目不动）
{const r=renameDupCustom(S.settings(),n=>t('cat.dupRename',{name:n}));if(r.changed){S.saveSettings(r.st);}}

function applyTheme(){const tp=st().theme;if(tp&&tp!=='auto')document.documentElement.dataset.theme=tp;else delete document.documentElement.dataset.theme;}
// 通用 toast / 撤销条（5 秒）
let toastEl=null,toastTimer=null;
let errUntil=0;
// 撤销钩子：撤销时还原照片（R7-1），撤销窗口结束时真正清理照片（R7-2）
let curHooks=null;
function endHooks(kind){const k=curHooks;curHooks=null;if(k&&k[kind])Promise.resolve().then(k[kind]).catch(()=>{});}
function toast(m,undo,err,extra,ms,hooks){if(!err&&Date.now()<errUntil)return;if(err)errUntil=Date.now()+3000;if(!(undo&&hooks&&hooks===curHooks))endHooks('expire');toastEl?.remove();clearTimeout(toastTimer);if(undo&&hooks)curHooks=hooks;const tp=document.createElement('div');tp.className='toast';
  // R7-3：读屏播报；放在 body 最前，第一次 Tab 就到「撤销」
  tp.setAttribute('role','status');tp.setAttribute('aria-live','polite');
  tp.innerHTML=`<span>${h(m)}</span>${extra?`<button class="x2">${h(extra.label)}</button>`:''}${undo?'<button class="undo">'+t('undo')+'</button>':''}`;document.body.prepend(tp);toastEl=tp;
  if(extra)tp.querySelector('.x2').onclick=()=>{tp.remove();extra.fn();};
  if(undo)tp.querySelector('.undo').onclick=()=>{if(S.undo()){const k=curHooks;curHooks=null;tp.remove();Promise.resolve(k?.undo?.()).catch(()=>{}).then(()=>route());toast(t('undone'));route();}else route();};
  if(err)tp.classList.add('err');// R7-3：操作后焦点丢了（按钮随重绘消失）就把焦点给「撤销」；有输入框要焦点时（再加一条）不抢
  if(undo){const ff=()=>{const a=document.activeElement;if(tp.isConnected&&(!a||a===document.body||!a.isConnected))tp.querySelector('.undo')?.focus({preventScroll:true});};setTimeout(ff,0);setTimeout(ff,150);}
  toastTimer=setTimeout(()=>{tp.remove();if(undo)endHooks('expire');},undo?(ms||UNDO_MS):err?3000:1900);}
// 所有撤销 toast 共用同一个时长（PM：8 秒）
const UNDO_MS=8000;
const PHOTO_GC={expire:()=>globalThis.indexedDB&&P.cleanup(S.raw().flatMap(i=>i.photos||[]))};
function act(msg,fn,extra,ms,hooks){S.snapshot();fn();if(S.lastSaveFailed)return false;toast(msg,true,false,extra,ms,hooks);updateBadge();return true;}
// 底部弹出表单
// 应用内二次确认（危险操作统一用它，不用原生 confirm）
function ask(title,body,ok,danger=true,keep){return new Promise(res=>{let done=false;const esc=e=>{if(e.key==='Escape')fin(false);};const fin=v=>{if(done)return;done=true;removeEventListener('keydown',esc);closeSheet();res(v);};
  // G3：keep 给定时为并排按钮：主按钮「继续编辑」在前，危险按钮在后
  const okB=`<button class="btn ${danger?'danger':'primary'}${keep?'':' block'}" id="askOk">${h(ok)}</button>`;
  sheet(`<h3>${h(title)}</h3>${body?`<p class="small muted">${h(body)}</p>`:''}${keep?`<div class="btns row2"><button class="btn primary" id="askNo">${h(keep)}</button>${okB}</div>`:`<div class="btns col">${okB}<button class="btn block" id="askNo">${t('restore.cancel')}</button></div>`}`,
   w=>{addEventListener('keydown',esc);w.querySelector('#askOk').onclick=()=>fin(true);w.querySelector('#askNo').onclick=()=>fin(false);w.querySelector('.sheet-bg').addEventListener('click',()=>fin(false));if(keep)w.querySelector('#askNo').focus();});});}
function sheet(html,bind){closeSheet();const w=document.createElement('div');w.className='sheet-wrap';w.innerHTML=`<div class="sheet-bg"></div><div class="sheet">${html}</div>`;
  document.body.appendChild(w);w.querySelector('.sheet-bg').onclick=closeSheet;bind?.(w);return w;}
function closeSheet(){document.querySelector('.sheet-wrap')?.remove();}

function enrich(){const s=st();return S.all().map(it=>{inferSource(it,s);const n=daysLeft(it.due);return {...it,n,st:itemState(it,s)};}).sort((a,b)=>a.n-b.n);}
const cnDate=d=>fmtDate(d);
function top(title,{back=false,right=''}={}){return `<header class="top">${back?`<button class="icon-btn" data-back aria-label="${t('ui.top.1')}">${icon('back',20)}</button>`:''}<h1>${title}</h1><div class="grow"></div>${right}</header>`;}
// G08：「临近」天数分段只有在 320 等窄屏放不下时才换短格式 ui.dDaysShort
export function fitSoonSeg(root){const bs=[...root.querySelectorAll('.seg [data-soon]')];if(bs.some(b=>b.scrollWidth>b.clientWidth+1))bs.forEach(b=>{b.textContent=t('ui.dDaysShort',{n:+b.dataset.soon});b.title=t('ui.settings.11',{n:+b.dataset.soon});});}
const dUnit=()=>t('ui.dDaysShort',{n:''}).trim();
function row(it,short){return `<a class="row" href="#/item/${h(it.id)}">
  <span class="ic" style="--c:${cat(it.cat).color}">${ci(it.cat)}</span>
  ${it.photos?.length?`<img class="thumb" data-ph="${h(it.photos[0])}" alt="">`:''}<span class="grow"><b class="ell">${h(it.name)}</b><small>${h(it.due)}${it.qty?` ${t('ui.row.1',{qty:it.qty})}`:''}${it.location?` · ${h(it.location)}`:''}${it.handledAt?t('ui.row.2'):''}</small></span>
  <span class="cd ${it.st}${short?' short':''}"${short?` title="${it.n<0?t('ui.row.3',{n:-it.n}):t('ui.row.4',{n:it.n})}"`:''}><span class="num">${short&&it.n<0?'−':''}${it.n<0?-it.n:it.n}</span><small>${short&&it.n!==0?dUnit():it.n<0?t('ui.row.3',{n:-it.n}):it.n===0?t('row.today'):t('ui.row.4',{n:it.n})}</small><i class="bar"></i></span></a>`;}
function ring(pct,size=148,w=14){const r=(size-w)/2,c=2*Math.PI*r;return `<svg class="ring" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
  <circle cx="${size/2}" cy="${size/2}" r="${r}" class="ring-bg" stroke-width="${w}" fill="none"/>
  <circle cx="${size/2}" cy="${size/2}" r="${r}" class="ring-fg" stroke-width="${w}" fill="none" stroke-linecap="round"
   stroke-dasharray="${c}" stroke-dashoffset="${c}" data-off="${c*(1-pct)}" transform="rotate(-90 ${size/2} ${size/2})"/></svg>`;}

const RK={soon:'state.soon',expired:'state.expired',today:'reason.today',lead:'reason.lead',askRenew:'reason.askRenew',snooze:'todo.snooze',weekly:'reason.weekly'};
const REASON=new Proxy({},{get:(o,k)=>RK[k]?t(RK[k]):''});
let sel=false;const selSet=new Set();
function todoRow(it){const tag=it.reason==='remind'||it.reason==='soon'?label(it.n):it.reason==='expired'?label(it.n):REASON[it.reason];
  return `<div class="todo-row ${sel?'selecting':''}" data-id="${h(it.id)}">
  <a href="#/item/${h(it.id)}" class="todo-main"><span class="ic sm" style="--c:${cat(it.cat).color}">${ci(it.cat,18)}</span>
   <span class="grow"><b class="ell">${h(it.name)}</b><small class="${it.n<0?'expired':it.n<=7?'soon':'muted'}">${h(tag)}${it.reason==='lead'||it.reason==='askRenew'?` · ${label(it.n)}`:''}${effInt(it,st())==='strong'?t('ui.todoRow.1'):''}</small></span></a>
  <div class="todo-act">${sel?`<span class="ck ${selSet.has(it.id)?'on':''}">${selSet.has(it.id)?icon('check',14):''}</span>`:it.reason==='askRenew'?`<button data-a="renew">${icon('renew',16)}${t('todo.renew')}</button><button data-a="noRenew">${t('todo.noRenew')}</button>`:
   it.renewMonths?`<button data-a="renew">${icon('renew',16)}${t('todo.renew')}</button><button data-a="more" class="more" aria-label="${t('ui.todoRow.2')}">${icon('more',20)}</button>`:`<button data-a="done">${icon('check',16)}${t('todo.done')}</button><button data-a="more" class="more" aria-label="${t('ui.todoRow.2')}">${icon('more',20)}</button>`}</div></div>`;}
// 全部搞定 / 多选搞定：规则同单条——有续期周期的续到下一期，其余标为搞定；一次快照，一次撤销恢复全部
function batchDone(ids,after){const today=todayStr();let m=0;
  const ok=(S.snapshot(),S.replaceAll(S.raw().map(x=>{if(!ids.includes(x.id))return x;x={...x};
    if(x.renewMonths){const base=daysLeft(x.due)<0?today:x.due,nx=addMonths(base,+x.renewMonths);(x.history=x.history||[]).push({from:x.due,to:nx,at:today});x.due=nx;m++;delete x.handledAt;delete x.renewAsked;delete x.snoozeUntil;}
    else{x.handledAt=today;delete x.snoozeUntil;}return x;})),!S.lastSaveFailed);
  if(ok)updateBadge();if(ok)toast(m?t('todo.allDoneToastRenew',{n:ids.length,m}):t('todo.allDoneToast',{n:ids.length}),true);sel=false;selSet.clear();after&&after();}
// 设计 v1.6：「全部搞定」直接执行（不确认，可撤销）；列表整体淡出 200ms，200ms 后出现完成卡；减少动态效果时不播动画
function confirmAll(list,after){const ids=list.map(x=>x.id);if(reduced())return batchDone(ids,after);
  const box=view.querySelector('.todo:not(.later)')||view.querySelector('.today-card');box?.classList.add('fading');setTimeout(()=>batchDone(ids,after),200);}
function bindTodo(root,rerender){
  // 多选：长按一行进入；勾选模式下点行切换
  root.querySelectorAll('.todo-row').forEach(r=>{let tm;r.onpointerdown=()=>{tm=setTimeout(()=>{tm=null;if(!r.closest('.todo:not(.later)'))return;sel=true;selSet.add(r.dataset.id);rerender===home?(location.hash='#/todo'):rerender();},500);};
    r.onpointerup=r.onpointerleave=()=>clearTimeout(tm);
    if(sel)r.onclick=e=>{e.preventDefault();const id=r.dataset.id;selSet.has(id)?selSet.delete(id):selSet.add(id);rerender();};});
  if(sel)return;
root.querySelectorAll('.todo-row [data-a]').forEach(b=>b.onclick=e=>{e.preventDefault();const id=b.closest('.todo-row').dataset.id,a=b.dataset.a,it=S.get(id);
  if(a==='done'&&!b.dataset.anim&&!reduced()){const r=b.closest('.todo-row');b.dataset.anim=1;r.classList.add('leaving');return setTimeout(()=>b.click(),440);}
  if(a==='done')act(t('todo.doneToast',{name:it.name}),()=>S.patch(id,x=>{x.handledAt=todayStr();delete x.snoozeUntil;}));
  if(a==='snooze')act(t('todo.snoozeToast',{name:it.name}),()=>S.patch(id,x=>{x.snoozeUntil=addDays(todayStr(),1);}));
  if(a==='noRenew')act(t('todo.noRenewToast'),()=>S.patch(id,x=>{x.renewAsked=true;}));
  if(a==='renew')return renewFlow(id,rerender);
  if(a==='more'){const snoozed=b.closest('.later');return sheet(`<h3>${h(it.name)}</h3><p class="small muted">${h(labelFull(daysLeft(it.due)))} · ${h(it.due)}</p>
    <div class="sheet-list"><button data-s="renew">${icon('renew',20)}${t('todo.renew')}</button>${snoozed?'':`<button data-s="snooze">${icon('bell',20)}${t('ui.bindTodo.1')}</button>`}<a href="#/item/${h(id)}">${icon('chev',20)}${t('ui.bindTodo.2')}</a></div>`,w=>{
    w.querySelector('[data-s=renew]').onclick=()=>{closeSheet();renewFlow(id,rerender);};
    w.querySelector('[data-s=snooze]')&&(w.querySelector('[data-s=snooze]').onclick=()=>{closeSheet();act(t('todo.snoozeToast',{name:it.name}),()=>S.patch(id,x=>{x.snoozeUntil=addDays(todayStr(),1);}));rerender();});});}
  rerender();});}

const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
// 进场动效：每项错开 30ms，最多 8 项；圆环 420ms 填充
function hydrate(root=document){root.querySelectorAll('img[data-ph]:not([src])').forEach(img=>P.url(img.dataset.ph,img.dataset.kind||'thumb').then(u=>{if(u)img.src=u;else img.classList.add('missing');}).catch(()=>img.classList.add('missing')));}
function enter(){hydrate(view);const kids=[...view.children];kids.forEach((e,i)=>{e.classList.add('enter');e.style.setProperty('--i',Math.min(i,8));});
  view.querySelectorAll('.list .row').forEach((e,i)=>{e.classList.add('enter');e.style.setProperty('--i',Math.min(i,8));});
  fillRing();}
function fillRing(){requestAnimationFrame(()=>requestAnimationFrame(()=>view.querySelectorAll('.ring-fg[data-off]').forEach(c=>c.style.strokeDashoffset=c.dataset.off)));}
// v1.7.3：首页/引导/空状态的示例跟地区走（地区 = 设置 > navigator.language 地区码 > 时区）
const EX={cn:['cnId','cnPassport','cnDriving','cnCompulsory','cnCommercial','cnInspectionMark','cnInspection','cnMedical'],ro:['roPermit','roRca','roItp','roRovinieta'],gen:['passport','carIns','milk','meds']};
export const exampleIds=r=>r.includes('+')?[...new Set(regs(r).flatMap(x=>EX[x]).concat('milk'))]:r==='cn'?[...EX.cn,'milk']:r==='ro'?[...EX.ro,'milk']:[...EX.gen,...EX.ro,...EX.cn.filter(x=>x!=='cnPassport')];
// 罗马尼亚专有名词在非罗语界面加一句解释（gloss.*）
const tplLabel=id=>getLang()!=='ro'&&dictHas('gloss.'+id)?t('gloss.'+id):dictHas('tplShort.'+id)?t('tplShort.'+id):t('tpl.'+id);
const dictHas=k=>t(k)!==k;
function emptyState(){return `${top(t('app.name'))}<section class="empty-state">
  <div class="empty-ring">${ring(0,64,6)}</div>
  <h2>${t('empty.title')}</h2><p>${t('empty.sub')}</p>
  <a class="btn sm primary cta" href="#/new">${icon('add',18)}${t('ui.emptyState.1')}</a>
  <div class="tpl-quick">${exampleIds(regionOf(st())).map(id=>TEMPLATES.find(x=>x.id===id)).filter(Boolean).map(x=>`<a href="#/new?tpl=${x.id}" data-ex="${x.id}">${ci(x.cat,16)}${h(tplLabel(x.id))}</a>`).join('')}</div>
  <p class="small muted empty-restore">${t('ui.emptyState.2')}<button class="link" id="emptyRestore">${t('set.restore')}</button></p></section>`;}
function bindEmpty(){$('#emptyRestore')&&($('#emptyRestore').onclick=pickRestore);}
// 照片区块：缩略图 + 拍照/相册
let capMsg='',capUntil=0;
function photoBlock(ids=[],inForm=false){ids=ids||[];const full=ids.length>=P.MAX_PHOTOS;
  return `<section class="${inForm?'photo-field':'card'} photos"><div class="micro">${t('ui.photoBlock.1',{n:ids.length,MAX_PHOTOS:P.MAX_PHOTOS})}${full?t('ui.photoBlock.2'):''}</div><div class="ph-grid3">
   ${ids.map((id,i)=>`<div class="thumb3 ph"><button type="button" class="ph-open" data-view="${h(id)}" aria-label="${t('ui.photoBlock.3')}"><img data-ph="${h(id)}" alt=""></button><button type="button" class="del" data-delph="${h(id)}" aria-label="${t('ui.photoBlock.4')}">${icon('add',14)}</button>${i===0?'<span class="cover">'+t('ui.photoBlock.5')+'</span>':''}</div>`).join('')}
   ${full?'':`<label class="ph-add3" for="phAlbum">${icon('add',20)}<span>${t('form.title.new')}</span></label>`}</div>
   ${full?'':`<div class="ph-btns"><label class="btn">${icon('camera',18)}${t('ui.photoBlock.6')}<input type="file" accept="image/*" capture="environment" data-addph hidden></label>
   <label class="btn">${icon('photos',18)}${t('ui.photoBlock.7')}<input type="file" id="phAlbum" accept="image/*" multiple data-addph hidden></label></div>`}
   ${Date.now()<capUntil?`<div class="cap-note">${icon('bell',16)}${h(capMsg)}</div>`:''}
   ${ids.length?'<p class="hint-l ph-hint">'+t('ui.photoBlock.8')+'</p>':''}</section>`;}
function photoErr(e){if(P.isQuota(e))toast(t('ui.photoErr.1'),false,true);else toast(e?.message||t('ui.photoErr.2'),false,true);}
function bindPhotos(root,getIds,onAdd,onDel,onRep){
  root.querySelectorAll('[data-addph]').forEach(inp=>inp.onchange=async()=>{const fs=[...inp.files];inp.value='';
    let added=0;const over=fs.length>P.MAX_PHOTOS-getIds().length;if(over){capMsg=`${t('ui.bindPhotos.1',{MAX_PHOTOS:P.MAX_PHOTOS,n:P.MAX_PHOTOS-getIds().length})}`;capUntil=Date.now()+4000;}
    for(const f of fs){if(getIds().length>=P.MAX_PHOTOS){toast(capMsg||`${t('ui.bindPhotos.2',{MAX_PHOTOS:P.MAX_PHOTOS})}`);break;}try{toast(t('ui.bindPhotos.3'));await onAdd(f);added++;}catch(e){photoErr(e);break;}}});
  root.querySelectorAll('[data-delph]').forEach(b=>b.onclick=e=>{e.stopPropagation();onDel(b.dataset.delph);});
  root.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>viewer(b.dataset.view,onDel,onRep&&(async(pid,f)=>{try{toast(t('ui.bindPhotos.3'));await onRep(pid,f);}catch(e){photoErr(e);}})));}
function viewer(pid,onDel,onRep){document.querySelector('.viewer')?.remove();const v=document.createElement('div');v.className='viewer';v.setAttribute('role','dialog');
  v.innerHTML=`<img data-ph="${h(pid)}" data-kind="full" alt="${t('ui.viewer.1')}"><div class="viewer-bar"><button class="btn" data-x>${t('ui.viewer.2')}</button>${onRep?`<label class="btn" data-rep>${icon('renew',18)}${t('ui.viewer.3')}<input type="file" accept="image/*" hidden></label>`:''}<button class="btn danger" data-del>${icon('trash',18)}${t('ui.viewer.4')}</button></div>`;
  document.body.appendChild(v);hydrate(v);const close=()=>v.remove();v.querySelector('[data-x]').onclick=close;v.onclick=e=>{if(e.target===v)close();};
  v.querySelector('[data-del]').onclick=()=>{close();onDel(pid);};
  const ri=v.querySelector('[data-rep] input');if(ri){ri.onclick=e=>e.stopPropagation();ri.onchange=()=>{const f=ri.files[0];if(!f)return;close();onRep(pid,f);};}}

function home(){sel=false;selSet.clear();
  const s=st(),items=enrich(),act=items.filter(i=>!i.handledAt);
  const c={expired:0,soon:0,safe:0};act.forEach(i=>c[i.st]++);
  const pct=act.length?c.safe/act.length:1,{todo}=todoList(S.all(),s),tx=todo.filter(x=>x.n<0).length;
  const shown=homeSeg==='all'?items:items.filter(i=>i.st===homeSeg);
  if(!items.length){view.innerHTML=emptyState();bindEmpty();return;}
  const d=new Date(),ios=/iPhone|iPad|iPod/.test(navigator.userAgent)&&!navigator.standalone&&!s.iosTipClosed;
  view.innerHTML=`${top(`<span class="micro">${fmtDay(todayStr())}</span><br>${t('app.name')}`)}
  ${ios?`<div class="banner">${t('ui.home.1')}<button class="x" id="iosx" aria-label="${t('ui.viewer.2')}">×</button></div>`:''}
  ${backupTip(s)}
  <div class="home-grid"><section class="card todo today-card"><div class="todo-hero"><div class="t"><b>${todo.length?`${t('todo.pageTitle')}<span class="num" id="todayN">${todo.length}</span>${t('ui.home.2')}`:t('home.todo.clear')}</b></div>
    ${todo.length?`<button class="btn-all" id="allDone">${icon('check',16)}${t('done.title')}<span class="n">${t('ui.paren',{n:todo.length})}</span></button>`:''}</div>
   ${todo.length?`<div class="stats-inline"><a href="#/todo" class="si"><span class="dot expired"></span>${t('home.todo.expired')} <b class="num" id="todayX">${tx}</b></a><a href="#/todo" class="si"><span class="dot soon"></span>${t('home.todo.soon')} <b class="num" id="todayS">${todo.length-tx}</b></a></div>`:''}
   ${todo.length?todo.slice(0,3).map(todoRow).join('')+(todo.length>3?`<a href="#/todo" class="small todo-all">${t('home.todo.all',{n:todo.length})}</a>`:''):`<div class="all-clear"><span class="gold-ring">${ring(1,40,4)}</span><span>${t('done.sub')}</span></div>`}</section>
  <section class="card hero hero-sm">
    <div class="ring-wrap">${ring(pct,96,10)}<div class="ring-txt"><span class="num big">${Math.round(pct*100)}<i>%</i></span></div></div>
    <div class="stats"><div class="micro">${t('home.safe')}</div>
      <a href="#/" data-seg="expired" class="stat"><span class="dot expired"></span><span class="num">${c.expired}</span><small>${t('state.expired')}</small></a>
      <a href="#/" data-seg="soon" class="stat"><span class="dot soon"></span><span class="num">${c.soon}</span><small>${t('state.soon')}</small></a>
      <a href="#/" data-seg="safe" class="stat"><span class="dot safe"></span><span class="num">${c.safe}</span><small>${t('state.safe')}</small></a>
    </div>
  </section></div>
  <div class="seg" role="tablist">${[['all',t('form.allCats')],['soon',t('state.soon')],['expired',t('state.expired')],['safe',t('state.safe')]].map(([k,n])=>`<button data-seg="${k}" class="${homeSeg===k?'on':''}">${n}</button>`).join('')}</div>
  <section class="card list">${shown.map(row).join('')||`<div class="empty">${t('ui.home.3')}</div>`}</section>`;
  $('#allDone')&&($('#allDone').onclick=()=>confirmAll(todo,home));
  view.querySelectorAll('[data-seg]').forEach(b=>b.onclick=e=>{e.preventDefault();homeSeg=b.dataset.seg;home();});
  $('#iosx')&&($('#iosx').onclick=()=>{const x=st();x.iosTipClosed=true;S.saveSettings(x);home();});
  const bkLater=()=>{const x=st();x.backupSnoozeUntil=new Date(Date.now()+3*864e5).toISOString();S.saveSettings(x);collapse($('#bkbar'));};
  $('#bkx')&&($('#bkx').onclick=bkLater);$('#bkx2')&&($('#bkx2').onclick=bkLater);
  $('#bkgo')&&($('#bkgo').onclick=async()=>{if(!await backupNow())return;const bar=$('#bkbar');if(!bar)return;bar.classList.add('ok');bar.querySelector('b').textContent=t('ui.bkLater.1');
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
  const title=b.last?`${t('ui.backupTip.1')}${b.days?t('when.days',{n:b.days}):t('when.today')}`:t('home.backupTip',{n:b.n}).split(' · ')[0],sub=!b.last?'':b.changes>=10&&b.days<+(s.backupEvery??14)?`${t('ui.backupTip.3',{n:b.changes})}`:t('ui.backupTip.4');
  return `<div class="bk-bar enter" id="bkbar"><span class="bk-ic">${icon('download',20)}</span><b>${title}</b>${sub?`<small>${sub}</small>`:''}
   <div class="bk-act"><button class="btn primary" id="bkgo">${t('home.backupTip.btn')}</button><button class="btn later" id="bkx">${t('ui.backupTip.5')}</button></div>
   <button class="bk-x" id="bkx2" aria-label="${t('ui.backupTip.6')}">${icon('add',18)}</button>
   ${onIOS()?'<div class="bk-ios">'+t('ui.backupTip.7')+'</div>':''}</div>`;}
// v1.2 P0-B 一键备份：条目（含回收站）+ 照片 + 设置 + 自定义分类；能分享文件就分享，否则下载
async function backupNow(){const s=st(),items=S.raw();let photos=null;
  if(globalThis.indexedDB){try{photos=await P.exportPhotos(items.flatMap(i=>i.photos||[]));}catch{toast(t('backup.photoFail'),false,true);}}
  const {backupSnoozeUntil,...keep}=s;const text=toJSON(items,photos,(s.cats?.custom)||[],keep);
  const name=`${t('ui.backupNow.1',{todayStr:todayStr()})}`,nPh=photos?Object.keys(photos).length:0;let ok=false;
  try{const file=new File([text],name,{type:'application/json'});
    if(navigator.canShare&&navigator.canShare({files:[file]})){await navigator.share({files:[file],title:t('ui.backupNow.2')});ok=true;}}catch(e){if(e?.name==='AbortError')return false;}
  if(!ok){download(name,text,'application/json');ok=true;}
  const x=st();x.lastBackupAt=x.lastExportAt=new Date().toISOString();delete x.backupSnoozeUntil;S.saveSettings(x);toast(nPh?t('backup.toast',{n:items.length,m:nPh}):t('backup.toastNoPh',{n:items.length}));return true;}

function todoPage(){const {todo,later}=todoList(S.all(),st());if(!todo.length)sel=false;
  const k=[...selSet].filter(id=>todo.some(x=>x.id===id)).length;
  view.innerHTML=`${top(t('todo.pageTitle'),{back:true,right:todo.length?`<button class="btn sm" id="selTog">${sel?t('todo.cancel'):t('todo.select')}</button>`:''})}
  ${sel?`<div class="sel-bar"><span>${t('todo.selected',{n:k})}</span><button class="btn sm ghost" id="selAll">${t('todo.selectAll')}</button><span class="grow"></span><button class="btn-all sm" id="selDone" ${k?'':'disabled'}>${t('todo.doneSel',{n:k})}</button></div>`
   :todo.length?`<div class="todo-hero"><div class="t"><b>${t('todo.pageTitle')}<span class="num">${todo.length}</span>${t('ui.home.2')}</b></div><button class="btn-all" id="allDone">${icon('check',16)}${t('done.title')}<span class="n">${t('ui.paren',{n:todo.length})}</span></button></div>`:''}
  <section class="card todo">${todo.map(todoRow).join('')||`<div class="done-state"><div class="done-ring"><svg class="r" viewBox="0 0 76 76" width="76" height="76"><circle cx="38" cy="38" r="35" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round" stroke-dasharray="220" stroke-dashoffset="0" class="dr"/></svg>${icon('check',32,'',2)}</div><h2>${t('done.title')}</h2><p>${t('done.sub')}</p></div>`}</section>
  ${later.length&&!sel?`<div class="micro pad">${t('todo.later',{n:later.length})}</div><section class="card todo later">${later.map(todoRow).join('')}</section>`:''}`;
  $('#allDone')&&($('#allDone').onclick=()=>confirmAll(todo,todoPage));
  $('#selTog')&&($('#selTog').onclick=()=>{sel=!sel;selSet.clear();todoPage();});
  $('#selAll')&&($('#selAll').onclick=()=>{todo.forEach(x=>selSet.add(x.id));todoPage();});
  $('#selDone')&&($('#selDone').onclick=()=>{const ids=todo.filter(x=>selSet.has(x.id));if(ids.length)confirmAll(ids,todoPage);});
  bindTodo(view,todoPage);}

function cats(){
  const items=enrich();
  view.innerHTML=`${top(t('tab.cats'),{right:`<a class="btn sm btn-cm" href="#/catmgr" aria-label="${t('ui.cats.1')}">${icon('gear',16)} <span>${t('ui.cats.1')}</span></a>`})}<section class="grid">${visibleCats().map(([k,c])=>{
    const l=items.filter(i=>i.cat===k&&!i.handledAt),e=l.filter(i=>i.st==='expired').length,s=l.filter(i=>i.st==='soon').length,next=l.find(i=>i.n>=0)||l[0];
    return `<a class="tile" href="#/cat/${k}" style="--c:${c.color}"><span class="tile-ic">${ci(k)}</span><b>${h(c.name)}</b>
    <span class="badges">${e?`<em class="b expired">${e}</em>`:''}${s?`<em class="b soon">${s}</em>`:''}<span class="num cnt">${l.length}</span></span>
    <small class="ell tile-n ${next?'':'empty'}" ${next?`aria-label="${t('ui.cats.2',{name:h(next.name)})}"`:''}>${next?h(next.name):t('ui.cats.5')}</small><small class="ell tile-d ${next?(next.n<0?'expired':next.st==='soon'||next.n===0?'soon':''):''}">${next?(next.n<0?t('ui.cats.3',{n:-next.n}):next.n===0?t('row.today'):t('ui.cats.4',{n:next.n})):'&nbsp;'}</small></a>`;}).join('')}</section>`;
}
function catList(k){
  const items=enrich().filter(i=>i.cat===k),c=cat(k);
  view.innerHTML=`${top(h(c.name),{back:true,right:`<a class="btn sm" href="#/new?cat=${k}">${icon('add',16)} ${t('form.title.new')}</a>`})}
  <section class="grid photo">${items.map(it=>`<a class="ptile" href="#/item/${h(it.id)}"><span class="pic" style="--c:${c.color}">${ci(k,44)}</span><b class="ell">${h(it.name)}</b>
  <span class="${it.st}"><span class="num">${Math.abs(it.n)}</span> ${t('ui.row.4',{n:Math.abs(it.n)})}${it.n<0?t('ui.catList.1'):''}${it.qty?` <small class="muted">${t('ui.catList.2',{qty:it.qty})}</small>`:''}</span></a>`).join('')||'<div class="empty card">'+t('ui.catList.3')+'</div>'}</section>`;
}

function cal(){
  const items=enrich();if(!calMonth)calMonth=todayStr().slice(0,7);
  const [y,m]=calMonth.split('-').map(Number),first=new Date(y,m-1,1),days=new Date(y,m,0).getDate(),pad=(first.getDay()-weekStart()+7)%7,today=todayStr();
  const by={};items.forEach(i=>(by[i.due]=by[i.due]||[]).push(i));
  let cells='';for(let i=0;i<pad;i++)cells+='<span></span>';
  for(let d=1;d<=days;d++){const ds=fmt(new Date(y,m-1,d)),l=by[ds]||[];
    cells+=`<button data-d="${ds}" class="${ds===today?'today':''} ${ds===calSel?'sel':''}"><span class="num">${d}</span><span class="dots">${l.slice(0,3).map(i=>`<i class="${i.st}"></i>`).join('')}</span></button>`;}
  const monthItems=items.filter(i=>i.due.startsWith(calMonth)), list=calSel?(by[calSel]||[]):monthItems;
  view.innerHTML=`${top(t('tab.cal'),{right:`<button class="btn sm nowrap" id="ics" aria-label="${t('ui.cal.1')}">${icon('cal',16)}<span>${t('ui.cal.1')}</span></button>`})}<section class="card cal">
   <div class="cal-head"><button class="icon-btn" data-mv="-1">${icon('back',20)}</button><b class="num">${fmtMonth(y,m)}</b><button class="icon-btn" data-mv="1">${icon('chev',20)}</button></div>
   <div class="cal-grid wk">${weekdays().map(w=>`<span>${w}</span>`).join('')}</div><div class="cal-grid">${cells}</div>
   <div class="micro center">${t('ui.cal.2',{n:monthItems.length})}</div></section>
  <div class="micro pad">${calSel?nice(calSel):t('ui.cal.3')}</div>
  <section class="card list cal-list">${list.map(it=>row(it,true)).join('')||'<div class="empty">'+t('ui.cal.4')+'</div>'}</section>`;
  view.querySelectorAll('[data-mv]').forEach(b=>b.onclick=()=>{calMonth=addMonths(calMonth+'-01',+b.dataset.mv).slice(0,7);calSel=null;cal();});
  view.querySelectorAll('[data-d]').forEach(b=>b.onclick=()=>{calSel=calSel===b.dataset.d?null:b.dataset.d;cal();});
  $('#ics').onclick=icsSheet;
}

// 已续期：有周期一键顺延，否则底部表单
function doRenew(id,months,remember){const it=S.get(id),n=daysLeft(it.due),base=n<0?todayStr():it.due,nx=addMonths(base,months);
  act(t('renew.toast',{date:cnDate(nx)}),()=>S.patch(id,x=>{(x.history=x.history||[]).push({from:x.due,to:nx,at:todayStr()});x.due=nx;delete x.handledAt;delete x.snoozeUntil;delete x.renewAsked;if(remember)x.renewMonths=months;}),{label:t('renew.changeDate'),fn:()=>{S.undo();renewFlow(id,route,nx);}});}
function renewFlow(id,after,preDate){const it=S.get(id);
  if(it.renewMonths){doRenew(id,it.renewMonths);after?.();return;}
  sheet(`<h3>${t('ui.renewFlow.1',{name:h(it.name)})}</h3><p class="small muted">${t('ui.renewFlow.2',{due:h(it.due)})}${daysLeft(it.due)<0?t('ui.renewFlow.3'):''}</p>${daysLeft(it.due)<0?`<p class="small exp-full">${h(labelFull(daysLeft(it.due)))}</p>`:''}
   <div class="chips wrap">${[[1,t('ui.renewFlow.4')],[6,t('ui.renewFlow.5')],[12,t('ui.renewFlow.6')],[24,t('ui.renewFlow.7')]].map(([m,l])=>`<button data-m="${m}">${l}</button>`).join('')}</div>
   <label class="small">${t('renew.pickDate')}<input type="date" id="rdate" class="inp" value="${preDate||''}"></label>
   <p class="small expired" id="rerr"></p><label class="check"><input type="checkbox" id="rem" checked> ${t('renew.remember')}</label>
   <button class="btn primary block" id="rok" disabled>${t('renew.ok')}</button>`,w=>{let pick=null;
    w.querySelectorAll('[data-m]').forEach(b=>b.onclick=()=>{pick=+b.dataset.m;w.querySelectorAll('[data-m]').forEach(x=>x.classList.toggle('on',x===b));w.querySelector('#rdate').value='';w.querySelector('#rok').disabled=false;});
    w.querySelector('#rdate').onchange=e=>{pick=null;w.querySelectorAll('[data-m]').forEach(x=>x.classList.remove('on'));const v=e.target.value,bad=v&&v<=it.due;w.querySelector('#rok').disabled=!v||bad;w.querySelector('#rerr').textContent=bad?`${t('ui.renewFlow.8',{due:it.due})}`:'';};
    w.querySelector('#rok').onclick=()=>{const rem=w.querySelector('#rem').checked;closeSheet();
      if(pick)doRenew(id,pick,rem);else{const d=w.querySelector('#rdate').value;
        act(t('renew.toast',{date:cnDate(d)}),()=>S.patch(id,x=>{(x.history=x.history||[]).push({from:x.due,to:d,at:todayStr()});
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
  view.innerHTML=`${top('',{back:true,right:`<a class="icon-btn" href="#/edit/${h(it.id)}" aria-label="${t('form.title.edit')}">${icon('edit',20)}</a>`})}
  <section class="card big-cd ${it.st}">
    <span class="tile-ic lg" style="--c:${c.color}">${ci(it.cat,34)}</span>
    <h2>${h(it.name)}</h2><div class="muted small">${h(c.name)}${it.qty?` ${t('ui.row.1',{qty:it.qty})}`:''}${it.location?` · ${h(it.location)}`:''}</div>
    <div class="cd-num num"><span data-count="${Math.abs(it.n)}">${Math.abs(it.n)}</span><small>${t('ui.row.4',{n:Math.abs(it.n)})}</small></div>
    <div class="pill ${it.st}">${it.n<0?t('ui.detail.1'):it.n===0?t('row.today'):t('ui.detail.2')} · ${ST[it.st]}</div>${it.n<0?`<div class="small muted exp-full">${h(labelFull(it.n))}</div>`:''}
    <div class="muted small">${nice(it.due)}</div>
    ${it.history?.length?`<div class="milestone">${icon('check',16)}${t('ui.detail.3',{n:it.history.length})}</div>`:''}
  </section>
  ${it.handledAt?`<div class="card handled">${icon('check',18)}<span class="grow">${t('detail.handled',{d:h(md(it.handledAt))})}</span><button class="btn sm" id="unhandle">${t('detail.unhandle')}</button></div>`:''}
  <div class="actions"><button class="btn primary" id="renew">${icon('renew',20)}${t('todo.renew')}</button>${it.handledAt?'':`<button class="btn" id="handled">${icon('check',20)}${t('detail.handleBtn')}</button>`}</div>
  ${PERISHABLE.includes(it.cat)?`<div class="actions sub"><button class="btn" id="rebuy">${icon('add',18)}${t('ui.detail.4')}</button></div>`:''}
  <section class="card kv">
    <div><span>${t('ui.detail.5')}</span><b>${INTENSITY[ei].name}<small class="muted"> · ${it.intensitySource==='item'?t('ui.detail.6'):t('ui.detail.7')}</small></b></div>
    <div><span>${t('ui.detail.8')}</span><b>${ei==='strong'?t('ui.detail.9'):plan.length?plan.map(d=>d===0?t('ui.detail.10'):t('ui.dDays',{n:d})).join(' / '):t('ui.detail.12')}</b></div>
    <div><span>${t('ui.detail.13')}</span><b>${it.handledAt?t('ui.detail.14'):nx===undefined?(it.n<0?t('ui.detail.15'):'\u2014'):cnDate(addDays(it.due,-nx))}</b></div>
    <div><span>${t('ui.detail.16')}</span><b>${t('ui.detail.17',{n:effSoon(it,s)})}<small class="muted"> · ${it.soonSource==='item'?t('ui.detail.6'):t('ui.detail.7')}</small></b></div>
    <div><span>${t('ui.detail.18')}</span><b>${it.renewMonths?t('ui.months',{n:+it.renewMonths}):t('ui.detail.20')}</b></div>
    ${it.prodDate?`<div><span>${t('ui.detail.21')}</span><b>${h(it.prodDate)}${it.shelfDays?` ${t('ui.detail.22',{n:it.shelfDays})}`:''}</b></div>`:''}
    ${lead?`<div><span>${t('ui.detail.23')}</span><b>${t('ui.detail.24',{lead:md(addDays(it.due,-lead)),days:t('ui.dDays',{n:lead})})}</b></div>`:''}
    <button class="btn ghost cal-btn" id="ics1">${icon('cal',18)}${t('ui.detail.25')}</button>
  </section>
  ${photoBlock(it.photos)}
  ${tpl?.docs?`<section class="card"><div class="micro">${t('ui.detail.26')}</div><p class="small">${h(tpl.docs)}</p>${tpl.url?`<p class="small">${t('ui.detail.27')}<a class="ext" href="${h(tpl.url)}" target="_blank" rel="noopener noreferrer">${h(tpl.url.replace(/^https?:\/\//,'').split('/')[0])}</a></p>`:''}${tpl.verify?'<p class="small soon">'+t('ui.detail.28')+'</p>':''}<p class="small muted">${tpl.region==='cn'?t('ui.detail.29'):t('ui.detail.30')}</p></section>`:''}
  ${it.note?`<section class="card"><div class="micro">${t('ui.detail.31')}</div><p class="small">${h(it.note)}</p></section>`:''}
  ${it.history?.length?`<section class="card"><div class="micro">${t('ui.detail.32')}</div>${it.history.slice().reverse().map(x=>`<p class="small">${t('ui.hist',{at:h(x.at),from:h(x.from),to:h(x.to)})}</p>`).join('')}</section>`:''}
  <button class="btn danger ghost" id="del">${icon('trash',18)}${t('ui.viewer.4')}</button>`;
  $('#renew').onclick=()=>renewFlow(id,()=>detail(id));
  bindPhotos(view,()=>S.get(id).photos||[],async f=>{const pid=await P.addPhoto(id,f);if(!S.patch(id,x=>{x.photos=[...(x.photos||[]),pid].slice(0,P.MAX_PHOTOS);}))return;toast(t('ui.detail.33'));detail(id);},
    pid=>{act(t('ui.detail.34'),()=>S.patch(id,x=>{x.photos=(x.photos||[]).filter(p=>p!==pid);}));detail(id);},
    async(pid,f)=>{const np=await P.addPhoto(id,f);act(t('ui.detail.35'),()=>S.patch(id,x=>{x.photos=(x.photos||[]).map(p=>p===pid?np:p);}));detail(id);});hydrate(view);countUp(view,id+'|'+location.hash);
  $('#handled')&&($('#handled').onclick=()=>{act(t('todo.doneToast',{name:it.name}),()=>S.patch(id,x=>{x.handledAt=todayStr();delete x.snoozeUntil;}));detail(id);});
  $('#unhandle')&&($('#unhandle').onclick=()=>{act(t('detail.unhandleToast'),()=>S.patch(id,x=>{delete x.handledAt;delete x.renewAsked;}));detail(id);});
  $('#rebuy')&&($('#rebuy').onclick=()=>{const raw=S.get(id);const created=(raw.prodDate||raw.createdAt||todayStr()).slice(0,10);
    const shelf=raw.shelfDays||Math.max(1,daysLeft(raw.due,created));
    sessionStorage.setItem('dq.prefill',JSON.stringify({cat:raw.cat,name:raw.name,intensity:raw.intensity,intensitySource:raw.intensitySource,customDays:raw.customDays,location:raw.location,qty:raw.qty,shelfDays:shelf,due:addDays(todayStr(),shelf),rebuyFrom:id}));
    location.hash='#/new';});
  $('#ics1').onclick=()=>download(`${it.name}.ics`,toICS([S.get(id)],s),'text/calendar;charset=utf-8');
  $('#del').onclick=()=>{act(`${t('ui.detail.36',{name:it.name})}`,()=>S.softDelete([id]));if(!S.lastSaveFailed)location.hash='#/';};
}

function form(id,q){
  const ex=id?S.get(id):null,s=st();
  let pre=null;if(!ex){try{pre=JSON.parse(sessionStorage.getItem('dq.prefill'))}catch{}sessionStorage.removeItem('dq.prefill');}
  const it=ex?inferSource({...ex},s):Object.assign({cat:q.get('cat')||defaultCat(s),name:'',due:'',intensitySource:'cat',soonSource:'cat',customDays:[],renewMonths:'',qty:'',location:'',note:'',prodDate:'',shelfDays:''},pre||{});
  if(pre&&q.get('cat'))it.cat=q.get('cat');
  let picked=!!(ex||q.get('cat')||q.get('tpl')||pre?.cat||pre?.name),sug=null,cands=[],auto=false,inferredFor=null;
  if(!it.id)it.id=S.uid();if(pre)it.photos=[];
  let shelfFrom=null;const applyTpl=tp=>{it.cat=tp.cat;it.name=tp.id==='custom'?'':tp.name;it.renewMonths=tp.renew||'';if(tp.int){it.intensity=tp.int;it.intensitySource='item';if(tp.days)it.customDays=[...tp.days];else delete it.customDays;}shelfFrom=null;if(tp.shelfDays){it.due=addDays(todayStr(),tp.shelfDays);shelfFrom=tp;}};
  {const tq=q.get('tpl'),tq2=tq&&TEMPLATES.find(x=>x.id===tq||x.name===tq);if(tq2&&!ex)applyTpl(tq2);}
  let moreOpen=!!(ex&&(ex.intensitySource==='item'||ex.soonSource==='item'||ex.renewMonths||ex.qty||ex.location||ex.note||ex.prodDate||ex.photos?.length))||(it.intensitySource==='item'&&it.intensity==='custom'&&!!(it.customDays||[]).length);
  // 分类来源：none 未选 / last 上次使用 / auto 按名称推断 / manual 手动 / tpl 来自模板
  let fromTpl=!!q.get('tpl');const lastOK=!!(CATEGORIES[s.lastCat]&&!CATEGORIES[s.lastCat].hidden);
  // N9：上次分类也只是「默认」，显示「X · 默认」、全部行不高亮，直到用户自己选
  const catSrc=()=>ex?'edit':fromTpl?'tpl':picked?'manual':auto?'auto':'none';
  const sugHTML=(typing)=>{const src=catSrc();if(src==='edit')return '';
    if(src==='manual'||src==='tpl')return `<span class="man-tag">${icon('check',14)}${src==='tpl'?t('ui.sugHTML.1'):t('ui.sugHTML.2')}</span>`;
    if(!sug)return '';const two=cands.length>1,applied=auto&&it.cat===sug;
    return `<span class="inf-tag">${icon('sparkle',14)}${t('ui.sugHTML.3')}</span>${two?cands.map(k=>`<button type="button" class="chip-s ${it.cat===k&&auto?'on':''}" data-sug="${k}">${ci(k,14)}${h(cat(k).name)}</button>`).join(''):''}<span class="inf-hint">${typing&&!applied?`${two?'':`<b>${h(cat(sug).name)}</b> · `}${t('ui.sugHTML.4')}`:`${t('ui.sugHTML.5',{name:INTENSITY[effInt(it,s)].name})} ${t('ui.dDays',{n:+(it.soonSource==='item'?it.soonDays:catSoon(it.cat,s))})} ${t('ui.sugHTML.6')} <u data-chg>${t('ui.sugHTML.7')}</u>`}</span>`;};
  // 最近 / 常用：跨分类，按使用次数再按最近时间，最多 8 个；没有记录时用默认常用
  const recentHTML=()=>{const u=s.tplUse||{},vis=tp=>CATEGORIES[tp.cat]&&!CATEGORIES[tp.cat].hidden;
    let l=Object.entries(u).sort((a,b)=>b[1].n-a[1].n||String(b[1].at).localeCompare(String(a[1].at))).map(([n])=>TEMPLATES.find(x=>x.id===n||anyLang('tpl.'+x.id).includes(n))).filter(Boolean).filter(vis).slice(0,8),cold=!l.length;
    if(cold)l=[...new Set([...exampleIds(regionOf(s)),'milk','eggs','leftovers'])].map(n=>TEMPLATES.find(x=>x.id===n)).filter(Boolean).filter(vis);
    return `<div class="micro pad">${cold?t('form.common'):t('form.recent')}</div><div class="chips tpl-recent">${l.map(x=>`<button data-tpl="${x.id}" data-any="1" class="${it.name===x.name?'on':''}">${ci(x.cat,16)}${h(x.name)}</button>`).join('')}</div>`;};
  let curSer=null;
  let dueText=it.due?it.due.split('-').reverse().join('.'):'',chain=false,shelfUnit='d',shelfN=it.shelfDays||'';
  const draw=(focus)=>{const ei=effInt(it,s),per=PERISHABLE.includes(it.cat);
    view.innerHTML=`${top(ex?t('form.title.edit'):it.rebuyFrom?t('ui.detail.4'):t('form.title.new'),{back:true,right:`<button class="btn sm primary" id="saveTop">${t('form.save')}</button>`})}
    ${ex?'':recentHTML()}
    ${ex?'':`<div class="micro pad">${t('form.allCats')}</div><div class="chips">${visibleCats().map(([k,c])=>`<button data-cat="${k}" class="${it.cat===k&&catSrc()!=='none'?'on':''}">${ci(k,16)}${h(c.name)}</button>`).join('')}</div>
    ${(()=>{const ts=tplFor(it.cat,regionOf(s)),grp=[...(regionOf(s).includes('+')?regs(regionOf(s)):['ro','cn']),undefined].map(r=>[r,ts.filter(tp=>tp.region===r)]).filter(([,l])=>l.length),multi=grp.filter(([r])=>r).length>1||(grp.length>1);
      return `<div class="chips tpl ${ts.length<=8?'wrap':''}">${grp.map(([r,l])=>`${multi?`<span class="tpl-grp">${t('region.'+(r||'any'))}</span>`:''}${l.map(tp=>`<button data-tpl="${tp.id}" class="${it.name===tp.name?'on':''}">${ci(tp.cat,16)}${h(tp.name)}</button>`).join('')}`).join('')}</div>${(()=>{const sel=TEMPLATES.find(x=>x.name===it.name&&x.docs);return sel?`<p class="small tpl-docs">${h(sel.docs)}</p>`:'';})()}`;})()}`}
    <form class="card form" id="f" novalidate>
      <label>${t('form.name')}<input name="name" maxlength="60" required value="${h(it.name)}" placeholder="${t('form.name.ph')}" enterkeyhint="done"></label>
      <div class="lbl-wrap"><span class="lbl-t">${t('form.catLbl')}</span><label class="cat-field ${!ex&&auto&&!picked?'inferred enter':''}">${catSrc()==='none'?`<span class="ic" style="--c:${cat(it.cat).color}">${ci(it.cat,16)}</span><span class="cat-nm cat-def">${h(t('form.catDefault',{cat:cat(it.cat).name}))}</span>`:`<span class="ic" style="--c:${cat(it.cat).color}">${ci(it.cat,16)}</span><span class="cat-nm">${h(cat(it.cat).name)}</span>${catSrc()==='last'?'<small class="cat-last">'+t('ui.draw.1')+'</small>':''}`}<span class="chev">${icon('chev',16)}</span>
        <select name="cat" aria-label="${t('tab.cats')}">${Object.entries(CATEGORIES).filter(([k,c])=>!c.hidden||k===it.cat).map(([k,c])=>`<option value="${k}" ${k===it.cat?'selected':''}>${h(c.name)}</option>`).join('')}<option value="__new">${t('form.newCat')}</option></select></label>
        <div id="catSug" class="cat-state">${sugHTML()}</div></div>
      <label>${t('form.due')}<span class="date-field"><input id="dueT" inputmode="numeric" autocomplete="off" value="${h(dueText)}" placeholder="${t('form.due.ph')}">
        <button type="button" data-q="clr" class="date-clr" aria-label="${t('ui.draw.2')}">${icon('add',16)}</button><span class="date-pick">${icon('cal',20)}<input type="date" id="dueP" value="${valid(it.due||'')?it.due:''}" aria-label="${t('ui.draw.3')}"></span></span></label>
      <div id="dueHint" class="hint-l"></div>
      <div class="chips quick">${[['7d',t('ui.draw.4')],['1m',t('ui.renewFlow.4')],['3m',t('ui.draw.5')],['1y',t('ui.renewFlow.6')],['2y',t('ui.renewFlow.7')]].map(([k,l])=>`<button type="button" data-q="${k}">${l}</button>`).join('')}</div>
      ${shelfFrom?`<div class="shelf-note"><b>${t('form.due.byShelf',{n:shelfFrom.shelfDays})}</b> ${t('ui.draw.6')}<br><span>${h(shelfFrom.shelfNote||'')}</span><br><span class="src-l">${t('ui.draw.7',{shelfLevel:h(shelfFrom.shelfLevel||'')})}${(shelfFrom.src||[]).map(u=>`<a class="ext" href="${h(u)}" target="_blank" rel="noopener noreferrer">${h(u.replace(/^https?:\/\//,'').split('/')[0])}</a>`).join(t('ui.sep'))}</span></div>`:''}
      <details id="more" ${moreOpen?'open':''}><summary>${t('form.more')}${ei==='custom'&&(it.customDays||[]).length?` <span class="cd-sum">· ${[...it.customDays].sort((a,b)=>b-a).map(d=>d?t('ui.dDays',{n:d}):t('ui.detail.10')).join(' · ')}</span>`:''}</summary>
      ${per?`<div class="two"><label>${t('ui.detail.21')}<input name="prodDate" id="prod" inputmode="numeric" value="${h(it.prodDate||'')}" placeholder="${t('ui.draw.8')}"></label>
        <label>${t('ui.draw.9')}<span class="shelf"><input id="shelfN" type="number" min="1" value="${h(shelfN)}" placeholder="&#8212;"><select id="shelfU"><option value="d" ${shelfUnit==='d'?'selected':''}>${t('ui.row.4')}</option><option value="m" ${shelfUnit==='m'?'selected':''}>${t('ui.draw.10')}</option></select></span></label></div>`:''}

      <div class="lbl">${it.intensitySource==='item'?`${t('ui.draw.11',{name:INTENSITY[ei].name})} <span class="src">${t('ui.draw.12')} <a href="#" id="follow">${t('ui.draw.13')}</a></span>`:t('form.intensity',{lvl:INTENSITY[catDefault(it.cat,s)].name,cat:h(cat(it.cat).name)})}</div>
      <div class="seg">${Object.entries(INTENSITY).map(([k,v])=>`<button type="button" data-int="${k}" class="${ei===k?'on':''}">${v.name}</button>`).join('')}</div>
      <p class="hint-l">${INTENSITY[ei].desc}</p>
      ${ei==='custom'?`<div class="chips wrap">${[...new Set([180,90,60,30,14,7,3,1,0,...(it.customDays||[]),...(findTpl(it.cat,it.name)?.days||[])])].sort((a,b)=>b-a).map(d=>`<button type="button" data-cd="${d}" class="${(it.customDays||[]).includes(d)?'on':''}">${d?t('ui.dDays',{n:d}):t('ui.detail.10')}</button>`).join('')}</div>`:''}
      <div class="lbl">${t('form.soon')}</div>
      <div class="seg soon-seg"><button type="button" data-ss="cat" class="${it.soonSource!=='item'?'on':''}">${t('form.soon.follow',{n:catSoon(it.cat,s)})}</button><button type="button" data-ss="item" class="${it.soonSource==='item'?'on':''}">${t('form.soon.own')}</button></div>
      ${it.soonSource==='item'?`<label class="inline-n">${t('ui.draw.14')} <input name="soonDays" type="number" min="0" max="3650" value="${h(it.soonDays??'')}" required> ${t('ui.draw.15',{n:+it.soonDays||0})}</label>`:''}
      <div class="two"><label>${t('form.renew')}<input name="renewMonths" type="number" min="0" value="${it.renewMonths??''}" placeholder="${t('form.renew.ph')}"></label>
      <label>${t('ui.draw.16')}<input name="qty" type="number" min="0" value="${it.qty??''}" placeholder="${t('ui.draw.17')}"></label></div>
      ${photoBlock(it.photos,true)}
      <label>${t('ui.draw.18')}<input name="location" maxlength="40" value="${h(it.location||'')}" placeholder="${t('form.location.ph')}"></label>
      <label>${t('ui.detail.31')}<textarea name="note" maxlength="500" rows="2">${h(it.note||'')}</textarea></label>
      </details>
      <button class="btn primary block" data-save="1">${t('form.save')}</button>
      ${ex?'':`<button type="button" class="btn block" id="saveMore">${t('form.saveMore')}</button>`}
    </form>`;
    const f=$('#f'),dueT=$('#dueT');
    const sync=()=>{const fd=new FormData(f);for(const[k,v]of fd)it[k]=v;dueText=dueT.value;if($('#shelfN')){shelfN=$('#shelfN').value;shelfUnit=$('#shelfU').value;}};
    curSer=()=>{sync();return JSON.stringify([it,dueText,shelfN,shelfUnit]);};
    const hint=()=>{const v=parseInput(dueT.value),e=$('#dueHint');it.due=v||'';
      if(!dueT.value){e.className='hint-l';e.textContent=t('ui.hint.1');}
      else if(!v){e.className='hint-l err';e.textContent=t('ui.hint.2');}
      else{const n=daysLeft(v);e.className='hint-l '+(n<0?'warn':'ok');e.textContent=`= ${nice(v)} · ${label(n)}${n<0?t('ui.hint.3'):''}`;}};
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
    view.querySelectorAll('[data-cat]').forEach(b=>b.onclick=()=>{sync();it.cat=b.dataset.cat;if(isTplName(it.name))it.name='';picked=true;fromTpl=false;sug=null;auto=false;draw();});
    f.querySelector('[name=cat]').onchange=()=>{if(f.querySelector('[name=cat]').value==='__new'){f.querySelector('[name=cat]').value=it.cat;return catSheet(null,id=>{it.cat=id;picked=true;fromTpl=false;sug=null;auto=false;draw();});}sync();picked=true;fromTpl=false;sug=null;auto=false;draw();};
    // 名称推断分类：仅在用户没有明确选过分类时作为建议
    const nameI=f.querySelector('[name=name]'),showSug=()=>{const g=$('#catSug');if(g){g.innerHTML=sugHTML(true);bindSug();}};
    const bindSug=()=>{view.querySelectorAll('[data-sug]').forEach(b=>b.onclick=()=>{sync();it.cat=b.dataset.sug;sug=it.cat;auto=true;inferredFor=it.name;picked=false;draw();});
      const ch=$('[data-chg]');if(ch)ch.onclick=()=>{const sel=f.querySelector('[name=cat]');sel.focus();try{sel.showPicker()}catch{}};};
    if(!ex){nameI.oninput=()=>{if(picked)return;cands=inferTop2(nameI.value,s.catLearn).filter(k=>!CATEGORIES[k]?.hidden);sug=cands[0]||null;showSug();};
      // 离开名称框：自动应用第一个候选；之前是自动推断而这次推断不出，就回到默认分类（O1）
      nameI.onchange=()=>{if(picked)return;sync();if(sug){if(sug!==it.cat||!auto){it.cat=sug;auto=true;inferredFor=it.name;draw();}}else if(auto){it.cat=defaultCat(s);auto=false;draw();}};}
    bindSug();
    view.querySelectorAll('[data-tpl]').forEach(b=>b.onclick=()=>{sync();picked=true;fromTpl=true;sug=null;auto=false;const tp=TEMPLATES.find(x=>x.id===b.dataset.tpl);applyTpl(tp);if(tp.days)moreOpen=true;dueText=it.due?it.due.split('-').reverse().join('.'):'';draw(it.due?null:'due');});
    view.querySelectorAll('[data-int]').forEach(b=>b.onclick=()=>{sync();it.intensity=b.dataset.int;it.intensitySource='item';
      if(it.intensity==='custom'&&!(it.customDays||[]).length)it.customDays=(CUSTOM_PRESET[it.cat]||[7,1]).slice();draw();});
    $('#follow')&&($('#follow').onclick=e=>{e.preventDefault();sync();it.intensitySource='cat';delete it.intensity;draw();});
    bindPhotos(view,()=>it.photos||[],async f=>{sync();const pid=await P.addPhoto(it.id,f);it.photos=[...(it.photos||[]),pid].slice(0,P.MAX_PHOTOS);draw();},pid=>{sync();it.photos=(it.photos||[]).filter(p=>p!==pid);draw();},async(pid,f)=>{sync();const np=await P.addPhoto(it.id,f);it.photos=(it.photos||[]).map(p=>p===pid?np:p);draw();});hydrate(view);
    view.querySelectorAll('[data-ss]').forEach(b=>b.onclick=()=>{sync();it.soonSource=b.dataset.ss;if(it.soonSource==='item'&&(it.soonDays===''||it.soonDays==null))it.soonDays=catSoon(it.cat,s);draw();});
    view.querySelectorAll('[data-cd]').forEach(b=>b.onclick=()=>{sync();const d=+b.dataset.cd,cd=it.customDays||[];it.customDays=cd.includes(d)?cd.filter(x=>x!==d):[...cd,d];draw();});
    const save=more=>{sync();hint();const due=parseInput(dueT.value);if(!it.name.trim()){const ni=f.querySelector('[name=name]');ni.classList.add('bad');ni.focus();return toast(t('form.err.name'));}if(!due){dueT.focus();dueT.classList.add('bad');return toast(t('form.err.due'));}
      it.due=due;it.name=it.name.trim().slice(0,60);if(it.intensitySource==='cat')delete it.intensity;
      if(ex&&ex.due!==due){delete it.handledAt;delete it.snoozeUntil;delete it.renewAsked;}
      if(it.soonSource==='item'){if(String(it.soonDays??'').trim()===''){moreOpen=true;$('#more').open=true;return toast(t('form.err.soon'));}const v=Number(it.soonDays);if(!Number.isInteger(v)||v<0||v>3650)return toast(t('form.err.soonRange'));it.soonDays=v;}else{it.soonSource='cat';delete it.soonDays;}
      for(const k of ['renewMonths','qty','shelfDays'])it[k]=it[k]===''||it[k]==null?'':Number(it[k]);
      it.prodDate=parseInput(it.prodDate)||'';const from=it.rebuyFrom;delete it.rebuyFrom;
      S.snapshot();const saved=S.upsert(it);if(!saved)return;formGuard=null;updateBadge();
      if(!ex){const x=st();x.lastCat=it.cat;const nn=normName(it.name);const guess=inferTop2(it.name,x.catLearn)[0]||null;
        // 用户把推断结果改掉了：本地记住「名称→分类」，下次优先
        if(picked&&guess&&guess!==it.cat){x.catLearn={...(x.catLearn||{}),[nn]:it.cat};const ks=Object.keys(x.catLearn);if(ks.length>300)delete x.catLearn[ks[0]];}
        {const tp=TEMPLATES.find(z=>z.cat===it.cat&&anyLang('tpl.'+z.id).includes(it.name))||TEMPLATES.find(z=>anyLang('tpl.'+z.id).includes(it.name));if(tp){const u={...(x.tplUse||{})};for(const k of Object.keys(u))if(k!==tp.id&&anyLang('tpl.'+tp.id).includes(k)){u[tp.id]={n:(u[k].n||0)+((u[tp.id]||{}).n||0),at:u[k].at};delete u[k];}u[tp.id]={n:((u[tp.id]||{}).n||0)+1,at:new Date().toISOString()};x.tplUse=u;}}
        S.saveSettings(x);}
      if(more){toast(t('form.savedMore'),true);sessionStorage.setItem('dq.prefill',JSON.stringify({cat:it.cat}));route();setTimeout(()=>document.querySelector('#f [name=name]')?.focus(),0);return;}
      if(from&&S.get(from)&&!S.get(from).deletedAt){afterRoute=()=>sheet(`<h3>${t('ui.bindSug.1')}</h3><p class="small muted">${t('ui.bindSug.2',{name:h(S.get(from).name),due:h(S.get(from).due)})}</p><div class="actions"><button class="btn primary" id="used">${t('ui.bindSug.3')}</button><button class="btn" id="keep">${t('ui.bindSug.4')}</button></div>`,w=>{
          w.querySelector('#used').onclick=()=>{closeSheet();act(t('ui.bindSug.5'),()=>S.softDelete([from]));};w.querySelector('#keep').onclick=closeSheet;});location.hash='#/item/'+saved.id;return;}
      toast(ex?t('ui.bindSug.6'):t('form.saved',{name:it.name}),true);location.hash=ex?(formOrigin||'#/item/'+saved.id):(formOrigin||'#/');};
    f.onsubmit=e=>{e.preventDefault();save(false);};$('#saveTop').onclick=()=>save(false);
    $('#more').ontoggle=()=>{moreOpen=$('#more').open;};
    f.querySelector('[name=name]').onkeydown=e=>{if(e.key==='Enter'&&!e.isComposing){e.preventDefault();if(parseInput(dueT.value)){f.querySelector('[name=name]').dispatchEvent(new Event('change'));$('#saveTop').click();}else dueT.focus();}};$('#saveMore')&&($('#saveMore').onclick=()=>save(true));
  };draw(it.rebuyFrom?'due':null);
  {const base=curSer();formGuard=()=>!!curSer&&curSer()!==base;}
}

async function exportJSON(all,withPhotos=true){const s=st(),items=all?S.raw():S.all();let photos=null;
  if(withPhotos&&globalThis.indexedDB){try{photos=await P.exportPhotos(items.flatMap(i=>i.photos||[]));}catch{toast(t('ui.exportJSON.1'),false,true);}}
  download(`${t('ui.exportJSON.2',{todayStr:todayStr()})}`,toJSON(items,photos,(s.cats?.custom)||[]),'application/json');const x=st();x.lastExportAt=x.lastBackupAt=new Date().toISOString();S.saveSettings(x);}
function icsSheet(){sheet(`<h3>${t('ui.icsSheet.1')}</h3><p class="small muted">${t('ui.icsSheet.2')}</p>
  <label class="small">${t('ui.icsSheet.3')}<select id="icsR" class="inp"><option value="">${t('ui.icsSheet.4',{n:S.all().length})}</option>${Object.entries(CATEGORIES).map(([k,c])=>`<option value="${k}">${h(c.name)}${t('ui.paren',{n:S.all().filter(i=>i.cat===k).length})}</option>`).join('')}</select></label>
  <label class="check"><input type="checkbox" id="icsH"> ${t('ui.icsSheet.5')}</label><button class="btn primary block" id="icsGo">${icon('download',18)}${t('ui.icsSheet.6')}</button>`,w=>{
  w.querySelector('#icsGo').onclick=()=>{const r=w.querySelector('#icsR').value,hd=w.querySelector('#icsH').checked;
    const l=S.all().filter(i=>(!r||i.cat===r)&&(hd||!i.handledAt));download(`${t('app.name')}${r?'-'+cat(r).name:''}.ics`,toICS(l,st()),'text/calendar;charset=utf-8');closeSheet();toast(`${t('ui.icsSheet.7',{n:l.length})}`);};});}

// 导入：先预览，再确认
function analyzeImport(res){const ex=S.all(),seen=new Set(ex.map(i=>i.name+'|'+i.due)),ids=new Set(S.raw().map(i=>i.id));const out={add:[],upd:[],dup:[],bad:res.errors};
  for(const r of res.items){const it=r.item;if(it.id&&ids.has(it.id))out.upd.push(r);else if(seen.has(it.name+'|'+it.due))out.dup.push(r);else{out.add.push(r);seen.add(it.name+'|'+it.due);}}return out;}
function importPreview(){const a=importState.a,n=a.add.length+a.upd.length+a.dup.length+a.bad.length;
  return `<section class="card imp"><div class="micro">${t('restore.preview',{file:h(importState.file)})}</div>
  <p>${t('ui.importPreview.1')} <b class="num">${n}</b> ${t('ui.importPreview.2')}${importState.photos?`${importState.settings?t('ui.importPreview.3'):''}${t('ui.importPreview.4',{n:Object.keys(importState.photos).length})}`:''}${t('ui.importPreview.5')} <b class="safe">${a.add.length}</b> ${t('ui.importPreview.6',{n:a.upd.length})} <b class="soon">${a.dup.length}</b>${t('ui.importPreview.7')} <b class="expired">${a.bad.length}</b></p>
  ${a.bad.length||a.dup.length?`<details><summary class="small">${t('ui.importPreview.8')}</summary>${a.bad.map(e=>`<p class="small expired">${t('ui.importPreview.9',{row:e.row,reason:h(e.reason)})}</p>`).join('')}${a.dup.map(e=>`<p class="small soon">${t('ui.importPreview.10',{row:e.row,name:h(e.item.name),due:h(e.item.due)})}</p>`).join('')}</details>`:''}
  ${(()=>{const nc=[...new Set([...a.add,...a.upd,...a.dup].map(r=>r.newCat).filter(Boolean))];return nc.length?`<p class="small">${t('ui.importPreview.11')}${nc.map(n=>t('ui.quote',{s:h(n)})).join(t('ui.sep'))}</p><div class="seg"><button data-nc="create" class="${importState.newCat==='create'?'on':''}">${t('ui.importPreview.12')}</button><button data-nc="other" class="${importState.newCat==='other'?'on':''}">${t('ui.importPreview.13')}</button></div>`:'';})()}
  ${a.dup.length?`<div class="seg"><button data-dup="skip" class="${importState.dup==='skip'?'on':''}">${t('ui.importPreview.14')}</button><button data-dup="keep" class="${importState.dup==='keep'?'on':''}">${t('ui.importPreview.15')}</button></div>`:''}
  <div class="actions"><button class="btn primary" id="impGo">${t('restore.go')}</button><button class="btn" id="impNo">${t('restore.cancel')}</button></div></section>`;}

function settings(){
  const s=st(),n=S.all().length,tr=S.trash().length,badgeOK='setAppBadge' in navigator;
  const nItem=k=>S.all().filter(i=>i.cat===k&&inferSource(i,s).intensitySource==='item').length;
  view.innerHTML=`${top(t('ui.settings.1'))}
  ${importState?importPreview():''}
  <div class="micro pad">${t('set.safety.title')}</div><section class="card safe-card">${(()=>{const b=backupState(s),on=+(s.backupEvery??14)>0,ev=+(s.backupEvery||s.backupEveryLast||14),over=b.last&&b.days>=ev;
   const pill=!b.last?'<span class="st-pill warn">'+t('ui.settings.2')+'</span>':over&&on?`<span class="st-pill warn">${t('ui.settings.3',{n:b.days})}</span>`:`<span class="st-pill ok">${t('ui.settings.4')} ${b.days?t('when.days',{n:b.days}):t('when.today')}</span>`;
   const lt=b.last?(()=>{const d=new Date(b.last);return `${fmtMD(fmt(d))} ${fmtTime(d)} · ${b.days?t('when.days',{n:b.days}):t('when.today')}`;})():t('ui.settings.5');
   const when=!b.last?t('set.safety.never'):t('set.safety.last',{when:b.days===0?t('when.today'):b.days===1?t('when.yesterday'):t('when.days',{n:b.days})});
   return `<div class="sec-head"><span class="ic" style="--c:var(--text2)">${icon('box',20)}</span><b>${when}</b>${pill}</div>
   <p class="small muted" id="persist">${t('set.safety.local')}</p>
   <button class="btn primary block bk-now" id="bkNow">${icon('download',18)}<span class="bk-lbl">${t('set.backup')}<small class="bk-sub">${t('set.backup.sub')}</small></span></button>
   <label class="btn block restore-btn">${icon('upload',18)}${t('set.restore')}<input type="file" id="imp" accept=".csv,.json,text/csv,application/json" hidden></label>
   <div class="stat3" id="stat3"><div><span class="num" id="dsN">${n}</span><small>${t('ui.settings.6')}</small></div><div><span class="num" id="dsP">${S.raw().reduce((a,i)=>a+(i.photos||[]).length,0)}</span><small>${t('ui.viewer.1')}</small></div><div id="dsSRow" hidden><span class="num" id="dsS"></span><small>${t('ui.settings.7')}</small></div></div>
   <div class="kv"><div><span>${t('ui.settings.8')}</span><b id="dsL">${lt}</b></div>
   <div><span>${t('ui.settings.9')}</span><label class="sw ${on?'on':''}"><input type="checkbox" role="switch" id="bkOn" ${on?'checked':''} aria-label="${t('ui.settings.9')}"></label></div></div>
   <div class="lbl ${on?'':'dim-l'}" style="margin-top:12px">${t('ui.settings.10')}</div><div class="seg ${on?'':'dim'}" id="bkSeg">${[7,14,30].map(d=>`<button data-bke="${d}" class="${ev===d?'on':''}">${t('ui.settings.11',{n:d})}</button>`).join('')}</div>
   <p class="hint">${t('ui.settings.12',{todayStr:todayStr()})}</p>`;})()}</section>
  <div class="micro pad">${t('ui.settings.13')}</div><section class="card"><div class="seg">${[['auto',t('ui.settings.14')],['light',t('ui.settings.15')],['dark',t('ui.settings.16')]].map(([k,v])=>`<button data-theme="${k}" class="${(s.theme||'auto')===k?'on':''}">${v}</button>`).join('')}</div></section>
  <div class="micro pad">${t('lang.group')}</div><section class="card lang-card"><div class="lang-head"><span class="gl">${icon('globe',18)}</span><b>${t('lang.title')}</b></div>
   <div class="lang-seg" role="radiogroup" aria-label="${t('lang.group')}">${LANGS.map(([k,n])=>`<button role="radio" aria-checked="${getLang()===k}" data-lang="${k}" lang="${k}" class="${getLang()===k?'on':''}"><b>${n}</b><small>${k.toUpperCase()}</small></button>`).join('')}</div>
   <p class="lang-hint">${t('lang.hint')}</p></section>
  <div class="micro pad">${t('ui.settings.17')}</div><section class="card"><div class="lbl" style="margin-bottom:8px">${t('set.soonGlobal')}</div><div class="seg">${[7,14,30,60].map(d=>`<button data-soon="${d}" class="${globalSoon(s)==d?'on':''}">${t('ui.settings.11',{n:d})}</button>`).join('')}</div>

   ${badgeOK?`<div class="kv"><div><span>${t('ui.settings.18')}</span><b><button class="btn sm nowrap" id="badge">${s.badge?t('ui.settings.19'):t('ui.settings.20')}</button></b></div></div>`:''}
   <p class="small muted">${t('ui.settings.21')}</p>

   <div class="kv"><div><span>${t('ui.settings.22')}</span><select id="region">${[['auto',t('region.auto')],['all',t('ui.settings.23')],['cn',t('region.cn')],['ro',t('region.ro')]].map(([k,v])=>`<option value="${k}" ${(s.region||'auto')===k?'selected':''}>${v}</option>`).join('')}</select></div></div></section>
  <div class="micro pad">${t('ui.settings.24')}</div><section class="card push-note"><span class="bk-ic">${icon('bell',20)}</span><div><b>${t('ui.settings.25')}</b><span class="ver-pill">${t('ui.settings.26')}</span>
   <p>${joinSent(t('set.push'),t('ui.settings.27'))}</p>
   <button class="btn nowrap" id="icsS2">${icon('cal',16)}${t('ui.cal.1')}</button></div></section>
  <div class="micro pad">${t('tab.cats')}</div><section class="card list set-list">
   <a class="set-row" href="#/catrules"><span class="grow">${t('ui.settings.28')}<small>${t('ui.settings.29')}</small></span>${icon('chev',18)}</a>
   <a class="set-row" href="#/catmgr"><span class="grow">${t('cat.mgr')}<small>${t('ui.settings.30',{n:Object.keys(CATEGORIES).length})}</small></span>${icon('chev',18)}</a></section>
  <p class="micro pad">${t('set.grp.data')}</p><section class="card list set-list">
   <button type="button" class="set-row go" id="ecsv"><span class="ri">${icon('download',20)}</span><span class="rt"><b>${t('set.exportCsv')}</b><small>${t('set.row.csv.sub')}</small></span>${icon('chev',16,'rc')}</button>
   <button type="button" class="set-row go" id="tpl"><span class="ri">${icon('download',20)}</span><span class="rt"><b>${t('set.csvTpl')}</b><small>${t('set.row.tpl.sub')}</small></span>${icon('chev',16,'rc')}</button></section>
  <p class="micro pad">${t('set.grp.tools')}</p><section class="card list set-list">
   <a class="set-row go" href="#/trash"><span class="ri">${icon('trash',20)}</span><span class="rt"><b>${t('ui.trashPage.1')}</b><small>${t('set.row.trash.sub')}</small></span>${tr?`<span class="rn">${tr}</span>`:''}${icon('chev',16,'rc')}</a>
   <button type="button" class="set-row go" id="obAgain"><span class="ri">${icon('sparkle',20)}</span><span class="rt"><b>${t('ui.settings.32')}</b><small>${t('set.row.ob.sub')}</small></span>${icon('chev',16,'rc')}</button>
   <button type="button" class="set-row go" id="demo"><span class="ri">${icon('box',20)}</span><span class="rt"><b>${t('ui.settings.33')}</b><small>${t('set.row.demo.sub')}</small></span>${icon('chev',16,'rc')}</button></section>
  <div class="micro pad">${t('ui.settings.35')}</div><section class="card about"><div class="kv"><div><span>${t('about.name')}</span><b class="ver num">v${VERSION}</b></div></div></section>
  <p class="micro pad danger-h">${t('set.grp.danger')}</p><section class="card list set-list">
   <button type="button" class="set-row go danger" id="clear"><span class="ri">${icon('trash',20)}</span><span class="rt"><b>${t('ui.settings.34')}</b><small>${t('set.row.clr.sub')}</small></span>${icon('chev',16,'rc')}</button></section>`;
  if(navigator.storage?.persisted)navigator.storage.persisted().then(p=>{const e=$('#persist');if(e)e.textContent=p?t('set.safety.localOk'):t('set.safety.local');});
  view.querySelectorAll('[data-lang]').forEach(b=>b.onclick=()=>{if(b.dataset.lang===getLang())return;s.lang=b.dataset.lang;S.saveSettings(s);view.classList.add('lang-out');setTimeout(()=>{view.classList.remove('lang-out');route();},120);});
  fitSoonSeg(view);
  view.querySelectorAll('[data-theme]').forEach(b=>b.onclick=()=>{s.theme=b.dataset.theme;S.saveSettings(s);applyTheme();settings();});
  $('#badge')&&($('#badge').onclick=async()=>{if(!s.badge&&'Notification' in window&&Notification.permission==='default'){try{await Notification.requestPermission()}catch{}}
    s.badge=!s.badge;S.saveSettings(s);updateBadge();settings();});
  $('#icsS2').onclick=icsSheet;
  $('#region').onchange=e=>{const x=st();x.region=e.target.value;S.saveSettings(x);toast(t('ui.settings.36'));};
  $('#bkOn').onchange=e=>{const x=st();if(e.target.checked){x.backupEvery=+(x.backupEveryLast||14);}else{x.backupEveryLast=+(x.backupEvery||14);x.backupEvery=0;}S.saveSettings(x);settings();};
  view.querySelectorAll('[data-bke]').forEach(b=>b.onclick=()=>{const x=st();x.backupEvery=x.backupEveryLast=+b.dataset.bke;S.saveSettings(x);settings();});
  $('#bkNow').onclick=async()=>{const b=$('#bkNow');if(!await backupNow())return;b.innerHTML=`${icon('check',18)}<span>${t('ui.settings.37')}</span>`;setTimeout(()=>settings(),1500);};
  navigator.storage?.estimate?.().then(e=>{const r=$('#dsSRow'),b=$('#dsS');if(r&&e&&e.usage!=null){b.innerHTML=`${(e.usage/1048576).toFixed(1)}<small class="u">MB</small>`;r.hidden=false;$('#stat3')?.classList.add('three');}}).catch(()=>{});
  $('#ecsv').onclick=()=>{download(`${t('ui.settings.38',{todayStr:todayStr()})}`,toCSV(S.all()),'text/csv;charset=utf-8');s.lastExportAt=new Date().toISOString();S.saveSettings(s);};
  $('#tpl').onclick=()=>download(t('ui.settings.39'),templateCSV(),'text/csv;charset=utf-8');
  $('#imp').onchange=async e=>{const f=e.target.files[0];if(!f)return;if(await loadImport(f)){settings();window.scrollTo(0,0);}};
  view.querySelectorAll('[data-dup]').forEach(b=>b.onclick=()=>{importState.dup=b.dataset.dup;settings();});
  view.querySelectorAll('[data-nc]').forEach(b=>b.onclick=()=>{importState.newCat=b.dataset.nc;settings();});
  $('#impNo')&&($('#impNo').onclick=()=>{importState=null;settings();});
  $('#impGo')&&($('#impGo').onclick=async()=>{const a=importState.a;if(a.upd.length&&!await ask(t('restore.ovTitle',{n:a.upd.length}),t('restore.ovBody'),t('restore.ovOk',{n:a.upd.length})))return;const rows=[...a.add,...a.upd,...(importState.dup==='keep'?a.dup.map(r=>({...r,item:{...r.item,id:undefined}})):[])];
    S.snapshot();const cs=st();cs.cats=cs.cats||{};cs.cats.custom=cs.cats.custom||[];
    // 分类按名称合并；没有条目引用的分类不创建（round4 P1）
    const remap={};for(const d of importState.categories||[]){if(!d||!/^c_[a-z0-9]{1,24}$/.test(d.id)||CATEGORIES[d.id]||cs.cats.custom.some(c=>c.id===d.id))continue;const nm=String(d.name||'').normalize('NFKC').trim().slice(0,20);
      const same=Object.entries(CATEGORIES).find(([,c])=>c.name===nm)?.[0]||cs.cats.custom.find(c=>c.name===nm)?.id||catAlias(nm);if(same){remap[d.id]=same;continue;}
      if(!rows.some(r=>r.item.cat===d.id))continue;cs.cats.custom.push({id:d.id,name:nm,icon:d.icon,color:d.color});}
    for(const r of rows)if(remap[r.item.cat])r.item.cat=remap[r.item.cat];
    // 完整备份里的设置：恢复偏好（不覆盖本机已有的分类定义）
    const bs=importState.settings;if(bs){for(const k of ['theme','soonDays','catSoon','catIntensity','badge','backupEvery','region','lang','catLearn','lastCat','onboarded','lastBackupAt'])if(bs[k]!==undefined)cs[k]=bs[k];
      if(bs.cats){const mine=cs.cats;for(const d of Array.isArray(bs.cats.custom)?bs.cats.custom:[])if(d&&/^c_[a-z0-9]{1,24}$/.test(d.id)&&!CATEGORIES[d.id]&&!mine.custom.some(c=>c.id===d.id||c.name===d.name)&&!Object.values(CATEGORIES).some(c=>c.name===d.name))mine.custom.push({id:d.id,name:String(d.name||'').slice(0,20),icon:d.icon,color:d.color});for(const k of ['hidden','names','order'])if(!(mine[k]&&Object.keys(mine[k]).length)&&bs.cats[k])mine[k]=bs.cats[k];}}
    if(importState.newCat==='create'){const made={};for(const r of rows)if(r.newCat){if(!made[r.newCat]){const id='c_'+Math.random().toString(36).slice(2,10);made[r.newCat]=id;cs.cats.custom.push({id,name:r.newCat,icon:'box',color:COLORS[cs.cats.custom.length%COLORS.length]});}r.item.cat=made[r.newCat];}}
    S.saveSettings(cs);applyCats(cs);const l=rows.map(r=>inferSource(r.item,cs));
    const ph=importState.photos;importState=null;const pids=ph&&globalThis.indexedDB?l.flatMap(i=>i.photos||[]).filter(id=>ph[id]):[];const old={};for(const id of pids)old[id]=await P.get(id).catch(()=>null);
    const hk={undo:async()=>{for(const id of pids)old[id]?await P.put(old[id]):await P.del(id);}};
    S.merge(l);if(!S.lastSaveFailed){toast(t('restore.toast',{n:l.length}),true,false,null,0,hk);updateBadge();}
    if(ph&&!S.lastSaveFailed&&globalThis.indexedDB){P.importPhotos(ph,l.flatMap(i=>i.photos||[])).then(n=>{if(n)toast(t('restore.toastPh',{n:l.length,m:n}),true,false,null,0,hk);}).catch(photoErr);}settings();});
  $('#obAgain').onclick=onboarding;
  $('#demo').onclick=()=>{act(t('ui.settings.40'),seed);settings();};
  $('#clear').onclick=async()=>{if(!n)return;if(!await ask(`${t('ui.settings.41',{n})}`,t('ui.settings.42'),`${t('ui.settings.43',{n})}`))return;await exportJSON();act(`${t('ui.settings.44',{n})}`,()=>S.softDelete(S.all().map(i=>i.id)));settings();};
}
// 分类规则二级页：每个分类的快到期天数 + 默认提醒强度
function catRules(){const s=st(),nItem=k=>S.all().filter(i=>i.cat===k&&inferSource(i,s).intensitySource==='item').length;
  view.innerHTML=`${top(t('ui.settings.28'),{back:true})}
  <section class="card list set-list sum">${Object.entries(CATEGORIES).map(([k,c])=>`<div class="set-row"><span class="il" style="color:${c.color}">${ci(k,18)}</span><span class="grow">${t('ui.catRules.1',{name:h(c.name),days:t('ui.dDays',{n:+catSoon(k,s)}),name2:INTENSITY[catDefault(k,s)].name})}</span></div>`).join('')}</section>
  <div class="micro pad">${t('ui.catRules.2')}</div><section class="card kv rules">${Object.entries(CATEGORIES).map(([k,c])=>{const v=(s.catSoon||{})[k],def=c.soon;
    return `<div><span class="il" style="color:${c.color}">${ci(k,18)}<em>${h(c.name)}</em></span><select data-cs="${k}" aria-label="${t('ui.catRules.3',{name:h(c.name)})}">
    <option value="" ${v==null?'selected':''}>${t('ui.catRules.4')} ${t('ui.dDays',{n:+(def!=null?def:globalSoon(s))})}</option>
    ${def!=null?`<option value="g" ${v==='g'?'selected':''}>${t('ui.catRules.5',{days:t('ui.dDays',{n:+globalSoon(s)})})}</option>`:''}
    ${[1,3,7,14,30,60,90,180].map(d=>`<option value="${d}" ${v===d?'selected':''}>${t('ui.settings.11',{n:d})}</option>`).join('')}</select></div>`;}).join('')}</section>
  <div class="micro pad">${t('ui.catRules.6')}</div><section class="card kv rules">${Object.entries(CATEGORIES).map(([k,c])=>`<div><span class="il" style="color:${c.color}">${ci(k,18)}<em>${h(c.name)}</em></span>
   <span class="ci-r">${nItem(k)?`<a href="#" data-over="${k}" class="small">${t('ui.catRules.7',{k:nItem(k)})}</a>`:''}<select data-ci="${k}">${Object.entries(INTENSITY).filter(([x])=>x!=='custom').map(([x,v])=>`<option value="${x}" ${catDefault(k,s)===x?'selected':''}>${v.name}</option>`).join('')}</select></span></div>`).join('')}</section>`;
  view.querySelectorAll('[data-cs]').forEach(x=>x.onchange=()=>{s.catSoon=s.catSoon||{};const v=x.value;if(v==='')delete s.catSoon[x.dataset.cs];else s.catSoon[x.dataset.cs]=v==='g'?'g':+v;
    S.saveSettings(s);toast(`${t('ui.catRules.8',{name:h(cat(x.dataset.cs).name),days:t('ui.dDays',{n:+catSoon(x.dataset.cs,s)})})}`);});
  view.querySelectorAll('[data-soon]').forEach(b=>b.onclick=()=>{s.soonDays=+b.dataset.soon;S.saveSettings(s);catRules();});
  view.querySelectorAll('[data-ci]').forEach(x=>x.onchange=()=>{const old=S.all().map(i=>inferSource(i,st()));s.catIntensity[x.dataset.ci]=x.value;S.saveSettings(s);
    // 先固化旧数据的来源，避免改默认后被误判
    S.replaceAll(S.raw().map(i=>i.deletedAt?i:(old.find(o=>o.id===i.id)||i)));toast(`${t('ui.catRules.9',{name:h(cat(x.dataset.ci).name),name2:INTENSITY[x.value].name})}`);catRules();});
  view.querySelectorAll('[data-over]').forEach(a=>a.onclick=async e=>{e.preventDefault();const k=a.dataset.over,v=catDefault(k,s),cnt=nItem(k);
    if(!await ask(`${t('ui.catRules.10',{cnt})}`,`${t('ui.catRules.11',{cnt,name:INTENSITY[v].name})}`,`${t('ui.catRules.12',{cnt})}`,false))return;
    act(`${t('ui.catRules.13',{cnt})}`,()=>S.replaceAll(S.raw().map(i=>i.cat===k&&!i.deletedAt?{...inferSource(i,s),intensitySource:'cat',intensity:undefined}:i)));catRules();});
}

// 分类管理：新建 / 改名 / 图标与颜色 / 排序 / 隐藏内置 / 删除自定义
function catMgr(){const s=st(),cnt=k=>S.all().filter(i=>i.cat===k).length,keys=Object.keys(CATEGORIES);
  view.innerHTML=`${top(t('cat.mgr'),{back:true,right:`<button class="btn sm" id="catNew">${icon('add',16)} ${t('ui.catMgr.1')}</button>`})}
  <section class="card list catmgr">${keys.map((k,i)=>{const c=CATEGORIES[k];return `<div class="row cm-row ${c.hidden?'is-hidden':''}" data-k="${h(k)}">
   <span class="ic" style="--c:${c.color}">${ci(k)}</span><span class="grow"><b class="ell">${h(c.name)}</b><small>${c.builtin?t('ui.catMgr.2'):t('tpl.custom')} ${t('ui.catMgr.3',{k:cnt(k)})}${c.hidden?'<em class="hid-tag">'+t('ui.catMgr.4')+'</em>':''}</small></span>
   <span class="drag" data-drag aria-label="${t('ui.catMgr.5')}" title="${t('ui.catMgr.5')}"><svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor"><circle cx="7" cy="5" r="1.4"/><circle cx="13" cy="5" r="1.4"/><circle cx="7" cy="10" r="1.4"/><circle cx="13" cy="10" r="1.4"/><circle cx="7" cy="15" r="1.4"/><circle cx="13" cy="15" r="1.4"/></svg></span></div>`;}).join('')}</section>
  <p class="hint catmgr-hint">${t('ui.catMgr.6')}</p>`;
  const save=(msg,f)=>{const x=st();x.cats=x.cats||{};f(x.cats,x);act(msg,()=>S.saveSettings(x));catMgr();};
  view.querySelectorAll('.cm-row').forEach(r=>r.onclick=e=>{if(e.target.closest('[data-drag]'))return;catSheet(r.dataset.k);});
  // 拖拽排序（指针事件，触屏和鼠标通用）
  const list=view.querySelector('.catmgr');
  view.querySelectorAll('[data-drag]').forEach(hd=>hd.onpointerdown=e=>{e.preventDefault();const row=hd.closest('.cm-row');row.classList.add('dragging');
    // 移动节点会丢失 pointer capture，所以监听挂在 window 上
    const mv=ev=>{const rows=[...list.querySelectorAll('.cm-row')].filter(x=>x!==row);const tp=rows.find(x=>{const b=x.getBoundingClientRect();return ev.clientY<b.top+b.height/2;});if((tp||null)!==row.nextElementSibling)list.insertBefore(row,tp||null);};
    const up=()=>{removeEventListener('pointermove',mv);removeEventListener('pointerup',up);removeEventListener('pointercancel',up);row.classList.remove('dragging');
      const o=[...list.querySelectorAll('.cm-row')].map(x=>x.dataset.k);if(o.join()!==Object.keys(CATEGORIES).join())save(t('ui.up.1'),c=>{c.order=o;});};
    addEventListener('pointermove',mv);addEventListener('pointerup',up);addEventListener('pointercancel',up);});
  window.catMove=(k,d)=>save(t('ui.up.1'),c=>{const o=Object.keys(CATEGORIES),i=o.indexOf(k),j=i+d;if(j<0||j>=o.length)return;[o[i],o[j]]=[o[j],o[i]];c.order=o;});
  $('#catNew').onclick=()=>catSheet(null);}
function catSheet(k,onCreated){const c=k?CATEGORIES[k]:{name:'',icon:'box',color:COLORS[0],custom:true};let ic=c.icon,col=c.color;const n=k?S.all().filter(i=>i.cat===k).length:0;
  sheet(`<h3>${k?t('ui.catSheet.1'):t('ui.catSheet.2')}</h3><label class="small">${t('form.name')}<input id="cName" class="inp" maxlength="20" value="${h(c.name)}" placeholder="${t('ui.catSheet.3')}"></label>
   ${c.builtin?'':`<div class="small muted">${t('ui.catSheet.4')}</div><div class="ic-pick">${ICON_SET.map(x=>`<button type="button" data-ic="${x}" class="${x===ic?'on':''}" aria-label="${x}">${icon(x,20)}</button>`).join('')}</div>
   <div class="small muted">${t('ui.catSheet.5')}</div><div class="col-pick">${COLORS.map(x=>`<button type="button" data-col="${x}" class="${x===col?'on':''}" style="--c:${x}" aria-label="${x}"></button>`).join('')}</div>`}
   ${k?`<div class="seg mv-seg"><button type="button" data-smv="-1">${icon('back',16)} ${t('ui.catSheet.6')}</button><button type="button" data-smv="1">${t('ui.catSheet.7')} ${icon('chev',16)}</button></div>`:''}
   <button class="btn primary block" id="cSave">${t('form.save')}</button>
   ${k&&c.builtin&&k!=='other'?`<button class="btn block" id="cHide">${c.hidden?t('ui.catSheet.8'):t('ui.catSheet.9')}</button>`:''}
   ${k&&c.custom?`<button class="btn danger ghost block" id="cDel">${icon('trash',18)}${t('ui.catSheet.10')}</button>`:''}`,w=>{
   w.querySelectorAll('[data-ic]').forEach(b=>b.onclick=()=>{ic=b.dataset.ic;w.querySelectorAll('[data-ic]').forEach(x=>x.classList.toggle('on',x===b));});
   w.querySelectorAll('[data-col]').forEach(b=>b.onclick=()=>{col=b.dataset.col;w.querySelectorAll('[data-col]').forEach(x=>x.classList.toggle('on',x===b));});
   w.querySelectorAll('[data-smv]').forEach(b=>b.onclick=()=>{closeSheet();window.catMove(k,+b.dataset.smv);});
   w.querySelector('#cSave').onclick=()=>{const name=w.querySelector('#cName').value.normalize('NFKC').trim().slice(0,20);if(!name)return toast(t('ui.catSheet.11'));
     if(Object.entries(CATEGORIES).some(([id,x])=>id!==k&&x.name===name))return toast(t('ui.catSheet.12'));
     const x=st();x.cats=x.cats||{};x.cats.custom=x.cats.custom||[];x.cats.names=x.cats.names||{};
     if(!k){const id='c_'+Math.random().toString(36).slice(2,10);x.cats.custom.push({id,name,icon:ic,color:col});if(onCreated){closeSheet();S.saveSettings(x);toast(`${t('ui.catSheet.13',{name})}`);return onCreated(id);}}
     else if(c.builtin)x.cats.names[k]=name;else{const d=x.cats.custom.find(d=>d.id===k);Object.assign(d,{name,icon:ic,color:col});}
     closeSheet();act(k?t('ui.catSheet.14'):`${t('ui.catSheet.13',{name})}`,()=>S.saveSettings(x));catMgr();};
   w.querySelector('#cHide')&&(w.querySelector('#cHide').onclick=()=>{const x=st();x.cats=x.cats||{};const hd=new Set(x.cats.hidden||[]);hd.has(k)?hd.delete(k):hd.add(k);x.cats.hidden=[...hd];
     closeSheet();act(hd.has(k)?`${t('ui.catSheet.15',{name:c.name})}`:`${t('ui.catSheet.16',{name:c.name})}`,()=>S.saveSettings(x));catMgr();});
   w.querySelector('#cDel')&&(w.querySelector('#cDel').onclick=async()=>{if(!await ask(t('ui.catSheet.17',{name:c.name}),`${n?t('ui.catSheet.18',{n}):''}${t('ui.catSheet.19')}`,t('ui.catSheet.delOk')))return;
     closeSheet();act(`${t('ui.catSheet.20',{name:c.name})}${n?`${t('ui.catSheet.21',{n})}`:''}`,()=>{
       S.replaceAll(S.raw().map(i=>i.cat===k?{...i,cat:'other'}:i));const x=st();x.cats.custom=(x.cats.custom||[]).filter(d=>d.id!==k);x.cats.order=(x.cats.order||[]).filter(o=>o!==k);
       if(x.catSoon)delete x.catSoon[k];if(x.catIntensity)delete x.catIntensity[k];S.saveSettings(x);});catMgr();});});}

function trashPage(){const l=S.trash().sort((a,b)=>b.deletedAt.localeCompare(a.deletedAt));
  view.innerHTML=`${top(t('ui.trashPage.1'),{back:true,right:l.length?`<button class="btn sm danger" id="empty">${t('ui.trashPage.2')}</button>`:''})}
  <p class="hint">${t('ui.trashPage.3')}</p>
  <section class="card list trash">${l.map(it=>`<div class="row" data-id="${h(it.id)}"><span class="ic" style="--c:${cat(it.cat).color}">${ci(it.cat)}</span>
   <span class="grow"><b class="ell">${h(it.name)}</b><small>${t('ui.trashPage.4',{due:h(it.due),slice:h(it.deletedAt.slice(0,10))})}</small></span>
   <button class="btn sm" data-r aria-label="${t('restore.go')}">${icon('renew',16)}<span>${t('restore.go')}</span></button><button class="btn sm danger" data-p aria-label="${t('ui.trashPage.5')}">${icon('trash',16)}</button></div>`).join('')||'<div class="empty">'+t('ui.trashPage.6')+'</div>'}</section>`;
  view.querySelectorAll('[data-r]').forEach(b=>b.onclick=()=>{const id=b.closest('[data-id]').dataset.id;act(t('ui.trashPage.7'),()=>S.restore(id));trashPage();});
  view.querySelectorAll('[data-p]').forEach(b=>b.onclick=()=>{const id=b.closest('[data-id]').dataset.id;act(t('ui.trashPage.8'),()=>S.purge(id),null,0,PHOTO_GC);trashPage();});
  $('#empty')&&($('#empty').onclick=async()=>{if(await ask(`${t('ui.trashPage.9',{n:l.length})}`,t('ui.trashPage.10'),`${t('ui.trashPage.11',{n:l.length})}`)){act(t('ui.trashPage.12'),()=>S.emptyTrash(),null,0,PHOTO_GC);trashPage();}});}

function seed(){const tp=todayStr(),D=n=>addDays(tp,n);
  S.merge([
   ...(regs(regionOf(st()))[0]==='all'?[
   {id:'d1',cat:'doc',name:t('tpl.passport'),due:D(40),intensitySource:'cat',renewMonths:120},
   {id:'d2',cat:'doc',name:t('tpl.lease'),due:D(412),intensitySource:'cat',renewMonths:12},
   {id:'d3',cat:'doc',name:t('tpl.bankCard'),due:D(-3),intensitySource:'item',intensity:'standard',renewMonths:48},
   {id:'d4',cat:'car',name:t('tpl.carIns'),due:D(6),intensitySource:'cat',renewMonths:12},
   {id:'d5',cat:'bill',name:t('tpl.domain'),due:D(143),intensitySource:'cat',renewMonths:12},
   {id:'d6',cat:'bill',name:t('tpl.phonePlan'),due:D(21),intensitySource:'item',intensity:'light',renewMonths:1},
   ]:regs(regionOf(st()))[0]==='cn'?[
   {id:'d1',cat:'doc',name:t('tpl.cnId'),due:D(40),intensitySource:'cat'},
   {id:'d2',cat:'doc',name:t('tpl.cnPassport'),due:D(412),intensitySource:'cat',renewMonths:120},
   {id:'d3',cat:'doc',name:t('tpl.cnDriving'),due:D(-3),intensitySource:'item',intensity:'standard'},
   {id:'d4',cat:'car',name:t('tpl.cnCompulsory'),due:D(6),intensitySource:'cat',renewMonths:12},
   {id:'d5',cat:'car',name:t('tpl.cnInspection'),due:D(143),intensitySource:'cat'},
   {id:'d6',cat:'bill',name:t('tpl.cnMedical'),due:D(21),intensitySource:'item',intensity:'light',renewMonths:12},
   ]:[
   {id:'d1',cat:'doc',name:t('tpl.roPermit'),due:D(40),intensitySource:'cat',renewMonths:60,note:t('ui.seed.1')},
   {id:'d2',cat:'doc',name:t('tpl.roPassport'),due:D(412),intensitySource:'cat',renewMonths:120},
   {id:'d3',cat:'doc',name:t('tpl.roDriving'),due:D(-3),intensitySource:'item',intensity:'standard',renewMonths:120},
   {id:'d4',cat:'car',name:t('tpl.roRca'),due:D(6),intensitySource:'cat',renewMonths:12},
   {id:'d5',cat:'car',name:t('tpl.roItp'),due:D(143),intensitySource:'cat',renewMonths:24},
   {id:'d6',cat:'car',name:t('tpl.roRovinieta'),due:D(21),intensitySource:'item',intensity:'light',renewMonths:12},
   ]),
   {id:'d7',cat:'food',name:t('tpl.milk'),due:D(1),intensitySource:'cat',qty:2,location:t('ui.seed.2'),shelfDays:7},
   {id:'d8',cat:'food',name:t('ui.seed.3'),due:D(64),intensitySource:'cat',qty:3,location:t('ui.seed.4')},
   {id:'d9',cat:'med',name:t('ui.seed.5'),due:D(-12),intensitySource:'cat',qty:1,location:t('ui.seed.6')},
   {id:'d10',cat:'shop',name:t('ui.seed.7'),due:D(15),intensitySource:'cat',qty:24,location:t('ui.seed.8')},
   {id:'d11',cat:'bill',name:t('tpl.videoSub'),due:D(9),intensitySource:'item',intensity:'custom',customDays:[3,1],renewMonths:12},
   {id:'d12',cat:'home',name:t('ui.seed.9'),due:D(230),intensitySource:'cat'},
   {id:'d13',cat:'other',name:t('tpl.tickets'),due:D(90),intensitySource:'cat',note:t('ui.seed.10')},
   {id:'d14',cat:'food',name:t('tpl.eggs'),due:D(0),intensitySource:'cat',qty:10,location:t('ui.seed.2')},
  ]);}

// 引导页：最多 3 屏，可跳过，只自动显示一次
const isIOS=()=>/iPhone|iPad|iPod/.test(navigator.userAgent)&&!navigator.standalone;
// 引导里的强度说明由 INTENSITY.days 生成，避免与数据不同步
export function obNote(lv){const d=INTENSITY[lv].days;return t('ob.lvl.'+lv,{days:t('ui.dDays',{n:Math.max(...d)}),n:d.length});}
// v1.6 引导 1 屏：价值说明 + 三档强度 + 加第一条 / 跳过 / 从备份恢复
function onboarding(){document.querySelector('.ob')?.remove();const el=document.createElement('div');el.className='ob ob1';el.setAttribute('role','dialog');el.setAttribute('aria-label',t('ui.onboarding.1'));
  el.innerHTML=`<button class="skip" data-ob="skip">${t('ob.skip')}</button>
   <img class="logo" src="icons/icon-192.png" alt="">
   <h1>${t('ob.title')}</h1><p class="lead">${(r=>r==='cn'?t('ob.desc.cn'):r==='ro'?t('ob.desc.ro'):t('ob.desc'))(regs(regionOf(st()))[0])}</p>
   <div class="lvls">${[['light',1,''],['standard',2,''],['strong',4,'strong']].map(([lv,k,c])=>[INTENSITY[lv].name,obNote(lv),k,c]).map(([n,d,k,c],i)=>`<div class="lv ${c}" style="--i:${i}"><div class="bars">${[10,16,22,28].map((hh,j)=>`<i class="${j<k?'on':''}" style="height:${hh}px"></i>`).join('')}</div><b>${n}</b><small>${d}</small></div>`).join('')}</div>
   <div class="foot"><button class="btn primary cta" data-ob="add">${icon('add',20)}${t('ob.add')}</button><button class="restore" data-ob="restore">${t('ob.restore')}</button></div>`;
  document.body.appendChild(el);
  const done=()=>{const s=st();s.onboarded=true;S.saveSettings(s);el.classList.add('out');setTimeout(()=>el.remove(),reduced()?0:220);};
  el.querySelector('[data-ob=skip]').onclick=()=>{done();route();};
  el.querySelector('[data-ob=add]').onclick=()=>{done();location.hash='#/new';};
  el.querySelector('[data-ob=restore]').onclick=()=>{done();pickRestore();};}
// 从备份恢复：选文件 → 设置页导入预览（选文件取消时停在原页）
function pickRestore(){const i=document.createElement('input');i.type='file';i.accept='.json,.csv,application/json,text/csv';i.id='restoreFile';i.hidden=true;document.body.appendChild(i);
  i.onchange=async()=>{const f=i.files[0];i.remove();if(f){await loadImport(f);location.hash='#/settings';route();}};i.click();setTimeout(()=>{if(!i.files?.length)i.remove();},60000);}
async function loadImport(f){try{const tx=await f.text();const res=/\.json$/i.test(f.name)||/^\s*[\[{]/.test(tx)?parseJSON(tx):parseCSV(tx);
  importState={file:f.name,a:analyzeImport(res),dup:'skip',photos:res.photos,categories:res.categories,settings:res.settings,newCat:'create'};return true;}catch(err){toast(t('restore.fail',{msg:err.message}));return false;}}

function updateBadge(){const s=st();if(!('setAppBadge' in navigator))return;
  if(!s.badge){navigator.clearAppBadge?.().catch(()=>{});return;}
  const n=todoList(S.all(),s).todo.length;(n?navigator.setAppBadge(n):navigator.clearAppBadge()).catch(()=>{});}

document.querySelectorAll('#tabbar [data-ic]').forEach(e=>e.innerHTML=e.dataset.ic==='add'?icon('add',20,'',2.25):icon(e.dataset.ic,24));
let formOrigin=null,curHash=location.hash||'#/';
// G3：新增/编辑有改动时离开（底栏、返回按钮、返回手势）先确认；没改动直接离开
let formGuard=null;
function leaveAsk(go){ask(t('form.leave.title'),t('form.leave.body'),t('form.leave.discard'),true,t('form.leave.keep')).then(ok=>{if(ok){formGuard=null;go();}});}
const dirtyForm=()=>!!(formGuard&&/^#\/(new|edit)/.test(location.hash)&&formGuard());
document.addEventListener('click',e=>{const a=e.target.closest?.('#tabbar a,[data-back]');if(!a||!dirtyForm())return;e.preventDefault();e.stopImmediatePropagation();
  const href=a.getAttribute('href');if(href&&href===location.hash)return;leaveAsk(a.matches('[data-back]')?()=>history.length>1?history.back():location.hash='#/':()=>{location.hash=href;});},true);
addEventListener('hashchange',e=>{if(!formGuard||!/^#\/(new|edit)/.test(curHash)||location.hash===curHash)return;let d=false;try{d=formGuard();}catch{}if(!d)return;
  // 视图还在表单上：不重绘，把地址改回表单
  const target=location.hash;e.stopImmediatePropagation();history.pushState(null,'',curHash);leaveAsk(()=>{location.hash=target;});});
addEventListener('hashchange',e=>{const nh=location.hash;if(/^#\/(new|edit)/.test(nh)&&!/^#\/(new|edit)/.test(curHash))formOrigin=curHash;curHash=nh;});
function route(){
  formGuard=null;applyTheme();setLang(curLang());applyCats(st());chrome();closeSheet();document.querySelector('.viewer')?.remove();const [path,qs]=(location.hash.slice(1)||'/').split('?'),q=new URLSearchParams(qs),p=path.split('/').filter(Boolean);
  const tab={'':'home',todo:'home',cats:'cats',cat:'cats',cal:'cal',settings:'settings',trash:'settings',catmgr:'settings',catrules:'settings',new:'new'}[p[0]||'']||'';
  document.querySelectorAll('#tabbar a').forEach(a=>a.classList.toggle('on',a.dataset.tab===tab));
  view.classList.remove('in');window.scrollTo(0,0);
  const r={'':home,todo:todoPage,cats,cat:()=>catList(p[1]),cal,item:()=>detail(p[1]),new:()=>form(null,q),edit:()=>form(p[1],q),settings,trash:trashPage,catmgr:catMgr,catrules:catRules}[p[0]||''];
  try{(r||home)();}catch(err){console.warn(err);view.innerHTML=`${top(t('ui.route.1'))}<section class="card"><p class="small">${t('ui.route.2',{message:h(err.message)})}</p><p class="small muted">${t('ui.route.3')}</p><a class="btn" href="#/settings">${t('ui.route.4')}</a></section>`;}
  enter();
  if(afterRoute){const f=afterRoute;afterRoute=null;f();}
  view.querySelectorAll('[data-back]').forEach(b=>b.onclick=()=>history.length>1?history.back():location.hash='#/');
}
// 启动：清理 30 天前的回收站；记录首次使用；请求持久化存储
addEventListener('dq-storage-error',()=>toast(t('err.storage'),false,true));
S.migrate();S.purgeOld();
if(globalThis.indexedDB)P.cleanup(S.raw().flatMap(i=>i.photos||[])).catch(()=>{});{const s=st();if(!s.firstUseAt){s.firstUseAt=new Date().toISOString();S.saveSettings(s);}}
navigator.storage?.persist?.().catch(()=>{});
{const qs=new URLSearchParams(location.search);if(qs.has('demo')){if(!S.raw().length)seed();const s=st();s.onboarded=true;S.saveSettings(s);}}
// N4：已有数据的老用户升级后不再弹引导
if(!st().onboarded&&S.raw().length){const s=st();s.onboarded=true;S.saveSettings(s);}
if(!st().onboarded&&!S.raw().length)onboarding();
addEventListener('hashchange',route);route();updateBadge();
document.addEventListener('visibilitychange',()=>{if(!document.hidden){updateBadge();if(!location.hash.startsWith('#/new')&&!location.hash.startsWith('#/edit'))route();}});
if('serviceWorker' in navigator&&location.protocol!=='file:')navigator.serviceWorker.register('./sw.js').catch(()=>{});
