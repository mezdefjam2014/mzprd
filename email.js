/* MZPRD Email and Drop Studio (back office). Builds an email-safe HTML announcement for a beat or pack
   (new drop, teaser, last call, promo) and hands it off to Gmail or any mail app:
   - COPY FOR GMAIL: puts the finished design on the clipboard as rich HTML; paste it into any Gmail (or Outlook, Yahoo, Apple Mail) compose window.
   - OPEN GMAIL / DEFAULT MAIL APP: opens a compose window with recipients (BCC) and subject filled in.
   - HTML code, .html file, or an .eml draft that opens in Outlook, Apple Mail and Thunderbird. */
(function(){
const SITE='https://mzprd.com',KEY='mzprd_email_list';
const STYLES={
 dark:{n:'DARK',bg:'#09090c',card:'#111116',text:'#e9e9ee',sub:'#9a9aa5',accent:'#e0242f',btn:'#ffffff',line:'#26262e',gold:'#e8b94a'},
 gold:{n:'GOLD',bg:'#050505',card:'#0e0c08',text:'#f5efe0',sub:'#a89a78',accent:'#e8b94a',btn:'#000000',line:'#3a2f17',gold:'#e8b94a'},
 light:{n:'LIGHT',bg:'#f2f2f5',card:'#ffffff',text:'#101014',sub:'#5b5b66',accent:'#e0242f',btn:'#ffffff',line:'#e2e2e8',gold:'#b8860b'}
};
const TYPES={drop:'NEW DROP',teaser:'TEASER (COMING SOON)',last:'LAST CALL',promo:'PROMO / SALE'};
const HEAD={drop:'NEW DROP',teaser:'COMING SOON',last:'LAST CALL',promo:'SALE'};
const CTA={drop:'LISTEN & GET IT',teaser:'GET A FIRST LOOK',last:'GET IT BEFORE IT IS GONE',promo:'SHOP THE SALE'};
const SUBJ={
 drop:[x=>'New '+x.noun+' out now: '+x.T,x=>'"'+x.T+'" just dropped',x=>x.T+' is live'+(x.info?' ('+x.info+')':''),x=>'Fresh from the studio: '+x.T],
 teaser:[x=>'Coming '+(x.when||'soon')+': '+x.T,x=>'Something new drops '+(x.when||'soon'),x=>'First look: "'+x.T+'"'],
 last:[x=>'Last call: '+x.T,x=>'Still available: '+x.T,x=>'Do not sleep on "'+x.T+'"'],
 promo:[x=>x.promoLine,x=>'All beats '+x.promoPrice+' - limited time',x=>'The beat sale is on']
};
const BODY={
 drop:[x=>'A new '+x.mood+' '+x.genre+' '+x.noun+' just landed. Hit play, feel it out, and grab it before someone else does.',x=>'"'+x.T+'" is live on MZPRD. '+(x.info?x.info+'. ':'')+'Preview it now and download it instantly after you check out.',x=>'Fresh out of the studio: '+x.T+'. Listen first, then lock it in.'],
 teaser:[x=>'Something new is dropping '+(x.when||'soon')+'. Here is a first look at "'+x.T+'". Mark your calendar.',x=>'"'+x.T+'" lands '+(x.when||'soon')+'. '+(x.info?x.info+'. ':'')+'Be first in line.',x=>'New '+x.noun+' loading. Preview "'+x.T+'" now, it goes live '+(x.when||'soon')+'.'],
 last:[x=>'"'+x.T+'" is still available, but not for long. If it has been on your list, now is the time.',x=>'Quick reminder: "'+x.T+'" is waiting for you. Preview it again and get it today.',x=>'You listened, now finish the job. "'+x.T+'" is ready to download.'],
 promo:[x=>x.promoLine+'. Every beat on the site, one price. Preview anything and download instantly.',x=>'The sale is on: all beats '+x.promoPrice+' for a limited time. Start with "'+x.T+'".',x=>'Grab more for less. All beats '+x.promoPrice+' right now.']
};
const E={items:[],kind:'beats',item:null,type:'drop',style:'dark',sj:0,bd:0,rec:[],bcc:true,when:'',dt:'',headline:'',body:'',cta:'',addr:'',foot:true};
let root=null,mounted=false;
const $q=s=>root.querySelector(s);
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const b64=s=>btoa(unescape(encodeURIComponent(s)));

function ctx(){
 const it=E.item||{},isB=E.kind==='beats',tags=(it.tags||'').split(/[\/,]/).map(x=>x.trim()).filter(Boolean);
 const sl=it.slug||String(it.title||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'')||it.id;
 const info=[it.bpm&&it.bpm+' BPM',it.musical_key].filter(Boolean).join('  •  ');
 let when=E.when.trim();
 if(E.dt){const d=new Date(E.dt);if(!isNaN(d))when=when||d.toLocaleString([], {weekday:'long',month:'long',day:'numeric',hour:'numeric',minute:'2-digit'})}
 const pr=(typeof promo!=='undefined'&&promo)||{};
 return{it,isB,noun:isB?'beat':'pack',T:it.title||'Untitled',mood:tags[1]||'hard',genre:(tags[0]||'hip hop').toLowerCase(),info,when,
  url:SITE+'/'+(isB?'beat':'pack')+'/'+sl+'/',cover:it.cover_path?pub(it.cover_path):'',
  promoPrice:pr.promo_price!=null?'$'+Number(pr.promo_price).toFixed(0):'$10',promoLine:((pr.promo_text||'ALL BEATS')+' '+(pr.promo_price!=null?'$'+Number(pr.promo_price).toFixed(0):'$10')).trim()};
}
function content(){
 const x=ctx(),S=SUBJ[E.type],B=BODY[E.type];
 return{x,subject:S[E.sj%S.length](x),headline:E.headline.trim()||(E.type==='promo'?x.promoLine:HEAD[E.type]),body:E.body.trim()||B[E.bd%B.length](x),cta:E.cta.trim()||CTA[E.type]};
}
function calUrl(x,c){
 if(!E.dt)return'';const d=new Date(E.dt);if(isNaN(d))return'';const f=t=>t.toISOString().replace(/[-:]|\.\d{3}/g,''),e=new Date(d.getTime()+3600000);
 return'https://calendar.google.com/calendar/render?action=TEMPLATE&text='+encodeURIComponent('MZPRD drop: '+x.T)+'&dates='+f(d)+'/'+f(e)+'&details='+encodeURIComponent('Listen and get it: '+x.url)+'&location='+encodeURIComponent(SITE);
}
function mailHtml(){
 const c=content(),x=c.x,s=STYLES[E.style],cal=calUrl(x,c),F="'Arial Black','Helvetica Neue',Arial,sans-serif",B="'Helvetica Neue',Arial,sans-serif";
 const pre=c.body.slice(0,110);
 const drop=x.when&&(E.type==='drop'||E.type==='teaser')?`<tr><td style="padding:6px 28px 4px"><table role="presentation" cellspacing="0" cellpadding="0" width="100%" style="border:1px solid ${s.accent}"><tr><td align="center" style="padding:14px;font:700 13px ${B};letter-spacing:3px;color:${s.accent}">${E.type==='teaser'?'DROPS':'LIVE'} ${esc(x.when).toUpperCase()}</td></tr></table></td></tr>`:'';
 return`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="${E.style==='light'?'light':'dark light'}"><title>${esc(c.subject)}</title></head>
<body style="margin:0;padding:0;background:${s.bg}">
<span style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;font-size:1px">${esc(pre)}</span>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" bgcolor="${s.bg}" style="background:${s.bg}"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="600" cellspacing="0" cellpadding="0" bgcolor="${s.card}" style="width:100%;max-width:600px;background:${s.card};border:1px solid ${s.line}">
<tr><td align="center" style="padding:18px 24px;border-bottom:1px solid ${s.line};font:700 15px ${F};letter-spacing:8px;color:${s.text}">MZPRD</td></tr>
${x.cover?`<tr><td style="padding:0"><a href="${esc(x.url)}" style="text-decoration:none"><img src="${esc(x.cover)}" width="600" alt="${esc(x.T)}" style="display:block;width:100%;max-width:600px;height:auto;border:0"></a></td></tr>`:''}
<tr><td style="padding:28px 28px 6px"><div style="font:700 12px ${B};letter-spacing:4px;color:${s.accent}">${esc(c.headline).toUpperCase()}</div>
<div style="margin:10px 0 0;font:900 34px/1.1 ${F};color:${s.text};text-transform:uppercase">${esc(x.T)}</div>
${x.info?`<div style="margin:10px 0 0;font:700 13px ${B};letter-spacing:3px;color:${s.gold}">${esc(x.info)}</div>`:''}</td></tr>
<tr><td style="padding:14px 28px 12px;font:400 16px/1.6 ${B};color:${s.sub}">${esc(c.body)}</td></tr>
${drop}
<tr><td align="center" style="padding:18px 28px 8px"><table role="presentation" cellspacing="0" cellpadding="0"><tr><td align="center" bgcolor="${s.accent}" style="background:${s.accent}"><a href="${esc(x.url)}" style="display:inline-block;padding:16px 34px;font:700 14px ${B};letter-spacing:3px;color:${s.btn};text-decoration:none">${esc(c.cta).toUpperCase()}</a></td></tr></table></td></tr>
<tr><td align="center" style="padding:6px 28px 26px;font:600 12px ${B};letter-spacing:2px"><a href="${esc(x.url)}" style="color:${s.text};text-decoration:underline">&#9654; PLAY THE PREVIEW</a>${cal?` &nbsp;&nbsp;|&nbsp;&nbsp; <a href="${esc(cal)}" style="color:${s.text};text-decoration:underline">ADD TO CALENDAR</a>`:''} &nbsp;&nbsp;|&nbsp;&nbsp; <a href="${SITE}" style="color:${s.text};text-decoration:underline">ALL BEATS</a></td></tr>
${E.foot?`<tr><td style="padding:18px 28px;border-top:1px solid ${s.line};font:400 11px/1.6 ${B};color:${s.sub}">You are getting this because you listened to, bought from or signed up with MZPRD. If you do not want these emails, just reply with the word STOP and you will be removed.${E.addr.trim()?'<br>'+esc(E.addr.trim()):''}<br><a href="${SITE}" style="color:${s.sub}">${SITE.replace('https://','')}</a></td></tr>`:''}
</table></td></tr></table></body></html>`;
}
function mailText(){const c=content(),x=c.x;return[c.headline.toUpperCase(),x.T+(x.info?' ('+x.info+')':''),'',c.body,'',x.when&&(E.type==='drop'||E.type==='teaser')?(E.type==='teaser'?'Drops ':'Live ')+x.when+'\n':'',c.cta+': '+x.url,'','- MZPRD',SITE,E.foot?'\nReply STOP to be removed from these emails.':''].filter((l,i,a)=>!(l===''&&a[i-1]==='')).join('\n')}
function recipients(){return E.rec}
function parseRec(t){const m=String(t||'').match(/[^\s,;<>"'()]+@[^\s,;<>"'()]+\.[^\s,;<>"'()]+/g)||[];return[...new Set(m.map(e=>e.toLowerCase()))]}

/* ---------- actions ---------- */
async function copyHtml(){
 const html=mailHtml(),text=mailText();
 try{await navigator.clipboard.write([new ClipboardItem({'text/html':new Blob([html],{type:'text/html'}),'text/plain':new Blob([text],{type:'text/plain'})})]);return true}
 catch(e){try{const f=$q('#emFrame'),d=f.contentDocument;d.designMode='on';f.contentWindow.focus();d.execCommand('selectAll');const ok=d.execCommand('copy');d.getSelection().removeAllRanges();d.designMode='off';return ok}catch(e2){return false}}
}
async function copyText(t){try{await navigator.clipboard.writeText(t);return true}catch(e){const a=document.createElement('textarea');a.value=t;document.body.appendChild(a);a.select();const ok=document.execCommand('copy');a.remove();return ok}}
function say(m){const el=$q('#emMsg');el.textContent=m}
function recParams(){const r=E.rec;if(!r.length)return{to:'',bcc:''};const j=r.join(',');if(j.length>1400)return{to:'',bcc:'',long:true};return E.bcc?{to:'',bcc:j}:{to:j,bcc:''}}
async function openGmail(){
 const c=content(),p=recParams(),ok=await copyHtml();
 let u='https://mail.google.com/mail/?view=cm&fs=1&su='+encodeURIComponent(c.subject)+'&body='+encodeURIComponent('(Paste the design here with Ctrl+V)\n\n'+mailText());
 if(p.to)u+='&to='+encodeURIComponent(p.to);if(p.bcc)u+='&bcc='+encodeURIComponent(p.bcc);
 window.open(u,'_blank','noopener');
 say((ok?'Design copied. ':'')+'Gmail opened. Click in the message, select the text, and press Ctrl+V to drop the finished design in.'+(p.long?' Too many addresses for the link: use COPY EMAILS and paste them into BCC.':''));
}
function openMail(){const c=content(),p=recParams();window.location.href='mailto:'+encodeURIComponent(p.to)+'?'+(p.bcc?'bcc='+encodeURIComponent(p.bcc)+'&':'')+'subject='+encodeURIComponent(c.subject)+'&body='+encodeURIComponent(mailText());say('Your mail app should open with the subject and text. For the full design use COPY FOR GMAIL and paste, or the .EML file.')}
function save(name,type,data){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([data],{type}));a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),4000)}
function wrap(s){return s.replace(/(.{76})/g,'$1\r\n')}
function emlFile(){
 const c=content(),r=E.rec,bd='----=_mzprd_'+Date.now().toString(36),H=[
  'X-Unsent: 1','Subject: =?UTF-8?B?'+b64(c.subject)+'?=',r.length&&!E.bcc?'To: '+r.join(', '):'To: ',r.length&&E.bcc?'Bcc: '+r.join(', '):'',
  'MIME-Version: 1.0','Content-Type: multipart/alternative; boundary="'+bd+'"'].filter(Boolean);
 return H.join('\r\n')+'\r\n\r\n--'+bd+'\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n'+wrap(b64(mailText()))+'\r\n--'+bd+'\r\nContent-Type: text/html; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n'+wrap(b64(mailHtml()))+'\r\n--'+bd+'--\r\n';
}
function slug(){const i=E.item||{};return(i.slug||String(i.title||'email').toLowerCase().replace(/[^a-z0-9]+/g,'-'))+'-'+E.type}

