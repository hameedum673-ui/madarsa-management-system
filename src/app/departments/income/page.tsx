/**
 * مرحلہ 48 + مرحلہ 49 — آمدنی کا ریکارڈ: حب (سرور صفحہ)
 * ڈیش بورڈ پر "آمدنی کا ریکارڈ" بٹن اسی صفحے پر آتا ہے۔ اندر دو حصے ہیں:
 *   فیس — فیسوں کی فہرست + شیڈول
 *   زکوٰۃ، عشر اور عطیات — ملا ہوا صفحہ (مد کے حساب سے)
 * وکالت کا اصول: زکوٰۃ اور عشر آمدنی میں شامل ہیں اور بیلنس میں گنے
 * جاتے ہیں (صرف وصولی)۔ تقسیم ختم ہے۔
 * اجازتیں الگ الگ ہی رہتی ہیں — ہر حصہ صرف اسی کو نظر آئے گا جسے اس
 * کی اجازت ہے؛ جسے دونوں کی اجازت نہیں ہے، وہ یہ صفحہ نہیں کھول سکتا۔
 */
import Link from "next/link";
import { redirect } from "next/navigation";
import BackButton from "@/components/BackButton";
import { createClient } from "@/lib/supabase/server";
import { getMyAllowedSections } from "@/lib/permissions";
import { type SectionId } from "@/lib/students";
import { isAppAdmin } from "@/lib/approval";

