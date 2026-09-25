const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const base=process.env.LOVE_TEST_URL||'http://127.0.0.1:5002/';

// A transparent canvas must not retain glow colour after its alpha reaches zero.
// Such pixels get clipped by compositors that unpremultiply the canvas texture,
// exposing a detached circular edge even when Chromium's screenshot looks smooth.
(async()=>{
  const browser=await chromium.launch({channel:'chrome',headless:true});
  try{
    const page=await browser.newPage({viewport:{width:720,height:720},reducedMotion:'reduce'});
    await page.goto(new URL('/trung-thu/?inspect',base).href);
    await page.waitForFunction(()=>window.__midAutumn?.state().assetsReady);
    const results=await page.evaluate(async()=>{
      const {createScene}=await import('/static/mid-autumn/scene.js');
      const canvas=document.createElement('canvas');
      const art=createScene(canvas,()=>{throw Error('WebGL unavailable in halo regression');});
      art.renderer.setPixelRatio(1);art.renderer.setSize(720,720,false);
      art.camera.aspect=1;art.camera.position.set(0,0,9);art.camera.lookAt(0,0,0);art.camera.updateProjectionMatrix();
      const gl=art.renderer.getContext(),pixels=new Uint8Array(720*720*4),results=[];
      for(const [name,target] of [['moon',art.moon],['lantern',art.lantern]]){
        art.scene.children.forEach(child=>child.visible=child===target);
        target.children.forEach(child=>child.visible=child.isSprite);
        art.renderer.render(art.scene,art.camera);
        gl.readPixels(0,0,720,720,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
        let invalidTail=0,visiblePixels=0;
        for(let i=0;i<pixels.length;i+=4){
          const colour=Math.max(pixels[i],pixels[i+1],pixels[i+2]),alpha=pixels[i+3];
          if(alpha===0&&colour>1)invalidTail++;
          if(alpha>1&&colour>1)visiblePixels++;
        }
        results.push({name,invalidTail,visiblePixels});
      }
      art.dispose();return results;
    });
    for(const {name,invalidTail,visiblePixels} of results){
      assert.ok(visiblePixels>100,`${name}: glow must still be visible`);
      assert.equal(invalidTail,0,`${name}: colour outside alpha coverage creates a clipped halo edge`);
    }
    console.log('PASS moon and lantern glow fade to transparent without leftover colour');
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
