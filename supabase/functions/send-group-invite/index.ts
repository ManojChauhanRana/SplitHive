import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const isAlreadyRegisteredInviteError = (message: string | undefined) => {
  const normalized = message?.toLowerCase() ?? "";
  return normalized.includes("already been registered") ||
    normalized.includes("user already registered") ||
    normalized.includes("already exists") ||
    normalized.includes("email exists") ||
    normalized.includes("email address is invalid") === false && normalized.includes("registered");
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
      throw new Error("Missing Supabase environment variables");
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callerClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    const {
      data: { user },
      error: authError,
    } = await callerClient.auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { groupId, email, fullName, redirectTo } = await req.json();

    if (!groupId || !email) {
      return new Response(JSON.stringify({ error: "groupId and email are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const normalizedEmail = String(email).trim().toLowerCase();
    const normalizedFullName = typeof fullName === "string" && fullName.trim().length > 0
      ? fullName.trim()
      : undefined;

    const { data: existingInvite } = await adminClient
      .from("group_invites")
      .select("id, status")
      .eq("group_id", groupId)
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (existingInvite?.status === "pending") {
      return new Response(JSON.stringify({ status: "already_invited" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: groupInviteError } = await adminClient
      .from("group_invites")
      .upsert(
        {
          group_id: groupId,
          email: normalizedEmail,
          invited_by: user.id,
          status: "pending",
        },
        {
          onConflict: "group_id,email",
        },
      );

    if (groupInviteError) {
      console.error("group_invites upsert failed", {
        message: groupInviteError.message,
        code: groupInviteError.code ?? null,
        email: normalizedEmail,
        groupId,
      });
      return new Response(
        JSON.stringify({
          error: groupInviteError.message,
          code: groupInviteError.code ?? null,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const { error: inviteEmailError } = await adminClient.auth.admin.inviteUserByEmail(
      normalizedEmail,
      {
        ...(redirectTo ? { redirectTo } : {}),
        ...(normalizedFullName ? { data: { full_name: normalizedFullName } } : {}),
      },
    );

    if (inviteEmailError && !isAlreadyRegisteredInviteError(inviteEmailError.message)) {
      console.error("inviteUserByEmail failed", {
        message: inviteEmailError.message,
        code: inviteEmailError.code ?? null,
        email: normalizedEmail,
        groupId,
      });
      return new Response(
        JSON.stringify({
          error: inviteEmailError.message,
          code: inviteEmailError.code ?? null,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // If a profile already exists for this email, add them to the group immediately.
    const { data: invitedProfile, error: invitedProfileError } = await adminClient
      .from("profiles")
      .select("id")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (invitedProfileError) {
      console.error("profiles lookup failed", {
        message: invitedProfileError.message,
        code: invitedProfileError.code ?? null,
        email: normalizedEmail,
        groupId,
      });
      return new Response(
        JSON.stringify({
          error: invitedProfileError.message,
          code: invitedProfileError.code ?? null,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (invitedProfile?.id) {
      const { error: memberInsertError } = await adminClient
        .from("group_members")
        .upsert(
          {
            group_id: groupId,
            user_id: invitedProfile.id,
          },
          {
            onConflict: "group_id,user_id",
          },
        );

      if (memberInsertError) {
        console.error("group_members upsert failed", {
          message: memberInsertError.message,
          code: memberInsertError.code ?? null,
          email: normalizedEmail,
          groupId,
        });
        return new Response(
          JSON.stringify({
            error: memberInsertError.message,
            code: memberInsertError.code ?? null,
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
    }

    return new Response(JSON.stringify({
      status: inviteEmailError ? "invited_existing_auth_user" : "invited",
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    console.error("send-group-invite unexpected error", error);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
