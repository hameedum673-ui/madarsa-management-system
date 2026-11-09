/**
 * مرحلہ 10 — نمبر درج کرنے کا فارم (طالبہ × مضمون)
 * ہر خانے میں 0 سے 100 تک نمبر؛ خالی خانہ چھوڑنے سے اس مضمون کا نمبر نہیں بدلتا۔
 * پہلے سے درج نمبر خانوں میں بھرے ہوئے آتے ہیں — غلط نمبر درست کر کے دوبارہ
 * محفوظ کریں۔
 */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface StudentRow {
  id: string;
  name: string;
  father_name: string;
  registration_number: string;
}

export default function MarksForm({
  examId,
  students,
  subjects,
  existing,
  action,
}: {
  examId: string;
  students: StudentRow[];
  subjects: string[];
  existing: Record<string, Record<number, number>>;
  action: (
    examId: string,
    formData: FormData,
  ) => Promise<{ ok: true } | { error: string }>;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSaved(false);
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const res = await action(examId, formData);
    setLoading(false);
    if ("error" in res) {
      setError(res.error);
      return;
    }
    setSaved(true);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="tbl-wrap">
        <table className="tbl">
          <thead>
            <tr>
              <th>رجسٹریشن نمبر</th>
              <th>نام</th>
              {subjects.map((s) => (
                <th key={s}>{s} (100)</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {students.map((st) => (
              <tr key={st.id}>
                <td>{st.registration_number}</td>
                <td>
                  {st.name}
                  <br />
                  <span className="sub">{st.father_name}</span>
                </td>
                {subjects.map((s, idx) => (
                  <td key={s}>
                    <input
                      className="field-input"
                      style={{ width: "72px", textAlign: "center" }}
                      name={`marks_${st.id}_${idx}`}
                      type="number"
                      min={0}
                      max={100}
                      step={1}
                      inputMode="numeric"
                      defaultValue={existing[st.id]?.[idx] ?? ""}
                      placeholder="—"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {error ? <p className="form-error">{error}</p> : null}
      {saved ? (
        <p className="att-success">نمبر محفوظ ہو گئے ہیں۔</p>
      ) : null}

      <div className="form-actions">
        <button className="btn-primary" type="submit" disabled={loading}>
          {loading ? "براہِ کرم انتظار کریں…" : "نمبر محفوظ کریں"}
        </button>
      </div>
    </form>
  );
}
