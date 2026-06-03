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
    const { user_id, email, full_name } = await req.json();

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: "user_id required" }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Create admin client with service role key
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

    // Check if user is admin
    const { data: userProfile } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (!user.user_metadata?.is_admin && !userProfile?.is_admin) {
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: corsHeaders }
      );
    }

    // Check if target user exists
    const { data: targetUser } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("id", user_id)
      .single();

    if (!targetUser) {
      return new Response(
        JSON.stringify({ error: "User not found" }),
        { status: 404, headers: corsHeaders }
      );
    }

    // Update email if provided
    if (email) {
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user_id, {
        email,
      });
      if (updateError) {
        return new Response(
          JSON.stringify({ error: "Failed to update email: " + updateError.message }),
          { status: 400, headers: corsHeaders }
        );
      }
    }

    // Update profile
    const updateData: { email?: string; full_name?: string } = {};
    if (email) updateData.email = email;
    if (full_name !== undefined) updateData.full_name = full_name;

    if (Object.keys(updateData).length > 0) {
      const { error: profileError } = await supabaseAdmin
        .from("profiles")
        .update(updateData)
        .eq("id", user_id);

      if (profileError) {
        return new Response(
          JSON.stringify({ error: "Failed to update profile: " + profileError.message }),
          { status: 400, headers: corsHeaders }
        );
      }
    }

    return new Response(
      JSON.stringify({ ok: true, updated: true }),
      { headers: corsHeaders }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: corsHeaders }
    );
  }
});
