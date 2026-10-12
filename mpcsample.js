/* MZPRD MPC studio: SAMPLE TO BEAT, stage 1 = the sample chopper.
   Upload a sample; the tool finds the tempo, picks the best 4 bars, cuts it at its natural hits into 8-16 slices and puts them on the pads.
   Click a pad to hear its slice. (Stage 2: trap + East Coast drum variations; stage 3: the whole thing shown on the MPC video.)
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
function gridPhase(fl,fps,bpm){const beat=fps*60/bpm,step=beat/4,F=fl.length;let bp=0,bv=-1;for(let ph=0;ph<beat;ph+=.5){let s=0;for(let t=ph;t<F-2;t+=step)s+=fl[Math.floor(t)];if(s>bv){bv=s;bp=ph}}return bp/fps}

/* ---------- chopping ---------- */
function chop(buf,n,opt){opt=opt||{};const sr=buf.sampleRate,x=mono(buf),{fl,F,fps}=fluxOf(x,sr),dur=buf.duration;
 const bpm=opt.bpm||tempoOf(fl,fps),beat=60/bpm,bar=beat*4,ph=gridPhase(fl,fps,bpm),peaks=pickPeaks(fl,fps).map(p=>({t:(p.f*HOP+WIN*.28)/sr+.004,s:p.s}));
 /* the best 4 bars (or fewer if the sample is short): the window with the most musical activity, starting on the grid */
 const bars=dur>=bar*4+.5?4:dur>=bar*2+.4?2:1,len=bar*bars;let ws=0,wv=-1;for(let t=ph;t+len<=dur+.01;t+=bar){let s=0;for(const p of peaks)if(p.t>=t&&p.t<t+len)s+=p.s;if(s>wv){wv=s;ws=t}}
 if(wv<0)ws=0;const we=Math.min(dur,ws+len);
 let cand=peaks.filter(p=>p.t>=ws-.02&&p.t<we-.1);
 /* always start on the first hit of the window */
 const first=cand.find(p=>p.t<ws+beat*.6),start=first?first.t:ws;
 const chosen=[{t:start,s:99}];const gap=Math.max(.2,beat*.45);
 cand.filter(p=>p!==first).sort((a,b)=>b.s-a.s).forEach(p=>{if(chosen.length>=n)return;if(chosen.every(c=>Math.abs(c.t-p.t)>=gap))chosen.push(p)});
 /* not enough natural hits: cut at the grid (eighths, then sixteenths) */
 for(const div of [2,4]){if(chosen.length>=n)break;const st=beat/div;for(let t=ws;t<we-.1&&chosen.length<n;t+=st){if(chosen.every(c=>Math.abs(c.t-t)>=st*.7))chosen.push({t,s:0})}}
 chosen.sort((a,b)=>a.t-b.t);
 const maxLen=Math.max(.6,beat*3),slices=chosen.map((c,i)=>{const nx=i<chosen.length-1?chosen[i+1].t:we,t1=Math.min(nx,c.t+maxLen);return{i:i+1,t0:c.t,t1:Math.max(c.t+.12,t1),s:c.s,pad:i+1}});
 /* a short list of display peaks */
 const B=900,pk=new Float32Array(B*2),span=Math.floor(x.length/B);for(let b=0;b<B;b++){let mn=0,mx=0;for(let i=b*span;i<(b+1)*span;i+=4){const v=x[i];if(v<mn)mn=v;if(v>mx)mx=v}pk[b*2]=mn;pk[b*2+1]=mx}
 return{bpm,beat,bar,bars,ws,we,slices,peaks:pk,dur,sr,grid:ph}}

/* ---------- playing a slice ---------- */
function playSlice(ctx,buf,sl,when,gain){const s=ctx.createBufferSource();s.buffer=buf;const g=ctx.createGain(),t=when||ctx.currentTime+.01,d=Math.max(.05,sl.t1-sl.t0);
 g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(gain==null?.9:gain,t+.006);g.gain.setValueAtTime(gain==null?.9:gain,t+Math.max(.007,d-.02));g.gain.linearRampToValueAtTime(.0001,t+d);
 s.connect(g);g.connect(ctx.destination);s.start(t,sl.t0,d+.01);return s}

