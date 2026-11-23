const WIDTH = 1080;
const MARGIN = 70;
const CONTENT = WIDTH - MARGIN * 2;
const PAPER = "#f2ead6";
const INK = "#203b3a";
const RUST = "#b74d31";
const SERIF = '"Songti SC", "Noto Serif CJK SC", "Noto Serif SC", SimSun, Georgia, serif';
const SANS = '"PingFang SC", "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';
const MONO = '"Courier New", monospace';

function line(ctx, points, color, thickness = 1) {
  ctx.strokeStyle = color;
  ctx.lineWidth = thickness;
  ctx.beginPath();
  ctx.moveTo(...points[0]);
  for (const point of points.slice(1)) ctx.lineTo(...point);
  ctx.stroke();
}

function shape(ctx, points, fill) {
  ctx.beginPath();
  ctx.moveTo(...points[0]);
  for (const point of points.slice(1)) ctx.lineTo(...point);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}

function circle(ctx, x, y, radius, color, filled = false) {
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  if (filled) {
    ctx.fillStyle = color;
    ctx.fill();
  } else {
    ctx.strokeStyle = color;
    ctx.stroke();
  }
}

function label(ctx, value, x, y, font, color = INK) {
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.fillText(value, x, y);
}

function randomSource(seed) {
  let state = seed;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function drawPaper(ctx, height) {
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, WIDTH, height);
  const random = randomSource(783);
  for (let i = 0; i < height * 4; i += 1) {
    ctx.fillStyle = i % 2 ? "rgba(90,69,42,.06)" : "rgba(255,255,246,.36)";
    ctx.fillRect(random() * WIDTH, random() * height, 1 + random() * 2, 1);
  }
}

