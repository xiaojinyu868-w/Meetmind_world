/**
 * A hand-built architectural model for the atlas. Geometry is batched by finish
 * and destination so an entire building can be picked without hundreds of draws.
 * Coordinates are in miniature metres, with +Z towards the gallery visitor.
 */
export function buildMiniature(THREE) {
  const root = new THREE.Group();
  root.name = "夜航群岛 · 建筑微缩展品";
  root.rotation.y = 0.42;
  const pickables = [];
  const layers = new Map();
  const shapes = new Map();
  const pigments = new Map();
  let seed = 17823;
  function random() {
    seed = (1664525 * seed + 1013904223) >>> 0;
    return seed / 4294967296;
  }
  const palette = {
    iron: 0x284b4c, verdigris: 0x569083, bronze: 0xa67d48, brass: 0xd9b976,
    stone: 0xc4aba0, ivory: 0xf2d9a9, brick: 0xac654e, wood: 0x986345,
    timber: 0x60463b, warm: 0xffc779, light: 0xffdf9b, pine: 0x345d54,
  };
  const finish = {
    paint: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.87, side: THREE.DoubleSide }),
    metal: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.43, metalness: 0.32, side: THREE.DoubleSide }),
    glass: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.27, metalness: 0.12,
      emissive: 0x73501f, emissiveIntensity: 0.34, transparent: true, opacity: 0.56, depthWrite: false, side: THREE.DoubleSide, forceSinglePass: true }),
    lamp: new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide }),
  };
  let site = null;
  let parent = root;
  function bucket(kind) {
    const key = parent.id + "/" + (site || "land") + "/" + kind;
    if (!layers.has(key)) layers.set(key, { parent, site, kind, points: [], normals: [], colors: [] });
    return layers.get(key);
  }
  function shape(key, factory) {
    if (!shapes.has(key)) shapes.set(key, factory());
    return shapes.get(key);
  }
  function pigment(hex) {
    if (!pigments.has(hex)) pigments.set(hex, new THREE.Color(hex));
    return pigments.get(hex);
  }
  const vec = (x, y, z) => new THREE.Vector3(x, y, z);
  const up = vec(0, 1, 0);
  const identity = new THREE.Quaternion();
  const transform = new THREE.Matrix4();
  const normalMatrix = new THREE.Matrix3();
  const vertex = vec(), normal = vec();
  function solid(geometry, position, scale, color, kind = "paint", rotation = identity) {
    const data = bucket(kind);
    transform.compose(position, rotation, scale);
    normalMatrix.getNormalMatrix(transform);
    const pts = geometry.attributes.position;
    const norms = geometry.attributes.normal;
    const index = geometry.index;
    const count = index ? index.count : pts.count;
    const tint = pigment(color);
    for (let i = 0; i < count; i++) {
      const j = index ? index.getX(i) : i;
      vertex.fromBufferAttribute(pts, j).applyMatrix4(transform);
      normal.fromBufferAttribute(norms, j).applyNormalMatrix(normalMatrix);
      data.points.push(vertex.x, vertex.y, vertex.z);
      data.normals.push(normal.x, normal.y, normal.z);
      data.colors.push(tint.r, tint.g, tint.b);
    }
  }
  function triangle(a, b, c, color, kind = "paint") {
    const data = bucket(kind);
    const n = vec(...b).sub(vec(...a)).cross(vec(...c).sub(vec(...a))).normalize();
    for (const p of [a, b, c]) {
      const tint = pigment(color);
      data.points.push(...p); data.normals.push(n.x, n.y, n.z); data.colors.push(tint.r, tint.g, tint.b);
    }
  }
  function quad(a, b, c, d, color, kind) {
    triangle(a, b, c, color, kind); triangle(a, c, d, color, kind);
  }
  const cube = shape("box", () => new THREE.BoxGeometry(1, 1, 1));
  const rot = (x, y, z) => new THREE.Quaternion().setFromEuler(new THREE.Euler(x, y, z));
  function box(x, y, z, w, h, d, color, kind, rotation) {
    solid(cube, vec(x, y, z), vec(w, h, d), color, kind, rotation);
  }
  function cylinder(x, y, z, top, bottom, height, color, sides = 12, kind = "paint") {
    const ratio = Number((top / bottom).toFixed(4));
    const geom = shape("cyl/" + sides + "/" + ratio, () => new THREE.CylinderGeometry(ratio, 1, 1, sides));
    solid(geom, vec(x, y, z), vec(bottom, height, bottom), color, kind);
  }
  const rodShape = shape("rod", () => new THREE.CylinderGeometry(1, 1, 1, 5));
  function rod(a, b, radius, color, kind = "metal") {
    const av = vec(...a), bv = vec(...b), delta = bv.clone().sub(av);
    const distance = delta.length();
    if (!distance) return;
    const orientation = new THREE.Quaternion().setFromUnitVectors(up, delta.normalize());
    solid(rodShape, av.add(bv).multiplyScalar(0.5), vec(radius, distance, radius), color, kind, orientation);
  }
  const nugget = shape("nugget", () => new THREE.IcosahedronGeometry(1, 0));
  function gem(x, y, z, sx, sy, sz, color, kind, yaw = 0) {
    solid(nugget, vec(x, y, z), vec(sx, sy, sz), color, kind, rot(0, yaw, 0));
  }
  const tau = 2 * Math.PI;
  function chain(points, r, color, kind) {
    for (let i = 1; i < points.length; i++) rod(points[i - 1], points[i], r, color, kind);
  }
  function circle(cx, y, cz, r, sides = 24) {
    return Array.from({ length: sides + 1 }, (_, i) => {
      const a = i * tau / sides;
      return [cx + r * Math.cos(a), y, cz + r * Math.sin(a)];
    });
  }
  function skirt(cx, cz, rx, rz, top, count) {
    const angles = Array.from({ length: count }, (_, i) => i * tau / count);
    const periphery = angles.map(() => 0.94 + random() * 0.1);
    const strata = [
      [0.68, -0.80], [0.84, -0.59], [0.95, -0.19], [1, top - 0.21], [0.985, top - 0.09], [0.965, top],
    ];
    const geology = [
      [0x354950, 0x45595d, 0x374b4f], [0x4d5959, 0x52676a, 0x586265],
      [0x597174, 0x626563, 0x687b7a], [0x8f826d, 0x697575, 0xab927a],
      [0x8c917c, 0x9d9680, 0x7a8877],
    ];
    const rings = strata.map(([rad, y], j) => angles.map((a, i) => {
      const ripple = j < 3 ? 0.97 + random() * 0.07 : 1;
      return [cx + rx * periphery[i] * rad * ripple * Math.cos(a), y + (j < 3 ? 0.1 * random() : 0),
        cz + rz * periphery[i] * rad * ripple * Math.sin(a)];
    }));
    for (let j = 1; j < rings.length; j++) {
      const colors = geology[j - 1];
      for (let i = 0; i < count; i++) {
        const next = (i + 1) % count;
        const a = rings[j - 1][i], b = rings[j][i], c = rings[j][next], d = rings[j - 1][next];
        triangle(a,b,c,colors[Math.floor(random() * 3)]);
        triangle(a,c,d,colors[Math.floor(random() * 3)]);
      }
    }
    const topRing = rings.at(-1);
    for (let i = 0; i < count; i++) {
      triangle([cx,top,cz],topRing[(i+1)%count],topRing[i],i%4 ? 0x88957a : 0x929c81);
      if (i%3 === 1) {
        const a = angles[i], p = periphery[i];
        gem(cx + rx * p * 0.97 * Math.cos(a), -0.32, cz + rz * p * 0.97 * Math.sin(a),
          0.22 + random() * 0.3, 0.41, 0.26, [0x516363,0x6e7971,0x515e60][i%3], "paint", a);
      }
    }
  }

  const garden = { x: 0, z: -1.42, ground: 0.51 };
  const forum = { x: -5.32, z: 0.82, ground: 0.37 };
  const post = { x: 5.06, z: 1.18, ground: 0.44 };
  skirt(garden.x, garden.z, 3.82, 2.74, garden.ground, 41);
  skirt(forum.x, forum.z, 1.98, 1.83, forum.ground, 29);
  skirt(post.x, post.z, 2.08, 1.92, post.ground, 31);

  function flagpole(x, z, floor, height, color) {
    rod([x,floor,z],[x,floor+height,z],0.022,palette.brass);
    gem(x,floor+height,z,0.046,0.06,0.046,palette.brass,"metal");
    quad([x,floor+height-0.07,z],[x+0.23,floor+height-0.03,z+0.03],
      [x+0.23,floor+height-0.22,z+0.03],[x,floor+height-0.27,z],color);
    triangle([x+0.23,floor+height-0.03,z+0.03],[x+0.5,floor+height-0.09,z-0.02],
      [x+0.23,floor+height-0.22,z+0.03],color);
  }
  function railing(a, b, height, count, radius = 0.022) {
    for (let i = 0; i <= count; i++) {
      const t = i / count, x = a[0]+(b[0]-a[0])*t, z = a[2]+(b[2]-a[2])*t, y=a[1]+(b[1]-a[1])*t;
      rod([x,y,z],[x,y+height,z],radius,palette.iron);
      if (i === 0 || i === count) gem(x,y+height+0.025,z,0.039,0.039,0.039,palette.brass,"metal");
    }
    for (const h of [0.47,1]) rod([a[0],a[1]+height*h,a[2]],[b[0],b[1]+height*h,b[2]],radius*0.68,palette.brass);
  }
  function lantern(x, y, z, size = 1) {
    cylinder(x,y,z,0.08*size,0.075*size,0.19*size,palette.light,6,"lamp");
    cylinder(x,y+0.13*size,z,0.025*size,0.115*size,0.09*size,palette.iron,6,"metal");
    cylinder(x,y-0.12*size,z,0.09*size,0.055*size,0.045*size,palette.bronze,6,"metal");
  }
  function streetLamp(x,y,z,height=1.05) {
    cylinder(x,y+0.08,z,0.055,0.079,0.16,palette.iron,8);
    rod([x,y,z],[x,y+height,z],0.025,palette.iron);
    lantern(x,y+height+0.07,z,0.86);
  }
  function stool(x,y,z,size,seat=0xb77c4e) {
    cylinder(x,y+0.22*size,z,0.16*size,0.16*size,0.054*size,seat,10);
    for (let j=0;j<3;j++) {
      const a=j*tau/3;
      rod([x+0.14*size*Math.cos(a),y,z+0.14*size*Math.sin(a)],
        [x+0.094*size*Math.cos(a),y+0.22*size,z+0.094*size*Math.sin(a)],0.018*size,palette.iron);
    }
  }
  function cafeTable(x,y,z,s) {
    cylinder(x,y+0.39*s,z,0.30*s,0.30*s,0.06*s,0xca9568,16);
    cylinder(x,y+0.19*s,z,0.035*s,0.045*s,0.35*s,palette.iron,8);
    cylinder(x,y+0.038*s,z,0.13*s,0.2*s,0.055*s,palette.iron,8);
    cylinder(x-0.09*s,y+0.45*s,z,0.035*s,0.026*s,0.061*s,palette.ivory,8);
    box(x+0.08*s,y+0.425*s,z,0.11*s,0.012*s,0.16*s,0x71867c);
  }
  function person(x,y,z,h,coat,yaw=0) {
    const bits = [
      [-0.067,.17,0,.102,.33,.13,0x3d4a50],[.067,.17,0,.102,.33,.13,0x354449],
      [0,.52,0,.29,.37,.155,coat],[-.182,.5,0,.083,.3,.12,coat],[.182,.5,0,.083,.3,.12,coat],
      [0,.82,0,.216,.235,.195,0xc69269],[0,.935,-.013,.225,.075,.204,0x443a34],
    ];
    for (const [dx,dy,dz,w,hh,d,col] of bits) {
      box(x+h*(dx*Math.cos(yaw)+dz*Math.sin(yaw)),y+h*dy,z+h*(dz*Math.cos(yaw)-dx*Math.sin(yaw)),
        w*h,hh*h,d*h,col,"paint",rot(0,yaw,0));
    }
  }
  function cypress(x,y,z,h,color=0x4c7360) {
    rod([x,y,z],[x,y+h*0.77,z],h*0.035,0x725944,"paint");
    for(let i=0;i<4;i++) {
      const r=h*(0.21-i*0.026);
      const sphere = shape("foliage", () => new THREE.IcosahedronGeometry(1,1));
      solid(sphere,vec(x+0.038*Math.sin(i*2),y+h*(0.4+i*0.14),z),vec(r,h*(0.24-i*0.022),r*0.86),
        i===3 ? 0x748565 : color,"paint",rot(0,i+random(),0));
    }
  }
  function coastPine(x,y,z,h,angle) {
    const dx=Math.cos(angle)*h*0.17,dz=Math.sin(angle)*h*0.17;
    const elbow=[x+dx*0.29,y+h*0.47,z+dz*0.29], crown=[x+dx,y+h*0.84,z+dz];
    rod([x,y,z],elbow,h*0.044,0x735b48,"paint");rod(elbow,crown,h*0.034,0x79624b,"paint");
    const foliage=shape("foliage",()=>new THREE.IcosahedronGeometry(1,1));
    for(let j=0;j<8;j++) {
      const a=j*2.39+angle, near=j<4, r=h*(near?0.23:0.15);
      const px=crown[0]+r*Math.cos(a),pz=crown[2]+r*Math.sin(a), py=y+h*(near?0.69+0.065*j:0.84+0.029*(j-4));
      rod(elbow,[px,py,pz],h*0.016,0x715941,"paint");
      solid(foliage,vec(px,py,pz),vec(h*(near?0.25:0.22),h*0.095,h*(near?0.21:0.17)),
        [0x476c59,0x51735e,0x5d765c,0x698264][j%4],"paint",rot(0,a,0));
    }
  }
  function tussock(x,y,z,s=1) {
    for(let i=0;i<6;i++) {
      const a=i*2.39; const h=(0.13+random()*0.18)*s;
      const dx=Math.cos(a), dz=Math.sin(a);
      triangle([x-0.017*dz*s,y,z+0.017*dx*s],[x+0.017*dz*s,y,z-0.017*dx*s],
        [x+0.13*s*dx,y+h,z+0.13*s*dz],i%2?0xb9a065:0x8a945f);
    }
  }

  // The palm house has three vaults. The high central dome is assembled from
  // individual panes, with iron ribs following the same profiles as the glass.
  site = "garden";
  const gy = garden.ground, gz = garden.z;
  const base = gy + 0.25, drum = 2.26, radius = 1.67, bays = 16;
  cylinder(0,gy+0.08,gz,1.91,1.97,0.16,0xa2927f,20);
  cylinder(0,gy+0.18,gz,1.77,1.85,0.12,0xe2cca4,20);
  cylinder(0,base+0.08,gz,1.70,1.72,0.16,palette.brick,16);
  cylinder(0,base+0.19,gz,1.72,1.73,0.06,0xd3b58d,16);
  const centralPoint = (a,r,y) => [r*Math.cos(a),y,gz+r*Math.sin(a)];
  const paneColors = [0x72b2a7,0x8fc2b3,0x7eb4aa,0x79a89d,0xb0cbb4,0x68a9a3];
  for (let i=0;i<bays;i++) {
    const lo=i*tau/bays, hi=(i+1)*tau/bays;
    const a=centralPoint(lo,radius,base+0.23), b=centralPoint(hi,radius,base+0.23);
    const c=centralPoint(hi,radius,drum), d=centralPoint(lo,radius,drum);
    quad(a,b,c,d,i%5===3?0xd3b481:paneColors[i%6],"glass");
    rod(a,d,0.057,palette.iron);
    for (const y of [base+0.29,base+0.81,drum-0.14,drum]) {
      rod(centralPoint(lo,radius+0.012,y),centralPoint(hi,radius+0.012,y),y===drum?0.047:0.019,
        y===drum ? palette.brass : palette.verdigris);
    }
    rod(centralPoint((lo+hi)/2,radius*0.984,base+0.23),
      centralPoint((lo+hi)/2,radius*0.984,drum-0.14),0.015,palette.verdigris);
    const foot=centralPoint(lo,radius,base+0.34);
    cylinder(foot[0],foot[1],foot[2],0.075,0.098,0.24,0xc7ad82,8);
    const capital=centralPoint(lo,radius,drum-0.11);
    cylinder(capital[0],capital[1],capital[2],0.095,0.047,0.12,palette.brass,8,"metal");
  }
  const domeProfile = [[radius,drum],[1.75,2.36],[1.72,2.60],[1.60,2.90],
    [1.40,3.20],[1.15,3.47],[0.88,3.68],[0.60,3.85],[0.36,3.97],[0.24,4.04]];
  for(let i=0;i<bays;i++) {
    const lo=i*tau/bays,hi=(i+1)*tau/bays, mid=(lo+hi)/2;
    for(let j=1;j<domeProfile.length;j++) {
      const [r0,y0]=domeProfile[j-1], [r1,y1]=domeProfile[j];
      const a=centralPoint(lo,r0,y0), b=centralPoint(hi,r0,y0), c=centralPoint(hi,r1,y1), d=centralPoint(lo,r1,y1);
      quad(a,b,c,d,paneColors[(i*3+j%3)%paneColors.length],"glass");
      rod(a,d,j===1?0.041:0.029,palette.iron);
      rod(d,c,j===1||j===5?0.030:0.015,j===1||j===5?palette.brass:palette.verdigris);
      if (j<=5) rod(centralPoint(mid,r0*0.985,y0),centralPoint(mid,r1*0.985,y1),0.010,0x77a596);
    }
  }
  cylinder(0,4.06,gz,0.255,0.29,0.115,palette.brass,12,"metal");
  cylinder(0,4.21,gz,0.166,0.17,0.22,0xffcf82,10,"lamp");
  for (let i=0;i<8;i++) {
    const a=i*tau/8;
    rod(centralPoint(a,0.17,4.10),centralPoint(a,0.17,4.33),0.018,palette.iron);
  }
  cylinder(0,4.38,gz,0.06,0.25,0.15,palette.verdigris,12,"metal");
  gem(0,4.52,gz,0.083,0.10,0.083,palette.brass,"metal");
  // A miniature armillary sphere doubles as a wind vane and the palm house crest.
  const orrery=new THREE.Group();orrery.position.set(0,4.78,gz);root.add(orrery);parent=orrery;
  gem(0,0,0,0.106,0.106,0.106,0xffdd9a,"lamp");
  for(const tilt of [-0.61,0.62]) {
    const rim=[];
    for(let k=0;k<=24;k++) {
      const a=k*tau/24;
      rim.push([0.30*Math.cos(a),0.30*Math.sin(a)*Math.cos(tilt),0.30*Math.sin(a)*Math.sin(tilt)]);
    }
    chain(rim,0.016,palette.brass);
  }
  chain(circle(0,0,0,0.31,24),0.010,0xc09b5d);
  gem(-0.27,0.09,0.07,0.046,0.046,0.046,palette.ivory);
  gem(0.24,-0.14,0.08,0.037,0.037,0.037,0xd88b58,"metal");
  parent=root;
  // A stepped amber chandelier is visible through the dark glass at night.
  for(const [height,r,bulbs] of [[2.46,0.76,7],[2.73,0.48,5]]) {
    chain(circle(0,height,gz,r,bulbs*2),0.021,palette.brass);
    for(let j=0;j<bulbs;j++) {
      const a=tau*j/bulbs+0.19,x=r*Math.cos(a),z=gz+r*Math.sin(a);
      rod([0,3.32,gz],[x,height,z],0.011,palette.bronze);
      rod([x,height,z],[x,height-0.10,z],0.013,palette.brass);
      gem(x,height-0.16,z,0.073,0.087,0.073,0xffcc81,"lamp");
    }
  }

  // Inside the glazing: hanging leaf clusters, a round reading table and gold
  // pendant lights give the building a second silhouette when viewed up close.
  for (let i=0;i<5;i++) {
    const a=i*tau/5, x=1.09*Math.cos(a), z=gz+1.09*Math.sin(a);
    cylinder(x,base+0.19,z,0.19,0.14,0.29,0x9c6044,8);
    rod([x,base+0.32,z],[x-0.05,base+0.99,z],0.028,0x715e3e);
    for(let j=0;j<7;j++) {
      const aa=j*tau/7+i;
      const tx=x+0.43*Math.cos(aa),tz=z+0.43*Math.sin(aa);
      const top=base+1+0.16*Math.sin(aa);
      triangle([x-0.05,top,z],[tx+0.1*Math.sin(aa),top+0.13,tz-0.1*Math.cos(aa)],[tx,top-0.11,tz],0x728f55);
      triangle([x-0.05,top,z],[tx,top-0.11,tz],[tx-0.1*Math.sin(aa),top+0.10,tz+0.1*Math.cos(aa)],0x507958);
    }
    rod([x,2.64,z],[x,2.26,z],0.009,palette.bronze);
    lantern(x,2.17,z,0.92);
  }
  cafeTable(0,base,gz,1.65);
  for (const x of [-0.58,0.61]) stool(x,base,gz+0.16,1.12,0xc5774e);

  for(const sign of [-1,1]) {
    const x=sign*2.06,z=gz-0.12;
    box(x,gy+0.1,z,1.68,0.2,1.98,0xaa967f);
    box(x,gy+0.24,z,1.60,0.12,1.87,palette.ivory);
    box(x,gy+0.40,z,1.54,0.26,1.78,palette.brick);
    const sill=gy+0.53, eave=gy+1.38, depth=0.88, half=0.76;
    box(x,(sill+eave)/2,z,1.47,eave-sill,1.74,0x93afa0,"glass");
    for (const along of [-1,0,1]) {
      box(x+along*half,(sill+eave)/2,z+depth,0.052,eave-sill,0.06,palette.iron,"metal");
      box(x+along*half,(sill+eave)/2,z-depth,0.052,eave-sill,0.06,palette.iron,"metal");
    }
    for(const zz of [z-depth,z+depth]) {
      box(x,eave,zz,1.64,0.066,0.09,palette.brass,"metal");
      box(x,eave-0.24,zz,1.50,0.025,0.04,palette.verdigris,"metal");
      box(x,sill,zz,1.60,0.066,0.09,palette.ivory);
    }
    for(let i=0;i<8;i++) {
      const a=i*Math.PI/8,b=(i+1)*Math.PI/8;
      const cross=(xx,az)=>[xx,eave+0.63*Math.sin(az),z+depth*Math.cos(az)];
      const a0=cross(x-half,a),a1=cross(x+half,a),b0=cross(x-half,b),b1=cross(x+half,b);
      quad(a0,a1,b1,b0,paneColors[(i+2)%6],"glass");
      for (const step of [x-half,x,x+half]) rod(cross(step,a),cross(step,b),0.022,palette.iron);
      if (i%2===0) rod(a0,a1,0.019,palette.verdigris);
      const xx=x+sign*half;
      triangle([xx,eave,z],cross(xx,a),cross(xx,b),0xb9c7a3,"glass");
    }
    lantern(x,gy+1.05,z+0.17,1.18);
  }
  // A copper-framed arched portico projects from the front glazed drum.
  const porticoZ=gz+1.68, width=0.47, spring=1.61;
  for (let i=0;i<=11;i++) {
    const a=i*Math.PI/12,b=(i+1)*Math.PI/12;
    const point=(t,r,z)=>[r*Math.cos(t),spring+r*Math.sin(t),z];
    const z=porticoZ+0.15;
    quad(point(a,width,z),point(b,width,z),point(b,width+0.12,z),point(a,width+0.12,z),
      i%2?0xd6c09c:0xc1a88b);
    quad(point(a,width+0.12,z),point(b,width+0.12,z),point(b,width+0.12,z-0.25),point(a,width+0.12,z-0.25),0x9a997f);
    triangle([0,spring,z-0.02],point(a,width,z-0.02),point(b,width,z-0.02),0xd8ac70,"glass");
  }
  for(const sign of [-1,1]) {
    box(sign*0.535,(base+spring)/2,porticoZ+0.03,0.13,spring-base,0.25,0xc3b597);
    box(sign*0.241,base+0.42,porticoZ+0.06,0.434,0.83,0.08,0x3e6960);
    box(sign*0.241,base+0.56,porticoZ+0.103,0.319,0.40,0.012,0xf1be76,"lamp");
    box(sign*0.241,base+0.55,porticoZ+0.112,0.018,0.40,0.012,palette.bronze);
    box(sign*0.241,base+0.54,porticoZ+0.112,0.322,0.018,0.012,palette.bronze);
    lantern(sign*0.73,1.64,porticoZ-0.01,0.82);
  }
  for (let i=0;i<3;i++) {
    box(0,gy+0.037*(3-i),porticoZ+0.17+i*0.16,1.46+0.06*i,0.068*(3-i),0.33,0xd6c3a4);
  }
  cypress(-2.91,gy,gz-0.10,1.14); cypress(2.99,gy,gz-0.1,1.43);
  coastPine(-2.33,gy,gz-1.27,2.44,2.8); coastPine(1.95,gy,gz-1.61,2.34,0.6);
  // The two crescent beds are planted along the visitor's path, clear of the door.
  function flower(x,y,z,h,color) {
    const dx=0.043*Math.sin(x*9.1),dz=0.045*Math.cos(z*11.3);
    rod([x,y,z],[x+dx,y+h,z+dz],0.009,0x67835d,"paint");
    gem(x+dx,y+h,z+dz,0.056,0.037,0.050,color,"paint",x+z);
    gem(x+dx*0.3+0.034,y+h*0.54,z+dz*0.6,0.051,0.019,0.027,0x6e935f);
  }
  for(const sign of [-1,1]) {
    for(let i=0;i<11;i++) {
      const a=0.21+i*0.096,x=sign*(1.03+1.50*Math.cos(a)),z=gz+0.61+1.23*Math.sin(a);
      gem(x,gy+0.05,z,0.19,0.12,0.14,[0x5e7e5d,0x658662,0x788f63][i%3],"paint",a);
      if(i%2===0) {
        for(let j=0;j<3;j++) flower(x+(j-1)*0.094,gy+0.07,z+0.05*Math.cos(j*4),
          0.11+0.06*random(),[0xedaf62,0xd88b68,0xeee1a3][(j+i)%3]);
      }
    }
    for(let row=0;row<2;row++) {
      for(let j=0;j<7;j++) {
        const x=sign*(1.34+0.20*j);
        box(x,gy+0.35+row*0.10,gz+0.781,0.173,0.063,0.022,
          [0xa56c53,0xc28161,0xcd9671][(j+row)%3]);
      }
    }
  }
  for(let i=0;i<13;i++) {
    const a=i*tau/13, r=0.90;
    tussock(3.59*r*Math.cos(a),gy,gz+2.65*r*Math.sin(a),0.75+random()*0.32);
  }

  // A striped lighthouse looks over the roundtable. Its glazed lantern revolves
  // as one independent group; no mesh or material allocation is needed per frame.
  site = "forum";
  const fx=forum.x-0.28,fz=forum.z-0.53,fy=forum.ground;
  cylinder(fx,fy+0.11,fz,0.72,0.78,0.22,0x8e8073,12);
  cylinder(fx,fy+0.24,fz,0.65,0.68,0.12,0xdac39c,12);
  const towerBands = [
    [0.30,0.99,0.58,0.52,0xdecda9],[0.99,1.48,0.52,0.479,0xb76a51],
    [1.48,2.28,0.479,0.416,0xe0d3ac],[2.28,2.68,0.416,0.385,0xac644d],
    [2.68,3.02,0.385,0.36,0xe1d1ac],
  ];
  for (const [lo,hi,bottom,top,color] of towerBands) {
    cylinder(fx,fy+(lo+hi)/2,fz,top,bottom,hi-lo,color,16);
  }
  function towerWindow(angle,y,r) {
    const place=(rr)=>[fx+rr*Math.sin(angle),fz+rr*Math.cos(angle)];
    let [x,z]=place(r+0.003);
    box(x,fy+y,z,0.16,0.25,0.048,palette.iron,"metal",rot(0,angle,0));
    [x,z]=place(r+0.035);
    box(x,fy+y,z,0.092,0.172,0.012,palette.warm,"lamp",rot(0,angle,0));
  }
  towerWindow(0.23,0.76,0.55);towerWindow(0.79,1.82,0.46);towerWindow(0.1,2.72,0.396);
  cylinder(fx,fy+3.05,fz,0.54,0.38,0.13,palette.brick,16);
  cylinder(fx,fy+3.16,fz,0.58,0.58,0.09,palette.iron,16,"metal");
  const walkY=fy+3.2;
  chain(circle(fx,walkY+0.22,fz,0.53,16),0.019,palette.brass);
  for(let i=0;i<16;i++) {
    const a=i*tau/16;
    rod([fx+0.53*Math.cos(a),walkY,fz+0.53*Math.sin(a)],
      [fx+0.53*Math.cos(a),walkY+0.22,fz+0.53*Math.sin(a)],0.014,palette.iron);
  }
  cylinder(fx,walkY+0.32,fz,0.35,0.35,0.60,0xffd99c,10,"glass");
  for(let i=0;i<8;i++) {
    const a=i*tau/8;
    rod([fx+0.355*Math.cos(a),walkY+0.02,fz+0.355*Math.sin(a)],
      [fx+0.355*Math.cos(a),walkY+0.64,fz+0.355*Math.sin(a)],0.027,palette.iron);
  }
  cylinder(fx,walkY+0.65,fz,0.43,0.43,0.058,palette.brass,12,"metal");
  cylinder(fx,walkY+0.82,fz,0.075,0.47,0.32,0x874a38,12);
  rod([fx,walkY+0.90,fz],[fx,walkY+1.22,fz],0.023,palette.iron);
  gem(fx,walkY+1.12,fz,0.061,0.061,0.061,palette.brass,"metal");
  const lens=new THREE.Group(); lens.position.set(fx,walkY+0.34,fz); root.add(lens); parent=lens;
  cylinder(0,0,0,0.12,0.12,0.34,0xffcb77,16,"lamp");
  for(let i=0;i<6;i++) cylinder(0,-0.135+i*0.054,0,0.112,0.153,0.032,0xffe6b8,16,"lamp");
  box(0,0,-0.15,0.23,0.37,0.024,palette.brass,"metal");
  parent=root;
  const roundX=forum.x+0.05,roundZ=forum.z+0.86;
  cylinder(roundX,fy+0.058,roundZ,0.85,0.88,0.116,0xbd9b78,16);
  cafeTable(roundX,fy+0.12,roundZ,1.25);
  for(let j=0;j<4;j++) {
    const a=(j+0.25)*tau/4;
    stool(roundX+0.52*Math.cos(a),fy+0.12,roundZ+0.52*Math.sin(a),1.0,0x8f6650);
  }
  person(forum.x+0.7,fy,forum.z+0.13,0.58,0x8099a0,-0.65);
  cypress(forum.x-1.12,fy,forum.z-0.48,1.21);
  coastPine(forum.x+0.64,fy,forum.z-0.99,1.63,-0.6);
  streetLamp(forum.x-0.91,fy,roundZ,0.75);
  flagpole(forum.x-1.45,forum.z+0.69,fy,1.32,0xd07b4a);
  for(let j=0;j<8;j++) {
    const a=j*tau/8;
    tussock(forum.x+1.59*Math.cos(a),fy,forum.z+1.44*Math.sin(a),0.93);
  }

  // Tidal post office. Ceramic pantiles, a mail slot and the brass envelope
  // hanging perpendicular to the wall keep it recognisable from the orbit.
  site="post";
  const px=post.x,pz=post.z-0.22,py=post.ground;
  function roof(x,z,y,w,d,rise,tiles,roofColor) {
    const ridge=[x,y+rise,z];
    for(const sign of [-1,1]) {
      const outer=x+sign*w/2;
      quad([outer,y,z+d/2],[x,ridge[1],z+d/2],[x,ridge[1],z-d/2],[outer,y,z-d/2],roofColor);
      box(outer,y-0.032,z,0.072,0.08,d,palette.timber);
      for(let j=1;j<tiles;j++) {
        const t=j/tiles,xx=x+sign*w/2*t,yy=y+rise*(1-t)+0.01;
        rod([xx,yy,z-d/2],[xx,yy,z+d/2],0.019,0x935d46,"paint");
        for(let k=1;k<6;k++) {
          const zz=z-d/2+d*((k+(j%2)*0.34)/6);
          rod([xx,yy,zz],[xx+sign*w/2/tiles,yy-rise/tiles,zz],0.009,0xc48762,"paint");
        }
      }
    }
    rod([x,y+rise+0.023,z-d/2-0.01],[x,y+rise+0.023,z+d/2+0.01],0.043,0xc88e65,"paint");
    for(const zz of [z-d/2,z+d/2]) {
      triangle([x-w/2+0.05,y,zz],[x+w/2-0.05,y,zz],[x,y+rise-0.03,zz],0xbd9c76);
      for(const sign of [-1,1]) rod([x+sign*w/2,y,zz],[x,y+rise,zz],0.035,palette.timber,"paint");
    }
  }
  function windowFrame(x,y,z,w,h) {
    box(x,y,z,w,h,0.063,palette.iron);
    box(x,y,z+0.038,w-0.076,h-0.08,0.018,palette.warm,"lamp");
    box(x,y,z+0.055,0.031,h-0.074,0.020,palette.bronze);
    box(x,y+h*0.12,z+0.055,w-0.073,0.026,0.020,palette.bronze);
    box(x,y-h/2-0.029,z+0.045,w+0.086,0.064,0.14,0xd2b68f);
  }
  box(px,py+0.09,pz,2.04,0.19,1.52,0x9d8475);
  box(px,py+0.71,pz,1.92,1.18,1.40,0xccb087);
  box(px,py+0.30,pz,1.96,0.11,1.44,0xa57658);
  box(px,py+1.30,pz,2.02,0.10,1.49,palette.iron);
  for (const k of [-1,1]) {
    for (const dz of [-0.68,0.68]) box(px+0.92*k,py+0.77,pz+dz,0.085,1.07,0.085,palette.verdigris);
    for(let row=0;row<3;row++) {
      const xx=px+k*0.85;
      box(xx,py+0.27+row*0.14,pz+0.71,row%2===1?0.14:0.23,0.071,0.023,row%2?0xba9773:0xb28a69);
    }
  }
  roof(px,pz,py+1.34,2.2,1.74,0.91,6,0xac6145);
  box(px-0.56,py+1.93,pz-0.37,0.27,0.66,0.28,0x9b715a);
  box(px-0.56,py+2.26,pz-0.37,0.34,0.09,0.35,0xc19872);
  cylinder(px-0.56,py+2.37,pz-0.37,0.082,0.081,0.19,0x745d4c,9);
  // Clock dial on the gable, with two fixed brass hands.
  const clockFace=shape("clock",()=>new THREE.CylinderGeometry(1,1,1,24));
  solid(clockFace,vec(px,py+1.68,pz+0.895),vec(0.205,0.046,0.205),palette.iron,"metal",rot(Math.PI/2,0,0));
  solid(clockFace,vec(px,py+1.68,pz+0.923),vec(0.163,0.018,0.163),0xffd38c,"lamp",rot(Math.PI/2,0,0));
  rod([px,py+1.68,pz+0.937],[px+0.062,py+1.768,pz+0.937],0.013,palette.iron);
  rod([px,py+1.68,pz+0.937],[px-0.096,py+1.72,pz+0.937],0.011,palette.iron);
  windowFrame(px-0.48,py+0.84,pz+0.716,0.51,0.54);
  box(px+0.38,py+0.65,pz+0.716,0.51,0.96,0.066,palette.iron);
  box(px+0.38,py+0.86,pz+0.757,0.36,0.37,0.025,0xe6be81,"lamp");
  box(px+0.38,py+0.85,pz+0.776,0.029,0.37,0.018,palette.brass);
  for(let j=0;j<3;j++) box(px+0.38,py+0.31+j*0.083,pz+0.76,0.34,0.034,0.024,0x548174);
  gem(px+0.54,py+0.60,pz+0.79,0.031,0.033,0.025,palette.brass,"metal");
  for(let j=0;j<3;j++) box(px+0.38,py+0.029*(3-j),pz+0.82+j*0.108,0.78,0.054*(3-j),0.23,0xc6a582);
  const awningRot=rot(0.19,0,0);
  for(let j=0;j<9;j++) {
    const x=px-0.87+j*0.123;
    box(x,py+1.28,pz+0.92,0.124,0.039,0.47,j%2?0xd9bf8c:0x528477,"paint",awningRot);
    box(x,py+1.195,pz+1.147,0.124,0.105,0.026,j%2?0xd9bf8c:0x528477);
  }
  lantern(px+0.76,py+1.10,pz+0.78,0.74);
  // Wall brackets, letterbox red and an envelope emblem on the freestanding sign.
  rod([px+1.00,py+1.31,pz+0.46],[px+1.45,py+1.31,pz+0.46],0.028,palette.iron);
  rod([px+1.00,py+1.10,pz+0.46],[px+1.29,py+1.31,pz+0.46],0.018,palette.iron);
  for(const x of [px+1.13,px+1.40]) rod([x,py+1.31,pz+0.46],[x,py+1.19,pz+0.46],0.009,palette.brass);
  box(px+1.27,py+1.06,pz+0.46,0.40,0.26,0.045,palette.iron);
  const envZ=pz+0.492;
  box(px+1.27,py+1.06,envZ,0.31,0.174,0.016,0xf6cd83);
  chain([[px+1.12,py+1.136,envZ+0.014],[px+1.27,py+1.035,envZ+0.014],[px+1.42,py+1.136,envZ+0.014]],
    0.013,palette.bronze);
  const mbx=px-0.97,mbz=pz+0.99;
  cylinder(mbx,py+0.35,mbz,0.15,0.14,0.60,0xae503c,12);
  cylinder(mbx,py+0.67,mbz,0.06,0.17,0.105,0xb96048,12);
  box(mbx,py+0.52,mbz+0.14,0.154,0.066,0.019,palette.iron);
  box(mbx,py+0.39,mbz+0.14,0.095,0.07,0.019,palette.ivory);
  // Parcels await the courier on the side of the porch. Cotton straps and folded
  // envelopes are geometric marks, so they remain legible without a texture load.
  for(const [x,z,w,h,d] of [[px-0.78,pz+0.83,0.33,0.19,0.26],[px-0.62,pz+1.04,0.21,0.115,0.18]]) {
    box(x,py+h/2+0.02,z,w,h,d,0xba9066);
    box(x+0.023,py+h/2+0.02,z,0.019,h+0.012,d+0.012,0xe7c999);
    box(x,py+h+0.035,z-0.015,w*0.64,0.014,d*0.68,0xf8deb4,"paint",rot(0,0.22,0));
    gem(x+0.013,py+h+0.046,z,0.024,0.010,0.018,0xc56c4d);
  }
  for(let j=0;j<9;j++) {
    const x=px+0.67+j*0.079,z=pz+1.38+0.07*Math.sin(j*2);
    flower(x,py,z,0.14+random()*0.12,j%3?0xeead63:0xeac987);
  }
  cypress(px+1.18,py,pz-0.70,1.56);
  coastPine(px-0.71,py,pz-0.96,1.70,0.33);
  person(px+0.97,py,pz+0.86,0.57,0x7a858c,1.32);
  flagpole(px-1.45,pz-0.36,py,1.5,0xb16a4c);
  for(let j=0;j<7;j++) { const a=j*tau/7; tussock(px+1.7*Math.cos(a),py,pz+1.64*Math.sin(a)); }

  site=null;
  function bridge(a,b,width,lights) {
    const dx=b[0]-a[0], dz=b[2]-a[2], length=Math.hypot(dx,dz);
    const orientation=rot(0,Math.atan2(dx,dz),0);
    const rightX=dz/length,rightZ=-dx/length;
    function at(t,side=0,extra=0) {
      return [a[0]+dx*t+rightX*side,a[1]+(b[1]-a[1])*t+0.13*Math.sin(Math.PI*t)+extra,a[2]+dz*t+rightZ*side];
    }
    const steps=Math.ceil(length/0.13);
    for(let j=0;j<steps;j++) {
      const p=at((j+0.5)/steps);
      box(...p,width+random()*0.022,0.065,length/steps-0.008,[0xa67c58,0xb18b64,0xa07a59,0xb89771][j%4],"paint",orientation);
    }
    for(const sign of [-1,1]) {
      const side=width*0.44*sign;
      for(let j=0;j<4;j++) {
        const p=at(j/3,side);
        cylinder(p[0],p[1]-0.37,p[2],0.042,0.061,1.05,palette.timber,8);
        const h=(lights && sign<0 && (j===0||j===3))?0.92:0.31;
        rod(p,at(j/3,side,h),0.031,palette.timber,"paint");
        if (j>0) {
          chain([at((j-1)/3,side,0.30),at((j-0.5)/3,side,0.23),at(j/3,side,0.30)],0.014,palette.brass);
        }
      }
      if (lights&&sign<0) {
        const pts=Array.from({length:13},(_,j)=>at(j/12,side,0.92-0.21*Math.sin(j*Math.PI/12)));
        chain(pts,0.011,palette.iron);
        for(let j=1;j<12;j+=2) {
          const [x,y,z]=pts[j];
          rod([x,y,z],[x,y-0.08,z],0.008,palette.iron);
          gem(x,y-0.09,z,0.035,0.044,0.035,palette.light,"lamp");
        }
      }
    }
  }
  bridge([-2.73,gy+0.02,-0.23],[-3.96,fy+0.04,0.67],0.57,true);
  bridge([2.82,gy+0.02,-0.18],[3.83,py+0.04,0.69],0.56,true);
  // Timber jetty and homeward courier, silhouetted against the paper sailboat.
  const dockX=-0.83,dockY=0.43;
  for(let i=0;i<16;i++) {
    const z=0.80+i*0.115;
    box(dockX,dockY,z,0.82+0.02*Math.sin(i),0.072,0.109,[0x9b775a,0xaf8a66,0x916c53][i%3]);
  }
  for(const xx of [dockX-0.34,dockX+0.34]) {
    box(xx,dockY-0.09,1.62,0.092,0.13,1.99,palette.timber);
    for(const z of [0.88,1.74,2.44]) {
      cylinder(xx,dockY-0.31,z,0.056,0.076,1.18,0x715a46,8);
      cylinder(xx,dockY+0.2,z,0.073,0.074,0.035,palette.bronze,8);
    }
  }
  railing([dockX-0.35,dockY,0.88],[dockX-0.35,dockY,1.75],0.36,3);
  for(const xx of [dockX-0.18,dockX+0.10]) rod([xx,dockY+0.08,2.51],[xx,-0.33,2.55],0.025,palette.brass);
  for(let j=0;j<4;j++) rod([dockX-0.18,dockY-0.04-j*0.13,2.52],[dockX+0.10,dockY-0.04-j*0.13,2.52],0.019,palette.brass);
  site="post";
  const courierX=dockX-0.04,courierZ=2.08,cy=dockY+0.043;
  for(const sign of [-1,1]) {
    box(courierX+sign*0.071,cy+0.12,courierZ,0.09,0.24,0.12,0x384847);
    box(courierX+sign*0.071,cy+0.044,courierZ+0.021,0.113,0.087,0.184,0x493c35);
  }
  cylinder(courierX,cy+0.43,courierZ,0.143,0.248,0.47,0xe65e39,7);
  triangle([courierX-0.085,cy+0.62,courierZ+0.15],[courierX+0.16,cy+0.20,courierZ+0.18],
    [courierX-0.16,cy+0.25,courierZ+0.205],0xf48145);
  box(courierX+0.025,cy+0.729,courierZ+0.006,0.214,0.2,0.19,0xe4b88c);
  cylinder(courierX,cy+0.841,courierZ,0.197,0.22,0.038,0xbe4f36,10);
  cylinder(courierX-0.017,cy+0.894,courierZ,0.107,0.16,0.10,0xe97345,8);
  rod([courierX+0.13,cy+0.57,courierZ+0.02],[courierX+0.31,cy+0.535,courierZ+0.07],0.053,0xf17b4c,"paint");
  gem(courierX+0.325,cy+0.53,courierZ+0.08,0.055,0.048,0.05,0xe4b88c);
  rod([courierX+0.33,cy+0.53,courierZ+0.08],[courierX+0.33,cy+0.40,courierZ+0.08],0.015,palette.brass);
  lantern(courierX+0.33,cy+0.31,courierZ+0.08,0.99);
  rod([courierX-0.13,cy+0.61,courierZ+0.10],[courierX+0.13,cy+0.29,courierZ+0.17],0.024,0x5b463b,"paint");
  box(courierX+0.15,cy+0.27,courierZ+0.07,0.126,0.17,0.16,0x875c3f);

  const skiff=new THREE.Group();skiff.position.set(-0.15,-0.13,2.67);root.add(skiff);parent=skiff;
  const bow=[-0.90,0.38,0], stern=[0.87,0.30,0], keel=[0,-0.09,0];
  for(const sign of [-1,1]) {
    const edge=[0,0.22,sign*0.33], lower=[0,0.002,sign*0.20];
    triangle(bow,edge,lower,sign>0?0xf0dfb9:0xc3bca2);
    triangle(lower,edge,stern,sign>0?0xd2c6ad:0xafae9e);
    triangle(bow,lower,keel,0xb5b7a3);triangle(keel,lower,stern,0xc0beab);
    triangle(bow,[-0.38,0.14,0],edge,0xf6ead3);triangle(edge,[0.36,0.13,0],stern,0xe7d9bd);
    triangle([-0.38,0.14,0],edge,[0.36,0.13,0],0xcebd9c);
  }
  const peak=[0.08,1.39,0], fold=[-0.27,0.59,0.13], heel=[0.075,0.30,0];
  triangle(peak,[-0.68,0.39,0],fold,0xffe8b9);triangle(peak,fold,heel,0xdfd5b8);
  triangle([-0.68,0.39,0],heel,fold,0xf0dbb6);
  triangle([0.11,1.19,-0.015],[0.13,0.31,-0.015],[0.62,0.40,-0.015],0xf2e0bc);
  rod([0.08,0.14,0],[0.08,1.42,0],0.013,palette.bronze);
  triangle([0.08,1.43,0],[0.35,1.38,0.018],[0.08,1.32,0],0xeb7753);
  parent=root;site=null;
  chain([[dockX+0.34,0.58,2.43],[-0.53,0.10,2.54],[-0.68,0.14,2.62]],0.013,0x998666);

  // A flock cut from tiny folded triangles gives a sense of air and scale.
  const flock=new THREE.Group();flock.position.set(2.35,3.93,-2.75);root.add(flock);parent=flock;
  for(const [x,y,z,s] of [[0,0,0,0.78],[0.58,0.25,0.32,0.60],[1.09,0.13,-0.19,0.50]]) {
    for(const side of [-1,1]) {
      const body=[x,y,z],elbow=[x+side*0.14*s,y+0.10*s,z-0.03*s],tail=[x,y,z+0.09*s];
      triangle(body,elbow,tail,0xc4c1a6);triangle(elbow,[x+side*0.37*s,y+0.15*s,z+0.06*s],tail,0xe1d7b7);
    }
  }
  parent=root;

  let triangles=0;
  for(const data of layers.values()) {
    const geometry=new THREE.BufferGeometry();
    geometry.setAttribute("position",new THREE.Float32BufferAttribute(data.points,3));
    geometry.setAttribute("normal",new THREE.Float32BufferAttribute(data.normals,3));
    geometry.setAttribute("color",new THREE.Float32BufferAttribute(data.colors,3));
    geometry.computeBoundingSphere();
    const mesh=new THREE.Mesh(geometry,finish[data.kind]);
    mesh.name=(data.site||"shore")+"-"+data.kind;
    mesh.castShadow=data.kind==="paint"||data.kind==="metal";
    mesh.receiveShadow=data.kind!=="lamp";
    if(data.site) {mesh.userData.stop=data.site;pickables.push(mesh);}
    if(data.kind==="glass") mesh.renderOrder=2;
    data.parent.add(mesh);
    triangles+=geometry.attributes.position.count/3;
  }
  for(const geom of shapes.values()) geom.dispose();
  layers.clear();shapes.clear();pigments.clear();
  root.userData.triangles=triangles;
  root.updateMatrixWorld(true);
  const anchors={
    garden:root.localToWorld(vec(garden.x,2.0,garden.z)),
    forum:root.localToWorld(vec(forum.x,1.94,forum.z)),
    post:root.localToWorld(vec(post.x,1.40,post.z)),
  };
  function animate(timeSeconds) {
    lens.rotation.y=timeSeconds*0.46;
    orrery.rotation.y=timeSeconds*0.12;
    skiff.rotation.y=-0.28+0.018*Math.sin(timeSeconds*0.38);
    skiff.rotation.z=0.034*Math.sin(timeSeconds*0.89+0.7);
    skiff.rotation.x=0.028*Math.sin(timeSeconds*0.67);
    skiff.position.y=-0.13+0.032*Math.sin(timeSeconds*0.81);
    flock.position.y=3.93+0.073*Math.sin(timeSeconds*0.48);
    flock.rotation.y=0.18*Math.sin(timeSeconds*0.29);
  }
  animate(0);
  return {object:root,anchors,pickables,animate,boat:skiff};
}
