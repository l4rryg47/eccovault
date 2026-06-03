/**
 * useDeposits.ts — Crypto deposit hooks
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

// ─── Query keys ───────────────────────────────────────────────

export const depositKeys = {
  mine:  (uid: string) => ["crypto_deposits", "user",  uid] as const,
  admin: ()            => ["crypto_deposits", "admin"]      as const,
  isAdmin: (uid: string) => ["is_admin", uid]               as const,
};

// ─── Types ────────────────────────────────────────────────────

export type DepositStatus =
  | "pending" | "confirming" | "confirmed"
  | "credited" | "expired"  | "rejected";

export interface CryptoDeposit {
  id:               string;
  user_id:          string;
  account_id:       string;
  usd_amount:       number;
  payment_id:       string | null;
  payment_url:      string | null;
  crypto_currency:  string;
  crypto_amount:    number | null;
  crypto_address:   string | null;
  exchange_rate:    number | null;
  fee_usd:          number;
  status:           DepositStatus;
  tx_hash:          string | null;
  confirmations:    number;
  admin_note:       string | null;
  credited_at:      string | null;
  created_at:       string;
  expires_at:       string;
  updated_at:       string;
}

// ─── User: view own deposits ──────────────────────────────────

export const useCryptoDeposits = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: depositKeys.mine(user?.id ?? ""),
    enabled:  !!user,
    queryFn:  async () => {
      const { data, error } = await supabase
        .from("crypto_deposits")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as CryptoDeposit[];
    },
  });
};

// ─── Realtime: live deposit status updates ────────────────────

export const useRealtimeDeposits = () => {
  const { user } = useAuth();
  const qc = useQueryClient();

  const userId = user?.id;
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`realtime:deposits:${userId}`)
      .on("postgres_changes", {
        event:  "*",
        schema: "public",
        table:  "crypto_deposits",
        filter: `user_id=eq.${userId}`,
      }, () => {
        qc.invalidateQueries({ queryKey: depositKeys.mine(userId) });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId, qc]);
};

// ─── User: create a new deposit request ──────────────────────

interface CreateDepositArgs {
  accountId:  string;
  usdAmount:  number;
  currency?:  string;  // USDT | USDC | BTC — default USDT
}

export const useCreateDeposit = () => {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ accountId, usdAmount, currency = "USDT" }: CreateDepositArgs) => {

      // ─────────────────────────────────────────────────────
      // ⚙️ NEXAPAY SWAP
      // Replace this block with a real NexaPay API call.
      //
      // What you need to do:
      //   1. Call NexaPay's "create payment" endpoint
      //   2. Get back: payment_id, payment_url, crypto_address,
      //                crypto_amount, exchange_rate
      //   3. Pass those into the insert below
      //
      // Example (adjust to NexaPay's actual API):
      //
      // const response = await fetch("https://api.nexapay.one/v1/payments", {
      //   method: "POST",
      //   headers: {
      //     "Content-Type": "application/json",
      //     "Authorization": `Bearer ${import.meta.env.VITE_NEXAPAY_API_KEY}`,
      //   },
      //   body: JSON.stringify({
      //     amount:   usdAmount,
      //     currency: "USD",
      //     crypto:   currency,
      //     order_id: crypto.randomUUID(),   // your internal reference
      //     webhook_url: "https://YOUR_PROJECT.supabase.co/functions/v1/nexapay-webhook",
      //     success_url: `${window.location.origin}/dashboard/deposit-status`,
      //   }),
      // });
      // const nexapay = await response.json();
      //
      // const paymentId      = nexapay.id;
      // const paymentUrl     = nexapay.payment_url;
      // const cryptoAddress  = nexapay.address;
      // const cryptoAmount   = nexapay.crypto_amount;
      // const exchangeRate   = nexapay.rate;
      // ─────────────────────────────────────────────────────

      // MOCK values — remove when swapping in NexaPay
      const mockRef       = crypto.randomUUID().slice(0, 8).toUpperCase();
      const mockRate      = 1.0;   // 1 USDT ≈ $1
      const paymentId     = `MOCK-${mockRef}`;
      const paymentUrl    = null;  // NexaPay will return a real URL
      const cryptoAddress = "MOCK_ADDRESS_SWAP_WITH_NEXAPAY";
      const cryptoAmount  = usdAmount / mockRate;
      const exchangeRate  = mockRate;
      // ─────────────────────────────────────────────────────

      const { data, error } = await supabase
        .from("crypto_deposits")
        .insert({
          user_id:         user!.id,
          account_id:      accountId,
          usd_amount:      usdAmount,
          payment_id:      paymentId,
          payment_url:     paymentUrl,
          crypto_currency: currency,
          crypto_amount:   cryptoAmount,
          crypto_address:  cryptoAddress,
          exchange_rate:   exchangeRate,
          fee_usd:         0,
          status:          "pending",
        })
        .select()
        .single();

      if (error) throw error;
      return data as CryptoDeposit;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: depositKeys.mine(user?.id ?? "") });
    },
  });
};

// ─── Admin: check if current user is admin ───────────────────

export const useIsAdmin = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: depositKeys.isAdmin(user?.id ?? ""),
    enabled:  !!user,
    staleTime: 5 * 60_000,
    queryFn:  async () => {
      const { data, error } = await supabase.rpc("is_admin");
      if (error) throw error;
      return data as boolean;
    },
  });
};

// ─── Admin: fetch all deposits ────────────────────────────────

export const useAdminDeposits = (status?: DepositStatus) => {
  return useQuery({
    queryKey: [...depositKeys.admin(), status ?? "all"],
    queryFn:  async () => {
      const { data, error } = await supabase.rpc("admin_get_deposits", {
        p_status: status ?? null,
      });
      if (error) throw error;
      return data as CryptoDeposit[];
    },
  });
};

// ─── Admin: realtime updates on the admin queue ───────────────

export const useRealtimeAdminDeposits = () => {
  const qc = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel("realtime:deposits:admin")
      .on("postgres_changes", {
        event:  "*",
        schema: "public",
        table:  "crypto_deposits",
      }, () => {
        qc.invalidateQueries({ queryKey: depositKeys.admin() });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [qc]);
};

// ─── Admin: approve ───────────────────────────────────────────

export const useApproveDeposit = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ depositId, note }: { depositId: string; note?: string }) => {
      const { data, error } = await supabase.rpc("admin_approve_deposit", {
        p_deposit_id: depositId,
        p_note:       note ?? null,
      });
      if (error) throw new Error(error.message);
      const result = data as { ok: boolean; error?: string };
      if (!result.ok) throw new Error(result.error ?? "Approval failed.");
      return result;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: depositKeys.admin() });
    },
  });
};

// ─── Admin: reject ────────────────────────────────────────────

export const useRejectDeposit = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ depositId, note }: { depositId: string; note?: string }) => {
      const { data, error } = await supabase.rpc("admin_reject_deposit", {
        p_deposit_id: depositId,
        p_note:       note ?? null,
      });
      if (error) throw new Error(error.message);
      const result = data as { ok: boolean; error?: string };
      if (!result.ok) throw new Error(result.error ?? "Rejection failed.");
      return result;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: depositKeys.admin() });
    },
  });
};
