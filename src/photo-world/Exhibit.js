import * as T from 'three';
import { booths } from './Market.js';

function print(width,height,draw){
  const c=document.createElement('canvas');c.width=width;c.height=height;draw(c.getContext('2d'),c);
  const texture=new T.CanvasTexture(c);texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=4;return texture;
}
export function photographExhibit(photo,title){
  const g=new T.Group(),wood=new T.MeshStandardMaterial({color:0x815841,roughness:.82});
  function frame(w,h,d,x,y,z){
    const b=new T.Mesh(new T.BoxGeometry(w,h,d),wood);b.castShadow=true;b.position.set(x,y,z);g.add(b);
  }
  frame(.15,2.85,.19,-1.42,1.42,0);frame(.15,2.85,.19,1.42,1.42,0);frame(3.17,2.16,.18,0,1.88,0);
  const tex=print(640,420,(ctx,c)=>{
    ctx.fillStyle='#fff1d7';ctx.fillRect(0,0,c.width,c.height);
    const scale=Math.max(608/photo.naturalWidth,330/photo.naturalHeight);
    const w=608/scale,h=330/scale;
    ctx.drawImage(photo,(photo.naturalWidth-w)/2,(photo.naturalHeight-h)/2,w,h,16,13,608,330);
    ctx.fillStyle='#384e41';ctx.font='25px "Noto Serif SC",serif';ctx.textAlign='center';ctx.fillText(title,320,389,560);
  });
  const image=new T.Mesh(new T.PlaneGeometry(3.03,2.03),new T.MeshBasicMaterial({map:tex,toneMapped:false}));
  image.position.set(0,1.88,.115);g.add(image);g.position.set(4.62,.04,-1.75);g.rotation.y=2.50;
  return g;
}

export function fallbackMap(host, pick, {place, field, withSeat, display}) {
  let previous = '';
  return {update(state, photo, home) {
    if (home) return;
    const people = state.people.filter(person => person.name && (place === 'field'
      ? person.seat === state.me || person.seat === withSeat
      : (person.place || 'hall') === place));
    const moments = place === 'cafe' ? [] : state.moments.filter(m => place === 'field' ? field?.moments.includes(m.id) : m.kind !== 'project');
    const entries = people.map((p, i) => [
      p.name, 'person', 'p' + p.seat,
      place === 'field' ? 38 + i * 24 : Math.max(12, Math.min(89, 49 + p.x * 3.6)),
      place === 'field' ? 53 : Math.max(18, Math.min(85, 52 + p.z * 2.4))
    ]);
    for (const [i, m] of moments.entries()) entries.push([m.title, 'moment', m.id, 23 + (i % 3) * 24, 72 + Math.floor(i / 3) % 2 * 8]);
    if (place === 'field' && field) {
      field.scene.entities.forEach((e, i) => entries.push([e.label, 'field', e.id, 18 + (i % 2) * 62, 24 + Math.floor(i / 2) * 33]));
    } else if (photo && place === 'hall' && state.me !== null) {
      entries.push(['那张合照', 'photo', 'origin', 24, 43]);
    }
    if (!display && place === 'hall' && state.me !== null) {
      booths.forEach((_, i) => entries.push(['作品摊 '+(i+1), 'booth', String(i), 21+i%2*53, 26+Math.floor(i/2)*10]));
    }
    const signature = JSON.stringify(entries);
    if (signature === previous) return;
    previous = signature;
    const layer = document.createElement('div');
    layer.className = 'fallback-pins';
    for (const [title, kind, id, x, y] of entries) {
      const pin = document.createElement(display ? 'span' : 'button');
      pin.textContent = title;
      pin.className = 'world-pin ' + kind;
      Object.assign(pin.style, {left: x + '%', top: y + '%', transform: 'translate(-50%,-50%)'});
      if (!display) {
        pin.type = 'button';
        pin.addEventListener('click', () => pick(kind, id));
      }
      layer.append(pin);
    }
    host.querySelector('.fallback-pins')?.remove();
    host.append(layer);
  }};
}
