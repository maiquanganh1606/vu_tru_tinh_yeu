(() => {
    const U = window.Universe;
    let scene, camera, renderer, controller, heart, stars, halo, nebula = [], planets = [], frame, previous = 0, elapsed = 0, freezeUntil = 0;
    let started = false, slow = 0, lost = false, hoveredPlanetId = null, heartHit, heartMix = 0, heartDust, rubyHeart, heartOpacity = 1;
    const resources = new Set();
    const own = value => { resources.add(value); return value; };
    const mobile = () => innerWidth < 650;
    function glowMap() {
        const canvas = document.createElement('canvas'); canvas.width = canvas.height = 64;
        const ctx = canvas.getContext('2d'), gradient = ctx.createRadialGradient(32,32,0,32,32,32);
        gradient.addColorStop(0, '#ffffff'); gradient.addColorStop(.13, '#ffffffaa'); gradient.addColorStop(.5, '#ffffff18'); gradient.addColorStop(1, '#ffffff00');
        ctx.fillStyle = gradient; ctx.fillRect(0,0,64,64); return own(new THREE.CanvasTexture(canvas));
    }
    function makeStars(count, map) {
        const geometry=own(new THREE.BufferGeometry()),positions=new Float32Array(count*3),colors=new Float32Array(count*3),color=new THREE.Color();
        for(let i=0;i<count;i++){
            positions[i*3]=(Math.random()-.5)*2300;positions[i*3+1]=(Math.random()-.5)*1500;positions[i*3+2]=-Math.random()*1100-90;
            color.setHSL(.57+Math.random()*.25,.25,.6+Math.random()*.3);colors.set([color.r,color.g,color.b],i*3);
        }
        geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));
        const material=own(new THREE.PointsMaterial({map,size:3,vertexColors:true,transparent:true,opacity:.7,depthWrite:false,blending:THREE.AdditiveBlending}));
        const points=new THREE.Points(geometry,material);scene.add(points);return points;
    }
    function makePlanets(map) {
        const count = U.config.features.memoryPlanets ? U.config.planets.length : 0;
        for(let i=0;i<count;i++) {
            const data=U.config.planets[i], group=new THREE.Group();
            const radius = 32;
            const mesh=new THREE.Mesh(own(data.style==='crystal'?new THREE.IcosahedronGeometry(radius,1):new THREE.SphereGeometry(radius,32,24)),
                own(new THREE.MeshStandardMaterial({color:data.color,roughness:data.style==='crystal'?.2:.75,metalness:data.style==='crystal'?.5:.12,flatShading:data.style==='crystal',emissive:data.color,emissiveIntensity:.13})));
            group.add(mesh);
            const atmosphere=new THREE.Sprite(own(new THREE.SpriteMaterial({map,color:data.color,opacity:.35,blending:THREE.AdditiveBlending,depthWrite:false})));
            atmosphere.scale.set(132,132,1); group.add(atmosphere);
            if(data.style==='ring') {
                const ring=new THREE.Mesh(own(new THREE.RingGeometry(42,59,64)),own(new THREE.MeshBasicMaterial({color:data.color,side:THREE.DoubleSide,transparent:true,opacity:.35,depthWrite:false})));
                ring.rotation.x=1.1; ring.rotation.y=.3; group.add(ring);
            }
            const orbit=new THREE.EllipseCurve(0,0,1,1,0,2*Math.PI,false,0).getPoints(100);
            const orbitGeo=own(new THREE.BufferGeometry().setFromPoints(orbit.map(v=>new THREE.Vector3(v.x,v.y,0))));
            const line=new THREE.LineLoop(orbitGeo,own(new THREE.LineBasicMaterial({color:data.color,transparent:true,opacity:.1})));
            scene.add(line,group); planets.push({data,group,mesh,line,phase:i/count*Math.PI*2-.5,index:i,
                scale:1,targetScale:1,lift:0,targetLift:0,glow:.13,targetGlow:.13,orbitOpacity:.1,targetOrbitOpacity:.1});
        }
    }
    function positions() {
        if (!camera) return;
        const extent=Math.min(260,620*Math.tan(THREE.MathUtils.degToRad(52/2))*camera.aspect*.72);
        for(const planet of planets) {
            const angle=planet.phase+elapsed*.025;
            planet.group.position.set(Math.cos(angle)*extent,Math.sin(angle)*150-15+planet.lift,Math.sin(angle)*35-10);
            planet.line.scale.set(extent,150,1); planet.line.position.y=-15; planet.line.rotation.z=.1*planet.index;
        }
    }
    function init() {
        const map=glowMap(); scene=new THREE.Scene();
        camera=new THREE.PerspectiveCamera(52,innerWidth/innerHeight,.5,2400);
        renderer=new THREE.WebGLRenderer({antialias:!mobile(),alpha:true,powerPreference:'default'});
        renderer.outputEncoding=THREE.sRGBEncoding; renderer.setClearColor(0,0);
        U.$('canvas-container').append(renderer.domElement); controller=new U.CameraController(camera);
        scene.add(new THREE.AmbientLight(0x8e80ad,.9));
        const key=new THREE.PointLight(0xffd9eb,1.8,1500); key.position.set(-120,160,250); scene.add(key);
        const back=new THREE.PointLight(0x82b4ff,1.3,1400); back.position.set(300,-70,-50); scene.add(back);
        rubyHeart=U.createRubyHeart(own); heart=rubyHeart.group; scene.add(heart); stars=makeStars(4000,map);
        heartHit = new THREE.Mesh(own(new THREE.SphereGeometry(1, 16, 12)), own(new THREE.MeshBasicMaterial({transparent:true, opacity:0, depthWrite:false})));
        heartHit.position.set(0, 12, 0); scene.add(heartHit);
        const dustGeometry=own(new THREE.BufferGeometry());
        const dustPositions=[];
        for(let i=0;i<320;i++){const a=i/320*Math.PI*2,r=100+Math.random()*24;dustPositions.push(Math.cos(a)*r,Math.sin(a)*r*.6,Math.sin(a*3)*30);}
        dustGeometry.setAttribute("position",new THREE.Float32BufferAttribute(dustPositions,3));
        heartDust=new THREE.Points(dustGeometry,own(new THREE.PointsMaterial({map,color:0xffb9dc,size:2,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending})));scene.add(heartDust);
        halo=new THREE.Sprite(own(new THREE.SpriteMaterial({map,color:0xe86dbe,opacity:.23,blending:THREE.AdditiveBlending,depthWrite:false})));
        halo.scale.set(300,300,1); halo.position.z=-35; scene.add(halo);
        for(let i=0;i<5;i++) {
            const sprite=new THREE.Sprite(own(new THREE.SpriteMaterial({map,color:i%2?0x536ba9:0x773780,opacity:.15,blending:THREE.AdditiveBlending,depthWrite:false})));
            sprite.position.set((i-2)*180,Math.sin(i)*160,-450-i*40); sprite.scale.set(750,480,1); scene.add(sprite); nebula.push(sprite);
        }
        makePlanets(map); resize(); quality(); positions();
        renderer.domElement.addEventListener('webglcontextlost', event => { event.preventDefault(); fallback(); });
        const raycaster=new THREE.Raycaster(), mouse=new THREE.Vector2();
        let down;
        renderer.domElement.addEventListener('pointerdown',event=>{down={x:event.clientX,y:event.clientY};});
        renderer.domElement.addEventListener('pointermove', event => {
            if (event.pointerType !== 'mouse' || U.mode !== 'EXPLORE') return;
            mouse.set(event.clientX/innerWidth*2-1,-event.clientY/innerHeight*2+1);
            raycaster.setFromCamera(mouse,camera);
            const planetHit=raycaster.intersectObjects(planets.map(p=>p.mesh))[0];
            const heartHover=raycaster.intersectObject(heartHit)[0];
            U.scene.hover(planetHit ? planets.find(p=>p.mesh===planetHit.object).data.id : null);
            renderer.domElement.classList.toggle('heart-target', Boolean(heartHover)&&U.config.features.heartFocus!==false);
        });
        renderer.domElement.addEventListener('pointercancel',()=>{down=null;});
        renderer.domElement.addEventListener('pointerleave', event => { renderer.domElement.classList.remove('heart-target');if (event.pointerType === 'mouse') U.scene.hover(null); });
        // Open on click so the synthetic touch click cannot dismiss the new overlay.
        renderer.domElement.addEventListener('click',event=>{
            if(U.mode!=='EXPLORE'||!down||Math.hypot(event.clientX-down.x,event.clientY-down.y)>10)return;
            mouse.set(event.clientX/innerWidth*2-1,-event.clientY/innerHeight*2+1); raycaster.setFromCamera(mouse,camera);
            const heartClick=raycaster.intersectObject(heartHit)[0];
            const hit=raycaster.intersectObjects(planets.map(p=>p.mesh))[0];
            if(hit)U.planets.select(planets.find(p=>p.mesh===hit.object).data.id);
            else if(heartClick) U.openHeartFocus?.();
            else window.toggleUIPanel?.(true);
            down=null;
        });
    }
    function quality() {
        if(!renderer)return;
        const light=U.light||U.reduced||mobile();
        renderer.setPixelRatio(Math.min(devicePixelRatio,light?1.1:1.75)); renderer.setSize(innerWidth,innerHeight);
        rubyHeart.quality(U.light||U.reduced?'light':mobile()?'balanced':'high',renderer.getPixelRatio()); stars.geometry.setDrawRange(0,light?1400:4000);
        document.body.classList.toggle('light-effects',U.light||U.reduced);
    }
    function resize() {
        if(!renderer)return;
        camera.aspect=innerWidth/innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth,innerHeight);
        if(U.mode==='EXPLORE')positions();
        if(U.scene.heartActive)U.scene.focusHeart(()=>{if(U.scene.heartActive)U.setMode('HEART_FOCUS');});
        if(U.mode==='PLANET_VIEW')U.scene.focus(U.planets.selected,()=>{});
    }
    function cleanup() {
        resources.forEach(resource=>resource.dispose()); resources.clear();
        renderer?.dispose(); U.$('canvas-container').replaceChildren(); renderer=null; scene=null; planets=[]; nebula=[];
    }
    function fallback() {
        lost=true; cleanup();
        U.recoverHeart?.(); document.body.classList.add('no-webgl');
        const oldMode=U.mode;U.modal.recoverScene();
        if(U.planets?.selected){U.planets.leave(true);if(oldMode==='MODAL')U.setMode('MODAL');}
        document.querySelectorAll('.planet-label').forEach(button=>{button.hidden=false;});
        U.announce('Bầu trời chuyển sang chế độ nhẹ. Các kỷ niệm vẫn ở đây.');
    }
    function tick(now) {
        frame=requestAnimationFrame(tick);
        if(document.hidden){previous=now;return;}
        const raw=previous?(now-previous)/1000:1/60; previous=now;
        const dt=Math.min(.05,raw), audio=U.audio.update(dt,now/1000);
        const move=['EXPLORE','HEART_FOCUS','HEART_TRANSITION'].includes(U.mode)&&!U.reduced&&now>=freezeUntil;
        if(move)elapsed+=dt;
        U.meteors?.update(dt,now);
        if(!renderer||now<freezeUntil)return;
        if(move)positions();
        if(['EXPLORE','HEART_FOCUS'].includes(U.mode)&&!U.light&&raw>.025)slow+=dt;else slow=Math.max(0,slow-dt);
        if(slow>4){U.light=true;quality();U.$('quality-btn').setAttribute('aria-pressed','true');U.announce('Đã giảm hiệu ứng để bầu trời mượt hơn.');}
        controller.update(now<freezeUntil?0:dt);
        const heartFocus=Boolean(U.scene.heartActive);
        heartMix += ((heartFocus?1:0)-heartMix)*(1-Math.exp(-dt*(U.reduced?35:4)));
        const gentle=U.light||U.reduced||U.mode==='MODAL';
        const focused=['PLANET_TRANSITION','PLANET_VIEW'].includes(U.mode)||(U.mode==='MODAL'&&U.planets.selected);
        heartOpacity+=((focused?.035:1)-heartOpacity)*(1-Math.exp(-dt*5));
        const phase=(elapsed%1.18)/1.18;
        const peak=(center,width)=>Math.exp(-(((phase-center)/width)**2));
        const heartbeat=U.reduced?0:Math.max(-.02,Math.min(.10,-.018*peak(.10,.045)+.065*peak(.21,.045)+.027*peak(.36,.055)+audio.beatPulse*.025));
        const heartBaseScale = mobile() ? 1.18 : 1.38;
        const focusScale = 1 + heartMix * .5;
        heart.scale.setScalar(heartBaseScale*focusScale*(1+heartbeat));
        const targetRotation=U.reduced?0:Math.sin(elapsed*.16)*.28*(1-heartMix)+Math.sin(elapsed*.45)*.12*heartMix;
        heart.rotation.y+=(targetRotation-heart.rotation.y)*(1-Math.exp(-dt*4));
        heart.position.y=heartMix*48;
        heartHit.scale.set(90*heartBaseScale,85*heartBaseScale,32);
        heartHit.position.y=heart.position.y+12;
        rubyHeart.update({time:elapsed,focus:heartMix,opacity:heartOpacity,motion:!U.reduced,pointer:controller.pointer,beat:Math.max(0,heartbeat)*10});
        heartDust.material.opacity=heartMix*.65;heartDust.position.copy(heart.position);heartDust.scale.setScalar(heartBaseScale*focusScale);
        if(!U.reduced){heartDust.rotation.z+=dt*.045;halo.position.x+=(controller.pointer.x*18*heartMix-halo.position.x)*dt*3;}
        stars.material.opacity=.48+(gentle?0:audio.bass*.3);
        halo.material.opacity=focused?.025:.12+heartMix*.10+(gentle?0:audio.energy*.06);
        halo.scale.set(300+heartMix*170,300+heartMix*170,1);halo.position.y=heart.position.y;
        nebula.forEach((cloud,i)=>{cloud.material.color.setHSL(.64+i*.035+(gentle?0:audio.treble*.09),.48,.4);cloud.material.opacity=.15*(1-heartMix*.7);});
        planets.forEach(p=>{
            p.group.visible = heartMix < .97;
            const isHovered = hoveredPlanetId === p.data.id;
            const isSelected = U.planets?.selected === p.data.id;
            p.targetScale = isSelected ? 1.2 : isHovered ? 1.28 : 1;
            p.targetLift = isSelected ? 12 : isHovered ? 10 : 0;
            p.targetGlow = isSelected ? .34 : isHovered ? .28 : .13;
            p.targetOrbitOpacity = isSelected ? .24 : isHovered ? .2 : .1;
            p.scale += (p.targetScale-p.scale)*(1-Math.exp(-dt*7));
            p.lift += (p.targetLift-p.lift)*(1-Math.exp(-dt*7));
            p.glow += (p.targetGlow-p.glow)*(1-Math.exp(-dt*7));
            p.orbitOpacity += (p.targetOrbitOpacity-p.orbitOpacity)*(1-Math.exp(-dt*7));
            p.group.scale.setScalar(p.scale);
            p.mesh.material.emissiveIntensity=p.glow;
            p.line.material.opacity=p.orbitOpacity*(1-heartMix);
            p.group.traverse(obj=>{if(obj.material){obj.material.transparent=true;obj.material.opacity=(obj===p.mesh?1:.35)*(1-heartMix*.94);}});
            if(move)p.mesh.rotation.y+=dt*.12;
        });
        renderer.render(scene,camera); U.planets?.project();
    }
    U.scene={
        start(){if(started)return;started=true;try{if(!window.THREE)throw new Error('No WebGL');init();}catch{fallback();}frame=requestAnimationFrame(tick);},
        get available(){return Boolean(renderer)&&!lost;},
        get renderer(){return renderer;},
        get camera(){return camera;},
        freeze(ms){freezeUntil=performance.now()+ms;},
        hover(value){hoveredPlanetId=value;},
        debugOrbit(){return elapsed;},
        debugHeart(){return rubyHeart?.debug();},
        project(id,offset=new THREE.Vector3()){
            const p=planets.find(p=>p.data.id===id); if(!p||!camera)return null;
            const v=p.group.position.clone().add(offset).project(camera);
            return{x:(v.x*.5+.5)*innerWidth,y:(-v.y*.5+.5)*innerHeight,visible:v.z>-1&&v.z<1&&Math.abs(v.x)<1.2&&Math.abs(v.y)<1.2};
        },
        focus(id,done){
            const p=planets.find(p=>p.data.id===id);if(!p||!renderer){done();return;}
            const target=p.group.position.clone(),position=target.clone().add(new THREE.Vector3(0,0,mobile()?330:245));
            controller.move(position,target,done);
        },
        focusHeart(done){
            if(!controller||!renderer){done?.();return;}
            const distance=Math.max(430,300/Math.max(.35,camera.aspect));
            const offset=innerHeight<550?100:0;
            const position=new THREE.Vector3(offset, 18, distance);
            controller.move(position,new THREE.Vector3(offset,12,0),done);
        },
        home(done){if(controller&&renderer)controller.reset(done);else done();},
        dispose(){cancelAnimationFrame(frame);cleanup();window.removeEventListener('resize',resize);}
    };
    window.addEventListener('resize',resize); window.addEventListener('universe:quality',quality);
    document.addEventListener('pointermove',event=>{if(controller&&event.pointerType==='mouse')controller.pointer={x:event.clientX/innerWidth*2-1,y:1-event.clientY/innerHeight*2};});
    window.addEventListener('pagehide',event=>{if(!event.persisted)U.scene.dispose();});
})();
