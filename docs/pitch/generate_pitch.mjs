import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const PptxGenJS = require("/tmp/echoworld-pitch-node/node_modules/pptxgenjs");
const QRCode = require("/tmp/echoworld-pitch-node/node_modules/qrcode");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const OUT_DIR = __dirname;
const OUT_FILE = path.join(OUT_DIR, "EchoWorld_Hackathon_Pitch_20260804.pptx");
const QR_FILE = path.join(OUT_DIR, "assets/echoworld-demo-qr.png");

const DEMO_URL = "https://capture.meetmind.online/echoworld/";
const W = 13.333;
const H = 7.5;

const C = Object.freeze({
  bg: "0A1020",
  bg2: "10182A",
  panel: "151F33",
  panel2: "1B2940",
  white: "F7F8FB",
  text: "E6EAF1",
  muted: "AAB4C5",
  faint: "6F7B90",
  teal: "5FE1C0",
  tealDark: "153B39",
  coral: "FF7964",
  coralDark: "462521",
  gold: "F5BE55",
  goldDark: "44351D",
  sky: "79A7FF",
  skyDark: "1B315A",
  green: "65D38E",
  line: "2A3851",
  black: "000000",
});

const FONT = "Microsoft YaHei";
const ASSETS = Object.freeze({
  groupPhoto: path.join(ROOT, "demo.jpg"),
  hub: path.join(ROOT, "renders/echo_world_hub_town_overview.png"),
  plaza: path.join(ROOT, "renders/echo_world_hub_town_plaza.png"),
  voxels: path.join(ROOT, "renders/photo_characters_voxel_lineup.png"),
  groupUi: path.join(ROOT, "docs/pitch/assets/group_agents_live.png"),
  packageUi: path.join(ROOT, "docs/pitch/assets/person_package_square.png"),
  cafeConcept: path.join(ROOT, "docs/643e66a9db8bcb96a9c3a1af7a1e5b7e.png"),
  stall: path.join(ROOT, "renders/echo_world_market_stall_v2_preview.png"),
  portrait: path.join(ROOT, "public/portraits/person-self.png"),
});

for (const [name, assetPath] of Object.entries(ASSETS)) {
  if (!fs.existsSync(assetPath)) {
    throw new Error(`Missing asset ${name}: ${assetPath}`);
  }
}

const pptx = new PptxGenJS();
pptx.layout = "LAYOUT_WIDE";
pptx.author = "EchoWorld Team";
pptx.company = "EchoWorld";
pptx.subject = "Hackathon pitch deck";
pptx.title = "EchoWorld 相遇世界 - 让每一次相遇，继续发生";
pptx.lang = "zh-CN";
pptx.theme = {
  headFontFace: FONT,
  bodyFontFace: FONT,
  lang: "zh-CN",
};
pptx.defineSlideMaster({
  title: "MAIN",
  background: { color: C.bg },
  objects: [
    {
      line: {
        x: 0.55,
        y: 7.12,
        w: 12.23,
        h: 0,
        line: { color: C.line, transparency: 32, width: 0.7 },
      },
    },
    {
      text: {
        text: "ECHOWORLD · HACKATHON PITCH",
        options: {
          x: 0.6,
          y: 7.18,
          w: 3.5,
          h: 0.18,
          fontFace: FONT,
          fontSize: 5.8,
          bold: true,
          color: C.faint,
          margin: 0,
          charSpacing: 0,
        },
      },
    },
  ],
  slideNumber: {
    x: 12.25,
    y: 7.16,
    w: 0.45,
    h: 0.2,
    color: C.faint,
    fontFace: FONT,
    fontSize: 6,
    align: "right",
    margin: 0,
  },
});

const S = pptx.ShapeType;

function addText(slide, text, x, y, w, h, options = {}) {
  slide.addText(text, {
    x,
    y,
    w,
    h,
    fontFace: FONT,
    fontSize: options.fontSize ?? 18,
    color: options.color ?? C.text,
    bold: options.bold ?? false,
    breakLine: false,
    margin: options.margin ?? 0,
    valign: options.valign ?? "mid",
    align: options.align ?? "left",
    fit: "shrink",
    charSpacing: 0,
    paraSpaceAfterPt: options.paraSpaceAfterPt ?? 0,
    isTextBox: true,
    ...options,
  });
}

function rect(slide, x, y, w, h, fill, radius = 0.12, line = null) {
  slide.addShape(radius ? S.roundRect : S.rect, {
    x,
    y,
    w,
    h,
    rectRadius: radius,
    fill: typeof fill === "string" ? { color: fill } : fill,
    line: line ?? { color: fill?.color ?? fill, transparency: 100 },
  });
}

function line(slide, x, y, w, h, color = C.line, width = 1.2, dash = "solid", begin = null, end = null) {
  slide.addShape(S.line, {
    x,
    y,
    w,
    h,
    line: {
      color,
      width,
      dash,
      beginArrowType: begin ?? "none",
      endArrowType: end ?? "none",
    },
  });
}

function circle(slide, x, y, d, fill, lineColor = null, lineWidth = 0) {
  slide.addShape(S.ellipse, {
    x,
    y,
    w: d,
    h: d,
    fill: typeof fill === "string" ? { color: fill } : fill,
    line: { color: lineColor ?? fill?.color ?? fill, transparency: lineWidth ? 0 : 100, width: lineWidth },
  });
}

function addImage(slide, assetPath, x, y, w, h, options = {}) {
  slide.addImage({
    path: assetPath,
    x,
    y,
    w,
    h,
    sizing: { type: options.fit ?? "cover", w, h },
    // PptxGenJS renders `rounding: true` as an ellipse crop in PowerPoint/Impress.
    // Rounded framing is provided by the surrounding card instead.
    rounding: false,
    transparency: options.transparency ?? 0,
    altText: options.altText ?? path.basename(assetPath),
  });
}

