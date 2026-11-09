/**
 * مرحلہ 11 — غیر مجاز صارف کی اسکرین
 * گہرا نیوی بلیو پس منظر، سرخ وارننگ، سنہری لاگ آؤٹ بٹن، سبز واٹس ایپ بٹن۔
 * یہ صفحہ صرف لاگ اِن مگر غیر منظور شدہ صارف کو دکھتا ہے — middleware اس کی
 * اجازت دیتا ہے، باقی سب صفحے بند رہتے ہیں۔
 */
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { WHATSAPP_URL } from "@/lib/approval";

export default function UnauthorizedPage() {
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
        <h1 className="login11-title">رسائی کی پابندی</h1>
        <p className="login11-warning">
          آپ اس ایپ تک رسائی کے مجاز نہیں ہیں یا آپ کا اکاؤنٹ غیر فعال ہے۔
        </p>
        {email ? (
          <p className="login11-sub">لاگ اِن اکاؤنٹ: {email}</p>
        ) : null}
        <p className="login11-sub">
          اگر آپ نئے صارف ہیں تو رابطہ کر کے رسائی کی درخواست کریں۔
        </p>

        <button
          className="login11-google"
          type="button"
          onClick={handleLogout}
          disabled={loading}
        >
          {loading ? "براہِ کرم انتظار کریں…" : "لاگ آؤٹ"}
        </button>

        <a
          className="login11-whatsapp"
          href={WHATSAPP_URL}
          target="_blank"
          rel="noreferrer"
        >
          واٹس ایپ پر رابطہ کریں
        </a>
      </div>
    </main>
  );
}
