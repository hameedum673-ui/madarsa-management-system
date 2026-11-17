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
  type ApprovedUser,
} from "@/lib/approval";
import { SECTION_IDS } from "@/lib/students";
import { t, type Lang } from "@/i18n/dictionary";

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

function groupLabel(allowed: Set<string>, lang: Lang): string {
  const hasEdu = EDU_MODULES.some((m) => allowed.has(m));
  const hasFin = FIN_MODULES.some((m) => allowed.has(m));
  if (hasEdu && hasFin) return t(lang, "staffm.group.both");
  if (hasEdu) return t(lang, "staffm.group.edu");
  if (hasFin) return t(lang, "staffm.group.fin");
  return "—";
}

/** اجازت کے خانے + سانچے کے بٹن — شامل کرنے اور بدلنے دونوں میں ایک جیسے */
function PermissionFields({
  allowedModules,
  setAllowedModules,
  allowedSections,
  setAllowedSections,
  lang,
}: {
  allowedModules: Set<string>;
  setAllowedModules: (next: Set<string>) => void;
  allowedSections: Set<string>;
  setAllowedSections: (next: Set<string>) => void;
  lang: Lang;
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
      <h3 className="form-section-title">{t(lang, "staffm.tpl.title")}</h3>
      <p className="sub">{t(lang, "staffm.tpl.sub")}</p>
      <div className="form-actions">
        <button
          type="button"
          className="btn-ghost"
          onClick={() => applyPreset("edu")}
        >
          {t(lang, "group.edu")}
        </button>
        <button
          type="button"
          className="btn-ghost"
          onClick={() => applyPreset("fin")}
        >
          {t(lang, "group.fin")}
        </button>
        <button
          type="button"
          className="btn-ghost"
          onClick={() => applyPreset("custom")}
        >
          {t(lang, "staffm.tpl.custom")}
        </button>
      </div>

      <h3 className="form-section-title">{t(lang, "staffm.tpl.section_title")}</h3>
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
              {t(lang, `section.${s}`)}
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
            <h3 className="form-section-title">{t(lang, `group.${group.id}`)}</h3>
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
                    {t(lang, `module.${m.id}`)}
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
export function AddStaffForm({ action, lang = "ur" }: { action: FormAction; lang?: Lang }) {
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
      <input type="hidden" name="lang" value={lang} />
      <h3 className="form-section-title">{t(lang, "staffm.form.add_title")}</h3>
      <p className="sub">{t(lang, "staffm.form.add_sub")}</p>
      <div className="form-grid">
        <label className="field">
          <span className="field-label">{t(lang, "staffm.form.name")}</span>
          <input
            className="field-input"
            name="name"
            type="text"
            required
            maxLength={100}
            placeholder={t(lang, "staffm.form.name_ph")}
          />
        </label>
        <label className="field">
          <span className="field-label">{t(lang, "user.form.email")}</span>
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
          <span className="field-label">{t(lang, "user.form.whatsapp")}</span>
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
          <span className="field-label">{t(lang, "staffm.form.designation")}</span>
          <input
            className="field-input"
            name="designation"
            type="text"
            required
            maxLength={100}
            placeholder={t(lang, "staffm.form.designation_ph")}
          />
        </label>
        <label className="field">
          <span className="field-label">{t(lang, "staffm.form.role")}</span>
          <select
            className="field-input"
            name="role"
            defaultValue="nazim_taleemat"
            required
          >
            {ASSIGNABLE_ROLES.map((r) => (
              <option key={r} value={r}>
                {t(lang, `role.${r}`)}
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
        lang={lang}
      />

      {error ? <p className="form-error">{error}</p> : null}
      {success ? (
        <p className="att-success">{t(lang, "staffm.form.added")}</p>
      ) : null}

      <div className="form-actions">
        <button className="btn-primary" type="submit" disabled={loading}>
          {loading ? t(lang, "common.waiting") : t(lang, "staffm.form.add")}
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
  lang = "ur",
}: {
  staffId: string;
  status: string;
  action: FormAction;
  lang?: Lang;
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
      <input type="hidden" name="lang" value={lang} />
      <input type="hidden" name="id" value={staffId} />
      <input
        type="hidden"
        name="status"
        value={active ? "disabled" : "approved"}
      />
      <button className="btn-ghost" type="submit" disabled={loading}>
        {loading
          ? t(lang, "common.waiting")
          : active
            ? t(lang, "staffm.status.disable")
            : t(lang, "users.reactivate")}
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
  lang = "ur",
}: {
  staffEmail: string;
  staffName: string;
  initialModules: Set<string>;
  initialSections: Set<string>;
  action: FormAction;
  onDone: () => void;
  lang?: Lang;
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
      <input type="hidden" name="lang" value={lang} />
      <input type="hidden" name="user_email" value={staffEmail} />
      <h3 className="form-section-title">
        {t(lang, "staffm.perms.title", { name: staffName, email: staffEmail })}
      </h3>
      <PermissionFields
        allowedModules={allowedModules}
        setAllowedModules={setAllowedModules}
        allowedSections={allowedSections}
        setAllowedSections={setAllowedSections}
        lang={lang}
      />
      {error ? <p className="form-error">{error}</p> : null}
      {success ? <p className="att-success">{t(lang, "staffm.perms.saved")}</p> : null}
      <div className="form-actions">
        <button className="btn-primary" type="submit" disabled={loading}>
          {loading ? t(lang, "common.waiting") : t(lang, "staffm.perms.save")}
        </button>
        <button type="button" className="btn-ghost" onClick={onDone}>
          {t(lang, "staffm.perms.close")}
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
  lang = "ur",
}: {
  staff: ApprovedUser[];
  permissionsByEmail: Record<string, { modules: string[]; sections: string[] }>;
  statusAction: FormAction;
  permissionsAction: FormAction;
  lang?: Lang;
}) {
  const [editingEmail, setEditingEmail] = useState<string | null>(null);

  if (staff.length === 0) {
    return <p className="sub">{t(lang, "staffm.list.empty")}</p>;
  }

  const editing = editingEmail
    ? staff.find((s) => s.email.toLowerCase() === editingEmail)
    : undefined;

  return (
    <>
      <table className="tbl">
        <thead>
          <tr>
            <th>{t(lang, "col.name")}</th>
            <th>Gmail</th>
            <th>{t(lang, "col.position")}</th>
            <th>{t(lang, "users.col_role")}</th>
            <th>{t(lang, "staffm.list.group")}</th>
            <th>{t(lang, "col.status")}</th>
            <th>{t(lang, "col.action")}</th>
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
                  {s.assigned_role ? t(lang, `role.${s.assigned_role}`) : "—"}
                </td>
                <td>{groupLabel(allowedSet, lang)}</td>
                <td>
                  {s.status === "approved"
                    ? t(lang, "staffm.status.active")
                    : t(lang, "staffm.status.inactive")}
                </td>
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
                    {t(lang, "staffm.list.permissions")}
                  </button>{" "}
                  <StaffStatusForm
                    staffId={s.id}
                    status={s.status}
                    action={statusAction}
                    lang={lang}
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
            lang={lang}
          />
        </div>
      ) : null}
    </>
  );
}
