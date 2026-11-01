/* MZPRD Feed: full-screen swipe feed of beats, sample packs and single samples. Loaded only when opened.
   Light by design: only the slides near the screen hold any content, one audio element is reused, counts load once,
   and comments load only when their panel opens. Likes also go through toggleLike, so they land in the account's Saved list. */
(function(){
const CLIP=20,TYPES={b:'BEAT',p:'SAMPLE PACK',s:'SAMPLE'},EMO='😀 😂 🥹 😍 😎 🤯 😤 🥶 🔥 💯 🎧 🎹 🥁 🎤 🎶 💎 👑 🚀 💪 🙌 👏 🤝 ❤️ 👀'.split(' ');
const ICON={heart:'<path d="M12 21s-8-5-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 6-8 11-8 11z"/>',chat:'<path d="M4 5h16v11H9l-5 4z"/>',share:'<path d="M14 5l7 7-7 7v-4c-5 0-8 1-11 5 1-6 4-10 11-11z"/>',cart:'<path d="M3 4h3l2 12h11l2-8H7"/><circle cx="10" cy="20" r="1"/><circle cx="18" cy="20" r="1"/>'};
const svg=n=>'<svg viewBox="0 0 24 24" aria-hidden="true">'+ICON[n]+'</svg>';
let root,list,A,V=null,items=[],all=[],kind='all',at=-1,stats={},rows={},pushed=false,started=false,io,sheetKey=null;
const q=s=>root.querySelector(s),num=n=>n>=1000?(n/1000).toFixed(1).replace('.0','')+'K':String(n);
const showLikes=k=>{const n=(stats[k]||{}).likes||0;return n>=10?num(n):'Like'};
const priceText=(k,x)=>{if(x.free_download)return'FREE';try{if(k==='b')return money(eff(x))}catch(e){}return money(x.price)};
const meta=x=>[x.kind,x.bpm&&x.bpm+' BPM',x.musical_key].filter(Boolean).join(' · ');
const media=()=>V||A;

async function load(){
 const [ov,st]=await Promise.all([sb.from('feed_items').select('*').then(r=>r.data||[],()=>[]),sb.rpc('feed_stats').then(r=>r.data||[],()=>[])]);
 rows={};ov.forEach(r=>rows[r.item_key]=r);stats={};st.forEach(r=>stats[r.item_key]={likes:Number(r.likes),comments:Number(r.comments)});
 const on={b:promo.feed_auto_beats!==false,p:promo.feed_auto_packs!==false,s:promo.feed_auto_samples!==false};
 const pick=(t,a)=>a.map((x,i)=>({k:t+':'+x.id,t,x,i})).filter(o=>{const r=rows[o.k];return (r&&r.shown!=null?r.shown:on[t])&&(o.x.preview_path||(r&&r.video_path))})
  .sort((m,n)=>String(n.x.created_at||'').localeCompare(String(m.x.created_at||'')));
 const G=[pick('b',beats),pick('p',packs),pick('s',window.MZSamplesAll||[])],pins=[],mix=[];
 /* take turns between the types so one kind never floods the feed */
 for(let i=0,n=Math.max(...G.map(g=>g.length));i<n;i++)G.forEach(g=>{const o=g[i];if(o)(rows[o.k]&&rows[o.k].pinned?pins:mix).push(o)});
 all=[...pins,...mix];
 await MZPrime(ov.map(r=>r.video_path));
}
function build(){
 root=document.createElement('div');root.id='mzFeed';
 root.innerHTML='<button class="fd-x" aria-label="Close feed">&#8592;</button><button class="fd-lk" aria-label="My liked items">&#9829;</button><div class="fd-top">'+[['all','All'],['b','Beats'],['p','Packs'],['s','Samples']].map(t=>'<button class="tb" data-t="'+t[0]+'">'+t[1]+'</button>').join('')+'</div>'+
  '<div class="fd-list"></div><div class="fd-bar"><i></i></div><button class="fd-start"><b>&#9654;</b><span>Tap to start with sound</span></button><div class="fd-sheet"><div class="fd-sh"><span></span><button aria-label="Close panel">&#10005;</button></div><div class="fd-sb"></div><div class="fd-foot"></div></div>';
 document.body.appendChild(root);list=q('.fd-list');A=new Audio();A.preload='auto';
 const tick=()=>{const m=media();if(!m||!m.duration)return;const d=Math.min(CLIP,m.duration);q('.fd-bar i').style.transform='scaleX('+Math.min(1,m.currentTime/d)+')';if(m.currentTime>=d){m.currentTime=0;m.play().catch(()=>{})}};
 A.addEventListener('timeupdate',tick);root.tick=tick;
 A.addEventListener('error',async()=>{const o=items[at];if(!o||A.dataset.retry===o.k)return;A.dataset.retry=o.k;await MZPrime([o.x.preview_path],true);playAt(at)});
 q('.fd-x').onclick=close;q('.fd-lk').onclick=likedSheet;q('.fd-sh button').onclick=closeSheet;
 q('.fd-start').onclick=e=>{started=true;e.currentTarget.remove();playAt(Math.max(at,0))};
 root.querySelectorAll('.tb').forEach(b=>b.onclick=()=>setKind(b.dataset.t));
 addEventListener('keydown',e=>{if(!root.classList.contains('on')||/INPUT/.test(e.target.tagName))return;if(e.key==='Escape')q('.fd-sheet.on')?closeSheet():close();if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();goTo(at+(e.key==='ArrowDown'?1:-1))}});
 addEventListener('popstate',()=>{if(root.classList.contains('on')&&!/^#feed/.test(location.hash)){pushed=false;close()}});
}
function setKind(t,want){kind=t;root.querySelectorAll('.tb').forEach(b=>b.classList.toggle('on',b.dataset.t===t));items=t==='all'?all:all.filter(o=>o.t===t);
 if(io)io.disconnect();stop();at=-1;
 list.innerHTML=items.length?items.map((o,n)=>'<section class="fd-s" data-n="'+n+'"></section>').join(''):'<div class="fd-empty">Nothing here yet.</div>';
 list.scrollTop=0;const go=Math.max(0,items.findIndex(o=>o.k===want));
 io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting)enter(+e.target.dataset.n)}),{root:list,threshold:.6});
 list.querySelectorAll('.fd-s').forEach(s=>io.observe(s));if(items.length){near(go);list.children[go].scrollIntoView();enter(go)}}