/* ---------- UI ---------- */
function css(){
 if(document.getElementById('emCss'))return;const st=document.createElement('style');st.id='emCss';
 st.textContent=`#emailst{display:none}#emailst.on{display:block}
#emailst .eg{display:grid;grid-template-columns:minmax(300px,420px) minmax(0,1fr);gap:20px;align-items:start}
@media(max-width:1000px){#emailst .eg{grid-template-columns:1fr}}
#emailst .pn{background:#0c0c0f;border:1px solid #2a2a2e;padding:16px}
#emailst h4{font:700 11px Montserrat;letter-spacing:.3em;color:var(--gold);margin:0 0 10px}
#emailst h4:not(:first-child){margin-top:18px}
#emailst label{display:block;font:600 10px Montserrat;letter-spacing:.22em;color:#8e8e94;margin:10px 0 5px}
#emailst select,#emailst input[type=text],#emailst input[type=datetime-local],#emailst textarea{width:100%;background:#050506;border:1.5px solid #34343a;color:#fff;padding:9px;font:500 13px Montserrat}
#emailst textarea{min-height:70px;resize:vertical}
#emailst .two{display:grid;grid-template-columns:1fr 1fr;gap:8px}
#emailst .btn{background:transparent;border:1.5px solid #4a4a50;color:#fff;font:600 10px Montserrat;letter-spacing:.18em;padding:11px 8px}
#emailst .btn:hover{border-color:#fff}
#emailst .btn.big{background:var(--red);border-color:var(--red);font-size:11px;padding:14px}
#emailst .seg{display:flex;gap:6px}#emailst .seg button{flex:1}
#emailst .seg button.on{background:var(--red);border-color:var(--red)}
#emailst .chk{display:flex;gap:8px;align-items:center;letter-spacing:.1em;margin:8px 0}#emailst .chk input{width:auto}
#emailst .msg{font:500 12px/1.5 Montserrat;color:#a9a9ae;margin-top:10px;min-height:18px}
#emailst iframe{width:100%;height:760px;border:1px solid #2a2a2e;background:#fff}
#emailst .cnt{font:500 10px Montserrat;color:#6c6c73;letter-spacing:.1em;margin-top:4px}`;
 document.head.appendChild(st);
}
function html(){return`<div class="eg"><div>
 <div class="pn"><h4>1. WHAT ARE YOU SENDING</h4>
  <div class="seg"><button class="btn on" data-k="beats">BEATS</button><button class="btn" data-k="packs">PACKS</button></div>
  <label>FEATURED ITEM</label><select id="emItem"></select>
  <label>EMAIL TYPE</label><select id="emType">${Object.keys(TYPES).map(k=>`<option value="${k}">${TYPES[k]}</option>`).join('')}</select>
  <label>LOOK</label><div class="seg" id="emStyle">${Object.keys(STYLES).map(k=>`<button class="btn${k==='dark'?' on':''}" data-s="${k}">${STYLES[k].n}</button>`).join('')}</div>
  <h4>2. THE DROP</h4>
  <label>DROP DATE AND TIME (optional, adds an Add to Calendar link)</label><input type="datetime-local" id="emDt">
  <label>OR TYPE IT YOURSELF (e.g. Friday 6 PM EST)</label><input type="text" id="emWhen" placeholder="Friday 6 PM EST">
  <h4>3. WORDS</h4>
  <label>SUBJECT <span id="emSi" style="color:#6c6c73"></span></label><input type="text" id="emSubj"><div class="two" style="margin-top:6px"><button class="btn" id="emSN">NEXT SUBJECT</button><button class="btn" id="emBN">NEXT BODY TEXT</button></div>
  <label>HEADLINE (blank = automatic)</label><input type="text" id="emHead">
  <label>BODY (blank = automatic)</label><textarea id="emBody"></textarea>
  <label>BUTTON TEXT (blank = automatic)</label><input type="text" id="emCta">
  <label class="chk"><input type="checkbox" id="emFoot" checked> ADD FOOTER (why they got it + STOP line)</label>
  <label>YOUR MAILING ADDRESS (optional, shown in the footer)</label><input type="text" id="emAddr" placeholder="City, State">
 </div>
 <div class="pn" style="margin-top:16px"><h4>4. WHO GETS IT</h4>
  <label>PASTE ANY EMAILS (Gmail, Yahoo, Outlook, anything), separated by commas, spaces or new lines</label><textarea id="emRec" placeholder="name@gmail.com, friend@yahoo.com"></textarea>
  <div class="cnt" id="emRc"></div>
  <label class="chk"><input type="checkbox" id="emBcc" checked> HIDE ADDRESSES FROM EACH OTHER (BCC)</label>
  <div class="two"><button class="btn" id="emBuy">ADD PAST BUYERS</button><button class="btn" id="emSave">SAVE THIS LIST</button></div>
  <div class="two" style="margin-top:8px"><button class="btn" id="emLoad">LOAD SAVED LIST</button><button class="btn" id="emCopyRec">COPY EMAILS</button></div>
 </div></div>
 <div><div class="pn"><h4>PREVIEW</h4><iframe id="emFrame" title="Email preview"></iframe></div>
 <div class="pn" style="margin-top:16px"><h4>SEND OR DROP IT IN</h4>
  <button class="btn big" id="emGm" style="width:100%">COPY FOR GMAIL + OPEN GMAIL</button>
  <div class="two" style="margin-top:8px"><button class="btn" id="emCopy">COPY FOR ANY EMAIL (RICH)</button><button class="btn" id="emMail">OPEN DEFAULT MAIL APP</button></div>
  <div class="two" style="margin-top:8px"><button class="btn" id="emCode">COPY HTML CODE</button><button class="btn" id="emDlH">DOWNLOAD .HTML</button></div>
  <div class="two" style="margin-top:8px"><button class="btn" id="emEml">DOWNLOAD .EML DRAFT</button><button class="btn" id="emTxt">COPY PLAIN TEXT</button></div>
  <div class="msg" id="emMsg">COPY FOR GMAIL puts the finished design on your clipboard and opens Gmail. Paste it into the message with Ctrl+V. It works the same way in Outlook, Yahoo and Apple Mail. Nothing is sent from here, you press send yourself.</div>
 </div></div></div>`}
