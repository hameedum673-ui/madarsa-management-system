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
  showReportsHub,
}: {
  group: DepartmentGroup;
  isAdmin: boolean;
  deniedModules: string[];
  showReportsHub: boolean;
}) {
  // مرحلہ 25 — "صارفین اور اکاؤنٹس" بٹن صرف ایڈمن کو نظر آئے؛ عام صارف
  // کو نہ بٹن نظر آئے گا، نہ 404 ملے گا (صفحہ خود بھی ایڈمن کے لیے ہے)۔
  // مرحلہ 50 — "تنخواہیں" بٹن بھی صرف ایڈمن کو نظر آئے (تنخواہ خفیہ ہے)۔
  // مرحلہ 73 — "اختیارات اور اجازتیں" بٹن بھی صرف ایڈمن کو نظر آئے
  // (پہلے غیر ایڈمن کو یہ بٹن نظر آتا تھا، حالانکہ دبانے پر وہ ڈیش
  // بورڈ پر واپس جاتا تھا — بے کار بٹن)۔
  // مرحلہ 26 — بند شعبے کا بٹن بھی نظر نہیں آتا (middleware لنک بھی روکتا ہے)۔
  const modules = group.modules.filter(
    (m) =>
      (isAdmin ||
        (m.id !== "users" &&
          m.id !== "permissions" &&
          m.id !== "salaries")) &&
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
  // مرحلہ 57 — "طلبہ کی حاضری" اور "اساتذہ کی حاضری" ایک بٹن میں:
  // دونوں نظر آئیں تو ایک بٹن "حاضری" دکھائیں؛ صرف ایک نظر آئے
  // تو وہی اکیلا بٹن دکھائیں۔
  const showAttendanceHub =
    group.id === "edu" &&
    visibleIds.has("att-students") &&
    visibleIds.has("att-teachers");
  // مرحلہ 72 — "وظائف" اور "طلبہ کے اخراجات" ایک بٹن میں:
  // دونوں نظر آئیں تو ایک بٹن "وظائف اور طلبہ کے اخراجات" دکھائیں؛
  // صرف ایک نظر آئے تو وہی اکیلا بٹن دکھائیں۔
  const showWelfareHub =
    group.id === "fin" &&
    visibleIds.has("welfare") &&
    visibleIds.has("student-exp");
  // مرحلہ 73 — "صارفین اور اکاؤنٹس" اور "اختیارات اور اجازتیں" ایک بٹن میں:
  // دونوں نظر آئیں تو ایک بٹن "صارفین اور اختیارات" دکھائیں؛
  // صرف ایک نظر آئے تو وہی اکیلا بٹن دکھائیں۔ (دونوں ایڈمن کے لیے ہیں،
  // اس لیے غیر ایڈمن کو یہ بٹن کبھی نہیں دکھے گا۔)
  const showUsersHub =
    group.id === "admin" &&
    visibleIds.has("users") &&
    visibleIds.has("permissions");
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
          if (showAttendanceHub && m.id === "att-teachers") return null;
          if (showWelfareHub && m.id === "student-exp") return null;
          if (showUsersHub && m.id === "permissions") return null;
          // مرحلہ 48 — زکوٰۃ، عشر اور صدقات کے بٹن ڈیش بورڈ پر نہیں
          // دکھائے جاتے — وہ "آمدنی کا ریکارڈ" حب کے اندر ہیں۔
          if (
            group.id === "fin" &&
            (m.id === "zakat" || m.id === "ushr" || m.id === "donations")
          )
            return null;
          // مرحلہ 56 — رپورٹس کے 4 بٹن ایک میں: حب ہو تو سالانہ اور
          // مالیاتی رپورٹس کے بٹن چھپائیں؛ انتظامی گروپ میں
          // "رپورٹس" کا بٹن بھی چھپائیں۔
          if (
            showReportsHub &&
            ((group.id === "fin" &&
              (m.id === "yearly" || m.id === "fin-reports")) ||
              (group.id === "admin" && m.id === "reports"))
          )
            return null;
          const isReportsHubTile =
            showReportsHub && group.id === "fin" && m.id === "monthly";
          const isAttendanceHubTile =
            showAttendanceHub && group.id === "edu" && m.id === "att-students";
          const isWelfareHubTile =
            showWelfareHub && group.id === "fin" && m.id === "welfare";
          const isUsersHubTile =
            showUsersHub && group.id === "admin" && m.id === "users";
          const href = isReportsHubTile
            ? "/departments/reports-hub"
            : isAttendanceHubTile
              ? "/departments/attendance"
              : isWelfareHubTile
                ? "/departments/welfare-expenses"
                : isUsersHubTile
                  ? "/departments/users-permissions"
                  : showCombined && m.id === "students"
                    ? "/departments/admissions-students"
                    : `/departments/${m.id}`;
          const label = isReportsHubTile
            ? "رپورٹس"
            : isAttendanceHubTile
              ? "حاضری"
              : isWelfareHubTile
                ? "وظائف اور طلبہ کے اخراجات"
                : isUsersHubTile
                  ? "صارفین اور اختیارات"
                  : showCombined && m.id === "students"
                    ? "داخلے اور طلبہ"
                    : m.label;
          const icon = isReportsHubTile ? "report" : m.icon;
          return (
            <Link key={m.id} href={href} className="tile">
              <span className="tic">
                <Icon name={icon} />
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
  // مرحلہ 56 — رپورٹس کے 4 بٹن ایک میں: چاروں میں سے کم از کم 2
  // کی اجازت ہو تو حب کا بٹن دکھائیں؛ صرف ایک کی اجازت ہو تو وہی
  // اکیلا بٹن دکھے (حب نہیں)۔
  const isVisible = (id: string) =>
    (isAdmin || (id !== "users" && id !== "salaries")) &&
    (isAdmin || !deniedModules.includes(id));
  const showReportsHub =
    ["monthly", "yearly", "fin-reports", "reports"].filter(isVisible)
      .length >= 2;
  return (
    <>
      <GroupSection group={edu} isAdmin={isAdmin} deniedModules={deniedModules} showReportsHub={showReportsHub} />
      <GroupSection group={fin} isAdmin={isAdmin} deniedModules={deniedModules} showReportsHub={showReportsHub} />
      <div className="split">
        <div>
          <GroupSection group={admin} isAdmin={isAdmin} deniedModules={deniedModules} showReportsHub={showReportsHub} />
        </div>
        <div>
          <GroupSection group={other} isAdmin={isAdmin} deniedModules={deniedModules} showReportsHub={showReportsHub} />
        </div>
      </div>
    </>
  );
}
