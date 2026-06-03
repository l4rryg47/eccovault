import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DECLINE_REASON =
  "This account has not been enabled for deposit. Contact support for more information or manual funding.";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { payment_id } = await req.json();
    if (!payment_id) {
      return new Response(JSON.stringify({ error: "payment_id is required" }), {
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

    const { data: payment, error: paymentError } = await supabaseAdmin
      .from("card_payments")
      .select("id, user_id, amount, card_type, card_last_four, cardholder_name")
      .eq("id", payment_id)
      .eq("user_id", user.id)
      .single();

    if (paymentError || !payment) {
      return new Response(JSON.stringify({ error: "Payment not found" }), {
        status: 404,
        headers: corsHeaders,
      });
    }

    await supabaseAdmin
      .from("card_payments")
      .update({
        status: "declined",
        admin_note: DECLINE_REASON,
        processed_at: new Date().toISOString(),
      })
      .eq("id", payment_id);

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const fromEmail = Deno.env.get("SUPPORT_FROM_EMAIL");
    const userEmail = user.email;

    if (resendApiKey && fromEmail && userEmail) {
      const amt = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(payment.amount);

      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fromEmail,
          to: userEmail,
          subject: "Card Transaction Declined",
          html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 16px">
<tr><td align="center">
<table width="100%" style="max-width:500px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.1)">
  <tr><td style="background:#1a1f71;padding:28px 32px;text-align:center">
    <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:700;letter-spacing:-.3px">Your Friendly Bank</h1>
  </td></tr>
  <tr><td style="padding:36px 32px">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr><td style="text-align:center;padding-bottom:20px">
        <div style="display:inline-block;width:56px;height:56px;background:#fef2f2;border-radius:50%;line-height:56px;font-size:26px;text-align:center">&#10060;</div>
      </td></tr>
      <tr><td style="text-align:center;padding-bottom:8px">
        <h2 style="margin:0;color:#111827;font-size:20px;font-weight:700">Card Transaction Declined</h2>
      </td></tr>
      <tr><td style="text-align:center;padding-bottom:28px">
        <p style="margin:0;color:#6b7280;font-size:14px">We were unable to process your card deposit.</p>
      </td></tr>
      <tr><td style="padding-bottom:16px">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:8px">
          <tr><td style="padding:16px 20px">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="color:#6b7280;font-size:13px;padding:5px 0;border-bottom:1px solid #e5e7eb">Amount</td>
                <td style="text-align:right;font-weight:600;font-size:13px;color:#111827;padding:5px 0;border-bottom:1px solid #e5e7eb">${amt}</td>
              </tr>
              <tr>
                <td style="color:#6b7280;font-size:13px;padding:5px 0;border-bottom:1px solid #e5e7eb">Card</td>
                <td style="text-align:right;font-size:13px;color:#111827;padding:5px 0;border-bottom:1px solid #e5e7eb">${payment.card_type.toUpperCase()} ****${payment.card_last_four}</td>
              </tr>
              <tr>
                <td style="color:#6b7280;font-size:13px;padding:5px 0">Status</td>
                <td style="text-align:right;font-weight:700;font-size:13px;color:#dc2626;padding:5px 0">Declined</td>
              </tr>
            </table>
          </td></tr>
        </table>
      </td></tr>
      <tr><td style="padding-bottom:28px">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#fffbeb;border:1px solid #fcd34d;border-radius:8px">
          <tr><td style="padding:14px 16px">
            <p style="margin:0;color:#92400e;font-size:13px;line-height:1.6"><strong>Reason:</strong> ${DECLINE_REASON}</p>
          </td></tr>
        </table>
      </td></tr>
      <tr><td>
        <p style="margin:0;color:#6b7280;font-size:13px;line-height:1.7">
          For assistance or alternative funding options, please contact our support team through the app.
        </p>
      </td></tr>
    </table>
  </td></tr>
  <tr><td style="background:#f9fafb;padding:16px 32px;border-top:1px solid #e5e7eb;text-align:center">
    <p style="margin:0;color:#9ca3af;font-size:11px">This is an automated notification &mdash; please do not reply to this email.</p>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`,
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
