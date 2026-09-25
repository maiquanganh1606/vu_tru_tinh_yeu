const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const url=new URL('/trung-thu/?inspect',process.env.LOVE_TEST_URL||'http://127.0.0.1:5002/').href;

// Observe the real renderer without adding a production-only testing API.
async function observeScene(page){
  await page.addInitScript(()=>document.addEventListener('load',event=>{
    if(event.target.tagName!=='SCRIPT'||!event.target.src.includes('three-r128'))return;
    const Original=window.THREE.WebGLRenderer;
    window.THREE.WebGLRenderer=class extends Original{
      constructor(options){super(options);const render=this.render;this.render=(scene,camera)=>{window.__celestialScene=scene;return render.call(this,scene,camera);};}
    };
  },true));
}
async function verifyWings(page,selected,fallback){
  assert.deepEqual(await page.locator('.stitch').evaluateAll(buttons=>buttons.flatMap((b,i)=>b.getAttribute('aria-pressed')==='true'?[i]:[])),selected);
  const expected=Array.from({length:5},(_,i)=>selected.includes(i));
  assert.deepEqual(await page.locator('.fallback-wings [data-wing]').evaluateAll(wings=>wings.map(w=>w.classList.contains('is-lit'))),expected);
  if(fallback)return;
  const facets=await page.evaluate(()=>{
    const result=Array.from({length:5},()=>[]);
    window.__celestialScene.traverse(object=>{
      if(!object.material?.isMeshPhysicalMaterial)return;
      const positions=object.geometry.attributes.position;let x=0,y=0,r=0;
      for(let i=0;i<positions.count;i++){
        const length=Math.hypot(positions.getX(i),positions.getY(i));
        if(length>r){r=length;x=positions.getX(i);y=positions.getY(i);}
      }
      // Derive each actual outer tip from geometry, independently of material wing IDs.
      const angle=(Math.atan2(y,x)-Math.PI/2+Math.PI*2)%(Math.PI*2);
      result[Math.round(angle/(Math.PI*2/5))%5].push(object.material.emissiveIntensity>.1);
    });
    return result;
  });
  assert.deepEqual(facets,expected.map(on=>[on,on]),'A button must light both facets of exactly one complete wing');
}

(async()=>{
  fs.mkdirSync('output/playwright',{recursive:true});
  const browser=await chromium.launch({channel:'chrome',headless:true});
  try{
    for(const [name,mobile,fallback] of [['desktop',false,false],['mobile',true,false],['fallback',true,true]]){
      const page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1440,height:900},isMobile:mobile,hasTouch:mobile,reducedMotion:'reduce'});
      const errors=[];page.on('pageerror',e=>errors.push(e.message));await observeScene(page);
      if(fallback)await page.route('**/vendor/three-r128.min.js',route=>route.abort());
      await page.goto(url);await page.waitForFunction(()=>window.__midAutumn?.state().assetsReady);
      assert.equal(await page.locator('#fallback-lantern').isVisible(),fallback);
      const prefix=`output/playwright/moon-star-rose-${name}`;
      await page.screenshot({path:`${prefix}-home.png`});await page.locator('#begin').click();
      await verifyWings(page,[],fallback);await page.screenshot({path:`${prefix}-0.png`});
      const selected=[];
      for(const index of [0,3,1,4,2]){
        const button=page.locator('.stitch').nth(index);
        if(mobile)await button.tap();else{await button.focus();await page.keyboard.press('Space');}
        selected.push(index);selected.sort();await verifyWings(page,selected,fallback);
        assert.equal(await page.locator('body').getAttribute('data-mode'),selected.length===5?'journey':'lantern');
        if(selected.length<5){
          await button.click();assert.equal(await page.evaluate(()=>window.__midAutumn.state().lit),selected.length,'Repeated activation must not advance progress');
          await page.screenshot({path:`${prefix}-${selected.length}.png`});
        }
      }
      assert.equal(await page.evaluate(()=>window.__midAutumn.state().frame),0);
      const still=await page.screenshot();await page.waitForTimeout(200);assert.ok(still.equals(await page.screenshot()),'Reduced motion must leave new artwork still');
      await page.locator('#skip').click();await page.locator('#to-wish').click();await page.locator('#wish').fill('Một đêm trăng thật dịu dàng');await page.locator('#send-wish').click();await page.locator('#skip').click();
      await page.locator('#restart').click();await page.locator('#begin').click();await verifyWings(page,[],fallback);
      await page.locator('#light-all').click();await verifyWings(page,[0,1,2,3,4],fallback);assert.equal(await page.locator('body').getAttribute('data-mode'),'journey');
      assert.deepEqual(errors,[]);await page.close();
      console.log(`PASS ${name}: complete wings, arbitrary order, repeat activation, keyboard/touch, 5/5 gate, restart, light-all, reduced motion`);
    }
    const page=await browser.newPage({viewport:{width:1440,height:900}});await observeScene(page);
    await page.goto(url);await page.waitForFunction(()=>window.__midAutumn?.state().assetsReady);await page.locator('#begin').click();await page.locator('.stitch').nth(2).click();
    const pulse=()=>page.evaluate(()=>{let opacity;window.__celestialScene.traverse(o=>{if(o.userData.size&&o.visible)opacity=o.material.opacity;});return opacity;});
    const before=await pulse();await page.waitForTimeout(350);assert.notEqual(await pulse(),before,'Lit sparkles should animate in normal motion');
    await page.evaluate(()=>window.__midAutumn.loseContext());await page.waitForFunction(()=>!window.__midAutumn.measure().webgl);assert.equal(await page.locator('#fallback-lantern').isVisible(),true);await verifyWings(page,[2],true);
    await page.locator('.stitch').nth(4).click();await verifyWings(page,[2,4],true);await page.close();
    console.log('PASS normal twinkle and context loss retain individually lit wings');
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
