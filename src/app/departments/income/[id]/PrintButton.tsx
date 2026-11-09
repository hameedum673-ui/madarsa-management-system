/**
 * مرحلہ 8 — رسید پرنٹ کرنے کا بٹن (کلائنٹ)
 * window.print پرنٹ والے انداز (globals.css میں @media print) سے صرف رسید چھاپتا ہے۔
 */
"use client";

export default function PrintButton() {
  return (
    <button
      className="btn-primary"
      type="button"
      onClick={() => window.print()}
    >
      پرنٹ کریں
    </button>
  );
}