// Draw a two-ink coastal chart. The engraving is resolution independent.
function drawCoast(ctx, x, y, width) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(width / 940, width / 940);
  ctx.beginPath();
  ctx.rect(0, 0, 940, 260);
  ctx.clip();
  ctx.fillStyle = "#244744";
  ctx.fillRect(0, 0, 940, 260);

  for (let col = 0; col < 940; col += 47) line(ctx, [[col, 0], [col, 260]], "#41605a");
  for (let row = 14; row < 260; row += 33) line(ctx, [[0, row], [940, row]], "#41605a");
  const rng = randomSource(5418);
  for (let i = 0; i < 100; i += 1) {
    const sx = rng() * 940;
    const sy = 7 + rng() * 125;
    circle(ctx, sx, sy, rng() * 1.05 + .3, "#c8c3a2", true);
  }
  // An off-centre compass star gives the sky the scale of a nautical chart.
  const cx = 757, cy = 81;
  ctx.lineWidth = 1;
  for (const radius of [26, 32, 45]) circle(ctx, cx, cy, radius, "#90a396");
  for (let i = 0; i < 8; i += 1) {
    const angle = Math.PI * i / 4;
    const length = i % 2 ? 33 : 51;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    shape(ctx, [[0, -3], [length, 0], [0, 0]], "#d4ccab");
    line(ctx, [[0, 3], [length, 0]], "#a8af96");
    ctx.restore();
  }
  circle(ctx, cx, cy, 3.5, "#e5d5ae", true);
  label(ctx, "N", cx - 4, cy - 55, "12px " + MONO, "#c5c5a8");

  // The beam consists of fine parallel cuts, visible in both light and dark ink.
  shape(ctx, [[267, 59], [603, 3], [641, 30], [267, 65]], "#a69b6d");
  for (let i = 0; i < 12; i += 1) {
    line(ctx, [[267, 61 + i * .25], [598 + i * 4, 2 + i * 2.6]], i % 2 ? "#e9cc83" : "#7d8668", .9);
  }

  const distant = [[0, 178], [0, 138], [44, 129], [78, 133], [108, 124], [121, 125], [150, 112],
    [183, 120], [220, 138], [279, 146], [326, 141], [375, 147], [409, 137],
    [444, 141], [503, 121], [520, 122], [546, 110], [572, 117], [604, 113],
    [627, 121], [649, 119], [702, 140], [762, 132], [820, 150], [861, 142], [940, 153], [940, 180]];
  shape(ctx, distant, "#698577");
  shape(ctx, [[0, 169], [102, 159], [173, 163], [230, 155], [330, 172], [428, 157],
    [561, 166], [653, 145], [686, 147], [733, 137], [779, 146], [833, 141], [940, 157], [940, 180], [0, 180]], "#3d675f");

  ctx.fillStyle = "#183f40";
  ctx.fillRect(0, 168, 940, 92);
  for (let row = 0; row < 21; row += 1) {
    const base = 170 + row * 4.55;
    let wx = -35;
    while (wx < 940) {
      const run = 10 + rng() * (22 + row * 3.1);
      const amp = .6 + row * .065;
      const points = [];
      for (let t = 0; t <= 8; t += 1) points.push([wx + run * t / 8, base + Math.sin(t / 8 * Math.PI * 2 + wx / 36) * amp]);
      line(ctx, points, row % 3 === 0 ? "#acc1a7" : "#608a80", row > 15 ? 1.3 : .85);
      wx += run + 2 + rng() * 15;
    }
  }

  // Print the rocky headland and the lighthouse as silhouettes with cut highlights.
  shape(ctx, [[0, 186], [32, 181], [57, 174], [66, 163], [94, 164], [108, 153], [137, 151],
    [161, 135], [206, 128], [237, 135], [272, 128], [294, 140], [310, 141], [322, 152],
    [365, 163], [381, 173], [400, 175], [418, 184], [449, 189], [466, 199], [509, 204],
    [522, 215], [438, 218], [409, 227], [298, 233], [212, 248], [179, 245], [90, 264], [0, 260]], "#172e30");
  for (let i = 0; i < 105; i += 1) {
    const sx = 85 + rng() * 275;
    const ridge = 154 + Math.abs(sx - 218) * .20;
    const sy = ridge + rng() * Math.max(5, (228 - ridge));
    line(ctx, [[sx - 2, sy], [sx + 3, sy - 2], [sx + 13 + rng() * 9, sy - 1 - rng() * 4]], i % 4 ? "#5c796b" : "#adac87", .85);
  }
  shape(ctx, [[241, 133], [251, 73], [269, 73], [278, 135]], "#ddd1a9");
  shape(ctx, [[264, 74], [269, 74], [278, 135], [269, 135]], "#9c9f80");
  shape(ctx, [[246.2, 102], [272.8, 102], [274.9, 115], [244.2, 115]], "#c96741");
  for (let by = 80; by < 134; by += 5) {
    line(ctx, [[262, by], [268 + (by - 72) * .13, by]], "#838c73", .72);
  }
  ctx.fillStyle = "#203e3a";
  ctx.fillRect(253, 87, 3.8, 8);
  ctx.fillRect(253, 124, 4.8, 10);
  ctx.fillStyle = "#dccba1";
  ctx.fillRect(248, 70, 25, 4);
  ctx.fillRect(247, 64, 1.6, 7);
  ctx.fillRect(272, 64, 1.6, 8);
  line(ctx, [[245, 65], [275, 65]], "#e8d6a8", 1.4);
  ctx.fillStyle = "#f6ce79";
  ctx.fillRect(251, 55, 18, 12);
  for (const lx of [251, 256, 264, 269]) line(ctx, [[lx, 54], [lx, 68]], "#233a36", 1.7);
  shape(ctx, [[246, 55], [259, 45], [274, 55]], "#d8c29a");
  line(ctx, [[260, 45], [260, 39]], "#ecd7a0", 1.5);
  shape(ctx, [[190, 132], [190, 117], [213, 113], [225, 119], [225, 135]], "#ccbfa0");
  shape(ctx, [[186, 118], [197, 106], [216, 106], [228, 118]], "#af593a");
  ctx.fillStyle = "#465b4e";
  ctx.fillRect(202, 122, 4, 10);
  ctx.fillRect(215, 122, 4, 5);

  // A small cutter anchors the scale of the lighthouse.
  shape(ctx, [[662, 199], [689, 200], [700, 195], [694, 203], [668, 204]], "#e0c7a2");
  line(ctx, [[682, 199], [682, 168]], "#c8cfac", 1.5);
  shape(ctx, [[679, 171], [679, 195], [665, 195]], "#dbc6a0");
  shape(ctx, [[685, 177], [685, 195], [697, 194]], "#c96d48");
  ctx.restore();
}

