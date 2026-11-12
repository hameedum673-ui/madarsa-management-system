/**
 * مرحلہ 65 — رسمی نتیجہ کارڈ کی PNG تصویر (کینوس سے)
 * تنگ سلپ والے بٹن سے الگ — یہ چوڑا کارڈ بناتا ہے: سرنامے کا ڈبہ،
 * خانے (نام، ولدیت، رجسٹریشن نمبر…)، نمبروں کی جدول، کل/فیصد/
 * مجموعہ کی پٹی، تقدیر، دستخط مہتمم اور جاری کردہ۔
 * اردو لکھائی canvas کی اپنی لکھائی سے بنتی ہے، اس لیے حروف ویسے
 * ہی جڑتے ہیں جیسے اسکرین پر نظر آتے ہیں۔
 */
"use client";

import { useState } from "react";

export interface ResultCardImageData {
  madrasaName: string;
  examName: string;
  /** بنین / بنات */
  sectionLabel: string;
  /** مثلاً "سہ ماہی — بنین" */
  typeSectionLabel: string;
  /** مثلاً "سال 1447ھ بمطابق 2026ء" */
  yearLine: string;
  registrationNumber: string;
  studentName: string;
  fatherName: string;
  /** "—" اگر درج نہیں */
  dateOfBirth: string;
  classLabel: string;
  departmentLabel: string;
  /** "—" اگر درج نہیں */
  district: string;
  examDate: string;
  /** [کتاب، نمبر] — نمبر "85" یا "—" */
  subjects: [string, string][];
  totalPossible: string;
  percentage: string;
  obtained: string;
  grade: string;
  filename: string;
}

const NAVY = "#123a63";
const GOLD_SOFT = "#f3e9cd";
const TEXT = "#182638";
const MUTED = "#5d6f86";
const WHITE = "#ffffff";

const FONT = '"Noto Naskh Arabic", serif';

function fitFont(
  ctx: CanvasRenderingContext2D,
  text: string,
  size: number,
  maxWidth: number,
  weight = 700,
): void {
  let s = size;
  ctx.font = `${weight} ${s}px ${FONT}`;
  while (s > 11 && ctx.measureText(text).width > maxWidth) {
    s -= 1;
    ctx.font = `${weight} ${s}px ${FONT}`;
  }
}

