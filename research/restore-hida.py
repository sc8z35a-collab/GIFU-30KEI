#!/usr/bin/env python3
"""Restore primary-source records. Raw pages remain temporary, outside the repo."""
import json, pathlib, urllib.request, re, html, concurrent.futures, datetime

ROOT = pathlib.Path(__file__).parent
RAW = pathlib.Path('/workspace/scratch/b88b9931faf7/gifu-research/hida-raw')
RAW.mkdir(parents=True, exist_ok=True)

rows = [
 ('amou','天生湿原','あもうしつげん','飛騨市','河合町天生','forest','https://www.hida-kankou.jp/spot/276','岐阜県飛騨市河合町天生','木道の湿原と、奥に続くブナ林。','天生峠の登山口から山道を登ると湿原の木道に出る。湿原の周囲と奥のブナ林を歩くコースがある。','国道360号の天生峠登山口へ車でアクセス。登山口から湿原は徒歩。',{'walk':'登山','cycle':'自転車＋徒歩','rail':'車アクセス中心'},True),
 ('tanekura','種蔵の棚田と板倉','たねくらのたなだといたくら','飛騨市','宮川町種蔵','rural','https://www.hida-kankou.jp/spot/277','岐阜県飛騨市宮川町種蔵','石積みの棚田と、畑の中に残る板倉。','山の斜面に棚田が続き、田畑の間に木造の板倉が点在する。集落の道から、石積みと家々をまとめて眺められる。','集落入口の駐車場を起点に徒歩。JR坂上駅からは車で約15分。',{'walk':'徒歩旅おすすめ','cycle':'サイクリングライドおすすめ','rail':'車アクセス中心'},True),
 ('ikegahara','池ケ原湿原','いけがはらしつげん','飛騨市','宮川町洞','forest','https://www.hida-kankou.jp/spot/287','岐阜県飛騨市宮川町洞','森の中の湿原を、木道で一周。','山林に囲まれた湿原に木道が通っている。春にはミズバショウとリュウキンカが咲き、夏には草の緑が広がる。','国道360号の塩屋トンネルから洞数河線を約11km。湿原の駐車場から木道へ。',{'walk':'徒歩旅おすすめ','cycle':'自転車＋徒歩','rail':'車アクセス中心'},True),
 ('nishiure','西ウレ峠','にしうれとうげ','高山市','清見町楢谷','forest','https://www.hidatakayama.or.jp/spot/detail_1518.html','岐阜県高山市清見町楢谷','せせらぎ街道の峠と、池を囲む広葉樹林。','標高1,113mの西ウレ峠は、せせらぎ街道の最高地点。道路沿いにブナやミズナラの森があり、池の周りの道を歩ける。','せせらぎ街道の西ウレ峠駐車場へ車。池周辺は徒歩。',{'walk':'徒歩旅おすすめ','cycle':'自転車＋徒歩','rail':'車アクセス中心'},True),
 ('yamanomura','山之村','やまのむら','飛騨市','神岡町森茂','rural','https://www.hida-kankou.jp/features/162','岐阜県飛騨市神岡町森茂','標高約1,000mにある集落の田畑と道。','山之村は七つの集落の総称。山に囲まれた田畑と家々が広がり、森茂地区の道路からも山里の風景を見られる。','国道471号から山吹峠を越え、森茂地区へ車。集落の道を歩く。',{'walk':'徒歩旅おすすめ','cycle':'サイクリングライドおすすめ','rail':'車アクセス中心'},True),
 ('utsue','宇津江四十八滝','うつえしじゅうはったき','高山市','国府町宇津江','water','https://www.hidatakayama.or.jp/spot/detail_1602.html','岐阜県高山市国府町宇津江3235-86','森の斜面を登りながら、十三の滝をたどる。','四十八滝川の谷に十三の滝が続く。登り口から遊歩道を進むと、水の流れと滝を木々の間から見られる。','宇津江四十八滝の駐車場へ車。滝の登り口から遊歩道を徒歩。',{'walk':'徒歩旅おすすめ','cycle':'自転車＋徒歩','rail':'車アクセス中心'},True),
 ('hiwada','日和田高原','ひわだこうげん','高山市','高根町日和田','rural','https://www.hidatakayama.or.jp/special/detail_81.html','岐阜県高山市高根町日和田','御嶽山北側の高原に続く田畑と白樺。','御嶽山北側に広がる高原。田畑や白樺の林が続き、日和田地区の道から山並みを眺められる。','国道361号から県道435号で日和田地区へ。地区内の道路を起点に散策。',{'walk':'徒歩旅おすすめ','cycle':'サイクリングライドおすすめ','rail':'車アクセス中心'},True),
 ('gandate','巌立峡・三ツ滝','がんだてきょう・みつだき','下呂市','小坂町落合','water','https://www.gero-spa.com/spot/detail_26.html','岐阜県下呂市小坂町落合','溶岩の岩壁と、谷の奥にある三ツ滝。','御嶽山の噴火でできた溶岩の岩壁が川沿いに立つ。がんだて公園から三ツ滝の滝見橋まで歩ける。','がんだて公園の駐車場へ車。三ツ滝の滝見橋へ徒歩約5分。',{'walk':'徒歩旅おすすめ','cycle':'自転車＋徒歩','rail':'車アクセス中心'},True),
 ('hakusui','白水湖','はくすいこ','白川村','平瀬・大白川','lake','https://www.kankou-gifu.jp/spot/detail_3217.html','岐阜県大野郡白川村平瀬字大白川国有林','白山の山麓にある青緑色の湖。','大白川園地に隣接する人工湖。湖の周囲をブナやミズナラの森が囲み、園地側から水面と山の斜面を眺められる。','国道156号から県道451号を約13km。大白川園地の駐車場を起点に徒歩。',{'walk':'徒歩旅おすすめ','cycle':'自転車＋徒歩','rail':'車アクセス中心'},True),
 ('menodaki','女男滝','めおとだき','高山市','久々野町渚','water','https://www.hidatakayama.or.jp/spot/detail_1552.html','岐阜県高山市久々野町渚1065番地','木々の間を上下二段に流れる滝。','牛牧谷にかかる二段の滝。上の女滝と下の男滝を、周囲の木々と一緒に眺められる。','JR久々野駅から車で約20分。女男滝公園を起点に徒歩。',{'walk':'徒歩旅おすすめ','cycle':'自転車＋徒歩','rail':'車アクセス中心'},True),
 ('miboro','御母衣湖','みぼろこ','高山市','荘川町中野','lake','https://www.hidatakayama.or.jp/spot/detail_1412.html','岐阜県高山市荘川町中野770番地1（荘川桜公園）','国道156号沿いに広がる湖と山の斜面。','庄川をせき止めてできた湖。高山市側の荘川桜公園から湖を眺め、国道156号沿いの山林と水面の風景をたどれる。','国道156号の荘川桜公園駐車場へ車。公園内から湖を眺める。',{'walk':'徒歩旅おすすめ','cycle':'自転車＋徒歩','rail':'車アクセス中心'},True),
 ('yokotani','横谷峡四つの滝','よこたにきょうよっつのたき','下呂市','金山町金山横谷本洞','water','https://www.city.gero.lg.jp/site/kanko/1461.html','岐阜県下呂市金山町金山横谷本洞','山道でつながる、白滝から鶏鳴滝までの四つの滝。','横谷川の谷に白滝、二見滝、紅葉滝、鶏鳴滝が続く。川沿いの山道を歩きながら、滝と周囲の森を見られる。','JR飛騨金山駅からげろバス金山祖師野線で滝口下車、徒歩約5分。車は国道256号から横谷峡駐車場へ。',{'walk':'徒歩旅おすすめ','cycle':'自転車＋徒歩','rail':'鉄道＋バス'},True),
 ('tengai','天蓋山','てんがいさん','飛騨市','神岡町森茂','forest','https://www.hida-kankou.jp/spot/343','岐阜県飛騨市神岡町森茂1940（登山口）','広葉樹の森を登り、山頂から北アルプスを望む。','登山口から森の山道を登る。雀平の先にはブナの大木があり、山頂では北アルプスや白山などの山並みを見渡せる。','天蓋山登山者用駐車場へ車。森茂1940の登山口から山頂までは登り約2時間。',{'walk':'登山','cycle':'自転車＋徒歩','rail':'車アクセス中心'},True),
 ('shiramizu','白水滝','しらみずのたき','白川村','平瀬ワリ谷','water','https://www.pref.gifu.lg.jp/page/7539.html','岐阜県大野郡白川村平瀬ワリ谷','原生林の断崖から落ちる、落差67.4mの滝。','ブナやミズナラなどの森を背に流れ落ちる滝。滝から約250m離れた観瀑台から、岩壁と水の流れを見渡せる。','県道451号の白水滝駐車場へ車。観瀑台へ徒歩。',{'walk':'徒歩旅おすすめ','cycle':'自転車＋徒歩','rail':'車アクセス中心'},True),
 ('nakayama','中山七里','なかやましちり','下呂市','三原～金山町中切','water','https://www.kankou-gifu.jp/spot/detail_1049.html','岐阜県下呂市三原～金山町中切の区間','飛騨川沿いの岩と、谷を囲む山林。','三原から金山町中切まで続く飛騨川の峡谷。国道41号や焼石駅周辺から、岩の多い川の流れと山の斜面を眺められる。','原駅から名古屋駅を経てJR高山本線の焼石駅へ。駅から徒歩約10分。',{'walk':'徒歩旅おすすめ','cycle':'自転車＋徒歩','rail':'電車旅おすすめ'},True),
 ('kurai','位山','くらいやま','高山市','一之宮町苅安','forest','https://www.hidatakayama.or.jp/hidaichinomiya/spot/detail_1357.html','岐阜県高山市一之宮町苅安（スキー場側登山口）','ヒノキやサワラの森と、登山道沿いの巨石。','標高1,529mの山。スキー場側から登る道には針葉樹の森と巨石があり、山頂付近にはサラサドウダンの群生がある。','位山交流広場の駐車場へ車。スキー場側の登山口から徒歩。',{'walk':'登山','cycle':'自転車＋徒歩','rail':'車アクセス中心'},True),
 ('uogaeri','魚帰りの滝','うおがえりのたき','高山市','荘川町三尾河','water','https://www.hidatakayama.or.jp/spot/detail_1413.html','岐阜県高山市荘川町三尾河','庄川に広がる幅約14mの滝。','庄川と三谷川が合流する手前にある落差約6mの滝。国道158号の近くにある。','国道158号の三尾河地区へ車。',{},False),
 ('akagane','あかがねとよ','あかがねとよ','下呂市','小坂町落合','water','https://www.gero-spa.com/spot/detail_64.html','岐阜県下呂市小坂町落合','溶岩の地形にかかる落差14mの滝。','椹谷の支流にある滝。溶岩の岩肌が銅色に見えることから名付けられた。','がんだて公園方面の滝めぐり区間。',{},False),
 ('kaoredake','川上岳','かおれだけ','下呂市','萩原町山之口','forest','https://www.gero-spa.com/spot/detail_59.html','岐阜県下呂市萩原町山之口地内','山頂付近のドウダンツツジと山並み。','位山舟山県立自然公園に属する山。森の山腹を登ると尾根に出る。','萩原町山之口方面の登山口。',{},False),
 ('fukado','深洞湿原','ふかどしつげん','飛騨市','神岡町森茂','forest','https://www.hida-kankou.jp/spot/352','岐阜県飛騨市神岡町森茂','亜高山の針葉樹林と湿原。','トウヒやクロベ、ブナなどの原生林が残る湿原。','許可制の案内区域。',{},False),
]

