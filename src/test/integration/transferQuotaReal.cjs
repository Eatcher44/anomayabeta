// Real backend quota test with disposable accounts from createSecurityAccounts.cjs.
const {createClient}=require('@supabase/supabase-js');const fs=require('node:fs');
const s=JSON.parse(fs.readFileSync('/tmp/security-real/state.json'));const url=process.env.VITE_SUPABASE_URL,key=process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const cs=s.accounts.map(()=>createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}}));const results=[];
const check=(ok,label,extra)=>{results.push({label,status:ok?'PASS':'FAIL',...(extra||{})});};
async function call(i,body){const r=await fetch(`${url}/functions/v1/secure-transfer`,{method:'POST',headers:{apikey:key,Authorization:`Bearer ${s.accounts[i].token}`,'Content-Type':'application/json'},body:JSON.stringify(body)});return {status:r.status,body:await r.json().catch(()=>({}))}}
(async()=>{
for(let i=0;i<3;i++){const r=await cs[i].auth.signInWithPassword({email:s.accounts[i].email,password:s.accounts[i].password});s.accounts[i].token=r.data.session.access_token;}
const A=s.accounts[0].id;
const an=(await cs[0].from('animals').insert({user_id:A,nom:'QUOTA DISPOSABLE',type:'chat',sexe:'male'}).select('id').single()).data.id;
const foreign=(await cs[1].from('animals').insert({user_id:s.accounts[1].id,nom:'QUOTA FOREIGN',type:'chat',sexe:'male'}).select('id').single()).data.id;
// create: 1 success, 1 foreign failure, 1 trigger rejection (private note), then fill.
const ok1=await call(0,{action:'create',animal_id:an});check(ok1.status===200,'Successful creation (1/10)');
check((await call(0,{action:'create',animal_id:foreign})).status===400,'Foreign creation refused (2/10)');
await cs[0].from('animals').update({soins:[{id:'n',notes:'DISPOSABLE PRIVATE'}]}).eq('id',an);
const trig=await call(0,{action:'create',animal_id:an});check(trig.status===400&&trig.body.error==='private_notes_require_support','Trigger rejection 400 (3/10)');
await cs[0].from('animals').update({soins:[]}).eq('id',an);
const burst=await Promise.all(Array.from({length:12},()=>call(0,{action:'create',animal_id:foreign})));
const non429=burst.filter(r=>r.status!==429).length;check(non429===7,'Concurrent creations: exactly 7 admitted after 3 prior',{admitted:non429});
check(burst.filter(r=>r.status===429).length===5,'HTTP 429 at creation limit');
// Before burst, list verifies trigger rollback left no code row.
const list=await call(0,{action:'list',animal_id:an});check(list.status===200&&list.body.length===1,'Rejected creations stored no code',{codes:list.body.length});
// claims by C: use valid code, then reuse, invalid, expired, burst.
const code=ok1.body.code;
check((await call(2,{action:'claim',code})).status===200,'Valid claim (C 1/20)');
check((await call(1,{action:'claim',code})).status===400,'Reused code refused (B 1/20)');
check((await call(1,{action:'claim',code:'F'.repeat(32)})).status===400,'Invalid code refused (B 2/20)');
fs.writeFileSync('/tmp/security-real/expire.json',JSON.stringify({animal:an}));
console.log('NEED_EXPIRED_CODE');
// Expired code: issue from C (now owner) and await external expiry.
const c2=await call(2,{action:'create',animal_id:an});fs.writeFileSync('/tmp/security-real/expire.json',JSON.stringify({id:c2.body.id,code:c2.body.code}));
for(let t=0;t<60&&!fs.existsSync('/tmp/security-real/expired.ok');t++)await new Promise(r=>setTimeout(r,1000));
check((await call(1,{action:'claim',code:c2.body.code})).status===400,'Expired code refused (B 3/20)');
const cb=await Promise.all(Array.from({length:20},()=>call(1,{action:'claim',code:'A'.repeat(32)})));
check(cb.filter(r=>r.status!==429).length===17,'Concurrent claims: exactly 17 admitted after 3 prior',{admitted:cb.filter(r=>r.status!==429).length});
check((await call(1,{action:'claim',code:c2.body.code})).status===429,'Claim 429 after limit, even for a code');
// manipulation
const sel=await cs[1].from('transfer_attempt_windows').select('*');check(!!sel.error||sel.data.length===0,'Counter read denied');
const del=await cs[1].from('transfer_attempt_windows').delete().eq('user_id',A).select();check(!!del.error||del.data.length===0,'Counter reset denied');
const ins=await cs[1].from('transfer_attempt_windows').insert({user_id:s.accounts[1].id,action:'claim',window_start:new Date().toISOString(),attempts:0});check(!!ins.error,'Counter insert denied');
const rpc=await cs[1].rpc('consume_transfer_attempt',{p_uid:A,p_action:'create'});check(!!rpc.error,'Counter RPC denied to clients');
const rpc2=await cs[1].rpc('secure_claim_transfer_checked',{p_uid:s.accounts[1].id,p_code:code});check(!!rpc2.error,'Unmetered claim RPC denied to clients');
check((await call(0,{action:'create',animal_id:an})).status===429,'A still limited after manipulation attempts');
})().catch(e=>results.push({label:'Stopped',status:'FAIL',err:e.message})).finally(async()=>{
for(let i=0;i<3;i++){const r=await fetch(`${url}/functions/v1/delete-account`,{method:'POST',headers:{apikey:key,Authorization:`Bearer ${s.accounts[i].token}`,'Content-Type':'application/json'},body:JSON.stringify({confirm:'SUPPRIMER'})});results.push({label:`Cleanup ${i}`,status:[200,401].includes(r.status)?'PASS':'FAIL',http:r.status});}
console.log(JSON.stringify(results,null,1));});
