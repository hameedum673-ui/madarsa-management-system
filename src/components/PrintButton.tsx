/**
 * پرنٹ کرنے کا بٹن (کلائنٹ)
 * براؤزر کا پرنٹ ڈائیلاگ کھولتا ہے — صارف وہاں سے پرنٹ یا PDF بنا سکتا ہے۔
 * (پہلے صرف رپورٹس والے صفحے میں تھا — مرحلہ 61 سے مشترکہ جزو)
 */
"use client";

import { t, type Lang } from "@/i18n/dictionary";

export default function PrintButton({ lang = "ur" }: { lang?: Lang }) {
  return (
    <button
      type="button"
      className="btn-primary"
      onClick={() => window.print()}
    >
      {t(lang, "common.print")}
    </button>
  );
}
