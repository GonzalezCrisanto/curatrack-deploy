// Deletes a Supabase Auth user (and cascade-deletes their public schema rows).
// Only callable by authenticated admin users.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("authorization");
    if (!authHeader) throw new Error("No authorization header");

    // Verify caller identity from their JWT
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { authorization: authHeader } },
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) throw new Error("Not authenticated");

    // Verify caller is admin via user_roles (service client bypasses RLS)
    const adminClient = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: roleRows } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id);
    const roles = (roleRows ?? []).map((r: any) => r.role as string);
    if (!roles.includes("admin")) {
      throw new Error("Forbidden: admin role required");
    }

    const body = await req.json();
    const targetId: string | undefined = body?.user_id;
    if (!targetId) throw new Error("user_id is required");
    if (targetId === caller.id) throw new Error("No podés eliminar tu propia cuenta");

    const { error } = await adminClient.auth.admin.deleteUser(targetId);
    if (error) throw new Error(error.message);

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, message: (err as Error).message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
