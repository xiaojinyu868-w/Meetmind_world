const DEMO_CAPTURE_DATE = "2026-08-03";

function freezeSignal(signal) {
  Object.freeze(signal.heart);
  Object.freeze(signal.metrics);
  Object.freeze(signal.inference);
  Object.freeze(signal.iceBreak);
  Object.freeze(signal.sourceRefs);
  return Object.freeze(signal);
}

export const personSignals = Object.freeze([
  freezeSignal({
    schemaVersion: "person-signal.v1",
    personId: "lin-che",
    capturedAt: `${DEMO_CAPTURE_DATE}T14:32:18+08:00`,
    status: "live",
    heart: {
      currentBpm: 88,
      baselineBpm: 72,
      peakBpm: 101,
      heartScore: 82,
      trend: "rising",
      explanation: "当前心率高于近 30 分钟基线，心动值较高；这表示唤起程度上升，不等同于喜欢。",
    },
    metrics: {
      breathingRate: 17.2,
      stressIndex: 61,
      skinTemperature: 33.4,
      hrv: 39,
    },
    inference: {
      label: "积极投入",
      summary: "心率与呼吸较基线升高，可能正在集中注意当前交流。",
      confidence: 0.78,
      caveat: "也可能受走动、咖啡因或环境温度影响；该标签是 AI 推测，不是情感事实。",
    },
    iceBreak: {
      detected: true,
      at: `${DEMO_CAPTURE_DATE}T14:30:42+08:00`,
      breakSeconds: 104,
      reliability: "high",
    },
    sourceRefs: {
      encounterId: "demo-encounter-lin-che-0803",
      heartStreamId: "demo-ring-hr-lin-che-0803",
      historicalBatchId: "demo-ring-history-lin-che-0803",
      visionTrackId: "demo-vision-lin-che-0803",
      audioSegmentId: "demo-audio-lin-che-0803",
    },
  }),
  freezeSignal({
    schemaVersion: "person-signal.v1",
    personId: "zhou-ning",
    capturedAt: `${DEMO_CAPTURE_DATE}T14:31:54+08:00`,
    status: "live",
    heart: {
      currentBpm: 76,
      baselineBpm: 70,
      peakBpm: 89,
      heartScore: 64,
      trend: "steady",
      explanation: "当前心率略高于个人基线，心动值处于中段，整体变化较平稳。",
    },
    metrics: {
      breathingRate: 14.8,
      stressIndex: 35,
      skinTemperature: 34.1,
      hrv: 56,
    },
    inference: {
      label: "轻松熟悉",
      summary: "心率接近基线，历史 HRV 较高，可能处于相对放松的交流状态。",
      confidence: 0.84,
      caveat: "HRV 与呼吸率是最近一批历史值，不能代表此刻状态，也不能证明特定情感。",
    },
    iceBreak: {
      detected: true,
      at: `${DEMO_CAPTURE_DATE}T14:29:16+08:00`,
      breakSeconds: 72,
      reliability: "high",
    },
    sourceRefs: {
      encounterId: "demo-encounter-zhou-ning-0803",
      heartStreamId: "demo-ring-hr-zhou-ning-0803",
      historicalBatchId: "demo-ring-history-zhou-ning-0803",
      visionTrackId: "demo-vision-zhou-ning-0803",
      audioSegmentId: "demo-audio-zhou-ning-0803",
    },
  }),
  freezeSignal({
    schemaVersion: "person-signal.v1",
    personId: "chen-mo",
    capturedAt: `${DEMO_CAPTURE_DATE}T14:32:11+08:00`,
    status: "live",
    heart: {
      currentBpm: 94,
      baselineBpm: 73,
      peakBpm: 106,
      heartScore: 91,
      trend: "rising",
      explanation: "当前心率明显高于个人基线，心动值很高；前端应强化心脏跳动，但不推断其原因。",
    },
    metrics: {
      breathingRate: 19.1,
      stressIndex: 74,
      skinTemperature: 32.9,
      hrv: 31,
    },
    inference: {
      label: "明显唤起",
      summary: "当前心率升幅明显，历史辅助指标也提示紧张或兴奋的可能。",
      confidence: 0.71,
      caveat: "运动、饮料和传感器接触不稳都可能造成类似变化，需要 ACC 与场景信息排除干扰。",
    },
    iceBreak: {
      detected: false,
      at: null,
      breakSeconds: null,
      reliability: "low",
    },
    sourceRefs: {
      encounterId: "demo-encounter-chen-mo-0803",
      heartStreamId: "demo-ring-hr-chen-mo-0803",
      historicalBatchId: "demo-ring-history-chen-mo-0803",
      visionTrackId: "demo-vision-chen-mo-0803",
      audioSegmentId: "demo-audio-chen-mo-0803",
    },
  }),
  freezeSignal({
    schemaVersion: "person-signal.v1",
    personId: "xu-an",
    capturedAt: `${DEMO_CAPTURE_DATE}T14:31:47+08:00`,
    status: "live",
    heart: {
      currentBpm: 69,
      baselineBpm: 69,
      peakBpm: 84,
      heartScore: 47,
      trend: "falling",
      explanation: "当前心率已经回落到基线附近，心动值偏低，跳动动画应逐渐放缓。",
    },
    metrics: {
      breathingRate: 13.6,
      stressIndex: 24,
      skinTemperature: 34.3,
      hrv: 63,
    },
    inference: {
      label: "逐渐放松",
      summary: "峰值后心率已稳定回落，可能刚刚跨过一次破冰拐点。",
      confidence: 0.89,
      caveat: "“破冰”是对 HR 回落拐点的产品化表达，不表示关系一定改善。",
    },
    iceBreak: {
      detected: true,
      at: `${DEMO_CAPTURE_DATE}T14:31:30+08:00`,
      breakSeconds: 138,
      reliability: "high",
    },
    sourceRefs: {
      encounterId: "demo-encounter-xu-an-0803",
      heartStreamId: "demo-ring-hr-xu-an-0803",
      historicalBatchId: "demo-ring-history-xu-an-0803",
      visionTrackId: "demo-vision-xu-an-0803",
      audioSegmentId: "demo-audio-xu-an-0803",
    },
  }),
  freezeSignal({
    schemaVersion: "person-signal.v1",
    personId: "su-he",
    capturedAt: `${DEMO_CAPTURE_DATE}T14:32:03+08:00`,
    status: "live",
    heart: {
      currentBpm: 81,
      baselineBpm: 71,
      peakBpm: 94,
      heartScore: 73,
      trend: "steady",
      explanation: "当前心率温和高于基线，心动值较高但走势稳定，适合使用中速心跳动画。",
    },
    metrics: {
      breathingRate: 15.9,
      stressIndex: 46,
      skinTemperature: 33.8,
      hrv: 48,
    },
    inference: {
      label: "温和投入",
      summary: "生理变化存在但不剧烈，可能是专注、好奇或正常交谈造成。",
      confidence: 0.68,
      caveat: "当前证据不足以区分好感、好奇与普通社交投入，请只作提示。",
    },
    iceBreak: {
      detected: true,
      at: `${DEMO_CAPTURE_DATE}T14:30:08+08:00`,
      breakSeconds: 165,
      reliability: "medium",
    },
    sourceRefs: {
      encounterId: "demo-encounter-su-he-0803",
      heartStreamId: "demo-ring-hr-su-he-0803",
      historicalBatchId: "demo-ring-history-su-he-0803",
      visionTrackId: "demo-vision-su-he-0803",
      audioSegmentId: "demo-audio-su-he-0803",
    },
  }),
  freezeSignal({
    schemaVersion: "person-signal.v1",
    personId: "tang-ke",
    capturedAt: `${DEMO_CAPTURE_DATE}T14:31:39+08:00`,
    status: "live",
    heart: {
      currentBpm: 73,
      baselineBpm: 68,
      peakBpm: 87,
      heartScore: 58,
      trend: "falling",
      explanation: "当前心率正在向基线回落，心动值位于中段，跳动速度可以平滑减慢。",
    },
    metrics: {
      breathingRate: 14.2,
      stressIndex: 30,
      skinTemperature: 34.0,
      hrv: 59,
    },
    inference: {
      label: "平稳回落",
      summary: "心率峰值已经过去，当前变化可能与熟悉感或交流节奏稳定有关。",
      confidence: 0.75,
      caveat: "因缺少同一时刻的 HRV 佐证，只能描述趋势，不能确认情感原因。",
    },
    iceBreak: {
      detected: true,
      at: `${DEMO_CAPTURE_DATE}T14:31:02+08:00`,
      breakSeconds: 96,
      reliability: "medium",
    },
    sourceRefs: {
      encounterId: "demo-encounter-tang-ke-0803",
      heartStreamId: "demo-ring-hr-tang-ke-0803",
      historicalBatchId: "demo-ring-history-tang-ke-0803",
      visionTrackId: "demo-vision-tang-ke-0803",
      audioSegmentId: "demo-audio-tang-ke-0803",
    },
  }),
]);

export const personSignalsById = Object.freeze(
  Object.fromEntries(personSignals.map((signal) => [signal.personId, signal])),
);

export function getPersonSignal(personId) {
  return Object.hasOwn(personSignalsById, personId) ? personSignalsById[personId] : null;
}
