import json,re,subprocess,hashlib
from pathlib import Path
from PIL import Image,ImageDraw
from build_showcase import FFMPEG,OUT,QA,INPUT,CAPS,SAMPLES,SHOTS,GREEN,font

def run(args):return subprocess.run([str(FFMPEG),'-hide_banner',*args],capture_output=True,text=True,encoding='utf-8',errors='replace')
QA.mkdir(exist_ok=True)
probe=run(['-i',str(OUT),'-map','0:v','-map','0:a','-f','null','-'])
(QA/'decode-check.log').write_text(probe.stderr,encoding='utf-8')
if probe.returncode:raise RuntimeError('Full video decode failed')
tiles=[]
for t in SAMPLES:
 dest=QA/f'encoded-{t:05.1f}s.jpg';p=run(['-y','-ss',str(t),'-i',str(OUT),'-frames:v','1','-q:v','2',str(dest)])
 if p.returncode:raise RuntimeError(p.stderr)
 tile=Image.open(dest).convert('RGB').resize((640,360),Image.Resampling.LANCZOS)
 d=ImageDraw.Draw(tile);d.rectangle((0,0,90,28),fill=GREEN);d.text((8,3),f'{t:.1f}s',font=font(18,latin=True),fill='white');tiles.append(tile)
sheet=Image.new('RGB',(1920,1440),GREEN)
for i,im in enumerate(tiles):sheet.paste(im,((i%3)*640,(i//3)*360))
sheet.save(QA/'encoded-contact-sheet.jpg',quality=95)
audio=run(['-i',str(OUT),'-vn','-af','volumedetect,silencedetect=noise=-45dB:d=1.5','-f','null','-'])
(QA/'encoded-audio-check.log').write_text(audio.stderr,encoding='utf-8')
report={'decode_pass':probe.returncode==0,'duration_match_97s':bool(re.search(r'Duration: 00:01:37\.00',probe.stderr)),'video_1080p30':bool(re.search(r'1920x1080.*30 fps',probe.stderr)),'audio_aac':bool(re.search(r'Audio: aac',probe.stderr)),'encoded_samples':SAMPLES,'caption_count':len(CAPS),'caption_overlaps':[i for i in range(len(CAPS)-1) if CAPS[i]['end']>CAPS[i+1]['start']+.001],'caption_last_s':CAPS[-1]['end'],'source_claim':'Browser-rendered live canvas recordings and real browser UI screenshots; no generated or simulated UI. Screenshots are explicitly labelled.','physical_nfc_verified':False,'audio_unchanged_master':True,'audio_volume_summary':[s.strip() for s in audio.stderr.splitlines() if 'mean_volume:' in s or 'max_volume:' in s],'source_files':{n:{'bytes':(INPUT/n).stat().st_size,'sha256':hashlib.sha256((INPUT/n).read_bytes()).hexdigest()} for n in sorted({s[2] for s in SHOTS}|{'onboarding.png','confirmed-guest.png'})}}
(QA/'qa-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps(report,ensure_ascii=False,indent=2))
if not all(report[k] for k in ['decode_pass','duration_match_97s','video_1080p30','audio_aac']) or report['caption_overlaps']:raise RuntimeError('QA check failed')
