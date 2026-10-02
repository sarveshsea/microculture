/* ANIMATION STORYBOARD
 *    0ms  pointer enters → one culture's halo and anatomy respond
 *    0ms  click → selected culture travels from its cell toward center
 *   90ms  fine particles resolve on a neutral field
 *  560ms  spring settles → a borderless, focused particle culture
 *    0ms  close → reverse the same path, restore keyboard focus
 *
 * Stages use the same spring forward and backward; biology has a separate fixed-step clock.
 * Biological time runs independently of interaction time and freezes on pause.
 */
(async () => {
  'use strict';
  const M = MicroModel, R = MicroRender, E = MicroFungus, V = MicroView, P = MicroParticles, A=MicroAtlas, I=MicroInteraction, C=MicroCarousel;
  const TIMING = Object.freeze({ maxFrame:50 });
  const CULTURE = Object.freeze({ count:25, grid:5 });
  const STAGE = Object.freeze({ grid: 0, opening: 1, dish: 2, closing: 3 });
  const EXPORT = Object.freeze({ width: 3840, height: 2160 });
  let BG = getComputedStyle(document.documentElement).getPropertyValue('--ground').trim();
  const canvas = document.getElementById('field'), ctx = canvas.getContext('2d');
  const dialog = document.getElementById('dish'), reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const $ = id => document.getElementById(id);
  const names = Object.freeze(['ciliated cell','diatom','mycelial colony','coccus colony','bacillus biofilm','cyanobacterial filaments','microalgal cell']);
  const ECOLOGY = Object.freeze({ step:1/8 });
  let speed=P.speed(50), pointer=null,dishZoom={value:1,velocity:0},dishZoomTarget=1;
  const bootControls=[...document.querySelectorAll('#grid-controls button,#dish-controls button,#close')];
  bootControls.forEach(button=>{button.disabled=true;});
  MicroOffspring.records();
  async function initialWorld(seed){try{return Object.freeze({seed,time:0,colonies:Object.freeze(await Promise.all(Array.from({length:25},(_,id)=>MicroGeneration.request(seed,id,0))))});}catch(error){console.error('Background generation unavailable; using bounded compatibility rendering',error);$('status').textContent='Background generation is unavailable. Compatibility rendering is active.';return E.create(seed);}}
  let seed = MicroLayout.state().seed??crypto.getRandomValues(new Uint32Array(1))[0], world = await initialWorld(seed), cultures = world.colonies, accumulator = 0, selected = 12, hoverId = -1;
  let hovers = cultures.map(() => ({ value: 0, velocity: 0 }));
  let focus = { value: 0, velocity: 0 }, stage = STAGE.grid,previewIds=[11,13];
  function neighbors(){previewIds=[-1,1].map(delta=>{const result=A.neighbor(world,selected,delta);world=result.world;cultures=world.colonies;return result.id>=0?result.id:selected;});A.focus([selected,...previewIds]);}
  let width = 0, height = 0, clock = 0, previousTime = 0, raf = 0, playing = !reduced.matches;

  function setStage(next) { stage = next; document.body.dataset.stage = String(next);$('grid-controls').inert=next!==STAGE.grid; }
  let camera={zoom:1.08,panX:0,panY:0}, cameraTarget={...camera}, carousel=C.create(), pendingBrowse=0, drag=null, dragged=false;
  const touches=new Map();let pinch=null,holdTimer=0,specimenDrag=null,absorption=null,returning=null,mergeParent=-1,mergeEpoch=0,pendingMerge=false,mergeAbort=null,darkMode=false;
  function origin(w=width,h=height){const o=V.origin(cultures[selected],w,h,camera);return {...o,size:o.size*.9};}
  function zoomTo(value,point={x:width/2,y:height/2}){if(specimenDrag||absorption||pendingMerge)return;cameraTarget=V.zoomAt(cameraTarget,value,point,width,height);pointer=null;hover(-1);schedule();}
  function announce(target, text) { $(target).textContent = text; }
  function paint(g = ctx, w = width, h = height, exporting = false) {
    g.fillStyle = BG; g.fillRect(0,0,w,h);
    const progress = exporting ? (stage === STAGE.grid ? 0 : 1) : Math.max(0, Math.min(1, focus.value));
    if (progress < .999) R.grid(g,absorption&&absorption.opening<1?cultures.filter(c=>c.id!==absorption.reservation.id):cultures,w,h,clock,exporting?[]:hovers,1-progress,
      progress > 0 ? selected : -1,exporting,absorption?{...camera,rowOpening:{row:absorption.reservation.row,amount:absorption.opening}}:camera);
    if (progress > 0) {
      if(progress>.999&&!exporting){
        const track=[previewIds[0],selected,previewIds[1]];
        for(let index=0;index<track.length;index++){
          const x=(index-1+carousel.offset)*w;
          if(x<=-w||x>=w)continue;
          g.save();g.translate(x,0);
          R.dish(g,cultures[track[index]],w,h,clock,1,origin(w,h),false,dishZoom.value);
          g.restore();
        }
      }else R.dish(g,cultures[selected],w,h,clock,progress,origin(w,h),exporting,exporting?dishZoomTarget:dishZoom.value);
    }
    if(progress>.99&&!exporting)for(const [id,delta] of [['peek-left',-1],['peek-right',1]]){const c=$(id),resolution=Math.min(512,Math.max(128,Math.ceil(c.clientWidth*Math.min(devicePixelRatio||1,3))));if(c.width!==resolution){c.width=resolution;c.height=resolution;}R.preview(c.getContext('2d'),cultures[previewIds[delta<0?0:1]],resolution,resolution,clock);}
    if(!exporting&&progress<.001){
      if(specimenDrag)R.drag(g,specimenDrag.colony,specimenDrag.point,w,h,clock,camera);
      if(returning)R.drag(g,returning.colony,returning.point,w,h,clock,camera);
      if(absorption?.plan&&!reduced.matches){const frame=MicroTransfer.frame(absorption.plan,absorption.reservation,cultures,w,h,camera,absorption.elapsed,{});if(R.transfer)R.transfer(g,frame,w,h,clock);else MicroTransfer.draw(g,frame,{dark:darkMode});}

    }

  }
  function schedule() { if (!raf && !document.hidden) raf = requestAnimationFrame(tick); }
  window.addEventListener('microgeneration',schedule);
  window.addEventListener('microgenerationerror',()=>announce('status','A specimen could not be generated. Other dishes remain available.'));
  function hoverTarget(id){if(id===hoverId)return 1;return (id===mergeParent||!!(absorption&&[absorption.reservation.parentAId,absorption.reservation.parentBId].includes(id))) ? .65 : 0;}
  function stillUpdating() {
    const target = stage === STAGE.opening || stage === STAGE.dish ? 1 : 0;
    return pendingMerge || !!specimenDrag || !!absorption || !!returning || A.pending() || Math.abs(dishZoom.value-dishZoomTarget)>.0001 || Math.abs(dishZoom.velocity)>.0001 || carousel.animating || !!carousel.drag || Math.abs(camera.zoom-cameraTarget.zoom)>.0001 || Math.abs(camera.panX-cameraTarget.panX)>.01 || Math.abs(camera.panY-cameraTarget.panY)>.01 || Math.abs(focus.value-target) > .0001 || Math.abs(focus.velocity) > .0001
      || hovers.some((s,i) => Math.abs(s.value-hoverTarget(i)) > .0001 || Math.abs(s.velocity) > .0001);
  }
  function tick(now) {
    raf = 0;
    const dt = previousTime ? Math.min((now-previousTime)/1000,TIMING.maxFrame/1000) : 1/60;
    previousTime = now;
    if(stage===STAGE.grid&&!specimenDrag&&!absorption&&!pendingMerge){world=A.ensure(world,width,height,cameraTarget,selected);cultures=world.colonies;hovers=cultures.map((_,i)=>hovers[i]||{value:0,velocity:0});}
    if (playing && speed>0 && !reduced.matches && !absorption && !pendingMerge) {
      accumulator = Math.min(.5,accumulator+dt*speed);
      const simulationStart=performance.now();let steps=0;
      while(accumulator>=ECOLOGY.step&&steps<2&&performance.now()-simulationStart<4) {world=A.advance(world,ECOLOGY.step,selected);accumulator-=ECOLOGY.step;steps++;}
      clock=world.time+Math.min(accumulator,ECOLOGY.step);
      cultures=world.colonies;
    }
    dishZoom=reduced.matches?{value:dishZoomTarget,velocity:0}:M.spring(dishZoom,dishZoomTarget,dt);
    camera={zoom:camera.zoom+(cameraTarget.zoom-camera.zoom)*Math.min(1,dt*14),panX:camera.panX+(cameraTarget.panX-camera.panX)*Math.min(1,dt*14),panY:camera.panY+(cameraTarget.panY-camera.panY)*Math.min(1,dt*14)};
    if(reduced.matches)camera={...cameraTarget};
    if(carousel.animating){const next=C.advance(carousel,reduced.matches?.36:dt);carousel=next.state;if(next.commit)commitBrowse(next.commit);}
    const target = stage === STAGE.opening || stage === STAGE.dish ? 1 : 0;
    focus = reduced.matches ? { value:target,velocity:0 } : M.spring(focus,target,dt);
    hovers = hovers.map((s,i) => reduced.matches ? { value:hoverTarget(i),velocity:0 } : I.hover(s,hoverTarget(i),dt));
    if(specimenDrag){const target=specimenDrag.target>=0?cultures[specimenDrag.target]:null,o=target?V.origin(target,width,height,camera):null;specimenDrag={...specimenDrag,point:reduced.matches?I.magnetic(specimenDrag.pointer,o):I.dragPosition(specimenDrag.point,specimenDrag.pointer,o,dt)};}
    if(returning){returning={...returning,elapsed:returning.elapsed+dt};const t=Math.min(1,returning.elapsed/I.TIMING.return),ease=t*t*(3-2*t),o=V.origin(returning.colony,width,height,camera);returning={...returning,point:{x:returning.start.x+(o.x-returning.start.x)*ease,y:returning.start.y+(o.y-returning.start.y)*ease}};if(t===1)returning=null;}
    if(absorption){
      const state=MicroLifecycle.merge(absorption.elapsed+dt,reduced.matches),elapsed=state.elapsed,t=state.opening,opening=t*t*(3-2*t);
      absorption={...absorption,elapsed,opening};
      if(elapsed>=MicroLifecycle.TIMING.transfer&&!absorption.revealed){const child=Object.freeze({...absorption.reservation.child,generatedAt:performance.now(),generationDuration:650,transferTargets:absorption.plan?.targets});absorption={...absorption,revealed:true,reservation:{...absorption.reservation,child}};}
      world=A.previewMerge(absorption.reservation,opening);cultures=world.colonies;hovers=cultures.map((_,i)=>hovers[i]||{value:0,velocity:0});
      if(opening===1&&!absorption.positioned){const o=V.origin(cultures[absorption.reservation.id],width,height,cameraTarget),bottom=o.y+o.size/2,limit=height-150;cameraTarget={...cameraTarget,panY:cameraTarget.panY-Math.max(0,Math.min(o.size,bottom-limit))};absorption={...absorption,positioned:true};}
      if(state.complete){const result=A.commitMerge(absorption.reservation,absorption.reservation.child.generatedAt);world=result.world;cultures=world.colonies;selected=result.id;absorption=null;hover(selected);if(result.storageError)announce('status','Created artwork remains available in this session; browser storage is unavailable.');$('merge-toggle').removeAttribute('aria-busy');announce('status','New artwork created below its parent.');}
    }
    if (stage === STAGE.opening && Math.abs(1-focus.value)<.0001) {setStage(STAGE.dish);if(pendingBrowse){const delta=pendingBrowse;pendingBrowse=0;browse(delta);}}
    if (stage === STAGE.closing && focus.value<.0001 && Math.abs(focus.velocity)<.0001) finishClose();
    R.beginFrame(dt,pointer,reduced.matches,!carousel.animating&&!carousel.drag);paint();R.endFrame();
    if ((playing && speed>0 && !reduced.matches) || stillUpdating() || R.busy()) schedule(); else previousTime = 0;
  }
  function resize() {
    width = document.documentElement.clientWidth; height = visualViewport?Math.round(visualViewport.height):innerHeight;camera=V.constrain(camera,width,height);cameraTarget=V.constrain(cameraTarget,width,height);
    const dpr = Math.min(devicePixelRatio || 1,3);
    canvas.width = Math.round(width*dpr); canvas.height = Math.round(height*dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);R.beginFrame(0,pointer,reduced.matches);paint();R.endFrame();schedule();
  }
  function updatePlay() {
    for (const id of ['play','dish-play']) {
      $(id).setAttribute('aria-label',playing?'Pause animation':'Resume animation');
      $(id).setAttribute('aria-pressed',String(!playing));
      $(id).querySelector('path').setAttribute('d',playing?'M9 6v12M15 6v12':'M8 5l11 7-11 7z');
    }
  }
  function togglePlay() {
    if (reduced.matches) {
      announce(dialog.open?'dish-status':'status','Animation follows your reduced motion preference.');return;
    }
    playing = !playing;updatePlay();schedule();
  }
  function hover(id) {
    if (hoverId === id) return;
    hoverId = id;if(id>=0)R.ripple(cultures[id]);canvas.style.cursor = id < 0 ? 'default' : 'pointer';schedule();
  }
  function openDish(id) {
    selected = id;carousel=C.create();pendingBrowse=0;dishZoomTarget=1;dishZoom={value:1,velocity:0};pointer=null;hover(-1);setStage(STAGE.opening);
    neighbors();dialog.dataset.culture = String(id);
    dialog.setAttribute('aria-label',`Living petri dish: ${"25-layer fungal culture"}`);
    if(!dialog.open)dialog.showModal();$('close').focus({preventScroll:true});schedule();
  }
  function closeDish() {
    if (stage === STAGE.closing || stage === STAGE.grid) return;
    pointer=null;carousel=C.create();pendingBrowse=0;setStage(STAGE.closing);schedule();
  }
  function finishClose() {
    setStage(STAGE.grid);focus = { value:0,velocity:0 };dialog.close();
    canvas.focus({preventScroll:true});announce('status','Returned to the culture grid.');
  }
  function commitBrowse(delta) {
    pointer=null;const neighbor=A.neighbor(world,selected,delta);world=neighbor.world;cultures=world.colonies;selected=neighbor.id>=0?neighbor.id:selected;
    neighbors();dialog.dataset.culture = String(selected);
    dialog.setAttribute('aria-label','Living petri dish: 25-layer fungal culture');
    announce('dish-status',`25-layer fungal culture, culture ${selected+1}`);
  }
  function browse(delta) {
    if(stage===STAGE.opening){pendingBrowse=Math.sign(delta);schedule();return;}
    if(stage!==STAGE.dish)return;
    pointer=null;carousel=C.request(carousel,delta);schedule();
  }
  async function download(dishView) {
    const button = $(dishView?'dish-save':'save');button.disabled=true;
    // Yield so the busy button paints before generating the full-resolution artwork.
    await new Promise(resolve => requestAnimationFrame(resolve));
    try {
      const image = document.createElement('canvas');image.width=EXPORT.width;image.height=EXPORT.height;
      const g=image.getContext('2d');g.fillStyle=BG;g.fillRect(0,0,image.width,image.height);
      if(dishView) R.dish(g,cultures[selected],image.width,image.height,clock,1,origin(image.width,image.height),true,dishZoomTarget);
      else R.grid(g,cultures,image.width,image.height,clock,[],1,-1,true,camera);
      const blob=await new Promise(resolve=>image.toBlob(resolve,'image/png'));
      if(!blob)throw new Error('Unable to encode the image');
      const url=URL.createObjectURL(blob),link=document.createElement('a');
      link.href=url;link.download=`${dishView?'petri-dish':'microculture'}-${seed}${dishView?`-${selected+1}`:''}-4k.png`;
      link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    } catch(error) {
      console.error('Artwork export failed',error);
      announce(dishView?'dish-status':'status','Image export failed. Please try again.');
    } finally { button.disabled=false; }
  }
  canvas.addEventListener('wheel',e=>{e.preventDefault();if(absorption||specimenDrag||pendingMerge)return;if(e.ctrlKey||e.metaKey)zoomTo(cameraTarget.zoom*Math.exp(-e.deltaY*.0015),{x:e.clientX,y:e.clientY});else{cameraTarget={...cameraTarget,panX:cameraTarget.panX-e.deltaX,panY:cameraTarget.panY-e.deltaY};pointer=null;hover(-1);schedule();}},{passive:false});
  function cancelDrag(){clearTimeout(holdTimer);if(specimenDrag&&!reduced.matches)returning={...specimenDrag,start:{...specimenDrag.point},elapsed:0};specimenDrag=null;drag=null;pointer=null;canvas.style.cursor='';hover(-1);schedule();}
  function startDrag(id,point){if(id<0||absorption||pendingMerge)return;returning=null;specimenDrag={id,colony:cultures[id],point:{...point},pointer:{...point},target:-1};dragged=true;pointer=null;canvas.style.cursor='grabbing';schedule();}
  function cancelMerge(){mergeEpoch++;mergeAbort?.abort();mergeAbort=null;pendingMerge=false;if(specimenDrag)cancelDrag();if(absorption){if(absorption.plan)MicroTransfer.cancel(absorption.plan);world=A.cancelMerge(absorption.reservation);cultures=world.colonies;}absorption=null;mergeParent=-1;for(const id of ['merge-toggle','dish-merge']){$(id)?.setAttribute('aria-pressed','false');$(id)?.removeAttribute('aria-busy');}schedule();}
  function beginMerge(a,b){
    if(a===b||a<0||b<0||absorption||pendingMerge)return;
    const epoch=++mergeEpoch,parents=[cultures[a].uid,cultures[b].uid];mergeAbort=new AbortController();pendingMerge=true;mergeParent=-1;drag=null;pointer=null;
    $('merge-toggle').setAttribute('aria-pressed','false');$('merge-toggle').setAttribute('aria-busy','true');hover(b);schedule();
    const prepare=async()=>{if(epoch!==mergeEpoch)return;const ids=parents.map(uid=>world.colonies.find(c=>c.uid===uid)?.id);if(ids.some(id=>id===undefined)){cancelMerge();return;}let result;try{result=await (A.prepareMergeAsync?A.prepareMergeAsync(world,...ids,{signal:mergeAbort?.signal}):A.prepareMerge(world,...ids));}catch(error){if(epoch!==mergeEpoch)return;console.error('Offspring preparation failed',error);cancelMerge();announce('status','Unable to prepare this merge. Try another pair.');return;}if(epoch!==mergeEpoch)return;mergeAbort=null;pendingMerge=false;if(result.error){cancelDrag();$('merge-toggle').removeAttribute('aria-busy');announce('status','Unable to prepare this merge. Try another pair.');schedule();return;}
      specimenDrag=null;canvas.style.cursor='';absorption={reservation:result.reservation,plan:MicroTransfer.prepare(result.reservation),elapsed:0,opening:0,revealed:false,positioned:false};world=A.previewMerge(result.reservation,0);cultures=world.colonies;schedule();};
    if(globalThis.requestIdleCallback)requestIdleCallback(prepare,{timeout:200});else setTimeout(prepare,0);
  }
  canvas.addEventListener('pointerdown',e=>{
    if(absorption||pendingMerge)return;clearTimeout(holdTimer);touches.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(touches.size===2){cancelDrag();const [a,b]=[...touches.values()];pinch={distance:Math.hypot(a.x-b.x,a.y-b.y),zoom:cameraTarget.zoom};dragged=true;canvas.setPointerCapture(e.pointerId);return;}
    drag={x:e.clientX,y:e.clientY,camera:{...cameraTarget},id:A.hitTest(world,e.clientX,e.clientY,width,height,camera),type:e.pointerType,born:performance.now()};dragged=false;canvas.setPointerCapture(e.pointerId);
    if(e.pointerType==='touch'&&drag.id>=0){const start=drag;holdTimer=setTimeout(()=>{if(drag===start&&touches.size===1)startDrag(start.id,{x:start.x,y:start.y});},I.TIMING.hold);}
  });
  canvas.addEventListener('pointerup',e=>{
    clearTimeout(holdTimer);touches.delete(e.pointerId);if(pendingMerge)return;if(specimenDrag){const target=A.hitTest(world,e.clientX,e.clientY,width,height,camera);if(target>=0&&target!==specimenDrag.id)beginMerge(specimenDrag.id,target,specimenDrag.point);else cancelDrag();dragged=true;}
    if(pinch)dragged=true;pinch=null;drag=null;
  });
  canvas.addEventListener('pointercancel',e=>{touches.delete(e.pointerId);pinch=null;dragged=true;cancelDrag();});
  canvas.addEventListener('pointermove',e=>{
    if(touches.has(e.pointerId))touches.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(pinch&&touches.size===2){const [a,b]=[...touches.values()];zoomTo(pinch.zoom*Math.hypot(a.x-b.x,a.y-b.y)/Math.max(1,pinch.distance),{x:(a.x+b.x)/2,y:(a.y+b.y)/2});return;}
    if(specimenDrag){if(pendingMerge)return;const id=A.hitTest(world,e.clientX,e.clientY,width,height,camera),target=id===specimenDrag.id?-1:id;specimenDrag={...specimenDrag,pointer:{x:e.clientX,y:e.clientY},target};hover(target);canvas.style.cursor='grabbing';schedule();return;}
    if(drag){const mode=I.intent(drag,e.clientX,e.clientY,performance.now(),touches.size);if(mode==='specimen'){clearTimeout(holdTimer);startDrag(drag.id,{x:e.clientX,y:e.clientY});return;}if(mode==='pan'){clearTimeout(holdTimer);drag={...drag,id:-1};dragged=true;cameraTarget=V.constrain({...drag.camera,panX:drag.camera.panX+e.clientX-drag.x,panY:drag.camera.panY+e.clientY-drag.y},width,height);pointer=null;hover(-1);schedule();return;}}
    const id=A.hitTest(world,e.clientX,e.clientY,width,height,camera);pointer=id>=0?{x:e.clientX,y:e.clientY,colony:id}:null;hover(id);schedule();
  });
  canvas.addEventListener('pointerleave',()=>{pointer=null;hover(-1);schedule();});
  canvas.addEventListener('click',e=>{if(absorption||pendingMerge)return;if(dragged){dragged=false;return;}const id=A.hitTest(world,e.clientX,e.clientY,width,height,camera);if(id>=0){selected=id;if(mergeParent>=0&&id!==mergeParent)beginMerge(mergeParent,id,{x:e.clientX,y:e.clientY});else openDish(id);}});
  function chooseParent(){if(absorption||pendingMerge||specimenDrag)return;mergeParent=mergeParent>=0?-1:(hoverId>=0?hoverId:selected);$('merge-toggle').setAttribute('aria-pressed',String(mergeParent>=0));if(mergeParent>=0){selected=mergeParent;hover(selected);announce('status','Parent selected. Choose another specimen and press Enter to create offspring.');}canvas.focus({preventScroll:true});schedule();}
  $('merge-toggle').addEventListener('click',chooseParent);$('dish-merge').addEventListener('click',()=>{mergeParent=selected;closeDish();$('merge-toggle').setAttribute('aria-pressed','true');announce('status','Parent selected. Choose a second specimen on the grid.');});
  function toggleTheme(){darkMode=!darkMode;document.documentElement.dataset.theme=darkMode?'dark':'light';BG=getComputedStyle(document.documentElement).getPropertyValue('--ground').trim();R.setDark(darkMode);for(const id of ['theme','dish-theme'])$(id).setAttribute('aria-pressed',String(darkMode));pointer=null;schedule();}
  $('theme').addEventListener('click',toggleTheme);$('dish-theme').addEventListener('click',toggleTheme);
  canvas.addEventListener('keydown',e=> {
    if(e.key==='Escape'){e.preventDefault();cancelMerge();cancelDrag();return;}
    if(specimenDrag||absorption||pendingMerge){e.preventDefault();return;}
    if(e.key.toLowerCase()==='m'){e.preventDefault();chooseParent();return;}
    if(e.key==='+'||e.key==='='||e.key==='-'){e.preventDefault();zoomTo(cameraTarget.zoom*(e.key==='-'?1/1.35:1.35));return;}
    const delta={ArrowLeft:-1,ArrowRight:1,ArrowUp:-V.geometry(width,height).columns,ArrowDown:V.geometry(width,height).columns}[e.key];
    if(delta!==undefined) {
      e.preventDefault();const movement={ArrowLeft:{row:0,col:-1},ArrowRight:{row:0,col:1},ArrowUp:{row:-1,col:0},ArrowDown:{row:1,col:0}}[e.key];const result=A.neighbor(world,selected,movement);world=result.world;cultures=world.colonies;selected=result.id>=0?result.id:selected;hover(selected);
      const columns=V.geometry(width,height).columns,o=V.origin(cultures[selected],width,height,cameraTarget);if(o.x<44||o.x>width-44||o.y<70||o.y>height-90)cameraTarget={...cameraTarget,panX:cameraTarget.panX+width/2-o.x,panY:cameraTarget.panY+height/2-o.y};announce('status',`25-layer fungal culture, row ${cultures[selected].tileRow+1}, column ${cultures[selected].tileCol+1}`);
    } else if(e.key==='Enter'||e.key===' ') {e.preventDefault();if(mergeParent>=0&&selected!==mergeParent){const o=V.origin(cultures[selected],width,height,camera);beginMerge(mergeParent,selected,o);}else openDish(selected);}
  });
  canvas.addEventListener('blur',()=>{pointer=null;hover(-1);schedule();});
  let feedSuppressed=false,feedPinch=null;const feedTouches=new Map();
  dialog.addEventListener('pointerdown',e=>{
    if(e.target!==dialog||stage!==STAGE.dish||carousel.animating)return;
    feedSuppressed=false;feedTouches.set(e.pointerId,{x:e.clientX,y:e.clientY});
    carousel=C.begin(carousel,e.clientX,performance.now());
    dialog.setPointerCapture(e.pointerId);
    if(feedTouches.size===2){const [a,b]=[...feedTouches.values()];feedPinch={distance:Math.hypot(a.x-b.x,a.y-b.y),zoom:dishZoomTarget};carousel=C.cancel(carousel);}
  });
  dialog.addEventListener('pointermove',e=>{
    if(!feedTouches.has(e.pointerId)){pointer=e.target===dialog&&!carousel.animating?{x:e.clientX,y:e.clientY,colony:selected}:null;schedule();return;}
    feedTouches.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(feedPinch&&feedTouches.size===2){const [a,b]=[...feedTouches.values()];dishZoomTarget=Math.max(.65,Math.min(3,feedPinch.zoom*Math.hypot(a.x-b.x,a.y-b.y)/Math.max(1,feedPinch.distance)));feedSuppressed=true;schedule();return;}
    if(carousel.drag){carousel=C.move(carousel,e.clientX,performance.now(),width);if(Math.abs(carousel.offset)>.01)feedSuppressed=true;pointer=null;schedule();}
  });
  dialog.addEventListener('pointerup',e=>{
    if(carousel.drag){carousel=C.release(carousel,performance.now());schedule();}
    feedTouches.delete(e.pointerId);feedPinch=null;
  });
  dialog.addEventListener('pointercancel',()=>{feedTouches.clear();feedPinch=null;carousel=C.cancel(carousel);feedSuppressed=true;schedule();});
  dialog.addEventListener('pointerleave',()=>{pointer=null;schedule();});
  dialog.addEventListener('cancel',e=>{e.preventDefault();closeDish();});
  dialog.addEventListener('wheel',e=>{e.preventDefault();dishZoomTarget=Math.max(.65,Math.min(3,dishZoomTarget*Math.exp(-e.deltaY*.0015)));pointer=null;schedule();},{passive:false});
  $('peek-previous').addEventListener('click',()=>browse(-1));$('peek-next').addEventListener('click',()=>browse(1));
  dialog.addEventListener('keydown',e=> {
    if(e.target instanceof HTMLInputElement||e.target instanceof HTMLSelectElement)return;
    if(['ArrowLeft','ArrowRight','[',']','n','p'].includes(e.key)){e.preventDefault();browse(['ArrowLeft','[','p'].includes(e.key)?-1:1);}else if(['+','=','-'].includes(e.key)){e.preventDefault();dishZoomTarget=Math.max(.65,Math.min(3,dishZoomTarget*(e.key==='-'?1/1.25:1.25)));schedule();}
  });
  dialog.addEventListener('click',e=> {
    if(feedSuppressed){feedSuppressed=false;return;}if(e.target!==dialog)return;const d=R.dishGeometry(width,height);
    if(Math.hypot(e.clientX-d.x,e.clientY-d.y)>d.r)return;
    else if(!reduced.matches){const scale=d.r*2.2*dishZoom.value*.45;R.burst(selected,{x:(e.clientX-d.x)/scale,y:(e.clientY-d.y)/scale});schedule();}
  });
  $('play').addEventListener('click',togglePlay);$('dish-play').addEventListener('click',togglePlay);
  $('close').addEventListener('click',closeDish);
  $('save').addEventListener('click',()=>download(false));$('dish-save').addEventListener('click',()=>download(true));
  reduced.addEventListener('change',()=>{if(reduced.matches)playing=false;updatePlay();schedule();});
  document.addEventListener('visibilitychange',()=> {
    cancelAnimationFrame(raf);raf=0;previousTime=0;if(document.hidden){cancelMerge();clearTimeout(holdTimer);cancelDrag();}else schedule();
  });
  world=A.ensure(world,innerWidth,innerHeight,cameraTarget,selected);seed=world.seed;cultures=world.colonies;
  window.addEventListener('microculture-storage-error',()=>announce(dialog.open?'dish-status':'status','Browser storage is unavailable. Offspring remain available in this session.'));window.addEventListener('pagehide',()=>MicroOffspring.flush());
  window.addEventListener('resize',resize);visualViewport?.addEventListener('resize',resize);setStage(STAGE.grid);updatePlay();resize();if(width<=600){openDish(selected);focus={value:1,velocity:0};setStage(STAGE.dish);}bootControls.forEach(button=>{button.disabled=false;});
})();
