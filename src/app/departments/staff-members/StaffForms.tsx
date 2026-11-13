/**
 * حصہ 3 — عملے کے فارم (کلائنٹ)
 * مالک عملہ شامل کرتا ہے، سانچہ چنتا ہے (تعلیمی / مالیاتی / اپنی مرضی)،
 * اور ہر عملے کی اجازتیں بعد میں بھی بدل سکتا ہے۔
 * تنخواہیں، بیک اپ اور عمومی ریکارڈ ہمیشہ صرف مالک کے لیے ہیں —
 * ان کے خانے یہاں دکھائے ہی نہیں جاتے (سرور بھی انہیں زبردستی بند رکھتا ہے)۔
 */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GROUPS } from "@/data/departments";
import {
  ASSIGNABLE_ROLES,
  ROLE_LABELS,
  type ApprovedUser,
} from "@/lib/approval";
import { SECTION_IDS, SECTION_LABELS } from "@/lib/students";

type FormAction = (
  formData: FormData,
) => Promise<{ ok: true } | { error: string }>;

/** یہ ماڈیول عملے کے فارم میں دکھائے نہیں جاتے */
const HIDDEN_MODULES = new Set([
  "users",
  "permissions",
  "salaries",
  "backup",
  "settings",
  "general",
]);

const EDU_MODULES: string[] =
  GROUPS.find((g) => g.id === "edu")?.modules.map((m) => m.id) ?? [];
const FIN_MODULES: string[] =
  GROUPS.find((g) => g.id === "fin")?.modules.map((m) => m.id) ?? [];

function groupLabel(allowed: Set<string>): string {
  const hasEdu = EDU_MODULES.some((m) => allowed.has(m));
  const hasFin = FIN_MODULES.some((m) => allowed.has(m));
  if (hasEdu && hasFin) return "تعلیمی + مالیاتی";
  if (hasEdu) return "تعلیمی";
  if (hasFin) return "مالیاتی";
  return "—";
}

/** اجازت کے خانے + سانچے کے بٹن — شامل کرنے اور بدلنے دونوں میں ایک جیسے */
function PermissionFields({
  allowedModules,
  setAllowedModules,
  allowedSections,
  setAllowedSections,
}: {
  allowedModules: Set<string>;
  setAllowedModules: (next: Set<string>) => void;
  allowedSections: Set<string>;
  setAllowedSections: (next: Set<string>) => void;
}) {
  function applyPreset(preset: "edu" | "fin" | "custom") {
    if (preset === "edu") setAllowedModules(new Set(EDU_MODULES));
    else if (preset === "fin") setAllowedModules(new Set(FIN_MODULES));
    else setAllowedModules(new Set());
  }

  function toggleModule(id: string, checked: boolean) {
    const next = new Set(allowedModules);
    if (checked) next.add(id);
    else next.delete(id);
    setAllowedModules(next);
  }

  function toggleSection(id: string, checked: boolean) {
    const next = new Set(allowedSections);
    if (checked) next.add(id);
    else next.delete(id);
    setAllowedSections(next);
  }

  return (
    <>
      <h3 className="form-section-title">اجازت کا سانچہ</h3>
      <p className="sub">
        سانچہ چنیں تو خانے خود بھر جائیں گے — پھر چاہیں تو الگ الگ خانے بدل
        سکتے ہیں۔ تنخواہیں، بیک اپ اور عمومی ریکارڈ ہمیشہ صرف مالک کے لیے
        رہیں گے۔
      </p>
      <div className="form-actions">
        <button
          type="button"
          className="btn-ghost"
          onClick={() => applyPreset("edu")}
        >
          تعلیمی شعبہ
        </button>
        <button
          type="button"
          className="btn-ghost"
          onClick={() => applyPreset("fin")}
        >
          مالیاتی شعبہ
        </button>
        <button
          type="button"
          className="btn-ghost"
          onClick={() => applyPreset("custom")}
        >
          اپنی مرضی (سب خالی)
        </button>
      </div>

      <h3 className="form-section-title">شعبہ (بنین / بنات)</h3>
      <div className="form-grid">
        {SECTION_IDS.map((s) => (
          <label className="field" key={s}>
            <span className="field-label">
              <input
                type="checkbox"
                name={`sec_${s}`}
                checked={allowedSections.has(s)}
                onChange={(e) => toggleSection(s, e.target.checked)}
              />{" "}
              {SECTION_LABELS[s]}
            </span>
          </label>
        ))}
      </div>

      {GROUPS.map((group) => {
        const modules = group.modules.filter(
          (m) => !HIDDEN_MODULES.has(m.id),
        );
        if (modules.length === 0) return null;
        return (
          <div key={group.id}>
            <h3 className="form-section-title">{group.title}</h3>
            <div className="form-grid">
              {modules.map((m) => (
                <label className="field" key={m.id}>
                  <span className="field-label">
                    <input
                      type="checkbox"
                      name={`mod_${m.id}`}
                      checked={allowedModules.has(m.id)}
                      onChange={(e) => toggleModule(m.id, e.target.checked)}
                    />{" "}
                    {m.label}
                  </span>
                </label>
              ))}
            </div>
          </div>
        );
      })}
    </>
  );
}

