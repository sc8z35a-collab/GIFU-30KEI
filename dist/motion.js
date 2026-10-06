// Small, compositor-driven photo and touch controller. No animation dependency.
export const clamp=(value,min,max)=>Math.min(max,Math.max(min,value));
export function createPhotoMotion({reduced,isScenery,onStep,onDetails}){
 const stage=document.querySelector('#photo-stage'),view=document.querySelector('#scenery-view');
 const canvas=document.querySelector('#photo-canvas'),optics=document.querySelector('#photo-optics');
 const photo=document.querySelector('#scene-photo'),previous=document.querySelector('#scene-photo-previous');
 let revision=0,drift=null,frame=0,zoom=1,panX=0,panY=0;
 const touches=new Map();let gesture=null,pinch=null,pinched=false;
 const move=()=>{frame=0;optics.style.transform=`translate3d(${panX}px,${panY}px,0) scale(${zoom})`;};
 const queueMove=()=>{if(!frame)frame=requestAnimationFrame(move);};
 const stop=()=>{drift?.cancel();drift=null;};
 function settle(){canvas.getAnimations().forEach(a=>a.cancel());const before=canvas.style.transform;canvas.style.transform='';if(!reduced()&&before)canvas.animate([{transform:before},{transform:'translate3d(0,0,0)'}],{duration:430,easing:'cubic-bezier(.18,1,.25,1)'});}
 function reset(){zoom=1;panX=panY=0;move();settle();}
 function mode(enabled){document.body.classList.toggle('photo-mode',enabled);if(!enabled)reset();}
 function startDrift(){stop();if(reduced()||!isScenery()||document.hidden||photo.hidden||zoom>1.025)return;drift=photo.animate([{transform:'scale(1.012)'},{transform:'scale(1.05) translate3d(-.45%,-.25%,0)'}],{duration:17000,easing:'cubic-bezier(.2,.35,.35,1)',fill:'forwards'});}
 function pause(){drift?.pause();}
 function resume(){if(reduced()){stop();return;}if(drift)drift.play();else startDrift();}
 function clear(){revision++;stop();photo.getAnimations().forEach(a=>a.cancel());previous.getAnimations().forEach(a=>a.cancel());previous.hidden=true;photo.hidden=true;reset();}
 function transition(src,{position='center',alt='',direction=0,enabled=true}={}){
  const ticket=++revision,oldTransform=getComputedStyle(photo).transform;
  const crossfade=!photo.hidden&&photo.complete&&photo.naturalWidth>0&&photo.getAttribute('src')!==src;
  previous.getAnimations().forEach(a=>a.cancel());
  if(crossfade&&enabled&&!reduced()){
   previous.src=photo.src;previous.style.objectPosition=getComputedStyle(photo).objectPosition;previous.hidden=false;
  }else previous.hidden=true;
  stop();photo.getAnimations().forEach(a=>a.cancel());reset();photo.src=src;photo.alt=alt;
  photo.style.removeProperty('object-position');photo.style.setProperty('--focal-portrait',typeof position==='string'?position:position.portrait||'center');photo.style.setProperty('--focal-landscape',typeof position==='string'?position:position.landscape||position.portrait||'center');photo.hidden=false;
  if(reduced()||!enabled){previous.hidden=true;return;}
  if(!previous.hidden){const outgoing=previous.animate([{opacity:1,transform:oldTransform==='none'?'scale(1)':oldTransform},{opacity:0,transform:`translate3d(${-direction*32}px,0,0) scale(1.055)`}],{duration:780,easing:'cubic-bezier(.2,.65,.25,1)',fill:'both'});outgoing.finished.catch(()=>{}).then(()=>{if(ticket===revision){previous.hidden=true;outgoing.cancel();}});}
  const entrance=photo.animate([{opacity:crossfade?.25:0,transform:`translate3d(${direction*30}px,0,0) scale(1.085)`},{opacity:1,transform:'translate3d(0,0,0) scale(1.012)'}],{duration:900,easing:'cubic-bezier(.16,1,.3,1)',fill:'both'});
  entrance.finished.catch(()=>{}).then(()=>{if(ticket!==revision)return;entrance.cancel();startDrift();});
 }
 function captureFlight(image){
  if(reduced()||!image?.complete||!image.naturalWidth)return null;
  const r=image.getBoundingClientRect();if(r.width<1||r.height<1)return null;
  const clone=image.cloneNode();clone.className='photo-flight';clone.removeAttribute('id');clone.removeAttribute('loading');clone.alt='';clone.setAttribute('aria-hidden','true');
  Object.assign(clone.style,{top:r.top+'px',left:r.left+'px',width:r.width+'px',height:r.height+'px',borderRadius:'11px',objectPosition:getComputedStyle(image).objectPosition});document.body.append(clone);
  return async()=>{try{const to=canvas.getBoundingClientRect();await clone.animate([{top:r.top+'px',left:r.left+'px',width:r.width+'px',height:r.height+'px',borderRadius:'11px',opacity:1},{top:to.top+'px',left:to.left+'px',width:to.width+'px',height:to.height+'px',borderRadius:'0px',opacity:1,offset:.82},{top:to.top+'px',left:to.left+'px',width:to.width+'px',height:to.height+'px',borderRadius:'0px',opacity:0}],{duration:760,easing:'cubic-bezier(.2,.8,.2,1)',fill:'both'}).finished;}catch{}finally{clone.remove();resume();}};
 }
 view.addEventListener('pointerdown',e=>{
  if(e.target.closest('button,a,[data-scrubber]')||e.pointerType==='mouse'&&e.button!==0)return;
  const isPhoto=!!e.target.closest('.photo-stage');touches.set(e.pointerId,{x:e.clientX,y:e.clientY,isPhoto});
  if(isPhoto){try{stage.setPointerCapture(e.pointerId);}catch{}}
  if(touches.size===2&&[...touches.values()].every(p=>p.isPhoto)){
   const[a,b]=[...touches.values()];pinch={distance:Math.max(1,Math.hypot(a.x-b.x,a.y-b.y)),zoom};pinched=true;gesture=null;mode(true);pause();return;
  }
  if(touches.size===1){pinched=false;gesture={x:e.clientX,y:e.clientY,time:performance.now(),isPhoto,panX,panY,zoom};}
 });
 view.addEventListener('pointermove',e=>{
  const touch=touches.get(e.pointerId);if(!touch)return;touch.x=e.clientX;touch.y=e.clientY;
  if(pinch&&touches.size===2){const[a,b]=[...touches.values()];zoom=clamp(pinch.zoom*Math.hypot(a.x-b.x,a.y-b.y)/pinch.distance,1,3);const r=canvas.getBoundingClientRect();panX=clamp(panX,-r.width*(zoom-1)/2,r.width*(zoom-1)/2);panY=clamp(panY,-r.height*(zoom-1)/2,r.height*(zoom-1)/2);queueMove();return;}
  if(!gesture)return;const dx=e.clientX-gesture.x,dy=e.clientY-gesture.y;
  if(gesture.isPhoto&&zoom>1.025){const r=canvas.getBoundingClientRect();panX=clamp(gesture.panX+dx,-r.width*(zoom-1)/2,r.width*(zoom-1)/2);panY=clamp(gesture.panY+dy,-r.height*(zoom-1)/2,r.height*(zoom-1)/2);queueMove();return;}
  if(!reduced()&&Math.abs(dx)>7&&Math.abs(dx)>Math.abs(dy)*1.2){pause();canvas.style.transform=`translate3d(${clamp(dx*.34,-90,90)}px,0,0) scale(${1-Math.min(Math.abs(dx)/16000,.018)})`;}
 });
 function finish(e,cancel=false){
  if(!touches.has(e.pointerId))return;touches.delete(e.pointerId);try{if(stage.hasPointerCapture(e.pointerId))stage.releasePointerCapture(e.pointerId);}catch{}
  if(pinched){pinch=null;if(touches.size===1){const p=[...touches.values()][0];gesture={x:p.x,y:p.y,time:performance.now(),isPhoto:true,panX,panY,zoom};}else{gesture=null;pinched=false;if(zoom<1.025){reset();resume();}}return;}
  const g=gesture;gesture=null;settle();if(cancel||!g){resume();return;}
  const dx=e.clientX-g.x,dy=e.clientY-g.y,dt=performance.now()-g.time;
  if(g.zoom>1.025||zoom>1.025){if(Math.abs(dx)<7&&Math.abs(dy)<7&&dt<350){mode(false);resume();}return;}
  const horizontal=Math.abs(dx)>42||Math.abs(dx)>23&&Math.abs(dx)/Math.max(dt,1)>.45;
  if(horizontal&&Math.abs(dx)>Math.abs(dy)*1.25){onStep(dx<0?1:-1);}
  else if(dy< -56&&Math.abs(dy)>Math.abs(dx)&&!document.body.classList.contains('photo-mode')){onDetails();}
  else if(dy>65&&document.body.classList.contains('photo-mode')){mode(false);resume();}
  else if(Math.abs(dx)<8&&Math.abs(dy)<8&&dt<350&&g.isPhoto){mode(!document.body.classList.contains('photo-mode'));resume();}
  else resume();
 }
 view.addEventListener('pointerup',e=>finish(e));view.addEventListener('pointercancel',e=>finish(e,true));
 document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();else if(isScenery())resume();});
 window.addEventListener('resize',()=>{touches.clear();gesture=pinch=null;pinched=false;reset();if(isScenery())resume();});
 return {transition,clear,reset,mode,pause,resume,captureFlight};
}
