import json,sys
sys.path.insert(0,'tools/i18n-src');from tpl import *
o={'zh':{},'ro':{},'en':{}}
def put(k,z,r,e):o['zh'][k]=z;o['ro'][k]=r;o['en'][k]=e
for i,z,r,e,dz,dr,de in T:
    put('tpl.'+i,z,r,e)
    if dz:
        if i.startswith('cn'):dz=CNPRE[0]+dz;dr=CNPRE[1]+dr;de=CNPRE[2]+de
        put('tplDocs.'+i,dz,dr,de)
for i,z,r,e,nz,nr,ne in SH:put('tpl.'+i,z,r,e);put('shelf.'+i,nz,nr,ne)
for k,(i,z,r,e) in LEVEL.items():put('shelfLevel.'+i,z,r,e)
for i,z,r,e in CATS:put('cat.'+i,z,r,e)
put('cat.billAlias','订阅','Abonament','Subscription');put('cat.unnamed','未命名','Fără nume','Untitled')
for i,z,r,e,dz,dr,de in INT:put('int.'+i,z,r,e);put('intDesc.'+i,dz,dr,de)
put('region.cn','中国','China','China');put('region.ro','罗马尼亚','România','Romania');put('region.any','通用','General','General')

json.dump(o,open('/tmp/add_tpl.json','w'),ensure_ascii=False)
