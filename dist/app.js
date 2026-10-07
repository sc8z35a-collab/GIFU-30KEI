import {createPhotoMotion,createSheetDrag} from './motion.js';
import {createRandomPicker} from './random.js';
import {createSceneScrubber} from './scrub.js';
import { SPOTS, CATEGORIES, ORIGIN } from './data.js';
import { PHOTOS } from './photos.js';
import { BUDGETS } from './budgets.js';

const $ = (s, parent = document) => parent.querySelector(s);
const $$ = (s, parent = document) => [...parent.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icons = {
 landscape:'<path d="m2 18 7-12 5 8 3-5 5 9H2Z"/><path d="m6 12 3 2 2-1"/>',
 grid:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
 bookmark:'<path d="M6 3h12v18l-6-4-6 4V3Z"/>',
 settings:'<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="3" fill="var(--paper,#f1f0e9)"/><circle cx="16" cy="17" r="3" fill="var(--paper,#f1f0e9)"/>',
 close:'<path d="m6 6 12 12M6 18 18 6"/>',
 next:'<path d="m9 5 7 7-7 7"/>', previous:'<path d="m15 5-7 7 7 7"/>',
 fullscreen:'<path d="M8 3H3v5M16 3h5v5M3 16v5h5M21 16v5h-5"/>',
 search:'<circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/>',
 filter:'<path d="M3 6h18M6 12h12M9 18h6"/>',
 walk:'<circle cx="13" cy="3" r="1.5"/><path d="m10 21 2-7-4-3 2-5 4 1 2 5h4M4 10l4-3m3 7 6 7"/>',
 cycle:'<circle cx="5" cy="16" r="4"/><circle cx="19" cy="16" r="4"/><path d="m5 16 4-8 5 8H5m10-12h3l2 12M7 8h9M8 5h4"/>',
 rail:'<rect x="5" y="2" width="14" height="16" rx="3"/><path d="M5 10h14M9 6h6M7 22l3-4m7 4-3-4"/><path d="M8 14h1m6 0h1"/>',
 pin:'<path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2"/>',
 arrow:'<path d="M5 19 19 5M5 5h14v14"/>',
 check:'<path d="m5 12 4 4L20 5"/>',
 shuffle:'<path d="M3 7h3c5 0 7 10 12 10h3m-4-4 4 4-4 4M3 17h3c2.5 0 4-2.5 5-5m2-3c1.5-1.5 3-2 5-2h3m-4-4 4 4-4 4"/>',
 download:'<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>'
};
function icon(name){return `<svg viewBox="0 0 24 24" aria-hidden="true">${icons[name] || icons.pin}</svg>`;}
const storage = {get(k, fallback){try {return JSON.parse(localStorage.getItem('gifu:'+k)) ?? fallback;}catch{return fallback;}},set(k,v){try{localStorage.setItem('gifu:'+k,JSON.stringify(v));}catch{}}};
const state = {view:'scenery',id:storage.get('current',SPOTS[0].id),area:'all',category:'all',travel:'all',query:'',saved:new Set(storage.get('saved',[])),reduced:storage.get('motion',false),randomStart:storage.get('random-start',false)};
if(!SPOTS.some(s=>s.id===state.id)) state.id=SPOTS[0].id;
const pickRandom=createRandomPicker();
if(state.randomStart)state.id=pickRandom(SPOTS,state.id)||state.id;
$('#random-start').checked=state.randomStart;
const mobile = /Android|iPhone|iPod/i.test(navigator.userAgent) || navigator.userAgentData?.mobile;
if(mobile)document.body.classList.add('touch-device');
document.body.classList.toggle('reduce-motion',state.reduced);
$('#reduce-motion').checked=state.reduced;
const reduced = ()=>state.reduced || matchMedia('(prefers-reduced-motion: reduce)').matches;
const animate = (el, frames, options={}) => {if(!el || reduced())return Promise.resolve();return el.animate(frames,{duration:450,easing:'cubic-bezier(.22,1,.36,1)',...options}).finished.catch(()=>{});};
const current=()=>SPOTS.find(s=>s.id===state.id);
const photoChoices=storage.get('photo-choices',{});
const gallery=s=>(s.gallery||[s.photo]).filter(key=>PHOTOS[key]);
const photoKey=s=>gallery(s).includes(photoChoices[s.id])?photoChoices[s.id]:s.photo;
const currentPhoto=s=>PHOTOS[photoKey(s)];
const photoFocal=(s,p)=>({portrait:p?.focal||photoPosition[s.id]||'center',landscape:p?.focalWide||p?.focal||photoPosition[s.id]||'center'});
const focalStyle=(s,p)=>{const f=photoFocal(s,p);return `--focal-portrait:${esc(f.portrait)};--focal-landscape:${esc(f.landscape)}`;};
const areaNames={all:'岐阜県',tono:'東濃',chuno:'中濃',seino:'西濃',hida:'飛騨',gifu:'岐阜・山県'};
const travelNames={all:'移動・散策',walk:'徒歩散策',cycle:'現地ライド',rail:'鉄道を使う'};
const railSuitable=new Set(SPOTS.filter(s=>s.travel?.includes('rail')).map(s=>s.id));
const walkSuitable=new Set(SPOTS.filter(s=>s.travel?.includes('walk')).map(s=>s.id));
const cycleSuitable=new Set(SPOTS.filter(s=>s.travel?.includes('cycle')).map(s=>s.id));
function matches(s, f=state){
 const q=f.query.trim().normalize('NFKC').toLowerCase();
 return (f.area==='all'||s.area===f.area)&&(f.category==='all'||s.category===f.category)&&(f.travel==='all'||(f.travel==='walk'&&walkSuitable.has(s.id))||(f.travel==='cycle'&&cycleSuitable.has(s.id))||(f.travel==='rail'&&railSuitable.has(s.id)))&&(!q||[s.name,s.reading,s.city,s.district,s.address,CATEGORIES[s.category]].join(' ').normalize('NFKC').toLowerCase().includes(q));
}
const filtered=()=>SPOTS.filter(s=>matches(s));
function mapLink(s){return 'https://www.google.com/maps/search/?'+new URLSearchParams({api:'1',query:s.address+' '+s.name});}
function routeLink(s,mode){return 'https://www.google.com/maps/dir/?'+new URLSearchParams({api:'1',origin:ORIGIN.query,destination:s.routeDestination||s.address+' '+s.name,travelmode:mode,...(mode==='driving'?{avoid:'tolls,highways'}:{})});}
function budget(s){const b=BUDGETS[s.id];return b?`${b.low.toLocaleString('ja-JP')}～${b.high.toLocaleString('ja-JP')}円`:'未確認';}
function tags(s){return `<div class="access-tags">${['walk','cycle','rail'].map(type=>`<span class="access-tag ${type}">${icon(type)}${esc(s[type])}</span>`).join('')}</div>`;}
function toast(message){clearTimeout(toast.timer);$('#toast').textContent=message;$('#toast').classList.add('visible');toast.timer=setTimeout(()=>$('#toast').classList.remove('visible'),2500);}
function save(id,button){state.saved.has(id)?state.saved.delete(id):state.saved.add(id);storage.set('saved',[...state.saved]);updateSaves();if(state.view==='saved')renderSaved();if(button)animate(button,[{transform:'scale(1)'},{transform:'scale(.82)'},{transform:'scale(1.08)'},{transform:'scale(1)'}],{duration:430});}
function updateSaves(){
 const s=current();$('#scene-save').setAttribute('aria-pressed',String(state.saved.has(s.id)));$('#scene-save').setAttribute('aria-label',state.saved.has(s.id)?'この場所の保存を解除':'この場所を保存');
 $$('[data-save]').forEach(b=>{b.setAttribute('aria-pressed',String(state.saved.has(b.dataset.save)));b.setAttribute('aria-label',state.saved.has(b.dataset.save)?'保存を解除':'この場所を保存');});
 $('#nav-saved-count').textContent=state.saved.size;$('#nav-saved-count').hidden=!state.saved.size;$('#saved-count').textContent=state.saved.size;
}
let photoSequence=0;
function revealPanel(direction=0){
 const children=[$('.scene-heading'),$('#scene-summary'),$('#scene-tags'),$('.scene-quick-info'),$('.scene-actions'),$('.scene-stepper')];
 children.forEach((el,index)=>{el.getAnimations().forEach(a=>a.cancel());animate(el,[{opacity:0,transform:`translate3d(${direction*12}px,${13+index*2}px,0)`},{opacity:1,transform:'translate3d(0,0,0)'}],{duration:620,delay:index*40,fill:'backwards'});});
}
async function renderScene(direction=0,quiet=false){
 const spots=filtered();updateRandomButtons();$('#scenery-empty').hidden=!!spots.length;if(!spots.length)return;
 if(!spots.some(s=>s.id===state.id))state.id=spots[0].id;
 const s=current(),p=currentPhoto(s),seq=++photoSequence;
 let available=!!p,loadingTimer;
 if(p){loadingTimer=setTimeout(()=>{if(seq===photoSequence)$('#photo-load').hidden=false;},200);const img=new Image();img.src=p.path;try{await img.decode();}catch{available=false;}clearTimeout(loadingTimer);}
 if(seq!==photoSequence)return;$('#photo-load').hidden=true;storage.set('current',s.id);
 $('#scene-name').textContent=s.name;$('#scene-reading').textContent=s.reading;$('#scene-area').textContent=s.city+'・'+s.district;$('#scene-category').textContent=CATEGORIES[s.category];$('#scene-summary').textContent=s.summary;
 $('#scene-tags').innerHTML=tags(s);$('#scene-time').textContent='原駅発・往復燃料費';$('#scene-budget').textContent=budget(s);
 const index=spots.indexOf(s);$('#scene-position').textContent=String(index+1).padStart(2,'0');$('#scene-total').textContent=String(spots.length).padStart(2,'0');$('#progress-fill').style.width=(spots.length>1?index/(spots.length-1)*100:100)+'%';
 $('#scene-progress').setAttribute('aria-valuemax',String(spots.length));$('#scene-progress').setAttribute('aria-valuenow',String(index+1));$('#scene-progress').setAttribute('aria-valuetext',`${index+1} / ${spots.length} ${s.name}`);
 $('#scene-ticks').innerHTML=spots.map((_,i)=>`<i class="${i===index?'current':i<index?'passed':''}"></i>`).join('');
 $('#location-label').textContent=state.area==='all'?'岐阜県':areaNames[state.area];$('#scene-map').href=mapLink(s);
 $('#photo-unavailable').hidden=available;$('#unavailable-category').textContent=CATEGORIES[s.category];$('#unavailable-name').textContent=s.name;$('#unavailable-link').href=s.source;$('#photo-caption').textContent=available?`写真：${p.author}`:'';
 if(available)photoMotion.transition(p.path,{position:photoFocal(s,p),alt:p.caption||s.photoCaption||s.name,direction,enabled:!quiet});else photoMotion.clear();
 updateSaves();updateRandomButtons();if(!quiet)revealPanel(direction);
 for(const offset of [-1,1]){const neighbor=spots[(index+offset+spots.length)%spots.length];if(currentPhoto(neighbor)){const img=new Image();img.src=currentPhoto(neighbor).path;}}
}
const photoPosition={'nijogataki':'32% 55%','kansenji':'55% 30%','futase-tunnel':'47% center','rokusho':'50% 40%','furumiya':'52% 46%','kenmin-forest':'49% 60%','murazumi':'40% 50%','ooda':'62% 42%','kichijo':'27% 45%'};
let turning=false;
async function step(dir){if(turning)return;const list=filtered();if(list.length<2)return;turning=true;const index=list.findIndex(s=>s.id===state.id);state.id=list[(index+dir+list.length)%list.length].id;try{await renderScene(dir);}finally{setTimeout(()=>turning=false,reduced()?0:230);}}
function updateRandomButtons(){const disabled=filtered().length<2;for(const button of [$('#scene-random'),$('#list-random')])button.disabled=disabled;}
async function randomScene(){
 if(turning||openingSpot)return;const pool=filtered(),id=pickRandom(pool,state.id);if(!id||id===state.id)return;
 turning=true;const before=pool.findIndex(s=>s.id===state.id),after=pool.findIndex(s=>s.id===id);
 for(const button of [$('#scene-random'),$('#list-random')]){button.setAttribute('aria-busy','true');animate($('svg',button),[{transform:'rotate(-20deg) scale(.8)'},{transform:'rotate(360deg) scale(1)'}],{duration:620});}
 photoMotion.mode(false);state.id=id;setView('scenery',true);
 try{await renderScene(after>before?1:-1);}finally{for(const button of [$('#scene-random'),$('#list-random')])button.removeAttribute('aria-busy');setTimeout(()=>turning=false,reduced()?0:280);}
}
function card(s){const p=currentPhoto(s);return `<article class="spot-card"><button class="spot-card-main" data-spot="${s.id}" aria-label="${esc(s.name)}の風景を見る"><div class="card-image${p?'':' card-no-photo'}">${p?`<img src="${p.path}" alt="${esc(p.caption||s.photoCaption||s.name)}" style="${focalStyle(s,p)}" loading="lazy" decoding="async">`:`${icon(s.category==='forest'?'landscape':'pin')}`}<span class="card-number">${String(s.number).padStart(2,'0')}</span><span class="card-area">${esc(s.city)}・${esc(s.district)}</span></div><div class="card-info"><h2>${esc(s.name)}</h2>${tags(s)}<p>${esc(s.summary)}</p><div class="card-budget"><span>原駅発・往復燃料費</span><strong>${budget(s)}</strong></div></div></button><button class="card-save" data-save="${s.id}" aria-label="この場所を保存" aria-pressed="${state.saved.has(s.id)}">${icon('bookmark')}</button></article>`;}
let observer;
function observeCards(parent){if(reduced()||!('IntersectionObserver'in window))return;observer?.disconnect();observer=new IntersectionObserver(entries=>{let n=0;for(const entry of entries){if(entry.isIntersecting){animate(entry.target,[{opacity:0,transform:'translate3d(0,32px,0) scale(.97)'},{opacity:1,transform:'translate3d(0,0,0) scale(1)'}],{duration:700,delay:n++*55,fill:'backwards'});observer.unobserve(entry.target);}}},{threshold:.05});$$('.spot-card',parent).forEach(el=>observer.observe(el));}
function renderList(){const list=filtered();updateRandomButtons();$('#spot-list').innerHTML=list.map(card).join('');$('#list-count').textContent=list.length+'件';$('#list-empty').hidden=!!list.length;$('#filter-description').textContent=[state.category==='all'?'すべての風景':CATEGORIES[state.category],state.travel==='all'?'':travelNames[state.travel]].filter(Boolean).join(' · ');$$('.quick-areas [data-area]').forEach(b=>{b.classList.toggle('selected',b.dataset.area===state.area);b.setAttribute('aria-pressed',String(b.dataset.area===state.area));});observeCards($('#spot-list'));updateSaves();}
function renderSaved(){const list=SPOTS.filter(s=>state.saved.has(s.id));$('#saved-list').innerHTML=list.map(card).join('');$('#saved-empty').hidden=!!list.length;updateSaves();observeCards($('#saved-list'));}
function setView(view,quiet=false){
 if(view===state.view)return;photoMotion.mode(false);state.view=view;
 $$('.view').forEach(v=>{v.hidden=v.id!==view+'-view';v.classList.toggle('active',!v.hidden);});
 $$('[data-view]').forEach(b=>{b.classList.toggle('active',b.dataset.view===view);if(b.dataset.view===view)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});
 $('.tabbar').style.setProperty('--tab-index',['scenery','list','saved','settings'].indexOf(view));
 if(view==='list')renderList();if(view==='saved')renderSaved();
 if(view==='scenery')photoMotion.resume();else photoMotion.pause();
 if(!quiet)animate($('#'+view+'-view'),[{opacity:.15,transform:'translate3d(0,14px,0)'},{opacity:1,transform:'translate3d(0,0,0)'}],{duration:500});
}
function openDialog(dialog){
 if(dialog.open)return;document.body.classList.add('has-sheet');photoMotion.pause();dialog.showModal();dialog.scrollTop=0;
 const landscape=matchMedia('(orientation:landscape)').matches;
 animate(dialog,[{transform:landscape?'translate3d(100%,0,0)':'translate3d(0,75%,0)',opacity:.55},{transform:'translate3d(0,0,0)',opacity:1}],{duration:580});
 [...dialog.children].slice(1).forEach(el=>animate(el,[{opacity:0,transform:'translateY(13px)'},{opacity:1,transform:'translateY(0)'}],{duration:490,delay:130,fill:'backwards'}));
}
const closingDialogs=new WeakSet();
async function closeDialog(dialog){
 if(!dialog.open||closingDialogs.has(dialog))return;closingDialogs.add(dialog);
 const start=getComputedStyle(dialog).transform,landscape=matchMedia('(orientation:landscape)').matches;dialog.style.transform='';
 try{await animate(dialog,[{transform:start==='none'?'translate3d(0,0,0)':start,opacity:1},{transform:landscape?'translate3d(100%,0,0)':'translate3d(0,100%,0)',opacity:.6}],{duration:340,easing:'cubic-bezier(.4,0,.8,.35)'});dialog.close();}
 finally{closingDialogs.delete(dialog);if(!$('dialog[open]')){document.body.classList.remove('has-sheet');if(state.view==='scenery')photoMotion.resume();}}
}
function photoSource(p){return `写真：${esc(p.author)} · <a href="${p.source_url}" target="_blank" rel="noopener noreferrer">原画像</a> · <a href="${p.license_url}" target="_blank" rel="noopener noreferrer">${esc(p.license)}</a>`;}
function filmstrip(s){
 const keys=gallery(s);if(keys.length<2)return '';
 return `<div class="photo-filmstrip" role="group" aria-label="${esc(s.name)}の写真">${keys.map((key,i)=>{const p=PHOTOS[key];return `<button class="film-frame" data-photo="${esc(key)}" aria-label="${esc(p.caption||p.title||s.name)}" aria-pressed="${key===photoKey(s)}"><img src="${p.path}" alt="" style="${focalStyle(s,p)}" loading="lazy" decoding="async"><span>${String(i+1).padStart(2,'0')}</span></button>`;}).join('')}</div>`;
}
let galleryRevision=0;
async function selectPhoto(key){
 const s=current(),p=PHOTOS[key];if(!p||!gallery(s).includes(key)||key===photoKey(s))return;
 const ticket=++galleryRevision,image=new Image();image.src=p.path;try{await image.decode();}catch{return;}
 if(ticket!==galleryRevision||s.id!==state.id||!$('#detail-dialog').open)return;
 photoChoices[s.id]=key;storage.set('photo-choices',photoChoices);
 const hero=$('.overview-photo img'),old=hero.cloneNode();old.className='gallery-outgoing';old.alt='';old.setAttribute('aria-hidden','true');hero.before(old);
 hero.src=p.path;hero.alt=p.caption||s.photoCaption||s.name;hero.setAttribute('style',focalStyle(s,p));
 $('[data-photo-caption]').textContent=p.caption||s.photoCaption||s.name;$('[data-photo-author]').textContent='写真：'+p.author;
 $('[data-photo-source]').innerHTML=photoSource(p);
 $$('[data-photo]',$('#detail-content')).forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.photo===key)));
 animate(hero,[{opacity:.3,transform:'scale(1.045)'},{opacity:1,transform:'scale(1)'}],{duration:680});
 animate(old,[{opacity:1},{opacity:0}],{duration:540}).finally(()=>old.remove());
 await renderScene(0,true);
}
function details(){
 const s=current(),b=BUDGETS[s.id],p=currentPhoto(s);
 const title=`<div class="overview-title"><span>${String(s.number).padStart(2,'0')} / ${esc(s.city)}・${esc(s.district)}</span><h2 id="detail-title">${esc(s.name)}</h2></div>`;
 const hero=p?`<figure class="overview-hero"><button class="overview-photo" data-open-photo aria-label="${esc(s.name)}の写真を全画面で見る"><img src="${p.path}" alt="${esc(p.caption||s.photoCaption||s.name)}" style="${focalStyle(s,p)}" decoding="async">${title}<span class="overview-expand">${icon('fullscreen')}</span></button><figcaption><span data-photo-caption>${esc(p.caption||s.photoCaption||s.name)}</span><span data-photo-author>写真：${esc(p.author)}</span></figcaption></figure>`:`<div class="overview-hero overview-graphic">${icon('landscape')}${title}<a href="${s.source}" target="_blank" rel="noopener noreferrer">公式の写真 ${icon('arrow')}</a></div>`;
 $('#detail-content').innerHTML=hero+filmstrip(s)+`<div class="detail-body">${tags(s)}<p class="detail-description">${esc(s.description)}</p><section class="detail-section"><h3>住所</h3><a class="address-link" href="${mapLink(s)}" target="_blank" rel="noopener noreferrer">${esc(s.address)} ${icon('arrow')}</a></section><section class="detail-section"><h3>原駅から</h3><p class="route-summary">${esc(s.access)}</p><div class="route-links"><a href="${routeLink(s,'transit')}" target="_blank" rel="noopener noreferrer">${icon('rail')}電車・バス</a><a href="${routeLink(s,'bicycling')}" target="_blank" rel="noopener noreferrer">${icon('cycle')}自転車</a><a href="${routeLink(s,'driving')}" target="_blank" rel="noopener noreferrer">${icon('pin')}車</a></div></section><section class="detail-section"><h3>原駅発・車1台の往復燃料費</h3><p class="budget-number">${budget(s)}</p>${b?`<dl class="budget-model"><div><dt>往復距離</dt><dd>約${b.roundTripKm}km${b.endpoint?` / ${esc(b.endpoint)}`:''}</dd></div><div><dt>燃費</dt><dd>12～18km/L</dd></div><div><dt>ガソリン</dt><dd>160～190円/L</dd></div><div><dt>上限の距離補正</dt><dd>＋10％</dd></div></dl>`:''}${s.fees?`<div class="local-fees"><h4>現地費用</h4><p>${esc(s.fees)}</p></div>`:''}</section><div class="source-links"><a class="detail-source" href="${s.source}" target="_blank" rel="noopener noreferrer">出典 ${icon('arrow')}</a>${(s.extraSources||[]).map((u,i)=>`<a class="detail-source" href="${u}" target="_blank" rel="noopener noreferrer">資料 ${i+1} ${icon('arrow')}</a>`).join('')}${p?`<small class="photo-source" data-photo-source>${photoSource(p)}</small>`:''}</div></div>`;
 openDialog($('#detail-dialog'));
}

