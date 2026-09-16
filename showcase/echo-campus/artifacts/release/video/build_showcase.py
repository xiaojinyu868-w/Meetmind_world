"""Real-product showcase: actual canvas recordings and captured UI, no mock screens.
Render: bundled Python build_showcase.py; --stills makes editorial samples.
"""
import argparse, json, math, os, re, shutil, subprocess, time
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import numpy as np
from build_preview import font, text, pill, ease, clamp, srt_time
ROOT=Path(__file__).parent
DELIVERY=ROOT.parent
INPUT=DELIVERY/'browser-qa'
VOICE=DELIVERY/'voice/Echo-Campus-narration-97s-mastered.wav'
FFMPEG=Path(os.environ.get('FFMPEG') or shutil.which('ffmpeg') or str(DELIVERY/'voice/tooling/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe'))
OUT=DELIVERY/'Echo-Campus-Showcase.mp4'
QA=ROOT/'showcase-qa'
W,H,FPS,DURATION=1920,1080,30,97
GREEN=(21,53,47); IVORY=(246,244,233); MUTED=(169,188,170); ORANGE=(224,151,91)
CAPS=json.loads((ROOT/'aligned-subtitles.json').read_text(encoding='utf-8'))
SHOTS=[
 (0,16.76,'campus-live.webm',1,'video'),
 (16.76,30.28,'nfc-entry.png',2,'still'),
 (30.28,39.90,'guest-matches.png',3,'still'),
 (39.90,44.06,'incoming-request.png',3,'still'),
 (44.06,50.28,'confirmed-host.png',3,'still'),
 (50.28,66.76,'gallery-live.webm',4,'video'),
 (66.76,74.80,'confirmed-host.png',5,'still'),
 (74.80,82.20,'gallery-confirmed-preserved.png',5,'still'),
 (82.20,97,'campus-live.webm',6,'video')]
SAMPLES=[3,11,23,35,42,47,54,63,70,77,86,92]
CACHE={}
STILL_CACHE={}
LIVE_GRADE=None
def asset(name):
 if name not in CACHE:CACHE[name]=Image.open(INPUT/name).convert('RGB')
 return CACHE[name]
def bg():
 im=Image.new('RGBA',(W,H),(*GREEN,255));d=ImageDraw.Draw(im)
 for y in range(H):
  blend=y/H;d.line((0,y,W,y),fill=(int(21+9*blend),int(53+8*blend),int(47+5*blend),255))
 return im
def place(frame,im,box,radius=16):
 x,y,w,h=map(int,box);scale=min(w/im.width,h/im.height);size=(round(im.width*scale),round(im.height*scale));im=im.resize(size,Image.Resampling.LANCZOS).convert('RGBA')
 x+=(w-size[0])//2;y+=(h-size[1])//2
 mask=Image.new('L',size,0);ImageDraw.Draw(mask).rounded_rectangle((0,0,size[0]-1,size[1]-1),radius=radius,fill=255)
 shadow=Image.new('RGBA',(W,H));sd=ImageDraw.Draw(shadow);sd.rounded_rectangle((x-2,y+9,x+size[0]+2,y+size[1]+15),radius=radius+5,fill=(0,0,0,65));shadow=shadow.filter(ImageFilter.GaussianBlur(18));frame.alpha_composite(shadow)
 frame.paste(im,(x,y),mask)
 ImageDraw.Draw(frame).rounded_rectangle((x,y,x+size[0],y+size[1]),radius=radius,outline=(225,235,222,100),width=1)
 return (x,y,size[0],size[1])
def title(frame,kicker,title,lines=(),x=88,y=164,size=56):
 d=ImageDraw.Draw(frame);text(d,(x,y),kicker,18,MUTED,True,True)
 for j,line in enumerate(title.split('\n')):text(d,(x,y+40+j*(size+14)),line,size,IVORY,True)
 start=y+42+len(title.split('\n'))*(size+14)+24
 for j,line in enumerate(lines):text(d,(x,start+j*40),line,24,IVORY)
def note(frame,label,y=850):
 d=ImageDraw.Draw(frame);text(d,(89,y),label,21,MUTED)
