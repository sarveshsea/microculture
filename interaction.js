(() => {
'use strict';
const TIMING=Object.freeze({enter:.35,exit:.5,hold:350,absorb:.85,return:.35,threshold:6});
function hover(state,target,dt){const changed=state.target!==target,start=changed?state.value:state.start,elapsed=Math.min(target?TIMING.enter:TIMING.exit,(changed?0:state.elapsed)+dt),t=elapsed/(target?TIMING.enter:TIMING.exit),ease=t*t*(3-2*t);return {value:start+(target-start)*ease,target,start,elapsed,velocity:0};}
function intent(start,x,y,now,count){if(count>1)return 'pinch';const distance=Math.hypot(x-start.x,y-start.y);if(start.type==='touch'){if(distance>TIMING.threshold&&now-start.born<TIMING.hold)return 'pan';if(start.id>=0&&now-start.born>=TIMING.hold)return 'specimen';return 'wait';}return distance>TIMING.threshold?(start.id>=0?'specimen':'pan'):'wait';}
function magnetic(pointer,target){if(!target)return {...pointer};const dx=target.x-pointer.x,dy=target.y-pointer.y,distance=Math.hypot(dx,dy),radius=Math.max(1,target.size*.72),t=Math.max(0,1-distance/radius),strength=.62*t*t*(3-2*t);return {x:pointer.x+dx*strength,y:pointer.y+dy*strength};}
function dragPosition(position,pointer,target,dt){const goal=magnetic(pointer,target),ease=1-Math.exp(-24*Math.max(0,Math.min(.05,dt)));return {x:position.x+(goal.x-position.x)*ease,y:position.y+(goal.y-position.y)*ease};}
globalThis.MicroInteraction=Object.freeze({TIMING,hover,intent,magnetic,dragPosition});
})();
