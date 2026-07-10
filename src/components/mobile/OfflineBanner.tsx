import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

export function OfflineBanner() {
  const [online, setOnline] = useState(
    typeof navigator === "undefined" ? true : navigator.onLine
  );

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  if (online) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed left-1/2 -translate-x-1/2 z-[120] bg-destructive text-destructive-foreground text-xs font-medium px-3 py-2 rounded-full shadow-lg flex items-center gap-2"
      style={{
        top: `calc(env(safe-area-inset-top) + 8px)`,
      }}
    >
      <WifiOff className="h-3.5 w-3.5" />
      You are offline
    </div>
  );
}
