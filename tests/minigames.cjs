const assert=require('node:assert/strict');
const E=require('../static/universe/puzzle-engine.js');
const {chromium}=require('playwright');
for(const n of [3,4,5,6]){
 for(let seed=1;seed<=50;seed++){
  let randomState=seed;const random=()=>((randomState=(randomState*1664525+1013904223)>>>0)/4294967296);
  const board=E.shuffle(n,300,random);assert.equal(E.complete(board),false);assert.equal(new Set(board).size,n*n);
  const numbered=board.filter(x=>x!==n*n-1);let inversions=0;numbered.forEach((a,i)=>numbered.slice(i+1).forEach(b=>{if(a>b)inversions++;}));
  const blankRowFromBottom=n-Math.floor(board.indexOf(n*n-1)/n);
  assert.equal(n%2?inversions%2:(inversions+blankRowFromBottom)%2,n%2?0:1,'Shuffle parity is solvable');
 }
 assert.equal(E.move(E.solved(n),0,n),null);
 const moved=E.move(E.solved(n),n*n-2,n);assert(E.complete(E.move(moved,n*n-1,n)));
}
assert(E.better({elapsedMs:1,moves:5},{elapsedMs:2,moves:1}));assert(E.better({elapsedMs:1,moves:2},{elapsedMs:1,moves:3}));
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try{
 for(const mobile of [false,true]){
  const page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1280,height:900},isMobile:mobile,hasTouch:mobile});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(process.env.LOVE_TEST_URL||'http://127.0.0.1:5001/');await page.locator('#intro-skip-btn').click();await page.waitForFunction(()=>!document.getElementById('intro-overlay'));
  await page.locator('#draw-stars-btn').click();
  for(const level of ['medium','hard','very-hard']){
   await page.locator(`[data-difficulty="${level}"]`).click();assert.equal(await page.locator('#constellation-tabs button:visible').count(),2);
   for(const family of ['cancer','gemini']){
    const id=`${family}-${level}`;await page.locator(`[data-pattern="${id}"]`).click();await page.locator('#constellation-reset').click();
    const edges=await page.evaluate(id=>LOVE_UNIVERSE.constellations.find(p=>p.id===id).edges,id);
    for(const [a,b] of edges){await page.locator('#constellation-lift').click();for(const i of [a,b]){await page.locator(`[data-point="${i}"]`).focus();await page.keyboard.press('Enter');}}
    assert(await page.locator('#constellation-board').evaluate(el=>el.classList.contains('complete')));
   }
  }
  await page.keyboard.press('Escape');await page.locator('#puzzle-open').click();
  assert.equal(await page.locator('#puzzle-images button').count(),65);
  // Control only shuffle output, exercise real moves, timing and persistence through UI.
  await page.evaluate(()=>{PuzzleEngine.shuffle=n=>PuzzleEngine.move(PuzzleEngine.solved(n),n*n-2,n);});
  for(const n of [3,4,5,6]){
   await page.locator('#puzzle-level').selectOption(String(n));await page.locator('#puzzle-start').click();await page.locator('#puzzle-board button').first().waitFor();
   const before=await page.locator('#puzzle-time').textContent();await page.waitForTimeout(150);assert.equal(await page.locator('#puzzle-time').textContent(),before);
   await page.locator('#puzzle-preview').click();await page.locator('#puzzle-preview').click();
   await page.locator('#puzzle-pause').click();assert(await page.locator('#puzzle-curtain').isVisible());await page.locator('#puzzle-resume').click();
   await page.locator(`[data-tile="${n*n-2}"]`).click();assert.match(await page.locator('#puzzle-result').textContent(),/Ghép xong/);assert.match(await page.locator('#puzzle-record').textContent(),/Ảnh này:/);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   if(n===6){await page.screenshot({path:`output/playwright/minigames-${mobile?'mobile':'desktop'}.png`,fullPage:true});}
   await page.locator('#puzzle-change').click();
  }
  await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>Universe.mode),'EXPLORE');assert.equal(await page.evaluate(()=>document.getElementById('experience').inert),false);
  await page.reload();await page.locator('#intro-skip-btn').click();await page.waitForFunction(()=>!document.getElementById('intro-overlay'));await page.locator('#puzzle-open').click();await page.locator('#puzzle-start').click();await page.locator('#puzzle-board button').first().waitFor();assert.match(await page.locator('#puzzle-record').textContent(),/Ảnh này:/);
  assert.deepEqual(errors,[]);await page.close();console.log(`PASS minigames ${mobile?'mobile':'desktop'}: six constellations, four grids, records, preview, pause, keyboard, modal cleanup`);
 }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
