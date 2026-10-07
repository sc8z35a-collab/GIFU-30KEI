// Load events are authoritative. A rejected decode() does not hide a loaded photo.
const pending=new Map(),ready=new Map();
export const photoPath=path=>ready.get(path)||path;
function loadImage(src){
 return new Promise((resolve,reject)=>{
  const image=new Image();image.decoding='async';
  image.onload=()=>image.naturalWidth>0?resolve(src):reject(new Error('empty image'));
  image.onerror=()=>reject(new Error('image request failed'));
  image.src=src;
  if(image.complete&&image.naturalWidth>0)resolve(src);
 });
}
export function readyPhoto(path){
 if(pending.has(path))return pending.get(path);
 const request=loadImage(path).catch(()=>{
  const url=new URL(path,location.href);url.searchParams.set('__photo','20261007');
  return loadImage(url.href);
 }).then(src=>{ready.set(path,src);return src;}).catch(error=>{pending.delete(path);throw error;});
 pending.set(path,request);return request;
}
