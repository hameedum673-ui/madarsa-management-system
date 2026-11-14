/**
 * مرحلہ 98 — مدرسے کا لوگو (کلائنٹ)
 * لوگو سب کو دکھتا ہے؛ لگانا/ہٹانا صرف مالک کا کام ہے۔
 * مرحلہ 99 — تصویر چننے کے بعد گول دائرے میں کاٹنا (react-easy-crop):
 * جو حصہ دائرے میں ہو وہی جائے گا؛ کٹی ہوئی تصویر چھوٹی ہوتی ہے۔
 */
"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import Cropper, { type Area, type Point } from "react-easy-crop";
import "react-easy-crop/react-easy-crop.css";
import { getCroppedImg } from "@/lib/cropImage";
import { removeMadrasaLogo, uploadMadrasaLogo } from "@/app/profile/actions";

export default function LogoForm({
  logoUrl,
  canManage,
  madrasaName,
}: {
  logoUrl: string | null;
  canManage: boolean;
  madrasaName: string;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const croppedAreaPixelsRef = useRef<Area | null>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  const firstLetter = (madrasaName || "ح").trim().charAt(0) || "ح";

  function handlePick(ev: ChangeEvent<HTMLInputElement>) {
    const file = ev.target.files?.[0];
    setError("");
    setSaved(false);
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("صرف JPG، PNG یا WebP تصویر چلے گی۔");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("تصویر 2MB سے بڑی ہے — چھوٹی تصویر چنیں۔");
      return;
    }
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    croppedAreaPixelsRef.current = null;
    setImageSrc(URL.createObjectURL(file));
  }

  function handleCancelCrop() {
    if (imageSrc) URL.revokeObjectURL(imageSrc);
    setImageSrc(null);
    setError("");
    if (inputRef.current) inputRef.current.value = "";
  }

  async function handleUpload() {
    if (!imageSrc) {
      setError("پہلے تصویر چنیں۔");
      return;
    }
    setError("");
    setSaved(false);
    setLoading(true);
    try {
      const pixels = croppedAreaPixelsRef.current;
      if (!pixels) throw new Error("کاٹنے والا حصہ نہیں ملا۔");
      // کاٹی ہوئی تصویر بنائیں (512×512) اور وہی اپلوڈ کریں
      const croppedFile = await getCroppedImg(imageSrc, pixels);
      const formData = new FormData();
      formData.set("logo", croppedFile);
      const result = await uploadMadrasaLogo(formData);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      handleCancelCrop();
      setSaved(true);
      router.refresh();
    } catch {
      // کچھ بھی ناکام ہو تو بٹن رکا رہے، "انتظار کریں" پر پھنسے نہیں
      setError("لوگو اپلوڈ نہیں ہو سکا۔ دوبارہ کوشش کریں۔");
    } finally {
      setLoading(false);
    }
  }

  async function handleRemove() {
    setError("");
    setSaved(false);
    setLoading(true);
    try {
      const result = await removeMadrasaLogo();
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setSaved(true);
      router.refresh();
    } catch {
      setError("لوگو ہٹایا نہیں جا سکا۔ دوبارہ کوشش کریں۔");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h3 className="form-section-title">مدرسے کا لوگو</h3>
      {logoUrl && !imageSrc ? (
        <img className="logo-preview" src={logoUrl} alt="مدرسے کا لوگو" />
      ) : !imageSrc ? (
        <div className="logo-preview-letter" aria-hidden="true">
          {firstLetter}
        </div>
      ) : null}
      {canManage ? (
        <>
          {imageSrc ? (
            <>
              <div className="crop-wrap">
                <Cropper
                  image={imageSrc}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  cropShape="round"
                  showGrid={false}
                  onCropChange={setCrop}
                  onCropComplete={(_, croppedAreaPixels) => {
                    croppedAreaPixelsRef.current = croppedAreaPixels;
                  }}
                  onZoomChange={setZoom}
                />
              </div>
              <label className="field" style={{ marginTop: 12 }}>
                <span className="field-label">زوم — تصویر چھوٹی بڑی کریں</span>
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.1}
                  value={zoom}
                  onChange={(ev) => setZoom(Number(ev.target.value))}
                  aria-label="زوم"
                />
              </label>
              <p className="form-note">
                تصویر کو کھینچ کر جس حصے کو چاہیں گول دائرے میں رکھ لیں —
                باہر والا حصہ نہیں جائے گا۔
              </p>
            </>
          ) : (
            <div className="form-grid" style={{ marginTop: 12 }}>
              <label className="field">
                <span className="field-label">تصویر چنیں (JPG، PNG یا WebP — زیادہ سے زیادہ 2MB)</span>
                <input
                  className="field-input"
                  ref={inputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handlePick}
                />
              </label>
            </div>
          )}
          {error ? <p className="form-error">{error}</p> : null}
          {saved ? <p className="form-note">لوگو محفوظ ہو گیا۔</p> : null}
          <div className="form-actions">
            {imageSrc ? (
              <>
                <button
                  className="btn-primary"
                  type="button"
                  disabled={loading}
                  onClick={handleUpload}
                >
                  {loading ? "براہِ کرم انتظار کریں…" : "لوگو لگائیں"}
                </button>
                <button
                  className="btn-ghost"
                  type="button"
                  disabled={loading}
                  onClick={handleCancelCrop}
                >
                  واپس
                </button>
              </>
            ) : logoUrl ? (
              <button
                className="btn-ghost"
                type="button"
                disabled={loading}
                onClick={handleRemove}
              >
                لوگو ہٹائیں
              </button>
            ) : null}
          </div>
          <p className="form-note">
            لوگو ڈیش بورڈ کی سرخی میں گول دکھے گا — مہمان کو بھی نظر آئے گا۔
          </p>
        </>
      ) : (
        <p className="form-note">
          لوگو صرف مدرسے کا مالک بدل سکتا ہے۔
        </p>
      )}
    </div>
  );
}
