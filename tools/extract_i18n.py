# 一次性工具：把 JS 源码里的中文 UI 文案抽成 t('key',{...})，输出新 key 到 json
import re,sys,json
HAN=re.compile(r'[\u4e00-\u9fff\u3000-\u303f\uff01-\uff5e「」…—“”·]')
HANS=re.compile(r'[\u4e00-\u9fff]')
class P:
    def __init__(s,src):s.src=src;s.tpls=[];s.qs=[]
    def code(s,i,stop):
        src=s.src;n=len(src);depth=0;prev=''
        while i<n:
            c=src[i]
            if src.startswith('//',i):
                j=src.find('\n',i);i=n if j<0 else j;continue
            if src.startswith('/*',i):
                j=src.find('*/',i+2);i=n if j<0 else j+2;continue
            if c in '\'"':
                j=i+1
                while j<n and src[j]!=c:j+=2 if src[j]=='\\' else 1
                s.qs.append((i,j+1,c));i=j+1;prev='a';continue
            if c=='`':i=s.tpl(i+1);prev='a';continue
            if c=='/' and (prev=='' or prev in '(,=:[!&|?{};+-*%<>~^'):
                j=i+1;cls=False
                while j<n:
                    if src[j]=='\\':j+=2;continue
                    if src[j]=='[':cls=True
                    elif src[j]==']':cls=False
                    elif src[j]=='/' and not cls:break
                    elif src[j]=='\n':break
                    j+=1
                i=j+1;prev='a';continue
            if c=='{':depth+=1
            if c=='}':
                if depth==0 and stop:return i
                depth-=1
            if not c.isspace():prev=c
            i+=1
        return i
    def tpl(s,i):
        src=s.src;parts=[];n=len(src)
        while True:
            j=i
            while j<n and src[j]!='`' and not src.startswith('${',j):j+=2 if src[j]=='\\' else 1
            parts.append(('x',i,j))
            if src[j]=='`':s.tpls.append(parts);return j+1
            e=s.code(j+2,True);parts.append(('e',j+2,e));i=e+1
def pname(e,used):
    m=re.findall(r'[A-Za-z_]\w*',e);nm=m[-1] if m else 'p'
    if nm in('length','size'):nm='n'
    if nm in('h','String','toFixed'):nm=m[-2] if len(m)>1 else 'p'
    b=nm;k=2
    while nm in used and used[nm]!=e:nm=f'{b}{k}';k+=1
    used[nm]=e;return nm
def nodes(src,parts):
    """parts: list of ('x',a,b) text and ('e',a,b) expr. 产出 [(start,end,[(kind,a,b)])]"""
    out=[];mode='text';q='';cur=[]
    def flush():
        nonlocal cur
        if cur:out.append(cur)
        cur=[]
    for k,a,b in parts:
        if k=='e':
            ex=src[a:b]
            simple=('`' not in ex and '<' not in ex and len(ex)<=90 and not ex.lstrip().startswith(('icon(','t(')) and '?' not in ex)
            if mode in('text','attr') and simple:cur.append(('e',a-2,b+1))
            elif mode in('text','attr'):flush()
            continue
        i=a
        while i<b:
            c=src[i]
            if mode=='text':
                if c=='<':flush();mode='tag'
                else:cur.append(('c',i,i+1))
            elif mode=='tag':
                if c=='>':mode='text'
                elif c in'"\'':mode='attr';q=c
            else:
                if c==q:flush();mode='tag'
                else:cur.append(('c',i,i+1))
            i+=1
    flush();return out
def build(src,node):
    # 去掉首尾空白和首尾表达式
    while node and (node[0][0]=='e' or src[node[0][1]:node[0][2]].isspace()):
        if node[0][0]=='e':break
        node=node[1:]
    while node and node[-1][0]=='c' and src[node[-1][1]:node[-1][2]].isspace():node=node[:-1]
    txt=''.join(src[a:b] for k,a,b in node if k=='c')
    if not HANS.search(txt):return None
    used={};val='';params=[]
    for k,a,b in node:
        if k=='c':val+=src[a:b]
        else:
            ex=src[a+2:b-1];nm=pname(ex,used);val+='{'+nm+'}'
            if (nm,ex) not in params:params.append((nm,ex))
    return node[0][1],node[-1][2],val,params
def fnname(src,pos):
    m=None
    for m2 in re.finditer(r'(?:function\s+(\w+)|const\s+(\w+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>)',src[:pos]):m=m2
    return (m.group(1) or m.group(2)) if m else 'misc'
def run(path,prefix,skip,keymap):
    src=open(path).read();p=P(src);p.code(0,False)
    edits=[]
    for parts in p.tpls:
        for nd in nodes(src,parts):
            r=build(src,nd)
            if r:edits.append(('t',)+r)
    for a,b,qc in p.qs:
        lit=src[a+1:b-1]
        if not HANS.search(lit):continue
        if '<' in lit:
            for nd in nodes(src,[('x',a+1,b-1)]):
                r=build(src,nd)
                if r:edits.append(('qh',)+r+(qc,))
        else:edits.append(('q',a,b,lit,[]))
    edits.sort(key=lambda e:e[1])
    # 去掉被包含的
    res=[];last=-1
    for e in edits:
        if e[1]<last:continue
        res.append(e);last=e[2]
    out=[];newsrc='';pos=0;cnt={}
    for e in res:
        kind,a,b,val,params=e[:5]
        line=src.count('\n',0,a)+1
        if any(sk(val,src[max(0,a-60):b+20]) for sk in skip):continue
        k=keymap.get(val)
        if not k:
            fn=fnname(src,a);cnt[fn]=cnt.get(fn,0)+1;k=f'{prefix}{fn}.{cnt[fn]}'
            while k in keymap.values():cnt[fn]+=1;k=f'{prefix}{fn}.{cnt[fn]}'
            keymap[val]=k
        ps=('{'+','.join(f'{n}:{x}' if n!=x else n for n,x in params)+'}') if params else ''
        call=f"t('{k}'{','+ps if ps else ''})"
        if kind=='t':rep='${'+call+'}'
        elif kind=='q':rep=call
        else:qc=e[5];rep=qc+'+'+call+'+'+qc
        newsrc+=src[pos:a]+rep;pos=b;out.append((line,k,val))
    newsrc+=src[pos:]
    return newsrc,out