function addTitle(slide, kicker, title, subtitle = "") {
  addText(slide, kicker.toUpperCase(), 0.65, 0.42, 3.8, 0.28, {
    fontSize: 8.5,
    bold: true,
    color: C.teal,
  });
  addText(slide, title, 0.65, 0.76, 12.05, 0.62, {
    fontSize: 27,
    bold: true,
    color: C.white,
  });
  if (subtitle) {
    addText(slide, subtitle, 0.65, 1.37, 11.9, 0.34, {
      fontSize: 11.5,
      color: C.muted,
    });
  }
}

function addPill(slide, text, x, y, w, color, dark, options = {}) {
  rect(slide, x, y, w, options.h ?? 0.32, { color: dark, transparency: options.transparency ?? 0 }, 0.16);
  addText(slide, text, x + 0.08, y + 0.01, w - 0.16, (options.h ?? 0.32) - 0.02, {
    fontSize: options.fontSize ?? 8,
    color,
    bold: options.bold ?? true,
    align: options.align ?? "center",
  });
}

function addNumberBadge(slide, n, x, y, color = C.teal) {
  circle(slide, x, y, 0.34, color);
  addText(slide, String(n), x, y - 0.005, 0.34, 0.34, {
    fontSize: 9,
    bold: true,
    color: C.bg,
    align: "center",
  });
}

function addCard(slide, x, y, w, h, options = {}) {
  rect(
    slide,
    x,
    y,
    w,
    h,
    { color: options.fill ?? C.panel, transparency: options.transparency ?? 0 },
    options.radius ?? 0.12,
    { color: options.line ?? C.line, transparency: options.lineTransparency ?? 30, width: options.lineWidth ?? 0.8 },
  );
}

function addIconGlyph(slide, glyph, x, y, d, color, dark) {
  circle(slide, x, y, d, dark);
  addText(slide, glyph, x, y, d, d, { fontSize: d * 16, bold: true, color, align: "center" });
}

function addNotes(slide, note) {
  slide.addNotes(note);
}

await QRCode.toFile(QR_FILE, DEMO_URL, {
  width: 720,
  margin: 2,
  color: { dark: `#${C.bg}`, light: "#FFFFFF" },
  errorCorrectionLevel: "M",
});

// 01 Cover
{
  const slide = pptx.addSlide();
  slide.background = { color: C.bg };
  addImage(slide, ASSETS.hub, 5.22, 0, 8.11, 7.5, { fit: "cover", altText: "EchoWorld 小镇关系世界" });
  rect(slide, 0, 0, 6.5, 7.5, C.bg, 0);
  rect(slide, 5.2, 0, 2.2, 7.5, { color: C.bg, transparency: 28 }, 0);
  rect(slide, 7.3, 0, 6.03, 7.5, { color: C.bg, transparency: 74 }, 0);
  addPill(slide, "PHYSICAL AI HACKATHON 2026", 0.68, 0.62, 2.66, C.gold, C.goldDark, { fontSize: 7.4 });
  addText(slide, "EchoWorld", 0.68, 1.32, 4.72, 0.82, { fontSize: 41, bold: true, color: C.white });
  addText(slide, "每一次相遇，\n都是宇宙中的一次奇迹", 0.68, 2.17, 5.2, 1.15, {
    fontSize: 24,
    bold: true,
    color: C.teal,
    valign: "top",
  });
  addText(slide, "相遇世界 Encounter World\n把真实相遇封装成 Agent，\n让每一场奇迹都有续章。", 0.7, 3.54, 4.55, 1.15, {
    fontSize: 15,
    color: C.text,
    breakLine: true,
    valign: "top",
    paraSpaceAfterPt: 5,
  });
  line(slide, 0.7, 4.48, 3.7, 0, C.coral, 2.4);
  addText(slide, "一张合照  →  一群 Agent  →  一个共同世界", 0.7, 4.92, 4.7, 0.36, {
    fontSize: 10,
    color: C.muted,
    bold: true,
  });
  addText(slide, "ECHO WORLD · 2026.08", 0.7, 6.73, 2.5, 0.22, { fontSize: 7, color: C.faint, bold: true });
  addNotes(slide, "开场：每一次相遇，都是宇宙中的一次奇迹。我们想做的不是虚无缥缈的元宇宙，而是把黑客松现场的一张合照、一句交谈和一份信任，留在一个可以继续生长的相遇世界里。");
}

