// Usage: node check.js page.html  -> prints pose-check warnings (exit 1 if any) and saves a screenshot next to it
const {chromium}=require('playwright');const path=require('path');
(async()=>{const f=path.resolve(process.argv[2]);const b=await chromium.launch();const p=await b.newPage({viewport:{width:1000,height:1400}});
const errs=[];p.on('pageerror',e=>errs.push('JS error: '+e.message));
await p.goto('file://'+f);await p.waitForTimeout(500);
const w=await p.evaluate(()=>window.POSE_WARNINGS||['page did not load']);
await p.screenshot({path:f.replace(/\.html$/,'.check.png'),fullPage:true});await b.close();
const all=[...errs,...w];console.log(all.length?all.join('\n'):'OK: all poses pass');process.exit(all.length?1:0);})();
