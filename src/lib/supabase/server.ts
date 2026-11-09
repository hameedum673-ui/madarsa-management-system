/**
 * مرحلہ 3 — Supabase سرور کلائنٹ (Server Components / Route Handlers کے لیے)
 * سیشن کوکیز کے ذریعے پڑھا جاتا ہے؛ یہاں بھی صرف عوامی (anon) چابی استعمال ہوتی ہے۔
 */
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Server Component سے setAll نہیں ہو سکتا — middleware یہ کام کرتا ہے۔
          }
        },
      },
    },
  );
}
