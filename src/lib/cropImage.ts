/**
 * مرحلہ 99 — تصویر کا چنا ہوا حصہ کاٹنا (براؤزر میں، canvas سے)
 * react-easy-crop سے ملا ہوا حصہ (pixels) یہاں چوکور تصویر بنتا ہے —
 * کٹی ہوئی فائل چھوٹی ہوتی ہے، کمزور انٹرنیٹ پر بھی جلدی اپلوڈ ہوتی ہے۔
 */

export interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", () => reject(new Error("تصویر کھل نہیں سکی۔")));
    image.src = url;
  });
}

export async function getCroppedImg(
  imageSrc: string,
  pixelCrop: CropArea,
  outputSize = 512,
): Promise<File> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  canvas.width = outputSize;
  canvas.height = outputSize;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("تصویر کاٹی نہیں جا سکی۔");
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    outputSize,
    outputSize,
  );
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.92),
  );
  if (!blob) throw new Error("تصویر کاٹی نہیں جا سکی۔");
  return new File([blob], "logo.jpg", { type: "image/jpeg" });
}
