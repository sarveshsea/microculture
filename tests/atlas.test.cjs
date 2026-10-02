const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');const c=vm.createContext({performance:{now:()=>0},MicroRender:{reset:()=>{}}});for(const file of ['colors','biology','genetics','field','fungal','view','atlas'])vm.runInContext(fs.readFileSync(`${__dirname}/../${file}.js`,'utf8'),c);const A=c.MicroAtlas,F=c.MicroFungus;
test('infinite coordinates populate and eviction keeps a bounded working set',()=>{A.reset();let w=F.create(81);for(let i=0;i<90;i++)w=A.ensure(w,1440,1000,{zoom:1,panX:i*320,panY:i*200},12);assert.ok(w.colonies.length>25);assert.ok(w.colonies.length<=72);assert.equal(w.colonies[12].id,12);assert.ok(w.colonies.some(x=>x.tileRow<0||x.tileCol<0));const ids=w.colonies.flatMap(x=>x.segments.map(s=>s.id));assert.equal(new Set(ids).size,ids.length);assert.ok(w.colonies.every(x=>x.layers.length===25));});
test('new neighbor coordinates generate without wrapping back to the first25',()=>{A.reset();let w=A.ensure(F.create(1),1440,1000,{zoom:1,panX:0,panY:0},12);let id=24;for(let i=0;i<15;i++){const result=A.neighbor(w,id,1);w=result.world;id=result.id;}assert.ok(w.colonies[id].tileCol>=5);assert.ok(w.colonies.length<=72);});
test('selection survives responsive resize and two-dimensional neighbors do not alias',()=>{A.reset();let w=A.ensure(F.create(4),1440,1000,{zoom:1,panX:0,panY:0},12);let result=A.neighbor(w,24,{row:0,col:10});w=result.world;const selected=result.id,original=w.colonies[selected];w=A.ensure(w,390,844,{zoom:1,panX:0,panY:0},selected);assert.equal(w.colonies[selected].tileCol,original.tileCol);result=A.neighbor(w,selected,{row:-1,col:0});assert.equal(result.world.colonies[result.id].tileRow,original.tileRow-1);assert.equal(result.world.colonies[result.id].tileCol,original.tileCol);});
test('generation reveal survives cache eviction without replaying a completed birth',()=>{A.reset();let w=A.ensure(F.create(81),1440,1000,{zoom:1,panX:0,panY:0},12);const colony=w.colonies[0];assert.ok(Number.isFinite(colony.generatedAt));const uid=colony.uid;A.completeReveal(uid);for(let i=0;i<100;i++)w=A.ensure(w,1440,1000,{zoom:1,panX:i*400,panY:0},12);const restored=A.at(w,0,0,12);assert.equal(restored.world.colonies[restored.id].uid,uid);assert.equal(A.reveal(restored.world.colonies[restored.id],0).complete,true);assert.equal(restored.world.colonies[restored.id].generatedAt,-Infinity);});
test('reserved offspring never starts generation or writes a reveal ledger entry',()=>{const reserved={uid:'offspring-reserved',generatedAt:Infinity};assert.equal(A.reveal(reserved,1234).born,Infinity);assert.equal(A.reveal(reserved,1234).complete,false);assert.ok(!A.revealState().includes(reserved.uid));const released={...reserved,generatedAt:2000};assert.equal(A.reveal(released,2000).born,2000);assert.equal(A.reveal(released,2000).complete,false);});

