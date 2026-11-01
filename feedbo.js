/* MZPRD back office, FEED tab: auto-add switches, show / hide / pin per item, Cloudflare video delete, comment moderation. Loaded on demand. */
(function(){
const TYPES={b:'BEAT',p:'PACK',s:'SAMPLE'};
let host,rows={},filter='all',term='';
const all=()=>[...beats.map(x=>['b:'+x.id,x]),...packs.map(x=>['p:'+x.id,x]),...(window.MZSamplesAll||[]).map(x=>['s:'+x.id,x])];
const autoOn=t=>promo[{b:'feed_auto_beats',p:'feed_auto_packs',s:'feed_auto_samples'}[t]]!==false;
const inFeed=k=>{const r=rows[k];return r&&r.shown!=null?r.shown:autoOn(k[0])};
const fail=e=>{toast(/feed_|schema|relation/i.test(e.message||'')?'RUN supabase/feed.sql FIRST':'COULD NOT SAVE')};
async function save(k,ch){const r={item_key:k,...(rows[k]||{}),...ch},{error}=await sb.from('feed_items').upsert(r);if(error){fail(error);return false}rows[k]=r;return true}
async function saveMany(ks,ch){const rs=ks.map(k=>({item_key:k,shown:null,pinned:false,video_path:null,...(rows[k]||{}),...ch}));for(let i=0;i<rs.length;i+=200){const {error}=await sb.from('feed_items').upsert(rs.slice(i,i+200));if(error){fail(error);return}}rs.forEach(r=>rows[r.item_key]=r);toast('SAVED');draw()}
async function setAuto(col,v){const {error}=await sb.from('site_settings').update({[col]:v}).eq('id',1);if(error){fail(error);draw();return}promo[col]=v;toast('SAVED');draw()}
async function delVideo(k){const r=rows[k];if(!r||!r.video_path)return;if(!await askConfirm('DELETE THIS VIDEO?','This permanently deletes the video from Cloudflare and takes it out of the feed. The beat, pack or sample stays in your store.'))return;
 try{const ok=await adminCall({action:'r2-delete',key:String(r.video_path).slice(3)});if(ok.ok===false)throw new Error('delete')}catch(e){toast('COULD NOT DELETE');return}
 if(await save(k,{video_path:null})){toast('VIDEO DELETED');draw()}}
async function comments(){const b=host.querySelector('#fbC'),{data,error}=await sb.from('feed_comments').select('id,item_key,name,body,created_at').order('created_at',{ascending:false}).limit(100);if(error){b.textContent='Run supabase/feed.sql to turn comments on.';return}
 b.innerHTML=data.length?data.map(c=>{const x=lookup(c.item_key);return '<div class="acr" style="display:flex;gap:10px;justify-content:space-between;padding:8px 0;border-bottom:1px solid #222"><div><b>'+esc(c.name)+'</b> <span style="color:#888">on '+esc(x?x.title:c.item_key)+'</span><div>'+esc(c.body)+'</div></div><button class="bo-btn" data-c="'+c.id+'">DELETE</button></div>'}).join(''):'No comments yet.';
 b.querySelectorAll('[data-c]').forEach(d=>d.onclick=async()=>{const {error}=await sb.from('feed_comments').delete().eq('id',d.dataset.c);if(error){toast('COULD NOT DELETE');return}d.parentElement.remove()})}
function draw(){const list=all().filter(([k,x])=>(filter==='all'||k[0]===filter)&&(!term||String(x.title).toLowerCase().includes(term))),sw=(c,l)=>'<label class="chk"><input type="checkbox" data-a="'+c+'"'+(promo[c]!==false?' checked':'')+'> '+l+'</label>';
 host.innerHTML='<h3>FEED</h3><p style="color:#aaa;font-size:12px">With a switch on, everything of that type is in the feed, including new uploads. Hide any single item below. Videos are made in VIDEO STUDIO with SEND TO FEED.</p>'+
  sw('feed_auto_beats','BEATS GO IN THE FEED AUTOMATICALLY')+sw('feed_auto_packs','SAMPLE PACKS GO IN THE FEED AUTOMATICALLY')+sw('feed_auto_samples','SINGLE SAMPLES GO IN THE FEED AUTOMATICALLY')+
  '<div style="display:flex;flex-wrap:wrap;gap:8px;margin:14px 0"><select id="fbF">'+[['all','ALL'],['b','BEATS'],['p','PACKS'],['s','SAMPLES']].map(o=>'<option value="'+o[0]+'"'+(o[0]===filter?' selected':'')+'>'+o[1]+'</option>').join('')+'</select><input id="fbQ" placeholder="Search" value="'+esc(term)+'"><button class="bo-btn" id="fbAll">SHOW ALL LISTED</button><button class="bo-btn" id="fbNone">HIDE ALL LISTED</button></div>'+
  '<div>'+list.slice(0,300).map(([k,x])=>{const r=rows[k]||{},on=inFeed(k);return '<div data-k="'+esc(k)+'" style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;padding:8px 0;border-bottom:1px solid #222"><span style="flex:1;min-width:180px"><b>'+esc(x.title)+'</b> <span style="color:#888">'+TYPES[k[0]]+(r.video_path?' + VIDEO':'')+'</span></span><button class="bo-btn" data-do="vis">'+(on?'HIDE FROM FEED':'SHOW IN FEED')+'</button><button class="bo-btn" data-do="pin"'+(r.pinned?' style="border-color:var(--gold);color:var(--gold)"':'')+'>'+(r.pinned?'PINNED':'PIN TO TOP')+'</button>'+(r.video_path?'<button class="bo-btn" data-do="del">DELETE VIDEO</button>':'')+'</div>'}).join('')+'</div>'+(list.length>300?'<p style="color:#888">Showing 300 of '+list.length+'. Search to narrow it down.</p>':'')+
  '<h3 style="margin-top:28px">LATEST COMMENTS</h3><div id="fbC">Loading...</div>';
 host.querySelectorAll('[data-a]').forEach(c=>c.onchange=()=>setAuto(c.dataset.a,c.checked));
 host.querySelector('#fbF').onchange=e=>{filter=e.target.value;draw()};const Q=host.querySelector('#fbQ');Q.onchange=()=>{term=Q.value.trim().toLowerCase();draw()};
 host.querySelector('#fbAll').onclick=()=>saveMany(list.map(a=>a[0]),{shown:true});host.querySelector('#fbNone').onclick=()=>saveMany(list.map(a=>a[0]),{shown:false});
 host.querySelectorAll('[data-do]').forEach(b=>b.onclick=async()=>{const k=b.parentElement.dataset.k,d=b.dataset.do;if(d==='del')return delVideo(k);if(await save(k,d==='vis'?{shown:!inFeed(k)}:{pinned:!(rows[k]||{}).pinned}))draw()});
 comments()}
window.feedBoOpen=async function(h){host=h;const {data}=await sb.from('feed_items').select('*');rows={};(data||[]).forEach(r=>rows[r.item_key]=r);draw()};
})();
