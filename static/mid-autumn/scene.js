/* Geometry is owned by this page and disposed when its page lifecycle ends. */
export function createScene(canvas, onUnavailable) {
  const T=window.THREE, panels=[],tassels=[],wingLights=[],sparkles=[];
  let renderer,scene,camera,glowTexture,moon,lantern,stars,dust,wishLetter,wishTrail,wishBeacon;
  let seed=20260925;
  const random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
  function glowMap() {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const ctx = c.getContext('2d'), g = ctx.createRadialGradient(64,64,0,64,64,64);
    g.addColorStop(0,'rgba(255,242,206,1)'); g.addColorStop(.08,'rgba(255,230,190,.9)'); g.addColorStop(.25,'rgba(255,209,165,.22)'); g.addColorStop(.6,'rgba(255,189,158,.045)'); g.addColorStop(1,'rgba(255,189,158,0)');
    ctx.fillStyle=g; ctx.fillRect(0,0,128,128); return new T.CanvasTexture(c);
  }
  function halo(color, size, opacity, blending=T.AdditiveBlending) {
    const sprite = new T.Sprite(new T.SpriteMaterial({map:glowTexture,color,opacity,transparent:true,blending,depthWrite:false}));
    sprite.scale.set(size,size,1); return sprite;
  }
  function rod(a,b,r,material) {
    const delta = new T.Vector3().subVectors(b,a);
    const mesh = new T.Mesh(new T.CylinderGeometry(r,r,delta.length(),8),material);
    mesh.position.copy(a).add(b).multiplyScalar(.5);
    mesh.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize()); return mesh;
  }
  function moonMap() {
    const c = document.createElement('canvas'); c.width=1024; c.height=512;
    const ctx = c.getContext('2d'); ctx.fillStyle='#e8ddc6'; ctx.fillRect(0,0,1024,512);
    // Overlapping maria and crater rims provide relief under the moon's own glow.
    for(let i=0;i<85;i++) {
      const x=random()*1024,y=random()*512,r=18+random()*100;
      const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,'rgba(120,101,83,.17)');g.addColorStop(.6,'rgba(139,116,90,.08)');g.addColorStop(1,'rgba(139,116,90,0)');ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);
    }
    for(let i=0;i<430;i++) {
      const x=random()*1024,y=random()*512,r=1+Math.pow(random(),3)*21;
      const g=ctx.createRadialGradient(x-r*.2,y-r*.25,r*.1,x,y,r);
      g.addColorStop(0,'rgba(111,91,72,.23)');g.addColorStop(.6,'rgba(149,123,95,.16)');g.addColorStop(.8,'rgba(255,246,217,.24)');g.addColorStop(1,'rgba(255,239,201,0)');ctx.fillStyle=g;if(r>3)ctx.fillRect(x-r,y-r,r*2,r*2);
    }
    const data=ctx.getImageData(0,0,1024,512);
    for(let i=0;i<data.data.length;i+=4){const n=(random()-.5)*1.2;for(let j=0;j<3;j++)data.data[i+j]+=n;}
    ctx.putImageData(data,0,0);const tex=new T.CanvasTexture(c);tex.wrapS=T.RepeatWrapping;tex.encoding=T.sRGBEncoding;return tex;
  }
  function moonAura(size,color,opacity,falloff) {
    // Normal blending keeps colour inside alpha coverage on the transparent canvas.
    // Additive blending leaves RGB at zero alpha, which some compositors clip to a disc.
    const material=new T.SpriteMaterial({map:glowTexture,color,transparent:true,blending:T.NormalBlending,depthWrite:false,opacity,toneMapped:false,dithering:true});
    material.color.convertSRGBToLinear();
    // Continuous falloff avoids the visible 8-bit alpha rings of a large glow texture.
    material.onBeforeCompile=shader=>{
      shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\n#include <dithering_pars_fragment>')
        .replace('#include <map_fragment>',`float radius=length((vUv-.5)*2.0); diffuseColor.a*=exp(-radius*radius*${falloff.toFixed(1)})*(1.0-smoothstep(.65,1.0,radius));`)
        .replace('#include <fog_fragment>','#include <fog_fragment>\n#include <dithering_fragment>');
    };
    material.customProgramCacheKey=()=>`moon-aura-${falloff}`;
    const sprite=new T.Sprite(material);sprite.scale.set(size,size,1);return sprite;
  }
  function makeMoon() {
    const group = new T.Group(), map=moonMap();
    const material=new T.MeshStandardMaterial({map,emissiveMap:map,bumpMap:map,bumpScale:.022,color:0xffe2bf,roughness:.92,emissive:0xffcc97,emissiveIntensity:.62,dithering:true});
    material.color.convertSRGBToLinear();material.emissive.convertSRGBToLinear();
    material.onBeforeCompile=shader=>{
      shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
        float warmth=smoothstep(-.3,1.0,dot(normal,normalize(vec3(-.5,.65,1.0))));
        totalEmissiveRadiance*=.16+.84*warmth;`)
        .replace('gl_FragColor = vec4( outgoingLight, diffuseColor.a );',`float facing=max(0.0,dot(normalize(vNormal),normalize(vViewPosition)));
        // Cream-gold light rolls into a soft peach shadow, with a local upper-left glow.
        outgoingLight*=mix(vec3(1.12,.78,.87),vec3(1.02,1.0,.96),warmth);
        outgoingLight+=vec3(.16,.047,.035)*(1.0-warmth);
        float highlight=pow(max(0.0,dot(normal,normalize(vec3(-.5,.65,1.0)))),10.0);
        outgoingLight+=vec3(.35,.26,.18)*highlight;
        outgoingLight*=.42+.58*pow(facing,.4);
        gl_FragColor=vec4(outgoingLight,diffuseColor.a);`);
    };
    const orb = new T.Mesh(new T.SphereGeometry(1.25,96,64),material);
    // Both halos share the sphere's center, including as the moon rotates in flight.
    const corona=moonAura(3.45,0xffc096,.9,2.4);
    const haze=moonAura(6.6,0xf69180,.4,5.8);
    group.add(orb,corona,haze);group.userData.haze=haze;group.userData.corona=corona;return group;
  }
  function paperMap() {
    const c=document.createElement('canvas');c.width=c.height=256;
    const ctx=c.getContext('2d'),g=ctx.createLinearGradient(65,0,180,256);
    g.addColorStop(0,'#fff0bc');g.addColorStop(.4,'#f4ab8b');g.addColorStop(.78,'#e7799a');g.addColorStop(1,'#c65383');
    ctx.fillStyle=g;ctx.fillRect(0,0,256,256);
    for(let i=0;i<140;i++){
      ctx.strokeStyle=i%3?'rgba(255,243,220,.07)':'rgba(60,30,38,.07)';ctx.lineWidth=.3+random()*.7;
      const x=random()*256,y=random()*256;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+random()*70-35,y+random()*50);ctx.stroke();
    }
    const tex=new T.CanvasTexture(c);tex.encoding=T.sRGBEncoding;return tex;
  }
  function lanternFace() {
    const c=document.createElement('canvas');c.width=c.height=256;const ctx=c.getContext('2d');
    [59,197].forEach(x=>{const g=ctx.createRadialGradient(x,149,1,x,149,26);g.addColorStop(0,'rgba(223,105,129,.8)');g.addColorStop(1,'rgba(223,105,129,0)');ctx.fillStyle=g;ctx.save();ctx.translate(x,149);ctx.scale(1,.48);ctx.translate(-x,-149);ctx.fillRect(x-27,122,54,54);ctx.restore();});
    [89,167].forEach(x=>{ctx.fillStyle='#633b42';ctx.beginPath();ctx.ellipse(x,111,17,23,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#fff4da';ctx.beginPath();ctx.ellipse(x-5,103,4,6,0,0,Math.PI*2);ctx.fill();});
    ctx.strokeStyle='#713844';ctx.lineWidth=5;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(111,149);ctx.quadraticCurveTo(128,169,145,149);ctx.stroke();
    const map=new T.CanvasTexture(c);map.encoding=T.sRGBEncoding;
    const face=new T.Mesh(new T.PlaneGeometry(1.3,1.1),new T.MeshBasicMaterial({map,transparent:true,depthWrite:false,toneMapped:false}));
    face.position.set(0,-.015,.43);return face;
  }
  function sparkle(wing,position) {
    const shape=new T.Shape();[[0,.5],[.085,.085],[.37,0],[.085,-.085],[0,-.5],[-.085,-.085],[-.37,0],[-.085,.085]].forEach(([x,y],i)=>i?shape.lineTo(x,y):shape.moveTo(x,y));shape.closePath();
    const star=new T.Mesh(new T.ShapeGeometry(shape),new T.MeshBasicMaterial({color:0xffedbd,transparent:true,opacity:.8,depthWrite:false,toneMapped:false,side:T.DoubleSide}));
    star.position.copy(position);star.userData.wing=wing;star.userData.size=wing%2?.16:.24;star.scale.setScalar(star.userData.size);sparkles.push(star);return star;
  }
  function makeLantern() {
    const group = new T.Group(), paper=paperMap();
    const bamboo = new T.MeshStandardMaterial({color:0xf3c895,metalness:.25,roughness:.5,emissive:0xbd715e,emissiveIntensity:.16});
    bamboo.color.convertSRGBToLinear();bamboo.emissive.convertSRGBToLinear();
    const pts=Array.from({length:10},(_,i)=>{const a=Math.PI/2+i*Math.PI/5,r=i%2? .62:1.5;return new T.Vector3(Math.cos(a)*r,Math.sin(a)*r,.08);});
    const frontCenter=new T.Vector3(0,0,.36),backCenter=new T.Vector3(0,0,-.27);
    for(let i=0;i<10;i++) {
      const a=pts[i], b=pts[(i+1)%10], backA=a.clone().setZ(-.22),backB=b.clone().setZ(-.22);
      if(i%2===0){const glint=halo(0xffd4a3,.58,.6,T.NormalBlending);glint.position.copy(a).setZ(.15);glint.userData.wing=i/2;wingLights.push(glint);group.add(glint);group.add(sparkle(i/2,a.clone().multiplyScalar(1.17).setZ(.18)));}
      group.add(rod(a,b,.016,bamboo),rod(backA,backB,.014,bamboo),rod(a,backA,.012,bamboo));
      const material = new T.MeshPhysicalMaterial({map:paper,emissiveMap:paper,color:0xffe0db,emissive:0xffa4b6,emissiveIntensity:.32,metalness:0,roughness:.65,clearcoat:.22,clearcoatRoughness:.5,side:T.DoubleSide});
      // Adjacent facets on either side of one outer tip form a complete wing.
      material.userData.wing=Math.ceil(i/2)%5;
      material.color.convertSRGBToLinear();material.emissive.convertSRGBToLinear();panels.push(material);
      const positions=[...frontCenter.toArray(),...a.toArray(),...b.toArray(),...backCenter.toArray(),...backB.toArray(),...backA.toArray(),...a.toArray(),...backA.toArray(),...b.toArray(),...b.toArray(),...backA.toArray(),...backB.toArray()];
      const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));const uv=[];for(let j=0;j<positions.length;j+=3)uv.push(positions[j]/3+.5,positions[j+1]/3+.5);
      geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geometry.computeVertexNormals();group.add(new T.Mesh(geometry,material));
    }
    const glow=halo(0xf5af9c,4.8,.36,T.NormalBlending);glow.position.z=-.4;group.add(glow);
    group.userData.glow=glow;group.userData.face=lanternFace();group.add(group.userData.face);
    [4,6].forEach((index,j)=>{
      const root=new T.Group();root.position.copy(pts[index]);root.position.z=-.01;
      for(let k=0;k<3;k++) {
        const length=.3+(j%2)*.15+k*.05;
        const strip=new T.Mesh(new T.PlaneGeometry(.034,length),new T.MeshStandardMaterial({color:k===1?0xf1ce95:0xe999a4,side:T.DoubleSide,roughness:.6}));
        strip.position.set((k-1)*.052,-length/2-.07,0);strip.rotation.z=(k-1)*.07;root.add(strip);
      }
      tassels.push(root);group.add(root);
    });
    return group;
  }
  function setLanternLights(lit) {
    const on=wing=>!lit||lit.has(wing),count=lit?lit.size:5;
    panels.forEach(p=>{const active=on(p.userData.wing);p.emissiveIntensity=active?.32:.015;p.color.setHex(active?0xffe0db:0x49303f).convertSRGBToLinear();});
    wingLights.forEach(light=>light.visible=on(light.userData.wing));
    sparkles.forEach(star=>star.visible=on(star.userData.wing));
    if(lantern){lantern.userData.glow.material.opacity=.08+count*.056;lantern.userData.face.material.opacity=.52+count*.096;}
  }
  function animateCelestials(time) {
    if(moon){moon.userData.haze.material.opacity=.4+Math.sin(time*.7)*.015;moon.userData.corona.material.opacity=.9+Math.sin(time*.7)*.025;}
    if(stars)stars.userData.clock.value=time;
    sparkles.forEach((star,i)=>{const pulse=.5+.5*Math.sin(time*1.8+i*1.7);star.material.opacity=.38+pulse*.55;star.scale.setScalar(star.userData.size*(.75+pulse*.4));star.rotation.z=Math.sin(time*.6+i)*.16;});
  }
  function makeStars(count, near) {
    const positions=[],colors=[],twinkle=[];
    for(let i=0;i<count;i++) {
      positions.push((random()-.5)*(near?12:42),(random()-.5)*(near?9:25),near?random()*5-2:-7-random()*14);
      const variation=random(),palette=near?[0xe0c5a1,0xb9aecf,0xf6e6cf]:[0xffe1a6,0xcac3e8,0xfff3d9];const c=new T.Color(palette[i%3]);c.multiplyScalar(near?.4+variation*.6:.7+variation*.3);colors.push(c.r,c.g,c.b);
      twinkle.push(variation*Math.PI*2,.7+(i%11)*.09,i%29===0?1.65:.65+variation*.65);
    }
    const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));
    const material=new T.PointsMaterial({map:near?glowTexture:null,size:near?.065:2.2,sizeAttenuation:near,vertexColors:true,transparent:true,opacity:near?.65:.9,blending:T.AdditiveBlending,depthWrite:false,toneMapped:near});
    const clock={value:0};
    if(!near){
      geometry.setAttribute('twinkle',new T.Float32BufferAttribute(twinkle,3));
      material.onBeforeCompile=shader=>{
        shader.uniforms.starTime=clock;
        shader.vertexShader='uniform float starTime; attribute vec3 twinkle; varying float starLight;\n'+shader.vertexShader;
        shader.vertexShader=shader.vertexShader.replace('gl_PointSize = size;',`starLight=.38+.62*pow(.5+.5*sin(starTime*twinkle.y+twinkle.x),2.0); gl_PointSize=size*twinkle.z;`);
        shader.fragmentShader='varying float starLight;\n'+shader.fragmentShader;
        shader.fragmentShader=shader.fragmentShader.replace('#include <map_particle_fragment>',`float radius=length(gl_PointCoord-.5)*2.0;
          diffuseColor.a*=starLight*(1.0-smoothstep(.12,1.0,radius));`);
      };
    }
    const points=new T.Points(geometry,material);points.userData.clock=clock;return points;
  }
  function makeWishLetter() {
    const group=new T.Group();
    const paper=new T.MeshStandardMaterial({color:0xffe9c1,roughness:.65,metalness:.12,side:T.DoubleSide});
    const edge=new T.MeshStandardMaterial({color:0xc29a65,roughness:.5,metalness:.5});
    const envelope=new T.Mesh(new T.BoxGeometry(1.35,.84,.035),paper);group.add(envelope);
    const triangle=new T.Shape();triangle.moveTo(-.665,.41);triangle.lineTo(0,-.06);triangle.lineTo(.665,.41);triangle.closePath();
    const flap=new T.Mesh(new T.ShapeGeometry(triangle),new T.MeshStandardMaterial({color:0xecc998,roughness:.55,side:T.DoubleSide}));flap.position.z=.025;group.add(flap);
    [[[-.65,-.4, .025],[0,.03,.025]],[[.65,-.4,.025],[0,.03,.025]]].forEach(([a,b])=>group.add(rod(new T.Vector3(...a),new T.Vector3(...b),.006,edge)));
    const seal=new T.Mesh(new T.CylinderGeometry(.105,.105,.03,32),new T.MeshStandardMaterial({color:0xa5274d,metalness:.3,roughness:.32,emissive:0x541329,emissiveIntensity:.4}));seal.rotation.x=Math.PI/2;seal.position.set(0,-.045,.054);group.add(seal);
    const jewel=halo(0xffd795,2.4,.65);jewel.position.z=-.1;group.add(jewel);
    group.userData.flap=flap;group.userData.glow=jewel;return group;
  }
  function init3D() {
    try {
      if(!T)throw Error('Three.js unavailable');
      renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:true,powerPreference:'low-power'});
      renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));renderer.outputEncoding=T.sRGBEncoding;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=.88;
      scene=new T.Scene();camera=new T.PerspectiveCamera(40,innerWidth/innerHeight,.1,90);
      glowTexture=glowMap();scene.add(new T.AmbientLight(0xc1adc7,.38));
      const key=new T.DirectionalLight(0xffedcd,1.15);key.position.set(-3,5,7);scene.add(key);
      const rim=new T.DirectionalLight(0xc5c3ff,.55);rim.position.set(4,1,-2);scene.add(rim);
      moon=makeMoon();lantern=makeLantern();stars=makeStars(680,false);dust=makeStars(120,true);wishLetter=makeWishLetter();
      const trailGeometry=new T.BufferGeometry();trailGeometry.setAttribute('position',new T.Float32BufferAttribute(new Float32Array(100*3),3));
      wishTrail=new T.Points(trailGeometry,new T.PointsMaterial({map:glowTexture,color:0xffd5a0,size:.12,transparent:true,opacity:.8,blending:T.AdditiveBlending,depthWrite:false}));
      wishBeacon=halo(0xffd398,1.1,.8);scene.add(moon,lantern,stars,dust,wishLetter,wishTrail,wishBeacon);renderer.setSize(innerWidth,innerHeight,false);
    }catch(error){
      renderer?.dispose();renderer=null;onUnavailable();

    }
  }

  init3D();
  return {renderer,scene,camera,moon,lantern,stars,dust,wishLetter,wishTrail,wishBeacon,panels,tassels,setLanternLights,animateCelestials,
    dispose(){
      const geometries=new Set(),materials=new Set(),textures=new Set();
      scene?.traverse(object=>{if(object.geometry)geometries.add(object.geometry);for(const m of (Array.isArray(object.material)?object.material:[object.material]))if(m){materials.add(m);for(const value of Object.values(m))if(value?.isTexture)textures.add(value);}});
      textures.forEach(t=>t.dispose());materials.forEach(m=>m.dispose());geometries.forEach(g=>g.dispose());renderer?.dispose();
    }
  };
}
