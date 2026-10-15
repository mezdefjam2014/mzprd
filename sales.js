/* BACK OFFICE SALES: an interactive, visual sales dashboard (range picker, KPI tiles with trend + sparkline, revenue/listens chart
   with hover, beats vs packs donut, top sellers with covers, listening heatmap, searchable orders). Reads the same orders/events tables. */
(function(){
const $=s=>document.querySelector(s),esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const G=n=>{try{return (0,eval)(n)}catch(e){return undefined}};
const M=v=>{try{return money(v)}catch(e){return'$'+Number(v||0).toFixed(2)}},DAY=864e5;
let S={range:30,view:'both',sort:'rev',q:'',st:'paid',orders:[],events:[]};
const css=`#sx{display:grid;gap:18px;font-family:Inter,sans-serif;color:#e9e9e9}
#sx .sx-top{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
#sx h3{font:400 34px/1 Anton,sans-serif;letter-spacing:.02em;margin:0 auto 0 0;color:#fff}
#sx .chips{display:flex;gap:4px;background:#111113;border:1px solid #1f1f23;padding:4px}
#sx .chips button{background:none;border:0;color:#8a8a90;font:700 11px Inter,sans-serif;letter-spacing:.14em;padding:8px 12px;cursor:pointer}
#sx .chips button.on{background:#e0242f;color:#fff}
#sx .kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px}
#sx .k{background:#111113;border:1px solid #1f1f23;padding:16px;position:relative;overflow:hidden;cursor:default;transition:border-color .2s}
#sx .k:hover{border-color:#3a3a3e}
#sx .k span{font:700 10px Inter,sans-serif;letter-spacing:.18em;color:#86868c;text-transform:uppercase}
#sx .k b{display:block;font:400 34px/1.1 Anton,sans-serif;letter-spacing:.02em;color:#fff;margin:6px 0 4px}
#sx .k em{font:700 11px Inter,sans-serif;font-style:normal}
#sx .k em.up{color:#3ad17a}#sx .k em.dn{color:#ff6b6b}#sx .k em.fl{color:#777}
#sx .k canvas{position:absolute;right:0;bottom:0;width:55%;height:42px;opacity:.9}
#sx .card{background:#111113;border:1px solid #1f1f23;padding:18px;position:relative}
#sx .card h4{font:400 22px Anton,sans-serif;letter-spacing:.03em;color:#fff;margin:0 0 12px;display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap}
#sx .row2{display:grid;grid-template-columns:2fr 1fr;gap:18px}
#sx .tip{position:absolute;pointer-events:none;background:#000;border:1px solid #333;padding:8px 10px;font:600 12px Inter,sans-serif;color:#fff;white-space:nowrap;display:none;z-index:3}
#sx .tip b{color:#e0242f}
#sx .leg{display:flex;gap:14px;font:600 11px Inter,sans-serif;color:#aaa}
#sx .leg i{display:inline-block;width:10px;height:10px;margin-right:6px;vertical-align:-1px}
#sx .top{display:flex;flex-direction:column;gap:6px}
#sx .ti{display:grid;grid-template-columns:44px 1fr 90px 70px;gap:12px;align-items:center;padding:8px;border:1px solid transparent;cursor:pointer;transition:.15s}
#sx .ti:hover{border-color:#2a2a2e;background:#151517}
#sx .ti img,#sx .ti .ph{width:44px;height:44px;object-fit:cover;background:#1a1a1d}
#sx .ti b{display:block;font:600 14px Inter,sans-serif;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#sx .ti small{font:500 11px Inter,sans-serif;color:#888}
#sx .bar{height:6px;background:#1d1d20;margin-top:6px}#sx .bar i{display:block;height:100%;background:linear-gradient(90deg,#e0242f,#ff6b5c)}
#sx .ti .v{font:400 20px Anton,sans-serif;color:#fff;text-align:right}
#sx .ti .c{font:700 11px Inter,sans-serif;color:#aaa;text-align:right}
#sx .hm{display:grid;grid-template-columns:34px repeat(24,1fr);gap:2px;font:600 9px Inter,sans-serif;color:#666}
#sx .hm div{aspect-ratio:1;background:#16161a;position:relative}#sx .hm div:hover{outline:1px solid #fff}
#sx .ot{width:100%;border-collapse:collapse;font:500 13px Inter,sans-serif}
#sx .ot th{text-align:left;font:700 10px Inter,sans-serif;letter-spacing:.16em;color:#777;padding:8px;border-bottom:1px solid #222;cursor:pointer}
#sx .ot td{padding:10px 8px;border-bottom:1px solid #1a1a1d;color:#ddd;vertical-align:middle}
#sx .ot tr:hover td{background:#151517}
#sx .ot .it{display:flex;align-items:center;gap:8px}#sx .ot .it img{width:30px;height:30px;object-fit:cover}
#sx .pill{font:700 10px Inter,sans-serif;letter-spacing:.12em;padding:4px 8px;text-transform:uppercase}
#sx .pill.paid{background:#123a24;color:#3ad17a}#sx .pill.created{background:#2a2410;color:#e8b94a}#sx .pill.review{background:#3a1418;color:#ff6b6b}
#sx input.q{background:#0a0a0b;border:1px solid #26262a;color:#fff;padding:9px 12px;font:500 13px Inter,sans-serif;min-width:200px}
#sx .empty{color:#777;font:500 13px Inter,sans-serif;padding:20px 0;text-align:center}
@media(max-width:900px){#sx .row2{grid-template-columns:1fr}}`;

const allItems=()=>[...(G('beats')||[]).map(x=>['b',x]),...(G('packs')||[]).map(x=>['p',x])];
const find=id=>allItems().find(([k,x])=>String(x.id)===String(id));
const cov=x=>{try{return coverUrl(x,128)||''}catch(e){return''}};

async function load(){const [o,e]=await Promise.all([sb.from('orders').select('*').order('created_at',{ascending:false}).limit(3000),sb.from('events').select('kind,item_id,created_at').gte('created_at',new Date(Date.now()-366*DAY).toISOString()).limit(50000)]);
 S.orders=o.data||[];S.events=e.data||[];S.err=o.error&&o.error.message}

function within(t,from,to){return t>=from&&t<to}
function stats(){const now=Date.now(),r=S.range===0?3650:S.range,from=now-r*DAY,pfrom=from-r*DAY;
 const paid=S.orders.filter(o=>o.status==='paid'&&o.paid_at),tO=o=>new Date(o.paid_at).getTime(),tE=e=>new Date(e.created_at).getTime();
 const cur=paid.filter(o=>within(tO(o),from,now)),prev=paid.filter(o=>within(tO(o),pfrom,from)),ev=S.events.filter(e=>within(tE(e),from,now)),pev=S.events.filter(e=>within(tE(e),pfrom,from));
 const sum=a=>a.reduce((q,o)=>q+Number(o.total||0),0),buyers=a=>new Set(a.map(o=>(o.payer_email||'').toLowerCase()).filter(Boolean)).size;
 const nb=Math.min(r,S.range===0?365:r),days=[...Array(nb)].map((_,i)=>{const d=new Date(now-(nb-1-i)*DAY);d.setHours(0,0,0,0);return{t:d.getTime(),rev:0,ord:0,lis:0}}),idx=t=>{const d=new Date(t);d.setHours(0,0,0,0);return days.findIndex(x=>x.t===d.getTime())};
 cur.forEach(o=>{const i=idx(tO(o));if(i>=0){days[i].rev+=Number(o.total||0);days[i].ord++}});ev.forEach(e=>{const i=idx(tE(e));if(i>=0)days[i].lis++});
 const per={};const add=(id,k,f,v)=>{per[id]=per[id]||{id,sold:0,rev:0,lis:0};per[id][f]+=v};
 cur.forEach(o=>(o.items||[]).forEach(it=>add(it.id,it.t,'sold',1)||add(it.id,it.t,'rev',Number(it.price||0))));ev.forEach(e=>add(e.item_id,null,'lis',1));
 let bRev=0,pRev=0;cur.forEach(o=>(o.items||[]).forEach(it=>{if(it.t==='p')pRev+=Number(it.price||0);else bRev+=Number(it.price||0)}));
 const hm=[...Array(7)].map(()=>Array(24).fill(0));ev.forEach(e=>{const d=new Date(e.created_at);hm[d.getDay()][d.getHours()]++});
 return{rev:sum(cur),prevRev:sum(prev),ord:cur.length,prevOrd:prev.length,aov:cur.length?sum(cur)/cur.length:0,prevAov:prev.length?sum(prev)/prev.length:0,lis:ev.length,prevLis:pev.length,buy:buyers(cur),prevBuy:buyers(prev),conv:ev.length?cur.length/ev.length*100:0,prevConv:pev.length?prev.length/pev.length*100:0,days,per:Object.values(per),bRev,pRev,hm}}

function delta(a,b){if(!b&&!a)return'<em class="fl">—</em>';if(!b)return'<em class="up">▲ new</em>';const d=(a-b)/b*100;return'<em class="'+(d>=0?'up':'dn')+'">'+(d>=0?'▲ ':'▼ ')+Math.abs(d).toFixed(0)+'% vs prev</em>'}
function spark(cv,vals,col){const dpr=devicePixelRatio||1,W=cv.clientWidth,H=cv.clientHeight;cv.width=W*dpr;cv.height=H*dpr;const x=cv.getContext('2d');x.scale(dpr,dpr);const mx=Math.max(1,...vals);
 const g=x.createLinearGradient(0,0,0,H);g.addColorStop(0,col+'66');g.addColorStop(1,col+'00');x.beginPath();vals.forEach((v,i)=>{const X=i/(vals.length-1||1)*W,Y=H-2-(v/mx)*(H-6);i?x.lineTo(X,Y):x.moveTo(X,Y)});x.lineTo(W,H);x.lineTo(0,H);x.fillStyle=g;x.fill();
 x.beginPath();vals.forEach((v,i)=>{const X=i/(vals.length-1||1)*W,Y=H-2-(v/mx)*(H-6);i?x.lineTo(X,Y):x.moveTo(X,Y)});x.strokeStyle=col;x.lineWidth=1.6;x.stroke()}

function chart(cv,tip,days){const dpr=devicePixelRatio||1,W=cv.clientWidth,H=cv.clientHeight,P={l:44,r:40,t:12,b:24};cv.width=W*dpr;cv.height=H*dpr;const x=cv.getContext('2d');x.scale(dpr,dpr);
 const n=days.length,iw=W-P.l-P.r,ih=H-P.t-P.b,bw=iw/n,mR=Math.max(1,...days.map(d=>d.rev)),mL=Math.max(1,...days.map(d=>d.lis));let hov=-1;
 const draw=()=>{x.clearRect(0,0,W,H);x.font='600 10px Inter';x.fillStyle='#666';x.strokeStyle='#1d1d20';for(let i=0;i<=4;i++){const y=P.t+ih*i/4;x.beginPath();x.moveTo(P.l,y);x.lineTo(W-P.r,y);x.stroke();if(S.view!=='lis'){x.textAlign='right';x.fillText(M(mR*(1-i/4)).replace(/\.00$/,''),P.l-6,y+3)}if(S.view!=='rev'){x.textAlign='left';x.fillText(Math.round(mL*(1-i/4)),W-P.r+6,y+3)}}
  if(S.view!=='lis')days.forEach((d,i)=>{const h=d.rev/mR*ih,X=P.l+i*bw+bw*.15;const g=x.createLinearGradient(0,P.t+ih-h,0,P.t+ih);g.addColorStop(0,i===hov?'#ff6b5c':'#e0242f');g.addColorStop(1,'#5a0e14');x.fillStyle=g;x.fillRect(X,P.t+ih-h,bw*.7,h)});
  if(S.view!=='rev'){x.beginPath();days.forEach((d,i)=>{const X=P.l+i*bw+bw/2,Y=P.t+ih-d.lis/mL*ih;i?x.lineTo(X,Y):x.moveTo(X,Y)});x.strokeStyle='#e8e8e8';x.lineWidth=2;x.stroke();if(hov>=0){const d=days[hov];x.fillStyle='#fff';x.beginPath();x.arc(P.l+hov*bw+bw/2,P.t+ih-d.lis/mL*ih,4,0,6.3);x.fill()}}
  x.fillStyle='#666';x.textAlign='center';const step=Math.ceil(n/8);days.forEach((d,i)=>{if(i%step===0){const dt=new Date(d.t);x.fillText((dt.getMonth()+1)+'/'+dt.getDate(),P.l+i*bw+bw/2,H-6)}});
  if(hov>=0){x.strokeStyle='rgba(255,255,255,.2)';x.beginPath();x.moveTo(P.l+hov*bw+bw/2,P.t);x.lineTo(P.l+hov*bw+bw/2,P.t+ih);x.stroke()}};
 draw();cv.onmousemove=e=>{const r=cv.getBoundingClientRect(),i=Math.floor((e.clientX-r.left-P.l)/bw);if(i<0||i>=n){hov=-1;tip.style.display='none';draw();return}hov=i;draw();const d=days[i];
  tip.innerHTML=new Date(d.t).toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'})+'<br><b>'+M(d.rev)+'</b> · '+d.ord+' order'+(d.ord===1?'':'s')+'<br>'+d.lis+' listen'+(d.lis===1?'':'s');tip.style.display='block';tip.style.left=Math.min(r.width-150,e.clientX-r.left+12)+'px';tip.style.top=(e.clientY-r.top-10)+'px'};
 cv.onmouseleave=()=>{hov=-1;tip.style.display='none';draw()}}

function donut(cv,a,b){const dpr=devicePixelRatio||1,W=cv.clientWidth,H=cv.clientHeight;cv.width=W*dpr;cv.height=H*dpr;const x=cv.getContext('2d');x.scale(dpr,dpr);const cx=W/2,cy=H/2,R=Math.min(W,H)/2-6,t=a+b;
 const seg=(s,e,c)=>{x.beginPath();x.arc(cx,cy,R,s,e);x.arc(cx,cy,R*.62,e,s,true);x.closePath();x.fillStyle=c;x.fill()};
 if(!t)seg(0,6.283,'#1d1d20');else{const m=-Math.PI/2+a/t*6.283;seg(-Math.PI/2,m,'#e0242f');seg(m,Math.PI*1.5,'#e8e8e8')}
 x.fillStyle='#fff';x.textAlign='center';x.font='400 26px Anton';x.fillText(M(t).replace(/\.00$/,''),cx,cy+4);x.font='700 9px Inter';x.fillStyle='#888';x.fillText('REVENUE',cx,cy+20)}

function render(){const st=stats(),L=$('#bl'),F=$('#bf');if(!$('#sxcss')){const s=document.createElement('style');s.id='sxcss';s.textContent=css;document.head.appendChild(s)}
 F.style.display='none';L.parentElement.style.gridTemplateColumns='1fr';
 const R=[[7,'7D'],[30,'30D'],[90,'90D'],[365,'1Y'],[0,'ALL']];
 L.innerHTML=`<div id="sx"><div class="sx-top"><h3>SALES</h3><div class="chips" id="sxR">${R.map(([v,t])=>'<button data-r="'+v+'"'+(S.range===v?' class="on"':'')+'>'+t+'</button>').join('')}</div></div>
 ${S.err?'<div class="card empty">'+esc(S.err)+'</div>':''}
 <div class="kpis">${[['Revenue',M(st.rev),delta(st.rev,st.prevRev),st.days.map(d=>d.rev),'#e0242f'],['Orders',st.ord,delta(st.ord,st.prevOrd),st.days.map(d=>d.ord),'#e0242f'],['Avg order',M(st.aov),delta(st.aov,st.prevAov),null],['Listens',st.lis,delta(st.lis,st.prevLis),st.days.map(d=>d.lis),'#e8e8e8'],['Listen → buy',st.conv.toFixed(1)+'%',delta(st.conv,st.prevConv),null],['Buyers',st.buy,delta(st.buy,st.prevBuy),null]].map((k,i)=>'<div class="k"><span>'+k[0]+'</span><b>'+k[1]+'</b>'+k[2]+(k[3]?'<canvas data-sp="'+i+'"></canvas>':'')+'</div>').join('')}</div>
 <div class="row2"><div class="card"><h4>Revenue &amp; listens <span class="chips" id="sxV">${[['both','BOTH'],['rev','REVENUE'],['lis','LISTENS']].map(([v,t])=>'<button data-v="'+v+'"'+(S.view===v?' class="on"':'')+'>'+t+'</button>').join('')}</span></h4><div class="leg"><span><i style="background:#e0242f"></i>Revenue</span><span><i style="background:#e8e8e8"></i>Listens</span></div><canvas id="sxC" style="width:100%;height:260px;display:block;margin-top:8px"></canvas><div class="tip" id="sxT"></div></div>
 <div class="card"><h4>Beats vs packs</h4><canvas id="sxD" style="width:100%;height:200px;display:block"></canvas><div class="leg" style="justify-content:center;margin-top:10px"><span><i style="background:#e0242f"></i>Beats ${M(st.bRev)}</span><span><i style="background:#e8e8e8"></i>Packs ${M(st.pRev)}</span></div></div></div>
 <div class="row2"><div class="card"><h4>Top items <span class="chips" id="sxS">${[['rev','REVENUE'],['sold','SOLD'],['lis','LISTENS']].map(([v,t])=>'<button data-s="'+v+'"'+(S.sort===v?' class="on"':'')+'>'+t+'</button>').join('')}</span></h4><div class="top" id="sxTop"></div></div>
 <div class="card"><h4>When people listen</h4><div class="hm" id="sxH"></div><div class="tip" id="sxHT"></div></div></div>
 <div class="card"><h4>Orders <span style="display:flex;gap:8px;flex-wrap:wrap"><input class="q" id="sxQ" placeholder="Search email or item" value="${esc(S.q)}"><span class="chips" id="sxF">${[['paid','PAID'],['created','STARTED'],['review','REVIEW'],['all','ALL']].map(([v,t])=>'<button data-f="'+v+'"'+(S.st===v?' class="on"':'')+'>'+t+'</button>').join('')}</span></span></h4><div id="sxO"></div></div></div>`;
 L.querySelectorAll('[data-sp]').forEach(c=>{const k=+c.dataset.sp,v=[st.days.map(d=>d.rev),st.days.map(d=>d.ord),0,st.days.map(d=>d.lis)][k];spark(c,v,k===3?'#e8e8e8':'#e0242f')});
 chart($('#sxC'),$('#sxT'),st.days);donut($('#sxD'),st.bRev,st.pRev);
 top(st);heat(st.hm);orders();
 $('#sxR').onclick=e=>{const b=e.target.closest('button');if(!b)return;S.range=+b.dataset.r;render()};
 $('#sxV').onclick=e=>{const b=e.target.closest('button');if(!b)return;S.view=b.dataset.v;$('#sxV').querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));chart($('#sxC'),$('#sxT'),st.days)};
 $('#sxS').onclick=e=>{const b=e.target.closest('button');if(!b)return;S.sort=b.dataset.s;$('#sxS').querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));top(st)};
 $('#sxF').onclick=e=>{const b=e.target.closest('button');if(!b)return;S.st=b.dataset.f;$('#sxF').querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));orders()};
 $('#sxQ').oninput=e=>{S.q=e.target.value;orders()};
 clearTimeout(render.t);onresize=()=>{clearTimeout(render.t);render.t=setTimeout(()=>{if($('#sx'))render()},200)}}

