import {clamp,ease,lerp} from './timeline.js';

// Full source canvas, not the nontransparent bounding box. Recalibrate if art changes.
export const handAnchor = Object.freeze({art:'hang-v1',width:1024,height:1536,x:260,y:520});
export function createStage(){
  const $=id=>document.getElementById(id), hand=$('hand-anchor');
  hand.style.left=`${100*handAnchor.x/handAnchor.width}%`;
  hand.style.top=`${100*handAnchor.y/handAnchor.height}%`;
  let handAvailable=true;
  function actor(id,{x=50,opacity=0,scale=1,y=0,angle=0,height}={}){
    const el=$(id);el.style.left=x+'%';el.style.opacity=clamp(opacity);
    el.style.transform=`translateX(-50%) translateY(${y}px) rotate(${angle}deg) scale(${scale})`;
    el.style.height=height?height+'%':'';
  }
  function render({mode,time,clock,reduced}){
    const t=time,m=innerWidth<=760,c=reduced?0:clock;
    let world=0,zoom=1.03,pan=0;
    actor('cuoi-art');actor('hang-art');actor('lion-art');$('lion-shadow').style.opacity=0;$('story-light').style.opacity=0;
    if(mode==='journey'){
      world=ease((t-5.4)/2.8);zoom=lerp(1.27,1.02,ease((t-7)/7));
      const greeting=ease((t-12.2)/1.5),farewell=ease((t-19.7)/1.8);
      const bow=reduced?0:Math.sin(clamp((t-14)/3)*Math.PI);
      actor('cuoi-art',{x:m?lerp(50,24,farewell):lerp(30,20,farewell),opacity:greeting*(1-ease((t-29)/2))*(m?1-.75*farewell:1),scale:lerp(1,.62,farewell),y:Math.sin(c*.75)*1.5+bow*4,angle:bow*-2});
      $('cuoi-greeting').style.transform=`rotate(${bow*-6}deg)`;
      const push=ease((t-12.5)/2)*(1-ease((t-19.3)/2));zoom+=.1*push;pan=(m?5:7)*push;
      const dance=ease((t-19.7)/1.2)*(1-ease((t-28.4)/1.6));
      const beat=(t-20)*Math.PI*2/.86;
      const active=clamp((t-22)/.8)*(1-ease((t-27)/1));
      const hop=reduced?0:Math.pow(Math.max(0,Math.sin(beat)),2)*14*active;
      const bowLion=reduced?0:Math.sin(clamp((t-20)/2.2)*Math.PI)*12;
      const settle=reduced?0:ease((t-27)/1.2)*-9;
      actor('lion-art',{x:(m?50:66)+(reduced?0:Math.sin((t-22)*1.2)*1.8*active),opacity:dance,scale:m?.9:1,y:-hop,angle:reduced?0:Math.sin(beat*.5)*1.4*active});
      $('lion-head').style.transform=`translateY(${bowLion*.5-hop*.12}px) rotate(${bowLion+settle+(reduced?0:Math.sin(beat)*5*active)}deg)`;
      $('lion-body').style.transform=`scaleY(${1-hop*.0015}) rotate(${reduced?0:Math.sin(beat-.5)*2*active}deg)`;
      for(const [i,id] of ['lion-leg-back-far','lion-leg-front-far','lion-leg-back','lion-leg-front'].entries()){
        const stride=reduced?0:Math.sin(beat+(i%2)*Math.PI)*9*active;
        $(id).style.transform=`rotate(${stride}deg) translateY(${-Math.max(0,stride)*.25}px)`;
      }
      $('lion-shadow').style.left=(m?50:66)+'%';$('lion-shadow').style.opacity=dance*.5;
      $('lion-shadow').style.transform=`translateX(-50%) scale(${1-hop/100})`;
      $('story-light').style.opacity=(1-ease((t-1.5)/2.6))*.1+Math.sin(ease((t-5.7)/3)*Math.PI)*.1;
    }else if(mode==='outro'){
      world=ease((t-5.3)/4);zoom=lerp(1.28,1.02,ease((t-10)/11));
      const arrival=ease((t-9)/2.3),receive=ease((t-12.2)/1.8);
      actor('cuoi-art',{x:m?29:42,opacity:arrival,scale:m?.7:.77,y:Math.sin(c*.7)*1.2,angle:reduced?0:receive*1.5});
      actor('hang-art',{x:68,opacity:handAvailable?arrival:0,scale:m?.82:.94,y:Math.sin(c*.65)*2.5,angle:Math.sin(c*.4)*.3});
      // Arms, palms and marker share a transform: the receiving gesture cannot drift from its target.
      $('hang-arms').style.transform=`translateY(${-receive*.8}%) rotate(${receive*-1.2}deg)`;
      $('hand-light').style.opacity=handAvailable?ease((t-14)/.7)*(1-ease((t-19)/2))*.75:0;
      $('story-light').style.opacity=Math.sin(ease((t-16)/3.5)*Math.PI)*.09;
    }else if(mode==='ending'){
      world=.78;zoom=1.02;
      actor('cuoi-art',{x:m?30:66,opacity:.9,scale:m?.68:.63,height:m?43:60});
      actor('hang-art',{x:m?66:82,opacity:handAvailable?.95:0,scale:m?.85:.86,height:m?48:72});
    }else if(mode==='feast'||mode==='wish')world=.68;
    if(mode!=='outro'){$('hang-arms').style.transform='none';$('hand-light').style.opacity=0;}
    $('story-world').style.opacity=world;
    $('palace-art').style.transform=`translate3d(${pan+Math.sin(c*.07)*.3}%,${Math.sin(c*.1)*.15}%,0) scale(${zoom})`;
    $('story-mist').style.transform=`translateX(${Math.sin(c*.13)*4}%)`;
    $('story-mist-near').style.transform=`translateX(${Math.sin(c*.09+1)*-5}%) scale(${1+ease((t-3)/5)*.1})`;
  }
  return {render,hand(){const r=hand.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2};},letterWidth:()=>$('hang-arms').getBoundingClientRect().width*.15,get handAvailable(){return handAvailable;},setHandAvailable(value){handAvailable=value;}};
}
