// R13-2：比较时 ・(U+30FB)、･(U+FF65) 视同 ·(U+00B7)；名称原样保存
import {findTpl,isTplName,normName} from '../js/templates.js';
let p=0,f=0;const t=(n,c)=>{if(c)p++;else{f++;console.log('FAIL',n);}};
for(const n of ['中国・居民身份证','中国･居民身份证','中国·居民身份证',' 中国・居民身份证 ']){t('findTpl '+n,findTpl('doc',n)?.id==='cnId');t('isTplName '+n,isTplName(n));}
t('normName 一致',normName('中国・居民身份证')===normName('中国·居民身份证')&&normName('中国･居民身份证')===normName('中国·居民身份证'));
const s='中国・居民身份证';normName(s);t('原样不变',s.charCodeAt(2)===0x30fb);
t('其他名不误配',!isTplName('中国・护照X'));
console.log(`r13 ${p} passed ${f} failed`);if(f)process.exit(1);
// R13-1：所有语言短标签 ≤12 字符（百科全书定稿）
for(const l of ['zh','ro','en']){const P=(await import(`../js/i18n/${l}.js`))[l];for(const [k,v] of Object.entries(P))if(k.startsWith('tplShort.'))t(`${l} ${k} ≤12 (${v})`,[...v].length<=12);}
{const ro=(await import('../js/i18n/ro.js')).ro;t('ro 定稿',ro['tplShort.roPermit']==='Permis șed.'&&ro['tplShort.cnCommercial']==='Asig auto CN'&&ro['tplShort.cnMedical']==='Asig med CN');}
console.log(`r13 short ${p} passed ${f} failed`);if(f)process.exit(1);