function fill(s,o){const {k,t,x,i}=o,r=rows[k]||{},inC=cart.has(k),lk=liked.has(k),c=(stats[k]||{}).comments||0;
 const art=r.video_path?'<div class="fd-art vid"><video playsinline loop preload="none" src="'+esc(pub(r.video_path))+'"></video></div>':'<div class="fd-art">'+(t==='s'?'<img src="'+BASEPATH+'crate-sleeve.jpg" alt="" decoding="async">':thumb(x,t==='b'?i:i+2,''))+'</div>';
 s.innerHTML=art+'<div class="fd-paused">&#10074;&#10074;</div><div class="fd-info"><small>'+TYPES[t]+'</small><b>'+esc(x.title)+'</b><span>'+esc(meta(x))+'</span> <span>'+priceText(t,x)+'</span>'+(t!=='s'?'<a class="more">View details</a>':'')+'</div>'+
  '<div class="fd-side"><button class="like'+(lk?' on':'')+'" aria-label="Like">'+svg('heart')+'<span>'+showLikes(k)+'</span></button><button class="cm" aria-label="Comments">'+svg('chat')+'<span>'+(c?num(c):'Comment')+'</span></button><button class="sh" aria-label="Share">'+svg('share')+'<span>Share</span></button><button class="cart'+(inC?' on':'')+'" aria-label="Add to cart">'+svg('cart')+'<span>'+(inC?'In cart':'Cart')+'</span></button></div>';
 if(t!=='s')try{paintArt(s)}catch(e){}
 s.onclick=e=>{if(e.target.closest('button,a'))return;const m=media();if(!m)return;m.paused?m.play().catch(()=>{}):m.pause();s.classList.toggle('paused',m.paused)};
 s.querySelector('.like').onclick=()=>like(o,s);s.querySelector('.cm').onclick=()=>comments(o);s.querySelector('.sh').onclick=()=>share(o);
 s.querySelector('.cart').onclick=e=>{toggleCart(k,e.currentTarget);const b=s.querySelector('.cart'),on=cart.has(k);b.classList.toggle('on',on);b.querySelector('span').textContent=on?'In cart':'Cart'};
 const m=s.querySelector('.more');if(m)m.onclick=()=>{close();goItem(t==='b'?'beat':'pack',bslug(x))}}
