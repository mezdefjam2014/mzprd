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
function gridPhase(fl,fps,bpm){const beat=fps*60/bpm,step=beat/4,F=fl.length;let bp=0,bv=-1;for(let ph=0;ph<beat;ph+=.5){let s=0;for(let t=ph;t<F-2;t+=step)s+=fl[Math.floor(t)];if(s>bv){bv=s;bp=ph}}return bp/fps}

/* move a cut to the true start of the hit: walk back to where the sound begins, then to the nearest zero crossing, so no slice starts mid-sound or clicks */
function snapAttack(x,sr,t){let i=Math.floor(t*sr);const a=Math.max(1,i-Math.floor(.012*sr)),b=Math.min(x.length-1,i+Math.floor(.012*sr));let mx=0;for(let k=a;k<b;k++)mx=Math.max(mx,Math.abs(x[k]));if(mx<1e-4)return t;const thr=mx*.18,lim=Math.max(1,i-Math.floor(.03*sr));
 let k=i;while(k>lim&&Math.abs(x[k])>thr)k--;while(k>lim&&Math.abs(x[k])>thr*.4)k--;
 const zl=Math.max(1,k-Math.floor(.002*sr));let z=k;for(let q=k;q>zl;q--)if(x[q]*x[q-1]<=0){z=q;break}
 return Math.max(0,z/sr-.001)}
/* ---------- chopping ---------- */
function chop(buf,n,opt){opt=opt||{};const sr=buf.sampleRate,x=mono(buf),{fl,F,fps}=fluxOf(x,sr),dur=buf.duration;
 const bpm0=opt.bpm||tempoOf(fl,fps);let bpm=bpm0,exact=false;
 /* a producer loop is a whole number of bars: if the file length fits 1, 2, 4, 8... bars at about this tempo, use the exact tempo so the loop is sample-perfect */
 if(!opt.bpm){let bk=0,be=9;for(let k=1;k<=128;k++){const e=Math.abs(k*240/dur-bpm0)/bpm0;if(e<be){be=e;bk=k}}if(bk&&be<.012){bpm=bk*240/dur;exact=true}}
 const beat=60/bpm,bar=beat*4,ph=exact?0:gridPhase(fl,fps,bpm),peaks=pickPeaks(fl,fps).map(p=>({t:(p.f*HOP+WIN*.28)/sr+.004,s:p.s}));
 /* the best 4 bars (or fewer if the sample is short): the window with the most musical activity, starting on the grid */
 const bars=dur>=bar*4+.5?4:dur>=bar*2+.4?2:1,len=bar*bars;let ws=0,wv=-1;for(let t=ph;t+len<=dur+.01;t+=bar){let s=0;for(const p of peaks)if(p.t>=t&&p.t<t+len)s+=p.s;if(s>wv){wv=s;ws=t}}
 if(wv<0)ws=0;const we=Math.min(dur,ws+len);
 let cand=peaks.filter(p=>p.t>=ws-.02&&p.t<we-.1);
 /* always start on the first hit of the window */
 const first=cand.find(p=>p.t<ws+beat*.6),start=first?first.t:ws;
 const chosen=[{t:start,s:99}];const gap=Math.max(.2,beat*.45);
 const gfit=t=>{const q=(t-ph)/(beat/4),d=Math.abs(q-Math.round(q))*(beat/4),k=Math.round(q);return d>.035?0:(k%4===0?.55:k%2===0?.3:.12)};
 cand.forEach(p=>{p.w=p.s*(1+gfit(p.t))});
 cand.filter(p=>p!==first).sort((a,b)=>b.w-a.w).forEach(p=>{if(chosen.length>=n)return;if(chosen.every(c=>Math.abs(c.t-p.t)>=gap))chosen.push(p)});
 /* not enough natural hits: cut at the grid (eighths, then sixteenths) */
 for(const div of [2,4]){if(chosen.length>=n)break;const st=beat/div;for(let t=ws;t<we-.1&&chosen.length<n;t+=st){if(chosen.every(c=>Math.abs(c.t-t)>=st*.7))chosen.push({t,s:0})}}
 chosen.sort((a,b)=>a.t-b.t);chosen.forEach(c=>{if(c.s)c.t=snapAttack(x,sr,c.t)});chosen.sort((a,b)=>a.t-b.t);
 const maxLen=Math.max(.6,beat*3),slices=chosen.map((c,i)=>{const nx=i<chosen.length-1?chosen[i+1].t-.003:we,t1=Math.min(nx,c.t+maxLen);return{i:i+1,t0:c.t,t1:Math.max(c.t+.12,t1),s:c.s,pad:i+5}});
 /* a short list of display peaks */
 const B=900,pk=new Float32Array(B*2),span=Math.floor(x.length/B);for(let b=0;b<B;b++){let mn=0,mx=0;for(let i=b*span;i<(b+1)*span;i+=4){const v=x[i];if(v<mn)mn=v;if(v>mx)mx=v}pk[b*2]=mn;pk[b*2+1]=mx}
 return{bpm:Math.round(bpm*10)/10,bpmX:bpm,exact,beat,bar,bars,ws,we,slices,peaks:pk,dur,sr,grid:ph}}

