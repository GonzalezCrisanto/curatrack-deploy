// Seeds (idempotently) a demo user with a freshly rotated password and
// returns a server-issued session so the client can authenticate without
// the password ever being exposed in the response body.
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEMO_EMAIL = "demo@curatrack.app";
const DEFAULT_SPONSOR_SLUG = "demo";

function randomPassword() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return "Dx-" + Array.from(bytes, (b) => b.toString(36)).join("") + "!9";
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

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const password = randomPassword();

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
      await admin.auth.admin.updateUserById(existingId, {
        password,
        email_confirm: true,
      });
    } else {
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email: DEMO_EMAIL,
        password,
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
          first_name: "Cuenta",
          last_name: "Demo",
          role: "enfermero",
          institution: "CuraTrack Demo",
          license: "DEMO-0001",
        });
      }

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
          .update({ institution: targetSponsor.sponsor_name ?? "CuraTrack Demo" })
          .eq("user_id", existingId);
      }

      const { data: profRole } = await admin
        .from("user_roles")
        .select("id")
        .eq("user_id", existingId)
        .eq("role", "professional")
        .maybeSingle();
      if (!profRole) {
        await admin.from("user_roles").insert({ user_id: existingId, role: "professional" });
      }

      const { count: patientCount } = await admin
        .from("patients")
        .select("*", { count: "exact", head: true })
        .eq("user_id", existingId);
      if (!patientCount || patientCount < 10) {
        const today = new Date();
        const ago = (d: number) => new Date(today.getTime() - d * 86400000).toISOString().slice(0, 10);
        const seedPatients = [
          { first_name: "Juan Carlos", last_name: "Pérez", age: 72, gender: "Masculino", dni: "12.345.678", phone: "+54 11 4567-8901", email: "jc.perez@email.com", address: "Av. Corrientes 1234, CABA", diagnosis: "Diabetes mellitus tipo 2 con complicaciones vasculares. HTA. Movilidad reducida tras ACV isquémico (2023).", assigned_professional: "Lic. María González", observations: "Paciente con buena adherencia. Vive con su esposa. Riesgo alto de UPP.", admission_date: ago(90), control_interval_days: 3 },
          { first_name: "Marta", last_name: "Vázquez", age: 65, gender: "Femenino", dni: "18.765.432", phone: "+54 11 5678-1234", email: "marta.vazquez@email.com", address: "Calle Florida 567, CABA", diagnosis: "Insuficiencia venosa crónica bilateral grado C5 (CEAP). Obesidad. Várices tronculares.", assigned_professional: "Lic. Ana Martínez", observations: "Paciente ambulatoria. Buena adherencia al tratamiento compresivo.", admission_date: ago(120), control_interval_days: 7 },
          { first_name: "Ricardo", last_name: "López", age: 45, gender: "Masculino", dni: "24.567.890", phone: "+54 11 3456-7890", email: "ricardo.lopez@email.com", address: "Av. Rivadavia 8901, CABA", diagnosis: "Post-operatorio de cirugía abdominal compleja. Tabaquismo activo. Sobrepeso.", assigned_professional: "Dr. Roberto Sánchez", observations: "Dehiscencia parcial de herida quirúrgica. Deshabituación tabáquica en curso.", admission_date: ago(45), control_interval_days: 5 },
          { first_name: "Lucía", last_name: "Fernández", age: 58, gender: "Femenino", dni: "20.123.456", phone: "+54 11 6789-2345", email: "lucia.fernandez@email.com", address: "Av. Santa Fe 2345, CABA", diagnosis: "Pie diabético con neuropatía periférica severa. DBT2 mal controlada.", assigned_professional: "Dr. Carlos Rodríguez", observations: "Riesgo de amputación. Educación intensiva sobre cuidado de pies.", admission_date: ago(60), control_interval_days: 3 },
          { first_name: "Roberto", last_name: "Méndez", age: 70, gender: "Masculino", dni: "10.987.654", phone: "+54 11 7890-3456", email: "roberto.mendez@email.com", address: "Av. Cabildo 4567, CABA", diagnosis: "Lesión por presión en talón izquierdo. Inmovilidad por fractura de cadera.", assigned_professional: "Lic. María González", observations: "En domicilio con cuidador. Colchón antiescaras.", admission_date: ago(30), control_interval_days: 4 },
          { first_name: "Patricia", last_name: "Gómez", age: 52, gender: "Femenino", dni: "22.345.678", phone: "+54 11 8901-4567", email: "patricia.gomez@email.com", address: "Av. Las Heras 3456, CABA", diagnosis: "Quemadura de segundo grado en antebrazo derecho. Accidente doméstico.", assigned_professional: "Lic. Ana Martínez", observations: "Buena evolución. Cuidados domiciliarios.", admission_date: ago(20), control_interval_days: 7 },
          { first_name: "Silvia", last_name: "Acosta", age: 67, gender: "Femenino", dni: "16.778.901", phone: "+54 11 4788-3321", email: "silvia.acosta@email.com", address: "Belgrano 1550, CABA", diagnosis: "Insuficiencia arterial periférica en seguimiento.", assigned_professional: "Lic. Laura Fernández", observations: "Control ambulatorio mensual.", admission_date: ago(18), control_interval_days: 10 },
          { first_name: "Gabriel", last_name: "Suárez", age: 49, gender: "Masculino", dni: "26.554.219", phone: "+54 11 4366-8812", email: "gabriel.suarez@email.com", address: "Boedo 944, CABA", diagnosis: "Herida traumática en evolución favorable.", assigned_professional: "Dr. Roberto Sánchez", observations: "Cumple indicaciones domiciliarias.", admission_date: ago(26), control_interval_days: 6 },
          { first_name: "Nora", last_name: "Benítez", age: 74, gender: "Femenino", dni: "11.908.445", phone: "+54 11 4992-7301", email: "nora.benitez@email.com", address: "San Cristóbal 220, CABA", diagnosis: "Paciente frágil con riesgo de UPP.", assigned_professional: "Lic. María González", observations: "Seguimiento preventivo.", admission_date: ago(34), control_interval_days: 5 },
          { first_name: "Eduardo", last_name: "Paredes", age: 61, gender: "Masculino", dni: "14.772.630", phone: "+54 11 4123-1004", email: "eduardo.paredes@email.com", address: "Parque Chacabuco 842, CABA", diagnosis: "Postquirúrgico sin complicaciones activas.", assigned_professional: "Dr. Carlos Rodríguez", observations: "Controles periódicos.", admission_date: ago(12), control_interval_days: 8 },
        ].map((row) => ({ ...row, user_id: existingId }));

        for (const row of seedPatients) {
          const { data: existing } = await admin
            .from("patients")
            .select("id")
            .eq("user_id", existingId)
            .eq("first_name", row.first_name)
            .eq("last_name", row.last_name)
            .maybeSingle();
          if (!existing) {
            await admin.from("patients").insert(row);
          }
        }
      }

      await admin.rpc("seed_demo_clinical_for_user", { _user_id: existingId });
    }

    // Sign in server-side using the freshly rotated password and return only
    // session tokens. The password is never exposed to the client.
    const anon = createClient(supabaseUrl, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: signIn, error: signErr } = await anon.auth.signInWithPassword({
      email: DEMO_EMAIL,
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
