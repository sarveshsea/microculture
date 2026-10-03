/* Stable visual samples: dispersed emergence and irreversible thinning as hosts die. */
(() => {
'use strict';
const clamp=value=>Math.max(0,Math.min(1,value));
function noise(seed,index){let value=(seed^Math.imul(index+1,374761393))>>>0;value=Math.imul(value^(value>>>13),1274126177);return ((value^(value>>>16))>>>0)/4294967296;}
function disperse(point,sectors,seed,lineage,sample=0){const sector=(Math.floor(sample/2)+lineage+(seed>>>0)%sectors)%sectors,angle=sector*Math.PI*2/sectors,mirror=sample%2?-1:1,y=point.y*mirror;return Object.freeze({x:point.x*Math.cos(angle)-y*Math.sin(angle),y:point.x*Math.sin(angle)+y*Math.cos(angle),z:point.z||0});}
function alive(seed,index,health){return health>.035&&noise(seed,index)<clamp(health)**1.3;}
function emergence(seed,lineage,progress){const lag=noise(seed,lineage)*.16,p=clamp((progress-lag)/(1-lag));return p*p*(3-2*p);}
globalThis.MicroTissueAppearance=Object.freeze({disperse,alive,emergence});
})();