let draft;
function updateFilter(){for(const [key,id] of [['area','area-options'],['category','category-options'],['travel','travel-options']])$$('button',$('#'+id)).forEach(b=>{const yes=b.dataset[key]===draft[key];b.classList.toggle('selected',yes);b.setAttribute('aria-pressed',String(yes));});$('#filter-apply').textContent=SPOTS.filter(s=>matches(s,draft)).length+'景を表示';}
function filterOpen(){draft={...state};updateFilter();openDialog($('#filter-dialog'));}
function reset(){Object.assign(state,{area:'all',category:'all',travel:'all',query:''});$('#search').value='';renderScene();renderList();}
function credits(){
 $('#credits-content').innerHTML=SPOTS.map(s=>`<article class="source-item"><h3>${String(s.number).padStart(2,'0')}　${esc(s.name)}</h3><a href="${s.source}" target="_blank" rel="noopener noreferrer">案内情報</a>${s.reference?` · <a href="${s.reference}" target="_blank" rel="noopener noreferrer">参考にした訪問記</a>`:''}${gallery(s).map(key=>{const p=PHOTOS[key];return `<p>${esc(p.title||p.caption||s.photoCaption||s.name)}<br>${photoSource(p)}${p.credit?`<br>${esc(p.credit)}`:''}${p.date_taken?`<br>撮影日：${esc(p.date_taken)}`:''}<br>${esc(p.changes)}</p>`;}).join('')}</article>`).join('')+'<article class="source-item"><h3>フォント</h3><p>Noto Sans JP / Noto Serif JP</p><a href="./assets/NotoSansJP-OFL.txt" target="_blank" rel="noopener noreferrer">SIL Open Font License 1.1</a></article><article class="source-item"><h3>距離・燃料費</h3><p>OpenStreetMap / Valhalla。2026年10月7日の経路計算。</p><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">© OpenStreetMap contributors · ODbL</a><p>低額側：往復距離 ÷ 18 × 160。上限側：往復距離 × 1.1 ÷ 12 × 190。100円単位。</p></article>';
 openDialog($('#credits-dialog'));
}
// Fullscreen is attempted at launch and once during the first deliberate touch.
let fullscreenAttempted=false;
function requestFullscreen(){if(!mobile)return;const root=document.documentElement;const request=root.requestFullscreen||root.webkitRequestFullscreen;if(request&&!document.fullscreenElement){try{return Promise.resolve(request.call(root)).catch(()=>{});}catch{}}}
function syncFullscreen(){const standalone=matchMedia('(display-mode: fullscreen)').matches||matchMedia('(display-mode: standalone)').matches||navigator.standalone;$('#fullscreen-state').textContent=document.fullscreenElement||standalone?'全画面で表示中':'切り替える';const supported=!!(document.documentElement.requestFullscreen||document.documentElement.webkitRequestFullscreen);$('#settings-fullscreen').hidden=!supported;$('#fullscreen-button').hidden=!supported;}
document.addEventListener('pointerup',()=>{if(!fullscreenAttempted){fullscreenAttempted=true;requestFullscreen();}},{capture:true,once:true});
$('#fullscreen-button').onclick=()=>{document.fullscreenElement?document.exitFullscreen():requestFullscreen();};$('#settings-fullscreen').onclick=()=>{document.fullscreenElement?document.exitFullscreen():requestFullscreen();};
document.addEventListener('fullscreenchange',syncFullscreen);syncFullscreen();requestFullscreen();
let installPrompt;
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;$('#install-button').hidden=false;});$('#install-button').onclick=async()=>{if(installPrompt){await installPrompt.prompt();installPrompt=null;$('#install-button').hidden=true;}};
$('#scene-random').onclick=randomScene;$('#list-random').onclick=randomScene;$('#previous').onclick=()=>step(-1);$('#next').onclick=()=>step(1);$('#scene-save').onclick=e=>save(state.id,e.currentTarget);$('#detail-open').onclick=details;$('#filter-open').onclick=filterOpen;$('#list-filter').onclick=filterOpen;$('#credits-open').onclick=credits;
$$('[data-view]').forEach(b=>b.onclick=()=>setView(b.dataset.view));
$('#search').addEventListener('input',e=>{state.query=e.target.value;renderList();renderScene();});
$$('.quick-areas [data-area]').forEach(b=>b.onclick=()=>{state.area=b.dataset.area;renderList();renderScene();});
$$('.filter-options').forEach(group=>group.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;Object.assign(draft,b.dataset);updateFilter();}));
$('#filter-apply').onclick=()=>{for(const k of ['area','category','travel'])state[k]=draft[k];renderScene();if(state.view==='list')renderList();closeDialog($('#filter-dialog'));};
$$('[data-reset]').forEach(b=>b.onclick=reset);
$$('.close-dialog').forEach(b=>{b.innerHTML=icon('close');b.onclick=()=>closeDialog(b.closest('dialog'));});
$$('.sheet-header').forEach(header=>createSheetDrag({dialog:header.closest('dialog'),header,reduced,onClose:()=>closeDialog(header.closest('dialog'))}));
$$('dialog').forEach(dialog=>{dialog.addEventListener('click',e=>{const r=dialog.getBoundingClientRect();if(e.target===dialog&&(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom))closeDialog(dialog);});dialog.addEventListener('cancel',e=>{e.preventDefault();closeDialog(dialog);});});
let openingSpot=false;
for(const parent of [$('#spot-list'),$('#saved-list')])parent.addEventListener('click',async e=>{
 const saveButton=e.target.closest('[data-save]');if(saveButton){save(saveButton.dataset.save,saveButton);return;}
 const spot=e.target.closest('[data-spot]');if(!spot||openingSpot)return;openingSpot=true;
 const finishFlight=photoMotion.captureFlight($('img',spot));
 try{state.id=spot.dataset.spot;if(!filtered().some(s=>s.id===state.id)){state.area='all';state.category='all';state.travel='all';state.query='';$('#search').value='';}setView('scenery',!!finishFlight);await renderScene(0,!!finishFlight);if(finishFlight)await finishFlight();revealPanel();}finally{openingSpot=false;}
});
$('#random-start').onchange=e=>{state.randomStart=e.target.checked;storage.set('random-start',state.randomStart);};
$('#reduce-motion').onchange=e=>{state.reduced=e.target.checked;storage.set('motion',state.reduced);document.body.classList.toggle('reduce-motion',state.reduced);if(state.reduced)document.getAnimations?.().forEach(a=>a.cancel());photoMotion.resume();};
$$('[data-icon]').forEach(el=>el.innerHTML=icon(el.dataset.icon));for(const [id,name] of Object.entries({'fullscreen-button':'fullscreen','scene-save':'bookmark','previous':'previous','next':'next','list-filter':'filter','search-icon':'search','saved-empty-icon':'bookmark'}))$('#'+id).innerHTML=icon(name);

