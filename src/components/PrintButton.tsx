/**
 * پرنٹ کرنے کا بٹن (کلائنٹ)
 * براؤزر کا پرنٹ ڈائیلاگ کھولتا ہے — صارف وہاں سے پرنٹ یا PDF بنا سکتا ہے۔
 * (پہلے صرف رپورٹس والے صفحے میں تھا — مرحلہ 61 سے مشترکہ جزو)
 */
"use client";

export default function PrintButton() {
  return (
    <button
      type="button"
      className="btn-primary"
      onClick={() => window.print()}
    >
      پرنٹ کریں
    </button>
  );
}
