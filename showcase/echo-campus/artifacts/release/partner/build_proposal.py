from pathlib import Path
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor, Color
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.utils import ImageReader
from reportlab.graphics.barcode import qr
from reportlab.graphics.shapes import Drawing
from reportlab.graphics import renderPDF
from PIL import Image

ROOT=Path(__file__).resolve().parent
pdfmetrics.registerFont(TTFont('CN','C:/Windows/Fonts/msyh.ttc',subfontIndex=0))
pdfmetrics.registerFont(TTFont('CNB','C:/Windows/Fonts/msyhbd.ttc',subfontIndex=0))
pdfmetrics.registerFont(TTFont('EN','C:/Windows/Fonts/arial.ttf'))
pdfmetrics.registerFont(TTFont('ENB','C:/Windows/Fonts/arialbd.ttf'))
W,H=960,600
INK='#233A31'; MUTED='#687269'; BG='#F4F2EB'; ACCENT='#AA8B58'; RULE='#D7DCCE'
c=canvas.Canvas(str(ROOT/'Echo-Campus-合作展示方案.pdf'),pagesize=(W,H))
c.setTitle('Echo Campus 活动数字相遇体验方案')
c.setAuthor('MeetMind')
c.setSubject('白庭校园与可替换场景的数字分身活动原型')

def rect(x,y,w,h,fill):
 c.setFillColor(HexColor(fill));c.rect(x,H-y-h,w,h,stroke=0,fill=1)
def text(x,y,t,size=16,font='CN',color=INK):
 c.setFillColor(HexColor(color));c.setFont(font,size);c.drawString(x,H-y-size*.82,t)
def line(x,y,x2,y2,color=RULE,width=1):
 c.setStrokeColor(HexColor(color));c.setLineWidth(width);c.line(x,H-y,x2,H-y2)
def wrap(t,width,size,font='CN'):
 lines=[];part=''
 for ch in t:
  if ch=='\n': lines.append(part);part='';continue
  if pdfmetrics.stringWidth(part+ch,font,size)>width:lines.append(part);part=ch
  else:part+=ch
 if part:lines.append(part)
 return lines
def para(x,y,t,width,size=14,color=MUTED,leading=None,font='CN'):
 for row in wrap(t,width,size,font):text(x,y,row,size,font,color);y+=leading or size*1.65
 return y
def image(name,x,y,w,h):
 im=Image.open(ROOT/'assets'/name).convert('RGB');ratio=max(w/im.width,h/im.height)
 nw,nh=im.width*ratio,im.height*ratio
 c.saveState();p=c.beginPath();p.rect(x,H-y-h,w,h);c.clipPath(p,stroke=0,fill=0)
 c.drawImage(ImageReader(im),x-(nw-w)/2,H-y-h-(nh-h)/2,nw,nh);c.restoreState()
def page(n,label):
 rect(0,0,W,H,BG);text(44,27,'ECHO CAMPUS',13,'ENB');text(203,28,label,10,color=MUTED)
 line(44,54,916,54);line(44,563,916,563)
 text(44,577,'MEETMIND  /  EVENT EXPERIENCE PROTOTYPE',8,'EN',MUTED)
 text(850,576,f'{n:02d} / 07',9,'EN',MUTED)
def title(kicker,heading,sub=None):
 text(44,83,kicker,11,'EN',ACCENT);text(44,111,heading,30,'CNB')
 if sub:para(44,156,sub,862,13)
def pill(x,y,t):
 tw=pdfmetrics.stringWidth(t,'CN',11)+24
 c.setFillColor(HexColor('#E4E9DD'));c.roundRect(x,H-y-26,tw,26,13,stroke=0,fill=1);text(x+12,y+7,t,11)
 return tw
def qrcode(url,x,y,size):
 widget=qr.QrCodeWidget(url);a,b,ex,ey=widget.getBounds();d=Drawing(size,size,transform=[size/(ex-a),0,0,size/(ey-b),0,0]);d.add(widget);renderPDF.draw(d,c,x,H-y-size)

