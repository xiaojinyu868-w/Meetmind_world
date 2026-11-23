import * as T from 'three';

const surfaces=[
  [/Grass|FieldGrass/,0,.5,.32],
  [/Timber|WoodPlank|WoodDark|Hub_Wood|Cafe_Deck/, .5,.5,.58],
  [/RoofSlate/,0,0,.52],
  [/StonePath|PlazaStone|Cafe_Stone$|PlazaRing/,.5,0,.73]
];

export function paintSurfaces(root,atlas){
  const done=new Set();
  root.traverse(n=>{
    const m=n.material;if(!m?.isMeshStandardMaterial||done.has(m))return;
    done.add(m);const tile=surfaces.find(([name])=>name.test(m.name));if(!tile)return;
    const [,left,bottom,scale]=tile;
    m.onBeforeCompile=shader=>{
      shader.uniforms.worldPaperAtlas={value:atlas};
      shader.vertexShader=`varying vec3 mmPaintPos;
        varying vec3 mmPaintNormal;\n`+shader.vertexShader.replace('#include <project_vertex>',`#include <project_vertex>
        mmPaintPos=(modelMatrix*vec4(transformed,1.)).xyz;
        mmPaintNormal=normalize(mat3(modelMatrix)*objectNormal);`);
      shader.fragmentShader=`varying vec3 mmPaintPos;varying vec3 mmPaintNormal;uniform sampler2D worldPaperAtlas;\n`+
        shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
          vec3 p=mmPaintPos;
          vec3 n=abs(mmPaintNormal);
          vec2 uv=n.y>max(n.x,n.z)?p.xz:(n.x>n.z?p.zy:p.xy);
          vec2 tileUV=vec2(${left.toFixed(2)},${bottom.toFixed(2)})+.006+.488*fract(uv*${scale.toFixed(2)});
          vec3 brush=texture2D(worldPaperAtlas,tileUV).rgb;
          diffuseColor.rgb=mix(diffuseColor.rgb,brush,.65);`);
    };
    m.customProgramCacheKey=()=>`mm-paint-${tile[1]}-${tile[2]}-${tile[3]}`;
  });
}
