const MicroCarousel = (() => {
  const duration=.36;
  const create=()=>({offset:0,target:0,start:0,elapsed:0,animating:false,drag:null,queued:0});
  function begin(state,x,time){if(state.animating)return state;return {...state,drag:{x,time,lastX:x,lastTime:time,velocity:0},queued:0};}
  function move(state,x,time,width){if(!state.drag)return state;const drag=state.drag,elapsed=Math.max(1,time-drag.lastTime);return {...state,offset:Math.max(-1,Math.min(1,(x-drag.x)/Math.max(1,width))),drag:{...drag,lastX:x,lastTime:time,velocity:(x-drag.lastX)/elapsed}};}
  function settle(state,target){return {...state,start:state.offset,target,elapsed:0,animating:true,drag:null};}
  function release(state,time){if(!state.drag)return state;const fresh=time-state.drag.lastTime<100,velocity=fresh?state.drag.velocity:0;const commit=Math.abs(state.offset)>=.22||Math.abs(velocity)>=.5;return settle(state,commit?(state.offset<0||(!state.offset&&velocity<0)?-1:1):0);}
  function request(state,direction){const delta=Math.sign(direction);if(!delta)return state;if(state.animating)return {...state,queued:delta};return settle({...state,drag:null},-delta);}
  function advance(state,dt){if(!state.animating)return {state,commit:0};const elapsed=Math.min(duration,state.elapsed+dt),t=elapsed/duration,ease=1-Math.pow(1-t,3),offset=state.start+(state.target-state.start)*ease;if(elapsed<duration)return {state:{...state,elapsed,offset},commit:0};const commit=state.target ? -state.target : 0,queued=state.queued,next=create();return {state:queued?request(next,queued):next,commit};}
  return {create,begin,move,release,request,advance,cancel:state=>settle({...state,queued:0},0)};
})();
