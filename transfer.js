/* Temporary ancestry-weighted transport. Coordinates returned by frame are screen pixels;
   particle localX/Y/Z and plan targets are normalized specimen coordinates for reveal handoff. */
(() => {
  'use strict';
  const F=Object.freeze,plans=new WeakMap(),cancelled=new WeakSet(),LIMIT=256;
  const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
  const smooth=x=>{const t=clamp(x);return t*t*t*(10+t*(-15+6*t));};
  const specimenRadius=size=>globalThis.MicroRender?.specimenRadius?MicroRender.specimenRadius(size):size*.405;
  function local(colony,segment,u,flat=true,time=0,sample=0){
    if(globalThis.MicroRender?.displayPoint)return MicroRender.displayPoint(colony,segment,u,time,sample);
    if(globalThis.MicroRender?.transferPoint)return MicroRender.transferPoint(colony,segment,u,time);
    const x=segment.x+(segment.xx-segment.x)*u,y=segment.y+(segment.yy-segment.y)*u,z=(segment.z||0)+((segment.zz||0)-(segment.z||0))*u;
    return {x,y,z};
  }
  function balancedSegments(segments){const groups=new Map();for(const segment of segments){const rows=groups.get(segment.lineage)||[];rows.push(segment);groups.set(segment.lineage,rows);}const selected=[];for(let pass=0;selected.length<25;pass++){let added=false;for(const rows of groups.values()){if(rows[pass]){selected.push(rows[pass]);added=true;if(selected.length===25)break;}}if(!added)break;}return selected;}
  function prepare(reservation){
    if(plans.has(reservation))return plans.get(reservation);
    const child=reservation.child,parents=[reservation.before.colonies[reservation.parentAId],reservation.before.colonies[reservation.parentBId]];
    const weight=clamp(child.ancestry?.[0]?.weight??.5,.05,.95);
    const segments=balancedSegments(child.segments);
    const count=Math.min(LIMIT,segments.length*2),targets=[];
    for(let i=0;i<count;i++){
      const segment=segments[Math.floor(i/2)],sampleIndex=i%2,u=sampleIndex?2/3:1/3;
      const parentIndex=Math.floor((i+1)*weight)>Math.floor(i*weight)?0:1,parent=parents[parentIndex];
      const donor=parent.segments[(i*73+segment.lineage*11)%parent.segments.length];
      targets.push(F({id:`${child.uid||child.seed}:${segment.id}:${sampleIndex}`,childSegmentId:segment.id,
        sampleIndex,u,parentIndex,parentId:parent.id,locus:i%384,nucleotide:donor.genome.sequence?.[i%384]||null,from:F(local(parent,donor,u,true,reservation.before.time||0,i%2)),to:F(local(child,segment,u,true,reservation.before.time||0,i%2)),
        fromRaw:F(local(parent,donor,u,false,reservation.before.time||0,i%2)),toRaw:F(local(child,segment,u,false,reservation.before.time||0,i%2)),
        donorGenome:globalThis.MicroHabitat?MicroHabitat.pigment(parent,donor.genome,donor.lineage):donor.genome,genome:globalThis.MicroHabitat?MicroHabitat.pigment(child,segment.genome,segment.lineage):segment.genome,bundle:parentIndex*25+(segment.lineage||0),
        stratum:0,visualLayer:(segment.lineage||0)*5,release:((segment.lineage||0)*7%13)/100,
        lane:(((segment.lineage||0)*17%25)/24-.5)*.65+(sampleIndex-.5)*.04,radius:.0035+(i%5)*.00025}));
    }
    const plan=F({id:child.uid||String(child.seed),targets:F(targets),parentIds:F(parents.map(p=>p.id)),
      childId:child.id,budget:count,start:.6,arrive:1.6,revealEnd:2.25,duration:2.5});
    plans.set(reservation,plan);return plan;
  }
  function cubic(a,b,c,d,t){const s=1-t;return {x:s*s*s*a.x+3*s*s*t*b.x+3*s*t*t*c.x+t*t*t*d.x,
    y:s*s*s*a.y+3*s*s*t*b.y+3*s*t*t*c.y+t*t*t*d.y};}
  function trajectory(a,d,target,t){
    t=clamp((t-target.release)/(1-target.release));
    const dx=d.x-a.x,dy=d.y-a.y,length=Math.hypot(dx,dy)||1,nx=-dy/length,ny=dx/length;
    const bend=target.lane*Math.min(length*.24,160),b={x:a.x+dx*.32+nx*bend,y:a.y+dy*.32+ny*bend};
    const c={x:d.x-dx*.17+nx*bend*.35,y:d.y-dy*.17+ny*bend*.35},q=cubic(a,b,c,d,smooth(t));
    const envelope=16*t*t*(1-t)*(1-t),angle=target.lane*8+t*Math.PI*1.4;
    const circulation=Math.min(5,length*.008)*envelope;
    return {x:q.x+Math.cos(angle)*circulation,y:q.y+Math.sin(angle)*circulation};
  }
  function smoothUnion(a,b,k){const h=clamp(.5+.5*(b-a)/k);return b*(1-h)+a*h-k*h*(1-h);}
  function membrane(origin,progress){
    const scale=specimenRadius(origin.size),r=.8+.19*progress,spread=.24*(1-progress),softness=.17;
    const sdf=(x,y)=>smoothUnion(Math.hypot(x-spread,y)-r,Math.hypot(x+spread,y)-r,softness);
    const outline=Array.from({length:64},(_,i)=>{
      const a=i*Math.PI*2/64,dx=Math.cos(a),dy=Math.sin(a);let lo=0,hi=1.3;
      for(let j=0;j<12;j++){const mid=(lo+hi)/2;if(sdf(dx*mid,dy*mid)>0)hi=mid;else lo=mid;}
      return F({x:origin.x+dx*(lo+hi)/2*scale,y:origin.y+dy*(lo+hi)/2*scale});
    });
    return F({x:origin.x,y:origin.y,radius:r*scale,outline:F(outline),alpha:.025*(1-smooth((progress-.8)/.2))});
  }
  function port(point,w,h){
    const inset=12;return {x:clamp(point.x,inset,w-inset),y:clamp(point.y,inset,h-inset)};
  }
  function correctedPositions(rows,t,origin){
    const contact=smooth((t-.65)/.35),envelope=16*t*t*(1-t)*(1-t),scale=specimenRadius(origin.size);
    const points=rows.map(row=>trajectory(row.a,row.d,row.target,t));
    const spread=.24*(1-t),radius=.8+.19*t;
    const sdf=(x,y)=>smoothUnion(Math.hypot(x-spread,y)-radius,Math.hypot(x+spread,y)-radius,.17);
    const cell=7,bins=new Map();
    points.forEach((p,i)=>{const key=`${Math.floor(p.x/cell)}:${Math.floor(p.y/cell)}`;const bin=bins.get(key)||[];bin.push(i);bins.set(key,bin);});
    return points.map((p,i)=>{
      let sx=0,sy=0;const bx=Math.floor(p.x/cell),by=Math.floor(p.y/cell);
      for(let x=bx-1;x<=bx+1;x++)for(let y=by-1;y<=by+1;y++)for(const j of bins.get(`${x}:${y}`)||[]){
        if(i===j)continue;const other=points[j],dx=p.x-other.x,dy=p.y-other.y,d=Math.hypot(dx,dy),range=4;
        if(d>=range)continue;const force=(1-d/range)**2*1.25*envelope;
        sx+=dx/(d||1)*force;sy+=dy/(d||1)*force;
      }
      const magnitude=Math.hypot(sx,sy),limit=2*envelope;if(magnitude>limit){sx*=limit/magnitude;sy*=limit/magnitude;}
      let x=p.x+sx,y=p.y+sy,nx=(x-origin.x)/scale,ny=(y-origin.y)/scale,d=sdf(nx,ny);
      if(contact>0&&d>0){
        const epsilon=.001,gx=sdf(nx+epsilon,ny)-sdf(nx-epsilon,ny),gy=sdf(nx,ny+epsilon)-sdf(nx,ny-epsilon),length=Math.hypot(gx,gy)||1;
        const confinement=contact*(1-smooth((t-.92)/.08));
        x-=gx/length*d*scale*confinement;y-=gy/length*d*scale*confinement;
      }
      return {x,y};
    });
  }
  function frame(plan,reservation,cultures,w,h,camera,elapsed,options={}){
    if(cancelled.has(plan)||reservation.cancelled)return F({particles:F([]),curves:F([]),membrane:null,progress:0,reveal:0,done:true,cancelled:true});
    const t=clamp((elapsed-plan.start)/(plan.arrive-plan.start)),reveal=smooth((elapsed-plan.arrive)/(plan.revealEnd-plan.arrive));
    const find=id=>cultures.find(c=>c.id===id)||reservation.before.colonies[id],child=cultures.find(c=>c.id===plan.childId)||reservation.child;
    const destination=MicroView.origin(child,w,h,camera),origins=plan.parentIds.map(id=>MicroView.origin(find(id),w,h,camera));
    const curves=[],rows=plan.targets.map(target=>{
      const o=origins[target.parentIndex],from=target.fromRaw,to=target.toRaw;
      const source={x:o.x+from.x*specimenRadius(o.size),y:o.y+from.y*specimenRadius(o.size)};
      const a=port(source,w,h),d={x:destination.x+to.x*specimenRadius(destination.size),y:destination.y+to.y*specimenRadius(destination.size)};
      const dx=d.x-a.x,dy=d.y-a.y,length=Math.hypot(dx,dy)||1,bend=target.lane*Math.min(length*.24,160);
      const controlA=F({x:a.x+dx*.32-dy/length*bend,y:a.y+dy*.32+dx/length*bend});
      const controlB=F({x:d.x-dx*.17-dy/length*bend*.35,y:d.y-dy*.17+dx/length*bend*.35});
      curves.push(F({id:target.id,parentIndex:target.parentIndex,from:F(a),source:F(source),controlA,controlB,to:F(d)}));
      return {a,d,target,to};
    });
    const epsilon=.0002,lo=clamp(t-epsilon),hi=clamp(t+epsilon),interval=(hi-lo)*(plan.arrive-plan.start)||1;
    const settled=t===0||t===1;
    const positions=settled?rows.map(row=>t===0?row.a:row.d):correctedPositions(rows,t,destination);
    const previous=settled?positions:correctedPositions(rows,lo,destination),next=settled?positions:correctedPositions(rows,hi,destination);
    const particles=rows.map((row,i)=>{
      const {target,to}=row,q=positions[i],contact=smooth((t-.72)/.28);
      const difference=Math.abs((((target.genome.habitatHue??target.genome.hue)-(target.donorGenome.habitatHue??target.donorGenome.hue)+540)%360)-180);
      const blend=contact>0&&difference<55?MicroColor.blend({...target.donorGenome,hue:target.donorGenome.habitatHue??target.donorGenome.hue},{...target.genome,hue:target.genome.habitatHue??target.genome.hue},contact):null;
      const genome=blend?F({...target.genome,...blend,...(Number.isFinite(target.genome.habitatHue)?{habitatHue:blend.hue}:{})}):(contact===1?target.genome:target.donorGenome);
      return F({id:target.id,x:q.x,y:q.y,vx:(next[i].x-previous[i].x)/interval,vy:(next[i].y-previous[i].y)/interval,
        radius:Math.max(.75,destination.size*target.radius),alpha:(elapsed<plan.start?smooth((elapsed-.25)/.35):1)*(1-reveal),
        genome,parentIndex:target.parentIndex,childSegmentId:target.childSegmentId,sampleIndex:target.sampleIndex,
        localX:to.x,localY:to.y,localZ:to.z,u:target.u,bundle:target.bundle,stratum:target.stratum,visualLayer:target.visualLayer,locus:target.locus,nucleotide:target.nucleotide,stage:elapsed<plan.start?'sequence':'transport'});
    });
    return F({particles:F(particles),curves:F(curves),membrane:options.membrane?membrane(destination,t):null,progress:t,reveal,done:elapsed>=plan.duration,
      velocityLimit:Math.hypot(w,h)*4});
  }
  function draw(context,state,options={}){
    const dark=typeof options==='boolean'?options:!!(options.dark||options.darkMode);
    context.save();
    for(const p of state.particles){const pigment=MicroColor.displayPigment(p.genome,dark);context.globalAlpha=p.alpha;context.fillStyle=MicroColor.css(pigment.lightness,pigment.chroma,pigment.hue);context.beginPath();context.arc(p.x,p.y,p.radius,0,Math.PI*2);context.fill();}
    context.restore();
  }
  globalThis.MicroTransfer=F({prepare,frame,draw,cancel:plan=>cancelled.add(plan),smoothUnion});
})();
