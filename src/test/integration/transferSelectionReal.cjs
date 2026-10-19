const fs=require('fs');const p=JSON.parse(fs.readFileSync('/tmp/browser/review/prep.json'));const url=process.env.VITE_SUPABASE_URL,key=process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const {createClient}=require('@supabase/supabase-js');const s=JSON.parse(fs.readFileSync('/tmp/security-real/state.json'));const R=[];const chk=(o,l,x)=>R.push([o?'PASS':'FAIL',l,x??'']);
(async()=>{const cs=[],tk=[];for(let i=0;i<3;i++){cs[i]=createClient(url,key,{auth:{persistSession:false}});tk[i]=(await cs[i].auth.signInWithPassword({email:s.accounts[i].email,password:s.accounts[i].password})).data.session.access_token;}
const call=async(i,b)=>{const r=await fetch(`${url}/functions/v1/secure-transfer`,{method:'POST',headers:{apikey:key,Authorization:`Bearer ${tk[i]}`,'Content-Type':'application/json'},body:JSON.stringify(b)});return {status:r.status,body:await r.json().catch(()=>({}))}};
const an=p.animal;const ap=(await call(0,{action:'preview',animal_id:an})).body.approval;
for(const [sel,l] of [[[{id:'nope',field:'nom'}],'unknown entry'],[[{id:'v1',field:'veterinaire'}],'vet field'],[[{id:'v1',field:'nom',extra:1}],'extra key'],[[{id:'w1',field:'nom'}],'entry without a name'],['x','non-array']]){const r=await call(0,{action:'create',animal_id:an,approval:ap,selection:sel});chk(r.status===400,`Forged selection refused: ${l}`,r.status);}
chk((await call(0,{action:'create',animal_id:an,approval:'b'.repeat(64),selection:[{id:'v1',field:'produit'}]})).status===409,'Stale/forged approval with selection refused');
chk((await call(1,{action:'create',animal_id:an,approval:ap,selection:[{id:'v1',field:'produit'}]})).status===400,'Other account cannot create with selection');
const c=await call(0,{action:'create',animal_id:an,approval:ap,selection:[{id:'v1',field:'produit'},{id:'v1',field:'produit'}]});chk(c.status===200&&c.body.shared.length===1,'Selected code issued (duplicates normalised)');
chk((await cs[1].from('transfer_codes').update({shared_selection:[{id:'v1',field:'nom'}]}).eq('id',c.body.id).select()).data?.length!==1,'Recipient-side selection tampering denied');
const cl=await call(1,{action:'claim',code:c.body.code});chk(cl.status===200,'Claim with selection');
const g=(await cs[1].from('animals').select('soins,buyer_email').eq('id',an).single()).data;const j=JSON.stringify(g);
chk(j.includes('DISPO-Purevax'),'Selected product reaches new owner');chk(!j.includes('DISPO-Typhus')&&!j.includes('DISPO-VETO')&&!j.includes('buyer@'),'Unselected name, vet and buyer stay private');
const arc=(await cs[0].from('transfer_archive').select('animal_data,private_snapshot').eq('animal_id',an)).data;chk(JSON.stringify(arc).includes('DISPO-Typhus')&&JSON.stringify(arc).includes('buyer@'),'Former owner keeps complete archive');
chk(((await cs[1].from('transfer_archive').select('id').eq('animal_id',an)).data||[]).length===0,'New owner cannot read archive');
for(let i=0;i<3;i++){const r=await fetch(`${url}/functions/v1/delete-account`,{method:'POST',headers:{apikey:key,Authorization:`Bearer ${tk[i]}`,'Content-Type':'application/json'},body:JSON.stringify({confirm:'SUPPRIMER'})});chk([200,401].includes(r.status),`Cleanup ${i}`,r.status);}
R.forEach(r=>console.log(r.join(' | ')));})();
