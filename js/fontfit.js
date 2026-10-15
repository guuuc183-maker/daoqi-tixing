// 正文字体（Noto Sans SC 子集，"DQ Sans"）只覆盖界面文案用到的字。
// 规则：输入框/文本框/下拉一律系统字体（style.css）；显示出来的文字里只要有子集没有的字（如用户起名用了生僻字），
// 就把它所在的「整行」加 .uc 改用系统字体，保证同一行不会一半子集字体、一半系统字体。
import {COVER} from './font-cover.js';
const C=new Set(COVER),TRIG=/[\p{L}\p{N}\p{P}]/u; // 符号/emoji（⚠ ✓）本来就走 emoji 字体，不触发
export const covered=s=>{for(const ch of s)if(!C.has(ch)&&TRIG.test(ch))return false;return true;};
const cs=e=>getComputedStyle(e);
// 找「行」：内联元素属于外层那一行；不换行的横向 flex 容器里的子项也在同一行
export function lineOf(el){
  let e=el;
  while(e.parentElement&&e.parentElement!==document.body&&e.parentElement!==document.documentElement){
    const p=e.parentElement,d=cs(e).display,pc=cs(p);
    const inl=/^inline|^contents|^ruby/.test(d);
    const row=/flex/.test(pc.display)&&!/^column/.test(pc.flexDirection)&&pc.flexWrap==='nowrap';
    if(inl||row){e=p;continue;}
    break;}
  return e;}
function scanNode(n){
  if(n.nodeType===3){const p=n.parentElement;if(p&&!covered(n.data))mark(p);return;}
  if(n.nodeType!==1||n.closest?.('.uc'))return;
  const w=document.createTreeWalker(n,NodeFilter.SHOW_TEXT);let x;
  while((x=w.nextNode()))if(!covered(x.data)&&x.parentElement)mark(x.parentElement);}
function mark(p){if(p.closest('script,style,input,textarea,select,svg,.uc'))return;lineOf(p).classList.add('uc');}
export function start(root=document.body){
  if(typeof MutationObserver==='undefined'||!root)return;
  scanNode(root);
  new MutationObserver(ms=>{for(const m of ms){
    if(m.type==='characterData')scanNode(m.target);
    else m.addedNodes.forEach(scanNode);}}).observe(root,{childList:true,subtree:true,characterData:true});}
if(typeof document!=='undefined'){document.body?start():addEventListener('DOMContentLoaded',()=>start());}
