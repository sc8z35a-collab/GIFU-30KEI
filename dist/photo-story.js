const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
export function renderPhotoStory(spot,keys,photos,photoPath,expandIcon){
 const available=[...new Set(keys||[])].filter(key=>photos[key]);if(!available.length)return '';
 return `<div class="photo-story" aria-label="${esc(spot.name)}の風景写真">${available.map((key,index)=>{
  const p=photos[key],caption=p.caption||p.title||spot.name,w=Number(p.width)||0,h=Number(p.height)||0;
  const shape=(w&&h&&h>w?'story-portrait':'story-wide')+(w&&w<1000?' story-small':'');
  return `<figure class="story-figure ${shape}${index===0?' story-lead':''}"><div class="story-frame"><button class="story-image-button" data-open-photo data-story-photo="${esc(key)}" aria-label="${esc(caption)}を全画面で見る"><img src="${esc(photoPath(p.path))}" alt="${esc(caption)}"${w&&h?` width="${w}" height="${h}"`:''} loading="lazy" decoding="async" draggable="false"><span class="story-expand" aria-hidden="true">${expandIcon}</span></button></div><figcaption><p class="story-caption">${esc(caption)}</p><div class="story-credit"><span>写真：${esc(p.author)}</span><a href="${esc(p.source_url)}" target="_blank" rel="noopener noreferrer" aria-label="${esc(caption)}の写真出典"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 19 19 5M5 5h14v14"/></svg></a></div></figcaption></figure>`;
 }).join('')}</div>`;
}