/** نیا عملہ شامل کرنے کا فارم */
export function AddStaffForm({ action }: { action: FormAction }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [allowedModules, setAllowedModules] = useState<Set<string>>(
    new Set(EDU_MODULES),
  );
  const [allowedSections, setAllowedSections] = useState<Set<string>>(
    new Set(SECTION_IDS),
  );
  const [formKey, setFormKey] = useState(0);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setLoading(true);
    const res = await action(new FormData(e.currentTarget));
    setLoading(false);
    if ("error" in res) {
      setError(res.error);
      return;
    }
    setSuccess(true);
    setAllowedModules(new Set(EDU_MODULES));
    setAllowedSections(new Set(SECTION_IDS));
    setFormKey((k) => k + 1);
    router.refresh();
  }

  return (
    <form key={formKey} onSubmit={handleSubmit}>
      <h3 className="form-section-title">نیا عملہ شامل کریں</h3>
      <p className="sub">
        عملہ آپ کے مدرسے سے جڑے گا — اس کا اپنا الگ مدرسہ نہیں بنے گا۔ وہ
        صرف وہی شعبے دیکھے گا جو آپ کھولیں گے؛ صارفین شامل کرنا، تنخواہیں
        اور بیک اپ ہمیشہ صرف آپ کے لیے رہیں گے۔
      </p>
      <div className="form-grid">
        <label className="field">
          <span className="field-label">عملے کا نام *</span>
          <input
            className="field-input"
            name="name"
            type="text"
            required
            maxLength={100}
            placeholder="مثلاً فاطمہ"
          />
        </label>
        <label className="field">
          <span className="field-label">Gmail *</span>
          <input
            className="field-input"
            name="email"
            type="email"
            dir="ltr"
            required
            maxLength={200}
            placeholder="you@gmail.com"
          />
        </label>
        <label className="field">
          <span className="field-label">واٹس ایپ نمبر</span>
          <input
            className="field-input"
            name="whatsapp"
            type="tel"
            dir="ltr"
            maxLength={20}
            placeholder="03xx-xxxxxxx"
          />
        </label>
        <label className="field">
          <span className="field-label">عہدہ *</span>
          <input
            className="field-input"
            name="designation"
            type="text"
            required
            maxLength={100}
            placeholder="مثلاً ناظم تعلیمات"
          />
        </label>
        <label className="field">
          <span className="field-label">کردار *</span>
          <select
            className="field-input"
            name="role"
            defaultValue="nazim_taleemat"
            required
          >
            {ASSIGNABLE_ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <PermissionFields
        allowedModules={allowedModules}
        setAllowedModules={setAllowedModules}
        allowedSections={allowedSections}
        setAllowedSections={setAllowedSections}
      />

      {error ? <p className="form-error">{error}</p> : null}
      {success ? (
        <p className="att-success">عملہ شامل ہو گیا — اب وہ اپنی Gmail سے لاگ ان کر سکتا ہے۔</p>
      ) : null}

      <div className="form-actions">
        <button className="btn-primary" type="submit" disabled={loading}>
          {loading ? "براہِ کرم انتظار کریں…" : "عملہ شامل کریں"}
        </button>
      </div>
    </form>
  );
}

/** عملے کی رسائی بند / بحال کرنے کا بٹن */
export function StaffStatusForm({
  staffId,
  status,
  action,
}: {
  staffId: string;
  status: string;
  action: FormAction;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const active = status === "approved";

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await action(new FormData(e.currentTarget));
    setLoading(false);
    if ("error" in res) {
      setError(res.error);
      return;
    }
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "inline" }}>
      <input type="hidden" name="id" value={staffId} />
      <input
        type="hidden"
        name="status"
        value={active ? "disabled" : "approved"}
      />
      <button className="btn-ghost" type="submit" disabled={loading}>
        {loading
          ? "براہِ کرم انتظار کریں…"
          : active
            ? "رسائی بند کریں"
            : "دوبارہ فعال کریں"}
      </button>
      {error ? <p className="form-error">{error}</p> : null}
    </form>
  );
}

