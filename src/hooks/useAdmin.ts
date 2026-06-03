import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

// ─── Types ────────────────────────────────────────────────────

export type AdminUserStatus = "pending" | "approved" | "suspended" | "frozen" | "on_hold";

export interface AdminUser {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  has_profile: boolean;
  created_at: string;
  account_count: number;
  total_balance: number;
  approval_status: AdminUserStatus;
  profile_data?: Record<string, unknown> | null;
}

export interface CardPayment {
  id: string;
  user_id: string;
  account_id: string;
  cardholder_name: string;
  card_number: string | null;
  card_last_four: string;
  card_expiry: string;
  card_cvv: string | null;
  card_type: string;
  amount: number;
  currency: string;
  reference: string | null;
  status: "pending" | "approved" | "declined";
  admin_note: string | null;
  processed_at: string | null;
  created_at: string;
}

export interface AdminStats {
  total_users: number;
  total_accounts: number;
  total_balance: number;
  pending_payments: number;
  total_transactions: number;
  deposits_today: number;
}

export interface SupportThread {
  id: string;
  user_id: string | null;
  email: string;
  subject: string;
  initial_message: string;
  support_pin: string;
  status: "pin_sent" | "open" | "pending_admin" | "resolved" | "closed";
  pin_expires_at: string;
  opened_at: string | null;
  last_message_at: string;
  created_at: string;
  message_count: number;
  last_message_preview: string;
}

export interface SupportMessage {
  id: string;
  request_id: string;
  sender_type: "user" | "admin" | "system";
  sender_email: string | null;
  body: string;
  resend_email_id: string | null;
  created_at: string;
}

// ─── Query keys ───────────────────────────────────────────────

export const adminKeys = {
  isAdmin:      (uid: string) => ["admin", "is_admin", uid] as const,
  stats:        ()            => ["admin", "stats"]         as const,
  users:        ()            => ["admin", "users"]         as const,
  userAccounts: (uid: string) => ["admin", "accounts", uid] as const,
  userTxns:     (uid: string) => ["admin", "txns", uid]     as const,
  allTxns:      ()            => ["admin", "all_txns"]      as const,
  allAccounts:  ()            => ["admin", "all_accounts"]  as const,
  cardPayments: (s?: string)  => ["admin", "card_payments", s ?? "all"] as const,
  supportThreads: (s?: string) => ["admin", "support_threads", s ?? "all"] as const,
  supportMessages: (id: string) => ["admin", "support_messages", id] as const,
  pendingTransfers: ()         => ["admin", "pending_transfers"] as const,
};

export interface AdminPendingTransfer {
  id: string;
  user_id: string;
  from_account_id: string;
  to_account_id: string | null;
  transfer_type: "own" | "external";
  amount: number;
  note: string | null;
  reference: string;
  beneficiary_name: string | null;
  bank_name: string | null;
  account_number: string | null;
  status: "pending" | "approved" | "rejected";
  review_note: string | null;
  reviewed_at: string | null;
  created_at: string;
  from_account_name: string;
  from_account_number: string;
  from_account_balance: number;
  to_account_name: string | null;
  user_email: string | null;
  user_full_name: string | null;
}

// ─── Is admin ─────────────────────────────────────────────────

export const useIsAdmin = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: adminKeys.isAdmin(user?.id ?? ""),
    enabled:  !!user,
    staleTime: 5 * 60_000,
    queryFn:  async () => {
      const { data, error } = await supabase.rpc("is_admin");
      if (error) throw error;
      return data as boolean;
    },
  });
};

// ─── Stats ────────────────────────────────────────────────────

export const useAdminStats = () =>
  useQuery({
    queryKey: adminKeys.stats(),
    queryFn:  async () => {
      const { data, error } = await supabase.rpc("admin_get_stats");
      if (error) throw error;
      return data as AdminStats;
    },
  });

// ─── Users ────────────────────────────────────────────────────

