/* Gray–Scott reaction–diffusion, explicit Euler integration on a 16×16 lattice.
   Dimensionless artistic chemistry; not an animal genome simulation. */
(() => {
'use strict';
const side=16,clamp=x=>Math.max(0,Math.min(1,x));
function advance(u,v,dt,id){const nextU=[],nextV=[],du=.12+(id%4)*.025,dv=du*.5,feed=.026+(id%6)*.002,kill=.052+(id%5)*.002;
  for(let i=0;i<u.length;i++){const x=i%side,y=Math.floor(i/side),neighbors=[y*side+Math.max(0,x-1),y*side+Math.min(side-1,x+1),Math.max(0,y-1)*side+x,Math.min(side-1,y+1)*side+x];const lap=a=>neighbors.reduce((sum,n)=>sum+a[n],0)-4*a[i],reaction=u[i]*v[i]*v[i];nextU.push(clamp(u[i]+dt*(du*lap(u)-reaction+feed*(1-u[i]))));nextV.push(clamp(v[i]+dt*(dv*lap(v)+reaction-(feed+kill)*v[i])));}
  return Object.freeze({u:Object.freeze(nextU),v:Object.freeze(nextV)});
}
globalThis.MicroField=Object.freeze({advance});
})();