function drawPostage(ctx, x, y, dateText) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(.055);
  ctx.fillStyle = "#ce744d";
  ctx.fillRect(0, 0, 107, 113);
  for (let i = 5; i < 110; i += 10) {
    circle(ctx, i, 0, 3.2, PAPER, true);
    circle(ctx, i, 113, 3.2, PAPER, true);
    circle(ctx, 0, i, 3.2, PAPER, true);
    circle(ctx, 107, i, 3.2, PAPER, true);
  }
  ctx.strokeStyle = "#ead7ab";
  ctx.lineWidth = 1;
  ctx.strokeRect(8, 8, 91, 97);
  // Side profile of a flying tern, composed as a two-colour postal engraving.
  shape(ctx, [[14, 62], [39, 54], [23, 28], [44, 41], [56, 51], [73, 36],
    [68, 52], [83, 49], [91, 52], [79, 55], [68, 64], [47, 65], [28, 74], [37, 63]], "#f7e4b9");
  line(ctx, [[27, 32], [45, 48], [53, 54]], "#ac593e", 1.7);
  line(ctx, [[17, 88], [90, 88]], "#e7c595");
  label(ctx, "ECHO POST", 17, 100, "13px " + MONO, "#fff0cd");
  ctx.restore();

  ctx.save();
  ctx.translate(x - 17, y + 94);
  ctx.rotate(-.15);
  ctx.globalAlpha = .79;
  ctx.lineWidth = 1.4;
  circle(ctx, 0, 0, 34, INK);
  circle(ctx, 0, 0, 30, INK);
  label(ctx, "夜 航", -15, -3, "14px " + SERIF);
  line(ctx, [[-24, 2], [24, 2]], INK);
  const stampDate = dateText.match(/\d{1,4}/g)?.slice(0, 3).join(".") || "ECHO";
  ctx.textAlign = "center";
  label(ctx, stampDate, 0, 14, "9px " + MONO);
  for (let i = 0; i < 3; i += 1) {
    const points = Array.from({ length: 26 }, (_, j) => [26 + j * 3, -2 + i * 4 + Math.sin(j / 4) * 2.8]);
    line(ctx, points, INK, 1);
  }
  ctx.restore();
}