test('batched visible colonies receive skipped elapsed time rather than aging without growth',()=>{
 const calls=[];const context=vm.createContext({performance:{now:()=>0},MicroFungus:{advance:(world,dt)=>{calls.push(dt);return {...world,time:world.time+dt,colonies:world.colonies.map(colony=>({...colony,distance:colony.distance+dt}))};}}});
 vm.runInContext(fs.readFileSync(`${__dirname}/../atlas.js`,'utf8'),context);const atlas=context.MicroAtlas;
 let world={seed:1,time:0,colonies:Array.from({length:25},(_,id)=>({id,uid:`clock-${id}`,distance:0,segments:[{born:0,lastUpdated:0}]}))};
 atlas.focus(world.colonies.map(colony=>colony.id));for(let i=0;i<100;i++)world=atlas.advance(world,.01,-1);
 assert.ok(world.colonies.every(colony=>colony.distance>.96));assert.ok(calls.every(dt=>dt<=.125));
});
test('dormant colonies preserve biological age when focused again and high-speed debt stays bounded',()=>{
 const context=vm.createContext({performance:{now:()=>0},MicroFungus:{advance:(world,dt)=>({...world,time:world.time+dt,colonies:world.colonies.map(colony=>({...colony,distance:colony.distance+dt}))})}});
 vm.runInContext(fs.readFileSync(`${__dirname}/../atlas.js`,'utf8'),context);const atlas=context.MicroAtlas;
 let world={seed:1,time:0,colonies:Array.from({length:25},(_,id)=>({id,uid:`dormant-${id}`,distance:0,segments:[{born:0,lastUpdated:0}],tips:[{branchAt:3}],layers:[{pigmentStarted:0}]}))};
 atlas.focus([0]);for(let i=0;i<80;i++)world=atlas.advance(world,.125,0);atlas.focus([1]);world=atlas.advance(world,.01,1);
 assert.ok(world.time-world.colonies[1].segments[0].born<.02);assert.ok(world.colonies[1].tips[0].branchAt>12.99);assert.ok(world.colonies[1].layers[0].pigmentStarted>9.99);assert.ok(world.colonies[1].clockOffset>9.99);
 atlas.focus(world.colonies.map(colony=>colony.id));for(let i=0;i<200;i++)world=atlas.advance(world,.125,-1);
 const before=world;assert.equal(atlas.advance(world,0,-1),before);assert.ok(world.colonies.every(colony=>world.time-colony.segments[0].born-colony.distance<.51));
});
test('renderer slot reuse never carries the evicted identity clock into a new specimen',()=>{
 const context=vm.createContext({performance:{now:()=>0},MicroFungus:{advance:(world,dt)=>({...world,time:world.time+dt,colonies:world.colonies})}});
 vm.runInContext(fs.readFileSync(`${__dirname}/../atlas.js`,'utf8'),context);const atlas=context.MicroAtlas;
 let world={seed:1,time:0,colonies:[{id:0,uid:'old-slot',segments:[{born:0,lastUpdated:0}]}]};atlas.focus([0]);world=atlas.advance(world,.1,0);
 world={...world,time:10,colonies:[{id:0,uid:'new-slot',segments:[{born:10,lastUpdated:10}]}]};world=atlas.advance(world,.1,0);
 assert.equal(world.colonies[0].segments[0].born,10);assert.ok(world.time-world.colonies[0].segments[0].born<.101);
});

test('oversized viewports settle instead of retrying tiles beyond cache admission',()=>{
 A.reset();let world=F.create(81);
 const camera={zoom:1.08,panX:0,panY:0};
 for(let n=0;n<60;n++)world=A.ensure(world,1920,1080,camera,12);
 assert.equal(world.colonies.length,A.limit);assert.equal(A.pending(),false);
 const identities=world.colonies.map(colony=>colony.uid);
 for(let n=0;n<10;n++)world=A.ensure(world,1920,1080,camera,12);
 assert.deepEqual(world.colonies.map(colony=>colony.uid),identities);
});

test('explicit neighbor navigation works when every cached slot is active',()=>{
 A.reset();let world=A.ensure(F.create(11),1440,1000,{zoom:1,panX:0,panY:0},12);
 for(let col=20;world.colonies.length<A.limit;col++)world=A.at(world,50,col,12).world;
 A.focus(world.colonies.map(colony=>colony.id));const parent=world.colonies[12];
 const next=A.neighbor(world,12,{row:0,col:100});
 assert.ok(next.id>=0);assert.notEqual(next.id,12);
 assert.equal(next.world.colonies[next.id].tileCol,parent.tileCol+100);
 assert.equal(next.world.colonies[12].uid,parent.uid);assert.equal(next.world.colonies.length,A.limit);
});
