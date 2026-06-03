import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const generatePin = () => String(Math.floor(1000 + Math.random() * 9000));

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { email, subject, message } = await req.json();

    if (!email?.trim() || !subject?.trim() || !message?.trim()) {
      return new Response(
        JSON.stringify({ error: "Email, subject, and message are required" }),
        { status: 400, headers: corsHeaders }
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

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    let userId: string | null = null;
    const authHeader = req.headers.get("Authorization");

    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabaseAdmin.auth.getUser(token);
      userId = user?.id ?? null;
    }

    const supportPin = generatePin();

    const { data: supportRequest, error: insertError } = await supabaseAdmin
      .from("support_requests")
      .insert({
        user_id: userId,
        email: email.trim(),
        subject: subject.trim(),
        initial_message: message.trim(),
        support_pin: supportPin,
        status: "pin_sent",
      })
      .select("id")
      .single();

    if (insertError) {
      return new Response(
        JSON.stringify({ error: insertError.message }),
        { status: 400, headers: corsHeaders }
      );
    }

    await supabaseAdmin
      .from("support_messages")
      .insert({
        request_id: supportRequest.id,
        sender_type: "user",
        sender_email: email.trim(),
        body: message.trim(),
      });

    const text = [
      `Your support PIN is ${supportPin}.`,
      "",
      "To open your support thread, reply to this message by typing only this PIN:",
      supportPin,
      "",
      "After the thread opens, our support team can respond directly.",
    ].join("\n");

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: email.trim(),
        subject: `Support PIN: ${subject.trim()}`,
        text,
      }),
    });

    const emailResult = await emailResponse.json();
    if (!emailResponse.ok) {
      return new Response(
        JSON.stringify({ error: emailResult?.message ?? "Failed to send support PIN" }),
        { status: 502, headers: corsHeaders }
      );
    }

    await supabaseAdmin
      .from("support_messages")
      .update({ resend_email_id: emailResult.id ?? null })
      .eq("request_id", supportRequest.id)
      .eq("sender_type", "user");

    const notifyEmail = Deno.env.get("SUPPORT_NOTIFY_EMAIL");
    if (notifyEmail) {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fromEmail,
          to: notifyEmail,
          subject: `New support request: ${subject.trim()}`,
          text: [
            `From: ${email.trim()}`,
            `Support PIN: ${supportPin}`,
            "",
            message.trim(),
          ].join("\n"),
        }),
      });
    }

    return new Response(
      JSON.stringify({ ok: true, support_pin: supportPin }),
      { headers: corsHeaders }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: corsHeaders }
    );
  }
});
