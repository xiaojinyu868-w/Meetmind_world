import * as THREE from "three";

// World-space surface grain has a metre scale and survives the original CAD UVs.
export function finishArchitecturalMaterial(material, profile, time) {
  if (!material.isMeshStandardMaterial || !["glass", "stone", "ivory", "paving", "grass", "aluminum", "water", "road"].includes(profile)) return;
  material.onBeforeCompile = shader => {
    shader.uniforms.ecSurfaceTime = time;
    shader.vertexShader = "varying vec3 ecWorld;\n" + shader.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\necWorld=(modelMatrix*vec4(transformed,1.0)).xyz;");
    shader.fragmentShader = `varying vec3 ecWorld; uniform float ecSurfaceTime;
      float ecHash(vec3 p){p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
      float ecNoise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(ecHash(i),ecHash(i+vec3(1,0,0)),f.x),mix(ecHash(i+vec3(0,1,0)),ecHash(i+vec3(1,1,0)),f.x),f.y),mix(mix(ecHash(i+vec3(0,0,1)),ecHash(i+vec3(1,0,1)),f.x),mix(ecHash(i+vec3(0,1,1)),ecHash(i+vec3(1,1,1)),f.x),f.y),f.z);}
    ` + shader.fragmentShader;
    let color = "";
    if(profile === "glass") color=`
      float pane=ecHash(floor(ecWorld/vec3(1.55,3.65,1.55)));
      float floorBand=smoothstep(.04,.10,fract(ecWorld.y/3.65));
      diffuseColor.rgb*=mix(.78,1.09,pane)*mix(.73,1.,floorBand);
      diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.19,.25,.24),.045*smoothstep(.9,1.,pane));`;
    else if(profile === "grass") color=`
      float field=ecNoise(ecWorld*.24)*.6+ecNoise(ecWorld*1.7)*.4;
      diffuseColor.rgb*=.72+field*.5;`;
    else if(profile === "paving") color=`
      vec2 uv=ecWorld.xz/1.2;vec2 tile=floor(uv);vec2 grid=abs(fract(uv)-.5);
      float seam=smoothstep(.486,.498,max(grid.x,grid.y));
      float detail=1.-smoothstep(20.,65.,length(vViewPosition));
      float grain=mix(.5,ecNoise(ecWorld*16.),detail);
      diffuseColor.rgb*=mix(.92,1.07,ecHash(vec3(tile,1.)))*mix(1.,.78,seam*detail)*(.97+grain*.06);`;
    else if(profile === "stone" || profile === "ivory") color=`
      float grain=mix(.5,ecNoise(ecWorld*19.),1.-smoothstep(18.,50.,length(vViewPosition)));float broad=ecNoise(ecWorld*.45);
      diffuseColor.rgb*=.95+.055*grain+.045*broad;`;
    else if(profile === "road") color=`diffuseColor.rgb*=.94+.12*mix(.5,ecNoise(ecWorld*28.),1.-smoothstep(15.,45.,length(vViewPosition)));`;
    else if(profile === "water") color=`diffuseColor.rgb*=.91+.14*ecNoise(vec3(ecWorld.x*.7,ecSurfaceTime*.06,ecWorld.z*.7));`;
    shader.fragmentShader = shader.fragmentShader.replace("#include <color_fragment>", "#include <color_fragment>\n"+color);
    if(profile === "water") shader.fragmentShader=shader.fragmentShader.replace("#include <normal_fragment_maps>", `#include <normal_fragment_maps>
      vec3 ripple=vec3(sin(ecWorld.x*2.1+ecWorld.z*.8+ecSurfaceTime*.6),0.,cos(ecWorld.z*2.4-ecWorld.x*.5+ecSurfaceTime*.45))*.035;
      normal=normalize(normal+mat3(viewMatrix)*ripple);`);
  };
  material.customProgramCacheKey=()=>"ec-architectural-surface-v1-"+profile;
  material.needsUpdate=true;
}