extras = {
 'amou':['https://www.city.hida.gifu.jp/soshiki/45/87565.html','https://hidamoriaruki.com/map/amou/','https://www.hida-kankou.jp/features/116'],
 'tanekura':['https://www.city.hida.gifu.jp/soshiki/46/tanekura-cal.html'],
 'ikegahara':['https://hidamoriaruki.com/map/ikegahara/','https://www.hida-kankou.jp/features/115'],
 'utsue':['https://www.48taki.com/information.html','https://www.pref.gifu.lg.jp/page/7372.html'],
 'hiwada':['https://www.hidatakayama.or.jp/event/detail_2453.html','https://www.hidatakayama.or.jp/hidatakane/spot/detail_1455.html'],
 'gandate':['https://www.osaka-taki.com/','https://hidaosaka-kanko.com/news/2026092052/takimibashi-20260919/'],
 'hakusui':['https://www.vill.shirakawa.lg.jp/2918.htm'],
 'menodaki':['https://www.city.takayama.lg.jp/shisetsu/1004139/1000036/1001623.html'],
 'miboro':['https://www.city.takayama.lg.jp/shisetsu/1004139/1000036/1001612.html','https://www.hidatakayama.or.jp/hidashokawa/spot/detail_1411.html'],
 'yokotani':['https://www.pref.gifu.lg.jp/page/7374.html'],
 'tengai':['https://www.hida-kankou.jp/features/162'],
 'shiramizu':['https://www.shirakawa-go.org/1117.htm','https://www.vill.shirakawa.lg.jp/2918.htm'],
 'nakayama':['https://www.gero-spa.com/spot/detail_20.html'],
 'kurai':['https://www.city.takayama.lg.jp/shisetsu/1004139/1000043/1018654.html'],
 'akagane':['https://hidaosaka-kanko.com/news/2026092052/takimibashi-20260919/'],
}
knownfees={
 'amou':[{'label':'森林環境整備推進協力金','amount':500,'unit':'円／人','source':'https://hidamoriaruki.com/map/amou/'}],
 'utsue':[{'label':'協力金・大人','amount':200,'unit':'円／人','source':'https://www.hidatakayama.or.jp/spot/detail_1602.html'},{'label':'協力金・子供','amount':100,'unit':'円／人','source':'https://www.hidatakayama.or.jp/spot/detail_1602.html'}],
 'gandate':[{'label':'環境維持協力金','amount':500,'unit':'円／人','source':'https://www.osaka-taki.com/'}],
 'menodaki':[{'label':'見学','amount':0,'unit':'円','source':'https://www.hidatakayama.or.jp/spot/detail_1552.html'}],
 'miboro':[{'label':'荘川桜公園入園','amount':0,'unit':'円','source':'https://www.city.takayama.lg.jp/shisetsu/1004139/1000036/1001612.html'}],
 'tengai':[{'label':'登山者用駐車場','amount':0,'unit':'円','source':'https://www.hida-kankou.jp/spot/343'}],
}
excluded={
 'uogaeri':'水辺の地点は選定済みで、森・高原・田園の構成に分散するため不採用。',
 'akagane':'2026年9月19日の観光協会案内で滝見橋より先は通行止め。直接案内できないため不採用。',
 'kaoredake':'登山地点が重なるため、現在の公式案内でスキー場側登山口を明示できる位山を優先。',
 'fukado':'一般開放されておらず、入山許可を要するため不採用。',
}
records=[]
for r in rows:
 ident,name,reading,city,district,category,source,address,summary,description,access,travel,selected=r
 records.append({'id':ident,'name':name,'reading':reading,'city':city,'district':district,'area':'hida','category':category,'source':source,'extraSources':extras.get(ident,[]),'address':address,'summary':summary,'description':description,'access':access,'travel':travel,'selected':selected,'fees':knownfees.get(ident,[]),'origin':'原駅（愛知県名古屋市天白区）','researchedAt':'2026-10-07','selectionReason': '森、水辺、田園の実景と、公開された到着地点の案内を掲載できるため。' if selected else excluded[ident]})

