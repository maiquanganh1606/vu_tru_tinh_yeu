// Cue locations supplied by the user's listening report; seconds in the original MP3.
export const musicCues={
  ambient:{src:'/static/mid-autumn/assets/ambient.web.mp3',sourceStart:0,loopStart:2.35,loopEnd:14.98,crossfade:.65},
  journey:{src:'/static/mid-autumn/assets/journey.web.mp3',sourceStart:15.23,duration:33},
  outro:{src:'/static/mid-autumn/assets/outro.web.mp3',sourceStart:128.63,duration:28.81}
};
export const MUSIC_BPM=152;
export const DRUM_INTERVAL=60/MUSIC_BPM;
export const STAR_NOTES=[523.25,659.25,783.99,880,1046.5];
export const dbGain=db=>10**(db/20);
export function musicLevel(mode,time=0){
  let db=-8;
  if(mode==='journey')db=time<3.2?-2+2*time/3.2:time<13.5?0:time<20?-1:time<29?-3:-2-3*Math.min(1,(time-29)/4);
  else if(mode==='outro')db=time<4?-2:time<10?-1:time<14?-2:time<16?-1.5:-1.5-2.5*Math.min(1,(time-16)/6);
  else if(mode==='ending')db=-4;
  else if(mode==='wish')db=-9;
  else if(mode==='feast')db=-7;
  return .52*dbGain(db);
}