/* only the slides around the screen hold anything */
function near(n){list.querySelectorAll('.fd-s').forEach((s,j)=>{const w=Math.abs(j-n)<=2;if(w&&!s.firstChild)fill(s,items[j]);else if(!w&&s.firstChild)s.innerHTML=''})}
function enter(n){if(n===at)return;at=n;near(n);const sl=list.children[n];[...list.children].forEach(s=>s.classList.remove('paused'));
 const nx=items[n+1];if(nx&&nx.x.preview_path&&!(rows[nx.k]||{}).video_path){const p=new Audio();p.preload='metadata';p.src=pub(nx.x.preview_path)}
 try{history.replaceState(null,'','#feed/'+items[n].k)}catch(e){}if(sl&&started)playAt(n)}
function stop(){A.pause();if(V){V.pause();V.removeEventListener('timeupdate',root.tick);V=null}}
function playAt(n){const o=items[n];if(!o)return;stop();const s=list.children[n],v=s&&s.querySelector('video');
 if(v){V=v;v.currentTime=0;v.addEventListener('timeupdate',root.tick);v.play().catch(()=>{});return}
 A.src=pub(o.x.preview_path);A.play().catch(()=>{});try{track(o.t==='p'?'pack_play':'beat_play',o.x.id)}catch(e){}}
function goTo(n){if(n>=0&&n<items.length)list.children[n].scrollIntoView({behavior:'smooth'})}
function signIn(msg){if(acUser)return true;toast(msg);$('#acctBtn').click();return false}
function like(o,s){if(!signIn('SIGN IN TO LIKE'))return;const k=o.k,had=liked.has(k);toggleLike(k);stats[k]=stats[k]||{likes:0,comments:0};stats[k].likes=Math.max(0,stats[k].likes+(had?-1:1));
 const b=s.querySelector('.like');b.classList.toggle('on',!had);b.querySelector('span').textContent=showLikes(k);
 const t=sb.from('feed_likes');(had?t.delete().eq('user_id',acUser.id).eq('item_key',k):t.upsert({user_id:acUser.id,item_key:k})).then(()=>{},()=>{})}
function sheet(title,key){q('.fd-sh span').textContent=title;q('.fd-sheet').classList.add('on');q('.fd-foot').innerHTML='';sheetKey=key||null;return q('.fd-sb')}
function closeSheet(){q('.fd-sheet').classList.remove('on');sheetKey=null}
function likedSheet(){const b=sheet('Liked');const its=[...liked].map(k=>[k,lookup(k)]).filter(a=>a[1]);if(!acUser&&!its.length){b.innerHTML='<p class="fd-note">Sign in to keep what you like.</p>';return}
 b.innerHTML=its.length?its.map(([k,x])=>'<div class="fd-li" data-k="'+esc(k)+'"><button class="go">'+esc(x.title)+'<span>'+TYPES[k[0]]+'</span></button><button class="rm" aria-label="Unlike">&#9829;</button></div>').join(''):'<p class="fd-note">Nothing liked yet.</p>';
 b.querySelectorAll('.fd-li').forEach(r=>{const k=r.dataset.k;r.querySelector('.go').onclick=()=>{closeSheet();if(all.some(o=>o.k===k)){setKind('all',k)}else if(k[0]!=='s'){close();goItem(k[0]==='b'?'beat':'pack',bslug(lookup(k)))}};
  r.querySelector('.rm').onclick=()=>{toggleLike(k);if(acUser)sb.from('feed_likes').delete().eq('user_id',acUser.id).eq('item_key',k).then(()=>{},()=>{});if(stats[k])stats[k].likes=Math.max(0,stats[k].likes-1);r.remove();near(at);const s=list.querySelector('.fd-s[data-n="'+items.findIndex(o=>o.k===k)+'"] .like');if(s)s.classList.remove('on')}})}
