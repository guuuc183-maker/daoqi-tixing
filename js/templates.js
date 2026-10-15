import {t,anyLang} from './i18n/i18n.js';
import {SHELF} from './shelf.js';
// 分类与模板。lead=建议办理提前量（天），docs=所需材料（参考，请以官方为准）
const BUILTIN={
  doc:{color:'#3D7BE0',intensity:'strong',soon:90},
  car:{color:'#7A5AF0',intensity:'strong',soon:30},
  food:{color:'#E08A1E',intensity:'standard',soon:3},
  med:{color:'#E0507A',intensity:'standard',soon:30},
  cosm:{color:'#C0569E',intensity:'light',soon:30},
  daily:{icon:'daily',color:'#5E8F3A',intensity:'standard',soon:30},
  shop:{color:'#0C9C6B',intensity:'light'},
  bill:{color:'#1E9FB0',intensity:'standard'},
  home:{color:'#8A6A4A',intensity:'light'},
  other:{color:'#67717A',intensity:'standard'},
};
export const TEMPLATES=[
  {id:'cnId',cat:'doc',region:'cn',renew:120,lead:90,url:"https://www.gov.cn/gongbao/content/2003/content_62254.htm"},
  {id:'cnPassport',cat:'doc',region:'cn',renew:120,lead:180,url:"https://s.nia.gov.cn/mps/bszy/gmcrg/slpthz/201903/t20190313_1011.html"},
  {id:'cnHkMacau',cat:'doc',region:'cn',renew:120,lead:60,url:"https://gat.jiangsu.gov.cn/art/2025/3/13/art_90830_6789.html"},
  {id:'cnHkEndorse',cat:'doc',region:'cn',renew:"",lead:14,verify:true},
  {id:'cnTaiwan',cat:'doc',region:'cn',renew:120,lead:60,verify:true},
  {id:'cnTaiwanCompat',cat:'doc',region:'cn',renew:60,lead:60,verify:true},
  {id:'cnResidence',cat:'doc',region:'cn',renew:12,lead:30,verify:true},
  {id:'cnDriving',cat:'doc',region:'cn',renew:72,lead:90,url:"https://www.gov.cn/zhengce/2021-12/27/content_5712881.htm"},
  {id:'cnDrivingCheck',cat:'doc',region:'cn',renew:12,lead:30,url:"https://www.gov.cn/zhengce/2021-12/27/content_5712881.htm"},
  {id:'cnCompulsory',cat:'car',region:'cn',renew:12,lead:30,verify:true},
  {id:'cnCommercial',cat:'car',region:'cn',renew:12,lead:30},
  {id:'cnInspection',cat:'car',region:'cn',renew:24,lead:30,url:"https://www.gov.cn/zhengce/zhengceku/2022-10/19/content_5719521.htm"},
  {id:'roPermit',cat:'doc',region:'ro',renew:12,lead:45,url:"https://igi.mai.gov.ro"},
  {id:'roPassport',cat:'doc',region:'ro',renew:120,lead:90},
  {id:'roDriving',cat:'doc',region:'ro',renew:120,lead:30},
  {id:'roId',cat:'doc',region:'ro',renew:120,lead:60,url:"https://hub.mai.gov.ro"},
  {id:'bizLicence',cat:'doc',renew:12,lead:30},
  {id:'lease',cat:'doc',renew:12,lead:60},
  {id:'roRca',cat:'car',region:'ro',renew:12,lead:14},
  {id:'roItp',cat:'car',region:'ro',renew:24,lead:14,url:"https://www.rarom.ro"},
  {id:'roRovinieta',cat:'car',region:'ro',renew:12,lead:3},
  {id:'roCasco',cat:'car',region:'ro',renew:12,lead:14},
  {id:'roPad',cat:'home',region:'ro',renew:12,lead:30,url:"https://www.paidromania.ro"},
  {id:'roHealthCard',cat:'doc',region:'ro',renew:60,lead:30,url:"https://cnas.ro"},
  {id:'bankCard',cat:'doc',renew:48,lead:30},
  ...SHELF.map(x=>({id:x.id,cat:'food',renew:0,lead:x.days<=3?0:x.days<=7?1:2,shelfDays:x.days,shelfLevelId:x.level,src:x.src})),
  {id:'frozen',cat:'food',renew:0,lead:7},
  {id:'meds',cat:'med',renew:0,lead:30},
  {id:'vitamins',cat:'med',renew:0,lead:14},
  {id:'cream',cat:'cosm',renew:0,lead:14},
  {id:'sunscreen',cat:'cosm',renew:0,lead:14},
  {id:'lipstick',cat:'cosm',renew:0,lead:14},
  {id:'perfume',cat:'cosm',renew:0,lead:30},
  {id:'lensSol',cat:'cosm',renew:0,lead:14},
  {id:'shopItem',cat:'shop',renew:0,lead:7},
  {id:'phonePlan',cat:'bill',renew:1,lead:3},
  {id:'videoSub',cat:'bill',renew:12,lead:7},
  {id:'domain',cat:'bill',renew:12,lead:30},
  {id:'warranty',cat:'home',renew:0,lead:30},
  {id:'gasCheck',cat:'home',renew:24,lead:30},
  {id:'tickets',cat:'other',renew:12,lead:60},
  {id:'custom',cat:'other',renew:0,lead:7},
];
const DOCS=new Set(["roPad","roHealthCard","bankCard","cnId", "cnPassport", "cnHkMacau", "cnHkEndorse", "cnTaiwan", "cnTaiwanCompat", "cnResidence", "cnDriving", "cnDrivingCheck", "cnCompulsory", "cnCommercial", "cnInspection", "roPermit", "roPassport", "roDriving", "roId", "bizLicence", "lease", "roRca", "roItp", "roRovinieta", "roCasco"]);
for(const x of TEMPLATES)Object.defineProperties(x,{name:{get(){return t('tpl.'+x.id);},enumerable:true},docs:{get(){return DOCS.has(x.id)?t('tplDocs.'+x.id):'';},enumerable:true},
  shelfNote:{get(){return x.shelfDays?t('shelf.'+x.id):'';}},shelfLevel:{get(){return x.shelfLevelId?t('shelfLevel.'+x.shelfLevelId):'';}}});