/* ---------- playing a slice ---------- */
function playSlice(ctx,buf,sl,when,gain){const s=ctx.createBufferSource();s.buffer=buf;const g=ctx.createGain(),t=when||ctx.currentTime+.01,d=Math.max(.05,sl.t1-sl.t0);
 g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(gain==null?.9:gain,t+.006);g.gain.setValueAtTime(gain==null?.9:gain,t+Math.max(.007,d-.02));g.gain.linearRampToValueAtTime(.0001,t+d);
 s.connect(g);g.connect(ctx.destination);s.start(t,sl.t0,d+.01);return s}

/* ---------- the panel ---------- */
function mount(el,api){const ST=api.ST,esc=api.esc;ST.s2b=ST.s2b||{on:false,n:12,src:''};const Z=ST.s2b;Z.mk=Z.mk||{ov:1,btn:1,hb:1,lb:4,tb:0};if(Z.n>12)Z.n=12;Z.fav=Z.fav||[];Z.vs=Z.vs||'all';Z.vk=Z.vk||'all';Z.pg=Z.pg||0;let lastEp=null,lastEpId=0,buf=null,R=null,srcs=[],playing=false,fname='',selected=-1;
 const stop=()=>{srcs.forEach(s=>{try{s.stop()}catch(e){}});srcs=[];playing=false;paint()};
 el.innerHTML=`<label class="chk"><input type="checkbox" id="sbOn"> SAMPLE TO BEAT (OPTIONAL SERIES: UPLOAD A SAMPLE, THE TOOL CHOPS IT ON THE PADS)</label>
 <div id="sbBox">
  <div class="msg" style="margin-top:0">Upload a sample and the tool finds its tempo, takes the best 4 bars, cuts it at its natural hits and puts the slices on the pads (click a pad to hear its slice). Then browse your drum patterns made from it with your drum pack, and put your favorite in the video as a start-to-finish episode.</div>
  <label>SAMPLE FILE (MP3, WAV, M4A)</label><input type="file" id="sbFile" accept="audio/*">
  <div class="two"><div><label>HOW MANY CHOPS</label><select id="sbN"><option value="6">6 chops</option><option value="8">8 chops</option><option value="12">12 chops (every pad above the drums)</option></select></div><div><label>TEMPO (BPM, LEAVE EMPTY FOR AUTO)</label><input type="text" id="sbBpm" placeholder="auto"></div></div>
  <label>WHERE THE SAMPLE COMES FROM (SHOWN IN THE DESCRIPTION)</label><input type="text" id="sbSrc" maxlength="80" placeholder="e.g. royalty-free soul loop, or my own recording">
  <button class="btn big" id="sbGo" style="margin-top:8px">CHOP IT</button>
  <div class="msg" id="sbMsg">Upload a sample, then press CHOP IT.</div>
  <canvas id="sbWave" width="900" height="170" style="width:100%;display:none;background:#050506;border:1px solid #2a2a2e;margin-top:6px"></canvas>
  <div id="sbPads" style="display:none;grid-template-columns:repeat(4,1fr);gap:6px;margin-top:8px"></div>
  <div class="two" id="sbCtl" style="display:none;margin-top:8px"><button class="btn" id="sbAll">PLAY THE CHOPS IN ORDER</button><button class="btn" id="sbLoop">PLAY THE 4 BARS</button></div>
  <div id="sbVar" style="display:none">
   <h4 style="font:700 11px Montserrat;letter-spacing:.26em;color:var(--gold);margin:16px 0 8px">BEAT VARIATIONS (YOUR DRUM PATTERNS)</h4>
   <div class="msg" style="margin-top:0" id="sbKey"></div>
   <div class="two"><div><label>STYLE</label><select id="sbSty"><option value="all">All patterns</option><option value="fav">My picks</option></select></div><div><label>DRUM KIT</label><select id="sbKit"></select></div></div>
   <div class="two" style="margin-top:6px"><button class="btn" id="sbShuf">SHUFFLE THE ORDER</button><button class="btn" id="sbRand">PLAY A RANDOM ONE</button></div>
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
   <label>TIME PER DRUM LAYER</label><select id="mkLb"><option value="4">4 bars (longer, easier to follow)</option><option value="2">2 bars (shorter video)</option></select>
   <div class="two" style="margin-top:8px"><button class="btn big" id="mkGo">USE THE SELECTED BEAT IN THE VIDEO</button><button class="btn" id="mkBack">BACK TO THE NORMAL VIDEO</button></div>
   <div class="two" style="margin-top:6px"><button class="btn" id="mkWavAll" disabled>DOWNLOAD THE WHOLE EPISODE AUDIO (WAV)</button><button class="btn" id="mkWavFull" disabled>DOWNLOAD THE FULL BEAT ONLY (WAV)</button></div>
   <div class="msg" id="mkMsg">Press VIDEO on a beat in the list above, or play one and press the big button.</div>
   <div id="mkPack"></div>
  </div>
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
  g.innerHTML=[...Array(16)].map((_,i)=>{const s=byPad[i];if(!s)return `<div style="padding:12px 4px;border:1px dashed #2a2a2e;text-align:center;font:600 9px Montserrat;color:#55555a">${PAD_NAMES[i]}<br>${i>=12?'drums':'empty'}</div>`;const hue=((s.i-1)*47)%360;return `<button class="btn" data-p="${s.i-1}" style="padding:12px 4px;border-color:hsl(${hue},70%,45%);background:hsla(${hue},70%,45%,${s.i-1===selected?.35:.12})"><b style="font:700 15px Montserrat">${s.i}</b><br><span style="font:600 9px Montserrat;letter-spacing:.1em;color:#c9c9ce">${PAD_NAMES[i]}</span><br><span style="font:500 9px Montserrat;color:#8e8e94">${(s.t1-s.t0).toFixed(2)}s</span></button>`}).join('');
  g.querySelectorAll('[data-p]').forEach(b=>b.onclick=()=>{const i=+b.dataset.p;selected=i;stop();srcs.push(playSlice(api.ctx(),buf,R.slices[i]));paint()});
  $('#sbAll').textContent=playing==='all'?'STOP':'PLAY THE CHOPS IN ORDER';$('#sbLoop').textContent=playing==='loop'?'STOP':'PLAY THE 4 BARS'}
 $('#sbGo').onclick=async()=>{if(!buf){msg('Upload a sample first.');return}stop();msg('Listening and chopping...');await new Promise(r=>setTimeout(r,30));
  const bp=parseFloat($('#sbBpm').value);try{R=chop(buf,Z.n,{bpm:bp>40&&bp<220?bp:0});selected=-1;paint();Z.last={bpm:R.bpm,chops:R.slices.length,name:fname};api.save();if(window.__s2bAfter)window.__s2bAfter();msg('Done: '+R.bpm+' BPM, '+R.bars+' bars, '+R.slices.length+' chops'+(R.slices.length<Z.n?' (the sample only had that many clear hits)':'')+'. Click a pad to hear a chop.')}catch(err){console.warn(err);msg('Could not chop this sample: '+(err&&err.message||err))}};
 $('#sbAll').onclick=()=>{if(playing==='all'){stop();return}if(!R)return;stop();const a=api.ctx(),t0=a.currentTime+.05;let t=t0;R.slices.forEach(s=>{srcs.push(playSlice(a,buf,s,t));t+=(s.t1-s.t0)+.04});playing='all';paint();setTimeout(()=>{if(playing==='all'){playing=false;paint()}},(t-t0+.3)*1000)};
 $('#sbLoop').onclick=()=>{if(playing==='loop'){stop();return}if(!R)return;stop();const a=api.ctx(),s=a.createBufferSource();s.buffer=buf;s.connect(a.destination);s.start(a.currentTime+.05,R.ws,R.we-R.ws);srcs.push(s);playing='loop';paint();setTimeout(()=>{if(playing==='loop'){playing=false;paint()}},(R.we-R.ws+.3)*1000)};
 const D=()=>window.MZMpcDrums;let sel=0,vsrc=null,KEY=null,cache=new Map(),order=null,busy=false;
 const vstop=()=>{try{vsrc&&vsrc.stop()}catch(e){}vsrc=null;paintV()};
 const ids=()=>{const d=D();let a=[...Array(d.COUNT)].map((_,i)=>i+1).filter(i=>i>d.HALF);if(false);else if(Z.vs==='fav')a=a.filter(i=>Z.fav.includes(i));if(Z.vk!=='all')a=a.filter(i=>String(d.dnaOf(i).kit)===String(Z.vk));if(order)a=a.slice().sort((x,y)=>order[x]-order[y]);return a};
 const label=i=>{const d=D().dnaOf(i);return{t:'#'+i+'  '+(d.style==='trap'?'TRAP':'EAST COAST')+'  /  '+d.kitName,s:R.bpm+' BPM  /  swing '+d.swing+'%  /  '+({loop:'sample loop',flip:'chop flip',sparse:'sparse chops'}[d.mode])}};
 function paintV(){const v=$('#sbVar');if(!R||!D()){v.style.display='none';return}v.style.display='block';$('#sbKey').textContent='Key of the sample: '+(KEY?KEY.name:'...')+". The beats keep the sample's tempo and add swing, ghost notes and a producer feel (Premier, Pete Rock, Dilla and more).";
  const kitSel=$('#sbKit');if(!kitSel.options.length){kitSel.innerHTML='<option value="all">All kits</option>'+D().KITS.map((k,i)=>k.style==='trap'?'':`<option value="${i}">${k.style==='trap'?'Trap':'East Coast'}: ${k.n}</option>`).join('');kitSel.value=String(Z.vk)}
  $('#sbSty').value=Z.vs;const a=ids(),per=10,pages=Math.max(1,Math.ceil(a.length/per));Z.pg=clamp(Z.pg,0,pages-1);const pg=a.slice(Z.pg*per,(Z.pg+1)*per);
  $('#sbList').innerHTML=pg.length?pg.map(i=>{const L=label(i),fav=Z.fav.includes(i);return `<div class="it" style="align-items:center;${i===sel?'background:#17140c':''}"><button data-f="${i}" style="font-size:14px;padding:4px 8px;${fav?'color:var(--gold);border-color:var(--gold)':''}">${fav?'&#9733;':'&#9734;'}</button><b style="white-space:normal;min-width:0">${esc(L.t)}<br><small style="color:#8e8e94;font-weight:500">${esc(L.s)}</small></b><button data-p="${i}">${i===sel&&vsrc?'STOP':'PLAY'}</button><button data-v="${i}" title="Use this beat in the video">VIDEO</button></div>`}).join(''):'<div class="msg">'+(D().COUNT?'Nothing here. Tap the star on some beats first.':'No drum patterns yet. They will be made from your own drum loops (converted to MIDI). Add your drum loop folder to bring them back.')+'</div>';
  $('#sbPg').textContent='page '+(Z.pg+1)+' of '+pages+' ('+a.length+' beats)';$('#sbVCtl').style.display='grid';
  $('#sbList').querySelectorAll('[data-f]').forEach(b=>b.onclick=()=>{const i=+b.dataset.f,k=Z.fav.indexOf(i);if(k>=0)Z.fav.splice(k,1);else Z.fav.push(i);api.save();paintV()});
  $('#sbList').querySelectorAll('[data-p]').forEach(b=>b.onclick=()=>playVar(+b.dataset.p));
  $('#sbList').querySelectorAll('[data-v]').forEach(b=>b.onclick=()=>makeEp(+b.dataset.v))}
 async function renderVar(i){const key=i+'|'+R.bpm+'|'+R.slices.length+'|'+buf.length;if(cache.has(key))return cache.get(key);const d=D(),dna=d.dnaOf(i),pl=d.plan(dna,R,KEY),out=await d.render(buf,R,pl,{loops:2});cache.set(key,{out,pl});if(cache.size>8)cache.delete(cache.keys().next().value);return{out,pl}}
 async function playVar(i){if(busy)return;if(i===sel&&vsrc){vstop();return}vstop();stop();sel=i;busy=true;$('#sbVMsg').textContent='Making beat #'+i+'...';paintV();
  try{const{out}=await renderVar(i),a=api.ctx(),s=a.createBufferSource();s.buffer=out;s.connect(a.destination);s.onended=()=>{if(vsrc===s){vsrc=null;paintV()}};s.start(a.currentTime+.05);vsrc=s;const L=label(i);$('#sbVMsg').textContent='Playing '+L.t+'  ('+out.duration.toFixed(1)+' s)'}catch(err){console.warn(err);$('#sbVMsg').textContent='Could not make this beat: '+(err&&err.message||err)}busy=false;paintV()}
 $('#sbSty').onchange=e=>{Z.vs=e.target.value;Z.pg=0;api.save();paintV()};$('#sbKit').onchange=e=>{Z.vk=e.target.value;Z.pg=0;api.save();paintV()};
 $('#sbPrev').onclick=()=>{Z.pg--;paintV()};$('#sbNext').onclick=()=>{Z.pg++;paintV()};
 $('#sbShuf').onclick=()=>{order={};const seed=Math.random();for(let i=1;i<=500;i++){const q=Math.sin(i*12.9898+seed*78.233)*43758.5453;order[i]=q-Math.floor(q)}Z.pg=0;paintV()};
 $('#sbRand').onclick=()=>{const a=ids();if(a.length)playVar(a[Math.floor(Math.random()*a.length)])};
 $('#sbVStop').onclick=vstop;
 $('#sbVWav').onclick=async()=>{if(!R||!sel)return;$('#sbVMsg').textContent='Rendering 16 bars for download...';const d=D(),dna=d.dnaOf(sel),pl=d.plan(dna,R,KEY),out=await d.render(buf,R,pl,{loops:4}),a=document.createElement('a');a.href=URL.createObjectURL(d.wav(out));a.download=(fname||'sample')+' - beat '+sel+'.wav';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),8000);$('#sbVMsg').textContent='Downloaded.'};
 const mk=Z.mk,mset=()=>{$('#mkOv').checked=!!mk.ov;$('#mkBtn').checked=!!mk.btn;$('#mkHb').checked=!!mk.hb;$('#mkTb').checked=!!mk.tb;$('#mkDr').checked=!!mk.dr;$('#mkLb').value=String(mk.lb)};
 const mmsg=t=>{$('#mkMsg').textContent=t};
 [['#mkOv','ov'],['#mkBtn','btn'],['#mkHb','hb'],['#mkTb','tb'],['#mkDr','dr']].forEach(([id,k])=>$(id).onchange=e=>{mk[k]=e.target.checked?1:0;api.save()});$('#mkLb').onchange=e=>{mk.lb=+e.target.value;api.save()};
 let epBusy=false;
 async function makeEp(i){if(!R||!buf){mmsg('Chop a sample first.');return}if(epBusy)return;if(!i)i=sel;if(!i){mmsg('Choose a beat: press VIDEO on one in the list.');return}epBusy=true;vstop();stop();sel=i;mmsg('Building the episode for beat #'+i+'...');await new Promise(r=>setTimeout(r,40));
  try{if(!window.MZMpcMake)await api.loadS('mpcmake.js?v=10');const d=D(),dna=d.dnaOf(i);await api.ensureScene();
   const X=await window.MZMpcMake.build(buf,R,dna,KEY,{buttons:!!mk.btn,handsBtn:!!mk.hb,overlay:!!mk.ov,layerBars:mk.lb,intro:ST.intro?3.4:0,name:fname||'SAMPLE',typeBeat:!!mk.tb,drops:!!mk.dr});
   Z.typeBeat=!!mk.tb;api.setEp(X);const P=window.MZMpcMake.pack(X,ST,{});
   const bits=[['TITLES',P.titles.map((t,j)=>'<div class="it"><b>'+esc(t)+'</b><small style="color:#8e8e94">'+t.length+'/100</small><button data-ct="'+j+'">COPY</button></div>').join('')],['DESCRIPTION','<textarea rows="12" id="mkD" style="font:500 12px/1.5 monospace">'+esc(P.desc)+'</textarea><button class="btn" id="mkCd" style="width:100%;margin-top:4px">COPY DESCRIPTION</button>'],['TAGS','<textarea rows="2" id="mkT" style="font:500 12px/1.5 monospace">'+esc(P.tags)+'</textarea><button class="btn" id="mkCt" style="width:100%;margin-top:4px">COPY TAGS</button>'],['PINNED COMMENT','<div class="it"><b>'+esc(P.pinned[0])+'</b><button data-cp="0">COPY</button></div><div class="it"><b>'+esc(P.pinned[1])+'</b><button data-cp="1">COPY</button></div><div class="it"><b>'+esc(P.pinned[2])+'</b><button data-cp="2">COPY</button></div>']];
   $('#mkPack').innerHTML='<h4 style="font:700 11px Montserrat;letter-spacing:.26em;color:var(--gold);margin:16px 0 6px">EPISODE TITLES AND DESCRIPTION</h4>'+bits.map(b=>'<div class="sub" style="margin:10px 0 4px;font:700 10px Montserrat;letter-spacing:.2em;color:#c9a14a">'+b[0]+'</div>'+b[1]).join('')+(Z.src?'':'<div class="msg">Tip: fill in "where the sample comes from" above so it shows in the description.</div>');
   const cp=async(t,e)=>{const ok=await api.cpy(t);e.textContent=ok?'COPIED':'FAILED';setTimeout(()=>{if(e.dataset.l)e.textContent=e.dataset.l},1200)};
   $('#mkPack').querySelectorAll('[data-ct]').forEach(b=>{b.dataset.l='COPY';b.onclick=()=>cp(P.titles[+b.dataset.ct],b)});$('#mkPack').querySelectorAll('[data-cp]').forEach(b=>{b.dataset.l='COPY';b.onclick=()=>cp(P.pinned[+b.dataset.cp],b)});
   $('#mkCd').onclick=e=>cp($('#mkD').value,e.target);$('#mkCt').onclick=e=>cp($('#mkT').value,e.target);
   lastEp=X;lastEpId=i;$('#mkWavAll').disabled=false;$('#mkWavFull').disabled=false;
   const M=X.make;mmsg('Episode ready: beat #'+i+' ('+M.style.toUpperCase().replace('EC','EAST COAST')+', '+M.kit+'), '+Math.floor(Math.round(M.total)/60)+':'+String(Math.round(M.total)%60).padStart(2,'0')+' long. Press PLAY on the left to watch it, or RENDER 16:9 / 9:16.')}
  catch(err){console.warn(err);mmsg('Could not build the episode: '+(err&&err.message||err))}epBusy=false}
 /* the beat exactly as it plays in the video: every layer, chop flip and drop, same audio the video uses */
 const epWav=full=>{if(!lastEp||!D())return;const B=lastEp.tracks[0].S.buf,M=lastEp.make,sr=B.sampleRate,a=full?Math.floor(M.fullT*sr):0,b=full?Math.min(B.length,Math.ceil((M.endMusic+1.4)*sr)):B.length,o=new AudioBuffer({numberOfChannels:B.numberOfChannels,length:b-a,sampleRate:sr});
  for(let c=0;c<B.numberOfChannels;c++){const d=B.getChannelData(c).slice(a,b),f=Math.min(d.length,Math.floor(sr*.25));for(let q=0;q<f;q++)d[d.length-1-q]*=q/f;o.copyToChannel(d,c)}
  api.dlf(D().wav(o),(fname||'sample').replace(/\.[^.]+$/,'')+' - beat '+lastEpId+(full?' - full beat':' - episode')+'.wav')};
 $('#mkWavAll').onclick=()=>epWav(false);$('#mkWavFull').onclick=()=>epWav(true);
 $('#mkGo').onclick=()=>makeEp(sel);$('#mkBack').onclick=()=>{api.setEp(null);mmsg('Back to the normal video.')};mset();
 const afterChop=async()=>{try{if(!D())await api.loadS('mpcdrums.js?v=13');await D().loadPack();KEY=D().keyOf(buf,R.ws,R.we);cache=new Map();sel=0;paintV()}catch(e){console.warn(e);$('#sbVMsg').textContent='The drums did not load. Refresh the page.'}};
 window.__s2bAfter=afterChop;
 return{chop:()=>R,buf:()=>buf,stop,after:afterChop,key:()=>KEY,dev:{renderVar,playVar,makeEp}}}
window.MZMpcSample={chop,tempoOf,fluxOf,pickPeaks,playSlice,mount,padIdx,PAD_NAMES};
})();
