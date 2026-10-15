/* Video Studio skin: record-store theme + numbered collapsible steps (one open per column) + step rail. Look/feel only; never touches the renderer. */
(function(){
const css=`#studio{font-family:Inter,sans-serif}
#studio .pn{background:#111113;border:1px solid #1f1f23;padding:18px}
#studio h4{font:800 11px Inter,sans-serif;letter-spacing:.18em;color:#e0242f}
#studio label{font:700 11px/1.4 Inter,sans-serif;letter-spacing:.12em;color:#9a9aa2}
#studio select,#studio input[type=text],#studio input[type=number],#studio textarea{background:#0a0a0b;border:1px solid #2a2a2e;border-radius:0;font:500 14px Inter,sans-serif;padding:11px 12px}
#studio select:focus,#studio input:focus,#studio textarea:focus{border-color:#e0242f;outline:0}
#studio .seg button,#studio .btn{border:1px solid #333338;font:800 11px Inter,sans-serif;letter-spacing:.14em;padding:11px 8px;transition:.15s}
#studio .seg button.on{background:#e0242f;border-color:#e0242f}
#studio .btn:hover,#studio .seg button:hover{border-color:#fff;background:#18181b}#studio .seg button.on:hover{background:#e0242f}
#studio .go{font:400 22px/1 Anton,sans-serif;letter-spacing:.06em;padding:19px;background:#e0242f;transition:.15s}#studio .go:hover{background:#fff;color:#000}
#studio .chk{font:500 13px/1.4 Inter,sans-serif;letter-spacing:0;color:#d6d6da}
#studio input[type=checkbox],#studio input[type=radio],#studio input[type=range]{accent-color:#e0242f}
#studio .msg,#studio .cnt{font:500 13px/1.6 Inter,sans-serif;color:#b0b0b6;letter-spacing:0}
#studio .bar{height:4px;background:#1d1d20}#studio .bar b{background:linear-gradient(90deg,#e0242f,#ff6b5c)}
#studio .it{transition:.15s}#studio .it:hover{background:#18181b}#studio .it.on{background:#1a0a0d;outline:1px solid #e0242f}
#studio .it b{font:400 16px/1.1 Anton,sans-serif;letter-spacing:.03em}#studio .it span{font:500 11px Inter,sans-serif}
#studio .il{border-color:#1f1f23}
#studio canvas{border-color:#1f1f23}
#studio #sPlay{background:#e0242f;border-color:#e0242f;flex:none;min-width:120px}
#studio .yt h4,#studio .sk-h{font:400 22px/1 Anton,sans-serif;letter-spacing:.03em;color:#fff}
#studio .sk{border:1px solid #1f1f23;background:#0d0d0f;margin:0 0 8px;transition:border-color .2s}
#studio .sk:hover{border-color:#34343a}
#studio .sk.open{border-color:#e0242f;box-shadow:inset 3px 0 0 #e0242f;background:#111113}
#studio .sk>h4{margin:0!important;padding:14px 14px;cursor:pointer;display:flex;align-items:center;gap:10px;font:400 18px/1 Anton,sans-serif;letter-spacing:.04em;color:#fff;user-select:none}
#studio .sk>h4 .n{color:#e0242f;min-width:24px}
#studio .sk>h4:after{content:'';margin-left:auto;width:8px;height:8px;border-right:2px solid #777;border-bottom:2px solid #777;transform:rotate(-45deg);transition:.2s}
#studio .sk.open>h4:after{transform:rotate(45deg);border-color:#e0242f}
#studio .sk>.bd{display:none;padding:0 14px 16px}#studio .sk.open>.bd{display:block}
#studio .rail{display:grid;grid-template-columns:repeat(8,1fr);gap:6px;margin:0 0 16px}
#studio .rail button{background:#111113;border:1px solid #1f1f23;color:#8a8a92;text-align:left;padding:10px 12px;cursor:pointer;transition:.15s;min-width:0}
#studio .rail b{display:block;font:400 24px/1 Anton,sans-serif;color:#3a3a40;transition:.15s}
#studio .rail span{display:block;margin-top:5px;font:800 9px Inter,sans-serif;letter-spacing:.12em;color:#c9c9ce;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#studio .rail button:hover{border-color:#4a4a50}#studio .rail button:hover b{color:#fff}
#studio .rail button.on{border-color:#e0242f;background:#1a0a0d}#studio .rail button.on b{color:#e0242f}
@media(max-width:900px){#studio .rail{grid-template-columns:repeat(4,1fr)}}`;
const NAMES=['ITEM','COVER ART','AUDIO','PRESET','LAYOUT','TEXT STYLE','VISUALIZER','END CARD'];
function skin(){const root=document.getElementById('studio');if(!root||!root.querySelector('.sg'))return;
 if(!document.getElementById('studioSkin')){const s=document.createElement('style');s.id='studioSkin';s.textContent=css;document.head.appendChild(s)}
 if(root.dataset.skin)return;root.dataset.skin='1';
 const cols=root.querySelectorAll('.sg>div'),panels=[cols[0]&&cols[0].querySelector('.pn'),cols[2]&&cols[2].querySelector('.pn')].filter(Boolean),all=[];
 panels.forEach(pn=>{const hs=[...pn.querySelectorAll(':scope>h4')],grp=[];
  hs.forEach(h=>{const box=document.createElement('div');box.className='sk';const bd=document.createElement('div');bd.className='bd';let n=h.nextSibling;const move=[];while(n&&!(n.nodeType===1&&n.tagName==='H4')){move.push(n);n=n.nextSibling}
   pn.insertBefore(box,h);box.appendChild(h);box.appendChild(bd);move.forEach(m=>bd.appendChild(m));
   const i=all.length;h.innerHTML='<span class="n">'+String(i+1).padStart(2,'0')+'</span>'+(NAMES[i]||h.textContent.replace(/^\d+\.\s*/,''));
   h.onclick=()=>open(i,!box.classList.contains('open'));grp.push(box);all.push({box,grp})});
  pn.style.padding='10px'});
 const rail=document.createElement('div');rail.className='rail';rail.innerHTML=all.map((_,i)=>'<button data-i="'+i+'"><b>'+String(i+1).padStart(2,'0')+'</b><span>'+NAMES[i]+'</span></button>').join('');
 root.querySelector('.sg').before(rail);
 function open(i,on){const s=all[i];s.grp.forEach(b=>b.classList.remove('open'));if(on!==false)s.box.classList.add('open');rail.querySelectorAll('button').forEach((b,j)=>b.classList.toggle('on',all[j].box.classList.contains('open')))}
 rail.onclick=e=>{const b=e.target.closest('button');if(!b)return;const i=+b.dataset.i;open(i,true);all[i].box.scrollIntoView({behavior:'smooth',block:'nearest'})};
 if(all[0])open(0,true);const r=all.findIndex(x=>x.grp!==all[0].grp);if(r>0)open(r,true)}
window.studioSkin=skin;
})();