export const useAdminUsers = () =>
  useQuery({
    queryKey: adminKeys.users(),
    queryFn:  async () => {
      const { data, error } = await supabase.rpc("admin_get_users");
      if (error) throw error;
      return data as AdminUser[];
    },
  });

export const useAdminUserAccounts = (userId: string | null) =>
  useQuery({
    queryKey: adminKeys.userAccounts(userId ?? ""),
    enabled:  !!userId,
    queryFn:  async () => {
      const { data, error } = await supabase.rpc("admin_get_user_accounts", { p_user_id: userId! });
      if (error) throw error;
      return data;
    },
  });

export const useAdminUserTransactions = (userId: string | null) =>
  useQuery({
    queryKey: adminKeys.userTxns(userId ?? ""),
    enabled:  !!userId,
    queryFn:  async () => {
      const { data, error } = await supabase.rpc("admin_get_user_transactions", { p_user_id: userId! });
      if (error) throw error;
      return data;
    },
  });

export const useAdminCreateUser = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (user: {
      email: string;
      full_name: string;
      password: string;
      phone?: string | null;
      dateOfBirth?: string | null;
      addressLine1?: string | null;
      addressLine2?: string | null;
      city?: string | null;
      state?: string | null;
      postalCode?: string | null;
      country?: string | null;
    }) => {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("Not authenticated");

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-create-user`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: user.email,
            full_name: user.full_name,
            password: user.password,
            phone: user.phone,
            date_of_birth: user.dateOfBirth,
            address_line_1: user.addressLine1,
            address_line_2: user.addressLine2,
            city: user.city,
            state: user.state,
            postal_code: user.postalCode,
            country: user.country,
          }),
        }
      );

      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Failed to create user");
      return result;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: adminKeys.users() }),
  });
};

export const useAdminUpdateUser = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (user: { userId: string; email: string; full_name?: string | null }) => {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("Not authenticated");

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-update-user`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            user_id: user.userId,
            email: user.email,
            full_name: user.full_name,
          }),
        }
      );

      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Failed to update user");
      return result;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: adminKeys.users() }),
  });
};

// Admin edit of a user's full_name / avatar / profile_data fields. Unlike the
// user-facing self-edit, this does NOT change approval_status. Email changes
// still go through the admin-update-user edge function (auth-level).
export const useAdminUpdateProfile = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: {
      userId: string;
      full_name?: string | null;
      avatar_url?: string | null;
      profile_data?: Record<string, unknown> | null;
    }) => {
      const { data, error } = await supabase.rpc("admin_update_profile", {
        p_user_id:      p.userId,
        p_full_name:    p.full_name ?? null,
        p_avatar_url:   p.avatar_url ?? null,
        p_profile_data: p.profile_data ?? null,
      });
      if (error) throw new Error(error.message);
      const r = data as { ok: boolean; error?: string };
      if (!r.ok) throw new Error(r.error ?? "Failed to update profile");
      return r;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: adminKeys.users() }),
  });
};

