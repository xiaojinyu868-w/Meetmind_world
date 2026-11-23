export async function downloadKeepsake(world,photo,plaza){
  const canvas=document.createElement('canvas');canvas.width=1440;canvas.height=1060;
  const g=canvas.getContext('2d');
  const img=new Image();img.src=plaza?.capture?.()||import.meta.env.BASE_URL+'photo-world/'+(document.body.dataset.place==='cafe'?'cafe-still.webp':document.body.dataset.place==='field'?'dusk.webp':'market-still.webp');await img.decode();
  g.fillStyle='#f4f0e5';g.fillRect(0,0,1440,1060);
  const blend=g.createLinearGradient(0,60,1200,695);blend.addColorStop(0,'#edc89e');blend.addColorStop(.55,'#9c9ea5');blend.addColorStop(1,'#718a99');
  g.fillStyle=blend;g.fillRect(48,60,1344,666);
  const scale=Math.min(1344/img.width,666/img.height);
  g.drawImage(img,48+(1344-img.width*scale)/2,60+(666-img.height*scale)/2,img.width*scale,img.height*scale);
  g.fillStyle='#233e35';g.font='italic 28px Georgia';g.fillText('MeetMind World',52,42);
  if(photo){
    g.save();g.translate(67,765);g.rotate(-.04);g.fillStyle='#fffcf4';g.fillRect(0,0,257,188);
    const scale=Math.max(241/photo.width,160/photo.height);
    const sw=241/scale,sh=160/scale;
    g.drawImage(photo,(photo.width-sw)/2,(photo.height-sh)/2,sw,sh,8,8,241,160);g.restore();
  }
  g.fillStyle='#274b3d';g.font='50px "Noto Serif SC",serif';g.fillText(world.title,350,825,988);
  g.font='25px sans-serif';g.fillStyle='#516756';g.fillText(world.people.map(p=>p.name).join(' · '),350,879,980);
  g.font='23px sans-serif';g.fillText(world.moments.length+' 段共同经历',350,926);
  g.strokeStyle='#babca7';g.beginPath();g.moveTo(50,982);g.lineTo(1390,982);g.stroke();
  g.font='22px "Noto Serif SC",serif';g.fillText('让相遇不止于相遇。',54,1025);
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob)throw new Error('暂时无法导出，请重试');
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=world.title.slice(0,48)+'-合照世界.png';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),12000);
}
