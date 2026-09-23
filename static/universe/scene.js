(() => {
    const U = window.Universe;
    let scene, camera, renderer, controller, heart, stars, halo, nebula = [], planets = [], frame, previous = 0, elapsed = 0, freezeUntil = 0;
    let started = false, slow = 0, lost = false, hoveredPlanetId = null, heartHit, heartMix = 0, heartDust, rubyHeart, energyVortex, heartBounds, heartOpacity = 1;
    let vortexInput=null, vortexRay, vortexPlane, vortexNormal, vortexHit, vortexPointer;
    const resources = new Set();
    const own = value => { resources.add(value); return value; };
    const mobile = () => innerWidth < 650;
    function glowMap() {
        const canvas = document.createElement('canvas'); canvas.width = canvas.height = 64;
        const ctx = canvas.getContext('2d'), gradient = ctx.createRadialGradient(32,32,0,32,32,32);
        gradient.addColorStop(0, '#ffffff'); gradient.addColorStop(.13, '#ffffffaa'); gradient.addColorStop(.5, '#ffffff18'); gradient.addColorStop(1, '#ffffff00');
        ctx.fillStyle = gradient; ctx.fillRect(0,0,64,64); return own(new THREE.CanvasTexture(canvas));
    }
    let orbBackdrop, orbLevel = 'balanced';
    function glassMaterial(color) {
        return own(new THREE.ShaderMaterial({transparent:true,depthWrite:false,
            uniforms:{uTint:{value:new THREE.Color(color)},uBackdrop:{value:null},
                uResolution:{value:new THREE.Vector2(1,1)},uRefract:{value:0},
                uAwake:{value:0},uFade:{value:1}},
            vertexShader:`varying vec3 vNormal;varying vec3 vView;
                void main(){vec4 p=modelViewMatrix*vec4(position,1.);
                vNormal=normalize(normalMatrix*normal);vView=-p.xyz;
                gl_Position=projectionMatrix*p;}`,
            fragmentShader:`uniform vec3 uTint;uniform sampler2D uBackdrop;
                uniform vec2 uResolution;uniform float uRefract,uAwake,uFade;
                varying vec3 vNormal;varying vec3 vView;
                void main(){vec3 n=normalize(vNormal),v=normalize(vView);
                    float facing=max(0.,dot(n,v));float rim=pow(1.-facing,3.);
                    float pink=pow(max(0.,dot(reflect(-v,n),normalize(vec3(-.6,.7,1.)))),48.);
                    float cyan=pow(max(0.,dot(reflect(-v,n),normalize(vec3(.8,-.25,1.)))),64.);
                    vec3 light=mix(uTint,vec3(.7,.88,1.),.35)*rim*.72;
                    light+=vec3(1.,.55,.8)*pink*.9+vec3(.3,.9,1.)*cyan*.8;
                    float alpha=clamp(.045+rim*.62+pink*.7+cyan*.6,0.,.92);
                    alpha*=1.-uAwake*.28;
                    if(uRefract>.5){
                        vec2 uv=gl_FragCoord.xy/uResolution;
                        vec2 bend=n.xy*facing*30./uResolution;
                        vec4 background=texture2D(uBackdrop,clamp(uv-bend,vec2(.001),vec2(.999)));
                        vec3 reflection=texture2D(uBackdrop,clamp(uv+n.xy*.08,vec2(.001),vec2(.999))).rgb;
                        float coverage=max(alpha,background.a);
                        gl_FragColor=vec4((background.rgb+reflection*rim*.16+light*(1.-uAwake*.15))/max(.12,coverage),coverage*uFade);
                    }else gl_FragColor=vec4(light/max(.12,alpha),alpha*uFade);
                }`
        }));
    }
    function makeStars(count, map) {
        const geometry=own(new THREE.BufferGeometry()),positions=new Float32Array(count*3),colors=new Float32Array(count*3),phases=new Float32Array(count),sizes=new Float32Array(count),color=new THREE.Color();
        for(let i=0;i<count;i++){
            positions[i*3]=(Math.random()-.5)*2300;positions[i*3+1]=(Math.random()-.5)*1500;positions[i*3+2]=-Math.random()*1100-90;
            color.setHSL(.57+Math.random()*.25,.25,.6+Math.random()*.3);colors.set([color.r,color.g,color.b],i*3);
            phases[i]=Math.random()*Math.PI*2;sizes[i]=2.2+Math.random()*4.2;
        }
        geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));
        geometry.setAttribute('aPhase',new THREE.BufferAttribute(phases,1));geometry.setAttribute('aSize',new THREE.BufferAttribute(sizes,1));
        const material=own(new THREE.ShaderMaterial({transparent:true,depthWrite:false,vertexColors:true,blending:THREE.AdditiveBlending,
            uniforms:{uTime:{value:0},uOpacity:{value:.7}},
            vertexShader:`attribute float aPhase;attribute float aSize;uniform float uTime;varying vec3 vColor;varying float vTwinkle;void main(){vColor=color;vTwinkle=.62+.38*sin(uTime*(1.4+fract(aPhase*2.7)*1.8)+aPhase);vec4 mv=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*mv;gl_PointSize=clamp(aSize*vTwinkle*700./max(1.,-mv.z),.9,10.);}`,
            fragmentShader:`uniform float uOpacity;varying vec3 vColor;varying float vTwinkle;void main(){vec2 p=gl_PointCoord*2.-1.;float r=length(p);if(r>1.)discard;float glow=exp(-r*r*3.6);gl_FragColor=vec4(vColor,glow*uOpacity*vTwinkle);}`
        }));
        const points=new THREE.Points(geometry,material);scene.add(points);return points;
    }
    function makePlanets(map) {
        const count = U.config.features.memoryPlanets ? U.config.planets.length : 0;
        for(let i=0;i<count;i++) {
            const data=U.config.planets[i], group=new THREE.Group();
            const radius = 32;
            const shellMaterial=glassMaterial(data.color);
            const shell=new THREE.Mesh(own(new THREE.SphereGeometry(radius,40,28)),shellMaterial);
            shell.renderOrder=3; group.add(shell);
            const core=new THREE.Sprite(own(new THREE.SpriteMaterial({map,color:data.color,opacity:.9,blending:THREE.AdditiveBlending,depthWrite:false})));
            core.scale.set(38,38,1); core.renderOrder=4; group.add(core);
            const atmosphere=new THREE.Sprite(own(new THREE.SpriteMaterial({map,color:data.color,opacity:.35,blending:THREE.AdditiveBlending,depthWrite:false})));
            atmosphere.scale.set(132,132,1); group.add(atmosphere);
            // A tiny moon gives each memory world a second rhythm and breaks the flat cutout look.
            const moonOrbit = new THREE.Group();
            const moon = new THREE.Sprite(own(new THREE.SpriteMaterial({map,color:data.color,opacity:.95,blending:THREE.AdditiveBlending,depthWrite:false})));
            moon.scale.set(14,14,1); moon.position.x = 54 + i * 4; moonOrbit.add(moon); group.add(moonOrbit);
            for(let t=1;t<=9;t++){
                const trail=new THREE.Sprite(own(new THREE.SpriteMaterial({map,color:data.color,transparent:true,opacity:.4,blending:THREE.AdditiveBlending,depthWrite:false})));
                const a=-t*.07,r=54+i*4;trail.position.set(Math.cos(a)*r,0,Math.sin(a)*r);
                trail.scale.setScalar(11-t*.8);trail.userData.trail=t;moonOrbit.add(trail);
            }
            const dustPositions=new Float32Array(1800*3);
            for(let n=0;n<1800;n++){const a=Math.random()*Math.PI*2,r=44+Math.random()*17;dustPositions[n*3]=Math.cos(a)*r;dustPositions[n*3+1]=(Math.random()-.5)*3;dustPositions[n*3+2]=Math.sin(a)*r*.62;}
            const dustGeometry=own(new THREE.BufferGeometry()); dustGeometry.setAttribute('position',new THREE.Float32BufferAttribute(dustPositions,3));
            const dust= new THREE.Points(dustGeometry,own(new THREE.PointsMaterial({map,color:data.color,size:1.9,transparent:true,opacity:.62,depthWrite:false,blending:THREE.AdditiveBlending})));
            dust.rotation.x=1.1; dust.rotation.z=.12+i*.25; group.add(dust);
            const orbit=new THREE.EllipseCurve(0,0,1,1,0,2*Math.PI,false,0).getPoints(100);
            const orbitGeo=own(new THREE.BufferGeometry().setFromPoints(orbit.map(v=>new THREE.Vector3(v.x,v.y,0))));
            const line=new THREE.LineLoop(orbitGeo,own(new THREE.LineBasicMaterial({color:data.color,transparent:true,opacity:.1})));
            const tilt = [-.16,.11,.21][i] || 0;
            group.rotation.x = tilt; group.rotation.z = (i - 1) * .12;
            line.rotation.x = tilt; line.rotation.y = (i - 1) * .14;
            scene.add(line,group); planets.push({data,group,mesh:shell,shell,core,line,atmosphere,moonOrbit,dust,phase:i/count*Math.PI*2-.5,index:i,
                scale:1,targetScale:1,lift:0,targetLift:0,glow:.13,targetGlow:.13,orbitOpacity:.1,targetOrbitOpacity:.1,moonPhase:i*2.1});
        }
    }
    function positions() {
        if (!camera) return;
        const extent=Math.min(260,620*Math.tan(THREE.MathUtils.degToRad(52/2))*camera.aspect*.72);
        for(const planet of planets) {
            const angle=planet.phase+elapsed*.025;
            planet.group.position.set(Math.cos(angle)*extent,Math.sin(angle)*150-15+planet.lift,Math.sin(angle)*35-10);
            planet.line.scale.set(extent,150,1); planet.line.position.y=-15;
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
        rubyHeart=U.createRubyHeart(own); heart=rubyHeart.group; heartBounds=rubyHeart.bounds(); scene.add(heart);
        if(U.config.features.energyVortex!==false){
            try { energyVortex=U.createEnergyVortex(own); scene.add(energyVortex.group); }
            catch { energyVortex=null; }
        }
        vortexRay=new THREE.Raycaster();vortexPlane=new THREE.Plane();vortexNormal=new THREE.Vector3();
        vortexHit=new THREE.Vector3();vortexPointer=new THREE.Vector2();
        stars=makeStars(4000,map);
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
        orbBackdrop=own(new THREE.WebGLRenderTarget(1,1,{depthBuffer:true}));
        makePlanets(map); resize(); positions();
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
        if(U.reduced)vortexInput=null;
        const light=U.light||U.reduced||mobile();
        renderer.setPixelRatio(Math.min(devicePixelRatio,light?1.1:1.75)); renderer.setSize(innerWidth,innerHeight);
        const level=U.light||U.reduced?'light':mobile()?'balanced':'high';
        rubyHeart.quality(level,renderer.getPixelRatio()); energyVortex?.quality(level,renderer.getPixelRatio());
        stars.geometry.setDrawRange(0,light?1400:4000);
        orbLevel=level;
        if(orbBackdrop)orbBackdrop.setSize(level==='high'?Math.max(1,Math.floor(innerWidth*renderer.getPixelRatio())):1,level==='high'?Math.max(1,Math.floor(innerHeight*renderer.getPixelRatio())):1);
        for(const p of planets){
            p.shell.visible=level!=='light';p.dust.visible=level!=='light';p.moonOrbit.visible=level!=='light';
            p.dust.geometry.setDrawRange(0,level==='high'?1800:600);
            p.shell.material.uniforms.uRefract.value=level==='high'?1:0;
            p.shell.material.uniforms.uBackdrop.value=orbBackdrop.texture;
            renderer.getDrawingBufferSize(p.shell.material.uniforms.uResolution.value);
        }
        document.body.classList.toggle('light-effects',U.light||U.reduced);
    }
    function resize() {
        if(!renderer)return;
        camera.aspect=innerWidth/innerHeight; camera.updateProjectionMatrix(); quality();
        if(U.mode==='EXPLORE')positions();
        if(U.scene.heartActive)U.scene.focusHeart(()=>{if(U.scene.heartActive)U.setMode('HEART_FOCUS');});
        if(U.mode==='PLANET_VIEW')U.scene.focus(U.planets.selected,()=>{});
    }
    function cleanup() {
        resources.forEach(resource=>resource.dispose()); resources.clear();
        renderer?.dispose(); U.$('canvas-container').replaceChildren(); renderer=null; scene=null; planets=[]; nebula=[]; energyVortex=null; heartBounds=null; vortexInput=null;
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
        const beatPulse=Math.max(0,Math.min(1,heartbeat*10));
        const heartBaseScale = mobile() ? 1.18 : 1.38;
        const focusScale = 1 + heartMix * .2;
        heart.scale.setScalar(heartBaseScale*focusScale*(1+heartbeat));
        const targetRotation=U.reduced?0:Math.sin(elapsed*.16)*.28*(1-heartMix)+Math.sin(elapsed*.45)*.12*heartMix;
        heart.rotation.y+=(targetRotation-heart.rotation.y)*(1-Math.exp(-dt*4));
        heart.position.y=heartMix*(innerHeight<550?20:105);
        heartHit.scale.set(90*heartBaseScale,85*heartBaseScale,32);
        heartHit.position.y=heart.position.y+12;
        rubyHeart.update({time:elapsed,focus:heartMix,opacity:heartOpacity,motion:!U.reduced,pointer:controller.pointer,beat:beatPulse});
        if(energyVortex&&heartBounds){
            const layoutScale=heartBaseScale*focusScale;
            const radius=(heartBounds.maxX-heartBounds.minX)*.36*layoutScale;
            // Reserve room for the beating tip and the near edge of the tilted disk.
            const gap=Math.abs(heartBounds.minY)*layoutScale*.10+radius*.20+4;
            const anchorY=heart.position.y+heartBounds.minY*layoutScale-gap;
            const pedestal=energyVortex.group;
            pedestal.position.set(0,anchorY,0);pedestal.scale.setScalar(radius);
            const elevation=Math.atan2(camera.position.y-anchorY,Math.hypot(camera.position.x,camera.position.z));
            pedestal.rotation.x=THREE.MathUtils.clamp(Math.asin(.24)-elevation,-.14,.16);
            pedestal.updateMatrixWorld(true);camera.updateMatrixWorld();
            let localPointer=null;
            if(vortexInput&&heartFocus&&!U.reduced&&['HEART_FOCUS','HEART_TRANSITION'].includes(U.mode)){
                vortexRay.setFromCamera(vortexInput,camera);
                vortexNormal.set(0,1,0).applyQuaternion(pedestal.quaternion);
                vortexPlane.setFromNormalAndCoplanarPoint(vortexNormal,pedestal.position);
                if(Math.abs(vortexRay.ray.direction.dot(vortexNormal))>.04&&vortexRay.ray.intersectPlane(vortexPlane,vortexHit)){
                    pedestal.worldToLocal(vortexHit);
                    if(Math.hypot(vortexHit.x,vortexHit.z)<1.4)localPointer=vortexPointer.set(vortexHit.x,vortexHit.z);
                }
            }
            const tipY=heart.position.y+heartBounds.minY*heart.scale.y;
            energyVortex.update({motionDelta:move?dt:0,focus:heartMix,opacity:heartOpacity*(gentle?.82:1),
                motion:!U.reduced,pointer:localPointer,beat:beatPulse,
                height:Math.max(.12,(tipY-anchorY)/radius+.12)});
        }
        heartDust.material.opacity=heartMix*.65;heartDust.position.copy(heart.position);heartDust.scale.setScalar(heartBaseScale*focusScale);
        if(!U.reduced){heartDust.rotation.z+=dt*.045;halo.position.x+=(controller.pointer.x*18*heartMix-halo.position.x)*dt*3;}
        stars.material.uniforms.uTime.value=elapsed; stars.material.uniforms.uOpacity.value=.7+(gentle?0:audio.bass*.22);
        halo.material.opacity=focused?.025:.12+heartMix*.10+(gentle?0:audio.energy*.06);
        halo.scale.set(300+heartMix*170,300+heartMix*170,1);halo.position.y=heart.position.y;
        nebula.forEach((cloud,i)=>{cloud.material.color.setHSL(.64+i*.035+(gentle?0:audio.treble*.09),.48,.4);cloud.material.opacity=.15*(1-heartMix*.7);});
        planets.forEach(p=>{
            p.group.visible = heartMix < .97;
            const isHovered = hoveredPlanetId === p.data.id;
            const isSelected = U.planets?.selected === p.data.id;
            p.targetScale = isSelected ? 1.12 : isHovered ? 1.035 : 1;
            p.targetLift = isSelected ? 12 : isHovered ? 10 : 0;
            p.targetGlow = isSelected ? .34 : isHovered ? .28 : .13;
            p.targetOrbitOpacity = isSelected ? .24 : isHovered ? .2 : .1;
            p.scale += (p.targetScale-p.scale)*(1-Math.exp(-dt*7));
            p.lift += (p.targetLift-p.lift)*(1-Math.exp(-dt*7));
            p.glow += (p.targetGlow-p.glow)*(1-Math.exp(-dt*7));
            p.orbitOpacity += (p.targetOrbitOpacity-p.orbitOpacity)*(1-Math.exp(-dt*7));
            p.group.scale.setScalar(p.scale);
            const fade=1-heartMix, awake=THREE.MathUtils.clamp((p.glow-.13)/.21,0,1);
            const breath=U.reduced?1:1+Math.sin(elapsed*(1.2+p.index*.18)+p.phase)*.14;
            p.shell.material.uniforms.uAwake.value=awake;
            p.shell.material.uniforms.uFade.value=fade;
            p.core.material.opacity=Math.min(1,(.68+awake*.28)*breath+beatPulse*.16)*fade;
            p.core.scale.setScalar((36+awake*16)*breath+beatPulse*4);
            p.dust.material.opacity=(.68+awake*.25)*fade;
            if(move)p.dust.rotation.y+=dt*(.18+awake*.24);
            p.line.material.opacity=p.orbitOpacity*(1-heartMix);
            const pulse = 1 + Math.sin(elapsed * (1.2 + p.index * .18) + p.phase) * .045;
            p.atmosphere.scale.setScalar(132 * pulse * (1 + p.glow * .18));
            p.moonOrbit.rotation.y = elapsed * (.7 + p.index * .12) + p.moonPhase;
            p.moonOrbit.rotation.x = .35 + p.index * .12;
            p.moonOrbit.traverse(obj=>{if(obj.material){obj.material.transparent=true;obj.material.opacity=(obj.userData.trail ? .45*(1-obj.userData.trail/10) : .9)*(1-heartMix);}});
            p.atmosphere.material.opacity = (.22 + p.glow * .42) * (1 - heartMix * .94);
            if(move)p.mesh.rotation.y+=dt*.12;
        });
        if(orbLevel==='high'&&planets.length&&heartMix<.97){
            // One shared background pass refracts the actual stars and plasma, never a static image.
            planets.forEach(p=>{p.shell.visible=false;});
            renderer.setRenderTarget(orbBackdrop);renderer.render(scene,camera);
            renderer.setRenderTarget(null);
            planets.forEach(p=>{p.shell.visible=true;});
        }
        renderer.render(scene,camera); U.planets?.project();
    }
    U.scene={
        start(){if(started)return;started=true;try{if(!window.THREE)throw new Error('No WebGL');init();}catch(error){console.error('Universe scene initialization failed',error);fallback();}frame=requestAnimationFrame(tick);},
        get available(){return Boolean(renderer)&&!lost;},
        get renderer(){return renderer;},
        get camera(){return camera;},
        freeze(ms){freezeUntil=performance.now()+ms;},
        hover(value){hoveredPlanetId=value;},
        debugOrbit(){return elapsed;},
        debugHeart(){return rubyHeart?.debug();},
        debugVortex(){
            if(!energyVortex)return null;
            const group=energyVortex.group;
            const project=(x,y,z)=>{
                const p=group.localToWorld(new THREE.Vector3(x,y,z)).project(camera);
                return {x:(p.x*.5+.5)*innerWidth,y:(.5-p.y*.5)*innerHeight};
            };
            const rim=Array.from({length:64},(_,i)=>project(Math.cos(i/64*Math.PI*2),0,Math.sin(i/64*Math.PI*2)));
            return {...energyVortex.debug(),center:project(0,0,0),rim,
                tipY:heart.position.y+heartBounds.minY*heart.scale.y,
                heartWidth:(heartBounds.maxX-heartBounds.minX)*heart.scale.x};
        },
        setHeartPointer(event){
            if(!event||!renderer||U.reduced||!U.scene.heartActive){vortexInput=null;return;}
            const rect=renderer.domElement.getBoundingClientRect();
            vortexInput??=new THREE.Vector2();
            vortexInput.set((event.clientX-rect.left)/rect.width*2-1,1-(event.clientY-rect.top)/rect.height*2);
            controller.pointer.x=vortexInput.x;controller.pointer.y=vortexInput.y;
        },
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
    document.addEventListener('pointermove',event=>{
        if(controller&&event.pointerType==='mouse'&&U.mode==='EXPLORE'){
            controller.pointer.x=event.clientX/innerWidth*2-1;controller.pointer.y=1-event.clientY/innerHeight*2;
        }
    });
    window.addEventListener('blur',()=>{vortexInput=null;});
    document.addEventListener('visibilitychange',()=>{previous=0;vortexInput=null;});
    window.addEventListener('pagehide',event=>{if(!event.persisted)U.scene.dispose();});
})();
