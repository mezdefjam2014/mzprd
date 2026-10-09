/* MZPRD Beat Battle (back office tab). Build a bracket (4, 8 or 16 beats) or a TEAM WAR (up to 10 v 10), pick fighters and arena,
   preview every scene, enter the votes between episodes, render each episode to an MP4, and get thumbnails + the YouTube package in the same place.
   Optional CUSTOM BATTLE: upload your own beats and face images. */
(function(){
'use strict';
const $q=s=>root.querySelector(s);let root=null,mounted=false;
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const mmss=s=>Math.floor(s/60)+':'+String(Math.floor(s%60)).padStart(2,'0');
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const KEY='mzprd_battle_v1',DAY=864e5;
const FX=()=>window.MZBattleFX,TX=()=>window.MZBattleText,SC=()=>window.MZBattleScenes,AU=()=>window.MZBattleAudio,YT=()=>window.MZBattleYT;
let ST=null,B=null,TL=null,beats=[],AC=null,PV={playing:false,raf:0,src:null},dirty=false;
const loadS=f=>new Promise((ok,no)=>{const s=document.createElement('script');s.src=new URL(f,document.baseURI).href;s.onload=ok;s.onerror=()=>no(new Error(f));document.head.appendChild(s)});

/* ---------- state ---------- */
function defaults(){return{title:'BEAT BATTLE',format:'bracket',size:8,team:10,tpl:'arcade',clip:35,custom:false,fighters:[],rounds:[],cur:0,kind:'round',per:4,epLabel:'EPISODE 1',
 opts:{seed:7,talk:2,recap:'full',sfx:true,fx:{shake:1,confetti:1}},yt:{mode:'premiere',variant:0,prev:'',playlist:''},when:'',th:{tpl:'arcade',swap:false,sel:'auto'},fps:24}}
function load(){try{const j=JSON.parse(localStorage.getItem(KEY)||'null');if(j&&j.fighters){const o=Object.assign(defaults(),j);if(!o.c35){o.clip=35;o.c35=1}return o}}catch(e){}return defaults()}
function save(){try{const c=JSON.parse(JSON.stringify(ST,(k,v)=>k==='buf'||k==='canvas'||k==='file'?undefined:v));localStorage.setItem(KEY,JSON.stringify(c))}catch(e){}}
const total=()=>ST.format==='team'?ST.team*2:ST.size;
const ch=n=>{const T=TX().FIGHTERS[(n-1)%20];return T};
function newFighter(i){const char=(i%20)+1,T=ch(char);return{name:T.n,char,face:null,beat:beatFor(i)}}
function beatFor(i){const b=beats.length?beats[i%beats.length]:null;return b?{src:'site',id:b.id,title:b.title,bpm:b.bpm||0,key:b.musical_key||'',slug:b.slug||'',path:b.preview_path||'',cover:b.cover_path||''}:{src:'site',id:null,title:'Beat '+(i+1),bpm:0,key:'',slug:'',path:''}}
function fit(){const n=total();while(ST.fighters.length<n)ST.fighters.push(newFighter(ST.fighters.length));ST.fighters.length=n}
function winnerOf(M){if(M.wm!=null)return M.wm;if((M.va||0)+(M.vb||0)>0&&M.a!=null&&M.b!=null)return M.va>=M.vb?M.a:M.b;return null}
function deal(){
 const n=total();fit();
 if(ST.format==='team'){const k=Math.floor(n/2);ST.rounds=[Array.from({length:k},(_,i)=>({a:i,b:k+i,va:0,vb:0,wm:null,w:null,fin:'auto'}))]}
 else{ST.rounds=[];let m=n/2,r=0;while(m>=1){ST.rounds.push(Array.from({length:m},(_,i)=>({a:r===0?2*i:null,b:r===0?2*i+1:null,va:0,vb:0,wm:null,w:null,fin:'auto'})));m/=2;r++}}
 ST.cur=0;ST.kind='round';advance()}
function advance(){const R=ST.rounds;R.forEach((rd,r)=>rd.forEach((M,j)=>{if(r>0&&ST.format!=='team'){const p=R[r-1];M.a=winnerOf(p[2*j]);M.b=winnerOf(p[2*j+1])}M.w=winnerOf(M)}))}
function done(r){return ST.rounds[r]&&ST.rounds[r].every(M=>M.a!=null&&M.b!=null&&M.w!=null)}
function ready(r){return ST.rounds[r]&&ST.rounds[r].every(M=>M.a!=null&&M.b!=null)}

/* ---------- engine bridge ---------- */
function faceOf(f){return f.char>0?FX().charImg(f.char):(f.face&&f.face.canvas)||null}
function mkBattle(){const T=TX();
 return{title:ST.title,format:ST.format,tpl:ST.tpl,clip:ST.clip,cur:ST.cur,kind:ST.kind,range:ST.format==='team'?[ST.cur*ST.per,Math.min(ST.rounds[0]?ST.rounds[0].length:0,(ST.cur+1)*ST.per)]:null,episodeLabel:ST.epLabel,opts:ST.opts,rounds:ST.rounds,
  fighters:ST.fighters.map(f=>{const t=f.char>0?ch(f.char):{n:f.name,v:'fierce',gear:'gear'};return{name:f.name||t.n,voice:t.v,gear:t.gear,img:faceOf(f),char:f.char,beat:f.beat}})}}
function rebuild(){advance();B=mkBattle();TL=SC().build(B);fillPart();drawNow();fillBracket();ytRender();thRender();save()}

/* ---------- css + html ---------- */
function css(){if(document.getElementById('btCss'))return;const s=document.createElement('style');s.id='btCss';s.textContent=`#battlemk{display:none}#battlemk.on{display:block}
#battlemk .mg{display:grid;grid-template-columns:minmax(0,1fr) minmax(340px,430px);gap:16px;align-items:start}@media(max-width:1000px){#battlemk .mg{grid-template-columns:1fr}}
#battlemk .pn{background:#0c0c0f;border:1px solid #2a2a2e;padding:14px;margin-bottom:16px}
#battlemk h3{font:700 16px Montserrat;letter-spacing:.14em;color:#fff;margin:0}
#battlemk h4{font:700 11px Montserrat;letter-spacing:.26em;color:var(--gold);margin:16px 0 8px}
#battlemk label{display:block;font:600 10px Montserrat;letter-spacing:.2em;color:#8e8e94;margin:8px 0 4px}
#battlemk input[type=text],#battlemk input[type=number],#battlemk select{width:100%;background:#050506;border:1.5px solid #34343a;color:#fff;padding:8px;font:500 13px Montserrat}
#battlemk .btn{background:transparent;border:1.5px solid #4a4a50;color:#fff;font:600 10px Montserrat;letter-spacing:.16em;padding:10px 8px;cursor:pointer}#battlemk .btn:hover{border-color:#fff}#battlemk .btn.on{border-color:var(--red);background:rgba(224,36,47,.15)}
#battlemk .btn.big{background:var(--red);border-color:var(--red);font:700 13px Montserrat;letter-spacing:.24em;padding:15px;width:100%}#battlemk .btn:disabled{opacity:.5}
#battlemk .two{display:grid;grid-template-columns:1fr 1fr;gap:6px}#battlemk .three{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}
#battlemk .chk{display:flex;gap:8px;align-items:center;letter-spacing:.1em;margin:6px 0}#battlemk .chk input{width:auto}
#battlemk .box{position:relative;width:100%;aspect-ratio:16/9;background:#05040a;border:1px solid #2a2a2e}#battlemk .box canvas{width:100%;height:100%;display:block}
#battlemk .ctl{display:flex;gap:8px;align-items:center;margin-top:8px;flex-wrap:wrap}#battlemk .ctl input[type=range]{flex:1;min-width:140px;accent-color:var(--red)}#battlemk .ctl select{flex:1;min-width:180px;width:auto}
#battlemk .time{font:600 12px Montserrat;color:#c9c9ce;min-width:92px;text-align:right}
#battlemk .sec{border:1px solid #2a2a2e;margin:10px 0;background:#08080a}#battlemk .sec>summary{cursor:pointer;padding:12px;font:700 11px Montserrat;letter-spacing:.22em;color:var(--gold);list-style:none;display:flex;justify-content:space-between;align-items:center;gap:8px}
#battlemk .sec>summary::-webkit-details-marker{display:none}#battlemk .sec>summary:after{content:'+';font-size:16px;color:#8e8e94}#battlemk .sec[open]>summary:after{content:'\\2212'}#battlemk .sec .in{padding:0 12px 12px}
#battlemk .sec>summary small{font:500 10px Montserrat;letter-spacing:.06em;color:#8e8e94;flex:1;text-align:right;margin-right:8px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
#battlemk .msg{font:500 12px/1.5 Montserrat;color:#a9a9ae;margin-top:8px;min-height:16px}#battlemk .bar{height:6px;background:#1b1b20;margin-top:8px}#battlemk .bar b{display:block;height:100%;width:0;background:var(--red)}
#battlemk .tpl{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}#battlemk .tpl button{font-size:9px;padding:9px 4px}
#battlemk .fr{display:grid;grid-template-columns:30px 54px minmax(0,1fr);gap:8px;align-items:center;padding:8px;border:1px solid #1d1d21;margin-bottom:6px;background:#0a0a0d}
#battlemk .fr img,#battlemk .fr canvas.fi{width:54px;height:54px;object-fit:cover;background:#17171b;cursor:pointer;border:2px solid #34343a;image-rendering:auto}#battlemk .fr .n{font:700 12px Montserrat;color:var(--gold)}
#battlemk .fr .rw{display:grid;gap:5px}#battlemk .fr input,#battlemk .fr select{padding:6px;font-size:12px}
#battlemk .it{display:flex;gap:10px;align-items:center;padding:9px;border-bottom:1px solid #1d1d21;font:600 12px Montserrat;color:#d9d9dc}#battlemk .it b{flex:1;min-width:0;font-weight:600}#battlemk .it button{background:transparent;border:1px solid #4a4a50;color:#fff;font:600 9px Montserrat;letter-spacing:.12em;padding:6px 8px;cursor:pointer}
#battlemk .mt{display:grid;grid-template-columns:1fr;gap:6px;padding:8px;border:1px solid #1d1d21;margin-bottom:6px;background:#0a0a0d;font:600 11px Montserrat;color:#d9d9dc}
#battlemk .mt .vs{display:grid;grid-template-columns:minmax(0,1fr) 74px 74px minmax(0,1fr);gap:6px;align-items:center}#battlemk .mt input{padding:5px;font-size:12px;text-align:center}
#battlemk .thg{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}#battlemk .thg canvas{width:100%;display:block;cursor:pointer;border:1px solid #2a2a2e}
#btPick{position:fixed;inset:0;z-index:90;background:rgba(0,0,0,.85);display:none;align-items:center;justify-content:center;padding:16px}#btPick.on{display:flex}#btPick .pk{background:#0c0c0f;border:2px solid #2a2a2e;border-top:3px solid var(--red);padding:18px;max-width:760px;width:100%;max-height:88vh;overflow:auto}
#btPick .g{display:grid;grid-template-columns:repeat(5,1fr);gap:8px}#btPick .g div{cursor:pointer;border:2px solid #2a2a2e;background:#050506;text-align:center;font:600 9px Montserrat;color:#fff;padding-bottom:4px}#btPick .g div:hover{border-color:var(--gold)}#btPick .g img{width:100%;display:block}
@media(max-width:560px){#btPick .g{grid-template-columns:repeat(3,1fr)}}`;document.head.appendChild(s)}
function html(){const T=TX();return`<div class="mg"><div>
 <div class="pn"><div class="box"><canvas id="btCv" width="1280" height="720"></canvas></div>
  <div class="ctl"><select id="btPart"></select><button class="btn" id="btPlay">PLAY PART</button><button class="btn" id="btAll">PLAY EPISODE</button></div>
  <div class="ctl"><input type="range" id="btScrub" min="0" max="1" step="0.01" value="0"><span class="time" id="btTime">0:00</span></div>
  <div class="msg" id="btMsg">Pick a part of the episode, press play or drag the slider. Nothing is saved to the site until you decide.</div>
  <button class="btn big" id="btRender" style="margin-top:8px">RENDER THIS EPISODE TO VIDEO</button><div class="bar"><b id="btProg"></b></div><div class="msg" id="btRMsg"></div></div>
 <details class="pn sec" id="btBrk" open style="padding:0"><summary>BRACKET AND VOTES <small id="btBs"></small></summary><div class="in"><canvas id="btBc" width="1280" height="720" style="width:100%;display:block;background:#05040a;border:1px solid #2a2a2e"></canvas><div class="msg">Watch an episode, count the comment votes, type them here. The bracket moves the winners forward and the next episode shows the results.</div><div id="btRes"></div></div></details>
 <details class="pn sec" id="btYTd" style="padding:0"><summary>YOUTUBE PACKAGE <small>premiere or straight upload, with every beat linked</small></summary><div class="in" id="btYT"></div></details>
 <details class="pn sec" id="btTHd" style="padding:0"><summary>THUMBNAILS <small>8 battle looks, 16:9 and 9:16</small></summary><div class="in" id="btTH"></div></details>
</div><div><div class="pn">
 <div style="display:flex;justify-content:space-between;align-items:center"><h3>BEAT BATTLE</h3><button class="btn" id="btNew">NEW BATTLE</button></div>
 <details class="sec" open><summary>1. FORMAT AND LOOK <small id="btS1"></small></summary><div class="in">
  <label>BATTLE TITLE</label><input type="text" id="btTitle">
  <div class="two" style="margin-top:8px"><button class="btn" id="btFb">BRACKET</button><button class="btn" id="btFt">TEAM WAR (10 V 10)</button></div>
  <div class="two"><div><label id="btSzL">FIGHTERS</label><select id="btSize"></select></div><div><label>CLIP PER BEAT</label><select id="btClip"><option value="15">15 seconds</option><option value="20">20 seconds</option><option value="30">30 seconds</option><option value="35">35 seconds</option><option value="45">45 seconds</option></select></div></div>
  <label>ARENA</label><div class="tpl" id="btTpl"></div></div></details>
 <details class="sec" open><summary>2. FIGHTERS <small id="btS2"></small></summary><div class="in">
  <label class="chk"><input type="checkbox" id="btCust"> CUSTOM BATTLE (OPTIONAL): UPLOAD YOUR OWN BEATS AND FACES</label>
  <div class="msg" id="btCustN"></div>
  <div class="two"><button class="btn" id="btAuto">AUTO-FILL FROM MY BEATS</button><button class="btn" id="btShuf">SHUFFLE FIGHTERS</button></div>
  <div id="btFl" style="margin-top:8px;max-height:620px;overflow:auto"></div></div></details>
 <details class="sec"><summary>3. EPISODE <small id="btS3"></small></summary><div class="in">
  <label>WHICH EPISODE TO MAKE</label><select id="btEp"></select><div id="btPerW" style="display:none"><label>MATCHES PER EPISODE (TEAM WAR)</label><select id="btPer"><option value="2">2</option><option value="3">3</option><option value="4">4</option><option value="5">5</option><option value="10">All 10</option></select></div>
  <label>EPISODE LABEL (SHOWS ON THE TITLE CARD)</label><input type="text" id="btLab"><div class="msg">An episode always opens with the results of the round before it, once you have entered the votes.</div></div></details>
 <details class="sec"><summary>4. BANTER, EFFECTS AND SOUND <small id="btS4"></small></summary><div class="in">
  <div class="two"><div><label>FIGHTER TALK</label><select id="btTalk"><option value="0">Off</option><option value="1">Some</option><option value="2">Lots</option><option value="3">Non-stop</option></select></div><div><label>RESULTS SCENES</label><select id="btRecap"><option value="full">Full (7 s each)</option><option value="quick">Quick (4.6 s each)</option><option value="off">Off</option></select></div></div>
  <label class="chk"><input type="checkbox" id="btSfx"> SOUND EFFECTS AND CROWD</label><label class="chk"><input type="checkbox" id="btShk"> SCREEN SHAKE ON HITS</label><label class="chk"><input type="checkbox" id="btCnf"> CONFETTI AND FIREWORKS</label>
  <button class="btn" id="btBant" style="width:100%;margin-top:6px">DEAL NEW BANTER AND FINISHING MOVES</button><div class="msg" id="btBantN"></div></div></details>
 <details class="sec"><summary>5. VIDEO <small>1280 x 720</small></summary><div class="in"><label>FRAME RATE</label><select id="btFps"><option value="24">24 fps (smaller, faster)</option><option value="30">30 fps</option></select><div class="msg">Renders in this browser and downloads as an MP4. Keep this tab open while it renders.</div></div></details>
</div></div></div>
<div id="btPick"><div class="pk"><h3>CHOOSE A FIGHTER</h3><div class="g" id="btPg" style="margin-top:12px"></div><button class="btn" id="btPx" style="width:100%;margin-top:12px">CLOSE</button></div></div>`}

/* ---------- panels ---------- */
function tplBtns(){const el=$q('#btTpl');el.innerHTML=FX().TEMPLATES.map(t=>`<button class="btn${ST.tpl===t.id?' on':''}" data-t="${t.id}">${t.n}</button>`).join('');el.querySelectorAll('button').forEach(b=>b.onclick=()=>{ST.tpl=b.dataset.t;ST.th.tpl=ST.tpl;tplBtns();rebuild()})}
function sizeSel(){const s=$q('#btSize');const opts=ST.format==='team'?[2,3,4,5,6,7,8,9,10].map(n=>[n,n+' v '+n]):[[4,'4 fighters'],[8,'8 fighters'],[16,'16 fighters']];s.innerHTML=opts.map(([v,l])=>`<option value="${v}">${l}</option>`).join('');s.value=ST.format==='team'?ST.team:ST.size;$q('#btSzL').textContent=ST.format==='team'?'TEAM SIZE':'BRACKET SIZE'}
function syncTop(){$q('#btTitle').value=ST.title;$q('#btFb').classList.toggle('on',ST.format==='bracket');$q('#btFt').classList.toggle('on',ST.format==='team');sizeSel();$q('#btClip').value=String(ST.clip);$q('#btCust').checked=!!ST.custom;
 $q('#btCustN').textContent=ST.custom?'Custom mode: each fighter can use your own audio file and your own face picture. Uploaded files stay in this browser tab only, so upload them again after a refresh.':'Off: fighters use your site beats and the 20 built-in producers.';
 $q('#btLab').value=ST.epLabel;$q('#btTalk').value=String(ST.opts.talk);$q('#btRecap').value=ST.opts.recap;$q('#btSfx').checked=ST.opts.sfx!==false;$q('#btShk').checked=ST.opts.fx.shake!==0;$q('#btCnf').checked=ST.opts.fx.confetti!==0;$q('#btFps').value=String(ST.fps||24);$q('#btPer').value=String(ST.per);$q('#btPerW').style.display=ST.format==='team'?'block':'none';
 $q('#btS1').textContent=(ST.format==='team'?'team war '+ST.team+' v '+ST.team:ST.size+'-beat bracket')+' / '+ST.clip+'s';$q('#btS2').textContent=ST.fighters.length+' fighters';$q('#btS4').textContent='talk '+['off','some','lots','non-stop'][ST.opts.talk]}
function fightersList(){const T=TX(),el=$q('#btFl');
 el.innerHTML=ST.fighters.map((f,i)=>{const img=f.char>0?`<img data-i="${i}" src="battle/c${String(f.char).padStart(2,'0')}.webp" alt="">`:`<canvas class="fi" data-i="${i}" width="54" height="54"></canvas>`;
  const bsel=`<select data-i="${i}" data-f="beat"><option value="">${ST.custom?'(use my own file below)':'Pick a beat'}</option>${beats.map(b=>`<option value="${esc(b.id)}"${f.beat&&f.beat.src==='site'&&String(f.beat.id)===String(b.id)?' selected':''}>${esc(b.title)}</option>`).join('')}</select>`;
  const team=ST.format==='team'?(i<ST.team?'<span style="color:var(--gold)">BLUE</span>':'<span style="color:#ff2d8a">PINK</span>'):'';
  const cu=ST.custom?`<div class="two"><input type="text" data-i="${i}" data-f="btitle" placeholder="Beat title" value="${f.beat&&f.beat.src==='file'?esc(f.beat.title):''}"><input type="number" data-i="${i}" data-f="bbpm" placeholder="BPM" value="${f.beat&&f.beat.bpm||''}"></div><label style="margin:0">YOUR BEAT FILE</label><input type="file" accept="audio/*" data-i="${i}" data-f="bfile"><label style="margin:0">YOUR FACE IMAGE</label><input type="file" accept="image/*" data-i="${i}" data-f="face">`:'';
  return`<div class="fr"><div class="n">${i+1}<br>${team}</div>${img}<div class="rw"><input type="text" data-i="${i}" data-f="name" value="${esc(f.name)}">${bsel}${cu}</div></div>`}).join('');
 el.querySelectorAll('canvas.fi').forEach(cv=>{const f=ST.fighters[+cv.dataset.i];if(f.face&&f.face.canvas)cv.getContext('2d').drawImage(f.face.canvas,0,0,54,54)});
 el.querySelectorAll('img[data-i],canvas.fi').forEach(x=>x.onclick=()=>openPick(+x.dataset.i));
 el.querySelectorAll('[data-f]').forEach(x=>{const i=+x.dataset.i,f=ST.fighters[i],k=x.dataset.f;x.onchange=async()=>{
  if(k==='name'){f.name=x.value.toUpperCase();rebuild()}
  else if(k==='beat'){if(x.value){const b=beats.find(q=>String(q.id)===x.value);f.beat={src:'site',id:b.id,title:b.title,bpm:b.bpm||0,key:b.musical_key||'',slug:b.slug||'',path:b.preview_path||'',cover:b.cover_path||''}}rebuild()}
  else if(k==='btitle'){f.beat=Object.assign(f.beat&&f.beat.src==='file'?f.beat:{src:'file'},{title:x.value});rebuild()}
  else if(k==='bbpm'){f.beat=Object.assign(f.beat||{src:'file'},{bpm:+x.value||0});rebuild()}
  else if(k==='bfile'){const file=x.files[0];if(!file)return;msg('Reading '+file.name+'...');try{const buf=await decode(await file.arrayBuffer());f.beat={src:'file',title:(f.beat&&f.beat.src==='file'&&f.beat.title)||file.name.replace(/\.[^.]+$/,''),bpm:f.beat&&f.beat.bpm||0,key:'',buf,start:bestStart(buf,ST.clip)};msg('Loaded '+file.name+'.');fightersList();rebuild()}catch(e){msg('Could not read that audio file.')}}
  else if(k==='face'){const file=x.files[0];if(!file)return;try{const cv=await faceFromFile(file);f.char=0;f.face={canvas:cv,name:file.name};fightersList();rebuild()}catch(e){msg('Could not read that image.')}}}})}
async function faceFromFile(file){const bm=await createImageBitmap(file),s=640,c=document.createElement('canvas');c.width=c.height=s;const g=c.getContext('2d'),sc=Math.max(s/bm.width,s/bm.height);g.drawImage(bm,(s-bm.width*sc)/2,(s-bm.height*sc)/2,bm.width*sc,bm.height*sc);
 const d=g.getImageData(0,0,s,s),a=d.data,corner=[[0,0],[s-1,0],[0,s-1],[s-1,s-1]].every(([x,y])=>{const i=(y*s+x)*4;return a[i+1]-Math.max(a[i],a[i+2])>110});
 if(corner){for(let i=0;i<a.length;i+=4){const dom=a[i+1]-Math.max(a[i],a[i+2]);const al=1-clamp((dom-38)/82,0,1);if(dom>38){a[i+3]=Math.round(a[i+3]*al);if(a[i+1]>Math.max(a[i],a[i+2])+6)a[i+1]=Math.max(a[i],a[i+2])+6}}g.putImageData(d,0,0)}return c}
function openPick(i){const p=$q('#btPick');p.classList.add('on');const g=$q('#btPg');FX().loadChars([...Array(20)].map((_,k)=>k+1));g.innerHTML=[...Array(20)].map((_,k)=>`<div data-c="${k+1}"><img src="battle/c${String(k+1).padStart(2,'0')}.webp" alt=""><br>${esc(TX().FIGHTERS[k].n.replace('THE ',''))}</div>`).join('');
 g.querySelectorAll('div').forEach(d=>d.onclick=()=>{const n=+d.dataset.c,f=ST.fighters[i];f.char=n;f.face=null;f.name=TX().FIGHTERS[n-1].n;p.classList.remove('on');FX().loadChars([n]).then(()=>{fightersList();rebuild()})})}
function episodeSel(){const s=$q('#btEp');let o=[];
 if(ST.format==='team'){const k=ST.rounds[0].length,n=Math.ceil(k/ST.per);for(let e=0;e<n;e++)o.push([`t${e}`,`EPISODE ${e+1}: MATCHES ${e*ST.per+1} TO ${Math.min(k,(e+1)*ST.per)}`]);o.push(['champ','FINAL EPISODE: TEAM RESULT'+(done(0)?'':' (needs all votes)')])}
 else{ST.rounds.forEach((r,i)=>o.push([`r${i}`,`ROUND ${i+1}: ${SC().roundName({format:'bracket',fighters:ST.fighters,rounds:ST.rounds},i)}${ready(i)?'':' (not ready yet)'}`]));o.push(['champ','CHAMPION EPISODE'+(done(ST.rounds.length-1)?'':' (needs the final result)')])}
 o.unshift(['full','THE WHOLE BATTLE IN ONE VIDEO'+(done(ST.format==='team'?0:ST.rounds.length-1)?'':' (needs all votes)')]);
 s.innerHTML=o.map(([v,l])=>`<option value="${v}">${l}</option>`).join('');s.value=ST.kind==='full'?'full':ST.kind==='champion'?'champ':(ST.format==='team'?'t'+ST.cur:'r'+ST.cur);$q('#btS3').textContent=ST.kind==='full'?'full battle':ST.kind==='champion'?'champion':(ST.format==='team'?'episode '+(ST.cur+1):'round '+(ST.cur+1))}
function fillPart(){const s=$q('#btPart'),keep=s.value;s.innerHTML=TL.segs.map((g,i)=>{let l=g.type.toUpperCase();if(g.type==='intro'||g.type==='vote')l+=' (MATCH '+(g.m+1)+')';if(g.type==='play')l='BEAT '+(g.side+1)+' (MATCH '+(g.m+1)+')';if(g.type==='recap')l='RESULT (MATCH '+(g.m+1)+')';return`<option value="${i}">${i+1}. ${l}  ${mmss(g.dur)}</option>`}).join('');if(keep&&+keep<TL.segs.length)s.value=keep;$q('#btBs').textContent=mmss(TL.total)+' episode'}
function msg(t){const m=$q('#btMsg');if(m)m.textContent=t}
function fillBracket(){const el=$q('#btRes');if(!el)return;let h='';
 ST.rounds.forEach((rd,r)=>{if(!rd.some(M=>M.a!=null&&M.b!=null))return;h+=`<h4>${ST.format==='team'?'TEAM WAR MATCHES':'ROUND '+(r+1)+': '+SC().roundName({format:'bracket',fighters:ST.fighters,rounds:ST.rounds},r)}</h4>`;
  rd.forEach((M,j)=>{if(M.a==null||M.b==null)return;const A=ST.fighters[M.a],Bf=ST.fighters[M.b],w=winnerOf(M);h+=`<div class="mt" data-r="${r}" data-j="${j}"><div class="vs"><span>${esc(A.beat&&A.beat.title||A.name)}</span><input type="number" min="0" data-k="va" placeholder="votes 1" value="${M.va||''}"><input type="number" min="0" data-k="vb" placeholder="votes 2" value="${M.vb||''}"><span style="text-align:right">${esc(Bf.beat&&Bf.beat.title||Bf.name)}</span></div>
   <div class="two"><select data-k="wm"><option value="">Winner: auto from votes${w!=null?' ('+esc((ST.fighters[w].beat&&ST.fighters[w].beat.title)||ST.fighters[w].name)+')':''}</option><option value="${M.a}"${M.wm===M.a?' selected':''}>${esc(A.name)} wins</option><option value="${M.b}"${M.wm===M.b?' selected':''}>${esc(Bf.name)} wins</option></select>
   <select data-k="fin"><option value="auto">Finishing move: auto</option>${TX().FINISH.map(f=>`<option value="${f.id}"${M.fin===f.id?' selected':''}>${f.n}</option>`).join('')}</select></div></div>`})});
 if(!h)h='<div class="msg">Add fighters to see the matches.</div>';el.innerHTML=h;
 el.querySelectorAll('.mt').forEach(d=>{const M=ST.rounds[+d.dataset.r][+d.dataset.j];d.querySelectorAll('[data-k]').forEach(x=>x.onchange=()=>{const k=x.dataset.k;if(k==='va'||k==='vb')M[k]=Math.max(0,+x.value||0);else if(k==='wm')M.wm=x.value===''?null:+x.value;else M.fin=x.value;rebuild();episodeSel()})})}

/* ---------- audio ---------- */
function ctxA(){if(!AC)AC=new (window.AudioContext||window.webkitAudioContext)();return AC}
async function decode(ab){return await ctxA().decodeAudioData(ab)}
function bestStart(buf,clip){return 0;const d=buf.getChannelData(0),sr=buf.sampleRate,win=sr,n=Math.floor(d.length/win);if(buf.duration<=clip+1.5||n<3)return 0;const e=[];for(let k=0;k<n;k++){let s=0;for(let i=k*win;i<(k+1)*win;i+=9)s+=d[i]*d[i];e.push(s)}let best=0,bs=-1;const L=Math.max(1,Math.round(clip));for(let k=0;k+L<=n;k++){let s=0;for(let j=0;j<L;j++)s+=e[k+j];if(k>0&&s>bs){bs=s;best=k}}return Math.max(0,Math.min(best,buf.duration-clip-.2))}
async function prepAudio(){const need=new Set();TL.segs.forEach(s=>{if(s.type==='play'){const M=B.rounds[s.r][s.m];need.add(s.side===0?M.a:M.b)}});
 for(const i of need){const f=ST.fighters[i],bt=f.beat;if(!bt||bt.buf||bt.src!=='site'||!bt.path)continue;try{const r=await fetch(typeof pub==='function'?pub(bt.path):bt.path);bt.buf=await decode(await r.arrayBuffer());bt.start=0}catch(e){}}
 const miss=[...need].filter(i=>!ST.fighters[i].beat||!ST.fighters[i].beat.buf).map(i=>ST.fighters[i].name);return miss}

/* ---------- drawing and preview ---------- */
function cvx(){return $q('#btCv').getContext('2d')}
function drawNow(){if(!TL||PV.playing)return;const s=+($q('#btPart').value||0),seg=TL.segs[s]||TL.segs[0],lt=parseFloat($q('#btScrub').value)*seg.dur;SC().drawFrame(cvx(),B,TL,seg.start+lt,{bass:.25,loud:.3,fd:null});$q('#btTime').textContent=mmss(lt)+' / '+mmss(seg.dur)}
let PT=0,PC=null;
function stopPlay(){PT++;PV.playing=false;cancelAnimationFrame(PV.raf);try{(PV.srcs||[]).forEach(x=>{try{x.stop()}catch(e){}})}catch(e){}PV.srcs=null;$q('#btPlay').textContent='PLAY PART';$q('#btAll').textContent='PLAY EPISODE'}
async function playSeg(i,chain){try{await playSeg0(i,chain)}catch(e){PV.loading=false;stopPlay();msg('Playback problem: '+(e&&e.message||e)+'. Tell Claude this text.')}}
async function playSeg0(i,chain){
 stopPlay();const my=PT;$q('#btPlay').textContent=chain?'PLAY PART':'STOP';$q('#btAll').textContent=chain?'STOP':'PLAY EPISODE';const lb=chain?'#btAll':'#btPlay';$q(lb).textContent='LOADING... (CLICK TO CANCEL)';PV.loading=true;
 const miss=await prepAudio();if(my!==PT)return;if(miss.length)msg('No audio yet for: '+miss.slice(0,4).join(', ')+'. Pick a beat for them or upload a file. Playing without it.');
 const seg=TL.segs[i];if(!seg)return;$q('#btPart').value=String(i);const end=chain?TL.total:seg.start+seg.dur,a=ctxA(),CH=15,nCh=Math.ceil((end-seg.start)/CH);
 if(!PC||PC.tl!==TL||miss.length)PC={tl:TL,m:new Map()};
 const getCh=k=>{const from=seg.start+k*CH,to=Math.min(end,from+CH),key=from+'|'+to;if(!PC.m.has(key))PC.m.set(key,AU().renderRange(B,TL,from,to));return PC.m.get(key)};
 const b0=await getCh(0);if(my!==PT)return;await Promise.race([a.resume(),new Promise(r=>setTimeout(r,500))]);if(my!==PT)return;PV.loading=false;
 const t0=a.currentTime+.08,pm=performance.now()+80,chs=[],srcs=[];
 const put=(k,buf)=>{if(my!==PT)return;chs[k]={L0:buf.getChannelData(0),sr:buf.sampleRate};const src=a.createBufferSource();src.buffer=buf;src.connect(a.destination);const when=t0+k*CH,off=Math.max(0,a.currentTime-when);if(off<buf.duration){src.start(Math.max(when,a.currentTime),off);srcs.push(src)}};
 PV={playing:true,raf:0,srcs,t0,pm,seg,i,chain,prev:new Float32Array(512)};put(0,b0);
 (async()=>{for(let k=1;k<nCh;k++){const bf=await getCh(k);if(my!==PT)return;put(k,bf)}})().catch(()=>{});
 $q('#btPlay').textContent=chain?'PLAY PART':'STOP';$q('#btAll').textContent=chain?'STOP':'PLAY EPISODE';
 const loop=()=>{if(!PV.playing)return;const lt=a.state==='running'?a.currentTime-PV.t0:(performance.now()-PV.pm)/1000;if(lt>=end-seg.start){stopPlay();drawNow();return}
  const T=seg.start+Math.max(0,lt),cs=SC().segAt(TL,T),k=Math.min(nCh-1,Math.max(0,Math.floor(lt/CH))),ch=chs[k],au=lt<0||!ch?{bass:0,loud:0,fd:null}:MZShow.dataFromBuffer(ch.L0,ch.sr,lt-k*CH,PV.prev);SC().drawFrame(cvx(),B,TL,T,au);if(chain&&cs.i!==+$q('#btPart').value)$q('#btPart').value=String(cs.i);$q('#btTime').textContent=mmss(cs.lt)+' / '+mmss(cs.seg.dur);$q('#btScrub').value=String(clamp(cs.lt/cs.seg.dur,0,1));PV.raf=requestAnimationFrame(loop)};PV.raf=requestAnimationFrame(loop)}
let bt0=0,bRaf=0;
function bracketLoop(ts){bRaf=requestAnimationFrame(bracketLoop);if(!root||!root.classList.contains('on')||document.hidden)return;const d=document.getElementById('btBrk');if(!d||!d.open||!B)return;const t=((ts-bt0)/1000)%9;const c=$q('#btBc').getContext('2d');c.clearRect(0,0,1280,720);FX().arena(c,ST.tpl,t,{bass:0},B);c.fillStyle='rgba(4,3,12,.42)';c.fillRect(0,0,1280,720);FX().drawBracket(c,B,Math.min(t,6)+(t>6?0:0),{curMatch:-1});FX().vignette(c,.5)}

/* ---------- video render ---------- */
const mcx=new MessageChannel(),ysq=[];mcx.port1.onmessage=()=>{const f=ysq.shift();if(f)f()};const yieldNow=()=>new Promise(r=>{ysq.push(r);mcx.port2.postMessage(0)});
const dlf=(blob,name)=>{const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),8000)};
async function renderEpisode(){
 if(window.__btBusy)return;const rm=t=>{$q('#btRMsg').textContent=t},btn=$q('#btRender');
 if(!(window.VideoEncoder&&window.AudioEncoder&&window.VideoFrame&&window.AudioData&&window.OfflineAudioContext)){rm('This browser cannot render video. Use Chrome or Edge.');return}
 window.__btBusy=true;btn.disabled=true;stopPlay();$q('#btProg').style.width='0';let venc,aenc,err=null;const bar=document.querySelector('.bh [data-t=battle]');
 try{
  rm('Loading beats and fonts...');await FX().loadFonts();await loadS('mp4-muxer.js').catch(()=>{});await prepAudio();
  const OW=1280,OH=720,FPS=ST.fps||24,total=TL.total,N=Math.ceil(total*FPS),out=document.createElement('canvas');out.width=OW;out.height=OH;const oc=out.getContext('2d');
  const pickV=async()=>{for(const c of [{codec:'avc1.4d001f',mux:'avc'},{codec:'avc1.42E01f',mux:'avc'},{codec:'vp09.00.31.08',mux:'vp9'}]){const cfg={codec:c.codec,width:OW,height:OH,bitrate:3e6,framerate:FPS};try{const r=await VideoEncoder.isConfigSupported(cfg);if(r&&r.supported)return{...c,cfg}}catch(e){}}return null};
  const pickA=async()=>{for(const c of [{codec:'mp4a.40.2',mux:'aac'},{codec:'opus',mux:'opus'}]){try{const r=await AudioEncoder.isConfigSupported({codec:c.codec,sampleRate:48000,numberOfChannels:2,bitrate:160000});if(r&&r.supported)return c}catch(e){}}return null};
  const vc=await pickV(),ac=await pickA();if(!vc||!ac)throw new Error('no video codec available');
  const target=new Mp4Muxer.ArrayBufferTarget(),muxer=new Mp4Muxer.Muxer({target,video:{codec:vc.mux,width:OW,height:OH},audio:{codec:ac.mux,numberOfChannels:2,sampleRate:48000},fastStart:'in-memory'});
  venc=new VideoEncoder({output:(c,m)=>muxer.addVideoChunk(c,m),error:e=>{err=e}});venc.configure(vc.cfg);aenc=new AudioEncoder({output:(c,m)=>muxer.addAudioChunk(c,m),error:e=>{err=e}});aenc.configure({codec:ac.codec,sampleRate:48000,numberOfChannels:2,bitrate:160000});
  const prev=new Float32Array(512),CH=30,t0=performance.now();let f=0;
  for(let from=0;from<total;from+=CH){
   const until=Math.min(total,from+CH),rb=await AU().renderRange(B,TL,from,until,48000),L0=rb.getChannelData(0),R0=rb.getChannelData(1);
   for(let o=0;o<L0.length;o+=4800){const m=Math.min(4800,L0.length-o),b=new Float32Array(m*2);b.set(L0.subarray(o,o+m),0);b.set(R0.subarray(o,o+m),m);const ad=new AudioData({format:'f32-planar',sampleRate:48000,numberOfFrames:m,numberOfChannels:2,timestamp:Math.round((from+o/48000)*1e6),data:b});aenc.encode(ad);ad.close()}
   const f1=Math.min(N,Math.round(until*FPS));
   for(;f<f1;f++){if(err)throw err;const T=Math.min(total-.001,f/FPS),au=MZShow.dataFromBuffer(L0,48000,Math.max(0,T-from),prev);SC().drawFrame(oc,B,TL,T,au);
    const vf=new VideoFrame(out,{timestamp:Math.round(f*1e6/FPS),duration:Math.round(1e6/FPS)});venc.encode(vf,{keyFrame:f%96===0});vf.close();
    while(venc.encodeQueueSize>8){await Promise.race([new Promise(r=>venc.addEventListener('dequeue',r,{once:true})),new Promise(r=>setTimeout(r,40))]);if(err)throw err}
    if(f%6===0){const p=Math.round(f/N*100),el=(performance.now()-t0)/1000,eta=f?Math.round(el/f*(N-f)):0;$q('#btProg').style.width=p+'%';if(bar)bar.textContent='BATTLE '+p+'%';rm('Rendering '+p+'%  (about '+mmss(eta)+' left). You can switch tabs, it keeps going.');await yieldNow()}}}
  await venc.flush();await aenc.flush();if(err)throw err;muxer.finalize();const blob=new Blob([target.buffer],{type:'video/mp4'});
  $q('#btProg').style.width='100%';rm('Done: '+(blob.size/1048576).toFixed(0)+' MB, '+mmss(total)+' long. Downloading. Your YouTube package for this episode is below.');dlf(blob,(ST.title||'beat-battle').replace(/[^\w -]+/g,'')+' - '+(ST.kind==='full'?'full battle':ST.kind==='champion'?'champion':(ST.format==='team'?'ep'+(ST.cur+1):'round'+(ST.cur+1)))+'.mp4');
  const d=$q('#btYTd');if(d){d.open=true;d.scrollIntoView({behavior:'smooth',block:'start'})}
 }catch(e){console.warn(e);rm('Render failed: '+((e&&e.message)||e))}
 finally{try{venc&&venc.close()}catch(e){}try{aenc&&aenc.close()}catch(e){}window.__btBusy=false;btn.disabled=false;if(bar)bar.textContent='BATTLE'}}