document.addEventListener('keydown',e=>{if(state.view!=='scenery'||$('dialog[open]')||e.target.matches('input')||e.target.closest('[data-scrubber]'))return;if(e.key==='ArrowRight')step(1);if(e.key==='ArrowLeft')step(-1);if(e.key==='Escape')photoMotion.mode(false);});
$('#detail-content').addEventListener('click',async e=>{const thumb=e.target.closest('[data-photo]');if(thumb){selectPhoto(thumb.dataset.photo);return;}const button=e.target.closest('[data-open-photo]');if(!button)return;const fly=photoMotion.captureFlight($('img:not(.gallery-outgoing)',button));await closeDialog($('#detail-dialog'));photoMotion.mode(true);if(fly)await fly();photoMotion.resume();});
const photoMotion=createPhotoMotion({reduced,isScenery:()=>state.view==='scenery'&&!$('dialog[open]'),onStep:step,onDetails:details,getNeighbor:direction=>{
 const list=filtered();if(list.length<2)return null;const index=list.findIndex(s=>s.id===state.id),neighbor=list[(index+direction+list.length)%list.length],p=currentPhoto(neighbor);
 return p?{src:p.path,position:photoFocal(neighbor,p)}:null;
}});
createSceneScrubber({element:$('#scene-progress'),getItems:filtered,getCurrent:()=>state.id,onStart:()=>photoMotion.pause(),onSelect:async id=>{state.id=id;await renderScene(0,true);},onFinish:()=>{revealPanel();photoMotion.resume();}});
$('#scene-map').insertAdjacentHTML('beforeend',icon('arrow'));
$('#detail-open').insertAdjacentHTML('beforeend',icon('next'));
$('#list-title').textContent=SPOTS.length+'景';
renderScene();

