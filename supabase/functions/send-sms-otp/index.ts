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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    const { phone } = await req.json();
    if (!phone || typeof phone !== "string") {
      return new Response(JSON.stringify({ error: "Phone number is required" }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    const apiKey = Deno.env.get("TEXTBELT_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Textbelt API key is not configured" }), {
        status: 500,
        headers: corsHeaders,
      });
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const textRes = await fetch("https://textbelt.com/text", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone,
        message: `Your Eccovault verification code is: ${code}. Do not share it with anyone.`,
        key: apiKey,
      }),
    });

    const textData = await textRes.json();
    if (!textRes.ok || !textData.success) {
      console.error("Textbelt error:", textData);
      return new Response(JSON.stringify({ error: textData.error || "Failed to send SMS." }), {
        status: 500,
        headers: corsHeaders,
      });
    }

    const { error: storeError } = await supabase.rpc("store_phone_otp", {
      p_phone: phone,
      p_code: code,
    });

    if (storeError) {
      console.error("store_phone_otp error:", storeError);
      return new Response(JSON.stringify({ error: "Failed to store OTP" }), {
        status: 500,
        headers: corsHeaders,
      });
    }

    return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
  } catch (err) {
    console.error("send-sms-otp error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});

