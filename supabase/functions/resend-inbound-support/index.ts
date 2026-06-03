import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, svix-id, svix-timestamp, svix-signature",
};

const extractEmail = (value?: string | null) => {
  if (!value) return null;
  const match = value.match(/<([^>]+)>/);
  return (match?.[1] ?? value).trim().toLowerCase();
};

const normalizeBody = (body?: string | null) => {
  if (!body) return "";
  const replyHeaderIndex = body.search(/\nOn .+wrote:\n/i);
  const forwardedIndex = body.search(/\n-{2,}\s*Forwarded message\s*-{2,}/i);
  const signatureIndex = body.search(/\n--\s*\n/);
  const cutPoints = [replyHeaderIndex, forwardedIndex, signatureIndex].filter((index) => index >= 0);
  const end = cutPoints.length ? Math.min(...cutPoints) : body.length;
  return body.slice(0, end).trim();
};

const getEventEmailId = (payload: { data?: { email_id?: string; id?: string }; email_id?: string; id?: string }) =>
  payload?.data?.email_id ??
  payload?.data?.id ??
  payload?.email_id ??
  payload?.id ??
  null;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    const emailId = getEventEmailId(payload);

    if (!emailId) {
      return new Response(
        JSON.stringify({ error: "Missing Resend received email id" }),
        { status: 400, headers: corsHeaders }
      );
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      return new Response(
        JSON.stringify({ error: "Missing RESEND_API_KEY" }),
        { status: 500, headers: corsHeaders }
      );
    }

    const emailResponse = await fetch(`https://api.resend.com/emails/${emailId}`, {
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
      },
    });

    const email = await emailResponse.json();
    if (!emailResponse.ok) {
      return new Response(
        JSON.stringify({ error: email?.message ?? "Failed to fetch inbound email from Resend" }),
        { status: 502, headers: corsHeaders }
      );
    }

    const fromEmail = extractEmail(email.from);
    const textBody = normalizeBody(email.text ?? email.text_body ?? email.html ?? "");
    const pinOnly = textBody.match(/^\s*(\d{4})\s*$/)?.[1] ?? null;

    if (!fromEmail || !textBody) {
      return new Response(
        JSON.stringify({ error: "Inbound email is missing sender or body" }),
        { status: 400, headers: corsHeaders }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    let supportRequest: { id: string; status: string } | null = null;

    if (pinOnly) {
      const { data, error } = await supabaseAdmin
        .from("support_requests")
        .select("id, status")
        .eq("email", fromEmail)
        .eq("support_pin", pinOnly)
        .gt("pin_expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      supportRequest = data;

      if (supportRequest) {
        await supabaseAdmin
          .from("support_requests")
          .update({
            status: "open",
            opened_at: new Date().toISOString(),
            last_message_at: new Date().toISOString(),
          })
          .eq("id", supportRequest.id);

        await supabaseAdmin
          .from("support_messages")
          .insert({
            request_id: supportRequest.id,
            sender_type: "system",
            sender_email: fromEmail,
            body: `Support thread opened with PIN ${pinOnly}.`,
            resend_email_id: emailId,
          });
      }
    } else {
      const { data, error } = await supabaseAdmin
        .from("support_requests")
        .select("id, status")
        .eq("email", fromEmail)
        .in("status", ["open", "pending_admin"])
        .order("last_message_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      supportRequest = data;

      if (supportRequest) {
        await supabaseAdmin
          .from("support_messages")
          .insert({
            request_id: supportRequest.id,
            sender_type: "user",
            sender_email: fromEmail,
            body: textBody,
            resend_email_id: emailId,
          });

        await supabaseAdmin
          .from("support_requests")
          .update({
            status: "pending_admin",
            last_message_at: new Date().toISOString(),
          })
          .eq("id", supportRequest.id);
      }
    }

    if (!supportRequest) {
      return new Response(
        JSON.stringify({ ok: true, ignored: true, reason: "No matching support thread" }),
        { headers: corsHeaders }
      );
    }

    return new Response(
      JSON.stringify({ ok: true, request_id: supportRequest.id }),
      { headers: corsHeaders }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: corsHeaders }
    );
  }
});
