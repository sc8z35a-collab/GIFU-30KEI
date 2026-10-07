import {readyPhoto} from './photo-loader.js';
// Small, compositor-driven photo and touch controller. No animation dependency.
export const clamp=(value,min,max)=>Math.min(max,Math.max(min,value));
export function swipeDirection(dx,dy,elapsed){
 const travel=Math.abs(dx),horizontal=travel>42||travel>23&&travel/Math.max(1,elapsed)>.45;
 return horizontal&&travel>Math.abs(dy)*1.25?(dx<0?1:-1):0;
}
export function createPhotoMotion({reduced,isScenery,onStep,onDetails,getNeighbor}){
 const stage=document.querySelector('#photo-stage'),view=document.querySelector('#scenery-view');
 const canvas=document.querySelector('#photo-canvas'),optics=document.querySelector('#photo-optics');
 const photo=document.querySelector('#scene-photo'),previous=document.querySelector('#scene-photo-previous');
 const peek=document.createElement('img');peek.className='scene-peek';peek.alt='';peek.setAttribute('aria-hidden','true');peek.hidden=true;stage.prepend(peek);
 const fragments=Array.from({length:3},(_,index)=>{
  const image=document.createElement('img');image.className='scene-reveal-layer';image.alt='';image.setAttribute('aria-hidden','true');image.hidden=true;
  image.style.clipPath='inset(0 '+((2-index)*100/3)+'% 0 '+(index*100/3)+'%)';optics.append(image);return image;
 });
 let entering=false,revision=0,drift=null,frame=0,zoom=1,panX=0,panY=0,peekTicket=0,peekDirection=0,peekAmount=0;
 const touches=new Map();let gesture=null,pinch=null,pinched=false;
 const move=()=>{frame=0;optics.style.transform=`translate3d(${panX}px,${panY}px,0) scale(${zoom})`;};
 const queueMove=()=>{if(!frame)frame=requestAnimationFrame(move);};
 const stop=()=>{drift?.cancel();drift=null;};
 function hidePeek(){peekTicket++;peekDirection=0;peekAmount=0;peek.hidden=true;stage.classList.remove('dragging-photo');}
 function settle(){hidePeek();canvas.getAnimations().forEach(a=>a.cancel());const before=canvas.style.transform;canvas.style.transform='';if(!reduced()&&before)canvas.animate([{transform:before},{transform:'translate3d(0,0,0)'}],{duration:640,easing:'cubic-bezier(.16,1,.28,1)'});}
 function revealPeek(direction,amount){
  peekAmount=amount;stage.classList.add('dragging-photo');
  const edge=(100-amount*100).toFixed(2)+'%';peek.style.clipPath=direction>0?`inset(0 0 0 ${edge})`:`inset(0 ${edge} 0 0)`;
  peek.style.transform=`translate3d(${direction*(1-amount)*18}px,0,0) scale(1.04)`;
  if(peekDirection===direction)return;peekDirection=direction;peek.hidden=true;
  const ticket=++peekTicket,neighbor=getNeighbor?.(direction);if(!neighbor)return;
  readyPhoto(neighbor.src).then(src=>{
   if(ticket!==peekTicket||!gesture||pinched||reduced())return;
   peek.src=src;peek.style.setProperty('--focal-portrait',neighbor.position.portrait);peek.style.setProperty('--focal-landscape',neighbor.position.landscape);peek.hidden=false;
  }).catch(()=>{});
 }
 function reset(){zoom=1;panX=panY=0;move();settle();}
 function mode(enabled){
  const before=document.body.classList.contains('photo-mode');
  if(before===enabled){if(!enabled)reset();return;}
  const from=stage.getBoundingClientRect();stage.getAnimations().forEach(animation=>animation.cancel());
  document.body.classList.toggle('photo-mode',enabled);if(!enabled)reset();
  if(reduced())return;
  const to=stage.getBoundingClientRect();if(from.width<1||from.height<1||to.width<1||to.height<1)return;
  stage.style.transformOrigin='0 0';
  stage.animate([{transform:'translate3d('+(from.left-to.left)+'px,'+(from.top-to.top)+'px,0) scale('+(from.width/to.width)+','+(from.height/to.height)+')'},{transform:'translate3d(0,0,0) scale(1,1)'}],{duration:850,easing:'cubic-bezier(.16,1,.3,1)'});
 }
 function startDrift(){
  stop();if(entering||reduced()||!isScenery()||document.hidden||photo.hidden||zoom>1.025)return;
  drift=photo.animate([{transform:'scale(1.035) translate3d(.7%,.45%,0)'},{transform:'scale(1.115) translate3d(-1.25%,-.8%,0)'}],{duration:19000,iterations:Infinity,direction:'alternate',easing:'cubic-bezier(.37,0,.63,1)',fill:'both'});
 }
 function pause(){drift?.pause();}
 function resume(){if(reduced()){stop();return;}if(drift)drift.play();else startDrift();}
 function clear(){
  revision++;entering=false;stop();stage.getAnimations().forEach(animation=>animation.cancel());
  for(const image of [photo,previous,...fragments]){image.getAnimations().forEach(animation=>animation.cancel());image.hidden=true;}
  reset();
 }
 function transition(src,{position='center',alt='',direction=0,enabled=true}={}){
  const ticket=++revision,oldTransform=getComputedStyle(photo).transform;
  const crossfade=!photo.hidden&&photo.complete&&photo.naturalWidth>0&&photo.getAttribute('src')!==src;
  const dir=direction||(ticket%2?1:-1),focal=typeof position==='string'?{portrait:position,landscape:position}:{portrait:position.portrait||'center',landscape:position.landscape||position.portrait||'center'};
  entering=false;previous.getAnimations().forEach(animation=>animation.cancel());
  for(const image of fragments){image.getAnimations().forEach(animation=>animation.cancel());image.hidden=true;}
  if(crossfade&&enabled&&!reduced()){
   previous.src=photo.src;previous.style.objectPosition=getComputedStyle(photo).objectPosition;previous.hidden=false;
  }else previous.hidden=true;
  stop();photo.getAnimations().forEach(animation=>animation.cancel());reset();photo.src=src;photo.alt=alt;
  photo.style.removeProperty('object-position');photo.style.setProperty('--focal-portrait',focal.portrait);photo.style.setProperty('--focal-landscape',focal.landscape);photo.hidden=false;
  if(reduced()||!enabled){previous.hidden=true;return;}
  entering=true;
  if(!previous.hidden){
   const outgoing=previous.animate([{opacity:1,transform:oldTransform==='none'?'scale(1.035)':oldTransform},{opacity:.8,transform:'translate3d('+(-dir*4)+'%,0,0) scale(1.08)',offset:.36},{opacity:0,transform:'translate3d('+(-dir*14)+'%,-1%,0) rotate('+(-dir*.8)+'deg) scale(1.13)'}],{duration:1090,easing:'cubic-bezier(.2,.65,.25,1)',fill:'both'});
   outgoing.finished.catch(()=>{}).then(()=>{if(ticket===revision){previous.hidden=true;outgoing.cancel();}});
  }
  if(crossfade)fragments.forEach((image,index)=>{
   image.src=src;image.style.setProperty('--focal-portrait',focal.portrait);image.style.setProperty('--focal-landscape',focal.landscape);image.hidden=false;
   const effect=image.animate([{opacity:.95,transform:'translate3d('+(dir*(16+index*5))+'%,'+(index%2?3:-3)+'%,0) scale(1.18)'},{opacity:1,transform:'translate3d(0,0,0) scale(1.035)',offset:.76},{opacity:0,transform:'translate3d(0,0,0) scale(1.035)'}],{duration:930,delay:index*90,easing:'cubic-bezier(.16,1,.3,1)',fill:'both'});
   effect.finished.catch(()=>{}).then(()=>{if(ticket===revision){image.hidden=true;effect.cancel();}});
  });
  const entrance=photo.animate([{opacity:crossfade?.2:.1,transform:'translate3d('+(dir*(crossfade?12:3))+'%,1%,0) rotate('+(crossfade?dir*.65:0)+'deg) scale('+(crossfade?1.16:1.12)+')'},{opacity:1,transform:'translate3d(0,0,0) rotate(0deg) scale(1.035)'}],{duration:crossfade?1240:1080,easing:'cubic-bezier(.16,1,.3,1)',fill:'both'});
  entrance.finished.catch(()=>{}).then(()=>{if(ticket!==revision)return;entering=false;entrance.cancel();startDrift();});
 }
 function captureFlight(image){
  if(reduced()||!image?.complete||!image.naturalWidth)return null;
  const r=image.getBoundingClientRect();if(r.width<1||r.height<1)return null;
  const clone=image.cloneNode();clone.className='photo-flight';clone.removeAttribute('id');clone.removeAttribute('loading');clone.alt='';clone.setAttribute('aria-hidden','true');
  const rectangle=(box,radius=0)=>({top:box.top+'px',left:box.left+'px',width:box.width+'px',height:box.height+'px',borderRadius:radius+'px'});
  Object.assign(clone.style,rectangle(r,13),{objectPosition:getComputedStyle(image).objectPosition});document.body.append(clone);
  return async()=>{
   try{
    pause();stage.getAnimations().forEach(animation=>animation.cancel());const to=canvas.getBoundingClientRect();
    await clone.animate([{...rectangle(r,13),transform:'rotate(0deg)',opacity:1},{...rectangle({top:r.top-9,left:r.left-6,width:r.width+12,height:r.height+12},15),transform:'rotate(-.9deg)',opacity:1,offset:.16},{...rectangle(to),transform:'rotate(0deg)',opacity:1,offset:.88},{...rectangle(to),transform:'rotate(0deg)',opacity:0}],{duration:990,easing:'cubic-bezier(.2,.8,.2,1)',fill:'both'}).finished;
   }catch{}finally{clone.remove();resume();}
  };
 }

 view.addEventListener('pointerdown',e=>{
  if(!isScenery()||e.target.closest('button,a,[data-scrubber]')||e.pointerType==='mouse'&&e.button!==0)return;
  const isPhoto=!!e.target.closest('.photo-stage');touches.set(e.pointerId,{x:e.clientX,y:e.clientY,isPhoto});
  if(isPhoto){try{stage.setPointerCapture(e.pointerId);}catch{}}
  if(touches.size===2&&[...touches.values()].every(p=>p.isPhoto)){
   const[a,b]=[...touches.values()];pinch={distance:Math.max(1,Math.hypot(a.x-b.x,a.y-b.y)),zoom};pinched=true;gesture=null;hidePeek();mode(true);pause();return;
  }
  if(touches.size===1){pinched=false;gesture={x:e.clientX,y:e.clientY,time:performance.now(),isPhoto,panX,panY,zoom};}
 });
 view.addEventListener('pointermove',e=>{
  const touch=touches.get(e.pointerId);if(!touch)return;touch.x=e.clientX;touch.y=e.clientY;
  if(pinch&&touches.size===2){const[a,b]=[...touches.values()];zoom=clamp(pinch.zoom*Math.hypot(a.x-b.x,a.y-b.y)/pinch.distance,1,3);const r=canvas.getBoundingClientRect();panX=clamp(panX,-r.width*(zoom-1)/2,r.width*(zoom-1)/2);panY=clamp(panY,-r.height*(zoom-1)/2,r.height*(zoom-1)/2);queueMove();return;}
  if(!gesture)return;const dx=e.clientX-gesture.x,dy=e.clientY-gesture.y;
  if(gesture.isPhoto&&zoom>1.025){const r=canvas.getBoundingClientRect();panX=clamp(gesture.panX+dx,-r.width*(zoom-1)/2,r.width*(zoom-1)/2);panY=clamp(gesture.panY+dy,-r.height*(zoom-1)/2,r.height*(zoom-1)/2);queueMove();return;}
  if(!reduced()&&Math.abs(dx)>7&&Math.abs(dx)>Math.abs(dy)*1.2){
   pause();const travel=Math.abs(dx),width=Math.max(stage.clientWidth,1);
   canvas.style.transform=`translate3d(${clamp(dx*.3,-92,92)}px,0,0) scale(${1-Math.min(travel/9000,.022)})`;
   revealPeek(dx<0?1:-1,clamp(travel/width*.82,0,.65));
  }else if(peekDirection){settle();}
 });
 function finish(e,cancel=false){
  if(!touches.has(e.pointerId))return;touches.delete(e.pointerId);try{if(stage.hasPointerCapture(e.pointerId))stage.releasePointerCapture(e.pointerId);}catch{}
  if(pinched){pinch=null;if(touches.size===1){const p=[...touches.values()][0];gesture={x:p.x,y:p.y,time:performance.now(),isPhoto:true,panX,panY,zoom};}else{gesture=null;pinched=false;if(zoom<1.025){reset();resume();}}return;}
  const g=gesture;gesture=null;settle();if(cancel||!g){resume();return;}
  const dx=e.clientX-g.x,dy=e.clientY-g.y,dt=performance.now()-g.time;
  if(g.zoom>1.025||zoom>1.025){if(Math.abs(dx)<7&&Math.abs(dy)<7&&dt<350){mode(false);resume();}return;}
  const direction=swipeDirection(dx,dy,dt);
  if(direction){onStep(direction);}
  else if(dy< -56&&Math.abs(dy)>Math.abs(dx)&&!document.body.classList.contains('photo-mode')){onDetails();}
  else if(dy>65&&document.body.classList.contains('photo-mode')){mode(false);resume();}
  else resume();
 }
 view.addEventListener('pointerup',e=>finish(e));view.addEventListener('pointercancel',e=>finish(e,true));
 document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();else if(isScenery())resume();});
 window.addEventListener('resize',()=>{touches.clear();gesture=pinch=null;pinched=false;reset();if(isScenery())resume();});
 return {transition,clear,reset,mode,pause,resume,captureFlight};
}

