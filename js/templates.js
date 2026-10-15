// 分类与模板。lead=建议办理提前量（天），docs=所需材料（参考，请以官方为准）
const BUILTIN={
  doc:{name:'证件',color:'#3D7BE0',intensity:'strong',soon:90},
  car:{name:'车辆',color:'#7A5AF0',intensity:'strong',soon:30},
  food:{name:'食品',color:'#E08A1E',intensity:'standard',soon:3},
  med:{name:'药品',color:'#E0507A',intensity:'standard',soon:30},
  cosm:{name:'化妆品',color:'#C0569E',intensity:'light',soon:30},
  shop:{name:'店内商品',color:'#0C9C6B',intensity:'light'},
  bill:{name:'订阅账单',color:'#1E9FB0',intensity:'standard'},
  home:{name:'家居保修',color:'#8A6A4A',intensity:'light'},
  other:{name:'其他',color:'#67717A',intensity:'standard'},
};
export const TEMPLATES=[
  {cat:'doc',name:'居留卡',renew:60,lead:45,docs:'护照、租房合同/住址证明、工作合同或在读证明、医保、照片、规费收据（请以 IGI 官方为准）'},
  {cat:'doc',name:'护照',renew:120,lead:90,docs:'旧护照、照片、申请表；可在使馆/领馆预约（请以使馆官网为准）'},
  {cat:'doc',name:'驾照',renew:120,lead:30,docs:'旧驾照、身份证件、体检证明、照片'},
  {cat:'doc',name:'身份证',renew:240,lead:60,docs:'旧证件、照片'},
  {cat:'doc',name:'营业执照',renew:12,lead:30,docs:'公司文件、注册处要求材料'},
  {cat:'doc',name:'租约',renew:12,lead:60,docs:'与房东确认续约或提前通知退租'},
  {cat:'car',name:'RCA 交强险',renew:12,lead:14,docs:'行驶证（talon）、身份证件；比价后续保'},
  {cat:'car',name:'ITP 车检',renew:24,lead:14,docs:'行驶证、有效 RCA；新车/车龄不同周期不同'},
  {cat:'car',name:'Rovinieta 公路费',renew:12,lead:3,docs:'车牌号、底盘号，可网上购买'},
  {cat:'car',name:'CASCO 车损险',renew:12,lead:14,docs:'保单、车辆照片'},
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
export const CAT_ALIAS={'证件':'doc','车辆':'car','食品':'food','药品':'med','化妆品':'cosm','店内商品':'shop','订阅账单':'bill','订阅':'bill','家居保修':'home','其他':'other'};

// ===== 分类注册表：内置 + 自定义（存在 settings.cats），所有模块共用同一个对象 =====
export const ICON_SET=['doc','car','food','med','cosm','shop','bill','home','other','box','bell','cal','hourglass','sparkle','gear','tabCats','check','renew'];
export const COLORS=['#3D7BE0','#7A5AF0','#E08A1E','#E0507A','#C0569E','#0C9C6B','#1E9FB0','#8A6A4A','#67717A','#D94545','#2F8F4E','#B5832A'];
export const CUSTOM_ID=/^c_[a-z0-9]{1,24}$/;
export const CATEGORIES={};
export function applyCats(st={}){const c=(st&&st.cats)||{};for(const k of Object.keys(CATEGORIES))delete CATEGORIES[k];
  const names=c.names||{},hidden=Array.isArray(c.hidden)?c.hidden:[],all={};
  for(const [k,v] of Object.entries(BUILTIN))all[k]={...v,icon:k,builtin:true,name:typeof names[k]==='string'&&names[k].trim()?names[k].trim().slice(0,20):v.name,hidden:k!=='other'&&hidden.includes(k)};
  for(const d of Array.isArray(c.custom)?c.custom:[])if(d&&CUSTOM_ID.test(d.id)&&!all[d.id])
    all[d.id]={name:String(d.name||'').normalize('NFKC').trim().slice(0,20)||'未命名',icon:ICON_SET.includes(d.icon)?d.icon:'box',color:/^#[0-9a-fA-F]{6}$/.test(d.color)?d.color:'#67717A',intensity:'standard',custom:true};
  const order=(Array.isArray(c.order)?c.order:[]).filter((k,i,a)=>all[k]&&a.indexOf(k)===i);const hadOrder=order.length>0;for(const k of Object.keys(all))if(!order.includes(k)){if(!hadOrder||k!=='other'){const io=order.indexOf('other');(!hadOrder&&io>=0)?order.splice(io,0,k):order.push(k);}else order.push(k);}if(!hadOrder){order.splice(order.indexOf('other'),1);order.push('other');}
  for(const k of order)CATEGORIES[k]=all[k];return CATEGORIES;}
applyCats();
export const visibleCats=()=>Object.entries(CATEGORIES).filter(([,c])=>!c.hidden);
export function catIdByName(n){n=String(n??'').normalize('NFKC').trim();if(!n)return null;if(CATEGORIES[n])return n;
  const e=Object.entries(CATEGORIES).find(([,c])=>c.name===n);if(e)return e[0];return CAT_ALIAS[n]||null;}
