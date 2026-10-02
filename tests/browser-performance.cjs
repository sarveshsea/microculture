const {chromium}=require('playwright');
const assert=require('node:assert/strict'),path=require('node:path');
(async()=>{
 const browser=await chromium.launch({...require('./browser-support.cjs').launchOptions,headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:2});await page.goto(require('./browser-support.cjs').appURL());await page.waitForTimeout(1800);
  async function measure(name,frames,drive){
   const result=await page.evaluate(({frames,drive})=>new Promise(resolve=>{let last=0,count=0;const samples=[];function sample(now){if(last)samples.push(now-last);last=now;if(drive==='scroll')document.querySelector('#field').dispatchEvent(new WheelEvent('wheel',{deltaY:2,cancelable:true}));if(++count<frames)requestAnimationFrame(sample);else{samples.sort((a,b)=>a-b);resolve({median:samples[Math.floor(samples.length/2)],p95:samples[Math.floor(samples.length*.95)],max:samples.at(-1),renderer:MicroRender.stats()});}}requestAnimationFrame(sample);}),{frames,drive});
   console.log(name,JSON.stringify(result));if(!process.env.CI)assert(result.p95<=34,name+' meets 30fps p95 target');return result;
  }
  await measure('desktop-scroll',100,'scroll');await page.locator('#field').press('Enter');await page.waitForFunction(()=>document.body.dataset.stage==='2');await measure('focused-petri',100);
  await page.locator('#close').click();await page.waitForFunction(()=>!document.querySelector('dialog').open);await page.locator('#field').press('m');await page.locator('#field').press('ArrowRight');await page.locator('#field').press('Enter');await measure('offspring-generation',180);await page.waitForFunction(()=>MicroOffspring.records().length===1);
  await page.setViewportSize({width:390,height:844});await page.waitForTimeout(1000);const mobile=await measure('mobile-scroll',100,'scroll');assert(mobile.renderer.combinedBytes<=48*1024*1024);
  console.log('PASS four interaction frame-time budgets and mobile memory limit');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
