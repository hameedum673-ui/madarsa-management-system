/**
 * مرحلہ 36 — جماعت کا انتخاب فہرست سے (مشترکہ جزو)
 * طالبہ، داخلہ اور امتحان — تینوں فارم یہی جزو استعمال کرتے ہیں۔
 * - فہرست صرف چنے ہوئے شعبے کی جماعتیں دکھاتی ہے۔
 * - "دیگر (ہاتھ سے لکھیں)" چننے پر ہاتھ سے لکھنے والا خانہ کھلتا ہے۔
 * - پرانی ہاتھ سے لکھی جماعت (جو فہرست میں نہیں) بھی "دیگر" کے طور پر
 *   محفوظ رہتی ہے — اس کا نام ضائع نہیں ہوتا۔
 * - مدرسے میں کوئی جماعت درج نہ ہو تو ہاتھ سے لکھنے والا خانہ اور
 *   درجات میں جماعت شامل کرنے کا لنک دکھایا جاتا ہے۔
 * سرور کو ہمیشہ ایک ہی خانہ ملتا ہے: class_name (سرور کی جانچ نہیں بدلی)۔
 */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { ClassOption } from "@/lib/classes";
import { t, type Lang } from "@/i18n/dictionary";

const OTHER = "__other__";

export default function ClassSelect({
  classes,
  department,
  section,
  initialClassName,
  lang = "ur",
}: {
  classes: ClassOption[];
  department: string;
  // مرحلہ 51 — شعبہ دیا جائے تو جماعتیں اسی شعبے کی دکھائیں؛ نہ دیا
  // جائے (امتحان والا فارم) تو دونوں شعبوں کی جماعتیں دکھائیں۔
  section?: string;
  initialClassName?: string | null;
  // مرحلہ 103 — زبان نہ دی جائے تو اردو (دوسرے ماڈیول ویسے ہی رہتے ہیں)
  lang?: Lang;
}) {
  const inList = initialClassName
    ? classes.some((c) => c.name === initialClassName)
    : false;
  const [selected, setSelected] = useState(
    initialClassName ? (inList ? initialClassName : OTHER) : "",
  );
  const [otherText, setOtherText] = useState(
    initialClassName && !inList ? initialClassName : "",
  );

  const deptClasses = classes.filter(
    (c) => c.department === department && (!section || c.section === section),
  );

  // شعبہ بدلے اور چنی ہوئی جماعت نئے شعبے میں نہ ہو تو انتخاب صاف کر دیں
  useEffect(() => {
    if (
      selected !== "" &&
      selected !== OTHER &&
      !classes.some(
        (c) =>
          c.department === department &&
          (!section || c.section === section) &&
          c.name === selected,
      )
    ) {
      setSelected("");
    }
  }, [department, section, selected, classes]);

  // مدرسے میں کوئی جماعت درج ہی نہ ہو — ہاتھ سے لکھیں
  if (classes.length === 0) {
    return (
      <label className="field">
        <span className="field-label">{t(lang, "col.class")}</span>
        <input
          className="field-input"
          name="class_name"
          type="text"
          maxLength={100}
          defaultValue={initialClassName ?? ""}
          placeholder={t(lang, "class.select.name_ph")}
        />
        <span
          style={{
            display: "block",
            marginTop: 8,
            fontSize: ".85rem",
            color: "var(--muted)",
          }}
        >
          {t(lang, "class.select.none")}{" "}
          <Link href="/departments/classes/new">
            {t(lang, "class.select.add_first")}
          </Link>
        </span>
      </label>
    );
  }

  return (
    <label className="field">
      <span className="field-label">{t(lang, "col.class")}</span>
      <select
        className="field-input"
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
      >
        <option value="">{t(lang, "class.select.choose")}</option>
        {deptClasses.map((c) => (
          <option key={`${c.department}-${c.name}`} value={c.name}>
            {c.name}
          </option>
        ))}
        <option value={OTHER}>{t(lang, "class.select.other")}</option>
      </select>
      {selected === OTHER ? (
        <input
          className="field-input"
          name="class_name"
          type="text"
          maxLength={100}
          value={otherText}
          onChange={(e) => setOtherText(e.target.value)}
          placeholder={t(lang, "class.select.other_ph")}
          style={{ marginTop: 8 }}
        />
      ) : (
        <input type="hidden" name="class_name" value={selected} />
      )}
    </label>
  );
}
