const assert=require('node:assert/strict');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const {chromium}=require('playwright');
const url=process.env.LOVE_TEST_URL||pathToFileURL(path.resolve(__dirname,'../200 days/200 days (frontend).html')).href;

async function geometry(page){
 return page.evaluate(()=>{
  const box=selector=>{const el=document.querySelector(selector),r=el.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom,right:r.right,clientHeight:el.clientHeight,scrollHeight:el.scrollHeight};};
  const img=document.getElementById('puzzle-reference-img');
  return {board:box('#puzzle-board'),reference:box('#puzzle-reference-img'),card:box('.puzzle-card'),panel:box('#puzzle-panel'),heading:box('.puzzle-heading'),details:box('.puzzle-details'),scrollTop:document.querySelector('.puzzle-card').scrollTop,scrollers:[...document.querySelectorAll('.puzzle-card,.puzzle-heading,.puzzle-details')].filter(el=>['auto','scroll'].includes(getComputedStyle(el).overflowY)).map(el=>el.className),ratio:img.naturalWidth/img.naturalHeight,tiles:[...document.querySelector('#puzzle-board').children].map(el=>{const r=el.getBoundingClientRect(),label=el.firstElementChild?.getBoundingClientRect();return {width:r.width,height:r.height,labelFits:!label||(label.x>=r.x&&label.right<=r.right&&label.y>=r.y&&label.bottom<=r.bottom)};}),overflow:document.documentElement.scrollWidth>innerWidth};
 });
}
function checkFit(g,viewport){
 assert(Math.abs(g.board.width/g.board.height-g.ratio)<0.003,'Board must preserve the photo ratio');
 assert(g.board.y>=0&&g.board.bottom<=viewport.height,'Entire board must stay in the viewport');
 assert(g.board.y>=g.card.y+1&&g.board.bottom<=g.card.bottom-1,'Card must not clip the sticky board');
 assert(g.reference.y>=0&&g.reference.bottom<=viewport.height,'Entire reference must stay in the viewport');
 assert(Math.abs(g.reference.width/g.reference.height-g.ratio)<0.003,'Reference must preserve the photo ratio');
 assert(g.board.scrollHeight<=g.board.clientHeight+1,'Puzzle rows must not be clipped');
 for(const tile of g.tiles){assert(Math.abs(tile.width*6-g.board.width)<1);assert(Math.abs(tile.height*6-g.board.height)<1);assert(tile.labelFits,'Tile number must fit inside its tile');}
 assert.deepEqual(g.scrollers,['modal-card puzzle-card'],'Heading and controls must share the card scroll');
 assert(g.panel.scrollHeight<=g.panel.clientHeight+1,'Outer modal must not introduce another scroll');
 assert.equal(g.overflow,false);
}
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try{
  for(const [name,viewport,minHeight] of [
   ['desktop',{width:1512,height:780},480],
   ['mobile',{width:390,height:844},430],
   ['small-mobile',{width:320,height:568},260],
   ['landscape-mobile',{width:844,height:390},150]
  ]){
   const page=await browser.newPage({viewport});const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(url);await page.locator('#intro-skip-btn').click();await page.waitForFunction(()=>!document.getElementById('intro-overlay'));
   await page.locator('#puzzle-open').click();await page.locator('#puzzle-images button').nth(38).click();await page.locator('#puzzle-level').selectOption('6');
   await page.locator('#puzzle-start').click();await page.locator('#puzzle-board button').first().waitFor();await page.locator('#puzzle-preview').click();await page.waitForTimeout(100);
   const before=await geometry(page);
   assert(before.board.height>=minHeight,`${name}: board should be at least ${minHeight}px tall, got ${before.board.height}`);checkFit(before,viewport);
   if(viewport.height>=568)assert(before.reference.width>=(viewport.width<=650?96:190),'Reference should be enlarged');
   // Long result text exercises shared scrolling even when the normal content fits.
   const record=await page.locator('#puzzle-record').textContent();
   await page.locator('#puzzle-record').evaluate(el=>{el.textContent=(el.textContent+' ').repeat(60);});
   // Wheel input over the board scrolls the shared content while keeping both photos visible.
   await page.locator('#puzzle-board').hover();await page.mouse.wheel(0,600);await page.waitForTimeout(100);
   const scrolled=await geometry(page);checkFit(scrolled,viewport);
   assert(scrolled.scrollTop>before.scrollTop,'Wheel input must scroll the common container');
   assert(scrolled.heading.y<before.heading.y&&scrolled.details.y<before.details.y,'Heading and controls must move together');
   // Check the sticky limit throughout the shared scroll, including both ends.
   for(const fraction of [0,.25,.5,.75,1]){
    await page.locator('.puzzle-card').evaluate((el,f)=>{el.scrollTop=(el.scrollHeight-el.clientHeight)*f;},fraction);await page.waitForTimeout(80);
    const after=await geometry(page);checkFit(after,viewport);assert.equal(after.board.width,before.board.width);assert.equal(after.board.height,before.board.height);
   }
   await page.locator('#puzzle-record').evaluate((el,text)=>{el.textContent=text;},record);
   await page.locator('#puzzle-pause').click();await page.locator('#puzzle-resume').click();await page.waitForTimeout(80);checkFit(await geometry(page),viewport);
   await page.screenshot({path:`output/playwright/puzzle-shared-scroll-${name}.png`});
   await page.locator('#puzzle-change').click();await page.locator('#puzzle-images button').first().click();await page.locator('#puzzle-start').click();await page.locator('#puzzle-board button').first().waitFor();await page.locator('#puzzle-preview').click();await page.waitForTimeout(80);checkFit(await geometry(page),viewport);
   await page.setViewportSize({width:viewport.height,height:viewport.width});await page.waitForTimeout(150);checkFit(await geometry(page),{width:viewport.height,height:viewport.width});
   assert.deepEqual(errors,[]);await page.close();console.log(`PASS puzzle layout ${name}: portrait/landscape ratios, six rows, shared scrolling, sticky photos, pause, resize`);
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
