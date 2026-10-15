// 提醒/待处理核心逻辑（纯函数，可在 node 中测试）
import {CATEGORIES,INTENSITY,findTpl} from './templates.js';
import {daysLeft,todayStr,status} from './dates.js';
export const catDefault=(cat,st={})=>(st.catIntensity||{})[cat]||(CATEGORIES[cat]||CATEGORIES.other).intensity;
export const effInt=(it,st)=>it.intensitySource==='item'?(it.intensity||'standard'):catDefault(it.cat,st);
// 旧数据没有 intensitySource：等于分类默认→跟随分类，否则→单独设置
export function inferSource(it,st){if(!it.intensitySource)it.intensitySource=(!it.intensity||it.intensity===catDefault(it.cat,st))?'cat':'item';
  if(it.handled===true&&!it.handledAt)it.handledAt=todayStr();delete it.handled;return it;}
export function remindDays(it,st){const i=effInt(it,st);return i==='custom'?[...new Set((it.customDays||[]).map(Number))].sort((a,b)=>b-a):INTENSITY[i].days;}
export const leadDays=it=>findTpl(it.cat,it.name)?.lead;
// 返回 {kind:'todo'|'later'|null, reason}
export function pending(it,st,today=todayStr()){
  if(it.deletedAt)return {kind:null};
  const n=daysLeft(it.due,today);
  if(it.handledAt){
    if(n<0&&it.renewMonths&&!it.renewAsked)return {kind:'todo',reason:'askRenew',n};
    return {kind:null,n};}
  const days=remindDays(it,st),first=days.length?Math.max(...days):0,lead=leadDays(it);
  const inLead=lead!=null&&n<=lead;
  if(n>first&&!inLead&&n>0)return {kind:null,n};
  if(it.snoozeUntil&&it.snoozeUntil>today)return {kind:'later',reason:'snooze',n};
  if(effInt(it,st)==='strong'&&n<-30&&((-n-30)%7)!==0)return {kind:'later',reason:'weekly',n};
  return {kind:'todo',reason:n<0?'expired':n===0?'today':(n>first&&inLead)?'lead':'remind',n};}
export function itemState(it,st,today=todayStr()){const n=daysLeft(it.due,today);
  return it.handledAt&&n<0&&!it.renewMonths?'ended':status(n,st.soonDays||30);}
export function sortTodo(list,st){const r=x=>x.n<0?0:x.n===0?1:effInt(x,st)==='strong'?2:3;return list.slice().sort((a,b)=>r(a)-r(b)||a.n-b.n);}
export function todoList(items,st,today=todayStr()){const t=[],l=[];
  for(const it of items){const p=pending(it,st,today);if(p.kind){const x={...it,n:p.n,reason:p.reason};(p.kind==='todo'?t:l).push(x);}}
  return {todo:sortTodo(t,st),later:sortTodo(l,st)};}