/* ---------- youtube package + thumbnails ---------- */
const ytCopy=async t=>{try{await navigator.clipboard.writeText(t);return true}catch(e){const a=document.createElement('textarea');a.value=t;document.body.appendChild(a);a.select();let ok=false;try{ok=document.execCommand('copy')}catch(x){}a.remove();return ok}};
function ytRender(){const el=$q('#btYT');if(!el||!B||!YT())return;const O=YT().build(ST,B,TL),pre=ST.yt.mode==='premiere',cc=(n,max,soft)=>`<span style="font:600 10px Montserrat;color:${n>max?'#ff5c5c':soft&&n>soft?'#e8b94a':'#7ad47a'}">${n}/${max}</span>`;
 el.innerHTML=`<div class="two"><label class="chk"><input type="radio" name="btym" value="premiere"${pre?' checked':''}> YOUTUBE PREMIERE</label><label class="chk"><input type="radio" name="btym" value="straight"${pre?'':' checked'}> STRAIGHT UPLOAD</label></div>
 <div class="two"><div><label>PREVIOUS EPISODE LINK (OPTIONAL)</label><input type="text" id="btyP" value="${esc(ST.yt.prev)}"></div><div><label>PLAYLIST LINK (OPTIONAL)</label><input type="text" id="btyL" value="${esc(ST.yt.playlist)}"></div></div>${pre?`<label>PREMIERE TIME TEXT</label><input type="text" id="btyW" placeholder="Friday at 8:00 PM" value="${esc(ST.when)}">`:''}
 <h4>TITLES</h4>${O.titles.map((t,i)=>`<div class="it"><b style="white-space:normal">${esc(t)}</b>${cc(t.length,100,70)}<button data-c="t${i}">COPY</button></div>`).join('')}<button class="btn" id="btyM" style="width:100%;margin-top:6px">MORE TITLE IDEAS</button>
 <h4>DESCRIPTION ${cc(O.desc.length,5000)}</h4><textarea id="btyD" rows="14" style="width:100%;background:#050506;border:1.5px solid #34343a;color:#fff;padding:8px;font:500 12px/1.5 monospace">${esc(O.desc)}</textarea><button class="btn" data-c="desc" style="width:100%;margin-top:6px">COPY DESCRIPTION</button>
 <h4>TAGS ${cc(O.tags.length,500)}</h4><textarea id="btyT" rows="3" style="width:100%;background:#050506;border:1.5px solid #34343a;color:#fff;padding:8px;font:500 12px/1.5 monospace">${esc(O.tags)}</textarea><button class="btn" data-c="tags" style="width:100%;margin-top:6px">COPY TAGS</button>
 <h4>PINNED COMMENT</h4><div class="msg" style="color:#d9d9dc">${esc(O.pinned)}</div><button class="btn" data-c="pin" style="width:100%">COPY PINNED COMMENT</button>
 <div class="two" style="margin-top:10px"><button class="btn" id="btyA">COPY EVERYTHING</button><button class="btn" id="btyX">DOWNLOAD .TXT</button></div><div class="msg" id="btyMsg"></div>`;
 el.querySelectorAll('[name=btym]').forEach(r=>r.onchange=()=>{ST.yt.mode=r.value;save();ytRender()});
 const inp=(id,fn)=>{const x=el.querySelector(id);if(x)x.onchange=()=>{fn(x.value);save();ytRender()}};inp('#btyP',v=>ST.yt.prev=v.trim());inp('#btyL',v=>ST.yt.playlist=v.trim());inp('#btyW',v=>ST.when=v.trim());
 el.querySelector('#btyM').onclick=()=>{ST.yt.variant+=3;ytRender()};const txt=()=>({desc:el.querySelector('#btyD').value,tags:el.querySelector('#btyT').value,pin:O.pinned});
 el.querySelectorAll('[data-c]').forEach(b=>b.onclick=async()=>{const k=b.dataset.c,v=/^t\d+$/.test(k)?O.titles[+k.slice(1)]:txt()[k];el.querySelector('#btyMsg').textContent=(await ytCopy(v))?'Copied.':'Copy failed. Select the text and copy it by hand.'});
 const all=()=>{const x=txt();return'TITLES\n'+O.titles.map((t,i)=>(i+1)+'. '+t).join('\n')+'\n\nDESCRIPTION\n'+x.desc+'\n\nTAGS\n'+x.tags+'\n\nPINNED COMMENT\n'+x.pin};
 el.querySelector('#btyA').onclick=async()=>{el.querySelector('#btyMsg').textContent=(await ytCopy(all()))?'Everything copied.':'Copy failed.'};el.querySelector('#btyX').onclick=()=>dlf(new Blob([all()],{type:'text/plain'}),(ST.title||'battle')+' - YouTube package.txt')}
