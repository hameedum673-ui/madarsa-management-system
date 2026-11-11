/**
 * مرحلہ 49 — ملا ہوا نیا اندراج (سرور صفحہ)
 * "مد" والا ڈبہ بتاتا ہے کہ پیسہ کس مد میں دے رہا ہے — صرف وہ مد
 * نظر آئیں گی جن کی اجازت ہے۔
 */
import BackButton from "@/components/BackButton";
import { redirect } from "next/navigation";
import FundsForm from "@/app/departments/income/funds/FundsForm";
import { addFundRecord } from "@/app/departments/income/funds/actions";
import { createClient } from "@/lib/supabase/server";
import { isAppAdmin } from "@/lib/approval";
import { FUND_CATEGORIES, type FundCategory } from "@/lib/funds";

export default async function NewFundPage() {
  const supabase = await createClient();
  const admin = await isAppAdmin(supabase);

  let allowedFunds: FundCategory[] = [...FUND_CATEGORIES];
  if (!admin) {
    const { data: zAllowed } = await supabase.rpc("my_module_allowed", {
      p_module: "zakat",
    });
    const { data: uAllowed } = await supabase.rpc("my_module_allowed", {
      p_module: "ushr",
    });
    const { data: dAllowed } = await supabase.rpc("my_module_allowed", {
      p_module: "donations",
    });
    allowedFunds = [];
    if (zAllowed !== false) allowedFunds.push("zakat");
    if (uAllowed !== false) allowedFunds.push("ushr");
    if (dAllowed !== false) allowedFunds.push("sadaqah", "other");
    // ترتیب: صدقات، زکوٰۃ، عشر، دیگر
    allowedFunds.sort(
      (a, b) =>
        FUND_CATEGORIES.indexOf(a) - FUND_CATEGORIES.indexOf(b),
    );
  }

  // تینوں کی اجازت نہیں ہے → ڈیش بورڈ پر واپس
  if (allowedFunds.length === 0) {
    redirect("/");
  }

  return (
    <div className="module-view open">
      <div className="page-card">
        <div className="page-head">
          <BackButton href="/departments/income/funds" />
          <h2>نیا اندراج — زکوٰۃ، عشر اور عطیات</h2>
        </div>
        <FundsForm action={addFundRecord} allowedFunds={allowedFunds} />
      </div>
    </div>
  );
}
