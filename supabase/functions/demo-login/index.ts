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

    // Resolve the demo user id and ensure clinical demo data exists.
    // Patients are seeded by trigger on profile creation; for accounts created
    // BEFORE that trigger existed (or that are missing data) we seed manually.
    let demoUserId = existingId;
    if (!demoUserId) {
      let p = 1;
      while (p <= 5 && !demoUserId) {
        const { data } = await admin.auth.admin.listUsers({ page: p, perPage: 200 });
        const found = data?.users.find((u) => u.email?.toLowerCase() === DEMO_EMAIL);
        if (found) demoUserId = found.id;
        if (!data?.users.length || data.users.length < 200) break;
        p++;
      }
    }

    if (demoUserId) {
      // Ensure profile exists (some legacy users may lack one, which would skip the trigger seed)
      const { data: prof } = await admin
        .from("profiles")
        .select("user_id")
        .eq("user_id", demoUserId)
        .maybeSingle();
      if (!prof) {
        await admin.from("profiles").insert({
          user_id: demoUserId,
          first_name: "Cuenta",
          last_name: "Demo",
          role: "enfermero",
          institution: "CuraTrack Demo",
          license: "DEMO-0001",
        });
      }

      // Ensure 6 demo patients exist
      const { count: patientCount } = await admin
        .from("patients")
        .select("*", { count: "exact", head: true })
        .eq("user_id", demoUserId);
      if (!patientCount || patientCount < 6) {
        const today = new Date();
        const ago = (d: number) => new Date(today.getTime() - d * 86400000).toISOString().slice(0, 10);
        const seedPatients = [
          { first_name: "Juan Carlos", last_name: "Pérez", age: 72, gender: "Masculino", dni: "12.345.678", phone: "+54 11 4567-8901", email: "jc.perez@email.com", address: "Av. Corrientes 1234, CABA", diagnosis: "Diabetes mellitus tipo 2 con complicaciones vasculares. HTA. Movilidad reducida tras ACV isquémico (2023).", assigned_professional: "Lic. María González", observations: "Paciente con buena adherencia. Vive con su esposa. Riesgo alto de UPP.", admission_date: ago(90), control_interval_days: 3 },
          { first_name: "Marta", last_name: "Vázquez", age: 65, gender: "Femenino", dni: "18.765.432", phone: "+54 11 5678-1234", email: "marta.vazquez@email.com", address: "Calle Florida 567, CABA", diagnosis: "Insuficiencia venosa crónica bilateral grado C5 (CEAP). Obesidad. Várices tronculares.", assigned_professional: "Lic. Ana Martínez", observations: "Paciente ambulatoria. Buena adherencia al tratamiento compresivo.", admission_date: ago(120), control_interval_days: 7 },
          { first_name: "Ricardo", last_name: "López", age: 45, gender: "Masculino", dni: "24.567.890", phone: "+54 11 3456-7890", email: "ricardo.lopez@email.com", address: "Av. Rivadavia 8901, CABA", diagnosis: "Post-operatorio de cirugía abdominal compleja. Tabaquismo activo. Sobrepeso.", assigned_professional: "Dr. Roberto Sánchez", observations: "Dehiscencia parcial de herida quirúrgica. Deshabituación tabáquica en curso.", admission_date: ago(45), control_interval_days: 5 },
          { first_name: "Lucía", last_name: "Fernández", age: 58, gender: "Femenino", dni: "20.123.456", phone: "+54 11 6789-2345", email: "lucia.fernandez@email.com", address: "Av. Santa Fe 2345, CABA", diagnosis: "Pie diabético con neuropatía periférica severa. DBT2 mal controlada.", assigned_professional: "Dr. Carlos Rodríguez", observations: "Riesgo de amputación. Educación intensiva sobre cuidado de pies.", admission_date: ago(60), control_interval_days: 3 },
          { first_name: "Roberto", last_name: "Méndez", age: 70, gender: "Masculino", dni: "10.987.654", phone: "+54 11 7890-3456", email: "roberto.mendez@email.com", address: "Av. Cabildo 4567, CABA", diagnosis: "Lesión por presión en talón izquierdo. Inmovilidad por fractura de cadera.", assigned_professional: "Lic. María González", observations: "En domicilio con cuidador. Colchón antiescaras.", admission_date: ago(30), control_interval_days: 4 },
          { first_name: "Patricia", last_name: "Gómez", age: 52, gender: "Femenino", dni: "22.345.678", phone: "+54 11 8901-4567", email: "patricia.gomez@email.com", address: "Av. Las Heras 3456, CABA", diagnosis: "Quemadura de segundo grado en antebrazo derecho. Accidente doméstico.", assigned_professional: "Lic. Ana Martínez", observations: "Buena evolución. Cuidados domiciliarios.", admission_date: ago(20), control_interval_days: 7 },
        ].map((row) => ({ ...row, user_id: demoUserId }));

        // Upsert by (user_id, first_name, last_name) — insert any missing
        for (const row of seedPatients) {
          const { data: existing } = await admin
            .from("patients")
            .select("id")
            .eq("user_id", demoUserId)
            .eq("first_name", row.first_name)
            .eq("last_name", row.last_name)
            .maybeSingle();
          if (!existing) {
            await admin.from("patients").insert(row);
          }
        }
      }

      // Seed clinical data (idempotent inside the SQL function)
      await admin.rpc("seed_demo_clinical_for_user", { _user_id: demoUserId });
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
