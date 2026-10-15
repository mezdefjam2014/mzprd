/* MPC back office skin: record-store theme + step rail (click a step to open it, one step open at a time) + live step summaries.
   Pure look/feel layer on top of mpc.js; it never touches the render engine. */
(function(){
const css=`#mpcmk{font-family:Inter,sans-serif}
#mpcmk .pn{background:#111113;border:1px solid #1f1f23;padding:20px}
#mpcmk h3{font:400 30px/1 Anton,sans-serif;letter-spacing:.02em;color:#fff}
#mpcmk h4,#mpcmk .sub{font:800 11px Inter,sans-serif;letter-spacing:.18em;color:#e0242f}
#mpcmk label{font:700 11px/1.4 Inter,sans-serif;letter-spacing:.12em;color:#9a9aa2;text-transform:uppercase}
#mpcmk input[type=text],#mpcmk select,#mpcmk textarea{background:#0a0a0b;border:1px solid #2a2a2e;border-radius:0;font:500 14px Inter,sans-serif;padding:11px 12px}
#mpcmk input:focus,#mpcmk select:focus,#mpcmk textarea:focus{border-color:#e0242f;outline:0}
#mpcmk .btn{border:1px solid #333338;font:800 11px Inter,sans-serif;letter-spacing:.14em;padding:11px 10px;transition:.15s}
#mpcmk .btn:hover{border-color:#fff;background:#18181b}
#mpcmk .btn.on{border-color:#e0242f;background:#e0242f;color:#fff}
#mpcmk .btn.big{font:400 20px/1 Anton,sans-serif;letter-spacing:.06em;padding:18px;background:#e0242f;border-color:#e0242f}
#mpcmk .btn.big:hover{background:#fff;color:#000;border-color:#fff}
#mpcmk .msg{font:500 13px/1.6 Inter,sans-serif;color:#b0b0b6}
#mpcmk .chk{font:500 13px/1.4 Inter,sans-serif;letter-spacing:0;color:#d6d6da;text-transform:none}
#mpcmk input[type=checkbox],#mpcmk input[type=radio]{accent-color:#e0242f}
#mpcmk .bar{height:4px;background:#1d1d20}#mpcmk .bar b{background:linear-gradient(90deg,#e0242f,#ff6b5c)}
#mpcmk .ctl{background:#0a0a0b;border:1px solid #1f1f23;padding:8px 10px}
#mpcmk .time{font:700 12px Inter,sans-serif;font-variant-numeric:tabular-nums}
#mpcmk #mPlay{background:#e0242f;border-color:#e0242f;min-width:74px}
#mpcmk .sec{background:#0d0d0f;border:1px solid #1f1f23;transition:border-color .2s}
#mpcmk .sec:hover{border-color:#34343a}
#mpcmk .sec>summary{font:400 19px/1 Anton,sans-serif;letter-spacing:.04em;color:#fff;padding:15px 16px}
#mpcmk .sec>summary small{font:500 12px Inter,sans-serif!important;letter-spacing:0!important;color:#8a8a92!important;text-transform:none}
#mpcmk .sec>summary:after{content:'';width:9px;height:9px;border-right:2px solid #777;border-bottom:2px solid #777;transform:rotate(-45deg);transition:.2s;margin-left:10px;font-size:0}
#mpcmk .sec[open]>summary:after{content:'';transform:rotate(45deg);border-color:#e0242f}
#mpcmk .grp[open]{border-color:#e0242f;box-shadow:inset 3px 0 0 #e0242f;background:#111113}
#mpcmk .grp>summary .n{font:400 19px Anton,sans-serif;color:#e0242f;margin-right:10px;min-width:22px}
#mpcmk .grp[open]>summary small{color:#e9e9ee!important}
#mpcmk .sec .in{padding:2px 16px 18px}
#mpcmk .sub2{background:#0a0a0b;border-color:#222226}#mpcmk .sub2>summary{font:700 12px Inter,sans-serif;letter-spacing:.06em;color:#d6d6da}
#mpcmk .it{font:500 13px Inter,sans-serif}
#mpcmk .rail{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin:14px 0 4px}
#mpcmk .rail button{background:#0a0a0b;border:1px solid #232327;color:#8a8a92;text-align:left;padding:9px 10px;cursor:pointer;transition:.15s;min-width:0}
#mpcmk .rail button b{display:block;font:400 22px/1 Anton,sans-serif;color:#3a3a40;transition:.15s}
#mpcmk .rail button span{display:block;margin-top:4px;font:800 9px Inter,sans-serif;letter-spacing:.12em;color:#c9c9ce;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#mpcmk .rail button:hover{border-color:#4a4a50}#mpcmk .rail button:hover b{color:#fff}
#mpcmk .rail button.on{border-color:#e0242f;background:#1a0a0d}#mpcmk .rail button.on b{color:#e0242f}
#mpcmk .canvasHint{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;pointer-events:none;background:radial-gradient(circle at 50% 45%,#18181b,#050506 70%);color:#fff;text-align:center}
#mpcmk .canvasHint b{font:400 34px/1 Anton,sans-serif;letter-spacing:.03em}#mpcmk .canvasHint span{font:600 13px Inter,sans-serif;color:#8a8a92}
#mpcmk .canvasHint i{width:58px;height:58px;border-radius:50%;border:2px solid #e0242f;display:grid;place-items:center;font-style:normal;color:#e0242f;font-size:20px;animation:mzp 1.8s ease-in-out infinite}
@keyframes mzp{50%{box-shadow:0 0 0 12px rgba(224,36,47,0)}0%{box-shadow:0 0 0 0 rgba(224,36,47,.5)}}`;
function skin(){const root=document.getElementById('mpcmk');if(!root||!root.querySelector('#mRight'))return;
 if(!document.getElementById('mpcSkin')){const s=document.createElement('style');s.id='mpcSkin';s.textContent=css;document.head.appendChild(s)}
 if(root.dataset.skin)return;root.dataset.skin='1';
 const R=root.querySelector('#mRight'),G=[...R.querySelectorAll(':scope>details.grp')];
 G.forEach(d=>{const sm=d.querySelector('summary');const t=sm.firstChild;if(t&&t.nodeType===3){const m=t.textContent.match(/^\s*(\d+)\.\s*(.*)$/);if(m){t.textContent=m[2];const n=document.createElement('span');n.className='n';n.textContent=m[1].padStart(2,'0');sm.insertBefore(n,t);d.dataset.lbl=m[2].trim()}}});
 const rail=document.createElement('div');rail.className='rail';rail.innerHTML=G.map((d,i)=>'<button data-i="'+i+'"><b>'+String(i+1).padStart(2,'0')+'</b><span>'+(d.dataset.lbl||'')+'</span></button>').join('');
 R.firstElementChild.after(rail);
 const sync=()=>rail.querySelectorAll('button').forEach((b,i)=>b.classList.toggle('on',G[i].open));
 let solo=true;G.forEach(d=>d.addEventListener('toggle',()=>{if(solo&&d.open)G.forEach(o=>{if(o!==d)o.open=false});sync()}));
 rail.onclick=e=>{const b=e.target.closest('button');if(!b)return;const d=G[+b.dataset.i];d.open=true;d.scrollIntoView({behavior:'smooth',block:'nearest'})};
 const oa=root.querySelector('#mOpenAll');if(oa)oa.addEventListener('click',()=>{solo=false;setTimeout(()=>{solo=true;sync()},50)},true);
 if(!G.some(d=>d.open)&&G[0])G[0].open=true;sync();
 const cv=root.querySelector('#mCv');if(cv){const w=cv.parentElement;w.style.position='relative';const h=document.createElement('div');h.className='canvasHint';h.innerHTML='<i>&#9654;</i><b>PICK A BEAT</b><span>Choose one in step 01 and the MPC plays it here</span>';w.appendChild(h);
  const off=()=>h.remove();['change'].forEach(ev=>root.querySelector('#mRight').addEventListener(ev,e=>{if(e.target.tagName==='SELECT'&&e.target.value)setTimeout(off,300)}));root.querySelector('#mPlay')?.addEventListener('click',off)}}
window.mpcSkin=skin;
})();
