// Real backend medical-privacy transfer test with disposable accounts from createSecurityAccounts.cjs.
const {createClient}=require('@supabase/supabase-js');const fs=require('node:fs');
const s=JSON.parse(fs.readFileSync('/tmp/security-real/state.json'));const url=process.env.VITE_SUPABASE_URL,key=process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const cs=s.accounts.map(()=>createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}}));const results=[];
const check=(ok,label,extra)=>results.push({label,status:ok?'PASS':'FAIL',...(extra||{})});
async function call(i,body){const r=await fetch(`${url}/functions/v1/secure-transfer`,{method:'POST',headers:{apikey:key,Authorization:`Bearer ${s.accounts[i].token}`,'Content-Type':'application/json'},body:JSON.stringify(body)});return {status:r.status,body:await r.json().catch(()=>({}))}}
const SECRETS=['DISPO-NOM','DISPO-PRODUIT','DISPO-VETO','DISPO-LEGACY','DISPO-MOTIF','DISPO-PARTIC','DISPO-BUYER','0600000000','buyer@dispo.test','DISPO-COMM'];
const leaks=o=>SECRETS.filter(x=>JSON.stringify(o).includes(x));
(async()=>{
for(let i=0;i<3;i++){const r=await cs[i].auth.signInWithPassword({email:s.accounts[i].email,password:s.accounts[i].password});s.accounts[i].token=r.data.session.access_token;}
const A=s.accounts[0].id;
const fixture={user_id:A,nom:'PRIVACY DISPOSABLE',type:'chat',sexe:'femelle',race:'Européen',puce:'250000000000001',naissance:'2025-01-02',particularite:'DISPO-PARTIC',
 buyer_name:'DISPO-BUYER',buyer_phone:'0600000000',buyer_email:'buyer@dispo.test',commercial_notes:'DISPO-COMM',
 soins:[{id:'v1',type:'Vaccin',nom:'DISPO-NOM',date:'2025-03-01T10:00:00.000Z',prochain:'2026-03-01',rappelMois:12,produit:'DISPO-PRODUIT',veterinaire:'DISPO-VETO',legacy_text:'DISPO-LEGACY',pharmacyItemId:'x'},
  {id:12345,type:'Traitement',debut:'2025-04-01',fin:'2025-04-05',doseValue:1,doseUnit:'comprimé',dosesPerDay:2,times:['08:00','DISPO-LEGACY']},'legacy-string-entry',{id:'bad id with DISPO-LEGACY',type:'Custom DISPO-LEGACY'}],
 consultations:[{id:'c1',date:'2025-05-01',motif:'DISPO-MOTIF',veterinaire:'DISPO-VETO'}],poids:[{id:'p1',date:'2025-03-01',poids:2500}],repas:[{id:'r1',date:'2025-01-03',time:'09:00',quantity:10}]};
const ins=await cs[0].from('animals').insert(fixture).select('id').single();check(!ins.error,'Legacy-shaped fixture stored',{err:ins.error?.message});const an=ins.data.id;
const pv=await call(0,{action:'preview',animal_id:an});check(pv.status===200&&/^[0-9a-f]{64}$/.test(pv.body.approval),'Owner preview with server version');
check(pv.body.private?.produits===1&&pv.body.private?.contact_acheteur===true&&pv.body.private?.motifs===1,'Preview lists private items',{private:pv.body.private});
check(leaks(pv.body).length===0,'Preview response discloses no private text');
check((await call(1,{action:'preview',animal_id:an})).status===400,'Foreign preview denied');
check((await call(0,{action:'create',animal_id:an})).status===400,'Creation without approval refused');
check((await call(0,{action:'create',animal_id:an,approval:'a'.repeat(64)})).status===409,'Forged approval refused');
check((await call(0,{action:'create',animal_id:an,approval:pv.body.approval,fields:['soins']})).status===400,'Altered field selection refused');
check((await call(1,{action:'create',animal_id:an,approval:pv.body.approval})).status===400,'Foreign creation with stolen approval refused');
await cs[0].from('animals').update({poids:[...fixture.poids,{id:'p2',date:'2025-04-01',poids:2800}]}).eq('id',an);
check((await call(0,{action:'create',animal_id:an,approval:pv.body.approval})).status===409,'Change after review invalidates approval');
let pv2=await call(0,{action:'preview',animal_id:an});const c1=await call(0,{action:'create',animal_id:an,approval:pv2.body.approval});check(c1.status===200,'Reviewed code issued');
await cs[0].from('animals').update({particularite:'DISPO-PARTIC changed'}).eq('id',an);
check((await call(1,{action:'claim',code:c1.body.code})).status===409,'Change after code issuance blocks claim');
pv2=await call(0,{action:'preview',animal_id:an});const c2=await call(0,{action:'create',animal_id:an,approval:pv2.body.approval});check(c2.status===200,'Re-reviewed code issued');
const legacy=await cs[0].from('transfer_codes').insert({code:'X',animal_id:an,from_user_id:A,expires_at:new Date(Date.now()+864e5).toISOString()});check(!!legacy.error,'Direct unreviewed code insert denied');
const cl=await call(1,{action:'claim',code:c2.body.code});check(cl.status===200,'Claim of reviewed code');
const got=(await cs[1].from('animals').select('*').eq('id',an).single()).data;
check(got&&leaks(got).length===0,'New owner sees no private text',{leaks:got&&leaks(got)});
check(got?.soins?.length===3&&got.soins[0].type==='Vaccin'&&got.soins[0].prochain==='2026-03-01'&&got.soins[1].id==='12345'&&got.soins[1].times.length===1,'Structured care history transferred');
check(got?.consultations?.[0]?.date==='2025-05-01'&&!('motif' in got.consultations[0]),'Consultation dates only');
check(got?.poids?.length===2&&got?.repas?.[0]?.quantity===10,'Weights and meals transferred');
check(got?.buyer_name===null&&got?.buyer_email===null&&got?.commercial_notes===null&&got?.particularite===null,'Buyer and commercial data not exposed');
check(got?.puce===fixture.puce&&got?.race===fixture.race,'Identity transferred');
const arcA=(await cs[0].from('transfer_archive').select('animal_data,private_snapshot').eq('animal_id',an)).data;
check(arcA?.length===1&&JSON.stringify(arcA).includes('DISPO-PRODUIT')&&arcA[0].private_snapshot?.buyer_email==='buyer@dispo.test','Former owner keeps full private archive');
check(((await cs[1].from('transfer_archive').select('id').eq('animal_id',an)).data||[]).length===0,'New owner cannot read former archive');
check(((await cs[2].from('transfer_archive').select('id').eq('animal_id',an)).data||[]).length===0,'Third account cannot read archive');
check(((await cs[0].from('animals').select('id').eq('id',an)).data||[]).length===0,'Former owner loses animal access');
// Concurrency: B re-shares to C while editing private text at the same moment.
await cs[1].from('animals').update({soins:[...got.soins,{id:'b1',type:'Vaccin',date:'2025-06-01',produit:'DISPO-PRODUIT'}]}).eq('id',an);
const pb=await call(1,{action:'preview',animal_id:an});const cb=await call(1,{action:'create',animal_id:an,approval:pb.body.approval});check(cb.status===200,'Second reviewed code');
const [edit,claim]=await Promise.all([cs[1].from('animals').update({particularite:'DISPO-PARTIC race'}).eq('id',an).select('id'),call(2,{action:'claim',code:cb.body.code})]);
const gc=(await cs[2].from('animals').select('*').eq('id',an)).data||[];
check(gc.length===0?claim.status!==200:leaks(gc).length===0,'Concurrent edit cannot bypass approved selection',{claim:claim.status,edit:edit.error?.message||'ok',owned:gc.length});
})().catch(e=>results.push({label:'Stopped',status:'FAIL',err:e.message})).finally(async()=>{
for(let i=0;i<3;i++){const r=await fetch(`${url}/functions/v1/delete-account`,{method:'POST',headers:{apikey:key,Authorization:`Bearer ${s.accounts[i].token}`,'Content-Type':'application/json'},body:JSON.stringify({confirm:'SUPPRIMER'})});results.push({label:`Cleanup ${i}`,status:[200,401].includes(r.status)?'PASS':'FAIL',http:r.status});}
console.log(JSON.stringify(results));});
