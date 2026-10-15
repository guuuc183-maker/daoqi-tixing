#!/usr/bin/env python3
"""正文字体子集：Noto Sans SC（OFL）→ fonts/NotoSansSC-{400,700}.woff2 + js/font-cover.js + tools/font-subset.sha256
用法：python3 tools/build_font_subset.py          重新生成（语言包变了就跑）
      python3 tools/build_font_subset.py --check  只校验：字符集哈希与产物一致，否则退出码 1
源字体（17.8MB，不进仓库）：../设计/字体子集/src/NotoSansSC-VF.ttf，缺失时从 google/fonts 下载（免费）。"""
import sys,os,hashlib,subprocess,urllib.request
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC=os.path.join(ROOT,'..','设计','字体子集','src')
VF_URL='https://github.com/google/fonts/raw/main/ofl/notosanssc/NotoSansSC%5Bwght%5D.ttf'
WEIGHTS=(400,700)
HASH=os.path.join(ROOT,'tools','font-subset.sha256')
EXTRA='ăâîșțĂÂÎȘȚşţŞŢ’‘“”…–—·•€°×'
def charset():
  s=set()
  for l in ('zh','ro','en'):s|=set(open(os.path.join(ROOT,'js','i18n',l+'.js'),encoding='utf-8').read())
  s|=set(open(os.path.join(ROOT,'index.html'),encoding='utf-8').read())  # 静态界面文字
  s|={chr(c) for c in range(0x20,0x7f)}|set(EXTRA)
  return ''.join(sorted(c for c in s if c>=' ' and c!='\x7f' and not 0xD800<=ord(c)<=0xDFFF))
def digest(cs):return hashlib.sha256(cs.encode('utf-8')).hexdigest()
def check():
  cs=charset();ok=os.path.exists(HASH) and open(HASH).read().strip()==digest(cs)
  outs=[os.path.join(ROOT,'fonts',f'NotoSansSC-{w}.woff2') for w in WEIGHTS]+[os.path.join(ROOT,'js','font-cover.js')]
  ok=ok and all(os.path.exists(o) for o in outs)
  if not ok:print('字体子集过期：语言包/静态文字有变化，请运行 python3 tools/build_font_subset.py');return 1
  print('字体子集 OK',len(cs),'chars');return 0
def addcomma(src,dst):
  """罗语 ș ț Ș Ț：Noto Sans SC 原版没有。按美术 设计/v1.8-家人传数据/fonts/addcomma.py 的做法补复合字形
  （基字母 + 缩放 0.85、移到基线下的 comma），ş ţ Ş Ţ 也映射到逗号版。"""
  from fontTools.ttLib import TTFont
  from fontTools.ttLib.tables._g_l_y_f import Glyph,GlyphComponent
  from fontTools.pens.boundsPen import BoundsPen
  f=TTFont(src);gs=f.getGlyphSet();glyf=f['glyf'];hmtx=f['hmtx']
  def bb(n):p=BoundsPen(gs);gs[n].draw(p);return p.bounds
  cb=bb('comma');S=0.85;cw=(cb[2]-cb[0])*S;ct=cb[3]*S
  for base,new,uni,alt in (('s','uni0219',0x219,0x15F),('t','uni021B',0x21B,0x163),('S','uni0218',0x218,0x15E),('T','uni021A',0x21A,0x162)):
    b=bb(base);cx=(b[0]+b[2])/2+((b[2]-b[0])*0.05 if base=='t' else 0)
    g=Glyph();g.numberOfContours=-1
    c1=GlyphComponent();c1.glyphName=base;c1.x=0;c1.y=0;c1.flags=0x4
    c2=GlyphComponent();c2.glyphName='comma';c2.x=round(cx-(cb[0]*S+cw/2));c2.y=round(-40-ct);c2.flags=0;c2.transform=[[S,0],[0,S]]
    g.components=[c1,c2];glyf[new]=g;hmtx[new]=(hmtx[base][0],hmtx[base][1])
    if 'vmtx' in f:f['vmtx'][new]=f['vmtx'][base]
    o=f.getGlyphOrder()
    if new not in o:o.append(new);f.setGlyphOrder(o)
    for t in f['cmap'].tables:
      if t.isUnicode():t.cmap[uni]=new;t.cmap[alt]=new
  f['maxp'].numGlyphs=len(f.getGlyphOrder());f.save(dst)
def build():
  from fontTools.ttLib import TTFont
  from fontTools.varLib import instancer
  os.makedirs(SRC,exist_ok=True);vf=os.path.join(SRC,'NotoSansSC-VF.ttf')
  if not os.path.exists(vf):print('下载源字体…');urllib.request.urlretrieve(VF_URL,vf)
  cs=charset();tf=os.path.join(SRC,'chars.txt');open(tf,'w',encoding='utf-8').write(cs)
  cover=None
  for w in WEIGHTS:
    st=os.path.join(SRC,f'w{w}.ttf')
    if not os.path.exists(st):
      f=TTFont(vf);instancer.instantiateVariableFont(f,{'wght':w},inplace=True);f.save(st)
    pc=os.path.join(SRC,f'w{w}c.ttf')
    if not os.path.exists(pc) or os.path.getmtime(pc)<os.path.getmtime(__file__):addcomma(st,pc)
    st=pc
    out=os.path.join(ROOT,'fonts',f'NotoSansSC-{w}.woff2')
    subprocess.run([sys.executable,'-m','fontTools.subset',st,f'--text-file={tf}','--flavor=woff2',f'--output-file={out}',
      '--layout-features=kern,liga,locl,ccmp,mark,mkmk,calt,vert,pwid,halt','--no-hinting','--desubroutinize','--name-IDs=*','--name-legacy','--name-languages=*'],check=True)
    cm=set(chr(u) for u in TTFont(out).getBestCmap())
    cover=cm if cover is None else cover&cm
    print(out,round(os.path.getsize(out)/1024,1),'KB')
  miss=[c for c in cs if c not in cover and c!=' ']
  if miss:print('源字体没有的字（会走系统字体）:',''.join(miss))
  cov=''.join(sorted(c for c in cover if ord(c)>=0x20))
  esc=''.join(c if 0x20<=ord(c)<0x7f and c not in '\\"' else ('\\'+c if c in '\\"' else ''.join('\\u%04x'%u for u in __import__('struct').unpack('<'+'H'*(len(c.encode('utf-16-le'))//2),c.encode('utf-16-le')))) for c in cov)
  open(os.path.join(ROOT,'js','font-cover.js'),'w',encoding='utf-8').write(
    '// 自动生成，请勿手改：python3 tools/build_font_subset.py\n// 正文字体子集实际覆盖的字符；不在其中的字所在的整行改用系统字体\nexport const COVER="'+esc+'";\n')
  open(HASH,'w').write(digest(cs)+'\n');print('chars',len(cs),'cover',len(cov))
if __name__=='__main__':sys.exit(check() if '--check' in sys.argv else build())
