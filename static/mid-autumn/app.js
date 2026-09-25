import {films,clamp,ease,lerp,shotTime} from './timeline.js';
import {createScene} from './scene.js?v=peach-moon-glow-4';
import {createStage} from './stage.js';
import {createFlight} from './flight.js';
import {createAudio} from './audio.js?v=volume-8';
import {DRUM_INTERVAL,STAR_NOTES} from './music.js?v=music-cues-4';
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const lifetime=new AbortController();
  const on=(target,type,handler)=>target.addEventListener(type,handler,{signal:lifetime.signal});
  let destroyed=false,assetGeneration=0;
  let welcomePlayed=false;
  const audio=createAudio(syncSound);
  const graphemes=typeof Intl.Segmenter==='function'?new Intl.Segmenter('vi',{granularity:'grapheme'}):null;
  const characters=value=>graphemes?[...graphemes.segment(value)].map(item=>item.segment):Array.from(value);
  const T = window.THREE;
  const motionQuery = matchMedia('(prefers-reduced-motion: reduce)');
  const views = ['home', 'lantern', 'feast', 'wish', 'ending'];
  const lit = new Set();
  const pointer = {x:0, y:0};
  const mobile = () => innerWidth <= 760;
  let reduced=motionQuery.matches, mode='home', film=null, elapsed=0, lastTime=0, frame=0, runtime=0, paused=false;
  let journeyComplete=false, feastComplete=false, wishText='', lastFilm=null, currentShot=-1, assetIssue=false;
  let graphics, renderer, scene, camera, moon, lantern, stars, dust, wishLetter, wishTrail, wishBeacon;
  let panels=[],tassels=[],flight;
  const stage=createStage();
  let soundOn=true,audioBeat=-1,receivedSound=false;
  function pose(time) {
    stage.render({mode,time,clock:film?time:runtime,reduced});
    $('fallback-lantern').toggleAttribute('hidden',!!renderer||!['home','lantern'].includes(mode));
    if(!renderer){flight?.render(time,mode,false);return;}
    const m=mobile(), t=reduced?0:(film?time:runtime);
    camera.position.set(0,m?-.1:.15,m?12.6:10);camera.lookAt(0,m?-.1:.15,0);camera.updateMatrixWorld();
    lantern.position.set(m?-.12:1.85,m?1.9:.22,0);lantern.scale.setScalar(m?.87:1.12);
    moon.position.set(m?1.25:3.55,m?3.3:2.15,-3.5);moon.scale.setScalar(m?.85:1.05);
    lantern.visible=['home','lantern','journey'].includes(mode);moon.visible=['home','lantern'].includes(mode);
    wishLetter.visible=mode==='outro';wishTrail.visible=mode==='outro'&&time>2&&time<16;wishBeacon.visible=mode==='outro'&&time>13;
    if(mode==='lantern'){lantern.position.x=m?-.12:2.05;lantern.scale.setScalar(m?.9:1.25);}
    if(mode==='journey'){
      const fly=ease((time-3.2)/5.2);
      lantern.position.set(lerp(m?0:0.5,m?.7:2.1,fly),lerp(m?1.35:.5,4.4,fly),lerp(1,-9,fly));
      lantern.scale.setScalar(lerp(m?.92:1.12,.04,fly));lantern.visible=time<8.5;
      moon.visible=time>3&&time<8.7;moon.position.set(m?.8:2.2,2.9,-7);moon.scale.setScalar(lerp(1.6,3.4,ease((time-3)/5)));
      const fl=ease((time-6.6)/2);moon.scale.multiplyScalar(1-fl);
    }
    flight?.render(time,mode,true);
    if(mode==='outro'){
      moon.visible=time>3.8&&time<10;moon.position.set(m?.9:3,3,-6);moon.scale.setScalar(1.5*(1-ease((time-7.5)/2.5)));
    }
    lantern.rotation.set(.07+Math.sin(t*.5)*.035,Math.sin(t*.37)*.26-.38+(film?0:pointer.x*.1),Math.sin(t*.48)*.04-.065);
    if(!film)lantern.position.y+=Math.sin(t*.7)*.065;
    moon.rotation.y=.35+Math.sin(t*.025)*.09;
    graphics.animateCelestials(t);
    tassels.forEach((r,i)=>r.rotation.z=Math.sin(t*1.4+i*.5)*.055);
    stars.rotation.z=Math.sin(t*.035)*.006;dust.rotation.y=t*.025;
    dust.material.opacity=film?.6:.4+Math.sin(t*.7)*.15;stars.material.opacity=film?.45:.9;
    renderer.render(scene,camera);
  }
  function soundNote(...args){if(!document.hidden&&!paused)audio.note(...args);}
  function drum(strength){if(!document.hidden&&!paused)audio.drum(strength);}
  function receiveChime(){if(!document.hidden&&!paused)audio.receive();}
  function score() {
    if(!film||!soundOn||paused||reduced)return;
    if(film==='outro'&&elapsed>=14&&!receivedSound){receivedSound=true;receiveChime();}
    const dancing=film==='journey'&&elapsed>=20&&elapsed<29;
    const beat=Math.floor(elapsed/(dancing?DRUM_INTERVAL:2.5));const key=film+':'+(dancing?'drum':'bell')+beat;
    if(key===audioBeat)return;audioBeat=key;
    if(dancing){if(beat*DRUM_INTERVAL>=20)drum([1,.3,.65,.3][beat%4]);}
    else if(!audio.hasMusic()) {const notes=[392,523.25,587.33,783.99,659.25];soundNote(notes[beat%notes.length],1.9,.12);soundNote(notes[beat%notes.length]/2,2.2,.055);}
  }
  function filmControls() {
    $('pause').hidden=!film||reduced;$('next-scene').hidden=!film||!reduced;
    $('pause').textContent=paused?'Tiếp tục':'Tạm dừng';$('pause').setAttribute('aria-pressed',String(paused));
    $('next-scene').textContent=film&&currentShot===films[film].shots.length-1?'Tiếp tục hành trình ↗':'Cảnh tiếp theo ↗';
  }
  function updateFilm() {
    if(!film)return;
    audio.setScene(film,elapsed,reduced);
    const config=films[film];const index=config.shots.findIndex(s=>elapsed<s.end);
    const shot=config.shots[index<0?config.shots.length-1:index];
    if(currentShot!==index){
      currentShot=index;document.body.dataset.shot=shot.id;
      if(reduced&&film==='outro'&&shot.id==='receive'&&!receivedSound){receivedSound=true;receiveChime();}
      $('film-kicker').textContent=shot.kicker;$('film-title').innerHTML=shot.title;$('film-description').textContent=shot.description;
      $('film-scene-count').textContent=`CẢNH ${index+1} / ${config.shots.length}${reduced?' · CHUYỂN ĐỘNG ĐÃ GIẢM':''}`;
      $('announcement').textContent=shot.kicker+'. '+shot.description;filmControls();
    }
    $('film-caption').style.opacity=reduced?1:Math.min(1,clamp((elapsed-shot.start)/.65),clamp((shot.end-elapsed)/.45));
    $('film-bar').style.transform=`scaleX(${clamp(elapsed/config.duration)})`;
  }
  function tick(now) {
    frame=0;const dt=lastTime?Math.max(0,(now-lastTime)/1000):0;lastTime=now;
    if(!reduced&&!paused)runtime+=Math.min(dt,.05);
    if(film&&!paused&&!reduced){elapsed+=dt;if(elapsed>=films[film].duration){finishFilm();}else{updateFilm();score();}}
    pose(elapsed);
    if(!frame&&!document.hidden&&!reduced&&!paused&&!destroyed)frame=requestAnimationFrame(tick);
  }
  function wake() {if(destroyed)return;if(!frame&&!document.hidden&&!reduced&&!paused){lastTime=0;frame=requestAnimationFrame(tick);}else if(reduced)pose(elapsed);}
  function resize(){if(renderer){renderer.setSize(innerWidth,innerHeight,false);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();}pose(elapsed);}
  function updateLantern() {
    document.querySelectorAll('.stitch').forEach((b,i)=>b.setAttribute('aria-pressed',String(lit.has(i))));
    graphics.setLanternLights(mode==='lantern'?lit:null);
    $('fallback-lantern').querySelectorAll('[data-wing]').forEach(wing=>wing.classList.toggle('is-lit',mode!=='lantern'||lit.has(Number(wing.dataset.wing))));
    $('lantern-progress').textContent=lit.size===5?'5 / 5 · Chiếc đèn đã mở lối lên trăng.':`${lit.size} / 5 cánh sao đã sáng`;
    gates();$('light-all').hidden=lit.size===5;$('enter-palace').hidden=lit.size<5;if(reduced)pose(elapsed);
  }
  function gates() {
    document.querySelector('.chapter[data-view="journey"]').disabled=lit.size<5;
    document.querySelector('.chapter[data-view="feast"]').disabled=!journeyComplete;
    document.querySelector('.chapter[data-view="wish"]').disabled=!feastComplete;
  }
  function showView(name,focus=true) {
    if(!views.includes(name))return;
    if(name==='feast'&&!journeyComplete)return;if(name==='wish'&&!feastComplete)return;
    audio.clear();
    film=null;mode=name;paused=false;elapsed=0;currentShot=-1;audio.setScene(name,0,reduced);
    if(!document.hidden&&audio.inspect().state!=='uninitialized')audio.resume();
    document.body.dataset.mode=name;document.body.classList.remove('is-film');delete document.body.dataset.shot;
    views.forEach(v=>{const el=$(v+'-view');el.hidden=v!==name;el.classList.toggle('appear',v===name);});
    ['film','film-meta','film-bar','skip','pause','next-scene'].forEach(id=>$(id).hidden=true);
    $('replay').hidden=!lastFilm;$('replay').textContent=lastFilm==='outro'?'↺ Xem lại đoạn kết':'↺ Xem lại đêm hội';
    document.querySelectorAll('.chapter').forEach(b=>{if(b.dataset.view===name)b.setAttribute('aria-current','step');else b.removeAttribute('aria-current');});
    updateLantern();resize();window.scrollTo(0,0);if(focus)$(name+'-title').focus({preventScroll:true});wake();
  }
  let assetsReady=false,pendingFilm=null;
  function startFilm(kind) {
    if(kind==='journey'&&lit.size<5)return;if(kind==='outro'&&!wishText)return;
    if(!assetsReady){pendingFilm=kind;$('asset-status').hidden=false;if(!assetIssue)$('asset-status').textContent='Đang mở cửa cung trăng…';return;}
    pendingFilm=null;film=kind;lastFilm=kind;mode=kind;paused=false;currentShot=-1;audioBeat=-1;receivedSound=false;audio.clear();
    elapsed=reduced?shotTime(films[kind].shots[0]):0;audio.setScene(kind,elapsed,reduced,true);
    document.body.dataset.mode=kind;document.body.classList.add('is-film');
    document.querySelectorAll('.chapter').forEach(b=>{if(b.dataset.view===(kind==='journey'?'journey':'wish'))b.setAttribute('aria-current','step');else b.removeAttribute('aria-current');});
    views.forEach(v=>$(v+'-view').hidden=true);
    ['film','film-meta','film-bar','skip'].forEach(id=>$(id).hidden=false);$('replay').hidden=true;
    $('film-meta').firstChild.textContent=films[kind].title;$('skip').textContent=films[kind].skip;
    updateLantern();updateFilm();filmControls();window.scrollTo(0,0);resize();
    (reduced?$('next-scene'):$('pause')).focus({preventScroll:true});wake();
  }
  function finishFilm() {
    if(!film)return;const kind=film;if(kind==='journey')journeyComplete=true;
    if(kind==='outro')$('ending-wish').textContent=wishText;
    showView(films[kind].destination);$('announcement').textContent=kind==='journey'?'Đêm hội đã khép lại. Mình cùng phá cỗ.':'Ước nguyện đã đến cung trăng. Hành trình kết thúc.';
  }
  function light(index) {
    if(mode!=='lantern'||film)return;
    const before=lit.size;if(index==='all'){for(let i=0;i<5;i++)lit.add(i);}else lit.add(index);
    updateLantern();if(lit.size>before)soundNote(STAR_NOTES[lit.size-1],.65,.08);
    if(before<5&&lit.size===5){$('announcement').textContent='Đã thắp đủ năm cánh sao. Hành trình lên cung trăng bắt đầu.';startFilm('journey');}
  }
  on($('begin'),'click',()=>showView('lantern'));on($('enter-palace'),'click',()=>startFilm('journey'));
  document.querySelectorAll('.stitch').forEach((b,i)=>on(b,'click',()=>light(i)));on($('light-all'),'click',()=>light('all'));
  document.querySelectorAll('.chapter').forEach(b=>on(b,'click',()=>{pendingFilm=null;if(b.dataset.view==='journey')startFilm('journey');else showView(b.dataset.view);}));
  document.querySelectorAll('.cake-option').forEach(b=>on(b,'click',()=>{document.querySelectorAll('.cake-option').forEach(c=>c.setAttribute('aria-pressed',String(c===b)));$('cake-caption').textContent=b.dataset.cake==='dẻo'?'Một chút dịu dàng, để đêm trăng thêm mềm.':'Một miếng bánh thơm, một khoảng trời yên.';}));
  on($('to-wish'),'click',()=>{feastComplete=true;showView('wish');});
  on($('wish'),'input',()=>{const chars=characters($('wish').value);$('wish-counter').textContent=`${chars.length} / 240`;$('wish-error').textContent=chars.length>240?'Giữ điều ước trong 240 ký tự nhé.':'';});
  on($('wish-form'),'submit',e=>{
    e.preventDefault();if(mode!=='wish'||film)return;
    const value=$('wish').value.trim();if(!value){$('wish-error').textContent='Viết một điều bạn mong trước khi gửi lên trăng nhé.';$('wish').focus();return;}
    if(characters(value).length>240){$('wish-error').textContent='Giữ điều ước trong 240 ký tự nhé.';$('wish').focus();return;}
    wishText=value;$('wish-error').textContent='';startFilm('outro');
  });
  on($('skip'),'click',finishFilm);on($('replay'),'click',()=>{if(lastFilm)startFilm(lastFilm);});
  on($('pause'),'click',()=>{if(!film)return;paused=!paused;filmControls();if(paused){audio.suspend();cancelAnimationFrame(frame);frame=0;lastTime=0;}else{audio.resume();wake();}});
  on($('next-scene'),'click',()=>{if(!film)return;const shots=films[film].shots,next=currentShot+1;if(next>=shots.length){finishFilm();return;}elapsed=shotTime(shots[next]);updateFilm();pose(elapsed);});
  on($('restart'),'click',()=>{lit.clear();wishText='';journeyComplete=false;feastComplete=false;lastFilm=null;pendingFilm=null;$('wish').value='';$('ending-wish').textContent='';$('wish-counter').textContent='0 / 240';showView('home');});
  function syncSound(state){
    if(destroyed)return;
    if(state.state==='unavailable'){soundOn=false;$('sound').disabled=true;$('sound').setAttribute('aria-pressed','false');$('sound').textContent='Không có âm thanh';return;}
    soundOn=state.enabled;
    $('sound').setAttribute('aria-pressed',String(soundOn));
    $('sound').textContent=!soundOn?'Âm thanh: Tắt':state.state==='running'?'Âm thanh: Bật':'Âm thanh: Bật · chờ chạm';
    if(state.state==='running'){
      if(document.hidden||paused){audio.suspend();return;}
      if(soundOn&&!welcomePlayed){welcomePlayed=true;soundNote(523.25,1.9,.1);soundNote(392,2.2,.055);}
    }
  }
  function resumeSound(){
    if(!soundOn||paused||document.hidden)return;
    try{audio.start();}catch{soundOn=false;$('sound').setAttribute('aria-pressed','false');$('sound').textContent='Không có âm thanh';$('sound').disabled=true;}
  }
  on($('sound'),'click',()=>{
    try{soundOn=audio.toggle();if(paused)audio.suspend();}
    catch{soundOn=false;$('sound').textContent='Không có âm thanh';$('sound').disabled=true;}
  });
  // Native click/touch and keyboard activation unlock blocked Web Audio. Explicit mute is preserved.
  on(document,'pointerdown',event=>{if(!event.target.closest('#sound'))resumeSound();});
  on(document,'keydown',event=>{if(!event.target.closest('#sound'))resumeSound();});
  on(window,'resize',resize);
  on(window,'pointermove',e=>{if(e.pointerType==='mouse'){pointer.x=e.clientX/innerWidth-.5;pointer.y=.5-e.clientY/innerHeight;}});
  on(window,'keydown',e=>{if(e.key==='Escape'&&film)finishFilm();});
  on(document,'visibilitychange',()=>{
    if(document.hidden){cancelAnimationFrame(frame);frame=0;lastTime=0;audio.suspend();}
    else{if(!paused)audio.resume();wake();}
  });
  on(motionQuery,'change',e=>{
    reduced=e.matches;cancelAnimationFrame(frame);frame=0;lastTime=0;paused=false;
    if(film){if(reduced){const shot=films[film].shots.find(s=>elapsed<s.end)||films[film].shots.at(-1);elapsed=shotTime(shot);}currentShot=-1;updateFilm();filmControls();}
    if(!document.hidden)audio.resume();
    pose(elapsed);wake();
  });
  on($('scene'),'webglcontextlost',e=>{e.preventDefault();renderer=null;document.body.classList.add('no-webgl');$('scene').hidden=true;$('fallback').hidden=!!film;$('render-note').hidden=false;$('render-note').textContent='Cảnh minh họa tiếp tục ở chế độ nhẹ.';pose(elapsed);});
  const images=[...document.querySelectorAll('[data-story-image]')];
  const puppet=new Image();puppet.src='/static/mid-autumn/assets/lion-puppet-v2-mobile.webp';
  function setAssetState(){
    stage.setHandAvailable($('hang-image').complete&&$('hang-image').naturalWidth>0);
    $('lion-art').style.visibility=puppet.naturalWidth?'visible':'hidden';
  }
  async function loadAssets(retry=false){
    const generation=++assetGeneration;assetIssue=false;assetsReady=false;$('loading-actions').hidden=true;
    const all=[...images,puppet];
    if(retry)for(const img of all){const url=new URL(img.currentSrc||img.src,location.href);url.searchParams.set('retry',Date.now());img.srcset='';img.src=url.href;}
    const results=await Promise.all(all.map(img=>new Promise(resolve=>{
      const timer=setTimeout(()=>resolve(false),8000);
      img.decode().then(()=>{clearTimeout(timer);resolve(true);},()=>{clearTimeout(timer);resolve(false);});
    })));
    if(destroyed||generation!==assetGeneration)return;
    if(puppet.naturalWidth)document.querySelectorAll('#lion-art image').forEach(image=>image.setAttribute('href',puppet.src));
    setAssetState();assetIssue=results.some(ready=>!ready);assetsReady=!assetIssue;
    $('asset-status').hidden=!assetIssue;$('loading-actions').hidden=!assetIssue;
    $('asset-status').textContent=assetIssue?'Một phần cảnh chưa tải được. Thử lại hoặc tiếp tục với cảnh nhẹ.':'';
    if(assetsReady&&pendingFilm)startFilm(pendingFilm);
  }
  on($('retry-assets'),'click',()=>{loadAssets(true);});
  on($('continue-light'),'click',()=>{assetGeneration++;setAssetState();assetsReady=true;$('loading-actions').hidden=true;$('asset-status').hidden=true;if(pendingFilm)startFilm(pendingFilm);});
  const unavailable=()=>{document.body.classList.add('no-webgl');$('scene').hidden=true;$('fallback').hidden=false;$('render-note').hidden=false;$('render-note').textContent='Đang dùng cảnh minh họa nhẹ. Hành trình vẫn tiếp tục đầy đủ.';};
  graphics=createScene($('scene'),unavailable);
  ({renderer,scene,camera,moon,lantern,stars,dust,wishLetter,wishTrail,wishBeacon,panels,tassels}=graphics);
  flight=createFlight({T,camera,letter:wishLetter,trail:wishTrail,beacon:wishBeacon,canvas:$('scene'),stage});
  showView('home',false);loadAssets();resumeSound();
  on(window,'pagehide',event=>{
    cancelAnimationFrame(frame);frame=0;lastTime=0;audio.suspend();
    if(!event.persisted){destroyed=true;assetGeneration++;lifetime.abort();audio.dispose();graphics.dispose();}
  });
  on(window,'pageshow',event=>{if(event.persisted){if(!paused)audio.resume();resize();wake();}});
  if(['localhost','127.0.0.1','[::1]'].includes(location.hostname)&&new URLSearchParams(location.search).has('inspect')){
    window.__midAutumn=Object.freeze({
      state:()=>({mode,film,elapsed,paused,reduced,frame,assetsReady,assetIssue,lit:lit.size,wishText,journeyComplete,feastComplete,audio:audio.inspect()}),
      seek(kind,time){if(!films[kind]||!assetsReady)throw Error('Invalid scene or assets not ready');if(kind==='journey')for(let i=0;i<5;i++)lit.add(i);else wishText=wishText||'Ước nguyện kiểm thử';startFilm(kind);paused=true;cancelAnimationFrame(frame);frame=0;lastTime=0;elapsed=clamp(time/films[kind].duration)*films[kind].duration;updateFilm();pose(elapsed);filmControls();},
      measure:()=>flight.measure(!!renderer),
      loseContext:()=>renderer?.forceContextLoss(),
      resources:()=>renderer?{geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures}:null
    });
  }
})();