// 02 Problem
{
  const slide = pptx.addSlide("MAIN");
  addTitle(slide, "01 · THE MOMENT", "我们轻易加上一个人，却很容易弄丢一个人。", "相遇的光亮只留住一瞬；比赛结束后，关系需要一个可以继续存在的地方。 ");

  const items = [
    { n: "01", title: "黑客松的灯光下", body: "和极客聊架构，和创业者聊产品，和队友分享凌晨的披萨", color: C.gold, dark: C.goldDark },
    { n: "02", title: "比赛结束以后", body: "合照留在相册，微信沉入列表，脸和声音渐渐对不上号", color: C.coral, dark: C.coralDark },
    { n: "03", title: "本来可以继续", body: "不是没有价值，而是缺一个让一群人的相遇继续发生的世界", color: C.teal, dark: C.tealDark },
  ];
  items.forEach((item, i) => {
    const x = 0.7 + i * 4.18;
    addCard(slide, x, 2.1, 3.72, 2.2, { fill: C.panel, line: item.color, lineTransparency: 52 });
    addPill(slide, item.n, x + 0.25, 2.35, 0.52, item.color, item.dark, { fontSize: 8.5 });
    addText(slide, item.title, x + 0.25, 2.91, 3.15, 0.38, { fontSize: 15, bold: true, color: C.white });
    addText(slide, item.body, x + 0.25, 3.41, 3.16, 0.57, { fontSize: 10.5, color: C.muted, valign: "top" });
    if (i < 2) {
      line(slide, x + 3.75, 3.2, 0.36, 0, C.faint, 1.8, "solid", null, "triangle");
    }
  });

  addText(slide, "一张合照，不应该只是相册里的终点。", 0.72, 4.78, 7.1, 0.52, { fontSize: 24, bold: true, color: C.white });
  addText(slide, "它可以成为一群人的共同起点。", 0.72, 5.38, 8.7, 0.45, {
    fontSize: 15,
    color: C.teal,
    bold: true,
  });
  rect(slide, 10.35, 4.7, 2.25, 1.23, { color: C.coralDark, transparency: 8 }, 0.16, { color: C.coral, transparency: 48, width: 0.8 });
  addText(slide, "相册里的合照", 10.58, 4.88, 1.8, 0.3, { fontSize: 11, color: C.coral, bold: true, align: "center" });
  addText(slide, "能不能成为共同世界？", 10.47, 5.29, 2.03, 0.32, { fontSize: 10, color: C.white, bold: true, align: "center" });
  addNotes(slide, "痛点不是用户不会加微信，而是相遇没有被转成可继续的关系。黑客松 48 小时里，大家聊过很多事情，最后也许只留下一张合照。我们要把那张合照从相册里的终点，变成共同世界的起点。");
}

// 03 Group cold start
{
  const slide = pptx.addSlide("MAIN");
  addTitle(slide, "02 · GROUP COLD START", "一张大合照，让一群人的相遇拥有共同的起点。", "不是把每个人塞进通讯录，而是把这场相遇变成一个共享世界。 ");

  addCard(slide, 0.68, 2.02, 4.86, 3.92, { fill: C.panel, line: C.coral, lineTransparency: 40 });
  addImage(slide, ASSETS.groupPhoto, 0.78, 2.12, 4.66, 2.86, { fit: "cover", altText: "黑客松现场团队合照" });
  addPill(slide, "黑客松现场", 0.98, 5.28, 1.06, C.coral, C.coralDark, { fontSize: 7.1 });
  addText(slide, "一张照片里，藏着一群人的关系入口。", 2.18, 5.24, 3.03, 0.36, { fontSize: 10.5, color: C.white, bold: true });

  line(slide, 5.7, 3.92, 0.68, 0, C.teal, 2.4, "solid", null, "triangle");
  addCard(slide, 6.6, 2.02, 5.98, 3.92, { fill: C.panel2, line: C.teal, lineTransparency: 28, lineWidth: 1.1 });
  const groupSteps = [
    { n: "01", title: "识别一群人", body: "从合照里找到每一张脸", color: C.coral, dark: C.coralDark },
    { n: "02", title: "每个人确认自己", body: "姓名、身份、头像与授权边界", color: C.gold, dark: C.goldDark },
    { n: "03", title: "写下第一印象", body: "自评一条 + 同伴互评一条", color: C.sky, dark: C.skyDark },
    { n: "04", title: "进入同一个世界", body: "体素 Agent、共享市集、破冰与圆桌", color: C.teal, dark: C.tealDark },
  ];
  groupSteps.forEach((item, i) => {
    const y = 2.35 + i * 0.77;
    addPill(slide, item.n, 6.92, y, 0.5, item.color, item.dark, { fontSize: 7, h: 0.28 });
    addText(slide, item.title, 7.66, y - 0.01, 1.64, 0.28, { fontSize: 10.5, color: C.white, bold: true });
    addText(slide, item.body, 9.3, y - 0.01, 2.86, 0.29, { fontSize: 8.6, color: C.muted });
  });
  addText(slide, "群体相遇先共享，离场之后再各自生长。", 6.92, 5.52, 5.05, 0.3, { fontSize: 12.2, color: C.teal, bold: true, align: "center" });
  addNotes(slide, "产品最有现场感的入口不是单人录入，而是一张大合照。系统先识别一群人，再由每个人确认自己，互写第一印象，最后一起进入共享空间。这样即使两个人只聊了两句，也能拥有共同的数字起点。");
}

