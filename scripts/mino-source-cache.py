import json,re,urllib.request,concurrent.futures,pathlib
from html import unescape
doc=json.loads(pathlib.Path("research/mino-candidates.json").read_text())
raw=pathlib.Path("/workspace/scratch/b88b9931faf7/gifu-research/mino-raw");raw.mkdir(parents=True,exist_ok=True)
def fetch(c):
 try:
  path=raw/(c["id"]+".html")
  if path.exists(): html=path.read_text()
  else:
   req=urllib.request.Request(c["source"],headers={"User-Agent":"Mozilla/5.0 (source verification)"})
   html=urllib.request.urlopen(req,timeout=35).read().decode("utf-8","replace")
   path.write_text(html)
  iframes=re.findall(r'<iframe[^>]*?src=["\']([^"\']+)',html,re.I)
  pairs=[]
  for url in iframes:
   url=unescape(url)
   m=re.search(r'[?&]q=(35\.\d+)(?:,|%2[Cc])(13[67]\.\d+)',url)
   if m:pairs.append({"lat":float(m[1]),"lon":float(m[2]),"type":"official-embed-marker"})
   m=re.search(r'!2d(13[67]\.\d+)!3d(35\.\d+)',url)
   if m:pairs.append({"lat":float(m[2]),"lon":float(m[1]),"type":"official-embed-center"})
  pairs += [{"lat":float(a),"lon":float(b),"type":"inline"} for a,b in re.findall(r'lat:\s*(35\.\d+),lng:\s*(13[67]\.\d+)',html)]
  return {"id":c["id"],"coordinates":pairs}
 except Exception as e:return {"id":c["id"],"error":str(e)}
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as p:
 results=list(p.map(fetch,doc["candidates"]))
print(json.dumps(results,ensure_ascii=False,indent=2))
(raw/"official-map-coordinates.json").write_text(json.dumps(results,ensure_ascii=False,indent=2)+"\n")