function thRender(){const el=$q('#btTH');if(!el||!B||!YT())return;const Y=YT(),names=Y.TH_NAMES;
 el.innerHTML=`<div class="msg">Uses the first match of this episode (or the champion). Click one to see it big.</div><div class="two" style="margin:8px 0"><button class="btn" id="btThN">NEW ARENA LOOK</button><button class="btn" id="btThD">DOWNLOAD ALL (16 FILES)</button></div><div class="thg" id="btThG"></div>`;
 const g=el.querySelector('#btThG');const Bt=Object.assign({},B,{tpl:ST.th.tpl||ST.tpl});
 names.forEach((n,i)=>{const w=document.createElement('div');const cv=document.createElement('canvas');cv.width=640;cv.height=360;cv.getContext('2d').drawImage(Y.thumb(i,{tpl:ST.th.tpl||ST.tpl},Bt,true),0,0,640,360);cv.onclick=()=>{const big=Y.thumb(i,{tpl:ST.th.tpl||ST.tpl},Bt,true),lb=document.createElement('div');lb.style.cssText='position:fixed;inset:0;z-index:95;background:rgba(0,0,0,.92);display:flex;align-items:center;justify-content:center;padding:16px;cursor:pointer';big.style.cssText='max-width:100%;max-height:100%';lb.appendChild(big);lb.onclick=()=>lb.remove();document.body.appendChild(lb)};
  const b=document.createElement('div');b.className='two';b.style.marginTop='4px';b.innerHTML=`<button class="btn" data-w="1">${n} 16:9</button><button class="btn" data-w="0">9:16</button>`;b.querySelectorAll('button').forEach(x=>x.onclick=()=>thDl(i,x.dataset.w==='1'));w.append(cv,b);g.appendChild(w)});
 el.querySelector('#btThN').onclick=()=>{const t=FX().TEMPLATES,k=(t.findIndex(x=>x.id===(ST.th.tpl||ST.tpl))+1+Math.floor(Math.random()*(t.length-1)))%t.length;ST.th.tpl=t[k].id;save();thRender()};
 el.querySelector('#btThD').onclick=async()=>{for(let i=0;i<names.length;i++){await thDl(i,true);await new Promise(r=>setTimeout(r,300));await thDl(i,false);await new Promise(r=>setTimeout(r,300))}}}