// 提醒强度（与 MAO 确认的需求一致）
export const INTENSITY={light:{days:[7]},standard:{days:[30,7,1]},strong:{days:[60,45,30,21,14,10,7,6,5,4,3,2,1,0]},custom:{days:null}};
for(const [k,v] of Object.entries(INTENSITY))Object.defineProperties(v,{name:{get:()=>t('int.'+k)},desc:{get:()=>t('intDesc.'+k)}});
export const findTpl=(cat,name)=>TEMPLATES.find(x=>x.cat===cat&&anyLang('tpl.'+x.id).includes(name));
export const isTplName=name=>TEMPLATES.some(x=>anyLang('tpl.'+x.id).includes(name));
// 有保质期概念的分类（显示 生产日期+保质期、再买一次）
export const PERISHABLE=['food','med','shop','cosm'];
// 自定义档的分类预设
export const CUSTOM_PRESET={doc:[14,7,3,1],car:[14,7,3,1]};
// 内置分类的历史名称（旧版导出的 CSV/JSON 里可能还在用）：R9-3
export const OLD_CAT_NAMES={home:['Warranties','Warranty','Garanții','Garanţii','Garantii','Garanție']};
const builtinNames=k=>[...anyLang('cat.'+k),...(OLD_CAT_NAMES[k]||[])];
export const catAlias=n=>{const lo=n.toLowerCase();for(const k of Object.keys(BUILTIN))if(builtinNames(k).some(x=>x.toLowerCase()===lo))return k;return anyLang('cat.billAlias').includes(n)?'bill':null;};

