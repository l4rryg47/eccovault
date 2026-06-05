import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { account_id } = await req.json();
    if (!account_id) {
      return new Response(JSON.stringify({ error: "account_id is required" }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    const { data: account, error: accountError } = await supabaseAdmin
      .from("accounts")
      .select("id, user_id")
      .eq("id", account_id)
      .eq("user_id", user.id)
      .single();

    if (accountError || !account) {
      return new Response(JSON.stringify({ error: "Account not found" }), {
        status: 404,
        headers: corsHeaders,
      });
    }

    await supabaseAdmin
      .from("transfer_otps")
      .update({ used: true })
      .eq("account_id", account_id)
      .eq("used", false);

    const code = String(Math.floor(Math.random() * 1_000_000)).padStart(6, "0");
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    const { error: insertError } = await supabaseAdmin
      .from("transfer_otps")
      .insert({ user_id: user.id, account_id, code, expires_at: expiresAt, used: false });

    if (insertError) {
      return new Response(JSON.stringify({ error: "Failed to generate OTP" }), {
        status: 500,
        headers: corsHeaders,
      });
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const fromEmail = Deno.env.get("SUPPORT_FROM_EMAIL");

    if (resendApiKey && fromEmail && user.email) {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fromEmail,
          to: user.email,
          subject: "Your Transfer Verification Code",
          html: buildOtpEmail(code),
        }),
      });
    }

    return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});

function buildOtpEmail(code: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 16px">
<tr><td align="center">
<table width="100%" style="max-width:500px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.1)">
  <tr><td style="background:#1a1f71;padding:28px 32px;text-align:center">
    <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:700;letter-spacing:-.3px">EccoVault</h1>
  </td></tr>
  <tr><td style="padding:36px 32px">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr><td style="text-align:center;padding-bottom:20px">
        <div style="display:inline-block;width:56px;height:56px;background:#eff6ff;border-radius:50%;line-height:56px;font-size:26px;text-align:center">&#128274;</div>
      </td></tr>
      <tr><td style="text-align:center;padding-bottom:8px">
        <h2 style="margin:0;color:#111827;font-size:20px;font-weight:700">Transfer Verification Code</h2>
      </td></tr>
      <tr><td style="text-align:center;padding-bottom:24px">
        <p style="margin:0;color:#6b7280;font-size:14px">Use the code below to complete your transfer. It expires in <strong>10 minutes</strong>.</p>
      </td></tr>
      <tr><td style="text-align:center;padding-bottom:28px">
        <div style="display:inline-block;background:#f3f4f6;border-radius:10px;padding:18px 36px">
          <span style="font-family:monospace;font-size:36px;font-weight:700;letter-spacing:10px;color:#1a1f71">${code}</span>
        </div>
      </td></tr>
      <tr><td>
        <p style="margin:0;color:#6b7280;font-size:13px;line-height:1.7">
          If you did not initiate a transfer, please contact our support team immediately and do not share this code with anyone.
        </p>
      </td></tr>
    </table>
  </td></tr>
  <tr><td style="background:#f9fafb;padding:16px 32px;border-top:1px solid #e5e7eb;text-align:center">
    <p style="margin:0;color:#9ca3af;font-size:11px">This code expires in 10 minutes &mdash; do not reply to this email.</p>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}
