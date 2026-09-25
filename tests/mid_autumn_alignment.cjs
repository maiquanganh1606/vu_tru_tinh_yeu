// NODE_PATH may point to an existing Playwright installation. No requests send wishes.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const url=new URL('/trung-thu/?inspect',process.env.LOVE_TEST_URL||'http://127.0.0.1:5002/').href;
const sizes=[[1440,900],[1280,720],[1024,768],[820,1180],[390,844],[360,800],[320,568],[812,375],[759,844],[760,844],[761,844]];
async function measure(page){return page.evaluate(()=>{
  // Independent pixel landmark in the reviewed 1024x1536 art, transformed through both ancestors.
  const actor=document.getElementById('hang-art'),arms=document.getElementById('hang-arms');
  const w=actor.offsetWidth,h=actor.offsetHeight;
  function transform(el,p){const c=getComputedStyle(el),o=c.transformOrigin.split(' ').map(Number.parseFloat),m=new DOMMatrix(c.transform);const q=new DOMPoint(p.x-o[0],p.y-o[1]).matrixTransform(m);return {x:q.x+o[0],y:q.y+o[1]};}
  const corners=[[0,0],[w,0],[0,h],[w,h]].map(([x,y])=>transform(actor,{x,y}));
  const hand=transform(actor,transform(arms,{x:w*260/1024,y:h*520/1536})),r=actor.getBoundingClientRect();
  hand.x+=r.left-Math.min(...corners.map(p=>p.x));hand.y+=r.top-Math.min(...corners.map(p=>p.y));
  const actual=window.__midAutumn.measure();return {...actual,artHand:hand,artError:Math.hypot(actual.contact.x-hand.x,actual.contact.y-hand.y)};
});}
(async()=>{fs.mkdirSync('output/playwright',{recursive:true});const browser=await chromium.launch({channel:'chrome',headless:true});const results=[];try{
for(const fallback of [false,true]){
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));if(fallback)await page.route('**/vendor/three-r128.min.js',r=>r.abort());
 await page.goto(url);await page.waitForFunction(()=>window.__midAutumn?.state().assetsReady);
 for(const [width,height] of sizes){await page.setViewportSize({width,height});
  for(const t of [14,14.5,15,15.5,15.99,16.5]){await page.evaluate(t=>window.__midAutumn.seek('outro',t),t);const result=await measure(page);results.push({width,height,t,fallback,...result});assert.ok(result.artError<=8,JSON.stringify(results.at(-1)));assert.equal(result.webgl,!fallback);}
  await page.screenshot({path:`output/playwright/mid-autumn-after-${width}${fallback?'-css':''}.png`});
 }
 // Retarget within a breakpoint and across orientation without restarting the shot.
 await page.setViewportSize({width:1440,height:900});await page.evaluate(()=>window.__midAutumn.seek('outro',14.6));
 for(const [width,height] of [[1280,720],[390,844],[812,375]]){await page.setViewportSize({width,height});await page.waitForTimeout(60);assert.ok(Math.abs(await page.evaluate(()=>window.__midAutumn.state().elapsed)-14.6)<1e-9);assert.ok((await measure(page)).artError<=8);}
 for(let i=0;i<5;i++){await page.evaluate(()=>window.__midAutumn.seek('outro',15));assert.ok((await measure(page)).artError<=8);}
 assert.deepEqual(errors,[]);await page.close();
}
for(const dpr of [1,2,3]){const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:dpr});await page.goto(url);await page.waitForFunction(()=>window.__midAutumn?.state().assetsReady);await page.evaluate(()=>window.__midAutumn.seek('outro',15));assert.ok((await measure(page)).artError<=8);await page.close();}
fs.writeFileSync('output/playwright/mid-autumn-alignment.json',JSON.stringify(results,null,2));console.log(`PASS ${results.length} docking samples; WebGL/CSS, resize, replay, DPR 1/2/3; worst art landmark error ${Math.max(...results.map(r=>r.artError)).toFixed(3)} CSS px`);
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