// 04 Shared world loop
{
  const slide = pptx.addSlide("MAIN");
  addTitle(slide, "03 · SHARED WORLD", "从一张合照，到一群人的关系世界。", "共同照片是入口；每个人带着自己的外在与内在信号，继续长出不同的数字回响。 ");

  const steps = [
    { no: 1, title: "拍下合照", sub: "一张照片，整组进入", glyph: "照", color: C.coral, dark: C.coralDark },
    { no: 2, title: "确认身份", sub: "每个人确认自己的脸", glyph: "认", color: C.gold, dark: C.goldDark },
    { no: 3, title: "写第一印象", sub: "自评 + 同伴互评", glyph: "写", color: C.sky, dark: C.skyDark },
    { no: 4, title: "进入共享世界", sub: "市集 / 围炉 / 破冰", glyph: "入", color: C.teal, dark: C.tealDark },
    { no: 5, title: "各自带走世界", sub: "关系继续生长", glyph: "续", color: C.green, dark: "183928" },
  ];

  steps.forEach((step, i) => {
    const x = 0.65 + i * 2.52;
    if (i < steps.length - 1) {
      line(slide, x + 1.82, 3.01, 0.68, 0, C.faint, 1.6, "solid", null, "triangle");
    }
    addCard(slide, x, 2.2, 1.85, 1.95, { fill: C.panel, line: step.color, lineTransparency: 55 });
    addIconGlyph(slide, step.glyph, x + 0.63, 2.5, 0.58, step.color, step.dark);
    addText(slide, step.title, x + 0.16, 3.27, 1.53, 0.3, { fontSize: 12, bold: true, color: C.white, align: "center" });
    addText(slide, step.sub, x + 0.13, 3.66, 1.59, 0.25, { fontSize: 7.9, color: C.muted, align: "center" });
  });

  addCard(slide, 0.66, 4.68, 5.81, 1.14, { fill: "131B2A", line: C.gold, lineTransparency: 60 });
  addPill(slide, "外在数据", 0.92, 4.92, 0.98, C.gold, C.goldDark, { fontSize: 7.6 });
  addText(slide, "视觉 · 音频 · 场景 · 对话", 2.08, 4.87, 3.95, 0.34, { fontSize: 10.5, color: C.text, bold: true });
  addText(slide, "记录我们看见的世界，以及相遇发生的现场。", 2.08, 5.25, 4.06, 0.26, { fontSize: 8.7, color: C.muted });

  addCard(slide, 6.85, 4.68, 5.81, 1.14, { fill: "131B2A", line: C.teal, lineTransparency: 60 });
  addPill(slide, "内在数据", 7.12, 4.92, 0.98, C.teal, C.tealDark, { fontSize: 7.4 });
  addText(slide, "心率 · 呼吸 · 生理唤起", 8.28, 4.87, 4.06, 0.34, { fontSize: 10.5, color: C.text, bold: true });
  addText(slide, "前端只消费聚合视图，不把原始连续样本暴露给世界。", 8.28, 5.25, 4.0, 0.26, { fontSize: 8.7, color: C.muted });

  addText(slide, "共同照片是入口；每个人的数字回响，才是关系世界的生命力。", 1.4, 6.22, 10.55, 0.38, {
    fontSize: 16,
    bold: true,
    color: C.teal,
    align: "center",
  });
  addNotes(slide, "这是一张合照驱动的共享世界闭环：先拍照，确认每个人，再写第一印象，一起进入世界，最后各自带走自己的关系世界。外在数据记录现场，内在数据记录身体与状态的变化；系统只对外提供聚合后的信号视图，避免把生理信号误读成喜欢或关系质量。");
}

// 05 Demo
{
  const slide = pptx.addSlide("MAIN");
  addTitle(slide, "04 · LIVE DEMO", "现场 90 秒：从一张合照到一个共享世界。", "先一起入场，再在同一个世界里破冰、围炉，最后把关系带回每个人的世界。 ");

  const panels = [
    { x: 0.68, w: 2.67, image: ASSETS.groupPhoto, fit: "cover", no: 1, title: "一张合照，识别一群人", sub: "共同现场 · 共同起点" },
    { x: 3.55, w: 2.9, image: ASSETS.packageUi, fit: "cover", no: 2, title: "每个人确认自己", sub: "身份 · 第一印象 · Package" },
    { x: 6.65, w: 2.9, image: ASSETS.groupUi, fit: "cover", no: 3, title: "Agent 进入共享世界", sub: "移动、围炉、联机互动" },
    { x: 9.75, w: 2.9, image: ASSETS.plaza, fit: "cover", no: 4, title: "把世界带回每个人", sub: "播报、关系场域、下一次行动" },
  ];
  panels.forEach((panel) => {
    addCard(slide, panel.x, 1.94, panel.w, 4.37, { fill: C.panel, line: C.line, lineTransparency: 20 });
    addImage(slide, panel.image, panel.x + 0.06, 2.0, panel.w - 0.12, 2.66, { fit: panel.fit, rounding: true, altText: panel.title });
    addNumberBadge(slide, panel.no, panel.x + 0.22, 4.83, [C.coral, C.gold, C.sky, C.teal][panel.no - 1]);
    addText(slide, panel.title, panel.x + 0.68, 4.78, panel.w - 0.87, 0.35, { fontSize: 11.4, bold: true, color: C.white });
    addText(slide, panel.sub, panel.x + 0.22, 5.3, panel.w - 0.44, 0.44, { fontSize: 8.7, color: C.muted, valign: "top" });
  });
  addPill(slide, "DEMO 关键时刻", 0.72, 6.48, 1.34, C.coral, C.coralDark, { fontSize: 7.2 });
  addText(slide, "即使两个人只聊过两句，也能在同一个世界里拥有下一次相遇。", 2.23, 6.42, 9.75, 0.36, {
    fontSize: 13.2,
    color: C.white,
    bold: true,
  });
  addNotes(slide, "现场演示走四步：上传一张合照并识别人脸；每个人确认身份、写下一条第一印象；进入共享市集和篝火广场；最后看播报和关系场域。强调：哪怕两个人只聊了两句，仍然可以在同一个世界里拥有下一次相遇。");
}

