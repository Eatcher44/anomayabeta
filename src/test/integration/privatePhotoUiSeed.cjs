// Seeds disposable accounts for the private photo UI check; writes sessions to /tmp (0600), prints no secrets.
const fs = require('fs'); const { createClient } = require('@supabase/supabase-js');
const url = process.env.VITE_SUPABASE_URL, key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const s = JSON.parse(fs.readFileSync('/tmp/security-real/state.json'));
const JPG = fs.readFileSync('/dev-server/public/icon-512.png');
const fn = async (n, t, b) => { const r = await fetch(`${url}/functions/v1/${n}`, { method: 'POST', headers: { apikey: key, Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' }, body: JSON.stringify(b) }); return { status: r.status, body: await r.json().catch(() => ({})) }; };
const up = async (t, bucket) => { const f = new FormData(); f.append('file', new Blob([JPG], { type: 'image/png' }), 'x.png'); f.append('bucket', bucket); const r = await fetch(`${url}/functions/v1/secure-upload`, { method: 'POST', headers: { apikey: key, Authorization: `Bearer ${t}` }, body: f }); const b = await r.json(); if (r.status !== 200) throw Error('upload ' + r.status + b.error); return b; };
(async () => {
  const cs = [], sess = [];
  for (let i = 0; i < 3; i++) { cs[i] = createClient(url, key, { auth: { persistSession: false } }); sess[i] = (await cs[i].auth.signInWithPassword({ email: s.accounts[i].email, password: s.accounts[i].password })).data.session; }
  const t = sess[0].access_token, A = s.accounts[0].id;
  const pub = await up(t, 'animal-photos'), pr1 = await up(t, 'animal-media'), pr2 = await up(t, 'animal-media'), pr3 = await up(t, 'animal-media'), logo = await up(t, 'animal-media');
  const Pub = crypto.randomUUID(), Priv = crypto.randomUUID(), Tr = crypto.randomUUID();
  for (const [id, nom, photo, g] of [[Pub, 'PhotoPublique', pub.url, []], [Priv, 'PhotoPrivee', pr1.url, [pr2.url]], [Tr, 'PhotoTransferee', pr3.url, []]]) {
    const { error } = await cs[0].from('animals').insert({ id, user_id: A, nom, type: 'chat', sexe: 'femelle', photo, gallery_photos: g }); if (error) throw Error(error.message);
  }
  const bp = await cs[0].from('breeder_profiles').insert({ user_id: A, nom_elevage: 'Elevage Test', logo_url: logo.url }); if (bp.error) throw Error(bp.error.message);
  const ap = (await fn('secure-transfer', t, { action: 'preview', animal_id: Tr })).body.approval;
  const c = await fn('secure-transfer', t, { action: 'create', animal_id: Tr, approval: ap, selection: [] });
  const cl = await fn('secure-transfer', sess[1].access_token, { action: 'claim', code: c.body.code });
  console.log('seed transfer', c.status, cl.status);
  // Unauthorized retrieval checks (real backend)
  const deny = async (c2) => !(await c2.storage.from('animal-media').createSignedUrl(pr1.path, 60)).data;
  const anon = createClient(url, key, { auth: { persistSession: false } });
  console.log((await deny(cs[2])) ? 'PASS' : 'FAIL', '| Other account cannot get a viewing link');
  console.log((await deny(anon)) ? 'PASS' : 'FAIL', '| Anonymous cannot get a viewing link');
  fs.writeFileSync('/tmp/security-real/ui.json', JSON.stringify({ sessions: sess, Pub, Priv, Tr, pubUrl: pub.url, privPath: pr1.path }), { mode: 0o600 });
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
