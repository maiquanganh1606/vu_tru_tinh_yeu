// Integration journeys using a real browser. Provider APIs are mocked; nothing is sent externally.
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const url=process.env.LOVE_TEST_URL||'http://127.0.0.1:5001/';
const waitMode=(page,mode)=>page.waitForFunction(m=>Universe.mode===m,mode);
async function choosePlanet(page,id,mobile){const target=page.locator(`[data-planet="${id}"]`);if(mobile){const box=await target.boundingBox();await page.touchscreen.tap(box.x+box.width/2,box.y+box.height/2);}else{await target.focus();await target.press('Enter');}}
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try {
  for(const mobile of [false,true]){
   const page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1440,height:960},hasTouch:mobile,isMobile:mobile});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(url);await page.locator('#intro-skip-btn').click();await waitMode(page,'EXPLORE');await page.waitForFunction(()=>!document.getElementById('intro-overlay'));
   assert.equal(await page.evaluate(()=>Universe.scene.available),true);
   assert.equal(await page.locator('[data-planet]').count(),3);
   const firstPlanet=page.locator('[data-planet=\"together\"]'); await firstPlanet.dispatchEvent('pointerenter'); const beforeOrbit=await page.evaluate(()=>Universe.scene.debugOrbit?.() ?? null); await page.waitForTimeout(1200); const afterOrbit=await page.evaluate(()=>Universe.scene.debugOrbit?.() ?? null); if(beforeOrbit&&afterOrbit) assert.notEqual(afterOrbit,beforeOrbit,'Hover must not freeze the orbit');
   await choosePlanet(page,'together',mobile);await waitMode(page,'PLANET_VIEW');
   assert.equal(await page.locator('.orbit-photo').count(),8);
   await page.locator('.orbit-photo').first().click();await page.waitForFunction(()=>document.getElementById('lightbox-img').naturalWidth>0);
   await page.locator('#lightbox-next').click();assert.match(await page.locator('#lightbox-counter').textContent(),/^2 /);
   await page.keyboard.press('Escape');await waitMode(page,'PLANET_VIEW');await page.locator('#planet-back').click();await waitMode(page,'EXPLORE');
   const before=await page.evaluate(()=>({...Universe.scene.renderer.info.memory}));
   for(let i=0;i<5;i++){await choosePlanet(page,'locket',mobile);await waitMode(page,'PLANET_VIEW');await page.locator('#planet-back').click();await waitMode(page,'EXPLORE');}
   const after=await page.evaluate(()=>({...Universe.scene.renderer.info.memory}));assert.deepEqual(after,before,'Repeated visits must not allocate GPU resources');
   await page.locator('#draw-stars-btn').click();await waitMode(page,'CONSTELLATION_DRAW');
   for(const id of ['heart','qn','cancer','gemini']){
    await page.locator(`[data-pattern="${id}"]`).click();await page.locator('#constellation-reset').click();
    if(id==='qn'){assert.equal(await page.locator('[data-pattern=qn]').textContent(),'QA & YN');assert.equal(await page.evaluate(()=>LOVE_UNIVERSE.constellations.find(c=>c.id==='qn').version),2);}
    const edges=await page.evaluate(id=>LOVE_UNIVERSE.constellations.find(c=>c.id===id).edges,id);
    for(const [a,b] of edges){
     await page.locator('#constellation-lift').click();
     for(const i of [a,b]){const point=page.locator(`[data-point="${i}"]`);if(mobile)await point.tap();else{await point.focus();await point.press('Enter');}}
    }
    assert.equal(await page.locator('#constellation-board').evaluate(el=>el.classList.contains('complete')),true,`${id} completed`);
   }
   await page.keyboard.press('Escape');await waitMode(page,'EXPLORE');assert.equal(await page.locator('#experience').evaluate(el=>el.inert),false);
   await page.reload();await page.locator('#intro-skip-btn').click();await page.waitForFunction(()=>!document.getElementById('intro-overlay'));
   await page.locator('#draw-stars-btn').click();assert.equal(await page.locator('#constellation-board').evaluate(el=>el.classList.contains('complete')),true,'Progress survives reload');await page.locator('#constellation-close').click();
   // Server-authoritative capsule response and readable safe text (never HTML injection).
   let unlocked=false;
   await page.route('**/api/capsules/future',route=>route.fulfill({json:{configured:true,title:'Thư kiểm thử',question:'Câu hỏi kiểm thử',state:unlocked?'open':'sealed',unlockAt:'2025-01-01T00:00:00+07:00',serverNow:new Date().toISOString()}}));
   await page.route('**/api/capsules/future/unlock',route=>{unlocked=true;return route.fulfill({json:{configured:true,title:'Thư kiểm thử',question:'Câu hỏi kiểm thử',state:'open',unlockAt:'2025-01-01T00:00:00+07:00',serverNow:new Date().toISOString()}});});
   await page.route('**/api/capsules/future/letter',route=>route.fulfill({json:{letter:'<script>not HTML</script>\nThương pé.'}}));
   await page.locator('#capsule-open').click();await page.locator('#capsule-answer').fill('answer');await page.locator('#capsule-submit').click();await page.waitForFunction(()=>!document.getElementById('capsule-letter-wrap').hidden);
   assert.match(await page.locator('#capsule-letter').textContent(),/Thương pé/);assert.equal(await page.locator('#capsule-letter script').count(),0);await page.locator('#capsule-close').click();
   // A transient failure retains the exact body and idempotency key for retry.
   let bodies=[];
   await page.route('**/api/wishes',route=>{bodies.push(route.request().postDataJSON());return route.fulfill(bodies.length===1?{status:503,json:{error:'Thử lại nhé'}}:{status:202,json:{id:'fake-wish',status:'queued'}});});
   await page.route('**/api/wishes/fake-wish',route=>route.fulfill({json:{id:'fake-wish',status:'sent'}}));
   await page.locator('#wish-direct-btn').click();await page.locator('#wish-text').fill('Một điều ước kiểm thử');await page.locator('#wish-submit').click();await page.waitForFunction(()=>document.getElementById('wish-status').textContent.includes('Thử lại'));
   assert.equal(await page.locator('#wish-text').inputValue(),'Một điều ước kiểm thử');await page.locator('#wish-submit').click();await page.waitForFunction(()=>document.getElementById('wish-status').textContent.includes('được gửi đến anh'));
   assert.deepEqual(bodies[0],bodies[1]);await page.locator('#wish-close').click();
   // Catch an actual moving star; shorten only the browser's waiting clock, not production logic.
   await page.waitForSelector('.catchable-meteor',{timeout:60000});await page.locator('.catchable-meteor').focus();await page.keyboard.press('Enter');await page.waitForSelector('#wish-overlay:not([hidden])');assert.match(await page.locator('#wish-title').textContent(),/bắt được sao băng/);await page.locator('#wish-close').click();
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);
   console.log(`PASS v2 ${mobile?'touch mobile':'desktop'}: planets, GPU reuse, four constellations, persistence, capsule, wish retry, meteor`);await page.close();
  }
  const reduced=await browser.newPage({reducedMotion:'reduce'});await reduced.goto(url);await reduced.locator('#intro-skip-btn').click();await reduced.waitForFunction(()=>!document.getElementById('intro-overlay'));await reduced.locator('#wish-direct-btn').click();assert.equal(await reduced.locator('#wish-overlay').isVisible(),true);assert.equal(await reduced.locator('.catchable-meteor').count(),0);console.log('PASS reduced motion: direct wish path');await reduced.close();
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
