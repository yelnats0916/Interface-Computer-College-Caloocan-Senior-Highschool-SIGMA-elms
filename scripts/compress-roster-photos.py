"""Resize the user-requested fictional portrait batch into small profile assets."""
from pathlib import Path
import json
from PIL import Image, ImageOps
root=Path(__file__).resolve().parents[1]
output=root/'image/generated-profiles'
output.mkdir(parents=True,exist_ok=True)
sizes=[]
for manifest in sorted((root/'tmp/roster-portraits').glob('*.json')):
    entry=json.loads(manifest.read_text(encoding='utf-8'))
    index=entry['index']
    if index>=45: continue
    name=f'student-{index+1:02}.webp' if index<30 else f'teacher-{index-29:02}.webp' if index<42 else f'admin-{index-41:02}.webp' if index<44 else 'master-admin-01.webp'
    destination=output/name
    with Image.open(entry['path']) as original:
        image=ImageOps.fit(original.convert('RGB'),(256,256),method=Image.Resampling.LANCZOS)
        image.save(destination,'WEBP',quality=80,method=6)
    sizes.append(destination.stat().st_size)
print(json.dumps({'photos':len(sizes),'dimensions':'256x256','format':'WebP','totalBytes':sum(sizes),'largestBytes':max(sizes,default=0)}))
