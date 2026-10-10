/* MZPRD MPC maker: the listening part. It turns a beat into pad hits (kick, snare, hat, toms/percs, cymbals, keys/chops).
   1. a spectrogram is split into a PERCUSSIVE part (drums) and a HARMONIC part (melody, chords, bass notes) by median filtering,
      so a piano chord never fires a snare pad and a snare never looks like a chord
   2. each instrument family gets its own onset curve, peaks are picked with a moving threshold
   3. every hit is classified from its own spectrum (low, body, mid, high, air) and how fast it dies away
   4. the time of each hit is refined on the raw sound to about a millisecond: the start of the attack, not the middle of the peak */
(function(){
'use strict';
const N=1024,HOP=256,NB=40,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
let FFT=null;
function fftPlan(){if(FFT)return FFT;const rev=new Uint16Array(N),cs=new Float64Array(N/2),sn=new Float64Array(N/2);let bits=Math.log2(N);for(let i=0;i<N;i++){let r=0;for(let b=0;b<bits;b++)if(i&(1<<b))r|=1<<(bits-1-b);rev[i]=r}for(let i=0;i<N/2;i++){cs[i]=Math.cos(-2*Math.PI*i/N);sn[i]=Math.sin(-2*Math.PI*i/N)}
 const win=new Float64Array(N);for(let i=0;i<N;i++)win[i]=.5-.5*Math.cos(2*Math.PI*i/(N-1));return FFT={rev,cs,sn,win}}
function fft(re,im){const {rev,cs,sn}=fftPlan();for(let i=0;i<N;i++){const j=rev[i];if(i<j){let t=re[i];re[i]=re[j];re[j]=t;t=im[i];im[i]=im[j];im[j]=t}}
 for(let len=2;len<=N;len<<=1){const half=len>>1,step=N/len;for(let i=0;i<N;i+=len){for(let j=0,k=0;j<half;j++,k+=step){const a=i+j,b=a+half,wr=cs[k],wi=sn[k],vr=re[b]*wr-im[b]*wi,vi=re[b]*wi+im[b]*wr;re[b]=re[a]-vr;im[b]=im[a]-vi;re[a]+=vr;im[a]+=vi}}}}
async function bandSig(mono,sr,lo,hi){const ctx=new OfflineAudioContext(1,mono.length,sr),b=ctx.createBuffer(1,mono.length,sr);b.copyToChannel(mono,0);const s=ctx.createBufferSource();s.buffer=b;let n=s;
 const add=(type,f)=>{const q=ctx.createBiquadFilter();q.type=type;q.frequency.value=f;q.Q.value=.7;n.connect(q);n=q};
 if(lo){add('highpass',lo);add('highpass',lo)}if(hi){add('lowpass',hi);add('lowpass',hi)}n.connect(ctx.destination);s.start();return (await ctx.startRendering()).getChannelData(0)}
/* sliding median over a time window for one band of a (frames x bands) array */
function medTime(M,F,NBd,w){const H=new Float32Array(M.length),h=w>>1,win=new Float32Array(w);
 for(let b=0;b<NBd;b++){let cnt=0;const srt=[];const ins=v=>{let lo=0,hi=srt.length;while(lo<hi){const m=(lo+hi)>>1;if(srt[m]<v)lo=m+1;else hi=m}srt.splice(lo,0,v)},del=v=>{let lo=0,hi=srt.length-1;while(lo<hi){const m=(lo+hi)>>1;if(srt[m]<v)lo=m+1;else hi=m}srt.splice(lo,1)};
  for(let f=0;f<Math.min(h,F);f++)ins(M[f*NBd+b]);
  for(let f=0;f<F;f++){const add=f+h,rem=f-h-1;if(add<F)ins(M[add*NBd+b]);if(rem>=0)del(M[rem*NBd+b]);H[f*NBd+b]=srt[srt.length>>1]}}
 return H}
function medFreq(M,F,NBd,w){const P=new Float32Array(M.length),h=w>>1,a=new Float32Array(w);for(let f=0;f<F;f++)for(let b=0;b<NBd;b++){let n=0;for(let k=b-h;k<=b+h;k++){if(k<0||k>=NBd)continue;a[n++]=M[f*NBd+k]}const s=Array.prototype.slice.call(a,0,n).sort((x,y)=>x-y);P[f*NBd+b]=s[n>>1]}return P}
/* onset curve peaks with a moving threshold */
function peaks(o,sr,P){const F=o.length,pre=new Float64Array(F+1),pre2=new Float64Array(F+1);for(let i=0;i<F;i++){pre[i+1]=pre[i]+o[i];pre2[i+1]=pre2[i]+o[i]*o[i]}
 const W=Math.round(1.5*sr/HOP),out=[];let last=-99;const gap=Math.max(1,Math.round(P.gap*sr/HOP));
 for(let f=2;f<F-2;f++){if(o[f]<o[f-1]||o[f]<=o[f+1]||o[f]<P.min)continue;const a=Math.max(0,f-W),b=Math.min(F,f+W),n=b-a,m=(pre[b]-pre[a])/n,sd=Math.sqrt(Math.max(0,(pre2[b]-pre2[a])/n-m*m));if(o[f]<m+P.c*sd+P.min*.5)continue;
  if(P.dom){const w=Math.round(.11*sr/HOP);let mx=0;for(let i=Math.max(0,f-w);i<=Math.min(F-1,f+w);i++)if(o[i]>mx)mx=o[i];if(o[f]<P.dom*mx)continue}
  if(f-last<gap){const q=out[out.length-1];if(q&&o[f]>q.s){q.f=f;q.s=o[f];last=f}continue}out.push({f,s:o[f]});last=f}
 return out}
/* the start of the attack on the raw sound near a rough time */
function refine(sig,sr,t0,back,fwd){const hop=32,win=96,a=Math.max(0,Math.floor((t0-back)*sr)),b=Math.min(sig.length-win-hop,Math.floor((t0+fwd)*sr));if(b-a<hop*4)return t0;
 let prevE=0,best=-1,bt=t0;const E=[];for(let i=a;i<b;i+=hop){let s=0;for(let j=0;j<win;j+=2)s+=sig[i+j]*sig[i+j];E.push(Math.log(s/win*2+1e-9))}
 for(let k=2;k<E.length;k++){const d=E[k]-E[k-2];if(d>best){best=d;bt=(a+k*hop-hop)/sr}}
 return best>.6?bt:t0}
function quant(arr,i){const s=[...arr].sort((a,b)=>a-b);return s[Math.floor(i*(s.length-1))]||0}
function bin4(v,all){if(all.length<4)return Math.min(3,Math.floor(v*4));const a=quant(all,.25),b=quant(all,.5),c=quant(all,.75);return v<a?0:v<b?1:v<c?2:3}
async function analyze(buf){const sr=buf.sampleRate,padN=2048,len0=buf.length,len=len0+padN,L=buf.getChannelData(0),R=buf.numberOfChannels>1?buf.getChannelData(1):L,mono=new Float32Array(len);for(let i=0;i<len0;i++)mono[padN+i]=(L[i]+R[i])*.5;
 const F=Math.max(0,Math.floor((len-N)/HOP)),fr=sr/N,edges=[];for(let i=0;i<=NB;i++)edges.push(40*Math.pow(17000/40,i/NB));
 const bandOf=new Int16Array(N/2+1).fill(-1);for(let k=1;k<=N/2;k++){const f=k*fr;for(let b=0;b<NB;b++)if(f>=edges[b]&&f<edges[b+1]){bandOf[k]=b;break}}
 const cen=[];for(let b=0;b<NB;b++)cen.push(Math.sqrt(edges[b]*edges[b+1]));
 /* spectrogram in 40 log bands */
 const M=new Float32Array(F*NB),re=new Float64Array(N),im=new Float64Array(N),{win}=fftPlan();
 for(let f=0;f<F;f++){const o=f*HOP;for(let i=0;i<N;i++){re[i]=mono[o+i]*win[i];im[i]=0}fft(re,im);const acc=new Float64Array(NB);for(let k=1;k<=N/2;k++){const b=bandOf[k];if(b>=0)acc[b]+=re[k]*re[k]+im[k]*im[k]}for(let b=0;b<NB;b++)M[f*NB+b]=Math.sqrt(acc[b])/N*4}
 /* drums vs melody */
 const Ht=medTime(M,F,NB,25),Pf=medFreq(M,F,NB,5),Perc=new Float32Array(M.length),Harm=new Float32Array(M.length);
 for(let i=0;i<M.length;i++){const p=Pf[i]*Pf[i],h=Ht[i]*Ht[i],w=p/(p+h+1e-12);Perc[i]=M[i]*w;Harm[i]=M[i]*(1-w)}
 const grp=(src,lo,hi)=>{const g=new Float32Array(F),idx=[];for(let b=0;b<NB;b++)if(cen[b]>=lo&&cen[b]<hi)idx.push(b);for(let f=0;f<F;f++){let s=0;for(const b of idx)s+=src[f*NB+b]*src[f*NB+b];g[f]=Math.sqrt(s)}return g};
 const gLow=grp(M,30,110),gBody=grp(Perc,110,450),gMid=grp(Perc,480,2600),gHigh=grp(Perc,2600,7000),gAir=grp(Perc,7000,18000),gHarm=grp(Harm,180,3200);
 const comb=new Float32Array(F);for(let f=0;f<F;f++)comb[f]=Math.sqrt(gMid[f]*gMid[f]+gHigh[f]*gHigh[f]);
 const LG=x=>Math.log(1+x*18),flux=g=>{const o=new Float32Array(F);for(let f=2;f<F;f++)o[f]=Math.max(0,LG(g[f])-Math.min(LG(g[f-1]),LG(g[f-2])));return o};
 const oK=flux(gLow),oS=flux(comb),oH=flux(gAir),oT=flux(gBody),oC=flux(gHarm);
 const tOf=f=>(f*HOP+N*.28)/sr+.005;
 const kSig=await bandSig(mono,sr,0,230),hSig=await bandSig(mono,sr,900,0);
 const mean=(g,f,a,b)=>{let s=0,n=0;for(let i=f+a;i<=f+b&&i<F;i++){if(i>=0){s+=g[i];n++}}return n?s/n:0};
 const norm=(list,rel,med)=>{if(!list.length)return;const s=list.map(x=>x.s).sort((a,b)=>a-b),p=med?(s[s.length>>1]||1)*2:(s[Math.floor(s.length*.92)]||1),ref=med?(s[s.length>>1]||1):p;if(rel){for(let i=list.length-1;i>=0;i--)if(list[i].s<rel*ref)list.splice(i,1)}list.forEach(x=>x.v=clamp(x.s/p,.3,1))};
 /* kicks (the low end, including 808 notes) */
 const kPk=peaks(oK,sr,{c:1.0,min:.12,gap:.14,dom:.55});const kick=kPk.map(p=>({t:refine(kSig,sr,tOf(p.f),.014,.018),s:p.s,f:p.f,t0:tOf(p.f)}));norm(kick,.4);
 /* snares and other drum hits with body and crack; very airy ones are hats */
 const sPk=peaks(oS,sr,{c:1.0,min:.12,gap:.14,dom:.5});const snare=[],hatFromS=[];
 for(const p of sPk){const f=p.f,body=mean(gBody,f,0,3),mid=mean(gMid,f,0,3),hi=mean(gHigh,f,0,3),air=mean(gAir,f,0,3),tot=body+mid+hi+air+1e-9,pa=air/tot,crack=(mid+hi)/(body+mid+hi+1e-9),t=refine(hSig,sr,tOf(f),.016,.018);
  if(pa>.45){hatFromS.push({t,s:p.s,f});continue}
  if(kick.some(k=>Math.abs(k.t-t)<.03)&&crack<.55)continue;
  snare.push({t,s:p.s,f})}
 norm(snare,.38);
 /* hats: closed ones are short, open ones and cymbals keep ringing */
 const hPk=peaks(oH,sr,{c:1.0,min:.1,gap:.05,dom:.5});let hat=[],hi=[];const cand=[];
 for(const p of hPk){const f=p.f,t=refine(hSig,sr,tOf(f),.014,.016),pk=Math.max(mean(gAir,f,0,2),1e-9),tail=mean(gAir,f,9,14)/pk,co=snare.some(s=>Math.abs(s.t-t)<.025)||kick.some(k=>Math.abs(k.t-t)<.025);cand.push({t,s:p.s,f,tail,co,cent:cenOf(Perc,f,2600,18000)})}
 const free=cand.filter(c=>!c.co).map(c=>c.s).sort((a,b)=>a-b),medFree=free.length?free[free.length>>1]:0;
 for(const c of cand){if(c.co&&c.s<1.1*medFree)continue;(c.tail>.4?hi:hat).push(c)}
 for(const x of hatFromS)if(!hat.some(h=>Math.abs(h.t-x.t)<.03))hat.push(x);
 hat.sort((a,b)=>a.t-b.t);norm(hat,.45,true);norm(hi,.3);
 if(hat.length>(len/sr)*8){hat=hat.filter(h=>h.v>.5)}
 function cenOf(S,f,lo,hi2){let s=0,w=0;for(let b=0;b<NB;b++){if(cen[b]>=lo&&cen[b]<hi2){const e=S[f*NB+b];s+=e*cen[b];w+=e}}return w?s/w:0}
 /* keys and chops: onsets in the melody part (computed first so the toms can ignore them) */
 const cPk=peaks(oC,sr,{c:2.0,min:.2,gap:.18,dom:.6});let keys=cPk.map(p=>({t:tOf(p.f)-.002,s:p.s,f:p.f,cent:cenOf(Harm,p.f,180,3200)})).filter(k=>!snare.some(sn=>Math.abs(sn.t-k.t)<.03)||k.s>1.4*oS[k.f]);norm(keys,.4);
 /* toms and percs: pitched body energy that is not a kick, a snare, a hat or a melody onset */
 const tPk=peaks(oT,sr,{c:1.4,min:.1,gap:.12,dom:.5});let mid=[];
 for(const p of tPk){const f=p.f,t=refine(hSig,sr,tOf(f),.016,.018);if(kick.some(k=>Math.abs(k.t-t)<.04)||snare.some(s=>Math.abs(s.t-t)<.04))continue;if((hat.some(h=>Math.abs(h.t-t)<.04)||hi.some(h=>Math.abs(h.t-t)<.04))&&p.s<1.8*oH[f])continue;
  let hmax=0;for(let i=f-1;i<=f+1;i++)if(i>=0&&i<F&&oC[i]>hmax)hmax=oC[i];if(p.s<1.5*hmax)continue;if([...kick,...snare,...hat,...hi].some(q=>t-q.t>.02&&t-q.t<.17))continue;mid.push({t,s:p.s,f,cent:cenOf(Perc,f,110,450)})}
 norm(mid,.8);
 const bins=(arr,key)=>{const all=arr.map(x=>x[key]);arr.forEach((x,i)=>{x.bin=bin4(x[key],all);x.i=i})};bins(mid,'cent');bins(hi,'cent');bins(keys,'cent');
 const dp=padN/sr,strip=a=>a.map(x=>({t:Math.max(0,x.t-dp),v:x.v,bin:x.bin,i:x.i}));
 const off=Math.max(0,Math.min(2,((kick[0]||snare[0]||{t:dp}).t)-dp));
 return{kick:strip(kick),snare:strip(snare),hat:strip(hat),mid:strip(mid),hi:strip(hi),keys:strip(keys),off}}
window.MZMpcDetect={analyze,tOf:null};
})();
