/* A persistent cyan pedestal: orbiting grains, short feed particles and open ribbons. */
(() => {
    const U = window.Universe;
    U.createEnergyVortex = function (own) {
        const group = new THREE.Group();
        const uniforms = {
            uTime:{value:0}, uSpin:{value:0}, uFlow:{value:0}, uBeat:{value:0},
            uFocus:{value:0}, uDpr:{value:1}, uOpacity:{value:1}, uGain:{value:1},
            uHeight:{value:.4}, uPointer:{value:new THREE.Vector2()}, uPointerStrength:{value:0}
        };
        // Both materials use the same bounded displacement in local coordinates.
        const bend = `
            uniform vec2 uPointer;
            uniform float uPointerStrength;
            vec3 bend(vec3 p){
                vec2 d=uPointer-p.xz;
                float influence=exp(-dot(d,d)/.10)*uPointerStrength;
                vec2 offset=d*.4;
                offset*=min(1.,.06/max(.0001,length(offset)));
                p.xz+=offset*influence;
                return p;
            }`;
        let seed=0x7e57c0de;
        const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
        const positions=[], data=[], sizes=[];
        for(let i=0;i<15000;i++){
            // Every draw-range prefix has 80% disk/core, 10% feed and 10% sparks.
            const bucket=i%10, layer=bucket<8?0:bucket===8?1:2;
            const rim=i%20<6;
            const radius=rim?.83+random()*.14:Math.sqrt(random())*.82;
            const angle=random()*Math.PI*2;
            positions.push(Math.cos(angle)*radius,(random()-.5)*.018,Math.sin(angle)*radius);
            data.push(radius,angle,random(),layer);sizes.push(.9+random()*1.3);
        }
        const geometry=own(new THREE.BufferGeometry());
        geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
        geometry.setAttribute('aData',new THREE.Float32BufferAttribute(data,4));
        geometry.setAttribute('aSize',new THREE.Float32BufferAttribute(sizes,1));
        const material=own(new THREE.ShaderMaterial({uniforms,transparent:true,depthWrite:false,
            blending:THREE.AdditiveBlending,
            vertexShader:`
                attribute vec4 aData;
                attribute float aSize;
                uniform float uTime,uSpin,uFlow,uBeat,uDpr,uHeight;
                varying vec3 vColor;
                varying float vLight,vSpark;
                ${bend}
                void main(){
                    float radius=aData.x, phase=aData.z, layer=aData.w;
                    float angle=aData.y+uSpin*(.9+phase*.2);
                    float wave=sin(angle*3.+uTime*.7+phase*6.28);
                    radius*=1.+wave*.022;
                    vec3 p=vec3(cos(angle)*radius,position.y+wave*.006,sin(angle)*radius);
                    float fade=1.,size=aSize;
                    float core=1.-smoothstep(.25,.85,radius);
                    vColor=mix(vec3(.08,.65,1.),vec3(.34,.90,1.),core);
                    // Keep a filled cyan disk without a white hotspot competing with the heart.
                    size*=mix(2.3,4.5,core);
                    vLight=mix(.16,.18,core)*(.72+.28*sin(angle*2.-uTime+phase*6.28));
                    vSpark=0.;
                    if(layer>.5&&layer<1.5){
                        float life=fract(phase+uFlow*(.22+fract(phase*13.)*.08));
                        float r=mix(.18,.035,life);
                        float theta=aData.y+uSpin+life*8.;
                        p=vec3(cos(theta)*r,life*uHeight,sin(theta)*r);
                        fade=smoothstep(0.,.12,life)*(1.-smoothstep(.45,1.,life));
                        size=aSize*mix(.9,.28,life);
                        vLight=.15*fade;
                        vColor=vec3(.18,.78,1.);
                    }else if(layer>1.5){
                        float life=fract(phase+uFlow*.28);
                        float r=.88+life*.22;
                        p=vec3(cos(angle)*r,sin(phase*31.)*life*.065,sin(angle)*r);
                        fade=smoothstep(0.,.15,life)*(1.-smoothstep(.45,1.,life));
                        vLight=.3*fade;
                        vSpark=step(.97,phase)*pow(max(0.,sin(uTime*2.+phase*53.)),18.)*fade;
                        size=aSize*.7;
                    }
                    vLight*=1.+uBeat*.22;
                    vec4 mv=modelViewMatrix*vec4(bend(p),1.);
                    gl_Position=projectionMatrix*mv;
                    gl_PointSize=clamp((size+vSpark*3.)*uDpr*480./max(1.,-mv.z),.65,12.);
                }`,
            fragmentShader:`
                uniform float uOpacity,uGain;
                varying vec3 vColor; varying float vLight,vSpark;
                void main(){
                    vec2 p=gl_PointCoord*2.-1.;float r=length(p);
                    if(r>1.)discard;
                    float glow=exp(-r*r*3.8)*(1.-smoothstep(.72,1.,r));
                    float rays=pow(max(0.,1.-abs(p.x)),26.)*pow(max(0.,1.-abs(p.y)),2.)+
                        pow(max(0.,1.-abs(p.y)),26.)*pow(max(0.,1.-abs(p.x)),2.);
                    float alpha=(glow*vLight+rays*vSpark*.4)*uOpacity*uGain;
                    if(alpha<.002)discard;
                    gl_FragColor=vec4(vColor,alpha);
                    #include <encodings_fragment>
                }`
        }));
        const points=new THREE.Points(geometry,material);
        points.frustumCulled=false;group.add(points);

        // Eight open strips in one indexed mesh; all vertices remain static on the CPU.
        const ribbonPositions=[],arcs=[],indices=[];
        const segments=80;
        for(let arc=0;arc<8;arc++){
            const start=random()*Math.PI*2,span=.7+random()*2.1,radius=.84+arc*.022,speed=.88+arc*.035;
            for(let j=0;j<=segments;j++)for(const side of [-1,1]){
                ribbonPositions.push(j/segments,side,arc);
                arcs.push(start,span,radius,speed);
            }
            for(let j=0;j<segments;j++){
                const n=arc*(segments+1)*2+j*2;
                indices.push(n,n+1,n+2,n+1,n+3,n+2);
            }
        }
        const ribbonGeometry=own(new THREE.BufferGeometry());
        ribbonGeometry.setAttribute('position',new THREE.Float32BufferAttribute(ribbonPositions,3));
        ribbonGeometry.setAttribute('aArc',new THREE.Float32BufferAttribute(arcs,4));
        ribbonGeometry.setIndex(indices);
        const ribbonMaterial=own(new THREE.ShaderMaterial({uniforms,transparent:true,depthWrite:false,
            side:THREE.DoubleSide,blending:THREE.AdditiveBlending,
            vertexShader:`
                attribute vec4 aArc;
                uniform float uTime,uSpin;
                varying vec2 vUv;
                ${bend}
                void main(){
                    float along=position.x,side=position.y,id=position.z;
                    float angle=aArc.x+uSpin*aArc.w+along*aArc.y;
                    float ripple=sin(angle*3.+id+uTime*.6)*.015;
                    float width=.022;
                    float radius=aArc.z+ripple+side*width;
                    float y=(id-3.5)*.006+sin(angle*2.+id)*.01;
                    vec3 p=vec3(cos(angle)*radius,y,sin(angle)*radius);
                    vUv=vec2(along,side);
                    gl_Position=projectionMatrix*modelViewMatrix*vec4(bend(p),1.);
                }`,
            fragmentShader:`
                uniform float uOpacity,uBeat;
                varying vec2 vUv;
                void main(){
                    float edge=exp(-vUv.y*vUv.y*6.)*(1.-smoothstep(.7,1.,abs(vUv.y)));
                    float tail=smoothstep(0.,.32,vUv.x)*(1.-smoothstep(.93,1.,vUv.x));
                    float alpha=edge*tail*(.38+uBeat*.10)*uOpacity;
                    if(alpha<.002)discard;
                    gl_FragColor=vec4(mix(vec3(.08,.7,1.),vec3(.65,1.,1.),edge),alpha);
                    #include <encodings_fragment>
                }`
        }));
        const ribbons=new THREE.Mesh(ribbonGeometry,ribbonMaterial);
        ribbons.frustumCulled=false;group.add(ribbons);
        let level='high', motion=true;
        return {group,
            quality(next,dpr){
                level=next;
                const count=level==='light'?4000:level==='balanced'?8000:15000;
                geometry.setDrawRange(0,count);uniforms.uDpr.value=dpr;
                uniforms.uGain.value=count===15000?1:count===8000?1.45:2.1;
                ribbons.visible=level!=='light';
                ribbonGeometry.setDrawRange(0,(level==='balanced'?4:8)*segments*6);
            },
            debug(){return {
                count:geometry.drawRange.count,arcs:ribbons.visible?ribbonGeometry.drawRange.count/(segments*6):0,
                drawCalls:ribbons.visible?2:1,level,motion,time:uniforms.uTime.value,
                spin:uniforms.uSpin.value,flow:uniforms.uFlow.value,beat:uniforms.uBeat.value,
                focus:uniforms.uFocus.value,opacity:uniforms.uOpacity.value,
                radius:group.scale.x,anchorY:group.position.y,height:uniforms.uHeight.value*group.scale.x,
                pointer:uniforms.uPointer.value.toArray(),pointerStrength:uniforms.uPointerStrength.value,
                geometryIds:[geometry.id,ribbonGeometry.id],materialIds:[material.id,ribbonMaterial.id]
            };},
            update({motionDelta,focus,opacity,motion:enabled,pointer,beat,height}){
                motion=enabled;
                const dt=enabled?Math.max(0,Math.min(.05,motionDelta)):0;
                const targetBeat=Math.max(0,Math.min(1,beat));
                // Integrate velocity, never multiply an accumulated clock by the current beat.
                // Exact exponential integral also keeps 30/60/120 Hz closely aligned.
                if(!enabled)uniforms.uBeat.value=0;
                else if(dt){
                    const previousBeat=uniforms.uBeat.value;
                    const rate=targetBeat>previousBeat?18:7, decay=Math.exp(-dt*rate);
                    const beatArea=targetBeat*dt+(previousBeat-targetBeat)*(1-decay)/rate;
                    uniforms.uBeat.value=targetBeat+(previousBeat-targetBeat)*decay;
                    uniforms.uSpin.value+=1.45*(dt+beatArea);
                    uniforms.uTime.value+=dt;uniforms.uFlow.value+=dt;
                }
                uniforms.uFocus.value=focus;uniforms.uOpacity.value=opacity;
                uniforms.uHeight.value=height;
                if(!enabled){uniforms.uPointerStrength.value=0;uniforms.uPointer.value.set(0,0);}
                else if(dt){
                    const targetStrength=pointer?focus:0;
                    if(pointer)uniforms.uPointer.value.lerp(pointer,1-Math.exp(-dt*12));
                    uniforms.uPointerStrength.value+=(targetStrength-uniforms.uPointerStrength.value)*(1-Math.exp(-dt*(pointer?14:10)));
                }
            }
        };
    };
})();
