// 临期阈值：单条 > 分类 > 全局
import {effSoon,catSoon,itemState,pending,todoList,inferSource} from '../js/logic.js';
import {sanitize} from '../js/sanitize.js';
import {parseCSV,toCSV} from '../js/io.js';
import {addDays} from '../js/dates.js';
let ok=0,bad=0;const t=(c,m)=>{if(c)ok++;else{bad++;console.log('FAIL',m);}};
const T='2026-10-15',D=n=>addDays(T,n),G={soonDays:30,catSoon:{}};
t(catSoon('food',G)===3&&catSoon('med',G)===30&&catSoon('cosm',G)===30&&catSoon('doc',G)===90&&catSoon('car',G)===30,'分类默认值');
t(catSoon('bill',{soonDays:14})===14&&catSoon('other',{soonDays:7})===7,'其他分类跟随全局');
t(catSoon('food',{soonDays:30,catSoon:{food:7}})===7,'设置覆盖分类');t(catSoon('food',{soonDays:21,catSoon:{food:'g'}})===21,'分类改为跟随全局');
t(catSoon('food',{catSoon:{food:'zz'}})===3,'非法分类设置回退');
t(effSoon({cat:'food',soonSource:'item',soonDays:10},G)===10,'单条覆盖');t(effSoon({cat:'food',soonSource:'item',soonDays:-1},G)===3,'非法单条回退');
t(effSoon({cat:'food',soonSource:'cat',soonDays:10},G)===3,'cat 来源忽略 soonDays');
// 状态色
t(itemState({cat:'food',due:D(5)},G,T)==='safe','食品剩5天=安全（阈值3）');t(itemState({cat:'food',due:D(3)},G,T)==='soon','食品剩3天=临期');
t(itemState({cat:'doc',due:D(80)},G,T)==='soon','证件剩80天=临期（阈值90）');t(itemState({cat:'bill',due:D(25)},G,T)==='soon','订阅跟随全局30');
t(itemState({cat:'doc',due:D(80),soonSource:'item',soonDays:30},G,T)==='safe','单条覆盖改变状态');
// 待处理
t(pending({cat:'doc',name:'x',due:D(80)},G,T).reason==='soon','证件进入临期即待处理');
t(pending({cat:'food',name:'x',due:D(10),intensitySource:'item',intensity:'light'},G,T).kind===null,'食品剩10天轻档不在待处理');
t(pending({cat:'doc',name:'x',due:D(80),soonSource:'item',soonDays:30,intensitySource:'item',intensity:'standard'},G,T).kind===null,'单条阈值30时剩80不进待处理');
// 安全率口径：ring 使用 itemState
const items=[{cat:'food',due:D(5)},{cat:'doc',due:D(80)},{cat:'car',due:D(40)}];t(items.filter(i=>itemState(i,G,T)==='safe').length===2,'安全率按各自阈值');
// 迁移 / 清洗 / 导入导出
t(inferSource({cat:'doc',due:D(1)},G).soonSource==='cat','旧数据迁移为跟随分类');
t(sanitize({name:'a',due:'2026-01-01'}).soonSource==='cat','sanitize 默认 cat');
const x=sanitize({name:'a',due:'2026-01-01',soonSource:'item',soonDays:'<b>'});t(x.soonSource==='cat'&&!('soonDays' in x),'sanitize 非法 soonDays');
t(sanitize({name:'a',due:'2026-01-01',soonSource:'item',soonDays:'12'}).soonDays===12,'sanitize 合法 soonDays');
t(sanitize({name:'a',due:'2026-01-01',cat:'化妆品'}).cat==='cosm','中文分类 化妆品');
const rt=parseCSV(toCSV([{id:'a1',name:'a',cat:'cosm',due:'2026-12-01',soonSource:'item',soonDays:45}])).items[0].item;t(rt.soonSource==='item'&&rt.soonDays===45&&rt.cat==='cosm','CSV 往返新字段');
t(parseCSV('名称,到期日,临期阈值\nx,2026-12-01,10').items[0].item.soonDays===10,'CSV 中文表头 临期阈值');
console.log(ok,'passed',bad,'failed');process.exitCode=bad?1:0;
