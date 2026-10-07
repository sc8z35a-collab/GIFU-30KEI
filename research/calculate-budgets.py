from pathlib import Path
import json, urllib.request, urllib.parse, concurrent.futures, math, time

root = Path(__file__).resolve().parents[1]
records = []
for filename in ['mino-candidates.json','hida-candidates.json']:
    data = json.loads((root/'research'/filename).read_text())
    records.extend(data if isinstance(data,list) else data['candidates'])
cache = root/'research/routes'
cache.mkdir(exist_ok=True)
origin = {'lat':35.126118,'lon':136.996714}

def route(record):
    coordinate = record.get('arrivalCoordinates') or record.get('coordinates')
    if not record['selected'] or not coordinate: return None
    key = record['id']
    path = cache/(key+'.json')
    params = {'locations':[origin,{'lat':coordinate['lat'],'lon':coordinate['lon']}],
              'costing':'auto','costing_options':{'auto':{'use_highways':0,'use_tolls':0}},
              'directions_options':{'units':'kilometers'}}
    if path.exists():
        data=json.loads(path.read_text())
        if data.get('_arrival') != coordinate: data=None
    else: data=None
    if data is None:
        url='https://valhalla1.openstreetmap.de/route?json='+urllib.parse.quote(json.dumps(params))
        request=urllib.request.Request(url,headers={'User-Agent':'Gifu30Kei/1.0 (route estimate)'})
        with urllib.request.urlopen(request,timeout=45) as response: data=json.load(response)
        data['_arrival']=coordinate
        path.write_text(json.dumps(data,ensure_ascii=False))
        time.sleep(.4)
    summary=data['trip']['summary']
    km=summary['length']*2
    arrival=record.get('arrival')
    endpoint=arrival.get('name') if isinstance(arrival,dict) else arrival
    endpoint_source=record.get('routeEndpointSource') or record.get('arrivalCoordinateSource') or record.get('coordinateSource') or (arrival.get('source') if isinstance(arrival,dict) else None)
    budget={'roundTripKm':round(km),'low':math.floor(km/18*160/100)*100,
            'high':math.ceil(km*1.1/12*190/100)*100,
            'oneWayKm':summary['length'],'endpoint':endpoint or '道路側の到着地点',
            'hasToll':summary.get('has_toll',False),'hasHighway':summary.get('has_highway',False),
            'coordinate':coordinate,'endpointSource':endpoint_source,
            'origin':'原駅 愛知県名古屋市天白区','calculated':'2026-10-07'}
    print(key,round(km,1),f"{budget['low']}～{budget['high']}円",'toll',budget['hasToll'],flush=True)
    return key,budget

with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
    results=[item for item in executor.map(route,records) if item]
result=dict(results)
(root/'research/route-budgets.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
(root/'dist/budgets.js').write_text('export const BUDGETS = '+json.dumps(result,ensure_ascii=False,indent=2)+';\n')
print('Calculated',len(result),'road destinations',flush=True)
