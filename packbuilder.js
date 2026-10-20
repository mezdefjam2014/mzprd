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
function demoList(d){return d.files.filter(f=>f.demo&&AUDIO.test(f.name)&&!f.bad)}
function rDemo(){const d=S.cur,el=$q('#pbDemoInfo');if(!el)return;const L=demoList(d);el.innerHTML=L.length?`Demo order: ${L.map((f,i)=>`<b style="color:#fff">${i+1}.</b> ${esc(f.newName||f.name)}`).join('  ')}<br>${L.length} sounds, about ${Math.round(L.reduce((s,f)=>s+Math.min(20,f.dur||20),0))} seconds. Each plays up to 20 seconds, fades out over 0.3 seconds, then the next one starts.`:'Tick DEMO next to the sounds you want in the demo (use PLAY to listen first). The order follows the table. If none are ticked, it picks loops for you.'}
function mzPlayer(el){const a=el.querySelector('audio'),bt=el.querySelector('.pbPP'),bar=el.querySelector('.pbBar'),fill=bar.querySelector('b'),tm=el.querySelector('.pbTm'),ft=s=>Math.floor(s/60)+':'+String(Math.floor(s%60)).padStart(2,'0');
 const up=()=>{const d=a.duration||0;fill.style.width=(d?a.currentTime/d*100:0)+'%';tm.textContent=ft(a.currentTime)+(d?' / '+ft(d):'')};a.onloadedmetadata=up;a.ontimeupdate=up;a.onended=()=>{bt.innerHTML='&#9654;';el.classList.remove('on')};
 bt.onclick=()=>{if(a.paused){if(PB.a){PB.a.pause();PB.id=null;rTbl()}a.play();bt.innerHTML='&#10074;&#10074;';el.classList.add('on')}else{a.pause();bt.innerHTML='&#9654;';el.classList.remove('on')}};
 bar.onclick=e=>{const r=bar.getBoundingClientRect();if(a.duration)a.currentTime=(e.clientX-r.left)/r.width*a.duration}}
