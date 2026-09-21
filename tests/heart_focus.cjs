const assert = require('node:assert/strict');
const {chromium} = require('playwright');
const url = process.env.LOVE_TEST_URL || 'http://127.0.0.1:5001/';
const mode = (p,m) => p.waitForFunction(m=>Universe.mode===m,m);
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try {
  for (const scenario of ['desktop','mobile','reduced','fallback']) {
   const mobile=scenario==='mobile';
   const page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1440,height:960},hasTouch:mobile,isMobile:mobile,reducedMotion:scenario==='reduced'?'reduce':'no-preference'});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   page.on('console',message=>{if(/THREE.WebGLProgram|VALIDATE_STATUS|Shader Error/.test(message.text()))errors.push(message.text());});
   if(scenario==='fallback')await page.route('**/three-r128.min.js',r=>r.abort());
   await page.goto(url);await page.locator('#intro-skip-btn').click();await page.waitForFunction(()=>!document.getElementById('intro-overlay'));
   // Actual canvas hit and touch, with keyboard entry available even without WebGL.
   if(scenario==='desktop')await page.mouse.click(720,480);
   else if(mobile)await page.touchscreen.tap(195,422);
   else{await page.locator('#heart-open').focus();await page.keyboard.press('Enter');}
   console.log(scenario,await page.evaluate(()=>({mode:Universe.mode,available:Universe.scene.available})),errors);
   await mode(page,'HEART_FOCUS');
   if(scenario!=='fallback'){
    const heart=await page.evaluate(()=>Universe.scene.debugHeart());
    assert.equal(heart.pointOnly,true,'Heart must contain only point clouds');
    assert.equal(heart.motion,scenario==='reduced'?0:1);
    if(scenario==='reduced')assert.equal(heart.count,16000);
   }
   assert.equal(await page.locator('#heart-focus').isVisible(),true);
   assert.equal(await page.locator('#heart-focus-title').textContent(),'Quang Anh & Pé Nhi');
   assert.equal(await page.evaluate(()=>document.getElementById('timer').textContent===document.getElementById('heart-focus-timer').textContent),true);
   await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.id),'heart-focus-close');
   await page.screenshot({path:`output/playwright/heart-${scenario}.png`});
   await page.keyboard.press('Escape');await mode(page,'EXPLORE');
   const before=await page.evaluate(()=>Universe.scene.renderer?{...Universe.scene.renderer.info.memory}:null);
   for(let i=0;i<3;i++){
    await page.locator('#heart-open').click();await mode(page,'HEART_FOCUS');
    if(i===0)await page.mouse.click(12,12);else await page.locator('#heart-focus-close').click();
    await mode(page,'EXPLORE');
   }
   assert.deepEqual(await page.evaluate(()=>Universe.scene.renderer?{...Universe.scene.renderer.info.memory}:null),before);
   await page.locator('#heart-open').click();await page.keyboard.press('Escape');await page.keyboard.press('Escape');await mode(page,'EXPLORE');
   await page.locator('#heart-open').click();await page.setViewportSize({width:844,height:390});await mode(page,'HEART_FOCUS');
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   await page.locator('#heart-focus-close').click();await mode(page,'EXPLORE');
   if(scenario==='desktop'){
    await page.locator('[data-planet="together"]').focus();await page.keyboard.press('Enter');await mode(page,'PLANET_VIEW');await page.locator('#planet-back').click();await mode(page,'EXPLORE');
    await page.locator('#heart-open').click();
    await page.evaluate(()=>Universe.scene.renderer.domElement.dispatchEvent(new Event('webglcontextlost',{cancelable:true})));
    await mode(page,'HEART_FOCUS');await page.locator('#heart-focus-close').click();await mode(page,'EXPLORE');
   }
   assert.deepEqual(errors,[]);console.log('PASS heart '+scenario);await page.close();
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
