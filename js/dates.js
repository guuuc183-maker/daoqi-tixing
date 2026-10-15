// 到期计算模块：日期一律按本地日历日 YYYY-MM-DD
export const todayStr=()=>fmt(new Date());
export function fmt(d){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
export function parse(s){const [y,m,d]=String(s).split('-').map(Number);return new Date(y,(m||1)-1,d||1);}
export function valid(s){return /^\d{4}-\d{2}-\d{2}$/.test(s)&&!isNaN(parse(s));}
export function daysLeft(due,today=todayStr()){return Math.round((parse(due)-parse(today))/86400000);}
export function addDays(s,n){const d=parse(s);d.setDate(d.getDate()+n);return fmt(d);}
export function addMonths(s,n){const d=parse(s);const day=d.getDate();d.setDate(1);d.setMonth(d.getMonth()+n);
  const last=new Date(d.getFullYear(),d.getMonth()+1,0).getDate();d.setDate(Math.min(day,last));return fmt(d);}
// 状态：expired / soon(≤阈值) / safe
export function status(n,soon=30){return n<0?'expired':n<=soon?'soon':'safe';}
export function label(n){return n<0?`已过期 ${-n} 天`:n===0?'今天到期':`还剩 ${n} 天`;}
const W='日一二三四五六';
export function nice(s){const d=parse(s);return `${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日 周${W[d.getDay()]}`;}
