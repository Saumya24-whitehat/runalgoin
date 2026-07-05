// Lightweight browser fingerprint. Not a hard identifier — a stable-ish
// hash of common browser/device signals used to deter multi-account abuse.

async function sha256(text: string): Promise<string> {
  const buf = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function canvasSignal(): string {
  try {
    const c = document.createElement("canvas");
    c.width = 220;
    c.height = 40;
    const ctx = c.getContext("2d");
    if (!ctx) return "no-canvas";
    ctx.textBaseline = "top";
    ctx.font = "14px 'Arial'";
    ctx.fillStyle = "#f60";
    ctx.fillRect(0, 0, 220, 40);
    ctx.fillStyle = "#069";
    ctx.fillText("OptionWorld-FP-🚀", 2, 2);
    ctx.strokeStyle = "rgba(102,204,0,0.7)";
    ctx.strokeRect(10, 10, 100, 20);
    return c.toDataURL();
  } catch {
    return "canvas-err";
  }
}

export async function getDeviceFingerprint(): Promise<string> {
  const parts = [
    navigator.userAgent,
    navigator.language,
    (navigator.languages || []).join(","),
    String(navigator.hardwareConcurrency || ""),
    String((navigator as any).deviceMemory || ""),
    `${screen.width}x${screen.height}x${screen.colorDepth}`,
    String(new Date().getTimezoneOffset()),
    Intl.DateTimeFormat().resolvedOptions().timeZone || "",
    navigator.platform || "",
    canvasSignal(),
  ];
  return await sha256(parts.join("||"));
}