page(1,'活动数字相遇体验')
image('campus.png',0,62,960,345)
rect(0,385,960,175,BG)
text(44,402,'让现场的相遇',34,'CNB');text(44,448,'在数字世界继续',34,'CNB')
para(546,413,'NFC / 扫码入场，领取数字分身。\n在一座可探索的白色建筑园区里，发现伙伴，确认相遇。',364,16,color=INK,leading=28)
text(546,509,'联合活动合作概念与可运行原型  ·  2026.09',11,color=MUTED)
text(44,535,'建筑画面为同源程序化几何的离线视觉参考；浏览器效果需以互动 Demo 为准。',8,color=MUTED)
c.showPage()

page(2,'体验主张')
title('01  /  WHY THIS EXPERIENCE','把入场变成参与，把相遇变成连接','活动的吸引力来自空间、人物和接下来可以发生的事情。这个原型把三者放进同一个可探索的世界。')
cols=[(44,'01','第一眼愿意停留','白色曲面建筑、静水庭院和层层连廊，构成适合大屏展示的活动视觉。场景本身成为来宾愿意进入的理由。'),(342,'02','一眼看见共同话题','每个分身都带着来宾主动公开的身份、供给与需求。点选人物，就能找到有依据的开场话题。'),(640,'03','结束后仍有联系线索','相遇由双方确认，再以连接出现在世界里。活动可以留下可回访的人与关系，而不仅是一张合照。')]
for x,num,h,body in cols:
 text(x,229,num,52,'EN',ACCENT);line(x,301,x+263,301);text(x,327,h,20,'CNB');para(x,370,body,261,15,leading=27)
c.showPage()

page(3,'两种空间 一套体验')
title('02  /  SPATIAL DIRECTION','白庭校园与水上艺廊','两套独立建筑与景观布局，可在同一活动中切换。人物名片与已确认关系继续保留。')
image('campus.png',44,204,429,243);image('gallery.png',487,204,429,243)
text(44,465,'白庭校园',22,'CNB');text(487,465,'水上艺廊',22,'CNB')
para(44,502,'弧形白楼、水庭与木色檐口。适合校园、产业交流和联合品牌活动。',422,13)
para(487,502,'低层展廊、静水与艺术装置。适合展览、发布与小型交流。',420,13)
text(44,550,'以上为同源几何离线参考图，未作为浏览器截图或性能证据。',8,color=MUTED)
c.showPage()

page(4,'现场体验流程')
title('03  /  PARTICIPANT JOURNEY','从轻触胸牌，到确认一次相遇','手机完成领取，大屏同步呈现。参会者可以逐步探索，也可以在主持人的引导下共同完成。')
steps=[('轻触或扫码','打开同一个活动入口'),('领取分身','确认公开名片与色彩'),('发现伙伴','查看人物与供需线索'),('发起相遇','邀请对方确认这次连接'),('双方确认','关系出现在活动世界')]
for i,(h,b) in enumerate(steps):
 x=44+i*179
 c.setFillColor(HexColor(INK));c.circle(x+23,H-245,23,stroke=0,fill=1);text(x+13,237,str(i+1),19,'ENB','#FFFFFF')
 if i<4:line(x+52,245,x+167,245,ACCENT,1.2)
 text(x,290,h,19,'CNB');para(x,330,b,155,13)
line(44,400,916,400)
text(44,428,'一屏世界，两端参与',20,'CNB')
para(44,465,'大屏呈现空间与实时连接，参与者查看名片并确认相遇。已通过两个独立浏览器会话完成领取、推荐、请求与双向确认；同一电脑可打开独立演示窗口体验。',530,14)
para(640,430,'现场接入说明\nNFC 写入的是网页入口。硬件兼容、活动身份核验与现场网络，需要在活动前联调。',264,13)
c.showPage()

page(5,'有依据的相遇')
title('04  /  MEANINGFUL CONNECTIONS','让每一次推荐，都说得清理由','当前依据双方主动公开的供需词条进行匹配，展示对应原文。分数不表示合作概率。')
for x,name,role,offer,need in [(44,'林予','AI 产品创始人','AI 产品研发、快速原型','品牌设计、用户访谈'),(534,'周澈','品牌设计师','品牌设计、用户访谈','AI 产品研发、快速原型')]:
 line(x,217,x+382,217);text(x,245,name,27,'CNB');text(x,288,role,13)
 text(x,337,'我能提供',11,color=ACCENT);para(x,360,offer,372,17,color=INK)
 text(x,411,'我想认识',11,color=ACCENT);para(x,434,need,372,17,color=INK)
