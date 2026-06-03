const CLOUD_NAME   = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET as string;

export interface KycDocument {
  type: "national_id" | "drivers_license" | "passport";
  url: string;
  public_id: string;
}

export async function uploadKycDocument(
  file: File,
  type: KycDocument["type"],
  userId: string
): Promise<KycDocument> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET);
  formData.append("folder", `kyc/${userId}`);
  formData.append("tags", `kyc,${type},${userId}`);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`,
    { method: "POST", body: formData }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: { message?: string } })?.error?.message ?? "Cloudinary upload failed");
  }

  const data = await res.json();
  return { type, url: data.secure_url as string, public_id: data.public_id as string };
}

export async function uploadKycDocuments(
  docs: { type: KycDocument["type"]; file: File }[],
  userId: string
): Promise<KycDocument[]> {
  return Promise.all(docs.map((d) => uploadKycDocument(d.file, d.type, userId)));
}

// Uploads a passport-size profile photo and returns its secure URL.
export async function uploadAvatar(file: File, userId: string): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET);
  formData.append("folder", `avatars/${userId}`);
  formData.append("tags", `avatar,${userId}`);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: "POST", body: formData }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: { message?: string } })?.error?.message ?? "Cloudinary upload failed");
  }

  const data = await res.json();
  return data.secure_url as string;
}
