import * as T from 'three';

function glowTexture(){
  const c=document.createElement('canvas');c.width=c.height=96;
  const ctx=c.getContext('2d'),rad=ctx.createRadialGradient(48,48,0,48,48,48);
  for(const [stop,alpha] of [[0,1],[.09,.94],[.22,.38],[.5,.095],[1,0]])rad.addColorStop(stop,`rgba(255,209,135,${alpha})`);
  ctx.fillStyle=rad;ctx.fillRect(0,0,96,96);
  return new T.CanvasTexture(c);
}
export function setMarketLights(town,scene){
  const locs=[],glow=glowTexture();
  town.updateMatrixWorld(true);
  const pos=new T.Vector3();
  town.traverse(node=>{
    const m=node.material;
    if(!m?.isMeshStandardMaterial)return;
    if(/LampGlass|StringBulb|GlassWarm|Fire(Inner|Outer)/.test(m.name)){
      m.emissive.set(/Fire/.test(m.name)?0xff8325:0xffd89a);m.emissiveIntensity=.93;
      if(/LampGlass|StringBulb/.test(m.name)){
        node.getWorldPosition(pos);locs.push([pos.x,pos.y,-pos.z,/LampGlass/.test(m.name)?1.7:.76]);
      }
    }
  });
  for(const z of [-10,-4])for(const x of [-4,-2,0,2,4])locs.push([x,4.41-.65*(1-(x/5)**2),z,1.34]);
  locs.push([0,.77,2.5,2.8],[-5.6,1.7,1.3,1.8]);
  const geometry=new T.BufferGeometry();
  geometry.setAttribute('position',new T.Float32BufferAttribute(locs.flatMap(p=>p.slice(0,3)),3));
  geometry.setAttribute('radius',new T.Float32BufferAttribute(locs.map(p=>p[3]),1));
  const glowMat=new T.ShaderMaterial({uniforms:{tex:{value:glow},viewport:{value:400},opacity:{value:.82}},
    transparent:true,depthWrite:false,blending:T.AdditiveBlending,
    vertexShader:`attribute float radius;uniform float viewport;void main(){vec4 mv=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*mv;gl_PointSize=clamp(radius*viewport/max(1.,-mv.z),1.,90.);}`,
    fragmentShader:`uniform sampler2D tex;uniform float opacity;void main(){vec4 c=texture2D(tex,gl_PointCoord);gl_FragColor=vec4(c.rgb,c.a*opacity);}`});
  const halos=new T.Points(geometry,glowMat);scene.add(halos);
  const fire=new T.PointLight(0xffa148,49,9,2);fire.position.set(0,1.65,2.5);scene.add(fire);
  const windowLight=new T.PointLight(0xffc98c,42,11,2);windowLight.position.set(-6,2.8,.8);scene.add(windowLight);
  const lamps=new T.PointLight(0xffb263,43,13,2);lamps.position.set(.3,3.2,-7.5);scene.add(lamps);
  return {size:h=>{glowMat.uniforms.viewport.value=h*1.35;},tick:(t,day)=>{
    fire.intensity=(day?9:48)*(1+.065*Math.sin(t*.006)+.035*Math.sin(t*.012));
    windowLight.intensity=day?6:42;lamps.intensity=day?5:48;glowMat.uniforms.opacity.value=day?.16:.85;
  }};
}
export function waterSurface(root){
  const m=root.getObjectByName('RIVER_Ribbon')?.material;
  if(!m)return;
  m.color.set(0x5d9b9c);m.roughness=.38;m.metalness=.17;
  m.onBeforeCompile=s=>{
    s.vertexShader='varying vec3 vRiverPos;\n'+s.vertexShader.replace('#include <project_vertex>','#include <project_vertex>\nvRiverPos=(modelMatrix*vec4(transformed,1.)).xyz;');
    s.fragmentShader='varying vec3 vRiverPos;\n'+s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      float r=sin(vRiverPos.z*16.+sin(vRiverPos.x*2.3)*.8)+sin(vRiverPos.x*4.+vRiverPos.z*.6)*.46;
      diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.45,.66,.57),smoothstep(1.17,1.42,r)*.5);`);
  };
}
