import * as S from './store.js';
import {CATEGORIES,REMIND_OPTIONS} from './templates.js';
import {daysLeft,level,label,todayStr,addYears,addDays} from './dates.js';
import {toCSV,parseCSV} from './csv.js';

const $=s=>document.querySelector(s), view=$('#view');
const h=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let filter='all';
function setBar(title,back){$('#title').textContent=title;$('#back').hidden=!back;$('#gear').hidden=!!back;}
$('#back').onclick=()=>history.length>1?history.back():location.hash='#/';

function toast(msg){const t=document.createElement('div');t.className='toast';t.textContent=msg;document.body.appendChild(t);setTimeout(()=>t.remove(),1800);}

function renderList(){
  setBar('到期提醒',false);
  const items=S.all().map(it=>({...it,n:daysLeft(it.dueDate)})).sort((a,b)=>a.n-b.n);
  const soon=items.filter(i=>i.n<=30).length, overdue=items.filter(i=>i.n<0).length, today=items.filter(i=>i.n===0).length;
  const shown=filter==='all'?items:items.filter(i=>i.category===filter);
  view.innerHTML=`
  <section class="summary"><div class="big">即将到期 ${soon} 项</div>
    <div class="sub">30 天内（含已过期 ${overdue} 项${today?`，今天到期 ${today} 项`:''}）</div></section>
  <nav class="chips">${[['all','全部'],...Object.entries(CATEGORIES).map(([k,c])=>[k,c.icon+' '+c.name])].map(([k,n])=>`<button data-f="${k}" class="${filter===k?'on':''}">${n}</button>`).join('')}</nav>
  <ul class="list">${shown.map(it=>`<li><a href="#/item/${it.id}" class="row">
    <span class="ic">${CATEGORIES[it.category]?.icon||'📌'}</span>
    <span class="mid"><b>${h(it.name)}</b><small>${it.dueDate}${it.repeatYearly?' · 每年':''}</small></span>
    <span class="cd ${level(it.n)}">${label(it.n)}</span></a></li>`).join('')||'<li class="empty">还没有条目，点右下角「+」添加</li>'}</ul>
  <a class="fab" href="#/new">＋</a>`;
  view.querySelectorAll('.chips button').forEach(b=>b.onclick=()=>{filter=b.dataset.f;renderList();});
}

function renderEdit(id){
  const it=id?S.get(id):null; if(id&&!it)return location.hash='#/';
  setBar(it?'编辑':'新增',true);
  let cat=it?.category||'doc';
  const draw=()=>{
    const c=CATEGORIES[cat], days=it&&it.category===cat?it.remindDays:c.days;
    view.innerHTML=`<form class="form" id="f">
      <label>分类</label><div class="chips seg">${Object.entries(CATEGORIES).map(([k,v])=>`<button type="button" data-c="${k}" class="${k===cat?'on':''}">${v.icon} ${v.name}</button>`).join('')}</div>
      <label>名称</label><input name="name" required value="${h(it?.name)}" placeholder="例如：${c.presets[0]}">
      <div class="presets">${c.presets.map(p=>`<button type="button" class="pre">${p}</button>`).join('')}</div>
      <label>到期日</label><input type="date" name="dueDate" required value="${it?.dueDate||''}">
      <label>提前提醒（天）</label><div class="checks">${REMIND_OPTIONS.map(d=>`<label class="ck"><input type="checkbox" name="rd" value="${d}" ${days.includes(d)?'checked':''}>${d===0?'当天':d}</label>`).join('')}</div>
      ${c.extra?`<div class="two"><div><label>数量</label><input name="quantity" value="${h(it?.quantity)}"></div><div><label>位置</label><input name="location" value="${h(it?.location)}" placeholder="冰箱 / 仓库"></div></div>`:''}
      <label class="sw"><input type="checkbox" name="repeatYearly" ${(it?it.repeatYearly:cat!=='food')?'checked':''}> 每年重复</label>
      <label>备注</label><textarea name="note" rows="3">${h(it?.note)}</textarea>
      <button class="primary" type="submit">保存</button></form>`;
    view.querySelectorAll('[data-c]').forEach(b=>b.onclick=()=>{cat=b.dataset.c;draw();});
    view.querySelectorAll('.pre').forEach(b=>b.onclick=()=>{view.querySelector('[name=name]').value=b.textContent;});
    $('#f').onsubmit=e=>{e.preventDefault();const f=new FormData(e.target);
      const obj={...(it||{}),category:cat,name:f.get('name').trim(),dueDate:f.get('dueDate'),
        remindDays:f.getAll('rd').map(Number).sort((a,b)=>b-a),repeatYearly:!!f.get('repeatYearly'),note:f.get('note')||'',
        quantity:f.get('quantity')||'',location:f.get('location')||''};
      const saved=S.upsert(obj);toast('已保存');location.replace('#/item/'+saved.id);};
  };draw();
}