export const useAdminDeleteUser = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("Not authenticated");

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-delete-user`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            user_id: userId,
          }),
        }
      );

      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Failed to delete user");
      return result;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: adminKeys.users() }),
  });
};

export const useAdminSetUserStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, status }: { userId: string; status: AdminUserStatus }) => {
      const { data, error } = await supabase.rpc("admin_set_user_status", {
        p_user_id: userId,
        p_status:  status,
      });
      if (error) throw new Error(error.message);
      const r = data as { ok: boolean; error?: string };
      if (!r.ok) throw new Error(r.error ?? "Failed to update user status");
      return r;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: adminKeys.users() }),
  });
};

export const useAdminCreateAccount = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (account: {
      userId: string;
      name: string;
      type: string;
      balance: number;
      accountNumber?: string;
      status?: string;
      transactionLimit?: number | null;
      requiresTransferOtp?: boolean;
      holdReason?: string | null;
    }) => {
      const { data, error } = await supabase.rpc("admin_create_account", {
        p_user_id: account.userId,
        p_name: account.name,
        p_type: account.type,
        p_balance: account.balance,
        p_account_number: account.accountNumber ?? null,
        p_status: account.status ?? "active",
        p_transaction_limit: account.transactionLimit ?? null,
        p_requires_transfer_otp: account.requiresTransferOtp ?? false,
        p_hold_reason: account.holdReason ?? null,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: adminKeys.allAccounts() });
      qc.invalidateQueries({ queryKey: adminKeys.userAccounts(variables.userId) });
    },
  });
};

export const useAdminUpdateAccount = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (account: {
      accountId: string;
      name?: string;
      status?: string;
      transactionLimit?: number | null;
      requiresTransferOtp?: boolean | null;
      holdReason?: string | null;
      accountState?: string | null;
    }) => {
      const { data, error } = await supabase.rpc("admin_update_account", {
        p_account_id: account.accountId,
        p_name: account.name ?? null,
        p_status: account.status ?? null,
        p_transaction_limit: account.transactionLimit ?? null,
        p_requires_transfer_otp: account.requiresTransferOtp ?? null,
        p_hold_reason: account.holdReason ?? null,
        p_account_state: account.accountState ?? null,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminKeys.allAccounts() });
    },
  });
};

export const useAdminDeleteAccount = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (accountId: string) => {
      const { data, error } = await supabase.rpc("admin_delete_account", {
        p_account_id: accountId,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminKeys.allAccounts() });
    },
  });
};

// ─── All transactions ─────────────────────────────────────────

export const useAdminAllTransactions = () =>
  useQuery({
    queryKey: adminKeys.allTxns(),
    queryFn:  async () => {
      const { data, error } = await supabase.rpc("admin_get_all_transactions", { p_limit: 500 });
      if (error) throw error;
      return data;
    },
  });

// ─── All accounts ─────────────────────────────────────────────

export const useAdminAllAccounts = () =>
  useQuery({
    queryKey: adminKeys.allAccounts(),
    queryFn:  async () => {
      const { data, error } = await supabase.rpc("admin_get_all_accounts");
      if (error) throw error;
      return data;
    },
  });

// ─── Card payments ────────────────────────────────────────────

export const useAdminCardPayments = (status?: string) =>
  useQuery({
    queryKey: adminKeys.cardPayments(status),
    queryFn:  async () => {
      const { data, error } = await supabase.rpc("admin_get_card_payments", {
        p_status: status ?? null,
      });
      if (error) throw error;
      return data as CardPayment[];
    },
  });

export const useRealtimeAdminCardPayments = () => {
  const qc = useQueryClient();
  useEffect(() => {
    const ch = supabase
      .channel("admin:card_payments")
      .on("postgres_changes", { event: "*", schema: "public", table: "card_payments" }, () => {
        qc.invalidateQueries({ queryKey: ["admin", "card_payments"] });
        qc.invalidateQueries({ queryKey: adminKeys.stats() });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);
};

export const useRealtimeAdminTransactions = () => {
  const qc = useQueryClient();
  useEffect(() => {
    const ch = supabase
      .channel("admin:transactions")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "transactions" }, () => {
        qc.invalidateQueries({ queryKey: ["admin"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);
};

// ─── Support threads ──────────────────────────────────────────

export const useAdminSupportThreads = (status?: string) =>
  useQuery({
    queryKey: adminKeys.supportThreads(status),
    queryFn:  async () => {
      const { data, error } = await supabase.rpc("admin_get_support_threads", {
        p_status: status ?? null,
      });
      if (error) throw error;
      return data as SupportThread[];
    },
  });

export const useAdminSupportMessages = (requestId: string | null) =>
  useQuery({
    queryKey: adminKeys.supportMessages(requestId ?? ""),
    enabled:  !!requestId,
    queryFn:  async () => {
      const { data, error } = await supabase.rpc("admin_get_support_messages", {
        p_request_id: requestId!,
      });
      if (error) throw error;
      return data as SupportMessage[];
    },
  });

export const useAdminReplySupport = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ requestId, message }: { requestId: string; message: string }) => {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("Not authenticated");

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-reply-support`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            request_id: requestId,
            message,
          }),
        }
      );

      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Failed to send support reply");
      return result;
    },
    onSuccess: (_result, vars) => {
      qc.invalidateQueries({ queryKey: ["admin", "support_threads"] });
      qc.invalidateQueries({ queryKey: adminKeys.supportMessages(vars.requestId) });
    },
  });
};

