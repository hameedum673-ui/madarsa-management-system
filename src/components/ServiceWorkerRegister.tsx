"use client";

import { useEffect } from "react";

/**
 * مرحلہ 76 — service worker رجسٹر کریں (انسٹال کے لیے)۔
 * ناکام ہو تو خاموشی سے رہیں — سائٹ ویسے ہی چلتی ہے۔
 */
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* رجسٹریشن ناکام ہو تو سائٹ ویسے ہی چلتی ہے */
      });
    }
  }, []);
  return null;
}