export function createSheetDrag({dialog,header,reduced,onClose}){
 let drag=null;
 header.addEventListener('pointerdown',e=>{
  if(!dialog.open||e.target.closest('button,a')||e.pointerType==='mouse'&&e.button!==0)return;
  dialog.getAnimations().forEach(animation=>animation.cancel());
  const landscape=matchMedia('(orientation:landscape)').matches;
  drag={id:e.pointerId,start:landscape?e.clientX:e.clientY,landscape,time:performance.now(),distance:0};
  header.setPointerCapture(e.pointerId);
 });
 header.addEventListener('pointermove',e=>{
  if(!drag||e.pointerId!==drag.id)return;
  drag.distance=Math.max(0,(drag.landscape?e.clientX:e.clientY)-drag.start);
  if(reduced())return;
  dialog.style.transform=drag.landscape?`translate3d(${drag.distance}px,0,0)`:`translate3d(0,${drag.distance}px,0)`;
 });
 function finish(e,cancel=false){
  if(!drag||e.pointerId!==drag.id)return;const d=drag;drag=null;
  if(header.hasPointerCapture(e.pointerId))header.releasePointerCapture(e.pointerId);
  const elapsed=performance.now()-d.time;
  if(!cancel&&(d.distance>65||d.distance>24&&d.distance/Math.max(1,elapsed)>.4)){onClose();return;}
  const before=dialog.style.transform;dialog.style.transform='';
  if(before&&!reduced())dialog.animate([{transform:before},{transform:'translate3d(0,0,0)'}],{duration:580,easing:'cubic-bezier(.16,1,.3,1)'});
 }
 header.addEventListener('pointerup',e=>finish(e));header.addEventListener('pointercancel',e=>finish(e,true));
 dialog.addEventListener('close',()=>{drag=null;dialog.style.transform='';});
}
