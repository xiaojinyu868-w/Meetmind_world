const base = import.meta.env.BASE_URL;
export const booths = [
  {x:-4.7,z:-7.6,angle:Math.PI/2},
  {x:4.7,z:-8.5,angle:-Math.PI/2},
  {x:-4.7,z:-12.1,angle:Math.PI/2},
  {x:4.7,z:-12.8,angle:-Math.PI/2},
];
export const boothNumber = seat => seat % booths.length;
export const sampleWork = {
  id:'courtyard-study',seat:0,kind:'project',title:'把庭院做成一个模型',
  body:'我想把大家第一次见面的庭院留下来。这是模型完成时拍下的俯视图。',
  happened:'2026-08-05',has_photo:true,localPhoto:base+'photo-world/market-still.webp',with_people:[],
};

export function bulletinText(event, people) {
  const name = people.find(p => p.seat === event.seat)?.name || '一位成员';
  switch (event.kind) {
    case 'joined': return name + ' 从合照走进了世界';
    case 'sat': return name + ' 在圆桌旁坐下';
    case 'ice': return '印象速配收到一张新题卡';
    case 'roundtable': return '一场圆桌已留下讨论记录';
    case 'exhibited': return name + ' 在市集展出了一件作品';
    default: return '世界有了新动态';
  }
}

// WebSocket carries invalidations only. The existing authenticated HTTP read
// applies the correct visibility rules separately for each browser and display.
export function connectWorldStream(url, key, refresh) {
  let socket, timer, stopped = false, online = false;
  let retry = 1200;
  function connect(){
    if(stopped || document.hidden) return;
    try{socket = new WebSocket(url);}catch{schedule();return;}
    socket.onopen = () => socket.send(key());
    socket.onmessage = event => {
      let message;
      try {message = JSON.parse(event.data);} catch {return;}
      if(message.type === 'ready'){online=true;retry=1200;refresh();}
      if(message.type === 'changed')refresh();
    };
    socket.onclose = () => {online=false;schedule();};
    socket.onerror = () => socket.close();
  }
  function schedule(){
    clearTimeout(timer);
    if(stopped || document.hidden) return;
    timer=setTimeout(connect,retry);
    retry=Math.min(20000,retry*2);
  }
  function visibility(){
    if(document.hidden){socket?.close();return;}
    refresh();
    if(!socket || socket.readyState===WebSocket.CLOSED)schedule();
  }
  document.addEventListener('visibilitychange',visibility);
  window.addEventListener('pagehide',()=>{stopped=true;clearTimeout(timer);socket?.close();},{once:true});
  window.addEventListener('pageshow',e=>{if(e.persisted){stopped=false;connect();}});
  connect();
  return {connected:()=>online};
}
