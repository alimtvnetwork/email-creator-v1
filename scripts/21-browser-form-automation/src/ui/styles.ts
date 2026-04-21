// Scoped CSS for the floating panel, injected into a Shadow DOM root so the
// host page's stylesheet cannot leak in.
export const PANEL_CSS = `
  :host { all: initial; }
  .root {
    position: fixed; top: 16px; right: 16px; z-index: 2147483647;
    width: 360px; max-height: 90vh; display: flex; flex-direction: column;
    font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    font-size: 12px; color: #e5e7eb;
    background: #0f172a; border: 1px solid #1f2937; border-radius: 10px;
    box-shadow: 0 20px 40px rgba(0,0,0,.4);
    overflow: hidden;
  }
  .header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 8px 12px; background: #111827; cursor: move; user-select: none;
    border-bottom: 1px solid #1f2937;
  }
  .header h1 { margin: 0; font-size: 13px; font-weight: 600; color: #f3f4f6; }
  .header .actions button {
    background: transparent; border: 0; color: #9ca3af; cursor: pointer; font-size: 14px; padding: 0 4px;
  }
  .body { padding: 10px 12px; overflow-y: auto; display: flex; flex-direction: column; gap: 12px; }
  fieldset { border: 1px solid #1f2937; border-radius: 6px; padding: 8px 10px 10px; margin: 0; }
  legend { padding: 0 4px; font-size: 11px; color: #9ca3af; text-transform: uppercase; letter-spacing: .05em; }
  label { display: flex; flex-direction: column; gap: 3px; font-size: 11px; color: #d1d5db; margin-top: 6px; }
  input[type=text], input[type=number], textarea, select {
    background: #0b1220; color: #e5e7eb; border: 1px solid #1f2937; border-radius: 4px;
    padding: 5px 7px; font: inherit; outline: none; width: 100%;
  }
  textarea { resize: vertical; min-height: 38px; font-family: ui-monospace, monospace; font-size: 11px; }
  input:focus, textarea:focus, select:focus { border-color: #3b82f6; }
  .row { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .row-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; }
  .preview { font-family: ui-monospace, monospace; color: #93c5fd; font-size: 11px; margin-top: 6px; }
  .controls { display: flex; gap: 6px; flex-wrap: wrap; }
  button.btn {
    flex: 1 1 auto; padding: 7px 10px; border-radius: 5px; border: 1px solid #1f2937;
    background: #1f2937; color: #f3f4f6; cursor: pointer; font: inherit;
  }
  button.btn.primary { background: #2563eb; border-color: #2563eb; }
  button.btn.danger { background: #b91c1c; border-color: #b91c1c; }
  button.btn:disabled { opacity: .5; cursor: not-allowed; }
  .checkbox-row { flex-direction: row; align-items: center; gap: 8px; }
  .checkbox-row input { width: auto; }
  .log {
    background: #0b1220; border: 1px solid #1f2937; border-radius: 4px;
    padding: 6px 8px; height: 160px; overflow-y: auto;
    font-family: ui-monospace, monospace; font-size: 11px; line-height: 1.45;
  }
  .log .info { color: #cbd5e1; }
  .log .warn { color: #fbbf24; }
  .log .error { color: #f87171; }
  .log .ts { color: #6b7280; margin-right: 6px; }

  .profile-row { display: grid; grid-template-columns: 1fr auto; gap: 6px; align-items: end; }
  .profile-row select { height: 28px; }
  .profile-actions { display: flex; gap: 4px; flex-wrap: wrap; margin-top: 6px; }
  .profile-actions button { flex: 1 1 auto; min-width: 0; padding: 5px 6px; font-size: 11px; }

  .toast-host {
    position: absolute; bottom: 12px; left: 12px; right: 12px;
    display: flex; flex-direction: column; gap: 6px; pointer-events: none; z-index: 10;
  }
  .toast {
    padding: 7px 10px; border-radius: 4px; font-size: 11px; color: #f3f4f6;
    background: #1f2937; border: 1px solid #374151;
    box-shadow: 0 4px 12px rgba(0,0,0,.4);
    opacity: 1; transform: translateY(0); transition: opacity .2s ease, transform .2s ease;
  }
  .toast.success { background: #065f46; border-color: #047857; }
  .toast.error   { background: #7f1d1d; border-color: #991b1b; }
  .toast.leaving { opacity: 0; transform: translateY(6px); }
`;
