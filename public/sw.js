/* مرحلہ 131 — آف لائن دیکھنا (صرف دیکھنا)۔
   service worker اب 7 صفحوں + ان تک جانے والے بیچ والے صفحوں +
   لاگ ان شیل کی کاپی محفوظ کرتا ہے، تاکہ بغیر نیٹ کے بھی وہ دکھ
   سکیں اور ڈیش بورڈ سے ان تک جایا جا سکے:
     /  (مین ڈیش بورڈ)
     /departments/admissions-students  (بیچ والا حب — طلبہ کی طرف)
     /departments/students-idcards  (بیچ والا حب — طلبہ کی طرف)
     /departments/students  (طلبہ کی فہرست — پہلا صفحہ، بغیر فلٹر)
     /departments/exams  (امتحانات کی فہرست — پہلا صفحہ، بغیر فلٹر)
     /departments/exams/<id>  (امتحان کی تفصیل / نتیجہ)
     /departments/teachers  (اساتذہ کی فہرست — پہلا صفحہ، بغیر فلٹر)
     /departments/staff  (عملے کی فہرست — پہلا صفحہ، بغیر فلٹر)
     /departments/income  (آمدنی کا حب — فیس کی طرف)
     /departments/income/fees  (فیس کی فہرست — پہلا صفحہ، بغیر فلٹر)
     /departments/reports-hub  (رپورٹس کا حب)
     /departments/monthly  (ماہانہ حسابات — موجودہ مہینہ)
     /departments/yearly  (سالانہ حسابات — موجودہ سال)
     /departments/fin-reports  (مالیاتی رپورٹس — اس مہینے کا اب تک)
     /departments/reports  (عمومی رپورٹس — سب حصے)
     /login  (صرف شیل — سائن ان نیٹ کے بغیر نہیں ہوگا)
   باقی سب کچھ ویسے ہی نیٹ ورک سے آتا ہے — کوئی کاپی نہیں،
   کوئی محفوظ کرنا نہیں۔ نیٹ ہو تو ہمیشہ تازہ ڈیٹا آتا ہے
   (network-first)؛ نیٹ نہ ہو تو محفوظ کاپی دکھتی ہے۔
   آدھا نیٹ (وائی فائی لگا، اصل نیٹ نہیں) ہو تو نیٹ کا جواب
   3 سیکنڈ سے زیادہ نہیں انتظار کیا جاتا — 3 سیکنڈ میں جواب
   نہ آئے تو محفوظ کاپی فوراً دکھتی ہے، اور نیٹ کا جواب بعد
   میں آئے تو کاپی پیچھے سے تازہ ہو جاتی ہے۔
   محفوظ کاپی میں صرف وہی ہوتا ہے جو اسی فون کے اسی لاگ ان والے
   صارف نے آن لائن کھولا ہو — دوسرے کا ڈیٹا کبھی نہیں آتا۔
   کوئی نیا پیکج نہیں — ہاتھ سے لکھا چھوٹا worker، جیسا پہلے تھا۔
   درستی 3 (2026-11-27): پسِ منظر کی پیش لوڈ (prefetch) کاپی سے
   خالی صفحہ — Next.js لنک دکھتے ہی صفحہ آدھا لوڈ کر لیتا ہے
   (Next-Router-Prefetch: 1) اور وہ آدھی کاپی اسی کنجی سے محفوظ
   ہو جاتی تھی جس سے اصلی بٹن دبانے والی RSC آتی ہے؛ سست نیٹ پر
   3 سیکنڈ کی مہلت ختم ہوتے ہی وہ آدھی کاپی دکھتی تھی اور صفحہ
   خالی رہتا تھا۔ اب prefetch درخواست کو بالکل نہیں چھوا جاتا
   (نہ کاپی بنتی ہے، نہ کاپی دکھتی ہے) اور کیچ کا ورژن v2 ہے
   تاکہ پرانی زہریلی کاپیاں مٹ جائیں۔
   مرحلہ 2 (2026-11-28): اساتذہ، عملہ، آمدنی کا حب اور فیس کی
   فہرست بھی آف لائن — ورژن v3، تاکہ پرانی build کی کاپیاں مٹ
   جائیں اور سب صفحے نئے سرے سے محفوظ ہوں۔
   مرحلہ 3 (2026-11-28): رپورٹس کا حب + چاروں رپورٹیں (ماہانہ،
   سالانہ، مالیاتی، عمومی — صرف پہلا/موجودہ نظارہ) بھی آف لائن —
   ورژن v4۔ */

const CACHE_VERSION = "jms-offline-v4";
const PAGE_CACHE = `${CACHE_VERSION}-pages`;
const STATIC_CACHE = `${CACHE_VERSION}-static`;
// نیٹ کا جواب اتنی دیر میں نہ آئے تو محفوظ کاپی دکھا دو
const NETWORK_TIMEOUT_MS = 3000;

/**
 * اس درخواست کی کاپی محفوظ ہو سکتی ہے؟ — تو کیچ کی کنجی دیں، ورنہ null۔
 * - صرف اسی سائٹ کی GET درخواستیں۔
 * - تلاش کے خانے (search) میں صرف _rsc ہو (RSC والی درخواست) یا
 *   کچھ بھی نہ ہو — فلٹر/صفحہ والی طلبہ فہرست محفوظ نہیں ہوتی۔
 * - دستاویز (navigation) اور RSC کی کنجی الگ ہے، ورنہ RSC کا جواب
 *   دستاویز کی جگہ دکھ سکتا ہے۔
 */
