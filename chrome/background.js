const MENU_ITEMS = [
  { id: "save-link",      title: "anynote: save link",      contexts: ["link"] },
  { id: "save-selection", title: "anynote: save highlight", contexts: ["selection"] },
  { id: "save-image",     title: "anynote: save image",     contexts: ["image"] },
  { id: "save-page",      title: "anynote: save page",      contexts: ["page"] },
];

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    for (const item of MENU_ITEMS) chrome.contextMenus.create(item);
  });
});

chrome.action.onClicked.addListener(async (tab) => {
  await savePageFromTab(tab);
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== "save-page-shortcut") return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab) await savePageFromTab(tab);
});

async function savePageFromTab(tab) {
  await handleAction(
    { menuItemId: "save-page", pageUrl: tab.url || "" },
    tab
  );
}

async function handleAction(info, tab) {
  try {
    const cfg = await getConfig();
    if (!cfg) {
      notify("anynote", "Open extension options to set URL + secret first");
      chrome.runtime.openOptionsPage();
      return;
    }
    const payload = await buildPayload(info, tab);
    if (!payload) { notify("anynote", "nothing to save"); return; }
    notify("anynote", "sending…");
    const result = await postToBackend(cfg, payload);
    if (result.ok) notify("anynote", `saved ✓ (row ${result.row})`);
    else notify("anynote", `failed: ${result.error || "unknown"}`);
  } catch (err) {
    console.error("[anynote]", err);
    notify("anynote", `error: ${err.message || err}`);
  }
}

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  await handleAction(info, tab);
});

async function buildPayload(info, tab) {
  const pageUrl = info.pageUrl || (tab && tab.url) || "";
  const title = (tab && tab.title) || "";
  switch (info.menuItemId) {
    case "save-link":
      return { type: "url", source_url: info.linkUrl || pageUrl, title, device: "mac-chrome" };
    case "save-selection": {
      // info.selectionText is truncated to ~1024 chars by Chrome.
      // Pull full selection from the page via scripting API.
      let content = info.selectionText || "";
      const fullText = await getFullSelection(tab, info.frameId);
      if (fullText && fullText.length > content.length) content = fullText;
      return {
        type: "highlight",
        source_url: pageUrl,
        title,
        content,
        device: "mac-chrome",
      };
    }
    case "save-image":
      return {
        type: "image",
        source_url: pageUrl,
        title,
        image_url: info.srcUrl || "",
        device: "mac-chrome",
      };
    case "save-page":
      return { type: "url", source_url: pageUrl, title, device: "mac-chrome" };
    default:
      return null;
  }
}

async function getFullSelection(tab, frameId) {
  if (!tab || tab.id == null) return null;
  try {
    const target = { tabId: tab.id };
    if (frameId != null) target.frameIds = [frameId];
    const results = await chrome.scripting.executeScript({
      target,
      func: () => {
        const s = window.getSelection();
        return s ? s.toString() : "";
      },
    });
    if (results && results.length > 0 && typeof results[0].result === "string") {
      return results[0].result;
    }
  } catch (e) {
    console.warn("[anynote] getFullSelection failed:", e.message);
  }
  return null;
}

async function postToBackend(cfg, payload) {
  const body = new URLSearchParams();
  body.set("secret", cfg.secret);
  body.set("payload", JSON.stringify(payload));

  const resp = await fetch(cfg.url, {
    method: "POST",
    body,
    redirect: "follow",
  });
  const text = await resp.text();
  try { return JSON.parse(text); }
  catch { return { ok: false, error: `non-JSON response (HTTP ${resp.status})` }; }
}

async function getConfig() {
  const { url, secret } = await chrome.storage.local.get(["url", "secret"]);
  if (!url || !secret) return null;
  return { url, secret };
}

function notify(title, message) {
  chrome.notifications.create({
    type: "basic",
    iconUrl: chrome.runtime.getURL("icon48.png"),
    title,
    message,
  });
}
