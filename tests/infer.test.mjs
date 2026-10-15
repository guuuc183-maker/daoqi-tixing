// 名称推断分类：分类词典-v2.1-用例.py 的 21 条 + 规则 + 日用品合并
import {inferCat,inferCands,inferTop2,applyCats,normName,CATEGORIES,mergeIntoBuiltin,visibleCats} from '../js/templates.js';
import {PRIORITY} from '../js/cat-dict.js';
let p=0,f=0;const t=(n,c)=>{if(c)p++;else{f++;console.log('FAIL',n);}};
// 第 16 条（手动选「车辆」后输入牛奶）：推断函数只在未手动选择时调用，这里按表单逻辑模拟；真实验证在 e2e
const manual=(name,picked)=>picked||inferCat(name);
const T=[['测试面包','food'],['布洛芬','med'],['RCA 交强险','car'],['pașaport','doc'],['Pasaport','doc'],['Netflix','bill'],['港澳通行证','doc'],['年检','car'],['面霜','cosm'],['洗面奶','cosm'],['奶粉','food'],['电池','daily'],['ITP','car'],['itpx',null],['洗衣液','daily'],[['牛奶','car'],'car'],['抽纸','daily'],['Persil','daily'],['hârtie igienică','daily'],['老干妈','food'],['牙膏','daily']];
T.forEach(([i,e],n)=>{const g=Array.isArray(i)?manual(...i):inferCat(i);t(`#${n+1} ${i}→${e} (got ${g})`,g===e);});
t('用例数 21',T.length===21);
t('优先级 doc>car>med>food>cosm>daily>shop>bill>home',PRIORITY.join()==='doc,car,med,food,cosm,daily,shop,bill,home');
t('面霜 无 food 候选',!inferCands('面霜').some(c=>c.cat==='food'));t('洗面奶 无 food 候选',!inferCands('洗面奶').some(c=>c.cat==='food'));
t('ş/ţ 旧写法',normName('paşaport ţară')==='pasaport tara');
t('数字算词字符',inferCat('ITP2')===null&&inferCat('ITP 2027')==='car');
for(const w of ['台胞证','居住证'])t(w+'→doc',inferCat(w)==='doc');for(const w of ['商业险','审验','交强险'])t(w+'→car',inferCat(w)==='car');
t('调料/方便面→食品',inferCat('酱油')==='food'&&inferCat('方便面')==='food');
t('弱命中单独生效',inferCat('鱼')==='food');t('学习优先',inferCat('牛奶',{[normName('牛奶')]:'shop'})==='shop');
applyCats({cats:{custom:[{id:'c_yj',name:'烟酒',icon:'box',color:'#D94545'}]}});t('自定义分类名优先',inferCat('烟酒礼盒')==='c_yj');applyCats({});
// 日用品内置
const d=CATEGORIES.daily;t('daily 内置',d&&d.name==='日用品'&&d.icon==='daily'&&d.color==='#5E8F3A'&&d.intensity==='standard'&&d.soon===30);
const ks=Object.keys(CATEGORIES);t('daily 在化妆品后、店内商品前',ks.indexOf('daily')===ks.indexOf('cosm')+1&&ks.indexOf('shop')===ks.indexOf('daily')+1);
t('daily 在宫格',visibleCats().some(([k])=>k==='daily'));
const st={catSoon:{c_ry:7},catIntensity:{c_ry:'strong'},lastCat:'c_ry',catLearn:{'抽纸':'c_ry'},cats:{custom:[{id:'c_ry',name:'日用品',icon:'box',color:'#000000'},{id:'c_pet',name:'宠物'}],order:['c_ry','doc','daily'],hidden:['c_ry']}};
const m=mergeIntoBuiltin(st,[{id:'1',cat:'c_ry'},{id:'2',cat:'food'}]);
t('合并：条目移到 daily',m.changed&&m.items[0].cat==='daily'&&m.items[1].cat==='food');
t('合并：设置带过去',m.st.catSoon.daily===7&&!('c_ry' in m.st.catSoon)&&m.st.catIntensity.daily==='strong'&&m.st.lastCat==='daily'&&m.st.catLearn['抽纸']==='daily');
t('合并：自定义移除、排序去重',m.st.cats.custom.length===1&&m.st.cats.order.join()==='daily,doc'&&!m.st.cats.hidden.length);
t('无同名不改',!mergeIntoBuiltin({cats:{custom:[{id:'c_pet',name:'宠物'}]}},[]).changed);
console.log(`${p} passed ${f} failed`);if(f)process.exit(1);
