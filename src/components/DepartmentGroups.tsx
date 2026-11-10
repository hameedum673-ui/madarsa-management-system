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
}: {
  group: DepartmentGroup;
  isAdmin: boolean;
}) {
  // مرحلہ 25 — "صارفین اور اکاؤنٹس" بٹن صرف ایڈمن کو نظر آئے؛ عام صارف
  // کو نہ بٹن نظر آئے گا، نہ 404 ملے گا (صفحہ خود بھی ایڈمن کے لیے ہے)۔
  const modules = group.modules.filter(
    (m) => isAdmin || m.id !== "users",
  );
  return (
    <section className="group" aria-label={group.title}>
      <div className="g-head">
        <span className="g-ic">
          <Icon name={group.icon} />
        </span>
        <h2>{group.title}</h2>
      </div>
      <div className={`tiles ${group.layout}`}>
        {modules.map((m) => (
          <Link key={m.id} href={`/departments/${m.id}`} className="tile">
            <span className="tic">
              <Icon name={m.icon} />
            </span>
            <span className="tlabel">{m.label}</span>
            <span className="chev">
              <Icon name="chev" />
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

export default function DepartmentGroups({
  isAdmin = false,
}: {
  isAdmin?: boolean;
} = {}) {
  const [edu, fin, admin, other] = GROUPS;
  return (
    <>
      <GroupSection group={edu} isAdmin={isAdmin} />
      <GroupSection group={fin} isAdmin={isAdmin} />
      <div className="split">
        <div>
          <GroupSection group={admin} isAdmin={isAdmin} />
        </div>
        <div>
          <GroupSection group={other} isAdmin={isAdmin} />
        </div>
      </div>
    </>
  );
}
