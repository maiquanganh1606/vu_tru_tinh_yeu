const {chromium}=require('playwright');
const {PNG}=require('pngjs');
const assert=require('node:assert/strict');
const base=process.env.LOVE_TEST_URL||'http://127.0.0.1:5002/';

(async()=>{
  const browser=await chromium.launch({channel:'chrome',headless:true});
  try{
    const page=await browser.newPage({viewport:{width:1000,height:800},deviceScaleFactor:1});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(new URL('/trung-thu/?inspect',base).href);
    await page.waitForFunction(()=>window.__midAutumn?.state().assetsReady);
    // Isolate the actual animated SVG on transparent pixels at its source scale.
    await page.addStyleTag({content:'html,body{background:transparent!important}#stage{visibility:hidden}#lion-art{visibility:visible!important;position:fixed!important;left:0!important;top:0!important;bottom:auto!important;width:1000px!important;height:800px!important;transform:none!important;opacity:1!important;filter:none!important}'});
    for(const reduced of [false,true]){
      await page.emulateMedia({reducedMotion:reduced?'reduce':'no-preference'});
      for(const time of [20.5,21,22,22.25,22.5,23,23.5,24,24.5,25,25.5,26,26.5,27,28,29]){
        await page.evaluate(time=>window.__midAutumn.seek('journey',time),time);
        const png=PNG.sync.read(await page.screenshot({omitBackground:true}));
        let widest=0;
        for(let y=350;y<=380;y++){
          let run=0;
          for(let x=440;x<=560;x++){
            if(png.data[(y*png.width+x)*4+3]<128){run++;widest=Math.max(widest,run);}else run=0;
          }
        }
        assert.ok(widest<=3,`Neck gap ${widest}px at ${time}s, reduced=${reduced}`);
        if([21,25,28].includes(time)){
          // Each foot must visibly contribute to the rendered lower silhouette.
          // Counting DOM legs alone missed the front-far leg hidden behind its partner.
          for(const id of ['lion-leg-front','lion-leg-front-far','lion-leg-back','lion-leg-back-far']){
            const leg=page.locator('#'+id);
            await leg.evaluate(el=>el.style.opacity='0');
            const without=PNG.sync.read(await page.screenshot({omitBackground:true}));
            await leg.evaluate(el=>el.style.opacity='');
            let visiblePixels=0;
            for(let y=650;y<800;y++)for(let x=0;x<1000;x++){
              const i=(y*png.width+x)*4;
              const alphaDifference=Math.abs(png.data[i+3]-without.data[i+3]);
              const colorDifference=[0,1,2].reduce((sum,c)=>sum+Math.abs(png.data[i+c]-without.data[i+c]),0);
              if(alphaDifference>32||colorDifference>60)visiblePixels++;
            }
            assert.ok(visiblePixels>2500,`${id} is obscured (${visiblePixels} visible foot pixels) at ${time}s, reduced=${reduced}`);
          }
        }
      }
    }
    assert.deepEqual(errors,[]);console.log('PASS closed neck seam across 16 dance poses, four visible feet, and reduced motion');
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
