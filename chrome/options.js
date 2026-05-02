const $url = document.getElementById("url");
const $secret = document.getElementById("secret");
const $status = document.getElementById("status");

(async () => {
  const cur = await chrome.storage.local.get(["url", "secret"]);
  if (cur.url) $url.value = cur.url;
  if (cur.secret) $secret.value = cur.secret;
})();

document.getElementById("save").addEventListener("click", async () => {
  const url = $url.value.trim();
  const secret = $secret.value.trim();
  if (!url || !secret) {
    setStatus("err", "Both fields required.");
    return;
  }
  await chrome.storage.local.set({ url, secret });
  setStatus("ok", "Saved.");
});

document.getElementById("test").addEventListener("click", async () => {
  const url = $url.value.trim();
  const secret = $secret.value.trim();
  if (!url || !secret) { setStatus("err", "Fill in both fields first."); return; }

  setStatus("", "Testing…");
  try {
    const body = new URLSearchParams();
    body.set("secret", secret);
    body.set("payload", JSON.stringify({
      type: "url",
      source_url: "https://example.com/anynote-test",
      title: "anynote test ping",
      device: "mac-chrome-test",
    }));
    const resp = await fetch(url, { method: "POST", body, redirect: "follow" });
    const text = await resp.text();
    const json = JSON.parse(text);
    if (json.ok) setStatus("ok", `OK — wrote row ${json.row}.`);
    else setStatus("err", `Backend rejected: ${json.error}`);
  } catch (e) {
    setStatus("err", `Failed: ${e.message}`);
  }
});

function setStatus(cls, msg) {
  $status.className = "status " + cls;
  $status.textContent = msg;
}
