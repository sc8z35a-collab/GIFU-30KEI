const OUT='cubic-bezier(.16,1,.3,1)';
const SPRING='cubic-bezier(.2,.9,.24,1.14)';

export function createInterfaceMotion({reduced}){
 const owned=new WeakMap(),presses=new Map(),sheetObservers=new WeakMap();
 function play(element,frames,options={}){
  if(!element||reduced())return null;
  owned.get(element)?.cancel();
  const animation=element.animate(frames,{duration:780,easing:OUT,fill:'backwards',...options});
  owned.set(element,animation);
  animation.finished.catch(()=>{}).then(()=>{if(options.fill!=='forwards'&&options.fill!=='both'&&owned.get(element)===animation)owned.delete(element);});
  return animation;
 }
 function rise(element,delay=0,travel=32,tilt=0){
  return play(element,[{opacity:0,transform:'translate3d(0,'+travel+'px,0) rotate('+tilt+'deg) scale(.965)'},{opacity:1,transform:'translate3d(0,0,0) rotate(0deg) scale(1)'}],{delay,duration:900});
 }
 function scene(direction=0){
  if(reduced())return;
  const dir=direction||1;
  [['.scene-meta',0,20],['#scene-name',35,46],['#scene-reading',130,20],['#scene-summary',185,30]].forEach(([selector,delay,travel])=>{
   const element=document.querySelector(selector);
   play(element,[{opacity:0,transform:'translate3d('+dir*26+'px,'+travel+'px,0) rotateX(9deg)'},{opacity:1,transform:'translate3d(0,0,0) rotateX(0deg)'}],{delay,duration:980});
  });
  play(document.querySelector('.meta-rule'),[{transform:'scaleX(0)'},{transform:'scaleX(1)'}],{duration:1100,delay:90});
  document.querySelectorAll('#scene-tags .access-tag').forEach((tag,index)=>play(tag,[{opacity:0,transform:'translate3d(0,18px,0) scale(.75)'},{opacity:1,transform:'translate3d(0,-2px,0) scale(1.04)',offset:.72},{opacity:1,transform:'translate3d(0,0,0) scale(1)'}],{duration:780,delay:255+index*75}));
  rise(document.querySelector('.scene-quick-info'),290,22);
  document.querySelectorAll('.scene-actions > *').forEach((button,index)=>play(button,[{opacity:.72,transform:'translate3d(0,12px,0) scale(.965)'},{opacity:1,transform:'translate3d(0,-2px,0) scale(1.025)',offset:.72},{opacity:1,transform:'translate3d(0,0,0) scale(1)'}],{duration:700,delay:40+index*55}));
  play(document.querySelector('.scene-stepper'),[{opacity:.65,transform:'translate3d(0,7px,0)'},{opacity:1,transform:'translate3d(0,0,0)'}],{duration:800,delay:90});
  play(document.querySelector('#scene-position'),[{opacity:.4,transform:'translate3d(0,13px,0) rotateX(-65deg)'},{opacity:1,transform:'translate3d(0,0,0) rotateX(0deg)'}],{duration:860});
  play(document.querySelector('.scene-ticks i.current'),[{transform:'scaleY(.3)'},{transform:'scaleY(1.8)',offset:.6},{transform:'scaleY(1)'}],{duration:900,delay:100});
 }
 function card(element,index=0){
  const delay=Math.min(index,5)*90;
  rise(element,delay,58,index%2?.9:-.9);
  play(element.querySelector('.card-image'),[{clipPath:'inset(0 0 100% 0 round 13px)'},{clipPath:'inset(0 0 0% 0 round 13px)'}],{duration:950,delay:delay+65});
  rise(element.querySelector('.card-number'),delay+155,16);
  rise(element.querySelector('.card-info'),delay+210,18);
 }
 function story(figure,index=0){
  const delay=Math.min(index,3)*80,frame=figure.querySelector('.story-frame'),image=figure.querySelector('img');
  const radius=frame?getComputedStyle(frame).borderRadius||'12px':'12px';
  rise(figure,delay,38);
  play(frame,[{clipPath:'inset(7% 0 74% 0 round '+radius+')'},{clipPath:'inset(0% 0 0% 0 round '+radius+')'}],{duration:1280,delay:delay+40});
  play(image,[{transform:'translate3d(0,3%,0) scale(1.14)',opacity:.7},{transform:'translate3d(0,0,0) scale(1)',opacity:1}],{duration:1450,delay:delay+40});
  rise(figure.querySelector('.story-caption'),delay+280,15);rise(figure.querySelector('.story-credit'),delay+350,10);
 }
 function view(element,direction=1){
  play(element,[{opacity:.25,transform:'translate3d('+direction*38+'px,26px,0) scale(.97)'},{opacity:1,transform:'translate3d(0,0,0) scale(1)'}],{duration:820});
  rise(element.querySelector('.view-header h1'),70,24);
  element.querySelectorAll('.list-tools > *, .setting-section').forEach((child,index)=>rise(child,115+Math.min(index,5)*75,30));
 }
 function openSheet(dialog){
  dialog.classList.remove('sheet-exiting');
  const landscape=matchMedia('(orientation:landscape)').matches;
  play(dialog,[{opacity:.7,transform:landscape?'translate3d(108%,0,0) rotate(1.2deg)':'translate3d(0,104%,0) scale(.975)'},{opacity:1,transform:landscape?'translate3d(-1.4%,0,0) rotate(-.25deg)':'translate3d(0,-1.5%,0) scale(1)',offset:.76},{opacity:1,transform:'translate3d(0,0,0) rotate(0deg) scale(1)'}],{duration:870});
  dialog.querySelectorAll('.overview-title > *, .photo-filmstrip, .detail-body > .access-tags, .detail-description, .filter-content h3, .filter-options, .filter-apply').forEach((child,index)=>rise(child,170+Math.min(index,7)*65,28));
  play(dialog.querySelector('.overview-photo img'),[{transform:'scale(1.29) translate3d(0,-2%,0)',opacity:.6},{transform:'scale(1.16) translate3d(0,0,0)',opacity:1}],{duration:1350,delay:100});
  sheetObservers.get(dialog)?.disconnect();
  if(!reduced()&&'IntersectionObserver'in window){
   const observer=new IntersectionObserver(entries=>{let index=0;for(const entry of entries)if(entry.isIntersecting){if(entry.target.classList.contains('story-figure'))story(entry.target,index++);else rise(entry.target,index++*70,30);observer.unobserve(entry.target);}}, {root:dialog,threshold:.06});
   dialog.querySelectorAll('.story-figure, .detail-section, .source-item').forEach(element=>observer.observe(element));
   sheetObservers.set(dialog,observer);
   dialog.addEventListener('close',()=>observer.disconnect(),{once:true});
  }
 }
 async function closeSheet(dialog){
  const from=getComputedStyle(dialog).transform;
  dialog.style.transform='';dialog.classList.add('sheet-exiting');
  const landscape=matchMedia('(orientation:landscape)').matches;
  const animation=play(dialog,[{transform:from==='none'?'translate3d(0,0,0)':from,opacity:1},{transform:landscape?'translate3d(106%,0,0) rotate(.7deg)':'translate3d(0,105%,0) scale(.98)',opacity:.65}],{duration:390,easing:'cubic-bezier(.45,0,.85,.35)',fill:'none'});
  if(animation)await animation.finished.catch(()=>{});
  sheetObservers.get(dialog)?.disconnect();dialog.classList.remove('sheet-exiting');
 }
 function halo(element,event){
  if(reduced()||element.closest('dialog'))return;
  const ring=document.createElement('i'),rect=element.getBoundingClientRect(),size=Math.min(52,Math.max(30,rect.height));
  ring.className='touch-halo';ring.setAttribute('aria-hidden','true');
  Object.assign(ring.style,{left:(event.clientX-size/2)+'px',top:(event.clientY-size/2)+'px',width:size+'px',height:size+'px',color:getComputedStyle(element).color});
  document.body.append(ring);
  const animation=play(ring,[{opacity:.3,transform:'scale(.5)'},{opacity:.18,transform:'scale(1.1)',offset:.35},{opacity:0,transform:'scale(1.8)'}],{duration:640,fill:'none'});
  if(animation)animation.finished.catch(()=>{}).then(()=>ring.remove());else ring.remove();
 }
 document.addEventListener('pointerdown',event=>{
  if(reduced()||event.pointerType==='mouse'&&event.button!==0)return;
  const element=event.target.closest('button,a');if(!element||element.disabled)return;
  presses.set(event.pointerId,element);
  const card=element.classList.contains('spot-card-main');
  play(element,[{transform:'scale(1)'},{transform:card?'translate3d(0,3px,0) scale(.955) rotate(-.65deg)':'translate3d(0,2px,0) scale(.9)'}],{duration:170,easing:'cubic-bezier(.2,.7,.3,1)',fill:'forwards'});
  halo(element,event);
 },{passive:true});
 function release(event){
  const element=presses.get(event.pointerId);if(!element)return;presses.delete(event.pointerId);
  const from=getComputedStyle(element).transform;
  const animation=play(element,[{transform:from==='none'?'scale(.94)':from},{transform:'translate3d(0,-2px,0) scale(1.045)',offset:.55},{transform:'translate3d(0,0,0) scale(1)'}],{duration:580,easing:SPRING,fill:'none'});
  if(!animation)owned.get(element)?.cancel();
 }
 document.addEventListener('pointerup',release,{passive:true});document.addEventListener('pointercancel',release,{passive:true});
 window.addEventListener('blur',()=>{for(const element of presses.values())owned.get(element)?.cancel();presses.clear();});
 return {scene,card,view,openSheet,closeSheet};
}
