const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const {launchOptions,appURL}=require('./browser-support.cjs');
(async()=>{
 const browser=await chromium.launch({...launchOptions,headless:true});
 try {
  const page=await browser.newPage({viewport:{width:1920,height:1080}}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto(appURL());await page.waitForFunction(()=>!document.querySelector('#play').disabled);
  await page.locator('#play').click();await page.waitForTimeout(3500);
  await page.locator('#field').focus();
  for(let n=1;n<=3;n++){
   await page.keyboard.press('m');await page.keyboard.press('ArrowRight');await page.keyboard.press('Enter');
   await page.waitForFunction(count=>MicroOffspring.records().length===count,n,{timeout:15000});
   assert.equal(await page.locator('#dish').evaluate(element=>element.open),false);
   assert.equal(await page.locator('#merge-toggle').getAttribute('aria-busy'),null);
  }
  const identities=await page.evaluate(()=>MicroOffspring.records().map(record=>record.uid));
  assert.equal(new Set(identities).size,3);
  await page.waitForTimeout(150);await page.reload();await page.waitForFunction(()=>!document.querySelector('#play').disabled);
  assert.deepEqual(await page.evaluate(()=>MicroOffspring.records().map(record=>record.uid)),identities);
  await page.locator('#field').focus();await page.keyboard.press('m');await page.keyboard.press('ArrowRight');await page.keyboard.press('Enter');
  await page.waitForFunction(()=>MicroOffspring.records().length===4,null,{timeout:15000});
  assert.deepEqual(errors,[]);console.log('PASS repeated merges with full viewport cache and reload');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