def chrome(frame,t,chapter,kind):
 d=ImageDraw.Draw(frame)
 d.ellipse((64,59,76,71),fill=ORANGE);text(d,(89,42),'ECHO CAMPUS',26,IVORY,True,True);text(d,(90,79),'A WORLD FOR EVERY ENCOUNTER',11,IVORY,False,True)
 label='浏览器实时 3D 录制' if kind=='video' else '真实交互界面截图'
 pill(d,(1532,47,1856,95),label,(*GREEN,228),IVORY,23)
 d.line((65,1036,1855,1036),fill=(*IVORY,70),width=1);d.line((65,1036,65+1790*t/DURATION,1036),fill=ORANGE,width=2)
 text(d,(65,1001),f'0{chapter} / 06',17,IVORY,False,True)
 text(d,(1856,1001),'合作展示  ·  真实产品画面',18,IVORY,anchor='ra')
def caption(frame,t):
 c=next((c for c in CAPS if c['start']<=t<c['end']),None)
 if not c:return
 d=ImageDraw.Draw(frame);size=33
 while d.textbbox((0,0),c['text'],font=font(size))[2]>1650:size-=1
 tw=d.textbbox((0,0),c['text'],font=font(size))[2]
 lay=Image.new('RGBA',(W,H));ld=ImageDraw.Draw(lay);ld.rounded_rectangle((960-tw/2-27,927,960+tw/2+27,985),radius=13,fill=(*GREEN,236));text(ld,(960,954),c['text'],size,IVORY,anchor='mm');frame.alpha_composite(lay)
def live_frame(raw,t,chapter):
 global LIVE_GRADE
 if LIVE_GRADE is None:
  arr=np.zeros((H,W,4),dtype=np.uint8);arr[:,:,:3]=GREEN
  yy=np.linspace(0,1,H)[:,None];xx=np.linspace(0,1,W)[None,:]
  arr[:,:,3]=(255*(.07+.52*np.maximum(0,1-xx*1.65)*(1-yy*.60)+.55*np.clip((yy-.79)/.21,0,1)+.22*np.clip((.14-yy)/.14,0,1))).clip(0,230).astype('uint8')
  LIVE_GRADE=Image.fromarray(arr)
 frame=raw.convert('RGBA');frame.alpha_composite(LIVE_GRADE)
 if chapter==1:
  title(frame,'01 / THE WORLD','让相遇，有一个世界' if t<8.3 else '每一次停留，都值得',('白庭校园 · 可进入的活动空间',),size=60)
 elif chapter==4:
  title(frame,'04 / A DIFFERENT ATMOSPHERE','水上艺廊',('换一个场景，延续同一场相遇',),size=64)
  note(frame,'程序化场景 / GLB / Marble 导出适配',858)
 else:
  title(frame,'06 / BEYOND THE EVENT','下一次相遇，\n从这里开始',('让现场的热度，延续为人与人的连接。',),size=58)
  note(frame,'capture.meetmind.online/echo-campus/',854)
 return frame
def confirmed_pair(frame,chapter):
 title(frame,('03 / CONNECTION' if chapter==3 else '05 / VERIFIED SERVICE'),'两个身份，一次共同确认',('同机独立会话 · 真实服务同步',),y=144,size=52)
 d=ImageDraw.Draw(frame)
 text(d,(166,355),'来宾 A · 已收到对方确认',21,MUTED)
 text(d,(1004,355),'来宾 B · 同一条已确认相遇',21,MUTED)
 # Exact UI crops, not redrawn widgets. Each reveals the observed confirmed state.
 host=asset('confirmed-host.png');guest=asset('confirmed-guest.png')
 place(frame,host.crop((1000,30,1420,463)),(125,401,600,469))
 place(frame,guest.crop((0,560,guest.width,guest.height)),(936,401,820,469))
 note(frame,'真实界面局部 · 已确认关系同步到活动世界',884)
