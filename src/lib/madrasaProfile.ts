/**
 * مرحلہ 24 — مدرسے کا عمومی ریکارڈ (پروفائل)
 * نام `madrasas` میز میں محفوظ ہے — باقی معلومات یہاں ہیں۔
 * ہر مدرسے کا ایک ہی پروفائل ریکارڈ ہوتا ہے۔
 */
export interface MadrasaProfile {
  id: string;
  madrasa_id: string;
  address: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  mohtamim_name: string | null;
  established_year: number | null;
  registration_no: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
}

/** فارم کی ابتدائی قیمتیں — پروفائل نہ ہو تو سب خالی */
export interface MadrasaProfileFormValues {
  name: string;
  address: string;
  phone: string;
  whatsapp: string;
  email: string;
  mohtamim_name: string;
  established_year: string;
  registration_no: string;
  note: string;
}
