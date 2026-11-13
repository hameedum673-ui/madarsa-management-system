/**
 * مرحلہ 66 — عالمی لوڈنگ (ہر بٹن پر)
 * مسئلہ: مرحلہ 45 والا loading.tsx صرف اس وقت دکھتا ہے جب اگلا
 * صفحہ کھلنے میں وقت لگے — جلدی کھلنے والے نئے صفحوں (ہب، نتیجہ
 * کارڈ) پر ذکر نظر نہیں آتا تھا۔
 * حل: یہ جزو اصل layout میں ایک بار لگتا ہے اور سسٹم کے اندر کسی
 * بھی لنک/بٹن پر کلک ہوتے ہی ذکر + گھومتا ہوا دائرہ دکھا دیتا ہے۔
 * نیا صفحہ کھل جائے تو ذکر خودبخود غائب ہو جاتا ہے۔ اگر صفحہ کسی
 * وجہ سے نہ کھلے تو ذکر 15 سیکنڈ بعد خودبخود غائب ہو جاتا ہے —
 * کبھی پھنسے گا نہیں۔ (مرحلہ 87: کم از کم مدت ختم — ذکر صرف اتنی
 * دیر چلے جتنی دیر صفحہ لوڈ ہو رہا ہے؛ تیز صفحے پر جھلک بھر دکھے
 * یا نہ دکھے، یہی مطلوب ہے۔) آئندہ بننے والے ہر بٹن پر یہ خودبخود
 * چلے گا — کسی صفحے میں الگ کچھ لگانے کی ضرورت نہیں۔
 */
"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/** کوئی فرضی کم از کم مدت نہیں (مرحلہ 87) — ذکر صرف اتنی دیر نظر
 * آئے جتنی دیر صفحہ لوڈ ہو رہا ہے؛ نیا صفحہ تیار ہوتے ہی غائب */
const MIN_SHOW_MS = 0;
/** اگر صفحہ نہ کھلے تو ذکر خودبخود اتنی دیر بعد غائب ہو جائے */
const MAX_SHOW_MS = 15000;

function NavigationLoaderInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();
  const [visible, setVisible] = useState(false);
  const visibleRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shownAtRef = useRef(0);

  function clearTimer() {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }

  function hideNow() {
    clearTimer();
    visibleRef.current = false;
    setVisible(false);
  }

  function show() {
    clearTimer();
    shownAtRef.current = Date.now();
    visibleRef.current = true;
    setVisible(true);
    timerRef.current = setTimeout(hideNow, MAX_SHOW_MS);
  }

  // نیا صفحہ کھل جائے (پتہ یا فلٹر بدلے) تو ذکر فوراً غائب ہو جائے
  // (مرحلہ 87: کوئی کم از کم مدت نہیں — جتنی دیر لوڈنگ، اتنی دیر ذکر)
  useEffect(() => {
    if (!visibleRef.current) return;
    clearTimer();
    const elapsed = Date.now() - shownAtRef.current;
    if (elapsed < MIN_SHOW_MS) {
      timerRef.current = setTimeout(hideNow, MIN_SHOW_MS - elapsed);
    } else {
      hideNow();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, search]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      const el = (e.target as HTMLElement | null)?.closest?.("a");
      if (!el) return;
      const href = el.getAttribute("href");
      // صرف سسٹم کے اندر والے لنک — بیرونی لنک نہیں
      if (!href || !href.startsWith("/") || href.startsWith("//")) return;
      // نئے ٹیب میں کھلنے والا یا ڈاؤن لوڈ والا لنک — صفحہ نہیں بدلتا
      if (el.getAttribute("target") === "_blank") return;
      if (el.hasAttribute("download")) return;
      // صرف # والا لنک — صفحہ نہیں بدلتا
      if (href.startsWith("#")) return;
      // ایک ہی پتے پر کلک — نیا صفحہ نہیں کھلے گا
      const current = window.location.pathname + window.location.search;
      if (href === current) return;
      show();
    }
    function onPopState() {
      // براؤزر کا بیک/فارورڈ بٹن
      show();
    }
    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", onPopState);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", onPopState);
      clearTimer();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!visible) return null;
  return (
    <div className="nav-loader-overlay" aria-hidden="true">
      <div className="loading-screen">
        <p className="loading-dhikr" lang="ar" dir="rtl">
          سبحان اللہ و بحمدہ سبحان اللہ العظیم
        </p>
        <div className="loading-spinner" aria-label="لوڈ ہو رہا ہے" />
      </div>
    </div>
  );
}

export default function NavigationLoader() {
  return (
    <Suspense>
      <NavigationLoaderInner />
    </Suspense>
  );
}
