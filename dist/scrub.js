export function indexAt(x,left,width,count){
 return Math.max(0,Math.min(count-1,Math.round((x-left)/Math.max(1,width)*(count-1))));
}
export function createSceneScrubber({element,getItems,getCurrent,onSelect,onStart,onFinish}){
 let pointer=null,pending=null,running=null,frame=0,session=0;
 async function drain(){
  while(pending!==null){const id=pending;pending=null;if(id!==getCurrent())await onSelect(id);}
 }
 function flush(){frame=0;if(!running)running=drain().finally(()=>{running=null;if(pending!==null)flush();});return running;}
 function choose(x){
  const list=getItems();if(!list.length)return;const track=element.querySelector('.progress-track').getBoundingClientRect();
  pending=list[indexAt(x,track.left,track.width,list.length)].id;if(!frame)frame=requestAnimationFrame(flush);
 }
 element.addEventListener('pointerdown',e=>{
  if(pointer!==null||e.pointerType==='mouse'&&e.button!==0)return;e.preventDefault();pointer=e.pointerId;session++;
  element.setPointerCapture(pointer);element.classList.add('scrubbing');onStart?.();choose(e.clientX);
 });
 element.addEventListener('pointermove',e=>{if(e.pointerId===pointer)choose(e.clientX);});
 async function finish(e){
  if(e.pointerId!==pointer)return;const ticket=session;pointer=null;
  if(element.hasPointerCapture(e.pointerId))element.releasePointerCapture(e.pointerId);
  if(frame){cancelAnimationFrame(frame);frame=0;}await flush();while(running||pending!==null)await (running||flush());
  if(ticket===session){element.classList.remove('scrubbing');onFinish?.();}
 }
 element.addEventListener('pointerup',finish);element.addEventListener('pointercancel',finish);
 element.addEventListener('keydown',async e=>{
  const list=getItems(),current=list.findIndex(s=>s.id===getCurrent());let target;
  if(e.key==='ArrowRight'||e.key==='ArrowUp')target=Math.min(list.length-1,current+1);
  if(e.key==='ArrowLeft'||e.key==='ArrowDown')target=Math.max(0,current-1);
  if(e.key==='Home')target=0;if(e.key==='End')target=list.length-1;
  if(target===undefined||!list[target])return;e.preventDefault();e.stopPropagation();await onSelect(list[target].id);onFinish?.();
 });
}
