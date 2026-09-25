const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const base=process.env.LOVE_TEST_URL||'http://127.0.0.1:5002/';
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
for(const mobile of [false,true]){
 const page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1280,height:800},isMobile:mobile,hasTouch:mobile});
 await page.goto(base);await page.locator('#intro-skip-btn').click();await page.waitForFunction(()=>!document.getElementById('intro-overlay'));
 const link=page.locator('#mid-autumn-link');
 const hit=await link.evaluate(el=>{const r=el.getBoundingClientRect(),target=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return {pointerEvents:getComputedStyle(el).pointerEvents,receivesPointer:el===target||el.contains(target),target:target?.id||target?.tagName};});
 assert.ok(hit.receivesPointer,JSON.stringify(hit));
 if(mobile)await link.tap();else await link.click();
 await page.waitForURL(new URL('/trung-thu/',base).href);assert.equal(await page.locator('#begin').isVisible(),true);
 await page.locator('.back').click();await page.waitForURL(base);
 console.log(`PASS ${mobile?'touch mobile':'desktop mouse'}: home link → Trung Thu → home`);await page.close();
}
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