// ===== 分类注册表：内置 + 自定义（存在 settings.cats），所有模块共用同一个对象 =====
export const ICON_SET=['doc','car','food','med','cosm','daily','shop','bill','home','other','box','bell','cal','hourglass','sparkle','gear','tabCats','check','renew'];
export const COLORS=['#3D7BE0','#7A5AF0','#E08A1E','#E0507A','#C0569E','#0C9C6B','#1E9FB0','#8A6A4A','#67717A','#D94545','#2F8F4E','#B5832A'];
export const CUSTOM_ID=/^c_[a-z0-9]{1,24}$/;
export const CATEGORIES={};
export function applyCats(st={}){const c=(st&&st.cats)||{};for(const k of Object.keys(CATEGORIES))delete CATEGORIES[k];
  const names=c.names||{},hidden=Array.isArray(c.hidden)?c.hidden:[],all={};
  for(const [k,v] of Object.entries(BUILTIN))all[k]={...v,icon:v.icon||k,builtin:true,name:typeof names[k]==='string'&&names[k].trim()?names[k].trim().slice(0,20):t('cat.'+k),hidden:k!=='other'&&hidden.includes(k)};
  for(const d of Array.isArray(c.custom)?c.custom:[])if(d&&CUSTOM_ID.test(d.id)&&!all[d.id])
    all[d.id]={name:String(d.name||'').normalize('NFKC').trim().slice(0,20)||t('cat.unnamed'),icon:ICON_SET.includes(d.icon)?d.icon:'box',color:/^#[0-9a-fA-F]{6}$/.test(d.color)?d.color:'#67717A',intensity:'standard',custom:true};
  const order=(Array.isArray(c.order)?c.order:[]).filter((k,i,a)=>all[k]&&a.indexOf(k)===i);const hadOrder=order.length>0;for(const k of Object.keys(all))if(!order.includes(k)){if(!hadOrder||k!=='other'){const io=order.indexOf('other');(!hadOrder&&io>=0)?order.splice(io,0,k):order.push(k);}else order.push(k);}if(!hadOrder){order.splice(order.indexOf('other'),1);order.push('other');}
  for(const k of order)CATEGORIES[k]=all[k];return CATEGORIES;}
applyCats();
export const visibleCats=()=>Object.entries(CATEGORIES).filter(([,c])=>!c.hidden);
export function catIdByName(n){n=String(n??'').normalize('NFKC').trim();if(!n)return null;if(CATEGORIES[n])return n;
  const e=Object.entries(CATEGORIES).find(([,c])=>c.name===n);if(e)return e[0];return catAlias(n);}

// 名称推断分类：词典来自 js/cat-dict.js（由 tools/build-dict.mjs 从分类词典 JSON 生成）
import {KEYWORDS,PRIORITY,WEAK as WEAK_LIST} from './cat-dict.js';
export const normName=s=>String(s??'').normalize('NFKC').toLowerCase().normalize('NFD').replace(/\p{M}/gu,'').replace(/ş/g,'s').replace(/ţ/g,'t').replace(/\s+/g,' ').trim();
const WEAKS=new Set(WEAK_LIST);
let KW=null;const kw=()=>KW||(KW=Object.entries(KEYWORDS).flatMap(([k,ws])=>ws.map(w=>{const n=normName(w);return {k,n,whole:/^[a-z0-9]{1,4}$/.test(n),weak:WEAKS.has(n),re:/^[a-z0-9]{1,4}$/.test(n)?new RegExp(`(^|[^a-z0-9])${n}([^a-z0-9]|$)`):null};})));
// 返回排好序的候选 [{cat,len,exact,weak}]；learn 为本地学习的「名称→分类」
export function inferCands(name,learn){const n=normName(name);if(!n)return [];
  if(learn&&learn[n]&&CATEGORIES[learn[n]])return [{cat:learn[n],len:99,exact:true,learned:true}];
  for(const [k,c] of Object.entries(CATEGORIES))if(c.custom&&c.name&&n.includes(normName(c.name)))return [{cat:k,len:99,exact:false,custom:true}];
  const best={};for(const w of kw()){if(!CATEGORIES[w.k])continue;const hit=w.re?w.re.test(n):n.includes(w.n);if(!hit)continue;
    const exact=n===w.n,b=best[w.k];const sc={cat:w.k,len:w.n.length,exact,weak:w.weak};
    if(!b||(exact&&!b.exact)||(!b.exact&&(b.weak&&!w.weak||(b.weak===w.weak&&sc.len>b.len))))best[w.k]=sc;}
  let l=Object.values(best);const strong=l.filter(x=>!x.weak);if(strong.length)l=strong;else l=l.slice(0,1);
  const pr=k=>{const i=PRIORITY.indexOf(k);return i<0?99:i;};
  return l.sort((a,b)=>(b.exact-a.exact)||(b.len-a.len)||(pr(a.cat)-pr(b.cat)));}
export const inferCat=(name,learn)=>inferCands(name,learn)[0]?.cat||null;
// 前两名都不是弱命中且长度差 ≤1 时给出两个候选
export function inferTop2(name,learn){const c=inferCands(name,learn);return c.length>1&&!c[0].exact&&!c[0].learned&&!c[0].custom&&c[0].len-c[1].len<=1?[c[0].cat,c[1].cat]:c.slice(0,1).map(x=>x.cat);}

export const REGIONS=['cn','ro'];
// 常用地区过滤：region 为空的是通用模板
export const tplFor=(cat,region)=>TEMPLATES.filter(t=>t.cat===cat&&(!region||region==='all'||!t.region||t.region===region));

// R9-4：自建分类和某个内置分类（任一语言、含旧名）同名时改名，条目不动（id 不变）
export function renameDupCustom(st,fmt=n=>n+' 2'){const c=st&&st.cats,list=Array.isArray(c?.custom)?c.custom:[];
  const taken=new Set([...Object.keys(BUILTIN).flatMap(builtinNames),...list.map(d=>String(d?.name||''))].map(x=>x.normalize('NFKC').trim().toLowerCase()));
  const clash=d=>d&&Object.keys(BUILTIN).some(k=>builtinNames(k).some(x=>x.toLowerCase()===String(d.name||'').normalize('NFKC').trim().toLowerCase()));
  if(!list.some(clash))return {st,changed:false,renamed:[]};const renamed=[];
  const custom=list.map(d=>{if(!clash(d))return d;let nm=fmt(d.name).slice(0,20),i=2;while(taken.has(nm.toLowerCase())){i++;nm=(d.name+' '+i).slice(0,20);}taken.add(nm.toLowerCase());renamed.push([d.name,nm]);return {...d,name:nm};});
  return {st:{...st,cats:{...c,custom}},changed:true,renamed};}
// 老用户自建的同名分类（如「日用品」）并入新内置分类：条目、阈值、强度、排序、学习记录都转过去。纯函数，便于测试
export function mergeIntoBuiltin(st,items,id='daily'){const names=anyLang('cat.'+id),c=st&&st.cats,list=Array.isArray(c?.custom)?c.custom:[];
  const dup=list.filter(d=>d&&names.includes(String(d.name||'').normalize('NFKC').trim()));if(!dup.length)return {st,items,changed:false};
  const ids=new Set(dup.map(d=>d.id)),s={...st,cats:{...c,custom:list.filter(d=>!ids.has(d.id))}};
  for(const k of ['catSoon','catIntensity']){const m={...(st[k]||{})};for(const x of ids)if(x in m){if(!(id in m))m[id]=m[x];delete m[x];}s[k]=m;}
  if(Array.isArray(c.order)){const o=[];for(const k of c.order){const v=ids.has(k)?id:k;if(!o.includes(v))o.push(v);}s.cats.order=o;}
  if(Array.isArray(c.hidden))s.cats.hidden=c.hidden.filter(k=>!ids.has(k));
  if(st.catLearn){s.catLearn={};for(const [k,v] of Object.entries(st.catLearn))s.catLearn[k]=ids.has(v)?id:v;}
  if(ids.has(st.lastCat))s.lastCat=id;
  return {st:s,items:items.map(i=>ids.has(i.cat)?{...i,cat:id}:i),changed:true};}
