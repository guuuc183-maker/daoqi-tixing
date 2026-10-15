// 下一版：en 商业险短标签 ≤12；罗马尼亚模板默认值对照《罗马尼亚证件清单-三语》
let ok=0,bad=0;const T=(c,m)=>{c?ok++:(bad++,console.log('FAIL',m))};
(async()=>{const en=(await import('../js/i18n/en.js')).en,ro=(await import('../js/i18n/ro.js')).ro;
T(en['tplShort.cnCommercial']==='Commercial'&&[...en['tplShort.cnCommercial']].length<=12,'en Commercial');
T(/Poți cere eticheta electronică în aplicația 12123\./.test(ro['tplDocs.cnInspectionMark']),'ro 12123');
const P=(await import('../js/templates.js')).TEMPLATES,g=i=>P.find(x=>x.id===i);
for(const [i,m] of [['roHealthCard',84],['roPassport',120],['roDriving',120],['roRca',12],['roPad',12],['roRovinieta',12]])T(g(i).renew===m,i+' '+g(i).renew);
console.log('v175',ok,'pass',bad,'fail');process.exit(bad?1:0);})();
