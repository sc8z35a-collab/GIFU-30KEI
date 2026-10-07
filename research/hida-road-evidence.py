#!/usr/bin/env python3
"""Inspect OSM roads near official destination markers, without choosing trail/summit routes."""
import urllib.request, urllib.parse, json, math, pathlib, xml.etree.ElementTree as E
import concurrent.futures
RAW=pathlib.Path('/workspace/scratch/b88b9931faf7/gifu-research/hida-raw')
points={
 'amou':(36.257866,136.963699),
 'tanekura':(36.3389146,137.2079475),
 'ikegahara':(36.36601,137.236662),
 'nishiure':(36.02630852879381,137.071166619721),
 'utsue':(36.1968556,137.1571278),
 'hiwada':(36.001443,137.532847),
 'gandate':(35.9140617210743,137.330367565155),
 'hakusui':(36.143489,136.821027),
 'menodaki':(35.992122,137.275463),
 'miboro':(36.09036,136.939127),
 'yokotani':(35.668907,137.110834),
 'tengai':(36.3677368,137.3775782),
 'shiramizu':(36.1438444,136.8273099),
 'nakayama':(35.6908162332405,137.173318862915),
 'kurai':(36.062297,137.226419),
}
def dist(a,b):return math.hypot((a[0]-b[0])*111320,(a[1]-b[1])*111320*math.cos(math.radians(a[0])))
def work(item):
 ident,(lat,lon)=item
 f=RAW/(ident+'.osm')
 if not f.exists():
  u='https://api.openstreetmap.org/api/0.6/map?'+urllib.parse.urlencode({'bbox':f'{lon-.005},{lat-.005},{lon+.005},{lat+.005}'})
  try:f.write_bytes(urllib.request.urlopen(u,timeout=35).read())
  except Exception as e:return ident,{'error':str(e)}
 root=E.fromstring(f.read_bytes());nodes={n.attrib['id']:(float(n.attrib['lat']),float(n.attrib['lon'])) for n in root.findall('node')}
 objects=[]
 for el in root:
  t={x.attrib['k']:x.attrib['v'] for x in el.findall('tag')}
  if el.tag=='node':pt=nodes[el.attrib['id']]
  elif el.tag=='way':
   pp=[nodes[x.attrib['ref']] for x in el.findall('nd') if x.attrib['ref'] in nodes]
   if not pp:continue
   pt=min(pp,key=lambda p:dist((lat,lon),p))
  else:continue
  if t.get('highway') in ('primary','secondary','tertiary','unclassified','residential','service') or t.get('amenity')=='parking' or t.get('tourism') in ('viewpoint','information') or t.get('highway')=='trailhead' or 'name' in t:
   objects.append({'id':el.attrib['id'],'type':el.tag,'lat':pt[0],'lon':pt[1],'distance':round(dist((lat,lon),pt)),'tags':t})
 objects=sorted(objects,key=lambda o:o['distance'])
 return ident,{'marker':[lat,lon],'objects':objects[:35]}
if __name__=='__main__':
 out={}
 with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
  for ident,r in pool.map(work,points.items()):
   out[ident]=r;(RAW/'roads.json').write_text(json.dumps(out,ensure_ascii=False,indent=2))
   print(ident,json.dumps(r,ensure_ascii=False),flush=True)
