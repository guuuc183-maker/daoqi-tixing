# 扫 JS 源码里含汉字的字符串片段（跳过注释和正则字面量）
import re,sys
HAN=re.compile(r'[\u3000-\u303f\u4e00-\u9fff\uff00-\uffef\u2014\u201c\u201d\u300c\u300d]')
def scan(src):
    out=[];i=0;n=len(src);stack=['code'];depth=[];prev=''  # prev significant char for regex detection
    while i<n:
        st=stack[-1];c=src[i]
        if st in('code','expr'):
            if src.startswith('//',i):
                j=src.find('\n',i);i=n if j<0 else j;continue
            if src.startswith('/*',i):
                j=src.find('*/',i+2);i=n if j<0 else j+2;continue
            if c in '\'"':
                j=i+1
                while j<n and src[j]!=c:
                    j+=2 if src[j]=='\\' else 1
                lit=src[i+1:j]
                if HAN.search(lit):out.append(('q',i,j+1,lit))
                i=j+1;prev='a';continue
            if c=='`':stack.append('tpl');i+=1;continue
            if c=='/' and (prev=='' or prev in '(,=:[!&|?{};+-*%<>~^' or re.search(r'\b(return|typeof|case|in|of|void)\s*$',src[max(0,i-12):i])):
                j=i+1;cls=False
                while j<n:
                    if src[j]=='\\':j+=2;continue
                    if src[j]=='[':cls=True
                    elif src[j]==']':cls=False
                    elif src[j]=='/' and not cls:break
                    elif src[j]=='\n':break
                    j+=1
                i=j+1;prev='a';continue
            if c=='{' and st=='expr':depth[-1]+=1
            if c=='}' and st=='expr':
                if depth[-1]==0:
                    stack.pop();depth.pop();i+=1;prev='a';continue
                depth[-1]-=1
            if not c.isspace():prev=c
            i+=1;continue
        if st=='tpl':
            j=i;start=i
            while j<n and src[j]!='`' and not src.startswith('${',j):
                j+=2 if src[j]=='\\' else 1
            seg=src[start:j]
            for m in re.finditer(r'[^<>{}"=]+',seg):
                t=m.group(0)
                if HAN.search(t):out.append(('t',start+m.start(),start+m.end(),t))
            if j<n and src[j]=='`':stack.pop();i=j+1;prev='a';continue
            stack.append('expr');depth.append(0);i=j+2;prev='(';continue
        i+=1
    return out
if __name__=='__main__':
    for f in sys.argv[1:]:
        r=scan(open(f).read());print(f,len(r))