def still_frame(t,idx):
 s,e,name,chapter,_=SHOTS[idx];frame=bg()
 if idx==1:
  title(frame,'02 / ARRIVAL','把自己\n带进世界',('NFC / 扫码入口','领取程序化分身','手机入场，大屏同步'),size=62)
  if (INPUT/'nfc-entry.png').exists():
   name='nfc-entry.png' if t<22.5 else 'onboarding.png'
   panel=asset(name).crop((1440,28,1900,790 if name=='onboarding.png' else 920))
   place(frame,panel,(1035,143,670,754))
  elif (INPUT/'onboarding.png').exists():
   place(frame,asset('onboarding.png'),(900,135,800,760))
  else:
   place(frame,asset('desktop-campus.png'),(615,300,1210,700))
   note(frame,'活动入口与公开资料领取 · 真实浏览器界面',864)
  note(frame,'实体 NFC 碰卡待现场验证',858)
 elif idx==2:
  title(frame,'03 / CONNECTION','认识一个人，\n从共同话题开始',('公开供给与需求','形成可核对的推荐依据'),size=59)
  place(frame,asset('guest-matches.png'),(1285,141,430,766),radius=24)
  crop=asset('guest-matches.png').crop((18,250,476,424))
  place(frame,crop,(88,512,1020,320),radius=20)
  note(frame,'实际推荐条目 · 基于供需标签匹配',858)
 elif idx==3:
  title(frame,'03 / INVITATION','发出邀请，\n等待对方确认',('关系不会被单方面建立。',),size=58)
  place(frame,asset(name),(638,166,1200,750))
 elif idx in (4,6):confirmed_pair(frame,chapter)
 else:
  title(frame,'05 / ONE SHARED WORLD','场景变了，\n相遇仍在',('切换至水上艺廊','同一身份、同一条连接'),size=58)
  place(frame,asset(name),(658,160,1168,730))
  note(frame,'真实双会话验证 · NFC 硬件与现场网络待联调',872)
 return frame
def composite(t,raw=None):
 idx=next(i for i,s in enumerate(SHOTS) if s[0]<=t<s[1]);s,e,name,ch,kind=SHOTS[idx]
 if kind=='video':frame=live_frame(raw,t,ch)
 else:
  key=(idx, t>=22.5 if idx==1 else False)
  if key not in STILL_CACHE:STILL_CACHE[key]=still_frame(t,idx)
  frame=STILL_CACHE[key].copy()
 chrome(frame,t,ch,kind);caption(frame,t)
 if t<.4:frame=Image.blend(bg(),frame,ease(t/.4))
 if t>96.35:frame=Image.blend(frame,bg(),ease((t-96.35)/.65))
 return frame.convert('RGB')
def sample_source(name,seconds):
 p=subprocess.run([str(FFMPEG),'-v','error','-ss',str(seconds),'-i',str(INPUT/name),'-frames:v','1','-vf',f'scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H}','-f','image2pipe','-vcodec','png','-'],capture_output=True)
 if p.returncode:raise RuntimeError(p.stderr.decode(errors='replace'))
 from io import BytesIO
 return Image.open(BytesIO(p.stdout)).convert('RGB')
def read_exact(stream,n):
 data=bytearray()
 while len(data)<n:
  chunk=stream.read(n-len(data))
  if not chunk:break
  data.extend(chunk)
 if len(data)!=n:raise RuntimeError(f'Canvas footage ended unexpectedly: {len(data)}/{n}')
 return bytes(data)
