// 分类与模板。lead=建议办理提前量（天），docs=所需材料（参考，请以官方为准）
const BUILTIN={
  doc:{name:'证件',color:'#3D7BE0',intensity:'strong',soon:90},
  car:{name:'车辆',color:'#7A5AF0',intensity:'strong',soon:30},
  food:{name:'食品',color:'#E08A1E',intensity:'standard',soon:3},
  med:{name:'药品',color:'#E0507A',intensity:'standard',soon:30},
  cosm:{name:'化妆品',color:'#C0569E',intensity:'light',soon:30},
  daily:{name:'日用品',icon:'daily',color:'#5E8F3A',intensity:'standard',soon:30},
  shop:{name:'店内商品',color:'#0C9C6B',intensity:'light'},
  bill:{name:'订阅账单',color:'#1E9FB0',intensity:'standard'},
  home:{name:'家居保修',color:'#8A6A4A',intensity:'light'},
  other:{name:'其他',color:'#67717A',intensity:'standard'},
};
export const TEMPLATES=[
  // 中国证件和车辆（产品路线图 §6；年龄分档只预填成人档）
  {cat:"doc",region:'cn',name:"中国·居民身份证",renew:120,lead:90,docs:"请以当地公安、出入境、车管所官方为准。16–25 岁 10 年；26–45 岁 20 年；46 岁以上长期；未满 16 岁 5 年。默认按成人 10 年预填。",url:"https://www.gov.cn/gongbao/content/2003/content_62254.htm"},
  {cat:"doc",region:'cn',name:"中国·普通护照",renew:120,lead:180,docs:"请以当地公安、出入境、车管所官方为准。未满 16 岁 5 年；16 岁以上 10 年；有效期不足 6 个月可申请换发。默认按成人 10 年预填。",url:"https://s.nia.gov.cn/mps/bszy/gmcrg/slpthz/201903/t20190313_1011.html"},
  {cat:"doc",region:'cn',name:"往来港澳通行证",renew:120,lead:60,docs:"请以当地公安、出入境、车管所官方为准。未满 16 岁 5 年；16 岁以上 10 年；签注另算。默认按成人 10 年预填。",url:"https://gat.jiangsu.gov.cn/art/2025/3/13/art_90830_6789.html"},
  {cat:"doc",region:'cn',name:"港澳签注",renew:"",lead:14,docs:"请以当地公安、出入境、车管所官方为准。按签注类型（次数和有效期不同），到期日请按签注填写。（待核实）",verify:true},
  {cat:"doc",region:'cn',name:"大陆居民往来台湾通行证",renew:120,lead:60,docs:"请以当地公安、出入境、车管所官方为准。有效期 5 年或 10 年。（待核实）",verify:true},
  {cat:"doc",region:'cn',name:"台胞证",renew:60,lead:60,docs:"请以当地公安、出入境、车管所官方为准。台湾居民来往大陆通行证，有效期 5 年。（待核实）",verify:true},
  {cat:"doc",region:'cn',name:"居住证",renew:12,lead:30,docs:"请以当地公安、出入境、车管所官方为准。按年签注（居住证暂行条例）。（待核实）",verify:true},
  {cat:"doc",region:'cn',name:"中国·驾驶证",renew:72,lead:90,docs:"请以当地公安、出入境、车管所官方为准。6 年 → 10 年 → 长期；有效期满前 90 日内申请换证，换证时一并审验（公安部令第 172 号）。",url:"https://www.gov.cn/zhengce/2021-12/27/content_5712881.htm"},
  {cat:"doc",region:'cn',name:"驾驶证审验",renew:12,lead:30,docs:"请以当地公安、出入境、车管所官方为准。大中型客货车等每个记分周期结束后 30 日内审验；小型车一般在换证时审验（公安部令第 172 号第七十二条）。",url:"https://www.gov.cn/zhengce/2021-12/27/content_5712881.htm"},
  {cat:"car",region:'cn',name:"交强险",renew:12,lead:30,docs:"请以当地公安、出入境、车管所官方为准。保险期间一般 1 年。（待核实）",verify:true},
  {cat:"car",region:'cn',name:"商业车险",renew:12,lead:30,docs:"请以当地公安、出入境、车管所官方为准。一般 1 年，以保单为准。"},
  {cat:"car",region:'cn',name:"机动车年检（私家车）",renew:24,lead:30,docs:"请以当地公安、出入境、车管所官方为准。自注册之日起第 6、10 年上线检验；10 年内每 2 年申领检验标志；超过 10 年每年检验。",url:"https://www.gov.cn/zhengce/zhengceku/2022-10/19/content_5719521.htm"},
  {cat:'doc',region:'ro',name:'居留卡',renew:60,lead:45,docs:'护照、租房合同/住址证明、工作合同或在读证明、医保、照片、规费收据（请以 IGI 官方为准）'},
  {cat:'doc',region:'ro',name:'护照',renew:120,lead:90,docs:'旧护照、照片、申请表；可在使馆/领馆预约（请以使馆官网为准）'},
  {cat:'doc',region:'ro',name:'驾照',renew:120,lead:30,docs:'旧驾照、身份证件、体检证明、照片'},
  {cat:'doc',region:'ro',name:'身份证',renew:240,lead:60,docs:'旧证件、照片'},
  {cat:'doc',name:'营业执照',renew:12,lead:30,docs:'公司文件、注册处要求材料'},
  {cat:'doc',name:'租约',renew:12,lead:60,docs:'与房东确认续约或提前通知退租'},
  {cat:'car',region:'ro',name:'RCA 交强险',renew:12,lead:14,docs:'行驶证（talon）、身份证件；比价后续保'},
  {cat:'car',region:'ro',name:'ITP 车检',renew:24,lead:14,docs:'行驶证、有效 RCA；新车/车龄不同周期不同'},
  {cat:'car',region:'ro',name:'Rovinieta 公路费',renew:12,lead:3,docs:'车牌号、底盘号，可网上购买'},
  {cat:'car',region:'ro',name:'CASCO 车损险',renew:12,lead:14,docs:'保单、车辆照片'},
  {cat:'food',name:'牛奶',renew:0,lead:1},{cat:'food',name:'鸡蛋',renew:0,lead:2},{cat:'food',name:'冷冻食品',renew:0,lead:7},
  {cat:'med',name:'常备药',renew:0,lead:30},{cat:'med',name:'维生素',renew:0,lead:14},
  {cat:'cosm',name:'面霜',renew:0,lead:14},{cat:'cosm',name:'防晒霜',renew:0,lead:14},{cat:'cosm',name:'口红',renew:0,lead:14},{cat:'cosm',name:'香水',renew:0,lead:30},{cat:'cosm',name:'隐形眼镜护理液',renew:0,lead:14},
  {cat:'shop',name:'店内商品',renew:0,lead:7},
  {cat:'bill',name:'手机套餐',renew:1,lead:3},{cat:'bill',name:'视频会员',renew:12,lead:7},{cat:'bill',name:'域名/服务器',renew:12,lead:30},
  {cat:'home',name:'家电保修',renew:0,lead:30},{cat:'home',name:'燃气检查',renew:24,lead:30},
  {cat:'other',name:'春节机票',renew:12,lead:60},{cat:'other',name:'自定义',renew:0,lead:7},
];
// 提醒强度（与 MAO 确认的需求一致）
export const INTENSITY={
  light:{name:'轻',desc:'提前 7 天提醒一次',days:[7]},
  standard:{name:'标准',desc:'提前 30 / 7 / 1 天各一次',days:[30,7,1]},
  strong:{name:'强',desc:'提前 60 天起逐渐加密，最后一周每天提醒，点「已处理」才停',days:[60,45,30,21,14,10,7,6,5,4,3,2,1,0]},
  custom:{name:'自定义',desc:'自选提前天数',days:null},
};
export const findTpl=(cat,name)=>TEMPLATES.find(t=>t.cat===cat&&t.name===name);
// 有保质期概念的分类（显示 生产日期+保质期、再买一次）
export const PERISHABLE=['food','med','shop','cosm'];
// 自定义档的分类预设
export const CUSTOM_PRESET={doc:[14,7,3,1],car:[14,7,3,1]};
export const CAT_ALIAS={'证件':'doc','车辆':'car','食品':'food','药品':'med','化妆品':'cosm','日用品':'daily','店内商品':'shop','订阅账单':'bill','订阅':'bill','家居保修':'home','其他':'other'};

