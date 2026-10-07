from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
import urllib.request, urllib.parse, json, re, html, io, time, threading
from PIL import Image, ImageOps, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
RESEARCH = ROOT / 'research'
ASSETS = ROOT / 'dist/assets'
ASSETS.mkdir(parents=True, exist_ok=True)
CATALOG = json.loads((RESEARCH / 'photo-catalog.json').read_text())
RAW_PATH = RESEARCH / 'photo-commons-metadata.json'
RAW = json.loads(RAW_PATH.read_text()) if RAW_PATH.exists() else {}
HEADERS = {'User-Agent': 'GifuSceneryGuide/1.0 (CC licensed photo metadata research)'}

def get_json(params):
    url = 'https://commons.wikimedia.org/w/api.php?' + urllib.parse.urlencode(params)
    with urllib.request.urlopen(urllib.request.Request(url, headers=HEADERS), timeout=90) as response:
        return json.load(response)

titles = [item['commons'] for item in CATALOG if item.get('commons') and item['commons'] not in RAW]
for start in range(0, len(titles), 20):
    chunk = titles[start:start + 20]
    data = get_json({'action':'query','format':'json','prop':'imageinfo','iiprop':'url|extmetadata|size','iiurlwidth':'1280','titles':'|'.join(chunk)})
    for page in data['query']['pages'].values():
        if page.get('imageinfo'): RAW[page['title']] = page['imageinfo'][0]
        else: print('MISSING TITLE', page['title'], flush=True)
    RAW_PATH.write_text(json.dumps(RAW, ensure_ascii=False, indent=2))
    print('metadata saved', len(RAW), flush=True)
    time.sleep(1)

def plain(value):
    return html.unescape(re.sub('<[^>]+>', '', str(value))).replace('\xa0', ' ').strip()

def record(item):
    result = {k:v for k,v in item.items() if k not in {'id','url','commons','additional_changes'}}
    if item.get('commons'):
        info = RAW[item['commons']]
        ext = info.get('extmetadata', {})
        val = lambda name: plain(ext.get(name, {}).get('value', ''))
        result.update(author=val('Artist'), license=val('LicenseShortName'), license_url=val('LicenseUrl'),
                      source_url=info['descriptionurl'], date_taken=val('DateTimeOriginal'), provider='Wikimedia Commons')
        if result['date_taken'].lower().startswith('unknown'): result['date_taken'] = ''
        if not result['license_url']:
            if 'CC0' in result['license']: result['license_url']='https://creativecommons.org/publicdomain/zero/1.0/'
            elif result['license'] in {'Public domain','PD'}: result['license_url']='https://creativecommons.org/publicdomain/mark/1.0/'
        if not result['author'] or not result['license'] or not result['license_url']:
            raise ValueError('Missing licence attribution: '+item['id'])
        result['original_title'] = val('ObjectName')
    result['path'] = './assets/' + item['id'] + '.webp'
    result['changes'] = item.get('additional_changes', '') + '縮小・WebP変換。画面比率に合わせて表示範囲を調整。'
    return result

records = {item['id']:record(item) for item in CATALOG}
(RESEARCH / 'photo-records.json').write_text(json.dumps(records, ensure_ascii=False, indent=2))
(ROOT / 'dist/photos.js').write_text('export const PHOTOS = '+json.dumps(records, ensure_ascii=False, indent=2)+';\n')
print('photo records ready', len(records), flush=True)

lock = threading.Lock()
last_request = 0
def pace():
    global last_request
    with lock:
        elapsed = time.monotonic()-last_request
        if elapsed < 1.1: time.sleep(1.1-elapsed)
        last_request = time.monotonic()

def download(item):
    path = ASSETS / (item['id']+'.webp')
    if path.exists():
        with Image.open(path) as image: image.verify()
        return item['id'], 'cached', path.stat().st_size
    if item.get('commons'): url = RAW[item['commons']]['thumburl']
    else: url = item['url']
    pace()
    with urllib.request.urlopen(urllib.request.Request(url, headers=HEADERS), timeout=120) as response:
        payload = response.read()
    with Image.open(io.BytesIO(payload)) as image:
        converted = ImageOps.exif_transpose(image).convert('RGB')
        converted.thumbnail((1920,1920), Image.Resampling.LANCZOS)
        temporary = path.with_suffix('.part')
        converted.save(temporary, format='WEBP', quality=86, method=6)
        temporary.replace(path)
    return item['id'], 'saved', path.stat().st_size

failures = []
with ThreadPoolExecutor(max_workers=2) as pool:
    jobs = {pool.submit(download,item):item for item in CATALOG}
    for job in as_completed(jobs):
        item = jobs[job]
        try: print(*job.result(), flush=True)
        except Exception as error:
            failures.append({'id':item['id'], 'error':str(error)})
            print('DOWNLOAD ERROR', item['id'], str(error), flush=True)
(RESEARCH / 'photo-download-status.json').write_text(json.dumps({'failures':failures, 'count':len(CATALOG)-len(failures)}, ensure_ascii=False, indent=2))

width, tile_w, tile_h = 1200, 240, 190
sheet = Image.new('RGB', (width, ((len(CATALOG)+4)//5)*tile_h), '#f2efe8')
draw = ImageDraw.Draw(sheet)
font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 15)
for index,item in enumerate(CATALOG):
    path=ASSETS/(item['id']+'.webp')
    x,y=(index%5)*tile_w,(index//5)*tile_h
    if path.exists():
        with Image.open(path) as image:
            thumb=ImageOps.contain(image,(tile_w-8,tile_h-32))
            sheet.paste(thumb,(x+(tile_w-thumb.width)//2,y+(tile_h-32-thumb.height)//2))
    draw.text((x+7,y+tile_h-27),item['id'],font=font,fill='#122219')
sheet.save(RESEARCH/'photo-contact-sheet.jpg',quality=90)
print('complete',len(CATALOG)-len(failures),'photos',sum(path.stat().st_size for path in ASSETS.glob('*.webp')),'bytes',flush=True)