export default async function IncomeHubPage() {
  const supabase = await createClient();
  const admin = await isAppAdmin(supabase);

  let incomeAllowed = true;
  let zakatAllowed = true;
  let ushrAllowed = true;
  let donationsAllowed = true;
  if (!admin) {
    const { data: iAllowed } = await supabase.rpc("my_module_allowed", {
      p_module: "income",
    });
    const { data: zAllowed } = await supabase.rpc("my_module_allowed", {
      p_module: "zakat",
    });
    const { data: uAllowed } = await supabase.rpc("my_module_allowed", {
      p_module: "ushr",
    });
    const { data: dAllowed } = await supabase.rpc("my_module_allowed", {
      p_module: "donations",
    });
    // فنکشن نہ چلا تو اجازت ہے — پرانا کام نہیں رکتا
    incomeAllowed = iAllowed !== false;
    zakatAllowed = zAllowed !== false;
    ushrAllowed = uAllowed !== false;
    donationsAllowed = dAllowed !== false;
  }

  // چاروں کی اجازت نہیں ہے → ڈیش بورڈ پر واپس
  if (
    !incomeAllowed &&
    !zakatAllowed &&
    !ushrAllowed &&
    !donationsAllowed
  ) {
    redirect("/");
  }

  const fundsAllowed = zakatAllowed || ushrAllowed || donationsAllowed;

  // مرحلہ 62 — اجازت والے شعبے (بنین / بنات) — رقم صرف انہی کی
  const allowedSections = await getMyAllowedSections(supabase);

  let feesTotal: number | null = null;
  let feesCount: number | null = null;
  let zakatTotal: number | null = null;
  let ushrTotal: number | null = null;
  let donationsTotal: number | null = null;

  if (incomeAllowed) {
    const { data } = await supabase
      .from("fee_payments")
      .select("amount, students(section)")
      .eq("status", "active");
    // مرحلہ 62 — فیس بھی صرف اجازت والے شعبے کی
    const rows = ((data ?? []) as unknown as {
      amount: number;
      students: { section: string } | null;
    }[]).filter((r) =>
      allowedSections.has((r.students?.section ?? "banat") as SectionId),
    );
    feesTotal = rows.reduce((sum, r) => sum + (r.amount ?? 0), 0);
    feesCount = rows.length;
  }
  if (zakatAllowed) {
    const { data } = await supabase
      .from("zakat_records")
      .select("kind, amount, section")
      .eq("status", "active");
    // مرحلہ 62 — زکوٰۃ بھی صرف اجازت والے شعبے کی
    const rows = ((data ?? []) as {
      kind: string;
      amount: number;
      section: string | null;
    }[]).filter((r) =>
      allowedSections.has((r.section ?? "banat") as SectionId),
    );
    // مرحلہ 49 — تقسیم ختم: صرف "وصولی" گنی جاتی ہے
    zakatTotal = rows
      .filter((r) => r.kind === "received")
      .reduce((sum, r) => sum + (r.amount ?? 0), 0);
  }
  if (ushrAllowed) {
    try {
      const { data, error } = await supabase
        .from("ushr_records")
        .select("kind, amount, section")
        .eq("status", "active");
      if (!error) {
        // مرحلہ 62 — عشر بھی صرف اجازت والے شعبے کا
        const rows = ((data ?? []) as {
          kind: string;
          amount: number;
          section: string | null;
        }[]).filter((r) =>
          allowedSections.has((r.section ?? "banat") as SectionId),
        );
        ushrTotal = rows
          .filter((r) => r.kind === "received")
          .reduce((sum, r) => sum + (r.amount ?? 0), 0);
      }
    } catch {
      /* میز ابھی نہ بنی ہو تو عشر کا حصہ خالی رقم دکھائے گا */
    }
  }
  if (donationsAllowed) {
    const { data } = await supabase
      .from("donations")
      .select("amount, section")
      .eq("status", "active");
    // مرحلہ 62 — عطیات بھی صرف اجازت والے شعبے کے
    const rows = ((data ?? []) as {
      amount: number;
      section: string | null;
    }[]).filter((d) =>
      allowedSections.has((d.section ?? "banat") as SectionId),
    );
    donationsTotal = rows.reduce((sum, r) => sum + (r.amount ?? 0), 0);
  }

  return (
    <div className="module-view open">
      <div className="page-card">
        <div className="page-head">
          <BackButton />
          <h2>آمدنی کا ریکارڈ</h2>
        </div>

        {incomeAllowed ? (
          <>
            <h3 className="form-section-title">فیس</h3>
            <p className="sub">
              فیس اور رسیدوں کی فہرست دیکھیں، نئی فیس درج کریں اور فیس کا
              شیڈول طے کریں۔
            </p>
            <div className="detail-rows">
              <div className="row">
                <span>کل وصول شدہ فیس</span>
                <strong>
                  {feesTotal === null
                    ? "—"
                    : `${feesTotal.toLocaleString("ur-PK")} روپے — ${(
                        feesCount ?? 0
                      ).toLocaleString("ur-PK")} رسیدیں`}
                </strong>
              </div>
            </div>
            <div className="form-actions">
              <Link className="btn-primary" href="/departments/income/fees">
                فیس دیکھیں
              </Link>
              <Link
                className="btn-ghost"
                href="/departments/income/schedule"
              >
                فیس کا شیڈول
              </Link>
            </div>
          </>
        ) : null}

        {fundsAllowed ? (
          <>
            <h3 className="form-section-title">زکوٰۃ، عشر اور عطیات</h3>
            <p className="sub">
              زکوٰۃ، عشر اور عطیات کا ملا ہوا ریکارڈ — نیا اندراج کرتے
              وقت "مد" بتائیں کہ پیسہ کس مد میں دے رہا ہے۔
            </p>
            <div className="detail-rows">
              {zakatAllowed ? (
                <div className="row">
                  <span>کل وصول شدہ زکوٰۃ</span>
                  <strong>
                    {zakatTotal === null
                      ? "—"
                      : `${zakatTotal.toLocaleString("ur-PK")} روپے`}
                  </strong>
                </div>
              ) : null}
              {ushrAllowed ? (
                <div className="row">
                  <span>کل وصول شدہ عشر</span>
                  <strong>
                    {ushrTotal === null
                      ? "—"
                      : `${ushrTotal.toLocaleString("ur-PK")} روپے`}
                  </strong>
                </div>
              ) : null}
              {donationsAllowed ? (
                <div className="row">
                  <span>کل عطیات</span>
                  <strong>
                    {donationsTotal === null
                      ? "—"
                      : `${donationsTotal.toLocaleString("ur-PK")} روپے`}
                  </strong>
                </div>
              ) : null}
            </div>
            <div className="form-actions">
              <Link className="btn-primary" href="/departments/income/funds">
                زکوٰۃ، عشر اور عطیات دیکھیں
              </Link>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
