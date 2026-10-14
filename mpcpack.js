/* SAMPLE PACK side of the MPC tab: YouTube package, package generator and thumbnails for a sample pack (instead of a beat).
   Written for how packs are actually found on YouTube: people search "[style] sample pack", "loop kit", "vintage samples",
   "[producer] samples"; buyers want the name, the style words, royalty free, what is inside (loops, one-shots, stems, BPM/key) and a link. */
(function(){
const hs=(n,s)=>{const x=Math.sin((n+1)*127.1+(s||0)*311.7)*43758.5453;return x-Math.floor(x)},clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),cap=s=>s?s[0].toUpperCase()+s.slice(1):s;
const slug=t=>String(t||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
const STY=['Vintage','Boom Bap','Dusty Soul','Lo-Fi','90s','Jazzy','Gritty','Cinematic','Old School','Sample Flip'];
const KIND=['Sample Pack','Loop Kit','Sample Kit','Vintage Samples','Vinyl Samples'];
const PROD=['Alchemist','Madlib','J Dilla','Pete Rock','Daringer','Conductor Williams','Hit-Boy','Roc Marciano','Griselda','Kanye (old)'];
const linkOf=p=>'https://mzprd.com/pack/'+(p.slug||slug(p.title))+'/';
function ctx(ST,p,v){const r=n=>hs(n,v*97+String(p.title).length*7+3),y=new Date().getFullYear(),AR=(ST.artist||'').split(/[,/&+]| x /i).map(s=>s.trim()).filter(Boolean);
 const s1=STY[Math.floor(r(1)*STY.length)],s2=STY[(STY.indexOf(s1)+2+Math.floor(r(2)*5))%STY.length],k=KIND[Math.floor(r(3)*KIND.length)],pr=AR[0]||PROD[Math.floor(r(4)*PROD.length)];
 return{T:p.title,y,s1,s2,k,pr,owned:!!AR[0],link:linkOf(p),r}}

/* ---------- the YouTube package for one pack ---------- */
function build(ST,p){if(!p)return null;const v=(ST.yt&&ST.yt.v)||0,c=ctx(ST,p,v),T=c.T,y=c.y,L=c.link,pre=ST.yt&&ST.yt.mode==='premiere';
 const tpl=[
  ['SEARCH',`"${T}" - ${c.s1} ${c.k} ${y} (Royalty Free)`],['SEARCH',`${c.s1} ${c.s2} Sample Pack ${y} | "${T}"`],['SEARCH',`"${T}" | ${c.s1} Loop Kit for Boom Bap Producers`],
  ['SEARCH',`${c.pr} Type Samples - "${T}" (${c.s1} ${c.k})`],['SEARCH',`Vintage Vinyl Samples ${y}: "${T}" Sample Pack`],
  ['MPC',`Flipping "${T}" on the MPC60 (${c.s1} Sample Pack)`],['MPC',`I Played My New Sample Pack on Real Vinyl + MPD ("${T}")`],['MPC',`"${T}" Sample Pack - Played Live on Turntable & Pads`],
  ['CLICK',`These Samples Sound Like a ${y-1990}-Year-Old Record ("${T}")`],['CLICK',`Samples ${c.pr} Would Flip ("${T}")`],['CLICK',`Stop Using the Same Loops: "${T}" ${c.k}`],
  ['HYBRID',`"${T}" | ${c.s1} ${c.k} ${y} | Royalty Free Loops`],['HYBRID',`${c.k} ${y} "${T}" (${c.s1}, ${c.s2}, Vinyl)`],
  ['SEARCH',`[NEW] ${c.s1} Sample Pack ${y} | "${T}"`],['SEARCH',`Boom Bap Sample Pack ${y} - "${T}" (Royalty Free)`],['SEARCH',`${c.s1} Soul Loops for ${c.pr} Type Beats | "${T}"`],
  ['VIBE',`Late Night Vinyl Loops | "${T}" ${c.k}`],['VIBE',`Rainy Day Soul Samples ("${T}")`],['CLICK',`I Sampled a Record Nobody Has Heard ("${T}")`],['CLICK',`Producers Keep Asking Where I Get These Sounds`],
  ['USE',`Loop Kit for MPC Users | "${T}"`],['USE',`Chop-Ready ${c.s1} Samples | "${T}"`]];
 const score=(k,t)=>{let s=50;const lo=t.toLowerCase();if(/sample pack|loop kit|sample kit|samples/.test(lo))s+=14;if(lo.indexOf(T.toLowerCase())>=0&&lo.indexOf(T.toLowerCase())<35)s+=6;if(/royalty free/.test(lo))s+=6;if(t.includes(String(y)))s+=6;const L2=t.length;if(L2<=60)s+=12;else if(L2<=70)s+=6;else if(L2>100)s-=30;else s-=6;if(k==='SEARCH')s+=4;return clamp(s,0,100)};
 const o=tpl.map((x,i)=>({k:x[0],t:x[1].replace(/\s+/g,' ').trim(),r:hs(i,v*13+T.length)})).sort((a,b)=>a.r-b.r).slice(0,9).map(x=>({k:x.k,t:x.t.slice(0,100),s:score(x.k,x.t)}));let best=0;o.forEach((t,i)=>{if(t.s>o[best].s)best=i});o[best].best=true;
 const first=`${pre&&ST.yt.when?'Premieres '+ST.yt.when+': ':''}"${T}" is a ${c.s1.toLowerCase()} ${c.s2.toLowerCase()} sample pack by MZPRD, played live on vinyl and pads in this video. Get it here: ${L}`;
 const desc=[first,'','> GET "'+T.toUpperCase()+'": '+L,'> ALL SAMPLE PACKS AND BEATS: https://mzprd.com','',
  'WHAT IS INSIDE','- Original '+c.s1.toLowerCase()+' compositions, made to be chopped and flipped','- Loops labelled with BPM and key','- Recorded with real gear, warm and dusty, ready for boom bap and lo-fi','- WAV files, drag and drop into any DAW or MPC','',
  'LICENSE','100% royalty free for your beats and releases. Just no reselling the samples as-is.','',
  'GOOD FOR','Producers who like '+c.pr+', boom bap, lo-fi, soul and grimy hip hop.','',
  'ABOUT THIS VIDEO','Every pad you see light up is a sound from the pack, and the record on the turntable spins with it.','',
  'All sounds are original. MZPRD (Meztheprod).','','#samplepack #loopkit #boombap'].join('\n');
 const tagList=[T.toLowerCase(),T.toLowerCase()+' sample pack',c.s1.toLowerCase()+' sample pack','sample pack '+y,'boom bap sample pack','vintage sample pack','loop kit '+y,'soul samples','vinyl samples','royalty free samples','sample pack for producers',c.pr.toLowerCase()+' type samples','mpc samples','lo-fi samples','free samples for beats','mzprd','meztheprod'];
 const seen=new Set();let tags='';tagList.forEach(t=>{if(!seen.has(t)&&(tags+t).length<430){seen.add(t);tags+=(tags?', ':'')+t}});
 const pinned=[`What would you flip first from "${T}"? Drop the timestamp. Get the pack: ${L}`,`Make a beat with "${T}" and tag me, I'll share the best ones. Pack: ${L}`,`Which loop is the one? Get "${T}" here: ${L}`];
 const shorts={title:`"${T}" sample pack on vinyl + pads`.slice(0,70),desc:`${c.s1} sample pack "${T}" played live. Get it: ${L}\n\n#shorts #samplepack #boombap`};
 const checks=[],ck=(ok,msg)=>checks.push({ok,msg});const bt=o[best];
 ck(bt.t.length<=60,'Best title is '+bt.t.length+' characters. Under 60 shows in full in search; the limit is 100.');
 ck(/sample pack|loop kit|sample kit|samples/i.test(bt.t),'"Sample pack" / "loop kit" in the title: that is what producers type.');
 ck(true,'The pack link is in the first line of the description (it shows above "more").');
 ck(true,'"Royalty free" is stated: it is the first thing a producer checks before buying.');
 ck(c.owned,c.owned?'"Sounds like" producer used for the "[producer] type samples" angle.':'Add a "sounds like" producer (e.g. Alchemist) to rank for "[producer] type samples".');
 const tips=['Show the samples, do not just talk: the turntable + pads video is the demo.','Post a 9:16 Short of the best loop with the Shorts title below.','Put timestamps for each loop in the description once uploaded.','Pin the comment asking which loop they would flip first.','Make a "Sample Packs" playlist so the next pack autoplays.'];
 return{titles:o,desc,tags,pinned,shorts,checks,tips,link:L}}

/* ---------- the package generator for a pack ---------- */
const PT={
 search:['[NEW] {s1} Sample Pack {y} | "{T}"','Boom Bap Sample Pack {y} - "{T}" (Royalty Free)','{s1} Soul Loops for {pr} Type Beats | "{T}"','Vinyl Loop Kit {y}: "{T}" ({s1}, {s2})','"{T}" - {s1} {k} {y}','{s1} Sample Pack {y} | "{T}"','"{T}" ({s1} {s2} Loop Kit)','{k} {y}: "{T}" | Royalty Free','{pr} Type Samples | "{T}" {k}'],
 curiosity:['I Sampled a Record Nobody Has Heard ({T})','These Loops Were Made for Flipping ({T})','Producers Keep Asking Where I Get These Sounds','These Loops Sound Stolen From a 1972 Record','I Found This Sound in a Flea Market Crate ("{T}")','The Sample Pack I Kept for Myself ("{T}")','Why Every Loop in "{T}" Sounds Dusty'],
 mpc:['Flipping "{T}" Live on Vinyl + Pads','"{T}" Played on a Turntable and MPD218','Every Sound in "{T}", Played Live'],
 promise:['{s1} Loops With BPM and Key Labelled ({T})','10 Loops, 10 Beats: "{T}" {k}','Chop-Ready {s1} Samples | "{T}"','{s1} Loops Ready to Flip in 5 Minutes ("{T}")','Royalty Free {s1} Samples for {y}: "{T}"','"{T}": {s1} Samples That Need No Mixing'],
 question:['Which Loop Would You Flip First? ("{T}")','Could {pr} Flip These? ("{T}" {k})','Is This the Dustiest Sample Pack of {y}?'],
 challenge:['Making a Sample Pack on Real Vinyl ("{T}")','From Record to Loop Kit: "{T}"','I Made a {s1} Sample Pack From Scratch ("{T}")','Making "{T}": a {s1} Sample Pack','I Recorded {s1} Loops for a Month. Here They Are.'],
 use:['Samples for Boom Bap Producers in {y} ("{T}")','Loops for Your Next Beat Tape ("{T}")','Loop Kit for MPC Users | "{T}"','Samples for Producers Who Love {pr} ("{T}")','For Boom Bap Producers: "{T}" {k}','Loops to Make Your Next Beat Tonight ("{T}")'],
 vibe:['Late Night Vinyl Loops | "{T}" {k}','Rainy Day Soul Samples ("{T}")','Samples for 3AM Beat Sessions ("{T}")','Dusty Basement Loops | "{T}" {y}'],
 series:['Sample Pack Sunday: "{T}"','MZPRD Sample Packs Vol. {n}: "{T}"','Crate Series: "{T}" ({s1} {k})']};
const PTH={vibe:['LATE NIGHT LOOPS','RAINY SOUL','3AM SAMPLES'],search:['{T}','SAMPLE PACK','{s1} LOOPS'],curiosity:['STOLEN?','FOUND IT','TOO DUSTY'],mpc:['LIVE ON VINYL','PADS + VINYL'],promise:['READY TO FLIP','NO MIXING'],question:['FLIP THIS?','WHICH LOOP?'],challenge:['I MADE THIS','FROM SCRATCH'],use:['FOR PRODUCERS','MAKE A BEAT'],series:['VOL. {n}','SAMPLE SUNDAY']};
const POPEN={search:'"{T}" is a {s1l} sample pack: original loops with BPM and key, royalty free.',curiosity:'Every loop in "{T}" sounds like it came off an old record. It did not: all original.',mpc:'"{T}" played live on a turntable and pads, every sound straight from the pack.',promise:'{s1} loops ready to flip, royalty free: "{T}".',question:'Which loop from "{T}" would you flip first?',challenge:'I made "{T}" from scratch: {s1l}, dusty and ready to chop.',use:'Made for producers who love {pr}: "{T}".',series:'New pack in the series: "{T}".',vibe:'Loops for the late sessions: "{T}", {s1l} and dusty.'};
function fill(t,c){return t.replace(/\{T\}/g,c.T).replace(/\{s1\}/g,c.s1).replace(/\{s2\}/g,c.s2).replace(/\{s1l\}/g,c.s1.toLowerCase()).replace(/\{k\}/g,c.k).replace(/\{y\}/g,c.y).replace(/\{pr\}/g,c.pr).replace(/\{n\}/g,1+Math.floor(c.r(9)*4))}
function generate(ST,info,n,seed,only,G){const out=[],seen=new Set(),keys=only&&only.length?only:Object.keys(PT);let g=0;
 while(out.length<n&&g<n*12){const k=g++,angle=keys[k%keys.length],c=ctx(ST,info.beat,seed*53+k),list=PT[angle],title=fill(list[Math.floor(c.r(10)*list.length)],c).slice(0,100);if(seen.has(title.toLowerCase()))continue;seen.add(title.toLowerCase());
  const base=build(Object.assign({},ST,{yt:Object.assign({},ST.yt,{v:seed*53+k})}),info.beat),open=fill(POPEN[angle],c),L=c.link;
  let sc=50;if(/sample|loop|kit/i.test(title))sc+=14;if(title.length<=60)sc+=14;else if(title.length<=70)sc+=6;else sc-=8;if(title.includes(c.T))sc+=6;if(angle==='search')sc+=6;if(/\?$/.test(title))sc+=3;
  out.push({angle,title,score:clamp(sc,0,100),open,pin:base.pinned[k%3],thumb:fill(PTH[angle][Math.floor(c.r(12)*PTH[angle].length)],c).toUpperCase(),ctx:c,desc:[open+' Get it here: '+L].concat(base.desc.split('\n').slice(1)).join('\n'),tags:base.tags,shorts:base.shorts,why:G&&G.ANGLES[angle]?G.ANGLES[angle].why.replace(/type beat/gi,'sample pack').replace(/beat/gi,'pack'):'',angleName:G&&G.ANGLES[angle]?G.ANGLES[angle].n:angle.toUpperCase()})}
 return out}

/* ---------- thumbnails for a pack: the cover art big, the pack scene behind, few bold words ---------- */
function make(c,W,H,seed,X,o){o=o||{};const r=n=>hs(n,seed),v=H>W,Z=window.MZMpcPackArt||{},cov=Z.cover&&Z.cover(),scene=Z.scene&&Z.scene(),YT=window.MZMpcYT,PAL=YT?YT.PAL:[{n:'BLACK',bg:'#0b0b0d',bg2:'#2a2a30',acc:'#e0242f',ink:'#fff'}],P=o.pal!=null?PAL[o.pal%PAL.length]:PAL[Math.floor(r(1)*PAL.length)],useScene=scene&&(o.desk===true||(o.desk==null&&r(2)<.65));
 c.save();
 if(useScene){const s=Math.max(W/scene.width,H/scene.height)*(1.05+r(3)*.25),dx=(W-scene.width*s)*(v?.35+r(4)*.3:r(4)),dy=(H-scene.height*s)*r(5);c.drawImage(scene,dx,dy,scene.width*s,scene.height*s);const g=c.createLinearGradient(0,0,v?0:W,v?H:0);g.addColorStop(0,'rgba(0,0,0,.78)');g.addColorStop(.6,'rgba(0,0,0,.25)');g.addColorStop(1,'rgba(0,0,0,.55)');c.fillStyle=g;c.fillRect(0,0,W,H)}
 else{const g=c.createRadialGradient(W*.6,H*.45,10,W*.5,H*.5,Math.max(W,H)*.75);g.addColorStop(0,P.bg);g.addColorStop(1,P.bg2);c.fillStyle=g;c.fillRect(0,0,W,H)}
 /* the cover */
 const cs=v?W*.78:H*.78,cx=v?W/2:W*(r(6)<.5?.7:.3),cy=v?H*.55:H*.5,rot=(r(7)-.5)*.12;
 c.save();c.translate(cx,cy);c.rotate(rot);c.shadowColor='rgba(0,0,0,.75)';c.shadowBlur=cs*.08;c.shadowOffsetY=cs*.04;c.fillStyle='#111';c.fillRect(-cs/2,-cs/2,cs,cs);c.shadowBlur=0;c.shadowOffsetY=0;
 if(cov)c.drawImage(cov,-cs/2,-cs/2,cs,cs);else{c.fillStyle=P.acc;c.fillRect(-cs/2,-cs/2,cs,cs)}
 /* a record peeking out of the sleeve */
 c.restore();
 /* words: at most 3, big */
 const words=[String(X.title||'').toUpperCase(),X.big||(['SAMPLE PACK','LOOP KIT','VINTAGE SAMPLES'][Math.floor(r(8)*3)]),X.extra||(['ROYALTY FREE','VINYL + MPC','BOOM BAP'][Math.floor(r(9)*3)])];
 const tx=v?W/2:(cx>W/2?W*.27:W*.73),tw=v?W*.88:W*.44,ty0=v?H*.1:H*.2;c.textAlign='center';c.textBaseline='alphabetic';
 const fit=(t,max,f)=>{let s=max;c.font=f(s);while(s>10&&c.measureText(t).width>tw){s-=2;c.font=f(s)}return s};
 const f1=s=>'400 '+s+'px Anton, Oswald, sans-serif',s1=fit(words[0],v?150:120,f1);c.lineWidth=s1*.12;c.strokeStyle='#000';c.strokeText(words[0],tx,ty0+s1);c.fillStyle='#fff';c.fillText(words[0],tx,ty0+s1);
 const by=ty0+s1+(v?30:22),s2=fit(words[1],v?90:66,f1),bw=Math.min(tw,c.measureText(words[1]).width+40);c.fillStyle=P.acc==='#0b0b0d'?'#e0242f':P.acc;c.fillRect(tx-bw/2,by,bw,s2*1.15);c.fillStyle=(P.acc==='#ffd23f'||P.acc==='#ffe14a')?'#0b0b0d':'#fff';c.fillText(words[1],tx,by+s2*.98);
 const s3=fit(words[2],v?60:44,s=>'600 '+s+'px Oswald, sans-serif');c.fillStyle='#fff';c.fillText(words[2],tx,by+s2*1.15+s3*1.4);
 c.font='600 '+Math.round((v?34:24))+'px Oswald, sans-serif';c.fillStyle='rgba(255,255,255,.8)';c.fillText('MZPRD.COM',tx,v?H*.94:H*.92);
 c.restore();return{pal:useScene?'SCENE':P.n,bg:useScene?'pack scene':'color',text:words.join(' / ')}}

window.MZMpcPack={build,generate,make};
})();
