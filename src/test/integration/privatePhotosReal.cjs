// Real-backend private photo + sharing suite. Usage: node privatePhotosReal.cjs pre|one|two
// Disposable accounts from createSecurityAccounts.cjs; prints PASS/FAIL lines only, never tokens.
const fs = require('fs'); const { createClient } = require('@supabase/supabase-js');
const url = process.env.VITE_SUPABASE_URL, key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const s = JSON.parse(fs.readFileSync('/tmp/security-real/state.json')); const SP = '/tmp/security-real/photos.json';
const R = []; const chk = (o, l, x) => R.push([o ? 'PASS' : 'FAIL', l, x ?? '']);
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
const fn = async (name, tok, body) => { const h = { apikey: key, 'Content-Type': 'application/json' }; if (tok) h.Authorization = `Bearer ${tok}`; const r = await fetch(`${url}/functions/v1/${name}`, { method: 'POST', headers: h, body: JSON.stringify(body) }); return { status: r.status, body: await r.json().catch(() => ({})) }; };
const upload = async (tok, bucket) => { const f = new FormData(); f.append('file', new Blob([PNG], { type: 'image/png' }), 'x.png'); f.append('bucket', bucket); const r = await fetch(`${url}/functions/v1/secure-upload`, { method: 'POST', headers: { apikey: key, Authorization: `Bearer ${tok}` }, body: f }); return { status: r.status, body: await r.json().catch(() => ({})) }; };
const canRead = async (c, path) => { const { data, error } = await c.storage.from('animal-media').createSignedUrl(path, 60); if (error || !data?.signedUrl) return false; return (await fetch(data.signedUrl)).status === 200; };
(async () => {
  const cs = [], tk = [];
  for (let i = 0; i < 3; i++) { cs[i] = createClient(url, key, { auth: { persistSession: false } }); tk[i] = (await cs[i].auth.signInWithPassword({ email: s.accounts[i].email, password: s.accounts[i].password })).data.session.access_token; }
  const anon = createClient(url, key, { auth: { persistSession: false } });
  const mode = process.argv[2];
  if (mode === 'pre') {
    const r = await upload(tk[0], 'animal-media'); chk(r.status === 409 && r.body.error === 'temporarily_suspended', 'Flag off: private upload refused', r.status);
  }
  if (mode === 'one') {
    const up = []; for (let i = 0; i < 3; i++) { const r = await upload(tk[0], 'animal-media'); chk(r.status === 200, `Private upload ${i + 1}`, r.status + JSON.stringify(r.body)); up.push(r.body); }
    const [p1, p2, p3] = up;
    const X = crypto.randomUUID(), Y = crypto.randomUUID();
    const ix = await cs[0].from('animals').insert({ id: X, user_id: s.accounts[0].id, nom: 'PrivX', type: 'chat', sexe: 'femelle', photo: p1.url, gallery_photos: [p2.url] });
    const iy = await cs[0].from('animals').insert({ id: Y, user_id: s.accounts[0].id, nom: 'PrivY', type: 'chat', sexe: 'male', photo: p3.url });
    chk(!ix.error && !iy.error, 'Animals reference private photos', ix.error?.message || iy.error?.message);
    chk(await canRead(cs[0], p1.path), 'Owner reads private photo');
    chk(!(await canRead(cs[1], p1.path)), 'Other account denied');
    chk(!(await canRead(anon, p1.path)), 'Anonymous denied');
    chk((await fetch(`${url}/storage/v1/object/public/animal-media/${p1.path}`)).status >= 400, 'Public URL refused');
    await cs[0].storage.from('animal-media').remove([p1.path]);
    const ow = await cs[0].storage.from('animal-media').upload(p1.path, PNG, { upsert: true, contentType: 'image/png' });
    chk(!!ow.error && await canRead(cs[0], p1.path), 'Owner cannot delete or overwrite directly');
    const sh = await fn('photo-share', tk[0], { action: 'create', paths: [p1.path], hours: 24 });
    chk(sh.status === 200 && sh.body.count === 1, 'Share created for one selected photo', sh.status);
    const rs = await fn('photo-share', null, { action: 'resolve', token: sh.body.token });
    chk(rs.status === 200 && rs.body.photos.length === 1 && rs.body.photos[0].includes(p1.path) && (await fetch(rs.body.photos[0])).status === 200, 'Share exposes only the selected photo');
    chk((await fn('photo-share', tk[1], { action: 'create', paths: [p3.path], hours: 24 })).status === 403, 'Cannot share another account photo');
    chk((await fn('photo-share', tk[0], { action: 'create', paths: [p1.path], hours: 9999 })).status === 400, 'Excessive duration refused');
    chk((await fn('photo-share', null, { action: 'resolve', token: 'a'.repeat(64) })).status === 404, 'Forged token refused');
    const rv = await fn('photo-share', tk[0], { action: 'create', paths: [p3.path], hours: 24 });
    chk((await fn('photo-share', tk[1], { action: 'revoke', share_id: rv.body.id })).status === 404, 'Other account cannot revoke');
    chk((await fn('photo-share', tk[0], { action: 'revoke', share_id: rv.body.id })).status === 200, 'Owner revokes');
    chk((await fn('photo-share', null, { action: 'resolve', token: rv.body.token })).status === 404, 'Revoked link refused');
    const ex = await fn('photo-share', tk[0], { action: 'create', paths: [p3.path], hours: 1 });
    fs.writeFileSync(SP, JSON.stringify({ p1, p2, p3, X, Y, share: sh.body.token, expiredId: ex.body.id, expiredToken: ex.body.token }), { mode: 0o600 });
  }
  if (mode === 'two') {
    const st = JSON.parse(fs.readFileSync(SP)); const { p1, p2, p3, X } = st;
    chk((await fn('photo-share', null, { action: 'resolve', token: st.expiredToken })).status === 404, 'Expired link refused');
    const ap = (await fn('secure-transfer', tk[0], { action: 'preview', animal_id: X })).body.approval;
    const c = await fn('secure-transfer', tk[0], { action: 'create', animal_id: X, approval: ap, selection: [] });
    const cl = await fn('secure-transfer', tk[1], { action: 'claim', code: c.body.code });
    chk(cl.status === 200, 'Transfer to new owner', `${c.status}/${cl.status}`);
    chk(await canRead(cs[1], p1.path) && await canRead(cs[1], p2.path), 'New owner reads profile and gallery photos');
    chk(await canRead(cs[0], p1.path), 'Former owner keeps archived profile photo (own archive)');
    chk(!(await canRead(cs[0], p2.path)), 'Former owner loses gallery photo');
    chk(!(await canRead(cs[2], p1.path)), 'Third account still denied');
    chk((await fn('photo-share', null, { action: 'resolve', token: st.share })).status === 404, 'Former owner share ends at transfer');
    for (const i of [0, 1]) { await cs[i].storage.from('animal-media').remove([p1.path]); await cs[i].storage.from('animal-media').upload(p1.path, Buffer.from('x'), { upsert: true, contentType: 'image/png' }); }
    chk(await canRead(cs[1], p1.path), 'Neither owner can delete or replace transferred photo');
    const d0 = await fn('delete-account', tk[0], { confirm: 'SUPPRIMER' }); chk(d0.status === 200, 'Former owner account deleted', d0.status);
    chk(await canRead(cs[1], p1.path) && await canRead(cs[1], p2.path), 'Referenced photos preserved after former owner deletion');
    for (const i of [1, 2]) { const d = await fn('delete-account', tk[i], { confirm: 'SUPPRIMER' }); chk(d.status === 200, `Cleanup ${i}`, d.status); }
    fs.writeFileSync(SP + '.paths', JSON.stringify([p1.path, p2.path, p3.path]));
  }
  R.forEach((r) => console.log(r.join(' | ')));
})().catch((e) => { console.error('ERR', e.stack); R.forEach((r) => console.log(r.join(' | '))); process.exit(1); });
