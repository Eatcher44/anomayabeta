import { createClient } from 'npm:@supabase/supabase-js@2.118.0';

function check(value: unknown, label: string): asserts value { if (!value) throw new Error(label); }

Deno.test('disposable relationship, media, quota and deletion integration', async () => {
  const url = Deno.env.get('SUPABASE_URL');
  const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const anon = Deno.env.get('SUPABASE_ANON_KEY');
  check(url && service && anon, 'Hosted test credentials unavailable: integration NOT executed');
  const admin = createClient(url, service, { auth: { persistSession: false } });
  const original = await admin.from('security_release_state').select('*').single();
  check(!original.error && !original.data.transfers_enabled && !original.data.deletion_enabled && original.data.test_users.length === 0, 'Public containment must be active with empty allowlist');
  const ids: string[] = [];
  const clients: ReturnType<typeof createClient>[] = [];
  const tokens: string[] = [];
  const run = crypto.randomUUID();
  try {
    for (let i = 0; i < 3; i++) {
      const email = `sectest-${run}-${i}@anomaya-dev.test`;
      const password = `T!${crypto.randomUUID()}-aA9`;
      const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
      check(!created.error && created.data.user, 'Disposable account creation failed');
      ids.push(created.data.user.id);
      const client = createClient(url, anon, { auth: { persistSession: false } });
      const signed = await client.auth.signInWithPassword({ email, password });
      check(!signed.error && signed.data.session, 'Disposable login failed');
      clients.push(client); tokens.push(signed.data.session.access_token);
    }
    const [a, b, c] = ids;
    check(a && b && c, 'Missing disposable identities');
    check(!(await admin.from('security_release_state').update({ test_users: ids }).eq('id', true)).error, 'Test-only allowlist failed');
    const insert = await clients[0].from('animals').insert({ user_id: a, nom: 'SECURITY DISPOSABLE', type: 'chat', sexe: 'male' }).select('id').single();
    check(!insert.error && insert.data, 'Disposable animal creation failed');
    const animal = insert.data.id;
    check((await clients[1].from('animals').select('id').eq('id', animal)).data?.length === 0, 'Cross-account animal disclosure');
    const call = async (index: number, name: string, body: unknown) => fetch(`${url}/functions/v1/${name}`, { method: 'POST', headers: { Authorization: `Bearer ${tokens[index]}`, apikey: anon, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    check((await call(1, 'secure-transfer', { action: 'create', animal_id: animal })).status === 400, 'Foreign creation accepted');
    check((await call(0, 'secure-transfer', { action: 'create', animal_id: animal, from_user_id: b })).status === 400, 'Forged sender accepted');
    const issue = await call(0, 'secure-transfer', { action: 'create', animal_id: animal });
    check(issue.status === 200, 'Code creation failed');
    const code = (await issue.json()).code;
    check(/^[0-9A-F]{32}$/.test(code), 'Code entropy format mismatch');
    const appointment = await clients[0].from('rendezvous').insert({ user_id: a, date: new Date().toISOString(), objet: 'Disposable appointment', animal_ids: [animal] }).select('id').single();
    check(!appointment.error && appointment.data, 'Appointment fixture failed');
    check((await call(1, 'secure-transfer', { action: 'claim', code })).status === 400, 'Relationship added after issuance was ignored');
    check(!(await clients[0].from('rendezvous').delete().eq('id', appointment.data.id)).error, 'Fixture unlink failed');
    const path = `${a}/${run}.png`;
    const png = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j8l0AAAAASUVORK5CYII='), c => c.charCodeAt(0));
    check(!(await clients[0].storage.from('animal-photos').upload(path, png, { contentType: 'image/png' })).error, 'Photo upload failed');
    const photo = clients[0].storage.from('animal-photos').getPublicUrl(path).data.publicUrl;
    check(!(await clients[0].from('animals').update({ photo, gallery_photos: [photo] }).eq('id', animal)).error, 'Photo/gallery bind failed');
    const sibling = await clients[0].from('animals').insert({ user_id: a, nom: 'SHARED DISPOSABLE', type: 'chat', sexe: 'male', photo }).select('id').single();
    check(!sibling.error, 'Shared-photo fixture failed');
    const claims = await Promise.all([call(1, 'secure-transfer', { action: 'claim', code }), call(2, 'secure-transfer', { action: 'claim', code })]);
    check(claims.filter(r => r.status === 200).length === 1, 'Concurrent claims did not produce exactly one success');
    const winner = claims[0].status === 200 ? 1 : 2;
    const recipient = ids[winner];
    check(!(await clients[0].storage.from('animal-photos').remove([path])).data?.length, 'Previous owner deleted shared photo');
    check((await clients[0].storage.from('animal-photos').upload(path, png, { upsert: true, contentType: 'image/png' })).error, 'Previous owner overwrote photo');
    const second = await call(winner, 'secure-transfer', { action: 'create', animal_id: animal });
    check(second.status === 200, 'Successive transfer code creation failed');
    const next = winner === 1 ? 2 : 1;
    check((await call(next, 'secure-transfer', { action: 'claim', code: (await second.json()).code })).status === 200, 'Successive transfer claim failed');
    const privatePath = `${a}/signature-${run}.png`;
    check(!(await clients[0].storage.from('sensitive-documents').upload(privatePath, png, { contentType: 'image/png' })).error, 'Private signature upload failed');
    check(!(await clients[0].storage.from('sensitive-documents').createSignedUrl(privatePath, 60)).error, 'Owner private signature read failed');
    check((await clients[1].storage.from('sensitive-documents').createSignedUrl(privatePath, 60)).error, 'Cross-account private signature read accepted');
    check((await fetch(`${url}/storage/v1/object/public/sensitive-documents/${privatePath}`)).status !== 200, 'Private signature publicly readable');
    const signatureProfile = await clients[0].from('breeder_profiles').insert({ user_id: a, nom: 'Disposable', signature_object_path: privatePath });
    check(!signatureProfile.error, 'Private signature profile fixture failed');
    const quota = await Promise.all(Array.from({ length: 6 }, () => admin.rpc('consume_feedback_attempt', { p_uid: a })));
    // Busy replies are safe rejections under the common try-lock; sequential calls verify the exact threshold.
    const successes = quota.filter(r => r.data === true).length;
    for (let i = successes; i < 5; i++) check((await admin.rpc('consume_feedback_attempt', { p_uid: a })).data === true, 'Feedback quota rejected below five');
    check((await admin.rpc('consume_feedback_attempt', { p_uid: a })).data === false, 'Feedback exceeded five/hour');
    check((await call(0, 'delete-account', { confirm: 'SUPPRIMER', user_id: recipient })).status === 200, 'Caller-only deletion failed');
    check(!(await admin.auth.admin.getUserById(a)).data.user, 'Caller identity survived deletion');
    check((await admin.auth.admin.getUserById(recipient)).data.user, 'Foreign identity deleted');
    check((await admin.from('animals').select('photo,user_id').eq('id', animal).single()).data?.user_id === ids[next], 'Transferred animal lost');
    check((await fetch(`${photo}?verification=${run}`)).status === 200, 'Shared referenced photo deleted');
    check((await admin.storage.from('sensitive-documents').list(a)).data?.length === 0, 'Private signature cleanup incomplete');
    check((await admin.from('feedback_attempt_windows').select('user_id').eq('user_id', a)).data?.length === 0, 'Personal quota data not removed');
    console.log('Executed: cross-account denial, late relationships, concurrent/successive claims, shared gallery media, previous-owner mutations, private signatures, five/hour quota, caller-only cleanup.');
  } finally {
    // Only identities created by this test may be touched; never global enablement.
    for (let i = 0; i < ids.length; i++) {
      const existing = await admin.auth.admin.getUserById(ids[i]);
      if (!existing.data.user) continue;
      const deletion = await fetch(`${url}/functions/v1/delete-account`, { method: 'POST', headers: { Authorization: `Bearer ${tokens[i]}`, apikey: anon, 'Content-Type': 'application/json' }, body: JSON.stringify({ confirm: 'SUPPRIMER' }) });
      check(deletion.status === 200, 'Disposable cleanup failed: keep gates disabled and inspect test fixtures');
    }
    const reset = await admin.from('security_release_state').update({ test_users: [] }).eq('id', true);
    check(!reset.error, 'Test allowlist cleanup failed');
  }
});