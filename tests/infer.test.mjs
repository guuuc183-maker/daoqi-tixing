// 名称推断分类 + 默认分类
import {inferCat,applyCats} from '../js/templates.js';
let p=0,f=0;const t=(n,c)=>{if(c)p++;else{f++;console.log('FAIL',n);}};
const cases={'牛奶':'food','全麦面包':'food','布洛芬':'med','感冒药':'med','RCA':'car','ITP 2026':'car','汽车保险':'car','护照':'doc','居留卡':'doc','Lapte':'food','Pâine albă':'food','Paracetamol':'med','Passport':'doc','Carte de identitate':'doc','Permis de ședere':'doc','Netflix':'bill','防晒霜':'cosm','车厘子':null,'cardio':null,'':null,'随便':null};
for(const [k,v] of Object.entries(cases))t(k+'→'+v,inferCat(k)===v);
applyCats({cats:{custom:[{id:'c_pet',name:'宠物',icon:'home',color:'#D94545'}]}});
t('custom name wins',inferCat('宠物驱虫药')==='c_pet');applyCats({});t('custom gone',inferCat('宠物')===null);
console.log(`${p} passed ${f} failed`);if(f)process.exit(1);
