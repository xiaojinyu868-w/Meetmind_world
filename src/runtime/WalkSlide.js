/**
 * WalkSlide —— live 插值的轻量避障。
 *
 * 快照驱动的人物沿直线逼近目标点，路径可能穿过圆形桌面阻挡（TABLE_BLOCKERS）。
 * 本模块在每帧位移前做一道纯函数防护：下一步会进入某阻挡圆（半径 + margin 裕量）时，
 * 把位移向量投影到该圆的切线方向（绕桌滑行），而不是径直穿模。
 *
 * 特例处理：
 * - 正迎圆心时切线投影趋零会卡死 → 沿切线保持原步长绕行（确定性选边）；
 * - 人物已陷在圆内（快照瞬移/边界抖动）→ 沿径向向外退出；
 * - 目标点本身在阻挡圈内（贴桌座位锚点）且已进入最后 approachRadius 米 → 不避让，
 *   防止人物绕着座位打转、永远无法入座对齐。
 */

const DEFAULT_MARGIN = 0.05;
const DEFAULT_APPROACH_RADIUS = 0.6;

export function slideStepAroundBlockers(
  x,
  z,
  stepX,
  stepZ,
  blockers,
  { margin = DEFAULT_MARGIN, targetX = null, targetZ = null, approachRadius = DEFAULT_APPROACH_RADIUS } = {},
) {
  let sx = stepX;
  let sz = stepZ;
  for (const blocker of blockers ?? []) {
    const radius = (blocker?.radius ?? 0) + margin;
    if (radius <= 0) continue;

    if (targetX !== null && targetZ !== null) {
      const targetDistance = Math.hypot(targetX - blocker.x, targetZ - blocker.z);
      const remaining = Math.hypot(targetX - x, targetZ - z);
      if (targetDistance < radius && remaining < approachRadius) continue;
    }

    const nextDistance = Math.hypot(x + sx - blocker.x, z + sz - blocker.z);
    if (nextDistance >= radius) continue;

    let radialX = x - blocker.x;
    let radialZ = z - blocker.z;
    const radialLength = Math.hypot(radialX, radialZ);
    if (radialLength < 1e-4) {
      radialX = 1;
      radialZ = 0;
    } else {
      radialX /= radialLength;
      radialZ /= radialLength;
    }

    const stepLength = Math.hypot(sx, sz);
    if (stepLength < 1e-8) break;
    if (radialLength < radius - margin) {
      // 已陷在圆内：沿径向向外退出，避免卡死
      sx = radialX * stepLength;
      sz = radialZ * stepLength;
      continue;
    }

    // 切线 = 径向旋转 90°，位移投影到切线上
    const tangentX = -radialZ;
    const tangentZ = radialX;
    const dot = sx * tangentX + sz * tangentZ;
    if (Math.abs(dot) < 1e-4) {
      const side = dot === 0 ? 1 : Math.sign(dot);
      sx = tangentX * stepLength * side;
      sz = tangentZ * stepLength * side;
    } else {
      sx = tangentX * dot;
      sz = tangentZ * dot;
    }
  }
  return [sx, sz];
}
