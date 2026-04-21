// MV3 service worker. Injects the XP21 panel bundle into the active tab on
// toolbar-icon click (or when the popup asks). The bundle's own
// __xp21Mounted guard keeps repeat clicks idempotent.
//
// World "MAIN" is required because the bundle reaches into the page's
// React internals via the native value setter — ISOLATED world cannot
// see those property descriptors on the page's React-controlled inputs.

const RESTRICTED = /^(chrome|edge|brave|opera|arc|chrome-extension|about|view-source|devtools|file):/i;

async function injectBundle(tabId, url) {
  if (!url || RESTRICTED.test(url)) {
    throw new Error("XP21 cannot inject on this URL: " + (url || "<unknown>"));
  }
  await chrome.scripting.executeScript({
    target: { tabId },
    files: ["bundle.js"],
    world: "MAIN",
  });
}

chrome.action.onClicked.addListener(async (tab) => {
  // Only fires when no default_popup is set OR when popup explicitly delegates.
  if (!tab || tab.id == null) return;
  try { await injectBundle(tab.id, tab.url); }
  catch (err) { console.error("[xp21] inject failed:", err); }
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg && msg.type === "xp21/inject-active-tab") {
    chrome.tabs.query({ active: true, currentWindow: true }).then(async (tabs) => {
      const tab = tabs[0];
      if (!tab || tab.id == null) { sendResponse({ ok: false, error: "no active tab" }); return; }
      try {
        await injectBundle(tab.id, tab.url);
        sendResponse({ ok: true });
      } catch (err) {
        sendResponse({ ok: false, error: err && err.message ? err.message : String(err) });
      }
    });
    return true; // keep the message channel open for the async response
  }
  return false;
});
