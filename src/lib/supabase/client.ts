/**
 * مرحلہ 3 — Supabase براؤزر کلائنٹ (صرف براؤزر میں چلنے والے کوڈ کے لیے)
 * یہ وہی عوامی (anon) چابی استعمال کرتا ہے جو براؤزر میں ہونا طے ہے۔
 * خفیہ service_role چابی یہاں کبھی استعمال نہیں ہوگی۔
 */
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
