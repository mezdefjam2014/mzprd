/* MZPRD MPC studio: BUILD-UP. Makes a finished beat arrive in layers at its start, then carry on as the normal beat.
   The first bars of the beat are split inside one STFT (2048 samples, hop 512) into four layers that add up to exactly the original:
     MELODY  = the harmonic part (chords, samples, bass notes), kept by a median filter over time
     KICK    = the percussive part below about 170 Hz
     SNARE   = the percussive part from there up to about 7 kHz
     HATS    = the percussive part above that
   The layers come in one after another (MELODY first, then KICK, SNARE, HATS), each a quarter of the way through the build-up. Because the four masks always sum to 1, the sound at the
   end of the build-up (and everything after it) is bit for bit the original beat. */
(function(){
'use strict';
const N=2048,HOP=512,NB=N/2+1;let PL=null;
function plan(){if(PL)return PL;const rev=new Uint16Array(N),cs=new Float64Array(N/2),sn=new Float64Array(N/2),bits=Math.log2(N);for(let i=0;i<N;i++){let r=0;for(let b=0;b<bits;b++)if(i&(1<<b))r|=1<<(bits-1-b);rev[i]=r}for(let i=0;i<N/2;i++){cs[i]=Math.cos(-2*Math.PI*i/N);sn[i]=Math.sin(-2*Math.PI*i/N)}
 const win=new Float64Array(N);for(let i=0;i<N;i++)win[i]=.5-.5*Math.cos(2*Math.PI*i/N);return PL={rev,cs,sn,win}}
function fft(re,im,inv){const {rev,cs,sn}=plan();for(let i=0;i<N;i++){const j=rev[i];if(i<j){let t=re[i];re[i]=re[j];re[j]=t;t=im[i];im[i]=im[j];im[j]=t}}
 for(let len=2;len<=N;len<<=1){const half=len>>1,step=N/len;for(let i=0;i<N;i+=len){for(let j=0,k=0;j<half;j++,k+=step){const a=i+j,b=a+half,wr=cs[k],wi=inv?-sn[k]:sn[k],vr=re[b]*wr-im[b]*wi,vi=re[b]*wi+im[b]*wr;re[b]=re[a]-vr;im[b]=im[a]-vi;re[a]+=vr;im[a]+=vi}}}}
const smooth=x=>x<=0?0:x>=1?1:x*x*(3-2*x);
/* build(buf,{t0,bar,q,all}) -> {buf: a copy of buf whose first bars arrive in layers, tK,tS,tHh,tEnd}
   t0 = where the beat starts (s), bar = length of one bar (s), q = bars between layer entries, all = test mode (every layer on from the start, must equal the original) */
async function build(buf,o){const sr=buf.sampleRate,C=buf.numberOfChannels,n=buf.length,t0=Math.max(0,o.t0||0),bar=o.bar,q=o.q||1;
 const tK=t0+q*bar,tS=t0+2*q*bar,tHh=t0+3*q*bar,tEnd=Math.min(buf.duration,tHh+.5),ramp=.04;
 const a0=0,b0=Math.min(n,Math.ceil(tEnd*sr)),padS=N,len=b0-a0+2*padS,F=Math.floor((len-N)/HOP)+1,w=plan().win,norm=1/1.5;
 const chans=[];for(let c=0;c<C;c++){const x=new Float32Array(len);x.set(buf.getChannelData(c).subarray(a0,b0),padS);chans.push(x)}
 /* the spectrogram of the mix, and the two median filtered copies */
 const re=[],im=[];for(let c=0;c<C;c++){re.push(new Float32Array(F*NB));im.push(new Float32Array(F*NB))}
 const fr=new Float64Array(N),fi=new Float64Array(N),mag=new Float32Array(F*NB);
 for(let f=0;f<F;f++){for(let c=0;c<C;c++){const x=chans[c],o2=f*HOP;for(let i=0;i<N;i++){fr[i]=x[o2+i]*w[i];fi[i]=0}fft(fr,fi,false);const base=f*NB;for(let k=0;k<NB;k++){re[c][base+k]=fr[k];im[c][base+k]=fi[k]}}
  const base=f*NB;for(let k=0;k<NB;k++){let m=0;for(let c=0;c<C;c++){m+=Math.hypot(re[c][base+k],im[c][base+k])}mag[base+k]=m/C}
  if(f%200===199)await new Promise(r=>setTimeout(r,0))}
 const WT=17,WF=17,H=new Float32Array(F*NB),P=new Float32Array(F*NB),tmp=new Float32Array(Math.max(WT,WF));
 const med=(a,m)=>{for(let i=1;i<m;i++){const v=a[i];let j=i-1;while(j>=0&&a[j]>v){a[j+1]=a[j];j--}a[j+1]=v}return a[m>>1]};
 for(let k=0;k<NB;k++){for(let f=0;f<F;f++){let m=0;for(let d=-(WT>>1);d<=(WT>>1);d++){const g=f+d;if(g<0||g>=F)continue;tmp[m++]=mag[g*NB+k]}H[f*NB+k]=med(tmp,m)}if(k%256===255)await new Promise(r=>setTimeout(r,0))}
 for(let f=0;f<F;f++){for(let k=0;k<NB;k++){let m=0;for(let d=-(WF>>1);d<=(WF>>1);d++){const g=k+d;if(g<0||g>=NB)continue;tmp[m++]=mag[f*NB+g]}P[f*NB+k]=med(tmp,m)}if(f%200===199)await new Promise(r=>setTimeout(r,0))}
 /* the band masks: low pass, high pass, and the rest (they always sum to 1) */
 const lo=new Float32Array(NB),hiM=new Float32Array(NB),mid=new Float32Array(NB);for(let k=0;k<NB;k++){const fq=k*sr/N+1e-3;lo[k]=1/(1+Math.pow(fq/170,6));hiM[k]=1/(1+Math.pow(7000/fq,6));mid[k]=Math.max(0,1-lo[k]-hiM[k])}
 /* each frame: the layers' gains at that moment, then one inverse transform */
 const gain=(t,te)=>smooth((t-te)/ramp+.5),out=chans.map(()=>new Float32Array(len));
 for(let f=0;f<F;f++){const tc=(f*HOP+N/2-padS)/sr,gK=o.all?1:gain(tc,tK),gS=o.all?1:gain(tc,tS),gH=o.all?1:gain(tc,tHh),base=f*NB;
  const M=new Float32Array(NB);for(let k=0;k<NB;k++){const h=H[base+k],p=P[base+k],h2=h*h,p2=p*p,den=h2+p2+1e-12,mh=h2/den,mp=p2/den;M[k]=mh+mp*(lo[k]*gK+mid[k]*gS+hiM[k]*gH)}
  for(let c=0;c<C;c++){const rr=re[c],ii=im[c];for(let k=0;k<NB;k++){fr[k]=rr[base+k]*M[k];fi[k]=ii[base+k]*M[k]}for(let k=1;k<N/2;k++){fr[N-k]=fr[k];fi[N-k]=-fi[k]}fi[0]=0;fi[N/2]=0;fft(fr,fi,true);const oc=out[c],o2=f*HOP;for(let i=0;i<N;i++)oc[o2+i]+=fr[i]/N*w[i]*norm}
  if(f%200===199)await new Promise(r=>setTimeout(r,0))}
 const res=new AudioBuffer({numberOfChannels:C,length:n,sampleRate:sr});
 for(let c=0;c<C;c++){const d=new Float32Array(buf.getChannelData(c));d.set(out[c].subarray(padS,padS+(b0-a0)),a0);res.copyToChannel(d,c)}
 return{buf:res,tK,tS,tHh,tEnd,t0}}
window.MZMpcBuild={build};
})();