// 06 Why 3D
{
  const slide = pptx.addSlide("MAIN");
  addTitle(slide, "05 · WHY 3D", "共同相遇，需要一个共同的世界。", "3D 不是包装：空间决定 Agent 为什么相遇、围绕什么交流，以及关系如何被看见。 ");

  const spaces = [
    { x: 0.68, title: "市集 Bazaar", relation: "人 ↔ 课题 ↔ 人", body: "用展位、作品和项目做陌生人破冰的媒介。", color: C.coral, dark: C.coralDark, image: ASSETS.stall },
    { x: 4.55, title: "咖啡厅 Cafe", relation: "人 ↔ 人", body: "熟人进入一对一、小范围交流与圆桌会议。", color: C.gold, dark: C.goldDark, image: ASSETS.cafeConcept },
    { x: 8.42, title: "关系场域 Field", relation: "我 ↔ TA", body: "共同事件与印象被艺术化为“我与 TA 的关系空间”。", color: C.teal, dark: C.tealDark, image: null },
  ];
  spaces.forEach((space, i) => {
    addCard(slide, space.x, 2.0, 3.55, 3.74, { fill: C.panel, line: space.color, lineTransparency: 42 });
    if (space.image) {
      addImage(slide, space.image, space.x + 0.07, 2.07, 3.41, 1.72, { fit: "cover", rounding: true, altText: space.title });
    } else {
      rect(slide, space.x + 0.07, 2.07, 3.41, 1.72, { color: C.tealDark, transparency: 14 }, 0.1);
      // A small relation-field visualization: shared events become spatial landmarks.
      line(slide, space.x + 0.45, 3.18, 2.62, -0.62, C.teal, 1.2, "dash");
      circle(slide, space.x + 0.42, 3.08, 0.28, C.coral);
      circle(slide, space.x + 2.82, 2.37, 0.34, C.teal);
      circle(slide, space.x + 1.43, 2.5, 0.21, C.gold);
      circle(slide, space.x + 2.0, 3.06, 0.18, C.sky);
      addText(slide, "共同事件", space.x + 1.13, 2.08, 1.1, 0.23, { fontSize: 7, color: C.gold, align: "center", bold: true });
      addText(slide, "我", space.x + 0.43, 3.08, 0.26, 0.26, { fontSize: 7, color: C.bg, align: "center", bold: true });
      addText(slide, "TA", space.x + 2.82, 2.4, 0.34, 0.24, { fontSize: 7, color: C.bg, align: "center", bold: true });
    }
    addText(slide, space.title, space.x + 0.24, 4.02, 2.05, 0.34, { fontSize: 15, bold: true, color: C.white });
    addPill(slide, space.relation, space.x + 2.11, 4.04, 1.17, space.color, space.dark, { fontSize: 6.8 });
    addText(slide, space.body, space.x + 0.24, 4.58, 3.05, 0.64, { fontSize: 10, color: C.muted, valign: "top" });
  });

  addText(slide, "环境既是社交内容，也是交互媒介。", 0.72, 6.1, 5.65, 0.45, { fontSize: 20, bold: true, color: C.white });
  addText(slide, "这就是 EchoWorld 与“把聊天框搬进 3D”之间的区别。", 6.65, 6.14, 5.92, 0.36, { fontSize: 12, color: C.teal, bold: true, align: "right" });
  addNotes(slide, "一群人入场后，需要的不再是六个独立聊天框，而是一个共同世界。市集让人围绕项目发生关系，咖啡厅承载人与人的交流，关系场域表达我与 TA 的共同历史。环境本身就是社交内容和交互入口。");
}

// 07 Architecture
{
  const slide = pptx.addSlide("MAIN");
  addTitle(slide, "06 · TECHNOLOGY", "外在与内在信号，共同进入可信的事件系统。", "视觉、音频与生理聚合形成相遇数据；Agent 提出意图，确定性服务维护世界状态。 ");

  const cols = [
    { x: 0.72, title: "多模态相遇", color: C.coral, dark: C.coralDark, rows: ["视觉 / 音频 / 场景", "心率等生理聚合", "Person + Group Package"] },
    { x: 4.7, title: "Agent 与世界", color: C.teal, dark: C.tealDark, rows: ["Group Onboarding", "Intent + Policy", "World Service / Event Store"] },
    { x: 8.68, title: "3D 与交互", color: C.sky, dark: C.skyDark, rows: ["World Snapshot", "Three.js Runtime", "市集 / 咖啡厅 / 场域"] },
  ];
  cols.forEach((col, i) => {
    addCard(slide, col.x, 2.05, 3.5, 3.44, { fill: C.panel, line: col.color, lineTransparency: 38 });
    addPill(slide, col.title, col.x + 0.25, 2.32, 1.46, col.color, col.dark, { fontSize: 7.8 });
    col.rows.forEach((row, j) => {
      const y = 3.04 + j * 0.71;
      rect(slide, col.x + 0.25, y, 3.0, 0.48, { color: C.bg2, transparency: 4 }, 0.08, { color: C.line, transparency: 48, width: 0.6 });
      circle(slide, col.x + 0.43, y + 0.16, 0.14, col.color);
      addText(slide, row, col.x + 0.7, y + 0.04, 2.33, 0.36, { fontSize: 9.7, color: C.text, bold: j === 2 });
    });
    if (i < 2) {
      line(slide, col.x + 3.5, 3.72, 0.44, 0, C.faint, 2, "solid", null, "triangle");
    }
  });

  addCard(slide, 0.72, 5.84, 12.02, 0.72, { fill: "111A2B", line: C.line, lineTransparency: 36 });
  const rules = [
    { x: 0.98, text: "外在事实只增不改", color: C.gold },
    { x: 3.88, text: "生理信号只给聚合视图", color: C.coral },
    { x: 7.04, text: "快照是前端唯一数据源", color: C.sky },
    { x: 10.09, text: "后端不可用自动降级", color: C.teal },
  ];
  rules.forEach((rule) => {
    circle(slide, rule.x, 6.1, 0.13, rule.color);
    addText(slide, rule.text, rule.x + 0.22, 5.99, 2.25, 0.34, { fontSize: 8.5, color: C.muted, bold: true });
  });
  addNotes(slide, "系统当前同时接外在和内在数据。外在是照片、声音与场景；内在是以人物为单位的生理聚合信号。原始连续样本不进入前端，心率变化只表达生理唤起，不等同于喜欢或关系质量。Agent 只能提出意图，确定性服务执行状态变化。");
}

