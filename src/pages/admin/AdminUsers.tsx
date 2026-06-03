import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Loader2, Users, ArrowUpRight, ArrowDownLeft,
  Plus, Trash2, Upload, X, CheckCircle2, ExternalLink, Camera,
  ShieldCheck, ShieldAlert, Snowflake, PauseCircle, Clock, Key, MessageSquare,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  useAdminUsers, useAdminUserAccounts, useAdminUserTransactions,
  useAdminAdjustBalance, useAdminCreateUser, useAdminUpdateUser,
  useAdminUpdateProfile, useAdminDeleteUser, useAdminSetUserStatus,
  useAdminGenerateTransferOtp, useAdminSetTransferPendingMessage,
  adminKeys, type AdminUser, type AdminUserStatus,
} from "@/hooks/useAdmin";
import { uploadKycDocuments, uploadAvatar, type KycDocument } from "@/lib/cloudinary";
import { supabase } from "@/lib/supabase";
import { formatCurrency, formatDate } from "@/lib/format";
import { Button, buttonVariants } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader,
  DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

// ─── Status helpers ────────────────────────────────────────────

const STATUS_META: Record<AdminUserStatus, {
  label: string;
  badge: string;
  icon: React.ElementType;
}> = {
  pending:   { label: "Pending",   badge: "border-yellow-500/30 bg-yellow-500/10 text-yellow-500",  icon: Clock        },
  approved:  { label: "Approved",  badge: "border-primary/30 bg-primary/10 text-primary",            icon: ShieldCheck  },
  suspended: { label: "Suspended", badge: "border-orange-500/30 bg-orange-500/10 text-orange-500",  icon: ShieldAlert  },
  frozen:    { label: "Frozen",    badge: "border-blue-500/30 bg-blue-500/10 text-blue-500",         icon: Snowflake    },
  on_hold:   { label: "On Hold",   badge: "border-border/50 bg-muted/50 text-muted-foreground",      icon: PauseCircle  },
};

const STATUS_ACTION_LABELS: Record<AdminUserStatus, string> = {
  approved: "approve", pending: "set to pending",
  suspended: "suspend", frozen: "freeze", on_hold: "place on hold",
};