async function comments(o){const b=sheet('Comments',o.k),f=q('.fd-foot');b.innerHTML='<p class="fd-note">Loading…</p>';
 let name='';try{name=localStorage.getItem('mzprd_cname')||''}catch(e){}
 f.innerHTML='<form class="fd-form"><div class="fd-emo">'+EMO.map(e=>'<button type="button">'+e+'</button>').join('')+'</div><input class="fd-name" maxlength="24" placeholder="Display name" value="'+esc(name)+'" aria-label="Display name"><div class="fd-row"><button type="button" class="em" aria-label="Emojis">😀</button><input class="tx" maxlength="300" placeholder="Add a comment" aria-label="Comment"><button>Post</button></div></form>';
 const fm=f.querySelector('form'),tx=f.querySelector('.tx'),nm=f.querySelector('.fd-name');
 f.querySelector('.em').onclick=()=>f.querySelector('.fd-emo').classList.toggle('on');f.querySelectorAll('.fd-emo button').forEach(e=>e.onclick=()=>{tx.value+=e.textContent;tx.focus()});
 const draw=async()=>{const {data,error}=await sb.from('feed_comments').select('id,user_id,name,body,created_at').eq('item_key',o.k).order('created_at',{ascending:false}).limit(50);if(sheetKey!==o.k)return;
  if(error){b.innerHTML='<p class="fd-note">Comments are not available right now.</p>';return}
  b.innerHTML=data.length?data.map(c=>'<div class="fd-c" data-id="'+c.id+'"><b>'+esc(c.name)+'</b>'+esc(c.body)+(acUser&&acUser.id===c.user_id?'<div><button>Delete</button></div>':'')+'</div>').join(''):'<p class="fd-note">Be the first to comment.</p>';
  b.querySelectorAll('.fd-c button').forEach(d=>d.onclick=async()=>{const r=d.closest('.fd-c');await sb.from('feed_comments').delete().eq('id',r.dataset.id);r.remove();bump(o,-1)})};
 await draw();
 fm.onsubmit=async e=>{e.preventDefault();if(!signIn('SIGN IN TO COMMENT'))return;const body=tx.value.trim(),n=nm.value.trim();if(!body)return;if(n.length<2){toast('ADD A DISPLAY NAME');nm.focus();return}
  const {error}=await sb.from('feed_comments').insert({item_key:o.k,user_id:acUser.id,name:n,body});if(error){toast(/Too many/.test(error.message)?'WAIT A MINUTE':'COULD NOT POST');return}
  try{localStorage.setItem('mzprd_cname',n)}catch(er){}tx.value='';bump(o,1);draw()}}
function bump(o,d){const st=stats[o.k]=stats[o.k]||{likes:0,comments:0};st.comments=Math.max(0,st.comments+d);const s=list.querySelector('.fd-s[data-n="'+items.indexOf(o)+'"] .cm span');if(s)s.textContent=st.comments?num(st.comments):'Comment'}
function share(o){const url=location.origin+BASEPATH+'#feed/'+o.k,title=o.x.title+' by MZPRD',u=encodeURIComponent(url),t=encodeURIComponent(title);
 const b=sheet('Share');b.innerHTML='<input class="fd-link" readonly value="'+esc(url)+'" aria-label="Link"><button class="fd-copy">Copy link</button><div class="fd-sg"><a target="_blank" rel="noopener" href="https://twitter.com/intent/tweet?url='+u+'&text='+t+'">X</a><a target="_blank" rel="noopener" href="https://www.facebook.com/sharer/sharer.php?u='+u+'">Facebook</a><a target="_blank" rel="noopener" href="https://wa.me/?text='+t+'%20'+u+'">WhatsApp</a><a target="_blank" rel="noopener" href="https://t.me/share/url?url='+u+'&text='+t+'">Telegram</a><a target="_blank" rel="noopener" href="https://www.reddit.com/submit?url='+u+'&title='+t+'">Reddit</a><a class="nat" href="#">More</a></div>';
 b.querySelector('.fd-copy').onclick=async e=>{try{await navigator.clipboard.writeText(url);e.target.textContent='Copied'}catch(er){b.querySelector('.fd-link').select()}};
 const n=b.querySelector('.nat');if(navigator.share)n.onclick=e=>{e.preventDefault();navigator.share({title,url}).catch(()=>{})};else n.remove()}
async function open(){
 if(!root)build();root.classList.add('on');document.body.classList.add('fd-lock');try{au.pause()}catch(e){}
 const m=location.hash.match(/^#feed\/([bps]:[\w-]+)/),want=m&&m[1];
 if(!/^#feed/.test(location.hash)){history.pushState(null,'',BASEPATH+'#feed');pushed=true}
 for(let i=0;i<80&&!beats.length&&!packs.length;i++)await new Promise(r=>setTimeout(r,100));
 await load();setKind('all',want)}
function close(){stop();closeSheet();root.classList.remove('on');document.body.classList.remove('fd-lock');if(/^#feed/.test(location.hash)){if(pushed){pushed=false;history.replaceState(null,'',BASEPATH);}else history.replaceState(null,'',BASEPATH);if(window.showHome)showHome(false)}}
window.MZFeed={open,close};
})();
