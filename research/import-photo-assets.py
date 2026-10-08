import hashlib
import io
import json
import pathlib
import time
import urllib.error
import urllib.request
from PIL import Image, ImageOps, features

root = pathlib.Path(__file__).resolve().parents[1]
manifest = json.loads((root / 'research/photo-import.json').read_text())
assert features.version('webp') == '1.6.0', features.version('webp')

def git_blob(raw):
    return hashlib.sha1(b'blob ' + str(len(raw)).encode() + b'\0' + raw).hexdigest()

for entry in manifest['photos']:
    target = root / entry['path']
    if target.exists() and git_blob(target.read_bytes()) == entry['blob_sha']:
        print('Present:', entry['path'], flush=True)
        continue
    assert entry['url'].startswith('https://')
    request = urllib.request.Request(entry['url'], headers={
        'User-Agent': 'SceneryGuidePhotoImport/1.0 (' + manifest['repository_url'] + ')'
    })
    for attempt in range(3):
        try:
            with urllib.request.urlopen(request, timeout=90) as response:
                raw = response.read()
            break
        except urllib.error.HTTPError as error:
            if error.code != 429 or attempt == 2:
                raise
            pause = max(600, int(error.headers.get('Retry-After', '600')))
            time.sleep(pause)
    assert hashlib.sha256(raw).hexdigest() == entry['source_sha256'], entry['path'] + ' source checksum'
    with Image.open(io.BytesIO(raw)) as image:
        image.load()
        image = ImageOps.exif_transpose(image).convert('RGB')
        image.thumbnail((1800, 1800), Image.Resampling.LANCZOS)
        buffer = io.BytesIO()
        image.save(buffer, 'WEBP', quality=manifest['quality'], method=6)
    encoded = buffer.getvalue()
    assert git_blob(encoded) == entry['blob_sha'], entry['path'] + ' output checksum'
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(encoded)
    print('Imported:', entry['path'], flush=True)
    time.sleep(8)
