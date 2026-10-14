/* MZPRD MPC maker: the PACKAGE GENERATOR. Makes dozens or hundreds of complete YouTube packages (title, thumbnail words, description, tags, pinned comment, Shorts text)
   from different "angles", scores each one, and explains why.
   What the research says it follows (YouTube help + type-beat and title guides; a lot of it is vendor data, so the numbers are directional):
   - search titles: artist + "type beat" first, keywords in the first 3-5 words, about 60 characters so mobile does not cut it
   - curiosity titles tease the payoff without giving it away; restraint beats hype; a number only helps when it is a concrete promise
   - title, thumbnail and the first 30 seconds must promise the same thing, because YouTube's Test & Compare picks the winner by WATCH TIME, not clicks
   - description: the first 150 characters hold the hook and the buy link; BPM, key, mood and the artist it fits come after; only 3 hashtags
   - tags matter least; pinned comment should ask a question that is easy to answer
   - small, less crowded artists (or pairs of them) are easier to rank for than the biggest names */
(function(){
'use strict';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const hs=(n,s)=>{const x=Math.sin((n+1)*127.1+(s||0)*311.7)*43758.5453;return x-Math.floor(x)};
const slug=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
const cap=s=>String(s||'').replace(/\b\w/g,c=>c.toUpperCase());
const CROWDED=['drake','travis scott','kanye west','kanye','future','juice wrld','lil baby','lil uzi vert','pop smoke','kendrick lamar','j cole','nba youngboy','polo g','central cee','21 savage','metro boomin','gunna','young thug','lil durk','roddy ricch','eminem','jay-z','nas'];
const MOODS=['hard','dark','dusty','gritty','smooth','soulful','emotional','melodic','cinematic','raw','moody','lo-fi','smoky','nostalgic','heavy','mellow'];
const GEARS=['Akai MPC60 II','MPC60','1988 MPC','Roger Linn MPC60'];
const artistsOf=str=>String(str||'').split(/\s*(?:,|\bx\b|&|\/|\+)\s*/i).map(s=>s.trim()).filter(Boolean).slice(0,6);
const ANGLES={
 search:{n:'SEARCH',why:'Built for people typing "[artist] type beat". Artist and keyword first, short enough for mobile.'},
 curiosity:{n:'CURIOSITY',why:'Teases a payoff without giving it away, so the click is a question the viewer wants closed.'},
 mpc:{n:'MPC STORY',why:'Leads with the machine and the live pad performance. This is what makes your videos different from every other type beat.'},
 promise:{n:'PROMISE',why:'A concrete promise or number (BPM, pads, minutes). Numbers only help when they promise something real.'},
 question:{n:'QUESTION',why:'Asks who the beat is for. It invites a comment, and comments help the video.'},
 challenge:{n:'MAKING IT',why:'"I made..." and "making..." titles pull people who like to watch the process, and the pads are the process.'},
 use:{n:'FOR RAPPERS',why:'Speaks to the buyer: someone who wants to rap or write to a beat. That is who purchases.'},
 series:{n:'SERIES',why:'A repeating format builds a habit. Series get recommended together.'}};
const ORDER=Object.keys(ANGLES);
/* title templates; {A} artists, {A1} first artist, {A2} second artist, {T} beat name, {mood}, {mood2}, {bpm}, {key}, {year}, {gear}, {N} beats in a tape, {mins}, {n} episode */
const TITLES={
 search:['{A} Type Beat "{T}" | {year}','{A} Type Beat {year} - "{T}" ({mood} Boom Bap)','{mood} {A} Type Beat "{T}"','{A1} x {A2} Type Beat - "{T}"','{A1} Type Beat "{T}" ({bpm} BPM {key})','Hard {A} Type Beat {year} "{T}" (Prod. MZPRD)','{A} Type Beat | "{T}" | MPC Boom Bap','"{T}" - {A} Type Beat {year}','{mood} Boom Bap Type Beat "{T}" ({A} Style)','{A1} Type Beat {year} ({mood} {mood2}) - {T}'],
 curiosity:['This {mood} Beat Was Played Live on a 1988 MPC','Nobody Makes Beats Like This Anymore ("{T}")','Why Boom Bap Hits Different on a Real MPC','The Beat {A1} Would Have Used ("{T}")','You Can Hear the MPC in This One ("{T}")','I Did Not Expect This Beat to Sound Like This ("{T}")','The Secret to {mood} Boom Bap Is the Pads ("{T}")','What a 1988 MPC Sounds Like in {year}'],
 mpc:['MPC60 Live Pad Performance - "{T}" ({A} Type Beat)','Watch the Pads: "{T}" on the {gear}','{gear} Beat Making: "{T}" | {mood} Boom Bap','Roger Linn {gear} Boom Bap Beat ("{T}")','Playing "{T}" Live on the {gear} (Every Pad on Screen)','{mood} Boom Bap on the {gear} | "{T}"','All Pads, No Computer: "{T}" on the MPC60','MPC60 II Pad Performance | {A} Type Beat "{T}"'],
 promise:['{bpm} BPM of {mood} Boom Bap on the MPC60 ("{T}")','16 Pads. One Beat. "{T}" Played Live on the MPC60','{bpm} BPM {key} - {mood} {A} Type Beat "{T}"','One MPC, 16 Pads, {mins} Minute{s}: "{T}"','{N} {mood} Boom Bap Beats Played Live on an MPC60 ({mins} Min)','{mins} {Mins} of {mood} MPC60 Boom Bap ({N} Beats)','{N} Beats, One MPC60: {T}'],
 question:['Would {A1} Rap on This? ("{T}")','Who Should Get This Beat? "{T}" ({A} Type Beat)','Can You Hear the MPC? "{T}"','Who Is This Beat For? "{T}" ({mood} Boom Bap)','{A1} or {A2}? Who Wins on "{T}"','Which Rapper Needs This Beat? ("{T}")'],
 challenge:['I Made a {A} Type Beat on a 1988 MPC60 ("{T}")','Making a {mood} Beat on the Akai MPC60 II: "{T}"','I Played This {mood} Beat Live on the MPC60 ("{T}")','Making a {A} Type Beat With Only an MPC ("{T}")','Boom Bap Beat Made on a 1988 MPC - "{T}"','I Made {N} Beats on One MPC60 ({mins} {Mins})'],
 use:['{mood} Beat for Rappers Who Want That Boom Bap Sound ("{T}")','Hard Boom Bap Instrumental to Rap Over - "{T}"','Late Night {mood} Beat to Write To ("{T}")','{mood} Rap Instrumental ({A} Type) - "{T}"','Boom Bap Instrumental for Freestyle ({bpm} BPM) - "{T}"','Beat to Rap Over: {mood} {A} Type Beat "{T}"'],
 series:['MPC Beat of the Week: "{T}"','Beat #{n} on the MPC60: "{T}"','MPC60 Sessions: "{T}" ({A} Type Beat)','The MPC Tape #{n}: {T}','MZPRD MPC Sessions - "{T}"']};
const TAPE_T={
 search:['{N} {A} Type Beats {year} | {T}','{A} Type Beat Tape {year} - {N} Beats ({mood} Boom Bap)','{N} {mood} {A} Type Beats | MPC60 Beat Tape','{A} Type Beat Tape | {T} ({N} Beats)'],
 curiosity:['I Put {N} MPC60 Beats in One Tape and This Happened','What {N} Beats on a 1988 MPC Sound Like Back to Back','{mins} {Mins} of Boom Bap That Sounds Like It Came From 1993'],
 mpc:['{N} Beats Played Live on the MPC60: {T}','Watch the Pads: {N} Boom Bap Beats on the {gear}','{T} - {N} Beats, One {gear}'],
 promise:['{mins} {Mins} of {mood} Boom Bap: {N} Beats on the MPC60','{N} Beats in {mins} {Mins}: {T}','{N}-Beat MPC60 Tape ({mood} Boom Bap {year})'],
 question:['Which Beat Is Your Favorite? {N} Beats on the MPC60 ({T})','Pick Your Favorite: {N} MPC60 Beats ({T})','Which One Is Best? {N} Boom Bap Beats, Numbers in the Comments'],
 challenge:['I Made {N} Beats on One MPC60: {T}','{N} Beats Played Live on a 1988 MPC ({mins} {Mins})','Making {N} {mood} Beats on the MPC60 ({T})'],
 use:['{N} {mood} Beats to Rap Over ({mins} Min Boom Bap Mix)','Boom Bap Instrumentals to Freestyle To: {T} ({N} Beats)','{mins} {Mins} of {mood} Instrumentals to Write To'],
 series:['MPC Tape #{n}: {T} ({N} Beats)','{T} | MPC Sessions','The MPC Tape Vol. {n}: {N} Beats']};
const OPEN={
 search:['{A} type beat "{T}", played live on the {gear}.','Looking for a {A} type beat? "{T}" is {mood.l} boom bap on a real MPC.','"{T}" - {mood.l} {A} type beat. Watch every pad hit as it plays.'],
 curiosity:['Watch the pads: every hit you see is a hit you hear. "{T}" on the {gear}.','A 1988 MPC, 16 pads and one {mood.l} beat. "{T}".','This is what boom bap sounds like on a real MPC. "{T}".'],
 mpc:['"{T}" played live on the {gear}. Every pad pushing in is a hit from the beat.','{gear} pad performance: "{T}", {mood.l} boom bap.','Real MPC, real pads: "{T}".'],
 promise:['{bpm} BPM, {key}, {mood.l} boom bap: "{T}" on the {gear}.','"{T}": {mood.l} instrumental at {bpm} BPM, played live on an MPC60.'],
 question:['Who should rap on "{T}"? {A} type beat, played live on the {gear}.','"{T}": would {A1} rap on this? Tell me in the comments.'],
 challenge:['I played "{T}" live on a 1988 MPC60. No computer on screen, just pads.','Making "{T}" on the {gear}: {mood.l} boom bap.'],
 use:['{mood} instrumental to rap over: "{T}", {bpm} BPM. Lease it below.','A {mood.l} beat for writing and freestyles: "{T}".'],
 series:['MPC Sessions: "{T}", played live on the {gear}.','Another beat from the MPC: "{T}".']};
const PIN={
 search:['Who would sound best on "{T}"? {A} or somebody else? Lease it here: {link}','Drop your favorite rapper and I will make the next {A} type beat for them. Get this one: {link}'],
 curiosity:['What did you hear first, the kick or the snare? Lease "{T}": {link}','Which pad hit hardest? Tell me below. Lease "{T}": {link}'],
 mpc:['Which pad hit hardest? Tell me in the comments. Lease "{T}": {link}','Want the next one on the MPC? Tell me the vibe. This one: {link}'],
 promise:['What BPM should I make next? This one is {bpm}. Lease "{T}": {link}','Type your favorite BPM below. Lease "{T}": {link}'],
 question:['Who should get this beat? Comment a name. Lease "{T}": {link}','Vote below: who sounds best on "{T}"? Lease it: {link}'],
 challenge:['Should I do this live again? Tell me the beat you want next. This one: {link}','Which pad hit hardest? Lease "{T}": {link}'],
 use:['Rappers: send me what you wrote on "{T}". Lease it here: {link}','Use this one to write? Tell me what you made. Lease "{T}": {link}'],
 series:['Which MPC session should be next? Tell me below. This one: {link}','What should #{n} be? Comment a vibe. Lease "{T}": {link}']};
const THUMB={search:['TYPE BEAT','{A1} TYPE BEAT','{mood} TYPE BEAT','BOOM BAP'],curiosity:['WAIT FOR IT','1988 MPC','REAL MPC','NO COMPUTER'],mpc:['LIVE ON MPC','WATCH THE PADS','MPC60 LIVE','PAD PERFORMANCE'],promise:['{bpm} BPM','16 PADS','{N} BEATS','BOOM BAP'],question:['WHO GETS THIS?','{A1}?','FOR WHO?'],challenge:['MADE ON MPC','1988 MPC','LIVE ON MPC'],use:['BEAT TO RAP ON','{mood} BEAT','FREESTYLE BEAT'],series:['MPC SESSIONS','BEAT #{n}','MPC TAPE']};
/* MORE VARIATIONS (patterns producers use that rank and get clicks: artist + type beat + mood/genre + year up front, two-artist pairs,
   "free"-style use cases like freestyle / to rap on / for a demo, up-and-coming artists, short under 60 characters) */
const MORE={
 search:['{A} Type Beat {year} - {mood} Boom Bap | "{T}"','{A1} x {A2} Type Beat {year} "{T}" | {mood} {mood2}','[NEW] {A} Type Beat "{T}" {year}','{A} Type Beat - "{T}" ({mood} Sample Beat)','{A1} Type Beat - "{T}" | {bpm} BPM','"{T}" | {A} Type Beat {year} | Prod. MZPRD','{mood} {mood2} {A} Type Beat "{T}"','{A} Type Beat "{T}" | Dusty Sample Boom Bap','{A} Boom Bap Type Beat {year} - {T}','{A1} Type Beat "{T}" ({mood} Underground Boom Bap)','{A} Type Beat {year} "{T}" | Grimy East Coast','Soulful {A} Type Beat "{T}" | {year}'],
 curiosity:['This Beat Has No Computer In It ("{T}")','The Kick on This Beat Is Illegal ("{T}")','I Wasn\'t Supposed to Make This Beat ("{T}")','One Sample, One MPC, One Take ("{T}")','The Most {mood} Beat I\'ve Made This Year','Listen to the Snare at 0:30 ("{T}")','This Beat Sounds Like a Lost 90s Tape','Why Rappers Keep Asking for This Beat ("{T}")'],
 mpc:['Making "{T}" on the {gear} (No Computer)','{gear} Live: "{T}" ({mood} Boom Bap)','Every Hit Played by Hand: "{T}" on the {gear}','1988 Drum Machine, {year} Beat: "{T}"','Late Night {gear} Session: "{T}"','The {gear} Still Goes Crazy ("{T}")'],
 promise:['{bpm} BPM {mood} Boom Bap Beat to Rap On ("{T}")','A Beat You Can Write a Whole Song To ("{T}")','{mood} Beat With Hard Drums | {bpm} BPM | {key}','Instant Classic Boom Bap: "{T}" ({year})','{mins}-Minute {mood} Instrumental for Your Next Verse'],
 question:['Would {A1} Rap on This? ("{T}")','Is This the Hardest Boom Bap Beat of {year}?','{A1} or {A2}: Who Kills This Beat?','What Would You Name This Beat? (Mine: "{T}")','Too Dusty for {year}? ("{T}")'],
 challenge:['I Flipped a Record I Found for $1 ("{T}")','Making a {A1} Type Beat From Scratch on the MPC','I Made a Beat in 10 Minutes on a 1988 MPC','Cooking Up "{T}" Live (No Edits)','From Sample to Finished Beat: "{T}"'],
 use:['Freestyle Beat | {mood} {A} Type Beat "{T}"','Beat to Rap On | {mood} Boom Bap "{T}" {year}','Rap Instrumental With Hook Space | "{T}"','Battle Rap Beat | {mood} Boom Bap {year} ("{T}")','Writing Beat: {mood} {A} Type Beat "{T}"','Demo Beat for Rappers | "{T}" ({bpm} BPM)'],
 series:['MPC Sessions Ep. {n}: "{T}"','Dusty Drums #{n}: "{T}"','The Basement Tapes Vol. {n}: "{T}"','Beat of the Week #{n} | {A} Type Beat "{T}"'],
 vibe:['Late Night {A} Type Beat "{T}" | Rainy {mood} Boom Bap','{A} Type Beat for 3AM Drives ("{T}")','Smoke Session Beat | {mood} {A} Type Beat "{T}"','Rainy City Boom Bap | {A} Type Beat "{T}"','Cold Winter {A} Type Beat {year} ("{T}")','Basement Vibes | {mood} Boom Bap "{T}"']};
const MORE_TAPE={vibe:['{mins} {Mins} of Late Night Boom Bap | {N} {A} Type Beats','Rainy Night Beat Tape | {N} {mood} Beats ({T})','3AM Drive Tape: {N} {A} Type Beats']};
const MORE_OPEN={vibe:['Late night, lights low: "{T}", {mood.l} boom bap on the {gear}.','Put this on for the 3AM drive. "{T}" played live on the {gear}.'],use:['Made for writing: "{T}" leaves room for the verse and the hook.','Freestyle to "{T}": {mood.l}, {bpm} BPM, every pad live on the {gear}.']};
const MORE_PIN={vibe:['Where are you listening to this? Lease "{T}": {link}','Rate the vibe 1-10. Lease "{T}": {link}'],use:['Drop 4 bars to this in the comments. Lease "{T}": {link}','Post your freestyle to "{T}" and tag me. Lease it: {link}']};
const MORE_THUMB={vibe:['LATE NIGHT','3AM BEAT','RAINY BOOM BAP','SMOKE SESSION'],search:['{year} TYPE BEAT','{A1} X {A2}'],curiosity:['NO COMPUTER','ONE TAKE','LOST 90S TAPE'],use:['RAP ON THIS','WRITING BEAT','BATTLE BEAT']};
ANGLES.vibe={n:'VIBE / SCENE',why:'Sells a moment (late night, rain, 3AM drive). Mood searches and "beats to write to" playlists pull these.'};if(!ORDER.includes('vibe'))ORDER.push('vibe');
for(const k in MORE)TITLES[k]=(TITLES[k]||[]).concat(MORE[k]);for(const k in MORE_TAPE)TAPE_T[k]=(TAPE_T[k]||[]).concat(MORE_TAPE[k]);TAPE_T.vibe=TAPE_T.vibe||[];
for(const k in MORE_OPEN)OPEN[k]=(OPEN[k]||[]).concat(MORE_OPEN[k]);for(const k in MORE_PIN)PIN[k]=(PIN[k]||[]).concat(MORE_PIN[k]);for(const k in MORE_THUMB)THUMB[k]=(THUMB[k]||[]).concat(MORE_THUMB[k]);
function fillT(t,c){return t.replace(/\{([A-Za-z0-9.]+)\}/g,(m,k)=>{if(k==='mood.l')return c.mood.toLowerCase();const v=c[k];return v==null?'':String(v)})}
function tidy(t){return t.replace(/\s+/g,' ').replace(/\(\s*\)/g,'').replace(/\s+([,)\]])/g,'$1').replace(/\s*\|\s*/g,' | ').replace(/\(\s+/g,'(').replace(/\|\s*\|/g,'|').replace(/\s*[-|]\s*$/,'').replace(/^\s*[-|]\s*/,'').replace(/ x\s+Type/,' Type').replace(/\s+/g,' ').trim()}
function usable(t,c){if(/ or \?|\? \(|\(\?|x \)/.test(t)||/or\s*\?/.test(t))return false;const xs=t.split(/\s+x\s+/i).map(q=>q.toLowerCase().replace(/[^a-z0-9 ]/g,'').trim().split(/\s+/).slice(-2).join(' '));if(new Set(xs).size<xs.length&&xs.length>1)return false;if(/\{|\}/.test(t))return false;if(/undefined|NaN/.test(t))return false;if(/\bBPM\b/.test(t)&&!c.bpm)return false;if(/\b0 BPM\b/.test(t))return false;if(/ x\s*(Type|\(|"|$)/.test(t))return false;return true}
function scoreTitle(angle,t,c){let s=48;const L=t.length,low=t.toLowerCase(),i=low.indexOf('type beat');
 if(L<=60)s+=14;else if(L<=70)s+=8;else if(L<=85)s+=1;else if(L<=100)s-=8;else s-=40;
 if(c.A&&low.indexOf(c.A1.toLowerCase())>=0&&low.indexOf(c.A1.toLowerCase())<28)s+=12;
 if(i>=0&&i<46)s+=7;if(/mpc/i.test(t))s+=7;if(t.indexOf(String(c.year))>=0)s+=3;
 if(angle==='search'){s+=c.A?10:-8}
 if(angle==='curiosity')s+=6;if(angle==='challenge')s+=5;if(angle==='mpc')s+=6;if(angle==='question')s+=3;if(angle==='promise'&&/\d/.test(t))s+=4;
 if(c.crowded&&angle==='search')s-=5;
 if(/[?!]{2,}|ALL CAPS|FREE FOR/i.test(t))s-=10;if(t===t.toUpperCase()&&/[A-Z]{12,}/.test(t))s-=12;
 if(/\(.+\)|\[.+\]/.test(t))s+=2;
 return clamp(Math.round(s),0,100)}
function mkCtx(ST,info,v,k){const AR=artistsOf(ST.artist),A=AR.join(' x '),year=new Date().getFullYear(),r=n=>hs(n,v*977+k*13+info.seedBase),m1=MOODS[Math.floor(r(1)*MOODS.length)],m2=MOODS[(MOODS.indexOf(m1)+3+Math.floor(r(2)*4))%MOODS.length];
 const pairs=[];for(let i=0;i<AR.length;i++)for(let j=i+1;j<AR.length;j++)pairs.push([AR[i],AR[j]]);
 const pick=pairs.length?pairs[Math.floor(r(3)*pairs.length)]:[AR[0]||'',AR[1]||''];
 const useSingle=AR.length>1&&r(4)<.35;const first=useSingle?AR[Math.floor(r(5)*AR.length)]:pick[0],second=useSingle?'':pick[1];
 const AA=AR.length?(useSingle?first:(second?first+' x '+second:first)):'';
 return{AR,A:AR.length?AA:'',A1:first||'',A2:second||'',T:info.title,mood:cap(m1),mood2:cap(m2),bpm:info.bpm||'',key:info.key||'',year,gear:GEARS[Math.floor(r(6)*GEARS.length)],N:info.N||1,mins:info.mins||1,Mins:(info.mins||1)===1?'Minute':'Minutes',s:(info.mins||1)===1?'':'s',n:info.n||Math.floor(r(7)*40)+1,link:info.link,crowded:!!first&&CROWDED.includes(first.toLowerCase())}}
/* one package */
function makeOne(ST,info,angle,v,k){const c=mkCtx(ST,info,v,k),r=n=>hs(n,v*131+k*29+7+info.seedBase);
 let list=TITLES[angle].slice();if(info.tape)list=TAPE_T[angle].concat(list.filter(t=>!/\"\{T\}\"/.test(t)&&!/\{N\}/.test(t)));else list=list.filter(t=>!/\{N\}/.test(t));
 for(let q=0;q<list.length;q++){const idx=(Math.floor(r(10)*list.length)+q)%list.length;let t=tidy(fillT(list[idx],c));if(!c.A)t=t.replace(/\b(Type Beat)\b/,'Type Beat');if(usable(t,c)&&t.length<=100){var title=t;break}}
 if(!title)return null;
 const open=tidy(fillT(OPEN[angle][Math.floor(r(11)*OPEN[angle].length)],c)),pin=tidy(fillT(PIN[angle][Math.floor(r(12)*PIN[angle].length)],c)),thumb=tidy(fillT(THUMB[angle][Math.floor(r(13)*THUMB[angle].length)],c)).toUpperCase();
 return{angle,title,score:scoreTitle(angle,title,c),open,pin,thumb,ctx:c}}
function desc(ST,info,p,base){const lines=base.split('\n');const link=info.link,first=(p.open+' '+(info.tape?'Every beat is linked below.':'Lease it here: '+link)).slice(0,300);
 const body=lines.slice(1);return [first].concat(body).join('\n')}
function generate(ST,info,n,seed,only,YT){const out=[],seen=new Set(),angles=(only&&only.length?only:ORDER);let guard=0;
 while(out.length<n&&guard<n*12){const k=guard++,angle=angles[k%angles.length],p=makeOne(ST,info,angle,seed,k);if(!p)continue;const key=p.title.toLowerCase();if(seen.has(key))continue;seen.add(key);
  const ST2=Object.assign({},ST,{yt:Object.assign({},ST.yt,{v:seed*53+k})});
  const baseObj=info.tape?YT.buildTape(ST2,info.TP):YT.build(ST2,info.beat,info.S);
  p.desc=desc(ST,info,p,baseObj.desc);p.tags=baseObj.tags;p.shorts=baseObj.shorts||null;p.why=ANGLES[angle].why;p.angleName=ANGLES[angle].n;out.push(p)}
 return out}
window.MZMpcGen={generate,ANGLES,ORDER,artistsOf,CROWDED};
})();
