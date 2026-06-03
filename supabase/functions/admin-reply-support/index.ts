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
    const { request_id, message } = await req.json();

    if (!request_id || !message?.trim()) {
      return new Response(
        JSON.stringify({ error: "Support thread and message are required" }),
        { status: 400, headers: corsHeaders }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: corsHeaders }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: corsHeaders }
      );
    }

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      }
    );

    const { data: isAdmin, error: adminError } = await supabaseUser.rpc("is_admin");

    if (adminError || !isAdmin) {
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: corsHeaders }
      );
    }

    const { data: adminProfile } = await supabaseAdmin
      .from("profiles")
      .select("email")
      .eq("id", user.id)
      .single();

    const { data: supportRequest, error: requestError } = await supabaseAdmin
      .from("support_requests")
      .select("id, email, subject, support_pin")
      .eq("id", request_id)
      .single();

    if (requestError || !supportRequest) {
      return new Response(
        JSON.stringify({ error: "Support thread not found" }),
        { status: 404, headers: corsHeaders }
      );
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const fromEmail = Deno.env.get("SUPPORT_FROM_EMAIL");

    if (!resendApiKey || !fromEmail) {
      return new Response(
        JSON.stringify({ error: "Missing RESEND_API_KEY or SUPPORT_FROM_EMAIL" }),
        { status: 500, headers: corsHeaders }
      );
    }

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: supportRequest.email,
        subject: `Re: ${supportRequest.subject}`,
        text: [
          message.trim(),
          "",
          `Support PIN: ${supportRequest.support_pin}`,
          "Reply to this email to continue the conversation.",
        ].join("\n"),
      }),
    });

    const emailResult = await emailResponse.json();
    if (!emailResponse.ok) {
      return new Response(
        JSON.stringify({ error: emailResult?.message ?? "Failed to send support reply" }),
        { status: 502, headers: corsHeaders }
      );
    }

    const { error: insertError } = await supabaseAdmin
      .from("support_messages")
      .insert({
        request_id,
        sender_type: "admin",
        sender_email: adminProfile?.email ?? user.email ?? null,
        body: message.trim(),
        resend_email_id: emailResult.id ?? null,
      });

    if (insertError) {
      return new Response(
        JSON.stringify({ error: insertError.message }),
        { status: 400, headers: corsHeaders }
      );
    }

    await supabaseAdmin
      .from("support_requests")
      .update({
        status: "open",
        last_message_at: new Date().toISOString(),
      })
      .eq("id", request_id);

    return new Response(
      JSON.stringify({ ok: true, email_id: emailResult.id ?? null }),
      { headers: corsHeaders }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: corsHeaders }
    );
  }
});
