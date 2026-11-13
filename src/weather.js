import * as THREE from 'three';

import {WEATHER_MODES,nextWeather,scheduledWeather,effectiveWeather,weatherLabel} from './weatherstate.js';
export {WEATHER_MODES,nextWeather,scheduledWeather,effectiveWeather,weatherLabel};

export class WeatherSystem{
  constructor(scene){
    this.scene=scene;this.mode='auto';this.kind='clear';this.elapsed=0;this.flash=0;this.thunderCooldown=0;
    this.rainCount=1400;this.snowCount=950;
    this.rainPositions=new Float32Array(this.rainCount*3);this.snowPositions=new Float32Array(this.snowCount*3);
    this.rainSpeeds=new Float32Array(this.rainCount);this.snowSpeeds=new Float32Array(this.snowCount);
    this.makeParticleCloud('rain',this.rainPositions,this.rainSpeeds,this.rainCount,0x9edafa,1.75);
    this.makeParticleCloud('snow',this.snowPositions,this.snowSpeeds,this.snowCount,0xfff7ef,3.6);
    this.lightningLight=new THREE.PointLight(0xd7edff,0,620,1.55);
    scene.add(this.lightningLight);
    this.cloudTint=.0;
  }
  makeParticleCloud(kind,positions,speeds,count,color,size){
    const random=(n)=>{const v=Math.sin(n*81.7+11.3)*43758.5453;return v-Math.floor(v);};
    for(let i=0;i<count;i++){
      positions[3*i]=(random(i+37)-.5)*125;
      positions[3*i+1]=random(i+738)*60;
      positions[3*i+2]=(random(i+273)-.5)*125;
      speeds[i]=(kind==='rain'?23:1.9)+random(i+921)*(kind==='rain'?17:2.5);
    }
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));
    const material=new THREE.PointsMaterial({color,size,transparent:true,opacity:kind==='rain'?.66:.88,depthWrite:false,sizeAttenuation:kind==='snow'});
    const points=new THREE.Points(geometry,material);points.frustumCulled=false;points.visible=false;
    this.scene.add(points);this[kind]={points,positions,speeds,count};
  }
  setMode(mode){if(WEATHER_MODES.includes(mode))this.mode=mode;this.kind=effectiveWeather(this.mode,this.elapsed);return this.mode;}
  get label(){return weatherLabel(this.kind)+(this.mode==='auto'?' · AUTO':'');}
  thunder(){
    // Short synthetic rumble; no external audio file needed, and autoplay failure is harmless.
    try{
      const AudioContext=window.AudioContext||window.webkitAudioContext;if(!AudioContext)return;
      if(!this.audio)this.audio=new AudioContext();
      if(this.audio.state==='suspended')return;
      const duration=1.45,samples=Math.round(this.audio.sampleRate*duration),buffer=this.audio.createBuffer(1,samples,this.audio.sampleRate);
      const data=buffer.getChannelData(0);let prev=0;
      for(let i=0;i<samples;i++){prev=(prev*.98)+(Math.random()*2-1)*.02;data[i]=prev;}
      const source=this.audio.createBufferSource();source.buffer=buffer;
      const filter=this.audio.createBiquadFilter();filter.type='lowpass';filter.frequency.value=200;
      const gain=this.audio.createGain();gain.gain.setValueAtTime(.0001,this.audio.currentTime);
      gain.gain.exponentialRampToValueAtTime(.5,this.audio.currentTime+.08);
      gain.gain.exponentialRampToValueAtTime(.001,this.audio.currentTime+duration);
      source.connect(filter);filter.connect(gain);gain.connect(this.audio.destination);
      source.start();source.stop(this.audio.currentTime+duration);
    }catch{}
  }
  unlockAudio(){try{const Context=window.AudioContext||window.webkitAudioContext;if(Context&&!this.audio)this.audio=new Context();if(this.audio?.state==='suspended')this.audio.resume();}catch{}}
  update(dt,player,timecycle){
    this.elapsed+=dt;const prev=this.kind;this.kind=effectiveWeather(this.mode,this.elapsed);
    this.rain.points.visible=this.kind==='rain'||this.kind==='storm';
    this.snow.points.visible=this.kind==='snow';
    const anchorX=player.x,anchorY=player.y,anchorZ=player.z;
    for(const key of ['rain','snow']){
      const v=this[key];if(!v.points.visible)continue;
      const p=v.positions;
      for(let i=0;i<v.count;i++){
        const ix=i*3;p[ix+1]-=v.speeds[i]*dt;
        p[ix]+=dt*(key==='rain'?4.5:1.25);
        if(p[ix+1]<-2){p[ix+1]+=57;p[ix]=(Math.random()-.5)*125;p[ix+2]=(Math.random()-.5)*125;}
        if(p[ix]>63)p[ix]-=126;
      }
      v.points.position.set(anchorX,anchorY,anchorZ);
      v.points.geometry.attributes.position.needsUpdate=true;
    }
    this.flash=Math.max(0,this.flash-dt*5.2);
    this.thunderCooldown-=dt;
    if(this.kind==='storm'&&this.thunderCooldown<=0){
      this.flash=1.0;this.thunderCooldown=7+Math.random()*8;this.thunder();
    }
    this.lightningLight.intensity=this.flash*115;
    this.lightningLight.position.set(anchorX+25,anchorY+90,anchorZ-18);
    const overcast=this.kind==='storm'?.65:this.kind==='rain'?.4:this.kind==='snow'?.23:0;
    if(timecycle){
      const natural=1-timecycle.night;
      timecycle.sun.intensity*=1-overcast*.62;
      timecycle.hemi.intensity*=1-overcast*.28;
      timecycle.scene.background.lerp(new THREE.Color(0x738996),overcast*.55);
      timecycle.scene.fog.color.copy(timecycle.scene.background);
      if(this.flash>.02){timecycle.scene.background.lerp(new THREE.Color(0xd5ebff),this.flash*.48);timecycle.scene.fog.color.copy(timecycle.scene.background);}
      timecycle.stars.visible=timecycle.stars.visible&&overcast<.35;
      timecycle.moon.visible=timecycle.moon.visible&&overcast<.35;
    }
    return prev!==this.kind;
  }
}
