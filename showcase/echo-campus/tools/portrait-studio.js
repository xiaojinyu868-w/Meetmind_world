// Dev-only: renders persona portraits with the production character runtime.
// Open via `npm run dev` at /tools/portrait-studio.html?persona=zhusha&kind=bust
// window.__renderPortrait() resolves to a transparent WebP data URL.
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { loadCharacterLibrary } from "../src/scenes/PremiumCharacters.js";
import { personaById } from "../src/shared/personas.mjs";

const params = new URLSearchParams(location.search);
const persona = personaById(params.get("persona"));
const kind = params.get("kind") === "full" ? "full" : "bust";
const size = kind === "full" ? { width: 720, height: 1100 } : { width: 512, height: 512 };
const canvas = document.getElementById("studio");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(size.width, size.height, false);
renderer.setClearColor(0x000000, 0);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.55;
const key = new THREE.DirectionalLight(0xffe2bf, 2.6); key.position.set(-2.2, 3.2, 3.4); scene.add(key);
const fill = new THREE.DirectionalLight(0xc6d6ff, 0.9); fill.position.set(3, 1.6, 2.2); scene.add(fill);
const rim = new THREE.DirectionalLight(0xfff1dc, 2.2); rim.position.set(0.5, 2.8, -3.5); scene.add(rim);
scene.add(new THREE.HemisphereLight(0xe8eefc, 0x7a6a5a, 0.55));

window.__renderPortrait = async () => {
  if (!persona) throw new Error("unknown persona");
  const library = await loadCharacterLibrary({ baseUrl: new URL("../", location.href).href, assets: [], allowEmpty: true });
  await library.ensurePersona(persona.id);
  await library.upgradePersona(persona.id);
  const character = library.createPremiumCharacter({ persona: persona.id, color: persona.color, seed: 7, name: persona.codename, presentation: "social" });
  character.root.traverse(object => { if (object.name === "attendee-nfc-badge" || object.name.includes("contact shadow")) object.visible = false; });
  scene.add(character.root);
  character.root.rotation.y = kind === "full" ? -0.32 : -0.24;
  for (let i = 0; i < 40; i++) character.update(0.05, i * 0.05, "idle");
  character.root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(character.root, true);
  const height = box.max.y - box.min.y;
  const camera = new THREE.PerspectiveCamera(kind === "full" ? 24 : 22, size.width / size.height, 0.05, 50);
  if (kind === "full") {
    const centerY = box.min.y + height * 0.5;
    const distance = (height * 0.56) / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    camera.position.set(0, centerY + 0.05, distance);
    camera.lookAt(0, centerY, 0);
  } else {
    // Face slightly above center with headroom for buns, caps and berets.
    const faceY = box.min.y + height * 0.915;
    camera.position.set(0, faceY + 0.02, 1.95);
    camera.lookAt(0, faceY - 0.1, 0);
  }
  renderer.render(scene, camera);
  return canvas.toDataURL("image/webp", 0.9);
};
window.__studioReady = true;
