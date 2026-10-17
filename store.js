/* STOREFRONT MAKEOVER: builds the shop layout around the existing site (same data, player, cart, pages and admin). */
(function(){
const PROMO='New sample packs every week  •  Instant download after checkout';
const TICK=['New Beats Every Week','Vinyl Sample Packs','Instant Download','Royalty-Free Loops','Prod. MZPRD'];
const FAQ=[['What is inside a sample pack?','Original loops and compositions made to be chopped and flipped, labelled with BPM and key, ready to drag into your DAW or MPC.'],
 ['What format are the samples?','High quality WAV files, so they sound clean in any DAW, sampler or MPC.'],
 ['Do I need to clear the samples?','No. Every sound is original and made by MZPRD, so there is nothing to clear. Use them in your beats and releases.'],
 ['What if my song gets flagged for a sample?','Get in touch with your order details and I will help you sort it out.'],
 ['Can I sell beats made with the packs?','Yes. Make beats, sell them, place them. You just cannot resell or share the samples on their own.'],
 ['How do I get my pack after buying?','The download is ready right after checkout. If you have an account, it also stays in your purchases so you can download it again.'],['What do I get when I buy a beat?','An instant download of the beat after checkout, with the license that matches what you picked.'],
 ['Can I use MZPRD sample packs in commercial songs?','Yes. The packs are royalty free for your beats and releases. Just do not resell the samples as they are.'],
 ['How are the samples made?','Every sound is original, recorded and made by MZPRD, so there is nothing to clear.'],
 ['How fast is delivery?','Right away. Your download is ready as soon as the payment goes through.'],
 ['Do you do custom beats?','Yes. Get in touch and tell me what you are working on.']];
const $=s=>document.querySelector(s),esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
if(location.pathname.includes('/admin'))return;
document.body.classList.add('store');

/* top: promo bar, centred logo, tools (the site's own buttons, moved), nav, ticker */
const top=document.createElement('div');top.id='stTop';
top.innerHTML=`<div class="st-bar">${esc(PROMO)}</div><div class="st-head"><a class="st-logo" id="stLogo">MZ<span>PRD</span></a><div class="st-tools" id="stTools"></div></div>
<nav class="st-nav"><a data-h="home" class="on">Home</a><a data-v="kits">Sample Packs</a><a data-v="beats">Beats</a><a data-v="about">About</a></nav>
<div class="st-tick"><div>${Array(8).fill(TICK.map(t=>'<span>⋆ '+esc(t)+'</span>').join('')).join('')}</div></div>`;
document.body.insertBefore(top,document.body.firstChild);
const tools=document.querySelector('header .tools');if(tools)$('#stTools').appendChild(tools);

/* the home view */
const home=document.createElement('div');home.className='view';home.id='v-home';
const caseEl=$('.case');caseEl.insertBefore(home,caseEl.querySelector('.view'));

const navA=[...top.querySelectorAll('.st-nav a')];
function mark(v){navA.forEach(a=>a.classList.toggle('on',(a.dataset.v||a.dataset.h)===v))}
function showHome(push){document.title='MZPRD | Beats & Sample Packs';document.querySelectorAll('.view').forEach(e=>e.classList.toggle('on',e.id==='v-home'));mark('home');if(push&&location.pathname!==(window.BASEPATH||'/'))history.pushState(null,'',window.BASEPATH||'/');render();scrollTo(0,0)}
navA.forEach(a=>a.onclick=()=>{if(a.dataset.v){const b=document.querySelector('header nav button[data-v="'+a.dataset.v+'"]');if(b)b.click();mark(a.dataset.v)}else if(a.dataset.h==='home')showHome(true);else{const b=document.querySelector('header nav button[data-v="about"]');if(b)b.click();mark('about');setTimeout(()=>{const f=$('#stFaq');if(f)f.scrollIntoView({behavior:'smooth'})},120)}});
window.showHome=showHome;$('#stLogo').onclick=()=>showHome(true);
/* keep the nav underline in step with the site's own view changes */
new MutationObserver(()=>{const on=document.querySelector('.view.on');if(!on)return;const v=on.id.slice(2);mark(v==='beat'?((()=>{try{return pageKind==='p'}catch(e){return false}})()?'kits':'beats'):v)}).observe(caseEl,{subtree:true,attributes:true,attributeFilter:['class']});

const B=()=>{try{return Array.isArray(beats)?beats:[]}catch(e){return[]}},P=()=>{try{return Array.isArray(packs)?packs:[]}catch(e){return[]}};
const priceOf=x=>{try{return eff(x)}catch(e){return Number(x.price)||0}},m=v=>{try{return money(v)}catch(e){return'$'+Number(v).toFixed(2)}};
const cov=(x,i)=>{try{return thumb(x,i,'')}catch(e){return'<canvas></canvas>'}};
function card(kind,x,i,rank){const isB=kind==='b',p=isB?priceOf(x):Number(x.price),full=Number(x.price),key=kind+':'+x.id,inC=(()=>{try{return cart.has(key)}catch(e){return false}})();
 const pl=(()=>{try{return kind==='b'?(cur===i&&playing):(curPack===i&&playing)}catch(e){return false}})();
 return`<div class="st-card${pl?' playing':''}" data-k="${kind}" data-i="${i}">${rank?'<span class="st-rank">#'+rank+'</span>':''}<div class="st-cv">${rank?'<div class="st-eq"><i></i><i></i><i></i><i></i></div>':''}${cov(x,isB?i:i+2)}${x.free_download?'<span class="st-tag">FREE</span>':(window.MZIsNew&&MZIsNew(x)?'<span class="st-tag st-new">NEW</span>':(!isB?'<span class="st-tag">PACK</span>':''))}${x.preview_path?'<button class="st-play" aria-label="Play '+esc(x.title)+'"><i></i></button>':''}</div>
 <div class="st-nm">${esc(x.title)}</div><button class="st-pr${inC?' in':''}">${inC?'IN CART':(window.MZPrice?MZPrice(kind,x):(p<full?'<s>'+m(full)+'</s>':'')+m(p))}</button></div>`}
function lrow(x,i){const p=priceOf(x),full=Number(x.price),inC=(()=>{try{return cart.has('b:'+x.id)}catch(e){return false}})(),pl=(()=>{try{return cur===i&&playing}catch(e){return false}})();
 return`<div class="st-lr" data-i="${i}">${cov(x,i)}<button class="st-lp${pl?' on':''}" aria-label="Play ${esc(x.title)}"><i></i></button><div class="st-lt"><b>${esc(x.title)}</b><span>${esc(String(x.tags||'').replace(/ ?\/ ?/g,'  ·  '))}</span></div><div class="st-lpr">${p<full?'<s>'+m(full)+'</s>':''}${m(p)}</div><button class="st-pr${inC?' in':''}">${inC?'IN CART':'ADD TO CART'}</button></div>`}
function wire(root){root.querySelectorAll('.st-lr').forEach(r=>{const i=+r.dataset.i,x=B()[i];if(!x)return;r.onclick=()=>{try{goItem('beat',bslug(x))}catch(e){}};r.querySelector('.st-lp').onclick=e=>{e.stopPropagation();try{play(i)}catch(er){}setTimeout(syncPlay,30)};r.querySelector('.st-pr').onclick=e=>{e.stopPropagation();try{toggleCart('b:'+x.id,e.currentTarget)}catch(er){}render(true)}});root.querySelectorAll('.st-card').forEach(c=>{const k=c.dataset.k,i=+c.dataset.i,x=(k==='b'?B():P())[i];if(!x)return;
 c.onclick=()=>{try{goItem(k==='b'?'beat':'pack',bslug(x))}catch(e){}};
 const pl=c.querySelector('.st-play');if(pl)pl.onclick=e=>{e.stopPropagation();try{k==='b'?play(i):playPack(i)}catch(er){}setTimeout(syncPlay,30)};
 c.querySelector('.st-pr').onclick=e=>{e.stopPropagation();try{toggleCart(k+':'+x.id,e.currentTarget)}catch(er){}render()}});
 try{paintArt(root)}catch(e){}}
/* show which card is playing without redrawing the row (redrawing made the covers flash and the page jump) */
function syncPlay(){const on=(()=>{try{return !document.getElementById('au').paused}catch(e){return false}})(),ci=(()=>{try{return cur}catch(e){return-1}})(),pi=(()=>{try{return curPack}catch(e){return-1}})();
 document.querySelectorAll('.st-card[data-k]').forEach(c=>{const i=+c.dataset.i;c.classList.toggle('playing',on&&(c.dataset.k==='b'?ci===i:pi===i))});
 document.querySelectorAll('.st-lr[data-i]').forEach(r=>{const b=r.querySelector('.st-lp');if(b)b.classList.toggle('on',on&&ci===+r.dataset.i)})}
{const a=document.getElementById('au');if(a)['play','pause','ended','emptied'].forEach(ev=>a.addEventListener(ev,syncPlay))}
let pg=0,sig='';
function render(force){const bs=B(),ps=P(),s=bs.length+'|'+ps.length+'|'+pg+'|'+(()=>{try{return[...cart].join()}catch(e){return''}})();if(s===sig&&!force)return;sig=s;
 const S=(()=>{try{return promo||{}}catch(e){return{}}})(),hotIds=String(S.home_hot||'').split(',').filter(Boolean),hot=hotIds.map(id=>bs.findIndex(b=>String(b.id)===id)).filter(i=>i>=0);for(let i=0;hot.length<3&&i<bs.length;i++)if(!hot.includes(i))hot.push(i);
 const fs=String(S.home_feature||''),fk0=fs[0],fi=fs?(fk0==='p'?ps:bs).findIndex(x=>'x:'.replace('x',fk0)+x.id===fs):-1,fk=fi>=0?fk0:(ps[0]?'p':'b'),fIdx=fi>=0?fi:0,f=(fk==='p'?ps:bs)[fIdx],fImg=S.home_feature_img?(()=>{try{return pub(S.home_feature_img)}catch(e){return null}})():null;
 const all=ps.map((x,i)=>['p',x,i]).filter(([k,x,i])=>i>=8),st0=all.length?Math.floor(Date.now()/864e5)%all.length:0,pick=[...all.slice(st0),...all.slice(0,st0)].slice(0,4);
 home.innerHTML=`${ps.length?`<section class="st-sec"><h2>Sample Packs 🔥</h2><div class="st-row st-packrow">${(()=>{/* new shuffle on every page load, steady while you stay on the page */const sd=window.__mzShuf||(window.__mzShuf=Math.random()*1e9|0),h=v=>{let x=sd;for(const ch of String(v))x=Math.imul(x^ch.charCodeAt(0),2654435761)>>>0;return x};return ps.map((x,i)=>[x,i]).sort((p,q)=>h(p[0].id)-h(q[0].id)).slice(0,8).map(([x,i])=>card('p',x,i)).join('')})()}</div><button class="st-all" data-go="kits">View All</button></section>`:''}
 ${f?(()=>{const art=fImg||(()=>{try{return coverUrl(f,800)}catch(e){return''}})();return `<div class="st-feat st-feat2" style="--fbg:url('${esc(art)}')"><div class="in"><div class="st-fart"><div class="st-fvin"><img src="mpc/endvinyl.webp?v=1" alt=""><img class="st-flab" src="${esc(art)}" alt=""></div><div class="st-fcov">${fImg?'<img src="'+esc(fImg)+'" alt="">':cov(f,fk==='b'?fIdx:fIdx+2)}</div></div><div class="st-ftx"><span class="st-feye">${fk==='p'?'FEATURED SAMPLE PACK':'FEATURED BEAT'}</span><h3>${esc(f.title)}</h3>${f.description?'<div class="d">'+esc(f.description)+'</div>':''}<div class="p">${window.MZPrice?MZPrice(fk,f):m(fk==='b'?priceOf(f):f.price)}</div><div class="st-fbtns"><button class="a" id="stFa">Add to cart</button><button class="b" id="stFb">${f.preview_path?'▶ Play preview':'View'}</button></div><button class="lnk" id="stFv">View details →</button></div></div></div>`})():''}
 ${(()=>{const ids=String(S.home_picks||'').split(',').filter(Boolean),pk=ids.map(id=>ps.findIndex(x=>String(x.id)===id)).filter(i=>i>=0).slice(0,4);return pk.length?`<section class="st-sec st-picks"><span class="st-pk">HAND-PICKED BY MZPRD</span><h2>Editor's Picks</h2><div class="st-row st-packrow">${pk.map(i=>card('p',ps[i],i)).join('')}</div></section>`:''})()}
 ${(()=>{const nr=ps.map((x,i)=>[x,i]).sort((a,b)=>String(b[0].created_at||'').localeCompare(String(a[0].created_at||''))).slice(0,6);if(nr.length<2)return'';return`<section class="st-sec st-newrel"><span class="st-pk">JUST DROPPED</span><h2>New Releases</h2><div class="nr-stage" tabindex="0" aria-roledescription="carousel">${nr.map(([x,i],k)=>`<a class="nr-slide" href="${(window.BASEPATH||'/')}pack/${encodeURIComponent((()=>{try{return bslug(x)}catch(e){return x.slug||x.id}})())}/" data-i="${i}" data-k="${k}"><div class="nr-cv">${cov(x,i+2)}</div><div class="nr-info"><b class="nr-t">${esc(x.title)}</b><span class="nr-p">${m(Number(x.price))}</span></div></a>`).join('')}<button class="nr-arr nr-prev" aria-label="Previous">&#8249;</button><button class="nr-arr nr-next" aria-label="Next">&#8250;</button></div><div class="nr-dots">${nr.map((_,k)=>`<i data-k="${k}"></i>`).join('')}</div></section>`})()}
 ${bs.length?`<button class="st-bteaser" data-go="beats"><span>🎧</span><b>Also available: beats &amp; instrumentals</b><em>${bs.length} beats →</em></button>`:''}
 ${pick.length?`<section class="st-sec"><h2>Try These</h2><div class="st-grid">${pick.map(([k,x,i])=>card(k,x,i)).join('')}</div></section>`:''}
`;
 {const va=document.getElementById('v-about');if(va&&!document.getElementById('stFaq')){const f=document.createElement('section');f.className='st-sec';f.id='stFaq';f.innerHTML='<h2>FAQs</h2><div class="st-faq">'+FAQ.map(q=>'<details><summary>'+esc(q[0])+'</summary><p>'+esc(q[1])+'</p></details>').join('')+'</div>';va.appendChild(f)}}
 wire(home);
 {const pb=document.getElementById('stPackBands');if(pb)pb.remove()}
 {const vb=document.getElementById('v-beats');let hb=document.getElementById('stHotB');if(vb&&bs.length){if(!hb){hb=document.createElement('section');hb.id='stHotB';hb.className='st-sec st-hotb';vb.insertBefore(hb,vb.firstChild)}
  hb.innerHTML='<h2>Hot Beats 🔥</h2><div class="st-crate st-hot"><button class="st-cn st-cl" aria-label="Previous">‹</button><div class="st-cstage">'+hot.slice(0,3).map((i,r)=>card('b',bs[i],i,r+1)).join('')+'</div><button class="st-cn st-cr" aria-label="Next">›</button></div>';wire(hb);
  const cs=[...hb.querySelectorAll('.st-cstage .st-card')];let at=window.__crAt||0;const pos=()=>{cs.forEach((c,q)=>{const d=((q-at)%cs.length+cs.length)%cs.length,o=d===0?0:d===1?1:-1;c.dataset.o=o})};pos();
  const go=d=>{at=(at+d+cs.length)%cs.length;window.__crAt=at;pos()};hb.querySelector('.st-cl').onclick=()=>go(-1);hb.querySelector('.st-cr').onclick=()=>go(1);
  cs.forEach((c,q)=>{const oc=c.onclick;c.onclick=e=>{if(c.dataset.o!=='0'){e.stopPropagation();at=q;window.__crAt=at;pos();return}oc&&oc.call(c,e)}});
  clearInterval(window.__crT);window.__crT=setInterval(()=>{if(!document.body.contains(hb)||hb.matches(':hover'))return;go(1)},3800)}}
 home.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>navA.find(a=>a.dataset.v===b.dataset.go).click());
 home.querySelectorAll('[data-pg]').forEach(a=>a.onclick=()=>{pg=+a.dataset.pg;render();home.querySelector('.st-grid').scrollIntoView({behavior:'smooth',block:'start'})});
 if(f){const k=fk+':'+f.id;$('#stFa').onclick=e=>{try{toggleCart(k,e.currentTarget)}catch(er){}render(true)};$('#stFb').onclick=()=>{try{if(!f.preview_path)return goItem(fk==='b'?'beat':'pack',bslug(f));fk==='b'?play(fIdx):playPack(fIdx)}catch(er){}};$('#stFv').onclick=()=>{try{goItem(fk==='b'?'beat':'pack',bslug(f))}catch(er){}}}}
/* the home page is the front page */
const isRoot=()=>{const b=window.BASEPATH||'/';return location.pathname===b||location.pathname===b+'index.html'};
function tick(){render();{const on=document.querySelector('.case>.view.on');if(on){const v=on.id.slice(2);mark(v==='beat'?((()=>{try{return pageKind==='p'}catch(e){return false}})()?'kits':'beats'):v)}}if(isRoot()&&!location.hash&&!document.querySelector('.view.on:not(#v-beats)')&&document.getElementById('v-beats').classList.contains('on'))showHome(false)}
addEventListener('popstate',()=>setTimeout(()=>{if(isRoot())showHome(false)},0));
setInterval(tick,700);setTimeout(()=>{if(isRoot()&&!location.hash)showHome(false)},50);
})();
