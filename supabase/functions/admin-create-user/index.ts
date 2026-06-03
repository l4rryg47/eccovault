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
    const {
      email,
      full_name,
      password,
      phone,
      date_of_birth,
      address_line_1,
      address_line_2,
      city,
      state,
      postal_code,
      country,
    } = await req.json();

    if (!email || !password || !full_name) {
      return new Response(
        JSON.stringify({ error: "Full name, email, and password are required" }),
        { status: 400, headers: corsHeaders }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify requester is admin
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: corsHeaders }
      );
    }

    const { data: userProfile } = await supabaseAdmin
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (!user.user_metadata?.is_admin && !userProfile?.is_admin) {
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: corsHeaders }
      );
    }

    // Create user with confirmed email
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      user_metadata: { full_name },
      email_confirm: true,
    });

    if (createError) {
      return new Response(
        JSON.stringify({ error: createError.message }),
        { status: 400, headers: corsHeaders }
      );
    }

    const profileData = {
      phone:          phone || null,
      date_of_birth:  date_of_birth || null,
      address_line_1: address_line_1 || null,
      address_line_2: address_line_2 || null,
      city:           city || null,
      state:          state || null,
      postal_code:    postal_code || null,
      country:        country || null,
    };

    // The auth trigger auto-creates a bare profile row on user creation.
    // UPDATE that row rather than upsert — upsert can race with the trigger
    // and fail with a duplicate-key error when RLS blocks the conflict check.
    const profilePayload = {
      email,
      full_name:       full_name || null,
      profile_data:    profileData,
      approval_status: "approved",
    };

    const { error: updateError, count } = await supabaseAdmin
      .from("profiles")
      .update(profilePayload)
      .eq("id", newUser.user.id)
      .select("id", { count: "exact", head: true });

    // If no row was updated the trigger didn't fire — insert instead.
    const profileError = updateError ?? (count === 0
      ? (await supabaseAdmin.from("profiles").insert({ id: newUser.user.id, ...profilePayload })).error
      : null);

    if (profileError) {
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
      return new Response(
        JSON.stringify({ error: "Failed to create user profile: " + profileError.message }),
        { status: 400, headers: corsHeaders }
      );
    }

    return new Response(
      JSON.stringify({ ok: true, user_id: newUser.user.id }),
      { headers: corsHeaders }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: corsHeaders }
    );
  }
});
