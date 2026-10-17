/* MZPRD Pack Builder (back office > SAMPLE PACKS > BUILD A PACK).
   Drafts live ONLY in this browser (IndexedDB). Nothing goes to Cloudflare or Supabase until you press PUBLISH.
   Unpublish removes the cloud files again (your local draft stays so you can republish). */
(function(){
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const mb=n=>(n/1048576).toFixed(n>1e8?0:1)+' MB';
const AUDIO=/\.(wav|mp3|aif|aiff|flac|m4a|ogg|aac)$/i;
const slugify=t=>String(t||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
const clean=t=>String(t||'').replace(/[^A-Za-z0-9]+/g,'_').replace(/^_+|_+$/g,'');
let root=null,mounted=false,S={drafts:[],cur:null,busy:false,actx:null};
const $q=s=>root.querySelector(s);
/* ---------- local storage (browser only) ---------- */
const idb=()=>new Promise((ok,no)=>{const r=indexedDB.open('mzprd_packs',1);r.onupgradeneeded=()=>r.result.createObjectStore('drafts',{keyPath:'id'});r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)});
const tx=async(mode,fn)=>{const d=await idb();return new Promise((ok,no)=>{const t=d.transaction('drafts',mode),r=fn(t.objectStore('drafts'));t.oncomplete=()=>ok(r&&r.result);t.onerror=()=>no(t.error);t.onabort=()=>no(t.error)})};
const db={all:()=>tx('readonly',s=>s.getAll()),put:o=>tx('readwrite',s=>s.put(o)),del:id=>tx('readwrite',s=>s.delete(id))};
const draftSize=d=>d.files.reduce((s,f)=>s+f.size,0)+(d.cover?d.cover.size:0)+(d.preview?d.preview.size:0);
async function save(){const d=S.cur;if(!d)return;d.updated=Date.now();try{await db.put(d)}catch(e){msg('Could not save the draft in this browser: '+(e.message||e))}}
/* ---------- zip (store only, no compression, files are read lazily so big packs do not eat memory) ---------- */
const CRC=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0}return t})();
async function crcOf(blob,onp){let c=0xFFFFFFFF;const r=blob.stream().getReader();for(;;){const {done,value}=await r.read();if(done)break;for(let i=0;i<value.length;i++)c=CRC[(c^value[i])&255]^(c>>>8)}return (c^0xFFFFFFFF)>>>0}
function dosStamp(){const d=new Date();return{t:(d.getHours()<<11)|(d.getMinutes()<<5)|(d.getSeconds()>>1),d:((d.getFullYear()-1980)<<9)|((d.getMonth()+1)<<5)|d.getDate()}}
async function zipBlob(entries,onp){
 const enc=new TextEncoder(),st=dosStamp(),parts=[],cd=[];let off=0;
 for(let i=0;i<entries.length;i++){const e=entries[i],nm=enc.encode(e.name),size=e.blob.size,crc=await crcOf(e.blob);if(onp)onp(Math.round((i+1)/entries.length*100));
  const lh=new DataView(new ArrayBuffer(30));lh.setUint32(0,0x04034b50,true);lh.setUint16(4,20,true);lh.setUint16(6,0x0800,true);lh.setUint16(8,0,true);lh.setUint16(10,st.t,true);lh.setUint16(12,st.d,true);lh.setUint32(14,crc,true);lh.setUint32(18,size,true);lh.setUint32(22,size,true);lh.setUint16(26,nm.length,true);lh.setUint16(28,0,true);
  parts.push(lh.buffer,nm,e.blob);
  const ch=new DataView(new ArrayBuffer(46));ch.setUint32(0,0x02014b50,true);ch.setUint16(4,20,true);ch.setUint16(6,20,true);ch.setUint16(8,0x0800,true);ch.setUint16(10,0,true);ch.setUint16(12,st.t,true);ch.setUint16(14,st.d,true);ch.setUint32(16,crc,true);ch.setUint32(20,size,true);ch.setUint32(24,size,true);ch.setUint16(28,nm.length,true);ch.setUint32(42,off,true);
  cd.push(ch.buffer,nm);off+=30+nm.length+size;if(off>4e9)throw new Error('This pack is over 4 GB. Remove some files.')}
 const cdSize=cd.reduce((s,b)=>s+(b.byteLength!=null?b.byteLength:b.length),0),end=new DataView(new ArrayBuffer(22));
 end.setUint32(0,0x06054b50,true);end.setUint16(8,entries.length,true);end.setUint16(10,entries.length,true);end.setUint32(12,cdSize,true);end.setUint32(16,off,true);
 return new Blob([...parts,...cd,end.buffer],{type:'application/zip'});
}
/* ---------- audio helpers ---------- */
const actx=()=>S.actx||(S.actx=new (window.AudioContext||window.OfflineAudioContext)());
async function decode(blob){return await actx().decodeAudioData(await blob.arrayBuffer())}
function guessBpm(n){const m=String(n).match(/(\d{2,3})\s?-?bpm/i);return m?+m[1]:0}
function guessKey(n){const m=String(n).match(/(?:^|[_\s.-])([A-G][#b]?(?:maj|min|m)?)(?=[_\s.-]|$)/);return m?m[1]:''}
async function analyzeFiles(d,onp){
 const L=d.files.filter(f=>AUDIO.test(f.name)&&f.dur==null);let i=0;
 for(const f of L){
  try{const b=await decode(f.blob);f.dur=b.duration;f.kind=b.duration<2.5?'shot':'loop'}catch(e){f.dur=0;f.kind='other';f.bad=true}
  f.bpm=f.bpm||guessBpm(f.name);f.key=f.key||guessKey(f.name);i++;if(onp)onp(i,L.length);if(i%4===0){await new Promise(r=>setTimeout(r,0))}
 }
 d.files.forEach(f=>{if(!AUDIO.test(f.name)){f.kind='other';f.dur=0}});
}
function autoName(d){
 const t=clean(d.title)||'Pack',cnt={loop:0,shot:0,other:0},lab={loop:'Loop',shot:'Shot',other:'Extra'};
 d.files.forEach(f=>{if(!f.use)return;const ext=(f.name.match(/\.[A-Za-z0-9]+$/)||[''])[0].toLowerCase();cnt[f.kind]++;
  f.newName=[t,lab[f.kind],String(cnt[f.kind]).padStart(2,'0'),f.bpm?f.bpm+'bpm':'',f.key||''].filter(Boolean).join('_')+ext})
}
const folderOf=f=>f.kind==='loop'?'Loops':f.kind==='shot'?'One-Shots':'Extras';
/* ---------- cover maker ---------- */
async function makeCover(d,art){
 const c=document.createElement('canvas');c.width=c.height=1200;const x=c.getContext('2d');
 let h=0;for(const ch of d.title||'x')h=(h*31+ch.charCodeAt(0))%360;
 x.fillStyle=`hsl(${h} 45% 6%)`;x.fillRect(0,0,1200,1200);
 if(art){const s=Math.max(1200/art.width,1200/art.height);x.globalAlpha=.55;x.filter='blur(6px)';x.drawImage(art,(1200-art.width*s)/2,(1200-art.height*s)/2,art.width*s,art.height*s);x.filter='none';x.globalAlpha=1}
 const g=x.createRadialGradient(600,520,40,600,520,760);g.addColorStop(0,`hsla(${h},90%,55%,.5)`);g.addColorStop(1,'rgba(0,0,0,.85)');x.fillStyle=g;x.fillRect(0,0,1200,1200);
 x.strokeStyle='rgba(255,214,90,.9)';x.lineWidth=6;x.strokeRect(40,40,1120,1120);x.lineWidth=2;x.strokeStyle='rgba(255,255,255,.35)';x.strokeRect(62,62,1076,1076);
 /* crown */
 const p=[[-1,.45],[-.92,-.35],[-.4,.15],[0,-.7],[.4,.15],[.92,-.35],[1,.45]];x.beginPath();p.forEach(([a,b],i)=>i?x.lineTo(600+a*130,300+b*130):x.moveTo(600+a*130,300+b*130));x.closePath();x.fillStyle='#ffcf3d';x.shadowColor='#ffb020';x.shadowBlur=40;x.fill();x.shadowBlur=0;x.lineWidth=5;x.strokeStyle='#1b0f2b';x.stroke();
 const words=String(d.title||'SAMPLE PACK').toUpperCase().split(/\s+/).filter(Boolean).slice(0,3);let y=455;const lh=words.length===1?300:words.length===2?230:150;
 await document.fonts.load('100px Anton').catch(()=>{});
 words.forEach((w,i)=>{x.font='100px Anton';const px=Math.min(lh,100*980/Math.max(1,x.measureText(w).width));x.font=px+'px Anton, Impact, sans-serif';x.textAlign='center';x.textBaseline='top';
  x.lineJoin='round';x.lineWidth=px*.08;x.strokeStyle='#050505';x.strokeText(w,600,y);const gr=x.createLinearGradient(0,y,0,y+px);gr.addColorStop(0,i%2?'#fff6c8':'#ffffff');gr.addColorStop(1,i%2?'#d99a12':'#d9dde6');x.fillStyle=gr;x.fillText(w,600,y);y+=px*.98});
 x.font='46px Oswald, Arial, sans-serif';if('letterSpacing' in x)x.letterSpacing='12px';x.fillStyle='#ff4b57';x.textAlign='center';x.fillText('SAMPLE PACK',600,1020);
 const nl=d.files.filter(f=>f.use&&f.kind==='loop').length,ns=d.files.filter(f=>f.use&&f.kind==='shot').length;
 x.font='30px Oswald, Arial, sans-serif';x.fillStyle='#ffd34a';x.fillText([nl&&nl+' LOOPS',ns&&ns+' ONE-SHOTS'].filter(Boolean).join('   •   '),600,1085);
 x.font='24px Oswald, Arial, sans-serif';x.fillStyle='rgba(255,255,255,.7)';x.fillText('PROD. MZPRD',600,1130);
 return await new Promise(r=>c.toBlob(r,'image/jpeg',.9));
}
/* ---------- preview maker (m4a/AAC when possible, small WAV otherwise) ---------- */
async function makePreview(d,onp){
 const pool=d.files.filter(f=>f.use&&AUDIO.test(f.name)&&!f.bad),loops=pool.filter(f=>f.kind==='loop').sort((a,b)=>b.dur-a.dur),shots=pool.filter(f=>f.kind==='shot');
 let pick=(loops.length?loops:shots).slice(0,8);if(!pick.length)throw new Error('Add some audio files first.');
 const SR=48000,seg=loops.length?6:1.2,fade=.35,xf=.5;let T=0;const placed=[];
 for(const f of pick){const buf=await decode(f.blob),len=Math.min(buf.duration,seg);placed.push({buf,t:T,len});T+=len-xf;if(T>58)break}
 const total=Math.min(60,T+xf+.2),oc=new OfflineAudioContext(2,Math.ceil(total*SR),SR),comp=oc.createDynamicsCompressor();comp.connect(oc.destination);
 placed.forEach(p=>{const s=oc.createBufferSource();s.buffer=p.buf;const g=oc.createGain();g.gain.setValueAtTime(0,p.t);g.gain.linearRampToValueAtTime(.9,p.t+fade);g.gain.setValueAtTime(.9,Math.max(p.t+fade,p.t+p.len-fade));g.gain.linearRampToValueAtTime(0,p.t+p.len);s.connect(g);g.connect(comp);s.start(p.t,0,p.len)});
 const rb=await oc.startRendering();
 if(window.AudioEncoder&&window.Mp4Muxer){
  try{const cfg={codec:'mp4a.40.2',sampleRate:SR,numberOfChannels:2,bitrate:128000},sup=await AudioEncoder.isConfigSupported(cfg);
   if(sup&&sup.supported){const target=new Mp4Muxer.ArrayBufferTarget(),mux=new Mp4Muxer.Muxer({target,audio:{codec:'aac',numberOfChannels:2,sampleRate:SR},fastStart:'in-memory'});let err=null;
    const enc=new AudioEncoder({output:(c,m)=>mux.addAudioChunk(c,m),error:e=>{err=e}});enc.configure(cfg);const L=rb.getChannelData(0),R=rb.getChannelData(1);
    for(let o=0;o<L.length;o+=4800){const m=Math.min(4800,L.length-o),b=new Float32Array(m*2);b.set(L.subarray(o,o+m),0);b.set(R.subarray(o,o+m),m);const ad=new AudioData({format:'f32-planar',sampleRate:SR,numberOfFrames:m,numberOfChannels:2,timestamp:Math.round(o/SR*1e6),data:b});enc.encode(ad);ad.close()}
    await enc.flush();if(err)throw err;mux.finalize();enc.close();return{blob:new Blob([target.buffer],{type:'audio/mp4'}),ext:'m4a'}}}catch(e){console.warn('aac failed',e)}
 }
 /* fallback: 16-bit mono 22 kHz wav */
 const L=rb.getChannelData(0),step=Math.round(SR/22050),n=Math.floor(L.length/step),buf=new ArrayBuffer(44+n*2),v=new DataView(buf),w=(o,s)=>[...s].forEach((c,i)=>v.setUint8(o+i,c.charCodeAt(0)));
 w(0,'RIFF');v.setUint32(4,36+n*2,true);w(8,'WAVE');w(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,22050,true);v.setUint32(28,44100,true);v.setUint16(32,2,true);v.setUint16(34,16,true);w(36,'data');v.setUint32(40,n*2,true);
 for(let i=0;i<n;i++)v.setInt16(44+i*2,Math.max(-1,Math.min(1,L[i*step]))*32767,true);return{blob:new Blob([buf],{type:'audio/wav'}),ext:'wav'};
}
/* ---------- ui ---------- */
function css(){
 if(document.getElementById('pbCss'))return;const s=document.createElement('style');s.id='pbCss';
 s.textContent=`#pbk{display:none;position:fixed;inset:0;z-index:76;background:rgba(5,5,8,.97);overflow:auto;padding:20px clamp(12px,3vw,40px) 60px}#pbk.on{display:block}
#pbk .hd{display:flex;align-items:center;gap:12px;margin-bottom:14px;border-bottom:2px solid var(--red);padding-bottom:12px}#pbk .hd h2{font:400 13px 'Press Start 2P';color:#fff;margin-right:auto}
#pbk .btn{background:transparent;border:1.5px solid #4a4a50;color:#fff;font:600 10px Montserrat;letter-spacing:.16em;padding:10px 12px;cursor:pointer}#pbk .btn:hover{border-color:#fff}
#pbk .btn.go{background:var(--red);border-color:var(--red);font:700 12px Montserrat;letter-spacing:.2em;padding:14px 18px}#pbk .btn:disabled{opacity:.45}
#pbk .pn{background:#0c0c0f;border:1px solid #2a2a2e;padding:14px;margin-bottom:14px}
#pbk h4{font:700 11px Montserrat;letter-spacing:.26em;color:var(--gold);margin:0 0 10px}
#pbk label{display:block;font:600 10px Montserrat;letter-spacing:.2em;color:#8e8e94;margin:8px 0 4px}
#pbk input[type=text],#pbk input[type=number],#pbk textarea,#pbk select{width:100%;background:#050506;border:1.5px solid #34343a;color:#fff;padding:8px;font:500 13px Montserrat}
#pbk textarea{min-height:90px;resize:vertical}
#pbk .g{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px}@media(max-width:800px){#pbk .g{grid-template-columns:1fr}}
#pbk .drop{border:2px dashed #4a4a50;padding:26px;text-align:center;color:#a9a9ae;font:600 12px Montserrat;letter-spacing:.1em;cursor:pointer}#pbk .drop.on{border-color:var(--red);color:#fff}
#pbk table{width:100%;border-collapse:collapse;font:500 12px Montserrat}#pbk th{text-align:left;font:700 9px Montserrat;letter-spacing:.16em;color:#8e8e94;padding:5px}#pbk td{padding:4px 5px;border-top:1px solid #1d1d21;color:#d9d9dc}
#pbk td input[type=text],#pbk td select,#pbk td input[type=number]{padding:5px;font-size:12px}
#pbk .msg{font:500 12px/1.5 Montserrat;color:#a9a9ae;margin-top:8px;min-height:16px}
#pbk .bar{height:6px;background:#1b1b20;margin-top:8px}#pbk .bar b{display:block;height:100%;width:0;background:var(--red)}
#pbk .dr{display:flex;gap:10px;align-items:center;padding:10px;border-bottom:1px solid #1d1d21;font:600 12px Montserrat;color:#d9d9dc}#pbk .dr b{flex:1}#pbk .dr span{font:500 11px Montserrat;color:#8e8e94}
#pbk .tag{font:700 9px Montserrat;letter-spacing:.14em;padding:3px 7px;margin-left:6px}#pbk .tag.d{background:#3a3a44}#pbk .tag.p{background:#e0242f}
#pbk .pv{max-width:240px;display:block;margin-top:8px;border:1px solid #2a2a2e}`;
 document.head.appendChild(s);
}
const msg=t=>{const e=root&&root.querySelector('#pbMsg');if(e)e.textContent=t};
function shell(){root.innerHTML=`<div class="hd"><h2>PACK BUILDER</h2><button class="btn" id="pbBack" style="display:none">&larr; ALL DRAFTS</button><button class="btn" id="pbClose">CLOSE</button></div><div id="pbBody"></div>`;
 $q('#pbClose').onclick=close;$q('#pbBack').onclick=()=>{S.cur=null;home()}}
function close(){root.classList.remove('on')}
async function home(){
 $q('#pbBack').style.display='none';S.cur=null;S.drafts=(await db.all().catch(()=>[]))||[];S.drafts.sort((a,b)=>b.updated-a.updated);
 let est='';try{const e=await navigator.storage.estimate();est='This browser is using '+mb(e.usage||0)+' of about '+mb(e.quota||0)+' of local space.'}catch(e){}
 let cloud=0,pubs=0;try{const r=await sb.from('packs').select('size_bytes,published');(r.data||[]).forEach(p=>{if(p.published){pubs++;cloud+=Number(p.size_bytes||0)}})}catch(e){}
 $q('#pbBody').innerHTML=`<div class="pn"><h4>HOW IT WORKS</h4><div class="msg" style="margin:0">Build a pack here: drop in your sounds, auto-name them, make a cover and a preview, and build the zip. <b style="color:#fff">Nothing is uploaded until you press PUBLISH</b>, so drafts cost no cloud space. Published packs use cloud space (counted below), and UNPUBLISH removes their files from the cloud again.</div><div class="msg">${esc(est)}  Published packs use about <b style="color:#fff">${mb(cloud)}</b> of cloud space across ${pubs} pack${pubs===1?'':'s'}${cloud?'':' (older packs made before this tool are not measured)'}.</div></div>
 <div class="pn"><div style="display:flex;gap:10px;align-items:center"><h4 style="margin:0;flex:1">MY PACK DRAFTS</h4><button class="btn go" id="pbNew">+ NEW PACK</button></div><div id="pbList" style="margin-top:10px"></div></div>`;
 $q('#pbNew').onclick=async()=>{S.cur={id:'d'+Date.now(),title:'',desc:'',price:19.99,free:false,files:[],cover:null,preview:null,license:LIC,cloud:null,updated:Date.now()};await save();editor()};
 const el=$q('#pbList');
 el.innerHTML=S.drafts.length?S.drafts.map(d=>`<div class="dr" data-id="${d.id}"><b>${esc(d.title||'Untitled pack')}<span class="tag ${d.cloud?'p':'d'}">${d.cloud?'PUBLISHED':'DRAFT'}</span><br><span>${d.files.length} files / ${mb(draftSize(d))} on this computer${d.cloud?' / cloud: '+mb(d.cloud.size||0):''}</span></b><button class="btn" data-a="open">OPEN</button><button class="btn" data-a="del">DELETE DRAFT</button></div>`).join(''):'<div class="msg">No drafts yet. Start a new pack.</div>';
 el.querySelectorAll('.dr').forEach(r=>{const d=S.drafts.find(x=>x.id===r.dataset.id);r.querySelectorAll('button').forEach(b=>b.onclick=async()=>{if(b.dataset.a==='open'){S.cur=d;editor()}else{if(!(await askConfirm('DELETE THIS DRAFT?',d.cloud?'This only removes the copy on this computer. The published pack stays online until you unpublish it.':'The files in this draft are removed from this computer.')))return;await db.del(d.id);home()}})})
}
const LIC='LICENSE (MZPRD)\n\nYou may use these sounds in your own music, including commercial releases.\nYou may not resell, share or redistribute the sounds on their own, as a pack or as samples.\nCredit is appreciated: Prod. MZPRD.\n';
function editor(){
 const d=S.cur;$q('#pbBack').style.display='inline-block';
 $q('#pbBody').innerHTML=`<div class="pn"><h4>1. PACK DETAILS</h4><div class="g"><div><label>TITLE</label><input type="text" id="pbTitle"></div><div><label>PRICE (USD)</label><input type="number" id="pbPrice" step="0.01" min="0"></div><div><label>&nbsp;</label><label style="display:flex;gap:8px;align-items:center;letter-spacing:.1em;margin:14px 0 0"><input type="checkbox" id="pbFree" style="width:auto"> OFFER THE PREVIEW AS A FREE DOWNLOAD</label></div></div><label>DESCRIPTION</label><textarea id="pbDesc" placeholder="What is in this pack? Genres, vibes, how many loops and one-shots."></textarea></div>
 <div class="pn"><h4>2. YOUR SOUNDS</h4><div class="drop" id="pbDrop">DROP FILES OR A FOLDER HERE, OR CLICK TO CHOOSE<input type="file" id="pbFiles" multiple style="display:none"></div><div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap"><button class="btn" id="pbFolder">CHOOSE A FOLDER</button><button class="btn" id="pbAuto">AUTO-NAME ALL</button><button class="btn" id="pbDet">DETECT MISSING BPM (LOOPS)</button></div><input type="file" id="pbDir" webkitdirectory multiple style="display:none"><div id="pbTbl" style="margin-top:10px;overflow:auto;max-height:420px"></div><div class="msg" id="pbSum"></div></div>
 <div class="pn"><h4>3. COVER AND PREVIEW</h4><div class="g"><div><button class="btn" id="pbCov">MAKE A COVER</button> <button class="btn" id="pbCovUp">USE MY OWN IMAGE</button><input type="file" id="pbCovIn" accept="image/*" style="display:none"><div id="pbCovBox"></div></div><div><button class="btn" id="pbPrev">MAKE A PREVIEW (UP TO 60 SECONDS)</button> <button class="btn" id="pbPrevUp">USE MY OWN AUDIO</button><input type="file" id="pbPrevIn" accept="audio/*" style="display:none"><div id="pbPrevBox"></div></div><div><label>LICENSE TEXT (INCLUDED IN THE ZIP)</label><textarea id="pbLic" style="min-height:130px"></textarea><label style="display:flex;gap:8px;align-items:center;letter-spacing:.1em"><input type="checkbox" id="pbLicOn" style="width:auto" checked> INCLUDE LICENSE.TXT</label></div></div></div>
 <div class="pn"><h4>4. BUILD AND PUBLISH</h4><div class="msg" id="pbSize" style="margin:0 0 8px"></div>
 <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" id="pbZipTest">BUILD THE ZIP ON MY COMPUTER (NO UPLOAD)</button><button class="btn go" id="pbPub">PUBLISH PACK (UPLOADS TO THE CLOUD)</button><button class="btn" id="pbUn" style="display:none">UNPUBLISH AND FREE CLOUD SPACE</button></div>
 <div class="bar"><b id="pbProg"></b></div><div class="msg" id="pbMsg"></div></div>`;
 $q('#pbTitle').value=d.title;$q('#pbPrice').value=d.price;$q('#pbFree').checked=!!d.free;$q('#pbDesc').value=d.desc;$q('#pbLic').value=d.license;
 const sync=()=>{d.title=$q('#pbTitle').value;d.price=parseFloat($q('#pbPrice').value)||0;d.free=$q('#pbFree').checked;d.desc=$q('#pbDesc').value;d.license=$q('#pbLic').value;d.licOn=$q('#pbLicOn').checked};
 ['#pbTitle','#pbPrice','#pbFree','#pbDesc','#pbLic','#pbLicOn'].forEach(id=>$q(id).onchange=()=>{sync();save();rSize()});
 const dz=$q('#pbDrop');dz.onclick=()=>$q('#pbFiles').click();$q('#pbFolder').onclick=()=>$q('#pbDir').click();
 dz.ondragover=e=>{e.preventDefault();dz.classList.add('on')};dz.ondragleave=()=>dz.classList.remove('on');
 dz.ondrop=async e=>{e.preventDefault();dz.classList.remove('on');const fl=await readDrop(e.dataTransfer);addFiles(fl)};
 $q('#pbFiles').onchange=e=>addFiles([...e.target.files]);$q('#pbDir').onchange=e=>addFiles([...e.target.files]);
 $q('#pbAuto').onclick=()=>{sync();autoName(d);save();rTbl()};
 $q('#pbDet').onclick=detBpm;
 $q('#pbCov').onclick=async()=>{sync();msg('Making the cover...');try{await new Promise(r=>setTimeout(r,30));d.cover=await makeCover(d,S.art);await save();rCov();msg('Cover made.')}catch(e){msg('Could not make the cover: '+e.message)}};
 $q('#pbCovUp').onclick=()=>$q('#pbCovIn').click();
 $q('#pbCovIn').onchange=async e=>{const f=e.target.files[0];if(!f)return;d.cover=f;try{S.art=await createImageBitmap(f)}catch(x){}await save();rCov()};
 $q('#pbPrev').onclick=makePrev;$q('#pbPrevUp').onclick=()=>$q('#pbPrevIn').click();
 $q('#pbPrevIn').onchange=async e=>{const f=e.target.files[0];if(!f)return;d.preview=f;d.previewExt=(f.name.match(/\.[A-Za-z0-9]+$/)||['.mp3'])[0].slice(1).toLowerCase();await save();rPrev()};
 $q('#pbZipTest').onclick=async()=>{sync();try{const z=await buildZip(true);const a=document.createElement('a');a.href=URL.createObjectURL(z);a.download=(clean(d.title)||'pack')+'.zip';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),8000);msg('Zip built: '+mb(z.size)+'. It was saved to your downloads, nothing was uploaded.')}catch(e){msg('Zip failed: '+e.message)}};
 $q('#pbPub').onclick=publish;$q('#pbUn').onclick=unpublish;
 rTbl();rCov();rPrev();rSize();
}
async function readDrop(dt){
 const out=[];const walk=async(entry,path)=>{if(entry.isFile){await new Promise(r=>entry.file(f=>{f._rel=path+f.name;out.push(f);r()},r))}else if(entry.isDirectory){const rd=entry.createReader();const all=[];for(;;){const b=await new Promise(r=>rd.readEntries(r,()=>r([])));if(!b.length)break;all.push(...b)}for(const e of all)await walk(e,path+entry.name+'/')}};
 const items=[...(dt.items||[])].map(i=>i.webkitGetAsEntry&&i.webkitGetAsEntry()).filter(Boolean);
 if(items.length)for(const it of items)await walk(it,'');else out.push(...dt.files);return out;
}
async function addFiles(list){
 const d=S.cur;let n=0;for(const f of list){if(/^\./.test(f.name))continue;if(d.files.some(x=>x.name===f.name&&x.size===f.size))continue;d.files.push({id:'f'+Date.now()+'_'+(n++)+Math.random().toString(36).slice(2,5),name:f.name,size:f.size,type:f.type,blob:f,use:true,kind:'loop',dur:null,bpm:0,key:'',newName:'',rel:f._rel||f.webkitRelativePath||''})}
 msg('Reading '+list.length+' files...');await analyzeFiles(d,(i,t)=>msg('Listening to your sounds '+i+' / '+t+'...'));autoName(d);await save();rTbl();rSize();msg('Added. Check the names and BPM, then make the cover and preview.');
}
async function detBpm(){
 const d=S.cur;if(!window.MZShow){await new Promise((ok,no)=>{const s=document.createElement('script');s.src=new URL('show.js?v=3',document.baseURI).href;s.onload=ok;s.onerror=no;document.head.appendChild(s)})}
 const L=d.files.filter(f=>f.use&&f.kind==='loop'&&!f.bpm&&AUDIO.test(f.name));let i=0;
 for(const f of L){try{const b=await decode(f.blob),an=await MZShow.analyze(b);f.bpm=an.bpm||0}catch(e){}i++;msg('Detecting BPM '+i+' / '+L.length+'...')}
 autoName(d);await save();rTbl();msg('Done. BPM is a best guess, please check it.')
}
function rTbl(){
 const d=S.cur,el=$q('#pbTbl');
 el.innerHTML=d.files.length?`<table><tr><th></th><th>FILE</th><th>TYPE</th><th>BPM</th><th>KEY</th><th>LENGTH</th><th>SIZE</th><th>NAME IN THE ZIP</th><th></th></tr>${d.files.map((f,i)=>`<tr data-i="${i}"><td><input type="checkbox" data-f="use" ${f.use?'checked':''}></td><td title="${esc(f.rel||f.name)}">${esc(f.name.length>26?f.name.slice(0,24)+'..':f.name)}</td><td><select data-f="kind"><option value="loop"${f.kind==='loop'?' selected':''}>Loop</option><option value="shot"${f.kind==='shot'?' selected':''}>One-shot</option><option value="other"${f.kind==='other'?' selected':''}>Extra</option></select></td><td><input type="number" data-f="bpm" min="0" max="300" value="${f.bpm||''}" style="width:62px"></td><td><input type="text" data-f="key" value="${esc(f.key)}" style="width:56px"></td><td>${f.dur?f.dur.toFixed(1)+'s':'-'}</td><td>${mb(f.size)}</td><td><input type="text" data-f="newName" value="${esc(f.newName)}"></td><td><button class="btn" data-f="rm" style="padding:4px 8px">&times;</button></td></tr>`).join('')}</table>`:'<div class="msg">No sounds yet. Drop in your files above.</div>';
 el.querySelectorAll('tr[data-i]').forEach(r=>{const f=d.files[+r.dataset.i];r.querySelectorAll('[data-f]').forEach(c=>{const k=c.dataset.f;c.onchange=c.onclick=null;
  if(k==='rm')c.onclick=async()=>{d.files.splice(+r.dataset.i,1);await save();rTbl();rSize()};
  else c.onchange=async()=>{f[k]=k==='use'?c.checked:k==='bpm'?(+c.value||0):c.value;if(k==='kind'||k==='bpm'||k==='key'){autoName(d)}await save();if(k==='kind'||k==='bpm'||k==='key'||k==='use')rTbl();rSize()}})});
 rSum();
}
function rSum(){const d=S.cur,u=d.files.filter(f=>f.use),nl=u.filter(f=>f.kind==='loop').length,ns=u.filter(f=>f.kind==='shot').length,no=u.length-nl-ns;$q('#pbSum').textContent=u.length?`${nl} loops, ${ns} one-shots${no?', '+no+' extras':''}  /  ${mb(u.reduce((s,f)=>s+f.size,0))}`:''}
function rCov(){const d=S.cur,b=$q('#pbCovBox');if(d.cover){const u=URL.createObjectURL(d.cover);b.innerHTML=`<img class="pv" src="${u}" alt="cover">`}else b.innerHTML='<div class="msg">No cover yet.</div>'}
function rPrev(){const d=S.cur,b=$q('#pbPrevBox');if(d.preview){const u=URL.createObjectURL(d.preview);b.innerHTML=`<audio controls src="${u}" style="width:100%;margin-top:8px"></audio><div class="msg">${mb(d.preview.size)} (${esc(d.previewExt||'')})</div>`}else b.innerHTML='<div class="msg">No preview yet.</div>'}
function rSize(){const d=S.cur,u=d.files.filter(f=>f.use),zs=u.reduce((s,f)=>s+f.size,0)+(d.licOn===false?0:2000),total=zs+(d.cover?d.cover.size:0)+(d.preview?d.preview.size:0);
 $q('#pbSize').innerHTML=`Cloud space this pack will use once published: <b style="color:#fff">${mb(total)}</b> (zip ${mb(zs)}, cover ${mb(d.cover?d.cover.size:0)}, preview ${mb(d.preview?d.preview.size:0)}). Until you publish: <b style="color:#fff">0 MB</b> in the cloud.${d.cloud?`<br>This pack is published right now (${mb(d.cloud.size||0)} in the cloud).`:''}`;
 $q('#pbUn').style.display=d.cloud?'inline-block':'none';$q('#pbPub').textContent=d.cloud?'REPUBLISH WITH CHANGES (REPLACES THE CLOUD FILES)':'PUBLISH PACK (UPLOADS TO THE CLOUD)'}
async function makePrev(){
 const d=S.cur;msg('Making the preview...');try{await loadMuxer();await new Promise(r=>setTimeout(r,30));const p=await makePreview(d);d.preview=p.blob;d.previewExt=p.ext;await save();rPrev();rSize();msg('Preview made: '+mb(p.blob.size)+'.')}catch(e){msg('Could not make the preview: '+e.message)}
}
function loadMuxer(){return window.Mp4Muxer?Promise.resolve():new Promise((ok,no)=>{const s=document.createElement('script');s.src=new URL('mp4-muxer.js',document.baseURI).href;s.onload=ok;s.onerror=()=>ok();document.head.appendChild(s)})}
async function buildZip(local){
 const d=S.cur,u=d.files.filter(f=>f.use);if(!u.length)throw new Error('Add some sounds first.');
 const names=new Set(),entries=[];
 for(const f of u){let nm=(f.newName||f.name).replace(/[\\/:*?"<>|]+/g,'_'),path=folderOf(f)+'/'+nm,i=1;while(names.has(path.toLowerCase())){path=folderOf(f)+'/'+nm.replace(/(\.[^.]*)?$/,'_'+(++i)+'$1')}names.add(path.toLowerCase());entries.push({name:path,blob:f.blob})}
 if(d.licOn!==false&&d.license)entries.push({name:'LICENSE.txt',blob:new Blob([d.license],{type:'text/plain'})});
 return await zipBlob(entries,p=>{$q('#pbProg').style.width=p+'%';msg('Building the zip '+p+'%')});
}
async function publish(){
 const d=S.cur;if(S.busy)return;d.title=$q('#pbTitle').value.trim();if(!d.title){msg('Give the pack a title first.');return}
 const u=d.files.filter(f=>f.use);if(!u.length){msg('Add some sounds first.');return}
 if(!d.cover){msg('Make or add a cover first.');return}
 if(!d.preview){msg('Make or add a preview first (it is what visitors listen to).');return}
 const est=u.reduce((s,f)=>s+f.size,0)+d.cover.size+d.preview.size;
 if(!(await askConfirm('PUBLISH "'+d.title.toUpperCase()+'"?','This uploads about '+mb(est)+' to your cloud storage and puts the pack on the site for sale.','PUBLISH')))return;
 S.busy=true;$q('#pbPub').disabled=true;const up=[];
 try{
  msg('Building the zip...');const z=await buildZip();
  const file=new File([z],(clean(d.title)||'pack')+'.zip',{type:'application/zip'});
  const pf=(p,k)=>{$q('#pbProg').style.width=p+'%';msg('Uploading '+k+' '+p+'%')};
  const zp=await upload(file,'private-files','packs',p=>pf(p,'pack'));up.push(['private-files',zp]);
  const cp=await upload(new File([d.cover],'cover.jpg',{type:d.cover.type||'image/jpeg'}),'public-media','covers',p=>pf(p,'cover'));up.push(['public-media',cp]);
  const ext=d.previewExt||'m4a',pp=await upload(new File([d.preview],'preview.'+ext,{type:d.preview.type||'audio/mp4'}),'public-media','previews',p=>pf(p,'preview'));up.push(['public-media',pp]);
  const row={title:d.title,description:d.desc||null,price:Math.max(0,d.price||0),published:true,free_download:!!d.free,sort_order:0,slug:slugify(d.title)||null,cover_path:cp,preview_path:pp,file_path:zp,size_bytes:z.size+d.cover.size+d.preview.size};
  msg('Saving the pack page...');
  let r;if(d.cloud&&d.cloud.packId)r=await sb.from('packs').update(row).eq('id',d.cloud.packId).select('id').maybeSingle();else r=await sb.from('packs').insert(row).select('id').maybeSingle();
  if(r.error)throw r.error;
  if(d.cloud){for(const [b,p] of [['public-media',d.cloud.cover],['public-media',d.cloud.preview],['private-files',d.cloud.file]])if(p)await rmObj(b,p)}
  d.cloud={packId:r.data.id,cover:cp,preview:pp,file:zp,size:row.size_bytes};await save();
  try{await loadAll()}catch(e){}
  msg('Published! "'+d.title+'" is live and uses '+mb(row.size_bytes)+' of cloud space.');toast('PACK PUBLISHED');rSize()
 }catch(e){for(const [b,p] of up)await rmObj(b,p);msg('Publish failed, nothing was kept in the cloud: '+(e.message||e))}
 finally{S.busy=false;$q('#pbPub').disabled=false}
}
async function unpublish(){
 const d=S.cur;if(!d.cloud||S.busy)return;
 if(!(await askConfirm('UNPUBLISH AND FREE CLOUD SPACE?','The pack page is removed and its files are deleted from the cloud ('+mb(d.cloud.size||0)+'). Your draft stays on this computer so you can publish it again.','UNPUBLISH')))return;
 S.busy=true;try{
  msg('Removing from the cloud...');for(const [b,p] of [['public-media',d.cloud.cover],['public-media',d.cloud.preview],['private-files',d.cloud.file]])if(p)await rmObj(b,p);
  const r=await sb.from('packs').delete().eq('id',d.cloud.packId);if(r.error)throw r.error;
  d.cloud=null;await save();try{await loadAll()}catch(e){}rSize();msg('Done. The pack is offline and its cloud files are deleted.');toast('PACK UNPUBLISHED')
 }catch(e){msg('Could not unpublish: '+(e.message||e))}finally{S.busy=false}
}
window.packBuilderOpen=async function(){
 css();root=document.getElementById('pbk');if(!root)return;
 if(!mounted){shell();mounted=true}root.classList.add('on');await home();
};
})();
