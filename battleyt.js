/* MZPRD Beat Battle: the YouTube package (titles, description with chapters and a link to every beat played, tags, pinned comment)
   and the battle thumbnails (8 looks, 16:9 and a 9:16 Shorts cover). Everything is built from the battle itself. */
(function(){
'use strict';
const FX=window.MZBattleFX,TX=window.MZBattleText,SC=window.MZBattleScenes,{W,H,LC,RC,GOLD,FN,hs,tx,rr,IM}=FX;
const ytStamp=s=>{s=Math.max(0,Math.round(s));const h=Math.floor(s/3600),m=Math.floor(s%3600/60),x=s%60;return(h?h+':'+String(m).padStart(2,'0'):m)+':'+String(x).padStart(2,'0')};
const slugify=t=>String(t||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
const nice=s=>String(s||'').replace(/\w\S*/g,w=>w[0].toUpperCase()+w.slice(1).toLowerCase());
const fName=f=>String(f.name||'').replace(/^THE\s+/,'');
const link=f=>{const b=f.beat;if(!b||b.src==='file'||!b.slug&&!b.id)return'';return'https://mzprd.com/beat/'+(b.slug||slugify(b.title))+'/'};
function episodeInfo(ST,B,tl){
 const segs=tl.segs,intros=segs.filter(s=>s.type==='intro'),rec=segs.filter(s=>s.type==='recap'),champ=segs.find(s=>s.type==='champ');
 const matches=intros.map(s=>B.rounds[s.r][s.m]);const fighters=[];const seen=new Set();
 const push=i=>{if(i!=null&&!seen.has(i)){seen.add(i);fighters.push(B.fighters[i])}};
 matches.forEach(M=>{push(M.a);push(M.b)});if(champ&&champ.w!=null)push(champ.w);
 const first=matches[0]||null,champW=champ&&champ.w!=null?B.fighters[champ.w]:null;
 return{intros,rec,champ,matches,fighters,first,champW,rname:B.kind==='champion'?'THE FINAL':SC.roundName(B,B.cur||0),n:matches.length}}
function chapters(B,tl,info){const ch=[{t:0,l:'Intro and the bracket'}];if(info.rec.length)ch.push({t:info.rec[0].start,l:B.kind==='champion'?'The final result':'Last round results'});
 info.intros.forEach((s,i)=>{const M=B.rounds[s.r][s.m],A=B.fighters[M.a],Bf=B.fighters[M.b];ch.push({t:s.start,l:'Match '+(i+1)+': '+(A.beat&&A.beat.title||fName(A))+' vs '+(Bf.beat&&Bf.beat.title||fName(Bf))})});
 if(info.champ)ch.push({t:info.champ.start,l:'The champion crowned'});
 const out=[];ch.forEach(c=>{if(!out.length||c.t-out[out.length-1].t>=10)out.push(c)});if(out.length<3&&tl.total>40){out.push({t:Math.round(tl.total*.5),l:'Vote time'},{t:Math.round(tl.total*.85),l:'What is next'});out.sort((a,b)=>a.t-b.t)}return out}
function build(ST,B,tl){
 const I=episodeInfo(ST,B,tl),mode=(ST.yt&&ST.yt.mode)||'premiere',pre=mode==='premiere',year=new Date().getFullYear(),T=ST.title&&ST.title.trim()||'BEAT BATTLE',team=B.format==='team';
 const A=I.first?B.fighters[I.first.a]:B.fighters[0],Bf=I.first?B.fighters[I.first.b]:B.fighters[1],an=A.beat&&A.beat.title||fName(A),bn=Bf.beat&&Bf.beat.title||fName(Bf),nf=B.fighters.length;
 const ep=ST.epLabel||'',epN=(ep.match(/\d+/)||[''])[0],rn=nice(I.rname);
 let pool;
 if(B.kind==='champion'){const cw=I.champW,cb=cw&&cw.beat&&cw.beat.title||'the winner';pool=[
  `${cb} WINS The Beat Battle | ${T} Final Results`,`Who Won? The Beat Battle Champion Is Crowned | ${T}`,`THE CHAMPION BEAT: ${cb} | Producer Beat Battle Final`,`${nf} Beats Fought, 1 Is Champion | ${T} (Final Results)`,`Beat Battle Final: ${an} vs ${bn} Results + Champion`,`Rap Beat Tournament ${year}: The Final Result + Champion`,`And The Winner Is... | ${T} Finale`,`Crowning The Beat Battle Champion | ${T}`]}
 else if(team){pool=[`TEAM WAR: ${Math.floor(nf/2)} vs ${Math.floor(nf/2)} Beat Battle | ${T}${epN?' Ep '+epN:''}`,`Which Team Has The Better Beats? | ${T} Team War`,`${Math.floor(nf/2)} v ${Math.floor(nf/2)} Producer Beat Battle: You Pick The Winners`,`Beat Battle Team War ${year}: Blue vs Pink | Vote In The Comments`,`${an} vs ${bn} + ${Math.max(0,I.n-1)} More Matches | Team Beat Battle`,`BLUE vs PINK: Hardest Beats Win The War | ${T}`,`Beat Team War ${year} | ${T}`,`Who Wins? Team Beat Battle (Comment 1 or 2)`]}
 else{pool=[
  `BEAT BATTLE: ${an} vs ${bn} | Which Beat Wins? (Comment 1 or 2)`,`${T}${epN?' Ep '+epN:''}: ${rn} | ${nf} Beats, 1 Champion`,`Producer Beat Battle ${rn}: Vote For Your Favorite Beat`,`WHICH BEAT HITS HARDER? ${an} vs ${bn} | Beat Battle`,`${nf} Hard Beats Fight For The Crown | ${T} ${rn}`,`Rap Beat Tournament ${year}: ${rn} (You Decide)`,`Beat Battle Bracket: ${rn} | ${T}`,`Pick The Winner: ${an} or ${bn}? | Beat Battle`]}
 const k=(ST.yt&&ST.yt.variant||0)%pool.length,titles=pool.slice(k).concat(pool.slice(0,k)).map(t=>t.length>100?t.slice(0,97).replace(/\s+\S*$/,'')+'...':t);
 const ch=chapters(B,tl,I),chap=ch.map(c=>ytStamp(c.t)+' '+c.l).join('\n');
 const hook=B.kind==='champion'?`The votes are in! See which beat took the crown in ${T}${epN?' episode '+epN:''}, and grab the champion beat at mzprd.com.`:pre?`Premiering ${ST.when||'soon'}: ${rn} of ${T}. ${I.n} beat matches, you pick the winners in the comments!`:`${rn} of ${T}: ${I.n} beat ${I.n===1?'match':'matches'}, YOU pick the winners. Comment 1 or 2 on every match!`;
 const hashtags=['#BeatBattle','#TypeBeat','#Instrumentals','#MZPRD','#HipHopBeats'];
 const how=B.kind==='champion'?'Thanks to everyone who voted! Which beat deserved the crown?':'HOW TO VOTE: watch each match, then comment the number of the beat you want to win (1 or 2). The winners move on in the next episode!';
 const links=I.fighters.map((f,i)=>{const l=link(f),b=f.beat&&f.beat.title||fName(f);return `${i+1}. ${b}${f.beat&&f.beat.bpm?' ('+f.beat.bpm+' BPM'+(f.beat.key?', '+f.beat.key:'')+')':''} - ${fName(f)}${l?'\n'+l:''}`}).join('\n\n');
 const prev=ST.yt&&ST.yt.prev?'\nPrevious episode: '+ST.yt.prev:'',pl=ST.yt&&ST.yt.playlist?'\nFull Beat Battle playlist: '+ST.yt.playlist:'',next=B.kind==='champion'?'':'\nNext episode: the results and the next round!';
 const desc=[hook,hashtags.slice(0,3).join(' '),'',how,'','TIMESTAMPS',chap,'','EVERY BEAT IN THIS EPISODE',links,'',
  'Buy beats and sample packs: https://mzprd.com',prev,pl,next,'','Beat Battle is a series by MZPRD (Meztheprod): original beats and instrumentals for rap, hip hop and R&B, plus sample packs. Every beat shown is an original MZPRD production.','',hashtags.join(' ')].filter((x,i,a)=>!(x===''&&a[i-1]==='')).join('\n').replace(/\n{3,}/g,'\n\n');
 const raw=['beat battle','producer beat battle','beat tournament','rap beats','hip hop beats','instrumentals','type beat','beats for sale','mzprd','meztheprod','beat showcase','which beat wins'].concat(I.fighters.slice(0,4).map(f=>(f.beat&&f.beat.title||'').toLowerCase()+' beat'));
 const tags=[];let len=0;raw.forEach(t=>{t=t.trim().slice(0,30);if(!t||tags.includes(t)||tags.length>=14||len+t.length+1>480)return;tags.push(t);len+=t.length+1});
 const pinned=B.kind==='champion'?`Which beat deserved the crown? Tell us below, and grab the champion at https://mzprd.com`:`COMMENT YOUR VOTE: for every match, type 1 or 2. Results drop in the next episode! Beats and downloads: https://mzprd.com`;
 return{titles,desc,tags:tags.join(', '),pinned,chapters:chap,hashtags:hashtags.join(' ')}}

/* ---------- thumbnails ---------- */
const TH_NAMES=['SPLIT VERSUS','LIGHTNING CLASH','FIGHT POSTER','CHARACTER SELECT','K.O.','CHAMPION','BRACKET POSTER','PICK A SIDE'];
function feat(ST,B){const segs=SC.build(B).segs,intro=segs.find(s=>s.type==='intro'),champ=segs.find(s=>s.type==='champ');let a=0,b=1,w=null;
 if(intro){const M=B.rounds[intro.r][intro.m];a=M.a;b=M.b}else if(champ&&champ.w!=null){w=champ.w;a=champ.w;b=champ.runner!=null?champ.runner:(champ.w===0?1:0)}
 const rec=segs.find(s=>s.type==='recap');if(rec&&!intro){a=B.rounds[rec.r][rec.m].a;b=B.rounds[rec.r][rec.m].b;w=rec.w}
 return{A:B.fighters[a],B:B.fighters[b],ai:a,bi:b,w}}
function bgFor(c,tpl,t){FX.arena(c,tpl,t,{bass:.3},null)}
function banner(c,s,x,y,col,px){tx(c,s,x,y,px||44,FN.A,'#fff',{sw:10,st:'#000',gl:col||GOLD,gb:36,ex:5,exc:'#000',ls:3})}
function look(i,c,ST,B,F){
 const A=F.A,Bf=F.B,rn=SC.roundName(B,B.kind==='champion'?B.rounds.length-1:(B.cur||0));const tpl=ST.tpl||'arcade';
 const aT=String(A.beat&&A.beat.title||'').toUpperCase(),bT=String(Bf.beat&&Bf.beat.title||'').toUpperCase();
 if(i===0){bgFor(c,tpl,1);c.save();c.beginPath();c.moveTo(0,0);c.lineTo(W*.56,0);c.lineTo(W*.44,H);c.lineTo(0,H);c.closePath();c.clip();c.fillStyle=FX.G(c,0,0,W,H,[[0,'#06425a'],[1,'#02111a']]);c.fillRect(0,0,W,H);c.restore();
  c.save();c.beginPath();c.moveTo(W*.56,0);c.lineTo(W,0);c.lineTo(W,H);c.lineTo(W*.44,H);c.closePath();c.clip();c.fillStyle=FX.G(c,0,0,W,H,[[0,'#52062a'],[1,'#1a0210']]);c.fillRect(0,0,W,H);c.restore();
  c.strokeStyle='#fff';c.lineWidth=8;c.shadowColor='#ffd34a';c.shadowBlur=30;c.beginPath();c.moveTo(W*.56,0);c.lineTo(W*.44,H);c.stroke();c.shadowBlur=0;
  FX.portrait(c,A,W*.25,H*.52,560,{glow:LC});FX.portrait(c,Bf,W*.75,H*.52,560,{glow:RC});banner(c,'VS',W/2,H*.46,GOLD,220);banner(c,'BEAT BATTLE',W/2,H*.9,GOLD,70)}
 else if(i===1){bgFor(c,tpl,2);c.fillStyle='rgba(0,0,0,.35)';c.fillRect(0,0,W,H);FX.portrait(c,A,W*.24,H*.55,600,{glow:LC});FX.portrait(c,Bf,W*.76,H*.55,600,{glow:RC});
  c.save();c.strokeStyle='#fff';c.shadowColor=GOLD;c.shadowBlur=36;c.lineWidth=10;c.beginPath();let x=W/2-16,y=0;c.moveTo(x,y);for(let k=1;k<9;k++){x+=(k%2?34:-34);y=k*H/8;c.lineTo(x,y)}c.stroke();c.restore();
  banner(c,'WHO WINS?',W/2,H*.1,GOLD,92);banner(c,aT.slice(0,16),W*.24,H*.9,LC,40);banner(c,bT.slice(0,16),W*.76,H*.9,RC,40)}
 else if(i===2){bgFor(c,tpl,3);FX.hpbar(c,40,50,520,1,LC,'l');FX.hpbar(c,W-40-520,50,520,1,RC,'r');tx(c,A.name,40,24,20,FN.P,'#fff',{al:'left',sw:6});tx(c,Bf.name,W-40,24,20,FN.P,'#fff',{al:'right',sw:6});
  FX.portrait(c,A,330,420,560,{glow:LC});FX.portrait(c,Bf,W-330,420,560,{glow:RC});banner(c,'VS',W/2,H*.4,GOLD,170);banner(c,rn+'  FIGHT!',W/2,H*.9,GOLD,64)}
 else if(i===3){bgFor(c,tpl,4);c.fillStyle='rgba(0,0,0,.4)';c.fillRect(0,0,W,H);banner(c,'SELECT YOUR FIGHTER',W/2,60,GOLD,56);const fs=B.fighters,n=fs.length,cols=n>12?10:n>8?8:4,rows=Math.ceil(n/cols),cw=Math.min(190,(W-80)/cols),ch=cw;
  fs.forEach((f,k)=>{const x=W/2+((k%cols)-(cols-1)/2)*(cw+8),y=170+Math.floor(k/cols)*(ch+10)+ch/2;const sel=k===F.ai||k===F.bi,col=k===F.ai?LC:RC;c.save();c.fillStyle='rgba(8,6,18,.9)';rr(c,x-cw/2,y-ch/2,cw,ch,10);c.fill();c.strokeStyle=sel?col:'#444';c.lineWidth=sel?7:2;c.stroke();c.save();rr(c,x-cw/2,y-ch/2,cw,ch,10);c.clip();FX.portrait(c,f,x,y+6,cw*1.05,{gray:!sel&&n>2});c.restore();c.restore();if(sel)tx(c,k===F.ai?'P1':'P2',x,y-ch/2-12,22,FN.P,col,{sw:6})});
  banner(c,String(A.beat&&A.beat.title||A.name).toUpperCase().slice(0,14)+'  VS  '+String(Bf.beat&&Bf.beat.title||Bf.name).toUpperCase().slice(0,14),W/2,H-50,GOLD,44)}
 else if(i===4){bgFor(c,tpl,5);const winA=F.w==null||F.w===F.ai;const Wf=winA?A:Bf,Lf=winA?Bf:A,wc=winA?LC:RC,lc=winA?RC:LC;FX.portrait(c,Wf,W*.7,H*.52,640,{glow:wc});FX.portrait(c,Lf,W*.25,H*.6,440,{gray:true,rot:.25,dy:40});FX.crack(c,W*.25,H*.6,260,3,1,'#fff');
  tx(c,'K.O.',W*.25,H*.5,230,FN.A,'#e0242f',{sw:22,st:'#000',gl:'#e0242f',gb:50,rot:-.2,ex:8});banner(c,'WHO WON?',W*.5,H*.1,GOLD,80);banner(c,rn,W*.5,H*.92,GOLD,56)}
 else if(i===5){bgFor(c,tpl,6);FX.godRays(c,W/2,H*.5,0,GOLD,.5);const Wf=F.w!=null?B.fighters[F.w]:A;FX.portrait(c,Wf,W*.42,H*.58,620,{glow:GOLD,ga:.9});if(IM.crown){const cw=IM.crown.width*.4,ch=IM.crown.height*.4;c.save();c.translate(W*.42+8,H*.2);c.rotate(-.08);c.shadowColor=GOLD;c.shadowBlur=40;c.drawImage(IM.crown,-cw/2,-ch/2,cw,ch);c.restore()}
  if(IM.trophy){const th=IM.trophy.height*.55,tw=IM.trophy.width*.55;c.save();c.shadowColor=GOLD;c.shadowBlur=50;c.drawImage(IM.trophy,W*.82-tw/2,H*.55-th/2,tw,th);c.restore()}banner(c,'THE CHAMPION',W/2,H*.08,GOLD,92);banner(c,String(Wf.beat&&Wf.beat.title||Wf.name).toUpperCase().slice(0,22),W*.42,H*.93,GOLD,52)}
 else if(i===6){bgFor(c,tpl,7);c.fillStyle='rgba(4,3,12,.5)';c.fillRect(0,0,W,H);FX.drawBracket(c,Object.assign({},B,{cur:B.cur||0}),9,{});banner(c,'BEAT BATTLE',W/2,58,GOLD,78);banner(c,rn,W/2,H-46,GOLD,48)}
 else{bgFor(c,tpl,8);c.fillStyle='rgba(0,0,0,.3)';c.fillRect(0,0,W,H);FX.portrait(c,A,W*.24,H*.5,520,{glow:LC});FX.portrait(c,Bf,W*.76,H*.5,520,{glow:RC});tx(c,'1',W*.24,H*.8,220,FN.A,'#fff',{sw:20,gl:LC,gb:50});tx(c,'2',W*.76,H*.8,220,FN.A,'#fff',{sw:20,gl:RC,gb:50});
  banner(c,'COMMENT 1 OR 2',W/2,H*.12,GOLD,84);banner(c,'VS',W/2,H*.5,GOLD,150)}
 tx(c,'MZPRD',W-30,H-24,20,FN.P,'rgba(255,255,255,.75)',{al:'right',sw:5})}
function thumb(i,ST,B,wide){
 const F=feat(ST,B),o=document.createElement('canvas');o.width=W;o.height=H;const c=o.getContext('2d');look(i,c,ST,B,F);FX.vignette(c,.45);
 if(wide!==false&&wide!=='tall')return o;
 const t=document.createElement('canvas');t.width=1080;t.height=1920;const g=t.getContext('2d');g.fillStyle='#05040c';g.fillRect(0,0,1080,1920);g.save();g.filter='blur(30px) brightness(.6)';g.drawImage(o,-500,0,2080,1170*1.6);g.restore();
 const sc=1080/W,dh=H*sc;g.drawImage(o,0,(1920-dh)/2,1080,dh);tx(g,'BEAT',540,230,250,FN.A,'#fff',{sw:20,gl:LC,gb:50,ex:9});tx(g,'BATTLE',540,430,250,FN.A,GOLD,{sw:20,gl:'#ff9a1a',gb:50,ex:9});tx(g,'COMMENT 1 OR 2',540,1700,80,FN.A,'#fff',{sw:14,gl:GOLD,gb:30});tx(g,'MZPRD.COM',540,1810,48,FN.P,GOLD,{sw:8});return t}
window.MZBattleYT={build,thumb,TH_NAMES,chapters,episodeInfo,ytStamp,link};
})();
