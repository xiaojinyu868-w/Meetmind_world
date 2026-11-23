export const routes = {
  meet: { name: "初次相识", role: "刚认识的同行", goal: "在设计活动认识一位同行，找到一个下次还能聊的话题。",
    opener: "我今天也是第一次来。是什么把你带到这里的？",
    prompts: ["你自己最喜欢其中的哪个细节？", "如果我也想了解这件事，你会先给我看什么？", "好呀，那你想从哪件小事开始？"],
    hints: ["从亲历的一个瞬间说起。", "顺着刚才的细节，给对方一个可以回应的问题。", "邀请对方做一件轻松、具体的事。"] },
  make: { name: "合作提案", role: "潜在合作者", goal: "我做了一件小样，想邀请一位合作者一起试用。",
    opener: "我愿意听听。你想一起试的第一件事是什么？",
    prompts: ["第一次试做，你希望我具体参与哪一部分？", "你打算怎样判断这一次尝试值不值得继续？", "我们可以先把范围说清楚。你想怎么开头？"],
    hints: ["把想一起做的第一件事说具体。", "说明一次尝试需要的时间或投入。", "给出一个可以确认，也可以调整的邀请。"] },
  reconnect: { name: "久别重逢", role: "许久未见的朋友", goal: "重新联系一位老朋友，约一次自在的见面。",
    opener: "好久不见。今天怎么想到聊聊了？",
    prompts: ["有什么细节，让你特别想和我分享？", "如果见了面，你最想听我聊什么？", "好，先从一个轻松的安排聊起吧。"],
    hints: ["从属于你自己的近况说起。", "留一个能让对方讲近况的问题。", "提出一个可以商量的见面方式。"] }
};

export const places = {
  garden: { name: "玻璃花房", verb: "准备见面", en: "GLASSHOUSE", icon: "sprout", description: "选一个即将发生的见面，写下你最想说的话。" },
  forum: { name: "灯塔圆桌", verb: "对话演练", en: "LIGHTHOUSE", icon: "lamp", description: "和虚构的练习搭档聊三轮，试试你的开场。" },
  post: { name: "回声邮局", verb: "写封来信", en: "POST OFFICE", icon: "mail", description: "把一句值得留下的话，写成下一次联系的邀请。" }
};
export const draftKey="echoworld:atlas:draft:v1", journalKey="echoworld:atlas:letters:v1";
export function loadJson(key, fallback) {
  try {return JSON.parse(localStorage.getItem(key)) ?? fallback;} catch {return fallback;}
}
export function persist(key, data) {
  try {localStorage.setItem(key,JSON.stringify(data));return true;} catch {return false;}
}
export function freshDraft() {
  return {id:crypto.randomUUID(),scenario:"meet",goal:"",turns:[],input:"",quote:"",nextStep:"",message:"",letterEdited:false};
}
export function restoreDraft() {
  const v=loadJson(draftKey,null);
  if (!v || !Object.hasOwn(routes,v.scenario) || typeof v.id!=="string" || !Array.isArray(v.turns)) return freshDraft();
  return {...freshDraft(),...v,turns:v.turns.filter(t=>t && typeof t.said==="string" && typeof t.reply==="string").slice(0,3)};
}
export function journal() {
  const value=loadJson(journalKey,[]);
  return Array.isArray(value)?value.filter(v=>v && typeof v.id==="string" && typeof v.message==="string"):[];
}
export function guided(scenario, said, index) {
  const route=routes[scenario];
  return {mode:"guided",reply:route.prompts[index],coach:route.hints[Math.min(index+1,2)],
    nextStep:"邀请对方为这次见面选一个合适的时间。",
    message:"我想和你聊一件事。"+said.replace(/[。！？?!]*$/u,"")+"。你愿意找个时间一起聊聊吗？"};
}
export async function practice(draft, said) {
  const fallback=guided(draft.scenario,said,draft.turns.length);
  try {
    const response=await fetch(import.meta.env.BASE_URL+"api/v0/night-atlas/turn",{
      method:"POST",headers:{"Content-Type":"application/json"},
      signal:AbortSignal.timeout(35000),
      body:JSON.stringify({scenario:draft.scenario,goal:draft.goal,said,
        history:draft.turns.map(({said,reply})=>({said,reply}))})
    });
    if (!response.ok) return fallback;
    const data=await response.json();
    return data.mode==="model" && ["reply","coach","nextStep","message"].every(k=>typeof data[k]==="string" && data[k].trim()) ? data : fallback;
  } catch {return fallback;}
}
