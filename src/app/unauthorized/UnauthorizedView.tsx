"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { WHATSAPP_URL } from "@/lib/approval";
import { t, type Lang } from "@/i18n/dictionary";

// مرحلہ 11 — غیر مجاز صارف کی اسکرین (کلائنٹ)؛ زبان server صفحے سے آتی ہے
export default function UnauthorizedView({ lang }: { lang: Lang }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.email) setEmail(data.user.email);
    });
  }, []);

  async function handleLogout() {
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <main className="login11-page">
      <div className="login11-box">
        <h1 className="login11-title">{t(lang, "auth.unauth_title")}</h1>
        <p className="login11-warning">{t(lang, "auth.unauth_msg")}</p>
        {email ? (
          <p className="login11-sub">
            {t(lang, "auth.unauth_account", { email })}
          </p>
        ) : null}
        <p className="login11-sub">{t(lang, "auth.unauth_sub")}</p>

        <button
          className="login11-google"
          type="button"
          onClick={handleLogout}
          disabled={loading}
        >
          {loading ? t(lang, "common.wait") : t(lang, "topbar.logout")}
        </button>

        <a
          className="login11-whatsapp"
          href={WHATSAPP_URL}
          target="_blank"
          rel="noreferrer"
        >
          {t(lang, "auth.unauth_whatsapp")}
        </a>
      </div>
    </main>
  );
}
