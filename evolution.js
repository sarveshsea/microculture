/* Persistent generative ecology: cell division, inherited phenotype, senescence and lysis.
   Structure evolves through births and deaths; no positions, scales or colors cycle on sine waves.
   Colony growth reference: https://pmc.ncbi.nlm.nih.gov/articles/PMC3498271/
   Growth heterogeneity / lysis: https://pmc.ncbi.nlm.nih.gov/articles/PMC3623257/
   Cross-colony trait blending is an artistic genetic model, not a claim of interspecies mating.
   Time is accelerated and unitless; the model is not calibrated to a biological species. */
(() => {
  'use strict';
  const M=MicroModel, C=MicroColor, TAU=Math.PI*2;
  const LIMIT=Object.freeze({cells:72,debris:60,branches:100,radius:.86,step:.25});
  const clamp=(v,lo=0,hi=1)=>Math.max(lo,Math.min(hi,v));
  const ease=t=>{const x=clamp(t);return x*x*(3-2*x);};
  const freezeArray=a=>Object.freeze(a);
  function contained(x,y) {
    const r=Math.hypot(x,y), scale=r>LIMIT.radius?LIMIT.radius/r:1;
    return {x:x*scale,y:y*scale};
  }
  function genome(spec) {
    const r=M.random(spec.seed),h=((spec.hue%360)+360)%360;
    const L=h>70&&h<115?.79:.66;
    return Object.freeze({lightness:L,chroma:C.ceiling(L,h)*(.72+r()*.16),hue:h,
      rodness:[.18,.12,.85,.06,.95,.55,.14][spec.type],
      branching:[.2,.1,.94,.2,.25,.88,.28][spec.type],cohesion:.55+r()*.35,
      metabolism:.3+r()*.55,longevity:.25+r()*.65});
  }
  function breed(a,b,seed) {
    const r=M.random(seed),weight=.35+r()*.3;
    const mixed=C.mix(a,b,weight), hue=(mixed.hue+(r()-.5)*4+360)%360;
    const lightness=clamp(mixed.lightness+(r()-.5)*.015,.58,.86);
    const chroma=Math.min(mixed.chroma*(.97+r()*.06),C.ceiling(lightness,hue)*.94);
    const trait=key=>clamp(a[key]*(1-weight)+b[key]*weight+(r()-.5)*.045);
    return Object.freeze({lightness,chroma,hue,rodness:trait('rodness'),branching:trait('branching'),
      cohesion:trait('cohesion'),metabolism:trait('metabolism'),longevity:trait('longevity')});
  }
  function life(cell,time) {
    const age=Math.max(0,time-cell.born),fraction=age/cell.lifespan;
    return {growth:ease(age/3),health:1-ease((fraction-.65)/.35),decay:ease((fraction-.8)/.2)};
  }
  function position(cell,time) {
    const t=ease((time-cell.born)/2.5);
    return {x:(cell.fromX??cell.x)+(cell.x-(cell.fromX??cell.x))*t,
      y:(cell.fromY??cell.y)+(cell.y-(cell.fromY??cell.y))*t};
  }
  function cell(id,g,x,y,born,seed,parents=[],generation=0,from=null) {
    const r=M.random(seed),lifespan=20+g.longevity*48;
    const location=contained(x,y);
    return Object.freeze({id,parentIds:freezeArray(parents),generation,born,lifespan,...location,
      fromX:from?.x??location.x,fromY:from?.y??location.y,angle:r()*TAU,
      radius:.025+r()*.016,genome:g,originGenome:from?.genome??g,
      divideAt:born+(8+r()*10)/(g.metabolism+.6),seed});
  }
  function initialColony(spec) {
    const r=M.random(spec.seed+41),g=genome(spec),cells=[],branches=[];
    const count=30+Math.floor(r()*15);
    for(let id=0;id<count;id++) {
      const parent=id>7?cells[Math.floor(r()*cells.length)]:null;
      const a=r()*TAU,step=.11+r()*.09;
      const base=parent??{x:Math.cos(a)*(.25+r()*.36),y:Math.sin(a)*(.25+r()*.36)};
      const x=base.x+Math.cos(a)*step,y=base.y+Math.sin(a)*step;
      const born=-(1+r()*(20+g.longevity*48)*.93),c=cell(spec.id*100000+id,g,x,y,born,spec.seed+id*71,[],0,{x:x*.85,y:y*.85,genome:g});
      cells.push(Object.freeze({...c,divideAt:.5+r()*12}));
      if(parent&&g.branching>.6)branches.push(Object.freeze({x:parent.x,y:parent.y,xx:c.x,yy:c.y,
        born:-1,lifespan:40+r()*30,genome:g}));
    }
    return Object.freeze({...spec,genome:g,cells:freezeArray(cells),debris:freezeArray([]),
      branches:freezeArray(branches),generation:0,nextId:spec.id*100000+count,nutrient:.68+r()*.25,revision:0});
  }
  function create(seed) {
    return Object.freeze({seed,time:0,colonies:freezeArray(M.createCultures(seed).map(initialColony))});
  }
  function fragments(cell,time) {
    const pos=position(cell,time),r=M.random(cell.seed+399);
    return Array.from({length:3},(_,i)=>Object.freeze({id:`${cell.id}:${i}`,x:pos.x,y:pos.y,
      angle:r()*TAU,speed:.002+r()*.004,radius:cell.radius*(.25+r()*.2),born:time,
      lifespan:12+r()*12,genome:cell.genome}));
  }
  function divide(parent,mate,colony,time,nextId) {
    const r=M.random(parent.seed+nextId*97),pos=position(parent,time);
    const branch=parent.genome.branching>.6,angle=parent.angle+(branch?(r()-.5)*1.1:0);
    const distance=parent.radius*(branch?2.8:1.45),generation=parent.generation+1;
    const make=(sign,id)=>{
      const g=breed(parent.genome,mate.genome,colony.seed+id*131);
      const x=pos.x+Math.cos(angle)*distance*sign,y=pos.y+Math.sin(angle)*distance*sign;
      const child=cell(id,g,x,y,time,colony.seed+id*37,[parent.id,mate.id],generation,{...pos,genome:parent.genome});
      return Object.freeze({...child,angle:angle+(r()-.5)*.12,radius:clamp(parent.radius*(.98+r()*.04),.025,.045)});
    };
    const children=[make(-1,nextId),make(1,nextId+1)];
    const edges=branch?children.map(c=>Object.freeze({x:pos.x,y:pos.y,xx:c.x,yy:c.y,born:time,lifespan:c.lifespan,genome:c.genome})):[];
    return {children,edges};
  }
  function evolveColony(colony,neighbor,time,dt) {
    let debris=colony.debris.filter(d=>time-d.born<d.lifespan);
    let branches=colony.branches.filter(b=>time-b.born<b.lifespan);
    const living=colony.cells.filter(c=>time-c.born<c.lifespan);
    for(const dead of colony.cells.filter(c=>time-c.born>=c.lifespan))debris=debris.concat(fragments(dead,time));
    let nextId=colony.nextId,generation=colony.generation;
    const cells=[];
    const nutrient=clamp(colony.nutrient+dt*(.052-living.length*.00095),.08,1);
    for(let i=0;i<living.length;i++) {
      const parent=living[i],capacity=living.length+cells.length-i;
      const age=time-parent.born;
      if(time>=parent.divideAt&&age<parent.lifespan*.73&&capacity<LIMIT.cells&&nutrient>.25) {
        // Nearby pigment and shape traits enter the lineage gradually, one birth at a time.
        const neighboringMaterial=neighbor.cells[parent.id%Math.max(1,neighbor.cells.length)]??{id:-(neighbor.id+1),genome:neighbor.genome};
        const mate=parent.id%5===0||living.length===1?neighboringMaterial:living[(i+1)%living.length];
        const result=divide(parent,mate,colony,time,nextId);
        cells.push(...result.children);branches=branches.concat(result.edges);nextId+=2;
        generation=Math.max(generation,parent.generation+1);
      } else cells.push(parent);
    }
    // A surviving spore recolonizes a completely exhausted patch; it retains the last lineage.
    if(!cells.length) {
      const last=colony.cells[0]?.genome??colony.genome;
      generation++;cells.push(cell(nextId,last,0,0,time,colony.seed+nextId*13,[colony.cells[0]?.id??nextId-1,neighbor.cells[0]?.id??nextId-2],generation));nextId++;
    }
    return Object.freeze({...colony,cells:freezeArray(cells),debris:freezeArray(debris.slice(-LIMIT.debris)),
      branches:freezeArray(branches.slice(-LIMIT.branches)),nutrient,nextId,generation,
      revision:nextId!==colony.nextId||living.length!==colony.cells.length?colony.revision+1:colony.revision});
  }
  function advance(world,dt) {
    if(dt<=0)return world;
    const step=Math.min(dt,LIMIT.step),time=world.time+step;
    const colonies=world.colonies.map((colony,i)=>{
      const neighbor=world.colonies[colony.col<10?i+1:i-1];
      return evolveColony(colony,neighbor,time,step);
    });
    return Object.freeze({seed:world.seed,time,colonies:freezeArray(colonies)});
  }
  globalThis.MicroEvolution=Object.freeze({create,advance,breed,life,position});
})();
