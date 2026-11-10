/**
 * مرحلہ 12 (ترمیم) — شناختی کارڈ تصویر کے طور پر محفوظ کرنے کا بٹن (کلائنٹ)
 * کارڈ کو canvas پر کھینچ کر PNG بنایا جاتا ہے — اس لیے کوئی PDF نہیں بنتا۔
 * اردو لکھائی canvas کی اپنی لکھائی سے بنتی ہے، اس لیے حروف ویسے ہی جڑتے ہیں
 * جیسے اسکرین پر نظر آتے ہیں۔ فون پر ڈاؤن لوڈ ہونے والی تصویر گیلری میں
 * Downloads میں نظر آتی ہے (ویب سائٹ براہِ راست گیلری میں نہیں ڈال سکتی)۔
 */
"use client";

import { useState } from "react";

export interface CardImageData {
  madrasaName: string;
  name: string;
  fatherName: string;
  registrationNumber: string;
  departmentLabel: string;
  className: string;
  dateOfBirth: string;
  admissionDate: string;
  guardianPhone: string;
  issueDate: string;
}

const NAVY = "#123a63";
const GOLD = "#c19a2e";
const GOLD_SOFT = "#f3e9cd";
const TEXT = "#182638";
const MUTED = "#5d6f86";
const LINE = "#dde4ee";
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

export default function SaveImageButton({ data }: { data: CardImageData }) {
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
      const W = 320;
      const H = 640;
      const canvas = document.createElement("canvas");
      canvas.width = W * scale;
      canvas.height = H * scale;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("canvas نہیں بنا");
      ctx.scale(scale, scale);
      ctx.direction = "rtl";

      // پس منظر + سنہری کنارہ
      ctx.fillStyle = WHITE;
      ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = GOLD;
      ctx.lineWidth = 3;
      ctx.strokeRect(1.5, 1.5, W - 3, H - 3);

      // اوپر والا نیوی حصہ
      ctx.fillStyle = NAVY;
      ctx.fillRect(3, 3, W - 6, 105);
      ctx.textAlign = "center";
      fitFont(ctx, data.madrasaName, 20, W - 32, 700);
      ctx.fillStyle = GOLD;
      ctx.fillText(data.madrasaName, W / 2, 40);
      ctx.font = `13px ${FONT}`;
      ctx.fillStyle = "rgba(255,255,255,0.8)";
      ctx.fillText("شادی لارج، ضلع بدین، سندھ", W / 2, 66);
      ctx.font = `700 17px ${FONT}`;
      ctx.fillStyle = WHITE;
      ctx.fillText("طالبہ کا شناختی کارڈ", W / 2, 94);

      // تصویر کا خالی خانہ
      const photoX = (W - 150) / 2;
      const photoY = 124;
      ctx.setLineDash([6, 4]);
      ctx.strokeStyle = "#9aa5b1";
      ctx.lineWidth = 2;
      ctx.strokeRect(photoX, photoY, 150, 170);
      ctx.setLineDash([]);
      ctx.textAlign = "center";
      ctx.font = `15px ${FONT}`;
      ctx.fillStyle = "#7a8794";
      ctx.fillText("تصویر", W / 2, 200);
      ctx.fillText("یہاں چپکائیں", W / 2, 224);

      // رجسٹریشن نمبر کی پٹی
      const stripY = 310;
      ctx.fillStyle = GOLD_SOFT;
      ctx.fillRect(16, stripY, W - 32, 44);
      ctx.textAlign = "right";
      ctx.font = `13px ${FONT}`;
      ctx.fillStyle = MUTED;
      ctx.fillText("رجسٹریشن نمبر", W - 26, stripY + 28);
      fitFont(ctx, data.registrationNumber, 22, 150, 700);
      ctx.textAlign = "left";
      ctx.fillStyle = NAVY;
      ctx.fillText(data.registrationNumber, 26, stripY + 28);

      // تفصیل کی سطریں — لیبل دائیں، قیمت بائیں
      const rows: [string, string][] = [
        ["نام", data.name],
        ["والد کا نام", data.fatherName],
        ["شعبہ", data.departmentLabel],
        ["جماعت", data.className],
        ["تاریخِ پیدائش", data.dateOfBirth],
        ["داخلہ تاریخ", data.admissionDate],
        ["سرپرست کا فون", data.guardianPhone],
      ];
      let y = 384;
      for (const [label, value] of rows) {
        ctx.textAlign = "right";
        ctx.font = `15px ${FONT}`;
        ctx.fillStyle = MUTED;
        ctx.fillText(label, W - 16, y);
        fitFont(ctx, value, 15, 168, 700);
        ctx.textAlign = "left";
        ctx.fillStyle = TEXT;
        ctx.fillText(value, 16, y);
        ctx.strokeStyle = LINE;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(16, y + 10);
        ctx.lineTo(W - 16, y + 10);
        ctx.stroke();
        y += 30;
      }

      // نیچے والا حصہ
      ctx.textAlign = "center";
      ctx.font = `13px ${FONT}`;
      ctx.fillStyle = MUTED;
      ctx.fillText(`جاری کرنے کی تاریخ: ${data.issueDate}`, W / 2, 600);
      ctx.fillText("یہ کارڈ مدرسے کی ملکیت ہے", W / 2, 622);

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/png"),
      );
      if (!blob) throw new Error("تصویر نہیں بنی");
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `id-card-${data.registrationNumber}.png`;
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
