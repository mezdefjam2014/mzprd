/* MZPRD: soft fire, smoke and embers behind the EDITOR'S PICKS row on the home page.
   Kept light: ~70 particles from pre-drawn sprites, 30 fps, half-res canvas, and it only runs while the row is on screen
   and the tab is visible. Still image for reduced-motion users. */
(function(){
const RM=matchMedia('(prefers-reduced-motion: reduce)').matches;
function sprite(sz,stops){const c=document.createElement('canvas');c.width=c.height=sz;const g=c.getContext('2d'),r=g.createRadialGradient(sz/2,sz/2,0,sz/2,sz/2,sz/2);stops.forEach(([o,col])=>r.addColorStop(o,col));g.fillStyle=r;g.fillRect(0,0,sz,sz);return c}
const FL=sprite(64,[[0,'rgba(255,214,140,.9)'],[.25,'rgba(255,120,40,.55)'],[.6,'rgba(224,36,20,.18)'],[1,'rgba(120,0,0,0)']]);
const SM=sprite(128,[[0,'rgba(70,64,64,.5)'],[.5,'rgba(40,36,38,.22)'],[1,'rgba(20,20,22,0)']]);
const EM=sprite(16,[[0,'rgba(255,240,200,1)'],[.3,'rgba(255,150,60,.8)'],[1,'rgba(255,60,0,0)']]);
let sec=null,cv=null,g=null,W=0,H=0,S=.5,on=false,vis=true,last=0,raf=0,P=[];
const rnd=(a,b)=>a+Math.random()*(b-a);
function spawn(t){if(t==='f')return{t,x:rnd(0,W),y:H+rnd(0,10),vx:rnd(-.15,.15),vy:-rnd(.6,1.3),s:rnd(26,60),l:0,L:rnd(40,75)};
 if(t==='s')return{t,x:rnd(0,W),y:H*rnd(.7,1.05),vx:rnd(-.12,.12),vy:-rnd(.15,.35),s:rnd(60,120),l:0,L:rnd(260,420)};
 return{t,x:rnd(0,W),y:H+5,vx:rnd(-.3,.3),vy:-rnd(.6,1.4),s:rnd(3,6),l:0,L:rnd(120,220),ph:rnd(0,6.28)}}
function seed(){P=[];for(let i=0;i<34;i++){const p=spawn('f');p.l=rnd(0,p.L);P.push(p)}for(let i=0;i<14;i++){const p=spawn('s');p.l=rnd(0,p.L);p.y-=p.vy*p.l;P.push(p)}for(let i=0;i<20;i++){const p=spawn('e');p.l=rnd(0,p.L);p.y+=p.vy*p.l;P.push(p)}}
function size(){if(!cv)return;const r=cv.getBoundingClientRect();if(r.width<60)return;W=Math.max(1,Math.round(r.width*S));H=Math.max(1,Math.round(r.height*S));cv.width=W;cv.height=H}
function frame(){if(W<60||H<40)return;g.clearRect(0,0,W,H);
 const bg=g.createLinearGradient(0,H,0,H*.45);bg.addColorStop(0,'rgba(224,36,20,.16)');bg.addColorStop(1,'rgba(224,36,20,0)');g.globalCompositeOperation='source-over';g.fillStyle=bg;g.fillRect(0,0,W,H);
 for(const p of P){p.l++;p.x+=p.vx;p.y+=p.vy;const k=p.l/p.L;if(k>=1||p.y<-80){Object.assign(p,spawn(p.t));continue}
  if(p.t==='s'){g.globalCompositeOperation='source-over';const a=Math.sin(Math.PI*k)*.55,s=p.s*(1+k*1.4)*S*2;g.globalAlpha=a;g.drawImage(SM,p.x-s/2,p.y-s/2,s,s);p.vx+=rnd(-.01,.01)}}
 g.globalCompositeOperation='lighter';
 for(const p of P){const k=p.l/p.L;if(p.t==='f'){const s=p.s*(1-k*.7)*S*2;g.globalAlpha=(1-k)*.55;g.drawImage(FL,p.x-s/2,p.y-s/2,s,s*1.3)}
  else if(p.t==='e'){p.vx+=Math.sin(p.l*.05+p.ph)*.02;const s=p.s*S*2,a=(1-k)*(.6+.4*Math.sin(p.l*.3+p.ph));g.globalAlpha=Math.max(0,a);g.drawImage(EM,p.x-s/2,p.y-s/2,s,s)}}
 g.globalAlpha=1;g.globalCompositeOperation='source-over'}
function loop(t){raf=0;if(!on||!vis)return;if(t-last>=33){last=t;frame()}raf=requestAnimationFrame(loop)}
function go(){if(!raf&&on&&vis&&!RM)raf=requestAnimationFrame(loop)}
const io=new IntersectionObserver(es=>{on=es[0].isIntersecting;go()},{rootMargin:'100px'});
document.addEventListener('visibilitychange',()=>{vis=!document.hidden;go()});
addEventListener('resize',()=>{size();if(RM)frame()});
function attach(){const s=document.querySelector('#v-home .st-picks');
 if(!s||s===sec&&cv&&cv.isConnected)return;if(sec)io.unobserve(sec);sec=s;sec.classList.add('st-fire');
 if(cv)ro.unobserve(cv);cv=document.createElement('canvas');cv.className='st-firecv';cv.setAttribute('aria-hidden','true');sec.prepend(cv);g=cv.getContext('2d');size();seed();ro.observe(cv);
 if(RM){for(let i=0;i<60;i++)P.forEach(p=>{p.l++;p.x+=p.vx;p.y+=p.vy});frame()}io.observe(sec)}
const css=document.createElement('style');css.textContent=`.st-sec.st-fire{position:relative;isolation:isolate}
.st-firecv{position:absolute;left:-40px;right:-40px;top:-30px;bottom:-10px;width:calc(100% + 80px);height:calc(100% + 40px);z-index:-1;pointer-events:none;opacity:.9;-webkit-mask:linear-gradient(90deg,transparent,#000 12%,#000 88%,transparent);mask:linear-gradient(90deg,transparent,#000 12%,#000 88%,transparent)}`;
document.head.appendChild(css);
/* attach only after the CSS above exists, so the canvas is measured at its real size */
const ro=new ResizeObserver(()=>{size();if(RM)frame()});
const home=document.getElementById('v-home');if(home)new MutationObserver(attach).observe(home,{childList:true});attach();
})();