/** موجودہ عملے کی اجازتیں بدلنے کا فارم */
function StaffPermissionsEditor({
  staffEmail,
  staffName,
  initialModules,
  initialSections,
  action,
  onDone,
}: {
  staffEmail: string;
  staffName: string;
  initialModules: Set<string>;
  initialSections: Set<string>;
  action: FormAction;
  onDone: () => void;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [allowedModules, setAllowedModules] =
    useState<Set<string>>(initialModules);
  const [allowedSections, setAllowedSections] =
    useState<Set<string>>(initialSections);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setLoading(true);
    const res = await action(new FormData(e.currentTarget));
    setLoading(false);
    if ("error" in res) {
      setError(res.error);
      return;
    }
    setSuccess(true);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit}>
      <input type="hidden" name="user_email" value={staffEmail} />
      <h3 className="form-section-title">
        {staffName} ({staffEmail}) کی اجازتیں
      </h3>
      <PermissionFields
        allowedModules={allowedModules}
        setAllowedModules={setAllowedModules}
        allowedSections={allowedSections}
        setAllowedSections={setAllowedSections}
      />
      {error ? <p className="form-error">{error}</p> : null}
      {success ? <p className="att-success">اجازتیں محفوظ ہو گئیں۔</p> : null}
      <div className="form-actions">
        <button className="btn-primary" type="submit" disabled={loading}>
          {loading ? "براہِ کرم انتظار کریں…" : "اجازتیں محفوظ کریں"}
        </button>
        <button type="button" className="btn-ghost" onClick={onDone}>
          بند کریں
        </button>
      </div>
    </form>
  );
}

/** عملے کی فہرست + اجازتیں بدلنے کا انتخاب */
export function StaffList({
  staff,
  permissionsByEmail,
  statusAction,
  permissionsAction,
}: {
  staff: ApprovedUser[];
  permissionsByEmail: Record<string, { modules: string[]; sections: string[] }>;
  statusAction: FormAction;
  permissionsAction: FormAction;
}) {
  const [editingEmail, setEditingEmail] = useState<string | null>(null);

  if (staff.length === 0) {
    return <p className="sub">ابھی کوئی عملہ شامل نہیں ہے۔</p>;
  }

  const editing = editingEmail
    ? staff.find((s) => s.email.toLowerCase() === editingEmail)
    : undefined;

  return (
    <>
      <table className="tbl">
        <thead>
          <tr>
            <th>نام</th>
            <th>Gmail</th>
            <th>عہدہ</th>
            <th>کردار</th>
            <th>کھلا گروپ</th>
            <th>حالت</th>
            <th>کارروائی</th>
          </tr>
        </thead>
        <tbody>
          {staff.map((s) => {
            const perms = permissionsByEmail[s.email.toLowerCase()];
            const allowedSet = new Set(perms?.modules ?? []);
            return (
              <tr key={s.id}>
                <td>{s.name}</td>
                <td dir="ltr">{s.email}</td>
                <td>{s.designation ?? "—"}</td>
                <td>
                  {s.assigned_role ? ROLE_LABELS[s.assigned_role] : "—"}
                </td>
                <td>{groupLabel(allowedSet)}</td>
                <td>{s.status === "approved" ? "فعال" : "غیر فعال"}</td>
                <td>
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() =>
                      setEditingEmail(
                        editingEmail === s.email.toLowerCase()
                          ? null
                          : s.email.toLowerCase(),
                      )
                    }
                  >
                    اجازتیں
                  </button>{" "}
                  <StaffStatusForm
                    staffId={s.id}
                    status={s.status}
                    action={statusAction}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {editing ? (
        <div style={{ marginTop: 16 }}>
          <StaffPermissionsEditor
            key={editing.email.toLowerCase()}
            staffEmail={editing.email}
            staffName={editing.name}
            initialModules={
              new Set(permissionsByEmail[editing.email.toLowerCase()]?.modules ?? [])
            }
            initialSections={
              new Set(permissionsByEmail[editing.email.toLowerCase()]?.sections ?? [])
            }
            action={permissionsAction}
            onDone={() => setEditingEmail(null)}
          />
        </div>
      ) : null}
    </>
  );
}