const StatusBadge = ({ status }: { status: AdminUserStatus }) => {
  const m = STATUS_META[status] ?? STATUS_META.pending;
  const Icon = m.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${m.badge}`}>
      <Icon size={11} />
      {m.label}
    </span>
  );
};

// ─── KYC document type UI ─────────────────────────────────────

type DocType = KycDocument["type"];

interface DocSlot {
  type: DocType;
  label: string;
  file: File | null;
}

const INITIAL_DOC_SLOTS: DocSlot[] = [
  { type: "national_id",     label: "National ID",            file: null },
  { type: "drivers_license", label: "Driver's License",       file: null },
  { type: "passport",        label: "International Passport", file: null },
];

const DocUploadSlots = ({
  slots,
  onChange,
  disabled,
}: {
  slots: DocSlot[];
  onChange: (type: DocType, file: File | null) => void;
  disabled?: boolean;
}) => (
  <div className="space-y-2">
    {slots.map((doc) => (
      <div key={doc.type} className="rounded border border-border/40 bg-muted/20 p-3">
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-xs font-medium text-foreground">{doc.label}</span>
          {doc.file && (
            <button type="button" onClick={() => onChange(doc.type, null)}
              className="text-muted-foreground hover:text-destructive transition-colors">
              <X size={13} />
            </button>
          )}
        </div>
        {doc.file ? (
          <div className="flex items-center gap-2 text-xs text-primary">
            <CheckCircle2 size={12} />
            <span className="truncate">{doc.file.name}</span>
          </div>
        ) : (
          <label className="flex cursor-pointer items-center gap-2 rounded border border-dashed border-border/50 bg-background px-3 py-2 text-xs text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors">
            <Upload size={12} />
            <span>Click to upload</span>
            <input type="file" accept="image/*,.pdf" className="sr-only" disabled={disabled}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onChange(doc.type, f);
                e.target.value = "";
              }} />
          </label>
        )}
      </div>
    ))}
  </div>
);

// ─── KYC document viewer (admin read-only) ────────────────────

const KycDocViewer = ({ profileData }: { profileData: Record<string, unknown> | null | undefined }) => {
  const docs = profileData?.kyc_documents as KycDocument[] | undefined;

  if (!docs?.length) {
    return <p className="text-xs text-muted-foreground">No documents uploaded.</p>;
  }

  const TYPE_LABELS: Record<DocType, string> = {
    national_id:     "National ID",
    drivers_license: "Driver's License",
    passport:        "International Passport",
  };

  return (
    <div className="space-y-2">
      {docs.map((doc, i) => (
        <a key={i} href={doc.url} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-3 rounded border border-border/40 bg-muted/20 px-3 py-2.5 text-sm transition-colors hover:border-primary/30 hover:bg-primary/5 group">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-primary/10">
            <ExternalLink size={13} className="text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-foreground text-xs">
              {TYPE_LABELS[doc.type] ?? doc.type}
            </p>
            <p className="truncate text-xs text-muted-foreground">{doc.url}</p>
          </div>
          <ExternalLink size={12} className="shrink-0 text-muted-foreground group-hover:text-primary transition-colors" />
        </a>
      ))}
    </div>
  );
};

// ─── Create User Dialog ───────────────────────────────────────

const CreateUserDialog = ({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  const createUser = useAdminCreateUser();
  const queryClient = useQueryClient();

  const [fullName,     setFullName]     = useState("");
  const [email,        setEmail]        = useState("");
  const [password,     setPassword]     = useState("");
  const [phone,        setPhone]        = useState("");
  const [dateOfBirth,  setDateOfBirth]  = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city,         setCity]         = useState("");
  const [stateVal,     setStateVal]     = useState("");
  const [postalCode,   setPostalCode]   = useState("");
  const [country,      setCountry]      = useState("");
  const [docSlots,     setDocSlots]     = useState<DocSlot[]>(INITIAL_DOC_SLOTS);
  const [uploading,    setUploading]    = useState(false);

  const resetForm = () => {
    setFullName(""); setEmail(""); setPassword("");
    setPhone(""); setDateOfBirth(""); setAddressLine1(""); setAddressLine2("");
    setCity(""); setStateVal(""); setPostalCode(""); setCountry("");
    setDocSlots(INITIAL_DOC_SLOTS);
  };

  const setDocFile = (type: DocType, file: File | null) =>
    setDocSlots((prev) => prev.map((d) => d.type === type ? { ...d, file } : d));

  const handleSubmit = async () => {
    if (!fullName || !email || !password) {
      toast.error("Full name, email, and password are required.");
      return;
    }
    const filledDocs = docSlots.filter((d) => d.file !== null);
    if (!filledDocs.length) {
      toast.error("Please upload at least one KYC document.");
      return;
    }

    try {
      setUploading(true);
      // Create user via edge function (sets approval_status = 'approved')
      const result = await createUser.mutateAsync({
        email, full_name: fullName, password,
        phone: phone || null, dateOfBirth: dateOfBirth || null,
        addressLine1: addressLine1 || null, addressLine2: addressLine2 || null,
        city: city || null, state: stateVal || null,
        postalCode: postalCode || null, country: country || null,
      });

      const userId = (result as { user_id?: string })?.user_id;
      if (!userId) throw new Error("Could not determine new user ID.");

      // Upload documents to Cloudinary
      const kycDocs = await uploadKycDocuments(
        filledDocs.map((d) => ({ type: d.type, file: d.file! })),
        userId
      );

      // Store structured doc list in profile_data. Must go through an admin
      // RPC: a direct UPDATE runs under the admin's session and RLS blocks
      // writes to another user's profile row (0 rows, no error).
      const { data: kycResult, error: updateError } = await supabase.rpc(
        "admin_set_kyc_documents",
        { p_user_id: userId, p_docs: kycDocs }
      );

      if (updateError) throw updateError;
      const kr = kycResult as { ok: boolean; error?: string };
      if (!kr?.ok) throw new Error(kr?.error ?? "Failed to save KYC documents.");

      // Refetch the user list now that docs are saved. The mutation's own
      // onSuccess invalidation fires before the upload/save completes, so the
      // list would otherwise show the new user without their documents.
      await queryClient.invalidateQueries({ queryKey: adminKeys.users() });

      toast.success("User created successfully.");
      resetForm();
      onOpenChange(false);
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const busy = createUser.isPending || uploading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create new user</DialogTitle>
          <DialogDescription>
            Admin-created users are automatically approved and can log in immediately.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Basic info */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Full name <span className="text-destructive">*</span></Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Jane Doe" disabled={busy} />
            </div>
            <div className="space-y-2">
              <Label>Email <span className="text-destructive">*</span></Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jane@example.com" disabled={busy} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Password <span className="text-destructive">*</span></Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" disabled={busy} />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(555) 123-4567" disabled={busy} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Date of birth</Label>
              <Input type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} disabled={busy} />
            </div>
            <div className="space-y-2">
              <Label>Country</Label>
              <Input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="United States" disabled={busy} />
            </div>
            <div className="space-y-2">
              <Label>Postal code</Label>
              <Input value={postalCode} onChange={(e) => setPostalCode(e.target.value)} placeholder="12345" disabled={busy} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Street address</Label>
            <Input value={addressLine1} onChange={(e) => setAddressLine1(e.target.value)} placeholder="123 Main St" disabled={busy} />
          </div>
          <div className="space-y-2">
            <Label>Address line 2</Label>
            <Input value={addressLine2} onChange={(e) => setAddressLine2(e.target.value)} placeholder="Apt 4B" disabled={busy} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>City</Label>
              <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Austin" disabled={busy} />
            </div>
            <div className="space-y-2">
              <Label>State / Region</Label>
              <Input value={stateVal} onChange={(e) => setStateVal(e.target.value)} placeholder="TX" disabled={busy} />
            </div>
          </div>

          {/* KYC Documents */}
          <div className="space-y-2">
            <Label>KYC Documents <span className="text-destructive">*</span></Label>
            <p className="text-xs text-muted-foreground">Upload at least one identity document.</p>
            <DocUploadSlots slots={docSlots} onChange={setDocFile} disabled={busy} />
          </div>
        </div>

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
          <Button variant="hero" onClick={handleSubmit} disabled={busy || !fullName || !email || !password}>
            {busy ? <><Loader2 size={14} className="animate-spin" /> {uploading ? "Uploading…" : "Creating…"}</> : "Create user"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ─── User Detail Modal ────────────────────────────────────────

const UserDetail = ({
  user,
  open,
  onOpenChange,
}: {
  user: AdminUser;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  const { data: accounts, isLoading: acctLoading } = useAdminUserAccounts(user.id);
  const { data: txns,     isLoading: txnLoading  } = useAdminUserTransactions(user.id);
  const adjust       = useAdminAdjustBalance();
  const updateUser   = useAdminUpdateUser();
  const updateProfile = useAdminUpdateProfile();
  const deleteUser   = useAdminDeleteUser();
  const setStatus    = useAdminSetUserStatus();
  const generateOtp  = useAdminGenerateTransferOtp();
  const setPendingMsg = useAdminSetTransferPendingMessage();
  const qc           = useQueryClient();
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const pd = (user.profile_data ?? {}) as Record<string, unknown>;
  const pdField = (key: string) => (pd[key] as string | null | undefined) ?? "";

  const [selectedAccId, setSelectedAccId] = useState<string | null>(null);
  const [adjAmount,  setAdjAmount]  = useState("");
  const [adjNote,    setAdjNote]    = useState("");
  const [adjType,    setAdjType]    = useState<"credit" | "debit">("credit");
  const [txSearch,   setTxSearch]   = useState("");
  const [fullName,       setFullName]       = useState(user.full_name ?? "");
  const [email,          setEmail]          = useState(user.email);
  const [profileFields,  setProfileFields]  = useState({
    phone:          pdField("phone"),
    date_of_birth:  pdField("date_of_birth"),
    address_line_1: pdField("address_line_1"),
    address_line_2: pdField("address_line_2"),
    city:           pdField("city"),
    state:          pdField("state"),
    postal_code:    pdField("postal_code"),
    country:        pdField("country"),
  });
  const [avatarFile,     setAvatarFile]     = useState<File | null>(null);
  const [avatarPreview,  setAvatarPreview]  = useState<string | null>(null);
  const [savingProfile,  setSavingProfile]  = useState(false);
  const [confirmDelete,  setConfirmDelete]  = useState(false);
  const [pendingStatus,  setPendingStatus]  = useState<AdminUserStatus | null>(null);
  const [otpByAccount,   setOtpByAccount]   = useState<Record<string, string>>({});
  const [msgByAccount,   setMsgByAccount]   = useState<Record<string, string>>({});

  useEffect(() => {
    const data = (user.profile_data ?? {}) as Record<string, unknown>;
    const field = (key: string) => (data[key] as string | null | undefined) ?? "";
    setFullName(user.full_name ?? "");
    setEmail(user.email);
    setProfileFields({
      phone:          field("phone"),
      date_of_birth:  field("date_of_birth"),
      address_line_1: field("address_line_1"),
      address_line_2: field("address_line_2"),
      city:           field("city"),
      state:          field("state"),
      postal_code:    field("postal_code"),
      country:        field("country"),
    });
    setAvatarFile(null);
    setAvatarPreview(null);
  }, [user]);

  const setProfileField = (key: keyof typeof profileFields, value: string) =>
    setProfileFields((prev) => ({ ...prev, [key]: value }));

  const filteredTxns = (txns ?? []).filter((t) =>
    t.name.toLowerCase().includes(txSearch.toLowerCase()) ||
    t.category.toLowerCase().includes(txSearch.toLowerCase())
  );

  const handleAdjust = () => {
    if (!selectedAccId || !adjAmount) return;
    const amt = parseFloat(adjAmount) * (adjType === "debit" ? -1 : 1);
    adjust.mutate(
      { accountId: selectedAccId, amount: amt, note: adjNote || undefined },
      {
        onSuccess: (r) => {
          toast.success(`Balance adjusted. New balance: ${formatCurrency(r.new_balance)}`);
          setAdjAmount(""); setAdjNote("");
        },
        onError: (e: Error) => toast.error(e.message),
      }
    );
  };

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

  const handleSave = async () => {
    setSavingProfile(true);
    try {
      let avatarUrl: string | null = null;
      if (avatarFile) avatarUrl = await uploadAvatar(avatarFile, user.id);

      // full_name, avatar and profile_data go through the admin profile RPC
      await updateProfile.mutateAsync({
        userId:       user.id,
        full_name:    fullName || null,
        avatar_url:   avatarUrl,
        profile_data: { ...profileFields },
      });

      // Email is auth-level — only touch it (edge function) when it changed.
      if (email !== user.email) {
        await updateUser.mutateAsync({ userId: user.id, email, full_name: fullName || null });
      }

      setAvatarFile(null);
      setAvatarPreview(null);
      toast.success("User profile updated.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSavingProfile(false);
    }
  };

  const currentAvatar = avatarPreview ?? user.avatar_url ?? undefined;

  const handleDelete = () => setConfirmDelete(true);

  const handleSetStatus = (status: AdminUserStatus) => setPendingStatus(status);

  const currentStatus = user.approval_status ?? "pending";
  const statusBusy = setStatus.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-6xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{user.full_name ?? user.email}</DialogTitle>
          <DialogDescription>Manage user profile, status, documents, balance adjustments, and transaction history.</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          {/* User header card */}
          <div className="rounded border border-border/40 bg-gradient-card p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Avatar className="h-16 w-16 border border-border/50">
                    {currentAvatar ? <AvatarImage src={currentAvatar} alt={user.full_name ?? user.email} className="object-cover" /> : null}
                    <AvatarFallback className="bg-primary/10 text-xl font-bold text-primary">
                      {(user.full_name ?? user.email).slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border border-border bg-background text-foreground shadow transition-colors hover:bg-muted"
                    aria-label="Change photo"
                  >
                    <Camera size={13} />
                  </button>
                  <input ref={avatarInputRef} type="file" accept="image/*" className="sr-only" onChange={handlePickAvatar} />
                </div>
                <div>
                  <p className="font-display text-lg font-bold text-foreground">{user.full_name ?? "—"}</p>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Joined {formatDate(user.created_at)} · {user.account_count} account{user.account_count !== 1 ? "s" : ""} · Total balance:{" "}
                    <span className="font-medium text-foreground">{formatCurrency(user.total_balance)}</span>
                  </p>
                  <p className="mt-1 font-mono text-xs text-muted-foreground">ID: {user.id}</p>
                  {avatarFile && (
                    <p className="mt-1 text-xs text-primary">New photo selected — save to apply.</p>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-2 sm:items-end">
                <StatusBadge status={currentStatus} />
                <Button variant="destructive" size="sm" onClick={handleDelete} disabled={deleteUser.isPending}>
                  {deleteUser.isPending ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  <span className="ml-2">Delete user</span>
                </Button>
              </div>
            </div>
          </div>

          {/* Status controls */}
          <div className="rounded border border-border/40 bg-gradient-card p-5 space-y-3">
            <h2 className="font-display text-sm font-semibold text-foreground">Account Status</h2>
            <p className="text-xs text-muted-foreground">
              Current status: <StatusBadge status={currentStatus} />
            </p>
            <div className="flex flex-wrap gap-2">
              {currentStatus !== "approved" && (
                <Button size="sm" variant="hero" onClick={() => handleSetStatus("approved")} disabled={statusBusy}>
                  <ShieldCheck size={13} className="mr-1.5" /> Approve
                </Button>
              )}
              {currentStatus !== "suspended" && (
                <Button size="sm" variant="outline" className="border-orange-500/40 text-orange-500 hover:bg-orange-500/10"
                  onClick={() => handleSetStatus("suspended")} disabled={statusBusy}>
                  <ShieldAlert size={13} className="mr-1.5" /> Suspend
                </Button>
              )}
              {currentStatus !== "frozen" && (
                <Button size="sm" variant="outline" className="border-blue-500/40 text-blue-500 hover:bg-blue-500/10"
                  onClick={() => handleSetStatus("frozen")} disabled={statusBusy}>
                  <Snowflake size={13} className="mr-1.5" /> Freeze
                </Button>
              )}
              {currentStatus !== "on_hold" && (
                <Button size="sm" variant="outline" onClick={() => handleSetStatus("on_hold")} disabled={statusBusy}>
                  <PauseCircle size={13} className="mr-1.5" /> Hold
                </Button>
              )}
              {currentStatus !== "pending" && (
                <Button size="sm" variant="outline" className="border-yellow-500/40 text-yellow-500 hover:bg-yellow-500/10"
                  onClick={() => handleSetStatus("pending")} disabled={statusBusy}>
                  <Clock size={13} className="mr-1.5" /> Set Pending
                </Button>
              )}
            </div>
          </div>

          {/* KYC Documents */}
          <div className="rounded border border-border/40 bg-gradient-card p-5 space-y-3">
            <h2 className="font-display text-sm font-semibold text-foreground">KYC Documents</h2>
            <KycDocViewer profileData={user.profile_data as Record<string, unknown> | null | undefined} />
          </div>

          {/* Edit profile */}
          <div className="rounded border border-border/40 bg-gradient-card p-5 space-y-4">
            <h2 className="font-display text-sm font-semibold text-foreground">Profile Information</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Full name</Label>
                <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={profileFields.phone} onChange={(e) => setProfileField("phone", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Date of birth</Label>
                <Input type="date" value={profileFields.date_of_birth} onChange={(e) => setProfileField("date_of_birth", e.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Street address</Label>
              <Input value={profileFields.address_line_1} onChange={(e) => setProfileField("address_line_1", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Address line 2</Label>
              <Input value={profileFields.address_line_2} onChange={(e) => setProfileField("address_line_2", e.target.value)} />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>City</Label>
                <Input value={profileFields.city} onChange={(e) => setProfileField("city", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>State / Region</Label>
                <Input value={profileFields.state} onChange={(e) => setProfileField("state", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Postal code</Label>
                <Input value={profileFields.postal_code} onChange={(e) => setProfileField("postal_code", e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Country</Label>
              <Input value={profileFields.country} onChange={(e) => setProfileField("country", e.target.value)} />
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-muted-foreground">Admin edits apply immediately and don't change the user's approval status.</div>
              <Button variant="hero" onClick={handleSave} disabled={savingProfile}>
                {savingProfile ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : "Save changes"}
              </Button>
            </div>
          </div>

          {/* Accounts + Transactions */}
          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-4">
              <h2 className="font-display text-base font-semibold text-foreground">Accounts</h2>
              {acctLoading ? (
                <div className="flex h-20 items-center justify-center"><Loader2 className="animate-spin text-primary" size={22} /></div>
              ) : (
                <div className="space-y-2">
                  {(accounts ?? []).map((a) => (
                    <div key={a.id} className={`rounded border transition-all ${
                      selectedAccId === a.id
                        ? "border-primary bg-primary/5"
                        : "border-border/40 bg-gradient-card"
                    }`}>
                      <div
                        onClick={() => setSelectedAccId(selectedAccId === a.id ? null : a.id)}
                        className="flex cursor-pointer items-center justify-between p-4">
                        <div>
                          <p className="text-sm font-medium text-foreground">{a.name}</p>
                          <p className="text-xs text-muted-foreground capitalize">
                            {a.type} · ****{a.account_number} · {a.status}
                          </p>
                        </div>
                        <p className={`font-display text-lg font-bold ${a.balance < 0 ? "text-destructive" : "text-foreground"}`}>
                          {formatCurrency(a.balance)}
                        </p>
                      </div>
                      {/* OTP generation row */}
                      <div className="flex items-center gap-3 border-t border-border/20 px-4 py-2.5">
                        <Key size={13} className="shrink-0 text-muted-foreground" />
                        <span className="flex-1 text-xs text-muted-foreground">Transfer OTP</span>
                        {otpByAccount[a.id] ? (
                          <span className="font-mono text-sm font-bold tracking-widest text-primary select-all">
                            {otpByAccount[a.id]}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">not generated</span>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-xs"
                          disabled={generateOtp.isPending}
                          onClick={() =>
                            generateOtp.mutate(a.id, {
                              onSuccess: (r) => {
                                setOtpByAccount((prev) => ({ ...prev, [a.id]: r.code! }));
                                toast.success(`OTP generated: ${r.code}`);
                              },
                              onError: (e: Error) => toast.error(e.message),
                            })
                          }
                        >
                          {generateOtp.isPending ? <Loader2 size={11} className="animate-spin" /> : "Generate"}
                        </Button>
                      </div>
                      {/* Per-account pending-review message */}
                      {(() => {
                        const currentMsg = (a as { transfer_pending_message?: string | null }).transfer_pending_message ?? "";
                        const value = msgByAccount[a.id] ?? currentMsg;
                        const dirty = value !== currentMsg;
                        return (
                          <div className="border-t border-border/20 px-4 py-2.5 space-y-2">
                            <div className="flex items-center gap-2">
                              <MessageSquare size={13} className="shrink-0 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">Transfer "pending review" message shown to this user</span>
                            </div>
                            <textarea
                              value={value}
                              onChange={(e) => setMsgByAccount((prev) => ({ ...prev, [a.id]: e.target.value }))}
                              placeholder="Leave blank to use the default pending-review message."
                              rows={2}
                              className="w-full rounded border border-border/50 bg-muted/30 px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-primary/50 focus:outline-none"
                            />
                            <div className="flex justify-end">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2 text-xs"
                                disabled={setPendingMsg.isPending || !dirty}
                                onClick={() =>
                                  setPendingMsg.mutate(
                                    { accountId: a.id, message: value },
                                    {
                                      onSuccess: () => {
                                        toast.success("Pending-review message saved.");
                                        setMsgByAccount((prev) => {
                                          const next = { ...prev };
                                          delete next[a.id];
                                          return next;
                                        });
                                        qc.invalidateQueries({ queryKey: adminKeys.userAccounts(user.id) });
                                      },
                                      onError: (e: Error) => toast.error(e.message),
                                    }
                                  )
                                }
                              >
                                {setPendingMsg.isPending ? <Loader2 size={11} className="animate-spin" /> : "Save message"}
                              </Button>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  ))}
                </div>
              )}

              <AnimatePresence>
                {selectedAccId && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                    className="rounded border border-primary/30 bg-primary/5 p-5 space-y-4">
                    <h3 className="font-display text-sm font-semibold text-foreground">Manual Balance Adjustment</h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Type</Label>
                        <div className="flex gap-2">
                          {(["credit", "debit"] as const).map((t) => (
                            <button key={t} onClick={() => setAdjType(t)}
                              className={`flex-1 rounded border py-2 text-xs font-medium transition-colors capitalize ${
                                adjType === t
                                  ? "border-primary bg-primary/10 text-primary"
                                  : "border-border/40 bg-muted/30 text-muted-foreground"
                              }`}>
                              {t === "credit" ? "Credit (Add)" : "Debit (Remove)"}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Amount (USD)</Label>
                        <Input type="number" placeholder="0.00" min="0.01" step="0.01"
                          value={adjAmount} onChange={(e) => setAdjAmount(e.target.value)} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Note (optional)</Label>
                      <Input placeholder="Reason for adjustment"
                        value={adjNote} onChange={(e) => setAdjNote(e.target.value)} />
                    </div>
                    <Button variant="hero" size="sm" onClick={handleAdjust} disabled={adjust.isPending || !adjAmount}>
                      {adjust.isPending ? <><Loader2 size={13} className="animate-spin" /> Processing…</> : "Apply Adjustment"}
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Transactions */}
            <div>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-display text-base font-semibold text-foreground">Transactions</h2>
                <div className="relative w-full sm:w-48">
                  <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input placeholder="Search…" value={txSearch} onChange={(e) => setTxSearch(e.target.value)}
                    className="border-border/50 bg-muted/50 pl-8 text-xs h-8" />
                </div>
              </div>
              {txnLoading ? (
                <div className="flex h-20 items-center justify-center"><Loader2 className="animate-spin text-primary" size={22} /></div>
              ) : filteredTxns.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">No transactions found.</p>
              ) : (
                <div className="rounded border border-border/40 bg-gradient-card overflow-hidden">
                  {filteredTxns.slice(0, 50).map((tx, i) => (
                    <div key={tx.id} className={`flex items-center gap-4 px-4 py-3 ${
                      i !== filteredTxns.length - 1 ? "border-b border-border/20" : ""
                    }`}>
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                        tx.type === "credit" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                      }`}>
                        {tx.type === "credit" ? <ArrowDownLeft size={14} /> : <ArrowUpRight size={14} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{tx.name}</p>
                        <p className="text-xs text-muted-foreground">{tx.category} · {formatDate(tx.created_at)}</p>
                      </div>
                      <p className={`text-sm font-semibold shrink-0 ${tx.type === "credit" ? "text-primary" : "text-foreground"}`}>
                        {tx.type === "credit" ? "+" : "-"}{formatCurrency(tx.amount)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete user?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete{" "}
              <span className="font-medium text-foreground">{user.email}</span> and all
              associated data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={buttonVariants({ variant: "destructive" })}
              onClick={() =>
                deleteUser.mutate(user.id, {
                  onSuccess: () => { toast.success("User deleted."); onOpenChange(false); },
                  onError:   (e: Error) => toast.error(e.message),
                })
              }
            >
              Delete user
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={pendingStatus !== null}
        onOpenChange={(open) => { if (!open) setPendingStatus(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Update user status?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to{" "}
              <span className="font-medium text-foreground">
                {pendingStatus ? STATUS_ACTION_LABELS[pendingStatus] : ""}
              </span>{" "}
              this user?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!pendingStatus) return;
                setStatus.mutate(
                  { userId: user.id, status: pendingStatus },
                  {
                    onSuccess: () =>
                      toast.success(`User status updated to ${pendingStatus.replace("_", " ")}.`),
                    onError: (e: Error) => toast.error(e.message),
                  }
                );
                setPendingStatus(null);
              }}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
};

// ─── Main page ────────────────────────────────────────────────

const AdminUsers = () => {
  const { data: users, isLoading, isError, error } = useAdminUsers();
  const [search,       setSearch]       = useState("");
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [createOpen,   setCreateOpen]   = useState(false);
  const [statusFilter, setStatusFilter] = useState<AdminUserStatus | "all">("all");

  const filtered = (users ?? []).filter((u) => {
    const matchesSearch =
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.full_name ?? "").toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || u.approval_status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const pendingCount = (users ?? []).filter((u) => u.approval_status === "pending").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Users</h1>
          <p className="text-sm text-muted-foreground">
            {users?.length ?? 0} registered users
            {pendingCount > 0 && (
              <span className="ml-2 inline-flex items-center gap-1 rounded-full border border-yellow-500/30 bg-yellow-500/10 px-2 py-0.5 text-xs font-semibold text-yellow-500">
                <Clock size={10} /> {pendingCount} pending
              </span>
            )}
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search users…" value={search} onChange={(e) => setSearch(e.target.value)}
              className="border-border/50 bg-muted/50 pl-10" />
          </div>
          {/* Status filter tabs */}
          <div className="flex gap-1 rounded border border-border/40 bg-muted/30 p-1">
            {(["all", "pending", "approved", "suspended", "frozen", "on_hold"] as const).map((s) => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={`rounded px-2.5 py-1 text-xs font-medium transition-colors capitalize ${
                  statusFilter === s
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}>
                {s === "all" ? "All" : s.replace("_", " ")}
              </button>
            ))}
          </div>
          <Button variant="hero" size="sm" onClick={() => setCreateOpen(true)}>
            <Plus size={16} className="mr-2" /> New user
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="animate-spin text-primary" size={28} />
        </div>
      ) : isError ? (
        <div className="rounded border border-destructive/40 bg-destructive/5 p-6">
          <p className="text-sm font-medium text-destructive">Failed to load users.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {error instanceof Error ? error.message : "Check the admin_get_users RPC configuration."}
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded border border-dashed border-border/50 p-10 text-center">
          <Users size={28} className="mx-auto mb-3 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No users found.</p>
        </div>
      ) : (
        <div className="rounded border border-border/40 overflow-hidden">
          <div className="grid grid-cols-6 gap-4 border-b border-border/20 bg-muted/30 px-4 py-2.5 text-xs font-medium text-muted-foreground">
            <span className="col-span-2">User</span>
            <span className="text-center">Status</span>
            <span className="text-right">Profile</span>
            <span className="text-right">Accounts</span>
            <span className="text-right">Balance</span>
          </div>
          {filtered.map((u, i) => (
            <motion.div key={u.id}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
              onClick={() => setSelectedUser(u)}
              className={`grid cursor-pointer grid-cols-6 gap-4 items-center px-4 py-3 transition-colors hover:bg-muted/30 ${
                i !== filtered.length - 1 ? "border-b border-border/20" : ""
              }`}>
              <div className="col-span-2 flex items-center gap-3 min-w-0">
                <Avatar className="h-8 w-8 shrink-0">
                  {u.avatar_url ? <AvatarImage src={u.avatar_url} alt={u.full_name ?? u.email} className="object-cover" /> : null}
                  <AvatarFallback className="bg-primary/10 text-xs font-bold text-primary">
                    {(u.full_name ?? u.email).slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{u.full_name ?? "—"}</p>
                  <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                </div>
              </div>
              <div className="flex justify-center">
                <StatusBadge status={u.approval_status ?? "pending"} />
              </div>
              <div className="flex justify-end">
                <span className={`rounded border px-2 py-1 text-xs font-medium ${
                  u.has_profile
                    ? "border-primary/30 bg-primary/10 text-primary"
                    : "border-muted-foreground/30 bg-muted/40 text-muted-foreground"
                }`}>
                  {u.has_profile ? "Profiled" : "No profile"}
                </span>
              </div>
              <p className="text-right text-sm text-muted-foreground">{u.account_count}</p>
              <p className="text-right text-sm font-semibold text-foreground">{formatCurrency(u.total_balance)}</p>
            </motion.div>
          ))}
        </div>
      )}

      <CreateUserDialog open={createOpen} onOpenChange={setCreateOpen} />
      {selectedUser && (
        <UserDetail
          user={selectedUser}
          open={Boolean(selectedUser)}
          onOpenChange={(open) => { if (!open) setSelectedUser(null); }}
        />
      )}
    </div>
  );
};

export default AdminUsers;