export default function ResultCardImageButton({
  data,
}: {
  data: ResultCardImageData;
}) {
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setStatus("");
    setSaving(true);
    try {
      // فونٹ پہلے لوڈ ہو جائیں تاکہ اردو لکھائی درست بنے
      try {
        await Promise.race([
          document.fonts.ready,
          new Promise((r) => setTimeout(r, 3000)),
        ]);
      } catch {
        /* فونٹ نہ بھی لوڈ ہوں تو بھی تصویر بنائیں گے */
      }

      const scale = 2;
      const W = 820;
      const n = data.subjects.length;
      const H =
        34 + // اوپر کی جگہ
        58 + // سرنامے کا ڈبہ
        18 +
        30 + // امتحان کی سطر
        28 + // شعبہ + سال کی سطر
        14 +
        6 * 38 + // خانے (6 سطریں)
        8 +
        34 + // عنوان
        10 +
        44 +
        n * 42 + // جدول (سر + سطریں)
        54 + // کل/فیصد/مجموعہ کی پٹی
        14 +
        30 + // تقدیر
        46 +
        28 + // دستخط
        34; // نیچے کی جگہ

      const canvas = document.createElement("canvas");
      canvas.width = W * scale;
      canvas.height = H * scale;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("canvas نہیں بنا");
      ctx.scale(scale, scale);
      ctx.direction = "rtl";

      // پس منظر + باہر کی موٹی سرحد + اندر نقطے والی سرحد
      ctx.fillStyle = WHITE;
      ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = NAVY;
      ctx.lineWidth = 3;
      ctx.strokeRect(4, 4, W - 8, H - 8);
      ctx.setLineDash([2, 5]);
      ctx.lineWidth = 1.5;
      ctx.strokeRect(14, 14, W - 28, H - 28);
      ctx.setLineDash([]);

      let y = 34;

      // سرنامے کا ڈبہ — مدرسے کا نام
      const headH = 58;
      fitFont(ctx, data.madrasaName, 30, W - 160, 700);
      const headW = Math.min(
        ctx.measureText(data.madrasaName).width + 56,
        W - 120,
      );
      ctx.strokeStyle = NAVY;
      ctx.lineWidth = 2.5;
      ctx.strokeRect((W - headW) / 2, y, headW, headH);
      ctx.fillStyle = NAVY;
      ctx.textAlign = "center";
      ctx.fillText(data.madrasaName, W / 2, y + 38);
      y += headH + 18;

      // امتحان کی سطر
      fitFont(ctx, `امتحان — ${data.examName}`, 24, W - 120, 700);
      ctx.fillStyle = NAVY;
      ctx.textAlign = "center";
      ctx.fillText(`امتحان — ${data.examName}`, W / 2, y + 22);
      y += 30;

      // شعبہ + سال کی سطر
      ctx.font = `20px ${FONT}`;
      ctx.fillStyle = MUTED;
      ctx.fillText(
        `${data.typeSectionLabel} — ${data.yearLine}`,
        W / 2,
        y + 20,
      );
      y += 28 + 14;

      // خانے — لیبل دائیں (موٹا)، قیمت اس کے بائیں، قیمت کے نیچے
      // نقطے والی لکیر
      const rightEdge = W - 40;
      const midEdge = W / 2 + 8;
      function field(
        c: CanvasRenderingContext2D,
        label: string,
        value: string,
        edge: number,
        maxValueWidth: number,
      ) {
        const labelText = `${label}:`;
        c.font = `700 20px ${FONT}`;
        const labelW = c.measureText(labelText).width;
        c.textAlign = "right";
        c.fillStyle = NAVY;
        c.fillText(labelText, edge, y + 24);
        fitFont(c, value, 20, maxValueWidth, 400);
        const valueW = c.measureText(value).width;
        c.textAlign = "right";
        c.fillStyle = TEXT;
        c.fillText(value, edge - labelW - 10, y + 24);
        // قیمت کے نیچے نقطے والی لکیر
        c.strokeStyle = "#9aa8ba";
        c.lineWidth = 1;
        c.setLineDash([2, 4]);
        c.beginPath();
        c.moveTo(edge - labelW - 10 - valueW, y + 32);
        c.lineTo(edge - labelW - 10, y + 32);
        c.stroke();
        c.setLineDash([]);
      }

      field(ctx, "نام", data.studentName, rightEdge, W - 200);
      y += 38;
      field(ctx, "ولدیت", data.fatherName, rightEdge, W - 200);
      y += 38;
      field(ctx, "رجسٹریشن نمبر", data.registrationNumber, rightEdge, 220);
      field(ctx, "جماعت", data.classLabel, midEdge, 220);
      y += 38;
      field(ctx, "تاریخ پیدائش", data.dateOfBirth, rightEdge, 220);
      field(ctx, "تاریخ امتحان", data.examDate, midEdge, 220);
      y += 38;
      field(
        ctx,
        "شعبہ",
        `${data.departmentLabel} — ${data.sectionLabel}`,
        rightEdge,
        W - 200,
      );
      y += 38;
      field(ctx, "ضلع", data.district, rightEdge, W - 200);
      y += 38 + 8;

      // عنوان
      fitFont(ctx, "حاصل کردہ نمبرات کی تفصیل", 24, W - 120, 700);
      ctx.fillStyle = NAVY;
      ctx.textAlign = "center";
      ctx.fillText("حاصل کردہ نمبرات کی تفصیل", W / 2, y + 24);
      y += 34 + 10;

      // نمبروں کی جدول — دائیں سے: رقم مسلسل | کتاب | نمبر
      const x0 = 40;
      const x1 = W - 40;
      const serialW = 80;
      const marksW = 120;
      const headRowH = 44;
      const rowH = 42;
      ctx.fillStyle = GOLD_SOFT;
      ctx.fillRect(x0, y, x1 - x0, headRowH);
      ctx.strokeStyle = NAVY;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x0, y, x1 - x0, headRowH);
      ctx.beginPath();
      ctx.moveTo(x1 - serialW, y);
      ctx.lineTo(x1 - serialW, y + headRowH);
      ctx.moveTo(x0 + marksW, y);
      ctx.lineTo(x0 + marksW, y + headRowH);
      ctx.stroke();
      ctx.fillStyle = NAVY;
      ctx.font = `700 21px ${FONT}`;
      ctx.textAlign = "center";
      ctx.fillText("رقم مسلسل", x1 - serialW / 2, y + 29);
      ctx.fillText("کتاب", (x1 - serialW + x0 + marksW) / 2, y + 29);
      ctx.fillText("نمبر", x0 + marksW / 2, y + 29);
      y += headRowH;
      data.subjects.forEach(([book, marks], idx) => {
        ctx.strokeStyle = NAVY;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x0, y, x1 - x0, rowH);
        ctx.beginPath();
        ctx.moveTo(x1 - serialW, y);
        ctx.lineTo(x1 - serialW, y + rowH);
        ctx.moveTo(x0 + marksW, y);
        ctx.lineTo(x0 + marksW, y + rowH);
        ctx.stroke();
        ctx.fillStyle = TEXT;
        ctx.font = `21px ${FONT}`;
        ctx.textAlign = "center";
        ctx.fillText((idx + 1).toLocaleString("ur-PK"), x1 - serialW / 2, y + 28);
        ctx.fillText(book, (x1 - serialW + x0 + marksW) / 2, y + 28);
        ctx.font = `700 21px ${FONT}`;
        ctx.fillText(marks, x0 + marksW / 2, y + 28);
        y += rowH;
      });

      // کل/فیصد/مجموعہ کی پٹی
      const totalsH = 54;
      ctx.strokeStyle = NAVY;
      ctx.lineWidth = 2;
      ctx.strokeRect(x0, y, x1 - x0, totalsH);
      const segW = (x1 - x0) / 3;
      ctx.beginPath();
      ctx.moveTo(x0 + segW, y);
      ctx.lineTo(x0 + segW, y + totalsH);
      ctx.moveTo(x0 + segW * 2, y);
      ctx.lineTo(x0 + segW * 2, y + totalsH);
      ctx.stroke();
      ctx.fillStyle = NAVY;
      ctx.font = `700 21px ${FONT}`;
      ctx.textAlign = "center";
      ctx.fillText(`کل نمبر ${data.totalPossible}`, x1 - segW / 2, y + 34);
      ctx.fillText(`فیصد نمبر ${data.percentage}`, x1 - segW * 1.5, y + 34);
      ctx.fillText(`مجموعہ نمبرات ${data.obtained}`, x0 + segW / 2, y + 34);
      y += totalsH + 14;

      // تقدیر
      ctx.font = `700 22px ${FONT}`;
      ctx.textAlign = "right";
      ctx.fillStyle = NAVY;
      ctx.fillText(`تقدیر — ${data.grade}`, rightEdge, y + 22);
      y += 30 + 46;

      // دستخط — دائیں: مہتمم، بائیں: جاری کردہ
      const signW = 230;
      ctx.strokeStyle = NAVY;
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 4]);
      ctx.beginPath();
      ctx.moveTo(rightEdge - signW, y);
      ctx.lineTo(rightEdge, y);
      ctx.moveTo(40, y);
      ctx.lineTo(40 + signW, y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.font = `20px ${FONT}`;
      ctx.fillStyle = TEXT;
      ctx.textAlign = "center";
      ctx.fillText("دستخط مہتمم", rightEdge - signW / 2, y + 28);
      ctx.fillText("جاری کردہ", 40 + signW / 2, y + 28);

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/png"),
      );
      if (!blob) throw new Error("تصویر نہیں بنی");
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = data.filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      setStatus("تصویر محفوظ ہو گئی ہے — فون کی گیلری میں Downloads میں دیکھیں۔");
    } catch {
      setStatus("تصویر محفوظ نہیں ہو سکی — دوبارہ کوشش کریں۔");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <button
        className="btn-primary"
        type="button"
        onClick={handleSave}
        disabled={saving}
      >
        {saving ? "براہِ کرم انتظار کریں…" : "تصویر محفوظ کریں"}
      </button>
      {status ? <p className="form-note">{status}</p> : null}
    </div>
  );
}
