import Link from "next/link";
import { GROUPS } from "@/data/departments";
import { Icon } from "@/components/icons";
import type { DepartmentGroup } from "@/lib/types";

/**
 * شعبہ جات کے گروپ اور ان کے بٹن — منظور شدہ ترتیب جوں کی توں:
 * تعلیمی (10)، مالیاتی (9)، پھر انتظامی (6) اور دیگر (2) ایک ساتھ۔
 * ہر بٹن اپنے شعبے کے الگ صفحے (/departments/…) پر جاتا ہے۔
 */

function GroupSection({
  group,
  isAdmin,
  deniedModules,
}: {
  group: DepartmentGroup;
  isAdmin: boolean;
  deniedModules: string[];
}) {
  // مرحلہ 25 — "صارفین اور اکاؤنٹس" بٹن صرف ایڈمن کو نظر آئے؛ عام صارف
  // کو نہ بٹن نظر آئے گا، نہ 404 ملے گا (صفحہ خود بھی ایڈمن کے لیے ہے)۔
  // مرحلہ 26 — بند شعبے کا بٹن بھی نظر نہیں آتا (middleware لنک بھی روکتا ہے)۔
  const modules = group.modules.filter(
    (m) =>
      (isAdmin || m.id !== "users") &&
      (isAdmin || !deniedModules.includes(m.id)),
  );
  // مرحلہ 47 — "طلبہ کا ریکارڈ" اور "نئے داخلے" ایک بٹن میں:
  // دونوں نظر آئیں تو ایک بٹن "داخلے اور طلبہ" دکھائیں؛ صرف ایک نظر
  // آئے تو وہی اکیلا بٹن دکھائیں۔ ڈیٹا (departments.ts) نہیں بدلا —
  // اجازتیں اور پرانے صفحے ویسے ہی رہتے ہیں۔
  const visibleIds = new Set(modules.map((m) => m.id));
  const showCombined =
    group.id === "edu" &&
    visibleIds.has("students") &&
    visibleIds.has("admissions");
  return (
    <section className="group" aria-label={group.title}>
      <div className="g-head">
        <span className="g-ic">
          <Icon name={group.icon} />
        </span>
        <h2>{group.title}</h2>
      </div>
      <div className={`tiles ${group.layout}`}>
        {modules.map((m) => {
          if (showCombined && m.id === "admissions") return null;
          const href =
            showCombined && m.id === "students"
              ? "/departments/admissions-students"
              : `/departments/${m.id}`;
          const label =
            showCombined && m.id === "students" ? "داخلے اور طلبہ" : m.label;
          return (
            <Link key={m.id} href={href} className="tile">
              <span className="tic">
                <Icon name={m.icon} />
              </span>
              <span className="tlabel">{label}</span>
              <span className="chev">
                <Icon name="chev" />
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

export default function DepartmentGroups({
  isAdmin = false,
  deniedModules = [],
}: {
  isAdmin?: boolean;
  deniedModules?: string[];
} = {}) {
  const [edu, fin, admin, other] = GROUPS;
  return (
    <>
      <GroupSection group={edu} isAdmin={isAdmin} deniedModules={deniedModules} />
      <GroupSection group={fin} isAdmin={isAdmin} deniedModules={deniedModules} />
      <div className="split">
        <div>
          <GroupSection group={admin} isAdmin={isAdmin} deniedModules={deniedModules} />
        </div>
        <div>
          <GroupSection group={other} isAdmin={isAdmin} deniedModules={deniedModules} />
        </div>
      </div>
    </>
  );
}
