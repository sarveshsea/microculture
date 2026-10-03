/* MIT License — reference portions from Bencho Particles.
   Copyright (c) Bencho. https://bencho.dev/licence

   Permission is hereby granted, free of charge, to any person obtaining a copy
   of this software and associated documentation files (the "Software"), to deal
   in the Software without restriction, including without limitation the rights
   to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
   copies of the Software, and to permit persons to whom the Software is
   furnished to do so, subject to the following conditions:

   The above copyright notice and this permission notice shall be included in all
   copies or substantial portions of the Software.

   THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
   IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
   FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
   AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
   LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
   OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
   SOFTWARE. */
/* Fine-grain rendering inspired by Bencho's Particles (MIT, source supplied by the user).
   Reference: https://bencho.dev/licence

   ONE SET OF DOTS, MANY SHAPES
   The dots never change, only where home is.
   Here home follows a living cell's growth and inherited morphology, not preset geometric shapes.

   STRETCHED BY SPEED
   A dot at rest is round; a moving one is drawn a little long
   along the way it is going, which is what makes a burst read
   as a splash rather than a scatter of points.

   The integration below is a closed-form critically damped spring in seconds.
   Splitting a frame gives the same result as one full frame for a stationary target. */
(() => {
  'use strict';
  const M=MicroModel,TAU=Math.PI*2;
  const PHYSICS=Object.freeze({omega:14,reach:.18,push:.11,burstReach:.45,impulse:.55,
    maxFrame:.05,positionEpsilon:.0001,velocityEpsilon:.0002});
  const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
  function sample(cell,count) {
    const r=M.random(cell.seed),phase=r()*TAU,golden=Math.PI*(3-Math.sqrt(5));
    return Object.freeze(Array.from({length:count},(_,i)=>{
      const a=phase+i*golden,radius=Math.sqrt((i+.5)/count)*.91;
      return Object.freeze({x:Math.cos(a)*radius,y:Math.sin(a)*radius,radius:.13+r()*.04});
    }));
  }
  function target(home,hand) {
    if(!hand)return home;
    const dx=home.x-hand.x,dy=home.y-hand.y,distance=Math.hypot(dx,dy);
    const reach=clamp(hand.reach??PHYSICS.reach,.04,.5);
    if(distance>=reach)return home;
    const force=PHYSICS.push*(1-distance/reach)**2;
    const nx=distance>1e-8?dx/distance:1,ny=distance>1e-8?dy/distance:0;
    return {x:home.x+nx*force,y:home.y+ny*force};
  }
  function axis(position,velocity,home,dt) {
    const delta=position-home,c=velocity+PHYSICS.omega*delta,e=Math.exp(-PHYSICS.omega*dt);
    const x=home+(delta+c*dt)*e,v=(velocity-PHYSICS.omega*c*dt)*e;
    return Math.abs(home-x)<PHYSICS.positionEpsilon&&Math.abs(v)<PHYSICS.velocityEpsilon?
      {x:home,v:0}:{x,v};
  }
  function step(dot,home,hand,dt) {
    const t=clamp(dt,0,PHYSICS.maxFrame),aim=target(home,hand);
    const x=axis(dot.x,dot.vx,aim.x,t),y=axis(dot.y,dot.vy,aim.y,t);
    return Object.freeze({x:x.x,y:y.x,vx:x.v,vy:y.v});
  }
  function stretch(vx,vy) {
    return Object.freeze({scale:Math.min(2.6,1+Math.hypot(vx,vy)*1.5),angle:Math.atan2(vy,vx)});
  }
  function speed(value) {return 2*(clamp(Number(value),0,100)/50)**4;}
  function burst(dot,point) {
    const dx=dot.x-point.x,dy=dot.y-point.y,d=Math.hypot(dx,dy);
    if(d>=PHYSICS.burstReach)return Object.freeze({...dot});
    const force=PHYSICS.impulse*(1-d/PHYSICS.burstReach);
    return Object.freeze({...dot,vx:dot.vx+(d>1e-8?dx/d:1)*force,vy:dot.vy+(d>1e-8?dy/d:0)*force});
  }
  function lensScale(distance,strength=1){const t=clamp(distance,0,1);return 1+.32*clamp(strength,0,1)*(1-t*t)**2;}
  globalThis.MicroParticles=Object.freeze({lensScale,sample,step,stretch,speed,burst});
})();
