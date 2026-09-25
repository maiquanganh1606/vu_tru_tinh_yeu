import {musicCues} from './music.js?v=music-cues-4';

// Short decoded cues share the AudioContext clock with effects: suspend freezes all sources.
export function createMusicPlayer(context,destination){
  const buffers=new Map(),tracks=new Set(),requests=new AbortController();
  let desired=null,offset=0,active=null,generation=0,disposed=false,failed=false,ending=false;
  function fade(param,from,to,at,duration){
    // Rapid seeks can schedule a second fade at the same timestamp. Cancel the
    // old automation before adding a new ramp so Chromium does not reject an
    // overlapping setValueCurveAtTime call.
    const end=at+Math.max(.01,duration);
    try{
      param.cancelScheduledValues(at);
      param.setValueAtTime(from,at);
      param.linearRampToValueAtTime(to,end);
    }catch{
      try{
        param.cancelScheduledValues(at);
        param.setValueAtTime(to,at);
      }catch{}
    }
  }
  function stop(track,at=context.currentTime,duration=.8){
    track.stopping=true;
    fade(track.gain.gain,track.gain.gain.value,0,at,duration);
    for(const voice of track.voices){try{voice.source.stop(at+duration);}catch{}}
  }
  function voice(track,at,start,length,fadeIn=0,fadeOut=0){
    const source=context.createBufferSource(),gain=context.createGain();
    source.buffer=track.buffer;source.connect(gain);gain.connect(track.gain);
    gain.gain.value=1;
    if(fadeIn)fade(gain.gain,0,1,at,fadeIn);
    if(fadeOut)fade(gain.gain,1,0,at+length-fadeOut,fadeOut);
    const item={source,gain};track.voices.add(item);
    source.onended=()=>{
      source.disconnect();gain.disconnect();track.voices.delete(item);
      if(!track.voices.size&&(track.stopping||track.key!=='ambient')){track.gain.disconnect();tracks.delete(track);}
    };
    source.start(at,start,length);
  }
  function loopAhead(){
    if(disposed||context.state!=='running'||!active||active.key!=='ambient'||active.stopping)return;
    const cue=musicCues.ambient,t=active;
    if(t.next<context.currentTime+1){
      const at=Math.max(t.next,context.currentTime);
      const length=cue.loopEnd-cue.loopStart;
      voice(t,at,cue.loopStart,length,cue.crossfade,cue.crossfade);
      t.next=at+length-cue.crossfade;
    }
  }
  const loopTimer=setInterval(loopAhead,200);
  async function bufferFor(key){
    if(!buffers.has(key))buffers.set(key,(async()=>{
      const response=await fetch(musicCues[key].src,{signal:requests.signal});
      if(!response.ok)throw Error('Music unavailable');
      return context.decodeAudioData(await response.arrayBuffer());
    })());
    return buffers.get(key);
  }
  async function select(key,time){
    const token=++generation;desired=key;offset=time;failed=false;ending=false;
    if(!key){for(const track of tracks)stop(track);active=null;return;}
    try{
      const buffer=await bufferFor(key);
      if(disposed||token!==generation)return;
      const now=context.currentTime,start=key==='ambient'?0:Math.min(offset,buffer.duration);
      for(const track of tracks)stop(track,now);
      const gain=context.createGain();gain.gain.value=0;gain.connect(destination);
      const track={key,buffer,gain,voices:new Set(),origin:now-start,next:0,stopping:false};
      active=track;tracks.add(track);fade(gain.gain,0,1,now,.8);
      if(key==='ambient'){
        const cue=musicCues.ambient,length=Math.min(cue.loopEnd,buffer.duration);
        voice(track,now,0,length,0,cue.crossfade);track.next=now+length-cue.crossfade;
      }else if(start<buffer.duration){voice(track,now,start,buffer.duration-start);}
      else{gain.disconnect();tracks.delete(track);}
      if(ending&&key==='outro')finish();
    }catch{if(!disposed&&token===generation){failed=true;active=null;for(const track of tracks)stop(track);}}
  }
  function position(){return active?Math.max(0,context.currentTime-active.origin):offset;}
  function finish(){
    ending=true;
    if(desired!=='outro'){select(null,0);return;}
    offset=Math.max(offset,22);
    if(!active||active.key!=='outro')return;
    if(position()<21.8){select('outro',22);ending=true;return;}
    const remaining=Math.max(.02,active.buffer.duration-position());
    stop(active,context.currentTime,remaining);
  }
  return {
    setScene(mode,time=0,reduced=false,restart=false){
      if(disposed)return;
      if(mode==='ending'){
        if(reduced){if(desired!==null)select(null,0);}else if(!ending)finish();
        return;
      }
      const key=!reduced&&(mode==='journey'||mode==='outro')?mode:'ambient';
      offset=time;
      if(key!==desired||(restart&&key!=='ambient')){select(key,time);return;}
      // Correct late loading, motion-mode changes or an explicit timeline seek, not normal frame jitter.
      if(key!=='ambient'&&active?.key===key&&Math.abs(position()-time)>.3)select(key,time);
    },
    hasMusic(){return !!active&&active.voices.size>0&&!failed;},
    inspect(){return {cue:desired,position:position(),sourcePosition:(musicCues[active?.key||desired]?.sourceStart||0)+position(),
      loaded:!!active,loadedCue:active?.key||null,failed,ending,tracks:tracks.size,voices:[...tracks].reduce((n,t)=>n+t.voices.size,0)};},
    dispose(){disposed=true;generation++;requests.abort();clearInterval(loopTimer);for(const track of tracks){for(const v of track.voices){v.source.onended=null;try{v.source.stop();}catch{}v.source.disconnect();v.gain.disconnect();}track.gain.disconnect();}tracks.clear();buffers.clear();active=null;}
  };
}
