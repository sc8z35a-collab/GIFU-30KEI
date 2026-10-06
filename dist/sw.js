const CACHE='gifu-offline-v1';
const SHELL=['./','./index.html','./style.css','./experience.css','./motion.js','./random.js','./scrub.js','./assets/contours.svg','./assets/kabusugi.webp','./app.js','./data.js','./photos.js','./budgets.js','./manifest.webmanifest','./assets/icon-192.png','./assets/icon-512.png','./assets/NotoSerifJP.woff2','./assets/NotoSansJP.woff2','./assets/NotoSerifJP-OFL.txt','./assets/NotoSansJP-OFL.txt'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 const cache=await caches.open(CACHE),keys=(await caches.keys()).filter(k=>k.startsWith('gifu-offline-')&&k!==CACHE);
 for(const key of keys){const old=await caches.open(key);for(const request of await old.keys()){if(new URL(request.url).pathname.includes('/assets/')&&!(await cache.match(request))){const response=await old.match(request);if(response)await cache.put(request,response);}}await caches.delete(key);}
 await self.clients.claim();
})()));
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);
 if(request.method!=='GET'||url.origin!==self.location.origin)return;
 const image=url.pathname.includes('/assets/');
 if(image){event.respondWith(caches.open(CACHE).then(async cache=>{const cached=await cache.match(request);if(cached)return cached;const response=await fetch(request);if(response.ok)await cache.put(request,response.clone());return response;}));return;}
 event.respondWith(fetch(request).then(async response=>{if(response.ok){const cache=await caches.open(CACHE);await cache.put(request,response.clone());}return response;}).catch(async()=>{const cached=await caches.match(request);if(cached)return cached;if(request.mode==='navigate')return caches.match(new URL('./index.html',self.registration.scope).href);return Response.error();}));
});
