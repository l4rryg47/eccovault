import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase environment variables. Make sure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in your .env file."
  );
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

export async function uploadKycDocument(userId: string, file: File) {
  const safeFileName = file.name.replace(/[^a-zA-Z0-9_.-]/g, "_");
  const path = `kyc-documents/${userId}/${Date.now()}_${safeFileName}`;
  const { data, error } = await supabase.storage
    .from("kyc-documents")
    .upload(path, file, { cacheControl: "3600", upsert: false });
  if (error) throw error;

  const { data: urlData, error: urlError } = await supabase.storage
    .from("kyc-documents")
    .getPublicUrl(path);
  if (urlError) throw urlError;

  return urlData.publicUrl;
}

export async function uploadKycDocuments(userId: string, files: File[]) {
  const uploadedUrls: string[] = [];
  for (const file of files) {
    const url = await uploadKycDocument(userId, file);
    uploadedUrls.push(url);
  }
  return uploadedUrls;
}
