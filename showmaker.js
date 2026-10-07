/* MZPRD Show Maker (back office). Build the weekly pixel show: setlist, stage look, 5-20 minute timeline, effects, heart milestones, schedule.
   Preview it live, save drafts (hidden from visitors), publish when it is finished, or render it to a video that stays in this browser for 7 days. */
(function(){
const M=window.MZShow,W=M.W,H=M.H,DAY=864e5;
const $q=s=>root.querySelector(s);let root=null,mounted=false;
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const mmss=s=>Math.floor(s/60)+':'+String(Math.floor(s%60)).padStart(2,'0');
const parseT=v=>{const m=String(v).trim().match(/^(\d+):([0-5]?\d)$/);if(m)return +m[1]*60+ +m[2];const n=parseFloat(v);return isFinite(n)?n:0};
const E={shows:[],beats:[],id:null,status:'draft',title:'',theme:'city',script:M.defaultScript(300),when:'',cache:{},stage:null,plate:null,actx:null,sched:null,playing:false,from:0,t0:0,T:0,raf:0,last:0,testHearts:0,busy:false};
const SEGCOL={intro:'#3d7bff',build:'#a24dff',drop:'#ff4b2e',breakdown:'#2fbfd0',finale:'#37d67a'};
/* ---------- local library for rendered videos (browser only, auto-deleted after 7 days) ---------- */
const idb=()=>new Promise((ok,no)=>{const r=indexedDB.open('mzprd_show',1);r.onupgradeneeded=()=>r.result.createObjectStore('renders',{keyPath:'id'});r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)});
const tx=async(mode,fn)=>{const d=await idb();return new Promise((ok,no)=>{const t=d.transaction('renders',mode),s=t.objectStore('renders'),r=fn(s);t.oncomplete=()=>ok(r&&r.result);t.onerror=()=>no(t.error);t.onabort=()=>no(t.error)})};
const lib={put:o=>tx('readwrite',s=>s.put(o)),all:()=>tx('readonly',s=>s.getAll()),del:id=>tx('readwrite',s=>s.delete(id)),
 async purge(){const L=(await lib.all())||[];for(const o of L)if(o.expires<Date.now())await lib.del(o.id)}};
/* ---------- css ---------- */
function css(){
 if(document.getElementById('smCss'))return;const s=document.createElement('style');s.id='smCss';
 s.textContent=`#showmk{display:none}#showmk.on{display:block}
#showmk .mg{display:grid;grid-template-columns:minmax(0,1fr) minmax(330px,420px);gap:16px;align-items:start}
@media(max-width:1000px){#showmk .mg{grid-template-columns:1fr}}
#showmk .pn{background:#0c0c0f;border:1px solid #2a2a2e;padding:14px}
#showmk h3{font:700 16px Montserrat;letter-spacing:.14em;color:#fff;margin:0}
#showmk h4{font:700 11px Montserrat;letter-spacing:.26em;color:var(--gold);margin:16px 0 8px}
#showmk label{display:block;font:600 10px Montserrat;letter-spacing:.2em;color:#8e8e94;margin:8px 0 4px}
#showmk input[type=text],#showmk input[type=number],#showmk input[type=date],#showmk input[type=time],#showmk select{width:100%;background:#050506;border:1.5px solid #34343a;color:#fff;padding:8px;font:500 13px Montserrat}
#showmk .btn{background:transparent;border:1.5px solid #4a4a50;color:#fff;font:600 10px Montserrat;letter-spacing:.16em;padding:10px 8px;cursor:pointer}
#showmk .btn:hover{border-color:#fff}#showmk .btn.big{background:var(--red);border-color:var(--red);font:700 13px Montserrat;letter-spacing:.24em;padding:15px;width:100%}
#showmk .btn.big:disabled{opacity:.5}
#showmk .row{display:grid;gap:6px;align-items:center}
#showmk .two{display:grid;grid-template-columns:1fr 1fr;gap:6px}
#showmk .chk{display:flex;gap:8px;align-items:center;letter-spacing:.1em;margin:6px 0}#showmk .chk input{width:auto}
#showmk .box{position:relative;width:100%;aspect-ratio:1092/790;background:#05040a;border:1px solid #2a2a2e;max-height:78vh;margin:0 auto}
#showmk .box canvas{width:100%;height:100%;image-rendering:pixelated;display:block}
#showmk .ctl{display:flex;gap:8px;align-items:center;margin-top:8px;flex-wrap:wrap}#showmk .ctl input[type=range]{flex:1;min-width:140px;accent-color:var(--red)}
#showmk .time{font:600 12px Montserrat;color:#c9c9ce;min-width:92px;text-align:right}
#showmk .seg{height:10px;display:flex;margin:6px 0 0;border:1px solid #2a2a2e}#showmk .seg i{display:block;height:100%}
#showmk .th{display:grid;grid-template-columns:repeat(2,1fr);gap:6px}
#showmk .th button{background:#050506;border:2px solid #34343a;padding:3px;cursor:pointer;color:#fff;font:600 9px Montserrat;letter-spacing:.1em}
#showmk .th button.on{border-color:var(--red)}#showmk .th canvas{width:100%;height:auto;display:block;margin-bottom:3px}
#showmk .trk,#showmk .sgr,#showmk .msr{display:grid;gap:6px;align-items:center;padding:6px;border:1px solid #1d1d21;margin-bottom:6px}
#showmk .trk{grid-template-columns:1fr 62px 62px 28px}#showmk .sgr{grid-template-columns:118px 1fr 58px 58px 28px}#showmk .msr{grid-template-columns:70px 1fr 90px}
#showmk .x{background:transparent;border:1px solid #4a4a50;color:#fff;font:700 13px Montserrat;cursor:pointer;padding:4px}
#showmk .msg{font:500 12px/1.5 Montserrat;color:#a9a9ae;margin-top:8px;min-height:16px}
#showmk .bar{height:6px;background:#1b1b20;margin-top:8px}#showmk .bar b{display:block;height:100%;width:0;background:var(--red)}
#showmk .it{display:flex;gap:10px;align-items:center;padding:9px;border-bottom:1px solid #1d1d21;font:600 12px Montserrat;color:#d9d9dc}
#showmk .it b{flex:1;min-width:0}#showmk .it span{font:500 11px Montserrat;color:#8e8e94}
#showmk .it button{background:transparent;border:1px solid #4a4a50;color:#fff;font:600 9px Montserrat;letter-spacing:.12em;padding:6px 8px;cursor:pointer}
#showmk .tag{font:700 9px Montserrat;letter-spacing:.14em;padding:3px 7px;margin-left:6px}
#showmk .tag.d{background:#3a3a44}#showmk .tag.p{background:#e0242f}#showmk .tag.a{background:#2b2748}`;
 document.head.appendChild(s);
}
function html(){return`<div class="mg"><div>
 <div class="pn"><div class="box"><canvas id="smCv"></canvas></div>
  <div class="seg" id="smSeg"></div>
  <div class="ctl"><button class="btn" id="smPlay">PLAY PREVIEW</button><input type="range" id="smScrub" min="0" max="300" step="0.1" value="0"><span class="time" id="smTime">0:00 / 5:00</span></div>
  <div class="ctl"><span style="font:600 10px Montserrat;letter-spacing:.18em;color:#8e8e94">TEST HEARTS:</span>
   <input type="number" id="smHeart" min="0" step="50" value="0" style="width:90px"><button class="btn" data-h="0">0</button><button class="btn" data-h="300">300</button><button class="btn" data-h="1200">1,200</button><button class="btn" data-h="5000">5,000</button>
   <span class="msg" style="margin:0;flex:1;min-width:160px">Unlocks the milestone effects in the preview so you can see them.</span></div></div>
 <div class="pn" style="margin-top:16px"><h4 style="margin-top:0">YOUR SHOWS</h4><div id="smList"></div>
  <h4>VIDEO RENDERS (STAY IN THIS BROWSER 7 DAYS, THEN DELETE THEMSELVES)</h4><div id="smRend"></div></div>
</div>
<div><div class="pn" style="max-height:none">
 <div class="row" style="grid-template-columns:1fr auto"><h3>SHOW MAKER</h3><button class="btn" id="smSave">SAVE DRAFT</button></div>
 <label>SHOW TITLE</label><input type="text" id="smTitle" placeholder="Friday Night Session">
 <h4>1. SETLIST (YOUR BEATS)</h4><div id="smTracks"></div>
 <div class="two"><button class="btn" id="smAddT">+ ADD A BEAT</button><button class="btn" id="smSpread">SPREAD EVENLY</button></div>
 <h4>2. STAGE THEME</h4><div class="th" id="smTh"></div>
 <h4>3. SHOW LENGTH AND TIMELINE</h4>
 <div class="two"><div><label>LENGTH (MINUTES, 5 TO 20)</label><input type="number" id="smLen" min="5" max="20" step="1" value="5"></div><div><label>&nbsp;</label><button class="btn" id="smSurprise" style="width:100%">SURPRISE ME</button></div></div>
 <div id="smSegs" style="margin-top:8px"></div><button class="btn" id="smAddS" style="width:100%">+ ADD A SECTION</button>
 <h4>4. STAGE AND EFFECTS</h4>
 <div class="two"><label class="chk"><input type="checkbox" id="fxL"> STAGE LIGHTS</label><label class="chk"><input type="checkbox" id="fxF"> FOG / SMOKE</label><label class="chk"><input type="checkbox" id="fxZ"> LASERS (MILESTONE)</label><label class="chk"><input type="checkbox" id="fxP"> CROWD PHONES</label><label class="chk"><input type="checkbox" id="fxW"> FIREWORKS (MILESTONE)</label><label class="chk"><input type="checkbox" id="fxS"> CROWD SOUND</label></div>
 <div class="two"><div><label>INTENSITY</label><input type="range" id="fxI" min="30" max="130" step="5" style="width:100%;accent-color:var(--red)"></div><div><label>CAMERA CUTS</label><select id="fxC"><option value="dynamic">Dynamic</option><option value="slow">Slow</option><option value="static">Static</option></select></div></div>
 <label>CROWD ENERGY</label><select id="fxE"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select>
 <h4>5. HEART MILESTONES</h4><div id="smMs"></div>
 <h4>6. SCHEDULE</h4><div class="two"><div><label>DATE</label><input type="date" id="smDate"></div><div><label>TIME</label><input type="time" id="smClock"></div></div>
 <div class="msg" id="smMsg">Drafts are hidden from visitors. Only a published show appears on the SHOW page.</div>
 <button class="btn big" id="smPub" style="margin-top:8px">PUBLISH SHOW</button>
 <button class="btn big" id="smRender" style="margin-top:8px;background:transparent;border-color:#4a4a50">RENDER TO VIDEO FILE</button>
 <div class="bar"><b id="smProg"></b></div><div class="msg" id="smRMsg"></div>
</div></div></div>`}
/* ---------- helpers ---------- */
const beatById=id=>E.beats.find(b=>String(b.id)===String(id));
async function ctxA(){if(!E.actx)E.actx=new (window.AudioContext||window.webkitAudioContext)();return E.actx}
async function prep(){ /* decode and analyse every beat in the setlist (cached) */
 const a=await ctxA(),sc=E.script;
 for(const tr of sc.tracks){
  if(!tr.id||E.cache[tr.id])continue;const b=beatById(tr.id);if(!b||!b.preview_path)continue;
  try{const buf=await a.decodeAudioData(await (await fetch(pub(b.preview_path))).arrayBuffer());const an=await M.analyze(buf);E.cache[tr.id]={buf,an};if(!b.bpm&&!tr.bpm)tr.bpm=an.bpm}catch(e){}
 }
 refreshHits();
}
function refreshHits(){const sc=E.script,bufs=sc.tracks.map(t=>E.cache[t.id]&&E.cache[t.id].buf),data=sc.tracks.map(t=>E.cache[t.id]&&E.cache[t.id].an);E.bufs=bufs;E.hits=M.hitTimeline(sc,data);if(E.stage)E.stage.setScript(sc,E.hits)}
function syncTracks(){const sc=E.script;sc.tracks.forEach(t=>{const b=beatById(t.id);if(b){t.title=b.title;t.bpm=b.bpm||t.bpm||0;t.key=b.musical_key||t.key||'';t.audio=b.preview_path||'';t.cover=b.cover_path||''}})}
function segBar(){const sc=E.script;$q('#smSeg').innerHTML=sc.segments.map(s=>`<i style="width:${(s.end-s.start)/sc.len*100}%;background:${SEGCOL[s.preset]||'#555'}" title="${esc(s.name)}"></i>`).join('')}
/* ---------- panels ---------- */
function rTracks(){
 const sc=E.script,el=$q('#smTracks');
 el.innerHTML=sc.tracks.map((t,i)=>`<div class="trk" data-i="${i}"><select data-f="id">${E.beats.map(b=>`<option value="${esc(b.id)}"${String(b.id)===String(t.id)?' selected':''}>${esc(b.title)}</option>`).join('')}</select><input type="text" data-f="start" value="${mmss(t.start)}"><input type="text" data-f="end" value="${mmss(t.end)}"><button class="x" data-f="rm">&times;</button></div>`).join('')||'<div class="msg">Add at least one beat. Each beat fades out, the crowd settles, then the next beat brings it back.</div>';
 el.querySelectorAll('.trk').forEach(r=>{const i=+r.dataset.i;r.querySelectorAll('[data-f]').forEach(f=>{f.onchange=async()=>{const t=sc.tracks[i];const k=f.dataset.f;
  if(k==='rm'){sc.tracks.splice(i,1)}else if(k==='id'){t.id=f.value;syncTracks();await prep()}else t[k]=clamp(parseT(f.value),0,sc.len);
  if(t&&t.end<=t.start+1)t.end=Math.min(sc.len,t.start+10);refreshHits();rTracks();seek(E.T)};f.onclick=f.dataset.f==='rm'?f.onchange:null})});
}
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function spread(){const sc=E.script,n=sc.tracks.length;if(!n)return;const slot=sc.len/n;sc.tracks.forEach((t,i)=>{t.start=Math.round(i*slot);t.end=Math.round((i+1)*slot-(i<n-1?3:0))});rTracks();refreshHits()}
function rTheme(){
 const el=$q('#smTh');el.innerHTML=Object.keys(M.THEMES).map(k=>`<button data-k="${k}" class="${k===E.script.theme?'on':''}"><canvas width="160" height="116"></canvas>${M.THEMES[k]}</button>`).join('');
 el.querySelectorAll('button').forEach(b=>{const cv=b.querySelector('canvas');if(E.stage){const t=E.stage.themeThumb(b.dataset.k);if(t)cv.getContext('2d').drawImage(t,0,0,160,116)}
  b.onclick=()=>{E.script.theme=b.dataset.k;E.stage.setTheme(b.dataset.k);rTheme()}});
}
function rSegs(){
 const sc=E.script,el=$q('#smSegs');
 el.innerHTML=sc.segments.map((s,i)=>`<div class="sgr" data-i="${i}"><select data-f="preset">${Object.keys(M.PRESETS).map(k=>`<option value="${k}"${k===s.preset?' selected':''}>${M.PRESETS[k].n}</option>`).join('')}</select><div class="seg" style="margin:0;height:14px"><i style="width:100%;background:${SEGCOL[s.preset]||'#555'}"></i></div><input type="text" data-f="start" value="${mmss(s.start)}" ${i?'disabled':''}><input type="text" data-f="end" value="${mmss(s.end)}"><button class="x" data-f="rm">&times;</button></div>`).join('');
 el.querySelectorAll('.sgr').forEach(r=>{const i=+r.dataset.i;r.querySelectorAll('[data-f]').forEach(f=>{f.onchange=()=>{const s=sc.segments[i],k=f.dataset.f;
  if(k==='rm'){if(sc.segments.length>1){sc.segments.splice(i,1);sc.segments[0].start=0;for(let j=1;j<sc.segments.length;j++)sc.segments[j].start=sc.segments[j-1].end;sc.segments[sc.segments.length-1].end=sc.len}}
  else if(k==='preset'){s.preset=f.value;s.name=M.PRESETS[f.value].n}
  else if(k==='end'){s.end=clamp(parseT(f.value),s.start+5,sc.len);if(sc.segments[i+1])sc.segments[i+1].start=s.end;for(let j=i+1;j<sc.segments.length;j++){if(sc.segments[j].end<=sc.segments[j].start+4)sc.segments[j].end=Math.min(sc.len,sc.segments[j].start+5);if(sc.segments[j+1])sc.segments[j+1].start=sc.segments[j].end}sc.segments[sc.segments.length-1].end=sc.len}
  rSegs();segBar();seek(E.T)}})});
}
function addSeg(){const sc=E.script,l=sc.segments[sc.segments.length-1],half=Math.max(l.start+10,Math.round((l.start+l.end)/2));if(l.end-l.start<20)return;sc.segments.push({name:'DROP',preset:'drop',start:half,end:l.end});l.end=half;rSegs();segBar()}
function setLen(min){
 const sc=E.script,old=sc.len,mn=window.__showMin||5,len=Math.max(10,Math.round(clamp(min,mn,20)*60)),k=len/old;sc.len=len;
 sc.segments.forEach(s=>{s.start=Math.round(s.start*k);s.end=Math.round(s.end*k)});sc.segments[0].start=0;for(let i=1;i<sc.segments.length;i++)sc.segments[i].start=sc.segments[i-1].end;sc.segments[sc.segments.length-1].end=len;
 sc.tracks.forEach(t=>{t.start=Math.round(t.start*k);t.end=Math.min(len,Math.round(t.end*k))});
 $q('#smScrub').max=len;rSegs();rTracks();segBar();refreshHits();setT()
}
function rFx(){
 const f=E.script.fx;$q('#fxL').checked=f.lights!==false;$q('#fxF').checked=f.fog!==false;$q('#fxZ').checked=f.lasers!==false;$q('#fxP').checked=f.flash!==false;$q('#fxW').checked=f.fireworks!==false;$q('#fxS').checked=f.crowdSound!==false;
 $q('#fxI').value=Math.round((f.intensity==null?.85:f.intensity)*100);$q('#fxC').value=f.cuts||'dynamic';$q('#fxE').value=f.crowd||'high';
}
function rMs(){
 const ms=E.script.milestones;$q('#smMs').innerHTML=ms.map((m,i)=>`<div class="msr" data-i="${i}"><input type="number" data-f="at" min="1" step="50" value="${m.at}"><input type="text" data-f="label" value="${esc(m.label)}"><select data-f="fx">${['lights','lasers','fireworks','special'].map(k=>`<option value="${k}"${k===m.fx?' selected':''}>${k.toUpperCase()}</option>`).join('')}</select></div>`).join('');
 $q('#smMs').querySelectorAll('.msr').forEach(r=>{const i=+r.dataset.i;r.querySelectorAll('[data-f]').forEach(f=>f.onchange=()=>{const m=ms[i],k=f.dataset.f;m[k]=k==='at'?Math.max(1,Math.round(+f.value||1)):f.value})})
}
function setWhen(){const d=E.when?new Date(E.when):null;$q('#smDate').value=d?`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`:'';$q('#smClock').value=d?`${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`:'20:00'}
function readWhen(){const d=$q('#smDate').value,t=$q('#smClock').value||'20:00';return d?new Date(d+'T'+t).toISOString():''}
function msg(t){$q('#smMsg').textContent=t}
function fillAll(){$q('#smTitle').value=E.title;$q('#smLen').value=E.script.len/60;$q('#smScrub').max=E.script.len;rTracks();rTheme();rSegs();rFx();rMs();setWhen();segBar();setT()}
/* ---------- preview playback ---------- */
function setT(){const el=$q('#smTime');if(el)el.textContent=mmss(E.T)+' / '+mmss(E.script.len);const sc=$q('#smScrub');if(sc&&document.activeElement!==sc)sc.value=E.T}
async function seek(T){E.T=clamp(T,0,E.script.len);const was=E.playing;stopA();if(was)await play();else{E.stage.reset();setT()}}
function stopA(){if(E.sched){E.sched.stop();E.sched=null}if(E.master){try{E.master.disconnect()}catch(e){}E.master=null}E.playing=false;const b=$q('#smPlay');if(b)b.textContent='PLAY PREVIEW'}
async function play(){
 await prep();const a=await ctxA();await a.resume();stopA();
 E.master=a.createGain();E.an=a.createAnalyser();E.an.fftSize=1024;E.an.smoothingTimeConstant=.6;E.master.connect(E.an);E.an.connect(a.destination);E.fd=new Uint8Array(E.an.frequencyBinCount);E.td=new Uint8Array(1024);
 E.t0=a.currentTime+.12;E.from=E.T>=E.script.len-1?0:E.T;const sc=E.script;sc.tracks.forEach(t=>{if(t.audio&&!/^https?:/.test(t.audio))t.audio=t.audio});
 E.sched=M.schedule(a,E.master,sc,E.bufs||[],E.from,sc.len,{t0:E.t0});E.stage.reset();E.playing=true;$q('#smPlay').textContent='STOP PREVIEW'
}
function frame(ts){
 E.raf=requestAnimationFrame(frame);if(document.hidden||!root||!root.classList.contains('on'))return;
 const dt=E.last?Math.min(.1,(ts-E.last)/1000):.016;E.last=ts;let au={bass:0,mid:0,high:0,loud:0},mode='live';
 if(E.playing){const a=E.actx;E.T=E.from+(a.currentTime-E.t0)-(a.outputLatency||a.baseLatency||0);if(E.T>=E.script.len){mode='end';E.T=E.script.len;if(a.currentTime-E.t0>E.script.len-E.from+9)stopA()}
  else{E.an.getByteFrequencyData(E.fd);E.an.getByteTimeDomainData(E.td);const avg=(x,y)=>{let s=0;for(let i=x;i<y;i++)s+=E.fd[i];return s/(y-x)/255};let r=0;for(let i=0;i<1024;i++){const v=(E.td[i]-128)/128;r+=v*v}au={fd:E.fd,bass:avg(1,6),mid:avg(6,40),high:avg(40,160),loud:Math.min(1,Math.sqrt(r/1024)*2.2)}}}
 else mode=E.T>=E.script.len?'end':'live';
 E.stage.setHearts(E.testHearts);E.stage.draw(E.T,dt,au,{mode});setT();
}
/* ---------- saving ---------- */
function collect(){
 const sc=E.script;syncTracks();sc.title=$q('#smTitle').value.trim()||'Weekly Show';const f=sc.fx;
 f.lights=$q('#fxL').checked;f.fog=$q('#fxF').checked;f.lasers=$q('#fxZ').checked;f.flash=$q('#fxP').checked;f.fireworks=$q('#fxW').checked;f.crowdSound=$q('#fxS').checked;f.intensity=+$q('#fxI').value/100;f.cuts=$q('#fxC').value;f.crowd=$q('#fxE').value;
 return{title:sc.title,theme:sc.theme,script:sc,schedule_at:readWhen()||null};
}
async function save(status){
 const d=collect();if(!d.script.tracks.length||!d.script.tracks.some(t=>t.audio)){msg('Add at least one beat with a preview first.');return false}
 if(status==='published'&&!d.schedule_at){msg('Pick the date and time first.');return false}
 const row={title:d.title,theme:d.theme,script:d.script,schedule_at:d.schedule_at,status:status||E.status};
 if(row.status==='published'&&E.status!=='published')row.published_at=new Date().toISOString();
 let r;if(E.id)r=await sb.from('shows').update(row).eq('id',E.id).select('id').maybeSingle();else r=await sb.from('shows').insert(row).select('id').maybeSingle();
 if(r.error){msg('Error: '+r.error.message);return false}
 E.id=r.data.id;E.status=row.status;await loadShows();return true;
}
async function loadShows(){
 const {data}=await sb.from('shows').select('*').order('created_at',{ascending:false}).limit(80);E.shows=data||[];rList();
}
function rList(){
 const el=$q('#smList');
 el.innerHTML=E.shows.length?E.shows.map(s=>`<div class="it" data-id="${s.id}"><b>${esc(s.title)}<span class="tag ${s.status==='draft'?'d':s.status==='published'?'p':'a'}">${s.status.toUpperCase()}</span><br><span>${s.schedule_at?new Date(s.schedule_at).toLocaleString():'not scheduled'}  /  ${mmss(s.script.len||300)}  /  &#9829; ${Number(s.hearts).toLocaleString()}</span></b><button data-a="edit">EDIT</button><button data-a="dup">DUPLICATE</button>${s.status==='published'?'<button data-a="un">UNPUBLISH</button><button data-a="arc">ARCHIVE</button>':''}<button data-a="del">DELETE</button></div>`).join(''):'<div class="msg">No shows yet. Build your first one on the right.</div>';
 el.querySelectorAll('.it').forEach(r=>{const s=E.shows.find(x=>x.id===r.dataset.id);r.querySelectorAll('button').forEach(b=>b.onclick=async()=>{const a=b.dataset.a;
  if(a==='edit'){load(s)}
  else if(a==='dup'){load(Object.assign({},s,{id:null,status:'draft',title:s.title+' (copy)',hearts:0,schedule_at:s.schedule_at?new Date(new Date(s.schedule_at).getTime()+7*DAY).toISOString():null}));msg('Duplicated as a new draft. Change what you like, then save.')}
  else if(a==='un'){await sb.from('shows').update({status:'draft'}).eq('id',s.id);await loadShows()}
  else if(a==='arc'){await sb.from('shows').update({status:'archived'}).eq('id',s.id);await loadShows()}
  else if(a==='del'){if(!(await askConfirm('DELETE "'+String(s.title).toUpperCase()+'"?','The show and its hearts are removed. This cannot be undone.')))return;await sb.from('shows').delete().eq('id',s.id);if(E.id===s.id){E.id=null}await loadShows()}})})
}
function load(s){
 stopA();E.id=s.id;E.status=s.status||'draft';E.title=s.title;E.script=JSON.parse(JSON.stringify(s.script));if(!E.script.fx)E.script.fx=M.defaultScript().fx;if(!E.script.milestones)E.script.milestones=M.defaultScript().milestones;
 E.script.theme=s.theme||E.script.theme;E.when=s.schedule_at||'';E.T=0;E.stage.setScript(E.script,[]);fillAll();prep();window.scrollTo(0,0)
}
/* ---------- surprise me ---------- */
function surprise(){
 const sc=E.script,ths=Object.keys(M.THEMES),R=Math.random;sc.theme=ths[Math.floor(R()*ths.length)];E.stage.setTheme(sc.theme);
 const mins=[5,5,8,10,12,15][Math.floor(R()*6)],len=mins*60;sc.len=len;
 const names=['intro','build','drop','breakdown','drop','build','drop','finale'],n=mins<=5?5:mins<=10?7:8,pat=n===5?['intro','build','drop','breakdown','finale']:n===7?['intro','build','drop','breakdown','build','drop','finale']:names;
 const cuts=[0];for(let i=1;i<pat.length;i++)cuts.push(Math.round(len*(i/pat.length)+(R()-.5)*len*.03));cuts.push(len);
 sc.segments=pat.map((p,i)=>({name:M.PRESETS[p].n,preset:p,start:cuts[i],end:cuts[i+1]}));
 sc.fx.cuts=['dynamic','dynamic','slow'][Math.floor(R()*3)];sc.fx.crowd=['medium','high','high'][Math.floor(R()*3)];sc.fx.intensity=.7+R()*.4;
 if(sc.tracks.length)spread();$q('#smLen').value=mins;$q('#smScrub').max=len;rTheme();rSegs();rFx();segBar();rTracks();refreshHits();seek(0);msg('Surprise! A fresh look and timeline. Tweak anything, then save or publish.')
}
/* ---------- video render ---------- */
function loadMuxer(){return window.Mp4Muxer?Promise.resolve():new Promise((ok,no)=>{const s=document.createElement('script');s.src=new URL('mp4-muxer.js',document.baseURI).href;s.onload=ok;s.onerror=()=>no(new Error('muxer'));document.head.appendChild(s)})}
const mcx=new MessageChannel(),ysq=[];mcx.port1.onmessage=()=>{const f=ysq.shift();if(f)f()};const yieldNow=()=>new Promise(r=>{ysq.push(r);mcx.port2.postMessage(0)});
function badge(p){const b=document.querySelector('.bh [data-t=show]');if(b)b.textContent=p==null?'SHOW MAKER':'SHOW MAKER '+p+'%'}
const beforeUnload=e=>{if(E.busy){e.preventDefault();e.returnValue=''}};
async function renderVideo(){
 if(E.busy)return;const d=collect(),sc=d.script,rm=t=>$q('#smRMsg').textContent=t,btn=$q('#smRender');
 if(!sc.tracks.length||!sc.tracks.some(t=>t.audio)){rm('Add at least one beat first.');return}
 if(!(window.VideoEncoder&&window.AudioEncoder&&window.VideoFrame&&window.AudioData&&window.OfflineAudioContext)){rm('This browser cannot render video. Use Chrome or Edge.');return}
 E.busy=true;btn.disabled=true;stopA();addEventListener('beforeunload',beforeUnload);badge(0);$q('#smProg').style.width='0';
 const OW=1280,OH=720,FPS=24,TOTAL=sc.len+8;let venc,aenc,err=null;
 try{
  rm('Loading the beats...');await loadMuxer();await M.loadFonts();await prep();
  const bufs=E.bufs,hits=E.hits,stage=M.makeStage(document.createElement('canvas'));stage.setPlate(E.plate);stage.setScript(sc,hits);stage.setHearts(E.testHearts);
  const sw=Math.round(OH*W/H),sx=Math.round((OW-sw)/2);
  const out=document.createElement('canvas');out.width=OW;out.height=OH;const oc=out.getContext('2d');oc.imageSmoothingEnabled=false;
  const bl=document.createElement('canvas');bl.width=160;bl.height=90;const bx=bl.getContext('2d');bx.filter='blur(3px) brightness(.55)';
  const pickV=async()=>{for(const c of [{codec:'avc1.4d001f',mux:'avc'},{codec:'avc1.42E01f',mux:'avc'},{codec:'vp09.00.31.08',mux:'vp9'}]){const cfg={codec:c.codec,width:OW,height:OH,bitrate:2.5e6,framerate:FPS};try{const r=await VideoEncoder.isConfigSupported(cfg);if(r&&r.supported)return{...c,cfg}}catch(e){}}return null};
  const pickA=async()=>{for(const c of [{codec:'mp4a.40.2',mux:'aac'},{codec:'opus',mux:'opus'}]){try{const r=await AudioEncoder.isConfigSupported({codec:c.codec,sampleRate:48000,numberOfChannels:2,bitrate:160000});if(r&&r.supported)return c}catch(e){}}return null};
  const vc=await pickV(),ac=await pickA();if(!vc||!ac)throw new Error('no video codec available');
  const target=new Mp4Muxer.ArrayBufferTarget(),muxer=new Mp4Muxer.Muxer({target,video:{codec:vc.mux,width:OW,height:OH},audio:{codec:ac.mux,numberOfChannels:2,sampleRate:48000},fastStart:'in-memory'});
  venc=new VideoEncoder({output:(c,m)=>muxer.addVideoChunk(c,m),error:e=>{err=e}});venc.configure(vc.cfg);
  aenc=new AudioEncoder({output:(c,m)=>muxer.addAudioChunk(c,m),error:e=>{err=e}});aenc.configure({codec:ac.codec,sampleRate:48000,numberOfChannels:2,bitrate:160000});
  const prev=new Float32Array(512),CH=30,heartsF=[];let f=0;const t0=performance.now(),N=Math.ceil(TOTAL*FPS),fl=[];
  for(let from=0;from<TOTAL;from+=CH){
   const until=Math.min(TOTAL,from+CH),len=until-from,octx=new OfflineAudioContext(2,Math.ceil(len*48000),48000);
   M.schedule(octx,octx.destination,sc,bufs,from,until,{t0:0});const rb=await octx.startRendering(),L0=rb.getChannelData(0),R0=rb.getChannelData(1);
   for(let o=0;o<L0.length;o+=4800){const m=Math.min(4800,L0.length-o),b=new Float32Array(m*2);b.set(L0.subarray(o,o+m),0);b.set(R0.subarray(o,o+m),m);const ad=new AudioData({format:'f32-planar',sampleRate:48000,numberOfFrames:m,numberOfChannels:2,timestamp:Math.round((from+o/48000)*1e6),data:b});aenc.encode(ad);ad.close()}
   const f1=Math.min(N,Math.round(until*FPS));
   for(;f<f1;f++){
    if(err)throw err;const T=f/FPS,au=M.dataFromBuffer(L0,48000,T-from,prev),mode=T>=sc.len?'end':'live';
    stage.draw(Math.min(T,sc.len),1/FPS,au,{mode});
    bx.drawImage(stage.canvas,0,0,160,90);oc.imageSmoothingEnabled=true;oc.drawImage(bl,0,0,OW,OH);oc.imageSmoothingEnabled=false;oc.drawImage(stage.canvas,sx,0,sw,OH);
    drawHud(oc,sc,Math.min(T,sc.len),stage,heartsF,1/FPS,au);
    const vf=new VideoFrame(out,{timestamp:Math.round(f*1e6/FPS),duration:Math.round(1e6/FPS)});venc.encode(vf,{keyFrame:f%96===0});vf.close();
    while(venc.encodeQueueSize>8){await Promise.race([new Promise(r=>venc.addEventListener('dequeue',r,{once:true})),new Promise(r=>setTimeout(r,40))]);if(err)throw err}
    if(f%6===0){const p=Math.round(f/N*100),el=(performance.now()-t0)/1000,eta=f?Math.round(el/f*(N-f)):0;$q('#smProg').style.width=p+'%';badge(p);rm('Rendering '+p+'%  (about '+mmss(eta)+' left). You can switch tabs, it keeps going.');await yieldNow()}
   }
  }
  await venc.flush();await aenc.flush();if(err)throw err;muxer.finalize();
  const blob=new Blob([target.buffer],{type:'video/mp4'}),id='r'+Date.now();
  let kept=true;try{await lib.put({id,title:sc.title,created:Date.now(),expires:Date.now()+7*DAY,size:blob.size,blob})}catch(e){kept=false}
  $q('#smProg').style.width='100%';rm('Done: '+(blob.size/1048576).toFixed(0)+' MB, '+mmss(TOTAL)+' long. '+(kept?'Saved in this browser for 7 days (see Video Renders).':'Could not keep a copy here, so download it now.'));
  dl(blob,(sc.title||'show').replace(/[^\w -]+/g,'')+'.mp4');await rRend();
 }catch(e){console.warn(e);rm('Render failed: '+((e&&e.message)||e))}
 finally{try{venc&&venc.close()}catch(e){}try{aenc&&aenc.close()}catch(e){}E.busy=false;btn.disabled=false;badge();removeEventListener('beforeunload',beforeUnload)}
}
function drawHud(c,sc,T,stage,fl,dt,au){
 const k=sc.tracks[M.trackAt(sc,T)];
 if(k){c.fillStyle='rgba(8,6,16,.78)';c.fillRect(14,14,300,64);c.strokeStyle='#2a2542';c.strokeRect(14.5,14.5,299,63);c.fillStyle='#8e8aa8';c.font='600 10px Montserrat, sans-serif';c.fillText('NOW PLAYING',26,32);c.fillStyle='#fff';c.font='700 17px Montserrat, sans-serif';c.fillText(String(k.title).slice(0,22).toUpperCase(),26,54);c.fillStyle='#a9a5c0';c.font='500 11px Montserrat, sans-serif';c.fillText([k.bpm&&k.bpm+' BPM',k.key].filter(Boolean).join('  ')+'   '+mmss(T)+' / '+mmss(sc.len),26,70)}
 /* floating crowd hearts: decorative, rate follows the crowd energy */
 if(Math.random()<dt*(.5+stage.energy*6))fl.push({x:Math.random()*1280,y:720,vy:-(50+Math.random()*80),ph:Math.random()*6.28,s:2+Math.floor(Math.random()*3),l:1,c:['#ff3b4a','#ff5c8a','#ff8ab0','#ffd34a','#fff'][Math.floor(Math.random()*5)]});
 const HRT=['0110110','1111111','1111111','0111110','0011100','0001000'];
 for(let i=fl.length-1;i>=0;i--){const p=fl[i];p.y+=p.vy*dt;p.x+=Math.sin(p.ph+p.y*.03)*14*dt;p.l-=dt*.22;if(p.l<=0||p.y<-30){fl.splice(i,1);continue}c.globalAlpha=Math.min(1,p.l*1.4);c.fillStyle=p.c;const s=p.s*2.4;for(let r=0;r<6;r++)for(let q=0;q<7;q++)if(HRT[r][q]==='1')c.fillRect(Math.round(p.x+q*s),Math.round(p.y+r*s),Math.ceil(s),Math.ceil(s))}
 c.globalAlpha=1;
}
function dl(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),8000)}
async function rRend(){
 const el=$q('#smRend');let L=[];try{await lib.purge();L=(await lib.all())||[]}catch(e){}
 L.sort((a,b)=>b.created-a.created);
 el.innerHTML=L.length?L.map(o=>`<div class="it" data-id="${o.id}"><b>${esc(o.title)}<br><span>${(o.size/1048576).toFixed(0)} MB  /  ${Math.max(0,Math.ceil((o.expires-Date.now())/DAY))} day(s) left</span></b><button data-a="dl">DOWNLOAD</button><button data-a="del">DELETE</button></div>`).join(''):'<div class="msg">No renders yet. Videos you render are kept here for 7 days, then removed automatically.</div>';
 el.querySelectorAll('.it').forEach(r=>{const o=L.find(x=>x.id===r.dataset.id);r.querySelectorAll('button').forEach(b=>b.onclick=async()=>{if(b.dataset.a==='dl')dl(o.blob,o.title.replace(/[^\w -]+/g,'')+'.mp4');else{await lib.del(o.id);rRend()}})})
}
/* ---------- wiring ---------- */
function wire(){
 $q('#smPlay').onclick=()=>E.playing?stopA():play();
 $q('#smScrub').oninput=e=>{E.T=+e.target.value;if(E.playing)stopA();E.stage.reset();setT()};$q('#smScrub').onchange=e=>{seek(+e.target.value)};
 root.querySelectorAll('[data-h]').forEach(b=>b.onclick=()=>{E.testHearts=+b.dataset.h;$q('#smHeart').value=E.testHearts});
 $q('#smHeart').oninput=e=>{E.testHearts=Math.max(0,+e.target.value||0)};
 $q('#smAddT').onclick=async()=>{const sc=E.script;if(sc.tracks.length>=8||!E.beats.length)return;const b=E.beats[Math.min(sc.tracks.length,E.beats.length-1)];sc.tracks.push({id:b.id,title:b.title,bpm:b.bpm||0,key:b.musical_key||'',audio:b.preview_path,cover:b.cover_path,start:0,end:30});spread();syncTracks();rTracks();await prep()};
 $q('#smSpread').onclick=spread;$q('#smAddS').onclick=addSeg;$q('#smSurprise').onclick=surprise;
 $q('#smLen').onchange=e=>{setLen(+e.target.value||5);e.target.value=E.script.len/60};
 $q('#smSave').onclick=async()=>{msg('Saving...');if(await save(E.status==='published'?'published':'draft'))msg('Saved as '+E.status+'.')};
 $q('#smPub').onclick=async()=>{if(!(await askConfirm('PUBLISH THIS SHOW?','Visitors will see it on the SHOW page and it goes live at the scheduled time. You can unpublish it later.')))return;msg('Publishing...');if(await save('published'))msg('Published! It is now on the SHOW page.')};
 $q('#smRender').onclick=renderVideo;
 ['#fxL','#fxF','#fxZ','#fxP','#fxW','#fxS','#fxI','#fxC','#fxE'].forEach(id=>$q(id).onchange=$q(id).oninput=()=>{collect()});
}
window.showMakerOpen=async function(){
 css();root=document.getElementById('showmk');root.classList.add('on');
 if(!mounted){root.innerHTML=html();mounted=true;wire();await M.loadFonts();E.plate=await M.loadPlate();E.stage=M.makeStage($q('#smCv'));E.stage.setPlate(E.plate);
  const {data:bt}=await sb.from('beats').select('id,title,bpm,musical_key,preview_path,cover_path').order('created_at',{ascending:false});E.beats=(bt||[]).filter(b=>b.preview_path);
  if(!E.script.tracks.length&&E.beats.length){const b=E.beats[0];E.script.tracks=[{id:b.id,title:b.title,bpm:b.bpm||0,key:b.musical_key||'',audio:b.preview_path,cover:b.cover_path,start:0,end:E.script.len}]}
  E.stage.setScript(E.script,[]);fillAll();await loadShows();await rRend();prep();
  cancelAnimationFrame(E.raf);E.raf=requestAnimationFrame(frame)}
 else{cancelAnimationFrame(E.raf);E.raf=requestAnimationFrame(frame)}
};
window.showMakerClose=function(){if(root){root.classList.remove('on');stopA()}cancelAnimationFrame(E.raf)};
})();