function splitLines(ctx, value, width) {
  const lines = [];
  for (const paragraph of value.replace(/\r\n?/g, "\n").split("\n")) {
    let current = "";
    const words = paragraph.match(/[A-Za-z0-9’'-]+|[^A-Za-z0-9’'-]/gu) || [];
    for (const word of words) {
      if (current && ctx.measureText(current + word).width > width) {
        // Keep Chinese closing punctuation with its preceding character.
        const canCarry = /^[，。！？；：、）》」』】…％,.!?]/u.test(word) || /[（《「『【]$/u.test(current);
        const carry = canCarry ? (current.match(/(?:[A-Za-z0-9’'-]+|[^\s])$/u)?.[0] || "") : "";
        if (carry && current.length > carry.length && ctx.measureText(carry + word).width <= width) {
          lines.push(current.slice(0, -carry.length).trimEnd());
          current = carry;
        } else {
          lines.push(current.trimEnd());
          current = "";
        }
      }
      if (!current && /^\s+$/.test(word)) continue;
      if (ctx.measureText(word).width <= width) {
        current += word;
      } else {
        for (const glyph of word) {
          if (current && ctx.measureText(current + glyph).width > width) {
            lines.push(current);
            current = "";
          }
          current += glyph;
        }
      }
    }
    lines.push(current.trimEnd());
  }
  return lines;
}

function textBlock(ctx, value, font, maxWidth, leading) {
  ctx.font = font;
  const lines = splitLines(ctx, value, maxWidth);
  return { font, lines, leading, height: lines.length * leading };
}

function putBlock(ctx, block, x, y, color) {
  ctx.font = block.font;
  ctx.fillStyle = color;
  for (const [index, value] of block.lines.entries()) ctx.fillText(value, x, y + index * block.leading);
}

const clean = (value) => typeof value === "string" ? value.trim() : "";

export async function renderPostcard(fields = {}) {
  await document.fonts?.ready;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("当前浏览器无法绘制明信片");
  const date = clean(fields.date) || new Date().toLocaleDateString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" });
  const heading = textBlock(ctx, clean(fields.title) || "夜航来信", "600 55px " + SERIF, CONTENT - 174, 72);
  const occasion = clean(fields.occasion);
  const subtitle = occasion ? textBlock(ctx, occasion, "27px " + SANS, CONTENT - 178, 41) : null;
  const artY = Math.max(235, 122 + heading.height + (subtitle ? subtitle.height + 17 : 0));
  const blocks = [
    { title: "开场白", value: clean(fields.opening) },
    { title: "会后来信", value: clean(fields.message) },
    { title: "下一步", value: clean(fields.nextStep), accent: true },
  ].filter((item) => item.value).map((item) => ({
    ...item, text: textBlock(ctx, item.value, "32px " + SERIF, CONTENT - 44, 50),
  }));
  let cursor = artY + 290;
  for (const block of blocks) {
    block.y = cursor;
    cursor += block.text.height + 95;
  }
  const logicalHeight = cursor + 104;
  // Stay below Safari canvas limits even for a long letter. Typesetting is in logical units.
  const scale = Math.min(1, 15000 / logicalHeight, Math.sqrt(16000000 / (WIDTH * logicalHeight)));
  canvas.width = Math.ceil(WIDTH * scale);
  canvas.height = Math.ceil(logicalHeight * scale);
  ctx.scale(scale, scale);
  drawPaper(ctx, logicalHeight);
  line(ctx, [[MARGIN, 36], [WIDTH - MARGIN, 36]], INK, 2);
  label(ctx, "ECHOWORLD   /   夜航邮局", MARGIN, 74, "20px " + SANS);
  drawPostage(ctx, WIDTH - MARGIN - 112, 55, date);
  putBlock(ctx, heading, MARGIN, 153, INK);
  if (subtitle) putBlock(ctx, subtitle, MARGIN + 2, 133 + heading.height + 22, "#57645b");
  drawCoast(ctx, MARGIN, artY, CONTENT);
  for (const block of blocks) {
    line(ctx, [[MARGIN, block.y], [WIDTH - MARGIN, block.y]], "#a9aa95", 1);
    if (block.accent) {
      ctx.fillStyle = RUST;
      ctx.fillRect(MARGIN, block.y + 18, 5, 26);
    }
    label(ctx, block.title, MARGIN + (block.accent ? 18 : 0), block.y + 40, "600 24px " + SANS, block.accent ? RUST : "#5b675b");
    putBlock(ctx, block.text, MARGIN + 2, block.y + 92, INK);
  }
  line(ctx, [[MARGIN, cursor + 8], [WIDTH - MARGIN, cursor + 8]], INK, 1.5);
  label(ctx, "ECHO POST", MARGIN, cursor + 49, "21px " + MONO);
  ctx.textAlign = "right";
  ctx.font = "20px " + SANS;
  ctx.fillStyle = "#566258";
  ctx.fillText(date, WIDTH - MARGIN, cursor + 49, CONTENT * .63);
  return canvas;
}

export async function downloadPostcard(fields = {}) {
  const canvas = await renderPostcard(fields);
  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob((result) => result ? resolve(result) : reject(new Error("明信片导出失败，请重试")), "image/png");
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  const name = clean(fields.title).replace(/[\\/:*?"<>|\u0000-\u001F]/g, "").slice(0, 64);
  link.download = `EchoWorld-${name || "夜航来信"}.png`;
  try {
    document.body.append(link);
    link.click();
  } finally {
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
  }
}