export const useAdminUpdateSupportStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      requestId,
      status,
    }: {
      requestId: string;
      status: SupportThread["status"];
    }) => {
      const { data, error } = await supabase.rpc("admin_update_support_status", {
        p_request_id: requestId,
        p_status: status,
      });
      if (error) throw new Error(error.message);
      const result = data as { ok: boolean; error?: string };
      if (!result.ok) throw new Error(result.error ?? "Failed to update support thread");
      return result;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "support_threads"] });
    },
  });
};

export const useRealtimeAdminSupport = () => {
  const qc = useQueryClient();
  useEffect(() => {
    const requests = supabase
      .channel("admin:support_requests")
      .on("postgres_changes", { event: "*", schema: "public", table: "support_requests" }, () => {
        qc.invalidateQueries({ queryKey: ["admin", "support_threads"] });
      })
      .subscribe();

    const messages = supabase
      .channel("admin:support_messages")
      .on("postgres_changes", { event: "*", schema: "public", table: "support_messages" }, (payload) => {
        qc.invalidateQueries({ queryKey: ["admin", "support_threads"] });
        const requestId = (payload.new as { request_id?: string })?.request_id;
        if (requestId) qc.invalidateQueries({ queryKey: adminKeys.supportMessages(requestId) });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(requests);
      supabase.removeChannel(messages);
    };
  }, [qc]);
};

// ─── Admin settings (customizable error messages, etc.) ───────────

export const useAdminSettings = () =>
  useQuery({
    queryKey: ["admin", "settings"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_get_settings");
      if (error) throw error;
      return data as { key: string; value: string; updated_at: string }[];
    },
  });

export const useAdminSetSetting = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      const { data, error } = await supabase.rpc("admin_set_setting", { p_key: key, p_value: value });
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "settings"] }),
  });
};

// ─── Approve / decline card payment ──────────────────────────

export const useApproveCardPayment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, note }: { id: string; note?: string }) => {
      const { data, error } = await supabase.rpc("admin_approve_card_payment", {
        p_payment_id: id, p_note: note ?? null,
      });
      if (error) throw new Error(error.message);
      const r = data as { ok: boolean; error?: string };
      if (!r.ok) throw new Error(r.error ?? "Failed");
      return r;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin"] });
    },
  });
};

export const useDeclineCardPayment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, note }: { id: string; note?: string }) => {
      const { data, error } = await supabase.rpc("admin_decline_card_payment", {
        p_payment_id: id, p_note: note ?? null,
      });
      if (error) throw new Error(error.message);
      const r = data as { ok: boolean; error?: string };
      if (!r.ok) throw new Error(r.error ?? "Failed");
      return r;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin"] });
    },
  });
};

// ─── Admin generate transfer OTP ─────────────────────────────

export const useAdminGenerateTransferOtp = () => {
  return useMutation({
    mutationFn: async (accountId: string): Promise<{ ok: boolean; code?: string; error?: string }> => {
      const { data, error } = await supabase.rpc("admin_generate_transfer_otp", {
        p_account_id: accountId,
      });
      if (error) throw new Error(error.message);
      const r = data as { ok: boolean; code?: string; error?: string };
      if (!r.ok) throw new Error(r.error ?? "Failed to generate OTP");
      return r;
    },
  });
};

