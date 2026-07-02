/* ============================================================
   theme.js — Bol Bachan original theme (Web Audio API)
   ------------------------------------------------------------
   100% original, royalty-free, generated live in the browser.
   A cheeky, bouncy desi loop: a plucky filmi-style riff over a
   dholak-ish groove and a descending A–G–F–E bazaar vamp.
   No audio file to download. Loops seamlessly.

   API:  BolTheme.start()  BolTheme.stop()  BolTheme.setEnabled(bool)
   Must be started from a user gesture (browser autoplay policy).
   ============================================================ */
(function (global) {
  'use strict';

  let ac=null, master=null, noiseBuf=null;
  let playing=false, timer=null, nextTime=0, step=0;

  const BPM=112, SPB=60/BPM, SIX=SPB/4;     // sixteenth-note grid
  const LOOKAHEAD=0.025, AHEAD=0.13, LEN=32; // 2 bars of 16ths
  const VOL=0.16;

  // ---- pitches (Hz) ----
  const N={ A4:440.00, G4:392.00, E4:329.63, D4:293.66, C4:261.63, C5:523.25, D5:587.33, E5:659.25, Bb4:466.16 };
  const BASS={ A:110.00, G:98.00, F:87.31, E:82.41 };
  const ROOTS=['A','A','G','G','F','F','E','E'];   // one per quarter-note (8 across 2 bars)

  // ---- sparse melody on the 16th grid (step -> note) ----
  const MEL={ 0:'A4',2:'C5',3:'D5',4:'C5',6:'A4',8:'E4',10:'G4',11:'A4',
              12:'G4',14:'E4',16:'A4',18:'C5',19:'D5',20:'E5',22:'D5',
              24:'C5',26:'A4',27:'G4',28:'A4',30:'Bb4' };
  const KICK = new Set([0,8,11,16,24,27]);
  const HAT  = new Set([2,6,10,14,18,22,26,30]);
  const TABLA= new Set([4,12,20,28,7,23]);

  function buildNoise(){
    const len=ac.sampleRate*0.5, buf=ac.createBuffer(1,len,ac.sampleRate), d=buf.getChannelData(0);
    for(let i=0;i<len;i++) d[i]=Math.random()*2-1;
    return buf;
  }

  // ---- voices ----
  function pluck(freq,t,dur,vol,type){
    const o=ac.createOscillator(), g=ac.createGain();
    o.type=type||'triangle'; o.frequency.value=freq;
    g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(vol,t+0.006);
    g.gain.exponentialRampToValueAtTime(0.0008,t+dur);
    o.connect(g).connect(master); o.start(t); o.stop(t+dur+0.02);
  }
  function bass(freq,t){
    const o=ac.createOscillator(), g=ac.createGain(), lp=ac.createBiquadFilter();
    o.type='sawtooth'; o.frequency.value=freq; lp.type='lowpass'; lp.frequency.value=420;
    g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(0.5,t+0.01);
    g.gain.exponentialRampToValueAtTime(0.0008,t+0.24);
    o.connect(lp).connect(g).connect(master); o.start(t); o.stop(t+0.28);
  }
  function kick(t){
    const o=ac.createOscillator(), g=ac.createGain();
    o.type='sine'; o.frequency.setValueAtTime(135,t); o.frequency.exponentialRampToValueAtTime(46,t+0.12);
    g.gain.setValueAtTime(0.9,t); g.gain.exponentialRampToValueAtTime(0.0008,t+0.16);
    o.connect(g).connect(master); o.start(t); o.stop(t+0.18);
  }
  function noise(t,hz,type,vol,dur){
    const s=ac.createBufferSource(), f=ac.createBiquadFilter(), g=ac.createGain();
    s.buffer=noiseBuf; f.type=type; f.frequency.value=hz; if(type==='bandpass') f.Q.value=4;
    g.gain.setValueAtTime(vol,t); g.gain.exponentialRampToValueAtTime(0.0008,t+dur);
    s.connect(f).connect(g).connect(master); s.start(t); s.stop(t+dur+0.02);
  }

  function scheduleStep(i,t){
    if(MEL[i]) pluck(N[MEL[i]], t, 0.17, 0.42, 'triangle');
    if(i%4===0) bass(BASS[ROOTS[i/4]], t);
    if(KICK.has(i)) kick(t);
    if(HAT.has(i)) noise(t, 8000, 'highpass', i%4===2?0.16:0.09, 0.03);   // hi-hat
    if(TABLA.has(i)) noise(t, 380, 'bandpass', 0.22, 0.10);               // dholak/tabla accent
  }

  function tick(){
    while(nextTime < ac.currentTime + AHEAD){
      scheduleStep(step % LEN, nextTime);
      nextTime += SIX; step++;
    }
    timer=setTimeout(tick, LOOKAHEAD*1000);
  }

  function start(){
    if(playing) return;
    if(!ac){
      const AC=global.AudioContext||global.webkitAudioContext; if(!AC) return;
      ac=new AC(); master=ac.createGain(); master.gain.value=0; master.connect(ac.destination);
      noiseBuf=buildNoise();
    }
    if(ac.state==='suspended') ac.resume();
    master.gain.cancelScheduledValues(ac.currentTime);
    master.gain.setValueAtTime(master.gain.value, ac.currentTime);
    master.gain.linearRampToValueAtTime(VOL, ac.currentTime+0.8);   // gentle fade-in
    playing=true; nextTime=ac.currentTime+0.06; tick();
  }
  function stop(){
    if(!playing) return; playing=false; clearTimeout(timer);
    if(master){ master.gain.cancelScheduledValues(ac.currentTime);
      master.gain.setValueAtTime(master.gain.value, ac.currentTime);
      master.gain.linearRampToValueAtTime(0, ac.currentTime+0.3); }
  }
  function setEnabled(on){ on?start():stop(); }

  global.BolTheme = { start, stop, setEnabled, get playing(){ return playing; } };
})(window);
