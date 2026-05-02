"use strict";

const CFG_KEY = "anynote.config";
const CACHE_KEY = "anynote.entries";
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 min

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const state = {
  entries: [],
  filterType: "",
  filterDevice: "",
  search: "",
};

// ─── Boot ──────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {
  setupUI();
  if (!getConfig()) {
    openSettings();
    setStatus("請先設定 URL 與 secret");
  } else {
    loadCached();
    refresh();
  }
  registerServiceWorker();
});

function setupUI() {
  $("#search").addEventListener("input", (e) => {
    state.search = e.target.value.trim().toLowerCase();
    render();
  });
  $("#refresh-btn").addEventListener("click", refresh);
  $("#settings-btn").addEventListener("click", openSettings);

  $("#type-filter").addEventListener("click", (e) => {
    if (!e.target.matches(".chip")) return;
    setActive("#type-filter .chip", e.target);
    state.filterType = e.target.dataset.type || "";
    render();
  });

  // device filter rebuilt on data load
  $("#device-filter").addEventListener("click", (e) => {
    if (!e.target.matches(".chip")) return;
    setActive("#device-filter .chip", e.target);
    state.filterDevice = e.target.dataset.device || "";
    render();
  });

  $("#settings-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const url = $("#cfg-url").value.trim();
    const secret = $("#cfg-secret").value.trim();
    if (!url || !secret) return;
    saveConfig({ url, secret });
    $("#settings-dialog").close();
    refresh();
  });
  $("#cfg-cancel").addEventListener("click", () => $("#settings-dialog").close());
  $("#cfg-clear").addEventListener("click", () => {
    if (!confirm("清除設定與本機快取？")) return;
    localStorage.removeItem(CFG_KEY);
    localStorage.removeItem(CACHE_KEY);
    state.entries = [];
    $("#cfg-url").value = "";
    $("#cfg-secret").value = "";
    render();
    setStatus("已清除");
  });
}

function setActive(selector, target) {
  $$(selector).forEach((el) => el.classList.remove("active"));
  target.classList.add("active");
}

// ─── Config & cache ────────────────────────────────────

function getConfig() {
  try {
    const raw = localStorage.getItem(CFG_KEY);
    if (!raw) return null;
    const cfg = JSON.parse(raw);
    return cfg.url && cfg.secret ? cfg : null;
  } catch { return null; }
}

function saveConfig(cfg) {
  localStorage.setItem(CFG_KEY, JSON.stringify(cfg));
}

function openSettings() {
  const cfg = getConfig();
  if (cfg) {
    $("#cfg-url").value = cfg.url;
    $("#cfg-secret").value = cfg.secret;
  }
  $("#settings-dialog").showModal();
}

function loadCached() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    if (Array.isArray(data.entries)) {
      state.entries = data.entries;
      rebuildDeviceFilter();
      render();
    }
  } catch { /* noop */ }
}

function saveCache(entries) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), entries }));
  } catch { /* quota - skip */ }
}

// ─── Fetching ──────────────────────────────────────────

async function refresh() {
  const cfg = getConfig();
  if (!cfg) { openSettings(); return; }
  setStatus("讀取中…");
  $("#refresh-btn").disabled = true;
  try {
    const params = new URLSearchParams();
    params.set("secret", cfg.secret);
    params.set("action", "list");
    // Explicit options for iOS Safari (which is fussy about cross-origin redirect chain).
    const resp = await fetch(cfg.url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
      body: params.toString(),
      mode: "cors",
      credentials: "omit",
      redirect: "follow",
      cache: "no-store",
    });
    if (!resp.ok && resp.status !== 0) {
      throw new Error(`HTTP ${resp.status}`);
    }
    const text = await resp.text();
    let json;
    try { json = JSON.parse(text); }
    catch { throw new Error(`non-JSON: ${text.slice(0, 80)}`); }
    if (!json.ok) throw new Error(json.error || "unknown");
    state.entries = json.entries || [];
    saveCache(state.entries);
    rebuildDeviceFilter();
    render();
    setStatus(`已載入 ${state.entries.length} 筆`);
  } catch (err) {
    console.error("[anynote] refresh failed:", err);
    setStatus("載入失敗：" + (err.message || String(err)));
  } finally {
    $("#refresh-btn").disabled = false;
  }
}