function offlinePageKey(url, isNavigate) {
  let u;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  if (u.origin !== self.location.origin) return null;
  const params = new URLSearchParams(u.search);
  const keys = [...params.keys()];
  // دستاویز کی درخواست میں تلاش کا خانہ نہیں ہونا چاہیے؛
  // RSC کی درخواست میں صرف _rsc ہونا چاہیے — فلٹر/صفحہ والی
  // طلبہ فہرست محفوظ نہیں ہوتی
  if (isNavigate) {
    if (keys.length !== 0) return null;
  } else if (keys.length !== 1 || keys[0] !== "_rsc") {
    return null;
  }
  const p = u.pathname;
  const isPage =
    p === "/" ||
    p === "/login" ||
    p === "/departments/admissions-students" ||
    p === "/departments/students-idcards" ||
    p === "/departments/students" ||
    p === "/departments/exams" ||
    p === "/departments/teachers" ||
    p === "/departments/staff" ||
    p === "/departments/income" ||
    p === "/departments/income/fees" ||
    p === "/departments/reports-hub" ||
    p === "/departments/monthly" ||
    p === "/departments/yearly" ||
    p === "/departments/fin-reports" ||
    p === "/departments/reports" ||
    /^\/departments\/exams\/[^/]+$/.test(p);
  if (!isPage) return null;
  // دستاویز کی کنجی راستہ؛ RSC کی کنجی راستہ + نشان
  return isNavigate ? p : `${p}?rsc`;
}

/** پسِ منظر کی پیش لوڈ (prefetch) درخواست؟ — اس کی کاپی کبھی نہ بنے۔ */
function isPrefetchRequest(req) {
  return req.headers.get("Next-Router-Prefetch") === "1";
}

/** جامد فائلیں — نام سے پہچانی جاتی ہیں، پرانی نہیں ہوتیں۔ */
function isStaticAsset(url) {
  let u;
  try {
    u = new URL(url);
  } catch {
    return false;
  }
  if (u.origin !== self.location.origin) return false;
  return (
    u.pathname.startsWith("/_next/static/") ||
    u.pathname.startsWith("/icons/") ||
    u.pathname === "/manifest.json"
  );
}

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((n) => n !== PAGE_CACHE && n !== STATIC_CACHE)
          .map((n) => caches.delete(n)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  // پسِ منظر کی پیش لوڈ — اسے بالکل نہ چھوئیں: یہ نیٹ ورک سے ہی
  // جائے؛ نہ اس کی کاپی بنے، نہ اسے کاپی دکھائی جائے
  if (isPrefetchRequest(req)) return;

  // جامد فائلیں — پہلے کاپی، پیچھے سے تازہ کریں
  if (isStaticAsset(req.url)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(STATIC_CACHE);
        const cached = await cache.match(req);
        const update = fetch(req)
          .then((res) => {
            if (res && res.ok) cache.put(req, res.clone());
            return res;
          })
          .catch(() => null);
        if (cached) {
          event.waitUntil(update);
          return cached;
        }
        const net = await update;
        if (net) return net;
        throw new Error("offline");
      })(),
    );
    return;
  }

  // آف لائن دیکھنے والے صفحے — پہلے نیٹ، نہ ہو تو کاپی
  const key = offlinePageKey(req.url, req.mode === "navigate");
  if (!key) return; // باقی سب نیٹ ورک سے ہی — کوئی کاپی نہیں
  event.respondWith(
    (async () => {
      const cache = await caches.open(PAGE_CACHE);
      const cacheKey = new Request(self.location.origin + key);
      // نیٹ کی ایک ہی کوشش — جواب آئے تو کاپی تازہ کر دو؛
      // یہ کوشش پیچھے سے چلتی رہتی ہے، چاہے مہلت ختم ہو جائے
      const network = fetch(req).then(async (res) => {
        // صرف 200 + بغیر رخ موڑے (redirect) والا جواب محفوظ ہو —
        // لاگ آؤٹ پر / لاگ ان پر موڑا ہوا جواب ڈیش بورڈ کی کاپی نہ بنے
        if (
          res &&
          res.ok &&
          new URL(res.url).pathname === new URL(req.url).pathname
        ) {
          await cache.put(cacheKey, res.clone());
        }
        return res;
      });
      network.catch(() => {}); // پیچھے والی کوشش کی ناکامی خاموش رہے
      try {
        // نیٹ 3 سیکنڈ میں جواب دے تو وہی لو، ورنہ محفوظ کاپی
        const res = await Promise.race([
          network,
          new Promise((_, reject) =>
            setTimeout(
              () => reject(new Error("network-timeout")),
              NETWORK_TIMEOUT_MS,
            ),
          ),
        ]);
        return res;
      } catch (err) {
        const cached = await cache.match(cacheKey);
        if (cached) return cached;
        // کاپی بھی نہیں — نیٹ کا انتظار کرو: جواب آئے تو وہ، ورنہ ناکامی
        return network;
      }
    })(),
  );
});

// صرف جانچ کے لیے — براؤزر میں یہ نام محفوظ رہتا ہے، کوئی فرق نہیں پڑتا
self.__offlineTest = {
  offlinePageKey,
  isStaticAsset,
  isPrefetchRequest,
  CACHE_VERSION,
  NETWORK_TIMEOUT_MS,
};