function refresh(){
 if(!E.item){return}
 const c=content(),S=SUBJ[E.type];$q('#emSubj').value=c.subject;$q('#emSi').textContent='('+(E.sj%S.length+1)+'/'+S.length+')';
 $q('#emFrame').srcdoc=mailHtml();
 $q('#emRc').textContent=E.rec.length+' address'+(E.rec.length===1?'':'es')+(E.rec.length>400?' (Gmail limits how many you can send per day, split big lists)':'');
}
function fillItems(){
 const sel=$q('#emItem'),rows=E.items.filter(i=>i._k===E.kind);
 sel.innerHTML=rows.length?rows.map(r=>`<option value="${esc(r.id)}">${esc(r.title)}</option>`).join(''):'<option value="">(none yet)</option>';
 E.item=rows[0]||null;sel.onchange=()=>{E.item=rows.find(r=>String(r.id)===sel.value)||null;E.sj=E.bd=0;refresh()};refresh();
}
function wire(){
 root.querySelectorAll('[data-k]').forEach(b=>b.onclick=()=>{E.kind=b.dataset.k;b.parentNode.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));fillItems()});
 root.querySelectorAll('#emStyle [data-s]').forEach(b=>b.onclick=()=>{E.style=b.dataset.s;b.parentNode.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));refresh()});
 $q('#emType').onchange=e=>{E.type=e.target.value;E.sj=E.bd=0;refresh()};
 const bind=(id,key)=>{$q(id).oninput=$q(id).onchange=e=>{E[key]=e.target.value;refresh()}};
 bind('#emDt','dt');bind('#emWhen','when');bind('#emHead','headline');bind('#emBody','body');bind('#emCta','cta');bind('#emAddr','addr');
 $q('#emFoot').onchange=e=>{E.foot=e.target.checked;refresh()};
 $q('#emSN').onclick=()=>{E.sj++;refresh()};$q('#emBN').onclick=()=>{E.bd++;E.body='';$q('#emBody').value='';refresh()};
 $q('#emSubj').oninput=()=>{};
 $q('#emRec').oninput=e=>{E.rec=parseRec(e.target.value);refresh()};
 $q('#emBcc').onchange=e=>{E.bcc=e.target.checked};
 $q('#emBuy').onclick=async()=>{try{const r=await sb.from('orders').select('payer_email').eq('status','paid');const list=(r.data||[]).map(o=>o.payer_email).filter(Boolean);E.rec=parseRec(E.rec.join(',')+','+list.join(','));$q('#emRec').value=E.rec.join(', ');refresh();say('Added '+list.length+' past buyer emails. Only email people who are fine hearing from you, and keep the STOP line in the footer.')}catch(e){say('Could not load buyers.')}};
 $q('#emSave').onclick=()=>{try{localStorage.setItem(KEY,E.rec.join(','));say('List saved in this browser ('+E.rec.length+').')}catch(e){say('Could not save here.')}};
 $q('#emLoad').onclick=()=>{try{E.rec=parseRec(localStorage.getItem(KEY)||'');$q('#emRec').value=E.rec.join(', ');refresh();say('Loaded '+E.rec.length+' saved addresses.')}catch(e){say('Nothing saved yet.')}};
 $q('#emCopyRec').onclick=async()=>say(await copyText(E.rec.join(', '))?'Emails copied. Paste them into the To or BCC box.':'Copy failed.');
 $q('#emGm').onclick=openGmail;
 $q('#emCopy').onclick=async()=>say(await copyHtml()?'Copied. Click into any email message and press Ctrl+V.':'Copy was blocked. Use COPY HTML CODE or the .HTML file instead.');
 $q('#emMail').onclick=openMail;
 $q('#emCode').onclick=async()=>say(await copyText(mailHtml())?'HTML code copied. Paste it into Mailchimp, Brevo, MailerLite or any tool with a code or HTML block.':'Copy failed.');
 $q('#emDlH').onclick=()=>{save(slug()+'.html','text/html',mailHtml());say('Saved. Open it in a browser, select all, copy and paste into any email.')};
 $q('#emEml').onclick=()=>{save(slug()+'.eml','message/rfc822',emlFile());say('Saved. Double-click the .eml file to open it as a draft in Outlook, Apple Mail or Thunderbird, then press send.')};
 $q('#emTxt').onclick=async()=>say(await copyText(mailText())?'Plain text copied.':'Copy failed.');
}
window.emailOpen=async function(){
 css();root=document.getElementById('emailst');root.classList.add('on');
 if(!mounted){root.innerHTML=html();mounted=true;wire();
  try{const [b,p]=await Promise.all([sb.from('beats').select('*').order('created_at',{ascending:false}),sb.from('packs').select('*').order('created_at',{ascending:false})]);
   E.items=[...(b.data||[]).map(x=>({...x,_k:'beats'})),...(p.data||[]).map(x=>({...x,_k:'packs'}))]}catch(e){}
  fillItems()}
};
window.emailClose=function(){const r=document.getElementById('emailst');if(r)r.classList.remove('on')};
})();
