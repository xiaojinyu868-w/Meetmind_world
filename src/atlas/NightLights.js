import * as T from "three";

// Small, depth-tested light halos preserve the silhouette without a full-screen bloom pass.
export function lightHarbor(model) {
  const canvas=document.createElement("canvas");
  canvas.width=canvas.height=96;
  const ctx=canvas.getContext("2d");
  const gradient=ctx.createRadialGradient(48,48,0,48,48,48);
  for (const [position,alpha] of [[0,.94],[.035,.9],[.09,.62],[.18,.31],[.4,.11],[.7,.031],[1,0]]) {
    gradient.addColorStop(position,"rgba(255,238,195,"+alpha+")");
  }
  ctx.fillStyle=gradient;ctx.fillRect(0,0,96,96);
  const texture=new T.CanvasTexture(canvas);
  const amber=new T.SpriteMaterial({map:texture,color:0xffb35e,blending:T.AdditiveBlending,depthWrite:false,transparent:true});
  const halo=(x,y,z,size)=>{
    const sprite=new T.Sprite(amber);sprite.scale.setScalar(size);sprite.position.set(x,y,z);
    sprite.renderOrder=4;model.add(sprite);
  };
  for(const [x,y,z,size] of [[0,4.82,-1.42,.81],[-5.6,3.97,.29,1.8],[-.54,.82,2.18,.65],
    [-.24,1.32,.62,.44],[.24,1.32,.62,.44],[4.58,1.28,1.94,.8],[5.44,1.28,1.95,.55]]) halo(x,y,z,size);
  for(let i=0;i<7;i++) {
    const t=i*Math.PI*2/7;
    halo(.76*Math.cos(t),2.30,-1.42+.76*Math.sin(t),.54);
  }
  for(const [x,y,z,intensity,distance] of [[0,1.35,-1.42,30,6],[4.6,1.2,2.16,2.1,3],[-.54,1.05,2.4,.85,2.7]]) {
    const bulb=new T.PointLight(0xffad57,intensity,distance,2);
    bulb.position.set(x,y,z);model.add(bulb);
  }
  const beam=new T.Group();beam.position.set(-5.6,3.95,.29);model.add(beam);
  const shape=new T.CylinderGeometry(.035,.57,6.3,28,1,true);
  shape.translate(0,-3.15,0);shape.rotateZ(Math.PI/2);
  const material=new T.ShaderMaterial({
    transparent:true,depthWrite:false,blending:T.AdditiveBlending,side:T.DoubleSide,forceSinglePass:true,
    vertexShader:`varying vec2 v; varying vec3 n; varying vec3 eye;
      void main(){v=uv;n=normalize(normalMatrix*normal);vec4 p=modelViewMatrix*vec4(position,1.);
      eye=normalize(-p.xyz);gl_Position=projectionMatrix*p;}`,
    fragmentShader:`varying vec2 v; varying vec3 n; varying vec3 eye;
      void main(){float feather=pow(abs(dot(normalize(n),normalize(eye))),1.25);
        gl_FragColor=vec4(1.,.73,.39,.15*feather*pow(v.y,.7));}`
  });
  beam.add(new T.Mesh(shape,material));
  return time=>{beam.rotation.y=2.9+time*.095;};
}