// 08 Proof
{
  const slide = pptx.addSlide("MAIN");
  addTitle(slide, "07 · PROOF", "我们已经把关键闭环跑起来了。", "这不是概念视频：源码可构建，后端契约有自动化测试，现场路径可直接演示。 ");

  addImage(slide, ASSETS.groupUi, 0.7, 2.03, 6.4, 3.62, { fit: "cover", rounding: true, altText: "EchoWorld 六个 Agent 的现场画面" });
  rect(slide, 0.7, 4.92, 6.4, 0.73, { color: C.bg, transparency: 14 }, 0);
  addText(slide, "真实运行画面 · 6 个 Agent 同场", 0.95, 5.1, 3.8, 0.28, { fontSize: 11, color: C.white, bold: true });

  const metrics = [
    { value: "203", label: "后端测试通过", sub: "1 skipped", color: C.teal, x: 7.45, y: 2.03 },
    { value: "5", label: "人合照实测", sub: "识别 → 确认 → 入场", color: C.coral, x: 10.11, y: 2.03 },
    { value: "2", label: "类相遇信号", sub: "外在数据 + 内在数据", color: C.gold, x: 7.45, y: 3.7 },
    { value: "LIVE", label: "公网 Demo", sub: "手机 / 桌面可访问", color: C.sky, x: 10.11, y: 3.7 },
  ];
  metrics.forEach((m) => {
    addCard(slide, m.x, m.y, 2.3, 1.4, { fill: C.panel, line: m.color, lineTransparency: 45 });
    addText(slide, m.value, m.x + 0.2, m.y + 0.16, 1.9, 0.48, { fontSize: 22, bold: true, color: m.color });
    addText(slide, m.label, m.x + 0.2, m.y + 0.68, 1.9, 0.28, { fontSize: 9.5, bold: true, color: C.white });
    addText(slide, m.sub, m.x + 0.2, m.y + 1.02, 1.9, 0.2, { fontSize: 7.3, color: C.muted });
  });

  addPill(slide, "已贯通", 0.72, 6.08, 0.75, C.teal, C.tealDark, { fontSize: 7.2 });
  addText(slide, "合照入场 · 生理聚合 · 展位 · 圆桌 · 播报 · 第一印象 · 破冰数据回流", 1.66, 6.03, 10.4, 0.34, { fontSize: 11, color: C.text, bold: true });
  addNotes(slide, "当前工作区验证：前端生产构建通过，后端 203 个测试通过、1 个跳过。五人合照的识别、确认和批量入场已经跑通；外在数据、生理聚合、资料包、市集、圆桌、播报和现场房间都在同一条产品路径上。");
}

// 09 Differentiation
{
  const slide = pptx.addSlide("MAIN");
  addTitle(slide, "08 · DIFFERENCE", "我们不创造虚拟关系，我们延续真实相遇。", "线下先见过、整组一起入场、多模态信号可追溯，构成相遇世界的信任起点。 ");

  const headers = ["产品形态", "上下文来源", "是否持续行动", "关系如何表达", "信任冷启动"];
  const rows = [
    ["通讯录 / CRM", "手工字段", "否", "列表与标签", "弱"],
    ["聊天 Agent", "对话窗口", "单 Agent", "会话记录", "纯线上"],
    ["社会模拟", "预设角色", "是", "观察模拟", "不对应真人"],
    ["EchoWorld", "合照 + 多模态相遇", "多 Agent + 事件", "共享世界 + Package", "线下整组入场"],
  ];
  const x0 = 0.72;
  const y0 = 2.05;
  const widths = [2.05, 2.42, 2.25, 2.65, 2.35];
  let x = x0;
  headers.forEach((head, i) => {
    rect(slide, x, y0, widths[i], 0.62, C.panel2, i === 0 ? 0.1 : 0, { color: C.line, transparency: 20, width: 0.65 });
    addText(slide, head, x + 0.08, y0 + 0.08, widths[i] - 0.16, 0.42, { fontSize: 9, bold: true, color: C.muted, align: i ? "center" : "left" });
    x += widths[i];
  });
  rows.forEach((row, r) => {
    x = x0;
    const y = y0 + 0.62 + r * 0.78;
    const isEcho = r === rows.length - 1;
    row.forEach((cell, i) => {
      const fill = isEcho ? (i === 0 ? C.tealDark : "11262C") : r % 2 ? "11192A" : C.bg2;
      rect(slide, x, y, widths[i], 0.78, fill, i === 0 && r === rows.length - 1 ? 0.1 : 0, { color: isEcho ? C.teal : C.line, transparency: isEcho ? 58 : 38, width: 0.7 });
      addText(slide, cell, x + 0.08, y + 0.1, widths[i] - 0.16, 0.53, {
        fontSize: isEcho ? 10.2 : 9.1,
        bold: isEcho || i === 0,
        color: isEcho ? (i === 0 ? C.teal : C.white) : i === 0 ? C.text : C.muted,
        align: i ? "center" : "left",
      });
      x += widths[i];
    });
  });

  addCard(slide, 0.72, 5.78, 12.0, 0.68, { fill: "111A2B", line: C.coral, lineTransparency: 62 });
  addText(slide, "合照让一群人拥有共同起点；多模态数据保留真实；3D 世界让关系继续被看见和操作。", 1.02, 5.92, 11.35, 0.32, {
    fontSize: 11.2,
    color: C.white,
    bold: true,
    align: "center",
  });
  addNotes(slide, "与通讯录相比，我们不是把人排成列表；与聊天 Agent 相比，我们不是纯线上开始；与社会模拟相比，每个 Agent 都对应真实的人和真实相遇。合照让整组拥有共同起点，外在与内在数据让每个人拥有不同的数字回响。");
}