line(439,322,514,322,ACCENT,1.5);line(439,406,514,406,ACCENT,1.5)
text(451,348,'相互',13,color=MUTED);text(451,369,'补足',13,color=MUTED)
para(44,514,'请求仅对双方可见；接收方确认后，连接才进入公共世界。以上为虚构示例人物，原型使用标签匹配，尚未接入大模型推荐。',850,11)
c.showPage()

page(6,'可替换场景')
title('05  /  A FLEXIBLE WORLD','明天换一座园区，体验可以继续','建筑负责视觉，活动逻辑负责人物、名片与相遇。两者通过场景配置连接。')
options=[('程序化建筑','直接修改几何与材质','适合白楼、校园、展厅等结构清晰的空间。可在代码中调整楼层、连廊、景观和镜头。'),('GLB 场景','导入自包含模型文件','适合 Blender 手工场景或独立模型。通过缩放、旋转、位移和锚点，把活动放进新的建筑。'),('Marble / Splat','导入 SPZ 等导出文件','为扫描或生成空间预留入口。需校准朝向、尺度与地面；真实导出文件仍需逐件验收。')]
for i,(h,sub,b) in enumerate(options):
 x=44+i*298;line(x,225,x+267,225);text(x,249,h,23,'CNB');text(x,295,sub,13,color=ACCENT);para(x,332,b,263,14,leading=25)
line(44,464,916,464);text(44,488,'始终保留',15,'CNB');text(170,489,'活动人物  /  公开名片  /  已确认关系  /  入场入口',15)
text(44,534,'当前导入以配置的活动平面和碰撞圆运行，不自动恢复 Splat 的精确地形碰撞。',10,color=MUTED)
c.showPage()

page(7,'演示入口与合作落点')
title('06  /  NEXT STEP','先体验，再定义联合活动的现场版本','建议先用两台设备走完一次领取与相遇，再对齐活动主题、规模、场景与大屏动线。')
qrcode('https://capture.meetmind.online/echo-campus/',47,224,168)
text(240,235,'打开互动原型',23,'CNB')
para(240,280,'capture.meetmind.online/echo-campus/',600,16,font='EN',color=INK)
c.linkURL('https://capture.meetmind.online/echo-campus/',(240,H-308,871,H-277),relative=0)
text(240,328,'使用虚构昵称即可体验  ·  双端请使用独立会话',12,color=MUTED)
text(240,356,'观看展示主片  Echo-Campus-Showcase.mp4',14,'CNB')
c.linkURL('https://capture.meetmind.online/echo-campus/Echo-Campus-Showcase.mp4',(240,H-376,900,H-352),relative=0)
text(240,381,'97 秒 · 1080p30 · 场景实录与实际界面剪辑 · 中文旁白字幕',10,color=MUTED)
text(240,398,'旧片仅作参考预览  Echo-Campus-97s-preview.mp4',9,color=MUTED)
c.linkURL('https://capture.meetmind.online/echo-campus/Echo-Campus-97s-preview.mp4',(240,H-410,900,H-395),relative=0)
line(44,419,916,419)
text(44,443,'本次已经实现',16,'CNB');para(44,476,'两套程序化空间、分身领取、资料名片、供需线索、双向确认、实时同步，以及场景导入配置。',402,13)
text(511,443,'活动前共同完成',16,'CNB');para(511,476,'确定场地与品牌表达；验收实际设备、NFC 标签、导出模型、隐私与身份流程，并按来宾规模完成压测。',402,13)
text(44,547,'原型评审版  ·  不代表阿里巴巴官方产品或已确认合作  ·  实体手机、NFC 与真实 Marble 文件需现场联调',8,color=MUTED)
c.showPage()
c.save()
print(ROOT/'Echo-Campus-合作展示方案.pdf')
