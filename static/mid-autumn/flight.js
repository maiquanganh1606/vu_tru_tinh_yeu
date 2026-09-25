import {clamp,ease,lerp} from './timeline.js';

const CONTACT_Y=-.42;
// Flight is authored in CSS pixels. Both renderers use this single path and hand target.
export function createFlight({T,camera,letter,trail,beacon,canvas,stage}){
  const fallback=document.getElementById('fallback-letter');
  let lastPoint=null,lastRect=null,lastTime=0,reflow=null,modeBefore=null;
  function phase(t){return t<14?'approach':t<16?'docked':t<18?'dissolve':'received';}
  function route(u,rect,end){
    const q=1-u,w=rect.width,h=rect.height;
    const points=[{x:rect.left+w*.5,y:rect.top+h*.52},{x:rect.left+w*.18,y:rect.top+h*.1},{x:end.x+w*.12,y:end.y-h*.17},end];
    return {x:q*q*q*points[0].x+3*q*q*u*points[1].x+3*q*u*u*points[2].x+u*u*u*end.x,y:q*q*q*points[0].y+3*q*q*u*points[1].y+3*q*u*u*points[2].y+u*u*u*end.y};
  }
  function world(point,z,rect){
    const v=new T.Vector3((point.x-rect.left)/rect.width*2-1,1-(point.y-rect.top)/rect.height*2,.5).unproject(camera);
    const direction=v.sub(camera.position).normalize();
    return camera.position.clone().addScaledVector(direction,(z-camera.position.z)/direction.z);
  }
  function render(t,mode,webgl){
    fallback.hidden=mode!=='outro'||webgl||t>=18||!stage.handAvailable;
    if(mode!=='outro') {lastPoint=null;lastRect=null;reflow=null;modeBefore=mode;return;}
    const rect=canvas.getBoundingClientRect();
    // A hidden canvas has no rect; the fallback uses the same viewport-relative stage.
    const box=rect.width?rect:{left:0,top:0,width:innerWidth,height:innerHeight};
    const end=stage.hand(),u=ease((t-2.2)/11.8),p=route(u,box,end),state=phase(t);
    if(t<lastTime||modeBefore!=='outro'){lastPoint=null;reflow=null;}
    if(lastPoint&&lastRect&&(box.width!==lastRect.width||box.height!==lastRect.height)&&t<14){
      reflow={x:lastPoint.x-p.x,y:lastPoint.y-p.y,start:t,duration:Math.min(.6,14-t)};
    }
    if(reflow&&t<14){const weight=1-ease((t-reflow.start)/reflow.duration);p.x+=reflow.x*weight;p.y+=reflow.y*weight;if(!weight)reflow=null;}
    const fade=1-ease((t-16)/2),small=box.width<=760;
    const width=lerp(small?120:154,Math.min(small?32:44,stage.letterWidth()),ease((t-2.5)/11.5))*fade;
    const settle=1-ease((t-11)/3),angle=Math.sin(u*Math.PI*2)*.22*settle;
    fallback.dataset.phase=state;fallback.style.left=p.x+'px';fallback.style.top=p.y+'px';fallback.style.width=width+'px';fallback.style.height=width*.84/1.35+'px';
    fallback.style.transform=`translate(-50%,-100%) rotate(${angle}rad)`;fallback.style.opacity=fade;
    if(webgl){
      letter.visible=t<18&&stage.handAvailable;trail.visible=t>2&&t<16&&stage.handAvailable;beacon.visible=t>=14&&stage.handAvailable;
      const z=lerp(1.2,-1.5,u),contact=world(p,z,box);
      const unit=world({x:p.x+width/1.35,y:p.y},z,box).distanceTo(contact);
      letter.scale.setScalar(unit);letter.rotation.set(Math.sin(t*.8)*.1*settle,Math.sin(u*Math.PI*2)*.6*settle,angle);
      const offset=new T.Vector3(0,CONTACT_Y,0).multiplyScalar(unit).applyEuler(letter.rotation);
      letter.position.copy(contact).sub(offset);letter.userData.flap.rotation.x=-1.9*(1-ease(t/2));
      letter.userData.glow.material.opacity=.15+.3*ease((t-14)/2);
      beacon.position.copy(world(end,-1.5,box));beacon.material.opacity=ease((t-14)/.6)*(1-ease((t-19)/3))*.55;
      beacon.scale.setScalar(.28+ease((t-16)/3)*.7);
      const positions=trail.geometry.attributes.position;
      for(let i=0;i<100;i++){
        const v=Math.max(0,u-i*.0035),point=route(v,box,end);
        if(reflow&&t<14){const weight=1-ease((t-reflow.start)/reflow.duration);point.x+=reflow.x*weight;point.y+=reflow.y*weight;}
        const wp=world(point,lerp(1.2,-1.5,v),box),spread=i*.0006;
        positions.setXYZ(i,wp.x+Math.sin(i*2.4+t)*spread,wp.y+Math.cos(i*1.7+t)*spread,wp.z);
      }
      positions.needsUpdate=true;trail.geometry.computeBoundingSphere();trail.material.opacity=.65*(1-ease((t-14)/2));
    }
    lastPoint={...p};lastRect={width:box.width,height:box.height};lastTime=t;modeBefore=mode;
  }
  function measure(webgl){
    let contact;
    if(webgl){letter.updateMatrixWorld(true);const p=letter.localToWorld(new T.Vector3(0,CONTACT_Y,0)).project(camera),r=canvas.getBoundingClientRect();contact={x:r.left+(p.x+1)*r.width/2,y:r.top+(1-p.y)*r.height/2};}
    else{const r=fallback.getBoundingClientRect();contact={x:r.left+r.width/2,y:r.bottom};}
    const hand=stage.hand();return {contact,hand,error:Math.hypot(contact.x-hand.x,contact.y-hand.y),phase:phase(lastTime),webgl,handAvailable:stage.handAvailable};
  }
  return {render,measure};
}
