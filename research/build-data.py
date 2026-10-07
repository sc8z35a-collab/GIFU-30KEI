from pathlib import Path
import json

root=Path(__file__).resolve().parents[1]
records=[]
for filename in ['mino-candidates.json','hida-candidates.json']:
    data=json.loads((root/'research'/filename).read_text())
    records.extend(data if isinstance(data,list) else data['candidates'])
assert len(records)==40 and sum(item['selected'] for item in records)==30
order='kabusugi enbara tomida kuronota amou tanekura kaore ikegahara nenoue juro nishiure yamanomura utsue hiwada tokuyama gandate yokokura hakusui hisui menodaki oyada miboro goho yokotani tengai shiramizu tanigumi nakayama amida kurai'.split()
gallery=json.loads((root/'research/photo-gallery.json').read_text())
by_id={item['id']:item for item in records}
rail={'tomida','nakayama','kabusugi','yokokura','oyada','goho','yokotani','tanigumi'}
cycle={'tomida','tanekura','yamanomura','hiwada'}
access_edits={
    'tanekura':'原駅 → 車で飛騨市宮川町種蔵 → 種蔵駐車場 → 集落の道を徒歩。',
    'ikegahara':'原駅 → 車で国道360号・塩屋トンネル → 洞数河線 → 駐車場から湿原の木道へ。',
    'nishiure':'原駅 → 車でせせらぎ街道・西ウレ峠 → 駐車場を起点に池の周辺を徒歩。',
    'menodaki':'原駅 → 車で高山市久々野町渚 → 女男滝公園 → 滝へ徒歩。',
    'shiramizu':'原駅 → 車で白川村平瀬 → 県道451号 → 道路沿いの入口から観瀑台へ徒歩。'
}
spots=[]
for number,key in enumerate(order,1):
    item=by_id[key]
    fields=['id','name','reading','city','district','area','category','address','summary','description','source','extraSources','routeDestination']
    spot={field:item[field] for field in fields if field in item}
    tags=item.get('travel',{})
    for tag in ['walk','cycle','rail']:
        spot[tag]=item.get(tag) or (tags.get(tag) if isinstance(tags.get(tag),str) else None)
        assert spot[tag],(key,tag)
    if key in cycle:spot['cycle']='現地ライドおすすめ'
    spot['travel']=['walk']+(['cycle'] if key in cycle else [])+(['rail'] if key in rail else [])
    fees=item.get('fees','')
    if isinstance(fees,list):
        spot['fees']='。'.join(f"{fee['label']}：{fee['amount']:,}{fee['unit']}" for fee in fees)
    else:spot['fees']=fees
    access=access_edits.get(key,item['access'])
    if not access.startswith('原駅'):access='原駅 → '+access
    spot['access']=access
    human=item.get('humanSources',[])
    if item.get('reference'):spot['reference']=item['reference']
    elif human:spot['reference']=human[0]
    spot['number']=number
    spot['photo']=key
    spot['gallery']=gallery[key]
    spots.append(spot)

source='export const ORIGIN = '+json.dumps({'name':'原駅','query':'原駅 愛知県名古屋市天白区','lat':35.126118,'lon':136.996714},ensure_ascii=False)+';\n'
source+='export const CATEGORIES = '+json.dumps({'water':'滝・渓谷','forest':'森・湿原','rural':'山里・田園','lake':'湖・水辺'},ensure_ascii=False)+';\n'
source+='export const SPOTS = '+json.dumps(spots,ensure_ascii=False,indent=2)+';\n'
(root/'dist/data.js').write_text(source)
(root/'research/selection.json').write_text(json.dumps({'researchedCandidates':40,'selectedSpots':30,'checkedOn':'2026-10-07','candidates':records,'selectedOrder':order},ensure_ascii=False,indent=2)+'\n')
print('Built 30 spots from 40 individually researched candidates')
