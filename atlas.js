/* Coordinate-seeded infinite atlas. Only a bounded working set remains alive. */
(() => {
'use strict';
const prepared=new Map(),jobs=new Map(),failed=new Set();let recipeEpoch=0;
const cells=new Map(),origins=new Map(),reveals=new Map(),simulationClocks=new Map(),LIMIT=72;let originSeed=null,coldRestored=false;let cursor=0,columns=0,clock=0,pending=false,active=new Set();
const rowKey=row=>globalThis.MicroLayout?MicroLayout.keyAt(row):`base:${row}`;const rowPosition=key=>globalThis.MicroLayout?MicroLayout.position(key):Number(key.split(':')[1]);const coordinate=(row,col)=>`${rowKey(row)}:${col}`;
function hash(seed,row,col){let n=(seed^Math.imul(row,73856093)^Math.imul(col,19349663))>>>0;n=Math.imul(n^(n>>>16),2246822507);return(n^(n>>>13))>>>0;}
function completeReveal(uid){if(typeof uid!=='string')return;reveals.set(uid,{born:-Infinity,complete:true});globalThis.MicroOffspring?.scheduleFlush?.();}
function reveal(colony,now=performance.now(),duration=420){if(colony.generatedAt===Infinity)return Object.freeze({born:Infinity,complete:false});let entry=reveals.get(colony.uid);if(!entry){entry={born:Number.isFinite(colony.generatedAt)?colony.generatedAt:now,complete:colony.generatedAt===-Infinity};reveals.set(colony.uid,entry);}if(!entry.complete&&now-entry.born>=duration){completeReveal(colony.uid);entry=reveals.get(colony.uid);}return Object.freeze({...entry});}
function generated(colony,now=performance.now()){const entry=reveal(colony,now);return Object.freeze({...colony,generatedAt:entry.complete?-Infinity:entry.born});}
function restoreReveals(uids){if(!Array.isArray(uids)||uids.length>100000)throw new Error('Invalid reveal ledger');for(const uid of uids){if(typeof uid!=='string'||uid.length>180)throw new Error('Invalid reveal identity');reveals.set(uid,{born:-Infinity,complete:true});}}
function reset(clearClocks=true){if(clearClocks){recipeEpoch++;prepared.clear();jobs.clear();failed.clear();}cells.clear();columns=0;pending=false;active=new Set();cursor=0;if(clearClocks)simulationClocks.clear();}
function indexWorld(world){cells.clear();for(const c of world.colonies)cells.set(`${c.rowKey||rowKey(c.tileRow)}:${c.tileCol}`,{id:c.id,used:++clock});}
function initialize(world,w,h){globalThis.MicroOffspring?.records();const savedSeed=globalThis.MicroLayout?.state().seed;if(!coldRestored){coldRestored=true;if(savedSeed!=null&&savedSeed!==world.seed)world=MicroFungus.create(savedSeed);}else if(originSeed!=null&&originSeed!==world.seed&&globalThis.MicroLayout){MicroLayout.restore({...MicroLayout.state(),seed:world.seed});globalThis.MicroOffspring?.flush();}const cols=MicroView.geometry(w,h).columns,homeColumns=globalThis.MicroLayout?.state().homeColumns||cols;if(originSeed!==world.seed){originSeed=world.seed;origins.clear();}if(columns===cols&&cells.size&&world.colonies.every(c=>typeof c.rowKey==='string'))return world;reset(false);columns=cols;const colonies=world.colonies.map((c,i)=>{const key=c.rowKey||`base:${c.tileRow??Math.floor(i/homeColumns)}`,row=rowPosition(key),col=c.tileCol??i%homeColumns;if(c.tileRow===undefined&&!c.derivation)origins.set(`${key}:${col}`,{factorySeed:world.seed,specimenIndex:c.specimenIndex??c.id,uid:c.uid||`reference-${world.seed}-${c.seed}-${c.specimenIndex??c.id}`});return generated(globalThis.MicroOffspring?.find(row,col,c.id,world.time)||Object.freeze({...c,rowKey:key,uid:c.uid||`reference-${world.seed}-${c.seed}-${c.specimenIndex??c.id}`,tileRow:row,tileCol:col}));});const next=Object.freeze({...world,colonies:Object.freeze(colonies)});indexWorld(next);return next;}
function insert(world,row,col,pinned,preparedColony=null){const key=coordinate(row,col),existing=cells.get(key);if(existing){existing.used=++clock;return {world,id:existing.id};}let id=world.colonies.length;if(id>=LIMIT){const victim=[...cells.entries()].filter(([,v])=>v.id!==pinned&&!active.has(v.id)).sort((a,b)=>a[1].used-b[1].used)[0];if(!victim)return {world,id:-1};cells.delete(victim[0]);id=victim[1].id;globalThis.MicroOffspring?.retain(world.colonies[id]);MicroRender.evict?.(id);}const archived=globalThis.MicroOffspring?.find(row,col,id,world.time);if(archived){const colonies=[...world.colonies];colonies[id]=generated(archived);cells.set(key,{id,used:++clock});return {world:Object.freeze({...world,colonies:Object.freeze(colonies)}),id};}const logical=rowKey(row);let logicalHash=0;for(const char of logical)logicalHash=Math.imul(logicalHash,31)+char.charCodeAt(0);const tileSeed=hash(world.seed,logicalHash,col),origin=origins.get(key),specimenIndex=origin?.specimenIndex??tileSeed%25,raw=preparedColony||MicroFungus.createColony(origin?.factorySeed??tileSeed,specimenIndex,world.time),offset=(id-specimenIndex)*100000,remap=n=>n==null?n:n+offset;
const colony=generated(Object.freeze({...raw,id,uid:origin?.uid||`reference-${world.seed}-${tileSeed}-${specimenIndex}`,specimenIndex,nextId:remap(raw.nextId),segments:Object.freeze(raw.segments.map(s=>Object.freeze({...s,id:remap(s.id),parentId:remap(s.parentId),targetId:remap(s.targetId)}))),tips:Object.freeze(raw.tips.map(t=>Object.freeze({...t,id:remap(t.id),segmentId:remap(t.segmentId)}))),rowKey:rowKey(row),tileRow:row,tileCol:col,generatedAt:performance.now()}));const colonies=[...world.colonies];colonies[id]=colony;cells.set(key,{id,used:++clock});return {world:Object.freeze({...world,colonies:Object.freeze(colonies)}),id};}
// Prefer dormant slots; if the viewport fills the cache, reserve its farthest tile.
// Identity and offspring recipes survive renderer eviction; both parents stay pinned.
function mergeSlot(world,parentAId,parentBId){
 if(world.colonies.length<LIMIT)return world.colonies.length;
 const target=world.colonies[parentBId];
 const candidates=[...cells.values()].filter(cell=>cell.id!==parentAId&&cell.id!==parentBId);
 candidates.sort((a,b)=>Number(active.has(a.id))-Number(active.has(b.id))||
  Math.hypot(world.colonies[b.id].tileRow-target.tileRow,world.colonies[b.id].tileCol-target.tileCol)-Math.hypot(world.colonies[a.id].tileRow-target.tileRow,world.colonies[a.id].tileCol-target.tileCol)||a.used-b.used);
 return candidates[0]?.id??-1;
}
function prepareMerge(world,parentAId,parentBId,preparedChild=null){
 const a=world.colonies[parentAId],b=world.colonies[parentBId];if(!a||!b||parentAId===parentBId||!globalThis.MicroOffspring||!globalThis.MicroLayout)return {world,id:-1,error:'invalid-parents'};
 const id=preparedChild?.id??mergeSlot(world,parentAId,parentBId);if(id<0)return {world,id:-1,error:'busy'};
 const row=b.tileRow+1,nonce=MicroOffspring.records().length,child=preparedChild||MicroOffspring.create(a,b,{id,time:world.time,tileRow:row,tileCol:b.tileCol,nonce}),key=`insert:${child.uid}`,layoutBefore=MicroLayout.state(),layoutAfter=Object.freeze({...MicroLayout.insertBelow(b.rowKey||rowKey(b.tileRow),key,layoutBefore,world.seed),homeColumns:layoutBefore.homeColumns||columns});
 const reservation={before:world,child:Object.freeze({...child,rowKey:key,generatedAt:Infinity}),row,rowKey:key,layoutBefore,layoutAfter,id,parentAId,parentBId};return {world:previewMerge(reservation,0),reservation,id};
}
async function prepareMergeAsync(world,parentAId,parentBId,options={}){
 const a=world.colonies[parentAId],b=world.colonies[parentBId];if(!a||!b||parentAId===parentBId||!globalThis.MicroOffspring||!globalThis.MicroLayout)return {world,id:-1,error:'invalid-parents'};
 const id=mergeSlot(world,parentAId,parentBId);if(id<0)return {world,id:-1,error:'busy'};
 const layout=MicroLayout.state(),child=await MicroOffspring.createAsync(a,b,{id,time:world.time,tileRow:b.tileRow+1,tileCol:b.tileCol,nonce:MicroOffspring.records().length,signal:options.signal,onTask:options.onTask});if(layout!==MicroLayout.state())return {world,id:-1,error:'stale-transaction'};return prepareMerge(world,parentAId,parentBId,child);
}
function previewMerge(reservation,progress){const p=Math.max(0,Math.min(1,progress)),colonies=reservation.before.colonies.map(c=>Object.freeze({...c,tileRow:c.tileRow>=reservation.row?c.tileRow+p:c.tileRow}));colonies[reservation.id]=reservation.child;return Object.freeze({...reservation.before,colonies:Object.freeze(colonies)});}
function commitMerge(reservation,born=performance.now()){const preview=previewMerge(reservation,1),colonies=[...preview.colonies];const child=generated(Object.freeze({...reservation.child,generatedAt:born}),born);colonies[reservation.id]=child;const world=Object.freeze({...preview,colonies:Object.freeze(colonies)});const victim=reservation.before.colonies[reservation.id];if(victim)MicroOffspring.retain(victim);MicroLayout.restore(reservation.layoutAfter);MicroOffspring.save(child);indexWorld(world);MicroRender.evict?.(child.id);return {world,id:child.id,storageError:MicroOffspring.storageError()};}
function cancelMerge(reservation){if(!MicroOffspring.records().some(r=>r.uid===reservation.child.uid)&&reveals.delete(reservation.child.uid))MicroOffspring.scheduleFlush?.();indexWorld(reservation.before);return reservation.before;}
function offspring(world,a,b){const result=prepareMerge(world,a,b);return result.reservation?commitMerge(result.reservation):result;}
function ensure(world,w,h,camera,pinned){world=initialize(world,w,h);const l=MicroView.geometry(w,h),toX=x=>w/2+(x-w/2-camera.panX)/camera.zoom,toY=y=>h/2+(y-h/2-camera.panY)/camera.zoom;const c0=Math.floor((toX(0)-l.left)/l.gap),c1=Math.floor((toX(w)-l.left)/l.gap),r0=Math.floor((toY(0)-l.top)/l.gap),r1=Math.floor((toY(h)-l.top)/l.gap);active=new Set();const visible=[];for(let row=r0;row<=r1;row++)for(let col=c0;col<=c1;col++)visible.push({row,col,d:Math.hypot(row-(r0+r1)/2,col-(c0+c1)/2)});
 // Admit a stable, centered working set before issuing any worker requests.
 // A pinned selection occupies one slot even when it lies outside this viewport.
 visible.sort((a,b)=>a.d-b.d||a.row-b.row||a.col-b.col);
 const pinnedColony=world.colonies[pinned],pinnedKey=pinnedColony?coordinate(pinnedColony.tileRow,pinnedColony.tileCol):null;
 const admitted=visible.filter(tile=>coordinate(tile.row,tile.col)!==pinnedKey).slice(0,LIMIT-(pinnedColony?1:0));
 if(pinnedColony&&visible.some(tile=>coordinate(tile.row,tile.col)===pinnedKey))admitted.unshift({row:pinnedColony.tileRow,col:pinnedColony.tileCol,d:0});
 const missing=[];for(const tile of admitted){const cell=cells.get(coordinate(tile.row,tile.col));if(cell){active.add(cell.id);cell.used=++clock;}else missing.push(tile);}
 const start=performance.now();let count=0;for(const tile of missing){if(count>=4||performance.now()-start>3)break;const key=coordinate(tile.row,tile.col);let raw=null;
 if(globalThis.MicroGeneration&&!MicroGeneration.stats().error){if(failed.has(key))continue;raw=prepared.get(key);if(!raw){if(!jobs.has(key)&&jobs.size<8){let logicalHash=0;for(const char of rowKey(tile.row))logicalHash=Math.imul(logicalHash,31)+char.charCodeAt(0);const seed=hash(world.seed,logicalHash,tile.col),origin=origins.get(key),epoch=recipeEpoch;const promise=MicroGeneration.request(origin?.factorySeed??seed,origin?.specimenIndex??seed%25,world.time);jobs.set(key,promise);promise.then(colony=>{if(epoch!==recipeEpoch)return;prepared.set(key,colony);if(prepared.size>72)prepared.delete(prepared.keys().next().value);}).catch(error=>{if(epoch!==recipeEpoch)return;failed.add(key);console.error('Specimen generation failed',error);globalThis.dispatchEvent?.(new Event('microgenerationerror'));}).finally(()=>{if(jobs.get(key)===promise)jobs.delete(key);globalThis.dispatchEvent?.(new Event('microgeneration'));});}continue;}prepared.delete(key);}
 const result=insert(world,tile.row,tile.col,pinned,raw);world=result.world;if(result.id>=0){active.add(result.id);count++;}}pending=missing.filter(tile=>!failed.has(coordinate(tile.row,tile.col))).length>count;return world;}
function hitTest(world,x,y,w,h,camera){const l=MicroView.geometry(w,h),px=w/2+(x-w/2-camera.panX)/camera.zoom,py=h/2+(y-h/2-camera.panY)/camera.zoom;return cells.get(coordinate(Math.floor((py-l.top)/l.gap),Math.floor((px-l.left)/l.gap)))?.id??-1;}
function neighbor(world,id,delta){const c=world.colonies[id]||world.colonies[0],movement=typeof delta==='number'?{row:0,col:delta}:delta;return insert(world,c.tileRow+movement.row,c.tileCol+movement.col,id);}
function advance(world,dt,pinned){
 const elapsed=Math.max(0,Math.min(.125,Number.isFinite(dt)?dt:0));if(!elapsed)return world;
 const end=world.time+elapsed,available=[...active].filter(id=>id!==pinned),ids=new Set();
 for(let i=0;i<Math.min(8,available.length);i++)ids.add(available[(cursor+i)%available.length]);
 cursor=available.length?(cursor+8)%available.length:0;if(Number.isInteger(pinned)&&pinned>=0)ids.add(pinned);
 const residents=new Set(world.colonies.map(colony=>colony.uid));for(const uid of simulationClocks.keys())if(!residents.has(uid))simulationClocks.delete(uid);
 const colonies=world.colonies.map(colony=>{
  const previous=simulationClocks.get(colony.uid)||{at:world.time,debt:0};
  const debt=Math.min(.5,previous.debt+((active.has(colony.id)||colony.id===pinned)?elapsed:0));
  if(!ids.has(colony.id)){simulationClocks.set(colony.uid,{...previous,debt});return colony;}
  const step=Math.min(.125,debt),shift=end-previous.at-step;
  const rebased=Math.abs(shift)>1e-10?Object.freeze({...colony,clockOffset:(colony.clockOffset||0)+shift,
   segments:Object.freeze(colony.segments.map(segment=>Object.freeze({...segment,born:segment.born+shift,lastUpdated:segment.lastUpdated+shift}))),
   ...(colony.tips?{tips:Object.freeze(colony.tips.map(tip=>Object.freeze({...tip,branchAt:tip.branchAt+shift})))}:{}),
   ...(colony.layers?{layers:Object.freeze(colony.layers.map(layer=>Number.isFinite(layer.pigmentStarted)?Object.freeze({...layer,pigmentStarted:layer.pigmentStarted+shift}):layer))}:{})}):colony;
  const evolved=step?MicroFungus.advance({seed:world.seed,time:end-step,colonies:[rebased]},step).colonies[0]:rebased;
  simulationClocks.set(colony.uid,{at:end,debt:Math.max(0,debt-step)});return evolved;
 });
 return Object.freeze({...world,time:end,colonies:Object.freeze(colonies)});
}

globalThis.MicroAtlas=Object.freeze({ensure,hitTest,neighbor,advance,reset,reveal,completeReveal,restoreReveals,revealState:()=>[...reveals].filter(([,v])=>v.complete).map(([uid])=>uid),offspring,prepareMerge,prepareMergeAsync,previewMerge,commitMerge,cancelMerge,at:insert,focus:ids=>{active=new Set(ids);pending=false;},pending:()=>pending,limit:LIMIT});
})();