target=ROOT/'hida-candidates.json'
# Preserve the reviewed addresses and road-arrival corrections in subsequent runs.
if target.exists():
 records=json.loads(target.read_text())
else:
 target.write_text(json.dumps(records,ensure_ascii=False,indent=2)+'\n')

def fetch(rec):
 ident,u=rec['id'],rec['source']
 path=RAW/(ident+'.html')
 if not path.exists():
  try:
   data=urllib.request.urlopen(urllib.request.Request(u,headers={'User-Agent':'SceneryResearch/1.0 contact TAKU'}),timeout=30).read()
   path.write_bytes(data)
  except Exception as e: return ident, {'error':str(e)}
 s=path.read_text(errors='replace')
 results=[]
 for match in re.finditer(r'(?:lat:|latitude["\']?\s*:\s*|ll=|q=|!3d)(36\.\d+|35\.\d+)(?:\s*,\s*(?:lng:)?|%2C|&amp;spn=|!4d)(13[67]\.\d+)',s):
  results.append([float(match.group(1)),float(match.group(2))])
 mapurls=[]
 for url in re.findall(r'(?:href|src)=["\']([^"\']+)["\']',s):
  if 'maps' in url or 'goo.gl' in url: mapurls.append(re.sub(r'key=[^&]+','key=REMOVED',html.unescape(url)))
 return ident,{'mapCoordinates':results,'mapLinks':mapurls}

if __name__=='__main__':
 with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
  for ident, result in pool.map(fetch,records):
   next(r for r in records if r['id']==ident)['sourceMapEvidence']=result
   target.write_text(json.dumps(records,ensure_ascii=False,indent=2)+'\n')
   print(ident,json.dumps(result,ensure_ascii=False))
