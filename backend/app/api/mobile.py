"""EchoWorld 移动端产品页（/api/mobile/）+ 入口二维码（/api/mobile/qr.png）。

定位：微信扫码登录后的落地页，也是桌面端「手机录入」二维码指向的页面。
手机上完成三件高频事：导入合照（两段式 group-onboarding）、记录相遇
（第一印象）、看我的世界并跳进 3D。页面本身公开，数据操作全部走
Bearer（localStorage.meetmind_access_token，与桌面端同一个 key）。

实现方式同 dev_lab：FastAPI 直接吐内联 HTML/JS，不进 Vite 构建，
桌面前端只放一个 <img src=".../api/mobile/qr.png"> 指向这里。
"""

from __future__ import annotations

import io
import os

from fastapi import APIRouter
from fastapi.responses import HTMLResponse, Response

router = APIRouter(prefix="/api/mobile", tags=["mobile"])

PAGE_TITLE = "EchoWorld 回声世界"


def _public_mobile_url() -> str:
    domain = os.environ.get("PUBLIC_DOMAIN", "").strip()
    if domain:
        protocol = os.environ.get("PUBLIC_PROTOCOL", "https").strip() or "https"
        return f"{protocol}://{domain}/echoworld/api/mobile/"
    base = os.environ.get("WECHAT_MP_PUBLIC_BASE_URL", "").strip().rstrip("/")
    return f"{base or 'https://capture.meetmind.online'}/echoworld/api/mobile/"


@router.get("/qr.png")
def mobile_qr(pair: str = ""):
    """移动端入口二维码（桌面端「手机录入」面板展示）。

    pair 非空时编入配对挑战（桌面扫码登录）：扫码进移动页登录后可
    「确认登录到电脑」。pair 只允许 URL 安全字符，防注入。
    """
    import re

    import segno

    target = _public_mobile_url()
    if pair and re.fullmatch(r"[A-Za-z0-9_\-]{1,64}", pair):
        target = f"{target}?pair={pair}"
    buffer = io.BytesIO()
    segno.make(target, error="m").save(
        buffer, kind="png", scale=8, border=2, dark="#333415", light="#f6f3ea")
    return Response(content=buffer.getvalue(), media_type="image/png",
                    headers={"Cache-Control": "no-store"})


