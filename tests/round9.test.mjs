// v1.7.2 round9：R9-1 / R9-2 / R9-3 / R9-4
import fs from 'fs';import path from 'path';import {fileURLToPath} from 'url';
import {applyCats,catIdByName,renameDupCustom} from '../js/templates.js';import {parseCSV,parseJSON} from '../js/io.js';import {t,setLang} from '../js/i18n/i18n.js';
const root=path.join(path.dirname(fileURLToPath(import.meta.url)),'..');let p=0,f=0;const T=(n,c)=>{if(c)p++;else{f++;console.log('FAIL',n);}};const N=s=>String(s).replace(/\u00a0/g,' ');
const app=fs.readFileSync(path.join(root,'js/app.js'),'utf8');
// R9-1：带数字的 ui.row.4 必须传 n；规则页默认项用 ui.dDays
T('R9-1 catRules 默认项不再拼 ui.row.4',!/catRules\.4'\)\}[^<]*ui\.row\.4/.test(app));
T('R9-1 详情大数字单位传 n',app.includes("t('ui.row.4',{n:Math.abs(it.n)})"));
setLang('ro');T('R9-1 ro 30 de zile',N(t('ui.catRules.4')+' '+t('ui.dDays',{n:30})).endsWith('30 de zile'));T('R9-1 ro row.4 n=1',t('ui.row.4',{n:1})==='zi');
setLang('en');T('R9-1 en 1 day',N(t('ui.dDays',{n:1}))==='1 day');T('R9-1 en row.4 n=1',t('ui.row.4',{n:1})==='day');
// R9-2：最后一个数字和单位一致
setLang('ro');const ro=t('intDesc.standard');T('R9-2 ro 1 zi '+ro,/\b1 zi\b/.test(ro)&&!/1 zile/.test(ro)&&ro.length<=26);
setLang('en');const en=t('intDesc.standard');T('R9-2 en 1 day '+en,/\b1 day\b/.test(en)&&!/1 days/.test(en));
// R9-3：旧名归入 home
applyCats({});for(const l of ['zh','ro','en']){setLang(l);for(const n of ['Warranties','Garanții','garanţii','家居保修','Home','Casă'])T(`R9-3 ${l} catIdByName ${n}`,catIdByName(n)==='home');}
setLang('en');const r=parseCSV('name,due,category\nFridge,2027-01-01,Warranties\nTV,2027-01-01,Garanții');T('R9-3 CSV 旧名→home 且不算新分类',r.items.every(x=>x.item.cat==='home'&&!x.newCat));
const j=parseJSON(JSON.stringify({items:[{id:'a',name:'Fridge',due:'2027-01-01',cat:'Warranties'},{id:'b',name:'TV',due:'2027-01-01',cat:'Garanții'}]}));T('R9-3 JSON 旧名→home',(j.items||j).every(x=>(x.item||x).cat==='home'));
// R9-4：自建同名「Home」改名，id 不变
for(const nm of ['Home','home','Casă','家居保修','Warranties']){const st={cats:{custom:[{id:'c_myhome',name:nm,icon:'home',color:'#D94545'},{id:'c_pet',name:'Pets'}]}};
  const out=renameDupCustom(st,n=>n+' (mine)');const c=out.st.cats.custom;T(`R9-4 ${nm} 改名`,out.changed&&c[0].id==='c_myhome'&&c[0].name!==nm&&c[1].name==='Pets');
  applyCats(out.st);setLang('en');const names=['home','c_myhome'].map(k=>catIdByName(k)&&k);T(`R9-4 ${nm} 名称不重复`,new Set([t('cat.home'),c[0].name].map(x=>x.toLowerCase())).size===2);}
T('R9-4 无冲突不动',!renameDupCustom({cats:{custom:[{id:'c_a',name:'Pets'}]}}).changed);
// R10-1：名称折叠（空格、大小写、变音、cedilla）
import {catAlias} from '../js/templates.js';
for(const n of ['Warranties',' garantii ','Garanţii','Warranty','GARANȚII','  Casa '])T(`R10-1 catAlias「${n}」→home`,catAlias(n)==='home');
// R10-2：目标名被占用时从 2 开始编号
{const o=renameDupCustom({cats:{custom:[{id:'c_a',name:'Home'},{id:'c_b',name:'Home (mine)'}]}},n=>n+' (mine)');T('R10-2 Home → Home 2 '+o.st.cats.custom[0].name,o.st.cats.custom[0].name==='Home 2');
 const o2=renameDupCustom({cats:{custom:[{id:'c_a',name:'Home'},{id:'c_b',name:'Home (mine)'},{id:'c_c',name:'Home 2'}]}},n=>n+' (mine)');T('R10-2 再占用 → Home 3 '+o2.st.cats.custom[0].name,o2.st.cats.custom[0].name==='Home 3');}
setLang('zh');console.log(`round9 ${p} passed ${f} failed`);if(f)process.exit(1);
