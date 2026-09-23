// M8.4: render contract, continuous clocks, real touch/pen input, static accessibility.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const {chromium}=require('playwright');
const url=process.env.LOVE_TEST_URL||'http://127.0.0.1:5001/';
const out='output/playwright';fs.mkdirSync(out,{recursive:true});
const mode=(p,m)=>p.waitForFunction(m=>Universe.mode===m,m);
const state=p=>p.evaluate(()=>Universe.scene.debugVortex());
const open=async p=>{await p.locator('#heart-open').click();await mode(p,'HEART_FOCUS');await p.waitForTimeout(1100);};
const enter=async(p,target=url)=>{await p.goto(target);await p.locator('#intro-skip-btn').click();await mode(p,'EXPLORE');await p.waitForFunction(()=>Universe.scene.debugVortex());await p.waitForTimeout(800);};
function bounds(s){const xs=s.rim.map(p=>p.x),ys=s.rim.map(p=>p.y);return {left:Math.min(...xs),right:Math.max(...xs),top:Math.min(...ys),bottom:Math.max(...ys)};}
function shape(s){const b=bounds(s),aspect=(b.bottom-b.top)/(b.right-b.left);assert(aspect>.19&&aspect<.29,`ellipse aspect ${aspect}`);assert(2*s.radius/s.heartWidth>.65&&2*s.radius/s.heartWidth<.75);assert(s.tipY>s.anchorY);return b;}
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try{
  for(const mobile of [false,true]){
   const name=mobile?'mobile':'desktop';
   const page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1440,height:960},hasTouch:mobile,isMobile:mobile});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   page.on('console',m=>{if(m.type()==='error'&&!/favicon|404/.test(m.text()))errors.push(m.text());});
   await enter(page);const initial=await state(page);const initialBounds=shape(initial);
   assert((await page.locator('#heart-open').boundingBox()).y>initialBounds.bottom+8,'Explore button must not cover the disk');
   assert.equal(initial.count,mobile?8000:15000);assert.equal(initial.arcs,mobile?4:8);assert.equal(initial.drawCalls,2);
   await page.screenshot({path:`${out}/vortex-${name}-explore.png`});
   await open(page);const focused=await state(page),b=shape(focused);
   assert(focused.focus>.99);assert(focused.anchorY>initial.anchorY+40);
   const panel=await page.locator('#heart-focus-title').boundingBox();assert(b.bottom<panel.y-15,'ring must remain above focus text');
   await page.screenshot({path:`${out}/vortex-${name}-focus.png`});
   const cdp=await page.context().newCDPSession(page);
   // Projected right rim corresponds to local (1, 0), in both camera configurations.
   const target=focused.rim[0];
   if(mobile){
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:focused.center.x,y:focused.center.y,id:1}]});
    for(let i=1;i<=8;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:focused.center.x+(target.x-focused.center.x)*i/8,y:focused.center.y+(target.y-focused.center.y)*i/8,id:1}]});
   }else await page.mouse.move(target.x,target.y);
   await page.waitForTimeout(600);const pointer=await state(page);
   assert(pointer.pointerStrength>.9,'force reaches ring');assert(Math.abs(pointer.pointer[0]-1)<.08&&Math.abs(pointer.pointer[1])<.08,'ray intersects the projected rim');
   if(mobile)await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
   else await page.mouse.move(2,2);
   await page.waitForTimeout(650);assert.equal(await page.evaluate(()=>Universe.mode),'HEART_FOCUS');assert((await state(page)).pointerStrength<.02);
   if(mobile){
    // Secondary touch must not replace the primary input, and cancel clears force.
    const p=(id,x,y)=>({id,x,y});const c=focused.center;
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[p(1,c.x,c.y)]});
    await page.waitForTimeout(250);const before=await state(page);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[p(1,c.x,c.y),p(2,20,20)]});
    await page.waitForTimeout(150);assert(Math.hypot(...(await state(page)).pointer)<.1);
    assert(before.pointerStrength>.8);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});
    await page.waitForTimeout(600);assert((await state(page)).pointerStrength<.02);
    await page.touchscreen.tap(12,12);await mode(page,'EXPLORE');
   }else{
    await cdp.send('Input.dispatchMouseEvent',{type:'mousePressed',x:focused.center.x,y:focused.center.y,button:'left',clickCount:1,pointerType:'pen'});
    await cdp.send('Input.dispatchMouseEvent',{type:'mouseMoved',x:target.x,y:target.y,button:'left',buttons:1,pointerType:'pen'});
    await page.waitForTimeout(400);assert((await state(page)).pointerStrength>.9);
    await cdp.send('Input.dispatchMouseEvent',{type:'mouseReleased',x:target.x,y:target.y,button:'left',clickCount:1,pointerType:'pen'});
    await page.waitForTimeout(200);assert.equal(await page.evaluate(()=>Universe.mode),'HEART_FOCUS');
    await page.keyboard.press('Escape');await mode(page,'EXPLORE');
   }
   const memory=await page.evaluate(()=>({...Universe.scene.renderer.info.memory}));
   for(let i=0;i<3;i++){
    await page.locator('#quality-btn').click();assert.equal((await state(page)).count,4000);assert.equal((await state(page)).arcs,0);
    const lightTime=(await state(page)).time;await page.waitForTimeout(100);assert((await state(page)).time>lightTime,'Light still moves');
    await page.locator('#quality-btn').click();await open(page);
    assert.deepEqual((await state(page)).geometryIds,initial.geometryIds);assert.deepEqual((await state(page)).materialIds,initial.materialIds);
    await page.locator('#heart-focus-close').click();await mode(page,'EXPLORE');
   }
   assert.deepEqual(await page.evaluate(()=>({...Universe.scene.renderer.info.memory})),memory);
   await open(page);await page.setViewportSize({width:844,height:390});await page.waitForTimeout(900);shape(await state(page));
   await page.screenshot({path:`${out}/vortex-${name}-landscape.png`});
   await page.locator('#heart-focus-close').click();await mode(page,'EXPLORE');
   await page.locator('#heart-open').click();await mode(page,'HEART_FOCUS');await page.waitForTimeout(800);
   // Exercise freeze and the document visibility gate without wall-clock catch-up.
   await page.evaluate(()=>Universe.scene.freeze(350));const frozen=(await state(page)).spin;
   await page.waitForTimeout(200);assert.equal((await state(page)).spin,frozen);
   await page.waitForTimeout(250);assert((await state(page)).spin-frozen<.65);
   const hidden=await page.evaluate(()=>{
    Object.defineProperty(document,'hidden',{configurable:true,value:true});
    document.dispatchEvent(new Event('visibilitychange'));
    return Universe.scene.debugVortex().spin;
   });
   await page.waitForTimeout(350);assert.equal((await state(page)).spin,hidden);
   const resumed=await page.evaluate(()=>{
    delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));
    return new Promise(resolve=>requestAnimationFrame(()=>resolve(Universe.scene.debugVortex().spin)));
   });
   assert(resumed-hidden<.06,'first resumed frame uses a normal delta');
   assert.deepEqual(errors,[]);console.log(`PASS ${name}: shader, ellipse, pointer mapping, touch/pen drag, quality, resources, freeze`);
   if(!mobile){
    const clocks=await page.evaluate(()=>{
     const results=[];
     for(const seconds of [5,60,600])for(const hz of [30,60,120]){
      const resources=[],v=Universe.createEnergyVortex(r=>(resources.push(r),r));v.quality('high',1);
      const frame={focus:1,opacity:1,motion:true,pointer:null,height:.4,beat:0,motionDelta:1/hz};
      for(let i=0;i<seconds*hz;i++)v.update(frame);
      const before=v.debug();frame.beat=1;v.update(frame);const step=v.debug().spin-before.spin;
      for(let i=1;i<hz;i++)v.update(frame);
      const after=v.debug();v.quality('light',1);const unchanged=v.debug();
      v.update({...frame,motionDelta:0});const paused=v.debug();
      v.update({...frame,motion:false,motionDelta:30,pointer:new THREE.Vector2(1,1)});const reduced=v.debug();
      results.push({seconds,hz,step,increment:after.spin-before.spin,time:after.time,unchanged:unchanged.spin===after.spin,paused:paused.spin===after.spin,static:reduced.spin===after.spin&&reduced.pointerStrength===0});
      resources.forEach(r=>r.dispose());
     }
     return results;
    });
    for(const r of clocks){assert(r.step>0&&r.step<=2.9/r.hz);assert(Math.abs(r.time-r.seconds-1)<1e-6);assert(r.unchanged&&r.paused&&r.static);assert(Math.abs(r.increment-clocks[0].increment)<1e-6);}
    fs.writeFileSync(`${out}/vortex-clocks.json`,JSON.stringify(clocks,null,2));console.log('PASS 5/60/600-second clocks at 30/60/120 Hz: bounded beat, pause, quality, reduced');
   }
   await page.close();
  }
  const reduced=await browser.newPage({viewport:{width:1440,height:960},reducedMotion:'reduce'});
  await enter(reduced);await open(reduced);await reduced.waitForTimeout(1400);const s=await state(reduced),b=bounds(s);
  const clip={x:Math.floor(b.left-12),y:Math.floor(b.top-12),width:Math.ceil(b.right-b.left+24),height:Math.ceil(b.bottom-b.top+24)};
  const a=await reduced.screenshot({clip,path:`${out}/vortex-reduced.png`});
  await reduced.mouse.move(s.center.x,s.center.y);await reduced.waitForTimeout(1600);
  const z=await reduced.screenshot({clip});assert(a.equals(z),'reduced-motion ROI is pixel-identical after pointer input');
  assert.equal((await state(reduced)).time,s.time);assert.equal(s.motion,false);assert.equal(s.count,4000);
  await reduced.emulateMedia({reducedMotion:'no-preference'});await reduced.waitForTimeout(150);
  const resumed=await state(reduced);assert.equal(resumed.count,15000);assert(resumed.time>s.time&&resumed.time-s.time<.3);assert.equal(resumed.pointerStrength,0);
  await reduced.close();
  console.log('PASS reduced motion: clocks and rendered pixels remain static');
  const disabled=await browser.newPage();
  await disabled.goto(url);await disabled.evaluate(()=>Universe.config.features.energyVortex=false);await disabled.locator('#intro-skip-btn').click();await mode(disabled,'EXPLORE');assert.equal(await state(disabled),null);await disabled.close();
  const file=await browser.newPage();await enter(file,pathToFileURL(path.resolve('200 days/200 days (frontend).html')).href);assert((await state(file)).count>0);await file.close();
  console.log('PASS feature flag off and file preview');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
