/* MZPRD Beat Battle engine, part 2: the episode timeline and every scene (title, bracket, intro, beat, vote, result, outro, champion). */
(function(){
'use strict';
const FX=window.MZBattleFX,TX=window.MZBattleText,{W,H,LC,RC,GOLD,FN,hs,eo,ei,eio,eb,clamp,lerp,tx,rr,IM}=FX;
const PI=Math.PI;
const ROUND_NAMES=n=>n<=1?'THE FINAL':n===2?'SEMIFINALS':n===3?'QUARTERFINALS':n===4?'ROUND OF 16':'ROUND OF '+Math.pow(2,n);
function roundName(B,r){if(B.format==='team')return 'TEAM WAR';const total=Math.round(Math.log2(Math.max(2,B.fighters.length)));return ROUND_NAMES(total-r)}
const pctOf=M=>{const t=(M.va||0)+(M.vb||0);return t>0?M.va/t:.5};
function winnerOf(M){if(M.w!=null)return M.w;if((M.va||0)+(M.vb||0)>0)return M.va>=M.vb?M.a:M.b;return null}
/* ---------- the timeline ---------- */
function build(B){
 const segs=[];let t=0;const add=(type,dur,d)=>{segs.push(Object.assign({type,start:t,dur},d||{}));t+=dur};
 const o=B.opts||{},seed=o.seed||1,quick=o.recap==='quick',rd=quick?4.6:7,clip=B.clip||20;
 const bags={};const line=(kind,voice,k)=>{const key=kind+voice;if(!bags[key])bags[key]=TX.bag(TX[kind][voice]||TX[kind].fierce,seed*31+key.length*7+voice.length);return bags[key]()};
 const talk=o.talk==null?2:o.talk;
 const matchTalk=(M)=>{const A=B.fighters[M.a],Bf=B.fighters[M.b],v={opp:Bf.name.replace('THE ',''),obeat:Bf.beat&&Bf.beat.title||'a beat',beat:A.beat&&A.beat.title||'my beat',gear:A.gear||'gear',me:A.name};const v2={opp:A.name.replace('THE ',''),obeat:v.beat,beat:Bf.beat&&Bf.beat.title||'my beat',gear:Bf.gear||'gear',me:Bf.name};
  return{preA:TX.fill(line('PRE',A.voice||'fierce'),v),preB:TX.fill(line('PRE',Bf.voice||'fierce'),v2)}};
 const afterTalk=(M,w)=>{const l=w===M.a?M.b:M.a,W_=B.fighters[w],L_=B.fighters[l];const v={opp:L_.name.replace('THE ',''),beat:W_.beat&&W_.beat.title||'beat',gear:W_.gear||'gear'},v2={opp:W_.name.replace('THE ',''),beat:L_.beat&&L_.beat.title||'beat',gear:L_.gear||'gear'};return{win:TX.fill(line('WIN',W_.voice||'fierce'),v),lose:TX.fill(line('LOSE',L_.voice||'fierce'),v2)}};
 const recapSeg=(r,mi)=>{const M=B.rounds[r][mi],w=winnerOf(M);if(w==null)return;const pa=pctOf(M),wp=w===M.a?pa:1-pa,fin=TX.pickFinish(wp,seed*17+mi*5+r*3,{force:M.fin});
  const f=(M.fin==='upset'||(fin.id!=='flawless'&&w===M.b&&wp>.6&&hs(mi+r,seed)<.35&&(!M.fin||M.fin==='auto')))?TX.FINISH.find(x=>x.id==='upset'):fin;
  add('recap',rd,Object.assign({r,m:mi,w,fin:f,wp,talk:afterTalk(M,w),rd},{}))};
 add('title',3.8,{});
 add('bracket',7.5,{});
 const cur=B.format==='team'?0:(B.cur||0),team=B.format==='team';
 const full=B.kind==='full',isCh=B.kind==='champion'||full;
 if(full){const RR=team?[0]:B.rounds.map((_,i)=>i);RR.forEach(r=>{(B.rounds[r]||[]).forEach((M,mi)=>{if(M.a==null||M.b==null)return;if(r>0||mi>0||true){add('intro',4.8,{r,m:mi,talk:matchTalk(M),call:TX.FIGHT_CALL[(seed+mi+r)%TX.FIGHT_CALL.length]});add('play',clip,{r,m:mi,side:0});add('play',clip,{r,m:mi,side:1});add('vote',5.8,{r,m:mi,call:TX.VOTE_CALL[(seed+mi*3+r)%TX.VOTE_CALL.length]});recapSeg(r,mi)}})})}
 if(isCh&&team){const R0=B.rounds[0]||[];let sa=0,sb=0,va=0,vb=0,best=null;R0.forEach(M=>{const w=winnerOf(M);if(w==null)return;if(w===M.a)sa++;else sb++;va+=M.va||0;vb+=M.vb||0});const tie=sa===sb,blue=sa>sb||(tie&&va>=vb);
  R0.forEach((M,mi)=>{const w=winnerOf(M);if(w==null||(blue?w!==M.a:w!==M.b))return;const wp=w===M.a?pctOf(M):1-pctOf(M);if(!best||wp>best.wp)best={mi,w,wp,l:w===M.a?M.b:M.a}});
  if(best){if(!full)recapSeg(0,best.mi);add('champ',11.5,{w:best.w,runner:best.l,team:(blue?'TEAM BLUE':'TEAM PINK')+' WINS '+(tie?sa+' - '+sb+' ON TOTAL VOTES':Math.max(sa,sb)+' - '+Math.min(sa,sb)),line:TX.fill(TX.bag(TX.CHAMP,seed+5)(),{beat:B.fighters[best.w].beat&&B.fighters[best.w].beat.title||'my beat'})})}
  add('outro',4.5,{champion:true})}
 else if(isCh){const fr=B.rounds.length-1;if(!full&&B.rounds[fr]&&B.rounds[fr][0])recapSeg(fr,0);
  const FM=B.rounds[fr]&&B.rounds[fr][0],cw=FM?winnerOf(FM):null;add('champ',11.5,{w:cw,runner:FM&&cw!=null?(cw===FM.a?FM.b:FM.a):null,line:cw!=null?TX.fill(TX.bag(TX.CHAMP,seed+5)(),{beat:B.fighters[cw].beat&&B.fighters[cw].beat.title||'my beat'}):''});add('outro',4.5,{champion:true})}
 else{
  if(o.recap!=='off'){if(B.format==='team'){const r=B.range||[0,B.rounds[0].length];for(let mi=0;mi<r[0];mi++)if(winnerOf(B.rounds[0][mi])!=null&&r[0]-mi<=2)recapSeg(0,mi)}else if(cur>0&&B.rounds[cur-1])B.rounds[cur-1].forEach((M,mi)=>recapSeg(cur-1,mi))}
  const R=B.rounds[cur]||[],rg=B.range||[0,R.length];
  for(let mi=rg[0];mi<rg[1]&&mi<R.length;mi++){const M=R[mi];if(M.a==null||M.b==null)continue;const tk=matchTalk(M);
   add('intro',4.8,{r:cur,m:mi,talk:tk,call:TX.FIGHT_CALL[(seed+mi)%TX.FIGHT_CALL.length]});
   add('play',clip,{r:cur,m:mi,side:0});add('play',clip,{r:cur,m:mi,side:1});
   add('vote',5.8,{r:cur,m:mi,call:TX.VOTE_CALL[(seed+mi*3)%TX.VOTE_CALL.length]})}
  add('outro',5.5,{tease:TX.NEXT_TEASE[(seed)%TX.NEXT_TEASE.length]})}
 return{segs,total:t}}
const segAt=(tl,T)=>{const S=tl.segs;for(let i=S.length-1;i>=0;i--)if(T>=S[i].start)return{seg:S[i],i,lt:T-S[i].start};return{seg:S[0],i:0,lt:0}};

/* ---------- small pieces shared by scenes ---------- */
const fadeEnds=()=>{};
function hud(c,B,lt,label){tx(c,'MZPRD BEAT BATTLE',22,H-24,15,FN.P,'rgba(255,255,255,.7)',{al:'left',sw:4});if(label)tx(c,label,W-22,H-24,15,FN.P,GOLD,{al:'right',sw:4})}
const clipPct=(seg)=>seg.dur;
function topBanner(c,s,lt,col){const u=eo(lt/.4),y=-70+u*120;c.save();c.fillStyle='rgba(6,4,16,.92)';c.fillRect(W/2-380,y-34,760,68);c.fillStyle=col||GOLD;c.fillRect(W/2-380,y+30,760,5);tx(c,s,W/2,y,30,FN.P,'#fff',{sw:7});c.restore()}
function corner(c,idx,F){return idx===0?LC:RC}
function crowdWord(c,lt,t0,x,y,word,col){const u=lt-t0;if(u<0||u>1.1)return;const a=u<.12?u/.12:clamp((1.1-u)/.3,0,1);tx(c,word,x+Math.sin(u*10)*3,y-u*40,38,FN.B,col||'#fff',{sc:.8+Math.min(.4,u*3),sw:8,a,rot:(hs(Math.floor(t0*7),1)-.5)*.3,gl:col||'#fff'})}

/* ---------- scenes ---------- */
function sceneTitle(c,B,seg,lt,au){
 FX.arena(c,B.tpl,lt,au,B);c.save();c.globalAlpha=.7;FX.godRays(c,W/2,H*.42,lt,GOLD,.14);c.restore();
 const [sx,sy]=FX.shake(lt,.2,14,.5),[sx2,sy2]=FX.shake(lt,.55,18,.5);c.save();c.translate(sx+sx2,sy+sy2);
 FX.slamText(c,'BEAT',W/2,H*.3,170,lt,.2,'#fff',{gl:LC,ex:6});FX.slamText(c,'BATTLE',W/2,H*.5,190,lt,.55,GOLD,{gl:'#ff7a1a',ex:7});c.restore();
 FX.flashFx(c,lt,.2,.35,'#fff',.7);FX.flashFx(c,lt,.55,.4,'#ffe28a',.8);FX.rings(c,W/2,H*.45,lt,.55,GOLD,3,1);
 if(IM.crown){const u=eb((lt-.9)/.7);if(u>0){const cw=IM.crown.width*.22*u,ch=IM.crown.height*.22*u;c.save();c.translate(W/2,H*.11+Math.sin(lt*2.4)*5);c.rotate(-.08+Math.sin(lt*1.7)*.04);c.shadowColor=GOLD;c.shadowBlur=34;c.drawImage(IM.crown,-cw/2,-ch/2,cw,ch);c.restore()}}
 const fmt=B.format==='team'?'TEAM WAR  '+Math.floor(B.fighters.length/2)+' V '+Math.floor(B.fighters.length/2):roundName(B,B.kind==='champion'?B.rounds.length-1:(B.cur||0));
 const ep=(B.title&&B.title!=='BEAT BATTLE'?B.title+'   ':'')+(B.episodeLabel||'');
 tx(c,fmt,W/2,H*.7,34,FN.P,'#fff',{sw:8,a:clamp((lt-1.3)/.4,0,1),gl:LC});if(ep.trim())tx(c,ep.trim().slice(0,60),W/2,H*.77,20,FN.O,GOLD,{sw:5,ls:3,a:clamp((lt-1.6)/.4,0,1)});
 const fs=B.fighters,n=Math.min(fs.length,10),sz=n>8?100:120;for(let i=0;i<n;i++){const f=fs[i],u=eb((lt-1.1-i*.06)/.5);if(u<=0)continue;FX.portrait(c,f,W/2+(i-(n-1)/2)*(sz*.95),H-sz*.52+(1-u)*160,sz,{a:clamp(u*2,0,1)})}
 fadeEnds(c,lt,seg.dur,.15,.3)}
function sceneBracket(c,B,seg,lt,au){
 FX.arena(c,B.tpl,lt,au,B);c.fillStyle='rgba(4,3,12,.42)';c.fillRect(0,0,W,H);
 const cur=B.cur||0;FX.drawBracket(c,B,lt,{curMatch:-1});
 const champ=B.kind==='champion';const label=champ?(B.format==='team'?'THE TEAM RESULT':'THE FINAL RESULT'):(B.format==='team'?'EPISODE '+(cur+1)+':  TEAM WAR':'ROUND '+(cur+1)+':  '+roundName(B,cur));
 tx(c,B.format==='team'?'TEAM WAR':'THE BRACKET',W/2,44,38,FN.A,'#fff',{sw:8,ls:6,gl:LC,sc:.9+.1*eb(lt/.5)});
 if(lt>4){const u=eb((lt-4)/.5);c.save();c.globalAlpha=clamp(u*2,0,1);c.translate(W/2,H-78);c.scale(u,u);c.fillStyle='rgba(6,4,16,.92)';rr(c,-330,-34,660,68,14);c.fill();c.strokeStyle=GOLD;c.lineWidth=4;c.stroke();tx(c,label,0,0,26,FN.P,GOLD,{sw:6});c.restore()}
 const R=B.rounds[B.format==='team'?0:cur]||[];if(!champ&&lt>5.2){const rg=B.range||[0,R.length];tx(c,(rg[1]-rg[0])+(rg[1]-rg[0]===1?' MATCH':' MATCHES')+' TODAY. YOU DECIDE!',W/2,H-24,16,FN.P,'#fff',{sw:5,a:clamp((lt-5.2)/.4,0,1)})}
 fadeEnds(c,lt,seg.dur,.2,.3)}
function sceneIntro(c,B,seg,lt,au){
 const M=B.rounds[seg.r][seg.m],A=B.fighters[M.a],Bf=B.fighters[M.b];FX.arena(c,B.tpl,lt,au,B);
 const [sx,sy]=FX.shake(lt,1.75,16,.5),[fx2,fy2]=FX.shake(lt,3.7,12,.5);c.save();c.translate(sx+fx2,sy+fy2);
 topBanner(c,(B.format==='team'?'MATCH ':'ROUND '+(seg.r+1)+'  MATCH ')+(B.format==='team'?seg.m+1:seg.m+1),lt,GOLD);
 const ua=eb((lt-.1)/.7),ub=eb((lt-.25)/.7),bob=Math.sin(lt*3)*5;
 FX.portrait(c,A,lerp(-340,330,ua),420+bob,470,{glow:LC});FX.portrait(c,Bf,lerp(W+340,W-330,ub),420-bob,470,{glow:RC});
 if(lt>.8){const u=clamp((lt-.8)/.4,0,1);FX.plate(c,330,650,430,A,LC,{a:u});FX.plate(c,W-330,650,430,Bf,RC,{a:u})}
 {const f=eo((lt-.3)/1.1);hpPair(c,B,M,f,f,128)}
 if((B.opts.talk==null?2:B.opts.talk)>0){if(lt>1.0)FX.bubble(c,seg.talk.preA,150,250,{w:360,al:'l',p:(lt-1.0)/.9,pop:(lt-1.0)/.25,tx:240,ty:300,col:LC});if(lt>2.45)FX.bubble(c,seg.talk.preB,W-150,250,{w:360,al:'r',p:(lt-2.45)/.9,pop:(lt-2.45)/.25,tx:W-240,ty:300,col:RC})}
 if(lt>1.7&&lt<3.55)slamV(c,lt,1.7)
 if(lt>3.7){const k=lt-3.7;tx(c,seg.call,W/2,H*.5,150,FN.A,'#fff',{sc:lerp(2.4,1,eo(k/.2)),a:clamp((1.1-k)/.3,0,1),sw:18,st:'#000',gl:GOLD,gb:50,ex:8,exc:'#7a1000'});FX.speedLines(c,lt,clamp(1-k*1.1,0,1),'#fff')}
 c.restore();FX.flashFx(c,lt,1.7,.3,'#fff',.55);FX.flashFx(c,lt,3.7,.4,'#ffe28a',.7);if(lt>1.7)FX.rings(c,W/2,H*.5,lt,1.7,GOLD,3,1.1);
 fadeEnds(c,lt,seg.dur,.12,.2);}
function slamV(c,lt,t0){const k=lt-t0,sc=k<.2?lerp(3.4,1,eo(k/.2)):1+Math.sin(k*9)*.03;tx(c,'VS',W/2,H*.45,190,FN.A,'#fff',{sc,sw:16,st:'#000',gl:GOLD,gb:60,ex:7,exc:'#4a1a00'})}
function hpPair(c,B,M,pa,pb,y0){y0=y0||52;const A=B.fighters[M.a],Bf=B.fighters[M.b];FX.hpbar(c,50,y0,470,pa,LC,'l');FX.hpbar(c,W-50-470,y0,470,pb,RC,'r');tx(c,A.name.replace('THE ',''),62,y0+18,17,FN.P,'#fff',{al:'left',sw:6});tx(c,Bf.name.replace('THE ',''),W-62,y0+18,17,FN.P,'#fff',{al:'right',sw:6})}
function scenePlay(c,B,seg,lt,au){
 const M=B.rounds[seg.r][seg.m],A=B.fighters[M.a],Bf=B.fighters[M.b],act=seg.side===0?A:Bf,oth=seg.side===0?Bf:A,col=seg.side===0?LC:RC,ocol=seg.side===0?RC:LC;
 FX.arena(c,B.tpl,lt,au,B);const bass=au.bass||0,loud=au.loud||0;
 const ax=seg.side===0?400:W-400,ox=seg.side===0?W-170:170,pulse=1+bass*.12;
 c.save();c.globalCompositeOperation='lighter';const rg=FX.RG(c,ax,380,100,360+bass*140,[[0,col+'66'],[1,col+'00']]);c.fillStyle=rg;c.fillRect(0,0,W,H);c.restore();
 FX.portrait(c,oth,ox,470,260,{gray:true,a:.75,dy:Math.sin(lt*2)*4});
 FX.portrait(c,act,ax,390+Math.sin(lt*6)*3*bass,500*pulse,{glow:col,ga:.8});
 c.save();c.strokeStyle=col;c.globalAlpha=.55+bass*.4;c.lineWidth=5+bass*8;c.shadowColor=col;c.shadowBlur=24;c.beginPath();c.ellipse(ax,640,200+bass*60,38+bass*10,0,0,6.283);c.stroke();c.restore();
 {const ch=eo(lt/5),pu=Math.min(1,(loud||0)*1.6+bass*.5),en=clamp((.45+.55*ch)*(.82+.18*pu),0,1),dim=seg.side===0?1:.55+.45*(.82+.18*pu);hpPair(c,B,M,seg.side===0?en:Math.min(1,dim),seg.side===1?en:1)}
 const sw=seg.side===0?'BEAT 1':'BEAT 2';tx(c,sw,W/2,106,28,FN.P,col,{sw:7,gl:col});
 const ttl=String(act.beat&&act.beat.title||act.name).toUpperCase();tx(c,ttl.slice(0,26),W/2,170,Math.min(70,1300/Math.max(8,ttl.length)*1.3),FN.A,'#fff',{sw:9,ex:4,gl:col,ls:1});
 tx(c,[act.beat&&act.beat.bpm?act.beat.bpm+' BPM':'',act.beat&&act.beat.key||'',act.name].filter(Boolean).join('    '),W/2,232,20,FN.O,GOLD,{sw:5,ls:3});
 /* spectrum */
 c.save();c.globalCompositeOperation='lighter';const n=64,bw=(W-80)/n;for(let i=0;i<n;i++){const v=au.fd?au.fd[Math.floor(Math.pow(i/n,1.6)*260)]/255:bass*(.4+.6*Math.sin(i+lt*5)**2);const h=10+v*190;c.fillStyle=`hsla(${seg.side===0?190:330},100%,${55+v*20}%,${.45+v*.5})`;c.fillRect(40+i*bw+1,H-60-h,bw-2,h)}c.restore();
 c.fillStyle='rgba(255,255,255,.18)';c.fillRect(40,H-52,W-80,8);c.fillStyle=col;c.fillRect(40,H-52,(W-80)*clamp(lt/seg.dur,0,1),8);const sec=Math.floor(lt);tx(c,Math.floor(sec/60)+':'+String(sec%60).padStart(2,'0')+' / '+Math.floor(seg.dur/60)+':'+String(Math.floor(seg.dur)%60).padStart(2,'0'),W-40,H-30,16,FN.P,'#fff',{al:'right',sw:4});
 if(lt<1.1){const k=lt;tx(c,sw+'!',W/2,H*.5,130,FN.A,'#fff',{sc:lerp(2.2,1,eo(k/.2)),a:clamp((1.1-k)/.4,0,1),sw:14,gl:col,gb:50})}
 const words=TX.MID_BEAT;[.3,.62].forEach((f,i)=>{const t0=seg.dur*f,w=words[Math.floor(hs(seg.m*3+seg.side+i,seg.r+7)*words.length)];crowdWord(c,lt,t0,ax+(i?-170:170),300+i*60,w,col)});
 const [sx,sy]=FX.shake(lt,0,0,1);fadeEnds(c,lt,seg.dur,.2,.2)}
function sceneVote(c,B,seg,lt,au){
 const M=B.rounds[seg.r][seg.m],A=B.fighters[M.a],Bf=B.fighters[M.b];FX.arena(c,B.tpl,lt,au,B);c.fillStyle='rgba(4,3,12,.35)';c.fillRect(0,0,W,H);
 FX.slamText(c,seg.call,W/2,92,86,lt,.1,GOLD,{gl:'#ff9a1a',ex:5});
 const bob=Math.sin(lt*3)*6;FX.portrait(c,A,270,360+bob,380,{glow:LC});FX.portrait(c,Bf,W-270,360-bob,380,{glow:RC});
 tx(c,'1',270,590,120,FN.A,'#fff',{sw:14,gl:LC,gb:44,sc:1+.05*Math.sin(lt*6)});tx(c,'2',W-270,590,120,FN.A,'#fff',{sw:14,gl:RC,gb:44,sc:1+.05*Math.sin(lt*6+1)});
 tx(c,String(A.beat&&A.beat.title||A.name).toUpperCase().slice(0,18),270,670,26,FN.A,LC,{sw:6});tx(c,String(Bf.beat&&Bf.beat.title||Bf.name).toUpperCase().slice(0,18),W-270,670,26,FN.A,RC,{sw:6});
 tx(c,'COMMENT 1 OR 2',W/2,205,34,FN.P,'#fff',{sw:8,sc:1+.03*Math.sin(lt*5)});
 const cd=Math.max(1,5-Math.floor(clamp(lt-.6,0,5)));if(lt>.6&&lt<5.7){const f=1-((lt-.6)%1);tx(c,String(cd),W/2,400,230,FN.A,GOLD,{sw:20,gl:'#ff9a1a',gb:60,sc:1+.35*f*f,a:.5+.5*f,ex:8,exc:'#4a2a00'})}
 if(lt>.6)FX.bubble(c,'Vote 1 for '+String(A.beat&&A.beat.title||'my beat')+'!',90,290,{w:300,al:'l',p:(lt-.6)/.7,pop:(lt-.6)/.2,tx:200,ty:340,px:22,col:LC});
 if(lt>.9)FX.bubble(c,'Vote 2 for '+String(Bf.beat&&Bf.beat.title||'my beat')+'!',W-90,290,{w:300,al:'r',p:(lt-.9)/.7,pop:(lt-.9)/.2,tx:W-200,ty:340,px:22,col:RC});
 hud(c,B,lt,'LINK IN DESCRIPTION');fadeEnds(c,lt,seg.dur,.15,.25)}
/* ---------- the result: the vote, the finishing move and what they say ---------- */
function loserXf(kind,age){const u=clamp(age,0,3);switch(kind){
 case 'slam':return{dy:eo(u*1.6)*70,rot:eo(u*1.4)*.32,sy:1-eo(u)*.06,gray:u>.25,a:1,shk:Math.max(0,.4-u)};
 case 'sink':return{dy:eo(u*.8)*190,sy:1-eo(u*.8)*.45,gray:u>.3,a:1-eo(u*.7)*.45};
 case 'split':return{split:eo(u*1.4),gray:u>.4,a:1-eo((u-1.5)*1.2)*.4};
 case 'flip':return{rot:eo(u*.9)*PI*1.1,dy:eo(u*.9)*-60,sc:1-eo(u*.9)*.55,a:1-eo(u*.9)*.5,gray:u>.5};
 case 'squash':return{sy:1-eo(u*2.2)*.72,sx:1+eo(u*2.2)*.35,dy:eo(u*2.2)*120,gray:u>.5};
 case 'melt':return{melt:eo(u*.9),a:1-eo(u*.8)*.5,gray:u>.5};
 case 'bound':return{gray:u>.5,rot:Math.sin(u*30)*.03*(1-eo(u*.8)),dy:eo(u)*30};
 case 'shake':return{dx:Math.sin(age*60)*10*Math.max(0,1-age*1.4),gray:u>.6,dy:eo(u)*24};
 default:return{dy:eo(u*.8)*36,gray:u>.5,a:1,rot:.06*eo(u)}}}
function finishFx(c,fin,age,wx,wy,lx,ly,seed){const col=fin.col;
 switch(fin.fx){
  case 'shock':FX.rings(c,wx,wy,age,0,col,4,1.2);FX.rings(c,lx,ly,age,.1,'#fff',2,1.5);FX.speedLines(c,age,clamp(1-age*1.3,0,1),col);break;
  case 'crack':FX.crack(c,lx,ly,330,seed,clamp(age*3,0,1),'#fff');FX.rings(c,lx,ly,age,0,col,2,1.4);break;
  case 'bend':c.save();c.globalAlpha=.55*(1-clamp(age/1.2,0,1));c.fillStyle=FX.RG(c,lx,ly,40,560,[[0,'rgba(80,0,160,.95)'],[1,'rgba(80,0,160,0)']]);c.fillRect(0,0,W,H);c.restore();FX.rings(c,lx,ly+70,age,0,col,5,.9);break;
  case 'slice':{const u=clamp(age*5,0,1);c.save();c.strokeStyle='#fff';c.lineWidth=14*(1-clamp(age/.7,0,1));c.shadowColor='#fff';c.shadowBlur=30;c.lineCap='round';c.beginPath();c.moveTo(lx-300,ly-300);c.lineTo(lx-300+u*600,ly-300+u*600);c.stroke();c.restore();break}
  case 'flip':FX.rings(c,lx,ly,age,0,col,3,1.1);c.save();c.globalCompositeOperation='lighter';for(let i=0;i<24;i++){const an=i/24*6.283+age*8,r=60+age*320;c.fillStyle=col;c.globalAlpha=Math.max(0,1-age/1.2);c.fillRect(lx+Math.cos(an)*r,ly+Math.sin(an)*r*.6,5,5)}c.restore();break;
  case 'crush':{const u=eo(age*3.2);c.save();c.fillStyle='#8a8a98';c.strokeStyle='#000';c.lineWidth=5;const gap=lerp(300,-10,u);c.fillRect(lx-260,ly-gap-70,520,70);c.strokeRect(lx-260,ly-gap-70,520,70);c.fillRect(lx-260,ly+gap,520,70);c.strokeRect(lx-260,ly+gap,520,70);c.restore();FX.rings(c,lx,ly+120,age,.2,col,2,1.2);break}
  case 'melt':c.save();c.globalCompositeOperation='lighter';c.globalAlpha=Math.max(0,.55*(1-age/2));for(let k=0;k<9;k++){c.strokeStyle=`hsl(${k*40+age*200},100%,60%)`;c.lineWidth=14;c.beginPath();for(let x=0;x<=W;x+=16)c.lineTo(x,ly-250+k*62+Math.sin(x*.012+age*8+k)*26);c.stroke()}c.restore();break;
  case 'chains':{c.save();c.strokeStyle=col;c.lineWidth=7;c.shadowColor=col;c.shadowBlur=14;const r=lerp(300,170,eo(age*1.6));for(let i=0;i<22;i++){const an=i/22*6.283+age*2;c.save();c.translate(lx+Math.cos(an)*r,ly+Math.sin(an)*r*.8);c.rotate(an+PI/2);c.beginPath();c.ellipse(0,0,17,10,0,0,6.283);c.stroke();c.restore()}c.restore();break}
  case 'flurry':c.save();c.globalCompositeOperation='lighter';for(let i=0;i<18;i++){const t0=i*.045,u=age-t0;if(u<0||u>.4)continue;const x=lx+(hs(i,seed)-.5)*340,y=ly+(hs(i,seed+1)-.5)*360;FX.sparkle(c,x,y,40*(1-u/.4)+10,col)}c.restore();break;
  case 'snap':c.save();c.strokeStyle='#fff';c.shadowColor='#fff';c.shadowBlur=12;for(let k=0;k<10;k++){const an=k/10*6.283+hs(k,seed),u=clamp(age*4,0,1);c.globalAlpha=1-clamp(age/.7,0,1);c.lineWidth=6;c.beginPath();c.moveTo(lx+Math.cos(an)*60,ly+Math.sin(an)*60);c.lineTo(lx+Math.cos(an)*(60+u*340),ly+Math.sin(an)*(60+u*340));c.stroke()}c.restore();break;
  case 'raise':c.save();c.globalCompositeOperation='lighter';const g=c.createLinearGradient(wx,0,wx,H);g.addColorStop(0,'rgba(255,240,180,.55)');g.addColorStop(1,'rgba(255,240,180,0)');c.fillStyle=g;c.globalAlpha=clamp(age*2,0,1);c.beginPath();c.moveTo(wx-24,0);c.lineTo(wx+24,0);c.lineTo(wx+260,H);c.lineTo(wx-260,H);c.closePath();c.fill();c.restore();break;
  case 'gold':FX.godRays(c,wx,wy,age,'#ffd34a',.6);for(let i=0;i<20;i++){const an=i/20*6.283+age,r=190+Math.sin(age*5+i)*20;FX.sparkle(c,wx+Math.cos(an)*r,wy+Math.sin(an)*r*.8,10+hs(i,3)*14,'#fff2b0')}break;
  case 'upset':c.save();c.fillStyle='#3dffa0';for(let i=0;i<14;i++){const x=wx+(hs(i,1)-.5)*420,y=wy+240-((age*320+hs(i,2)*300)%520);c.globalAlpha=.9;c.beginPath();c.moveTo(x,y-22);c.lineTo(x+18,y+10);c.lineTo(x-18,y+10);c.closePath();c.fill()}c.restore();FX.rings(c,wx,wy,age,0,'#3dffa0',3,1.2);break}}
function sceneRecap(c,B,seg,lt,au){
 const M=B.rounds[seg.r][seg.m],A=B.fighters[M.a],Bf=B.fighters[M.b],n=lt*(7/seg.rd),w=seg.w,loserIdx=w===M.a?M.b:M.a,pa=pctOf(M),fin=seg.fin;
 const ax=300,bx=W-300,wx=w===M.a?ax:bx,lx=w===M.a?bx:ax,cy=395,wcol=w===M.a?LC:RC,lcol=w===M.a?RC:LC;
 FX.arena(c,B.tpl,lt,au,B);c.fillStyle='rgba(4,3,12,.4)';c.fillRect(0,0,W,H);
 const impact=2.5,age=n-impact;const [sx,sy]=n>impact&&n<impact+.6?FX.shake(n,impact,(B.opts.fx&&B.opts.fx.shake===0)?0:20,.6):[0,0];c.save();c.translate(sx,sy);
 const prog=clamp((n-.7)/1.5,0,1),shownA=pa*eo(prog),shownB=(1-pa)*eo(prog);
 const lx2=loserXf(fin.lose,age),aOver=n>impact?(w===M.a?{}:lx2):{},bOver=n>impact?(w===M.b?{}:lx2):{};
 const winnerXf=n>impact?{sc:1+.14*eb(clamp((age-.2)/.5,0,1))+.02*Math.sin(n*6),dy:-18*eo(age/.5)}:{};
 const drawF=(F,x,col,over,isW)=>{const o=Object.assign({glow:col,sc:1,dy:Math.sin(n*3)*4},isW&&n>impact?winnerXf:{},!isW&&n>impact?over:{});if(o.gray&&o.glow)o.glow=null;if(o.dx)x+=o.dx;FX.portrait(c,F,x,cy,430,o)};
 drawF(A,ax,LC,aOver,w===M.a);drawF(Bf,bx,RC,bOver,w===M.b);
 /* hp bars drain on the loser */
 const drain=n>impact?clamp(age/.9,0,1):0,keep=fin.id==='photo'||fin.id==='decision'?.18:0,lp=lerp(1,keep,eo(drain));
 hpPair(c,B,M,w===M.a?1:lp,w===M.b?1:lp);
 if(n>=impact)finishFx(c,fin,age,wx,cy,lx,cy,seg.m*7+seg.r);
 /* the vote bar */
 const by=H-66,bw2=700,bx0=W/2-bw2/2;c.save();c.fillStyle='rgba(0,0,0,.75)';c.fillRect(bx0-6,by-6,bw2+12,40);c.fillStyle=LC;c.fillRect(bx0,by,bw2*shownA/(shownA+shownB||1),28);c.fillStyle=RC;c.fillRect(bx0+bw2*shownA/(shownA+shownB||1),by,bw2*shownB/(shownA+shownB||1),28);c.strokeStyle='#fff';c.lineWidth=3;c.strokeRect(bx0-6,by-6,bw2+12,40);c.restore();
 tx(c,Math.round(pa*100*eo(prog))+'%',bx0-40,by+14,32,FN.A,LC,{al:'right',sw:7});tx(c,Math.round((1-pa)*100*eo(prog))+'%',bx0+bw2+40,by+14,32,FN.A,RC,{al:'left',sw:7});
 const tot=(M.va||0)+(M.vb||0);if(tot>0)tx(c,Math.round(tot*eo(prog)).toLocaleString()+' VOTES',W/2,by-26,18,FN.P,'#fff',{sw:5});
 const rc=TX.RESULT_CALL[(seg.m+seg.r)%TX.RESULT_CALL.length];
 if(n<impact)tx(c,n<.7?'RESULTS':rc,W/2,110,n<.7?66:38,FN.P,GOLD,{sw:9,sc:1+.03*Math.sin(n*8),gl:'#ff9a1a'});
 if(n>=impact){slamFinish(c,fin,n,impact,W/2,215)}
 if(n>3.5){const u=clamp((n-3.5)/.5,0,1);c.save();c.globalAlpha=u;c.translate(wx,122);c.scale(eb(u),eb(u));tx(c,'WINNER',0,0,34,FN.P,GOLD,{sw:8,gl:GOLD});c.restore()}
 c.restore();
 if(n>=impact){FX.flashFx(c,n,impact,.4,fin.col,.75);const fxs=B.opts.fx||{};if(n>3&&fxs.confetti!==0&&fin.id!=='photo')FX.confetti(c,n,3.1,seg.m+3,60,3.4)}
 const talkOn=(B.opts.talk==null?2:B.opts.talk)>0;if(talkOn){if(n>3.7)FX.bubble(c,seg.talk.win,wx+(w===M.a?-110:110),250,{w:330,al:w===M.a?'l':'r',p:(n-3.7)/.9,pop:(n-3.7)/.25,tx:wx,ty:300,col:wcol});if(n>5.2)FX.bubble(c,seg.talk.lose,lx+(w===M.a?110:-110),270,{w:320,al:w===M.a?'r':'l',p:(n-5.2)/.9,pop:(n-5.2)/.25,tx:lx,ty:320,col:lcol,px:22})}
 hud(c,B,lt,'ROUND '+(seg.r+1)+' RESULT');fadeEnds(c,lt,seg.dur,.2,.25)}
function slamFinish(c,fin,n,t0,x,y){const k=n-t0;if(k<0)return;const px=fin.n.length>10?90:118;tx(c,fin.n,x,y,px,FN.A,'#fff',{sc:k<.16?lerp(3,1,eo(k/.16)):1+Math.sin(k*12)*.03*Math.max(0,1-k),sw:16,st:'#000',gl:fin.col,gb:60,ex:7,exc:'#1a0000',a:clamp((3.2-k)/.5,0,1)})}
function sceneChamp(c,B,seg,lt,au){
 const w=seg.w;if(w==null){FX.arena(c,B.tpl,lt,au,B);return}const F=B.fighters[w],cx=W/2,cy=H*.54,sz=540;
 FX.arena(c,B.tpl,lt,au,B);c.fillStyle='rgba(2,2,8,.5)';c.fillRect(0,0,W,H);FX.godRays(c,cx,cy,lt,GOLD,Math.min(.5,lt*.3));
 const [sx,sy]=FX.shake(lt,2.5,22,.6);c.save();c.translate(sx,sy);
 if(seg.runner!=null)FX.portrait(c,B.fighters[seg.runner],170,H*.7,230,{gray:true,a:.7});
 FX.portrait(c,F,cx,cy+Math.sin(lt*2)*5,sz,{glow:GOLD,ga:.9,sc:1+.03*eb(clamp((lt-2.5)/.5,0,1))});
 /* the crown falls onto the head */
 if(IM.crown){const u=clamp((lt-2.0)/.6,0,1),yEnd=cy-sz*.5+40,cw=IM.crown.width*.36,ch=IM.crown.height*.36,y=lerp(-300,yEnd,eb(u));if(lt>1.9){c.save();c.translate(cx+8,y);c.rotate(lerp(-.7,-.08,eo(u)));c.shadowColor=GOLD;c.shadowBlur=40;c.drawImage(IM.crown,-cw/2,-ch/2,cw,ch);c.restore()}}
 /* the trophy rises */
 if(IM.trophy){const u=eo(clamp((lt-3.4)/1.2,0,1)),th=IM.trophy.height*.46,tw=IM.trophy.width*.46,y=lerp(H+th,H*.6,u);if(lt>3.3){c.save();c.shadowColor=GOLD;c.shadowBlur=50;c.drawImage(IM.trophy,W*.84-tw/2,y-th/2,tw,th);c.restore()}}
 c.restore();
 if(lt>2.5){FX.flashFx(c,lt,2.5,.5,'#ffe28a',.85);FX.rings(c,cx,cy-sz*.3,lt,2.5,GOLD,4,1)}
 const fxs=B.opts.fx||{};if(fxs.confetti!==0)FX.confetti(c,lt,2.6,11,140,9);FX.fireworks(c,lt,3.0,5,10);
 FX.slamText(c,'THE CHAMPION',W/2,80,92,lt,.5,GOLD,{gl:'#ff9a1a',ex:6});tx(c,B.title&&B.title!=='BEAT BATTLE'?B.title:'BEAT BATTLE',24,30,16,FN.P,'#fff',{al:'left',sw:5,a:clamp((lt-1.2)/.4,0,1)});if(seg.team)tx(c,seg.team,W/2,140,30,FN.P,'#fff',{sw:8,gl:GOLD,a:clamp((lt-1.4)/.4,0,1)});
 FX.plate(c,cx,H-70,520,F,GOLD,{a:clamp((lt-4)/.5,0,1)});
 if((B.opts.talk==null?2:B.opts.talk)>0&&lt>5)FX.bubble(c,seg.line,cx-250,200,{w:380,al:'r',p:(lt-5)/1.2,pop:(lt-5)/.25,tx:cx-130,ty:300,col:GOLD});
 if(lt>7){const u=eb((lt-7)/.5);c.save();c.globalAlpha=clamp(u*2,0,1);c.translate(W-250,H-150);c.scale(u,u);c.fillStyle='rgba(6,4,16,.92)';rr(c,-230,-40,460,80,14);c.fill();c.strokeStyle=GOLD;c.lineWidth=4;c.stroke();tx(c,'GET THE CHAMPION BEAT',0,-12,17,FN.P,'#fff',{sw:5});tx(c,'MZPRD.COM',0,18,26,FN.A,GOLD,{sw:6,ls:3});c.restore()}
 fadeEnds(c,lt,seg.dur,.4,.5)}
function sceneOutro(c,B,seg,lt,au){
 FX.arena(c,B.tpl,lt,au,B);c.fillStyle='rgba(4,3,12,.5)';c.fillRect(0,0,W,H);
 if(seg.champion){FX.slamText(c,'THANKS FOR WATCHING',W/2,170,70,lt,.2,GOLD,{gl:'#ff9a1a'});FX.confetti(c,lt,.3,21,60,6)}
 else{FX.slamText(c,'WHO MOVES ON?',W/2,120,100,lt,.2,GOLD,{gl:'#ff9a1a',ex:6});tx(c,seg.tease,W/2,210,24,FN.P,'#fff',{sw:7,a:clamp((lt-.8)/.4,0,1),sc:1+.02*Math.sin(lt*5)})}
 c.save();c.translate(W/2,H*.56);c.scale(.62,.62);c.translate(-W/2,-H/2);FX.drawBracket(c,B,Math.min(6,lt+3),{});c.restore();
 const u=eb((lt-.9)/.5);c.save();c.globalAlpha=clamp(u*2,0,1);c.translate(W/2,H-88);c.scale(u*(1+.03*Math.sin(lt*6)),u*(1+.03*Math.sin(lt*6)));c.fillStyle='#e0242f';rr(c,-260,-34,520,68,14);c.fill();c.strokeStyle='#fff';c.lineWidth=4;c.stroke();tx(c,'SUBSCRIBE + VOTE IN COMMENTS',0,-9,14,FN.P,'#fff',{sw:0});tx(c,'BEATS: MZPRD.COM',0,19,15,FN.P,'#ffe28a',{sw:0});c.restore();
 fadeEnds(c,lt,seg.dur,.2,.5)}
const SCENES={title:sceneTitle,bracket:sceneBracket,intro:sceneIntro,play:scenePlay,vote:sceneVote,recap:sceneRecap,champ:sceneChamp,outro:sceneOutro};
let XC=null;
function one(c,B,seg,lt,au){c.save();c.clearRect(0,0,W,H);(SCENES[seg.type]||sceneTitle)(c,B,seg,lt,au);FX.vignette(c,.55);c.restore()}
function drawFrame(c,B,tl,T,au){const {seg,i,lt}=segAt(tl,T);au=au||{bass:0,loud:0,fd:null};one(c,B,seg,lt,au);const X=.5,nx=tl.segs[i+1],left=seg.dur-lt;
 if(nx&&left<X){if(!XC){XC=document.createElement('canvas');XC.width=W;XC.height=H}const k=eo(1-left/X);one(XC.getContext('2d'),B,nx,0,au);c.save();c.globalAlpha=k;c.drawImage(XC,0,0);c.restore()}return seg}
window.MZBattleScenes={build,segAt,drawFrame,roundName,pctOf,winnerOf,SCENES};
})();
