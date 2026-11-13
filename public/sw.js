/* مرحلہ 76 — کم سے کم service worker: کچھ محفوظ (cache) نہیں کرتا،
   ہر درخواست کو سیدھا نیٹ ورک پر بھیجتا ہے۔ یہ صرف اس لیے ہے کہ
   Chrome انسٹال (PWA) کا آپشن دے۔ صفحے یا ڈیٹا کی کوئی کاپی محفوظ
   نہیں ہوتی، اس لیے ہر نئی تبدیلی اگلی بار کھولنے پر فوراً آتی ہے۔ */

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", () => {
  /* جان بوجھ کر کچھ نہیں کرتے — درخواست معمول کے مطابق نیٹ ورک پر جاتی ہے۔ */
});
