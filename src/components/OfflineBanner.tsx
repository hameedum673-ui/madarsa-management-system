"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { t, type Lang } from "@/i18n/dictionary";

/**
 * مرحلہ 131 — آف لائن بینر۔
 * نیٹ نہ ہو تو بتائے کہ یہ پرانا ڈیٹا ہے اور کب کا ہے۔
 * وقت اسی صفحے کا ہے — جب صارف نے اسے آن لائن آخری بار دیکھا تھا۔
 * نیٹ آتے ہی بینر خود غائب ہو جاتا ہے۔
 */
function formatSavedAt(ts: number): string {
  const d = new Date(ts);
  const date = d.toLocaleDateString("ur-PK");
  const time = d.toLocaleTimeString("ur-PK", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${date}، ${time}`;
}

export default function OfflineBanner({ lang = "ur" }: { lang?: Lang }) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    setMounted(true);
    const update = () => setIsOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  // آن لائن ہوں تو اس صفحے کا وقت محفوظ کریں؛ آف لائن ہوں تو پڑھیں
  useEffect(() => {
    if (!mounted || !pathname) return;
    const key = `jms-offline-saved-${pathname}`;
    try {
      if (navigator.onLine) {
        const now = Date.now();
        window.localStorage.setItem(key, String(now));
        setSavedAt(now);
      } else {
        const raw = window.localStorage.getItem(key);
        setSavedAt(raw ? Number(raw) : null);
      }
    } catch {
      setSavedAt(null);
    }
  }, [mounted, pathname, isOnline]);

  if (!mounted || isOnline) return null;
  return (
    <div className="offline-banner" role="status">
      <strong>{t(lang, "offline.title")}</strong>
      {" — "}
      {t(lang, "offline.old_data")}{" "}
      {savedAt
        ? t(lang, "offline.saved_at", { date: formatSavedAt(savedAt) })
        : null}
      <br />
      {t(lang, "offline.view_only")}
    </div>
  );
}
