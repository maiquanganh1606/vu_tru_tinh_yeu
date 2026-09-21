// Run against the local server with Node.js and Playwright available on NODE_PATH.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs = require('node:fs');
const url = process.env.LOVE_TEST_URL || 'http://127.0.0.1:5001/';
fs.mkdirSync('output/playwright', { recursive: true });
(async()=>{
const browser=await chromium.launch({channel:'chrome',headless:true});
try {
for(const mobile of [false,true]) {
const page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1280,height:800}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto(url);
await page.waitForSelector('.is-flying',{timeout:20000});
await page.waitForTimeout(2500);
await page.screenshot({path:`output/playwright/intro-${mobile?'mobile':'desktop'}-drift.png`});
assert.equal(await page.locator('#canvas-container canvas').count(),0);
await page.waitForFunction(()=>document.getElementById('intro-overlay')?.dataset.phase==='warp');
await page.waitForTimeout(8000);
await page.screenshot({path:`output/playwright/intro-${mobile?'mobile':'desktop'}-warp.png`});
await page.waitForFunction(()=>document.getElementById('intro-overlay')?.dataset.phase==='arrival');
await page.waitForTimeout(650);
await page.screenshot({path:`output/playwright/intro-${mobile?'mobile':'desktop'}-heart.png`});
await page.waitForFunction(()=>!document.getElementById('intro-overlay'), null, {timeout:10000});
assert.equal(await page.locator('#canvas-container canvas').count(),1);
assert.equal(await page.locator('#intro-3d-container canvas').count(),0);
assert.deepEqual(errors,[]);console.log('PASS cinematic',mobile?'mobile':'desktop');
await page.close();
}
const page=await browser.newPage({reducedMotion:'reduce'});
await page.goto(url);
await page.waitForFunction(()=>!document.getElementById('intro-overlay'), null, {timeout:15000});
console.log('PASS reduced motion');
}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