/* ---------- the panel ---------- */
function mount(el,api){const ST=api.ST,esc=api.esc;ST.s2b=ST.s2b||{on:false,n:12,src:''};const Z=ST.s2b;let buf=null,R=null,srcs=[],playing=false,fname='',selected=-1;
 const stop=()=>{srcs.forEach(s=>{try{s.stop()}catch(e){}});srcs=[];playing=false;paint()};
 el.innerHTML=`<label class="chk"><input type="checkbox" id="sbOn"> SAMPLE TO BEAT (OPTIONAL SERIES: UPLOAD A SAMPLE, THE TOOL CHOPS IT ON THE PADS)</label>
 <div id="sbBox">
  <div class="msg" style="margin-top:0">Stage 1: the chopper. Upload a sample and the tool finds its tempo, takes the best 4 bars, cuts it at its natural hits and puts the slices on the pads. Click a pad to hear its slice. Next stages add the trap and East Coast drums and put it all on the video.</div>
  <label>SAMPLE FILE (MP3, WAV, M4A)</label><input type="file" id="sbFile" accept="audio/*">
  <div class="two"><div><label>HOW MANY CHOPS</label><select id="sbN"><option value="8">8 chops</option><option value="12">12 chops</option><option value="16">16 chops (every pad)</option></select></div><div><label>TEMPO (BPM, LEAVE EMPTY FOR AUTO)</label><input type="text" id="sbBpm" placeholder="auto"></div></div>
  <label>WHERE THE SAMPLE COMES FROM (SHOWN IN THE DESCRIPTION)</label><input type="text" id="sbSrc" maxlength="80" placeholder="e.g. royalty-free soul loop, or my own recording">
  <button class="btn big" id="sbGo" style="margin-top:8px">CHOP IT</button>
  <div class="msg" id="sbMsg">Upload a sample, then press CHOP IT.</div>
  <canvas id="sbWave" width="900" height="170" style="width:100%;display:none;background:#050506;border:1px solid #2a2a2e;margin-top:6px"></canvas>
  <div id="sbPads" style="display:none;grid-template-columns:repeat(4,1fr);gap:6px;margin-top:8px"></div>
  <div class="two" id="sbCtl" style="display:none;margin-top:8px"><button class="btn" id="sbAll">PLAY THE CHOPS IN ORDER</button><button class="btn" id="sbLoop">PLAY THE 4 BARS</button></div>
  <div class="msg">Use samples you own, made yourself, or have cleared. A sample from someone else's record can get your video claimed by YouTube.</div>
 </div>`;
 const $=s=>el.querySelector(s),box=$('#sbBox');
 const show=()=>{box.style.display=Z.on?'block':'none'};$('#sbOn').checked=!!Z.on;show();$('#sbOn').onchange=e=>{Z.on=e.target.checked;show();api.save()};
 $('#sbN').value=String(Z.n);$('#sbN').onchange=e=>{Z.n=+e.target.value;api.save()};$('#sbSrc').value=Z.src||'';$('#sbSrc').oninput=e=>{Z.src=e.target.value;api.save()};
 const msg=t=>{$('#sbMsg').textContent=t};
 $('#sbFile').onchange=async e=>{const f=e.target.files[0];if(!f)return;stop();msg('Reading '+f.name+'...');try{const ab=await f.arrayBuffer();buf=await api.ctx().decodeAudioData(ab);fname=f.name.replace(/\.[^.]+$/,'');R=null;msg('Loaded "'+fname+'" ('+buf.duration.toFixed(1)+' seconds). Press CHOP IT.')}catch(err){buf=null;msg('That file could not be read. Try an MP3 or WAV.')}};
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
  g.innerHTML=[...Array(16)].map((_,i)=>{const s=byPad[i];if(!s)return `<div style="padding:12px 4px;border:1px dashed #2a2a2e;text-align:center;font:600 9px Montserrat;color:#55555a">${PAD_NAMES[i]}<br>empty</div>`;const hue=((s.i-1)*47)%360;return `<button class="btn" data-p="${s.i-1}" style="padding:12px 4px;border-color:hsl(${hue},70%,45%);background:hsla(${hue},70%,45%,${s.i-1===selected?.35:.12})"><b style="font:700 15px Montserrat">${s.i}</b><br><span style="font:600 9px Montserrat;letter-spacing:.1em;color:#c9c9ce">${PAD_NAMES[i]}</span><br><span style="font:500 9px Montserrat;color:#8e8e94">${(s.t1-s.t0).toFixed(2)}s</span></button>`}).join('');
  g.querySelectorAll('[data-p]').forEach(b=>b.onclick=()=>{const i=+b.dataset.p;selected=i;stop();srcs.push(playSlice(api.ctx(),buf,R.slices[i]));paint()});
  $('#sbAll').textContent=playing==='all'?'STOP':'PLAY THE CHOPS IN ORDER';$('#sbLoop').textContent=playing==='loop'?'STOP':'PLAY THE 4 BARS'}
 $('#sbGo').onclick=async()=>{if(!buf){msg('Upload a sample first.');return}stop();msg('Listening and chopping...');await new Promise(r=>setTimeout(r,30));
  const bp=parseFloat($('#sbBpm').value);try{R=chop(buf,Z.n,{bpm:bp>40&&bp<220?bp:0});selected=-1;paint();Z.last={bpm:R.bpm,chops:R.slices.length,name:fname};api.save();msg('Done: '+R.bpm+' BPM, '+R.bars+' bars, '+R.slices.length+' chops'+(R.slices.length<Z.n?' (the sample only had that many clear hits)':'')+'. Click a pad to hear a chop.')}catch(err){console.warn(err);msg('Could not chop this sample: '+(err&&err.message||err))}};
 $('#sbAll').onclick=()=>{if(playing==='all'){stop();return}if(!R)return;stop();const a=api.ctx(),t0=a.currentTime+.05;let t=t0;R.slices.forEach(s=>{srcs.push(playSlice(a,buf,s,t));t+=(s.t1-s.t0)+.04});playing='all';paint();setTimeout(()=>{if(playing==='all'){playing=false;paint()}},(t-t0+.3)*1000)};
 $('#sbLoop').onclick=()=>{if(playing==='loop'){stop();return}if(!R)return;stop();const a=api.ctx(),s=a.createBufferSource();s.buffer=buf;s.connect(a.destination);s.start(a.currentTime+.05,R.ws,R.we-R.ws);srcs.push(s);playing='loop';paint();setTimeout(()=>{if(playing==='loop'){playing=false;paint()}},(R.we-R.ws+.3)*1000)};
 return{chop:()=>R,buf:()=>buf,stop}}
window.MZMpcSample={chop,tempoOf,fluxOf,pickPeaks,playSlice,mount,padIdx,PAD_NAMES};
})();