function rebuildDeviceFilter() {
  const devices = Array.from(new Set(state.entries.map((e) => e.device).filter(Boolean))).sort();
  const html = ['<button class="chip active" data-device="">所有裝置</button>']
    .concat(devices.map((d) => `<button class="chip" data-device="${escapeHtml(d)}">${escapeHtml(d)}</button>`))
    .join("");
  $("#device-filter").innerHTML = html;
  state.filterDevice = "";
}

// ─── Render ────────────────────────────────────────────

function render() {
  const filtered = state.entries.filter((e) => {
    if (state.filterType && e.type !== state.filterType) return false;
    if (state.filterDevice && e.device !== state.filterDevice) return false;
    if (state.search) {
      const hay = (e.title + " " + e.content + " " + e.source_url + " " + e.tags).toLowerCase();
      if (!hay.includes(state.search)) return false;
    }
    return true;
  });

  const main = $("#entries");
  if (filtered.length === 0) {
    main.innerHTML = `<div class="empty">${state.entries.length === 0 ? "還沒有資料，按右上 ↻ 重新整理" : "沒有符合條件的項目"}</div>`;
    return;
  }
  main.innerHTML = filtered.map(renderCard).join("");
  main.querySelectorAll(".card").forEach((el) => {
    el.addEventListener("click", () => onCardClick(el.dataset.row));
  });
}

function renderCard(e) {
  const time = formatTime(e.created_at);
  const titleText = e.title || e.source_url || "(無標題)";
  const tagBadges = (e.tags || "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean)
    .map((t) => `<span class="badge">${escapeHtml(t)}</span>`)
    .join("");
  let body = "";
  if (e.type === "image" && e.image_url) {
    body = `<img class="card-image" src="${escapeAttr(e.image_url)}" alt="" referrerpolicy="no-referrer" loading="lazy" onerror="this.style.display='none'">`;
  } else if (e.content) {
    body = `<div class="card-content">${escapeHtml(e.content)}</div>`;
  }
  const sourceLine = e.source_url && e.type !== "url"
    ? `<div class="card-url">${escapeHtml(e.source_url)}</div>`
    : "";

  return `
    <article class="card" data-row="${e.row}">
      <div class="card-head">
        ${e.favicon ? `<img class="card-favicon" src="${escapeAttr(e.favicon)}" alt="" loading="lazy">` : ""}
        <div class="card-title">${escapeHtml(titleText)}</div>
      </div>
      ${body}
      ${sourceLine}
      <div class="card-meta">
        <span class="badge type-${escapeHtml(e.type)}">${escapeHtml(e.type)}</span>
        ${e.device ? `<span class="badge">${escapeHtml(e.device)}</span>` : ""}
        ${tagBadges}
        <span style="margin-left:auto;">${time}</span>
      </div>
    </article>
  `;
}

function onCardClick(row) {
  const entry = state.entries.find((e) => String(e.row) === row);
  if (!entry) return;
  if (entry.type === "highlight" && entry.content) {
    navigator.clipboard?.writeText(entry.content).then(
      () => setStatus("已複製到剪貼板"),
      () => setStatus("複製失敗")
    );
    if (entry.source_url) window.open(entry.source_url, "_blank", "noopener");
  } else if (entry.image_url) {
    window.open(entry.image_url, "_blank", "noopener");
  } else if (entry.source_url) {
    window.open(entry.source_url, "_blank", "noopener");
  }
}

// ─── Helpers ───────────────────────────────────────────

function formatTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const now = Date.now();
  const diff = now - d.getTime();
  if (diff < 60000) return "剛剛";
  if (diff < 3600000) return `${Math.floor(diff / 60000)} 分鐘前`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小時前`;
  if (diff < 7 * 86400000) return `${Math.floor(diff / 86400000)} 天前`;
  return d.toLocaleDateString("zh-TW", { year: "numeric", month: "numeric", day: "numeric" });
}

function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
function escapeAttr(s) { return escapeHtml(s); }

let statusTimer = null;
function setStatus(msg) {
  const el = $("#status");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(statusTimer);
  statusTimer = setTimeout(() => el.classList.remove("show"), 2400);
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  navigator.serviceWorker.register("./service-worker.js").catch((err) => {
    console.warn("[anynote] sw register failed:", err);
  });
}