function top(st){const box=$('#sxTop'),list=st.per.map(p=>{const f=find(p.id);return Object.assign({},p,{f})}).filter(p=>p.f).sort((a,b)=>b[S.sort]-a[S.sort]).slice(0,8),mx=Math.max(1,...list.map(p=>p[S.sort]));
 if(!list.length){box.innerHTML='<div class="empty">No sales or listens in this range yet.</div>';return}
 box.innerHTML=list.map(p=>{const [k,x]=p.f,u=cov(x),v=S.sort==='rev'?M(p.rev):p[S.sort];return '<div class="ti" data-k="'+k+'" data-id="'+esc(x.id)+'">'+(u?'<img src="'+esc(u)+'">':'<div class="ph"></div>')+'<div><b>'+esc(x.title)+'</b><small>'+(k==='p'?'Pack':'Beat')+' · '+p.sold+' sold · '+p.lis+' listens</small><div class="bar"><i style="width:'+(p[S.sort]/mx*100)+'%"></i></div></div><div class="c">'+(p.lis?(p.sold/p.lis*100).toFixed(1)+'% buy':'—')+'</div><div class="v">'+v+'</div></div>'}).join('');
 box.querySelectorAll('.ti').forEach(r=>r.onclick=()=>{const it=find(r.dataset.id);if(!it)return;try{window.open((G('BASEPATH')||'/')+(it[0]==='p'?'pack/':'beat/')+bslug(it[1])+'/','_blank')}catch(e){}})}

