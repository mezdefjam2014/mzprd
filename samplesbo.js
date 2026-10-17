/* MZPRD back office, SINGLE SAMPLES helpers:
   - the full sample fills in the title (and BPM / key when the file name has them)
   - no preview chosen? one is made from the full sample (the whole sample as a 128 kbps MP3, so the WAV itself stays private)
   - BULK UPLOAD: many files at once with those same auto settings, one type + price for the batch
   - PRICE FOR ALL SINGLE SAMPLES */
(function(){
const $=s=>document.querySelector(s);
const clean=n=>String(n).replace(/\.[^.]+$/,'').replace(/[_]+/g,' ').replace(/\s*-\s*/g,' - ').replace(/\s+/g,' ').trim();
const bpmOf=n=>{const m=String(n).match(/(\d{2,3})\s?-?\s?bpm/i);return m?+m[1]:null};
const keyOf=n=>{const m=String(n).match(/(?:^|[\s_\-(])([A-G](?:#|b)?)\s?-?\s?(maj|major|min|minor|m)(?=[\s_\-).]|$)/i);if(!m)return null;const q=/^maj/i.test(m[2])?'maj':'min';return m[1].toUpperCase()[0]+(m[1].slice(1)||'')+' '+q};
const titleOf=n=>clean(n).replace(/(\d{2,3})\s?-?\s?bpm/ig,'').replace(/(?:^|\s)([A-G](?:#|b)?)\s?(maj|major|min|minor)(?=\s|$)/ig,' ').replace(/\s+-\s*$/,'').replace(/\s+/g,' ').trim()||clean(n);
function lame(){return window.lamejs?Promise.resolve():new Promise((ok,no)=>{const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/lamejs@1.2.1/lame.min.js';s.onload=ok;s.onerror=()=>no(new Error('Could not load the MP3 maker'));document.head.appendChild(s)})}
/* the whole sample as an MP3 for the public preview */
async function makePreview(file){await lame();const C=window.OfflineAudioContext||window.webkitOfflineAudioContext;
 const buf=await new C(2,2,44100).decodeAudioData(await file.arrayBuffer());const sr=[44100,48000,32000].includes(buf.sampleRate)?buf.sampleRate:44100;
 const L=buf.getChannelData(0),R=buf.numberOfChannels>1?buf.getChannelData(1):L,n=L.length,to=a=>{const o=new Int16Array(n);for(let i=0;i<n;i++)o[i]=Math.max(-32768,Math.min(32767,a[i]*32767));return o},l=to(L),r=to(R);
 const enc=new lamejs.Mp3Encoder(2,sr,128),out=[];for(let i=0;i<n;i+=1152){const o=enc.encodeBuffer(l.subarray(i,i+1152),r.subarray(i,i+1152));if(o.length)out.push(new Uint8Array(o));if(i%(1152*200)===0)await new Promise(z=>setTimeout(z,0))}
 const e=enc.flush();if(e.length)out.push(new Uint8Array(e));return new File(out,titleOf(file.name)+' (preview).mp3',{type:'audio/mpeg'})}

/* ---------- the single form ---------- */
function wireForm(){const full=$('#bf input[data-k="file_path"]'),prev=$('#bf input[data-k="preview_path"]');if(!full||!prev||full.dataset.auto)return;full.dataset.auto=1;
 const note=document.createElement('div');note.className='cur';note.style.margin='6px 0 0';prev.insertAdjacentElement('afterend',note);
 const lab=[...document.querySelectorAll('#bf label')].find(l=>/PREVIEW AUDIO/.test(l.textContent));if(lab)lab.innerHTML='PREVIEW AUDIO (optional: leave empty and it is made from the full sample)';
 full.addEventListener('change',async()=>{const f=full.files[0];if(!f)return;
  const t=$('#f_title');if(t&&!t.value.trim())t.value=titleOf(f.name);
  const b=bpmOf(f.name),k=keyOf(f.name);if(b&&$('#f_bpm')&&!$('#f_bpm').value)$('#f_bpm').value=b;if(k&&$('#f_key')&&!$('#f_key').value)$('#f_key').value=k;
  if(prev.files[0])return;const save=$('#f_save');note.textContent='Making the preview from the full sample...';if(save)save.disabled=true;
  try{const mp3=await makePreview(f);const dt=new DataTransfer();dt.items.add(mp3);prev.files=dt.files;note.textContent='Preview made from the full sample ('+(mp3.size/1048576).toFixed(1)+' MB MP3).'}
  catch(e){note.textContent='Could not make a preview: '+(e.message||e)+'. Choose a preview file yourself.'}finally{if(save)save.disabled=false}})}

/* ---------- bulk upload + price for all (top of the list) ---------- */
function panels(){const bl=$('#bl');if(!bl||bl.querySelector('.smp-bulk'))return;
 const KINDS=['Soul chop','Drum break','Vocal loop','Keys loop','Guitar loop','Horn stab','Bass loop','Strings','One-shot','FX'];
 const g=document.createElement('div');g.className='bi gp smp-price';g.innerHTML='<div><b>PRICE FOR ALL SINGLE SAMPLES</b><span>Sets every single sample to one price.</span></div><div class="acts"><input type="number" step="0.01" min="0" id="smpAllP" value="4.99"><button id="smpAllGo">APPLY TO ALL</button></div>';
 const u=document.createElement('div');u.className='bi smp-bulk';u.style.display='block';
 u.innerHTML=`<b>BULK UPLOAD SINGLE SAMPLES</b><span style="display:block;margin:6px 0 12px">Pick many audio files at once. Each one gets its title from the file name (plus BPM and key when the name has them), a preview made from the full sample, and the type and price below.</span>
 <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;align-items:end"><div><label>TYPE FOR THIS BATCH</label><select id="smpBK">${KINDS.map(k=>`<option>${k}</option>`).join('')}</select></div><div><label>PRICE FOR THIS BATCH (USD)</label><input type="number" step="0.01" min="0" id="smpBP" value="4.99"></div></div>
 <label class="chk" style="margin-top:8px"><input type="checkbox" id="smpBPub" checked> PUBLISH THEM STRAIGHT AWAY</label>
 <label class="bo-btn" style="display:block;text-align:center;margin-top:10px;cursor:pointer">CHOOSE AUDIO FILES<input type="file" id="smpBF" accept="audio/*,.wav,.aif,.aiff,.mp3,.flac" multiple hidden></label><div id="smpBL" style="margin-top:10px;display:grid;gap:4px;font-size:12px"></div>`;
 bl.insertBefore(u,bl.firstChild);bl.insertBefore(g,bl.firstChild);
 g.querySelector('#smpAllGo').onclick=async()=>{const v=parseFloat(g.querySelector('#smpAllP').value);if(!(v>=0)){toast('Enter a price');return}
  const ok=window.askConfirm?await askConfirm('SET EVERY SINGLE SAMPLE TO $'+v.toFixed(2)+'?','This changes the price of all single samples on the site.','SET PRICE'):true;if(!ok)return;
  const {error}=await sb.from('samples').update({price:v}).not('id','is',null);if(error){toast('COULD NOT SAVE: '+error.message);return}toast('ALL SINGLE SAMPLES NOW $'+v.toFixed(2));try{await loadAll()}catch(e){}boRender()};
 u.querySelector('#smpBF').onchange=async ev=>{const files=[...ev.target.files].filter(f=>/^audio\//.test(f.type)||/\.(wav|aif|aiff|mp3|flac)$/i.test(f.name));ev.target.value='';if(!files.length)return;
  const list=u.querySelector('#smpBL'),kind=u.querySelector('#smpBK').value,price=parseFloat(u.querySelector('#smpBP').value)||0,pub=u.querySelector('#smpBPub').checked;
  list.innerHTML=files.map((f,i)=>`<div data-r="${i}" style="display:flex;justify-content:space-between;gap:10px;border:1px solid #26262a;padding:7px 10px"><span>${(f.name||'').replace(/[<>&]/g,'')}</span><em style="font-style:normal;color:#8a8a90">waiting</em></div>`).join('');
  let done=0,bad=0;
  for(let i=0;i<files.length;i++){const f=files[i],st=list.querySelector(`[data-r="${i}"] em`),up=[];const say=t=>st.textContent=t;
   try{say('making preview...');const mp3=await makePreview(f);
    say('uploading preview...');const pp=await upload(mp3,'private-files','previews');up.push(['private-files',pp]);
    const fp=await upload(f,'private-files','samples',pc=>say('uploading full sample '+pc+'%'));up.push(['private-files',fp]);
    say('saving...');const {error}=await sb.from('samples').insert({title:titleOf(f.name),kind,bpm:bpmOf(f.name),musical_key:keyOf(f.name),price,preview_path:pp,file_path:fp,published:pub});if(error)throw error;
    st.style.color='#6fd08c';say('done');done++}
   catch(e){bad++;st.style.color='#ff6b6b';say('failed: '+String(e.message||e).slice(0,60));for(const [b,p] of up){try{await rmObj(b,p)}catch(x){}}}}
  toast(done+' SAMPLE'+(done===1?'':'S')+' UPLOADED'+(bad?', '+bad+' FAILED':''));try{await loadAll()}catch(e){}setTimeout(()=>boRender(),900)}}

window.MZSamplesBO=function(){wireForm();panels()};
})();
