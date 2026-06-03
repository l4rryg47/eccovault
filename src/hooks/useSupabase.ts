/**
 * useSupabase.ts — Phase 4
 * Removed: useSeedUserData
 * Added:   useBeneficiaries, useAddBeneficiary, useDeleteBeneficiary,
 *          useExternalTransfers, useSendExternalTransfer, useDeposit
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

// ─── Query Keys ───────────────────────────────────────────────

export const keys = {
  accounts:          (uid: string) => ["accounts",           uid] as const,
  transactions:      (uid: string) => ["transactions",       uid] as const,
  cards:             (uid: string) => ["cards",              uid] as const,
  savingsGoals:      (uid: string) => ["savings_goals",      uid] as const,
  investments:       (uid: string) => ["investments",        uid] as const,
  profile:           (uid: string) => ["profile",            uid] as const,
  beneficiaries:     (uid: string) => ["beneficiaries",      uid] as const,
  externalTransfers: (uid: string) => ["external_transfers", uid] as const,
};

// ─── Accounts ─────────────────────────────────────────────────

export const useAccounts = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: keys.accounts(user?.id ?? ""),
    enabled: !!user,
    staleTime: 30_000,  // keep data fresh for 30s before background refetch
    queryFn: async () => {
      const { data, error } = await supabase
        .from("accounts")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });
};

// ─── Realtime ─────────────────────────────────────────────────

export const useRealtimeAccounts = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const userId = user?.id;
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`realtime:accounts:${userId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "accounts", filter: `user_id=eq.${userId}` },
        () => qc.invalidateQueries({ queryKey: keys.accounts(userId) }))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId, qc]);
};

export const useRealtimeTransactions = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const userId = user?.id;
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`realtime:transactions:${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "transactions", filter: `user_id=eq.${userId}` },
        () => qc.invalidateQueries({ queryKey: keys.transactions(userId) }))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId, qc]);
};

// ─── Transactions ─────────────────────────────────────────────

export const useTransactions = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: keys.transactions(user?.id ?? ""),
    enabled: !!user,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
};

// ─── Internal Transfer (between own accounts) ─────────────────

interface InternalTransferArgs {
  fromAccountId: string;
  toAccountId:   string;
  amount:        number;
  note?:         string;
}

interface TransferResult {
  ok:         boolean;
  error?:     string;
  pending?:   boolean;
  reference?: string;
  message?:   string | null;
  debit_id?:  string;
  credit_id?: string;
  from_name?: string;
  to_name?:   string;
  amount?:    number;
}

interface InternalTransferArgs {
  fromAccountId: string;
  toAccountId:   string;
  amount:        number;
  note?:         string;
  otpCode?:      string;
}

export const useTransfer = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ fromAccountId, toAccountId, amount, note, otpCode }: InternalTransferArgs) => {
      const { data, error } = await supabase.rpc("transfer_funds", {
        p_user_id: user!.id,
        p_from_id: fromAccountId,
        p_to_id:   toAccountId,
        p_amount:  amount,
        p_note:    note ?? null,
        p_otp_code: otpCode ?? null,
      });
      if (error) throw new Error(error.message);
      const result = data as TransferResult;
      if (!result.ok) throw new Error(result.error ?? "Transfer failed.");
      return result;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.accounts(user?.id ?? "") });
      qc.invalidateQueries({ queryKey: keys.transactions(user?.id ?? "") });
    },
  });
};

export const useCustomMessages = () => {
  return useQuery({
    queryKey: ["custom_messages"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("public_get_settings");
      if (error) throw new Error(error.message);
      return data as Array<{ key: string; value: string }>;
    },
  });
};

// ─── Deposit ──────────────────────────────────────────────────

interface DepositArgs {
  accountId: string;
  amount:    number;
  name?:     string;
  category?: string;
  note?:     string;
}

export const useDeposit = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ accountId, amount, name, category, note }: DepositArgs) => {
      const { data, error } = await supabase.rpc("deposit_funds", {
        p_user_id:    user!.id,
        p_account_id: accountId,
        p_amount:     amount,
        p_name:       name     ?? "Deposit",
        p_category:   category ?? "Income",
        p_note:       note     ?? null,
      });
      if (error) throw new Error(error.message);
      const result = data as { ok: boolean; error?: string };
      if (!result.ok) throw new Error(result.error ?? "Deposit failed.");
      return result;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.accounts(user?.id ?? "") });
      qc.invalidateQueries({ queryKey: keys.transactions(user?.id ?? "") });
    },
  });
};

// ─── Beneficiaries ────────────────────────────────────────────

export const useBeneficiaries = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: keys.beneficiaries(user?.id ?? ""),
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("beneficiaries")
        .select("*")
        .eq("user_id", user!.id)
        .order("full_name", { ascending: true });
      if (error) throw error;
      return data;
    },
  });
};

export const useAddBeneficiary = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (b: {
      full_name:      string;
      bank_name:      string;
      account_number: string;
      routing_number?: string;
      iban?:           string;
      swift_bic?:      string;
      email?:          string;
      nickname?:       string;
    }) => {
      const { data, error } = await supabase
        .from("beneficiaries")
        .insert({ ...b, user_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.beneficiaries(user?.id ?? "") }),
  });
};

export const useDeleteBeneficiary = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("beneficiaries")
        .delete()
        .eq("id", id)
        .eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.beneficiaries(user?.id ?? "") }),
  });
};

// ─── External Transfer ────────────────────────────────────────

interface ExternalTransferArgs {
  accountId:        string;
  beneficiaryId?:   string;
  beneficiaryName:  string;
  bankName:         string;
  accountNumber:    string;
  amount:           number;
  note?:            string;
  saveBeneficiary?: boolean;
  swiftBic?:        string;
  iban?:            string;
  otpCode?:         string;
}

interface ExternalTransferResult {
  ok:              boolean;
  error?:          string;
  pending?:        boolean;
  message?:        string | null;
  transfer_id?:    string;
  tx_id?:          string;
  reference?:      string;
  beneficiary_id?: string;
  amount?:         number;
  fee?:            number;
}

export const useSendExternalTransfer = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: ExternalTransferArgs) => {
      const { data, error } = await supabase.rpc("send_external_transfer", {
        p_user_id:          user!.id,
        p_account_id:       args.accountId,
        p_beneficiary_id:   args.beneficiaryId   ?? null,
        p_beneficiary_name: args.beneficiaryName,
        p_bank_name:        args.bankName,
        p_account_number:   args.accountNumber,
        p_amount:           args.amount,
        p_note:             args.note             ?? null,
        p_save_beneficiary: args.saveBeneficiary  ?? false,
        p_swift_bic:        args.swiftBic         ?? null,
        p_iban:             args.iban             ?? null,
        p_otp_code:         args.otpCode          ?? null,
      });
      if (error) throw new Error(error.message);
      const result = data as ExternalTransferResult;
      if (!result.ok) throw new Error(result.error ?? "Transfer failed.");
      return result;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.accounts(user?.id ?? "") });
      qc.invalidateQueries({ queryKey: keys.transactions(user?.id ?? "") });
      qc.invalidateQueries({ queryKey: keys.beneficiaries(user?.id ?? "") });
      qc.invalidateQueries({ queryKey: keys.externalTransfers(user?.id ?? "") });
    },
  });
};

export const useExternalTransfers = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: keys.externalTransfers(user?.id ?? ""),
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("external_transfers")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
};

// ─── Cards ────────────────────────────────────────────────────

export const useCards = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: keys.cards(user?.id ?? ""),
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cards")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });
};

export const useToggleCardFreeze = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, frozen }: { id: string; frozen: boolean }) => {
      const { error } = await supabase.from("cards").update({ frozen }).eq("id", id).eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.cards(user?.id ?? "") }),
  });
};

// ─── Savings Goals ────────────────────────────────────────────

export const useSavingsGoals = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: keys.savingsGoals(user?.id ?? ""),
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("savings_goals")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });
};

export const useInsertSavingsGoal = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (goal: { name: string; target: number }) => {
      const { data, error } = await supabase
        .from("savings_goals")
        .insert({ ...goal, user_id: user!.id, current: 0 })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.savingsGoals(user?.id ?? "") }),
  });
};

export const useDeleteSavingsGoal = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("savings_goals").delete().eq("id", id).eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.savingsGoals(user?.id ?? "") }),
  });
};

// ─── Investments ──────────────────────────────────────────────

export const useInvestments = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: keys.investments(user?.id ?? ""),
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("investments")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });
};

// ─── Profile ──────────────────────────────────────────────────

export const useUpdateProfile = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (updates: { full_name?: string }) => {
      const { error } = await supabase.from("profiles").update(updates).eq("id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.profile(user?.id ?? "") }),
  });
};

// Submits a user-initiated profile edit. The RPC writes the changes and flips
// approval_status back to 'pending' — an admin must re-approve before the
// account regains full dashboard access.
export const useSubmitProfileUpdate = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (updates: {
      full_name: string;
      avatar_url?: string | null;
      profile_data: Record<string, unknown>;
    }) => {
      const { data, error } = await supabase.rpc("submit_profile_update", {
        p_full_name:    updates.full_name,
        p_profile_data: updates.profile_data,
        p_avatar_url:   updates.avatar_url ?? null,
      });
      if (error) throw new Error(error.message);
      const r = data as { ok: boolean; error?: string };
      if (!r.ok) throw new Error(r.error ?? "Failed to submit profile update");
      return r;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.profile(user?.id ?? "") }),
  });
};

export const useUpdatePassword = () => {
  return useMutation({
    mutationFn: async (newPassword: string) => {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
    },
  });
};
