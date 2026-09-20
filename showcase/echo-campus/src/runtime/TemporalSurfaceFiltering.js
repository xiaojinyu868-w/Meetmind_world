// Three r185 PCF uses screen-pixel noise to rotate a five-sample disk. The
// pattern crawls over moving architecture. A fixed disk is deterministic in
// shadow-map space and retains hardware bilinear PCF without temporal noise.
export function stablePcfShadowChunk(source) {
  const signature = "float getShadow( sampler2DShadow shadowMap,";
  const start = source.indexOf(signature);
  const biasAt = source.indexOf("shadowCoord.z += shadowBias;", start);
  const rotation = "float phi = interleavedGradientNoise( gl_FragCoord.xy ) * PI2;";
  if (start < 0 || biasAt < start || !source.includes(rotation)) throw new Error("Unsupported Three PCF shader; review upstream implementation before patching");
  const bias = `#ifdef USE_REVERSED_DEPTH_BUFFER
              shadowCoord.z -= shadowBias;
            #else
              shadowCoord.z += shadowBias;
            #endif`;
  let result = source.slice(0, biasAt) + bias + source.slice(biasAt + "shadowCoord.z += shadowBias;".length);
  result = result.replaceAll(rotation, "float phi = 0.0; // Stable shadow-map-space filter orientation");
  return result;
}

// Insert beside ecHash in ArchitecturalMaterials. Cell boundaries are filtered
// over a pixel footprint; subpixel cells fade to their average instead of hash
// flicker. The floor stripe is an analytical periodic box filter with a stable
// average, so distant facades do not acquire disappearing one-pixel bands.
export const FILTERED_GLASS_FUNCTIONS = `
  float ecFilteredPane(vec3 position) {
    vec3 footprint=max(fwidth(position),vec3(.0001));
    vec3 p=position-.5, base=floor(p), local=fract(p);
    vec3 width=min(footprint,vec3(1.));
    vec3 blend=smoothstep(vec3(.5)-width*.5,vec3(.5)+width*.5,local);
    float value=mix(mix(mix(ecHash(base),ecHash(base+vec3(1,0,0)),blend.x),mix(ecHash(base+vec3(0,1,0)),ecHash(base+vec3(1,1,0)),blend.x),blend.y),mix(mix(ecHash(base+vec3(0,0,1)),ecHash(base+vec3(1,0,1)),blend.x),mix(ecHash(base+vec3(0,1,1)),ecHash(base+vec3(1,1,1)),blend.x),blend.y),blend.z);
    float detail=1.-smoothstep(.5,1.25,max(footprint.x,max(footprint.y,footprint.z)));
    return mix(.5,value,detail);
  }
  float ecStripeIntegral(float x,float width) { return floor(x)*width+min(fract(x),width); }
  float ecFilteredFloorBand(float position) {
    float pixel=max(fwidth(position),.0001),halfPixel=pixel*.5;
    float stripe=(ecStripeIntegral(position+halfPixel,.055)-ecStripeIntegral(position-halfPixel,.055))/pixel;
    return 1.-clamp(stripe,0.,1.);
  }
`;

export const FILTERED_GLASS_COLOR = `
  float pane=ecFilteredPane(ecWorld/vec3(1.55,3.65,1.55));
  float floorBand=ecFilteredFloorBand(ecWorld.y/3.65);
  diffuseColor.rgb*=mix(.95,1.035,pane)*mix(.93,1.,floorBand);
  diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.56,.61,.71),.035*pane);
`;

// CPU mirror only of the analytical stripe integral for numerical coverage QA.
export function filteredPeriodicStripe(position, footprint, width = .055) {
  if (![position, footprint, width].every(Number.isFinite) || footprint <= 0 || width < 0 || width > 1) throw new Error("Invalid stripe footprint");
  const integral = x => Math.floor(x) * width + Math.min(x - Math.floor(x), width);
  return Math.max(0, Math.min(1, (integral(position + footprint / 2) - integral(position - footprint / 2)) / footprint));
}