function heat(hm){const box=$('#sxH'),tip=$('#sxHT'),mx=Math.max(1,...hm.flat()),D=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];let h='<span></span>'+[...Array(24)].map((_,i)=>'<span style="text-align:center">'+(i%6===0?i:'')+'</span>').join('');
 hm.forEach((row,d)=>{h+='<span style="align-self:center">'+D[d]+'</span>'+row.map((v,hr)=>'<div data-t="'+D[d]+' '+hr+':00 · '+v+' listen'+(v===1?'':'s')+'" style="background:'+(v?'rgba(224,36,47,'+(.15+.85*v/mx).toFixed(2)+')':'#16161a')+'"></div>').join('')});box.innerHTML=h;
 box.onmousemove=e=>{const c=e.target.closest('[data-t]');if(!c){tip.style.display='none';return}const r=box.parentElement.getBoundingClientRect();tip.textContent=c.dataset.t;tip.style.display='block';tip.style.left=(e.clientX-r.left+10)+'px';tip.style.top=(e.clientY-r.top+10)+'px'};box.onmouseleave=()=>tip.style.display='none'}

function orders(){const box=$('#sxO'),q=S.q.toLowerCase(),list=S.orders.filter(o=>(S.st==='all'||o.status===S.st)&&(!q||(o.payer_email||'').toLowerCase().includes(q)||(o.items||[]).some(i=>String(i.title).toLowerCase().includes(q)))).slice(0,100);
 if(!list.length){box.innerHTML='<div class="empty">No orders match.</div>';return}
 box.innerHTML='<table class="ot"><tr><th>DATE</th><th>ITEMS</th><th>BUYER</th><th>TOTAL</th><th>STATUS</th></tr>'+list.map(o=>'<tr><td>'+new Date(o.paid_at||o.created_at).toLocaleString(undefined,{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})+'</td><td><div class="it">'+(o.items||[]).slice(0,3).map(i=>{const f=find(i.id),u=f?cov(f[1]):'';return u?'<img src="'+esc(u)+'" title="'+esc(i.title)+'">':''}).join('')+'<span>'+esc((o.items||[]).map(i=>i.title).join(', '))+'</span></div></td><td>'+esc(o.payer_email||'—')+'</td><td><b>'+M(o.total)+'</b>'+(Number(o.discount)>0?' <small style="color:#888">-'+M(o.discount)+'</small>':'')+'</td><td><span class="pill '+esc(o.status)+'">'+esc(o.status==='created'?'started':o.status)+'</span></td></tr>').join('')+'</table>'}

window.MZSales=async function(){const L=$('#bl');$('#bf').style.display='none';L.innerHTML='<div style="color:#777;font:500 13px Inter;padding:30px">Loading sales…</div>';await load();render()};
})();
