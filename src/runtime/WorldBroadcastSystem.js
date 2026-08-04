import * as THREE from "three";
import "../ui/world-broadcast.css";

function wrapLines(context, text, maxWidth, maxLines) {
  const chars = [...String(text ?? "")];
  const lines = [];
  let line = "";
  for (const char of chars) {
    const candidate = line + char;
    if (line && context.measureText(candidate).width > maxWidth) {
      lines.push(line);
      line = char;
      if (lines.length === maxLines - 1) break;
    } else {
      line = candidate;
    }
  }
  if (line && lines.length < maxLines) lines.push(line);
  const consumed = lines.join("").length;
  if (consumed < chars.length && lines.length) {
    lines[lines.length - 1] = `${lines[lines.length - 1].slice(0, -1)}…`;
  }
  return lines;
}

function drawBoard(canvas, brief) {
  const context = canvas.getContext("2d");
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#153e38";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = "#e6c169";
  context.lineWidth = 10;
  context.strokeRect(18, 18, canvas.width - 36, canvas.height - 36);

  context.fillStyle = "#e6c169";
  context.font = '700 28px "PingFang SC", "Microsoft YaHei", sans-serif';
  context.textAlign = "left";
  context.textBaseline = "top";
  context.fillText("ECHOWORLD  /  今日播报", 58, 52);

  context.fillStyle = "#fffaf0";
  context.font = '800 52px "PingFang SC", "Microsoft YaHei", sans-serif';
  const headline = wrapLines(context, brief?.headline ?? "集市今天安静开门", 900, 2);
  headline.forEach((line, index) => context.fillText(line, 58, 122 + index * 64));

  context.fillStyle = "#cde0d5";
  context.font = '500 29px "PingFang SC", "Microsoft YaHei", sans-serif';
  const summary = wrapLines(context, brief?.summary ?? "走近一段关系，看看今天会发生什么。", 900, 3);
  summary.forEach((line, index) => context.fillText(line, 58, 278 + index * 42));

  context.fillStyle = "#d47a61";
  context.fillRect(58, 460, 94, 8);
  context.fillStyle = "#fffaf0";
  context.font = '600 23px "PingFang SC", "Microsoft YaHei", sans-serif';
  context.fillText(`${brief?.event_count ?? 0} 条近期世界事件`, 174, 446);
}

// 各世界的播报屏摆放（位置随世界不同，结构不变）：
// cafe 挂在吧台侧墙面朝座位区；hall 立在篝火广场东北边缘（Anchor: BROADCAST_POS），
// 双木柱告示牌，面朝街道进广场的方向。
const BROADCAST_PLACEMENTS = Object.freeze({
  cafe: Object.freeze({
    frame: Object.freeze({ x: 1.2, y: 2.44, z: -4.7 }),
    screen: Object.freeze({ x: 1.2, y: 2.44, z: -4.65 }),
    yaw: 0,
    posts: false,
  }),
  hall: Object.freeze({
    frame: Object.freeze({ x: 5.7, y: 1.9, z: 2.8 }),
    screen: Object.freeze({ x: 5.65, y: 1.9, z: 2.8 }),
    yaw: -1.62,
    posts: true,
  }),
});

export class WorldBroadcastSystem {
  constructor({ scene, api, world, showBoard = true }) {
    this.scene = scene;
    this.api = api;
    this.world = world;
    this.showBoard = showBoard;
    this.canvas = document.createElement("canvas");
    this.canvas.width = 1024;
    this.canvas.height = 576;
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.anisotropy = 4;
    this.mesh = null;
    this.brief = null;
    this.element = null;
    drawBoard(this.canvas, null);
    this.texture.needsUpdate = true;
  }

  mount() {
    const placement = BROADCAST_PLACEMENTS[this.world];
    if (!placement) return;
    if (this.showBoard) {
      const frame = new THREE.Mesh(
        new THREE.BoxGeometry(2.64, 1.54, 0.08),
        new THREE.MeshStandardMaterial({ color: "#4d3f34", roughness: 0.92, flatShading: true }),
      );
      frame.name = "WORLD_BroadcastFrame";
      frame.position.set(placement.frame.x, placement.frame.y, placement.frame.z);
      frame.rotation.y = placement.yaw;
      frame.castShadow = true;
      this.scene.add(frame);
      this.frame = frame;

      if (placement.posts) {
        // 立柱式告示牌：两根木柱把屏架离地面（沿屏面法线的垂直方向排布）
        const postMaterial = new THREE.MeshStandardMaterial({ color: "#4d3f34", roughness: 0.92, flatShading: true });
        const tangentX = Math.cos(placement.yaw);
        const tangentZ = -Math.sin(placement.yaw);
        for (const side of [-1, 1]) {
          const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 2.6, 8), postMaterial);
          post.name = `WORLD_BroadcastPost_${side}`;
          post.position.set(
            placement.frame.x + tangentX * side * 1.15,
            1.3,
            placement.frame.z + tangentZ * side * 1.15,
          );
          post.castShadow = true;
          this.scene.add(post);
        }
      }

      this.mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(2.42, 1.34),
        new THREE.MeshBasicMaterial({ map: this.texture, toneMapped: false, side: THREE.FrontSide }),
      );
      this.mesh.name = "WORLD_BroadcastScreen";
      this.mesh.position.set(placement.screen.x, placement.screen.y, placement.screen.z);
      this.mesh.rotation.y = placement.yaw;
      this.scene.add(this.mesh);
    }

    this.element = document.createElement("section");
    this.element.className = "world-brief-strip";
    this.element.setAttribute("aria-live", "polite");
    this.#renderStrip("今日播报", "正在读取世界事件");
    document.body.append(this.element);
    void this.refresh();
  }

  #renderStrip(label, headline) {
    if (!this.element) return;
    this.element.replaceChildren();
    const small = document.createElement("small");
    small.textContent = label;
    const strong = document.createElement("strong");
    strong.textContent = headline;
    this.element.append(small, strong);
  }

  async refresh() {
    if (!BROADCAST_PLACEMENTS[this.world]) return null;
    try {
      this.brief = await this.api.getWorldBrief();
      drawBoard(this.canvas, this.brief);
      this.texture.needsUpdate = true;
      if (this.element) {
        this.#renderStrip(
          `今日播报 · ${this.brief.event_count} 条事件`,
          this.brief.headline,
        );
      }
      return this.brief;
    } catch (error) {
      console.warn("[WorldBroadcast] 晨报读取失败", error);
      if (this.element) this.element.remove();
      this.element = null;
      return null;
    }
  }

  dispose() {
    this.element?.remove();
    if (this.mesh) {
      this.scene.remove(this.mesh);
      this.mesh.geometry.dispose();
      this.mesh.material.dispose();
    }
    const frame = this.scene.getObjectByName("WORLD_BroadcastFrame");
    if (frame) {
      this.scene.remove(frame);
      frame.geometry.dispose();
      frame.material.dispose();
    }
    for (const side of [-1, 1]) {
      const post = this.scene.getObjectByName(`WORLD_BroadcastPost_${side}`);
      if (post) {
        this.scene.remove(post);
        post.geometry.dispose();
        post.material.dispose();
      }
    }
    this.texture.dispose();
  }
}
