// Deletes the CALLER's own account and personal data.
// The user id always comes from the verified JWT, never from the request body.
// Every step is idempotent and the auth account is removed LAST, so a failed
// run can simply be retried by the same user.
import { createClient } from "npm:@supabase/supabase-js@2";

const ALLOWED_ORIGINS = [
  "https://anomayabeta.lovable.app",
  "https://id-preview--e2e69dec-0ed1-47cc-b36e-14ea0b61a40f.lovable.app",
  "http://localhost:8080",
];

function cors(origin: string | null) {
  const allowed = origin && (ALLOWED_ORIGINS.includes(origin) || /^https:\/\/[a-z0-9-]+--e2e69dec-0ed1-47cc-b36e-14ea0b61a40f\.lovable\.app$/.test(origin));
  return {
    "Access-Control-Allow-Origin": allowed ? origin! : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
}

const CONFIRM_WORD = "SUPPRIMER";

async function listAll(admin: any, bucket: string, prefix: string): Promise<string[]> {
  const out: string[] = [];
  const walk = async (dir: string) => {
    let offset = 0;
    while (true) {
      const { data, error } = await admin.storage.from(bucket).list(dir, { limit: 100, offset });
      if (error) throw new Error(`storage list ${bucket}: ${error.message}`);
      if (!data?.length) break;
      for (const f of data) {
        const p = `${dir}/${f.name}`;
        if (f.id === null) await walk(p); // folder
        else out.push(p);
      }
      if (data.length < 100) break;
      offset += 100;
    }
  };
  await walk(prefix);
  return out;
}

Deno.serve(async (req) => {
  const headers = { ...cors(req.headers.get("Origin")), "Content-Type": "application/json" };
  const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers });

  if (req.method === "OPTIONS") return new Response(null, { headers });
  if (req.method !== "POST") return reply(405, { error: "Méthode non autorisée" });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return reply(401, { error: "Non authentifié" });

  const url = Deno.env.get("SUPABASE_URL")!;
  const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  let uid: string | undefined;
  try {
    const { data: claims, error: claimsError } = await userClient.auth.getClaims(authHeader.slice(7));
    if (!claimsError) uid = claims?.claims?.sub;
  } catch { /* malformed token */ }
  if (!uid) return reply(401, { error: "Session invalide" });

  let body: any = {};
  try { body = await req.json(); } catch { /* empty */ }
  if (body?.confirm !== CONFIRM_WORD) return reply(400, { error: "Confirmation manquante" });

  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  try {
    // 1. Photos: keep any file still used by an animal now owned by someone else (transferred).
    const photoFiles = await listAll(admin, "animal-photos", uid);
    const { data: foreign } = await admin
      .from("animals").select("photo").neq("user_id", uid).like("photo", `%/animal-photos/${uid}/%`);
    const keep = new Set((foreign ?? []).map((a: any) => decodeURIComponent(String(a.photo).split("/animal-photos/")[1] ?? "").split("?")[0]));
    const toRemove = photoFiles.filter((p) => !keep.has(p));
    for (let i = 0; i < toRemove.length; i += 100) {
      const { error } = await admin.storage.from("animal-photos").remove(toRemove.slice(i, i + 100));
      if (error) throw new Error(`photos: ${error.message}`);
    }
    const shots = await listAll(admin, "bug-screenshots", uid);
    if (shots.length) {
      const { error } = await admin.storage.from("bug-screenshots").remove(shots);
      if (error) throw new Error(`screenshots: ${error.message}`);
    }

    // 1b. Photos of animals this user received by transfer live in the previous owner's folder.
    const { data: mine } = await admin.from("animals").select("photo").eq("user_id", uid).like("photo", "%/animal-photos/%");
    const toPath = (u: string) => decodeURIComponent(String(u).split("/animal-photos/")[1] ?? "").split("?")[0];
    const foreignPaths = [...new Set((mine ?? []).map((a: any) => toPath(a.photo)).filter((p) => p && !p.startsWith(`${uid}/`)))];
    for (const p of foreignPaths) {
      const { count } = await admin.from("animals").select("id", { count: "exact", head: true }).neq("user_id", uid).like("photo", `%/animal-photos/${p}%`);
      if (!count) await admin.storage.from("animal-photos").remove([p]);
    }

    // 2. Rows. Only rows owned by this user; other users' links are set to NULL by the schema.
    const steps: [string, string][] = [
      ["transfer_archive", "original_owner_id"],
      ["transfer_codes", "from_user_id"],
      ["transfer_codes", "to_user_id"],
      ["notifications", "user_id"],
      ["heat_cycles", "user_id"],
      ["litters", "user_id"],
      ["reproductions", "user_id"],
      ["animals", "user_id"],
      ["rendezvous", "user_id"],
      ["pharmacy_items", "user_id"],
      ["breeder_profiles", "user_id"],
      ["feedback", "user_id"],
    ];
    for (const [table, col] of steps) {
      const { error } = await admin.from(table).delete().eq(col, uid);
      if (error) throw new Error(`${table}: ${error.message}`);
    }

    // 3. Auth account last.
    const { error: delErr } = await admin.auth.admin.deleteUser(uid);
    if (delErr && (delErr as any).status !== 404 && !/not found/i.test(delErr.message)) throw new Error(`auth: ${delErr.message}`);

    return reply(200, { success: true, kept_shared_photos: keep.size });
  } catch (e) {
    console.error("[delete-account]", uid, (e as Error).message);
    return reply(500, { error: "La suppression n'a pas pu se terminer. Réessayez : les données déjà supprimées ne reviendront pas." });
  }
});
