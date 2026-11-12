/**
 * مرحلہ 57 — حاضری کا حب: طلبہ کی حاضری + اساتذہ کی حاضری ایک بٹن میں۔
 * ڈیش بورڈ پر دونوں بٹنوں کی جگہ ایک بٹن "حاضری" ہے — یہ صفحہ اسی
 * بٹن سے کھلتا ہے۔ اندر دو حصے ہیں۔ دونوں پرانے صفحے ویسے ہی رہتے
 * ہیں؛ اجازتیں بھی الگ الگ ہی رہتی ہیں — جسے دونوں کی اجازت نہیں
 * ہے، وہ یہ صفحہ نہیں کھول سکتا۔
 */
import Link from "next/link";
import { redirect } from "next/navigation";
import BackButton from "@/components/BackButton";
import { createClient } from "@/lib/supabase/server";
import { isAppAdmin } from "@/lib/approval";

const ATTENDANCE_MODULES = [
  {
    id: "att-students",
    title: "طلبہ کی حاضری",
    desc: "طلبہ کی روزانہ حاضری درج کریں اور دیکھیں۔",
    href: "/departments/att-students",
  },
  {
    id: "att-teachers",
    title: "اساتذہ کی حاضری",
    desc: "اساتذہ کی روزانہ حاضری درج کریں اور دیکھیں۔",
    href: "/departments/att-teachers",
  },
] as const;

export default async function AttendanceHubPage() {
  const supabase = await createClient();
  const admin = await isAppAdmin(supabase);

  const allowed: Record<string, boolean> = {};
  for (const m of ATTENDANCE_MODULES) {
    if (admin) {
      allowed[m.id] = true;
    } else {
      const { data } = await supabase.rpc("my_module_allowed", {
        p_module: m.id,
      });
      // فنکشن نہ چلا تو اجازت ہے — پرانا کام نہیں رکتا
      allowed[m.id] = data !== false;
    }
  }

  // دونوں کی اجازت نہیں ہے → ڈیش بورڈ پر واپس
  if (!ATTENDANCE_MODULES.some((m) => allowed[m.id])) {
    redirect("/");
  }

  return (
    <div className="module-view open">
      <div className="page-card">
        <div className="page-head">
          <BackButton />
          <h2>حاضری</h2>
        </div>

        {ATTENDANCE_MODULES.filter((m) => allowed[m.id]).map((m) => (
          <div key={m.id}>
            <h3 className="form-section-title">{m.title}</h3>
            <p className="sub">{m.desc}</p>
            <div className="form-actions">
              <Link className="btn-primary" href={m.href}>
                {m.title} کھولیں
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
