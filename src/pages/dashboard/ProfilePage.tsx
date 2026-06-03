import { useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useSubmitProfileUpdate } from "@/hooks/useSupabase";
import { uploadAvatar, type KycDocument } from "@/lib/cloudinary";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  User, Mail, Phone, Calendar, MapPin, Camera, Loader2,
  Pencil, X, ShieldCheck, AlertTriangle, FileText, ExternalLink,
} from "lucide-react";
import { toast } from "sonner";

// profile_data field keys we let the user edit
interface EditableFields {
  phone: string;
  date_of_birth: string;
  address_line_1: string;
  address_line_2: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
}

const DOC_TYPE_LABELS: Record<KycDocument["type"], string> = {
  national_id:     "National ID",
  drivers_license: "Driver's License",
  passport:        "International Passport",
};

const readField = (data: Record<string, unknown> | null | undefined, key: keyof EditableFields): string =>
  (data?.[key] as string | null | undefined) ?? "";

const ProfilePage = () => {
  const { user, profile } = useAuth();
  const submitUpdate = useSubmitProfileUpdate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const profileData = (profile?.profile_data ?? {}) as Record<string, unknown>;
  const kycDocs = (profileData.kyc_documents as KycDocument[] | undefined) ?? [];

  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [fields, setFields] = useState<EditableFields>({
    phone:          readField(profileData, "phone"),
    date_of_birth:  readField(profileData, "date_of_birth"),
    address_line_1: readField(profileData, "address_line_1"),
    address_line_2: readField(profileData, "address_line_2"),
    city:           readField(profileData, "city"),
    state:          readField(profileData, "state"),
    postal_code:    readField(profileData, "postal_code"),
    country:        readField(profileData, "country"),
  });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const email = profile?.email ?? user?.email ?? "";
  const displayName = profile?.full_name || email.split("@")[0] || "User";
  const initials = displayName.slice(0, 2).toUpperCase();
  const currentAvatar = avatarPreview ?? profile?.avatar_url ?? undefined;

  const setField = (key: keyof EditableFields, value: string) =>
    setFields((prev) => ({ ...prev, [key]: value }));

  const resetForm = () => {
    setFullName(profile?.full_name ?? "");
    setFields({
      phone:          readField(profileData, "phone"),
      date_of_birth:  readField(profileData, "date_of_birth"),
      address_line_1: readField(profileData, "address_line_1"),
      address_line_2: readField(profileData, "address_line_2"),
      city:           readField(profileData, "city"),
      state:          readField(profileData, "state"),
      postal_code:    readField(profileData, "postal_code"),
      country:        readField(profileData, "country"),
    });
    setAvatarFile(null);
    setAvatarPreview(null);
  };

  const handleStartEdit = () => { resetForm(); setEditing(true); };
  const handleCancel = () => { resetForm(); setEditing(false); };

  const handlePickAvatar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      return;
    }
    setAvatarFile(f);
    setAvatarPreview(URL.createObjectURL(f));
  };

  const handleSubmit = async () => {
    if (!user) return;
    if (!fullName.trim()) {
      toast.error("Full name is required.");
      return;
    }
    try {
      let avatarUrl: string | null = null;
      if (avatarFile) {
        avatarUrl = await uploadAvatar(avatarFile, user.id);
      }
      await submitUpdate.mutateAsync({
        full_name:    fullName.trim(),
        avatar_url:   avatarUrl,
        profile_data: { ...fields },
      });
      toast.success("Profile submitted for review. An admin will re-approve your account.");
      setEditing(false);
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const busy = submitUpdate.isPending;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">My Profile</h1>
          <p className="text-sm text-muted-foreground">View and manage your personal information.</p>
        </div>
        {!editing ? (
          <Button variant="hero" size="sm" onClick={handleStartEdit}>
            <Pencil size={14} className="mr-2" /> Edit profile
          </Button>
        ) : (
          <Button variant="outline" size="sm" onClick={handleCancel} disabled={busy}>
            <X size={14} className="mr-2" /> Cancel
          </Button>
        )}
      </div>

      {editing && (
        <div className="flex items-start gap-3 rounded border border-yellow-500/30 bg-yellow-500/5 p-4 max-w-3xl">
          <AlertTriangle size={18} className="mt-0.5 shrink-0 text-yellow-500" />
          <p className="text-sm text-foreground">
            Submitting changes sends your profile for admin review. Your account status will return to{" "}
            <span className="font-semibold">pending</span> until an administrator re-approves it, and
            dashboard access is paused during that time.
          </p>
        </div>
      )}

      <div className="max-w-3xl space-y-6">
        {/* Identity card */}
        <div className="rounded border border-border/40 bg-gradient-card p-6">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
            <div className="relative">
              <Avatar className="h-24 w-24 border border-border/50">
                {currentAvatar ? <AvatarImage src={currentAvatar} alt={displayName} className="object-cover" /> : null}
                <AvatarFallback className="bg-primary/10 text-2xl font-bold text-primary">{initials}</AvatarFallback>
              </Avatar>
              {editing && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background text-foreground shadow transition-colors hover:bg-muted"
                  aria-label="Change photo"
                >
                  <Camera size={14} />
                </button>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" className="sr-only" onChange={handlePickAvatar} />
            </div>
            <div className="text-center sm:text-left">
              <p className="font-display text-xl font-bold text-foreground">{displayName}</p>
              <p className="text-sm text-muted-foreground">{email}</p>
              <p className="mt-1.5 inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                <ShieldCheck size={11} /> {(profile?.approval_status ?? "pending").replace("_", " ")}
              </p>
              {editing && (
                <p className="mt-2 text-xs text-muted-foreground">Upload a passport-size photo (square works best).</p>
              )}
            </div>
          </div>
        </div>

        {/* Personal details */}
        <div className="rounded border border-border/40 bg-gradient-card p-6 space-y-5">
          <div className="flex items-center gap-3">
            <User size={18} className="text-primary" />
            <h2 className="font-display text-lg font-semibold text-foreground">Personal details</h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name" icon={User} editing={editing}
              value={fullName} display={profile?.full_name ?? "—"}
              onChange={(v) => setFullName(v)} disabled={busy} />
            <Field label="Email" icon={Mail} editing={false}
              value={email} display={email} readonlyNote="Email can't be changed here." />
            <Field label="Phone" icon={Phone} editing={editing}
              value={fields.phone} display={fields.phone || "—"}
              onChange={(v) => setField("phone", v)} disabled={busy} />
            <Field label="Date of birth" icon={Calendar} editing={editing} type="date"
              value={fields.date_of_birth} display={fields.date_of_birth || "—"}
              onChange={(v) => setField("date_of_birth", v)} disabled={busy} />
          </div>
        </div>

        {/* Address */}
        <div className="rounded border border-border/40 bg-gradient-card p-6 space-y-5">
          <div className="flex items-center gap-3">
            <MapPin size={18} className="text-primary" />
            <h2 className="font-display text-lg font-semibold text-foreground">Address</h2>
          </div>

          <div className="space-y-4">
            <Field label="Street address" editing={editing}
              value={fields.address_line_1} display={fields.address_line_1 || "—"}
              onChange={(v) => setField("address_line_1", v)} disabled={busy} />
            <Field label="Address line 2" editing={editing}
              value={fields.address_line_2} display={fields.address_line_2 || "—"}
              onChange={(v) => setField("address_line_2", v)} disabled={busy} />
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="City" editing={editing}
                value={fields.city} display={fields.city || "—"}
                onChange={(v) => setField("city", v)} disabled={busy} />
              <Field label="State / Region" editing={editing}
                value={fields.state} display={fields.state || "—"}
                onChange={(v) => setField("state", v)} disabled={busy} />
              <Field label="Postal code" editing={editing}
                value={fields.postal_code} display={fields.postal_code || "—"}
                onChange={(v) => setField("postal_code", v)} disabled={busy} />
            </div>
            <Field label="Country" editing={editing}
              value={fields.country} display={fields.country || "—"}
              onChange={(v) => setField("country", v)} disabled={busy} />
          </div>
        </div>

        {/* KYC documents (read-only) */}
        <div className="rounded border border-border/40 bg-gradient-card p-6 space-y-4">
          <div className="flex items-center gap-3">
            <FileText size={18} className="text-primary" />
            <h2 className="font-display text-lg font-semibold text-foreground">Identity documents</h2>
          </div>
          {kycDocs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No documents on file.</p>
          ) : (
            <div className="space-y-2">
              {kycDocs.map((doc, i) => (
                <a key={i} href={doc.url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded border border-border/40 bg-muted/20 px-3 py-2.5 text-sm transition-colors hover:border-primary/30 hover:bg-primary/5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-primary/10">
                    <ExternalLink size={13} className="text-primary" />
                  </div>
                  <span className="flex-1 truncate text-xs font-medium text-foreground">
                    {DOC_TYPE_LABELS[doc.type] ?? doc.type}
                  </span>
                  <ExternalLink size={12} className="shrink-0 text-muted-foreground" />
                </a>
              ))}
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            To update identity documents, please contact support.
          </p>
        </div>

        {editing && (
          <div className="flex items-center justify-end gap-3">
            <Button variant="outline" onClick={handleCancel} disabled={busy}>Cancel</Button>
            <Button variant="hero" onClick={handleSubmit} disabled={busy}>
              {busy ? <><Loader2 size={14} className="animate-spin" /> Submitting…</> : "Submit for review"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

// View/edit field — renders an Input when editing, plain text otherwise.
const Field = ({
  label, icon: Icon, editing, value, display, onChange, type = "text", disabled, readonlyNote,
}: {
  label: string;
  icon?: React.ElementType;
  editing: boolean;
  value: string;
  display: string;
  onChange?: (v: string) => void;
  type?: string;
  disabled?: boolean;
  readonlyNote?: string;
}) => (
  <div className="space-y-2">
    <Label className="flex items-center gap-1.5 text-foreground">
      {Icon ? <Icon size={13} className="text-muted-foreground" /> : null}
      {label}
    </Label>
    {editing && onChange ? (
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled}
        className="border-border/50 bg-muted/50 text-foreground" />
    ) : (
      <p className="rounded border border-transparent px-1 py-2 text-sm text-foreground">{display}</p>
    )}
    {readonlyNote && <p className="text-xs text-muted-foreground">{readonlyNote}</p>}
  </div>
);

export default ProfilePage;
