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
export function label(n){return n<0?`过期 ${-n} 天`:n===0?'今天到期':`还剩 ${n} 天`;}
const W='日一二三四五六';
export function nice(s){const d=parse(s);return `${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日 周${W[d.getDay()]}`;}
const mk=(y,m,d)=>{if(y<100)y+=2000;const dt=new Date(y,m-1,d);return dt.getFullYear()===y&&dt.getMonth()===m-1&&dt.getDate()===d?fmt(dt):null;};
const lastDay=(y,m)=>{if(y<100)y+=2000;return m>=1&&m<=12?fmt(new Date(y,m,0)):null;};
// 识别键盘输入的日期：2026-10-15 / 15.10.2026 / 15/10/26 / 151026 / 15102026 / 20261015 / 10/26（月/年→当月最后一天）
export function parseInput(s){s=String(s||'').normalize('NFKC').replace(/[。．]/g,'.').trim().replace(/\s+/g,'');let m;if(!s)return null;
  if(m=s.match(/^(\d{4})[-./年](\d{1,2})[-./月](\d{1,2})日?$/))return mk(+m[1],+m[2],+m[3]);
  if(m=s.match(/^(\d{1,2})[-./](\d{1,2})[-./](\d{2}|\d{4})$/))return mk(+m[3],+m[2],+m[1]);
  if(m=s.match(/^(\d{1,2})[./](\d{2}|\d{4})$/)){const yy=new Date().getFullYear()%100;
    // 4 位年份或 ≥ 今年的 2 位年份 → 月/年；否则当作 日.月（今年，已过则明年）
    if(m[2].length===4||(+m[2]>=yy&&+m[1]<=12))return lastDay(+m[2],+m[1]);
    const t=new Date(),Y=t.getFullYear(),d1=mk(Y,+m[2],+m[1]);if(!d1)return null;return d1<fmt(t)?mk(Y+1,+m[2],+m[1]):d1;}
  if(m=s.match(/^(\d{2})(\d{2})(\d{2})$/))return mk(+m[3],+m[2],+m[1]);
  if(m=s.match(/^\d{8}$/)){const y=+s.slice(0,4);return y>=1900&&y<=2100?mk(y,+s.slice(4,6),+s.slice(6)):mk(+s.slice(4),+s.slice(2,4),+s.slice(0,2));}
  return null;}
export const ymd=s=>s.replace(/-/g,'');
