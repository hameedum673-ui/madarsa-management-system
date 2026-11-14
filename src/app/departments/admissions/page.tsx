/**
 * مرحلہ 9 — نئے داخلوں کی فہرست (سرور صفحہ)
 * صرف اپنے مدرسے کی درخواستیں نظر آتی ہیں — RLS پالیسی یہ یقین دلاتی ہے۔
 * میز ابھی نہ بنی ہو (migration 007 نہ چلی ہو) تو صاف پیغام دکھایا جاتا ہے۔
 */
import Link from "next/link";
import BackButton from "@/components/BackButton";
import { createClient } from "@/lib/supabase/server";
import { parsePage, pageRange, pageCount } from "@/lib/pagination";
import Pagination from "@/components/Pagination";
import { getMyAllowedSections } from "@/lib/permissions";
import {
  ADMISSION_STATUS_IDS,
  ADMISSION_TYPE_IDS,
  type Admission,
  type AdmissionStatus,
} from "@/lib/admissions";
import type { AdmissionType } from "@/lib/students";
import {
  SECTION_IDS,
  type SectionId,
} from "@/lib/students";
import { getMyLanguage } from "@/lib/language";
import { t } from "@/i18n/dictionary";

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("ur-PK");
}

export default async function AdmissionsPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    section?: string;
    admission_type?: string;
    page?: string;
  }>;
}) {
  const params = await searchParams;
  const rawStatus = params.status ?? "all";
  const status: AdmissionStatus | "all" = (
    ADMISSION_STATUS_IDS as string[]
  ).includes(rawStatus)
    ? (rawStatus as AdmissionStatus)
    : "all";

  // مرحلہ 74 — داخلے کی قسم کا فلٹر (پہلے سے "سب")
  const rawAdmissionType = params.admission_type ?? "all";
  const admissionType: AdmissionType | "all" = (
    ADMISSION_TYPE_IDS as string[]
  ).includes(rawAdmissionType)
    ? (rawAdmissionType as AdmissionType)
    : "all";

  // مرحلہ 51 — شعبے کا فلٹر (پہلے سے "سب")
  const supabase = await createClient();
  const langP = getMyLanguage();
  // مرحلہ 54 — اجازت والے شعبے (بنین / بنات)
  const allowedSections = await getMyAllowedSections(supabase);
  const lang = await langP;
  const rawSection = params.section ?? "all";
  const section: SectionId | "all" =
    (SECTION_IDS as string[]).includes(rawSection) &&
    allowedSections.has(rawSection as SectionId)
      ? (rawSection as SectionId)
      : "all";

  // مرحلہ 58 — صفحہ بندی (ہر صفحے پر 20 ریکارڈ)
  const page = parsePage(params.page);
  const { from, to } = pageRange(page);

  let query = supabase
    .from("admissions")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });
  if (status !== "all") query = query.eq("status", status);
  if (section !== "all") query = query.eq("section", section);
  if (admissionType !== "all")
    query = query.eq("admission_type", admissionType);
  if (allowedSections.size < 2)
    query = query.eq("section", [...allowedSections][0] ?? "__none__");
  query = query.range(from, to);
  const { data, error, count } = await query;

  const admissions = (data ?? []) as Admission[];
  const pages = pageCount(count);
  const tableMissing =
    (error as { code?: string } | null)?.code === "42P01";

  // حالت کے حساب سے گنتی (فلٹر سے آزاد — فہرست کے اوپر خلاصہ)
  const { data: allData } = await supabase
    .from("admissions")
    .select("status");
  const counts = { all: 0, pending: 0, approved: 0, rejected: 0 };
  for (const row of (allData ?? []) as { status: AdmissionStatus }[]) {
    counts.all += 1;
    counts[row.status] += 1;
  }

  return (
    <div className="module-view open">
      <div className="page-card">
        <div className="page-head">
          <BackButton href="/departments/admissions-students" />
          <h2>{t(lang, "module.admissions")}</h2>
          <span className="page-count">
            {t(lang, "admissions.count", {
              all: counts.all.toLocaleString("ur-PK"),
              pending: counts.pending.toLocaleString("ur-PK"),
              approved: counts.approved.toLocaleString("ur-PK"),
              rejected: counts.rejected.toLocaleString("ur-PK"),
            })}
          </span>
          <span className="spacer" />
          <Link className="btn-primary" href="/departments/admissions/new">
            {t(lang, "admissions.add")}
          </Link>
        </div>

        <form className="att-controls" method="get">
          <label className="att-field">
            <span className="att-label">{t(lang, "admissions.filter_status")}</span>
            <select
              className="att-input"
              name="status"
              defaultValue={status}
            >
              <option value="all">{t(lang, "common.all")}</option>
              {ADMISSION_STATUS_IDS.map((s) => (
                <option key={s} value={s}>
                  {t(lang, `admission.status.${s}`)}
                </option>
              ))}
            </select>
          </label>
          <label className="att-field">
            <span className="att-label">{t(lang, "admissions.filter_type")}</span>
            <select
              className="att-input"
              name="admission_type"
              defaultValue={admissionType}
            >
              <option value="all">{t(lang, "common.all")}</option>
              {ADMISSION_TYPE_IDS.map((t2) => (
                <option key={t2} value={t2}>
                  {t(lang, `admission.type.${t2}`)}
                </option>
              ))}
            </select>
          </label>
          <label className="att-field">
            <span className="att-label">{t(lang, "admissions.filter_section")}</span>
            <select
              className="att-input"
              name="section"
              defaultValue={section}
            >
              <option value="all">{t(lang, "common.all")}</option>
              {SECTION_IDS.filter((s) => allowedSections.has(s)).map((s) => (
                <option key={s} value={s}>
                  {t(lang, `section.${s}`)}
                </option>
              ))}
            </select>
          </label>
          <button className="btn-primary" type="submit">
            {t(lang, "common.show")}
          </button>
        </form>

        {tableMissing ? (
          <p className="empty-state">{t(lang, "admissions.table_missing")}</p>
        ) : error ? (
          <p className="empty-state">{t(lang, "common.list_error")}</p>
        ) : admissions.length === 0 ? (
          <p className="empty-state">{t(lang, "admissions.empty")}</p>
        ) : (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>{t(lang, "col.name")}</th>
                  <th>{t(lang, "col.father")}</th>
                  <th>{t(lang, "col.dept")}</th>
                  <th>{t(lang, "col.section")}</th>
                  <th>{t(lang, "col.class")}</th>
                  <th>{t(lang, "col.type")}</th>
                  <th>{t(lang, "col.request_date")}</th>
                  <th>{t(lang, "col.status")}</th>
                </tr>
              </thead>
              <tbody>
                {admissions.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <Link href={`/departments/admissions/${a.id}`}>
                        {a.applicant_name}
                      </Link>
                    </td>
                    <td>{a.father_name}</td>
                    <td>{t(lang, `dept.${a.department}`)}</td>
                    <td>{t(lang, `section.${a.section}`)}</td>
                    <td>{a.class_name ?? "—"}</td>
                    <td>{t(lang, `admission.type.${a.admission_type}`)}</td>
                    <td>{formatDate(a.created_at)}</td>
                    <td>
                      <span
                        className={`badge${a.status === "rejected" ? " badge-withdrawn" : ""}`}
                      >
                        {t(lang, `admission.status.${a.status}`)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Pagination page={page} totalPages={pages} params={params} lang={lang} />

      </div>
    </div>
  );
}
