import {musicLevel,dbGain} from './music.js?v=music-cues-4';
import {createMusicPlayer} from './music-player.js?v=music-cues-4';
// Music and effects share one master so mute and lifecycle controls apply to both.
const MASTER_VOLUME=.88;
export function createAudio(onChange=()=>{}){
  let context,master,musicGain,music,enabled=true,disposed=false;
  let scene={mode:'home',time:0,reduced:false};
  let level=musicLevel('home'),duckUntil=0,duckAmount=1,duckAttack=.015,duckRelease=.4;
  function mix(){
    if(!musicGain)return;
    const now=context.currentTime;
    musicGain.gain.cancelAndHoldAtTime(now);
    musicGain.gain.setTargetAtTime(level*(now<duckUntil?duckAmount:1),now,now<duckUntil?duckAttack:.2);
    if(now<duckUntil)musicGain.gain.setTargetAtTime(level,duckUntil,duckRelease);
  }
  function notify(){onChange({enabled,state:context?.state||'uninitialized'});}
  function initialize(){
    if(context||disposed)return;
    const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)throw Error('Audio unavailable');
    context=new Audio();master=context.createGain();master.gain.value=enabled?MASTER_VOLUME:0;master.connect(context.destination);
    musicGain=context.createGain();musicGain.gain.value=level;musicGain.connect(master);
    music=createMusicPlayer(context,musicGain);music.setScene(scene.mode,scene.time,scene.reduced);
    context.onstatechange=notify;
  }
  function resume(){
    if(!enabled||disposed)return;
    try{initialize();}catch{enabled=false;onChange({enabled:false,state:'unavailable'});return;}
    notify();
    // A browser may keep this promise pending until a trusted gesture. Do not block UI.
    return context.resume().then(()=>{if(disposed)return;master.gain.setTargetAtTime(enabled?MASTER_VOLUME:0,context.currentTime,.04);notify();}).catch(()=>{if(!disposed)notify();});
  }
  const nodes=new Set();
  function tone(freq,duration=.8,volume=.12,type='sine',endFrequency,duckDb=-2.5,release=.4){
    if(!enabled||!context||context.state!=='running')return;
    duckUntil=context.currentTime+.09;duckAmount=dbGain(duckDb);duckRelease=release;mix();
    const now=context.currentTime,osc=context.createOscillator(),gain=context.createGain();
    osc.type=type;osc.frequency.setValueAtTime(freq,now);if(endFrequency)osc.frequency.exponentialRampToValueAtTime(endFrequency,now+duration*.65);
    gain.gain.setValueAtTime(0,now);gain.gain.linearRampToValueAtTime(volume,now+.015);gain.gain.exponentialRampToValueAtTime(.0001,now+duration);
    osc.connect(gain);gain.connect(master);nodes.add(osc);osc.start(now);osc.stop(now+duration+.03);osc.onended=()=>{nodes.delete(osc);osc.disconnect();gain.disconnect();};
  }
  return {
    note:tone,drum:(strength=1)=>tone(115,.3,.24*strength,'sine',43,-.5,.2),
    receive:()=>tone(1046.5,1,.067,'sine',undefined,-3,.5),
    start:resume,
    setScene(mode,time=0,reduced=false,restart=false){scene={mode,time,reduced};music?.setScene(mode,time,reduced,restart);const next=musicLevel(reduced&&mode!=='ending'?'home':mode,time);if(next!==level){level=next;mix();}},
    hasMusic(){return !!music?.hasMusic();},
    toggle(){
      enabled=!enabled;
      if(context)master.gain.setTargetAtTime(enabled?MASTER_VOLUME:0,context.currentTime,.04);
      notify();if(enabled)resume();return enabled;
    },
    suspend(){return context?.suspend().catch(()=>{});},resume,
    clear(){duckUntil=0;mix();for(const osc of nodes){try{osc.stop();}catch{}}},
    dispose(){disposed=true;enabled=false;music?.dispose();if(context)context.onstatechange=null;for(const osc of nodes){try{osc.stop();}catch{}}return context?.close().catch(()=>{});},
    inspect(){return {enabled,state:context?.state||'uninitialized',voices:nodes.size,music:{configured:true,playing:enabled&&context?.state==='running'&&!!music?.hasMusic(),...music?.inspect(),level,ducked:!!context&&context.currentTime<duckUntil}};}
  };
}