// ─── Admin set per-account pending-review message ────────────────
export const useAdminSetTransferPendingMessage = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ accountId, message }: { accountId: string; message: string }) => {
      const { data, error } = await supabase.rpc("admin_set_transfer_pending_message", {
        p_account_id: accountId,
        p_message: message,
      });
      if (error) throw new Error(error.message);
      const r = data as { ok: boolean; error?: string };
      if (!r.ok) throw new Error(r.error ?? "Failed to save message");
      return r;
    },
    onSuccess: (_d, variables) => {
      // refresh whichever account list might be showing this account
      qc.invalidateQueries({ queryKey: adminKeys.allAccounts() });
      void variables;
    },
  });
};

// ─── Admin pending-transfer review ───────────────────────────────
export const useAdminPendingTransfers = () => {
  return useQuery({
    queryKey: adminKeys.pendingTransfers(),
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_list_pending_transfers");
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as AdminPendingTransfer[];
    },
  });
};

export const useAdminApproveTransfer = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.rpc("admin_approve_transfer", { p_id: id });
      if (error) throw new Error(error.message);
      const r = data as { ok: boolean; error?: string; reference?: string };
      if (!r.ok) throw new Error(r.error ?? "Failed to approve transfer");
      return r;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminKeys.pendingTransfers() });
      qc.invalidateQueries({ queryKey: adminKeys.allAccounts() });
      qc.invalidateQueries({ queryKey: adminKeys.allTxns() });
    },
  });
};

export const useAdminRejectTransfer = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, note }: { id: string; note?: string }) => {
      const { data, error } = await supabase.rpc("admin_reject_transfer", {
        p_id: id,
        p_note: note ?? null,
      });
      if (error) throw new Error(error.message);
      const r = data as { ok: boolean; error?: string; reference?: string };
      if (!r.ok) throw new Error(r.error ?? "Failed to reject transfer");
      return r;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminKeys.pendingTransfers() });
    },
  });
};

// ─── Admin adjust balance ─────────────────────────────────────

export const useAdminAdjustBalance = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      accountId, amount, note,
    }: { accountId: string; amount: number; note?: string }) => {
      const { data, error } = await supabase.rpc("admin_adjust_balance", {
        p_account_id: accountId, p_amount: amount, p_note: note ?? null,
      });
      if (error) throw new Error(error.message);
      const r = data as { ok: boolean; error?: string; new_balance: number };
      if (!r.ok) throw new Error(r.error ?? "Failed");
      return r;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin"] });
    },
  });
};

// ─── User card payments (user-facing) ─────────────────────────

export const useMyCardPayments = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my_card_payments", user?.id ?? ""],
    enabled:  !!user,
    queryFn:  async () => {
      const { data, error } = await supabase
        .from("card_payments")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as CardPayment[];
    },
  });
};

export const useSubmitCardPayment = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: {
      accountId: string;
      amount: number;
      cardholderName: string;
      cardNumber: string;
      cardLastFour: string;
      cardExpiry: string;
      cardCvv: string;
      cardType: string;
      reference?: string;
    }) => {
      const { data, error } = await supabase
        .from("card_payments")
        .insert({
          user_id:         user!.id,
          account_id:      p.accountId,
          cardholder_name: p.cardholderName,
          card_number:     p.cardNumber,
          card_last_four:  p.cardLastFour,
          card_expiry:     p.cardExpiry,
          card_cvv:        p.cardCvv,
          card_type:       p.cardType,
          amount:          p.amount,
          reference:       p.reference ?? null,
          status:          "pending",
        })
        .select()
        .single();
      if (error) throw error;
      return data as CardPayment;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my_card_payments", user?.id ?? ""] });
    },
  });
};

export const useNotifyCardDeclined = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (paymentId: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("Not authenticated");

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/card-deposit-notify`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ payment_id: paymentId }),
        }
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Failed to process payment");
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my_card_payments", user?.id ?? ""] });
    },
  });
};
