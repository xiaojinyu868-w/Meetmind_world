"""Render an explicitly labelled concept preview, never a fake screen capture.

Run: bundled-python build_preview.py [--stills] [--fps 30]
Sources can be replaced in assets.json without editing the film renderer.
"""
import argparse
import os
import json
import math
import re
import shutil
import subprocess
import time
import wave
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageEnhance, ImageFilter

ROOT = Path(__file__).parent
VOICE = ROOT.parent / 'voice'
SCENE = Path.home() / 'AppData/Local/Temp/echo-campus-scene-authoring'
FFMPEG = Path(os.environ.get('FFMPEG') or shutil.which('ffmpeg') or str(VOICE / 'tooling/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe'))
W, H, DURATION = 1920, 1080, 97.0
IVORY = (246, 244, 233)
GREEN = (21, 53, 47)
MUTED = (167, 185, 166)
ORANGE = (224, 151, 91)
CN = r'C:\Windows\Fonts\msyh.ttc'
CN_BOLD = r'C:\Windows\Fonts\msyhbd.ttc'
EN = r'C:\Windows\Fonts\segoeui.ttf'
EN_BOLD = r'C:\Windows\Fonts\segoeuib.ttf'
FONTS = {}
PORTRAITS = {}

def font(size, bold=False, latin=False):
    key=(size,bold,latin)
    if key not in FONTS:
        FONTS[key]=ImageFont.truetype((EN_BOLD if bold else EN) if latin else (CN_BOLD if bold else CN),size)
    return FONTS[key]

def text(draw, xy, string, size=30, fill=IVORY, bold=False, latin=False, anchor=None):
    draw.text(xy,string,font=font(size,bold,latin),fill=fill,anchor=anchor)

def clamp(x,a=0,b=1):return min(b,max(a,x))
def ease(x):
    x=clamp(x)
    return x*x*(3-2*x)

def pill(draw, box, label, fill=IVORY, ink=GREEN, size=22, border=None):
    draw.rounded_rectangle(box, radius=(box[3]-box[1])/2, fill=fill, outline=border, width=1)
    text(draw,((box[0]+box[2])/2,(box[1]+box[3])/2-1),label,size,ink,anchor='mm')

def overlay_alpha(base, layer, opacity=1):
    if opacity<1:
        layer.putalpha(layer.getchannel('A').point(lambda x:int(x*clamp(opacity))))
    base.alpha_composite(layer)