_PAGE = """<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>__TITLE__</title>
<style>
:root{--green:#4a7c59;--green-deep:#37573f;--ink:#333415;--muted:#6b6a4e;
--cream:#f6f3ea;--card:#fffdf6;--line:#e3ddc8;--accent:#d98e4a}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Hiragino Sans GB",sans-serif;
background:var(--cream);color:var(--ink);min-height:100vh;padding-bottom:48px}
.wrap{max-width:430px;margin:0 auto;padding:0 18px}
.hero{padding:34px 0 18px;text-align:center}
.hero h1{font-size:24px;letter-spacing:1px}
.hero p{margin-top:8px;color:var(--muted);font-size:13px;line-height:1.7}
.card{background:var(--card);border:1px solid var(--line);border-radius:18px;
padding:18px;margin-top:14px;box-shadow:0 1px 4px rgba(51,52,21,.05)}
.action{display:flex;align-items:center;gap:14px;width:100%;text-align:left;
background:var(--card);border:1px solid var(--line);border-radius:18px;padding:18px;
margin-top:14px;cursor:pointer;font-size:16px;color:var(--ink)}
.action:active{transform:scale(.985)}
.action .icon{width:46px;height:46px;border-radius:14px;display:flex;align-items:center;
justify-content:center;font-size:22px;flex:none;background:#eef2e7}
.action small{display:block;color:var(--muted);font-size:12px;margin-top:3px;line-height:1.5}
.action.primary{background:var(--green);border-color:var(--green);color:#fff}
.action.primary small{color:#dce8d4}
.action.primary .icon{background:rgba(255,255,255,.16)}
.btn{display:block;width:100%;padding:15px;border:none;border-radius:14px;font-size:16px;
background:var(--green);color:#fff;cursor:pointer;margin-top:14px}
.btn:disabled{opacity:.45}
.btn.ghost{background:transparent;color:var(--green);border:1px solid var(--green)}
.btn.warn{background:transparent;color:var(--muted);border:1px solid var(--line);font-size:14px;padding:11px}
.userbar{display:flex;align-items:center;gap:12px}
.userbar img{width:46px;height:46px;border-radius:50%;object-fit:cover;background:#e8e3d0}
.userbar .name{font-size:16px;font-weight:600}
.userbar .sub{font-size:12px;color:var(--muted);margin-top:2px}
.back{display:inline-block;margin-top:16px;color:var(--muted);font-size:14px;
background:none;border:none;cursor:pointer;padding:6px 0}
input[type=text],textarea,select{width:100%;padding:12px;border:1px solid var(--line);
border-radius:12px;font-size:15px;background:#fff;color:var(--ink);margin-top:8px}
textarea{min-height:96px;resize:vertical}
.face{display:flex;gap:12px;align-items:center;padding:12px 0;border-top:1px dashed var(--line)}
.face:first-of-type{border-top:none}
.face img{width:64px;height:64px;border-radius:12px;object-fit:cover;background:#e8e3d0;flex:none}
.face .fields{flex:1}
.face .noimg{width:64px;height:64px;border-radius:12px;background:#e8e3d0;flex:none;
display:flex;align-items:center;justify-content:center;color:var(--muted);font-size:12px}
.photo-preview{width:100%;border-radius:14px;margin-top:12px;display:block}
.muted{color:var(--muted);font-size:13px;line-height:1.7}
.issue{background:#fdf3e3;border:1px solid #eed9ae;color:#8a6a2f;border-radius:12px;
padding:10px 12px;font-size:13px;margin-top:10px;line-height:1.6}
.ok{background:#e9f2e6;border:1px solid #c4dcc0;color:#37573f;border-radius:12px;
padding:10px 12px;font-size:13px;margin-top:10px;line-height:1.6}
.people{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:12px}
.person{text-align:center;min-width:0}
.person img{width:100%;aspect-ratio:1;border-radius:14px;object-fit:cover;background:#e8e3d0}
.person .tag{font-size:11px;color:var(--muted);margin-top:4px;display:block}
.person .nm{font-size:13px;margin-top:5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.qrbox{text-align:center;padding:8px 0}
.qrbox img{width:220px;height:220px;border-radius:16px;border:1px solid var(--line)}
.hidden{display:none!important}
.spinner{margin:40px auto;width:34px;height:34px;border-radius:50%;
border:3px solid var(--line);border-top-color:var(--green);animation:sp 1s linear infinite}
@keyframes sp{to{transform:rotate(360deg)}}
.status{min-height:22px;font-size:13px;margin-top:10px;text-align:center;color:var(--muted)}
.world-link{display:block;text-align:center;margin-top:16px;color:var(--green);
font-size:14px;text-decoration:none;padding:10px}
.badge{display:inline-block;font-size:11px;padding:2px 8px;border-radius:999px;
background:#eef2e7;color:var(--green-deep);margin-left:6px;vertical-align:2px}
</style>
</head>
<body>
<div class="wrap">

  <div class="hero">
    <h1>EchoWorld 回声世界</h1>
    <p>每一次相遇，都在世界里留下回声。</p>
  </div>

  <div id="view-loading"><div class="spinner"></div>
    <p class="status">正在进入…</p></div>

  <div id="view-login" class="hidden">
    <div class="card" id="login-wechat">
      <p class="muted" style="text-align:center">登录后，你录入的人会出现在只属于你的世界里。</p>
      <a class="btn" id="btn-wechat-login" style="text-align:center;text-decoration:none">微信一键登录</a>
      <p class="status" id="login-status"></p>
    </div>
    <div class="card qrbox hidden" id="login-qr">
      <p class="muted">请用微信扫一扫，在手机上打开 EchoWorld</p>
      <div style="height:12px"></div>
      <img id="login-qr-img" alt="EchoWorld 手机端二维码">
    </div>
  </div>

  <div id="view-home" class="hidden">
    <div class="card userbar">
      <img id="me-avatar" alt="">
      <div><div class="name" id="me-name">…</div>
      <div class="sub">已登录 · 你的世界随你生长</div></div>
    </div>
    <button class="action primary" id="go-photo">
      <span class="icon">📷</span>
      <span>导入合照<small>拍一张或从相册选一张，认出每一张脸，让朋友们一起入场</small></span>
    </button>
    <button class="action" id="go-note">
      <span class="icon">✏️</span>
      <span>记录相遇<small>把刚刚发生的小事、对 TA 的第一印象写进世界</small></span>
    </button>
    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:baseline">
        <strong>我的世界</strong><span class="muted" id="people-count"></span>
      </div>
      <div class="people" id="people-grid"></div>
      <a class="world-link" id="go-world" href="/echoworld/?world=hall">进入 3D 世界逛逛 →</a>
    </div>
  </div>

  <div id="view-photo" class="hidden">
    <button class="back" data-back>‹ 返回</button>
    <div class="card" id="photo-step-1">
      <strong>导入合照</strong>
      <p class="muted" style="margin-top:6px">选一张大家的合照，世界会认出每一张脸。</p>
      <input type="file" id="photo-input"
        accept="image/*,.heic,.heif,.avif,.bmp,.dib,.tif,.tiff,.gif" class="hidden">
      <button class="btn" id="photo-pick">选择照片</button>
      <img class="photo-preview hidden" id="photo-preview" alt="合照预览">
      <button class="btn hidden" id="photo-detect" disabled>认出每一张脸</button>
      <p class="muted" style="margin-top:10px;text-align:center">支持 HEIC / HEIF / AVIF / JPEG / PNG / WebP / BMP / TIFF / GIF</p>
      <p class="status" id="photo-status-1"></p>
    </div>
    <div class="card hidden" id="photo-step-2">
      <strong>TA 们是谁？</strong>
      <p class="muted" style="margin-top:6px">给每张脸写上名字，TA 就会在世界里拥有一个位置。</p>
      <div id="face-list"></div>
      <div id="photo-issues"></div>
      <button class="btn" id="photo-confirm">让大家入场</button>
      <p class="status" id="photo-status-2"></p>
    </div>
    <div class="card hidden" id="photo-step-3">
      <strong>入场完成 🎉</strong>
      <p class="muted" style="margin-top:8px" id="photo-result"></p>
      <div id="photo-result-issues"></div>
      <a class="btn" style="text-align:center;text-decoration:none" href="/echoworld/?world=hall">去 3D 世界看看 TA 们</a>
      <button class="btn ghost" id="photo-again">再传一张</button>
    </div>
  </div>

  <div id="view-pair" class="hidden">
    <div class="card" style="text-align:center">
      <div style="font-size:34px">💻</div>
      <strong>在电脑上登录 EchoWorld？</strong>
      <p class="muted" style="margin-top:8px">确认后，电脑端会以你的身份进入你的世界。</p>
      <button class="btn" id="pair-confirm">确认登录到电脑</button>
      <button class="btn warn" id="pair-cancel">取消</button>
      <p class="status" id="pair-status"></p>
    </div>
  </div>

  <div id="view-note" class="hidden">
    <button class="back" data-back>‹ 返回</button>
    <div class="card">
      <strong>记录相遇</strong>
      <p class="muted" style="margin-top:6px">写下这次相遇里值得留下的东西——TA 说过的话、给你的感觉。</p>
      <label class="muted" style="font-size:12px;display:block;margin-top:14px">关于谁</label>
      <select id="note-subject"></select>
      <label class="muted" style="font-size:12px;display:block;margin-top:12px">想留下的话</label>
      <textarea id="note-text" maxlength="300" placeholder="比如：今天一起喝了手冲，TA 说起在山里徒步的那个清晨…"></textarea>
      <button class="btn" id="note-submit">写进世界</button>
      <p class="status" id="note-status"></p>
    </div>
  </div>

</div>
<script>
(function(){
"use strict";
var BASE = location.pathname.indexOf("/echoworld/") === 0 ? "/echoworld" : "";
var TOKEN_KEY = "meetmind_access_token";
var PAIR_KEY = "echo_pending_pair";
var $ = function(id){ return document.getElementById(id); };
var state = { me:null, people:[], groupId:null, faces:[], photoFile:null, photoPreviewUrl:null };

// token / pair 从 URL 落 localStorage 后清掉地址栏
// （pair 要熬过 OAuth 跳转：授权回来时凭 localStorage 里的它继续配对）
var qs = new URLSearchParams(location.search);
var urlToken = qs.get("token");
var urlPair = qs.get("pair");
if (urlPair) localStorage.setItem(PAIR_KEY, urlPair);
if (urlToken || urlPair) {
  if (urlToken) localStorage.setItem(TOKEN_KEY, urlToken);
  history.replaceState(null, "", location.pathname);
}
function token(){ return localStorage.getItem(TOKEN_KEY) || ""; }
function authHeaders(extra){
  var h = extra || {};
  if (token()) h["Authorization"] = "Bearer " + token();
  return h;
}
function show(view){
  ["loading","login","home","photo","note","pair"].forEach(function(v){
    $("view-"+v).classList.toggle("hidden", v !== view);
  });
}
function isWechat(){ return /MicroMessenger/i.test(navigator.userAgent); }

function api(path, opts){
  return fetch(BASE + path, opts).then(function(r){
    return r.json().then(function(body){
      if (!r.ok) throw new Error(body.detail || ("请求失败 " + r.status));
      return body;
    });
  });
}

// ---------- 启动 ----------
function boot(){
  // 扫码落地即预检并标记 scanned：桌面面板能立刻看到「手机已扫码」，
  // 二维码已过期则在登录前就告知，不让用户白走授权流程
  var pendingPair = localStorage.getItem(PAIR_KEY);
  if (pendingPair) {
    api("/api/v0/auth/pair?id=" + encodeURIComponent(pendingPair) + "&peek=1")
      .then(function(r){
        if (r.status === "expired") {
          localStorage.removeItem(PAIR_KEY);
          var el = $("login-status");
          if (el) el.textContent = "电脑端的二维码已过期，请回到电脑重新获取后再扫一次";
        }
      }).catch(function(){});
  }
  if (!token()) { renderLogin(); return; }
  api("/api/v0/auth/me", { headers: authHeaders() }).then(function(me){
    state.me = me;
    if (localStorage.getItem(PAIR_KEY)) { renderPair(); return; }
    renderHome();
    loadPeople();
  }).catch(function(){
    localStorage.removeItem(TOKEN_KEY);
    renderLogin();
  });
}

// ---------- 配对登录到电脑 ----------
function renderPair(){
  show("pair");
  var challengeId = localStorage.getItem(PAIR_KEY);
  var btn = $("pair-confirm");
  btn.classList.remove("hidden");
  btn.disabled = true;
  $("pair-status").textContent = "正在核对电脑端的二维码…";
  // 预检挑战有效性（peek 不消费）：二维码 10 分钟过期，过期就别让用户白点
  api("/api/v0/auth/pair?id=" + encodeURIComponent(challengeId) + "&peek=1").then(function(r){
    if (r.status === "expired") {
      $("pair-status").textContent = "电脑端的二维码已过期，请回到电脑重新获取后再扫一次";
      btn.classList.add("hidden");
      return;
    }
    $("pair-status").textContent = "";
    btn.disabled = false;
  }).catch(function(){
    // 网络抖动不阻塞：仍允许尝试确认
    $("pair-status").textContent = "";
    btn.disabled = false;
  });
}
$("pair-confirm").addEventListener("click", function(){
  var challengeId = localStorage.getItem(PAIR_KEY);
  var btn = this;
  btn.disabled = true;
  $("pair-status").textContent = "正在授权…";
  api("/api/v0/auth/pair/confirm", {
    method: "POST",
    headers: authHeaders({ "content-type": "application/json" }),
    body: JSON.stringify({ challenge_id: challengeId }),
  }).then(function(){
    localStorage.removeItem(PAIR_KEY);
    $("pair-status").textContent = "电脑已登录 ✅ 可以回到电脑继续了";
    btn.classList.add("hidden");
    $("pair-cancel").textContent = "留在手机继续";
  }).catch(function(err){
    $("pair-status").textContent = err.message;
  }).finally(function(){ btn.disabled = false; });
});
$("pair-cancel").addEventListener("click", function(){
  localStorage.removeItem(PAIR_KEY);
  renderHome();
  loadPeople();
});

function renderLogin(){
  show("login");
  if (isWechat()) {
    $("login-wechat").classList.remove("hidden");
    $("btn-wechat-login").href = BASE + "/api/v0/auth/wechat/login";
  } else {
    $("login-wechat").classList.add("hidden");
    $("login-qr").classList.remove("hidden");
    $("login-qr-img").src = BASE + "/api/mobile/qr.png";
  }
}

function renderHome(){
  show("home");
  $("me-name").textContent = state.me.name || "朋友";
  if (state.me.avatar) $("me-avatar").src = state.me.avatar;
  else $("me-avatar").style.visibility = "hidden";
}

function loadPeople(){
  api("/api/v0/packages", { headers: authHeaders() }).then(function(data){
    state.people = (data.packages || []).filter(function(p){ return p.confirmed; });
    renderPeople();
  }).catch(function(){ /* 列表失败不阻塞主页 */ });
}

function renderPeople(){
  var grid = $("people-grid");
  grid.innerHTML = "";
  $("people-count").textContent = state.people.length ? state.people.length + " 位居民" : "";
  if (!state.people.length) {
    grid.innerHTML = '<p class="muted" style="grid-column:1/-1">世界还空着——导入第一张合照，让 TA 们入场。</p>';
    return;
  }
  state.people.forEach(function(p){
    var el = document.createElement("div");
    el.className = "person";
    var mine = p.owner_id && p.owner_id !== "system";
    // 数据卫生：早期测试残留的 anonymous-* 名字不直接展示
    var displayName = p.name || "未命名";
    if (/^anonymous-/i.test(displayName)) displayName = "路过的人";
    el.innerHTML = '<div class="noimg" style="width:100%;aspect-ratio:1;border-radius:14px;background:#e8e3d0;display:flex;align-items:center;justify-content:center;color:#6b6a4e;font-size:20px">' +
      displayName[0] + '</div>' +
      '<div class="nm"></div>' +
      '<span class="tag">' + (mine ? "我录入的" : "常驻居民") + '</span>';
    el.querySelector(".nm").textContent = displayName;
    grid.appendChild(el);
    api("/api/v0/packages/" + encodeURIComponent(p.person_id), { headers: authHeaders() })
      .then(function(detail){
        // 优先像素胸像（portrait_ref）；我录入的人允许退回真实人脸裁剪，
        // 常驻居民没有像素胸像时用占位（真实人脸不对所有访客展示）
        var avatar = detail.avatar || {};
        var ref = avatar.portrait_ref
          || (mine && detail.identity && detail.identity.face_ref);
        if (ref) {
          var img = document.createElement("img");
          img.src = BASE + "/api/v0/media/" + ref;
          img.alt = p.name || "";
          el.replaceChild(img, el.firstChild);
        }
      }).catch(function(){});
  });
}

// ---------- 导入合照 ----------
$("go-photo").addEventListener("click", function(){ resetPhoto(); show("photo"); });
$("photo-pick").addEventListener("click", function(){ $("photo-input").click(); });
$("photo-input").addEventListener("change", function(){
  var file = this.files && this.files[0];
  if (!file) return;
  state.photoFile = file;
  var preview = $("photo-preview");
  if (state.photoPreviewUrl) URL.revokeObjectURL(state.photoPreviewUrl);
  state.photoPreviewUrl = URL.createObjectURL(file);
  preview.onload = function(){
    preview.classList.remove("hidden");
    $("photo-status-1").textContent = "";
  };
  preview.onerror = function(){
    preview.classList.add("hidden");
    $("photo-status-1").textContent = "已选择 " + file.name + "；当前浏览器不能预览此格式，但仍可识别。";
  };
  preview.src = state.photoPreviewUrl;
  var btn = $("photo-detect");
  btn.classList.remove("hidden");
  btn.disabled = false;
});
$("photo-detect").addEventListener("click", function(){
  if (!state.photoFile) return;
  var btn = this;
  btn.disabled = true;
  $("photo-status-1").textContent = "正在辨认每一张脸…（约十几秒）";
  var form = new FormData();
  form.append("photo", state.photoFile, state.photoFile.name || "group.jpg");
  api("/api/v1/group-onboarding/detect", {
    method: "POST", headers: authHeaders(), body: form,
  }).then(function(data){
    state.groupId = data.group_id;
    state.faces = data.faces || [];
    renderFaces(data.issues || []);
    $("photo-step-1").classList.add("hidden");
    $("photo-step-2").classList.remove("hidden");
    $("photo-status-1").textContent = "";
  }).catch(function(err){
    $("photo-status-1").textContent = err.message;
    btn.disabled = false;
  });
});
function renderFaces(issues){
  var list = $("face-list");
  list.innerHTML = "";
  $("photo-issues").innerHTML = issues.map(function(t){
    return '<div class="issue">' + t + '</div>';
  }).join("");
  if (!state.faces.length) {
    list.innerHTML = '<p class="muted">没认出清晰的人脸，可以直接写名字入场（形象会用程序化体素）。</p>';
    state.faces = [{ face_id: null, face_ref: null }];
  }
  state.faces.forEach(function(face, i){
    var row = document.createElement("div");
    row.className = "face";
    var media = face.face_ref
      ? '<img src="' + BASE + '/api/v0/media/' + face.face_ref + '" alt="面孔 ' + (i+1) + '">'
      : '<div class="noimg">未识别</div>';
    row.innerHTML = media +
      '<div class="fields"><input type="text" maxlength="40" placeholder="TA 的名字" data-face-name="' + i + '">' +
      '<input type="text" maxlength="300" placeholder="第一印象（可选）：笑起来很暖…" data-face-impression="' + i + '"></div>';
    list.appendChild(row);
  });
}
$("photo-confirm").addEventListener("click", function(){
  var names = document.querySelectorAll("[data-face-name]");
  var impressions = document.querySelectorAll("[data-face-impression]");
  var assignments = [];
  for (var i = 0; i < names.length; i++) {
    var name = names[i].value.trim();
    if (!name) continue;
    assignments.push({
      face_id: state.faces[i] ? state.faces[i].face_id : null,
      name: name,
      impression: impressions[i].value.trim() || null,
    });
  }
  if (!assignments.length) {
    $("photo-status-2").textContent = "至少给一位朋友写上名字";
    return;
  }
  var btn = this;
  btn.disabled = true;
  $("photo-status-2").textContent = "正在建档入场…";
  api("/api/v1/group-onboarding/confirm", {
    method: "POST",
    headers: authHeaders({ "content-type": "application/json" }),
    body: JSON.stringify({ group_id: state.groupId, assignments: assignments }),
  }).then(function(data){
    var n = (data.participants || []).length;
    $("photo-result").textContent = n + " 位朋友已经在世界里有了自己的位置，会在集市展出、在咖啡厅落座。";
    $("photo-result-issues").innerHTML = (data.issues || []).map(function(t){
      return '<div class="issue">' + t + '</div>';
    }).join("");
    $("photo-step-2").classList.add("hidden");
    $("photo-step-3").classList.remove("hidden");
    loadPeople();
  }).catch(function(err){
    $("photo-status-2").textContent = err.message;
  }).finally(function(){ btn.disabled = false; });
});
$("photo-again").addEventListener("click", function(){ resetPhoto(); });
function resetPhoto(){
  if (state.photoPreviewUrl) URL.revokeObjectURL(state.photoPreviewUrl);
  state.photoPreviewUrl = null;
  state.photoFile = null; state.groupId = null; state.faces = [];
  $("photo-input").value = "";
  $("photo-preview").removeAttribute("src");
  $("photo-preview").classList.add("hidden");
  $("photo-detect").classList.add("hidden");
  ["photo-step-2","photo-step-3"].forEach(function(id){ $(id).classList.add("hidden"); });
  $("photo-step-1").classList.remove("hidden");
  $("photo-status-1").textContent = "";
  $("photo-status-2").textContent = "";
}

// ---------- 记录相遇 ----------
$("go-note").addEventListener("click", function(){
  var candidates = state.people.filter(function(p){ return p.name; });
  if (!candidates.length) {
    alert("先用「导入合照」让朋友们入场，再来记录相遇。");
    return;
  }
  var subject = $("note-subject");
  subject.innerHTML = "";
  candidates.forEach(function(p){
    var opt = document.createElement("option");
    opt.value = p.person_id;
    opt.textContent = p.name;
    subject.appendChild(opt);
  });
  $("note-text").value = "";
  $("note-status").textContent = "";
  show("note");
});
$("note-submit").addEventListener("click", function(){
  var subjectId = $("note-subject").value;
  var text = $("note-text").value.trim();
  if (!text) { $("note-status").textContent = "先写点什么吧"; return; }
  var btn = this;
  btn.disabled = true;
  $("note-status").textContent = "正在写入…";
  api("/api/v1/impressions", {
    method: "POST",
    headers: authHeaders({ "content-type": "application/json" }),
    body: JSON.stringify({
      author_id: state.me.user_id,
      subject_id: subjectId,
      text: text,
      kind: "peer-impression",
      privacy: "self-only",
    }),
  }).then(function(){
    $("note-status").textContent = "";
    show("home");
    alert("已经写进世界了。TA 会记得这次相遇。");
  }).catch(function(err){
    $("note-status").textContent = err.message;
  }).finally(function(){ btn.disabled = false; });
});

// ---------- 返回 ----------
Array.prototype.forEach.call(document.querySelectorAll("[data-back]"), function(btn){
  btn.addEventListener("click", function(){ show("home"); });
});

boot();
})();
</script>
</body>
</html>
"""


@router.get("/", response_class=HTMLResponse)
def mobile_page():
    return HTMLResponse(_PAGE.replace("__TITLE__", PAGE_TITLE))