// 10 Go-to-market and flywheel
{
  const slide = pptx.addSlide("MAIN");
  addTitle(slide, "09 · GO TO MARKET", "一场活动，先生成一个共同世界。", "黑客松 / 展会是高密度相遇现场；一张合照就是最低门槛的群体冷启动入口。 ");

  // Flywheel
  circle(slide, 2.62, 2.07, 3.5, { color: C.panel, transparency: 0 }, C.line, 1);
  circle(slide, 3.72, 3.17, 1.3, C.tealDark, C.teal, 1.4);
  addText(slide, "关系\n数据飞轮", 3.72, 3.22, 1.3, 1.12, { fontSize: 13.4, bold: true, color: C.teal, align: "center", valign: "mid" });
  const fly = [
    { x: 3.57, y: 1.69, text: "一张合照入场", color: C.coral },
    { x: 5.11, y: 3.0, text: "互动与信号增长", color: C.gold },
    { x: 3.66, y: 4.91, text: "各自带走世界", color: C.sky },
    { x: 1.53, y: 3.18, text: "重新联系 / 引荐", color: C.green },
  ];
  fly.forEach((f) => {
    circle(slide, f.x, f.y, 0.38, f.color);
    addText(slide, f.text, f.x - 0.46, f.y + 0.48, 1.3, 0.38, { fontSize: 8.1, bold: true, color: C.text, align: "center" });
  });
  line(slide, 4.77, 2.09, 0.58, 0.65, C.faint, 1.2, "dash", null, "triangle");
  line(slide, 5.18, 3.97, -0.65, 0.71, C.faint, 1.2, "dash", null, "triangle");
  line(slide, 3.32, 5.09, -1.1, -0.66, C.faint, 1.2, "dash", null, "triangle");
  line(slide, 1.72, 3.15, 1.48, -0.95, C.faint, 1.2, "dash", null, "triangle");

  // GTM ladder
  addText(slide, "商业切口", 7.2, 2.03, 2.2, 0.36, { fontSize: 16, bold: true, color: C.white });
  const ladder = [
    { y: 2.62, tag: "NOW", title: "活动现场工具", body: "组织方提供合照入场、共享世界和破冰；参会者带走自己的关系世界。", color: C.coral, dark: C.coralDark },
    { y: 3.84, tag: "NEXT", title: "高频社交个人产品", body: "投资人、创业者、BD 让沉睡的相遇重新浮现并触发行动。", color: C.gold, dark: C.goldDark },
    { y: 5.06, tag: "LATER", title: "组织关系知识平台", body: "经授权共享客户与合作网络；按活动 / 席位 / 私有化部署收费。", color: C.teal, dark: C.tealDark },
  ];
  ladder.forEach((item) => {
    addCard(slide, 7.2, item.y, 5.45, 0.98, { fill: C.panel, line: item.color, lineTransparency: 54 });
    addPill(slide, item.tag, 7.43, item.y + 0.25, 0.7, item.color, item.dark, { fontSize: 6.7, h: 0.26 });
    addText(slide, item.title, 8.34, item.y + 0.14, 3.95, 0.29, { fontSize: 11.2, bold: true, color: C.white });
    addText(slide, item.body, 8.34, item.y + 0.47, 3.95, 0.35, { fontSize: 7.7, color: C.muted, valign: "top" });
  });
  addNotes(slide, "切入点不是泛社交，而是黑客松和展会。一张合照让整组同时进入共享世界，破冰和互动继续产生数据；活动结束后，每个人带走自己的关系世界，新的联系和下一场活动让世界继续生长。");
}

// 11 Close
{
  const slide = pptx.addSlide();
  slide.background = { color: C.bg };
  addImage(slide, ASSETS.plaza, 7.22, 0, 6.11, 7.5, { fit: "cover", altText: "EchoWorld 篝火广场" });
  rect(slide, 0, 0, 8.35, 7.5, C.bg, 0);
  rect(slide, 7.18, 0, 1.84, 7.5, { color: C.bg, transparency: 27 }, 0);
  rect(slide, 9.0, 0, 4.33, 7.5, { color: C.bg, transparency: 72 }, 0);
  addPill(slide, "THE NEXT STEP", 0.72, 0.72, 1.35, C.teal, C.tealDark, { fontSize: 7.2 });
  addText(slide, "每一次相遇，\n都是宇宙中的一次奇迹。", 0.72, 1.34, 5.98, 1.15, { fontSize: 28, bold: true, color: C.white, valign: "top" });
  addText(slide, "一张合照，\n可以让一群人的奇迹拥有续章。", 0.72, 2.7, 6.35, 1.34, { fontSize: 27, bold: true, color: C.teal, valign: "top" });
  addText(slide, "现场能力：合照群体入场 · 外在/内在数据 · 共享关系世界", 0.74, 4.38, 5.95, 0.38, { fontSize: 11.2, color: C.muted, bold: true });
  addText(slide, "让相遇不止于相遇，让每一场奇迹都有续章。", 0.74, 5.09, 6.0, 0.46, { fontSize: 17, color: C.white, bold: true });

  rect(slide, 0.72, 5.9, 5.98, 0.76, { color: C.panel2, transparency: 2 }, 0.12, { color: C.line, transparency: 28, width: 0.8 });
  addImage(slide, QR_FILE, 0.9, 6.03, 0.48, 0.48, { fit: "contain", altText: "EchoWorld Demo 二维码" });
  addText(slide, "现场体验", 1.57, 6.03, 0.92, 0.23, { fontSize: 7.4, color: C.teal, bold: true });
  addText(slide, "capture.meetmind.online/echoworld/", 1.57, 6.26, 3.9, 0.22, { fontSize: 8.2, color: C.white, bold: true });
  addNotes(slide, "收尾：每一次相遇，都是宇宙中的一次奇迹。我们不是创造虚假的关系，而是让黑客松的一张合照、一句交谈、一次心跳的变化，进入一个能继续生长的关系世界。让相遇不止于相遇，让每一场奇迹都有续章。");
}