def render_stills():
 QA.mkdir(exist_ok=True);tiles=[]
 for t in SAMPLES:
  s=next(s for s in SHOTS if s[0]<=t<s[1]);raw=sample_source(s[2],t-s[0]) if s[4]=='video' else None
  frame=composite(t,raw);frame.save(QA/f'frame-{t:05.1f}s.jpg',quality=94)
  tile=frame.resize((640,360),Image.Resampling.LANCZOS);ImageDraw.Draw(tile).rectangle((0,0,89,29),fill=GREEN);text(ImageDraw.Draw(tile),(8,3),f'{t:.1f}s',18,IVORY,latin=True);tiles.append(tile)
 sheet=Image.new('RGB',(1920,1440),GREEN)
 for i,tile in enumerate(tiles):sheet.paste(tile,((i%3)*640,(i//3)*360))
 sheet.save(QA/'contact-sheet.jpg',quality=95)
def render():
 QA.mkdir(exist_ok=True)
 for n in ['campus-live.webm','gallery-live.webm','guest-matches.png','incoming-request.png','confirmed-host.png','confirmed-guest.png','gallery-confirmed-preserved.png']:
  if not (INPUT/n).exists():raise FileNotFoundError(INPUT/n)
 render_stills();started=time.time()
 log=(QA/'render.log').open('w',encoding='utf-8')
 encoder=subprocess.Popen([str(FFMPEG),'-y','-hide_banner','-loglevel','warning','-f','rawvideo','-pixel_format','rgb24','-video_size',f'{W}x{H}','-framerate',str(FPS),'-i','-','-i',str(VOICE),'-map','0:v','-map','1:a','-c:v','libx264','-preset','fast','-crf','18','-pix_fmt','yuv420p','-c:a','aac','-b:a','192k','-ar','48000','-movflags','+faststart','-t',str(DURATION),str(OUT)],stdin=subprocess.PIPE,stderr=log)
 decoder=None;current=None
 try:
  for f in range(FPS*DURATION):
   t=f/FPS;idx=next(i for i,s in enumerate(SHOTS) if s[0]<=t<s[1]);shot=SHOTS[idx]
   if idx!=current:
    if decoder:decoder.stdout.close();decoder.terminate();decoder.wait();decoder=None
    if shot[4]=='video':
     decoder=subprocess.Popen([str(FFMPEG),'-v','error','-i',str(INPUT/shot[2]),'-vf',f'fps={FPS},scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H}','-pix_fmt','rgb24','-f','rawvideo','-'],stdout=subprocess.PIPE,stderr=subprocess.DEVNULL)
    current=idx
   raw=Image.frombytes('RGB',(W,H),read_exact(decoder.stdout,W*H*3)) if decoder else None
   encoder.stdin.write(composite(t,raw).tobytes())
   if f%(FPS*5)==0:print(json.dumps({'rendered_s':t,'elapsed_s':round(time.time()-started,1)}),flush=True)
 finally:
  encoder.stdin.close()
  if decoder:decoder.stdout.close();decoder.terminate();decoder.wait()
 if encoder.wait()!=0:raise RuntimeError('Encode failed, inspect render.log')
 log.close()
 srt='\n\n'.join(f"{i+1}\n{srt_time(c['start'])} --> {srt_time(c['end'])}\n{c['text']}" for i,c in enumerate(CAPS))+'\n'
 (DELIVERY/'Echo-Campus-Showcase.zh-CN.srt').write_text(srt,encoding='utf-8-sig')
 report={'output':str(OUT),'duration_s':DURATION,'width':W,'height':H,'fps':FPS,'frames':FPS*DURATION,'bytes':OUT.stat().st_size,'elapsed_s':round(time.time()-started,1),'sources':[{'start_s':s,'end_s':e,'source':name,'provenance':'browser live canvas recording' if kind=='video' else 'actual captured browser UI screenshot'} for s,e,name,ch,kind in SHOTS],'audio':str(VOICE),'captions':'Existing ASR-aligned captions; unchanged narration','no_generated_or_simulated_ui':True,'ui_crops':'Confirmed states and recommendation source crops remain pixel faithful; editorial layout only'}
 report['sources']=[row for shot in report['sources'] for row in ([{**shot,'end_s':22.5},{**shot,'start_s':22.5,'source':'onboarding.png'}] if shot['start_s']==16.76 else [shot])]
 report['additional_ui_sources']=['confirmed-guest.png'];report['source_native_video_resolution']='1440x900, scaled and cropped to 1920x1080';report['actual_ui_note']='Onboarding screenshot shows existing persona editing, not a simulated first-join result.'
 (QA/'metadata.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps(report,ensure_ascii=False),flush=True)
if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('--stills',action='store_true');args=parser.parse_args()
 if args.stills:render_stills();print(str(QA/'contact-sheet.jpg'))
 else:render()
