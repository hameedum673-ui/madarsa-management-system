"use client";

import { useEffect, useState } from "react";
import { t, type Lang } from "@/i18n/dictionary";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/**
 * مرحلہ 76 — "ایپ ڈاؤن لوڈ کریں" والا بٹن۔
 * اینڈرائیڈ/Chrome: براؤزر کا beforeinstallprompt ایونٹ آئے تو بٹن
 * نظر آتا ہے؛ دبانے پر فون کا اپنا انسٹال والا باکس کھلتا ہے۔
 * آئی فون: براؤزر یہ بٹن دکھانے کی اجازت نہیں دیتا — ہدایت دکھتی ہے۔
 * dark: لاگ ان والے صفحے پر (گہرا نیوی پس منظر) — نوٹ کا رنگ سفید رکھیں۔
 */
export default function InstallAppButton({
  dark,
  lang = "ur",
}: {
  dark?: boolean;
  lang?: Lang;
}) {
  const [deferred, setDeferred] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    if (
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone
    ) {
      setInstalled(true);
      return;
    }
    const ua = window.navigator.userAgent;
    setIsIOS(/iphone|ipad|ipod/i.test(ua));
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const noteClass = dark ? "install-note-dark" : "install-note";

  if (installed) {
    return (
      <p className={noteClass}>{t(lang, "settings.app.installed")}</p>
    );
  }

  if (deferred) {
    return (
      <button
        className="install-btn"
        type="button"
        onClick={async () => {
          await deferred.prompt();
          const choice = await deferred.userChoice;
          if (choice.outcome === "accepted") setDeferred(null);
        }}
      >
        {t(lang, "settings.app.download")}
      </button>
    );
  }

  if (isIOS) {
    return (
      <p className={noteClass}>{t(lang, "settings.app.ios_note")}</p>
    );
  }

  return null;
}