// ===== 分类注册表：内置 + 自定义（存在 settings.cats），所有模块共用同一个对象 =====
export const ICON_SET=['doc','car','food','med','cosm','daily','shop','bill','home','other','box','bell','cal','hourglass','sparkle','gear','tabCats','check','renew'];
export const COLORS=['#3D7BE0','#7A5AF0','#E08A1E','#E0507A','#C0569E','#0C9C6B','#1E9FB0','#8A6A4A','#67717A','#D94545','#2F8F4E','#B5832A'];
export const CUSTOM_ID=/^c_[a-z0-9]{1,24}$/;
export const CATEGORIES={};
export function applyCats(st={}){const c=(st&&st.cats)||{};for(const k of Object.keys(CATEGORIES))delete CATEGORIES[k];
  const names=c.names||{},hidden=Array.isArray(c.hidden)?c.hidden:[],all={};
  for(const [k,v] of Object.entries(BUILTIN))all[k]={...v,icon:v.icon||k,builtin:true,name:typeof names[k]==='string'&&names[k].trim()?names[k].trim().slice(0,20):v.name,hidden:k!=='other'&&hidden.includes(k)};
  for(const d of Array.isArray(c.custom)?c.custom:[])if(d&&CUSTOM_ID.test(d.id)&&!all[d.id])
    all[d.id]={name:String(d.name||'').normalize('NFKC').trim().slice(0,20)||'未命名',icon:ICON_SET.includes(d.icon)?d.icon:'box',color:/^#[0-9a-fA-F]{6}$/.test(d.color)?d.color:'#67717A',intensity:'standard',custom:true};
  const order=(Array.isArray(c.order)?c.order:[]).filter((k,i,a)=>all[k]&&a.indexOf(k)===i);const hadOrder=order.length>0;for(const k of Object.keys(all))if(!order.includes(k)){if(!hadOrder||k!=='other'){const io=order.indexOf('other');(!hadOrder&&io>=0)?order.splice(io,0,k):order.push(k);}else order.push(k);}if(!hadOrder){order.splice(order.indexOf('other'),1);order.push('other');}
  for(const k of order)CATEGORIES[k]=all[k];return CATEGORIES;}
applyCats();
export const visibleCats=()=>Object.entries(CATEGORIES).filter(([,c])=>!c.hidden);
export function catIdByName(n){n=String(n??'').normalize('NFKC').trim();if(!n)return null;if(CATEGORIES[n])return n;
  const e=Object.entries(CATEGORIES).find(([,c])=>c.name===n);if(e)return e[0];return CAT_ALIAS[n]||null;}

// 名称推断分类：词典来自 js/cat-dict.js（由 tools/build-dict.mjs 从分类词典 JSON 生成）
import {KEYWORDS,PRIORITY} from './cat-dict.js';
export const normName=s=>String(s??'').normalize('NFKC').toLowerCase().normalize('NFD').replace(/\p{M}/gu,'').replace(/ş/g,'s').replace(/ţ/g,'t').replace(/\s+/g,' ').trim();
const WEAK=new Set(['米','面','蛋','肉','鱼','虾','菜','水','醋','盐','糖','药']);
let KW=null;const kw=()=>KW||(KW=Object.entries(KEYWORDS).flatMap(([k,ws])=>ws.map(w=>{const n=normName(w);return {k,n,whole:/^[a-z0-9]{1,4}$/.test(n),weak:WEAK.has(n),re:/^[a-z0-9]{1,4}$/.test(n)?new RegExp(`(^|[^a-z0-9])${n}([^a-z0-9]|$)`):null};})));
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

export const REGIONS={cn:'中国',ro:'罗马尼亚'};
// 常用地区过滤：region 为空的是通用模板
export const tplFor=(cat,region)=>TEMPLATES.filter(t=>t.cat===cat&&(!region||region==='all'||!t.region||t.region===region));

// 老用户自建的同名分类（如「日用品」）并入新内置分类：条目、阈值、强度、排序、学习记录都转过去。纯函数，便于测试
export function mergeIntoBuiltin(st,items,id='daily'){const name=BUILTIN[id]?.name,c=st&&st.cats,list=Array.isArray(c?.custom)?c.custom:[];
  const dup=list.filter(d=>d&&String(d.name||'').normalize('NFKC').trim()===name);if(!dup.length)return {st,items,changed:false};
  const ids=new Set(dup.map(d=>d.id)),s={...st,cats:{...c,custom:list.filter(d=>!ids.has(d.id))}};
  for(const k of ['catSoon','catIntensity']){const m={...(st[k]||{})};for(const x of ids)if(x in m){if(!(id in m))m[id]=m[x];delete m[x];}s[k]=m;}
  if(Array.isArray(c.order)){const o=[];for(const k of c.order){const v=ids.has(k)?id:k;if(!o.includes(v))o.push(v);}s.cats.order=o;}
  if(Array.isArray(c.hidden))s.cats.hidden=c.hidden.filter(k=>!ids.has(k));
  if(st.catLearn){s.catLearn={};for(const [k,v] of Object.entries(st.catLearn))s.catLearn[k]=ids.has(v)?id:v;}
  if(ids.has(st.lastCat))s.lastCat=id;
  return {st:s,items:items.map(i=>ids.has(i.cat)?{...i,cat:id}:i),changed:true};}
