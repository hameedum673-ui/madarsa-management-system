/**
 * مرحلہ 43 — خودکار لاگ آؤٹ (کلائنٹ)
 * 30 منٹ تک کوئی حرکت نہ ہو (نہ کلک، نہ لکھنا، نہ چھونا) تو سسٹم خود
 * لاگ آؤٹ کر دیتا ہے اور لاگ اِن والے صفحے پر لے جاتا ہے — تاکہ کھلا
 * ہوا فون یا کمپیوٹر کسی اور کے ہاتھ نہ لگے۔
 * لاگ اِن نہ ہو تو کچھ نہیں کرتا۔
 */
"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

const IDLE_MINUTES = 30;

export default function AutoLogout() {
  useEffect(() => {
    const supabase = createClient();
    let timer: ReturnType<typeof setTimeout> | null = null;

    async function start() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      const reset = () => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(logout, IDLE_MINUTES * 60 * 1000);
      };
      const logout = async () => {
        await supabase.auth.signOut();
        window.location.href = "/login";
      };

      const events = ["mousemove", "keydown", "click", "touchstart", "scroll"];
      for (const event of events) {
        window.addEventListener(event, reset, { passive: true });
      }
      reset();

      return () => {
        if (timer) clearTimeout(timer);
        for (const event of events) {
          window.removeEventListener(event, reset);
        }
      };
    }

    let cleanup: (() => void) | undefined;
    start().then((fn) => {
      cleanup = fn;
    });
    return () => {
      if (cleanup) cleanup();
    };
  }, []);

  return null;
}
