/**
 * موجودہ سال میں داخلہ (کلائنٹ) — طالبہ کی تفصیل کا صفحہ۔
 * صرف تب دکھتا ہے جب طالب علم کا موجودہ سال والا اندراج نہ ہو
 * (مثال: درآمد میں غلط سال چن لیا گیا ہو)۔ ایک دباؤ پر موجودہ
 * سال میں اندراج بن جاتا ہے — طالب علم کی موجودہ جماعت سے۔
 */
"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { enrollInCurrentYear } from "@/app/departments/students/actions";
import { t, type Lang } from "@/i18n/dictionary";

export default function CurrentYearEnrollButton({
  lang = "ur",
  studentId,
  yearLabel,
}: {
  lang?: Lang;
  studentId: string;
  yearLabel: string;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(ev: FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    setError("");
    setDone(false);
    const formData = new FormData(ev.currentTarget);
    setLoading(true);
    formData.set("lang", lang);
    const result = await enrollInCurrentYear(studentId, formData);
    setLoading(false);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    // محفوظ ہو گیا — صفحہ تازہ ہو تو بٹن خود غائب ہو جائے گا
    setDone(true);
    router.refresh();
  }

  return (
    <div>
      <form onSubmit={handleSubmit}>
        {error ? <p className="form-error">{error}</p> : null}
        {done ? <p className="sub">{t(lang, "student.current_enroll.saved")}</p> : null}

        <div className="form-actions">
          <button className="btn-primary" type="submit" disabled={loading || done}>
            {loading
              ? t(lang, "common.wait")
              : t(lang, "student.current_enroll.button", { year: yearLabel })}
          </button>
        </div>
      </form>
    </div>
  );
}
