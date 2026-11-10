/**
 * مرحلہ 12 — شناختی کارڈ پرنٹ کرنے کا بٹن (کلائنٹ)
 * window.print پرنٹ والے انداز (globals.css میں @media print) سے صرف کارڈ چھاپتا ہے۔
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
