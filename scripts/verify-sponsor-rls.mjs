import fs from 'node:fs';

function readEnvValue(content, key) {
  const line = content
    .split(/\r?\n/)
    .find((l) => l.startsWith(`${key}=`));
  if (!line) return null;
  return line.slice(key.length + 1).replace(/^"|"$/g, '');
}

async function main() {
  const env = fs.readFileSync('.env', 'utf8');
  const url = readEnvValue(env, 'VITE_SUPABASE_URL');
  const anon = readEnvValue(env, 'VITE_SUPABASE_PUBLISHABLE_KEY');
  if (!url || !anon) {
    throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY in .env');
  }

  const loginRes = await fetch(`${url}/functions/v1/demo-admin-login`, {
    method: 'POST',
    headers: {
      apikey: anon,
      authorization: `Bearer ${anon}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ sponsor_slug: 'demo' }),
  });

  const login = await loginRes.json();
  if (!login.ok || !login.access_token) {
    throw new Error(`demo-admin-login failed: ${JSON.stringify(login)}`);
  }

  const token = login.access_token;
  const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'));
  const uid = payload.sub;

  const rolesRes = await fetch(`${url}/rest/v1/user_roles?select=role&user_id=eq.${uid}`, {
    headers: { apikey: anon, authorization: `Bearer ${token}` },
  });
  const roles = await rolesRes.json();

  console.log(`uid=${uid}`);
  console.log(`roles=${roles.map((r) => r.role).join(',')}`);

  const tables = ['patients', 'wound_cases', 'evolutions', 'patient_consents', 'evolution_signatures'];
  for (const table of tables) {
    const res = await fetch(`${url}/rest/v1/${table}?select=id&limit=1`, {
      headers: { apikey: anon, authorization: `Bearer ${token}` },
    });
    const body = await res.text();
    console.log(`${table}: status=${res.status} body=${body.slice(0, 200)}`);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});

