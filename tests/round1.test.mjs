// round1 测试报告 9 项问题的回归测试（纯逻辑部分）
import {sanitize} from '../js/sanitize.js';
import {parseCSV,parseJSON,sniff} from '../js/io.js';
import {effInt,remindDays,pending} from '../js/logic.js';
import {parseInput,fmt} from '../js/dates.js';
let ok=0,bad=0;const t=(c,m)=>{if(c)ok++;else{bad++;console.log('FAIL',m);}};
// #1 XSS：id/prodDate/history 不合法被清洗
const x=parseJSON(JSON.stringify({items:[{id:'x"><img src=x onerror=alert(3)>',name:'x',due:'2026-12-02',prodDate:'<img src=x onerror=alert(1)>',history:[{from:'<img onerror=1>',to:'b',at:'c'}],handledAt:'<b>',deletedAt:'<script>'}]})).items[0].item;
t(/^[\w-]+$/.test(x.id),'#1 id 重新生成');t(!('prodDate' in x),'#1 prodDate 丢弃');t(!('history' in x),'#1 history 丢弃');t(!x.handledAt&&!x.deletedAt,'#1 日期字段丢弃');
t(sanitize({name:'a',due:'2026-01-01',history:[{from:'2025-01-01',to:'2026-01-01',at:'2025-01-01'}]}).history.length===1,'#1 合法 history 保留');
// #2 非法强度
const b=sanitize({name:'坏强度',due:'2026-12-03',intensitySource:'item',intensity:'foo',customDays:['a',3,'x']});
t(b.intensitySource==='cat'&&!b.intensity,'#2 非法强度回退跟随分类');
t(effInt({cat:'doc',intensitySource:'item',intensity:'foo'},{})==='strong','#2 effInt 兜底');
t(Array.isArray(remindDays({cat:'doc',intensitySource:'item',intensity:'custom',customDays:'abc'},{})),'#2 customDays 非数组不崩');
t(effInt({cat:'food'},{catIntensity:{food:'zzz'}})==='standard','#2 分类设置非法兜底');
t(pending({cat:'zzz',name:'a',due:'2026-10-15',intensity:'foo',intensitySource:'item'},{},'2026-10-15').kind==='todo','#2 pending 不抛错');
// #4 长度限制
t(sanitize({name:'长'.repeat(240),due:'2026-01-01',note:'n'.repeat(900)}).name.length===60,'#4 名称截断 60');
// #5 12.10
const Y=new Date().getFullYear(),d=parseInput('12.10');t(d===`${Y}-10-12`||d===`${Y+1}-10-12`,'#5 12.10 → 日.月 '+d);
t(parseInput('10/26')==='2026-10-31','#5 10/26 仍为月/年');t(parseInput('03/2027')==='2027-03-31','#5 4位年');
// #8 分号 CSV
t(sniff('名称;到期日\n')===';'&&sniff('a,b;c\n')===',','#8 sniff');
const sc=parseCSV('Denumire;Data expirării;Cantitate\nLapte;20.10.2026;2\n"a;b";21.10.2026;1');
t(sc.items.length===2&&sc.items[1].item.name==='a;b'&&sc.items[0].item.qty===2,'#8 分号 CSV');
// 数字字段
t(!('qty' in sanitize({name:'a',due:'2026-01-01',qty:'-5'})),'数字字段负数丢弃');
console.log(ok,'passed',bad,'failed');process.exitCode=bad?1:0;
// round2 N3：全角
{const {parseInput}=await import('../js/dates.js');const {sanitize}=await import('../js/sanitize.js');
 let ok2=0;const c=(x,m)=>{if(x)ok2++;else{console.log('FAIL',m);process.exitCode=1;}};
 c(parseInput('１５．１０．２０２６')==='2026-10-15','N3 全角日期');c(parseInput('２０２６－１０－１５')==='2026-10-15','N3 全角横线');
 c(sanitize({name:'ＡＢＣ',due:'１５．１０．２０２６',qty:'３'}).qty===3,'N3 sanitize 全角数字');c(sanitize({name:'ＡＢＣ',due:'2026-10-15'}).name==='ABC','N3 名称 NFKC');
 console.log(ok2,'N3 passed');}