// Scroll-bound photo motion only runs when a visible surface moves.
let photoScrollFrame=0;
function updatePhotoScroll(){
 photoScrollFrame=0;if(reduced())return;
 const dialog=$('#detail-dialog');
 if(dialog.open){const hero=$('.overview-photo',dialog),image=$('.overview-photo img:not(.gallery-outgoing)',dialog);if(hero&&image&&dialog.scrollTop<hero.offsetHeight)image.style.transform=`translate3d(0,${Math.min(dialog.scrollTop*.16,hero.offsetHeight*.2)}px,0) scale(1.035)`;}
 if(state.view==='list'||state.view==='saved'){
  const view=$('#'+state.view+'-view'),bounds=view.getBoundingClientRect();
  $$('.card-image',view).forEach(frame=>{const r=frame.getBoundingClientRect();if(r.bottom<bounds.top||r.top>bounds.bottom)return;const shift=Math.max(-7,Math.min(7,(bounds.top+bounds.height*.5-r.top-r.height*.5)*.025));frame.style.setProperty('--card-shift',shift+'px');});
 }
}
function queuePhotoScroll(){if(!photoScrollFrame)photoScrollFrame=requestAnimationFrame(updatePhotoScroll);}
for(const element of [$('#list-view'),$('#saved-view'),$('#detail-dialog')])element.addEventListener('scroll',queuePhotoScroll,{passive:true});
window.addEventListener('resize',queuePhotoScroll,{passive:true});

