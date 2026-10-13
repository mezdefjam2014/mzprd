/* MZPRD MPC studio: SAMPLE TO BEAT, stage 1 = the sample chopper.
   Upload a sample; the tool finds the tempo, picks the best 4 bars, cuts it at its natural hits into 8-16 slices and puts them on the pads.
   Click a pad to hear its slice. (Stage 2: East Coast drum variations; stage 3: the whole thing shown on the MPC video.)
   Everything lives in this file and in one optional settings group, so it can be switched off or removed on its own. */
(function(){
'use strict';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const HOP=256,WIN=1024;
const PAD_NAMES=['PERC 1','PERC 2','PERC 3','PERC 4','RIDE 1','RIDE 2','CRASH 1','CRASH 2','TOM 1','TOM 2','TOM 3','TOM 4','HIHAT','SNARE 1','SNARE 2','BASS'];
/* pad number on the machine (1 = bottom left) to the position in the top-row-first list */
const padIdx=p=>{const r=Math.floor((p-1)/4),c=(p-1)%4;return (3-r)*4+c};

/* ---------- listening ---------- */
function mono(buf){const n=buf.length,o=new Float32Array(n),L=buf.getChannelData(0),R=buf.numberOfChannels>1?buf.getChannelData(1):L;for(let i=0;i<n;i++)o[i]=(L[i]+R[i])*.5;return o}
function fluxOf(x,sr){const F=Math.max(0,Math.floor((x.length-WIN)/HOP)),e=new Float32Array(F);
 for(let f=0;f<F;f++){let s=0;const o=f*HOP;for(let i=0;i<WIN;i+=2)s+=x[o+i]*x[o+i];e[f]=Math.sqrt(s/(WIN/2))}
 const lg=new Float32Array(F);for(let f=0;f<F;f++)lg[f]=Math.log(e[f]+1e-4);
 const fl=new Float32Array(F);for(let f=3;f<F;f++)fl[f]=Math.max(0,lg[f]-Math.min(lg[f-2],lg[f-3]));
 return{fl,e,F,fps:sr/HOP}}
function pickPeaks(fl,fps){const F=fl.length,W=Math.round(1.2*fps),out=[];const pre=new Float64Array(F+1),pre2=new Float64Array(F+1);for(let i=0;i<F;i++){pre[i+1]=pre[i]+fl[i];pre2[i+1]=pre2[i]+fl[i]*fl[i]}
 const gap=Math.round(.09*fps);let last=-99;
 for(let f=3;f<F-3;f++){if(fl[f]<fl[f-1]||fl[f]<=fl[f+1]||fl[f]<.18)continue;const a=Math.max(0,f-W),b=Math.min(F,f+W),n=b-a,m=(pre[b]-pre[a])/n,sd=Math.sqrt(Math.max(0,(pre2[b]-pre2[a])/n-m*m));if(fl[f]<m+.7*sd)continue;
  if(f-last<gap){const q=out[out.length-1];if(q&&fl[f]>q.s){q.f=f;q.s=fl[f];last=f}continue}out.push({f,s:fl[f]});last=f}
 return out}
/* tempo: comb filter over the onset curve, biased toward hip hop tempos so it does not jump to double or half time */
function tempoOf(fl,fps){const F=fl.length;let best=0,bs=-1;const sc=[];
 for(let bpm=62;bpm<=190;bpm+=.5){const per=fps*60/bpm;let s=0,n=0;for(let k=0;k<Math.floor(F/per)&&k<64;k++){const p=k*per,i=Math.floor(p),fr=p-i;if(i+1>=F)break;s+=fl[i]*(1-fr)+fl[i+1]*fr;n++}
  const prior=Math.exp(-Math.pow(Math.log(bpm/92)/.42,2));sc.push([bpm,(n?s/n:0)*(.6+.4*prior)])}
 sc.forEach(([b,v])=>{if(v>bs){bs=v;best=b}});
 /* if half or double of the winner is nearly as strong, prefer the one in the 78..105 pocket */
 const get=b=>{let m=0;sc.forEach(([x,v])=>{if(Math.abs(x-b)<1.5&&v>m)m=v});return m};
 let bpm=best;for(const c of [best/2,best*2]){if(c>=62&&c<=190&&c>=78&&c<=105&&get(c)>.88*bs)bpm=c}
 return Math.round(bpm*2)/2}
/* where the beat grid starts, so slices line up with the groove */
/* slow a sample down: play it slower like a turntable (pitch drops with the speed), then optionally pitch it back up by 'up' semitones
   with a time-stretch (WSOLA) so the length stays slowed. rate < 1 = slower. */
async function slowBuf(buf,rate,up){const sr=buf.sampleRate,f=rate*Math.pow(2,(up||0)/12),len=Math.ceil(buf.length/f);
 const oc=new OfflineAudioContext(buf.numberOfChannels,len,sr),src=oc.createBufferSource();src.buffer=buf;src.playbackRate.value=f;src.connect(oc.destination);src.start();let rs=await oc.startRendering();
 const k=f/rate;if(Math.abs(k-1)<1e-3)return rs;return stretch(rs,k)}
function stretch(b,k){const sr=b.sampleRate,N=2048,Ha=N/2,Hs=Math.round(Ha*k),tol=Math.round(sr*.012),C=b.numberOfChannels,inL=b.length,outL=Math.ceil(inL*k),win=new Float32Array(N);for(let i=0;i<N;i++)win[i]=.5-.5*Math.cos(2*Math.PI*i/N);
 const mono=new Float32Array(inL);for(let c=0;c<C;c++){const d=b.getChannelData(c);for(let i=0;i<inL;i++)mono[i]+=d[i]/C}
 const out=[...Array(C)].map(()=>new Float32Array(outL+N)),norm=new Float32Array(outL+N);let prev=0;
 for(let o=0,m=0;o<outL;o+=Hs,m++){const nom=Math.round(o/k);let best=nom;if(m>0){const ref=prev+Hs;let bv=-1e9;for(let d=-tol;d<=tol;d+=2){const p=nom+d;if(p<0||p+N>inL)continue;let s=0;for(let i=0;i<N/2;i+=4)s+=mono[p+i]*mono[Math.min(inL-1,ref+i)];if(s>bv){bv=s;best=p}}}
  best=Math.max(0,Math.min(inL-N,best));for(let c=0;c<C;c++){const d=b.getChannelData(c),od=out[c];for(let i=0;i<N;i++)od[o+i]+=d[best+i]*win[i]}for(let i=0;i<N;i++)norm[o+i]+=win[i];prev=best}
 const res=new AudioBuffer({numberOfChannels:C,length:outL,sampleRate:sr});for(let c=0;c<C;c++){const od=out[c];for(let i=0;i<outL;i++)od[i]/=Math.max(norm[i],.1);res.copyToChannel(od.subarray(0,outL),c)}return res}
/* tempo written in the file name ("Waves 156 BPM", "90bpm", "loop_84_"), 0 when none */
function nameBpm(n){n=String(n||'');let m=n.match(/(\d{2,3}(?:\.\d+)?)\s*-?\s*bpm/i)||n.match(/bpm\s*-?\s*(\d{2,3}(?:\.\d+)?)/i)||n.match(/(?:^|[\s_\-(\[])(\d{2,3})(?=[\s_\-)\].]|$)/);const v=m?parseFloat(m[1]):0;return v>=60&&v<=200?v:0}
function gridPhase(fl,fps,bpm){const beat=fps*60/bpm,step=beat/4,F=fl.length;let bp=0,bv=-1;for(let ph=0;ph<beat;ph+=.5){let s=0;for(let t=ph;t<F-2;t+=step)s+=fl[Math.floor(t)];if(s>bv){bv=s;bp=ph}}return bp/fps}

/* move a cut to the true start of the hit: walk back to where the sound begins, then to the nearest zero crossing, so no slice starts mid-sound or clicks */
function snapAttack(x,sr,t){let i=Math.floor(t*sr);const a=Math.max(1,i-Math.floor(.012*sr)),b=Math.min(x.length-1,i+Math.floor(.012*sr));let mx=0;for(let k=a;k<b;k++)mx=Math.max(mx,Math.abs(x[k]));if(mx<1e-4)return t;const thr=mx*.18,lim=Math.max(1,i-Math.floor(.03*sr));
 let k=i;while(k>lim&&Math.abs(x[k])>thr)k--;while(k>lim&&Math.abs(x[k])>thr*.4)k--;
 const zl=Math.max(1,k-Math.floor(.002*sr));let z=k;for(let q=k;q>zl;q--)if(x[q]*x[q-1]<=0){z=q;break}
 return Math.max(0,z/sr-.001)}
/* ---------- chopping ---------- */
/* ---------- the groove map: where the sample's beats and sixteenths really fall ----------
   Real samples are not on a straight grid: they swing, push and lag. We measure it once and both the chops and the drums use it. */
const near=(pk,t,w)=>{let b=null;for(const p of pk){if(Math.abs(p.t-t)<w&&(!b||p.s>b.s))b=p}return b};
const median=a=>{if(!a.length)return null;const q=a.slice().sort((x,y)=>x-y),m=q.length>>1;return q.length%2?q[m]:(q[m-1]+q[m])/2};
/* the bar's first beat: the beat where the low end (kick, bass) hits hardest */
function downbeat(x,sr,ph,beat,dur){const a=Math.exp(-2*Math.PI*150/sr),xl=new Float32Array(x.length);let y=0;for(let i=0;i<x.length;i++){y=y*a+(1-a)*x[i];xl[i]=y}
 const {fl,fps}=fluxOf(xl,sr),at=t=>{const f=Math.round(t*fps),w=Math.round(.03*fps);let m=0;for(let k=Math.max(0,f-w);k<=Math.min(fl.length-1,f+w);k++)m=Math.max(m,fl[k]);return m};
 let bk=0,bv=-1;for(let k=0;k<4;k++){let v=0;for(let t=ph+k*beat;t<dur;t+=4*beat)v+=at(t)+.5*at(t+2*beat);if(v>bv){bv=v;bk=k}}return ph+bk*beat}
function grooveMap(pk,ws,beat,nb){const st=beat/4,nBeats=nb*4,W=Math.min(beat*.12,.04);
 /* careful on purpose: a timing is only used when the sample agrees with itself across its bars (a wrong guess would make the drums flam against the sample) */
 const agree=d=>{if(d.length<Math.max(2,nb))return 0;const m=median(d),mad=median(d.map(v=>Math.abs(v-m)));return mad<=.012?m:0};
 /* each beat of the bar: how early or late it sits (the same beat across the bars must agree) */
 const bo=[];for(let q=0;q<4;q++){const d=[];for(let k=0;k<nb;k++){const tb=ws+(k*4+q)*beat,p=near(pk,tb,W);if(p)d.push(p.t-tb)}bo.push(clamp(agree(d),-.03,.03))}
 /* the feel inside a beat: how late the 2nd, 3rd and 4th sixteenths sit (the sample's swing) */
 const cap=Math.min(st*.33,.045),sub=[0];for(let q=1;q<4;q++){const d=[];for(let b=0;b<nBeats;b++){const tn=ws+b*beat+bo[b&3]+q*st,p=near(pk,tn,Math.min(st*.3,.035));if(p)d.push(p.t-tn)}sub.push(clamp(agree(d),-cap,cap))}
 /* the swing number producers know: 50 = straight, 66 = full triplet swing */
 const sw=Math.round(50*(1+(sub[1]+sub[3])/2/st));
 const gm=[];for(let j=0;j<nBeats*4;j++)gm.push(bo[(j>>2)&3]+sub[j&3]);return{gm,swing:clamp(sw,40,75),beatOff:bo,sub}}
function chop(buf,n,opt){opt=opt||{};const sr=buf.sampleRate,x=mono(buf),{fl,F,fps}=fluxOf(x,sr),dur=buf.duration;
 /* a fast tempo in the file name (trap loops, 116+) is read at half-time, like a producer flips it: bars twice as long, real phrases on the pads */
 const hint=opt.hint>115?opt.hint/2:opt.hint,bpm0=opt.bpm||hint||tempoOf(fl,fps);let bpm=bpm0,exact=false;
 /* a producer loop is a whole number of bars: if the file length fits 1, 2, 4, 8... bars at about this tempo, use the exact tempo so the loop is sample-perfect */
 {let bk=0,be=9;for(let k=1;k<=128;k++){const e=Math.abs(k*240/dur-bpm0)/bpm0;if(e<be){be=e;bk=k}}if(bk&&be<(opt.bpm?.006:.012)){bpm=bk*240/dur;exact=true}}   /* a typed tempo is fine-tuned too, but only when it is within 0.6% */
 const beat=60/bpm,bar=beat*4,ph=exact?0:downbeat(x,sr,gridPhase(fl,fps,bpm)%beat,beat,dur),peaks=pickPeaks(fl,fps).map(p=>({t:(p.f*HOP+WIN*.28)/sr+.004,s:p.s}));
 /* the best 4 bars (or fewer if the sample is short): the window with the most musical activity, starting on the grid */
 const bars=dur>=bar*4+.5?4:dur>=bar*2+.4?2:1,len=bar*bars;let ws=0,wv=-1,auto=0;const parts=[];for(let t=ph;t+len<=dur+.01;t+=len){let s=0;for(const p of peaks)if(p.t>=t&&p.t<t+len)s+=p.s;parts.push({t,s});if(s>wv){wv=s;ws=t;auto=parts.length-1}}
 /* a chosen part (chop variations): any phrase of the sample, not only the busiest */
 const part=opt.part!=null&&parts[opt.part]?opt.part:auto;if(part!==auto){ws=parts[part].t;wv=parts[part].s}
 if(wv<0)ws=0;const we=Math.min(dur,ws+len);
 const G=grooveMap(peaks,ws,beat,bars),st16=beat/4,gT=j=>ws+j*st16+G.gm[((j%G.gm.length)+G.gm.length)%G.gm.length];
 let cand=peaks.filter(p=>p.t>=ws-.02&&p.t<we-.1);
 /* always start on the first hit of the window */
 const first=cand.find(p=>p.t<ws+beat*.6),start=first?first.t:ws;
 /* cut styles: 0 = normal, 1 = fewer and longer chops, 2 = more and shorter, 3 = cuts on the in-between hits */
 const style=opt.style|0;if(style===1)n=Math.max(4,Math.round(n*.5));
 const chosen=[{t:start,s:99}];const gap=style===1?Math.max(.4,beat*.9):style===2?Math.max(.14,beat*.25):Math.max(.2,beat*.45);
 const gfit=t=>{const k=Math.round((t-ws)/st16),d=Math.abs(t-gT(k));return d>.035?0:(k%4===0?.55:k%2===0?.3:.12)};
 /* cuts land on the beat grid: a hit off the sixteenth grid is a weak choice */
 cand.forEach(p=>{const g=gfit(p.t);p.w=p.s*(g?1+(style===3?(g<.5?.9:.1):g):.35)});
 cand.filter(p=>p!==first).sort((a,b)=>b.w-a.w).forEach(p=>{if(chosen.length>=n)return;if(chosen.every(c=>Math.abs(c.t-p.t)>=gap))chosen.push(p)});
 /* not enough natural hits: cut at the grid (eighths, then sixteenths) */
 for(const div of [2]){if(chosen.length>=n)break;const st=beat/div;for(let jj=0,t=gT(0);t<we-.1&&chosen.length<n;jj+=4/div,t=gT(jj)){if(chosen.every(c=>Math.abs(c.t-t)>=st*.7))chosen.push({t,s:0})}}
 chosen.sort((a,b)=>a.t-b.t);chosen.forEach(c=>{if(c.s)c.t=snapAttack(x,sr,c.t)});chosen.sort((a,b)=>a.t-b.t);
 const maxLen=Math.max(.6,beat*3),slices=chosen.map((c,i)=>{const nx=i<chosen.length-1?chosen[i+1].t-.003:we,t1=Math.min(nx,c.t+maxLen);return{i:i+1,t0:c.t,t1:Math.max(c.t+.12,t1),s:c.s,pad:i+5}});
 /* a short list of display peaks */
 const B=900,pk=new Float32Array(B*2),span=Math.floor(x.length/B);for(let b=0;b<B;b++){let mn=0,mx=0;for(let i=b*span;i<(b+1)*span;i+=4){const v=x[i];if(v<mn)mn=v;if(v>mx)mx=v}pk[b*2]=mn;pk[b*2+1]=mx}
 return{parts:parts.length,partScores:parts.map(q=>q.s),part,autoPart:auto,style,gm:G.gm,swing:G.swing,groove:G,bpm:Math.round(bpm*10)/10,bpmX:bpm,exact,beat,bar,bars,ws,we,slices,peaks:pk,dur,sr,grid:ph}}

/* ---------- playing a slice ---------- */
function playSlice(ctx,buf,sl,when,gain){const s=ctx.createBufferSource();s.buffer=buf;const g=ctx.createGain(),t=when||ctx.currentTime+.01,d=Math.max(.05,sl.t1-sl.t0);
 g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(gain==null?.9:gain,t+.006);g.gain.setValueAtTime(gain==null?.9:gain,t+Math.max(.007,d-.02));g.gain.linearRampToValueAtTime(.0001,t+d);
 s.connect(g);g.connect(ctx.destination);s.start(t,sl.t0,d+.01);return s}

/* ---------- the panel ---------- */
/* the last uploaded sample is kept in this browser (IndexedDB) so a page refresh does not lose it */
const IDB=(mode,fn)=>new Promise(res=>{try{const q=indexedDB.open('mzprd-s2b',1);q.onupgradeneeded=()=>q.result.createObjectStore('f');q.onsuccess=()=>{try{const tx=q.result.transaction('f',mode),r=fn(tx.objectStore('f'));tx.oncomplete=()=>res(r&&r.result);tx.onerror=()=>res(null)}catch(e){res(null)}};q.onerror=()=>res(null)}catch(e){res(null)}});
const keepSample=(name,ab)=>IDB('readwrite',st=>st.put({name,ab},'last'));
const lastSample=()=>IDB('readonly',st=>st.get('last'));
function mount(el,api){const ST=api.ST,esc=api.esc;ST.s2b=ST.s2b||{on:false,n:12,src:''};const Z=ST.s2b;Z.mk=Z.mk||{ov:1,btn:1,hb:1,lb:4,tb:0};if(Z.mk.roAuto===undefined)Z.mk.roAuto=1;Z.mk.roIds=Z.mk.roIds||[];   /* every chop order starts switched off */if(Z.n>12)Z.n=12;Z.fav=Z.fav||[];Z.vs=Z.vs||'all';Z.vk='all';   /* the old kit filter hid most beats; every beat now uses its own sounds, so it is gone */Z.pg=Z.pg||0;Z.used=Z.used||[];Z.mix=Z.mix||{on:0,glue:0,show:0,preset:'clean',sc:.35,lv:{sample:0,kick:0,snare:0,hat:0}};Z.dv=Z.dv||{hat:0,kick:0,fill:0,ghost:0};if(Z.slow===undefined){Z.slow=0;Z.slowTo=90;Z.up=0}let cvSig='',cvList=null,cvI=0,cvHist=[],backing=false,orig=null,CH=null,lastEp=null,lastEpId=0,buf=null,R=null,srcs=[],playing=false,fname='',selected=-1;
 const stop=()=>{srcs.forEach(s=>{try{s.stop()}catch(e){}});srcs=[];playing=false;paint()};
 el.innerHTML=`<label class="chk"><input type="checkbox" id="sbOn"> SAMPLE TO BEAT (OPTIONAL SERIES: UPLOAD A SAMPLE, THE TOOL CHOPS IT ON THE PADS)</label>
 <div id="sbBox">
  <div class="msg" style="margin-top:0">Upload a sample and the tool finds its tempo, takes the best 4 bars, cuts it at its natural hits and puts the slices on the pads (click a pad to hear its slice). Then browse your drum patterns made from it with your drum pack, and put your favorite in the video as a start-to-finish episode.</div>
  <label>SAMPLE FILE (MP3, WAV, M4A)</label><input type="file" id="sbFile" accept="audio/*">
  <div class="two"><div><label>HOW MANY CHOPS</label><select id="sbN"><option value="6">6 chops</option><option value="8">8 chops</option><option value="12">12 chops (every pad above the drums)</option></select></div><div><label>TEMPO (BPM, LEAVE EMPTY FOR AUTO)</label><input type="text" id="sbBpm" placeholder="auto"></div></div>
  <label class="chk"><input type="checkbox" id="sbSlow"> SLOW DOWN FAST SAMPLES (ONLY A SAMPLE FASTER THAN THE LIMIT IS SLOWED SO THE BEAT IS NOT TOO FAST)</label>
  <div class="two" id="sbSlowBox"><div><label>LIMIT / SLOW IT TO (BPM)</label><select id="sbSlowTo">${[80,85,88,90,92,95,100].map(v=>`<option value="${v}">${v} BPM</option>`).join('')}</select></div><div><label>PITCH IT BACK UP AFTER SLOWING</label><select id="sbUp"><option value="0">no (deeper, slowed record sound)</option><option value="-1">all the way (original key)</option><option value="-2">half way</option>${[1,2,3,4,5,6,7,8,9,10,11,12].map(v=>`<option value="${v}">+${v} semitone${v>1?'s':''}</option>`).join('')}</select></div></div>
  <label>WHERE THE SAMPLE COMES FROM (SHOWN IN THE DESCRIPTION)</label><input type="text" id="sbSrc" maxlength="80" placeholder="e.g. royalty-free soul loop, or my own recording">
  <div style="display:grid;grid-template-columns:1fr auto;gap:6px;margin-top:8px"><button class="btn big" id="sbGo">CHOP IT</button><button class="btn big" id="sbBack" title="Back to the previous chop" disabled>&#9664; BACK</button></div>
  <div class="msg" id="sbMsg">Upload a sample, then press CHOP IT.</div>
  <canvas id="sbWave" width="900" height="170" style="width:100%;display:none;background:#050506;border:1px solid #2a2a2e;margin-top:6px"></canvas>
  <div id="sbPads" style="display:none;grid-template-columns:repeat(4,1fr);gap:6px;margin-top:8px"></div>
  <div class="two" id="sbCtl" style="display:none;margin-top:8px"><button class="btn" id="sbAll">PLAY THE CHOPS IN ORDER</button><button class="btn" id="sbLoop">PLAY THE 4 BARS</button></div>
  <div id="sbVar" style="display:none">
   <h4 style="font:700 11px Montserrat;letter-spacing:.26em;color:var(--gold);margin:16px 0 8px">BEAT VARIATIONS (YOUR DRUM PATTERNS)</h4>
   <div class="msg" style="margin-top:0" id="sbKey"></div>
   <div class="two"><div><label>STYLE</label><select id="sbSty"><option value="all">All patterns</option><option value="fav">My picks</option></select></div><div><label>DRUM KIT</label><select id="sbKit"></select></div></div>
   <div class="two" style="margin-top:6px"><button class="btn" id="sbShuf">SHUFFLE THE ORDER</button><button class="btn" id="sbRand">SURPRISE ME (A BEAT NOT USED LATELY)</button></div>
   <div class="sub" style="margin:10px 0 4px;font:700 10px Montserrat;letter-spacing:.2em;color:#c9a14a">DRUM VARIATIONS (OPTIONAL, EACH BEAT GETS ITS OWN FIXED VERSION)</div>
   <div class="two"><label class="chk"><input type="checkbox" data-dv="hat"> HI-HAT RHYTHM FROM ANOTHER BEAT (OWN HAT SOUND)</label><label class="chk"><input type="checkbox" data-dv="kick"> EXTRA KICK IN BAR 4</label><label class="chk"><input type="checkbox" data-dv="fill"> SNARE FILL INTO EACH LOOP</label><label class="chk"><input type="checkbox" data-dv="ghost"> GHOST SNARES</label></div>
   <div class="sub" style="margin:10px 0 4px;font:700 10px Montserrat;letter-spacing:.2em;color:#c9a14a">MIX (OPTIONAL, ALL OFF = SOUNDS EXACTLY AS BEFORE)</div>
   <label class="chk"><input type="checkbox" id="mxOn"> AUTO-MIX THE BEAT (LEVELS, ROOM FOR THE KICK, KICK DUCK, LIMITER, YOUTUBE LOUDNESS)</label>
   <div id="mxBox"><label class="chk"><input type="checkbox" id="mxGlue"> DRUM GLUE + TAPE WARMTH</label><label class="chk"><input type="checkbox" id="mxShow"> SHOW THE MIXING ON THE MPC (HANDS MOVE THE FADER AND KNOB IN THE VIDEO)</label>
    <div class="two"><div><label>SOUND</label><select id="mxPre"><option value="clean">Clean</option><option value="punchy">Punchy</option><option value="dusty">Dusty (vintage)</option><option value="lofi">Lo-fi</option></select></div><div><label>KICK DUCK (SIDECHAIN)</label><select id="mxSc"><option value="0">off</option><option value="0.2">subtle</option><option value="0.35">medium</option><option value="0.6">strong</option></select></div></div>
    <div class="two">${['sample','kick','snare','hat'].map(k=>`<div><label>${k.toUpperCase()} LEVEL <span id="mxV_${k}"></span></label><input type="range" min="-6" max="6" step="1" data-lv="${k}" style="width:100%"></div>`).join('')}</div></div>
   <div id="sbList" style="margin-top:8px"></div>
   <div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px"><button class="btn" id="sbPrev">PREV</button><span class="msg" id="sbPg" style="margin:0"></span><button class="btn" id="sbNext">NEXT</button></div>
   <div class="msg" id="sbVMsg"></div>
   <div class="two" id="sbVCtl" style="display:none"><button class="btn" id="sbVStop">STOP</button><button class="btn" id="sbVWav">DOWNLOAD THIS BEAT (WAV, 16 BARS)</button></div>
   <h4 style="font:700 11px Montserrat;letter-spacing:.26em;color:var(--gold);margin:18px 0 8px">PUT IT IN THE VIDEO (THE "SAMPLE TO BEAT" EPISODE)</h4>
   <div class="msg" style="margin-top:0">Pick a beat above with its VIDEO button. The video shows the sample, the chopping, the chops on the pads, the drums added one layer at a time, then the full beat. Then use PLAY and RENDER on the left.</div>
   <label class="chk"><input type="checkbox" id="mkOv"> SHOW THE STEPS ON SCREEN (WAVEFORM, CUT LINES, "CHOP 3 > PAD 7", LAYER CHIPS)</label>
   <label class="chk"><input type="checkbox" id="mkBtn"> PRESS THE REAL BUTTONS WHILE CHOPPING (SOUNDS, SOFT KEYS, NUMBER KEYS, ENTER, THE DATA WHEEL TURNS)</label>
   <label class="chk"><input type="checkbox" id="mkHb"> HANDS PRESS THE BUTTONS TOO (DESK SCENES, NEEDS "HANDS TAPPING THE PADS" ON)</label>
   <label class="chk"><input type="checkbox" id="mkDr"> DROPS AND REBUILDS IN THE FULL BEAT (EVERY OTHER LOOP THE DRUMS DROP OUT BEHIND A SNARE ROLL, THEN SLAM BACK IN)</label>
   <label class="chk"><input type="checkbox" id="mkTb"> ALSO WRITE "TYPE BEAT" TITLES (USES THE "SOUNDS LIKE" ARTIST)</label>
   <div id="mkRoBox" class="roBox">
    <label class="chk roHead"><input type="checkbox" id="mkRo"> <b>CHOP ORDER VARIATIONS</b> <span class="roHint">new order in each flip loop, every 4th is the original</span></label>
    <div id="mkRoIn">
     <label class="chk roSafe"><input type="checkbox" id="mkRoAuto"> <span id="mkRoMsg">Safe orders only when the sample changes chords</span></label>
     <div id="mkRoList"></div>
     <div class="roKey"><span class="roBar">&#9646;</span> moves whole bars (skipped when the sample changes chords) &nbsp;&middot;&nbsp; <a href="#" id="mkRoPick">my picks</a> &middot; <a href="#" id="mkRoAll">all</a> &middot; <a href="#" id="mkRoNone">none</a></div>
    </div>
   </div>
   <style>
    .roBox{margin:10px 0;padding:10px 12px;border:1px solid #2a2a30;border-radius:4px}
    .roBox .chk{font:500 13px/1.4 Montserrat,sans-serif!important;letter-spacing:0!important;text-transform:none!important;color:#d6d6da;display:flex;align-items:flex-start;gap:7px}
    .roBox .chk input{margin-top:3px;flex:none}
    .roHead b{font:700 11px Montserrat;letter-spacing:.14em;color:#c9a14a}.roHead{flex-wrap:wrap}.roHead b{font-size:12px!important}.roHint{flex-basis:100%;margin:1px 0 0 22px;font:500 11px Montserrat;color:#8e8e94;letter-spacing:0;text-transform:none}
    .roSafe{margin:8px 0 4px;color:#c9c9ce;text-transform:none}
    .roG{display:flex;align-items:baseline;justify-content:space-between;margin:10px 0 4px;border-bottom:1px solid #222226;padding-bottom:3px}
    .roG span{font:700 11px Montserrat;letter-spacing:.14em;color:#b4b4ba}.roG small{font:500 11px Montserrat;color:#76767c;letter-spacing:0;margin-left:4px}
    .roG a,.roKey a{color:#c9a14a;text-decoration:none;font:600 12px Montserrat;margin-left:10px}
    .roGrid{display:grid;grid-template-columns:1fr 1fr;gap:2px 12px}
    .roGrid .chk{margin:3px 0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .roGrid .off{opacity:.38}
    .roBar{color:#c9a14a;font-size:10px;margin-left:3px}
    .roKey{margin-top:10px;font:500 12px/1.5 Montserrat;color:#8e8e94}
    @media(max-width:420px){.roGrid{grid-template-columns:1fr}}
   </style>
   <label>TIME PER DRUM LAYER</label><select id="mkLb"><option value="4">4 bars (longer, easier to follow)</option><option value="2">2 bars (shorter video)</option></select>
   <div class="two" style="margin-top:8px"><button class="btn big" id="mkGo">USE THE SELECTED BEAT IN THE VIDEO</button><button class="btn" id="mkBack">BACK TO THE NORMAL VIDEO</button></div>
   <div class="two" style="margin-top:6px"><button class="btn" id="mkWavAll" disabled>DOWNLOAD THE WHOLE EPISODE AUDIO (WAV)</button><button class="btn" id="mkWavFull" disabled>DOWNLOAD THE FULL BEAT ONLY (WAV)</button></div>
   <button class="btn" id="mkWavBuild" disabled style="width:100%;margin-top:6px">DOWNLOAD THE BUILD-UP AS ONE BEAT, NO BUTTON SOUNDS (WAV)</button>
   <div class="msg" id="mkMsg">Press VIDEO on a beat in the list above, or play one and press the big button.</div>
   <div id="mkPack"></div>
  </div>
  <div class="msg">Use samples you own, made yourself, or have cleared. A sample from someone else's record can get your video claimed by YouTube.</div>
 </div>`;
 const $=s=>el.querySelector(s),box=$('#sbBox');
 const show=()=>{box.style.display=Z.on?'block':'none'};$('#sbOn').checked=!!Z.on;show();$('#sbOn').onchange=e=>{Z.on=e.target.checked;show();api.save();api.thumbs&&api.thumbs()};
 const slowUI=()=>{$('#sbSlowBox').style.display=Z.slow?'':'none'};$('#sbSlow').checked=!!Z.slow;$('#sbSlow').onchange=e=>{Z.slow=e.target.checked?1:0;slowUI();api.save()};$('#sbSlowTo').value=String(Z.slowTo);$('#sbSlowTo').onchange=e=>{Z.slowTo=+e.target.value;api.save()};$('#sbUp').value=String(Z.up);$('#sbUp').onchange=e=>{Z.up=+e.target.value;api.save()};slowUI();
 $('#sbN').value=String(Z.n);$('#sbN').onchange=e=>{Z.n=+e.target.value;api.save()};$('#sbSrc').value=Z.src||'';$('#sbSrc').oninput=e=>{Z.src=e.target.value;api.save()};
 const msg=t=>{$('#sbMsg').textContent=t};
 $('#sbFile').onchange=async e=>{const f=e.target.files[0];if(!f)return;stop();msg('Reading '+f.name+'...');try{const ab=await f.arrayBuffer();keepSample(f.name,ab.slice(0));buf=orig=await api.ctx().decodeAudioData(ab);fname=f.name.replace(/\.[^.]+$/,'');R=null;msg('Loaded "'+fname+'" ('+buf.duration.toFixed(1)+' seconds). Press CHOP IT.')}catch(err){buf=null;msg('That file could not be read. Try an MP3 or WAV.')}};
 function paint(){const c=$('#sbWave');if(!R){c.style.display='none';$('#sbPads').style.display='none';$('#sbCtl').style.display='none';return}
  c.style.display='block';const x=c.getContext('2d'),W=c.width,H=c.height,k=W/R.dur;x.fillStyle='#050506';x.fillRect(0,0,W,H);
  /* the 4 bars window */
  x.fillStyle='rgba(224,36,47,.10)';x.fillRect(R.ws*k,0,(R.we-R.ws)*k,H);
  /* slices, colored */
  R.slices.forEach((s,i)=>{const hue=(i*47)%360;x.fillStyle='hsla('+hue+',80%,55%,'+(i===selected?.42:.2)+')';x.fillRect(s.t0*k,0,(s.t1-s.t0)*k,H);x.fillStyle='hsl('+hue+',80%,62%)';x.fillRect(s.t0*k,0,2,H);x.font='700 13px Montserrat';x.fillText(String(s.i),s.t0*k+5,14)});
  /* waveform */
  x.fillStyle='#d9d9dc';const B=R.peaks.length/2;for(let b=0;b<B;b++){const mn=R.peaks[b*2],mx=R.peaks[b*2+1],px=b*(W/B);x.fillRect(px,H/2+mn*H*.9,Math.max(1,W/B),Math.max(1,(mx-mn)*H*.9))}
  x.fillStyle='#8e8e94';x.font='500 11px Montserrat';x.fillText(R.bpm+' BPM / '+R.bars+' bars / '+R.slices.length+' chops',W-190,H-8);
  const g=$('#sbPads');g.style.display='grid';$('#sbCtl').style.display='grid';
  const byPad={};R.slices.forEach(s=>byPad[padIdx(s.pad)]=s);
  g.innerHTML=[...Array(16)].map((_,i)=>{const s=byPad[i];if(!s)return `<div style="padding:12px 4px;border:1px dashed #2a2a2e;text-align:center;font:600 9px Montserrat;color:#55555a">${PAD_NAMES[i]}<br>${i>=12?'drums':'empty'}</div>`;const hue=((s.i-1)*47)%360;return `<button class="btn" data-p="${s.i-1}" style="padding:12px 4px;border-color:hsl(${hue},70%,45%);background:hsla(${hue},70%,45%,${s.i-1===selected?.35:.12})"><b style="font:700 15px Montserrat">${s.i}</b><br><span style="font:600 9px Montserrat;letter-spacing:.1em;color:#c9c9ce">${PAD_NAMES[i]}</span><br><span style="font:500 9px Montserrat;color:#8e8e94">${(s.t1-s.t0).toFixed(2)}s</span></button>`}).join('');
  g.querySelectorAll('[data-p]').forEach(b=>b.onclick=()=>{const i=+b.dataset.p;selected=i;stop();srcs.push(playSlice(api.ctx(),buf,R.slices[i]));paint()});
  $('#sbAll').textContent=playing==='all'?'STOP':'PLAY THE CHOPS IN ORDER';$('#sbLoop').textContent=playing==='loop'?'STOP':'PLAY THE 4 BARS'}
 $('#sbGo').onclick=async()=>{if(!buf){msg('Upload a sample first.');return}stop();msg('Listening and chopping...');await new Promise(r=>setTimeout(r,30));
  const bp=parseFloat($('#sbBpm').value);try{buf=orig;
  /* every tap of CHOP IT is the next variation of the same sample (another part, another cut style); a new sample or new settings start again at the best one */
  const sig=fname+'|'+(orig&&orig.length)+'|'+$('#sbBpm').value+'|'+Z.n+'|'+Z.slow+'|'+Z.slowTo+'|'+Z.up;if(sig!==cvSig){cvSig=sig;cvList=null;cvHist=[]}else if(!backing)cvHist.push(cvI);
  if(!backing)cvI=cvList?(cvI+1)%cvList.length:0;backing=false;
  const o1={bpm:bp>40&&bp<220?bp:0,hint:nameBpm(fname)};if(cvList){Object.assign(o1,cvList[cvI])}R=chop(buf,Z.n,o1);
  if(!cvList){/* strongest parts first, with the other cut styles mixed in early so variety comes quickly */const rank=[...Array(R.parts)].map((_,i)=>i).sort((a,b)=>R.partScores[b]-R.partScores[a]),A=rank.filter(p=>p!==R.autoPart).map(p=>({part:p,style:0})),B=[];for(const p of rank)for(let st=1;st<4;st++)B.push({part:p,style:st});const L=[{}];while(A.length||B.length){if(A.length)L.push(A.shift());if(B.length)L.push(B.shift())}cvList=L}let slowNote='';
  /* a sample faster than the limit is slowed to it (whole sample, like slowing the record), then pitched back up if asked */
  if(Z.slow&&R.bpmX>Z.slowTo+.5){const from=R.bpmX,rate=Z.slowTo/from,drop=-12*Math.log2(rate),up=Z.up===-1?drop:Z.up===-2?drop/2:Math.min(Z.up,drop);msg('Slowing the sample from '+R.bpm+' to '+Z.slowTo+' BPM...');await new Promise(r=>setTimeout(r,30));
   buf=await slowBuf(orig,rate,up);R=chop(buf,Z.n,Object.assign({hint:from*rate},cvList[cvI]));slowNote=' (slowed from '+(Math.round(from*10)/10)+' BPM, '+(up>0?'pitched back up '+up.toFixed(1)+' of '+drop.toFixed(1)+' semitones':'pitch down '+drop.toFixed(1)+' semitones')+')'}selected=-1;paint();Z.last={bpm:R.bpm,chops:R.slices.length,name:fname};api.save();if(window.__s2bAfter)window.__s2bAfter();const STY=['','fewer, longer chops','more, shorter chops','cuts on the in-between hits'];$('#sbBack').disabled=!cvHist.length;Z.last.part=cvI?R.part+1:0;
  msg((cvI?'Variation '+(cvI+1)+' of '+cvList.length+': part '+(R.part+1)+' of '+R.parts+(R.style?', '+STY[R.style]:'')+'. ':'Best chop (part '+(R.part+1)+' of '+R.parts+'). Tap CHOP IT again for another variation. ')+'Done: '+R.bpm+' BPM'+slowNote+', groove '+R.swing+'% swing, '+R.bars+' bars, '+R.slices.length+' chops'+(R.slices.length<Z.n?' (the sample only had that many clear hits)':'')+'. Click a pad to hear a chop.')}catch(err){console.warn(err);msg('Could not chop this sample: '+(err&&err.message||err))}};
 lastSample().then(async v=>{if(!v||!v.ab||buf)return;try{buf=orig=await api.ctx().decodeAudioData(v.ab.slice(0));fname=v.name.replace(/\.[^.]+$/,'');msg('Restored your last sample "'+fname+'" ('+buf.duration.toFixed(1)+' seconds). Press CHOP IT.')}catch(e){}});
 $('#sbBack').onclick=()=>{if(!cvHist.length)return;cvI=cvHist.pop();backing=true;$('#sbGo').onclick()};
 $('#sbAll').onclick=()=>{if(playing==='all'){stop();return}if(!R)return;stop();const a=api.ctx(),t0=a.currentTime+.05;let t=t0;R.slices.forEach(s=>{srcs.push(playSlice(a,buf,s,t));t+=(s.t1-s.t0)+.04});playing='all';paint();setTimeout(()=>{if(playing==='all'){playing=false;paint()}},(t-t0+.3)*1000)};
 $('#sbLoop').onclick=()=>{if(playing==='loop'){stop();return}if(!R)return;stop();const a=api.ctx(),s=a.createBufferSource();s.buffer=buf;s.connect(a.destination);s.start(a.currentTime+.05,R.ws,R.we-R.ws);srcs.push(s);playing='loop';paint();setTimeout(()=>{if(playing==='loop'){playing=false;paint()}},(R.we-R.ws+.3)*1000)};
 const D=()=>window.MZMpcDrums;let sel=0,vsrc=null,KEY=null,cache=new Map(),order=null,busy=false;
 const vstop=()=>{try{vsrc&&vsrc.stop()}catch(e){}vsrc=null;paintV()};
 const ids=()=>{const d=D();let a=[...Array(d.COUNT)].map((_,i)=>i+1).filter(i=>i>d.HALF);if(false);else if(Z.vs==='fav')a=a.filter(i=>Z.fav.includes(i));if(Z.vk!=='all')a=a.filter(i=>String(d.dnaOf(i).kit)===String(Z.vk));if(order)a=a.slice().sort((x,y)=>order[x]-order[y]);return a};
 const label=i=>{const d=D().dnaOf(i);return{t:'#'+i+'  '+(d.style==='trap'?'TRAP':'EAST COAST')+'  /  '+d.kitName,s:R.bpm+' BPM  /  groove '+(R.swing||50)+'%  /  '+({loop:'sample loop',flip:'chop flip',sparse:'sparse chops'}[d.mode])+(R.part!==R.autoPart?'  /  part '+(R.part+1):'')+(Z.mix&&Z.mix.on?'  /  '+Z.mix.preset+' mix':'')+(Z.mk.roOn&&roList().length&&d.mode==='flip'?'  /  chop orders':'')}};
 function paintV(){const v=$('#sbVar');if(!R||!D()){v.style.display='none';return}v.style.display='block';$('#sbKey').textContent='Key of the sample: '+(KEY?KEY.name:'...')+". The beats keep the sample's tempo and add swing, ghost notes and a producer feel (Premier, Pete Rock, Dilla and more).";
  const kitSel=$('#sbKit');(kitSel.closest('div')||kitSel).style.display='none';if(!kitSel.options.length){kitSel.innerHTML='<option value="all">All kits</option>'+D().KITS.map((k,i)=>k.style==='trap'?'':`<option value="${i}">${k.style==='trap'?'Trap':'East Coast'}: ${k.n}</option>`).join('');kitSel.value=String(Z.vk)}
  $('#sbSty').value=Z.vs;const a=ids(),per=10,pages=Math.max(1,Math.ceil(a.length/per));Z.pg=clamp(Z.pg,0,pages-1);const pg=a.slice(Z.pg*per,(Z.pg+1)*per);
  $('#sbList').innerHTML=pg.length?pg.map(i=>{const L=label(i),fav=Z.fav.includes(i);return `<div class="it" style="align-items:center;${i===sel?'background:#17140c':''}"><button data-f="${i}" style="font-size:14px;padding:4px 8px;${fav?'color:var(--gold);border-color:var(--gold)':''}">${fav?'&#9733;':'&#9734;'}</button><b style="white-space:normal;min-width:0">${esc(L.t)}<br><small style="color:#8e8e94;font-weight:500">${esc(L.s)}</small></b><button data-p="${i}">${i===sel&&vsrc?'STOP':'PLAY'}</button><button data-v="${i}" title="Use this beat in the video">VIDEO</button></div>`}).join(''):'<div class="msg">'+(D().COUNT?'Nothing here. Tap the star on some beats first.':'No drum patterns yet. They will be made from your own drum loops (converted to MIDI). Add your drum loop folder to bring them back.')+'</div>';
  $('#sbPg').textContent='page '+(Z.pg+1)+' of '+pages+' ('+a.length+' beats)';$('#sbVCtl').style.display='grid';
  $('#sbList').querySelectorAll('[data-f]').forEach(b=>b.onclick=()=>{const i=+b.dataset.f,k=Z.fav.indexOf(i);if(k>=0)Z.fav.splice(k,1);else Z.fav.push(i);api.save();paintV()});
  $('#sbList').querySelectorAll('[data-p]').forEach(b=>b.onclick=()=>playVar(+b.dataset.p));
  $('#sbList').querySelectorAll('[data-v]').forEach(b=>b.onclick=()=>makeEp(+b.dataset.v))}
 /* the chop orders the video would use (same rule as the episode) */
 const roList=()=>{const L=(Z.mk.roOn&&Z.mk.roIds.length)?Z.mk.roIds.slice():[];return (Z.mk.roAuto&&CH&&!CH.uniform&&D())?L.filter(i=>D().RO_SAFE.includes(i)):L};
 async function renderVar(i){D().setVar(Z.dv);D().setMix(Z.mix);const rl=roList(),key=i+'|'+R.bpm+'|'+R.ws+'|'+R.slices.length+'|'+buf.length+'|'+JSON.stringify(Z.dv)+JSON.stringify(Z.mix)+rl.join(',');if(cache.has(key))return cache.get(key);const d=D(),dna=d.dnaOf(i),pl=d.plan(dna,R,KEY);let out;
  /* with chop orders on, the preview plays the original loop, then the loop in the first chosen order (like the video's flip loops) */
  if(rl.length&&pl.chopMode==='flip'){const pl2=d.plan(Object.assign({},dna,{mode:'flip',fv:1,seed:dna.seed+131,ro:rl[0]}),R,KEY),a=await d.render(buf,R,pl,{loops:1}),b=await d.render(buf,R,pl2,{loops:1}),sr=a.sampleRate,la=Math.round(pl.loopLen*sr);out=new AudioBuffer({numberOfChannels:2,length:la+b.length,sampleRate:sr});for(let c=0;c<2;c++){const o=out.getChannelData(c);o.set(a.getChannelData(c).subarray(0,la),0);o.set(b.getChannelData(c),la)}}
  else out=await d.render(buf,R,pl,{loops:2});cache.set(key,{out,pl});if(cache.size>8)cache.delete(cache.keys().next().value);return{out,pl}}
 async function playVar(i){if(busy)return;if(i===sel&&vsrc){vstop();return}vstop();stop();sel=i;busy=true;$('#sbVMsg').textContent='Making beat #'+i+'...';paintV();
  try{const{out}=await renderVar(i),a=api.ctx(),s=a.createBufferSource();s.buffer=out;s.connect(a.destination);s.onended=()=>{if(vsrc===s){vsrc=null;paintV()}};s.start(a.currentTime+.05);vsrc=s;const L=label(i);$('#sbVMsg').textContent='Playing '+L.t+'  ('+out.duration.toFixed(1)+' s)'}catch(err){console.warn(err);$('#sbVMsg').textContent='Could not make this beat: '+(err&&err.message||err)}busy=false;paintV()}
 $('#sbSty').onchange=e=>{Z.vs=e.target.value;Z.pg=0;api.save();paintV()};$('#sbKit').onchange=e=>{Z.vk=e.target.value;Z.pg=0;api.save();paintV()};
 $('#sbPrev').onclick=()=>{Z.pg--;paintV()};$('#sbNext').onclick=()=>{Z.pg++;paintV()};
 $('#sbShuf').onclick=()=>{order={};const seed=Math.random();for(let i=1;i<=500;i++){const q=Math.sin(i*12.9898+seed*78.233)*43758.5453;order[i]=q-Math.floor(q)}Z.pg=0;paintV()};
 $('#sbRand').onclick=()=>{const a=ids();if(!a.length)return;const fresh=a.filter(i=>!Z.used.includes(i)&&i!==sel),pool=(fresh.length?fresh:a).slice(0,20);const i=pool[Math.floor(Math.random()*pool.length)];const k=a.indexOf(i);Z.pg=Math.floor(k/10);playVar(i)};
 /* a new order for every sample: beats that suit its tempo come first, beats used in recent episodes go to the back */
 const freshOrder=()=>{const d=D(),P=d.pat?d.pat():null;let h=2166136261;for(const c of (fname||'x')+R.bpm)h=Math.imul(h^c.charCodeAt(0),16777619);order={};for(let i=1;i<=d.COUNT;i++){let z=Math.imul((h^Math.imul(i,0x9E3779B1))>>>0,0x85EBCA6B);z^=z>>>13;z=Math.imul(z,0xC2B2AE35);z^=z>>>16;const rnd=(z>>>0)/4294967296,pb=P&&P[i-1]&&P[i-1].bpm,fit=pb?Math.min(...[pb,pb/2,pb*2].map(v=>Math.abs(Math.log2(v/R.bpm)))):.2,u=Z.used.indexOf(i);order[i]=rnd+fit*2+(u>=0?3-u*.05:0)}Z.pg=0};
 const mxUI=()=>{const m=Z.mix;$('#mxOn').checked=!!m.on;$('#mxBox').style.display=m.on?'':'none';$('#mxGlue').checked=!!m.glue;$('#mxShow').checked=!!m.show;$('#mxPre').value=m.preset;$('#mxSc').value=String(m.sc);document.querySelectorAll('#sbBox [data-lv]').forEach(r=>{r.value=m.lv[r.dataset.lv]||0;$('#mxV_'+r.dataset.lv).textContent=(r.value>0?'+':'')+r.value+' dB'})};
 const mxSet=f=>{f(Z.mix);cache=new Map();api.save();mxUI();liveUpd()};
 $('#mxOn').onchange=e=>mxSet(m=>m.on=e.target.checked?1:0);$('#mxGlue').onchange=e=>mxSet(m=>m.glue=e.target.checked?1:0);$('#mxShow').onchange=e=>mxSet(m=>m.show=e.target.checked?1:0);
 $('#mxPre').onchange=e=>mxSet(m=>m.preset=e.target.value);$('#mxSc').onchange=e=>mxSet(m=>m.sc=+e.target.value);
 document.querySelectorAll('#sbBox [data-lv]').forEach(r=>r.onchange=e=>mxSet(m=>m.lv[r.dataset.lv]=+e.target.value));mxUI();
 document.querySelectorAll('#sbBox [data-dv]').forEach(c=>{c.checked=!!Z.dv[c.dataset.dv];c.onchange=e=>{Z.dv[c.dataset.dv]=e.target.checked?1:0;cache=new Map();api.save();liveUpd()}});
 $('#sbVStop').onclick=vstop;
 $('#sbVWav').onclick=async()=>{if(!R||!sel)return;$('#sbVMsg').textContent='Rendering 16 bars for download...';const d=D(),dna=d.dnaOf(sel);d.setVar(Z.dv);d.setMix(Z.mix);const pl=d.plan(dna,R,KEY),out=await d.render(buf,R,pl,{loops:4}),a=document.createElement('a');a.href=URL.createObjectURL(d.wav(out));a.download=(fname||'sample')+' - beat '+sel+'.wav';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),8000);$('#sbVMsg').textContent='Downloaded.'};
 const mk=Z.mk,mset=()=>{$('#mkOv').checked=!!mk.ov;$('#mkBtn').checked=!!mk.btn;$('#mkHb').checked=!!mk.hb;$('#mkTb').checked=!!mk.tb;$('#mkDr').checked=!!mk.dr;$('#mkRo').checked=!!mk.roOn;$('#mkRoAuto').checked=!!mk.roAuto;$('#mkLb').value=String(mk.lb)};
 const mmsg=t=>{$('#mkMsg').textContent=t};
 [['#mkOv','ov'],['#mkBtn','btn'],['#mkHb','hb'],['#mkTb','tb'],['#mkDr','dr'],['#mkRo','roOn'],['#mkRoAuto','roAuto']].forEach(([id,k])=>$(id).onchange=e=>{mk[k]=e.target.checked?1:0;api.save();if(k==='roOn'||k==='roAuto')paintRo();liveUpd()});$('#mkLb').onchange=e=>{mk.lb=+e.target.value;api.save();liveUpd()};
 let epBusy=false,updT=0;
 /* settings changed while an episode is loaded: rebuild it a moment after the last click, keep the play position */
 const liveUpd=()=>{cache=new Map();paintV();if(vsrc&&sel){const i=sel;vstop();playVar(i)}if(!lastEp)return;clearTimeout(updT);updT=setTimeout(async function go(){if(epBusy){updT=setTimeout(go,500);return}const cv=document.querySelector('#mScrub'),v=cv?cv.value:null;mmsg('Updating the video with the new settings...');await makeEp(lastEpId);if(cv&&v!=null){cv.value=v;cv.dispatchEvent(new Event('input'))}},900)};
 async function makeEp(i){if(!R||!buf){mmsg('Chop a sample first.');return}if(epBusy)return;if(!i)i=sel;if(!i){mmsg('Choose a beat: press VIDEO on one in the list.');return}epBusy=true;vstop();stop();sel=i;mmsg('Building the episode for beat #'+i+'...');await new Promise(r=>setTimeout(r,40));
  try{if(!window.MZMpcMake)await api.loadS('mpcmake.js?v=20');const d=D(),dna=d.dnaOf(i);d.setVar(Z.dv);d.setMix(Z.mix);Z.used=[i].concat(Z.used.filter(x=>x!==i)).slice(0,30);api.save();await api.ensureScene();
   const X=await window.MZMpcMake.build(buf,R,dna,KEY,{buttons:!!mk.btn,handsBtn:!!mk.hb,overlay:!!mk.ov,layerBars:mk.lb,intro:ST.intro?3.4:0,name:fname||'SAMPLE',typeBeat:!!mk.tb,drops:!!mk.dr,mixShow:!!(Z.mix.on&&Z.mix.show),partNo:(Z.last&&Z.last.part)||0,ro:mk.roOn?mk.roIds.slice():null,roChange:!!(mk.roAuto&&CH&&!CH.uniform)});
   Z.typeBeat=!!mk.tb;api.setEp(X);const P=window.MZMpcMake.pack(X,ST,{});
   const bits=[['TITLES',P.titles.map((t,j)=>'<div class="it"><b>'+esc(t)+'</b><small style="color:#8e8e94">'+t.length+'/100</small><button data-ct="'+j+'">COPY</button></div>').join('')],['DESCRIPTION','<textarea rows="12" id="mkD" style="font:500 12px/1.5 monospace">'+esc(P.desc)+'</textarea><button class="btn" id="mkCd" style="width:100%;margin-top:4px">COPY DESCRIPTION</button>'],['TAGS','<textarea rows="2" id="mkT" style="font:500 12px/1.5 monospace">'+esc(P.tags)+'</textarea><button class="btn" id="mkCt" style="width:100%;margin-top:4px">COPY TAGS</button>'],['PINNED COMMENT','<div class="it"><b>'+esc(P.pinned[0])+'</b><button data-cp="0">COPY</button></div><div class="it"><b>'+esc(P.pinned[1])+'</b><button data-cp="1">COPY</button></div><div class="it"><b>'+esc(P.pinned[2])+'</b><button data-cp="2">COPY</button></div>']];
   $('#mkPack').innerHTML='<h4 style="font:700 11px Montserrat;letter-spacing:.26em;color:var(--gold);margin:16px 0 6px">EPISODE TITLES AND DESCRIPTION</h4>'+bits.map(b=>'<div class="sub" style="margin:10px 0 4px;font:700 10px Montserrat;letter-spacing:.2em;color:#c9a14a">'+b[0]+'</div>'+b[1]).join('')+(Z.src?'':'<div class="msg">Tip: fill in "where the sample comes from" above so it shows in the description.</div>');
   const cp=async(t,e)=>{const ok=await api.cpy(t);e.textContent=ok?'COPIED':'FAILED';setTimeout(()=>{if(e.dataset.l)e.textContent=e.dataset.l},1200)};
   $('#mkPack').querySelectorAll('[data-ct]').forEach(b=>{b.dataset.l='COPY';b.onclick=()=>cp(P.titles[+b.dataset.ct],b)});$('#mkPack').querySelectorAll('[data-cp]').forEach(b=>{b.dataset.l='COPY';b.onclick=()=>cp(P.pinned[+b.dataset.cp],b)});
   $('#mkCd').onclick=e=>cp($('#mkD').value,e.target);$('#mkCt').onclick=e=>cp($('#mkT').value,e.target);
   lastEp=X;lastEpId=i;$('#mkWavAll').disabled=false;$('#mkWavFull').disabled=false;$('#mkWavBuild').disabled=false;
   const M=X.make;mmsg('Episode ready: beat #'+i+' ('+M.style.toUpperCase().replace('EC','EAST COAST')+', '+M.kit+'), '+Math.floor(Math.round(M.total)/60)+':'+String(Math.round(M.total)%60).padStart(2,'0')+' long. Press PLAY on the left to watch it, or RENDER 16:9 / 9:16.')}
  catch(err){console.warn(err);mmsg('Could not build the episode: '+(err&&err.message||err))}epBusy=false}
 /* the beat exactly as it plays in the video: every layer, chop flip and drop, same audio the video uses */
 const epWav=full=>{if(!lastEp||!D())return;const B=lastEp.tracks[0].S.buf,M=lastEp.make,sr=B.sampleRate,a=full?Math.floor(M.fullT*sr):0,b=full?Math.min(B.length,Math.ceil((M.endMusic+1.4)*sr)):B.length,o=new AudioBuffer({numberOfChannels:B.numberOfChannels,length:b-a,sampleRate:sr});
  for(let c=0;c<B.numberOfChannels;c++){const d=B.getChannelData(c).slice(a,b),f=Math.min(d.length,Math.floor(sr*.25));for(let q=0;q<f;q++)d[d.length-1-q]*=q/f;o.copyToChannel(d,c)}
  api.dlf(D().wav(o),(fname||'sample').replace(/\.[^.]+$/,'')+' - beat '+lastEpId+(full?' - full beat':' - episode')+'.wav')};
 $('#mkWavBuild').onclick=async()=>{if(!lastEp||!lastEp.make.renderClean)return;const b=$('#mkWavBuild');b.disabled=true;mmsg('Rendering the build-up without the button sounds...');try{const o=await lastEp.make.renderClean(),sr=o.sampleRate,f=Math.min(o.length,Math.floor(sr*.25));for(let c=0;c<o.numberOfChannels;c++){const d=o.getChannelData(c);for(let q=0;q<f;q++)d[d.length-1-q]*=q/f}api.dlf(D().wav(o),(fname||'sample').replace(/\.[^.]+$/,'')+' - beat '+lastEpId+' - build-up, no button sounds.wav');mmsg('Done: the build-up as one beat, '+Math.round(o.duration)+' s.')}catch(e){console.warn(e);mmsg('Could not render it: '+(e&&e.message||e))}b.disabled=false};
 $('#mkWavAll').onclick=()=>epWav(false);$('#mkWavFull').onclick=()=>epWav(true);
 $('#mkGo').onclick=()=>makeEp(sel);$('#mkBack').onclick=()=>{api.setEp(null);mmsg('Back to the normal video.')};mset();
 /* the list of chop orders, grouped; the ones that move whole bars are marked and are skipped automatically when the sample changes chords */
 /* short names for the 20 orders (the full description shows on hover) */
 const RO_SHORT=['','Swap neighbours','Rotate by one','Rotate by half','Last slice first','Skip one, play it last','Echo the opener','Swap in pairs','Mirror first half','Swap bars 1-3 / 2-4','Question and answer','Bars back to front','Alternate two bars','Half bar 1 + half bar 3','Repeat bar 2','Strongest on the one','Start on beat 2','Build up 1-2-3','Peel down','Strongest only','Reorder bars 1-3'];
 const paintRo=()=>{$('#mkRoIn').style.display=mk.roOn?'':'none';if(!D()||!D().RO){$('#mkRoList').innerHTML='<div class="roKey">Chop the sample first.</div>';return}const RO=D().RO,SAFE=D().RO_SAFE,box=$('#mkRoList'),G={light:['LIGHT','phrase stays recognizable'],medium:['MEDIUM','a clearly new phrase'],bigger:['BIGGER','use sparingly']},skip=!!(mk.roAuto&&CH&&!CH.uniform);let h='';
  ['light','medium','bigger'].forEach(g=>{const ids=[];for(let i=1;i<RO.length;i++)if(RO[i].g===g)ids.push(i);h+='<div class="roG"><span>'+G[g][0]+' <small>'+G[g][1]+'</small></span><span><a href="#" data-ga="'+g+'">all</a><a href="#" data-gn="'+g+'">none</a></span></div><div class="roGrid">'+ids.map(i=>{const bars=!SAFE.includes(i);return '<label class="chk'+(bars&&skip?' off':'')+'" title="'+esc(RO[i].n)+'"><input type="checkbox" data-ro="'+i+'"'+(mk.roIds.includes(i)?' checked':'')+'> '+esc(RO_SHORT[i]||RO[i].n)+(bars?'<span class="roBar">&#9646;</span>':'')+'</label>'}).join('')+'</div>'});
  box.innerHTML=h;box.querySelectorAll('[data-ro]').forEach(c=>c.onchange=()=>{const i=+c.dataset.ro,k=mk.roIds.indexOf(i);if(c.checked&&k<0)mk.roIds.push(i);if(!c.checked&&k>=0)mk.roIds.splice(k,1);api.save();liveUpd()});
  const grp=(g,on)=>{const ids=[];for(let i=1;i<RO.length;i++)if(RO[i].g===g)ids.push(i);roSet(on?[...new Set(mk.roIds.concat(ids))]:mk.roIds.filter(i=>!ids.includes(i)))};
  box.querySelectorAll('[data-ga]').forEach(a=>a.onclick=e=>{e.preventDefault();grp(a.dataset.ga,true)});box.querySelectorAll('[data-gn]').forEach(a=>a.onclick=e=>{e.preventDefault();grp(a.dataset.gn,false)});
  $('#mkRoMsg').textContent=CH?(CH.uniform?'Safe orders only when the sample changes chords (this one keeps one chord: all orders allowed)':'Safe orders only when the sample changes chords (this one does: ▮ orders are skipped)'):'Safe orders only when the sample changes chords'};
 const roSet=ids=>{mk.roIds=ids.slice();api.save();paintRo();liveUpd()};[['#mkRoPick',[1,5,6,10,15,20]],['#mkRoAll',[...Array(20)].map((_,i)=>i+1)],['#mkRoNone',[]]].forEach(([id,v])=>$(id).onclick=e=>{e.preventDefault();roSet(v)});
 const afterChop=async()=>{const was=vsrc&&sel?sel:0;if(was)vstop();try{if(!D())await api.loadS('mpcdrums.js?v=22');await D().loadPack();KEY=D().keyOf(buf,R.ws,R.we);try{CH=D().chordUniform(buf,R)}catch(e){CH=null}if(Z.last&&KEY)Z.last.key=KEY.name.replace(' minor','m').replace(' major','');api.thumbs&&api.thumbs();cache=new Map();sel=0;freshOrder();paintV();paintRo();if(was)playVar(was)}catch(e){console.warn(e);$('#sbVMsg').textContent='The drums did not load. Refresh the page.'}};
 window.__s2bAfter=afterChop;
 return{chop:()=>R,buf:()=>buf,stop,after:afterChop,key:()=>KEY,dev:{renderVar,playVar,makeEp}}}
window.MZMpcSample={slowBuf,chop,tempoOf,nameBpm,fluxOf,pickPeaks,playSlice,mount,padIdx,PAD_NAMES};
})();
