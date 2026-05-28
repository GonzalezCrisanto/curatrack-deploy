// Provisions a demo admin/sponsor account with a freshly rotated password
// and returns a server-issued session. The password is never returned to
// the client, eliminating the unauthenticated credential-disclosure risk.
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEFAULT_SPONSOR_SLUG = "demo";
const SPONSOR_DEMO_EMAILS: Record<string, string> = {
  convatec: "sponsor-convatec@curatrack.app",
  bbraun: "sponsor-bbraun@curatrack.app",
  demo: "sponsor-demo@curatrack.app",
};

function randomPassword() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return "Ax-" + Array.from(bytes, (b) => b.toString(36)).join("") + "!9";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let sponsorSlug = DEFAULT_SPONSOR_SLUG;
    try {
      const body = await req.json();
      if (typeof body?.sponsor_slug === "string" && body.sponsor_slug.trim()) {
        sponsorSlug = body.sponsor_slug.trim().toLowerCase();
      }
    } catch {
      // Optional body; keep default.
    }
    const DEMO_ADMIN_EMAIL = SPONSOR_DEMO_EMAILS[sponsorSlug] ?? SPONSOR_DEMO_EMAILS.demo;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const password = randomPassword();

    // Find or create the demo admin user
    let existingId: string | null = null;
    let page = 1;
    while (page <= 5 && !existingId) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
      if (error) break;
      const found = data.users.find((u) => u.email?.toLowerCase() === DEMO_ADMIN_EMAIL);
      if (found) existingId = found.id;
      if (!data.users.length || data.users.length < 200) break;
      page++;
    }

    if (existingId) {
      await admin.auth.admin.updateUserById(existingId, {
        password,
        email_confirm: true,
      });
    } else {
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email: DEMO_ADMIN_EMAIL,
        password,
        email_confirm: true,
        user_metadata: {
          first_name: "Sponsor",
          last_name: "Demo",
          role: "admin",
          institution: "CuraTrack Sponsor",
          license: "SPONSOR-0001",
        },
      });
      if (createErr) {
        return new Response(
          JSON.stringify({ ok: false, message: createErr.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      existingId = created.user?.id ?? null;
    }

    if (existingId) {
      const { data: prof } = await admin
        .from("profiles")
        .select("user_id")
        .eq("user_id", existingId)
        .maybeSingle();
      if (!prof) {
        await admin.from("profiles").insert({
          user_id: existingId,
          first_name: "Sponsor",
          last_name: "Demo",
          role: "admin",
          institution: "CuraTrack Sponsor",
          license: "SPONSOR-0001",
        });
      } else {
        await admin
          .from("profiles")
          .update({ role: "admin", institution: "CuraTrack Sponsor" })
          .eq("user_id", existingId);
      }

      // Demo laboratorio must be sponsor-only (single source of truth for ACL).
      await admin
        .from("user_roles")
        .delete()
        .eq("user_id", existingId);
      await admin.from("user_roles").insert({
        user_id: existingId,
        role: "sponsor",
      });

      const { data: targetSponsor } = await admin
        .from("sponsors")
        .select("id, lab_id, sponsor_name")
        .eq("slug", sponsorSlug)
        .maybeSingle();
      if (targetSponsor?.id) {
        await admin
          .from("user_sponsor")
          .upsert(
            { user_id: existingId, sponsor_id: targetSponsor.id },
            { onConflict: "user_id" },
          );
        if (targetSponsor.lab_id) {
          await admin
            .from("user_lab_sponsors")
            .update({ is_active: false })
            .eq("user_id", existingId);
          await admin
            .from("user_lab_sponsors")
            .upsert(
              { user_id: existingId, lab_id: targetSponsor.lab_id, is_active: true },
              { onConflict: "user_id,lab_id" },
            );
        }
        await admin
          .from("profiles")
          .update({ institution: targetSponsor.sponsor_name ?? "CuraTrack Sponsor" })
          .eq("user_id", existingId);
      }
    }

    // Sign in server-side and return only session tokens.
    const anon = createClient(supabaseUrl, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: signIn, error: signErr } = await anon.auth.signInWithPassword({
      email: DEMO_ADMIN_EMAIL,
      password,
    });
    if (signErr || !signIn.session) {
      return new Response(
        JSON.stringify({ ok: false, message: signErr?.message ?? "No se pudo iniciar la sesión demo" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        ok: true,
        access_token: signIn.session.access_token,
        refresh_token: signIn.session.refresh_token,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, message: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