const offlineAssets=['./','./index.html','./style.css','./experience.css','./gallery.css','./motion.js','./random.js','./scrub.js','./assets/contours.svg','./app.js','./data.js','./photos.js','./budgets.js','./manifest.webmanifest','./assets/icon-192.png','./assets/icon-512.png','./assets/NotoSerifJP.woff2','./assets/NotoSansJP.woff2','./assets/NotoSerifJP-OFL.txt','./assets/NotoSansJP-OFL.txt',...Object.values(PHOTOS).map(p=>p.path)];
let serviceWorkerReady;
async function updateOfflineState(){try{const c=await caches.open('gifu-offline-v2');const found=await Promise.all(offlineAssets.map(u=>c.match(new URL(u,location.href).href)));const count=found.filter(Boolean).length;$('#offline-state').textContent=count===offlineAssets.length?'保存済み':count?`${count} / ${offlineAssets.length}`:'未保存';}catch{$('#offline-state').textContent='利用できません';}}
if('serviceWorker'in navigator&&window.isSecureContext){serviceWorkerReady=navigator.serviceWorker.register('./sw.js').then(()=>navigator.serviceWorker.ready).then(()=>updateOfflineState()).catch(()=>{$('#offline-state').textContent='利用できません';});}else{$('#offline-state').textContent='利用できません';}
$('#offline-download').onclick=async()=>{const button=$('#offline-download');if(!('caches'in window)||!serviceWorkerReady){return;}button.disabled=true;let count=0;try{await serviceWorkerReady;const cache=await caches.open('gifu-offline-v2');for(const asset of offlineAssets){const url=new URL(asset,location.href).href;if(!(await cache.match(url))){const response=await fetch(url,{cache:'reload'});if(!response.ok)throw new Error('download');await cache.put(url,response);}$('#offline-state').textContent=`${++count} / ${offlineAssets.length}`;}$('#offline-state').textContent='保存済み';toast('写真と案内をオフライン保存しました。');}catch{await updateOfflineState();}finally{button.disabled=false;}};