/* one player for every uploaded sound, so you can hear what goes in the demo */
const PB={a:null,id:null,u:null};function playOne(f){if(PB.a){PB.a.pause();URL.revokeObjectURL(PB.u)}const same=PB.id===f.id;PB.a=null;PB.id=null;if(!same){PB.u=URL.createObjectURL(f.blob);PB.a=new Audio(PB.u);PB.id=f.id;PB.a.onended=()=>{PB.id=null;rTbl()};PB.a.play().catch(()=>{PB.id=null;rTbl()})}rTbl()}
async function makePreview(d,onp){
 const chosen=demoList(d),pool=d.files.filter(f=>f.use&&AUDIO.test(f.name)&&!f.bad),loops=pool.filter(f=>f.kind==='loop').sort((a,b)=>b.dur-a.dur),shots=pool.filter(f=>f.kind==='shot');
 const pick=chosen.length?chosen:(loops.length?loops:shots).slice(0,6);if(!pick.length)throw new Error('Add some audio files first.');
 const SR=48000,SEG=20,FADE=.3;let T=0;const placed=[];
 for(const f of pick){const buf=await decode(f.blob),len=Math.min(buf.duration,SEG);placed.push({buf,t:T,len});T+=len}
 const total=T+.05,oc=new OfflineAudioContext(2,Math.ceil(total*SR),SR),comp=oc.createDynamicsCompressor();comp.threshold.value=-10;comp.ratio.value=3;comp.connect(oc.destination);
 placed.forEach(p=>{const s=oc.createBufferSource();s.buffer=p.buf;const g=oc.createGain(),f=Math.min(FADE,p.len/2);g.gain.setValueAtTime(.9,p.t);g.gain.setValueAtTime(.9,p.t+p.len-f);g.gain.linearRampToValueAtTime(0,p.t+p.len);s.connect(g);g.connect(comp);s.start(p.t,0,p.len)});
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
 s.textContent=`#pbk .pbCard{margin-top:12px;border:1.5px solid #2a2a30;border-left:3px solid #e0242f;background:linear-gradient(180deg,#0e0e11,#09090b);padding:12px 14px}#pbk .pbCardH{font:800 10px Montserrat;letter-spacing:.24em;color:#e0242f;margin-bottom:4px}
#pbk .pbPlayer{display:flex;align-items:center;gap:12px;margin-top:10px;border:1.5px solid #2a2a30;background:#0a0a0c;padding:10px 12px}#pbk .pbPlayer.on{border-color:#e0242f;box-shadow:0 0 18px rgba(224,36,47,.25)}
#pbk .pbPP{flex:0 0 40px;height:40px;border:0;border-radius:50%;background:#e0242f;color:#fff;font-size:13px;cursor:pointer;box-shadow:0 0 14px rgba(224,36,47,.45)}#pbk .pbPP:hover{background:#ff3341}
#pbk .pbTrk{flex:1;min-width:0}#pbk .pbTt{font:800 11px Montserrat;letter-spacing:.14em;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:7px}#pbk .pbTt span{color:#e0242f;margin-left:6px}
#pbk .pbBar{height:6px;background:#26262b;cursor:pointer;position:relative}#pbk .pbBar b{position:absolute;left:0;top:0;bottom:0;width:0;background:#e0242f;box-shadow:0 0 8px rgba(224,36,47,.6)}
#pbk .pbTm{font:600 11px Montserrat;color:#a9a9ae;letter-spacing:.06em;white-space:nowrap}
#pbk .pbPl{border-color:#e0242f!important;color:#e0242f!important}#pbk .pbPl:hover{background:#e0242f!important;color:#fff!important}
#pbk input[data-f=demo]{accent-color:#e0242f;width:16px;height:16px}
#pbk{display:none;position:fixed;inset:0;z-index:76;background:rgba(5,5,8,.97);overflow:auto;padding:20px clamp(12px,3vw,40px) 60px}#pbk.on{display:block}
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
#pbk .pv{max-width:240px;display:block;margin-top:8px;border:1px solid #2a2a2e}
#pbk{background:radial-gradient(1200px 500px at 50% -10%,rgba(224,36,47,.12),transparent 60%),#070708!important;padding:24px clamp(12px,3vw,40px) 120px!important}
#pbk>*{max-width:1180px;margin-left:auto;margin-right:auto}
#pbk .hd{border-bottom:1px solid #222227!important;padding-bottom:16px!important;margin-bottom:22px!important}
#pbk .hd h2{font:400 clamp(28px,4vw,44px)/1 Anton,Impact,sans-serif!important;letter-spacing:.02em;color:#fff}#pbk .hd h2 span{color:#e0242f}
#pbk .pn{background:linear-gradient(180deg,#0f0f12,#0a0a0c)!important;border:1px solid #1f1f24!important;padding:22px 24px!important;margin-bottom:18px!important;box-shadow:0 10px 30px rgba(0,0,0,.35)}
#pbk .pbHd{display:flex;align-items:center;gap:14px;margin-bottom:16px}#pbk .pbN{flex:0 0 38px;height:38px;border-radius:50%;background:#e0242f;color:#fff;font:400 20px/38px Anton,Impact,sans-serif;text-align:center;box-shadow:0 0 18px rgba(224,36,47,.35)}
#pbk .pbHd h4{font:400 24px/1 Anton,Impact,sans-serif!important;letter-spacing:.03em!important;color:#fff!important;margin:0 0 4px!important}#pbk .pbHd p{margin:0;font:500 12px Montserrat;color:#8e8e94}
#pbk label{font:700 10px Montserrat!important;letter-spacing:.18em!important;color:#a9a9ae!important;margin:12px 0 6px!important}
#pbk input[type=text],#pbk input[type=number],#pbk textarea,#pbk select{background:#0a0a0c!important;border:1px solid #2c2c32!important;padding:11px 12px!important;font:500 14px Montserrat!important;transition:border-color .15s}
#pbk input:focus,#pbk textarea:focus,#pbk select:focus{outline:0;border-color:#e0242f!important;box-shadow:0 0 0 3px rgba(224,36,47,.15)}
#pbk textarea#pbDesc{min-height:150px;line-height:1.6}
#pbk .btn{border:1px solid #3a3a40!important;font:700 10px Montserrat!important;letter-spacing:.16em!important;padding:11px 14px!important;transition:all .15s}#pbk .btn:hover{border-color:#e0242f!important;color:#fff}
#pbk .btn.go{background:#e0242f!important;border-color:#e0242f!important;font:700 12px Montserrat!important;padding:14px 22px!important;box-shadow:0 6px 20px rgba(224,36,47,.3)}#pbk .btn.go:hover{background:#ff3341!important}
#pbk .drop{border:2px dashed #34343a!important;padding:34px!important;background:#0a0a0c;font:700 12px Montserrat!important;letter-spacing:.14em!important;transition:all .15s}#pbk .drop:hover,#pbk .drop.on{border-color:#e0242f!important;color:#fff;background:#120a0b}
#pbk table{font:500 13px Montserrat!important}#pbk th{padding:10px 8px!important;border-bottom:1px solid #26262b;color:#7d7d84!important}#pbk td{padding:7px 8px!important;border-top:1px solid #18181c!important}
#pbk tr:hover td{background:#121215}#pbk #pbTbl{border:1px solid #1f1f24;background:#08080a}
#pbk .msg{font:500 13px/1.6 Montserrat!important}
#pbk .pbCard{border:1px solid #26262b!important;border-left:3px solid #e0242f!important;padding:16px 18px!important;margin-top:16px!important}
#pbk .pbLicD{border:1px solid #26262b;background:#0a0a0c;padding:10px 12px;margin-top:2px}#pbk .pbLicD summary{cursor:pointer;font:700 10px Montserrat;letter-spacing:.18em;color:#a9a9ae}#pbk .pbLicD[open] summary{color:#fff;margin-bottom:8px}
#pbk .g{gap:16px!important}
#pbk .dr{background:#0f0f12;border:1px solid #1f1f24;padding:14px 16px;margin-bottom:10px;display:flex;align-items:center;gap:10px}#pbk .dr b{flex:1;font:700 14px Montserrat;color:#fff}#pbk .dr b span{font:500 12px Montserrat;color:#8e8e94}
#pbk .pbCard .g{grid-template-columns:1fr 1fr 1fr auto!important}@media(max-width:800px){#pbk .pbCard .g{grid-template-columns:1fr!important}}
`;
 document.head.appendChild(s);
}
const msg=t=>{const e=root&&root.querySelector('#pbMsg');if(e)e.textContent=t};
function shell(){root.innerHTML=`<div class="hd"><h2>PACK <span>BUILDER</span></h2><button class="btn" id="pbBack" style="display:none">&larr; ALL DRAFTS</button><button class="btn" id="pbClose">CLOSE</button></div><div id="pbBody"></div>`;
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
/* ---------- description generator: reads the pack name (mood) and the file names (instruments, loops vs one-shots) and writes a
   two-paragraph store description from large phrase banks. These are finished, ready-to-use compositions, so it never talks about
   chopping or BPM. Every result is remembered on this computer and never given twice. ---------- */
const DGSTY=[
 ['Feel Good Soul',['soulful','feel-good','warm','uplifting'],['soul','hip hop'],['a sunny day with the windows down','smiles all around the room']],
 ['Love and Soul',['romantic','soulful','tender','warm'],['soul','R&B'],['a slow dance in the living room','love letters and old records']],
 ['Soul Deep',['deep','soulful','emotional','heartfelt'],['soul','soulful hip hop'],['feelings that run deep','a voice that cracks with emotion']],
 ['Vibes',['smooth','easygoing','vibey','mellow'],['R&B','hip hop'],['good company and good music','a late-night hang with friends']],
 ['Hard and Energetic',['hard-hitting','energetic','aggressive','loud'],['trap','street rap'],['a packed room ready to explode','adrenaline and bass']],
 ['Dusty Boom Bap',['dusty','gritty','vintage','raw'],['boom bap','sample-based hip hop'],['a 90s basement session','tape hiss and late nights']],
 ['Vintage Soul',['vintage','analog','warm','classic'],['soul','boom bap'],['records from the 60s and 70s','a classic soul session']],
 ['Gospel and Church',['uplifting','gospel-rooted','spiritual','powerful'],['gospel rap','soul'],['a Sunday choir in full voice','light through stained glass']],
 ['Jazzy Late Night',['jazzy','smoky','late-night','smooth'],['jazz rap','lo-fi'],['a smoky lounge after midnight','the last set of the night']],
 ['Dark and Gritty',['dark','gritty','menacing','cold'],['street rap','underground rap'],['an empty street at 3am','concrete and shadows']],
 ['Luxury and Boss',['luxurious','regal','confident','polished'],['luxury rap','hip hop'],['penthouse views and gold chains','a boss move made quietly']],
 ['Street Stories',['raw','real','street-ready','gritty'],['street rap','boom bap'],['corners, concrete and real stories','the grind that never stops']],
 ['Griselda Grit',['grimy','raw','cold','vintage'],['underground rap','boom bap'],['Buffalo winters and hard bars','cold rooms and loud speakers']],
 ['Sad and Emotional',['sad','emotional','melancholic','heartbroken'],['emotional rap','R&B'],['rain on the window after a goodbye','memories you cannot shake']],
 ['Heartbreak R&B',['heartbroken','sultry','moody','tender'],['R&B','neo soul'],['a text you never sent','a 2am drive alone']],
 ['Smooth R&B',['silky','smooth','sultry','lush'],['R&B','neo soul'],['candlelight and slow conversations','velvet nights']],
 ['Neo Soul',['organic','warm','jazzy','soulful'],['neo soul','R&B'],['a live band in a small room','incense and vinyl']],
 ['Chill Lo-Fi',['mellow','hazy','laid-back','cozy'],['lo-fi','chillhop'],['rain and headphones','a slow morning with nowhere to be']],
 ['Dreamy and Ethereal',['dreamy','ethereal','floating','airy'],['ambient rap','R&B'],['clouds at sunrise','a dream you do not want to end']],
 ['Cinematic and Epic',['cinematic','epic','dramatic','grand'],['cinematic rap','trap'],['the final scene of a film','a big moment that needs a big sound']],
 ['Triumphant',['triumphant','victorious','bold','uplifting'],['hip hop','trap'],['the moment you finally win','a crowd on its feet']],
 ['Motivational',['inspiring','driven','uplifting','powerful'],['hip hop','motivational rap'],['the grind before the come up','early mornings and big goals']],
 ['Nostalgic',['nostalgic','bittersweet','warm','vintage'],['boom bap','soul'],['old photos and better days','the summers you still remember']],
 ['Summer Vibes',['sunny','bright','breezy','feel-good'],['hip hop','R&B'],['summer heat and loud speakers','a cookout that lasts all night']],
 ['Night Drive',['moody','sleek','nocturnal','smooth'],['R&B','trap'],['city lights on an empty highway','a late drive with no destination']],
 ['Haunting',['haunting','eerie','mysterious','dark'],['dark trap','underground rap'],['something moving in the shadows','a cold draft in an empty house']],
 ['Horror',['sinister','eerie','terrifying','dark'],['horrorcore','dark trap'],['a horror film score','footsteps behind you']],
 ['Drill',['menacing','sliding','cold','aggressive'],['drill','UK drill'],['cold nights and colder bars','tension that never lets up']],
 ['Trap Bangers',['hard','bouncy','energetic','loud'],['trap','hip hop'],['a club shaking to the floor','bass you feel in your chest']],
 ['West Coast',['funky','laid-back','sunny','smooth'],['West Coast rap','G-funk'],['lowriders on a sunny boulevard','palm trees and talk boxes']],
 ['East Coast Classic',['classic','gritty','soulful','raw'],['East Coast hip hop','boom bap'],['New York in the 90s','subway trains and hard rhymes']],
 ['Southern Soul',['soulful','country-rich','warm','bluesy'],['Southern hip hop','soul'],['a front porch at sunset','Sunday dinner down South']],
 ['Bluesy',['bluesy','smoky','raw','soulful'],['blues rap','soul'],['a juke joint at midnight','a worn guitar and a story']],
 ['Funky',['funky','groovy','bouncy','vintage'],['funk','hip hop'],['a dance floor in 1975','basslines that make you move']],
 ['Psychedelic',['psychedelic','trippy','hazy','colorful'],['psych soul','alternative hip hop'],['a lava lamp glow','colors melting into sound']],
 ['Spiritual and Healing',['peaceful','healing','spiritual','calm'],['soul','ambient rap'],['quiet prayer at dawn','a deep breath after a long fight']],
 ['Peaceful and Calm',['calm','peaceful','gentle','soft'],['lo-fi','soul'],['still water at sunrise','a quiet room and a warm drink']],
 ['Mafia and Mob',['cinematic','menacing','classy','dramatic'],['mafioso rap','boom bap'],['a back room deal in a smoky restaurant','old films and loyalty']],
 ['Royal and Regal',['regal','majestic','grand','luxurious'],['luxury rap','cinematic rap'],['a throne built from the ground up','marble halls and crowns']],
 ['Underground',['raw','unpolished','gritty','authentic'],['underground rap','boom bap'],['a packed basement show','mixtapes passed hand to hand']],
 ['Old School',['classic','old-school','funky','vintage'],['old school hip hop','boom bap'],['block parties and turntables','the golden era of rap']],
 ['Sexy and Seductive',['seductive','sultry','silky','intimate'],['R&B','slow jams'],['low lights and slow moves','a late-night slow jam']],
 ['Party and Club',['energetic','bouncy','loud','fun'],['club rap','trap'],['a packed dance floor','the moment the bass drops']],
 ['Aggressive',['aggressive','intense','raw','furious'],['hard rap','trap'],['a fight you refuse to lose','pure adrenaline']],
 ['Mysterious',['mysterious','moody','shadowy','intriguing'],['alternative hip hop','dark R&B'],['a secret behind a closed door','fog over the city']],
 ['Hopeful',['hopeful','uplifting','bright','warm'],['soul','hip hop'],['the first light after a storm','a fresh start']],
 ['Reflective',['reflective','introspective','thoughtful','soulful'],['conscious rap','soul'],['looking back on how far you came','a quiet moment alone']],
 ['Afro Soul',['rhythmic','warm','vibrant','soulful'],['Afrobeats','Afro soul'],['sunset in Lagos','drums and dancing in the street']],
 ['Latin Soul',['passionate','warm','rhythmic','fiery'],['Latin soul','hip hop'],['a summer night in the barrio','guitars and heat']],
 ['Vintage Movie Score',['cinematic','vintage','orchestral','dramatic'],['cinematic rap','boom bap'],['a 70s film score','a spy chase in old Europe']]];
const DG=(()=>{
 const R=a=>a[Math.floor(Math.random()*a.length)],cap=s=>s.charAt(0).toUpperCase()+s.slice(1),sh=a=>a.map(x=>[Math.random(),x]).sort((p,q)=>p[0]-q[0]).map(x=>x[1]);
 const MOODS=[
  [/soul|motown|70s|seventies|sweet|love|heart/i,['soulful','warm','heartfelt','golden-era'],['soul','classic hip hop'],['old records spinning in a dim room','a Sunday afternoon on the block','the warmth of a classic soul session']],
  [/dust|vinyl|crate|digg|record|wax|old|vintage|retro|classic/i,['dusty','vintage','warm','analog'],['boom bap','sample-based hip hop'],['records pulled from the back of the crate','a basement session in the 90s','tape hiss and late nights']],
  [/jazz|blue|smoke|lounge|night|midnight|late/i,['jazzy','smoky','late-night','moody'],['jazz rap','soulful hip hop'],['a smoky lounge after midnight','city lights through a rainy window','the last set of the night']],
  [/gospel|church|choir|praise|holy|spirit/i,['uplifting','gospel-rooted','spiritual','powerful'],['soul','gospel rap'],['a Sunday choir in full voice','light breaking through stained glass','raw emotion and faith']],
  [/dark|evil|demon|ghost|shadow|grim|haunt|horror|blood/i,['dark','eerie','haunting','sinister'],['dark trap','underground rap'],['an empty street at 3am','something moving in the shadows','cold air and bad intentions']],
  [/king|queen|royal|crown|gold|luxury|rich|money|cash|boss/i,['regal','luxurious','triumphant','bold'],['luxury rap','street rap'],['a throne built from the ground up','gold chains and long nights','winning after the struggle']],
  [/street|block|hood|trap|grind|hustle|ny|bronx|harlem|brooklyn|griselda/i,['gritty','raw','street-ready','hard-hitting'],['street rap','boom bap'],['corners, concrete and real stories','the grind that never stops','the sound of the city at night']],
  [/drill|uk|chicago|opp/i,['menacing','cold','aggressive','sliding'],['drill','UK drill'],['cold nights and colder bars','tension that never lets up']],
  [/lofi|lo-fi|chill|rain|study|cozy|sleep|calm/i,['mellow','hazy','laid-back','cozy'],['lo-fi','chillhop'],['rain on the window and headphones on','a slow morning with nowhere to be']],
  [/rnb|r&b|slow|silk|velvet|honey|vibe/i,['silky','smooth','sultry','lush'],['R&B','neo soul'],['candlelight and slow conversations','late-night drives with the windows down']],
  [/cinema|movie|film|epic|orchestra|score|war/i,['cinematic','epic','orchestral','dramatic'],['cinematic rap','trap'],['the final scene of a film','a big moment that needs a big sound']],
  [/hot|fire|heat|flame|burn/i,['fiery','high-energy','bold','heated'],['hip hop','trap'],['summer heat and loud speakers','a room that catches fire when the beat drops']]];
 const DEF=[['soulful','warm','melodic','vintage','moody','rich'],['hip hop','boom bap','R&B'],['a classic record crate','late-night studio sessions','the golden era of sampling']];
 const INST=[[/piano|keys|rhodes|wurli|epiano/i,'keys and piano'],[/guitar|gtr/i,'guitars'],[/bass(?!.*drum)/i,'basslines'],[/string|violin|cello|orch/i,'strings'],[/horn|brass|trumpet|sax|trombone/i,'horns'],[/flute|woodwind/i,'flutes'],[/vox|vocal|choir|voice|chant/i,'vocals'],[/synth|pad|lead/i,'synths and pads'],[/organ/i,'organs'],[/bell|chime|music ?box/i,'bells'],[/harp/i,'harps'],[/drum|kick|snare|hat|perc|clap/i,'drums']];
 const P1=[
  '{N} is {n} {a1} compositions made for {g1} and {g2} producers who want records that feel finished from the first play.',
  'Introducing {N}, a collection of {n} {a1}, fully arranged sounds built to drop straight into your next {g1} beat.',
  '{N} brings together {n} {a1} compositions with a {a2} character you can hear in every note.',
  'With {N} you get {n} original, {a1} compositions crafted for {g1} records that need real feeling.',
  '{N} delivers {n} {a1} pieces that capture {img}.',
  'Step into {N}: {n} {a1} compositions inspired by {img}.',
  '{N} is a {a2} collection of {n} {a1} compositions, written and produced to give your {g1} beats instant depth.',
  'Built around {img}, {N} gives you {n} {a1} compositions ready to become your next {g1} record.'];
 const P2=[
  'Every piece is arranged, mixed and ready to use as it is, so you can build a full beat around it in minutes.',
  'These are complete musical ideas, not scraps, so the song is already there the moment you load one in.',
  'Each composition is mixed with care and sits right on top of your drums without fighting for space.',
  'Everything arrives polished and ready, so your time goes into the beat, not into fixing sounds.',
  'Load any file, add your drums and you already have a record worth finishing.'];
 const P3I=[
  'Expect {inst} layered with {a2} textures and real musical movement.',
  'Inside you will hear {inst}, all blended into {a2}, cohesive arrangements.',
  'The palette leans on {inst}, giving every piece a {a1}, full-bodied sound.'];
 const P3=[
  'Expect rich harmony, memorable melodies and {a2} textures that make a beat feel complete.',
  'The sound is {a1} and full, with melodies that stay in your head long after the session ends.',
  'Warm low end, detailed tops and {a2} melodies give each piece a professional, record-ready finish.'];
 const Q1=[
  'Perfect for {g1}, {g2} and anyone chasing that {a1} sound for their artists.',
  'Made for producers who want a {a1}, signature sound without starting from a blank session.',
  'Whether you are making beats for artists, placements or your own project, {N} gives you a strong starting point every time.',
  'Use them to start new beats, break writer’s block, or give your catalog a fresh {a2} direction.',
  'Ideal for beatmakers, artists and songwriters who need {a1} ideas that sound like finished records.'];
 const Q2=[
  'Every file is clearly named and organized so you can find the right piece fast.',
  'All files come in high quality and clearly labelled, ready for any DAW.',
  'Everything is organized and labelled, so the pack is easy to work through from start to finish.'];
 const Q3=[
  '100% royalty-free for use in your releases.',
  'Royalty-free for your beats, songs and placements.',
  'Instant download and 100% royalty-free.',
  'Royalty-free. Instant download. Ready when you are.'];
 const KEY='mzprd_desc_used_v2';let used;try{used=new Set(JSON.parse(localStorage.getItem(KEY)||'[]'))}catch(e){used=new Set()}
 const hash=s=>{let h=5381;for(let i=0;i<s.length;i++)h=(h*33^s.charCodeAt(i))>>>0;return h.toString(36)};
 const list=a=>a.length<2?a.join(''):a.slice(0,-1).join(', ')+' and '+a[a.length-1];
 return function(name,n,d,sty){const N=String(name).trim(),ST=DGSTY.find(x=>x[0]===sty),u=(d&&d.files||[]).filter(f=>f.use&&AUDIO.test(f.name)),names=u.map(f=>(f.rel||'')+' '+f.name+' '+(f.newName||'')).join(' ')+' '+N;
  const mood=ST?[[/./,ST[1],ST[2],ST[3]]]:MOODS.filter(m=>m[0].test(N)),adj=[...new Set(mood.length?mood.flatMap(m=>m[1]):DEF[0])],gen=[...new Set(mood.length?mood.flatMap(m=>m[2]).concat(['hip hop']):DEF[1])],imgs=[...new Set(mood.length?mood.flatMap(m=>m[3]):DEF[2])];
  const inst=sh(INST.filter(i=>i[0].test(names)).map(i=>i[1])).slice(0,3);
  const pick2=a=>{const x=R(a);let y=R(a),i=0;while((y===x||y.includes(x)||x.includes(y))&&i++<12)y=R(a);return[x,y]};
  for(let tries=0;tries<500;tries++){const[a1,a2]=pick2(adj),[g1,g2]=pick2(gen),img=R(imgs);
   const fill=s=>s.replace(/\{N\}/g,N).replace(/\{n\}/g,n).replace(/\{a1\}/g,a1).replace(/\{a2\}/g,a2).replace(/\{g1\}/g,g1).replace(/\{g2\}/g,g2).replace(/\{img\}/g,img).replace(/\{inst\}/g,list(inst));
   const para1=[R(P1),inst.length?R(P3I):R(P3),R(P2)].map(fill),para2=[R(Q1),R(Q2),R(Q3)].map(fill);
   const out=para1.map(s=>cap(s)).join(' ')+'\n\n'+para2.map(s=>cap(s)).join(' ');const h=hash(out.toLowerCase());
   if(!used.has(h)){used.add(h);try{localStorage.setItem(KEY,JSON.stringify([...used].slice(-5000)))}catch(e){}return out}}
  return N+' is '+n+' new compositions, royalty-free.'}})();
function genDesc(name,n,d,sty){return DG(name,n,d,sty)}

const LIC='LICENSE (MZPRD)\n\nYou may use these sounds in your own music, including commercial releases.\nYou may not resell, share or redistribute the sounds on their own, as a pack or as samples.\nCredit is appreciated: Prod. MZPRD.\n';
function editor(){
 const d=S.cur;$q('#pbBack').style.display='inline-block';
 $q('#pbBody').innerHTML=`<div class="pn"><div class="pbHd"><span class="pbN">1</span><div><h4>PACK DETAILS</h4><p>Name it, price it and write the description.</p></div></div><div class="g"><div><label>TITLE</label><input type="text" id="pbTitle"></div><div><label>PRICE (USD)</label><input type="number" id="pbPrice" step="0.01" min="0"></div><div><label>&nbsp;</label><label style="display:flex;gap:8px;align-items:center;letter-spacing:.1em;margin:14px 0 0"><input type="checkbox" id="pbFree" style="width:auto"> OFFER THE PREVIEW AS A FREE DOWNLOAD</label></div></div><label>DESCRIPTION</label><textarea id="pbDesc" placeholder="What is in this pack? Genres, vibes, how many loops and one-shots."></textarea><div class="pbCard"><div class="pbCardH">DESCRIPTION GENERATOR</div><div class="g" style="align-items:end"><div><label>PACK NAME</label><input type="text" id="pbDgName" placeholder="Uses the title if empty"></div><div><label>STYLE / VIBE</label><select id="pbDgSty"><option value="">Auto (from the pack name)</option>${DGSTY.map(s=>`<option>${s[0]}</option>`).join('')}</select></div><div><label>HOW MANY SAMPLES</label><input type="number" id="pbDgN" min="1" placeholder="Counts your sounds if empty"></div><div><button class="btn go" id="pbDgGo">GENERATE DESCRIPTION</button></div></div></div></div>
 <div class="pn"><div class="pbHd"><span class="pbN">2</span><div><h4>YOUR SOUNDS</h4><p>Drop your files, listen with play, tick DEMO for the preview.</p></div></div><div class="drop" id="pbDrop">DROP FILES OR A FOLDER HERE, OR CLICK TO CHOOSE<input type="file" id="pbFiles" multiple style="display:none"></div><div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap"><button class="btn" id="pbFolder">CHOOSE A FOLDER</button><button class="btn" id="pbAuto">AUTO-NAME ALL</button><button class="btn" id="pbDet">DETECT MISSING BPM (LOOPS)</button></div><input type="file" id="pbDir" webkitdirectory multiple style="display:none"><div id="pbTbl" style="margin-top:10px;overflow:auto;max-height:420px"></div><div class="msg" id="pbSum"></div></div>
 <div class="pn"><div class="pbHd"><span class="pbN">3</span><div><h4>COVER AND PREVIEW</h4><p>Make the cover and the demo preview.</p></div></div><div class="g"><div><button class="btn" id="pbCov">MAKE A COVER</button> <button class="btn" id="pbCovUp">USE MY OWN IMAGE</button><input type="file" id="pbCovIn" accept="image/*" style="display:none"><div id="pbCovBox"></div></div><div><button class="btn" id="pbPrev">MAKE THE DEMO PREVIEW</button><div class="pbCard" style="margin-top:10px"><div class="pbCardH">DEMO PREVIEW</div><div class="msg" id="pbDemoInfo" style="margin:0"></div></div> <button class="btn" id="pbPrevUp">USE MY OWN AUDIO</button><input type="file" id="pbPrevIn" accept="audio/*" style="display:none"><div id="pbPrevBox"></div></div><div><details class="pbLicD"><summary>LICENSE (INCLUDED IN THE ZIP)</summary><textarea id="pbLic" style="min-height:130px"></textarea></details><label style="display:flex;gap:8px;align-items:center;letter-spacing:.1em"><input type="checkbox" id="pbLicOn" style="width:auto" checked> INCLUDE LICENSE.TXT</label></div></div></div>
 <div class="pn"><div class="pbHd"><span class="pbN">4</span><div><h4>BUILD AND PUBLISH</h4><p>Test the zip on your computer, then publish.</p></div></div><div class="msg" id="pbSize" style="margin:0 0 8px"></div>
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
 $q('#pbPrev').onclick=async()=>{await makePrev();rDemo()};$q('#pbPrevUp').onclick=()=>$q('#pbPrevIn').click();
 $q('#pbPrevIn').onchange=async e=>{const f=e.target.files[0];if(!f)return;d.preview=f;d.previewExt=(f.name.match(/\.[A-Za-z0-9]+$/)||['.mp3'])[0].slice(1).toLowerCase();await save();rPrev()};
 $q('#pbZipTest').onclick=async()=>{sync();try{const z=await buildZip(true);const a=document.createElement('a');a.href=URL.createObjectURL(z);a.download=(clean(d.title)||'pack')+'.zip';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),8000);msg('Zip built: '+mb(z.size)+'. It was saved to your downloads, nothing was uploaded.')}catch(e){msg('Zip failed: '+e.message)}};
 $q('#pbPub').onclick=publish;$q('#pbUn').onclick=unpublish;
 rTbl();rCov();rPrev();rSize();rDemo();if(d.dgSty)$q('#pbDgSty').value=d.dgSty;
 $q('#pbDgGo').onclick=()=>{sync();const nm=$q('#pbDgName').value.trim()||d.title.trim();if(!nm){msg('Type the pack name first.');return}const n=+$q('#pbDgN').value||d.files.filter(f=>f.use&&AUDIO.test(f.name)).length;if(!n){msg('Type how many samples.');return}d.dgSty=$q('#pbDgSty').value;d.desc=genDesc(nm,n,d,d.dgSty);$q('#pbDesc').value=d.desc;save();msg('Description made. Press again for a different one.')};
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
 el.innerHTML=d.files.length?`<table><tr><th></th><th>PLAY</th><th>DEMO</th><th>FILE</th><th>TYPE</th><th>BPM</th><th>KEY</th><th>LENGTH</th><th>SIZE</th><th>NAME IN THE ZIP</th><th></th></tr>${d.files.map((f,i)=>`<tr data-i="${i}"><td><input type="checkbox" data-f="use" ${f.use?'checked':''}></td><td>${AUDIO.test(f.name)?`<button class="btn pbPl" data-f="play" style="padding:4px 9px">${PB.id===f.id?'&#9632;':'&#9654;'}</button>`:''}</td><td>${AUDIO.test(f.name)?`<input type="checkbox" data-f="demo" ${f.demo?'checked':''} title="Put this sound in the demo preview">${f.demo?'<b style="color:#e0242f;font-size:10px"> '+(demoList(d).indexOf(f)+1)+'</b>':''}`:''}</td><td title="${esc(f.rel||f.name)}">${esc(f.name.length>26?f.name.slice(0,24)+'..':f.name)}</td><td><select data-f="kind"><option value="loop"${f.kind==='loop'?' selected':''}>Loop</option><option value="shot"${f.kind==='shot'?' selected':''}>One-shot</option><option value="other"${f.kind==='other'?' selected':''}>Extra</option></select></td><td><input type="number" data-f="bpm" min="0" max="300" value="${f.bpm||''}" style="width:62px"></td><td><input type="text" data-f="key" value="${esc(f.key)}" style="width:56px"></td><td>${f.dur?f.dur.toFixed(1)+'s':'-'}</td><td>${mb(f.size)}</td><td><input type="text" data-f="newName" value="${esc(f.newName)}"></td><td><button class="btn" data-f="rm" style="padding:4px 8px">&times;</button></td></tr>`).join('')}</table>`:'<div class="msg">No sounds yet. Drop in your files above.</div>';
 el.querySelectorAll('tr[data-i]').forEach(r=>{const f=d.files[+r.dataset.i];r.querySelectorAll('[data-f]').forEach(c=>{const k=c.dataset.f;c.onchange=c.onclick=null;
  if(k==='rm')c.onclick=async()=>{d.files.splice(+r.dataset.i,1);await save();rTbl();rSize()};
  else if(k==='play')c.onclick=()=>playOne(f);
  else if(k==='demo')c.onchange=async()=>{f.demo=c.checked;await save();rTbl();rDemo()};
  else c.onchange=async()=>{f[k]=k==='use'?c.checked:k==='bpm'?(+c.value||0):c.value;if(k==='kind'||k==='bpm'||k==='key'){autoName(d)}await save();if(k==='kind'||k==='bpm'||k==='key'||k==='use')rTbl();rSize()}})});
 rSum();
}
function rSum(){const d=S.cur,u=d.files.filter(f=>f.use),nl=u.filter(f=>f.kind==='loop').length,ns=u.filter(f=>f.kind==='shot').length,no=u.length-nl-ns;$q('#pbSum').textContent=u.length?`${nl} loops, ${ns} one-shots${no?', '+no+' extras':''}  /  ${mb(u.reduce((s,f)=>s+f.size,0))}`:''}
function rCov(){const d=S.cur,b=$q('#pbCovBox');if(d.cover){const u=URL.createObjectURL(d.cover);b.innerHTML=`<img class="pv" src="${u}" alt="cover">`}else b.innerHTML='<div class="msg">No cover yet.</div>'}
function rPrev(){const d=S.cur,b=$q('#pbPrevBox');if(d.preview){const u=URL.createObjectURL(d.preview);b.innerHTML=`<div class="pbPlayer"><button class="pbPP" aria-label="Play">&#9654;</button><div class="pbTrk"><div class="pbTt">${esc((d.title||'Pack').toUpperCase())} <span>DEMO PREVIEW</span></div><div class="pbBar"><b></b></div></div><div class="pbTm">0:00</div><audio src="${u}" preload="metadata"></audio></div><div class="msg">${mb(d.preview.size)} (${esc(d.previewExt||'')})</div>`;mzPlayer(b.querySelector('.pbPlayer'))}else b.innerHTML='<div class="msg">No preview yet.</div>'}
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
 if(d.preview)entries.push({name:'PREVIEW - '+((clean(d.title)||'Pack').replace(/[\\/:*?"<>|]+/g,'_'))+'.'+(d.previewExt||'m4a'),blob:d.preview});
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
  const ext=d.previewExt||'m4a',pp=await upload(new File([d.preview],'preview.'+ext,{type:d.preview.type||'audio/mp4'}),'private-files','previews',p=>pf(p,'preview'));up.push(['private-files',pp]);
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
