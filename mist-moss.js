/* Fine attached epiphyte samples: nutrient-limited colonization, coherent drift,
   and host-tissue decay. Artistic ecology, with no blur or additive glow. */
(() => {
'use strict';
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
function random(seed){let v=seed>>>0;return ()=>{v=Math.imul(v^v>>>16,2246822507);v=Math.imul(v^v>>>13,3266489909);v=(v^v>>>16)>>>0;return v/4294967296;};}
function point(seed,index,age,nutrient,health){const r=random((seed^Math.imul(index+1,2654435761))>>>0),u=r(),phase=r()*Math.PI*2,spread=.004+r()*.016,clock=Math.max(0,Number.isFinite(age)?age:0),coverage=(1-Math.exp(-clock/5))*clamp(nutrient)/(clamp(nutrient)+.18),host=clamp(health),breath=.85+.15*Math.sin(clock*.22+phase),angle=phase+clock*.018;
 return Object.freeze({id:seed+':'+index,u,lateral:Math.cos(angle)*spread*breath,depth:Math.sin(angle)*spread*.55,coverage,opacity:coverage*host*host,radius:.42+r()*.22});}
globalThis.MicroMistMoss=Object.freeze({point,version:'attached-moss-v1'});
})();
