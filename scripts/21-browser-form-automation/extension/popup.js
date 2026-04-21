// Popup wires the Activate button to the background service worker.
const $btn    = document.getElementById("inject");
const $status = document.getElementById("status");
const $ver    = document.getElementById("version");

function setStatus(text, kind) {
  $status.textContent = text;
  $status.className = "status" + (kind ? " " + kind : "");
}

$btn.addEventListener("click", async () => {
  setStatus("Injecting…");
  try {
    const res = await chrome.runtime.sendMessage({ type: "xp21/inject-active-tab" });
    if (res && res.ok) { setStatus("Panel mounted ✓", "ok"); window.close(); }
    else { setStatus("Failed: " + (res && res.error ? res.error : "unknown"), "fail"); }
  } catch (err) {
    setStatus("Failed: " + (err && err.message ? err.message : String(err)), "fail");
  }
});

// Show build version from version.json (written by build.mjs).
fetch(chrome.runtime.getURL("version.json"))
  .then((r) => r.ok ? r.json() : null)
  .then((v) => {
    if (!v) { $ver.textContent = "version: ?"; return; }
    $ver.textContent = "v" + v.version + " · " + v.builtAt;
  })
  .catch(() => { $ver.textContent = "version: ?"; });
