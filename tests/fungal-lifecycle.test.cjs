const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const c=vm.createContext({});for(const file of ['colors.js','biology.js','genetics.js','field.js','fungal.js'])vm.runInContext(fs.readFileSync(__dirname+'/../'+file,'utf8'),c);
const F=c.MicroFungus;
function fixture(){const k=F.createColony(8),t=k.tips[0],s=k.segments.find(s=>s.id===t.segmentId);return {k,t,s};}
function step(k){return F.advance({seed:8,time:0,colonies:[k]},.125).colonies[0];}
test('segment continuation preserves tip curvature',()=>{const {k,t,s}=fixture();const b=step({...k,segments:[s],tips:[{...t,length:.04,branchAt:999,curvature:.8}]});const next=b.tips.find(x=>x.segmentId!==s.id&&x.lineage===t.lineage);assert.ok(Number.isFinite(next.curvature)&&next.curvature>.65);});
test('rim travel measures actual extension rather than requested speed',()=>{const {k,t,s}=fixture();const b=step({...k,segments:[{...s,x:.88,y:0,xx:.88,yy:0,born:0}],tips:[{...t,x:.88,y:0,angle:0,length:.034,branchAt:999,curvature:0}],nutrients:Array(256).fill(1)});assert.ok(b.tips.some(x=>x.segmentId===s.id),'tiny tangential rim movement must not create a continuation');});
test('starved tips slow instead of extending at a fixed twenty percent floor',()=>{const {k,t,s}=fixture();const base={...k,segments:[{...s,born:0}],tips:[{...t,length:0,branchAt:999}],activator:Array(256).fill(0)};const rich=step({...base,nutrients:Array(256).fill(1)}),poor=step({...base,nutrients:Array(256).fill(0)});const distance=b=>Math.hypot(b.segments[0].xx-s.xx,b.segments[0].yy-s.yy);assert.ok(distance(poor)<distance(rich)*.05);});
test('capacity retirement recycles old tissue while keeping populations bounded',()=>{const {k,t,s}=fixture();const tissue=Array.from({length:400},(_,i)=>({...s,id:1000+i,parentId:null,born:0,x:s.x,y:s.y,xx:s.xx,yy:s.yy}));const tip={...t,id:1000,segmentId:1000,branchAt:999,length:0};const nutrients=Array(256).fill(.4),activator=Array(256).fill(0);const base=c.MicroField.advance(nutrients,activator,.125,k.id);const b=step({...k,nextId:2000,segments:tissue,tips:[tip],nutrients,activator});assert.ok(b.nutrients.reduce((a,x)=>a+x,0)>base.u.reduce((a,x)=>a+x,0));assert.ok(b.segments.length<=400&&b.tips.length>=50);});
test('full networks retire an inactive leaf to preserve short continuations',()=>{const {k,t,s}=fixture();const tissue=Array.from({length:400},(_,i)=>({...s,id:1000+i,parentId:i===0?null:1000,born:0,x:s.x,y:s.y,xx:s.xx,yy:s.yy}));const tip={...t,id:1000,segmentId:1000,branchAt:999,length:.04,curvature:.7};const b=step({...k,nextId:2000,segments:tissue,tips:[tip]});assert.ok(!b.tips.some(x=>x.segmentId===1000),'full budget must still advance to a fresh short segment');assert.ok(b.segments.some(x=>x.parentId===1000&&x.id>=2000));assert.ok(b.segments.some(x=>x.id===1000),'living root survives retirement');assert.ok(b.segments.length<=400);});
test('senescent tissue loses contrast tightly and retires before a long ghost tail',()=>{
  const segment={born:0,lifespan:40};
  assert.equal(F.health(segment,12),1);
  assert.ok(F.health(segment,30)<.25,'old tissue must not retain a broad translucent haze');
  assert.equal(F.health(segment,39),0,'nearly exhausted tissue should release its slot');
  const samples=Array.from({length:81},(_,i)=>F.health(segment,i*.5));
  assert.ok(samples.every((value,i)=>value>=0&&value<=1&&(i===0||value<=samples[i-1])));
});
test('founder growth has balanced directions rather than a global rightward drift',()=>{
  let x=0,y=0,total=0;
  for(let id=0;id<30;id++){
    const colony=F.createColony(9181+id*997,id);
    for(const tip of colony.tips){x+=Math.cos(tip.angle);y+=Math.sin(tip.angle);total++;}
  }
  assert.ok(Math.hypot(x,y)/total<.1,'independent founder headings cover the full circle');
});
test('expired tissue is recycled once and its surviving active tips remain connected',()=>{
  const {k,t,s}=fixture();const stale={...s,id:s.id+900000,parentId:null,born:-100};
  const before=JSON.stringify(k);
  const b=step({...k,segments:[s,stale],tips:[{...t,branchAt:999}],nextId:stale.id+1});
  assert.ok(!b.segments.some(x=>x.id===stale.id));
  const ids=new Set(b.segments.map(x=>x.id));
  assert.ok(b.tips.every(x=>ids.has(x.segmentId)));
  assert.equal(JSON.stringify(k),before,'turnover preserves the input specimen');
});
