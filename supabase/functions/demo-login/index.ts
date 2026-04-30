// Seeds (idempotently) a demo user with confirmed email and returns its credentials
// so the client can sign in immediately. Uses the service role key.
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEMO_EMAIL = "demo@curatrack.app";
const DEMO_PASSWORD = "DemoCuraTrack2026!";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Try to find existing demo user by listing (paginated)
    let existingId: string | null = null;
    let page = 1;
    while (page <= 5 && !existingId) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
      if (error) break;
      const found = data.users.find((u) => u.email?.toLowerCase() === DEMO_EMAIL);
      if (found) existingId = found.id;
      if (!data.users.length || data.users.length < 200) break;
      page++;
    }

    if (existingId) {
      // Ensure password and confirmed status are correct (in case of drift)
      await admin.auth.admin.updateUserById(existingId, {
        password: DEMO_PASSWORD,
        email_confirm: true,
      });
    } else {
      const { error: createErr } = await admin.auth.admin.createUser({
        email: DEMO_EMAIL,
        password: DEMO_PASSWORD,
        email_confirm: true,
        user_metadata: {
          first_name: "Cuenta",
          last_name: "Demo",
          role: "enfermero",
          institution: "CuraTrack Demo",
          license: "DEMO-0001",
        },
      });
      if (createErr) {
        return new Response(
          JSON.stringify({ ok: false, message: createErr.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    return new Response(
      JSON.stringify({ ok: true, email: DEMO_EMAIL, password: DEMO_PASSWORD }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, message: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
