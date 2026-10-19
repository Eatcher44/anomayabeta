import re, asyncio, json, subprocess, sys
from pathlib import Path
from playwright.async_api import async_playwright
D=Path('/tmp/browser/review'); P=json.load(open(D/'prep.json'))
KEY='sb-rgqqrphcezawqchepgij-auth-token'; R=[]
def chk(ok,l): R.append(('PASS' if ok else 'FAIL',l))
async def run(w,h,tag,full):
  async with async_playwright() as p:
    b=await p.chromium.launch(headless=True); ctx=await b.new_context(viewport={'width':w,'height':h}); pg=await ctx.new_page()
    errs=[]; pg.on('pageerror',lambda e: errs.append(str(e)))
    await pg.goto('http://localhost:8080'); await pg.evaluate("([k,v])=>{localStorage.setItem(k,v);localStorage.setItem('anomaya_sim_plan','breeder')}",[KEY,json.dumps(P['session'])])
    await pg.goto(f"http://localhost:8080/transfer/{P['animal']}"); await pg.wait_for_timeout(4000)
    await pg.screenshot(path=str(D/f'{tag}_0_land.png')); print('URL',pg.url)
    for _ in range(3):
      btn=pg.get_by_role('button',name=re.compile("^(Merci, j'ai compris|Continuer)$"))
      if await btn.count(): await btn.first.click(); await pg.wait_for_timeout(500)
      else: break
    await pg.screenshot(path=str(D/f'{tag}_0b.png'))
    gen=pg.get_by_role('button',name='Générer un code de transfert'); await gen.click()
    dlg=pg.get_by_role('dialog'); await dlg.wait_for(timeout=15000)
    await pg.screenshot(path=str(D/f'{tag}_1_review.png'))
    t=await dlg.inner_text()
    chk('Transmis' in t and 'Reste privé' in t,f'{tag}: review opens with separated sections')
    chk('DISPO-VETO' not in t and 'buyer@dispo' not in t,f'{tag}: vet/buyer text not shown')
    final=dlg.get_by_role('button',name='Générer le code')
    chk(await final.is_disabled(),f'{tag}: confirmation mandatory')
    if not full:
      chk(not errs,f'{tag}: no runtime errors'); await b.close(); return
    await dlg.get_by_role('button',name='Annuler').click(); await pg.wait_for_timeout(1000)
    base=len(await pg.locator('span.font-mono').all_inner_texts())
    await pg.reload(); await pg.wait_for_timeout(3000)
    chk(len(await pg.locator('span.font-mono').all_inner_texts())==base,'Cancel creates no code')
    await gen.click(); await dlg.wait_for()
    await dlg.get_by_role('checkbox',name='Partager le produit : DISPO-Purevax').click()
    prev=await dlg.get_by_label('Aperçu final').inner_text()
    chk('DISPO-Purevax' in prev and 'DISPO-Typhus' not in prev,'Final preview shows exactly the selection')
    await dlg.get_by_role('checkbox',name='Confirmer les informations transmises').click()
    await final.click(click_count=1); 
    try: await final.click(timeout=500)
    except Exception: pass
    await pg.wait_for_timeout(4000); await pg.screenshot(path=str(D/'d_2_code.png'))
    codes=await pg.locator('span.font-mono').all_inner_texts()
    chk(len(codes)==base+1 and len(codes[0])==32,f'Confirmation (double click) generates exactly one valid code (count={len(codes)} base={base})')
    json.dump({'code':codes[0] if codes else None},open(D/'code.json','w'))
    await gen.click(); await dlg.wait_for()
    subprocess.run(['node','/tmp/browser/review/prep.cjs','modify'],check=True)
    await dlg.get_by_role('checkbox',name='Confirmer les informations transmises').click(); await final.click()
    await pg.wait_for_timeout(4000); await pg.screenshot(path=str(D/'d_3_stale.png'))
    body=await pg.locator('body').inner_text()
    chk('Le dossier a changé depuis votre relecture' in body,'Stale approval shows French re-review message')
    chk(len(await pg.locator('span.font-mono').all_inner_texts())==base+1,'Stale approval created no code')
    chk(not errs,f'desktop: no runtime errors {errs[:1]}')
    await b.close()
async def main():
  await run(1280,1800,'d',True); await run(390,844,'m',False)
  for r in R: print(*r)
asyncio.run(main())
