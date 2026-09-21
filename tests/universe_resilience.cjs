const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const url=process.env.LOVE_TEST_URL||'http://127.0.0.1:5001/';
async function open(browser,options={}){const page=await browser.newPage(options);await page.goto(url);await page.locator('#intro-skip-btn').click();await page.waitForFunction(()=>!document.getElementById('intro-overlay'));return page;}
async function select(page){await page.locator('[data-planet="together"]').focus();await page.keyboard.press('Enter');}
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const page=await open(browser);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await select(page);await page.locator('#planet-back').click();await page.waitForFunction(()=>Universe.mode==='EXPLORE');assert.equal(await page.locator('.orbit-photo').count(),0);
 assert.equal(await page.evaluate(()=>document.activeElement.dataset.planet),'together','Keyboard focus returns to the selected planet');
 await page.locator('#music-btn').click();await page.waitForFunction(()=>Universe.audio.signals.energy>0.01,{timeout:10000});
 const bands=await page.evaluate(()=>{const data=new Uint8Array(1024);for(let i=2;i<=8;i++)data[i]=255;return{bass:Universe.audio.band(data,44100,2048,40,180),treble:Universe.audio.band(data,44100,2048,2000,8000)}});assert.ok(bands.bass>.6);assert.equal(bands.treble,0);
 await page.locator('#music-btn').click();await page.waitForFunction(()=>Universe.audio.signals.energy<.01);
 // Repeated visits return GPU objects to the same count.
 const before=await page.evaluate(()=>({...Universe.scene.renderer.info.memory}));
 await page.locator('#quality-btn').click();
 for(let i=0;i<20;i++){await select(page);await page.waitForFunction(()=>Universe.mode==='PLANET_VIEW');await page.locator('#planet-back').click();await page.waitForFunction(()=>Universe.mode==='EXPLORE');}
 assert.deepEqual(await page.evaluate(()=>({...Universe.scene.renderer.info.memory})),before);
 // Context loss while a nested photo dialog is open must return to a usable fallback scene.
 await select(page);await page.waitForFunction(()=>Universe.mode==='PLANET_VIEW');await page.locator('.orbit-photo').first().click();
 await page.evaluate(()=>Universe.scene.renderer.forceContextLoss());await page.waitForFunction(()=>document.body.classList.contains('no-webgl'));
 await page.locator('#lightbox-close').click();await page.waitForFunction(()=>Universe.mode==='EXPLORE');assert.equal(await page.locator('#experience').evaluate(el=>el.inert),false);
 await page.locator('[data-planet="together"]').click();assert.equal(await page.locator('#gallery-overlay').isVisible(),true);assert.equal(await page.locator('.photo-card').count(),await page.evaluate(()=>LOVE_UNIVERSE.memories.length));await page.locator('#gallery-close').click();
 assert.deepEqual(errors,[]);console.log('PASS resilience: interrupted camera, real audio FFT/pause, 20 GPU round trips, WebGL loss with nested dialog');await page.close();
 // Recover the same uncertain submission after a reload (no real backend write).
 const wish=await open(browser);let attempts=[];await wish.route('**/api/wishes',r=>{attempts.push(r.request().postDataJSON());return r.fulfill({status:503,json:{error:'Mạng đang nghỉ'}})});
 await wish.locator('#wish-direct-btn').click();await wish.locator('#wish-text').fill('Draft survives this tab reload');await wish.locator('#wish-submit').click();await wish.waitForFunction(()=>document.getElementById('wish-status').textContent.includes('Mạng'));
 await wish.reload();await wish.locator('#intro-skip-btn').click();await wish.waitForFunction(()=>!document.getElementById('intro-overlay'));await wish.locator('#wish-direct-btn').click();assert.equal(await wish.locator('#wish-text').inputValue(),'Draft survives this tab reload');await wish.locator('#wish-submit').click();await wish.waitForFunction(()=>document.getElementById('wish-status').textContent.includes('Mạng'));assert.deepEqual(attempts[0],attempts[1]);console.log('PASS uncertain wish reload: draft and idempotency key recovered');await wish.close();
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