function thDl(i,wide){return new Promise(res=>{const Bt=Object.assign({},B,{tpl:ST.th.tpl||ST.tpl}),c=YT().thumb(i,{tpl:ST.th.tpl||ST.tpl},Bt,wide?true:'tall');c.toBlob(b=>{if(b)dlf(b,'battle-'+YT().TH_NAMES[i].toLowerCase().replace(/[^a-z0-9]+/g,'-')+(wide?'-16x9':'-9x16')+'.jpg');res()},'image/jpeg',.92)})}

/* ---------- wiring ---------- */
function wire(){
 $q('#btTitle').onchange=e=>{ST.title=e.target.value.toUpperCase()||'BEAT BATTLE';rebuild()};
 $q('#btFb').onclick=()=>{ST.format='bracket';deal();syncTop();fightersList();episodeSel();rebuild()};$q('#btFt').onclick=()=>{ST.format='team';deal();syncTop();fightersList();episodeSel();rebuild()};
 $q('#btSize').onchange=e=>{if(ST.format==='team')ST.team=+e.target.value;else ST.size=+e.target.value;deal();syncTop();fightersList();episodeSel();rebuild()};
 $q('#btClip').onchange=e=>{ST.clip=+e.target.value;ST.fighters.forEach(f=>{if(f.beat&&f.beat.buf)f.beat.start=bestStart(f.beat.buf,ST.clip)});rebuild();syncTop()};
 $q('#btCust').onchange=e=>{ST.custom=e.target.checked;syncTop();fightersList();save()};
 $q('#btAuto').onclick=()=>{ST.fighters.forEach((f,i)=>{if(!(f.beat&&f.beat.src==='file'))f.beat=beatFor(i)});fightersList();rebuild();msg('Filled the fighters with your site beats, newest first.')};
 $q('#btShuf').onclick=()=>{const a=ST.fighters,r=Math.random;for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]]}deal();fightersList();episodeSel();rebuild();msg('Shuffled. The bracket was dealt again.')};
 $q('#btNew').onclick=async()=>{if(!(await askConfirm('START A NEW BATTLE?','This clears the current bracket and votes.')))return;const keep={custom:ST.custom};ST=defaults();Object.assign(ST,keep);beats.length;deal();syncTop();tplBtns();fightersList();episodeSel();rebuild()};
 $q('#btEp').onchange=e=>{const v=e.target.value;if(v==='full'){ST.kind='full';ST.cur=0}else if(v==='champ'){ST.kind='champion';ST.cur=ST.rounds.length-1}else{ST.kind='round';ST.cur=+v.slice(1)}ST.epLabel=ST.kind==='full'?'FULL BATTLE':'EPISODE '+(ST.kind==='champion'?'FINAL':(ST.format==='team'?ST.cur+1:ST.cur+1));$q('#btLab').value=ST.epLabel;rebuild();episodeSel()};
 $q('#btPer').onchange=e=>{ST.per=+e.target.value;ST.cur=0;rebuild();episodeSel()};$q('#btLab').onchange=e=>{ST.epLabel=e.target.value.toUpperCase();rebuild()};
 $q('#btTalk').onchange=e=>{ST.opts.talk=+e.target.value;syncTop();rebuild()};$q('#btRecap').onchange=e=>{ST.opts.recap=e.target.value;rebuild()};
 $q('#btSfx').onchange=e=>{ST.opts.sfx=e.target.checked;save()};$q('#btShk').onchange=e=>{ST.opts.fx.shake=e.target.checked?1:0;rebuild()};$q('#btCnf').onchange=e=>{ST.opts.fx.confetti=e.target.checked?1:0;rebuild()};
 $q('#btBant').onclick=()=>{ST.opts.seed=Math.floor(Math.random()*9973)+1;ST.rounds.forEach(rd=>rd.forEach(M=>{if(M.fin&&M.fin!=='auto'&&!M.keepFin)M.fin='auto'}));rebuild();const n=TX().COUNT();$q('#btBantN').textContent='Dealt fresh lines from '+n+' phrases and 14 finishing moves.'};
 $q('#btFps').onchange=e=>{ST.fps=+e.target.value;save()};
 $q('#btPx').onclick=()=>$q('#btPick').classList.remove('on');$q('#btPick').onclick=e=>{if(e.target.id==='btPick')e.target.classList.remove('on')};
 $q('#btPart').onchange=()=>{stopPlay();$q('#btScrub').value='0';drawNow()};$q('#btScrub').oninput=()=>{if(PV.playing)stopPlay();drawNow()};
 $q('#btPlay').onclick=()=>{if(PV.playing||PV.loading){PV.loading=false;stopPlay();drawNow()}else playSeg(+$q('#btPart').value,false)};$q('#btAll').onclick=()=>{if(PV.playing||PV.loading){PV.loading=false;stopPlay();drawNow()}else playSeg(+$q('#btPart').value,true)};
 $q('#btRender').onclick=renderEpisode;
 $q('#btBrk').addEventListener('toggle',()=>{});
}
window.battleOpen=async function(){
 css();root=document.getElementById('battlemk');root.classList.add('on');
 if(!mounted){root.innerHTML='<div class="pn"><div class="msg">Loading the battle engine...</div></div>';
  try{await loadS('show.js?v=15');for(const f of['battletext.js?v=1','battlefx.js?v=4','battlescenes.js?v=7','battleaudio.js?v=9','battleyt.js?v=1'])await loadS(f)}catch(e){root.innerHTML='<div class="pn"><div class="msg">The battle engine did not load. Refresh the page.</div></div>';return}
  await FX().loadFonts();await FX().loadProps();
  try{const {data}=await sb.from('beats').select('id,title,bpm,musical_key,preview_path,cover_path,slug,tags').order('created_at',{ascending:false});beats=(data||[]).filter(b=>b.preview_path)}catch(e){beats=[]}
  ST=load();if(ST.fighters.length!==total()||!ST.rounds.length){const keep=ST.fighters.slice(0,total());ST.fighters=keep;deal()}
  ST.fighters.forEach(f=>{if(f.beat&&f.beat.src==='file'&&!f.beat.buf)f.beat=beatFor(ST.fighters.indexOf(f));if(f.char===0&&!(f.face&&f.face.canvas)){f.char=(ST.fighters.indexOf(f)%20)+1}});
  await FX().loadChars(ST.fighters.map(f=>f.char).filter(n=>n>0));
  root.innerHTML=html();wire();syncTop();tplBtns();fightersList();episodeSel();B=mkBattle();TL=SC().build(B);fillPart();{const bi=TL.segs.findIndex(g=>g.type==='bracket');if(bi>=0){$q('#btPart').value=String(bi);$q('#btScrub').value='0.7'}}drawNow();fillBracket();ytRender();thRender();
  cancelAnimationFrame(bRaf);bt0=performance.now();bRaf=requestAnimationFrame(bracketLoop)}
 else{cancelAnimationFrame(bRaf);bRaf=requestAnimationFrame(bracketLoop)}
};
window.__bt={pv:()=>PV,st:()=>ST,tl:()=>TL,b:()=>B};
window.battleClose=function(){if(root)root.classList.remove('on');stopPlay();cancelAnimationFrame(bRaf)};
})();
