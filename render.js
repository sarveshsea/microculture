/* Cells and branches are drawn directly from their lifecycle state.
   There are no spinning sprites, radial flower templates or looping scale changes. */
(() => {
'use strict';
const M=MicroModel,F=MicroFungus,V=MicroView,C=MicroColor,P=MicroParticles,TAU=Math.PI*2;
const specimenRadius=size=>size*.405;
const pigmentCache=new Map();
const STYLE=Object.freeze({bodyAlpha:.82,hoverScale:.025,detailGrains:20,gridGrains:4});
const swarms=new Map(),textures=new Map(),normalization=new Map();
let viewportBudget=0;
let frame=0,frameDelta=0,hand=null,still=false,unsettled=false,lensSpring={value:0,velocity:0},lastHand=null,lensEnabled=true;
let interactionTime=0,ripples=[],rippleOrigins=new Map(),dark=false;
let visibleSpecimens=25,gridPass=false,refreshBudget=6,priorityBudget=1,refreshDeadline=Infinity;
function setDark(value){dark=Boolean(value);pigmentCache.clear();textures.clear();}
function ripple(source){const id=typeof source==='object'?source.id:source;if(id<0||still)return;const origin=typeof source==='object'?{row:source.tileRow,col:source.tileCol}:rippleOrigins.get(id);if(!origin)return;const previous=ripples[0];ripples=[{id,...origin,born:previous&&interactionTime-previous.born<.3?previous.born:interactionTime}];}

function beginFrame(dt,pointer,reduced=false,allowLens=true) {const budget=typeof innerWidth==='number'&&innerWidth<=600?48:128;if(budget!==viewportBudget){viewportBudget=budget;trimTextures();}lensEnabled=allowLens;frame++;refreshBudget=6;priorityBudget=1;interactionTime+=dt;if(reduced)ripples=[];ripples=ripples.filter(r=>interactionTime-r.born<1.8);frameDelta=dt;hand=pointer;still=reduced;unsettled=false;lensSpring=reduced?{value:0,velocity:0}:M.spring(lensSpring,pointer?1:0,dt);if(pointer)lastHand={...pointer};if(Math.abs(lensSpring.velocity)>.001)unsettled=true;}
function endFrame() {for(const [id,row] of swarms)if(frame-row.frame>2)swarms.delete(id);}
function busy() {return unsettled||ripples.length>0;}
function swarm(cell,count) {
  let row=swarms.get(cell.id);
  if(!row||row.count!==count) {
    row={count,samples:P.sample(cell,count),dots:[],frame,colony:-1};swarms.set(cell.id,row);
  }
  row.frame=frame;return row;
}
function burst(colony,point) {
  const cached=textures.get(`${colony}:true`);if(cached){cached.dirty=true;const wedge=Math.PI/cached.sectors;let a=((Math.atan2(point.y,point.x)%(wedge*2))+wedge*2)%(wedge*2);if(a>wedge)a=wedge*2-a;const r=Math.hypot(point.x,point.y)/cached.magnification;point={x:Math.cos(a)*r,y:Math.sin(a)*r};}
  for(const row of swarms.values())if(row.colony===colony){row.dots=row.dots.map(dot=>dot?P.burst(dot,point):dot);row.relaxing=true;}unsettled=true;
}
const clamp=(v,lo=0,hi=1)=>Math.max(lo,Math.min(hi,v));
function tone(genome,health=1,offset=0) {
  const display=C.displayPigment?.(genome,dark,health)||genome;
  const L=Math.round(clamp(display.lightness,.3,.86)*100)/100;
  const H=Math.round(display.hue%360),healthBand=Math.round(health*6)/6;
  const chroma=Math.round(Math.min(display.chroma*(.65+.35*healthBand),C.ceiling(L,H)*.94)*200)/200;
  const key=`${L}:${H}:${chroma}`;
  if(!pigmentCache.has(key)) {
    if(pigmentCache.size>4096)pigmentCache.clear();
    pigmentCache.set(key,C.css(L,Math.min(chroma,C.ceiling(L,H)*.94),H));
  }
  return pigmentCache.get(key);
}
function circle(g,x,y,r,fill) {g.fillStyle=fill;g.beginPath();g.arc(x,y,r,0,TAU);g.fill();}
function evict(id){for(const key of textures.keys())if(key.startsWith(`${id}:`))textures.delete(key);for(const key of normalization.keys())if(key.startsWith(`${id}:`))normalization.delete(key);for(const [key,row] of swarms)if(row.colony===id)swarms.delete(key);}
function reset() {pigmentCache.clear();swarms.clear();textures.clear();normalization.clear();ripples=[];rippleOrigins.clear();}
function structure(g,colony,time,detail,localHand,exporting,scale,wedge,reveal=1) {
  const occupancy=new Map();
  const alpha=g.globalAlpha,parents=new Map(colony.segments.map(s=>[s.id,s]));
  for(const segment of [...colony.segments].sort((a,b)=>(b.z||0)-(a.z||0))) {

    const emergence=globalThis.MicroTissueAppearance?MicroTissueAppearance.emergence(colony.seed,segment.lineage||0,reveal):reveal,growth=.08+.92*emergence;
    const health=F.health(segment,time),rawEnd=F.tipPosition(segment,time);
    const fold=(x,y)=>{let a=((Math.atan2(y,x)%(wedge*2))+wedge*2)%(wedge*2);if(a>wedge)a=wedge*2-a;const r=Math.hypot(x,y);return {x:Math.cos(a)*r,y:Math.sin(a)*r};};
    const depth=((segment.z||0)+(rawEnd.z||0))/2;
    const project=(x,y,z)=>{const perspective=1/(1-z*.22);return fold(x*perspective*growth,y*perspective*growth);};
    const start=project(segment.x,segment.y,segment.z||0),end=project(rawEnd.x,rawEnd.y,rawEnd.z||0);
    const parent=parents.get(segment.parentId),rawCurve=globalThis.MicroFlatGeometry?.curve(segment,rawEnd,parent),previous=parent?project(parent.x,parent.y,parent.z||0):start;
    const length3=Math.hypot(end.x-start.x,end.y-start.y),tx=parent?start.x-previous.x:end.x-start.x,ty=parent?start.y-previous.y:end.y-start.y,tl=Math.hypot(tx,ty)||1;
    const control=rawCurve?project(rawCurve.b.x,rawCurve.b.y,segment.z||0):{x:start.x+tx/tl*length3/3,y:start.y+ty/tl*length3/3},control2=rawCurve?project(rawCurve.c.x,rawCurve.c.y,rawEnd.z||0):{x:end.x-(end.x-start.x)/3,y:end.y-(end.y-start.y)/3};
    if(health<=.035)continue;
    const renderGenome=globalThis.MicroHabitat?MicroHabitat.pigment(colony,segment.genome,segment.lineage):segment.genome,pigment=tone(renderGenome,health),width=segment.width*(.5+.5*health);
    g.strokeStyle=pigment;g.lineCap='round';
    g.globalAlpha=alpha*health*health*.76;g.lineWidth=.65/scale;
    g.beginPath();g.moveTo(start.x,start.y);
    const crossing=rawCurve&&MicroFlatGeometry.crossesSeam(rawCurve,wedge);
    if(crossing){const subdivisions=Math.max(8,Math.min(64,Math.ceil(length3*scale/2)));for(let sample=1;sample<=subdivisions;sample++){const u=sample/subdivisions,p=MicroFlatGeometry.sample(rawCurve,u),q=project(p.x,p.y,(segment.z||0)+((rawEnd.z||0)-(segment.z||0))*u);g.lineTo(q.x,q.y);}}else g.bezierCurveTo(control.x,control.y,control2.x,control2.y,end.x,end.y);
    g.stroke();
    const count=detail?Math.max(24,Math.min(64,Math.floor(scale/12))):Math.max(6,Math.min(18,Math.floor(scale/12))),key=segment.id,row=exporting?{dots:[]}:swarm(segment,count);
    row.colony=colony.id;
    const dx=end.x-start.x,dy=end.y-start.y,length=Math.hypot(dx,dy),nx=-dy/(length||1),ny=dx/(length||1);
    const next=[];let relaxing=false;g.fillStyle=tone(renderGenome,health);g.globalAlpha=alpha*health*clamp(.88+depth*.3,.75,.98);g.beginPath();
    for(let i=0;i<count;i++) {
      if(health<.035||(globalThis.MicroTissueAppearance&&!MicroTissueAppearance.alive(segment.id,i,health*emergence)))continue;
      const u=i<2?(i+1)/3:(i/count+time*segment.flowSpeed+(segment.id%97)/97)%1;
      const lateral=i<2?0:((i*37%11)/10-.5)*width*4;
      const rawHome=rawCurve?MicroFlatGeometry.sample(rawCurve,u):null,projectedHome=rawHome?project(rawHome.x,rawHome.y,(segment.z||0)+((rawEnd.z||0)-(segment.z||0))*u):null;
      const home=projectedHome?{x:projectedHome.x+nx*lateral,y:projectedHome.y+ny*lateral}:{x:(1-u)**3*start.x+3*(1-u)**2*u*control.x+3*(1-u)*u*u*control2.x+u**3*end.x+nx*lateral,y:(1-u)**3*start.y+3*(1-u)**2*u*control.y+3*(1-u)*u*u*control2.y+u**3*end.y+ny*lateral};
      const old=row.dots[i]||{...home,vx:0,vy:0};
      const foldedHand=localHand?{...fold(localHand.x,localHand.y),reach:localHand.reach}:null;
      const dot=exporting||still||(!localHand&&!row.relaxing)?{...home,vx:0,vy:0}:P.step(old,home,foldedHand,frameDelta);
      next[i]=dot;if(dot.vx*dot.vx+dot.vy*dot.vy>.00000004){unsettled=true;relaxing=true;}
      const r=(detail?.7:.55)/scale*(.7+health*.3);
      const focus=foldedHand&&lensEnabled?foldedHand:null,dist=focus?Math.hypot(dot.x-focus.x,dot.y-focus.y):Infinity,lensT=focus?dist/focus.reach:1,lensGain=lensT<1?P.lensScale(lensT,clamp(lensSpring.value)):1,px=focus?focus.x+(dot.x-focus.x)*lensGain:dot.x,py=focus?focus.y+(dot.y-focus.y)*lensGain:dot.y;
      const bin=`${Math.floor(px*scale/2)}:${Math.floor(py*scale/2)}`,occupied=occupancy.get(bin)||0;if(occupied>=2)continue;occupancy.set(bin,occupied+1);
      g.moveTo(px+r,py);g.arc(px,py,r,0,TAU);
    }
    g.fill();
    if(globalThis.MicroMistMoss&&rawCurve){
      const gx=Math.max(0,Math.min(15,Math.floor((rawEnd.x+1)*8))),gy=Math.max(0,Math.min(15,Math.floor((rawEnd.y+1)*8))),food=colony.nutrients?.[gy*16+gx]??.65,age=Math.max(0,time-(segment.born??0)),mossCount=detail?Math.min(32,Math.max(12,Math.floor(scale/24))):4;
      const first=MicroMistMoss.point(segment.id,0,age,food,health*emergence);g.globalAlpha=alpha*first.opacity*.62;g.fillStyle=tone(renderGenome,health);g.beginPath();
      for(let i=0;i<mossCount;i++){if(globalThis.MicroTissueAppearance&&!MicroTissueAppearance.alive(segment.id^717,i,health*emergence))continue;const mist=MicroMistMoss.point(segment.id,i,age,food,health),p=MicroFlatGeometry.sample(rawCurve,mist.u),q=project(p.x+nx*mist.lateral,p.y+ny*mist.lateral,(segment.z||0)+mist.depth),radius=mist.radius/scale;g.moveTo(q.x+radius,q.y);g.arc(q.x,q.y,radius,0,TAU);}g.fill();
    }
    if(!exporting){row.dots=next;row.relaxing=relaxing;}
  }
  g.globalAlpha=alpha;
}
function transferPoint(colony,segment,u,time=0){

 const sectors=3+(colony.specimenIndex??colony.id)%5,wedge=Math.PI/sectors,end=F.tipPosition(segment,time),parent=colony.segments.find(s=>s.id===segment.parentId),raw=MicroFlatGeometry.sample(MicroFlatGeometry.curve(segment,end,parent),u),depth=(segment.z||0)+((end.z||0)-(segment.z||0))*u,perspective=1/(1-depth*.22),q=MicroFlatGeometry.fold({x:raw.x*perspective,y:raw.y*perspective},wedge),key=`${colony.id}:${colony.seed}`,mag=normalization.get(key)||Math.min(2.8,.82/Math.max(.25,...colony.segments.map(s=>Math.hypot(s.xx,s.yy)/(1-(s.zz||0)*.22))));return {x:q.x*mag,y:q.y*mag,z:depth};
}
function displayPoint(colony,segment,u,time=0,sample=0){const point=transferPoint(colony,segment,u,time);return globalThis.MicroTissueAppearance?MicroTissueAppearance.disperse(point,3+(colony.specimenIndex??colony.id)%5,colony.seed,segment.lineage||0,sample):point;}
function childHandoff(g,colony,radius,time){
 if(!colony.transferTargets)return;const age=performance.now()-colony.generatedAt,duration=colony.generationDuration||650,t=clamp((age-duration)/250);if(age>duration+250)return;const p=clamp(age/duration),opacity=p*p*p*(10+p*(-15+6*p)),mix=t*t*(3-2*t),segments=new Map(colony.segments.map(segment=>[segment.id,segment]));
 for(const target of colony.transferTargets){const segment=segments.get(target.childSegmentId);if(!segment)continue;const frozen=target.toRaw,current=displayPoint(colony,segment,target.u,time,target.sampleIndex||0),x=(frozen.x+(current.x-frozen.x)*mix)*radius,y=(frozen.y+(current.y-frozen.y)*mix)*radius;g.save();g.globalAlpha=opacity;circle(g,x,y,Math.max(.7,radius*.0035),tone(target.genome));g.restore();}
}
function sequenceReveal(g,colony,radius,time,reveal){
 // Seed tissue appears immediately in its final topology; no placeholder grid.
 if(reveal>=1)return;g.save();g.globalAlpha*=.65*(1-reveal);
 const seen=new Set();for(const segment of colony.segments){if(seen.has(segment.lineage))continue;seen.add(segment.lineage);const genome=globalThis.MicroHabitat?MicroHabitat.pigment(colony,segment.genome,segment.lineage):segment.genome;
 for(let base=0;base<8;base++){const u=(base+1)/9,target=displayPoint(colony,segment,u,time,base),growth=.08+.92*(globalThis.MicroTissueAppearance?MicroTissueAppearance.emergence(colony.seed,segment.lineage||0,reveal):reveal);circle(g,target.x*radius*growth,target.y*radius*growth,.8,tone(genome));}}g.restore();
}
function generation(colony,exporting=false){
 if(colony.generatedAt===Infinity)return 0;if(exporting||still||colony.generatedAt==null)return 1;const now=performance.now(),duration=colony.generationDuration||420,ledger=globalThis.MicroAtlas?.reveal?.(colony,now,duration),born=ledger?.born??colony.generatedAt,p=clamp((now-born)/duration);if(p<1)unsettled=true;else globalThis.MicroAtlas?.completeReveal?.(colony.uid);return ledger?.complete?1:p;
}
function trimTextures(){const limit=(typeof innerWidth==='number'&&innerWidth<=600?48:128)*1024*1024;let bytes=[...textures.values()].reduce((sum,row)=>sum+row.resolution*row.resolution*4,0);for(const [key,row]of [...textures].sort((a,b)=>(a[1].refreshed||0)-(b[1].refreshed||0))){if(bytes<=limit)break;bytes-=row.resolution*row.resolution*4;row.image.width=1;row.image.height=1;textures.delete(key);}}
function organism(g,colony,x,y,size,time,detail=false,hover=0,exporting=false,previewMode=false) {
  const qualityDetail=(detail||size>=360)&&!previewMode;
  const radius=size*.45,sectors=3+(colony.specimenIndex??colony.id)%5,pixelRatio=exporting?1:Math.max(1,g.getTransform().a||1)*(hand?.colony===colony.id&&lensEnabled?1.6:1),resolution=exporting?Math.ceil(radius*2):Math.min(3072,Math.max(128,Math.ceil(radius*2*pixelRatio/128)*128));
  const normKey=`${colony.id}:${colony.seed}`,extent=Math.max(.25,...colony.segments.map(s=>Math.hypot(s.xx,s.yy)*(1/(1-(s.zz||0)*.22)))),fit=Math.min(2.8,.82/extent);normalization.set(normKey,Math.min(normalization.get(normKey)||fit,fit));
  const magnification=normalization.get(normKey);
  const localHand=hand&&hand.colony===colony.id&&!exporting?{x:(hand.x-x)/radius/magnification,y:(hand.y-y)/radius/magnification,reach:clamp(64/radius,.12,.4)}:null;
  if(colony.transferTargets&&performance.now()-colony.generatedAt<(colony.generationDuration||650)+250)unsettled=true;
  const reveal=generation(colony,exporting),revealStamp=Math.floor(reveal*60),handoff=colony.transferTargets?clamp((performance.now()-colony.generatedAt-(colony.generationDuration||650))/250):1,handoffStamp=Math.floor(handoff*60),key=`${colony.id}:${previewMode?'preview':detail}`,stamp=Math.floor(time*(detail?30:20));let cached=textures.get(key);
  if(cached&&cached.identity!==(colony.uid||colony.seed))cached=null;
  const requested=exporting||!cached||cached.stamp!==stamp||cached.qualityDetail!==qualityDetail||cached.magnification!==magnification||cached.revealStamp!==revealStamp||cached.handoffStamp!==handoffStamp||cached.resolution<resolution||localHand||cached.relaxing||cached.dirty;
  const priority=gridPass&&hand?.colony===colony.id&&priorityBudget>0,allowed=!gridPass||exporting||priority||(refreshBudget>0&&(refreshBudget===6||performance.now()<refreshDeadline));
  if(requested&&!allowed){unsettled=true;if(!cached){g.save();g.translate(x,y);sequenceReveal(g,colony,radius,time,Math.min(.6,reveal));g.restore();return;}}
  if(requested&&allowed){
    if(gridPass&&!exporting){if(priority)priorityBudget--;else refreshBudget--;}
    const image=exporting?document.createElement('canvas'):cached?.image||document.createElement('canvas');if(image.width!==resolution||image.height!==resolution){image.width=resolution;image.height=resolution;}
    const source=image.getContext('2d'),scale=resolution/2;source.setTransform(1,0,0,1,0,0);source.clearRect(0,0,resolution,resolution);
    source.save();source.translate(scale,scale);source.scale(scale*magnification,scale*magnification);
    source.beginPath();source.moveTo(0,0);source.arc(0,0,.9/magnification,0,Math.PI/sectors);source.closePath();source.clip();source.globalAlpha*=Math.min(1,reveal*4);structure(source,colony,time,qualityDetail,localHand,exporting,radius*magnification,Math.PI/sectors,reveal);source.restore();
    cached={qualityDetail,handoffStamp,revealStamp,refreshed:frame,identity:colony.uid||colony.seed,image,stamp,resolution,radius,magnification,sectors,dirty:false,relaxing:colony.segments.some(s=>swarms.get(s.id)?.relaxing)};if(!exporting){textures.set(key,cached);trimTextures();}
  }
  if(!exporting)for(const s of colony.segments){const row=swarms.get(s.id);if(row)row.frame=frame;}
  g.save();g.translate(x,y);
  for(let i=0;i<sectors;i++)for(const mirror of [-1,1]){g.save();g.rotate(i*TAU/sectors);g.scale(1,mirror);g.drawImage(cached.image,-radius,-radius,radius*2,radius*2);g.restore();}
  if(!exporting){sequenceReveal(g,colony,radius,time,reveal);childHandoff(g,colony,radius,time);}g.restore();if(exporting){cached.image.width=1;cached.image.height=1;}
}
function grid(g,colonies,w,h,time,hover,alpha=1,skip=-1,exporting=false,camera={zoom:1,panX:0,panY:0}) {
  const l=V.geometry(w,h);if(alpha<.001)return l;visibleSpecimens=colonies.reduce((count,colony)=>{const o=V.origin(colony,w,h,camera);return count+(o.x+o.size/2>=0&&o.x-o.size/2<=w&&o.y+o.size/2>=0&&o.y-o.size/2<=h?1:0);},0);g.save();g.globalAlpha=alpha;
  g.strokeStyle=dark?'oklch(.48 0 0 / .45)':'oklch(.78 0 0 / .45)';g.lineWidth=.35;g.beginPath();
  const pitch=l.gap*camera.zoom,ox=(w/2+(l.left-w/2)*camera.zoom+camera.panX)%pitch,oy=(h/2+(l.top-h/2)*camera.zoom+camera.panY)%pitch;
  for(let x=ox-pitch;x<w;x+=pitch){g.moveTo(x,0);g.lineTo(x,h);}
  if(camera.rowOpening){const base=h/2+(l.top-h/2)*camera.zoom+camera.panY,opening=camera.rowOpening,amount=clamp(opening.amount);for(let row=Math.floor(-base/pitch)-2;row<Math.ceil((h-base)/pitch)+2;row++){const y=base+row*pitch+(row>=opening.row?pitch*amount:0);g.moveTo(0,y);g.lineTo(w,y);if(row===opening.row){const stationary=base+row*pitch;g.moveTo(0,stationary);g.lineTo(w,stationary);}}}
  else for(let y=oy-pitch;y<h;y+=pitch){g.moveTo(0,y);g.lineTo(w,y);}g.stroke();
  const ordered=[...colonies].sort((a,b)=>{if(hand?.colony===a.id)return -1;if(hand?.colony===b.id)return 1;const ca=textures.get(`${a.id}:false`),cb=textures.get(`${b.id}:false`);return (ca?.identity===(a.uid||a.seed)?ca.refreshed:-1)-(cb?.identity===(b.uid||b.seed)?cb.refreshed:-1);});
  gridPass=!exporting;refreshDeadline=performance.now()+4;
  for(const colony of ordered) {
    if(colony.id===skip)continue;
    const o=V.origin(colony,w,h,camera),x=o.x,y=o.y;
    if(x+o.size/2<0||x-o.size/2>w||y+o.size/2<0||y-o.size/2>h)continue;
    const active=hover[colony.id]?.value||0;
    const bounds=V.boundary(colony,w,h,camera);
    const emergence=generation(colony,exporting);if(emergence<1)unsettled=true;
    rippleOrigins.set(colony.id,{row:colony.tileRow??Math.floor(colony.id/l.columns),col:colony.tileCol??colony.id%l.columns});
    let wave=0;
    if(!exporting&&!still)for(const r of ripples){const origin=rippleOrigins.get(colony.id),distance=Math.hypot(origin.row-r.row,origin.col-r.col),age=interactionTime-r.born-distance*.16;
      if(age>0&&age<.8)wave=Math.sin(Math.PI*age/.8)**2*.28*Math.exp(-distance*.24);}
    const spotlight=Math.max(clamp(active),wave);
    g.save();g.beginPath();g.rect(bounds.x,bounds.y,bounds.size,bounds.size);g.clip();
    g.save();g.globalAlpha*=.8+.2*emergence;organism(g,colony,x,y,bounds.size*.9,time,false,0,exporting);g.restore();
    if(!exporting){
      if(spotlight>.001){g.save();g.globalAlpha*=spotlight;g.lineWidth=.35;g.strokeStyle='oklch(.78 .125 205 / .9)';g.strokeRect(bounds.x+.5,bounds.y+.5,bounds.size-1,bounds.size-1);g.restore();}
    }g.restore();
  }
  gridPass=false;g.restore();return l;
}
function dishGeometry(w,h) {
  return {x:w/2,y:h/2-8,r:Math.max(2,Math.min(w*.42,h*.42,Math.max(24,h-160)*.44))};
}
function dish(g,colony,w,h,time,progress,origin,exporting=false,zoom=1) {
  const target=dishGeometry(w,h),p=clamp(progress);
  const x=origin.x+(target.x-origin.x)*p,y=origin.y+(target.y-origin.y)*p;
  const size=origin.size+(target.r*2.2*zoom-origin.size)*p;
  g.save();
  if(p>.95) {g.beginPath();g.arc(target.x,target.y,target.r*.93,0,TAU);g.clip();}
  organism(g,colony,x,y,size,time,p>.75||exporting,0,exporting);g.restore();
}
function preview(g,colony,w,h,time){g.clearRect(0,0,w,h);organism(g,colony,w/2,h/2,Math.min(w,h)*.95,time,true,0,false,true);}
function drag(g,colony,point,w,h,time,camera={zoom:1,panX:0,panY:0}) {
  const o=V.origin(colony,w,h,camera);g.save();g.globalAlpha*=.9;organism(g,colony,point.x,point.y,o.size*.9,time,false);g.restore();
}
function transfer(g,frame,w,h,time){if(frame.membrane?.outline&&frame.membrane.alpha){g.save();g.globalAlpha=frame.membrane.alpha*2;g.lineWidth=.35;g.strokeStyle=dark?'oklch(.85 .04 205)':'oklch(.72 .05 205)';g.beginPath();frame.membrane.outline.forEach((p,i)=>i?g.lineTo(p.x,p.y):g.moveTo(p.x,p.y));g.closePath();g.stroke();g.restore();}for(const point of frame.particles||frame.points||[]){g.save();g.globalAlpha*=point.alpha??1;circle(g,point.x,point.y,point.radius||1,tone(point.genome));g.restore();}}
function stats(){const textureBytes=[...textures.values()].reduce((sum,row)=>sum+row.resolution*row.resolution*4,0);return Object.freeze({backend:'canvas',bytes:0,combinedBytes:textureBytes,limit:(typeof innerWidth==='number'&&innerWidth<=600?48:128)*1024*1024,textureBytes,textures:textures.size,refreshBudget});}
globalThis.MicroRender=Object.freeze({specimenRadius,displayPoint,transferPoint,transfer,stats,setDark,drag,evict,ripple,preview,grid,dish,dishGeometry,reset,beginFrame,endFrame,busy,burst});
})();
