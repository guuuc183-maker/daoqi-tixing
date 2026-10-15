// 导出到日历（.ics）
import {t} from './i18n/i18n.js';
import {remindDays,effInt} from './logic.js';
import {addDays,ymd} from './dates.js';
import {CATEGORIES,findTpl} from './templates.js';
const esc=s=>String(s||'').replace(/\\/g,'\\\\').replace(/\n/g,'\\n').replace(/([,;])/g,'\\$1');
function fold(l){const out=[];let cur='';for(const ch of l){if(new TextEncoder().encode(cur+ch).length>73){out.push(cur);cur=' '+ch;}else cur+=ch;}out.push(cur);return out.join('\r\n');}
const STRONG=[60,30,14,7,3,1];
export function toICS(items,st){const now=new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d+/,'');
  const L=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//daoqi-tixing//due-dates//EN','CALSCALE:GREGORIAN','METHOD:PUBLISH','X-WR-CALNAME:'+t('ics.calName')];
  for(const it of items){let days=remindDays(it,st);if(effInt(it,st)==='strong')days=STRONG;days=[...new Set(days)].filter(d=>d>=0).slice(0,6);
    const tpl=findTpl(it.cat,it.name),desc=[t('ics.cat',{cat:(CATEGORIES[it.cat]||CATEGORIES.other).name}),it.note,tpl?.docs&&t('ics.docs',{docs:tpl.docs})].filter(Boolean).join('\n');
    L.push('BEGIN:VEVENT',`UID:${it.id}@daoqi-tixing`,`DTSTAMP:${now}`,`DTSTART;VALUE=DATE:${ymd(it.due)}`,`DTEND;VALUE=DATE:${ymd(addDays(it.due,1))}`,
      `SUMMARY:⏰ ${esc(t('ics.summary',{name:it.name}))}`,`DESCRIPTION:${esc(desc)}`,'TRANSP:TRANSPARENT');
    // 全天事件：提前 d 天的 09:00 提醒
    for(const d of days)L.push('BEGIN:VALARM','ACTION:DISPLAY',`DESCRIPTION:${esc(d?t('ics.alarm',{name:it.name,n:d}):t('ics.alarmToday',{name:it.name}))}`,`TRIGGER:${d?`-P${d-1}DT15H`:'PT9H'}`,'END:VALARM');
    L.push('END:VEVENT');}
  L.push('END:VCALENDAR');return L.map(fold).join('\r\n')+'\r\n';}