// 12 Appendix: demo runbook
{
  const slide = pptx.addSlide("MAIN");
  addTitle(slide, "APPENDIX A", "现场 Demo 操作卡（90 秒）", "只走关键价值路径；任何一步网络异常都可切回下一张截图。 ");
  const steps = [
    { time: "0–20s", title: "上传一张合照", body: "系统识别每张脸；强调一张照片让整组拥有共同起点。", color: C.coral },
    { time: "20–40s", title: "确认与互写印象", body: "每个人确认自己，写一条自评和对同伴的第一印象。", color: C.gold },
    { time: "40–70s", title: "进入共享世界", body: "展示多人 Agent、聚合心率标记、围炉和破冰互动。", color: C.sky },
    { time: "70–90s", title: "把世界带回个人", body: "打开资料包或关系场域，指出共同事件仍会继续生长。", color: C.teal },
  ];
  steps.forEach((step, i) => {
    const y = 1.98 + i * 1.06;
    addCard(slide, 0.72, y, 7.78, 0.82, { fill: C.panel, line: step.color, lineTransparency: 55 });
    addPill(slide, step.time, 0.98, y + 0.24, 0.76, step.color, i === 0 ? C.coralDark : i === 1 ? C.goldDark : i === 2 ? C.skyDark : C.tealDark, { fontSize: 6.8, h: 0.25 });
    addText(slide, step.title, 1.99, y + 0.12, 1.8, 0.28, { fontSize: 11.4, bold: true, color: C.white });
    addText(slide, step.body, 3.84, y + 0.12, 4.22, 0.45, { fontSize: 8.5, color: C.muted, valign: "top" });
  });
  addCard(slide, 8.85, 1.98, 3.82, 4.01, { fill: C.panel2, line: C.teal, lineTransparency: 45 });
  addImage(slide, QR_FILE, 9.7, 2.36, 2.12, 2.12, { fit: "contain", altText: "EchoWorld Demo 二维码" });
  addText(slide, "演示地址", 9.15, 4.69, 3.25, 0.3, { fontSize: 10.3, bold: true, color: C.teal, align: "center" });
  addText(slide, DEMO_URL, 9.15, 5.1, 3.25, 0.52, { fontSize: 8.4, color: C.white, bold: true, align: "center" });
  addText(slide, "备用：保留第 5 / 8 页截图，网络异常时直接讲关键路径。", 0.75, 6.4, 11.9, 0.3, { fontSize: 10.2, color: C.gold, bold: true, align: "center" });
  addNotes(slide, "内部备用页，不主动展示。演示失败时不要排查网络，直接切回第 5 页讲合照入场流程，再用第 8 页证明工程完成度。");
}

// 13 Appendix: honest scope
{
  const slide = pptx.addSlide("MAIN");
  addTitle(slide, "APPENDIX B", "评委追问时：已完成与下一步的边界", "把工程事实讲清楚，比扩大承诺更有说服力。 ");
  addCard(slide, 0.72, 2.0, 5.77, 3.88, { fill: C.panel, line: C.teal, lineTransparency: 40 });
  addPill(slide, "现在可演示", 1.02, 2.3, 1.18, C.teal, C.tealDark, { fontSize: 7.4 });
  [
    "五人合照 → 识别 → 确认 → 批量入场",
    "外在数据 + 生理聚合信号",
    "市集 / 咖啡厅 / 关系场域",
    "第一印象、破冰、圆桌与世界播报",
    "事实 / 推断 / 信号分层与事件架构",
  ].forEach((t, i) => {
    circle(slide, 1.07, 3.05 + i * 0.48, 0.14, C.teal);
    addText(slide, t, 1.35, 2.94 + i * 0.48, 4.7, 0.34, { fontSize: 9.5, color: C.text, bold: i === 0 });
  });

  addCard(slide, 6.85, 2.0, 5.82, 3.88, { fill: C.panel, line: C.coral, lineTransparency: 40 });
  addPill(slide, "下一步打通", 7.15, 2.3, 1.18, C.coral, C.coralDark, { fontSize: 7.4 });
  [
    "十分钟多人现场走查与网络稳定性",
    "体素人物线上替换后的视觉 QA",
    "生理信号解释与授权提示继续打磨",
    "足够数据后验证价值匹配与行动回流",
    "隐私授权、被记录者确认与组织权限",
  ].forEach((t, i) => {
    circle(slide, 7.2, 3.05 + i * 0.48, 0.14, C.coral);
    addText(slide, t, 7.48, 2.94 + i * 0.48, 4.72, 0.34, { fontSize: 9.5, color: C.text, bold: i === 0 });
  });
  addText(slide, "不宣称“复制真人”；生理信号表达唤起程度，不等同于喜欢或关系质量。", 1.35, 6.27, 10.65, 0.37, { fontSize: 14, bold: true, color: C.gold, align: "center" });
  addNotes(slide, "内部备用页。面对隐私、AI 幻觉和完成度追问，强调当前已有合照入场与外在/内在数据链路；同时讲清楚，生理信号只表示唤起程度，不是情感或医疗结论。");
}

await pptx.writeFile({ fileName: OUT_FILE });
console.log(`Wrote ${OUT_FILE}`);
