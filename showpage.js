/* MZPRD SHOW page (the SHOW tab): countdown, live pixel concert, hearts, replays, reminders.
   Runs the engine in show.js from a published show script. Drafts are never loaded (the database hides them). */
(function(){
const M=window.MZShow,W=M.W,H=M.H;
const SITEFN=()=>SB_URL+'/functions/v1/site';
async function api(body){
 try{const r=await fetch(SITEFN(),{method:'POST',headers:{'Content-Type':'application/json',apikey:SB_KEY,Authorization:'Bearer '+SB_KEY},body:JSON.stringify(body)});return await r.json()}catch(e){return{error:'Network problem.'}}
}
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const P={root:null,built:false,shows:[],cur:null,tab:'live',off:0,stage:null,hero:null,actx:null,sched:null,master:null,an:null,fd:null,td:null,
 pollT:0,flushT:0,target:0,playing:false,from:0,t0:0,mode:'wait',raf:0,last:0,loading:false,data:null,hearts:0,shown:0,own:0,pending:0,floaters:[],pollT:0,flushT:0,muted:false,ended:false,endAt:0,live:false,hits:[],cvH:null,hx:null};
const HEART=['0110110','1111111','1111111','0111110','0011100','0001000'];
function css(){
 if(document.getElementById('shCss'))return;const s=document.createElement('style');s.id='shCss';
 s.textContent=`.shw{position:relative}
.shbox{position:relative;width:min(100%,calc(86vh*1.382));margin:0 auto;aspect-ratio:1092/790;background:#05040a;border:2px solid #1d1a2e;overflow:hidden;box-shadow:0 0 40px rgba(120,60,200,.2)}
.shbox canvas{position:absolute;inset:0;width:100%;height:100%;image-rendering:pixelated}
.shbox canvas.hv{pointer-events:none;image-rendering:auto}
.shnp{position:absolute;left:12px;top:12px;display:flex;gap:10px;align-items:center;background:rgba(8,6,16,.78);border:1px solid #2a2542;padding:8px 12px 8px 8px;backdrop-filter:blur(3px);max-width:46%}
.shnp img{width:46px;height:46px;object-fit:cover;background:#15121f}
.shnp .shcart{display:block;margin-top:7px;background:var(--red);border:0;color:#fff;font:700 10px Montserrat;letter-spacing:.14em;padding:7px 10px;cursor:pointer}
.shnp .shcart.in{background:#1a1730;color:#6fd08c;border:1px solid #2f6a46}
.shnp small{display:block;font:600 9px Montserrat;letter-spacing:.28em;color:#8e8aa8}
.shnp b{display:block;font:700 15px Montserrat;letter-spacing:.1em;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:200px}
.shnp span{font:500 11px Montserrat;color:#a9a5c0;letter-spacing:.08em}
.shhc{position:absolute;right:12px;top:12px;display:flex;align-items:center;gap:10px;background:rgba(8,6,16,.78);border:1px solid #3a1a26;padding:7px 8px 7px 12px}
.shhc .hh{color:#ff3b4a;font-size:20px;text-shadow:0 0 10px #ff3b4a}
.shhc b{font:700 22px Montserrat;color:#fff;letter-spacing:.04em;min-width:36px;text-align:right}
.shhc i{font:700 11px Montserrat;letter-spacing:.18em;font-style:normal;background:#e0242f;color:#fff;padding:7px 10px}
.shhc i.up{background:#2b2a48}.shhc i.rp{background:#3a3560}
.shms{position:absolute;left:50%;transform:translateX(-50%);bottom:12px;width:min(62%,560px);display:flex;justify-content:space-between;align-items:flex-end;background:rgba(8,6,16,.7);border:1px solid #2a2542;padding:8px 14px 6px}
.shms .mi{text-align:center;font:600 9px Montserrat;letter-spacing:.14em;color:#6f6b8a;flex:1;position:relative}
.shms .mi:before{content:"";position:absolute;left:-50%;right:50%;top:12px;height:2px;background:#2b2742;z-index:0}
.shms .mi:first-child:before{display:none}
.shms .mi.on:before{background:#e0242f}
.shms .mi i{display:block;width:26px;height:26px;margin:0 auto 4px;border-radius:50%;border:2px solid #3a3560;background:#0d0b18;font-style:normal;font-size:12px;line-height:22px;position:relative;z-index:1;color:#6f6b8a}
.shms .mi.on{color:#fff}.shms .mi.on i{border-color:#ff3b4a;color:#ff3b4a;box-shadow:0 0 12px rgba(255,59,74,.6)}
.shms .mi b{display:block;font:700 10px Montserrat;color:inherit}
.shtap{position:absolute;right:16px;bottom:14px;width:84px;height:84px;border-radius:50%;border:4px solid #ff3b4a;background:radial-gradient(circle at 35% 30%,#3a0d16,#12060a);color:#ff3b4a;font:400 38px/1 Arial;cursor:pointer;box-shadow:0 0 22px rgba(255,59,74,.55);transition:transform .08s}
.shtap:active{transform:scale(.9)}.shtap small{display:block;font:700 10px Montserrat;letter-spacing:.2em;color:#fff;margin-top:2px}
.shgate{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;background:rgba(5,4,10,.55);text-align:center;padding:20px;z-index:4}
.shgate.hide{display:none}
.shgate h3{font:400 clamp(14px,2.2vw,24px) 'Press Start 2P';color:#ffd34a;text-shadow:3px 3px 0 #7a1218;margin:0;line-height:1.5}
.shgate p{font:500 13px Montserrat;color:#d6d3e8;margin:0;max-width:440px}
.shgate button{background:linear-gradient(#ff4b57,#d51f2c 55%,#a8141f);border:2px solid #0d0716;border-radius:12px;box-shadow:inset 0 2px 0 rgba(255,255,255,.4),0 5px 0 #5e0d15;color:#fff;font:800 14px Montserrat;letter-spacing:.2em;padding:14px 26px;cursor:pointer}
.shgate button.alt{background:#1a1730;box-shadow:0 4px 0 #0a0814;color:#d6d3e8;font-size:12px}
.shmute{position:absolute;left:12px;bottom:14px;background:rgba(8,6,16,.78);border:1px solid #2a2542;color:#d6d3e8;font:700 11px Montserrat;letter-spacing:.14em;padding:9px 12px;cursor:pointer}
.shtabs{display:flex;gap:8px;margin:14px 0 10px}
.shtabs button{background:transparent;border:1.5px solid #3a3560;color:#d6d3e8;font:700 11px Montserrat;letter-spacing:.2em;padding:10px 16px;cursor:pointer}
.shtabs button.on{background:var(--red);border-color:var(--red);color:#fff}
.shlist{display:grid;gap:8px}
.shrow{display:flex;gap:12px;align-items:center;background:#0c0a16;border:1px solid #221e36;padding:10px 12px}
.shrow b{font:700 13px Montserrat;color:#fff;letter-spacing:.06em}.shrow span{font:500 11px Montserrat;color:#8e8aa8;display:block;margin-top:3px}
.shrow .sp{flex:1;min-width:0}.shrow button{background:transparent;border:1.5px solid var(--gold);color:var(--gold);font:700 10px Montserrat;letter-spacing:.16em;padding:8px 12px;cursor:pointer}
.shsub{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px;align-items:center}
.shsub label{font:600 11px Montserrat;letter-spacing:.14em;color:#a9a5c0;flex-basis:100%}
.shsub input[type=email]{flex:1;min-width:180px;background:#050506;border:1.5px solid #34343a;color:#fff;padding:11px;font:500 14px Montserrat}
.shsub input.hp{position:absolute;left:-9999px;opacity:0;width:1px;height:1px}
.shsub button{background:transparent;border:1.5px solid var(--gold);color:var(--gold);font:700 11px Montserrat;letter-spacing:.18em;padding:12px 16px;cursor:pointer}
.shsub .sm{flex-basis:100%;font:500 12px Montserrat;color:#a9a5c0;min-height:16px}
@media(max-width:700px){.shnp{max-width:60%;padding:6px 8px}.shnp img{width:34px;height:34px}.shnp b{font-size:12px;max-width:110px}.shhc b{font-size:16px}.shhc{padding:5px 6px 5px 9px}.shms{display:none}.shtap{width:66px;height:66px;font-size:30px;right:10px;bottom:10px}.shmute{left:8px;bottom:10px}}`;
 document.head.appendChild(s);
}
function build(){
 css();P.root.innerHTML=`<div class="shw"><div class="shbox" id="shBox"><canvas id="shCv"></canvas><canvas class="hv" id="shHv"></canvas>
 <div class="shnp" id="shNp" style="display:none"></div><div class="shhc"><span class="hh">&#9829;</span><b id="shN">0</b><i id="shB" class="up">UPCOMING</i></div>
 <div class="shms" id="shMs"></div><button class="shmute" id="shMute" style="display:none">SOUND: ON</button><button class="shtap" id="shTap" aria-label="Send a heart">&#9829;<small>TAP</small></button>
 <div class="shgate" id="shGate"></div></div>
 <div class="shtabs"><button data-t="live" class="on">LIVE / NEXT</button><button data-t="up">UPCOMING</button><button data-t="arc">ARCHIVE</button></div>
 <div class="shlist" id="shList"></div>
 <form class="shsub" id="shSub"><label>GET A REMINDER BEFORE THE NEXT SHOW (ONLY SHOW AND NEW DROP NEWS, NO SPAM)</label><input type="email" id="shEm" placeholder="your@email.com" autocomplete="email" required><input class="hp" type="text" id="shHp" tabindex="-1" autocomplete="off"><button type="submit">REMIND ME</button><div class="sm" id="shSm"></div></form></div>`;
 P.cv=P.root.querySelector('#shCv');P.hv=P.root.querySelector('#shHv');P.hx=P.hv.getContext('2d');
 P.root.querySelector('#shTap').onclick=tap;
 P.root.querySelector('#shNp').onclick=e=>{const b=e.target.closest('.shcart');if(!b)return;toggleCart('b:'+b.dataset.id,b);P.lastNp=null};
 P.root.querySelector('#shMute').onclick=()=>{P.muted=!P.muted;if(P.master)P.master.gain.value=P.muted?0:1;P.root.querySelector('#shMute').textContent='SOUND: '+(P.muted?'OFF':'ON')};
 P.root.querySelectorAll('.shtabs button').forEach(b=>b.onclick=()=>{P.tab=b.dataset.t;P.root.querySelectorAll('.shtabs button').forEach(x=>x.classList.toggle('on',x===b));renderList()});
 P.root.querySelector('#shSub').onsubmit=async e=>{e.preventDefault();const sm=P.root.querySelector('#shSm');sm.textContent='Saving...';const r=await api({action:'subscribe',email:P.root.querySelector('#shEm').value,website:P.root.querySelector('#shHp').value,source:'show'});sm.textContent=r.ok?'You are on the list. See you at the next show!':(r.error||'Something went wrong.');if(r.ok)P.root.querySelector('#shEm').value=''};
 P.stage=M.makeStage(P.cv);P.built=true;
 window.addEventListener('resize',sizeHearts);sizeHearts();
}
function sizeHearts(){if(!P.hv)return;const r=P.hv.getBoundingClientRect();P.hv.width=Math.max(2,Math.round(r.width));P.hv.height=Math.max(2,Math.round(r.height))}
/* ---------- show selection ---------- */
const now=()=>Date.now()+P.off;
function pickCurrent(){
 const L=P.shows.filter(s=>s.status==='published'&&s.schedule_at),n=now();
 const live=L.find(s=>{const a=new Date(s.schedule_at).getTime();return n>=a&&n<a+s.script.len*1000});
 if(live)return live;
 const up=L.filter(s=>new Date(s.schedule_at).getTime()>n).sort((a,b)=>new Date(a.schedule_at)-new Date(b.schedule_at))[0];
 if(up)return up;
 return P.shows.slice().sort((a,b)=>new Date(b.schedule_at||0)-new Date(a.schedule_at||0))[0]||null;
}
function status(s){if(!s)return'none';const a=new Date(s.schedule_at).getTime(),n=now();if(n<a)return'wait';if(n<a+s.script.len*1000)return'live';return'ended'}
async function load(){
 const t=Date.now(),r=await api({action:'now'});if(r&&r.now)P.off=r.now-(t+Date.now())/2;
 const {data}=await sb.from('shows').select('id,title,theme,script,schedule_at,status,hearts').in('status',['published','archived']).order('schedule_at',{ascending:false}).limit(60);
 P.shows=(data||[]).filter(s=>s.script&&s.script.segments);
 P.cur=pickCurrent();applyCurrent();renderList();
}
function applyCurrent(){
 const s=P.cur;stop(false);
 if(!s){P.stage.setScript(M.defaultScript(300),[]);P.hearts=0;P.shown=0;setHearts(0);gate();P.root.querySelector('#shNp').style.display='none';P.root.querySelector('#shMute').style.display='none';return}
 P.stage.setScript(s.script,[]);P.stage.setHearts(Number(s.hearts));P.hearts=Number(s.hearts);P.shown=P.hearts;setHearts(P.hearts,true);milestones();gate();
}
/* ---------- gate overlay (countdown / enter / replay) ---------- */
function gate(){
 const g=P.root.querySelector('#shGate'),s=P.cur;g.classList.remove('hide');
 if(P.playing||P.loading){g.classList.add('hide');return}
 const st=status(s),badge=P.root.querySelector('#shB');
 if(!s){g.innerHTML='<h3>NEXT SHOW<br>COMING SOON</h3><p>A new 5 minute pixel show lands every week. Leave your email below and we will remind you.</p>';badge.className='up';badge.textContent='SOON';return}
 const when=new Date(s.schedule_at).toLocaleString([], {weekday:'long',month:'long',day:'numeric',hour:'numeric',minute:'2-digit'});
 if(st==='live'){g.innerHTML=`<h3>${esc(s.title)}<br>IS LIVE NOW</h3><p>Turn your sound on and join the crowd.</p><button id="shGo">ENTER THE SHOW</button>`;badge.className='';badge.textContent='LIVE';g.querySelector('#shGo').onclick=()=>start(true)}
 else if(st==='wait'){g.innerHTML=`<h3>${esc(s.title)}</h3><p>Starts ${esc(when)}</p><p id="shCd" style="font:700 22px Montserrat;color:#ffd34a;letter-spacing:.1em"></p><button class="alt" id="shRem">REMIND ME BY EMAIL</button>`;badge.className='up';badge.textContent='UPCOMING';g.querySelector('#shRem').onclick=()=>{P.root.querySelector('#shEm').focus();P.root.querySelector('#shSub').scrollIntoView({behavior:'smooth',block:'center'})}}
 else{g.innerHTML=`<h3>${esc(s.title)}</h3><p>This show has ended. Watch it again, the crowd is different every time.</p><button id="shGo">WATCH THE REPLAY</button>`;badge.className='rp';badge.textContent='REPLAY';g.querySelector('#shGo').onclick=()=>start(false)}
}
/* ---------- playback ---------- */
async function start(live){
 const s=P.cur;if(!s||P.loading)return;P.loading=true;const g=P.root.querySelector('#shGate');g.innerHTML='<h3>LOADING<br>THE SHOW...</h3><p>Getting the beats ready.</p>';
 try{
  if(!P.actx)P.actx=new (window.AudioContext||window.webkitAudioContext)();await P.actx.resume();
  await M.loadFonts();if(!P.hero){P.hero=await M.loadPlate();P.stage.setPlate(P.hero)}
  const script=s.script;script.tracks.forEach(t=>{if(t.audio&&!/^https?:/.test(t.audio))t.audio=pub(t.audio);const lb=(typeof beats!=='undefined'&&beats||[]).find(b=>String(b.id)===String(t.id));if(lb){t.title=lb.title;t.cover=coverUrl(lb,96);return}if(t.cover&&!/^https?:/.test(t.cover))t.cover=pub(t.cover);if(!t.cover)t.cover=stockCover(t.title,96)});
  const L=await M.loadTracks(script,P.actx);P.data=L;
  P.hits=M.hitTimeline(script,L.data);P.stage.setScript(script,P.hits);P.stage.setHearts(P.hearts);P.stage.reset();
  const from=live?clampT((now()-new Date(s.schedule_at).getTime())/1000,script.len):0;
  if(live&&from>=script.len-2){P.loading=false;gate();return}
  P.master=P.actx.createGain();P.master.gain.value=P.muted?0:1;P.an=P.actx.createAnalyser();P.an.fftSize=1024;P.an.smoothingTimeConstant=.6;P.master.connect(P.an);P.an.connect(P.actx.destination);P.fd=new Uint8Array(P.an.frequencyBinCount);P.td=new Uint8Array(1024);
  P.t0=P.actx.currentTime+.12;P.from=from;P.live=live;
  P.sched=M.schedule(P.actx,P.master,script,L.bufs,from,script.len,{t0:P.t0});
  P.playing=true;P.ended=false;P.loading=false;gate();P.root.querySelector('#shMute').style.display='block';P.root.querySelector('#shNp').style.display='flex';
 }catch(e){console.warn(e);P.loading=false;P.root.querySelector('#shGate').innerHTML='<h3>OOPS</h3><p>The show could not load. Please try again.</p><button id="shGo">TRY AGAIN</button>';P.root.querySelector('#shGo').onclick=()=>start(live)}
}
const clampT=(t,m)=>Math.max(0,Math.min(m,t));
function stop(redraw){
 if(P.sched){P.sched.stop();P.sched=null}if(P.master){try{P.master.disconnect()}catch(e){}P.master=null}
 P.playing=false;P.loading=false;P.ended=false;P.endAt=0;if(redraw!==false)gate();
}
function showTime(){if(!P.playing)return 0;const lat=(P.actx.outputLatency||P.actx.baseLatency||0);return P.from+(P.actx.currentTime-P.t0)-lat}
/* ---------- hearts ---------- */
function setHearts(n,instant){
 P.target=n;if(instant)P.shown=n;P.root.querySelector('#shN').textContent=Math.round(P.shown).toLocaleString();
}
function milestones(){
 const s=P.cur,el=P.root.querySelector('#shMs');if(!s||!s.script.milestones){el.innerHTML='';return}
 el.innerHTML=s.script.milestones.map(m=>`<div class="mi ${P.hearts>=m.at?'on':''}"><i>${m.fx==='lights'||m.fx==='lasers'?'&#9829;':'&#9819;'}</i><b>${m.at>=1000?(m.at/1000).toString().replace(/\.0$/,'')+'K':m.at}</b>${esc(m.label)}</div>`).join('');
}
function spawnHeart(own,x){
 const w=P.hv.width,h=P.hv.height,cols=['#ff3b4a','#ff5c8a','#ff8ab0','#ffd34a','#ffffff','#ff2a5f'];
 P.floaters.push({x:x!=null?x:(own?w-50-Math.random()*70:Math.random()*w),y:own?h-70:h*(.55+Math.random()*.45),vy:-(40+Math.random()*70)*(h/430),vx:(Math.random()-.5)*30,s:(own?3:2)+Math.floor(Math.random()*3),l:1,dec:.18+Math.random()*.25,ph:Math.random()*6.28,wob:8+Math.random()*16,c:cols[Math.floor(Math.random()*cols.length)]});
 if(P.floaters.length>180)P.floaters.shift();
}
function tap(){
 if(!P.cur||P.cur.status==='archived')return;P.own++;P.pending++;P.hearts++;P.stage.setHearts(P.hearts);
 for(let i=0;i<2;i++)spawnHeart(true);setHearts(P.hearts);milestones();
}
async function flush(){
 const s=P.cur;if(!realShow(s)||s.status==='archived'||!P.pending)return;const n=Math.min(P.pending,30);P.pending-=n;
 const r=await api({action:'heart',show:s.id,browser:window.mzBid(),n});if(r&&r.hearts!=null){P.sentLast=r.hearts}
}
const realShow=s=>!!(s&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(s.id||'')));
async function poll(){
 const s=P.cur;if(!realShow(s)||document.hidden)return;const r=await api({action:'hearts',show:s.id});if(!r||r.hearts==null)return;
 const mine=P.pending;const total=r.hearts+mine,delta=total-P.hearts;
 if(delta>0){P.hearts=total;P.stage.setHearts(P.hearts);for(let i=0;i<Math.min(24,delta);i++)setTimeout(()=>spawnHeart(false),Math.random()*3000);setHearts(P.hearts);milestones()}
 else if(!P.playing&&r.hearts>P.hearts){P.hearts=r.hearts;setHearts(P.hearts);milestones()}
}
function drawHearts(dt){
 const x=P.hx,w=P.hv.width,h=P.hv.height;x.clearRect(0,0,w,h);
 P.floaters=P.floaters.filter(f=>f.l>0&&f.y>-30);
 P.floaters.forEach(f=>{f.y+=f.vy*dt;f.x+=f.vx*dt+Math.sin(f.ph+f.y*.03)*f.wob*dt;f.l-=f.dec*dt*(f.y<h*.3?2:1);const a=Math.max(0,Math.min(1,f.l*1.4));x.globalAlpha=a;x.fillStyle=f.c;
  const s=f.s*2.4;for(let r=0;r<6;r++)for(let c=0;c<7;c++)if(HEART[r][c]==='1')x.fillRect(Math.round(f.x+c*s),Math.round(f.y+r*s),Math.ceil(s),Math.ceil(s));
  x.globalAlpha=a*.85;x.fillStyle='#fff';x.fillRect(Math.round(f.x+s),Math.round(f.y+s),Math.ceil(s),Math.ceil(s))});
 x.globalAlpha=1;
}
/* ---------- the frame loop ---------- */
function loop(tok){return ts=>{if(tok!==P.tok)return;P.raf=requestAnimationFrame(loop(tok));frame(ts)}}
function frame(ts){
 if(document.hidden||!P.built)return;
 const dt=P.last?Math.min(.1,(ts-P.last)/1000):.016;P.last=ts;
 const s=P.cur,stg=P.stage;let T=0,mode='wait',au={bass:0,mid:0,high:0,loud:0},ctl={};
 if(s){
  const st=status(s);
  if(P.playing){T=showTime();au=audio();
   if(T>=s.script.len-.05&&!P.ended){P.ended=true;P.endAt=P.actx.currentTime}
   mode=P.ended?'end':'live';if(P.ended){T=s.script.len;au={bass:0,mid:0,high:0,loud:0};if(P.actx.currentTime-P.endAt>10){stop(true)}}}
  else{mode='wait';ctl.head=st==='live'?'LIVE NOW':st==='ended'?'THE SHOW HAS ENDED':'SHOW STARTS IN';const a=new Date(s.schedule_at).getTime(),d=Math.max(0,a-now());
   ctl.text=st==='wait'?(d>=86400000?Math.floor(d/86400000)+'D '+new Date(d%86400000).toISOString().substr(11,2)+'H':new Date(d).toISOString().substr(11,8)):st==='live'?'JOIN!':'REPLAY';
   const cd=P.root.querySelector('#shCd');if(cd)cd.textContent=ctl.text;
   if(st==='live'&&P.root.querySelector('#shGo')===null&&!P.loading)gate();
   const t2=Math.floor(now()/1000);if(P.lastGateSec!==t2){P.lastGateSec=t2;const cur=pickCurrent();if(cur&&cur.id!==s.id&&!P.playing){P.cur=cur;applyCurrent()}else if(st!==P.gst){gate();renderList()}P.gst=st}}
 }
 ctl.mode=mode;
 stg.draw(T,dt,au,Object.assign({mode},ctl));
 /* hearts: smooth counter, ambient crowd hearts follow the energy */
 if(Math.abs(P.target-P.shown)>.5){P.shown+=(P.target-P.shown)*Math.min(1,dt*5);P.root.querySelector('#shN').textContent=Math.round(P.shown).toLocaleString()}
 if(P.playing&&!P.ended&&Math.random()<dt*(.4+stg.energy*5))spawnHeart(false);
 if(mode==='end'&&Math.random()<dt*10)spawnHeart(false);
 drawHearts(dt);
 if(P.playing&&s){const k=s.script.tracks[M.trackAt(s.script,T)],np=P.root.querySelector('#shNp');
  if(P.lastNp!==(k?k.title:'')+Math.floor(T)){P.lastNp=(k?k.title:'')+Math.floor(T);const bt=k&&(typeof beats!=='undefined'?beats:[]).find(b=>String(b.id)===String(k.id)),inC=bt&&cart.has('b:'+bt.id);np.innerHTML=k?`${k.cover?`<img src="${esc(k.cover)}" alt="">`:''}<div><small>NOW PLAYING</small><b>${esc(k.title)}</b><span>${[k.bpm&&k.bpm+' BPM',k.key].filter(Boolean).join('  ')}${k.bpm||k.key?'   ':''}${M.fmt(T)} / ${M.fmt(s.script.len)}</span>${bt?`<button class="shcart${inC?' in':''}" data-id="${esc(bt.id)}">${inC?'IN CART':'ADD TO CART  '+money(eff(bt))}</button>`:''}</div>`:`<div><small>${esc(s.title).toUpperCase()}</small><span>${M.fmt(T)} / ${M.fmt(s.script.len)}</span></div>`}}
 if(ts-P.pollT>4000){P.pollT=ts;poll()}if(ts-P.flushT>1500){P.flushT=ts;flush()}
}
function audio(){
 const an=P.an;an.getByteFrequencyData(P.fd);an.getByteTimeDomainData(P.td);
 const avg=(a,b)=>{let s=0;for(let i=a;i<b;i++)s+=P.fd[i];return s/(b-a)/255};let r=0;for(let i=0;i<1024;i++){const v=(P.td[i]-128)/128;r+=v*v}
 return{fd:P.fd,bass:avg(1,6),mid:avg(6,40),high:avg(40,160),loud:Math.min(1,Math.sqrt(r/1024)*2.2)};
}
/* ---------- lists ---------- */
function renderList(){
 const el=P.root.querySelector('#shList'),n=now(),fmtD=s=>new Date(s).toLocaleString([], {weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'});
 let rows=[];
 if(P.tab==='live'){rows=P.cur?[P.cur]:[]}
 else if(P.tab==='up')rows=P.shows.filter(s=>s.status==='published'&&s.schedule_at&&new Date(s.schedule_at).getTime()>n).sort((a,b)=>new Date(a.schedule_at)-new Date(b.schedule_at));
 else rows=P.shows.filter(s=>s.schedule_at&&(s.status==='archived'||new Date(s.schedule_at).getTime()+s.script.len*1000<n));
 el.innerHTML=rows.length?rows.map((s,i)=>{const st=status(s);return`<div class="shrow"><div class="sp"><b>${esc(s.title)}</b><span>${fmtD(s.schedule_at)}  /  ${M.fmt(s.script.len)}  /  &#9829; ${Number(s.hearts).toLocaleString()}</span></div>${st==='ended'?`<button data-i="${i}">WATCH REPLAY</button>`:st==='live'?'<button data-i="'+i+'">JOIN LIVE</button>':'<span style="color:#ffd34a;font:700 11px Montserrat;letter-spacing:.14em">UPCOMING</span>'}</div>`}).join(''):`<div class="shrow"><div class="sp"><b>${P.tab==='arc'?'No past shows yet':P.tab==='up'?'Nothing scheduled yet':'No show scheduled yet'}</b><span>New shows are announced here and by email.</span></div></div>`;
 el.querySelectorAll('button[data-i]').forEach(b=>b.onclick=()=>{const s=rows[+b.dataset.i];P.cur=s;applyCurrent();window.scrollTo({top:P.root.getBoundingClientRect().top+scrollY-80,behavior:'smooth'});start(status(s)==='live')});
}
window.showPageOpen=async function(root){
 P.root=root;if(!P.built)build();await M.loadFonts();if(!P.hero){P.hero=await M.loadPlate();P.stage.setPlate(P.hero)}
 sizeHearts();cancelAnimationFrame(P.raf);P.last=0;P.tok=(P.tok||0)+1;P.raf=requestAnimationFrame(loop(P.tok));await load();
};
window.showPageClose=function(){P.tok=(P.tok||0)+1;cancelAnimationFrame(P.raf);stop(false);if(P.built)gate()};
})();