def cover(image):
    ratio=max(W/image.width,H/image.height)
    im=image.resize((round(image.width*ratio),round(image.height*ratio)),Image.Resampling.LANCZOS)
    return im.crop(((im.width-W)//2,(im.height-H)//2,(im.width+W)//2,(im.height+H)//2))

def init_assets():
    manifest=ROOT/'assets.json'
    defaults={
        'hero':str(SCENE/'campus-hero-textured-reference.png'),
        'garden':str(SCENE/'campus-garden-textured-reference.png'),
        'gallery':str(SCENE/'gallery-hero-textured-reference.png'),
        'lobby':str(SCENE/'campus-lobby-textured-reference.png'),
        'fallback_lobby':str(SCENE/'campus-lobby-final-reference.png'),
        'provenance':'Offline 3D architectural visual reference. Not browser gameplay recording.',
    }
    if not manifest.exists():manifest.write_text(json.dumps(defaults,ensure_ascii=False,indent=2),encoding='utf-8')
    cfg=json.loads(manifest.read_text(encoding='utf-8'))
    (ROOT/'assets').mkdir(exist_ok=True)
    images={}
    for who in ['linyu','zhouche']:
        p=SCENE/f'{who}-portrait.png'
        if p.exists():
            shutil.copy2(p,ROOT/'assets'/p.name)
            PORTRAITS[who]=Image.open(p).convert('RGBA')
    for name in ['hero','garden','gallery','lobby']:
        p=Path(cfg[name])
        if not p.exists() and name=='lobby':p=Path(cfg['fallback_lobby'])
        target=ROOT/'assets'/f'{name}.png'
        shutil.copy2(p,target)
        im=cover(Image.open(target).convert('RGB'))
        im=ImageEnhance.Contrast(im).enhance(1.04)
        im=ImageEnhance.Color(im).enhance(1.04)
        images[name]=im
    return images

def split_phrases(string):
    units=re.findall(r'[^，。！？；：]+[，。！？；：]?',string)
    out=[]
    acc=''
    for unit in units:
        if len(acc)+len(unit)>24 and acc:
            out.append(acc.rstrip('，。；：'));acc=''
        acc+=unit
        if len(acc)>=12 or unit[-1:] in '。！？':
            out.append(acc.rstrip('，。；：'));acc=''
    if acc:out.append(acc.rstrip('，。；：'))
    return out

def generate_subtitles():
    """Use actual segment audio envelopes; ASR word timestamps override if supplied."""
    aligned=ROOT/'aligned-subtitles.json'
    if aligned.exists():return json.loads(aligned.read_text(encoding='utf-8'))
    timeline=json.loads((VOICE/'narration-timeline.json').read_text(encoding='utf-8'))
    captions=[]
    for segment in timeline:
        with wave.open(segment['source_audio'],'rb') as reader:
            sr=reader.getframerate()
            samples=np.frombuffer(reader.readframes(reader.getnframes()),dtype='<i2').astype(float)/32768
        hop=round(sr*.01)
        padded=np.pad(samples,(0,(-len(samples))%hop))
        energy=np.sqrt(np.mean(padded.reshape(-1,hop)**2,axis=1))
        active=energy>0.004
        # Voiced-time quantiles make long pauses cost little subtitle duration.
        weights=np.where(active,1.0,.15)
        cumulative=np.cumsum(weights)
        chunks=split_phrases(segment['text'])
        count=[len(re.sub(r'[^\u4e00-\u9fffA-Za-z0-9]','',c)) for c in chunks]
        cuts=[0]
        for amount in np.cumsum(count)[:-1]:
            expected=int(np.searchsorted(cumulative,cumulative[-1]*amount/sum(count)))
            lo=max(cuts[-1]+30,expected-35);hi=min(len(energy)-1,expected+35)
            candidates=[j for j in range(lo,hi) if not active[j]]
            cut=min(candidates,key=lambda j:abs(j-expected)) if candidates else expected
            cuts.append(cut)
        cuts.append(len(energy))
        for i,chunk in enumerate(chunks):
            a=segment['start_s']+cuts[i]*.01
            b=min(segment['end_s'],segment['start_s']+cuts[i+1]*.01)
            captions.append({'start':round(a,3),'end':round(b,3),'text':chunk,'alignment':'segment audio envelope estimate'})
    (ROOT/'subtitles-estimated.json').write_text(json.dumps(captions,ensure_ascii=False,indent=2),encoding='utf-8')
    return captions

def srt_time(t):
    ms=round(t*1000);return f'{ms//3600000:02}:{ms//60000%60:02}:{ms//1000%60:02},{ms%1000:03}'

def export_srt(captions):
    (ROOT/'Echo-Campus-preview.zh-CN.srt').write_text('\n\n'.join(f"{i+1}\n{srt_time(c['start'])} --> {srt_time(c['end'])}\n{c['text']}" for i,c in enumerate(captions))+'\n',encoding='utf-8-sig')

def pan_image(im,p,variant=0):
    p=ease(p)
    zoom=1.018+.052*p if variant%2==0 else 1.075-.045*p
    cw,ch=W/zoom,H/zoom
    dx=(W-cw)*(.35+.3*p if variant%2==0 else .6-.2*p)
    dy=(H-ch)*(.5+.2*p)
    return im.transform((W,H),Image.Transform.EXTENT,(dx,dy,dx+cw,dy+ch),Image.Resampling.BICUBIC).convert('RGBA')

def gradient_dark(opacity=.65):
    arr=np.zeros((H,1,4),dtype=np.uint8)
    arr[:,:,:3]=np.array(GREEN,dtype=np.uint8)
    yy=np.linspace(0,1,H)
    arr[:,0,3]=((.20+.8*np.clip((yy-.55)/.45,0,1)**1.5)*255*opacity).astype('uint8')
    return Image.fromarray(arr,'RGBA').resize((W,H))

GLOW=gradient_dark(.35)
TOP=Image.new('RGBA',(W,H),(0,0,0,0))
td=ImageDraw.Draw(TOP)
for y in range(140):
    td.line([(0,y),(W,y)],fill=(*GREEN,int(90*(1-y/140))),width=1)

def chrome(frame,t,chapter,kind):
    frame.alpha_composite(TOP)
    d=ImageDraw.Draw(frame)
    d.ellipse((64,59,76,71),fill=ORANGE)
    text(d,(89,42),'ECHO CAMPUS',26,IVORY,True,True)
    text(d,(90,79),'A WORLD FOR EVERY ENCOUNTER',11,IVORY,False,True)
    label='建筑视觉参考' if kind=='scene' else '交互流程示意'
    pill(d,(1583,48,1856,94),label,(*GREEN,185),IVORY,23)
    # Editorial baseline and six chapter markers.
    d.line((65,1036,1855,1036),fill=(*IVORY,70),width=1)
    d.line((65,1036,65+1790*t/DURATION,1036),fill=ORANGE,width=2)
    text(d,(65,1001),f'0{chapter} / 06',17,IVORY,False,True)
    text(d,(1856,1001),'预览版  ·  非实机录屏',18,IVORY,anchor='ra')

def section_label(frame,kicker,title,subtitle='',x=88,y=151,size=62,alpha=1):
    lay=Image.new('RGBA',(W,H),(0,0,0,0));d=ImageDraw.Draw(lay)
    text(d,(x,y),kicker,19,MUTED,True,True)
    text(d,(x,y+42),title,size,IVORY,True)
    if subtitle:text(d,(x,y+58+size),subtitle,25,IVORY)
    overlay_alpha(frame,lay,alpha)

def person_icon(d,x,y,s,colour=ORANGE):
    # Clear abstract avatar, intentionally not a photoreal human clone.
    d.ellipse((x-s*.18,y-s*.42,x+s*.18,y-s*.06),fill=colour)
    d.rounded_rectangle((x-s*.26,y,x+s*.26,y+s*.43),radius=s*.12,fill=colour)
    d.line((x-s*.13,y+s*.38,x-s*.17,y+s*.82),fill=colour,width=max(2,int(s*.10)))
    d.line((x+s*.13,y+s*.38,x+s*.17,y+s*.82),fill=colour,width=max(2,int(s*.10)))

def arrival(frame,t):
    local=t-16.76
    a=ease(local/.75)
    lay=Image.new('RGBA',(W,H),(0,0,0,0));d=ImageDraw.Draw(lay)
    x=1260+int(40*(1-a));y=172
    d.rounded_rectangle((x,y,x+546,y+660),radius=34,fill=(*IVORY,247))
    text(d,(x+36,y+29),'YOUR PLACE IN THE WORLD',16,(94,115,96),True,True)
    text(d,(x+36,y+65),'领取一个新的开始',34,GREEN,True)
    d.rounded_rectangle((x+36,y+132,x+510,y+316),radius=20,fill=(229,233,218))
    d.ellipse((x+189,y+160,x+323,y+294),fill=(214,224,207))
    if 'linyu' in PORTRAITS:
        avatar=PORTRAITS['linyu'].resize((153,204),Image.Resampling.LANCZOS)
        lay.alpha_composite(avatar,(x+177,y+116))
    else:person_icon(d,x+256,y+223,95,(178,128,77))
    text(d,(x+36,y+346),'一位新的参与者',26,GREEN,True)
    text(d,(x+36,y+389),'程序化分身  /  自主填写资料',21,(105,119,100))
    pill(d,(x+36,y+440,x+186,y+480),'产品探索',(228,233,219),GREEN,20)
    pill(d,(x+198,y+440,x+348,y+480),'空间设计',(228,233,219),GREEN,20)
    d.line((x+36,y+511,x+510,y+511),fill=(209,218,201),width=1)
    text(d,(x+36,y+535),'打开入口  →  填写资料  →  进入地图',21,GREEN)
    text(d,(x+36,y+592),'NFC 入口方案 · 实体碰卡待现场验证',18,(112,123,106))
    overlay_alpha(frame,lay,a)
    section_label(frame,'02 / ARRIVAL','把自己带进世界','手机是入口，大屏是共同的现场',x=88,y=170,size=58,alpha=a)

def profile_card(layer,x,y,name,label,tags,colour,who):
    d=ImageDraw.Draw(layer)
    d.rounded_rectangle((x,y,x+422,y+340),radius=28,fill=IVORY)
    d.ellipse((x+30,y+35,x+115,y+120),fill=colour)
    if who in PORTRAITS:
        avatar=PORTRAITS[who].resize((93,124),Image.Resampling.LANCZOS)
        layer.alpha_composite(avatar,(x+26,y+10))
    else:person_icon(d,x+73,y+69,48,GREEN)
    text(d,(x+141,y+37),name,27,GREEN,True)
    text(d,(x+141,y+83),'示例参与者',19,(111,128,107))
    text(d,(x+32,y+154),label,18,(109,124,103))
    text(d,(x+32,y+195),tags[0],28,GREEN,True)
    text(d,(x+32,y+249),tags[1],22,(102,120,102))

def connection(frame,t):
    local=t-30.28;a=ease(local/.8)
    shade=Image.new('RGBA',(W,H),(*GREEN,163));frame.alpha_composite(shade)
    section_label(frame,'03 / CONNECTION','让相遇，有一个好理由','供需标签给出推荐依据；双方确认，关系才被记录。',x=88,y=158,size=58,alpha=a)
    lay=Image.new('RGBA',(W,H),(0,0,0,0));d=ImageDraw.Draw(lay)
    profile_card(lay,235,390,'参与者 A','我可以分享','产品设计  创业交流'.split(),(220,197,157),'linyu')
    profile_card(lay,1263,390,'参与者 B','我正在寻找','产品设计  项目伙伴'.split(),(194,214,185),'zhouche')
    d.line((660,553,1259,553),fill=(*MUTED,180),width=2)
    for j in range(5):
        px=700+((local*.06+j/5)%1)*495
        d.ellipse((px-4,549,px+4,557),fill=ORANGE)
    pill(d,(775,499,1145,607),'共同话题：产品设计',IVORY,GREEN,26)
    steps=['查看资料','发出邀请','对方确认','记录相遇']
    active=min(3,int(max(0,local-3)/4))
    for j,step in enumerate(steps):
        px=430+j*310
        d.ellipse((px-9,788,px+9,806),fill=ORANGE if j<=active else MUTED)
        text(d,(px,821),step,25,IVORY,anchor='ma')
        if j<3:d.line((px+18,797,px+290,797),fill=(*MUTED,130),width=1)
    text(d,(960,882),'流程示意 · 推荐依据为供需标签规则',20,MUTED,anchor='ma')
    overlay_alpha(frame,lay,a)

def service_proof(frame,t):
    local=t-66.76;a=ease(local/.8)
    frame.alpha_composite(Image.new('RGBA',(W,H),(*GREEN,190)))
    section_label(frame,'05 / VERIFIED SERVICE','让体验，稳稳落地','HTTP / WebSocket 双会话验证',x=88,y=159,size=60,alpha=a)
    lay=Image.new('RGBA',(W,H),(0,0,0,0));d=ImageDraw.Draw(lay)
    for x,label in [(270,'会话 A'),(1450,'会话 B')]:
        d.rounded_rectangle((x,404,x+202,665),radius=26,outline=(*IVORY,230),width=2)
        d.rounded_rectangle((x+17,428,x+185,618),radius=14,fill=(*IVORY,28))
        person_icon(d,x+101,509,88,ORANGE if x<500 else MUTED)
        text(d,(x+101,692),label,27,IVORY,anchor='ma')
    d.rounded_rectangle((760,409,1160,662),radius=28,fill=IVORY)
    text(d,(960,446),'EVENT SERVICE',20,(99,119,101),True,True,anchor='ma')
    text(d,(960,504),'同一个活动世界',34,GREEN,True,anchor='ma')
    text(d,(960,565),'领取  ·  邀请  ·  双向确认',23,GREEN,anchor='ma')
    for x1,x2 in [(486,744),(1176,1435)]:
        d.line((x1,535,x2,535),fill=MUTED,width=2)
        px=x1+((local*.35)%1)*(x2-x1)
        d.ellipse((px-6,529,px+6,541),fill=ORANGE)
    pill(d,(592,766,1328,825),'39 项自动验证通过 · 服务验证示意',(*IVORY,28),IVORY,25)
    text(d,(960,862),'实体 NFC 碰卡待现场验证；此处不代表双设备实机录屏。',20,MUTED,anchor='ma')
    overlay_alpha(frame,lay,a)

SHOTS=[
    (0,8.3,'hero',1,'scene'),(8.3,16.76,'lobby',1,'scene'),
    (16.76,30.28,'lobby',2,'flow'),(30.28,50.28,'lobby',3,'flow'),
    (50.28,58.4,'gallery',4,'scene'),(58.4,66.76,'gallery',4,'scene'),
    (66.76,82.2,'hero',5,'flow'),(82.2,89.3,'lobby',6,'scene'),(89.3,97,'hero',6,'scene')]

def frame_at(t,images,captions):
    idx=next((i for i,s in enumerate(SHOTS) if s[0]<=t<s[1]),len(SHOTS)-1)
    start,end,key,chapter,kind=SHOTS[idx]
    p=(t-start)/(end-start)
    frame=pan_image(images[key],p,idx)
    # Brief, quiet cross dissolves between photographic source views.
    if idx>0 and t-start<.65:
        prev=SHOTS[idx-1]
        old=pan_image(images[prev[2]],1,idx-1)
        frame=Image.blend(old,frame,ease((t-start)/.65))
    frame.alpha_composite(GLOW)
    if chapter==1:
        if idx==0:
            section_label(frame,'01 / THE WORLD','让相遇，有一个世界','白庭校园  /  ECHO CAMPUS',x=88,y=139,size=64,alpha=ease(t/.9))
        else:
            section_label(frame,'ARCHITECTURE / LANDSCAPE','每一次停留，都值得','白色建筑，水庭与开放的相遇空间',x=88,y=142,size=52,alpha=ease((t-start)/.7))
    elif chapter==2:arrival(frame,t)
    elif chapter==3:connection(frame,t)
    elif chapter==4:
        section_label(frame,'04 / A DIFFERENT ATMOSPHERE','水上艺廊','换一个场景，延续同一场相遇',x=88,y=143,size=67,alpha=ease((t-50.28)/.8))
        d=ImageDraw.Draw(frame)
        pill(d,(90,794,672,855),'场景可替换  /  活动关系继续保留',(*GREEN,205),IVORY,24)
    elif chapter==5:service_proof(frame,t)
    else:
        if t<89.3:section_label(frame,'06 / BEYOND THE EVENT','让故事，继续发生','从建筑的位置，到人与人的连接',x=88,y=141,size=62)
        else:
            frame.alpha_composite(Image.new('RGBA',(W,H),(*GREEN,32)))
            section_label(frame,'ECHO CAMPUS','下一次相遇，从这里开始','为活动打造一个可进入、可相遇、可延续的世界。',x=88,y=147,size=58,alpha=ease((t-89.3)/.8))
            d=ImageDraw.Draw(frame)
            text(d,(90,827),'capture.meetmind.online/echo-campus/',24,IVORY,False,True)
    chrome(frame,t,chapter,kind)
    cap=next((c for c in captions if c['start']<=t<c['end']),None)
    if cap:
        d=ImageDraw.Draw(frame)
        string=cap['text'];size=33
        while d.textbbox((0,0),string,font=font(size))[2]>1650:size-=1
        box=d.textbbox((0,0),string,font=font(size));tw=box[2]
        lay=Image.new('RGBA',(W,H),(0,0,0,0));ld=ImageDraw.Draw(lay)
        ld.rounded_rectangle((960-tw/2-27,928,960+tw/2+27,985),radius=13,fill=(*GREEN,180))
        text(ld,(960,954),string,size,IVORY,anchor='mm')
        frame.alpha_composite(lay)
    if t<.35:frame=Image.blend(Image.new('RGBA',(W,H),(*GREEN,255)),frame,ease(t/.35))
    if t>96.3:frame=Image.blend(frame,Image.new('RGBA',(W,H),(*GREEN,255)),ease((t-96.3)/.7))
    return frame.convert('RGB')

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--stills',action='store_true');parser.add_argument('--fps',type=int,default=30);args=parser.parse_args()
    images=init_assets();captions=generate_subtitles();export_srt(captions)
    qa=ROOT/'qa';qa.mkdir(exist_ok=True)
    samples=[3,11,23,39,54,63,74,86,92]
    tiles=[]
    for i,t in enumerate(samples):
        im=frame_at(t,images,captions);im.save(qa/f'frame-{t:05.1f}s.jpg',quality=94)
        tile=im.resize((640,360),Image.Resampling.LANCZOS);draw=ImageDraw.Draw(tile);draw.rectangle((0,0,100,28),fill=GREEN);text(draw,(8,3),f'{t:.1f}s',18,IVORY,latin=True);tiles.append(tile)
    sheet=Image.new('RGB',(1920,1080),GREEN)
    for i,tile in enumerate(tiles):sheet.paste(tile,((i%3)*640,(i//3)*360))
    sheet.save(qa/'contact-sheet.jpg',quality=94)
    if args.stills:
        print(json.dumps({'stills':str(qa),'captions':len(captions)},ensure_ascii=False));return
    output=ROOT/'Echo-Campus-97s-preview.mp4'
    cmd=[str(FFMPEG),'-y','-hide_banner','-loglevel','warning','-f','rawvideo','-pixel_format','rgb24','-video_size',f'{W}x{H}','-framerate',str(args.fps),'-i','-','-i',str(VOICE/'Echo-Campus-narration-97s-mastered.wav'),'-map','0:v:0','-map','1:a:0','-c:v','libx264','-preset','fast','-crf','19','-pix_fmt','yuv420p','-c:a','aac','-b:a','192k','-ar','48000','-movflags','+faststart','-t',str(DURATION),str(output)]
    started=time.time()
    with open(ROOT/'render.log','w',encoding='utf-8') as log:
        process=subprocess.Popen(cmd,stdin=subprocess.PIPE,stderr=log)
        try:
            for f in range(round(DURATION*args.fps)):
                process.stdin.write(frame_at(f/args.fps,images,captions).tobytes())
                if f%(args.fps*10)==0:print(json.dumps({'rendered_seconds':f/args.fps,'elapsed_seconds':round(time.time()-started,1)}),flush=True)
        finally:process.stdin.close()
        if process.wait()!=0:raise RuntimeError('FFmpeg failed; see render.log')
    report={'output':str(output),'width':W,'height':H,'fps':args.fps,'duration_s':DURATION,'frames':round(DURATION*args.fps),'bytes':output.stat().st_size,'elapsed_s':round(time.time()-started,2),'subtitle_count':len(captions),'subtitle_alignment':sorted(set(c.get('alignment','ASR word timestamps') for c in captions)),'source_label':'Architectural visual references and interaction diagrams; not actual browser footage','audio':'Qwen3 official preset Ethan; no real person cloning','browser_automation_used':False}
    (ROOT/'video-metadata.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps(report,ensure_ascii=False),flush=True)

if __name__=='__main__':main()
