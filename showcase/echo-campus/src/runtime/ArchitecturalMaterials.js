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
      float floorBand=smoothstep(.035,.075,fract(ecWorld.y/3.65));
      // The facade stays one calm blue-silver mass behind the visitors.
      diffuseColor.rgb*=mix(.95,1.035,pane)*mix(.93,1.,floorBand);
      diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.56,.61,.71),.035*pane);`;
    else if(profile === "grass") color=`
      float field=ecNoise(ecWorld*.09)*.7+ecNoise(ecWorld*.42)*.3;
      diffuseColor.rgb*=.92+field*.16;`;
    else if(profile === "paving") color=`
      vec2 uv=ecWorld.xz/vec2(2.4,1.2);vec2 tile=floor(uv);vec2 grid=abs(fract(uv)-.5);
      float seam=smoothstep(.482,.496,max(grid.x,grid.y));
      float detail=1.-smoothstep(15.,48.,length(vViewPosition));
      float grain=mix(.5,ecNoise(ecWorld*8.),detail);
      diffuseColor.rgb*=mix(.97,1.025,ecHash(vec3(tile,1.)))*mix(1.,.9,seam*detail)*(.985+grain*.03);`;
    else if(profile === "stone" || profile === "ivory") color=`
      float grain=mix(.5,ecNoise(ecWorld*9.),1.-smoothstep(14.,40.,length(vViewPosition)));float broad=ecNoise(ecWorld*.15);
      diffuseColor.rgb*=.974+.026*grain+.022*broad;`;
    else if(profile === "road") color=`diffuseColor.rgb*=.978+.044*mix(.5,ecNoise(ecWorld*12.),1.-smoothstep(12.,35.,length(vViewPosition)));`;
    else if(profile === "water") color=`
      // Broad colour drift never creates the sparkling noise of the old basin.
      float drift=ecNoise(vec3(ecWorld.x*.085,ecSurfaceTime*.018,ecWorld.z*.085));
      diffuseColor.rgb*=.975+.05*drift;`;
    shader.fragmentShader = shader.fragmentShader.replace("#include <color_fragment>", "#include <color_fragment>\n"+color);
    if(profile === "water") shader.fragmentShader=shader.fragmentShader.replace("#include <normal_fragment_maps>", `#include <normal_fragment_maps>
      float attenuation=1./(1.+length(vViewPosition)*.035);
      vec3 ripple=vec3(sin(ecWorld.x*.38+ecWorld.z*.21+ecSurfaceTime*.24),0.,cos(ecWorld.z*.49-ecWorld.x*.17+ecSurfaceTime*.19))*.013*attenuation;
      normal=normalize(normal+mat3(viewMatrix)*ripple);`);
  };
  material.customProgramCacheKey=()=>"ec-architectural-surface-v2-"+profile;
  material.needsUpdate=true;
}
