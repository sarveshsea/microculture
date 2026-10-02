/* Accelerated artistic mycelium, not a species-calibrated biological prediction.
   Apical extension, lateral branching and compatible anastomosis:
   https://pmc.ncbi.nlm.nih.gov/articles/PMC7035296/
   Hyphal exploration and fusion microscopy: https://pmc.ncbi.nlm.nih.gov/articles/PMC10964749/
   Resource-dependent growth and old-tissue turnover are qualitative approximations.
   Pigment inheritance is artistic; different colors are compatible founder lineages. */
(() => {
  'use strict';
  const M=MicroModel,C=MicroColor,E=globalThis.MicroGenetics||globalThis.MicroEvolution,F=Object.freeze;
  const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
  const GRID=16,RADIUS=.88,MAX_SEGMENTS=400,MAX_TIPS=72;
  function contained(x,y){const d=Math.hypot(x,y),k=d>RADIUS?RADIUS/d:1;return {x:x*k,y:y*k};}
  function nutrientIndex(x,y){return clamp(Math.floor((y+1)*GRID/2),0,GRID-1)*GRID+clamp(Math.floor((x+1)*GRID/2),0,GRID-1);}
  function pigment(spec,reference=null,legacy=false){
    const r=M.random(spec.seed),hue=(spec.hue+360)%360,lightness=.61+r()*.055;
    return E.create(spec.seed,{lightness,chroma:C.ceiling(lightness,hue)*(.48+r()*.18),hue},reference,{preserveReference:legacy});
  }
  function edge(id,parentId,lineage,generation,x,y,xx,yy,born,genome,random,depth=null){
    const p=contained(xx,yy),z=depth?.zz??(random()-.5)*.24;
    const basePhase=depth?.basePhase??random()*Math.PI*2,pitch=genome.pitch??depth?.pitch??(8+random()*12);
    const amplitude=depth?.amplitude??(.025+random()*.04),startPhase=depth?.phase??basePhase;
    const baseZ=depth?.baseZ??z-amplitude*Math.sin(startPhase);
    const phase=startPhase+Math.hypot(p.x-x,p.y-y)*pitch,zz=baseZ+amplitude*Math.sin(phase);
    return F({id,parentId,lineage,generation,x,y,xx:p.x,yy:p.y,previousXX:p.x,previousYY:p.y,
      z,zz,previousZZ:zz,baseZ,basePhase,phase,pitch,amplitude,
      born,lastUpdated:born,lifespan:genome.lifespan??38+genome.longevity*37,genome,width:.003+random()*.003,
      flowSpeed:.02+random()*.025});
  }
  function tip(segment,angle,branchAt){return F({id:segment.id,segmentId:segment.id,x:segment.xx,y:segment.yy,z:segment.zz,
    angle,lineage:segment.lineage,generation:segment.generation,genome:segment.genome,branchAt,length:0});}
  function bootstrap(spec,lineages,legacy=false){
    const segments=[],tips=[];let nextId=spec.id*100000;
    const r=M.random(spec.seed);
    const spread=.08+r()*.18,legacyBranchChance=legacy ? .12+r()*.16 : 0;
    for(let lineage=0;lineage<lineages.length;lineage++){
      const r=M.random(spec.layers[lineage].seed);
      const genome=lineages[lineage],branchChance=legacy?legacyBranchChance:.08+genome.branchingRate*.65;const angle=r()*Math.PI*2,radius=Math.sqrt(r())*(spread+.08)*(legacy?1:.7+genome.cohesion*.3);
      let walkers=[{x:Math.cos(angle)*radius,y:Math.sin(angle)*radius,
        angle:r()*Math.PI*2,parentId:null,generation:0,curvature:(r()-.5)*2}];
      const budget=legacy?8+Math.floor(r()*5):8+Math.floor(r()*3+genome.branching*2);
      for(let n=0;n<budget;n++){
        const i=Math.floor(r()*walkers.length),node=walkers[i];
        const curvature=node.curvature*.85+(r()-.5)*.8;
        const a=node.angle+curvature*.24+(r()-.5)*.3;
        const length=(.012+Math.pow(r(),1.5)*.055)*(legacy?1:clamp(genome.growthRate/.02,.55,1.6));
        const segment=edge(nextId++,node.parentId,lineage,node.generation,node.x,node.y,
          node.x+Math.cos(a)*length,node.y+Math.sin(a)*length,-12+r()*11,lineages[lineage],r,node.depth);
        segments.push(segment);
        const next={x:segment.xx,y:segment.yy,angle:a,parentId:segment.id,generation:node.generation,curvature,depth:segment};
        walkers[i]=next;
        if(walkers.length<2&&(r()<branchChance||n>budget*.65)){
          walkers.push({...next,angle:a+(r()<.5?-1:1)*(.25+r()*1.15),generation:node.generation+1,curvature:(r()-.5)*2});
        }
      }
      for(const node of walkers){const segment=edge(nextId++,node.parentId,lineage,node.generation,node.x,node.y,node.x,node.y,0,lineages[lineage],r,node.depth);segments.push(segment);tips.push(F({...tip(segment,node.angle,.5+r()*8),curvature:node.curvature}));}
    }
    return {segments:F(segments),tips:F(tips),nextId};
  }
  function founderSeed(seed,id){const index=((id%25)+25)%25,base=Math.floor(index/5)*20+(index%5)*2,r=M.random(seed);for(let n=0;n<base*6+1;n++)r();return Math.floor(r()*1e9);}
  function createLayers(seed,id=0,options={}){
    const sourceSeed=founderSeed(seed,id);
    const index=((id%25)+25)%25,row=Math.floor(index/5),col=index%5,base=row*20+col*2;
    const families=[[195,280,18],[225,315,150],[250,175,345]],hues=families[((id%3)+3)%3];
    const layers=F(Array.from({length:25},(_,layerId)=>{
      const layerSeed=(sourceSeed+Math.imul(layerId+1,104729))>>>0;
      const r=M.random(layerSeed),family=layerId%3;
      if(options.metadataOnly)return F({id:layerId,seed:layerSeed,family,activity:.8,population:0,fusions:0});
      const references=globalThis.MicroSources?.get(index)?.references;
      const reference=references?.[layerId%references.length]||null;
      const genome=pigment({seed:layerSeed,hue:hues[family]+(r()-.5)*24},reference,options.legacy);
      return F({id:layerId,seed:layerSeed,family,genome,activity:.8,population:0,
        growthRate:genome.growthRate,branching:genome.branchingRate,fusions:0});
    }));
    return layers;
  }
  function createColony(seed,id=0,time=0,options={}){
    const sourceSeed=founderSeed(seed,id),index=((id%25)+25)%25,row=Math.floor(index/5),col=index%5,base=row*20+col*2;
    if(options.layers&&(options.layers.length!==25||options.layers.some(l=>!l.genome?.sequence||!Number.isFinite(l.genome.growthRate))))throw new TypeError('Bootstrap requires 25 valid final genome layers');
    const layers=!options.legacy&&options.layers?F(options.layers.map((l,i)=>F({activity:.8,population:0,fusions:0,...l,id:i,growthRate:l.genome.growthRate,branching:l.genome.branchingRate}))):createLayers(seed,id,{legacy:options.legacy});
    const sourceIds=F(layers.map(l=>l.seed)),lineages=F(layers.map(l=>l.genome));
    const genome=lineages[0];
    const spec={id,row,col,seed:sourceSeed,size:1,hue:genome.hue,genome,lineages,sourceIds,layers};
    const r=M.random(spec.seed+101),nutrients=F(Array.from({length:GRID*GRID},()=>.78+r()*.22));
    const topology=bootstrap(spec,lineages,options.legacy);
    const shifted=time===0?topology:{...topology,
      segments:F(topology.segments.map(segment=>F({...segment,born:segment.born+time,lastUpdated:segment.lastUpdated+time}))),
      tips:F(topology.tips.map(tip=>F({...tip,branchAt:tip.branchAt+time})))};
    const populated=F(layers.map(l=>F({...l,population:topology.segments.filter(s=>s.lineage===l.id).length})));
    return F({...spec,...shifted,layers:populated,nutrients,activator:F(Array.from({length:GRID*GRID},()=>.04+r()*.08)),generation:5,genomicGeneration:0,revision:0,clockOffset:time,generationTrace:F({version:options.legacy?'legacy-topology-v1':'topology-genome-v2',seed,layerFingerprints:F(layers.map(l=>E.fingerprint(l.genome.sequence))),layerSeeds:F(layers.map(l=>l.seed))})});
  }
  function create(seed){
    return F({seed,time:0,colonies:F(Array.from({length:25},(_,id)=>createColony(seed,id)))});
  }
  function health(segment,time){
    // Healthy tissue holds its pigment; senescence clears compactly instead of
    // leaving a long low-opacity population of old filaments and moss grains.
    const age=clamp((time-segment.born)/segment.lifespan);
    const remaining=1-clamp((age-.4)/.6),vitality=remaining*remaining;
    return vitality<.015?0:vitality;
  }
  function tipPosition(segment,time){const t=clamp((time-segment.lastUpdated)/.125);return {
    x:segment.previousXX+(segment.xx-segment.previousXX)*t,y:segment.previousYY+(segment.yy-segment.previousYY)*t,
    z:segment.previousZZ+(segment.zz-segment.previousZZ)*t};}
  function nearby(segment,bins,time){
    if(time-segment.born<1.5)return null;
    const bx=Math.floor(segment.xx/.025),by=Math.floor(segment.yy/.025);
    const candidates=[];
    for(let x=bx-1;x<=bx+1;x++)for(let y=by-1;y<=by+1;y++)candidates.push(...(bins.get(`${x}:${y}`)||[]));
    for(const target of candidates){
      if(target.id===segment.id||target.id===segment.parentId||health(target,time)<.4)continue;
      if(Math.hypot(target.xx-segment.xx,target.yy-segment.yy)<.011&&Math.abs(target.zz-segment.zz)<.035)return target;
    }
    return null;
  }
  function steering(tip,nutrients,r){
    const sample=a=>nutrients[nutrientIndex(tip.x+Math.cos(a)*.07,tip.y+Math.sin(a)*.07)];
    const gradient=sample(tip.angle+.4)-sample(tip.angle-.4);
    const boundary=Math.hypot(tip.x,tip.y)>.79?Math.atan2(-tip.y,-tip.x):tip.angle;
    let turn=Math.atan2(Math.sin(boundary-tip.angle),Math.cos(boundary-tip.angle));
    return tip.angle+gradient*.13+turn*.07+(r()-.5)*.035;
  }
  function grow(colony,time,dt){
    const evolved=colony.layers.map(layer=>{
      const interval=5+(layer.seed%17)*.15,epoch=Math.floor(Math.max(0,time-(colony.clockOffset||0)-(layer.id%25)*.16)/interval);
      const changed=epoch>(layer.mutationEpoch||0)&&layer.activity>.08;
      const target=changed?E.mutate(layer.genome,layer.seed+epoch*65537):(layer.pigmentTarget||layer.genome);
      if(!changed&&!layer.pigmentFrom)return layer;
      const from=changed?layer.genome:layer.pigmentFrom,start=changed?time:layer.pigmentStarted;
      const t=clamp((time-start)/1.2),blend=C.blend(from,target,t*t*(3-2*t));
      return F({...layer,genome:F({...target,...blend}),mutationEpoch:changed?epoch:layer.mutationEpoch,
        pigmentFrom:t<1?from:null,pigmentTarget:t<1?target:null,pigmentStarted:start});
    });
    if(evolved.some((layer,i)=>layer!==colony.layers[i])){
      const nextGenome=s=>{const old=colony.layers[s.lineage],next=evolved[s.lineage];return s.genome.sequence===old.genome.sequence?next.genome:s.genome;};
      colony=F({...colony,layers:F(evolved),segments:F(colony.segments.map(s=>{const genome=nextGenome(s);return genome===s.genome?s:F({...s,genome});})),
        tips:F(colony.tips.map(t=>{const genome=nextGenome(t);return genome===t.genome?t:F({...t,genome});}))});
    }
    const r=M.random(colony.seed+colony.revision*717);
    const field=MicroField.advance(colony.nutrients,colony.activator,dt,colony.specimenIndex??colony.id),nutrients=[...field.u];
    let segments=colony.segments.filter(s=>health(s,time)>0),nextId=colony.nextId,generation=colony.generation;
    for(const s of colony.segments){
      if(health(s,time)>0)continue;
      const n=nutrientIndex(s.xx,s.yy);nutrients[n]=clamp(nutrients[n]+.035);
    }
    const index=new Map(segments.map((s,i)=>[s.id,i])),tips=[],bins=new Map();
    let branchesAdded=0;
    const tipCounts=Array(colony.layers.length).fill(0);
    for(const t of colony.tips)tipCounts[t.lineage]++;
    const density=Array(GRID*GRID).fill(0);
    for(const s of segments)density[nutrientIndex(s.xx,s.yy)]+=health(s,time);
    for(const s of segments){const key=`${Math.floor(s.xx/.025)}:${Math.floor(s.yy/.025)}`;bins.set(key,[...(bins.get(key)||[]),s]);}
    const protectedIds=new Set(colony.tips.map(t=>t.segmentId));
    function continuationSlot(parentId){
      if(segments.length<MAX_SEGMENTS)return segments.length;
      const parents=new Set(segments.map(s=>s.parentId));
      let candidate=-1,score=Infinity;
      for(let i=0;i<segments.length;i++){
        const segment=segments[i];if(protectedIds.has(segment.id)||segment.id===parentId)continue;
        const rank=health(segment,time)+(parents.has(segment.id)?2:0);
        if(rank<score){candidate=i;score=rank;}
      }
      if(candidate<0)return -1;
      const retired=segments[candidate],n=nutrientIndex(retired.xx,retired.yy);
      nutrients[n]=clamp(nutrients[n]+.035*health(retired,time));index.delete(retired.id);
      const key=`${Math.floor(retired.xx/.025)}:${Math.floor(retired.yy/.025)}`;
      bins.set(key,(bins.get(key)||[]).filter(s=>s.id!==retired.id));
      return candidate;
    }
    for(const active of colony.tips){
      const i=index.get(active.segmentId);if(i===undefined)continue;
      const old=segments[i],n=nutrientIndex(active.x,active.y),food=nutrients[n];
      const layer=colony.layers[active.lineage];
      const curvature=(active.curvature||0)*.985+(r()-.5)*.1;
      const angle=steering(active,nutrients,r)+curvature*dt,pressure=1/(1+density[n]*.08),speed=active.genome.growthRate*(food/(food+.12))*(.35+.65*pressure);
      const p=contained(active.x+Math.cos(angle)*speed*dt,active.y+Math.sin(angle)*speed*dt);
      const extension=Math.hypot(p.x-active.x,p.y-active.y);
      const phase=old.phase+extension*old.pitch;
      const zz=old.baseZ+old.amplitude*Math.sin(phase);
      const grown=F({...old,previousXX:old.xx,previousYY:old.yy,previousZZ:old.zz,xx:p.x,yy:p.y,zz,phase,lastUpdated:time});
      segments[i]=grown;nutrients[n]=clamp(food-extension*.6);
      const oldKey=`${Math.floor(old.xx/.025)}:${Math.floor(old.yy/.025)}`,newKey=`${Math.floor(grown.xx/.025)}:${Math.floor(grown.yy/.025)}`;
      bins.set(oldKey,(bins.get(oldKey)||[]).filter(s=>s.id!==old.id));
      bins.set(newKey,[...(bins.get(newKey)||[]),grown]);
      const fusion=nearby(grown,bins,time);
      if(fusion&&tipCounts[active.lineage]>1){
        segments[i]=F({...grown,xx:fusion.xx,yy:fusion.yy,zz:fusion.zz,fusion:true,targetId:fusion.id,
          genome:E.breed(active.genome,fusion.genome,colony.seed+nextId)});
        const targetIndex=index.get(fusion.id);
        if(targetIndex!==undefined)segments[targetIndex]=F({...segments[targetIndex],
          genome:E.breed(fusion.genome,active.genome,colony.seed+nextId+1),exchangeAt:time});
        const fused=segments[i];bins.set(newKey,(bins.get(newKey)||[]).filter(s=>s.id!==fused.id));
        const fusedKey=`${Math.floor(fused.xx/.025)}:${Math.floor(fused.yy/.025)}`;bins.set(fusedKey,[...(bins.get(fusedKey)||[]),fused]);
        nutrients[n]=clamp(nutrients[n]+.004);tipCounts[active.lineage]--;continue;
      }
      const length=active.length+extension;
      let next=F({...active,x:p.x,y:p.y,z:zz,angle,length,curvature});
      if(length>.035){
        const slot=continuationSlot(grown.id);
        if(slot>=0){
          const s=edge(nextId++,grown.id,active.lineage,active.generation,p.x,p.y,p.x,p.y,time,active.genome,r,grown);
          segments[slot]=s;index.set(s.id,slot);protectedIds.add(s.id);
          next=F({...tip(s,angle,active.branchAt),length:0,curvature});
        }
      }
      if(time>active.branchAt&&food>.18&&pressure>.42&&segments.length<MAX_SEGMENTS
        &&colony.tips.length+branchesAdded<MAX_TIPS&&tipCounts[active.lineage]<3){
        const g=E.breed(active.genome,active.genome,colony.seed+nextId),a=angle+(r()<.5?-1:1)*(.5+r()*.45);
        const s=edge(nextId++,grown.id,active.lineage,active.generation+1,p.x,p.y,p.x,p.y,time,g,r,grown);
        index.set(s.id,segments.length);segments.push(s);protectedIds.add(s.id);tips.push(tip(s,a,time+4+r()*5));branchesAdded++;tipCounts[active.lineage]++;generation=Math.max(generation,s.generation);
        next=F({...next,branchAt:time+1/active.genome.branchingRate+r()*2});
      }
      tips.push(next);
    }
    const activeIds=new Set(tips.map(t=>t.segmentId));
    const activeCountsBefore=Array(colony.layers.length).fill(0);
    for(const t of tips)activeCountsBefore[t.lineage]++;
    const required=activeCountsBefore.reduce((sum,count)=>sum+Math.max(0,2-count),0);
    if(segments.length+required>MAX_SEGMENTS){
      const parents=new Set(segments.map(s=>s.parentId));
      const candidates=segments.filter(s=>!activeIds.has(s.id)).sort((a,b)=>(Number(parents.has(a.id))-Number(parents.has(b.id)))||health(a,time)-health(b,time));
      const retired=new Set(candidates.slice(0,segments.length+required-MAX_SEGMENTS).map(s=>s.id));
      for(const segment of segments){if(!retired.has(segment.id))continue;const n=nutrientIndex(segment.xx,segment.yy);nutrients[n]=clamp(nutrients[n]+.035*health(segment,time));}
      segments=segments.filter(s=>!retired.has(s.id));
    }
    const groups=colony.layers.map(()=>[]),activeCounts=Array(colony.layers.length).fill(0);
    for(const segment of segments)groups[segment.lineage].push(segment);
    for(const t of tips)activeCounts[t.lineage]++;
    for(let l=0;l<colony.layers.length;l++){
      const missing=2-activeCounts[l];
      for(let j=0;j<missing&&segments.length<MAX_SEGMENTS&&tips.length<MAX_TIPS;j++){
        const living=groups[l];
        const parent=living[Math.floor(r()*living.length)]||{id:null,generation:0,xx:(r()-.5)*.3,yy:(r()-.5)*.3,genome:colony.layers[l].genome};
        const a=r()*Math.PI*2,s=edge(nextId++,parent.id,l,parent.generation+1,parent.xx,parent.yy,parent.xx,parent.yy,time,parent.genome,r,parent);
        segments.push(s);groups[l].push(s);tips.push(tip(s,a,time+3+r()*5));activeCounts[l]++;
      }
    }
    const foodSums=Array(colony.layers.length).fill(0);
    for(const t of tips)foodSums[t.lineage]+=nutrients[nutrientIndex(t.x,t.y)];
    const layers=F(colony.layers.map(layer=>{
      const own=groups[layer.id],count=activeCounts[layer.id],food=foodSums[layer.id]/Math.max(1,count);
      let fusions=0;const genome=layer.genome;
      for(const s of own)if(s.fusion||s.exchangeAt!==undefined)fusions++;
      return F({...layer,population:own.length,activity:clamp(food*(.55+count*.15)),fusions,genome,growthRate:genome.growthRate,branching:genome.branchingRate});
    }));
    return F({...colony,layers,segments:F(segments),tips:F(tips.slice(0,MAX_TIPS)),nutrients:F(nutrients),activator:field.v,nextId,generation,revision:colony.revision+1});
  }
  function advance(world,dt){const step=clamp(Number.isFinite(dt)?dt:0,0,.125);if(!step)return world;
    const time=world.time+step;return F({seed:world.seed,time,colonies:F(world.colonies.map(c=>grow(c,time,step)))});}
  globalThis.MicroFungus=F({create,createColony,createLayers,advance,health,tipPosition});
})();
