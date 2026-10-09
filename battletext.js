/* MZPRD Beat Battle: all the talk, finishing moves and names. Pure data and tiny helpers, so the engine, the YouTube package and the thumbnails all share them.
   {me} {opp} are fighter names, {beat} {obeat} their beat names, {gear} the fighter's gear. Lines are short so they fit speech bubbles. */
(function(){
const FIGHTERS=[
 {n:'THE BEATSMITH',v:'fierce',gear:'pad gauntlet',hue:190},
 {n:'THE DISC THROWER',v:'cocky',gear:'vinyl disc',hue:42},
 {n:'THE CRATE KING',v:'calm',gear:'record crate',hue:275},
 {n:'THE PRODIGY',v:'hype',gear:'laptop shield',hue:290},
 {n:'THE QUEEN OF KEYS',v:'fierce',gear:'keytar',hue:170},
 {n:'THE CRATE DIGGER',v:'sly',gear:'record stack',hue:265},
 {n:'THE CABLE WHIP',v:'fierce',gear:'audio cable',hue:105},
 {n:'THE NIGHT OWL',v:'calm',gear:'boombox',hue:285},
 {n:'THE DRUMMER',v:'calm',gear:'drumsticks',hue:255},
 {n:'THE HUSTLER',v:'cocky',gear:'microphone',hue:215},
 {n:'THE RED RIOT',v:'fierce',gear:'pad gauntlet',hue:330},
 {n:'THE SPINNER',v:'cocky',gear:'vinyl disc',hue:300},
 {n:'THE CRATE LORD',v:'calm',gear:'record crate',hue:85},
 {n:'THE WUNDERKID',v:'hype',gear:'laptop shield',hue:30},
 {n:'THE EMPRESS',v:'fierce',gear:'keytar',hue:80},
 {n:'THE SCAVENGER',v:'sly',gear:'record stack',hue:120},
 {n:'THE WIREMAN',v:'fierce',gear:'audio cable',hue:270},
 {n:'THE DAYDREAMER',v:'calm',gear:'boombox',hue:95},
 {n:'THE METRONOME',v:'calm',gear:'drumsticks',hue:150},
 {n:'THE BROKER',v:'cocky',gear:'microphone',hue:335}
];
/* ---------- how a producer can win ---------- */
const FINISH=[
 {id:'dropko',n:'DROP K.O.',col:'#ff2d3a',sfx:'boom',fx:'shock',lose:'slam',min:.68},
 {id:'slam808',n:'808 SLAM',col:'#ff7a1a',sfx:'boom',fx:'crack',lose:'slam',min:.68},
 {id:'bassdrop',n:'BASS DROP',col:'#8a3cff',sfx:'sub',fx:'bend',lose:'sink',min:.68},
 {id:'vinylslice',n:'VINYL SLICE',col:'#e8e8f2',sfx:'slice',fx:'slice',lose:'split',min:.68},
 {id:'sampleflip',n:'SAMPLE FLIP',col:'#19d4ff',sfx:'whoosh',fx:'flip',lose:'flip',min:.66},
 {id:'mixcrush',n:'MIXDOWN CRUSH',col:'#ffd34a',sfx:'crunch',fx:'crush',lose:'squash',min:.68},
 {id:'melodymelt',n:'MELODY MELT',col:'#ff2d8a',sfx:'wob',fx:'melt',lose:'melt',min:.66},
 {id:'looplock',n:'LOOP LOCK',col:'#3dffa0',sfx:'chain',fx:'chains',lose:'bound',min:.66},
 {id:'hihat',n:'HI-HAT FLURRY',col:'#ffe28a',sfx:'flurry',fx:'flurry',lose:'shake',min:.57,max:.7},
 {id:'snare',n:'SNARE SNAP',col:'#ffffff',sfx:'snap',fx:'snap',lose:'shake',min:.57,max:.7},
 {id:'decision',n:'JUDGES DECISION',col:'#b8c4ff',sfx:'bell',fx:'raise',lose:'slump',min:.52,max:.62},
 {id:'photo',n:'PHOTO FINISH',col:'#ffd34a',sfx:'bell',fx:'raise',lose:'slump',min:0,max:.55},
 {id:'flawless',n:'FLAWLESS VICTORY',col:'#ffd34a',sfx:'fanfare',fx:'gold',lose:'slam',min:.82},
 {id:'upset',n:'UPSET!',col:'#3dffa0',sfx:'fanfare',fx:'upset',lose:'slump',min:.5}
];
const pickFinish=(pct,seed,opts)=>{opts=opts||{};if(opts.force&&opts.force!=='auto'){const f=FINISH.find(x=>x.id===opts.force);if(f)return f}
 if(pct>=.82)return FINISH.find(x=>x.id==='flawless');
 const pool=FINISH.filter(f=>f.id!=='flawless'&&f.id!=='upset'&&pct>=f.min&&(f.max==null||pct<=f.max));
 const list=pool.length?pool:[FINISH.find(x=>x.id==='photo')];return list[Math.abs(seed|0)%list.length]};
/* ---------- the talk ---------- */
const PRE={
 cocky:['I eat beats like this for breakfast.','Pick me now and save yourself time.','This one is already over, {opp}.','My {gear} has never lost.','Sit down, {opp}, class is in session.','You brought {obeat}? Cute.','I made {beat} half asleep.','Tell the crowd goodbye, {opp}.','Warm up all you want. It is my room.','Easy money. Next!','I do not lose. I just win different.','Say hello to the champ, {opp}.','Better beat? Nobody asked.','I came to collect.','You can pick second place, {opp}.'],
 calm:['No rush, {opp}. The beat speaks.','I will let the music decide.','Breathe in. This will be quick.','Patience wins every battle.','Quiet confidence, loud bass.','May the best beat win.','I respect you, {opp}. Still winning.','Let us see what you made.','I trust {beat}. It trusts me.','No talk. Just a clean beat.','Calm hands, heavy drums.','The crowd already knows.','I have been waiting for this.','Silence first, then the drop.'],
 hype:['LET US GOOOO!','I have been training for this!','Beat battle time, baby!','{opp}, I am NOT scared!','This is my moment!','Turn it UP!','I made {beat} on pure energy!','My {gear} is READY!','Watch this, chat!','First round, first win!','Somebody call my mom!','Crowd, make some noise!','I am so hyped right now!','Today is my day!'],
 sly:['Heard {obeat} before. Suspicious.','I flipped something rare for this one.','Let me show you a trick, {opp}.','Digging deep, as always.','I found this sound last week.','You will not hear this coming.','Hope you like surprises.','I have a few tricks in the crate.','Every sample has a story.','Try to guess my secret.','Let us see who flips it better.','Hold my {gear}.','{opp}, take notes.'],
 fierce:['I came here to FIGHT.','Bring your best, {opp}.','My {gear} is hungry.','No mercy, no loops.','You are about to feel this one.','Round one starts NOW.','Stand your ground, {opp}.','I am built for this.','{beat} hits harder than you.','Step up or step off.','I do not play at this.','Let the drums decide.','Show me what you got.','Ready when you are.']
};
const WIN={
 cocky:['Told you. Not close.','Next victim, please.','That was a warm-up.','Send me a real challenge.','I make this look easy.','Mercy rule? Nah.','Ghost of beats past: you.','Frame this win.'],
 calm:['A good battle. Thank you.','The beat did the talking.','Peace, {opp}.','Humble and heavy.','I felt that one land.','On to the next round.','No celebration. Just focus.','Respect to both beats.'],
 hype:['WE DID IT!','I CANNOT BELIEVE IT!','Tell everybody!!','Best day EVER!','Round won, let us GO!','Crowd, you are amazing!','Again, again, again!','I am shaking!'],
 sly:['Told you I had a trick.','You did not see that coming.','The crate never lies.','Sample secured.','Flipped it, flipped you.','Learn from the best digger.','Dig deeper next time.','Another one for the shelf.'],
 fierce:['That is how it is done.','Do not forget this name.','Stay down, {opp}.','Victory is mine.','Next fighter, step up.','My {gear} wins again.','I told you. No mercy.','On to the next one.']
};
const LOSE={
 cocky:['I was going easy on you.','Rematch. Right now.','The crowd got it wrong.','Whatever. I still look good.','Lucky break, {opp}.','I will be back louder.'],
 calm:['A fair result. Well played.','I learned something today.','The best beat won. Respect.','No excuses. Good battle.','I will adjust and return.','The crowd has spoken.'],
 hype:['NOOOOO!','That is not fair, ha!','I gave it everything!','Next time, next time!','I am okay, I am okay!','Can we run it back?!'],
 sly:['Hmm. I misread the crowd.','You got me this time.','Noted, {opp}. Noted.','I will dig for a better one.','That one was close, admit it.','Back to the crates.'],
 fierce:['This is not over.','I will train harder.','Well fought, {opp}.','You earned it. This time.','I fell, but I will rise.','Remember my name.']
};
const CHAMP=['I AM THE CHAMPION!','Crown me. I earned it.','Every round, every beat. Mine.','Thank you all for the votes!','This crown is for the crowd.','Top of the bracket, where I belong.','Bow down to the bass.','Nobody could stop {beat}.','The throne is mine.','Check my chain. I won.'];
const ROUND_INTRO=['ROUND {r}','ROUND {r}: BEAT THE ODDS','ROUND {r}: NO MERCY','ROUND {r}: DROP THE HAMMER','ROUND {r}: GET READY','ROUND {r}: THE CROWD DECIDES','ROUND {r}: LOCK IN','ROUND {r}: BASS ONLY'];
const FIGHT_CALL=['FIGHT!','DROP IT!','GO!','BEAT IT!','LET IT RIP!','HIT PLAY!','BATTLE!','ROLL IT!'];
const VOTE_CALL=['WHO WINS?','YOU DECIDE!','PICK A SIDE!','VOTE NOW!','WHOSE BEAT HITS HARDER?','CAST YOUR VOTE!','THE CROWD CALLS IT!','CHOOSE YOUR FIGHTER!'];
const RESULT_CALL=['AND THE WINNER IS...','THE CROWD HAS SPOKEN!','THE VOTES ARE IN!','IT IS OFFICIAL!','HERE ARE THE RESULTS!','THE VERDICT!'];
const MID_BEAT=['THAT BASS!','CLEAN!','OHHH!','HEAVY!','WHAT A SNARE!','SMOOTH!','TOO HARD!','LISTEN TO THAT!','SO NICE!','FIRE!','WHOA!','THOSE DRUMS!','CRISP!','GROOVY!','YES!','CRAZY!','HEAD NOD!','KNOCKS!','DIRTY!','ROLLING!'];
const NEXT_TEASE=['WHO MOVES ON? FIND OUT NEXT EPISODE!','THE BRACKET IS BURNING. RESULTS NEXT!','VOTE NOW. RESULTS DROP NEXT EPISODE!','YOUR VOTES DECIDE EVERYTHING!','COMMENT 1 OR 2 FOR EVERY MATCH!'];
/* ---------- a seeded "bag": never repeats a line until the bag is empty ---------- */
function rng(seed){let a=(seed|0)+0x6D2B79F5;return()=>{a=Math.imul(a^a>>>15,1|a);a^=a+Math.imul(a^a>>>7,61|a);return((a^a>>>14)>>>0)/4294967296}}
function bag(list,seed){const r=rng(seed);let pool=[];return()=>{if(!pool.length)pool=list.map((_,i)=>i).sort(()=>r()-.5);return list[pool.pop()]}}
const fill=(s,v)=>String(s).replace(/\{(\w+)\}/g,(m,k)=>v[k]==null?m:v[k]);
const COUNT=()=>[PRE,WIN,LOSE].reduce((t,o)=>t+Object.values(o).reduce((a,l)=>a+l.length,0),0)+CHAMP.length+ROUND_INTRO.length+FIGHT_CALL.length+VOTE_CALL.length+RESULT_CALL.length+MID_BEAT.length+NEXT_TEASE.length;
window.MZBattleText={FIGHTERS,FINISH,PRE,WIN,LOSE,CHAMP,ROUND_INTRO,FIGHT_CALL,VOTE_CALL,RESULT_CALL,MID_BEAT,NEXT_TEASE,pickFinish,bag,fill,rng,COUNT};
})();
