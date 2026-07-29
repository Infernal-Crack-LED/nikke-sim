// Copy text to the clipboard, returning whether it worked. Tries the modern
// async API first, then falls back to the legacy execCommand path (which still
// works in insecure contexts where navigator.clipboard is blocked) — so a
// window.prompt("Copy this link:") dialog is never needed as a fallback.
export async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    /* fall through to the legacy path */
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}
