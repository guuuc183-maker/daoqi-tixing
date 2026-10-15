// 版本一致性：version.js = sw.js 缓存名 = 关于页模板 =（HEAD 有 tag 时）git tag
import fs from 'fs';import {fileURLToPath} from 'url';import {execSync} from 'child_process';import {VERSION} from '../js/version.js';
let p=0,f=0;const t=(n,c)=>{if(c)p++;else{f++;console.log('FAIL',n);}};
const sw=fs.readFileSync(new URL('../sw.js',import.meta.url),'utf8');
t('sw VERSION',sw.includes(`const VERSION='${VERSION}'`)&&sw.includes("const CACHE='dq-v'+VERSION"));
t('sw 缓存 version.js',sw.includes("'js/version.js'"));
const app=fs.readFileSync(new URL('../js/app.js',import.meta.url),'utf8');t('关于页用 VERSION',app.includes('v${VERSION}')&&!/class="ver num">v\d/.test(app));
// cwd 要用 fileURLToPath：URL.pathname 是百分号编码的（中文目录），之前 execSync 静默失败，误报「HEAD 未打 tag」
const cwd=fileURLToPath(new URL('..',import.meta.url));let tags='';
try{tags=execSync('git tag --points-at HEAD',{cwd}).toString().trim();}catch{}
if(!tags)try{tags=execSync('git describe --tags --exact-match HEAD',{cwd,stdio:['ignore','pipe','ignore']}).toString().trim();}catch{}
const vt=tags.split('\n').filter(x=>/^v\d/.test(x));
if(vt.length)t('git tag = v'+VERSION+' (got '+vt+')',vt.includes('v'+VERSION));else console.log('note: HEAD 未打 tag，跳过 tag 比对（发版前打 v'+VERSION+'）');
// 发版检查：设置 RELEASE=1 时 HEAD 必须有对应 tag
if(process.env.RELEASE)t('RELEASE: HEAD 有 tag v'+VERSION,vt.includes('v'+VERSION));
console.log(`${p} passed ${f} failed`);if(f)process.exit(1);