function renderDetail(id){
  const it=S.get(id); if(!it)return location.hash='#/';
  setBar('详情',true);
  const n=daysLeft(it.dueDate), c=CATEGORIES[it.category]||CATEGORIES.other;
  const plan=(it.remindDays||[]).map(d=>({d,date:addDays(it.dueDate,-d)}));
  view.innerHTML=`<section class="hero ${level(n)}"><div class="ic">${c.icon}</div><h2>${h(it.name)}</h2>
    <div class="num">${n<0?-n:n}</div><div>${n<0?'天前已过期':n===0?'今天到期':'天后到期'}</div><small>到期日 ${it.dueDate} · ${c.name}${it.repeatYearly?' · 每年重复':''}</small></section>
   <section class="card"><h3>提醒计划</h3>${plan.length?`<ul class="plan">${plan.map(p=>`<li class="${p.date<todayStr()?'past':''}"><span>${p.d===0?'当天':'提前 '+p.d+' 天'}</span><span>${p.date}</span></li>`).join('')}</ul>`:'<p class="muted">未设置提醒</p>'}
   ${it.quantity||it.location?`<p>数量：${h(it.quantity)||'-'}　位置：${h(it.location)||'-'}</p>`:''}${it.note?`<p class="note">${h(it.note)}</p>`:''}</section>
   <section class="card"><h3>已续期</h3><div class="renew"><button class="primary" id="r1">到期日 +1 年</button></div>
    <div class="renew"><input type="date" id="rd" value="${addYears(it.dueDate)}"><button id="rc">按自定义日期续期</button></div></section>
   <div class="actions"><a class="btn" href="#/edit/${it.id}">编辑</a><button class="danger" id="del">删除</button></div>`;
  const renew=d=>{S.upsert({...it,dueDate:d,lastRenewedAt:todayStr()});toast('已续期至 '+d);renderDetail(id);};
  $('#r1').onclick=()=>renew(addYears(it.dueDate));
  $('#rc').onclick=()=>{const v=$('#rd').value;if(v)renew(v);};
  $('#del').onclick=()=>{if(confirm(`确定删除「${it.name}」？`)){S.remove(id);location.replace('#/');}};
}

function renderSettings(){
  setBar('设置',true);const s=S.settings();
  view.innerHTML=`<section class="card"><h3>提醒</h3>
    <button id="notif" disabled>开启通知（第二阶段）</button>
    <label>每日推送时间</label><input type="time" id="nt" value="${s.notifyTime}">
    <label>时区</label><input id="tz" value="${h(s.timezone)}"><p class="muted">推送功能将在第二阶段上线，此处设置先保存在本机。</p></section>
   <section class="card"><h3>备份（CSV）</h3><p class="muted">共 ${S.all().length} 项，数据仅保存在本机浏览器。</p>
    <button class="primary" id="exp">导出 CSV</button>
    <label class="btn file">导入 CSV<input type="file" id="imp" accept=".csv,text/csv" hidden></label>
    <label class="sw"><input type="checkbox" id="merge" checked> 导入时与现有数据合并（同 id 覆盖）</label></section>
   <section class="card"><h3>关于</h3><p class="muted">到期提醒 · MVP 第一阶段（本地版）</p></section>`;
  const sv=()=>S.saveSettings({notifyTime:$('#nt').value,timezone:$('#tz').value});$('#nt').onchange=sv;$('#tz').onchange=sv;
  $('#exp').onclick=()=>{const b=new Blob([toCSV(S.all())],{type:'text/csv;charset=utf-8'});const a=document.createElement('a');
    a.href=URL.createObjectURL(b);a.download=`到期提醒备份-${todayStr()}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);};
  $('#imp').onchange=async e=>{const f=e.target.files[0];if(!f)return;const rows=parseCSV(await f.text());
    if(!rows.length)return toast('没有可导入的有效行');
    let list=$('#merge').checked?S.all():[];const m=new Map(list.map(x=>[x.id,x]));rows.forEach(r=>m.set(r.id,r));
    S.replaceAll([...m.values()]);toast(`已导入 ${rows.length} 项`);renderSettings();};
}

function route(){const p=location.hash.slice(2).split('/');window.scrollTo(0,0);
  if(p[0]==='new')renderEdit();else if(p[0]==='edit')renderEdit(p[1]);else if(p[0]==='item')renderDetail(p[1]);
  else if(p[0]==='settings')renderSettings();else renderList();}
addEventListener('hashchange',route);route();
if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js');

// 演示数据：访问 ?demo=1 时写入
if(new URLSearchParams(location.search).has('demo')){const t=todayStr();
  S.replaceAll([
   ['居留卡','doc',-3,[90,30,7],true],['护照','doc',150,[90,30,7],false],['RCA 交强险','car',5,[30,7,1],true],
   ['ITP 车检','car',22,[30,7,1],true],['Rovinieta 公路费','car',0,[30,7,1],true],['牛奶 2L','food',2,[3,1],false],
   ['Netflix 订阅','other',12,[7,1],true],['春节机票提醒','other',60,[30,7],true]
  ].map(([name,category,d,remindDays,repeatYearly],i)=>({id:'demo'+i,name,category,dueDate:addDays(t,d),remindDays,repeatYearly,
    note:i===0?'去移民局 IGI 续办，记得带租约和保险':'',quantity:category==='food'?'3 盒':'',location:category==='food'?'店内冷柜':''})));
  history.replaceState(null,'',location.pathname+location.hash);route();}
