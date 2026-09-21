/* Cosmic plasma: seeded volume samples, GPU flow, no visible solid surface. */
(() => {
    const U = window.Universe;
    U.createRubyHeart = function (own) {
        const group = new THREE.Group();
        const vertices = [], indices = [];
        const slices = 160, rings = 32;
        let seed=0xc05c1c;
        const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
        const outline=Array.from({length:slices},(_,i)=>{
            const a=i/slices*Math.PI*2;
            return [16*Math.sin(a)**3*4.2,(13*Math.cos(a)-5*Math.cos(2*a)-2*Math.cos(3*a)-Math.cos(4*a))*4.2];
        });
        // Smooth distance to the silhouette gives continuous thickness across the
        // centre. Radial thickness alone pinches along the notch and bottom cusp.
        function depth(x,y){
            let inverse=0;
            for(let i=0;i<slices;i++){
                const a=outline[i],b=outline[(i+1)%slices],dx=b[0]-a[0],dy=b[1]-a[1];
                const t=Math.max(0,Math.min(1,((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy)));
                const d2=(x-a[0]-t*dx)**2+(y-a[1]-t*dy)**2+1e-8;
                inverse+=1/(d2*d2);
            }
            return 6*Math.pow(inverse,-.125);
        }
        // A filled, rounded heart: the old surface collapsed every meridian onto
        // the centre line. These radial disks meet only along the outer rim.
        for (let side = 0; side < 2; side++) {
            for (let j = 0; j <= rings; j++) {
                const r = j / rings;
                for (let i = 0; i <= slices; i++) {
                    const a = i / slices * Math.PI * 2;
                    const x = 16 * Math.sin(a) ** 3 * 4.2 * r;
                    const y = (13*Math.cos(a)-5*Math.cos(2*a)-2*Math.cos(3*a)-Math.cos(4*a))*4.2*r;
                    const z = (side ? -1 : 1) * (j===rings?0:depth(x,y));
                    vertices.push(x, y + 12, z);
                    if (j < rings && i < slices) {
                        const n = side*(rings+1)*(slices+1)+j*(slices+1)+i;
                        const triangles = [n,n+slices+1,n+1,n+1,n+slices+1,n+slices+2];
                        if (!side) triangles.reverse();
                        indices.push(...triangles);
                    }
                }
            }
        }
        // Area-weighted triangle sampling keeps both lobes and the notch evenly filled.
        const areas = [], a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
        let total = 0;
        for(let i=0;i<indices.length;i+=3){
            a.fromArray(vertices,indices[i]*3);b.fromArray(vertices,indices[i+1]*3);c.fromArray(vertices,indices[i+2]*3);
            total += b.sub(a).cross(c.sub(a)).length()*.5; areas.push(total);
        }
        function sample() {
            const target=random()*total;let lo=0,hi=areas.length-1;
            while(lo<hi){const mid=(lo+hi)>>1;if(areas[mid]<target)lo=mid+1;else hi=mid;}
            a.fromArray(vertices,indices[lo*3]*3);b.fromArray(vertices,indices[lo*3+1]*3);c.fromArray(vertices,indices[lo*3+2]*3);
            const r=Math.sqrt(random()),s=random();
            const p=a.clone().multiplyScalar(1-r).addScaledVector(b,r*(1-s)).addScaledVector(c,r*s);
            p.z += p.z >= 0 ? .65 : -.65; return p;
        }
        const uniforms = {
            uTime:{value:0},uFocus:{value:0},uOpacity:{value:1},uMotion:{value:1},
            uDpr:{value:1},uBeat:{value:0},uDetail:{value:2},uGain:{value:1},
            uPointer:{value:new THREE.Vector2()}
        };
        const positions=[],seeds=[],sizes=[],layers=[];
        for(let i=0;i<70000;i++){
            // Interleave layers so every draw-range prefix retains all three zones.
            const bucket=i%70,layer=bucket<8?0:bucket<58?1:2;
            const p=sample();
            const fill=layer===0?.12+Math.cbrt(random())*.25:layer===1?.3+Math.cbrt(random())*.7:1;
            p.x*=fill;p.y=12+(p.y-12)*fill;p.z*=fill;
            positions.push(p.x,p.y,p.z);layers.push(layer);
            seeds.push(random()*6.283185);sizes.push(1.2+random()*1.8);
        }
        const geometry=own(new THREE.BufferGeometry());
        geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
        geometry.setAttribute('aSeed',new THREE.Float32BufferAttribute(seeds,1));
        geometry.setAttribute('aSize',new THREE.Float32BufferAttribute(sizes,1));
        geometry.setAttribute('aLayer',new THREE.Float32BufferAttribute(layers,1));
        const material=own(new THREE.ShaderMaterial({uniforms,transparent:true,depthWrite:false,
            blending:THREE.AdditiveBlending,
            vertexShader:`
                attribute float aSeed,aSize,aLayer;
                uniform float uTime,uFocus,uMotion,uDpr,uBeat,uDetail;
                uniform vec2 uPointer;
                varying vec3 vColor; varying float vLight,vSpark;
                // 3D simplex lattice: four gradient contributions per evaluation.
                vec3 gradient(vec3 p){
                    vec3 h=sin(vec3(dot(p,vec3(127.1,311.7,74.7)),dot(p,vec3(269.5,183.3,246.1)),dot(p,vec3(113.5,271.9,124.6))))*43758.5453;
                    return normalize(fract(h)*2.-1.+.0001);
                }
                float contribution(vec3 cell,vec3 x){float w=max(.6-dot(x,x),0.);return w*w*w*w*dot(gradient(cell),x);}
                float noise3(vec3 p){
                    vec3 cell=floor(p+dot(p,vec3(1./3.)));
                    vec3 x=p-cell+dot(cell,vec3(1./6.));
                    vec3 rank=step(x.yzx,x.xyz);
                    vec3 first=min(rank,1.-rank.zxy),second=max(rank,1.-rank.zxy);
                    return 32.*(contribution(cell,x)+contribution(cell+first,x-first+1./6.)+
                        contribution(cell+second,x-second+1./3.)+contribution(cell+1.,x-.5));
                }
                void main(){
                    float t=uTime*uMotion;
                    vec3 rest=position-vec3(0.,12.,0.);
                    vec3 field=rest*.035+vec3(t*.12,-t*.22,t*.1);
                    float n=noise3(field);
                    float fine=0.;if(uDetail>1.5)fine=noise3(field*1.8+vec3(2.,t*.08,5.))*.32;
                    float activity=clamp(.5+n*.65+fine*.3,0.,1.);
                    // Tangential lobe flow plus turbulence, bounded around rest positions.
                    vec3 local=rest-vec3(sign(rest.x)*30.,22.,0.);
                    float angle=atan(local.y,local.x);
                    float ribbon=sin(angle*3.+local.z*.065-t*1.25+n*2.);
                    float boundary=smoothstep(3.,25.,abs(rest.x)+abs(rest.y-21.))*(1.-smoothstep(53.,73.,-rest.y));
                    float amplitude=(aLayer<.5?1.8:4.5)*boundary*(1.+uBeat*.45);
                    vec3 flow=vec3(-sin(angle+t*.3),cos(angle+t*.3),sin(angle*2.-t*.6));
                    vec3 p=rest+uMotion*amplitude*(flow*(.35+ribbon*.5)+vec3(n,fine,n*.6));
                    float life=fract(t*(.12+fract(aSeed)*.10)+aSeed);
                    float fade=1.;
                    if(aLayer>1.5){
                        vec3 outward=normalize(rest+vec3(.01,0.,.01));
                        p+=uMotion*(outward*life*(8.+uFocus*7.)+vec3(sin(life*6.28+aSeed)*life*6.,life*life*16.,cos(life*6.28+aSeed)*life*8.));
                        fade=smoothstep(0.,.16,life)*(1.-smoothstep(.55,1.,life));
                    }
                    p.xy+=uPointer*uFocus*uMotion*2.*exp(-length(rest.xy/70.-uPointer));
                    float cyan=smoothstep(.46,.72,activity)*(.45+.55*smoothstep(-.2,.7,ribbon));
                    vColor=mix(vec3(.85,.018,.17),vec3(.02,.8,1.),cyan);
                    float core=(1.-smoothstep(9.,24.,length(rest*vec3(1.,1.,1.3))))*(1.-step(1.5,aLayer));
                    vColor=mix(vColor,vec3(1.,.94,1.),core);
                    float filaments=.4+.6*pow(.5+.5*ribbon,3.);
                    vLight=(aLayer<.5?.30: aLayer>1.5?.40:.52)*filaments*fade*(1.+uBeat*.5);
                    vLight+=core*.10;
                    vSpark=step(.996,fract(aSeed*13.17))*pow(max(0.,sin(t*1.3+aSeed)),24.);
                    if(uMotion<.5)vSpark=0.;
                    vec4 mv=modelViewMatrix*vec4(p+vec3(0.,12.,0.),1.);
                    gl_Position=projectionMatrix*mv;
                    gl_PointSize=clamp((aSize+vSpark*9.)*uDpr*(1.+uFocus*.12)*480./max(1.,-mv.z),1.,22.);
                }`,
            fragmentShader:`
                uniform float uOpacity,uGain;varying vec3 vColor;varying float vLight,vSpark;
                void main(){
                    vec2 p=gl_PointCoord*2.-1.;float r=length(p);
                    if(r>1.)discard;
                    float glow=exp(-r*r*4.5)*(1.-smoothstep(.8,1.,r));
                    float rays=pow(max(0.,1.-abs(p.x)),28.)*pow(max(0.,1.-abs(p.y)),2.)+
                        pow(max(0.,1.-abs(p.y)),28.)*pow(max(0.,1.-abs(p.x)),2.);
                    float alpha=(glow*vLight+rays*vSpark*.5)*uOpacity*uGain;
                    if(alpha<.003)discard;
                    gl_FragColor=vec4(mix(vColor,vec3(1.),vSpark*.6),alpha);
                    #include <encodings_fragment>
                }`
        }));
        const points=new THREE.Points(geometry,material);points.frustumCulled=false;group.add(points);
        let count=70000;
        return {group,
            quality(level,dpr){
                count=level==='light'?16000:level==='balanced'?35000:70000;
                geometry.setDrawRange(0,count);uniforms.uDpr.value=dpr;
                uniforms.uDetail.value=level==='high'?2:1;
                uniforms.uGain.value=count===70000?1:count===35000?1.45:2.;
            },
            debug(){return {count,pointOnly:group.children.every(child=>child.isPoints),time:uniforms.uTime.value,motion:uniforms.uMotion.value};},
            update({time,focus,opacity,motion,pointer,beat}){
                uniforms.uTime.value=time;uniforms.uFocus.value=focus;uniforms.uOpacity.value=opacity;
                uniforms.uMotion.value=motion?1:0;uniforms.uPointer.value.set(pointer.x,pointer.y);uniforms.uBeat.value=beat;
            }
        };
    };
})();
