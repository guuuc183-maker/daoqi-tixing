// 统一的「到期计算」模块（日期一律按本地日历日 YYYY-MM-DD 处理）
export const todayStr=()=>fmt(new Date());
export function fmt(d){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
export function parse(s){const [y,m,d]=s.split('-').map(Number);return new Date(y,m-1,d);}
export function daysLeft(due,today=todayStr()){return Math.round((parse(due)-parse(today))/86400000);}
export function addDays(s,n){const d=parse(s);d.setDate(d.getDate()+n);return fmt(d);}
export function addYears(s,n=1){const d=parse(s);const m=d.getMonth();d.setFullYear(d.getFullYear()+n);if(d.getMonth()!==m)d.setDate(0);return fmt(d);}
export function level(n){return n<0?'red':n<=7?'orange':n<=30?'yellow':'green';}
export function label(n){return n<0?`已过期 ${-n} 天`:n===0?'今天到期':`还剩 ${n} 天`;}
